import { prisma } from '../lib/prisma';

/**
 * Gelir / Finansal raporu döndürür.
 * Aylık tahsilat grafiği, fatura durum özeti ve vadesi geçmiş fatura listesi içerir.
 * Payment modeli companyId içermediğinden JOIN via invoices yapılır.
 * @param companyId - Tenant izolasyonu için şirket ID
 * @param months - Kaç aylık geçmiş dahil edilsin (varsayılan 6)
 */
export async function getRevenueReport(companyId: string, months = 6) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const [monthly, byStatus, overdue] = await Promise.all([
    // Aylık tahsilat — Payment has no companyId, JOIN through invoices
    prisma.$queryRaw<Array<{ month: string; total: number }>>`
      SELECT
        TO_CHAR(p."paymentDate", 'YYYY-MM') AS month,
        SUM(p.amount) AS total
      FROM payments p
      JOIN invoices i ON i.id = p."invoiceId"
      WHERE i.company_id = ${companyId}
        AND i."deletedAt" IS NULL
        AND p."paymentDate" >= ${from}
      GROUP BY month
      ORDER BY month ASC
    `,

    // Fatura durum özeti
    prisma.invoice.groupBy({
      by: ['status'],
      where: { companyId, deletedAt: null },
      _count: { id: true },
      _sum: { amount: true },
    }),

    // Vadesi geçmiş faturalar
    prisma.invoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        dueDate: { lt: now },
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      select: {
        id: true, refNo: true, amount: true, currency: true, dueDate: true, status: true,
        customer: { select: { id: true, name: true, shortCode: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),
  ]);

  return { monthly, byStatus, overdue };
}

/**
 * Stok / Envanter raporu döndürür.
 * Kritik stok altındaki ürünler ve tüm ürünlerin stok durumu listelenir.
 * @param companyId - Tenant izolasyonu için şirket ID
 */
export async function getStockReport(companyId: string) {
  const [lowStock, allProducts] = await Promise.all([
    // Stok <= minStock olan ürünler (raw SQL — iki sütun karşılaştırması)
    prisma.$queryRaw<
      Array<{ id: string; code: string; name: string; unit: string; stock_quantity: string | null; min_stock: string | null }>
    >`
      SELECT id, code, name, unit, stock_quantity, min_stock
      FROM products
      WHERE company_id = ${companyId}
        AND is_active = true
        AND min_stock IS NOT NULL
        AND (stock_quantity IS NULL OR stock_quantity <= min_stock)
      ORDER BY COALESCE(stock_quantity, -1) ASC
    `,

    // Stok takibi açık tüm ürünler
    prisma.product.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true, code: true, name: true, unit: true,
        stockQuantity: true, minStock: true, isActive: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return { lowStock, allProducts };
}

/**
 * Servis performans raporu döndürür.
 * Durum dağılımı, öncelik dağılımı ve aylık servis trend verisi içerir.
 * @param companyId - Tenant izolasyonu için şirket ID
 * @param months - Kaç aylık geçmiş dahil edilsin (varsayılan 6)
 */
export async function getServiceReport(companyId: string, months = 6) {
  const from = new Date();
  from.setMonth(from.getMonth() - months + 1);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  const [byStatus, byPriority, monthly] = await Promise.all([
    // Durum dağılımı
    prisma.service.groupBy({
      by: ['status'],
      where: { companyId, deletedAt: null },
      _count: { id: true },
    }),

    // Öncelik dağılımı
    prisma.service.groupBy({
      by: ['priority'],
      where: { companyId, deletedAt: null },
      _count: { id: true },
    }),

    // Aylık servis açılış trendi
    prisma.$queryRaw<Array<{ month: string; count: number }>>`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') AS month,
        COUNT(*)::int AS count
      FROM services
      WHERE company_id = ${companyId}
        AND "deletedAt" IS NULL
        AND "createdAt" >= ${from}
      GROUP BY month
      ORDER BY month ASC
    `,
  ]);

  return { byStatus, byPriority, monthly };
}

/**
 * Müşteri raporu döndürür.
 * Gelir bazlı ve fatura sayısı bazlı top-10 müşteri listesi içerir.
 * @param companyId - Tenant izolasyonu için şirket ID
 */
export async function getCustomerReport(companyId: string) {
  const [topByRevenue, topByInvoiceCount] = await Promise.all([
    // Toplam fatura tutarına göre top-10
    prisma.invoice.groupBy({
      by: ['customerId'],
      where: { companyId, deletedAt: null, status: { notIn: ['CANCELLED'] } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    }).then(async (rows) => {
      const customerIds = rows.map((r) => r.customerId);
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true, shortCode: true },
      });
      const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));
      return rows.map((r) => ({
        customer: customerMap[r.customerId],
        invoiceCount: r._count.id,
        totalRevenue: r._sum.amount ?? 0,
      }));
    }),

    // Fatura sayısına göre top-10
    prisma.invoice.groupBy({
      by: ['customerId'],
      where: { companyId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }).then(async (rows) => {
      const customerIds = rows.map((r) => r.customerId);
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true, shortCode: true },
      });
      const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));
      return rows.map((r) => ({
        customer: customerMap[r.customerId],
        invoiceCount: r._count.id,
      }));
    }),
  ]);

  return { topByRevenue, topByInvoiceCount };
}

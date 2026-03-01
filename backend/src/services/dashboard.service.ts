import { prisma } from '../lib/prisma';

export async function getDashboardStats(companyId: string | null) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const tenantFilter = companyId ? { companyId } : {};

  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    serviceStats,
    quoteStats,
    invoiceStats,
    invoicesByStatus,
    overdueInvoices,
    topCustomers,
    recentMeetings,
    servicesByPriority,
    quotesByMonth,
    revenueMonthlyRaw,
    expiringCerts,
  ] = await Promise.all([
    prisma.service.groupBy({
      by: ['status'],
      where: { ...tenantFilter, deletedAt: null },
      _count: { id: true },
    }),

    prisma.quote.groupBy({
      by: ['status'],
      where: { ...tenantFilter, deletedAt: null },
      _count: { id: true },
    }),

    prisma.invoice.aggregate({
      where: { ...tenantFilter, deletedAt: null, invoiceDate: { gte: startOfMonth, lte: endOfMonth } },
      _count: { id: true },
      _sum: { amount: true },
    }),

    prisma.invoice.groupBy({
      by: ['status'],
      where: { ...tenantFilter, deletedAt: null },
      _count: { id: true },
      _sum: { amount: true },
    }),

    prisma.invoice.count({
      where: {
        ...tenantFilter,
        deletedAt: null,
        dueDate: { lt: now },
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
    }),

    prisma.invoice.groupBy({
      by: ['customerId'],
      where: { ...tenantFilter, deletedAt: null, status: { notIn: ['CANCELLED'] } },
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),

    prisma.meeting.findMany({
      where: { ...tenantFilter, deletedAt: null },
      take: 5,
      orderBy: { meetingDate: 'desc' },
      include: {
        customer: { select: { name: true, shortCode: true } },
      },
    }),

    prisma.service.groupBy({
      by: ['priority'],
      where: { ...tenantFilter, deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      _count: { id: true },
    }),

    companyId
      ? prisma.$queryRaw<{ month: string; approved: bigint; rejected: bigint; total: bigint }[]>`
          SELECT
            TO_CHAR(DATE_TRUNC('month', "quoteDate"), 'YYYY-MM') as month,
            COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
            COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
            COUNT(*) as total
          FROM quotes
          WHERE "quoteDate" >= NOW() - INTERVAL '6 months'
            AND "company_id" = ${companyId}
          GROUP BY DATE_TRUNC('month', "quoteDate")
          ORDER BY DATE_TRUNC('month', "quoteDate") ASC
        `
      : prisma.$queryRaw<{ month: string; approved: bigint; rejected: bigint; total: bigint }[]>`
          SELECT
            TO_CHAR(DATE_TRUNC('month', "quoteDate"), 'YYYY-MM') as month,
            COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
            COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
            COUNT(*) as total
          FROM quotes
          WHERE "quoteDate" >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', "quoteDate")
          ORDER BY DATE_TRUNC('month', "quoteDate") ASC
        `,

    // Revenue monthly: last 6 months of payments grouped by month
    // Payment has no companyId — must join through invoices
    companyId
      ? prisma.$queryRaw<{ month: string; total: number }[]>`
          SELECT
            TO_CHAR(DATE_TRUNC('month', p."paymentDate"), 'YYYY-MM') as month,
            SUM(p.amount) as total
          FROM payments p
          JOIN invoices i ON i.id = p."invoiceId"
          WHERE p."paymentDate" >= NOW() - INTERVAL '6 months'
            AND i."company_id" = ${companyId}
          GROUP BY DATE_TRUNC('month', p."paymentDate")
          ORDER BY DATE_TRUNC('month', p."paymentDate") ASC
        `
      : prisma.$queryRaw<{ month: string; total: number }[]>`
          SELECT
            TO_CHAR(DATE_TRUNC('month', "paymentDate"), 'YYYY-MM') as month,
            SUM(amount) as total
          FROM payments
          WHERE "paymentDate" >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', "paymentDate")
          ORDER BY DATE_TRUNC('month', "paymentDate") ASC
        `,

    // Expiring certificates (within 30 days)
    prisma.shipCertificate.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        expiryDate: { lte: thirtyDaysFromNow },
      },
      include: { ship: { select: { id: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 20,
    }),
  ]);

  const customerIds = topCustomers.map((c) => c.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, shortCode: true },
  });
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const serviceMap = Object.fromEntries(serviceStats.map((s) => [s.status, s._count.id]));
  const quoteMap = Object.fromEntries(quoteStats.map((q) => [q.status, q._count.id]));

  return {
    services: {
      total: serviceStats.reduce((s, r) => s + r._count.id, 0),
      open: serviceMap['OPEN'] ?? 0,
      inProgress: serviceMap['IN_PROGRESS'] ?? 0,
      completed: serviceMap['COMPLETED'] ?? 0,
      cancelled: serviceMap['CANCELLED'] ?? 0,
      onHold: serviceMap['ON_HOLD'] ?? 0,
    },
    quotes: {
      total: quoteStats.reduce((s, r) => s + r._count.id, 0),
      draft: quoteMap['DRAFT'] ?? 0,
      sent: quoteMap['SENT'] ?? 0,
      approved: quoteMap['APPROVED'] ?? 0,
      rejected: quoteMap['REJECTED'] ?? 0,
      revised: quoteMap['REVISED'] ?? 0,
      cancelled: quoteMap['CANCELLED'] ?? 0,
    },
    invoices: {
      thisMonthCount: invoiceStats._count.id,
      thisMonthTotal: Number(invoiceStats._sum.amount ?? 0),
      overdueCount: overdueInvoices,
    },
    invoicesByStatus: invoicesByStatus.map((r) => ({
      status: r.status,
      count: r._count.id,
      total: Number(r._sum.amount ?? 0),
    })),
    topCustomers: topCustomers.map((r) => ({
      id: r.customerId,
      name: customerMap[r.customerId]?.name ?? r.customerId,
      shortCode: customerMap[r.customerId]?.shortCode ?? '',
      invoiceCount: r._count.id,
      invoiceTotal: Number(r._sum.amount ?? 0),
    })),
    recentMeetings: recentMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      meetingType: m.meetingType,
      meetingDate: m.meetingDate,
      customerName: m.customer.name,
      customerShortCode: m.customer.shortCode,
    })),
    servicesByPriority: servicesByPriority.map((r) => ({
      priority: r.priority,
      count: r._count.id,
    })),
    quotesByMonth: quotesByMonth.map((r) => ({
      month: r.month,
      approved: Number(r.approved),
      rejected: Number(r.rejected),
      total: Number(r.total),
    })),
    revenueMonthly: revenueMonthlyRaw.map((r) => ({
      month: r.month,
      total: Number(r.total),
    })),
    expiringCerts: expiringCerts.map((c) => ({
      id: c.id,
      certType: c.certType,
      certNo: c.certNo,
      expiryDate: c.expiryDate,
      daysLeft: Math.ceil((c.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      ship: c.ship,
    })),
  };
}

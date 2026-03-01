import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface TransactionInput {
  productId: string;
  type: TransactionType;
  quantity: number;  // Pozitif: giriş; negatif: çıkış
  notes?: string;
  invoiceId?: string;
}

/**
 * Bir ürünün stok hareket geçmişini listeler.
 * @param productId - Ürün kimliği
 * @param companyId - Tenant izolasyonu için şirket ID
 * @returns Sıralı hareket kayıtları (en yeni önce)
 */
export async function listTransactions(productId: string, companyId: string) {
  // Ürünün bu şirkete ait olduğunu doğrula
  const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
  if (!product) throw new AppError('Ürün bulunamadı', 404);

  return prisma.productTransaction.findMany({
    where: { productId, companyId },
    include: {
      createdBy: { select: { id: true, name: true } },
      invoice: { select: { id: true, refNo: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Manuel stok hareketi oluşturur (IN veya ADJUSTMENT) ve ürün stok miktarını günceller.
 * @param data - Hareket verileri
 * @param companyId - Tenant izolasyonu için şirket ID
 * @param userId - İşlemi yapan kullanıcı ID
 * @returns Oluşturulan hareket kaydı
 * @throws {AppError} Ürün bulunamazsa 404
 */
export async function createTransaction(data: TransactionInput, companyId: string, userId: string) {
  const product = await prisma.product.findFirst({ where: { id: data.productId, companyId } });
  if (!product) throw new AppError('Ürün bulunamadı', 404);

  return prisma.$transaction(async (tx) => {
    const tx_record = await tx.productTransaction.create({
      data: {
        companyId,
        productId: data.productId,
        invoiceId: data.invoiceId ?? null,
        type: data.type,
        quantity: data.quantity,
        notes: data.notes ?? null,
        createdById: userId,
      },
    });

    // Stok miktarını güncelle (null → 0 gibi başlat)
    const currentStock = Number(product.stockQuantity ?? 0);
    await tx.product.update({
      where: { id: data.productId },
      data: { stockQuantity: currentStock + data.quantity },
    });

    return tx_record;
  });
}

/**
 * Belirli bir fatura için daha önce OUT hareketi oluşturulmuş mu kontrol eder.
 * Çift stok düşümünü önlemek için kullanılır.
 * @param invoiceId - Fatura kimliği
 * @returns Daha önce hareket varsa true
 */
export async function hasInvoiceTransactions(invoiceId: string): Promise<boolean> {
  const count = await prisma.productTransaction.count({
    where: { invoiceId, type: 'OUT' },
  });
  return count > 0;
}

/**
 * Fatura SENT durumuna geçince fatura kalemlerindeki ürünler için OUT stok hareketleri oluşturur
 * ve her ürünün stok miktarını düşürür. Çift çekim koruması içerir.
 * @param invoiceId - Fatura kimliği
 * @param companyId - Tenant izolasyonu için şirket ID
 * @param userId - İşlemi yapan kullanıcı ID
 */
export async function createInvoiceOutTransactions(
  invoiceId: string,
  companyId: string,
  userId: string
): Promise<void> {
  // Çift çekim koruması
  if (await hasInvoiceTransactions(invoiceId)) return;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      items: {
        where: { productId: { not: null } },
        include: { product: true },
      },
    },
  });

  if (!invoice || invoice.items.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const item of invoice.items) {
      if (!item.productId || !item.product) continue;

      const qty = Number(item.quantity);

      await tx.productTransaction.create({
        data: {
          companyId,
          productId: item.productId,
          invoiceId,
          type: 'OUT',
          quantity: -qty,  // Negatif: stok çıkışı
          notes: `Fatura: ${invoice.refNo ?? invoiceId}`,
          createdById: userId,
        },
      });

      // Stok miktarını düşür
      const currentStock = Number(item.product.stockQuantity ?? 0);
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: currentStock - qty },
      });
    }
  });
}

/**
 * Stok miktarı kritik eşiğin altında olan ürünleri listeler.
 * minStock tanımlanmış ve stockQuantity <= minStock olan ürünler döndürülür.
 * İki sütunu karşılaştırmak için raw SQL kullanılır.
 * @param companyId - Tenant izolasyonu için şirket ID
 * @returns Kritik stok seviyesindeki ürünler
 */
export async function getLowStockProducts(companyId: string) {
  return prisma.$queryRaw<
    Array<{
      id: string;
      code: string;
      name: string;
      unit: string;
      stock_quantity: string | null;
      min_stock: string | null;
    }>
  >`
    SELECT id, code, name, unit, stock_quantity, min_stock
    FROM products
    WHERE company_id = ${companyId}
      AND is_active = true
      AND min_stock IS NOT NULL
      AND stock_quantity IS NOT NULL
      AND stock_quantity <= min_stock
    ORDER BY stock_quantity ASC
    LIMIT 20
  `;
}

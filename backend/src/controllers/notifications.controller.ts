import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;

    // SUPER_ADMIN has no single company context
    if (!user.companyId) {
      return res.json({
        success: true,
        data: {
          overdueInvoices: { count: 0, items: [] },
          expiredQuotes: { count: 0, items: [] },
          openComplaints: { count: 0, items: [] },
          billingReadyServices: { count: 0, items: [] },
          total: 0,
        },
      });
    }

    const companyId = user.companyId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      overdueCount, overdueItems,
      expiredCount, expiredItems,
      complaintsCount, complaintsItems,
      billingCount, billingItems,
    ] = await Promise.all([

      // 1. Geciken faturalar: dueDate geçmiş, ödenmemiş
      prisma.invoice.count({
        where: { companyId, deletedAt: null, dueDate: { lt: now }, status: { notIn: ['PAID', 'CANCELLED'] } },
      }),
      prisma.invoice.findMany({
        where: { companyId, deletedAt: null, dueDate: { lt: now }, status: { notIn: ['PAID', 'CANCELLED'] } },
        select: {
          id: true, refNo: true, amount: true, currency: true, dueDate: true, status: true,
          customer: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),

      // 2. Süresi geçmiş / yanıt bekleyen teklifler (SENT + validUntil aşıldı veya 30+ gün bekliyor)
      prisma.quote.count({
        where: {
          companyId, deletedAt: null, status: 'SENT',
          OR: [
            { validUntil: { lt: now } },
            { validUntil: null, updatedAt: { lt: thirtyDaysAgo } },
          ],
        },
      }),
      prisma.quote.findMany({
        where: {
          companyId, deletedAt: null, status: 'SENT',
          OR: [
            { validUntil: { lt: now } },
            { validUntil: null, updatedAt: { lt: thirtyDaysAgo } },
          ],
        },
        select: {
          id: true, quoteNumber: true, totalAmount: true, currency: true,
          validUntil: true, updatedAt: true,
          customer: { select: { name: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 5,
      }),

      // 3. Açık şikayetler
      prisma.complaint.count({
        where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      prisma.complaint.findMany({
        where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        select: {
          id: true, subject: true, status: true, type: true, createdAt: true,
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      }),

      // 4. Fatura hazır servisler
      prisma.service.count({
        where: { companyId, deletedAt: null, invoiceReady: true, status: { notIn: ['CANCELLED'] } },
      }),
      prisma.service.findMany({
        where: { companyId, deletedAt: null, invoiceReady: true, status: { notIn: ['CANCELLED'] } },
        select: {
          id: true, status: true, updatedAt: true,
          customer: { select: { name: true } },
          serviceType: { select: { nameTr: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 5,
      }),
    ]);

    const total = overdueCount + expiredCount + complaintsCount + billingCount;

    res.json({
      success: true,
      data: {
        overdueInvoices: { count: overdueCount, items: overdueItems },
        expiredQuotes: { count: expiredCount, items: expiredItems },
        openComplaints: { count: complaintsCount, items: complaintsItems },
        billingReadyServices: { count: billingCount, items: billingItems },
        total,
      },
    });
  } catch (err) {
    next(err);
  }
}

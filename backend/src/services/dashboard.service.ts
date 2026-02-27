import { prisma } from '../lib/prisma';

export async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

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
  ] = await Promise.all([
    // Service counts by status
    prisma.service.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // Quote counts by status
    prisma.quote.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // Invoice: this month count + total
    prisma.invoice.aggregate({
      where: { invoiceDate: { gte: startOfMonth, lte: endOfMonth } },
      _count: { id: true },
      _sum: { amount: true },
    }),

    // Invoices grouped by status (count + sum)
    prisma.invoice.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true },
    }),

    // Overdue invoices (dueDate < now AND status not PAID/CANCELLED)
    prisma.invoice.count({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
    }),

    // Top 5 customers by invoice total
    prisma.invoice.groupBy({
      by: ['customerId'],
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
      where: { status: { notIn: ['CANCELLED'] } },
    }),

    // Recent 5 meetings
    prisma.meeting.findMany({
      take: 5,
      orderBy: { meetingDate: 'desc' },
      include: {
        customer: { select: { name: true, shortCode: true } },
      },
    }),

    // Services by priority
    prisma.service.groupBy({
      by: ['priority'],
      _count: { id: true },
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    }),

    // Quotes by month (last 6 months)
    prisma.$queryRaw<{ month: string; approved: bigint; rejected: bigint; total: bigint }[]>`
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
  ]);

  // Resolve customer names for topCustomers
  const customerIds = topCustomers.map((c) => c.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, shortCode: true },
  });
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  // Build service stats map
  const serviceMap = Object.fromEntries(
    serviceStats.map((s) => [s.status, s._count.id])
  );
  const quoteMap = Object.fromEntries(
    quoteStats.map((q) => [q.status, q._count.id])
  );

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
  };
}

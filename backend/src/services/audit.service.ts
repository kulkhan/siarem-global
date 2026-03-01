import { Request } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Records a non-blocking audit log entry from an Express request context.
 * @param req - Express request (used to extract user, IP, user-agent)
 * @param entityType - Name of the entity being audited (e.g. 'Customer', 'Ship')
 * @param action - Type of operation performed
 * @param entityId - ID of the affected entity
 * @param changes - Optional object describing field-level changes
 */
export async function logAudit(
  req: Request,
  entityType: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityId?: string,
  changes?: object,
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (req as any).user?.name as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyId = (req as any).user?.companyId as string | undefined;

    const hostname =
      (req.headers['x-forwarded-host'] as string) ||
      (req.headers['host'] as string) ||
      undefined;

    const xForwardedFor = req.headers['x-forwarded-for'] as string | undefined;
    const ipAddress = xForwardedFor
      ? xForwardedFor.split(',')[0].trim()
      : req.socket?.remoteAddress || undefined;

    const userAgent = req.headers['user-agent'] || undefined;

    await prisma.auditLog.create({
      data: {
        companyId: companyId ?? undefined,
        entityType,
        entityId,
        action,
        userId,
        userName,
        ipAddress,
        hostname,
        userAgent,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        changes: changes ? (changes as any) : undefined,
      },
    });
  } catch {
    // Non-blocking: audit failures must not break the main operation
  }
}

/**
 * Retrieves paginated audit logs with optional filters.
 * @param params - Filter and pagination options (entityType, action, userId, date range, page, limit)
 * @param companyId - Tenant isolation company ID; null means SUPER_ADMIN (all tenants)
 * @returns Paginated audit log entries with total count and page metadata
 */
export async function getAuditLogs(params: {
  entityType?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}, companyId: string | null) {
  const { entityType, action, userId, from, to, page = 1, limit = 20 } = params;

  const tenantFilter = companyId ? { companyId } : {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { ...tenantFilter };
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        userId: true,
        userName: true,
        ipAddress: true,
        hostname: true,
        userAgent: true,
        changes: true,
        createdAt: true,
      },
    }),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

// ── Config CRUD ──────────────────────────────────────────────────────────────

export async function getEmailConfig(companyId: string) {
  return prisma.emailConfig.findUnique({
    where: { companyId },
    include: {
      rules: {
        orderBy: { sortOrder: 'asc' },
        include: { assignedUser: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function upsertEmailConfig(
  companyId: string,
  data: {
    host: string;
    port: number;
    username: string;
    password?: string;
    useTls: boolean;
    pollIntervalMinutes: number;
    isActive: boolean;
  }
) {
  const existing = await prisma.emailConfig.findUnique({ where: { companyId } });

  if (existing) {
    return prisma.emailConfig.update({
      where: { companyId },
      data: {
        host: data.host,
        port: data.port,
        username: data.username,
        // Only update password if provided
        ...(data.password ? { password: data.password } : {}),
        useTls: data.useTls,
        pollIntervalMinutes: data.pollIntervalMinutes,
        isActive: data.isActive,
      },
    });
  }

  if (!data.password) throw new AppError('Password required for new config', 400);

  return prisma.emailConfig.create({
    data: {
      companyId,
      host: data.host,
      port: data.port,
      username: data.username,
      password: data.password,
      useTls: data.useTls,
      pollIntervalMinutes: data.pollIntervalMinutes,
      isActive: data.isActive,
    },
  });
}

// ── Rules CRUD ───────────────────────────────────────────────────────────────

export async function createEmailRule(
  companyId: string,
  data: {
    emailConfigId: string;
    name: string;
    description: string;
    assignedUserId: string;
    priority: string;
    sortOrder?: number;
  }
) {
  const config = await prisma.emailConfig.findFirst({ where: { id: data.emailConfigId, companyId } });
  if (!config) throw new AppError('Email config not found', 404);

  return prisma.emailRule.create({
    data: { companyId, ...data },
    include: { assignedUser: { select: { id: true, name: true } } },
  });
}

export async function updateEmailRule(
  id: string,
  companyId: string,
  data: Partial<{
    name: string;
    description: string;
    assignedUserId: string;
    priority: string;
    isActive: boolean;
    sortOrder: number;
  }>
) {
  const existing = await prisma.emailRule.findFirst({ where: { id, companyId } });
  if (!existing) throw new AppError('Rule not found', 404);

  return prisma.emailRule.update({
    where: { id },
    data,
    include: { assignedUser: { select: { id: true, name: true } } },
  });
}

export async function deleteEmailRule(id: string, companyId: string) {
  const existing = await prisma.emailRule.findFirst({ where: { id, companyId } });
  if (!existing) throw new AppError('Rule not found', 404);
  return prisma.emailRule.delete({ where: { id } });
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export async function getEmailLogs(companyId: string, limit = 50) {
  return prisma.emailLog.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      matchedRule: { select: { id: true, name: true } },
    },
  });
}

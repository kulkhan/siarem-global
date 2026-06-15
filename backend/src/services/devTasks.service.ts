import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface DevTaskInput {
  title: string;
  description?: string;
  type: string;
  status?: string;
  priority?: string;
  reportedAt?: string;
  completedAt?: string | null;
  createdByName?: string;
  createdById?: string;
}

export async function getDevTasks() {
  return prisma.devTask.findMany({ orderBy: { reportedAt: 'desc' } });
}

export async function createDevTask(data: DevTaskInput) {
  const { reportedAt, completedAt, ...rest } = data;
  return prisma.devTask.create({
    data: {
      ...rest,
      ...(reportedAt ? { reportedAt: new Date(reportedAt) } : {}),
      ...(completedAt ? { completedAt: new Date(completedAt) } : {}),
    },
  });
}

export async function updateDevTask(id: string, data: Partial<DevTaskInput>) {
  const existing = await prisma.devTask.findUnique({ where: { id } });
  if (!existing) throw new AppError('Task not found', 404);
  const { reportedAt, completedAt, ...rest } = data;
  return prisma.devTask.update({
    where: { id },
    data: {
      ...rest,
      ...(reportedAt !== undefined ? { reportedAt: new Date(reportedAt) } : {}),
      ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
    },
  });
}

export async function deleteDevTask(id: string) {
  const existing = await prisma.devTask.findUnique({ where: { id } });
  if (!existing) throw new AppError('Task not found', 404);
  return prisma.devTask.delete({ where: { id } });
}

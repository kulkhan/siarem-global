import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface TaskQuery {
  page: number;
  pageSize: number;
  status?: string;
  priority?: string;
  assignedUserId?: string;
  meetingId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_WHITELIST = ['createdAt', 'dueDate', 'priority', 'status', 'title'];

export async function getTasks(q: TaskQuery, companyId: string | null) {
  const { page, pageSize, status, priority, assignedUserId, meetingId, sortOrder = 'asc' } = q;
  const sortBy = SORT_WHITELIST.includes(q.sortBy ?? '') ? q.sortBy! : 'createdAt';
  const tenantFilter = companyId ? { companyId } : {};

  const where = {
    ...tenantFilter,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(assignedUserId ? { assignedUserId } : {}),
    ...(meetingId ? { meetingId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        assignedUser: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        meeting: { select: { id: true, title: true, meetingDate: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function getTaskById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const task = await prisma.task.findFirst({
    where: { id, ...tenantFilter },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      meeting: { select: { id: true, title: true, meetingDate: true } },
    },
  });
  if (!task) throw new AppError('Task not found', 404);
  return task;
}

export async function createTask(
  data: {
    title: string;
    description?: string;
    assignedUserId?: string;
    meetingId?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
  },
  userId?: string,
  companyId?: string
) {
  if (!companyId) throw new AppError('Tenant bilgisi eksik', 400);
  return prisma.task.create({
    data: {
      ...data,
      companyId,
      createdById: userId,
      ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
    },
  });
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    assignedUserId?: string | null;
    meetingId?: string | null;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    completedAt?: string | null;
  },
  companyId?: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.task.findFirst({ where: { id, ...tenantFilter } });
  if (!existing) throw new AppError('Task not found', 404);

  const completedAt = data.status === 'DONE' && !existing.completedAt
    ? new Date()
    : data.status && data.status !== 'DONE'
    ? null
    : undefined;

  return prisma.task.update({
    where: { id },
    data: {
      ...data,
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });
}

export async function deleteTask(id: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.task.findFirst({ where: { id, ...tenantFilter } });
  if (!existing) throw new AppError('Task not found', 404);
  return prisma.task.delete({ where: { id } });
}

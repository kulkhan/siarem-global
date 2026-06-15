import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface TaskQuery {
  page: number;
  pageSize: number;
  status?: string;
  priority?: string;
  category?: string;
  assignedUserId?: string;
  meetingId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_WHITELIST = ['createdAt', 'dueDate', 'priority', 'status', 'title'];

async function enrichWithAssignedUsers<T extends { assignedUserIds: string[] }>(items: T[]) {
  const allIds = [...new Set(items.flatMap(t => t.assignedUserIds))];
  const userMap = new Map<string, string>();
  if (allIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: allIds } },
      select: { id: true, name: true },
    });
    users.forEach(u => userMap.set(u.id, u.name));
  }
  return items.map(t => ({
    ...t,
    assignedUsers: t.assignedUserIds.map(id => ({ id, name: userMap.get(id) ?? id })),
  }));
}

export async function getTasks(q: TaskQuery, companyId: string | null) {
  const { page, pageSize, status, priority, category, assignedUserId, meetingId, sortOrder = 'asc' } = q;
  const sortBy = SORT_WHITELIST.includes(q.sortBy ?? '') ? q.sortBy! : 'createdAt';
  const tenantFilter = companyId ? { companyId } : {};

  const where = {
    ...tenantFilter,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
    ...(assignedUserId ? {
      OR: [
        { assignedUserId },
        { assignedUserIds: { has: assignedUserId } },
      ],
    } : {}),
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

  const enriched = await enrichWithAssignedUsers(data);
  return { data: enriched, total, page, pageSize };
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
  const [enriched] = await enrichWithAssignedUsers([task]);
  return enriched;
}

export async function createTask(
  data: {
    title: string;
    description?: string;
    assignedUserId?: string;
    assignedUserIds?: string[];
    category?: string;
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
      title: data.title,
      description: data.description,
      assignedUserId: data.assignedUserId,
      assignedUserIds: data.assignedUserIds ?? [],
      category: data.category,
      meetingId: data.meetingId,
      status: data.status ?? 'TODO',
      priority: data.priority ?? 'MEDIUM',
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
    assignedUserIds?: string[];
    category?: string | null;
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
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.assignedUserId !== undefined ? { assignedUserId: data.assignedUserId } : {}),
      ...(data.assignedUserIds !== undefined ? { assignedUserIds: data.assignedUserIds } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.meetingId !== undefined ? { meetingId: data.meetingId } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });
}

export async function closeTask(
  id: string,
  userId: string,
  userRole: string,
  companyId: string | null,
  note?: string
) {
  const tenantFilter = companyId ? { companyId } : {};
  const task = await prisma.task.findFirst({ where: { id, ...tenantFilter } });
  if (!task) throw new AppError('Task not found', 404);

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'MANAGER';
  const isAssigned = task.assignedUserIds.includes(userId) || task.assignedUserId === userId;

  if (!isAdmin && !isAssigned) {
    throw new AppError('Bu görevi kapatma yetkiniz yok', 403);
  }

  if (task.status === 'DONE' || task.status === 'CANCELLED') {
    throw new AppError('Görev zaten kapalı', 400);
  }

  return prisma.task.update({
    where: { id },
    data: {
      status: 'DONE',
      completedAt: new Date(),
      closedNote: note || null,
      closedById: userId,
    },
  });
}

export async function deleteTask(id: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.task.findFirst({ where: { id, ...tenantFilter } });
  if (!existing) throw new AppError('Task not found', 404);
  return prisma.task.delete({ where: { id } });
}

export async function getTaskCategories(companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const rows = await prisma.task.findMany({
    where: { ...tenantFilter, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  return rows.map(r => r.category!).filter(Boolean);
}

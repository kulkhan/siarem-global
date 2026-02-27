import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export async function getAssignees(customerId: string) {
  return prisma.customerAssignee.findMany({
    where: { customerId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { assignedAt: 'asc' },
  });
}

export async function addAssignee(customerId: string, userId: string) {
  const existing = await prisma.customerAssignee.findUnique({
    where: { customerId_userId: { customerId, userId } },
  });
  if (existing) throw new AppError('Kullanıcı zaten atanmış', 409);

  return prisma.customerAssignee.create({
    data: { customerId, userId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

export async function removeAssignee(customerId: string, userId: string) {
  const existing = await prisma.customerAssignee.findUnique({
    where: { customerId_userId: { customerId, userId } },
  });
  if (!existing) throw new AppError('Atama bulunamadı', 404);

  return prisma.customerAssignee.delete({
    where: { customerId_userId: { customerId, userId } },
  });
}

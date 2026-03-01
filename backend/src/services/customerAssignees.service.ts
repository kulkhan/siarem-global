import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

/**
 * Returns all assigned users for a customer, ordered by assignment date.
 * @param customerId - Customer ID
 * @returns Array of CustomerAssignee records with user details
 */
export async function getAssignees(customerId: string) {
  return prisma.customerAssignee.findMany({
    where: { customerId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { assignedAt: 'asc' },
  });
}

/**
 * Assigns a user to a customer.
 * @param customerId - Customer ID
 * @param userId - User ID to assign
 * @returns Created CustomerAssignee record with user details
 * @throws {AppError} If the user is already assigned to the customer (409)
 */
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

/**
 * Removes a user assignment from a customer.
 * @param customerId - Customer ID
 * @param userId - User ID to unassign
 * @returns Deleted CustomerAssignee record
 * @throws {AppError} If the assignment does not exist (404)
 */
export async function removeAssignee(customerId: string, userId: string) {
  const existing = await prisma.customerAssignee.findUnique({
    where: { customerId_userId: { customerId, userId } },
  });
  if (!existing) throw new AppError('Atama bulunamadı', 404);

  return prisma.customerAssignee.delete({
    where: { customerId_userId: { customerId, userId } },
  });
}

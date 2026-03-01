import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

/**
 * Lists all notes for a customer, newest first, with author names.
 * @param customerId - Customer ID
 * @param companyId - Tenant isolation company ID
 * @returns Array of CustomerNote records with user details
 */
export async function listNotes(customerId: string, companyId: string) {
  return prisma.customerNote.findMany({
    where: { customerId, companyId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates a note for a customer after verifying the customer belongs to the tenant.
 * @param customerId - Customer ID
 * @param companyId - Tenant isolation company ID
 * @param userId - ID of the note author
 * @param content - Note text content
 * @returns Created CustomerNote record with user details
 * @throws {AppError} If the customer is not found for the given company (404)
 */
export async function createNote(
  customerId: string,
  companyId: string,
  userId: string,
  content: string
) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
  if (!customer) throw new AppError('Müşteri bulunamadı', 404);

  return prisma.customerNote.create({
    data: { customerId, companyId, userId, content },
    include: { user: { select: { id: true, name: true } } },
  });
}

/**
 * Permanently deletes a customer note; non-admins can only delete their own notes.
 * @param noteId - Note ID
 * @param companyId - Tenant isolation company ID
 * @param userId - ID of the requesting user
 * @param isAdmin - Whether the requesting user has admin privileges
 * @returns Deleted CustomerNote record
 * @throws {AppError} If note is not found (404) or user lacks permission (403)
 */
export async function deleteNote(noteId: string, companyId: string, userId: string, isAdmin: boolean) {
  const note = await prisma.customerNote.findFirst({ where: { id: noteId, companyId } });
  if (!note) throw new AppError('Not bulunamadı', 404);
  if (!isAdmin && note.userId !== userId) throw new AppError('Bu notu silme yetkiniz yok', 403);
  return prisma.customerNote.delete({ where: { id: noteId } });
}

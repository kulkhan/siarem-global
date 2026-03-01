import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export async function listNotes(customerId: string, companyId: string) {
  return prisma.customerNote.findMany({
    where: { customerId, companyId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

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

export async function deleteNote(noteId: string, companyId: string, userId: string, isAdmin: boolean) {
  const note = await prisma.customerNote.findFirst({ where: { id: noteId, companyId } });
  if (!note) throw new AppError('Not bulunamadı', 404);
  if (!isAdmin && note.userId !== userId) throw new AppError('Bu notu silme yetkiniz yok', 403);
  return prisma.customerNote.delete({ where: { id: noteId } });
}

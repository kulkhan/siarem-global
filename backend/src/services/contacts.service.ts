import { prisma } from '../lib/prisma';

export async function getContacts(customerId: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  return prisma.contact.findMany({
    where: { customerId, deletedAt: null, ...tenantFilter },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });
}

export async function createContact(
  customerId: string,
  data: {
    name: string;
    title?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
    notes?: string;
  },
  userId?: string,
  companyId?: string
) {
  if (data.isPrimary) {
    await prisma.contact.updateMany({
      where: { customerId, isPrimary: true, deletedAt: null },
      data: { isPrimary: false },
    });
  }
  return prisma.contact.create({
    data: { ...data, customerId, companyId: companyId!, createdById: userId },
  });
}

export async function updateContact(
  id: string,
  customerId: string,
  data: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
    notes?: string;
  },
  userId?: string
) {
  if (data.isPrimary) {
    await prisma.contact.updateMany({
      where: { customerId, isPrimary: true, NOT: { id }, deletedAt: null },
      data: { isPrimary: false },
    });
  }
  return prisma.contact.update({
    where: { id },
    data: { ...data, updatedById: userId },
  });
}

export async function deleteContact(id: string, userId?: string) {
  return prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

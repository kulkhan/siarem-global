import { prisma } from '../lib/prisma';

/**
 * Lists all active contacts for a customer, primary contacts first.
 * @param customerId - Parent customer ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Array of contact records ordered by isPrimary desc, name asc
 */
export async function getContacts(customerId: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  return prisma.contact.findMany({
    where: { customerId, deletedAt: null, ...tenantFilter },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });
}

/**
 * Creates a new contact for a customer; demotes existing primary if isPrimary is true.
 * @param customerId - Parent customer ID
 * @param data - Contact details (name, title, email, phone, isPrimary, notes)
 * @param userId - ID of the creating user
 * @param companyId - Tenant isolation company ID
 * @returns Created contact record
 */
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

/**
 * Updates a contact's fields; demotes other primary contacts if isPrimary is set to true.
 * @param id - Contact ID
 * @param customerId - Parent customer ID (for scoping the primary demotion query)
 * @param data - Partial update data
 * @param userId - ID of the updating user
 * @returns Updated contact record
 */
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

/**
 * Soft-deletes a contact by setting deletedAt timestamp.
 * @param id - Contact ID
 * @param userId - ID of the user performing the deletion
 * @returns Updated contact record with deletedAt set
 */
export async function deleteContact(id: string, userId?: string) {
  return prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

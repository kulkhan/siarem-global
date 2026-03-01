import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { ComplaintType, ComplaintStatus } from '@prisma/client';

/**
 * Returns a paginated, filterable list of complaints for a tenant.
 * @param params - Filter and pagination options including search, status, type, customerId, sort
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN (all tenants)
 * @returns Paginated complaint list with total count
 */
export async function getComplaints(params: {
  page: number; pageSize: number; search?: string;
  status?: ComplaintStatus; type?: ComplaintType;
  customerId?: string; sortBy?: string; sortOrder?: 'asc' | 'desc';
}, companyId: string | null) {
  const { page, pageSize, search, status, type, customerId, sortOrder = 'desc' } = params;
  const sortBy = ['createdAt', 'submittedAt', 'status', 'subject'].includes(params.sortBy ?? '') ? params.sortBy! : 'createdAt';
  const tenantFilter = companyId ? { companyId } : {};

  const where = {
    ...tenantFilter,
    ...(search ? {
      OR: [
        { subject: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
        { contactName: { contains: search, mode: 'insensitive' as const } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
      ]
    } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, shortCode: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.complaint.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

/**
 * Returns a single complaint by ID with customer details.
 * @param id - Complaint ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Complaint record with included customer
 * @throws {AppError} If complaint is not found (404)
 */
export async function getComplaintById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const c = await prisma.complaint.findFirst({
    where: { id, ...tenantFilter },
    include: {
      customer: { select: { id: true, name: true, shortCode: true } },
    },
  });
  if (!c) throw new AppError('Şikayet bulunamadı', 404);
  return c;
}

/**
 * Creates a new complaint record.
 * @param data - Complaint data including companyId, subject, description, and optional contact info
 * @returns Created complaint record
 */
export async function createComplaint(data: {
  companyId: string;
  customerId?: string;
  type?: ComplaintType;
  subject: string;
  description: string;
  contactName?: string;
  contactEmail?: string;
}) {
  return prisma.complaint.create({ data });
}

/**
 * Updates a complaint's fields; automatically sets respondedAt when status moves to RESOLVED/CLOSED.
 * @param id - Complaint ID
 * @param data - Partial update data (status, type, subject, responseNote, etc.)
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Updated complaint record
 * @throws {AppError} If complaint is not found (404)
 */
export async function updateComplaint(id: string, data: {
  status?: ComplaintStatus;
  type?: ComplaintType;
  subject?: string;
  description?: string;
  responseNote?: string;
  customerId?: string | null;
  contactName?: string;
  contactEmail?: string;
}, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.complaint.findFirst({ where: { id, ...tenantFilter } });
  if (!existing) throw new AppError('Şikayet bulunamadı', 404);

  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
    updateData.respondedAt = new Date();
  }

  return prisma.complaint.update({ where: { id }, data: updateData });
}

/**
 * Permanently deletes a complaint.
 * @param id - Complaint ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Deleted complaint record
 * @throws {AppError} If complaint is not found (404)
 */
export async function deleteComplaint(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.complaint.findFirst({ where: { id, ...tenantFilter } });
  if (!existing) throw new AppError('Şikayet bulunamadı', 404);
  return prisma.complaint.delete({ where: { id } });
}

import { prisma } from '../lib/prisma';

interface MeetingQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  meetingType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Returns a paginated, filterable list of meetings with customer and ship details.
 * @param q - Query options including search, customerId, meetingType, date range, sort
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN (all tenants)
 * @returns Paginated meeting list
 */
export async function getMeetings(q: MeetingQuery, companyId: string | null) {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const sortBy = q.sortBy ?? 'meetingDate';
  const sortOrder = q.sortOrder ?? 'desc';

  const tenantFilter = companyId ? { companyId } : {};
  const where: Record<string, unknown> = { deletedAt: null, ...tenantFilter };

  if (q.customerId) where.customerId = q.customerId;
  if (q.meetingType) where.meetingType = q.meetingType;

  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { customer: { name: { contains: q.search, mode: 'insensitive' } } },
      { description: { contains: q.search, mode: 'insensitive' } },
    ];
  }

  if (q.dateFrom || q.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (q.dateFrom) dateFilter.gte = new Date(q.dateFrom);
    if (q.dateTo) dateFilter.lte = new Date(q.dateTo + 'T23:59:59');
    where.meetingDate = dateFilter;
  }

  const include = {
    customer: { select: { id: true, name: true, shortCode: true } },
    ship: { select: { id: true, name: true, imoNumber: true } },
    createdBy: { select: { id: true, name: true } },
  };

  const [data, total] = await Promise.all([
    prisma.meeting.findMany({ where, include, skip, take: pageSize, orderBy: { [sortBy]: sortOrder } }),
    prisma.meeting.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

/**
 * Returns a single meeting by ID with customer, ship, and creator details.
 * @param id - Meeting ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Meeting record with includes
 * @throws {Error} If meeting is not found (Prisma findFirstOrThrow)
 */
export async function getMeetingById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  return prisma.meeting.findFirstOrThrow({
    where: { id, deletedAt: null, ...tenantFilter },
    include: {
      customer: { select: { id: true, name: true, shortCode: true } },
      ship: { select: { id: true, name: true, imoNumber: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

/**
 * Creates a new meeting record for a customer.
 * @param data - Meeting details (customerId, title, meetingDate, and optional fields)
 * @param userId - ID of the creating user
 * @param companyId - Tenant isolation company ID
 * @returns Created meeting record with customer and ship details
 */
export async function createMeeting(
  data: {
    customerId: string;
    shipId?: string;
    createdById?: string;
    meetingType?: string;
    title: string;
    description?: string;
    location?: string;
    duration?: number;
    meetingDate: string;
    followUpDate?: string;
    attendees?: string;
    notes?: string;
  },
  userId?: string,
  companyId?: string
) {
  return prisma.meeting.create({
    data: {
      customerId: data.customerId,
      companyId: companyId!,
      shipId: data.shipId || undefined,
      createdById: data.createdById || userId || undefined,
      meetingType: data.meetingType ?? 'MEETING',
      title: data.title,
      description: data.description || undefined,
      location: data.location || undefined,
      duration: data.duration || undefined,
      meetingDate: new Date(data.meetingDate),
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      attendees: data.attendees || undefined,
      notes: data.notes || undefined,
    },
    include: {
      customer: { select: { id: true, name: true, shortCode: true } },
      ship: { select: { id: true, name: true, imoNumber: true } },
    },
  });
}

/**
 * Updates a meeting's fields after verifying tenant ownership.
 * @param id - Meeting ID
 * @param data - Partial update data
 * @param userId - ID of the updating user
 * @param companyId - Tenant isolation company ID
 * @returns Updated meeting record with customer and ship details
 * @throws {Error} If meeting is not found (Prisma findFirstOrThrow)
 */
export async function updateMeeting(
  id: string,
  data: Partial<{
    customerId: string;
    shipId: string | null;
    meetingType: string;
    title: string;
    description: string | null;
    location: string | null;
    duration: number | null;
    meetingDate: string;
    followUpDate: string | null;
    attendees: string | null;
    notes: string | null;
  }>,
  userId?: string,
  companyId?: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  // Verify ownership
  await prisma.meeting.findFirstOrThrow({ where: { id, deletedAt: null, ...tenantFilter } });

  return prisma.meeting.update({
    where: { id },
    data: {
      ...data,
      updatedById: userId,
      shipId: data.shipId === null ? null : data.shipId || undefined,
      meetingDate: data.meetingDate ? new Date(data.meetingDate) : undefined,
      followUpDate: data.followUpDate === null ? null : data.followUpDate ? new Date(data.followUpDate) : undefined,
    },
    include: {
      customer: { select: { id: true, name: true, shortCode: true } },
      ship: { select: { id: true, name: true, imoNumber: true } },
    },
  });
}

/**
 * Soft-deletes a meeting by setting deletedAt timestamp.
 * @param id - Meeting ID
 * @param userId - ID of the user performing the deletion
 * @param companyId - Tenant isolation company ID
 * @returns Updated meeting record with deletedAt set
 * @throws {Error} If meeting is not found (Prisma findFirstOrThrow)
 */
export async function deleteMeeting(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  await prisma.meeting.findFirstOrThrow({ where: { id, deletedAt: null, ...tenantFilter } });
  return prisma.meeting.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

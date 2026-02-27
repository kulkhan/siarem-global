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

export async function deleteMeeting(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  await prisma.meeting.findFirstOrThrow({ where: { id, deletedAt: null, ...tenantFilter } });
  return prisma.meeting.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface ServiceReportUpsertData {
  workDone: string;
  findings?: string;
  partsUsed?: string;
  reportDate?: Date;
  status?: string;
}

export async function getServiceReport(serviceId: string, companyId: string) {
  return prisma.serviceReport.findUnique({
    where: { serviceId },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function upsertServiceReport(
  serviceId: string,
  companyId: string,
  userId: string,
  data: ServiceReportUpsertData
) {
  const service = await prisma.service.findFirst({ where: { id: serviceId, companyId } });
  if (!service) throw new AppError('Servis bulunamadı', 404);

  const existing = await prisma.serviceReport.findUnique({ where: { serviceId } });

  if (existing) {
    return prisma.serviceReport.update({
      where: { serviceId },
      data: {
        workDone: data.workDone,
        findings: data.findings ?? null,
        partsUsed: data.partsUsed ?? null,
        reportDate: data.reportDate ?? existing.reportDate,
        status: data.status ?? existing.status,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  return prisma.serviceReport.create({
    data: {
      serviceId,
      companyId,
      createdById: userId,
      workDone: data.workDone,
      findings: data.findings ?? null,
      partsUsed: data.partsUsed ?? null,
      reportDate: data.reportDate ?? new Date(),
      status: data.status ?? 'DRAFT',
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

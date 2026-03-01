import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface ServiceReportUpsertData {
  workDone: string;
  findings?: string;
  partsUsed?: string;
  reportDate?: Date;
  status?: string;
}

/**
 * Returns the service report for a given service, or null if none exists.
 * @param serviceId - Service ID
 * @param companyId - Tenant isolation company ID
 * @returns ServiceReport record with creator details, or null
 */
export async function getServiceReport(serviceId: string, companyId: string) {
  return prisma.serviceReport.findUnique({
    where: { serviceId },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

/**
 * Creates or updates the service report for a service (1:1 relationship).
 * @param serviceId - Service ID
 * @param companyId - Tenant isolation company ID
 * @param userId - ID of the user creating/updating the report
 * @param data - Report fields (workDone, findings, partsUsed, reportDate, status)
 * @returns Created or updated ServiceReport record with creator details
 * @throws {AppError} If the parent service is not found (404)
 */
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

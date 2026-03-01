import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface ShipCertificateData {
  certType: string;
  certNo?: string;
  issueDate?: Date | null;
  expiryDate: Date;
  issuedBy?: string;
  notes?: string;
}

export async function listCertificates(shipId: string, companyId: string) {
  return prisma.shipCertificate.findMany({
    where: { shipId, companyId },
    orderBy: { expiryDate: 'asc' },
  });
}

export async function createCertificate(
  shipId: string,
  companyId: string,
  data: ShipCertificateData
) {
  const ship = await prisma.ship.findFirst({ where: { id: shipId, companyId } });
  if (!ship) throw new AppError('Gemi bulunamadı', 404);

  return prisma.shipCertificate.create({
    data: {
      shipId,
      companyId,
      certType: data.certType,
      certNo: data.certNo ?? null,
      issueDate: data.issueDate ?? null,
      expiryDate: data.expiryDate,
      issuedBy: data.issuedBy ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function updateCertificate(
  certId: string,
  companyId: string,
  data: ShipCertificateData
) {
  const cert = await prisma.shipCertificate.findFirst({ where: { id: certId, companyId } });
  if (!cert) throw new AppError('Sertifika bulunamadı', 404);

  return prisma.shipCertificate.update({
    where: { id: certId },
    data: {
      certType: data.certType,
      certNo: data.certNo ?? null,
      issueDate: data.issueDate ?? null,
      expiryDate: data.expiryDate,
      issuedBy: data.issuedBy ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function deleteCertificate(certId: string, companyId: string) {
  const cert = await prisma.shipCertificate.findFirst({ where: { id: certId, companyId } });
  if (!cert) throw new AppError('Sertifika bulunamadı', 404);
  return prisma.shipCertificate.delete({ where: { id: certId } });
}

export async function getExpiringCertificates(companyId: string, daysAhead = 60) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return prisma.shipCertificate.findMany({
    where: {
      companyId,
      expiryDate: { lte: cutoff },
    },
    include: { ship: { select: { id: true, name: true, imoNumber: true } } },
    orderBy: { expiryDate: 'asc' },
  });
}

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

/**
 * Returns all certificates for a ship, ordered by expiry date ascending.
 * @param shipId - Ship ID
 * @param companyId - Tenant isolation company ID
 * @returns Array of ShipCertificate records
 */
export async function listCertificates(shipId: string, companyId: string) {
  return prisma.shipCertificate.findMany({
    where: { shipId, companyId },
    orderBy: { expiryDate: 'asc' },
  });
}

/**
 * Creates a certificate for a ship after verifying the ship belongs to the tenant.
 * @param shipId - Ship ID
 * @param companyId - Tenant isolation company ID
 * @param data - Certificate data (certType, certNo, issueDate, expiryDate, issuedBy, notes)
 * @returns Created ShipCertificate record
 * @throws {AppError} If ship is not found (404)
 */
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

/**
 * Updates a ship certificate's fields.
 * @param certId - Certificate ID
 * @param companyId - Tenant isolation company ID
 * @param data - Certificate update data
 * @returns Updated ShipCertificate record
 * @throws {AppError} If certificate is not found (404)
 */
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

/**
 * Permanently deletes a ship certificate (cascades to associated documents).
 * @param certId - Certificate ID
 * @param companyId - Tenant isolation company ID
 * @returns Deleted ShipCertificate record
 * @throws {AppError} If certificate is not found (404)
 */
export async function deleteCertificate(certId: string, companyId: string) {
  const cert = await prisma.shipCertificate.findFirst({ where: { id: certId, companyId } });
  if (!cert) throw new AppError('Sertifika bulunamadı', 404);
  return prisma.shipCertificate.delete({ where: { id: certId } });
}

/**
 * Returns certificates expiring within the specified number of days, with ship details.
 * @param companyId - Tenant isolation company ID
 * @param daysAhead - Number of days to look ahead (default 60)
 * @returns Array of ShipCertificate records with ship details, ordered by expiryDate asc
 */
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

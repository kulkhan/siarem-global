import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

/**
 * Lists all documents attached to a ship certificate, ordered by newest first.
 * @param certId - Ship certificate ID
 * @param companyId - Tenant isolation company ID
 * @returns Array of document records for the certificate
 */
export async function listCertDocuments(certId: string, companyId: string) {
  return prisma.document.findMany({
    where: { shipCertificateId: certId, companyId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates a document record for a ship certificate upload.
 * @param certId - Ship certificate ID to attach the document to
 * @param companyId - Tenant isolation company ID
 * @param displayName - Human-readable name shown in the UI
 * @param storedFilename - Filename on disk (timestamp + random suffix)
 * @param originalFilename - Original uploaded filename
 * @param mimetype - MIME type of the uploaded file
 * @param size - File size in bytes
 * @param uploadedById - User ID who uploaded the file
 * @returns Created document record
 */
export async function createCertDocument({
  certId,
  companyId,
  displayName,
  storedFilename,
  originalFilename,
  mimetype,
  size,
  uploadedById,
}: {
  certId: string;
  companyId: string;
  displayName: string;
  storedFilename: string;
  originalFilename: string;
  mimetype?: string;
  size?: number;
  uploadedById?: string;
}) {
  return prisma.document.create({
    data: {
      companyId,
      entityType: 'SHIP_CERTIFICATE',
      displayName,
      storedFilename,
      originalFilename,
      mimetype,
      size,
      uploadedById: uploadedById ?? null,
      shipCertificateId: certId,
    },
  });
}

/**
 * Deletes a certificate document record and removes the associated file from disk.
 * @param docId - Document record ID
 * @param companyId - Tenant isolation company ID
 * @returns Deleted document record
 * @throws {Error} If the document is not found for the given company
 */
export async function deleteCertDocument(docId: string, companyId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: docId, companyId },
  });
  if (!doc) throw new Error('Document not found');

  const filePath = path.join(path.resolve(env.uploadDir), 'cert-docs', doc.storedFilename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return prisma.document.delete({ where: { id: docId } });
}

import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

export async function listCertDocuments(certId: string, companyId: string) {
  return prisma.document.findMany({
    where: { shipCertificateId: certId, companyId },
    orderBy: { createdAt: 'desc' },
  });
}

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

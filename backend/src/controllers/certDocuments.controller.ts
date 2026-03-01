import { Request, Response } from 'express';
import * as svc from '../services/certDocuments.service';

export async function list(req: Request, res: Response) {
  try {
    const { certId } = req.params;
    const companyId = req.user!.companyId!;
    const docs = await svc.listCertDocuments(certId, companyId);
    res.json({ success: true, data: docs });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
}

export async function upload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { certId } = req.params;
    const companyId = req.user!.companyId!;
    const uploadedById = req.user!.sub;
    const displayName = (req.body.displayName as string | undefined) || req.file.originalname;

    const doc = await svc.createCertDocument({
      certId,
      companyId,
      displayName,
      storedFilename: req.file.filename,
      originalFilename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedById,
    });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { docId } = req.params;
    const companyId = req.user!.companyId!;
    await svc.deleteCertDocument(docId, companyId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
}

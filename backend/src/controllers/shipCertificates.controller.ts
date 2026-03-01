import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/shipCertificates.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listCertificates(req.params.id, req.user!.companyId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as svc.ShipCertificateData;
    const data = await svc.createCertificate(req.params.id, req.user!.companyId!, {
      ...body,
      issueDate: body.issueDate ? new Date(body.issueDate) : null,
      expiryDate: new Date(body.expiryDate),
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as svc.ShipCertificateData;
    const data = await svc.updateCertificate(req.params.certId, req.user!.companyId!, {
      ...body,
      issueDate: body.issueDate ? new Date(body.issueDate) : null,
      expiryDate: new Date(body.expiryDate),
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteCertificate(req.params.certId, req.user!.companyId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

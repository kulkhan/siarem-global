import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/shipCertificates.service';

/**
 * Returns all certificates for a ship, ordered by expiry date.
 * @route GET /api/ships/:id/certificates
 * @access authenticate
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listCertificates(req.params.id, req.user!.companyId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a new certificate for a ship.
 * @route POST /api/ships/:id/certificates
 * @access authenticate
 */
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

/**
 * Updates a ship certificate by ID.
 * @route PUT /api/ships/:id/certificates/:certId
 * @access authenticate
 */
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

/**
 * Permanently deletes a ship certificate and its associated documents.
 * @route DELETE /api/ships/:id/certificates/:certId
 * @access authenticate
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteCertificate(req.params.certId, req.user!.companyId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

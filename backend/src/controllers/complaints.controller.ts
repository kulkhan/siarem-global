import { Request, Response, NextFunction } from 'express';
import { ComplaintStatus, ComplaintType } from '@prisma/client';
import * as svc from '../services/complaints.service';
import { verifyRecaptcha } from '../lib/recaptcha';

/**
 * Returns a paginated, filterable list of complaints.
 * @route GET /api/complaints
 * @access authenticate
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const { page = '1', pageSize = '20', search, status, type, customerId, sortBy, sortOrder } = req.query as Record<string, string>;
    const result = await svc.getComplaints({
      page: Number(page), pageSize: Number(pageSize), search,
      status: status as ComplaintStatus | undefined,
      type: type as ComplaintType | undefined,
      customerId, sortBy, sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    }, companyId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

/**
 * Returns a single complaint by ID.
 * @route GET /api/complaints/:id
 * @access authenticate
 */
export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await svc.getComplaintById(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Creates a new complaint for the authenticated user's company.
 * @route POST /api/complaints
 * @access authenticate
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'Tenant gerekli' });
    const data = await svc.createComplaint({ ...req.body, companyId });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Updates a complaint's fields by ID.
 * @route PUT /api/complaints/:id
 * @access authenticate
 */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await svc.updateComplaint(req.params.id, req.body, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Permanently deletes a complaint by ID.
 * @route DELETE /api/complaints/:id
 * @access authenticate
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    await svc.deleteComplaint(req.params.id, companyId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

/**
 * Creates a complaint submitted from the public-facing form; requires reCAPTCHA verification.
 * @route POST /api/complaints/public
 * @access Public
 */
// Public endpoint — no auth required
export async function publicCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const { companySlug, type, recaptchaToken, ...body } = req.body as { companySlug: string; subject: string; description: string; type?: string; contactName?: string; contactEmail?: string; recaptchaToken?: string };

    const captchaOk = await verifyRecaptcha(recaptchaToken ?? '');
    if (!captchaOk) {
      return res.status(400).json({ success: false, message: 'CAPTCHA doğrulaması başarısız. Lütfen tekrar deneyin.' });
    }
    const { prisma } = await import('../lib/prisma');
    const company = await prisma.company.findFirst({
      where: { OR: [{ slug: companySlug }, { domain: companySlug }], isActive: true },
    });
    if (!company) return res.status(404).json({ success: false, message: 'Firma bulunamadı' });
    const data = await svc.createComplaint({
      ...body,
      companyId: company.id,
      ...(type ? { type: type as ComplaintType } : {}),
    });
    res.status(201).json({ success: true, data: { id: data.id } });
  } catch (err) { next(err); }
}

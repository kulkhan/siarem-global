import { Request, Response, NextFunction } from 'express';
import { ComplaintStatus, ComplaintType } from '@prisma/client';
import * as svc from '../services/complaints.service';

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

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await svc.getComplaintById(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'Tenant gerekli' });
    const data = await svc.createComplaint({ ...req.body, companyId });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await svc.updateComplaint(req.params.id, req.body, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    await svc.deleteComplaint(req.params.id, companyId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

// Public endpoint — no auth required
export async function publicCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const { companySlug, type, ...body } = req.body as { companySlug: string; subject: string; description: string; type?: string; contactName?: string; contactEmail?: string };
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

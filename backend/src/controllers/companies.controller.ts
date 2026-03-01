import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import * as companiesService from '../services/companies.service';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

export async function listCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await companiesService.getCompanies();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await companiesService.getCompanyById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getOwnCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    if (!user.companyId) return next(new AppError('No associated company', 404));
    const data = await companiesService.getCompanyById(user.companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateOwnCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    if (!user.companyId) return next(new AppError('No associated company', 404));
    if (user.role !== 'ADMIN') return next(new AppError('Insufficient permissions', 403));

    // Only allow safe profile fields — slug/domain/plan/isActive managed by SUPER_ADMIN
    const { name, email, phone, address, city, country, taxNumber, website } = req.body as companiesService.CompanySelfUpdateData;
    const data = await companiesService.updateCompany(user.companyId, {
      name, email, phone, address, city, country, taxNumber, website,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await companiesService.createCompany(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await companiesService.updateCompany(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteCompany(req: Request, res: Response, next: NextFunction) {
  try {
    await companiesService.deleteCompany(req.params.id);
    res.json({ success: true, message: 'Şirket silindi' });
  } catch (err) {
    next(err);
  }
}

export async function updateModules(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyType, modules } = req.body as { companyType: string; modules: string[] };
    const data = await companiesService.updateCompanyModules(req.params.id, companyType, modules ?? []);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function uploadLogo(req: Request, res: Response, next: NextFunction) {
  const cleanup = () => {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
  };
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!req.file) return next(new AppError('No file uploaded', 400));

    // Permission: SUPER_ADMIN can upload for any company; ADMIN only for own
    if (user.role !== 'SUPER_ADMIN' && !(user.role === 'ADMIN' && user.companyId === id)) {
      cleanup();
      return next(new AppError('Insufficient permissions', 403));
    }

    // Get old logo to delete it
    const existing = await prisma.company.findUnique({ where: { id }, select: { logoUrl: true } });
    if (!existing) { cleanup(); return next(new AppError('Şirket bulunamadı', 404)); }

    if (existing.logoUrl) {
      const rel = existing.logoUrl.replace(/^\/uploads\//, '');
      const oldPath = path.join(path.resolve(env.uploadDir), rel);
      if (fs.existsSync(oldPath)) try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const updated = await companiesService.updateCompany(id, { logoUrl });
    res.json({ success: true, data: updated });
  } catch (err) {
    cleanup();
    next(err);
  }
}

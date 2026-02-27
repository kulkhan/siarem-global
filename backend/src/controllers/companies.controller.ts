import { Request, Response, NextFunction } from 'express';
import * as companiesService from '../services/companies.service';

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

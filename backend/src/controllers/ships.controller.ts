import { Request, Response, NextFunction } from 'express';
import {
  getShips, getShipById, createShip, updateShip,
  deleteShip, getShipTypes, getFlagOptions,
} from '../services/ships.service';
import { ShipStatus } from '@prisma/client';
import { logAudit } from '../services/audit.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'))));
    const result = await getShips({
      page, pageSize,
      search: String(req.query.search ?? '').trim() || undefined,
      customerId: String(req.query.customerId ?? '').trim() || undefined,
      shipTypeId: req.query.shipTypeId ? parseInt(String(req.query.shipTypeId)) : undefined,
      status: req.query.status ? (req.query.status as ShipStatus) : undefined,
      flag: String(req.query.flag ?? '').trim() || undefined,
      sortBy: String(req.query.sortBy ?? 'name'),
      sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
    }, companyId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await getShipById(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? undefined;
    const body = req.body;
    const data = await createShip({
      ...body,
      shipTypeId: body.shipTypeId ? parseInt(body.shipTypeId) : undefined,
      grossTonnage: body.grossTonnage ? parseFloat(body.grossTonnage) : undefined,
      dwt: body.dwt ? parseFloat(body.dwt) : undefined,
      netTonnage: body.netTonnage ? parseFloat(body.netTonnage) : undefined,
      builtYear: body.builtYear ? parseInt(body.builtYear) : undefined,
    }, userId, companyId);
    await logAudit(req, 'Ship', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    const body = req.body;
    const data = await updateShip(req.params.id, {
      ...body,
      shipTypeId: body.shipTypeId ? parseInt(body.shipTypeId) : undefined,
      grossTonnage: body.grossTonnage ? parseFloat(body.grossTonnage) : undefined,
      dwt: body.dwt ? parseFloat(body.dwt) : undefined,
      netTonnage: body.netTonnage ? parseFloat(body.netTonnage) : undefined,
      builtYear: body.builtYear ? parseInt(body.builtYear) : undefined,
    }, userId, companyId);
    await logAudit(req, 'Ship', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    await deleteShip(req.params.id, userId, companyId);
    await logAudit(req, 'Ship', 'DELETE', req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

export async function shipTypeList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await getShipTypes(companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function flagOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await getFlagOptions(companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

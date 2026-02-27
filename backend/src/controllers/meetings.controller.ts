import { Request, Response, NextFunction } from 'express';
import { getMeetings, getMeetingById, createMeeting, updateMeeting, deleteMeeting } from '../services/meetings.service';
import { logAudit } from '../services/audit.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'))));
    const result = await getMeetings({
      page, pageSize,
      search: String(req.query.search ?? '').trim() || undefined,
      customerId: String(req.query.customerId ?? '').trim() || undefined,
      meetingType: String(req.query.meetingType ?? '').trim() || undefined,
      dateFrom: String(req.query.dateFrom ?? '').trim() || undefined,
      dateTo: String(req.query.dateTo ?? '').trim() || undefined,
      sortBy: String(req.query.sortBy ?? 'meetingDate'),
      sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getMeetingById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const data = await createMeeting(req.body, userId);
    await logAudit(req, 'Meeting', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const data = await updateMeeting(req.params.id, req.body, userId);
    await logAudit(req, 'Meeting', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    await deleteMeeting(req.params.id, userId);
    await logAudit(req, 'Meeting', 'DELETE', req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

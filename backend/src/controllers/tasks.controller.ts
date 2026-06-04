import { Request, Response } from 'express';
import * as svc from '../services/tasks.service';

export async function list(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId ?? null;
    const { page = '1', pageSize = '20', status, priority, assignedUserId, meetingId, sortBy, sortOrder } = req.query as Record<string, string>;
    const result = await svc.getTasks(
      { page: +page, pageSize: +pageSize, status, priority, assignedUserId, meetingId, sortBy, sortOrder: sortOrder as 'asc' | 'desc' },
      companyId
    );
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
}

export async function getOne(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId ?? null;
    const data = await svc.getTaskById(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, message: e.message });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.sub;
    const data = await svc.createTask(req.body, userId, companyId);
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, message: e.message });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId ?? null;
    const data = await svc.updateTask(req.params.id, req.body, companyId);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, message: e.message });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId ?? null;
    await svc.deleteTask(req.params.id, companyId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, message: e.message });
  }
}

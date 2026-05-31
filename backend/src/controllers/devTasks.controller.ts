import { Request, Response } from 'express';
import * as svc from '../services/devTasks.service';

export async function list(req: Request, res: Response) {
  try {
    const data = await svc.getDevTasks();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const data = await svc.createDevTask(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const data = await svc.updateDevTask(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    await svc.deleteDevTask(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
}

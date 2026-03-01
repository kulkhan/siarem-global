import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/customerNotes.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listNotes(req.params.id, req.user!.companyId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { content } = req.body as { content: string };
    const data = await svc.createNote(
      req.params.id,
      req.user!.companyId!,
      req.user!.sub,
      content
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    await svc.deleteNote(req.params.noteId, user.companyId!, user.sub, isAdmin);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

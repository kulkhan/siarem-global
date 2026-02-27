import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/users.service';
import { AppError } from '../middleware/error.middleware';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const users = await svc.getUsers(companyId);
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) throw new AppError('name, email, password zorunludur', 400);
    const user = await svc.createUser({ name, email, password, role: role ?? 'USER' }, companyId);
    res.status(201).json({ success: true, data: user });
  } catch (err: unknown) {
    const e = err as { code?: string; meta?: { target?: string[] } };
    if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
      return next(new AppError('Bu e-posta zaten kullanımda', 409));
    }
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (req.user?.sub === id && (req.body.role !== undefined || req.body.isActive === false)) {
      throw new AppError('Kendi rolünüzü veya durumunuzu değiştiremezsiniz', 403);
    }
    const user = await svc.updateUser(id, req.body);
    res.json({ success: true, data: user });
  } catch (err: unknown) {
    const e = err as { code?: string; meta?: { target?: string[] } };
    if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
      return next(new AppError('Bu e-posta zaten kullanımda', 409));
    }
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (req.user?.sub === id) throw new AppError('Kendinizi silemezsiniz', 403);
    await svc.deleteUser(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (req.user?.sub !== id && req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      throw new AppError('Yetersiz yetki', 403);
    }
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Şifre en az 6 karakter olmalıdır', 400);
    }
    await svc.updateUser(id, { password: newPassword });
    res.json({ success: true, message: 'Şifre güncellendi' });
  } catch (err) {
    next(err);
  }
}

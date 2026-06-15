import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/emailConfig.service';
import { Pop3Client } from '../lib/pop3';

export async function getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) { res.status(400).json({ success: false, message: 'Company context required' }); return; }
    const data = await svc.getEmailConfig(companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function saveConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) { res.status(400).json({ success: false, message: 'Company context required' }); return; }
    const data = await svc.upsertEmailConfig(companyId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function testConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { host, port, username, password, useTls } = req.body;
    const client = new Pop3Client();
    await client.connect(host, Number(port) || 995, useTls !== false);
    await client.login(username, password);
    await client.quit();
    res.json({ success: true, message: 'Bağlantı başarılı' });
  } catch (err) {
    res.status(400).json({ success: false, message: `Bağlantı hatası: ${(err as Error).message}` });
  }
}

export async function createRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) { res.status(400).json({ success: false, message: 'Company context required' }); return; }
    const data = await svc.createEmailRule(companyId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) { res.status(400).json({ success: false, message: 'Company context required' }); return; }
    const data = await svc.updateEmailRule(req.params.ruleId, companyId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) { res.status(400).json({ success: false, message: 'Company context required' }); return; }
    await svc.deleteEmailRule(req.params.ruleId, companyId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) { res.status(400).json({ success: false, message: 'Company context required' }); return; }
    const data = await svc.getEmailLogs(companyId, 100);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

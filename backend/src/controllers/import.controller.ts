import { Request, Response, NextFunction } from 'express';
import { buildTemplate, previewImport, executeImport, type ValidRow } from '../services/import.service';

const VALID_ENTITIES = ['customers', 'products', 'quotes', 'invoices', 'services'] as const;
type ImportEntity = (typeof VALID_ENTITIES)[number];

function validateEntity(entity: string): entity is ImportEntity {
  return VALID_ENTITIES.includes(entity as ImportEntity);
}

/**
 * GET /api/import/:entity/template
 * Returns a downloadable .xlsx template for the given entity.
 */
export async function downloadTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { entity } = req.params;
    if (!validateEntity(entity)) {
      return res.status(400).json({ success: false, message: `Geçersiz entity: ${entity}` });
    }

    const workbook = buildTemplate(entity);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/import/:entity/preview
 * Accepts multipart/form-data with field "file" (.xlsx/.xls).
 * Returns { valid[], skipped[], errors[], summary } without writing to DB.
 */
export async function previewImportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { entity } = req.params;
    if (!validateEntity(entity)) {
      return res.status(400).json({ success: false, message: `Geçersiz entity: ${entity}` });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'Excel dosyası gerekli (field: file)' });
    }

    const companyId = req.user!.companyId!;
    const result = await previewImport(entity, file.buffer, companyId);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/import/:entity/execute
 * Body: { rows: ValidRow[] } — the valid rows returned from preview.
 * Writes records to DB and returns { imported, errors[] }.
 */
export async function executeImportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { entity } = req.params;
    if (!validateEntity(entity)) {
      return res.status(400).json({ success: false, message: `Geçersiz entity: ${entity}` });
    }

    const { rows } = req.body as { rows?: unknown[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'rows dizisi gerekli ve boş olmamalı' });
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.sub;

    const result = await executeImport(entity, rows as ValidRow[], companyId, userId);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

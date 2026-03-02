import { Router } from 'express';
import path from 'path';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/import.controller';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece .xlsx veya .xls dosyası yüklenebilir'));
    }
  },
});

router.get('/:entity/template', ctrl.downloadTemplate);
router.post('/:entity/preview', excelUpload.single('file'), ctrl.previewImportHandler);
router.post('/:entity/execute', ctrl.executeImportHandler);

export default router;

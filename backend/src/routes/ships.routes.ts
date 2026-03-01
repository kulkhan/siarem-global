import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware';
import { env } from '../config/env';
import { list, getOne, create, update, remove, shipTypeList, flagOptions } from '../controllers/ships.controller';
import * as certCtrl from '../controllers/shipCertificates.controller';
import * as certDocCtrl from '../controllers/certDocuments.controller';

const router = Router();
router.use(authenticate);

// Multer for certificate document uploads
const certDocStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(path.resolve(env.uploadDir), 'cert-docs');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const certDocUpload = multer({
  storage: certDocStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

router.get('/types', shipTypeList);
router.get('/options/flags', flagOptions);
router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Ship certificate endpoints
router.get('/:id/certificates', certCtrl.list);
router.post('/:id/certificates', certCtrl.create);
router.put('/:id/certificates/:certId', certCtrl.update);
router.delete('/:id/certificates/:certId', certCtrl.remove);

// Certificate document endpoints
router.get('/:id/certificates/:certId/documents', certDocCtrl.list);
router.post('/:id/certificates/:certId/documents', certDocUpload.single('file'), certDocCtrl.upload);
router.delete('/:id/certificates/:certId/documents/:docId', certDocCtrl.remove);

export default router;

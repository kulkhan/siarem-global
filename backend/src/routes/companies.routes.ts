import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { env } from '../config/env';
import * as ctrl from '../controllers/companies.controller';

const router = Router();

// Authenticate all company routes
router.use(authenticate);

// Multer setup for logo uploads
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(path.resolve(env.uploadDir), 'logos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_${Date.now()}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// Logo upload: controller checks SUPER_ADMIN or own-company ADMIN
router.post('/:id/logo', logoUpload.single('logo'), ctrl.uploadLogo);

// Own company: any authenticated user with a companyId
router.get('/own', ctrl.getOwnCompany);
// ADMIN updates own company profile
router.patch('/own', ctrl.updateOwnCompany);

// Everything below requires SUPER_ADMIN
router.use(requireRole('SUPER_ADMIN'));

router.get('/', ctrl.listCompanies);
router.get('/:id', ctrl.getCompany);
router.post('/', ctrl.createCompany);
router.put('/:id', ctrl.updateCompany);
router.delete('/:id', ctrl.deleteCompany);

export default router;

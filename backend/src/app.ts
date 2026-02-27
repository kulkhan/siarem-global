import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
import { resolveTenant } from './middleware/tenant.middleware';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// CORS — allow all *.siarem.local and localhost origins in dev
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server or curl
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('.siarem.local') ||
      origin.includes('.siarem.com') ||
      origin === env.frontendUrl
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.resolve(env.uploadDir)));

// Tenant resolution (reads X-Tenant-Domain header)
app.use(resolveTenant);

// API routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

export default app;

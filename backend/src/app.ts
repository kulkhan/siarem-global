import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
import { resolveTenant } from './middleware/tenant.middleware';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // In development, allow all origins
    if (env.nodeEnv !== 'production') return callback(null, true);
    // In production: allow only known origins
    if (!origin) return callback(null, true); // server-to-server / curl
    if (
      origin === 'https://siarem.com' ||
      origin === 'https://www.siarem.com' ||
      origin.endsWith('.siarem.com') ||
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

import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// CORS
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.resolve(env.uploadDir)));

// API routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

export default app;

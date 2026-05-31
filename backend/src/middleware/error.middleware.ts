import { Request, Response, NextFunction } from 'express';

/**
 * Typed application error with an HTTP status code.
 * Throw this in services/controllers to return a structured error response.
 * The global errorHandler below serialises it as { success: false, message }.
 */
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error handler — must be the last middleware registered in app.ts.
 * AppError instances are forwarded with their own status code.
 * In production, 500 errors are sanitised to "Internal server error"
 * to avoid leaking stack traces to clients.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message;

  if (statusCode === 500) {
    console.error('[ERROR]', err.message, err.stack);
  }

  res.status(statusCode).json({ success: false, message });
}

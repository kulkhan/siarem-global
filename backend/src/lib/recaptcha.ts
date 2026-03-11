import https from 'https';
import { env } from '../config/env';

/**
 * Verifies a Google reCAPTCHA v2 token server-side.
 * Uses Google's test secret by default (always passes in development).
 * Set RECAPTCHA_SECRET_KEY in production .env for real validation.
 */
export function verifyRecaptcha(token: string): Promise<boolean> {
  return new Promise((resolve) => {
    // In non-production environments skip the network call entirely
    if (process.env.NODE_ENV !== 'production') return resolve(true);

    if (!token) return resolve(false);

    const body = `secret=${encodeURIComponent(env.recaptchaSecret)}&response=${encodeURIComponent(token)}`;

    const req = https.request(
      {
        hostname: 'www.google.com',
        path: '/recaptcha/api/siteverify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data) as { success: boolean };
            resolve(json.success === true);
          } catch {
            resolve(false);
          }
        });
      }
    );

    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminDomain: process.env.ADMIN_DOMAIN || 'admin.siarem.local',
  // Google reCAPTCHA v2 — default is Google's public test key (always passes)
  // Replace with real key from https://www.google.com/recaptcha/admin in production
  recaptchaSecret: process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
};

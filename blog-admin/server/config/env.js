require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5000,
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  mainSiteUrl: process.env.MAIN_SITE_URL || 'https://embtelsolutions.com',
  // Extra origins allowed to call the public API (comma-separated). The admin
  // origin (APP_URL) is always allowed; add the marketing site's origin(s) here.
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8811,https://embtelsolutions.com,https://www.embtelsolutions.com')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/blog_admin'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtCookieExpiresDays: parseInt(process.env.JWT_COOKIE_EXPIRES_DAYS, 10) || 1,
  sessionSecret: required('SESSION_SECRET'),
  resetTokenExpiresMinutes: parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES, 10) || 30,

  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME || 'Site Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@embtel.com',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },

  tinymceApiKey: process.env.TINYMCE_API_KEY || '',

  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB, 10) || 5,

  rateLimit: {
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
    loginMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10,
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Blog Admin <no-reply@embtel.com>',
  },
};

const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const env = require('./config/env');
const sanitizeInput = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { issueCsrfToken, verifyCsrfToken } = require('./middleware/csrf');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const apiRoutes = require('./routes/apiRoutes');
const adminViewRoutes = require('./routes/adminViewRoutes');

const app = express();

app.set('trust proxy', 1);

// --- View engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'client', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/admin');
// extractScripts/extractStyles default to false — leaving them off means each
// page's own <script> tags (dashboard.js, blog-form.js, TinyMCE, ...) render
// inline exactly where the page puts them, instead of being silently
// stripped out with nowhere in the layout to re-render them.

// --- Security & core middleware ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 'unsafe-inline' + the elfsight/formspree domains below are needed because this
        // server also serves the embtel-final marketing site (inline <style>/<script>
        // blocks, WhatsApp widget, contact form) on the same origin/port.
        // TinyMCE loads self-hosted (/tinymce, same origin) by default, or from
        // cdn.tiny.cloud when TINYMCE_API_KEY is set — both are allowed here.
        // Note: *.elfsight.com / *.elfsightcdn.com wildcards do NOT match the bare
        // apex domain (elfsightcdn.com itself) — both forms are listed explicitly.
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdn.tiny.cloud', 'cdnjs.cloudflare.com', 'cdn.tailwindcss.com', 'https://elfsight.com', 'https://*.elfsight.com', 'https://elfsightcdn.com', 'https://*.elfsightcdn.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'cdn.tiny.cloud', 'https://elfsightcdn.com', 'https://*.elfsightcdn.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdn.tiny.cloud', 'cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        // env.appUrl covers same-origin API calls; the explicit Render URL covers
        // embtel-final calling the deployed API cross-origin when tested/served
        // through this same unified server locally.
        connectSrc: ["'self'", env.appUrl, 'https://embtelsolutions.com','https://www.embtelsolutions.com', 'cdn.tiny.cloud', 'https://formspree.io', 'https://elfsight.com', 'https://*.elfsight.com', 'https://elfsightcdn.com', 'https://*.elfsightcdn.com'],
        frameSrc: ["'self'", 'cdn.tiny.cloud', 'https://elfsight.com', 'https://*.elfsight.com'],
      },
    },
  })
);
const allowedOrigins = [env.appUrl, ...env.corsOrigins];
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin / non-browser requests (curl, server-to-server) send no Origin header.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const err = new Error(`Origin ${origin} is not allowed by CORS`);
      err.statusCode = 403;
      return callback(err);
    },
    credentials: true,
  })
);
app.use(compression());
app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(sanitizeInput);
app.use('/api', apiLimiter);
app.use(issueCsrfToken);
app.use('/api', verifyCsrfToken);
app.use((req, res, next) => {
  res.locals.mainSiteUrl = env.mainSiteUrl;
  next();
});

// --- Static assets ---
// The embtel-final marketing site (a separate static project, sibling to this
// one) is served from the SAME Express server so both run on one port instead
// of two — no separate static file server, no cross-origin fetch() needed.
// Mounted first: its own root-level HTML files (index.html, blog.html, ...)
// take priority; anything it doesn't have (e.g. /css/admin.css, /js/admin.js
// for this app's own admin UI) falls through to the static dir below.
// `extensions: ['html']` mirrors Vercel's cleanUrls behavior (which handles
// this automatically in production) so /about resolves to about.html locally too.
app.use(express.static(path.join(__dirname, '..', '..', 'embtel-final'), { extensions: ['html'] }));
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Self-hosted TinyMCE (npm package) — avoids the cloud CDN's "no API key"
// read-only restriction entirely; no key needed for local/self-hosted use.
app.use('/tinymce', express.static(path.join(__dirname, '..', 'node_modules', 'tinymce')));

// /blog/:slug is a "virtual" path — there's no literal file per post. Serve
// blog-details.html for any single-segment path under /blog/ and let its own
// client-side JS read the slug straight from the URL (see blog-details.html).
// This must come after the static mounts above so an actual file at that path
// (there won't be one, but just in case) always wins.
app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'embtel-final', 'blog-details.html'));
});

// --- Routes ---
// This app now serves three things on one port: the embtel-final marketing
// site (static, above), the admin panel (/admin), and the API (/api) —
// including /api/public/* which the marketing site's blog pages fetch from.
app.use('/api', apiRoutes);
app.use('/admin', adminViewRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import whatsappWebhookRoutes from './routes/whatsappWebhookRoutes.js';
import { requireAdmin, requireAuth } from './middleware/auth.js';
import { sendError, sendSuccess } from './utils/responses.js';
import { connectDatabase } from './config/database.js';
import { seedDatabase } from './bootstrap/seedDatabase.js';
import { isProduction, validateEnvironment } from './config/env.js';

const app = express();
const PORT = Number(process.env.PORT || 5001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5180';

// Extra production origins can be supplied without a code change.
const extraOrigins = (process.env.ADDITIONAL_CLIENT_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = new Set(
  [
    'https://dearte-client.vercel.app',
    CLIENT_ORIGIN,
    ...extraOrigins,
  ].filter(Boolean),
);

// Only loopback origins are auto-allowed outside production. The previous
// `origin: true` echoed back *any* origin with credentials enabled, so a
// deployment that had not set NODE_ENV=production let any website on the
// internet make authenticated requests on a logged-in user's behalf.
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function isOriginAllowed(origin) {
  if (allowedOrigins.has(origin)) return true;
  return !isProduction && LOOPBACK_ORIGIN.test(origin);
}

// Render/Vercel terminate TLS upstream; without this the rate limiter sees the
// proxy's IP for every caller and the per-IP budgets are meaningless.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header: same-origin navigations, curl, health checks.
      if (!origin || isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // This process only serves JSON; a restrictive CSP costs nothing here and
    // hardens any HTML that an error page or future route might return.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
  }),
);

// Baseline budget for every caller. Auth routes apply their own tighter limits.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, message: 'Too many requests. Please slow down.' },
  }),
);

// Most endpoints only ever receive small JSON payloads; the 25mb allowance is
// scoped to the bulk-import route rather than exposed on every path.
app.use('/api/admin/products/bulk-import', express.json({ limit: '25mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) =>
  // Deliberately does not touch the database or report row counts: an
  // unauthenticated endpoint should not be a free query or an inventory oracle.
  sendSuccess(res, { status: 'ok' }, 'API healthy'),
);

app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappWebhookRoutes);
app.use('/api', publicRoutes);
app.use('/api', requireAuth, userRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

app.use((_req, res) => sendError(res, 'Not found', 404));

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;

  // Log the full error server-side, but never return internals (stack traces,
  // Mongoose cast details, driver messages) to the caller on a 5xx.
  if (status >= 500) {
    console.error('[error]', err);
    return sendError(res, 'Internal server error', 500);
  }

  // Mongoose rejects malformed ids with a CastError; that is a bad request,
  // not a server fault, and it used to surface as a 500 with schema details.
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return sendError(res, 'Invalid request', 400);
  }

  return sendError(res, err.expose === false ? 'Request failed' : err.message || 'Request failed', status);
});

async function start() {
  validateEnvironment();
  await connectDatabase();
  await seedDatabase();

  app.listen(PORT, () => {
    console.log(`DeArte API running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});

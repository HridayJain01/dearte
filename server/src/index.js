import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import whatsappWebhookRoutes from './routes/whatsappWebhookRoutes.js';
import { requireAdmin, requireAuth } from './middleware/auth.js';
import { sendError, sendSuccess } from './utils/responses.js';
import { connectDatabase } from './config/database.js';
import { seedDatabase } from './bootstrap/seedDatabase.js';
import { Product } from './models/index.js';

const app = express();
const PORT = Number(process.env.PORT || 5001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Support multiple origins for dev and production
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://dearte-client.vercel.app',
  CLIENT_ORIGIN,
].filter(Boolean);

const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  // In development, allow any origin and echo it back so credentials work.
  // This avoids accidental CORS failures from localhost variants (127.0.0.1, ::1).
  app.use(cors({ origin: true, credentials: true }));
} else {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      credentials: true,
    }),
  );
}
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/api/health', async (_req, res) => {
  const products = await Product.countDocuments();
  return sendSuccess(res, { status: 'ok', products }, 'API healthy');
});

app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappWebhookRoutes);
app.use('/api', publicRoutes);
app.use('/api', requireAuth, userRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  return sendError(res, err.message || 'Internal server error', err.status || 500);
});

async function start() {
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

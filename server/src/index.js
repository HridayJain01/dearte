import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { requireAdmin, requireAuth } from './middleware/auth.js';
import { db, saveDb } from './services/store.js';
import { sendSuccess } from './utils/responses.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) =>
  sendSuccess(res, { status: 'ok', products: db.products.length }, 'API healthy'),
);

app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api', requireAuth, userRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

cron.schedule('0 */3 * * *', () => {
  db.syncLogs.unshift({
    id: `cron-${Date.now()}`,
    time: new Date().toISOString(),
    recordsSynced: db.products.length,
    errors: 0,
    status: 'Success',
    nextRun: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
  });
  saveDb();
});

app.listen(PORT, () => {
  console.log(`DeArte API running on http://localhost:${PORT}`);
});

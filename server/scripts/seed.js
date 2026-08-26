/**
 * One-shot database seed for environments that do not boot with seedDatabase()
 * (notably Vercel). Usage from repo root or server/:
 *   npm run seed --workspace server
 *
 * Requires the same env as a normal API start (MONGODB_URI, and in production
 * SEED_ADMIN_PASSWORD for a first empty database).
 */
import 'dotenv/config';
import { connectDatabase } from '../src/config/database.js';
import { seedDatabase } from '../src/bootstrap/seedDatabase.js';
import { validateEnvironment } from '../src/config/env.js';

async function main() {
  validateEnvironment();
  await connectDatabase();
  await seedDatabase();
  console.log('Seed completed.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});

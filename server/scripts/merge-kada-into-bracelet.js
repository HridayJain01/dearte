import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Category, Collection, Product, SiteSettings, SubCategory, User } from '../src/models/index.js';

/**
 * Folds the Kada category into Bracelet: Ladies' Kada and Mens' Kada become
 * Bracelet sub-categories, every product/collection/access list pointing at
 * Kada moves to Bracelet, then the Kada category is deleted.
 *
 * Dry run (default, writes nothing):  node --env-file=../.env scripts/merge-kada-into-bracelet.js
 * Apply:                              node --env-file=../.env scripts/merge-kada-into-bracelet.js --apply
 *
 * --apply writes a JSON backup of the affected documents next to this script first.
 */

const APPLY = process.argv.includes('--apply');

async function run() {
  await connectDatabase();
  console.log(`Database: ${mongoose.connection.db.databaseName}`);
  console.log(APPLY ? 'MODE: APPLY\n' : 'MODE: DRY RUN (nothing written)\n');

  const kada = await Category.findOne({ name: 'Kada' });
  const bracelet = await Category.findOne({ name: 'Bracelet' });
  if (!kada) return console.log('No "Kada" category — nothing to do.');
  if (!bracelet) throw new Error('No "Bracelet" category to merge into.');

  const byKada = { category: kada._id };
  const accessFilter = { 'catalogAccess.categories': kada._id };
  const guestFilter = { 'guestCatalogue.categories': kada._id };

  const counts = {
    subCategories: await SubCategory.countDocuments(byKada),
    products: await Product.countDocuments(byKada),
    collections: await Collection.countDocuments(byKada),
    userAccessLists: await User.countDocuments(accessFilter),
    siteSettings: await SiteSettings.countDocuments(guestFilter),
  };
  console.log(`Kada ${kada._id} -> Bracelet ${bracelet._id}`);
  console.table(counts);

  const settings = await SiteSettings.findOne().lean();
  const kadaTiles = (settings?.categoryTiles || []).filter((tile) => /category=kada\b/i.test(tile.link || ''));
  if (kadaTiles.length) {
    console.log('Home category tiles still linking to Kada (edit these in admin):', kadaTiles.map((t) => t.label));
  }

  if (!APPLY) return console.log('\nDry run only. Re-run with --apply to write.');

  const backup = {
    takenAt: new Date().toISOString(),
    kada: kada.toObject(),
    subCategories: await SubCategory.find(byKada).lean(),
    products: await Product.find(byKada).select('_id styleCode category').lean(),
    collections: await Collection.find(byKada).select('_id name category').lean(),
    users: await User.find(accessFilter).select('_id email catalogAccess.categories').lean(),
    siteSettings: await SiteSettings.find(guestFilter).select('_id guestCatalogue').lean(),
  };
  const file = path.join(import.meta.dirname, `backup-before-kada-merge-${backup.takenAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`Backup written to ${file}`);

  const move = { $set: { category: bracelet._id } };
  await SubCategory.updateMany(byKada, move);
  await Product.updateMany(byKada, move);
  await Collection.updateMany(byKada, move);

  // Swap Kada for Bracelet in access lists: add Bracelet, then drop Kada.
  await User.updateMany(accessFilter, { $addToSet: { 'catalogAccess.categories': bracelet._id } });
  await User.updateMany(accessFilter, { $pull: { 'catalogAccess.categories': kada._id } });
  await SiteSettings.updateMany(guestFilter, { $addToSet: { 'guestCatalogue.categories': bracelet._id } });
  await SiteSettings.updateMany(guestFilter, { $pull: { 'guestCatalogue.categories': kada._id } });

  await Category.deleteOne({ _id: kada._id });
  console.log('Done: Kada merged into Bracelet and deleted.');
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

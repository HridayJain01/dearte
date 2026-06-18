import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Collection, Product } from '../src/models/index.js';

// Merges duplicate collections that share the same name (case-insensitive).
// The oldest record is kept; products/catalogues pointing at the duplicates are
// repointed to the keeper, then the duplicates are deleted.
//
// Dry run (default, shows what would change):  node scripts/dedupe-collections.js
// Apply the changes:                           node scripts/dedupe-collections.js --apply

const APPLY = process.argv.includes('--apply');
const normalize = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function run() {
  await connectDatabase();

  const collections = await Collection.find().sort({ createdAt: 1 }).lean();
  const groups = new Map();
  for (const col of collections) {
    const key = normalize(col.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(col);
  }

  let mergedGroups = 0;
  let removed = 0;
  let repointedProducts = 0;

  for (const [, group] of groups) {
    if (group.length < 2) continue;
    mergedGroups += 1;

    const [keeper, ...dupes] = group; // oldest first
    const dupeIds = dupes.map((d) => d._id);

    const affected = await Product.countDocuments({ collection: { $in: dupeIds } });
    repointedProducts += affected;

    console.log(
      `"${keeper.name}": keeping ${keeper._id} (slug ${keeper.slug}), ` +
        `merging ${dupes.length} duplicate(s) [${dupes.map((d) => d.slug).join(', ')}], ` +
        `${affected} product(s) to repoint`,
    );

    if (APPLY) {
      await Product.updateMany({ collection: { $in: dupeIds } }, { $set: { collection: keeper._id } });
      await Collection.deleteMany({ _id: { $in: dupeIds } });
      removed += dupes.length;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Duplicate groups found: ${mergedGroups}`);
  console.log(`Products affected:      ${repointedProducts}`);
  console.log(APPLY ? `Collections removed:    ${removed}` : 'Dry run — re-run with --apply to make changes.');

  await mongoose.connection.close();
}

run().catch((error) => {
  console.error('Dedupe failed:', error);
  process.exit(1);
});

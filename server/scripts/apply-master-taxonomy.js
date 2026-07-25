import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Catalogue, Category, Collection, Product, SiteSettings, SubCategory, User } from '../src/models/index.js';
import { CATEGORY_TREE, COLLECTIONS, OCCASIONS } from '../src/data/taxonomy.js';
import { slugify } from '../src/utils/slugify.js';

/**
 * Migrates the live catalogue onto the product master taxonomy
 * (product-mastersheet.xlsx, transcribed in src/data/taxonomy.js).
 *
 * Dry run (default, writes nothing):  node --env-file=../.env scripts/apply-master-taxonomy.js
 * Apply:                              node --env-file=../.env scripts/apply-master-taxonomy.js --apply
 *
 * --apply always writes a JSON backup of every document it is about to touch
 * next to this script before making a single change.
 *
 * What it does, in order:
 *   1. Renames the categories that survive under a new name, so their ObjectIds
 *      (and therefore every product/catalogue pointing at them) stay valid.
 *   2. Creates the full 11-category / 70-sub-category tree and the 5 brand
 *      collections. Idempotent.
 *   3. Repoints the 44 master styles onto the category/sub-category the sheet
 *      gives them, and syncs their occasion tags.
 *   4. Remaps the 6 legacy real imports onto the nearest master taxonomy node.
 *   5. Deletes the 8 DAR-100x demo styles and purges them from catalogues,
 *      carts and wishlists. Order line items are deliberately left alone so
 *      order history survives (the API and UI already render a removed product
 *      as an empty line).
 *   6. Clears collection references that point at collections which no longer
 *      exist, then deletes the taxonomy records the master does not define.
 */

const APPLY = process.argv.includes('--apply');
const log = (...args) => console.log(...args);

/** Categories that live on under a master-sheet name. Rename, never re-create. */
const CATEGORY_RENAMES = [
  ['Earrings', 'Earring'],
  ['Pendants', 'Pendant'],
];

/**
 * The 44 styles in the master sheet, with the category / sub-category / occasions
 * the sheet assigns them. Generated from Sheet1 of product-mastersheet.xlsx.
 */
const MASTER_STYLES = {
  ABNG0054: { category: 'Bangle', subCategory: 'Bangle', occasions: ['Traditional'] },
  ABR00340: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional'] },
  ABR00341: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00342: { category: 'Bracelet', subCategory: 'Solitaire Bracelet', occasions: ['Traditional', 'Gifting'] },
  ABR00343: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00344: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00345: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional'] },
  ABR00346: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional'] },
  ABR00347: { category: 'Bracelet', subCategory: 'Solitaire Bracelet', occasions: ['Traditional'] },
  ABR00349: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00350: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00351: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional', 'Gifting'] },
  ABR00352: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00353: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00354: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00355: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00356: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00357: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional'] },
  ABR00358: { category: 'Bracelet', subCategory: 'Station Bracelet', occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00359: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional', 'Gifting'] },
  ABR00360: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional', 'Gifting'] },
  ABR00361: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00362: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00363: { category: 'Bracelet', subCategory: 'Tennis Bracelet', occasions: ['Traditional', 'Gifting'] },
  ABR00364: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00365: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00366: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00367: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional'] },
  ABR00368: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00369: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00370: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional'] },
  ABR00371: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional'] },
  ABR00372: { category: 'Bracelet', subCategory: 'Station Bracelet', occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00373: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00374: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00375: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00376: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00377: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00378: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00379: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
  ABR00380: { category: 'Bracelet', subCategory: 'Station Bracelet', occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00381: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Gifting', 'Anniversary', 'Engagement', 'Valentine'] },
  ABR00382: { category: 'Bracelet', subCategory: 'Fashion Bracelet', occasions: ['Traditional'] },
  ABR00383: { category: 'Kada', subCategory: "Ladies' Kada", occasions: ['Traditional'] },
};

/**
 * Real Cloudinary imports that predate this master sheet. They are kept live, so
 * they need a home in the new tree. Style-code prefixes give the intent: ABR is a
 * bracelet, ABL a bali (hoop earring), AGR a gents ring.
 */
const LEGACY_REMAP = {
  ABR00303: { category: 'Bracelet', subCategory: 'Bracelet' },
  ABR00319: { category: 'Bracelet', subCategory: 'Bracelet' },
  ABR00263: { category: 'Bracelet', subCategory: 'Bracelet' },
  ABL00011: { category: 'Earring', subCategory: 'Hoop Earrings' },
  ABL00060: { category: 'Earring', subCategory: 'Hoop Earrings' },
  AGR00074: { category: 'Rings', subCategory: "Mens' Rings" },
};

/** Stock-photo demo styles seeded before the real catalogue existed. */
const DEMO_STYLE_CODES = [
  'DAR-1001',
  'DAR-1002',
  'DAR-1003',
  'DAR-1004',
  'DAR-1005',
  'DAR-1006',
  'DAR-1007',
  'DAR-1008',
  'DAR-1009',
  'DAR-1010',
];

const MASTER_OCCASIONS = new Set(OCCASIONS.map((name) => name.toLowerCase()));

async function writeBackup() {
  const dump = {
    takenAt: new Date().toISOString(),
    categories: await Category.find().lean(),
    subCategories: await SubCategory.find().lean(),
    collections: await Collection.find().lean(),
    products: await Product.find().lean(),
    catalogues: await Catalogue.find().lean(),
    siteSettings: await SiteSettings.find().lean(),
    // Only the fields this script can touch; no credentials or tokens.
    users: await User.find().select('email cart wishlist catalogAccess').lean(),
  };

  const file = path.join(
    import.meta.dirname,
    `backup-before-master-taxonomy-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  fs.writeFileSync(file, JSON.stringify(dump, null, 2));
  log(`\nBackup written to ${file}`);
  return file;
}

async function run() {
  await connectDatabase();
  log(`Database: ${mongoose.connection.db.databaseName}`);
  log(APPLY ? 'MODE: APPLY (writing changes)\n' : 'MODE: DRY RUN (no changes written)\n');

  if (APPLY) await writeBackup();

  const stats = {
    categoriesRenamed: 0,
    subCategoryDuplicatesMerged: 0,
    categoriesCreated: 0,
    subCategoriesCreated: 0,
    subCategoriesReslugged: 0,
    collectionsCreated: 0,
    masterProductsRepointed: 0,
    masterOccasionsFixed: 0,
    legacyRemapped: 0,
    demoProductsDeleted: 0,
    catalogueRefsPurged: 0,
    wishlistRefsPurged: 0,
    cartRefsPurged: 0,
    danglingCollectionsCleared: 0,
    subCategoriesDeleted: 0,
    categoriesDeleted: 0,
  };

  // ---------------------------------------------------------------- 1. renames
  log('--- 1. Category renames (ObjectIds preserved)');
  for (const [from, to] of CATEGORY_RENAMES) {
    const existing = await Category.findOne({ name: from });
    if (!existing) {
      log(`    "${from}" not present, nothing to rename`);
      continue;
    }
    const clash = await Category.findOne({ name: to });
    if (clash) {
      // The boot-time taxonomy pass already created the master name as a fresh
      // record, so there is nothing to rename. The old category is emptied by
      // steps 3-5 and dropped in step 6.
      log(`    "${to}" already exists (${clash._id}); "${from}" will be emptied and dropped in step 6`);
      continue;
    }
    log(`    "${from}" -> "${to}"  (${existing._id}, slug ${existing.slug} -> ${slugify(to)})`);
    if (APPLY) {
      existing.name = to;
      existing.slug = slugify(to);
      await existing.save();
    }
    stats.categoriesRenamed += 1;
  }

  // ------------------------------------------------ 1b. dedupe sub-categories
  //
  // The boot-time taxonomy pass used to match a sub-category on name + parent
  // category, so a sub-category that moved to a new parent got a second record
  // under the same name. Merge those before anything below relies on a name
  // resolving to exactly one document.
  log('\n--- 1b. Duplicate sub-category names');
  const subsByName = new Map();
  for (const sub of await SubCategory.find().sort({ createdAt: 1 })) {
    if (!subsByName.has(sub.name)) subsByName.set(sub.name, []);
    subsByName.get(sub.name).push(sub);
  }

  const masterSubParent = new Map(
    CATEGORY_TREE.flatMap((entry) => entry.subCategories.map((name) => [name, entry.name])),
  );

  for (const [name, group] of subsByName) {
    if (group.length < 2) continue;
    const wantParentName = masterSubParent.get(name);
    const wantParent = wantParentName ? await Category.findOne({ name: wantParentName }) : null;

    // Keep the record that already sits under the master parent; otherwise the oldest.
    const keeper =
      (wantParent && group.find((sub) => String(sub.category) === String(wantParent._id))) || group[0];
    const dupes = group.filter((sub) => String(sub._id) !== String(keeper._id));

    log(`    "${name}": keeping ${keeper._id} (slug ${keeper.slug}), merging ${dupes.length} duplicate(s)`);
    for (const dupe of dupes) {
      const moved = await Product.countDocuments({ subCategory: dupe._id });
      log(`        ${dupe._id} (slug ${dupe.slug}) — repointing ${moved} product(s), then deleting`);
      if (APPLY) {
        if (moved) {
          await Product.updateMany({ subCategory: dupe._id }, { $set: { subCategory: keeper._id } });
        }
        await dupe.deleteOne();
      }
      stats.subCategoryDuplicatesMerged += 1;
    }

    // Free the master slug so step 2 can assign it to the keeper without clashing.
    const wantSlug = slugify(name);
    if (APPLY && keeper.slug !== wantSlug) {
      keeper.slug = wantSlug;
      await keeper.save();
    }
  }

  // ------------------------------------------------------- 2. build the master
  log('\n--- 2. Master taxonomy');
  const categoryByName = new Map();
  for (const entry of CATEGORY_TREE) {
    let category = await Category.findOne({ name: entry.name });
    if (!category) {
      log(`    + category "${entry.name}"`);
      if (APPLY) {
        category = await Category.create({ name: entry.name, slug: slugify(entry.name), active: true });
      }
      stats.categoriesCreated += 1;
    }
    if (category) categoryByName.set(entry.name, category);
  }

  const subCategoryByName = new Map();
  for (const entry of CATEGORY_TREE) {
    const category = categoryByName.get(entry.name);
    for (const subName of entry.subCategories) {
      let sub = await SubCategory.findOne({ name: subName });
      if (!sub) {
        log(`    + sub-category "${subName}" under "${entry.name}"`);
        if (APPLY && category) {
          sub = await SubCategory.create({
            name: subName,
            slug: slugify(subName),
            category: category._id,
            active: true,
          });
        }
        stats.subCategoriesCreated += 1;
      } else {
        const wantSlug = slugify(subName);
        let dirty = false;
        if (category && String(sub.category) !== String(category._id)) {
          log(`    ~ sub-category "${subName}" reparented to "${entry.name}"`);
          if (APPLY) sub.category = category._id;
          dirty = true;
        }
        if (sub.slug !== wantSlug) {
          log(`    ~ sub-category "${subName}" slug ${sub.slug} -> ${wantSlug}`);
          if (APPLY) sub.slug = wantSlug;
          stats.subCategoriesReslugged += 1;
          dirty = true;
        }
        if (dirty && APPLY) await sub.save();
      }
      if (sub) subCategoryByName.set(subName, sub);
    }
  }

  for (const name of COLLECTIONS) {
    const existing = await Collection.findOne({ name });
    if (existing) continue;
    log(`    + collection "${name}" (no category parent — spans all)`);
    if (APPLY) {
      await Collection.create({ name, slug: slugify(name), category: null, subCategory: null, active: true });
    }
    stats.collectionsCreated += 1;
  }

  // --------------------------------------------------- 3. master style repoint
  log('\n--- 3. Master styles (44 from the sheet)');
  for (const [styleCode, want] of Object.entries(MASTER_STYLES)) {
    const product = await Product.findOne({ styleCode });
    if (!product) {
      log(`    !! ${styleCode} not in the database — skipped`);
      continue;
    }
    const category = categoryByName.get(want.category);
    const sub = subCategoryByName.get(want.subCategory);
    const changes = [];

    if (category && String(product.category) !== String(category._id)) {
      changes.push(`category -> ${want.category}`);
      if (APPLY) product.category = category._id;
    }
    if (sub && String(product.subCategory) !== String(sub._id)) {
      changes.push(`subCategory -> ${want.subCategory}`);
      if (APPLY) product.subCategory = sub._id;
    }

    const currentOccasions = (product.occasions || []).filter(Boolean);
    const sameOccasions =
      currentOccasions.length === want.occasions.length &&
      currentOccasions.every((value, index) => value === want.occasions[index]);
    if (!sameOccasions) {
      changes.push(`occasions -> [${want.occasions}]`);
      if (APPLY) product.occasions = [...want.occasions];
      stats.masterOccasionsFixed += 1;
    }
    if (product.occasion !== want.occasions[0]) {
      changes.push(`occasion -> ${want.occasions[0]}`);
      if (APPLY) product.occasion = want.occasions[0] || '';
    }

    if (changes.length) {
      log(`    ${styleCode}: ${changes.join(', ')}`);
      if (APPLY) await product.save();
      stats.masterProductsRepointed += 1;
    }
  }

  // ------------------------------------------------------- 4. legacy remapping
  log('\n--- 4. Legacy real imports (kept active, remapped)');
  for (const [styleCode, want] of Object.entries(LEGACY_REMAP)) {
    const product = await Product.findOne({ styleCode });
    if (!product) {
      log(`    !! ${styleCode} not in the database — skipped`);
      continue;
    }
    const category = categoryByName.get(want.category);
    const sub = subCategoryByName.get(want.subCategory);
    log(`    ${styleCode}: -> ${want.category} / ${want.subCategory}`);
    if (APPLY && category) product.category = category._id;
    if (APPLY && sub) product.subCategory = sub._id;

    // A legacy style may carry its occasion in the old singular field only.
    // Promote it into the array when the master recognises it, then keep both in sync.
    const occasions = (product.occasions || []).filter(Boolean);
    if (!occasions.length && product.occasion && MASTER_OCCASIONS.has(product.occasion.toLowerCase())) {
      log(`        promoting occasion "${product.occasion}" into occasions[]`);
      if (APPLY) product.occasions = [product.occasion];
    } else if (!occasions.length && product.occasion) {
      log(`        clearing non-master occasion "${product.occasion}"`);
      if (APPLY) product.occasion = '';
    }
    if (APPLY) {
      product.occasion = (product.occasions || [])[0] || '';
      await product.save();
    }
    stats.legacyRemapped += 1;
  }

  // ----------------------------------------------------- 5. delete demo styles
  log('\n--- 5. Demo styles');
  const demoProducts = await Product.find({ styleCode: { $in: DEMO_STYLE_CODES } }).select('_id styleCode');
  const demoIds = demoProducts.map((p) => p._id);
  log(`    deleting ${demoProducts.length}: ${demoProducts.map((p) => p.styleCode).join(', ') || '(none)'}`);

  // Every collection is being rebuilt, so any product-held collection id that no
  // longer resolves must be cleared or the product page shows a broken filter.
  const liveCollectionIds = (await Collection.find().select('_id')).map((c) => String(c._id));
  const withDangling = await Product.find({ collection: { $ne: null } }).select('_id styleCode collection');
  const dangling = withDangling.filter((p) => !liveCollectionIds.includes(String(p.collection)));

  // Catalogues, carts and wishlists render a product without null guards, so any
  // reference to a deleted product (or an already-missing one) has to go.
  const allProductIds = new Set((await Product.find().select('_id')).map((p) => String(p._id)));
  const deletedIds = new Set(demoIds.map(String));
  const isDeadRef = (id) => !allProductIds.has(String(id)) || deletedIds.has(String(id));

  for (const catalogue of await Catalogue.find()) {
    const before = (catalogue.products || []).length;
    const kept = (catalogue.products || []).filter((id) => !isDeadRef(id));
    if (kept.length === before) continue;
    log(`    catalogue "${catalogue.name}": ${before} -> ${kept.length} product(s)`);
    stats.catalogueRefsPurged += before - kept.length;
    if (APPLY) {
      catalogue.products = kept;
      await catalogue.save();
    }
  }

  for (const user of await User.find().select('email cart wishlist')) {
    let touched = false;

    const cartBefore = (user.cart?.items || []).length;
    if (cartBefore) {
      const kept = user.cart.items.filter((item) => !isDeadRef(item.product));
      if (kept.length !== cartBefore) {
        log(`    ${user.email}: cart ${cartBefore} -> ${kept.length} item(s)`);
        stats.cartRefsPurged += cartBefore - kept.length;
        if (APPLY) user.cart.items = kept;
        touched = true;
      }
    }

    const wishBefore = (user.wishlist?.items || []).length;
    if (wishBefore) {
      const kept = user.wishlist.items.filter((item) => !isDeadRef(item.product));
      if (kept.length !== wishBefore) {
        log(`    ${user.email}: wishlist ${wishBefore} -> ${kept.length} item(s)`);
        stats.wishlistRefsPurged += wishBefore - kept.length;
        if (APPLY) user.wishlist.items = kept;
        touched = true;
      }
    }

    if (touched && APPLY) await user.save();
  }

  if (dangling.length) {
    log(`    clearing dangling collection refs on ${dangling.length} product(s): ${dangling.map((p) => p.styleCode).join(', ')}`);
    stats.danglingCollectionsCleared = dangling.length;
    if (APPLY) {
      await Product.updateMany({ _id: { $in: dangling.map((p) => p._id) } }, { $set: { collection: null } });
    }
  }

  if (demoIds.length) {
    stats.demoProductsDeleted = demoIds.length;
    if (APPLY) await Product.deleteMany({ _id: { $in: demoIds } });
  }

  // ------------------------------------------- 6. drop non-master taxonomy
  log('\n--- 6. Removing taxonomy the master does not define');
  const masterCategoryNames = new Set(CATEGORY_TREE.map((entry) => entry.name));
  const masterSubNames = new Set(CATEGORY_TREE.flatMap((entry) => entry.subCategories));

  // On a dry run steps 3-5 changed nothing, so the "is it still in use?" checks
  // below would count products that the apply run will have moved or deleted.
  // Excluding them makes the dry run report the same decisions as the real run.
  const alreadyAccountedFor = APPLY
    ? {}
    : {
        _id: { $nin: demoIds },
        styleCode: { $nin: [...Object.keys(MASTER_STYLES), ...Object.keys(LEGACY_REMAP)] },
      };

  // Non-master sub-categories that had to be kept because a product still uses
  // them. Their parent category cannot be dropped either.
  const keptNonMasterSubIds = new Set();

  for (const sub of await SubCategory.find()) {
    if (masterSubNames.has(sub.name)) continue;
    const inUse = await Product.countDocuments({ subCategory: sub._id, ...alreadyAccountedFor });
    if (inUse > 0) {
      log(`    !! keeping sub-category "${sub.name}" — still on ${inUse} product(s), needs a manual decision`);
      keptNonMasterSubIds.add(String(sub._id));
      continue;
    }
    log(`    - sub-category "${sub.name}"`);
    stats.subCategoriesDeleted += 1;
    if (APPLY) await sub.deleteOne();
  }

  for (const category of await Category.find()) {
    if (masterCategoryNames.has(category.name)) continue;
    const inUse = await Product.countDocuments({ category: category._id, ...alreadyAccountedFor });
    // A master sub-category always ends up under its master parent, which is never
    // this (non-master) category, and the non-master ones were just dropped unless
    // they were still in use — so only those genuinely still hang off it.
    const attached = await SubCategory.find({ category: category._id });
    const subs = attached.filter((sub) => keptNonMasterSubIds.has(String(sub._id))).length;
    if (inUse > 0 || subs > 0) {
      log(`    !! keeping category "${category.name}" — ${inUse} product(s), ${subs} sub-category(ies), needs a manual decision`);
      continue;
    }
    log(`    - category "${category.name}"`);
    stats.categoriesDeleted += 1;
    if (APPLY) await category.deleteOne();
  }

  // --------------------------------------------------------------- final audit
  log('\n--- Post-state audit');
  const catIds = new Set((await Category.find().select('_id')).map((c) => String(c._id)));
  const subIds = new Set((await SubCategory.find().select('_id')).map((s) => String(s._id)));
  const colIds = new Set((await Collection.find().select('_id')).map((c) => String(c._id)));
  const products = await Product.find().select('styleCode category subCategory collection occasions');

  const orphanCat = products.filter((p) => !catIds.has(String(p.category)));
  const orphanSub = products.filter((p) => p.subCategory && !subIds.has(String(p.subCategory)));
  const orphanCol = products.filter((p) => p.collection && !colIds.has(String(p.collection)));
  const orphanSubParent = (await SubCategory.find()).filter((s) => !catIds.has(String(s.category)));

  log(`    categories: ${catIds.size}   sub-categories: ${subIds.size}   collections: ${colIds.size}   products: ${products.length}`);
  log(`    products with a missing category:     ${orphanCat.length} ${orphanCat.map((p) => p.styleCode).join(', ')}`);
  log(`    products with a missing sub-category: ${orphanSub.length} ${orphanSub.map((p) => p.styleCode).join(', ')}`);
  log(`    products with a missing collection:   ${orphanCol.length} ${orphanCol.map((p) => p.styleCode).join(', ')}`);
  log(`    sub-categories with a missing parent: ${orphanSubParent.length} ${orphanSubParent.map((s) => s.name).join(', ')}`);

  const tagged = [...new Set(products.flatMap((p) => p.occasions || []).filter(Boolean))].sort();
  log(`    occasions tagged on products: [${tagged.join(', ')}]`);
  log(`    master occasions with no tagged product: [${OCCASIONS.filter((o) => !tagged.includes(o)).join(', ')}]`);

  log('\n--- Summary');
  for (const [key, value] of Object.entries(stats)) log(`    ${key}: ${value}`);
  log(APPLY ? '\nApplied.' : '\nDry run — nothing was written. Re-run with --apply to commit.');

  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error('\nFailed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});

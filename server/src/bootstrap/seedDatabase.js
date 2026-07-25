import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { categoryImages, collectionImages, seedData, subCategoryImages } from '../data/seed.js';
import { CATEGORY_TREE, COLLECTIONS } from '../data/taxonomy.js';
import {
  Banner,
  Catalogue,
  Category,
  Collection,
  Event,
  MetalOption,
  Order,
  PopupAd,
  SiteSettings,
  SubCategory,
  Testimonial,
  TrustedBrand,
  User,
} from '../models/index.js';
import { normalizeAsset } from '../utils/assets.js';
import { slugify } from '../utils/slugify.js';
import { isProduction } from '../config/env.js';
import { validatePassword } from '../utils/validation.js';

/**
 * Seed accounts used to ship with passwords hardcoded in this repository
 * ("Admin@123", "Buyer@123"). Seeding runs whenever the users collection is
 * empty, so a first production boot published a working admin login to anyone
 * who could read the source.
 *
 * In production the admin password must now come from SEED_ADMIN_PASSWORD, and
 * the demo buyer accounts get an unguessable random password so they cannot be
 * logged into at all.
 */
function resolveSeedPasswordHash(user) {
  const isAdmin = user.role === 'admin';

  if (isAdmin) {
    const configured = process.env.SEED_ADMIN_PASSWORD;

    if (configured) {
      const problem = validatePassword(configured);
      if (problem) {
        throw new Error(`SEED_ADMIN_PASSWORD is not acceptable: ${problem}`);
      }
      return bcrypt.hashSync(configured, 12);
    }

    if (isProduction) {
      throw new Error(
        'Refusing to seed the initial admin account with the default password. ' +
          'Set SEED_ADMIN_PASSWORD (and SEED_ADMIN_EMAIL if you want a different address) before first boot.',
      );
    }

    console.warn('[seed] Using the default development admin password. Never do this in production.');
    return user.passwordHash || bcrypt.hashSync('Admin@123', 10);
  }

  if (isProduction) {
    // Demo buyers still exist for referential integrity of the sample orders,
    // but must not be loginable with a published credential.
    return bcrypt.hashSync(crypto.randomUUID() + crypto.randomUUID(), 12);
  }

  return user.passwordHash || bcrypt.hashSync('Buyer@123', 10);
}

async function ensureCategory(name) {
  const imageUrl = categoryImages[name] || '';
  let category = await Category.findOne({ name });
  if (!category) {
    category = await Category.create({
      name,
      slug: slugify(name),
      image: normalizeAsset({ secureUrl: imageUrl }),
      active: true,
    });
  } else if (!category.image?.publicId && imageUrl) {
    category.image = normalizeAsset({ secureUrl: imageUrl });
    await category.save();
  }
  return category;
}

async function ensureSubCategory(name, category) {
  const imageUrl = subCategoryImages[name] || '';
  // Matched on name alone, not name + category: sub-category names are globally
  // unique across the product master, and matching on the pair would create a
  // second record whenever a sub-category moves to a different parent category.
  let subCategory = await SubCategory.findOne({ name });
  if (!subCategory) {
    subCategory = await SubCategory.create({
      name,
      // Globally unique names mean the name alone is enough for the (globally
      // unique) slug.
      slug: slugify(name),
      category: category._id,
      image: normalizeAsset({ secureUrl: imageUrl }),
      active: true,
    });
    return subCategory;
  }

  let dirty = false;
  if (String(subCategory.category) !== String(category._id)) {
    subCategory.category = category._id;
    dirty = true;
  }
  if (!subCategory.image?.publicId && imageUrl) {
    subCategory.image = normalizeAsset({ secureUrl: imageUrl });
    dirty = true;
  }
  if (dirty) await subCategory.save();
  return subCategory;
}

// Brand collections from the product master span every category, so they carry
// no category/sub category parent and are keyed on name alone.
async function ensureCollection(name) {
  const imageUrl = collectionImages[name] || '';
  let collection = await Collection.findOne({ name });
  if (!collection) {
    collection = await Collection.create({
      name,
      slug: slugify(name),
      category: null,
      subCategory: null,
      image: normalizeAsset({ secureUrl: imageUrl }),
      active: true,
    });
  } else if (!collection.image?.publicId && imageUrl) {
    collection.image = normalizeAsset({ secureUrl: imageUrl });
    await collection.save();
  }
  return collection;
}

/**
 * Creates the category -> sub-category tree and the brand collections from the
 * product master. Runs on every boot (not just the first) so a taxonomy added
 * to the master sheet appears without a manual step, and is idempotent: an
 * existing record is left exactly as the admin edited it.
 */
async function ensureMasterTaxonomy() {
  for (const entry of CATEGORY_TREE) {
    const category = await ensureCategory(entry.name);
    for (const subName of entry.subCategories) {
      await ensureSubCategory(subName, category);
    }
  }

  for (const name of COLLECTIONS) {
    await ensureCollection(name);
  }
}

async function ensureMetalOption(name) {
  let metal = await MetalOption.findOne({ name });
  if (!metal) {
    metal = await MetalOption.create({
      name,
      group: 'Metal Color',
      active: true,
    });
  }
  return metal;
}

export async function seedDatabase() {
  const existingUsers = await User.countDocuments();
  const productIdMap = new Map();
  const userIdMap = new Map();

  // The category/sub-category/collection tree comes from the product master and
  // is kept current on every boot, independent of the one-time demo seeding below.
  await ensureMasterTaxonomy();

  if (existingUsers === 0) {
    for (const user of seedData.users) {
      const seededCart = seedData.carts.find((cart) => cart.userId === user.id);
      const seededWishlist = seedData.wishlists.find((wishlist) => wishlist.userId === user.id);

      const created = await User.create({
        name: user.name,
        email:
          user.role === 'admin' && process.env.SEED_ADMIN_EMAIL
            ? String(process.env.SEED_ADMIN_EMAIL).toLowerCase().trim()
            : user.email,
        mobile: user.mobile,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        pinCode: user.pinCode,
        companyName: user.companyName,
        gstNumber: user.gstNumber,
        passwordHash: resolveSeedPasswordHash(user),
        role: user.role,
        status: user.status,
        registeredAt: user.registeredAt,
        kycDocuments: user.kycDocuments || [],
        refreshTokens: [],
        cart: {
          items: (seededCart?.items || [])
            .map((item) => ({
              product: productIdMap.get(item.productId),
              quantity: item.quantity,
              customization: item.customization,
            }))
            .filter((item) => item.product),
          specialInstructions: seededCart?.specialInstructions || '',
        },
        wishlist: {
          collections:
            (seededWishlist?.collections || [{ name: 'My Wishlist' }]).map((collection) => ({
              name: collection.name,
            })),
          items: [],
        },
      });

      const collectionIdMap = new Map();
      for (const collection of created.wishlist.collections || []) {
        collectionIdMap.set(collection.name, collection._id);
      }

      if (seededWishlist?.items?.length) {
        const legacyCollectionMap = new Map(
          (seededWishlist.collections || []).map((collection) => [collection.id, collection.name]),
        );

        created.wishlist.items = seededWishlist.items
          .map((item) => ({
            product: productIdMap.get(item.productId),
            collectionId: collectionIdMap.get(legacyCollectionMap.get(item.collectionId)),
          }))
          .filter((item) => item.product && item.collectionId);
        await created.save();
      }

      userIdMap.set(user.id, created._id);
    }

    for (const banner of seedData.banners) {
      await Banner.create({
        title: banner.title,
        subtitle: banner.subtitle,
        ctaLabel: banner.ctaLabel,
        ctaLink: banner.ctaLink,
        image: normalizeAsset({ secureUrl: banner.image, alt: banner.title }),
        active: banner.active,
        sortOrder:
          (seedData.promotions?.bannersOrder || []).findIndex((id) => id === banner.id) + 1 || 0,
      });
    }

    for (const popup of seedData.promotions?.popupAds || []) {
      await PopupAd.create({
        image: normalizeAsset({ secureUrl: popup.image }),
        frequency: popup.frequency,
        startDate: popup.startDate,
        endDate: popup.endDate,
        active: popup.active,
      });
    }

    for (const event of seedData.events || []) {
      await Event.create({
        title: event.title,
        date: event.date,
        description: event.description,
        image: normalizeAsset({ secureUrl: event.image, alt: event.title }),
        active: true,
      });
    }

    for (const testimonial of seedData.testimonials || []) {
      await Testimonial.create({
        name: testimonial.name,
        company: testimonial.company,
        rating: testimonial.rating,
        status: testimonial.status,
        review: testimonial.review,
        avatar: normalizeAsset({ secureUrl: testimonial.avatar, alt: testimonial.name }),
      });
    }

    await SiteSettings.create(seedData.siteSettings);

    for (const catalogue of seedData.catalogues || []) {
      await Catalogue.create({
        name: catalogue.name,
        description: catalogue.description,
        products: (catalogue.productIds || []).map((id) => productIdMap.get(id)).filter(Boolean),
        assignedUsers: (catalogue.assignedUserIds || []).map((id) => userIdMap.get(id)).filter(Boolean),
        active: true,
        archived: false,
      });
    }

    for (const order of seedData.orders || []) {
      await Order.create({
        orderId: order.orderId,
        user: userIdMap.get(order.userId),
        status: order.status,
        statusHistory: [
          {
            status: order.status,
            note: 'Seed order',
            changedAt: order.date,
            changedBy: userIdMap.get('user-admin'),
          },
        ],
        paymentMethod: order.paymentMethod,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        items: (order.items || []).map((item) => ({
          product: productIdMap.get(item.productId),
          quantity: item.quantity,
          customization: item.customization,
        })),
        stockDeducted: false,
        createdAt: order.date,
        updatedAt: order.date,
      });
    }
  }

  // Backfill images for categories/subcategories/collections that were seeded without specific images
  for (const [name, url] of Object.entries(categoryImages)) {
    const cat = await Category.findOne({ name });
    if (cat && !cat.image?.publicId && url) {
      cat.image = normalizeAsset({ secureUrl: url });
      await cat.save();
    }
  }
  for (const [name, url] of Object.entries(subCategoryImages)) {
    const sub = await SubCategory.findOne({ name });
    if (sub && !sub.image?.publicId && url) {
      sub.image = normalizeAsset({ secureUrl: url });
      await sub.save();
    }
  }
  for (const [name, url] of Object.entries(collectionImages)) {
    const col = await Collection.findOne({ name });
    if (col && !col.image?.publicId && url) {
      col.image = normalizeAsset({ secureUrl: url });
      await col.save();
    }
  }

  if (!(await TrustedBrand.exists())) {
    for (const brand of seedData.trustedBrands || []) {
      await TrustedBrand.create({
        name: brand.name,
        sector: brand.sector,
        websiteUrl: brand.websiteUrl,
        logo: normalizeAsset({ secureUrl: brand.logo, alt: brand.name }),
        active: true,
        sortOrder: brand.sortOrder || 0,
      });
    }
  }
}

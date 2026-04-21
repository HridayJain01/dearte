import bcrypt from 'bcryptjs';
import { seedData } from '../data/seed.js';
import {
  Banner,
  Catalogue,
  Category,
  Collection,
  Event,
  MetalOption,
  Order,
  PopupAd,
  Product,
  SiteSettings,
  SubCategory,
  Testimonial,
  TrustedBrand,
  User,
} from '../models/index.js';
import { normalizeAsset, normalizeAssetArray } from '../utils/assets.js';
import { slugify } from '../utils/slugify.js';

async function ensureCategory(name, image) {
  let category = await Category.findOne({ name });
  if (!category) {
    category = await Category.create({
      name,
      slug: slugify(name),
      image: normalizeAsset({ secureUrl: image }),
      active: true,
    });
  }
  return category;
}

async function ensureSubCategory(name, category, image) {
  let subCategory = await SubCategory.findOne({ name, category: category._id });
  if (!subCategory) {
    subCategory = await SubCategory.create({
      name,
      slug: slugify(`${category.name}-${name}`),
      category: category._id,
      image: normalizeAsset({ secureUrl: image }),
      active: true,
    });
  }
  return subCategory;
}

async function ensureCollection(name, category, subCategory, image) {
  let collection = await Collection.findOne({ name, subCategory: subCategory._id });
  if (!collection) {
    collection = await Collection.create({
      name,
      slug: slugify(`${category.name}-${subCategory.name}-${name}`),
      category: category._id,
      subCategory: subCategory._id,
      image: normalizeAsset({ secureUrl: image }),
      active: true,
    });
  }
  return collection;
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

  if (existingUsers === 0) {
    for (const product of seedData.products) {
      const category = await ensureCategory(product.category, product.images?.[0]);
      const subCategory = await ensureSubCategory(product.subCategory, category, product.images?.[0]);
      const collection = await ensureCollection(product.collection, category, subCategory, product.images?.[0]);
      const metalOption = await ensureMetalOption(product.metalColor);

      const created = await Product.create({
        styleCode: product.styleCode,
        name: product.name,
        description: product.description,
        category: category._id,
        subCategory: subCategory._id,
        collection: collection._id,
        metalType: product.metal,
        metalColor: metalOption._id,
        metal: product.metal,
        diamondWeight: product.diamondWeight,
        goldWeight: product.goldWeight,
        diamondQuality: product.diamondQuality,
        settingType: product.settingType,
        occasion: product.occasion,
        sku: product.sku,
        stockType: product.stockType,
        stockQuantity: product.stockQuantity || 10,
        status: product.status === 'Inactive' ? 'Inactive' : 'Active',
        isNewArrival: product.isNewArrival,
        isBestSeller: product.isBestSeller,
        media: normalizeAssetArray(
          (product.images || []).map((url, index) => ({
            secureUrl: url,
            alt: `${product.name} ${index + 1}`,
            resourceType: 'image',
          })),
        ),
        customizationOptions: product.customizationOptions,
        specifications: product.specifications,
        views: product.views || 0,
        cartAdds: product.cartAdds || 0,
        orderCount: product.orderCount || 0,
      });

      productIdMap.set(product.id, created._id);
    }

    for (const user of seedData.users) {
      const seededCart = seedData.carts.find((cart) => cart.userId === user.id);
      const seededWishlist = seedData.wishlists.find((wishlist) => wishlist.userId === user.id);

      const created = await User.create({
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        pinCode: user.pinCode,
        companyName: user.companyName,
        gstNumber: user.gstNumber,
        passwordHash: user.passwordHash || bcrypt.hashSync('Buyer@123', 10),
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

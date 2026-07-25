/**
 * The product master taxonomy, transcribed from product-mastersheet.xlsx
 * (Sheet2 / "Table 1"). This file is the single source of truth for the
 * category -> sub-category tree, the brand collections, and the occasions.
 *
 * Categories are listed in the merchandising order used in the master sheet
 * rather than alphabetically. Sub-category names are globally unique, so a
 * sub-category slug is derived from its name alone.
 *
 * Occasions are a reference list only: the storefront still derives the
 * "Shop by Occasion" menu from the occasions actually tagged on products
 * (see publicRoutes `/occasions`), so an occasion with no tagged styles will
 * not appear on the site until a product uses it.
 */

export const CATEGORY_TREE = [
  {
    name: 'Rings',
    subCategories: [
      'Mens\' Rings',
      'Couple Rings',
      'Halo Rings',
      'Solitaire Rings',
      'Rings',
      'Toi et Moi Rings',
      'Band Rings',
      'Charm Rings',
      'Cocktail Rings',
      'Eternity Rings',
      'Fashion Rings',
      'Stack Rings',
      'Vanki Rings',
      'Ladies\' Ring',
    ],
  },
  {
    name: 'Earring',
    subCategories: [
      'Drop Earrings',
      'Sui Dhaga',
      'Chandbali',
      'Ear Cuffs',
      'Ear Jacket',
      'Hoop Earrings',
      'Huggies',
      'Mens\' Studs',
      'Shoulder Dusters',
      'Solitaire Earrings',
      'Halo Earrings',
      'Earring',
      'Jhumki',
      'Tops',
      'Studs',
    ],
  },
  {
    name: 'Necklace',
    subCategories: [
      'Charm Necklace',
      'Choker Necklace',
      'Lariat',
      'Layered Necklace',
      'Link Necklace',
      'Necklet',
      'Mangalsutra Necklace',
      'Solitaire Necklace',
      'Station Necklace',
      'Chain Necklace',
      'Tennis Necklace',
      'Necklace',
      'Toi et Moi Necklace',
    ],
  },
  {
    name: 'Pendant',
    subCategories: [
      'Alphabet Pendant',
      'Mens\' Pendant',
      'Solitaire Pendant',
      'Mangalsutra Pendant',
      'Toi et Moi Pendant',
      'Halo Pendant',
      'Fashion Pendant',
      'Pendant',
    ],
  },
  {
    name: 'Bracelet',
    subCategories: [
      'Charm Bracelet',
      'Fashion Bracelet',
      'Layered Bracelet',
      'Link Bracelet',
      'Mangalsutra Bracelet',
      'Mens\' Bracelet',
      'Solitaire Bracelet',
      'Station Bracelet',
      'Tennis Bracelet',
      'Bracelet',
      'Toi et Moi Bracelet',
      'Ladies\' Bracelet',
    ],
  },
  {
    name: 'Bangle',
    subCategories: [
      'Bangle',
      'Solitaire Bangle',
    ],
  },
  {
    name: 'Kada',
    subCategories: [
      'Ladies\' Kada',
      'Mens\' Kada',
    ],
  },
  {
    name: 'Anklet',
    subCategories: [
      'Anklet',
    ],
  },
  {
    name: 'Brooch',
    subCategories: [
      'Brooch',
    ],
  },
  {
    name: 'Nose Pin',
    subCategories: [
      'Nose Pin',
    ],
  },
  {
    name: 'Bindi',
    subCategories: [
      'Bindi',
    ],
  },
];

/** Brand collections. These span categories, so they are not parented to one. */
export const COLLECTIONS = [
  'Celestial Dreams',
  'Ocean Whisper',
  'Aura Geometry',
  'Prithvi',
  'Monsoon Magic',
];

/** Occasions (the master sheet calls these collection groups). */
export const OCCASIONS = [
  'Anniversary',
  'Engagement',
  'Valentine',
  'Festive',
  'Religious',
  'Gifting',
  'Traditional',
];

/**
 * The house makes a single diamond quality, so this is not a choice the
 * customer (or the admin) gets to make anywhere in the app.
 */
export const DIAMOND_QUALITY = 'VVS-VS EF';
export const DIAMOND_QUALITIES = [DIAMOND_QUALITY];

export const CATEGORIES = CATEGORY_TREE.map((entry) => entry.name);

export const SUB_CATEGORIES = CATEGORY_TREE.flatMap((entry) =>
  entry.subCategories.map((name) => ({ name, category: entry.name })),
);

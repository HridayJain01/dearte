import mongoose from 'mongoose';

export const assetSchema = new mongoose.Schema(
  {
    publicId: { type: String, default: '' },
    secureUrl: { type: String, default: '' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    alt: { type: String, default: '' },
    resourceType: { type: String, default: 'image' },
  },
  { _id: false },
);

export const productColorViewSchema = new mongoose.Schema(
  {
    view: { type: String, required: true },
    asset: { type: assetSchema, default: () => ({}) },
  },
  { _id: false },
);

export const productColorVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true },
    views: { type: [productColorViewSchema], default: [] },
  },
  { _id: false },
);

// Per-karat weights as supplied by the bulk-upload sheet. Gross includes stones,
// net is metal only. Every style carries all three karats; the customer picks one
// on the PDP, so these must stay queryable rather than living in `specifications`.
export const karatWeightSchema = new mongoose.Schema(
  {
    k18: { type: Number, default: 0 },
    k14: { type: Number, default: 0 },
    k9: { type: Number, default: 0 },
  },
  { _id: false },
);

export const productWeightsSchema = new mongoose.Schema(
  {
    gross: { type: karatWeightSchema, default: () => ({}) },
    net: { type: karatWeightSchema, default: () => ({}) },
    diamond: { type: Number, default: 0 },
    colourStone: { type: Number, default: 0 },
  },
  { _id: false },
);

export const customizationOptionsSchema = new mongoose.Schema(
  {
    goldColors: { type: [String], default: ['Yellow Gold', 'Rose Gold', 'White Gold'] },
    goldCarats: { type: [String], default: ['9K', '14K', '18K'] },
    diamondQualities: { type: [String], default: ['SI-IJ', 'VS-GH', 'VVS-EF'] },
  },
  { _id: false },
);

export const specificationSchema = new mongoose.Schema(
  {
    attribute: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

export const orderItemChangeRequestSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    status: { type: String, default: 'Open' }, // Open | Resolved
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
  },
  { _id: true }, // each request gets a stable _id so admin can resolve it
);

export const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    customization: {
      goldColor: { type: String, default: '' },
      goldCarat: { type: String, default: '' },
      diamondQuality: { type: String, default: '' },
      note: { type: String, default: '' },
      // Canonical India sizing from the size master; '' for unsized styles.
      size: { type: String, default: '' },
    },
    changeRequests: { type: [orderItemChangeRequestSchema], default: [] },
  },
  { _id: true },
);

export const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

export const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    customization: {
      goldColor: { type: String, default: '' },
      goldCarat: { type: String, default: '' },
      diamondQuality: { type: String, default: '' },
      note: { type: String, default: '' },
      // Canonical India sizing from the size master; '' for unsized styles.
      // Part of the cart line identity: one style in two sizes is two lines.
      size: { type: String, default: '' },
    },
  },
  { _id: true },
);

export const wishlistCollectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
  },
  { _id: true },
);

export const wishlistItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    collectionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { _id: true },
);

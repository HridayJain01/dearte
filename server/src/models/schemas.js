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

export const customizationOptionsSchema = new mongoose.Schema(
  {
    goldColors: { type: [String], default: ['Yellow Gold', 'Rose Gold', 'White Gold'] },
    goldCarats: { type: [String], default: ['14K', '18K', '22K'] },
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

export const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    customization: {
      goldColor: { type: String, default: '' },
      goldCarat: { type: String, default: '' },
      diamondQuality: { type: String, default: '' },
    },
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

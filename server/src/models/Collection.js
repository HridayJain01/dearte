import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    // Optional: a collection can span sub categories, and the upload sheet may omit it.
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', default: null, index: true },
    image: { type: assetSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Collection =
  mongoose.models.Collection || mongoose.model('Collection', collectionSchema);

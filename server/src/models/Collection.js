import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
    image: { type: assetSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Collection =
  mongoose.models.Collection || mongoose.model('Collection', collectionSchema);

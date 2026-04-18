import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    image: { type: assetSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const SubCategory =
  mongoose.models.SubCategory || mongoose.model('SubCategory', subCategorySchema);

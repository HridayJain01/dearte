import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: assetSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

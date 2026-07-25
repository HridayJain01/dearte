import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    // Optional: the brand collections in the product master (Prithvi, Monsoon
    // Magic, ...) span every category, so they are not parented to one. Import-
    // created collections still carry the category they were first seen under.
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    // Optional: a collection can span sub categories, and the upload sheet may omit it.
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', default: null, index: true },
    image: { type: assetSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Collection =
  mongoose.models.Collection || mongoose.model('Collection', collectionSchema);

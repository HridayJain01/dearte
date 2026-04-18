import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const catalogueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    coverImage: { type: assetSchema, default: () => ({}) },
    products: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
    assignedUsers: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    active: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Catalogue = mongoose.models.Catalogue || mongoose.model('Catalogue', catalogueSchema);

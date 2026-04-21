import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const trustedBrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sector: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },
    logo: { type: assetSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

export const TrustedBrand =
  mongoose.models.TrustedBrand || mongoose.model('TrustedBrand', trustedBrandSchema);
import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    ctaLabel: { type: String, default: '' },
    ctaLink: { type: String, default: '' },
    image: { type: assetSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

export const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

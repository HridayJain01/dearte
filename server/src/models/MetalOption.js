import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const metalOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    group: { type: String, default: 'Metal Color' },
    swatch: { type: assetSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const MetalOption =
  mongoose.models.MetalOption || mongoose.model('MetalOption', metalOptionSchema);

import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, default: '' },
    image: { type: assetSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

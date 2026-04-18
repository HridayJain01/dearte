import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const popupAdSchema = new mongoose.Schema(
  {
    image: { type: assetSchema, default: () => ({}) },
    frequency: { type: String, default: 'once_per_session' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const PopupAd = mongoose.models.PopupAd || mongoose.model('PopupAd', popupAdSchema);

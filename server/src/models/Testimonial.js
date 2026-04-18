import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    company: { type: String, default: '' },
    rating: { type: Number, default: 5 },
    status: { type: String, enum: ['Pending', 'Approved', 'Disapproved'], default: 'Pending' },
    review: { type: String, default: '' },
    avatar: { type: assetSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const Testimonial =
  mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);

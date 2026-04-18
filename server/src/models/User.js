import mongoose from 'mongoose';
import { cartItemSchema, wishlistCollectionSchema, wishlistItemSchema } from './schemas.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    mobile: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    pinCode: { type: String, default: '' },
    companyName: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'buyer'], default: 'buyer' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Inactive' },
    registeredAt: { type: Date, default: Date.now },
    kycDocuments: { type: [String], default: [] },
    refreshTokens: { type: [String], default: [] },
    cart: {
      items: { type: [cartItemSchema], default: [] },
      specialInstructions: { type: String, default: '' },
    },
    wishlist: {
      collections: { type: [wishlistCollectionSchema], default: () => [{ name: 'My Wishlist' }] },
      items: { type: [wishlistItemSchema], default: [] },
    },
    resetOtp: {
      code: { type: String, default: '' },
      expiresAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);

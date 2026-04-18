import mongoose from 'mongoose';
import {
  assetSchema,
  customizationOptionsSchema,
  specificationSchema,
} from './schemas.js';

const productSchema = new mongoose.Schema(
  {
    styleCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true, index: true },
    metalType: { type: String, default: '' },
    metalColor: { type: mongoose.Schema.Types.ObjectId, ref: 'MetalOption', required: true, index: true },
    metal: { type: String, default: '' },
    diamondWeight: { type: Number, default: 0 },
    goldWeight: { type: Number, default: 0 },
    diamondQuality: { type: String, default: '' },
    settingType: { type: String, default: '' },
    occasion: { type: String, default: '' },
    sku: { type: String, default: '' },
    stockType: { type: String, enum: ['Ready Stock', 'Make to Order'], default: 'Ready Stock' },
    stockQuantity: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    media: { type: [assetSchema], default: [] },
    customizationOptions: { type: customizationOptionsSchema, default: () => ({}) },
    specifications: { type: [specificationSchema], default: [] },
    views: { type: Number, default: 0 },
    cartAdds: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

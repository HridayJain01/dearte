import mongoose from 'mongoose';
import {
  assetSchema,
  customizationOptionsSchema,
  productColorVariantSchema,
  productWeightsSchema,
  specificationSchema,
} from './schemas.js';

const productSchema = new mongoose.Schema(
  {
    styleCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    // Optional per the upload sheet: a style may have no sub category or collection.
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', default: null, index: true },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null, index: true },
    metalType: { type: String, default: '' },
    // A style ships in several metal colours (see colorVariants); this is the default one.
    metalColor: { type: mongoose.Schema.Types.ObjectId, ref: 'MetalOption', default: null, index: true },
    metal: { type: String, default: '' },
    // Kept in sync with weights.diamond / weights.net.k18 for older reads.
    diamondWeight: { type: Number, default: 0 },
    goldWeight: { type: Number, default: 0 },
    weights: { type: productWeightsSchema, default: () => ({}) },
    diamondQuality: { type: String, default: '' },
    settingType: { type: String, default: '' },
    occasion: { type: String, default: '' },
    occasions: { type: [String], default: [], index: true },
    sku: { type: String, default: '' },
    stockType: { type: String, enum: ['Ready Stock', 'Make to Order'], default: 'Ready Stock' },
    stockQuantity: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    media: { type: [assetSchema], default: [] },
    colorVariants: { type: [productColorVariantSchema], default: [] },
    customizationOptions: { type: customizationOptionsSchema, default: () => ({}) },
    specifications: { type: [specificationSchema], default: [] },
    views: { type: Number, default: 0 },
    cartAdds: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

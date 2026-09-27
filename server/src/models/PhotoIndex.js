import mongoose from 'mongoose';

// Shop-by-photo's search index: the vocabulary tags the vision model saw in a
// style's photos. Kept apart from Product on purpose — nothing here is ever
// written back to the catalogue.
const photoIndexSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    tags: { type: [String], default: [] },
    model: { type: String, default: '' },
    indexedAt: { type: Date, default: null },
    // Set on every attempt, so a style whose photos keep failing is retried
    // weekly instead of every night.
    attemptedAt: { type: Date, default: null, index: true },
    error: { type: String, default: '' },
  },
  { timestamps: true },
);

export const PhotoIndex = mongoose.models.PhotoIndex || mongoose.model('PhotoIndex', photoIndexSchema);

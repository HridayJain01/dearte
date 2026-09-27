import mongoose from 'mongoose';
import { assetSchema } from './schemas.js';

// The body is structured, not HTML or Markdown: it renders through React on the
// site and through an escaping string builder at build time, so nothing a model
// writes can ever reach a page as markup.
const sectionSchema = new mongoose.Schema(
  {
    heading: { type: String, default: '' },
    paragraphs: { type: [String], default: [] },
    bullets: { type: [String], default: [] },
  },
  { _id: false },
);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
  },
  { _id: false },
);

const creditSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    source: { type: String, default: '' },
  },
  { _id: false },
);

const blogPostSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    metaDescription: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    sections: { type: [sectionSchema], default: [] },
    faq: { type: [faqSchema], default: [] },
    coverImage: { type: assetSchema, default: () => ({}) },
    coverCredit: { type: creditSchema, default: () => ({}) },
    // One lifestyle photo shown mid-article, when a stock image is available.
    inlineImage: { type: assetSchema, default: () => ({}) },
    inlineCredit: { type: creditSchema, default: () => ({}) },
    // Stock photo ids already used, so two posts never share a picture.
    stockPhotoIds: { type: [String], default: [] },
    products: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
    tags: { type: [String], default: [] },
    topic: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'needs_review', 'published', 'unpublished'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
    quality: {
      score: { type: Number, default: 0 },
      issues: { type: [String], default: [] },
    },
    model: { type: String, default: '' },
    wordCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const BlogPost = mongoose.models.BlogPost || mongoose.model('BlogPost', blogPostSchema);

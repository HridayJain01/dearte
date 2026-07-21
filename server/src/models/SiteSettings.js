import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    facebook: { type: String, default: '' },
    address: { type: String, default: '' },
    hours: { type: String, default: '' },
    mapsEmbed: { type: String, default: '' },
    newsletterBlurb: { type: String, default: '' },
    /** WhatsApp ops: comma-separated admin numbers who receive PDF copies when orders are placed (E.164 digits or local with default country prefix). */
    whatsappOperationsNumbers: { type: String, default: '' },
    /** Email ops: comma-separated admin emails who receive a copy of each new order. */
    orderNotificationEmails: { type: String, default: '' },
    /** General access settings for guest users on the home page */
    guestAccess: {
      showPopupPromo: { type: Boolean, default: true },
      showHeroSlider: { type: Boolean, default: true },
      showBrandExpression: { type: Boolean, default: true },
      showProcessImage: { type: Boolean, default: true },
      showCollections: { type: Boolean, default: true },
      showBestSellers: { type: Boolean, default: true },
      showNewArrivals: { type: Boolean, default: true },
      showTestimonials: { type: Boolean, default: true },
      showEvents: { type: Boolean, default: true },
      showTrustedBrands: { type: Boolean, default: true },
      showCTABanner: { type: Boolean, default: true },
      // Pages
      pageProducts: { type: Boolean, default: true },
      pageCollections: { type: Boolean, default: false },
      pageEvents: { type: Boolean, default: true },
      pageTestimonials: { type: Boolean, default: true },
      pageTrustedBrands: { type: Boolean, default: true },
    },
    /**
     * Which products a logged-out guest may browse. Rules are additive (OR):
     * a product is visible if it matches ANY selected identifier. `includeFlagged`
     * keeps the legacy per-product `showToGuests` teaser in play alongside the rules.
     */
    guestCatalogue: {
      includeFlagged: { type: Boolean, default: true },
      categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
      subCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory' }],
      collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],
      occasions: { type: [String], default: [] },
    },
  },
  { timestamps: true },
);

export const SiteSettings =
  mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema);

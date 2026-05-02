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
  },
  { timestamps: true },
);

export const SiteSettings =
  mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema);

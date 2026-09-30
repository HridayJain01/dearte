import mongoose from 'mongoose';

// Who a buyer-facing AI feature is shown to. 'staff' (admin + sales) lets the
// team try a feature on the live site before buyers see it.
const featureMode = { type: String, enum: ['off', 'staff', 'everyone'], default: 'staff' };

const topicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    angle: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    hints: {
      category: { type: String, default: '' },
      occasion: { type: String, default: '' },
      collection: { type: String, default: '' },
    },
    months: { type: [Number], default: [] },
    status: { type: String, enum: ['queued', 'used', 'skipped'], default: 'queued' },
    source: { type: String, default: 'seed' },
    usedAt: { type: Date, default: null },
  },
  { _id: false },
);

// A single document. Absent until an admin first saves AI Studio, and read
// with defaults until then, so deploying this writes nothing.
const aiSettingsSchema = new mongoose.Schema(
  {
    features: {
      smartSearch: featureMode,
      photoSearch: featureMode,
      restock: featureMode,
      catalogueBuilder: featureMode,
    },
    photoIndex: {
      enabled: { type: Boolean, default: false },
    },
    nudges: {
      enabled: { type: Boolean, default: false },
    },
    blog: {
      enabled: { type: Boolean, default: false },
      autoPublish: { type: Boolean, default: true },
      postsPerWeek: { type: Number, enum: [1, 2], default: 1 },
      // Figures and claims the writer may use. Anything numeric not in here
      // (or in the catalogue facts) fails the grounding check.
      facts: { type: String, default: '' },
      // `undefined` rather than [] so "never saved" and "emptied by the admin"
      // stay distinguishable; the first means "use the seed list".
      topicQueue: { type: [topicSchema], default: undefined },
    },
    // When each once-a-day job last started; see claimCronRun() in jobs.js.
    cronLocks: {
      blog: { type: Date, default: null },
      nudges: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

export const AiSettings = mongoose.models.AiSettings || mongoose.model('AiSettings', aiSettingsSchema);

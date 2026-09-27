import mongoose from 'mongoose';

// One row per scheduled or admin-triggered AI job, shown in AI Studio so a
// quiet failure is visible. Rows delete themselves after 90 days.
const aiJobRunSchema = new mongoose.Schema({
  job: { type: String, required: true, index: true },
  trigger: { type: String, enum: ['cron', 'admin'], default: 'cron' },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
  ok: { type: Boolean, default: false },
  summary: { type: String, default: '' },
  error: { type: String, default: '' },
});

aiJobRunSchema.index({ startedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AiJobRun = mongoose.models.AiJobRun || mongoose.model('AiJobRun', aiJobRunSchema);

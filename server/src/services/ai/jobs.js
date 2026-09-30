/**
 * Plumbing shared by the scheduled AI jobs: a time budget (Vercel stops the
 * function at 60 s), a run log for AI Studio, and the two after-publish hooks.
 */
import { AiJobRun, AiSettings, SiteSettings } from '../../models/index.js';
import { isEmailConfigured, sendEmail } from '../email/transport.js';
import { opsEmailsFromSources } from '../orderEmailNotifications.js';
import { promoEmail } from '../email/templates.js';

// Leaves ~15 s of the 60 s function limit for saving results and responding.
export const JOB_BUDGET_MS = 45_000;

export function deadlineIn(ms = JOB_BUDGET_MS) {
  return Date.now() + ms;
}

export function timeLeft(deadline) {
  return deadline - Date.now();
}

/**
 * Run `work` and record the outcome. `work` returns a one-line summary. A
 * failure is logged and recorded, not rethrown: a cron that throws gets no
 * retry anyway, and the row in AI Studio is where someone will look.
 */
export async function runJob(job, trigger, work) {
  const run = await AiJobRun.create({ job, trigger, startedAt: new Date() });
  try {
    run.summary = String((await work()) || 'Done').slice(0, 500);
    run.ok = true;
  } catch (error) {
    console.error(`[ai-job] ${job} failed:`, error);
    run.error = String(error?.message || error).slice(0, 500);
    run.ok = false;
  }
  run.finishedAt = new Date();
  await run.save().catch((error) => console.error('[ai-job] could not save run log', error?.message));
  return run.toObject();
}

/**
 * True for exactly one caller per window. Vercel can deliver a scheduled run
 * twice; without this a duplicate would publish a second post or email every
 * buyer twice. An atomic update on the settings document is the lock.
 */
export async function claimCronRun(job, { now = new Date(), windowMs = 20 * 60 * 60 * 1000 } = {}) {
  const field = `cronLocks.${job}`;
  const result = await AiSettings.updateOne(
    { [field]: { $not: { $gte: new Date(now.getTime() - windowMs) } } },
    { $set: { [field]: now } },
  );
  return result.modifiedCount === 1;
}

export function recentRuns(limit = 20) {
  return AiJobRun.find().sort({ startedAt: -1 }).limit(limit).lean();
}

/**
 * Ask Vercel to rebuild the storefront, so the build step can prerender new
 * or changed blog posts into static HTML. Returns whether the hook accepted.
 */
export async function triggerClientRebuild() {
  const url = process.env.CLIENT_DEPLOY_HOOK_URL;
  if (!url) return false;
  try {
    const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10_000) });
    return response.ok;
  } catch (error) {
    console.error('[ai-job] deploy hook failed:', error?.message);
    return false;
  }
}

/** A short email to the ops list (the same people who get order copies). */
export async function notifyAdmins({ subject, heading, bodyHtml, ctaLabel, ctaUrl }) {
  if (!isEmailConfigured()) return false;
  const site = await SiteSettings.findOne().sort({ updatedAt: -1 }).lean();
  const to = opsEmailsFromSources(site);
  if (!to.length) return false;
  const message = promoEmail({ subject, heading, bodyHtml, ctaLabel, ctaUrl, site: site || {} });
  try {
    await sendEmail({ to, ...message });
    return true;
  } catch (error) {
    console.error('[ai-job] admin email failed:', error?.message);
    return false;
  }
}

/** The storefront's own origin, for links in emails. */
export function storefrontUrl(path = '/') {
  const origin = (process.env.CLIENT_ORIGIN || 'https://dearte-client.vercel.app').replace(/\/+$/, '');
  return `${origin}${path}`;
}

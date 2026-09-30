/**
 * Restock suggestions from a buyer's own order history. Arithmetic, not a
 * model: a style's reorder cycle is the median gap between the buyer's orders
 * of it, and it is suggested from a week before the next one falls due.
 */
import { Order, SiteSettings, User } from '../../models/index.js';
import { isEmailConfigured, sendEmail } from '../email/transport.js';
import { promoEmail } from '../email/templates.js';
import { escapeHtml } from './guards.js';
import { getAiSettings } from './settings.js';
import { claimCronRun, deadlineIn, runJob, storefrontUrl, timeLeft } from './jobs.js';
import { displayName, visibleProductsByIds } from './catalogue.js';

// Orders the house has accepted. Pending ones may still be rejected, and a
// cancelled order says nothing about how fast a style sells.
export const REORDER_STATUSES = ['Approved', 'Processing', 'Shipped', 'Fulfilled'];

const DAY = 24 * 60 * 60 * 1000;
// ponytail: one default cycle for every style ordered only once; learn a
// per-category cycle from all buyers if this proves too blunt.
export const DEFAULT_CYCLE_DAYS = 60;
const MIN_CYCLE_DAYS = 14;
const MAX_CYCLE_DAYS = 365;
const LEAD_DAYS = 7;
// Long past due means the buyer stopped carrying it; stop suggesting.
const GIVE_UP_AFTER_DAYS = 120;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// A product may arrive as an ObjectId, a document or a serialized { id }.
// `_id` first: on an ObjectId, `.id` is the raw 12-byte buffer, not its hex.
const idOf = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return typeof value.id === 'string' ? value.id : String(value);
};

/**
 * Every style this buyer is due (or nearly due) to reorder, most overdue
 * first. `orders` are plain order documents; products may be ids or objects.
 */
export function reorderSuggestions(orders = [], { now = new Date(), limit = 6 } = {}) {
  const byProduct = new Map();
  for (const order of orders) {
    if (!REORDER_STATUSES.includes(order.status)) continue;
    const at = new Date(order.createdAt).getTime();
    if (!Number.isFinite(at)) continue;
    for (const item of order.items || []) {
      const productId = idOf(item.product);
      if (!productId) continue;
      const lines = byProduct.get(productId) || [];
      lines.push({ at, quantity: Math.max(1, Number(item.quantity) || 1), customization: item.customization || {} });
      byProduct.set(productId, lines);
    }
  }

  const today = now.getTime();
  const suggestions = [];
  for (const [productId, lines] of byProduct) {
    // Two lines of one style in one order are one purchase, not two.
    const dates = [...new Set(lines.map((line) => line.at))].sort((a, b) => a - b);
    const gaps = dates.slice(1).map((date, index) => date - dates[index]);
    const cycle = Math.min(MAX_CYCLE_DAYS * DAY, Math.max(MIN_CYCLE_DAYS * DAY, gaps.length ? median(gaps) : DEFAULT_CYCLE_DAYS * DAY));
    const last = dates[dates.length - 1];
    const dueAt = last + cycle;

    if (today < dueAt - LEAD_DAYS * DAY) continue;
    if (today > dueAt + Math.max(2 * cycle, GIVE_UP_AFTER_DAYS * DAY)) continue;

    suggestions.push({
      productId,
      lastOrderedAt: new Date(last),
      dueAt: new Date(dueAt),
      cycleDays: Math.round(cycle / DAY),
      timesOrdered: dates.length,
      // The last order's combinations, ready for POST /cart/add as `lines`.
      lines: lines
        .filter((line) => line.at === last)
        .map(({ quantity, customization }) => ({
          quantity,
          goldColor: customization.goldColor || '',
          goldCarat: customization.goldCarat || '',
          size: customization.size || '',
        })),
    });
  }

  return suggestions.sort((a, b) => a.dueAt - b.dueAt).slice(0, limit);
}

/** Suggestions for one buyer, minus what is already in their cart or no longer visible to them. */
export async function suggestionsForUser(user, { orders, now = new Date(), limit = 6 } = {}) {
  const history =
    orders ?? (await Order.find({ user: user._id, status: { $in: REORDER_STATUSES } }).select('status createdAt items').lean());
  const inCart = new Set((user.cart?.items || []).map((item) => idOf(item.product)));
  const candidates = reorderSuggestions(history, { now, limit: 50 }).filter((item) => !inCart.has(item.productId));
  const products = await visibleProductsByIds(candidates.map((item) => item.productId), user);
  const byId = new Map(products.map((product) => [product.id, product]));
  return candidates
    .filter((item) => byId.has(item.productId))
    .map((item) => ({ ...item, product: byId.get(item.productId) }))
    .slice(0, limit);
}

function nudgeEmail(buyer, items, site) {
  const rows = items
    .map(
      (item) =>
        `<li style="margin:0 0 8px;"><strong>${escapeHtml(displayName(item.product))}</strong> — style ${escapeHtml(item.product.styleCode)}<br><span style="color:#6f685f;font-size:13px;">Last ordered ${escapeHtml(
          new Date(item.lastOrderedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        )}, ${item.lines.reduce((sum, line) => sum + line.quantity, 0)} pcs</span></li>`,
    )
    .join('');
  return promoEmail({
    subject: `Time to restock ${items.length === 1 ? 'a style' : `${items.length} styles`} from your past orders`,
    heading: `Hello ${buyer.name || 'there'}, time to restock?`,
    bodyHtml: `<p>Going by how often you have ordered them, these pieces are due for a reorder:</p><ul style="padding-left:18px;">${rows}</ul><p>Your previous combinations are saved, so a reorder takes a click from your account page.</p>`,
    ctaLabel: 'Review and reorder',
    ctaUrl: storefrontUrl('/profile'),
    site: site || {},
  });
}

/**
 * Monday job: one email per buyer, listing only the styles whose due date fell
 * in the past seven days. Each style triggers once, with nothing to store.
 */
export async function runNudgesCron(now = new Date()) {
  const settings = await getAiSettings({ fresh: true });
  if (!settings.nudges.enabled) return { skipped: 'Restock emails are off.' };
  if (!isEmailConfigured()) return { skipped: 'Email is not configured.' };
  if (!(await claimCronRun('nudges', { now }))) return { skipped: 'Already ran this week.' };

  const deadline = deadlineIn();
  return runJob('nudges', 'cron', async () => {
    const since = now.getTime() - 7 * DAY;
    const lookback = new Date(now.getTime() - 2 * MAX_CYCLE_DAYS * DAY);
    const orders = await Order.find({ status: { $in: REORDER_STATUSES }, createdAt: { $gte: lookback } })
      .select('user status createdAt items')
      .lean();
    const ordersByUser = new Map();
    for (const order of orders) {
      const key = String(order.user);
      ordersByUser.set(key, [...(ordersByUser.get(key) || []), order]);
    }

    const buyers = await User.find({ _id: { $in: [...ordersByUser.keys()] }, role: 'buyer', status: 'Active' });
    const site = await SiteSettings.findOne().sort({ updatedAt: -1 }).lean();
    const delay = Number(process.env.EMAIL_SEND_DELAY_MS || 400);
    let sent = 0;
    let unfinished = 0;

    for (const buyer of buyers) {
      if (timeLeft(deadline) < 5_000) {
        unfinished += 1;
        continue;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(buyer.email || ''))) continue;
      const due = (await suggestionsForUser(buyer, { orders: ordersByUser.get(String(buyer._id)), now, limit: 10 })).filter(
        (item) => item.dueAt.getTime() >= since && item.dueAt.getTime() < now.getTime(),
      );
      if (!due.length) continue;
      try {
        await sendEmail({ to: buyer.email, ...nudgeEmail(buyer, due, site) });
        sent += 1;
      } catch (error) {
        console.error('[restock] email failed:', error?.message);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return `Emailed ${sent} buyer(s)${unfinished ? `; ran out of time before ${unfinished} more` : ''}.`;
  });
}

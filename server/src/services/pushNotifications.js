/**
 * Who gets a push notification, and when. webPush.js does the sending; this file
 * picks the phones (PushSubscription) and words the messages.
 *
 *   - notifyPushOrderPlaced   → admin and sales staff's phones
 *   - notifyPushOrderStatus   → the buyer's own phones
 *   - notifyPushNewCollection → every phone
 *   - notifyPushBlogPost      → every phone
 *   - pushToAudience          → Admin → Broadcasts, with a chosen audience
 *
 * A phone is tied to a user when it subscribed while signed in, so "a buyer's
 * phones" are the subscriptions carrying that user. Every function no-ops when
 * the VAPID keys are missing, and callers await them inside allSettled so a
 * failed push never fails the order or save that triggered it.
 */
import mongoose from 'mongoose';
import { PushSubscription } from '../models/PushSubscription.js';
import { User } from '../models/index.js';
import { getPushConfigStatus, sendPush } from './webPush.js';

const STAFF_ROLES = ['admin', 'sales'];
const CONCURRENCY = 10;

export const PUSH_AUDIENCES = ['all', 'buyers', 'staff', 'selected'];

/** Sends `payload` to every subscription matching `filter`; drops the ones a push service has retired. */
async function deliver(filter, payload) {
  if (!getPushConfigStatus().configured) return { skipped: true, sent: 0, failed: 0, removed: 0 };
  const subscriptions = await PushSubscription.find(filter).lean();
  const totals = { sent: 0, failed: 0, removed: 0, errors: [] };
  const gone = [];
  // ponytail: every phone is sent from the one request, 10 at a time. Fine for a
  // trade audience of hundreds; move it to a queue if it nears the function timeout.
  const queue = [...subscriptions];
  const worker = async () => {
    while (queue.length) {
      const subscription = queue.shift();
      try {
        const status = await sendPush(subscription, payload);
        // 404/410: the phone uninstalled the app or turned notifications off.
        if (status === 404 || status === 410) gone.push(subscription._id);
        else if (status >= 200 && status < 300) totals.sent += 1;
        else {
          totals.failed += 1;
          totals.errors.push(`HTTP ${status}`);
        }
      } catch (error) {
        console.error('[push] send failed', error.message);
        totals.failed += 1;
        totals.errors.push(error.message);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  if (gone.length) {
    await PushSubscription.deleteMany({ _id: { $in: gone } });
    totals.removed = gone.length;
  }
  totals.errors = [...new Set(totals.errors)].slice(0, 3);
  return totals;
}

async function userIdsWithRoles(roles) {
  return User.find({ role: { $in: roles } }).distinct('_id');
}

/** The subscription filter for an Admin → Broadcasts audience. */
export async function audienceFilter(audience, userIds = []) {
  if (audience === 'all') return {};
  if (audience === 'buyers') return { user: { $in: await userIdsWithRoles(['buyer']) } };
  if (audience === 'staff') return { user: { $in: await userIdsWithRoles(STAFF_ROLES) } };
  if (audience === 'selected') {
    const ids = (Array.isArray(userIds) ? userIds : [])
      .map(String)
      .filter((id) => mongoose.isValidObjectId(id));
    return { user: { $in: ids } };
  }
  throw Object.assign(new Error(`audience must be one of ${PUSH_AUDIENCES.join(', ')}`), { status: 400 });
}

export async function pushToAudience(audience, userIds, payload) {
  return deliver(await audienceFilter(audience, userIds), payload);
}

const idOf = (value) => value?._id || value;
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

export async function notifyPushOrderPlaced(order) {
  const pieces = (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const buyer = order.user?.name || 'A buyer';
  return deliver(
    { user: { $in: await userIdsWithRoles(STAFF_ROLES) } },
    { title: `New order ${order.orderId}`, body: `${buyer} placed an order of ${plural(pieces, 'piece')}.`, url: '/admin/orders' },
  );
}

export async function notifyPushOrderStatus(order, { nextStatus }) {
  if (!idOf(order.user)) return { skipped: true };
  return deliver(
    { user: idOf(order.user) },
    { title: `Order ${order.orderId}: ${nextStatus}`, body: `Your order is now ${String(nextStatus).toLowerCase()}. Tap to view it.`, url: '/profile' },
  );
}

export async function notifyPushNewCollection(collection) {
  return deliver(
    {},
    {
      title: `New collection: ${collection.name}`,
      body: 'Just added to the DeArte catalogue. Tap to see the pieces.',
      url: `/products?collection=${encodeURIComponent(collection.name)}`,
    },
  );
}

export async function notifyPushBlogPost(post) {
  return deliver(
    {},
    { title: post.title, body: String(post.excerpt || 'A new story on the DeArte journal.').slice(0, 200), url: `/blog/${post.slug}` },
  );
}

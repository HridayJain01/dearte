/*
 * Web Push to the installed app, without a library: RFC 8291 message encryption
 * (aes128gcm) and RFC 8292 VAPID, both on node:crypto. webPush.check.js runs the
 * RFC's own test vector and a full send against a local receiver.
 *
 * Keys come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (base64url; make a pair with
 * `node server/scripts/vapid-keys.mjs`). VAPID_SUBJECT is the contact the push
 * services see — Apple rejects pushes without a mailto: or https: one.
 */
import crypto from 'node:crypto';

const b64url = (bytes) => Buffer.from(bytes).toString('base64url');
const fromB64url = (text) => Buffer.from(String(text || ''), 'base64url');
const hkdf = (salt, ikm, info, length) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, length));

// How long a push service holds a message for a phone that is switched off.
const TTL_SECONDS = 7 * 24 * 60 * 60;

export function getPushConfigStatus() {
  const missing = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'].filter((key) => !process.env[key]);
  return { configured: missing.length === 0, missing, publicKey: missing.length ? '' : process.env.VAPID_PUBLIC_KEY };
}

/**
 * RFC 8291 §3–4: `plaintext` encrypted for one subscription as a single aes128gcm
 * record. `salt` and `privateKey` (the sender's one-off ECDH key) are only passed
 * by the check, to reproduce the RFC's vector; a real send draws fresh ones.
 */
export function encryptPayload(plaintext, { p256dh, auth }, { salt = crypto.randomBytes(16), privateKey } = {}) {
  const receiverKey = fromB64url(p256dh);
  const ecdh = crypto.createECDH('prime256v1');
  if (privateKey) ecdh.setPrivateKey(privateKey);
  else ecdh.generateKeys();
  const senderKey = ecdh.getPublicKey();

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), receiverKey, senderKey]);
  const ikm = hkdf(fromB64url(auth), ecdh.computeSecret(receiverKey), keyInfo, 32);
  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  // 0x02 closes the last (here, only) record.
  const record = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(plaintext), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16); // record size
  header.writeUInt8(senderKey.length, 20);
  return Buffer.concat([header, senderKey, record]);
}

/** RFC 8292: a 12-hour ES256 token for the push service that owns `endpoint`. */
function vapidAuthorization(endpoint) {
  const publicKey = fromB64url(process.env.VAPID_PUBLIC_KEY);
  const key = crypto.createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      d: process.env.VAPID_PRIVATE_KEY,
      x: b64url(publicKey.subarray(1, 33)),
      y: b64url(publicKey.subarray(33, 65)),
    },
    format: 'jwk',
  });
  const unsigned = [
    { typ: 'JWT', alg: 'ES256' },
    {
      aud: new URL(endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: process.env.VAPID_SUBJECT || 'mailto:concierge@deartejewels.com',
    },
  ]
    .map((part) => b64url(JSON.stringify(part)))
    .join('.');
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${unsigned}.${b64url(signature)}, k=${process.env.VAPID_PUBLIC_KEY}`;
}

/** Sends one notification. Resolves to the push service's HTTP status (201 = queued); logs a refusal's reason. */
export async function sendPush(subscription, payload) {
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidAuthorization(subscription.endpoint),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(TTL_SECONDS),
      Urgency: 'normal',
    },
    body: encryptPayload(JSON.stringify(payload), subscription.keys),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const reason = (await response.text().catch(() => '')).slice(0, 300);
    console.error(`[push] ${new URL(subscription.endpoint).host} refused with ${response.status}: ${reason}`);
  }
  return response.status;
}

/*
 * Subscriptions arrive from browsers and the server later POSTs to them, so the
 * endpoint must be one of the real push services. Anything else — an internal
 * address, someone else's server — would turn every broadcast into a request
 * forgery from this API.
 */
const PUSH_SERVICE_HOSTS = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];

export function validSubscription(input) {
  let url;
  try {
    url = new URL(String(input?.endpoint || ''));
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const knownHost = PUSH_SERVICE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  const p256dh = String(input?.keys?.p256dh || '');
  const auth = String(input?.keys?.auth || '');
  const receiverKey = fromB64url(p256dh);
  if (url.protocol !== 'https:' || !knownHost || url.href.length > 1000) return null;
  if (receiverKey.length !== 65 || receiverKey[0] !== 4 || fromB64url(auth).length !== 16) return null;
  return { endpoint: String(input.endpoint), keys: { p256dh, auth } };
}

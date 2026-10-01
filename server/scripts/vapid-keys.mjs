// Prints a fresh VAPID key pair for app notifications: node server/scripts/vapid-keys.mjs
// Set both on the API (Vercel → server project → Environment Variables) once, and
// keep them: phones subscribe against the public key, so a new pair silences every
// phone that subscribed under the old one until it opens the app again.
import crypto from 'node:crypto';

const { x, y, d } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ format: 'jwk' });
const publicKey = Buffer.concat([Buffer.from([4]), Buffer.from(x, 'base64url'), Buffer.from(y, 'base64url')]);

console.log(`VAPID_PUBLIC_KEY=${publicKey.toString('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${d}`);

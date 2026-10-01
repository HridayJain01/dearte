/** Self-check for the Web Push sender. Run: node src/services/webPush.check.js */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { encryptPayload, sendPush, validSubscription } from './webPush.js';

const b64 = (text) => Buffer.from(text, 'base64url');
const hkdf = (salt, ikm, info, length) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, length));

// 1. RFC 8291 Appendix A, byte for byte.
const rfcBody = encryptPayload(
  b64('V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24'),
  { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' },
  { salt: b64('DGv6ra1nlYgDCS1FRnbzlw'), privateKey: b64('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw') },
);
assert.deepEqual(
  rfcBody,
  Buffer.concat([
    b64('DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'),
    b64('8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ'),
  ]),
);

// 2. A whole send, received the way a push service and then the phone would.
const vapid = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ format: 'jwk' });
process.env.VAPID_PUBLIC_KEY = Buffer.concat([Buffer.from([4]), b64(vapid.x), b64(vapid.y)]).toString('base64url');
process.env.VAPID_PRIVATE_KEY = vapid.d;
const phone = crypto.createECDH('prime256v1');
phone.generateKeys();
const auth = crypto.randomBytes(16);
const keys = { p256dh: phone.getPublicKey().toString('base64url'), auth: auth.toString('base64url') };

let received;
const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    received = { headers: req.headers, body: Buffer.concat(chunks) };
    res.writeHead(201).end();
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const endpoint = `http://127.0.0.1:${server.address().port}/push/abc`;
const payload = { title: 'New collection', body: 'Aurora is live', url: '/products?collection=Aurora' };
assert.equal(await sendPush({ endpoint, keys }, payload), 201);
server.close();

// The VAPID token verifies against the public key and names this push service.
const [, token, k] = received.headers.authorization.match(/^vapid t=(.+), k=(.+)$/);
const [header, claims, signature] = token.split('.');
const jwk = { kty: 'EC', crv: 'P-256', x: vapid.x, y: vapid.y };
assert.ok(crypto.verify('sha256', Buffer.from(`${header}.${claims}`), { key: crypto.createPublicKey({ key: jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, b64(signature)));
assert.equal(JSON.parse(b64(claims)).aud, new URL(endpoint).origin);
assert.equal(k, process.env.VAPID_PUBLIC_KEY);
assert.equal(received.headers['content-encoding'], 'aes128gcm');

// The phone's side of RFC 8291 recovers the payload.
const body = received.body;
const salt = body.subarray(0, 16);
const senderKey = body.subarray(21, 21 + body[20]);
const ikm = hkdf(auth, phone.computeSecret(senderKey), Buffer.concat([Buffer.from('WebPush: info\0'), phone.getPublicKey(), senderKey]), 32);
const decipher = crypto.createDecipheriv('aes-128-gcm', hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16), hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12));
const sealed = body.subarray(21 + body[20]);
decipher.setAuthTag(sealed.subarray(-16));
const plain = Buffer.concat([decipher.update(sealed.subarray(0, -16)), decipher.final()]);
assert.equal(plain.at(-1), 2);
assert.deepEqual(JSON.parse(plain.subarray(0, -1)), payload);

// 3. Only real push services are accepted as endpoints.
const good = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc:123', keys };
assert.deepEqual(validSubscription(good), good);
assert.ok(validSubscription({ ...good, endpoint: 'https://web.push.apple.com/QGx' }));
assert.equal(validSubscription({ ...good, endpoint: 'http://fcm.googleapis.com/fcm/send/abc' }), null);
assert.equal(validSubscription({ ...good, endpoint: 'https://169.254.169.254/latest/meta-data' }), null);
assert.equal(validSubscription({ ...good, endpoint: 'https://evilfcm.googleapis.com.attacker.io/x' }), null);
assert.equal(validSubscription({ ...good, keys: { ...keys, auth: 'short' } }), null);
console.log('webPush ok');

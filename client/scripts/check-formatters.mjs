// Run: node client/scripts/check-cdn-image.mjs
import assert from 'node:assert';
const { cdnImage } = await import(new URL('../src/utils/formatters.js', import.meta.url));
const raw = 'https://res.cloudinary.com/dlii3jngo/image/upload/v1788014119/dearte/products/a.jpg';
assert.equal(cdnImage(raw, 600), 'https://res.cloudinary.com/dlii3jngo/image/upload/f_auto,q_auto:good,c_limit,w_600/v1788014119/dearte/products/a.jpg');
const noVersion = 'https://res.cloudinary.com/x/image/upload/dearte/a.jpg';
assert.equal(cdnImage(noVersion, 80), 'https://res.cloudinary.com/x/image/upload/f_auto,q_auto:good,c_limit,w_80/dearte/a.jpg');
const done = 'https://res.cloudinary.com/x/image/upload/w_300,c_fill/v1/a.jpg';
assert.equal(cdnImage(done, 600), done);
assert.equal(cdnImage('/src/assets/logo.svg', 600), '/src/assets/logo.svg');
assert.equal(cdnImage('https://images.pexels.com/a.jpg', 600), 'https://images.pexels.com/a.jpg');
assert.equal(cdnImage(undefined, 600), undefined);
assert.equal(cdnImage('', 600), '');
console.log('cdnImage ok');

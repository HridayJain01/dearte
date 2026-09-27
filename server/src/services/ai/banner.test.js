// node --test server/src/services/ai/banner.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeCopy } from './banner.js';

test('variants are trimmed to the slots and linked inside the site', () => {
  const { banners } = sanitizeCopy({
    banners: [{ title: 'Festive Edit for Your Counter', subtitle: 'Lab-grown diamond earrings ready for the season.', ctaLabel: 'Shop earrings now please', ctaLink: 'https://evil.example' }],
  });
  assert.equal(banners.length, 1);
  assert.ok(banners[0].ctaLabel.length <= 18);
  assert.equal(banners[0].ctaLink, '/products');
});

test('invented offers and claims are dropped; numbers from the brief are kept', () => {
  const { banners, announcements } = sanitizeCopy(
    {
      banners: [
        { title: 'Flat 20% off this Diwali', subtitle: 'Limited time.' },
        { title: 'Guaranteed best prices', subtitle: '' },
        { title: 'New Arrivals Are In', subtitle: 'Fresh silhouettes for the season.', ctaLink: '/products?sort=new-arrivals' },
      ],
      announcements: ['Diwali trade orders close 15 October', 'Save 30% today'],
    },
    { brief: 'Diwali trade orders close 15 October' },
  );
  assert.deepEqual(banners.map((banner) => banner.title), ['New Arrivals Are In']);
  assert.deepEqual(announcements, ['Diwali trade orders close 15 October']);
});

// node --test server/src/services/ai/settings.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSettings } from './settings.js';

const current = sanitizeSettings({}, undefined);

test('defaults: every buyer feature staff-only, every job off', () => {
  assert.deepEqual(current.features, { smartSearch: 'staff', photoSearch: 'staff', restock: 'staff', catalogueBuilder: 'staff' });
  assert.equal(current.blog.enabled, false);
  assert.equal(current.photoIndex.enabled, false);
  assert.equal(current.nudges.enabled, false);
  assert.ok(current.blog.topicQueue.length >= 30, 'seed topics are offered before the first save');
});

test('partial updates only touch what was sent, and only valid values', () => {
  const next = sanitizeSettings(
    { features: { smartSearch: 'everyone', photoSearch: 'sometimes' }, blog: { enabled: true, postsPerWeek: 5 } },
    current,
  );
  assert.equal(next.features.smartSearch, 'everyone');
  assert.equal(next.features.photoSearch, 'staff');
  assert.equal(next.blog.enabled, true);
  assert.equal(next.blog.postsPerWeek, 1);
  assert.equal(next.blog.autoPublish, true);
});

test('topics are cleaned; an emptied queue stays empty', () => {
  const next = sanitizeSettings(
    { blog: { topicQueue: [{ title: '  Ring care  ', months: [0, 3, 13], status: 'weird', keywords: ['a', { $ne: 1 }] }, { title: '' }] } },
    current,
  );
  assert.equal(next.blog.topicQueue.length, 1);
  assert.equal(next.blog.topicQueue[0].title, 'Ring care');
  assert.deepEqual(next.blog.topicQueue[0].months, [3]);
  assert.equal(next.blog.topicQueue[0].status, 'queued');
  assert.deepEqual(next.blog.topicQueue[0].keywords, ['a']);
  assert.deepEqual(sanitizeSettings({ blog: { topicQueue: [] } }, current).blog.topicQueue, []);
});

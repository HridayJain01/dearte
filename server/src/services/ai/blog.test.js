// node --test server/src/services/ai/blog.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftProblems, istParts, nextTopic, normaliseDraft, wordCount } from './blog.js';

const words = (count, word = 'jewellery') => Array.from({ length: count }, () => word).join(' ');

function goodDraft(overrides = {}) {
  return normaliseDraft({
    title: 'How to Explain Lab-Grown Diamonds to Customers',
    metaDescription:
      'A practical guide for jewellery retailers on explaining lab-grown diamonds clearly and honestly, with answers to the questions customers ask most.',
    excerpt: 'Clear answers for the questions customers ask at the counter.',
    sections: Array.from({ length: 5 }, (_, index) => ({ heading: `Section ${index + 1}`, paragraphs: [words(200)] })),
    faq: [{ question: 'Are they real diamonds?', answer: 'Yes. They are diamonds grown in a laboratory.' }],
    tags: ['lab-grown', 'retail'],
    ...overrides,
  });
}

test('seasonal topics jump the queue in season and wait otherwise', () => {
  const queue = [
    { title: 'Evergreen', status: 'queued', months: [] },
    { title: 'Diwali', status: 'queued', months: [9, 10] },
    { title: 'Done', status: 'used', months: [] },
  ];
  assert.equal(nextTopic(queue, 10).title, 'Diwali');
  assert.equal(nextTopic(queue, 3).title, 'Evergreen');
  assert.equal(nextTopic([{ title: 'Diwali', status: 'queued', months: [9] }], 3), null);
});

test('normalising drops empty sections and junk, keeps the shape', () => {
  const draft = normaliseDraft({
    title: 'x'.repeat(200),
    sections: [{ heading: 'Kept', paragraphs: ['text'] }, { heading: '', paragraphs: ['orphan'] }, 'junk'],
    faq: [{ question: 'Q?', answer: '' }],
    tags: 'not-a-list',
  });
  assert.equal(draft.title.length, 90);
  assert.equal(draft.sections.length, 1);
  assert.deepEqual(draft.faq, []);
  assert.deepEqual(draft.tags, []);
});

test('a well-formed, grounded draft has no problems', () => {
  const draft = goodDraft();
  assert.ok(wordCount(draft) >= 1000);
  assert.deepEqual(draftProblems(draft, { sources: [], facts: '', existingTitles: ['Ring Care at Home'] }), []);
});

test('invented figures, claims, length and duplicates are all caught', () => {
  const draft = goodDraft({
    title: 'Explaining Lab-Grown Diamonds to Customers',
    sections: [
      { heading: 'Market', paragraphs: [`Lab-grown sales grew 38% last year and are a smart investment. ${words(100)}`] },
    ],
  });
  const problems = draftProblems(draft, { existingTitles: ['How to Explain Lab-Grown Diamonds to Customers'] });
  const joined = problems.join(' | ');
  assert.match(joined, /Use 4–8 sections/);
  assert.match(joined, /words/);
  assert.match(joined, /38/);
  assert.match(joined, /investment claim/);
  assert.match(joined, /Too close/);
});

test('IST weekday and month are read in Asia/Kolkata', () => {
  // 20:30 UTC Monday is 02:00 Tuesday in India.
  const parts = istParts(new Date('2026-09-28T20:30:00Z'));
  assert.equal(parts.weekday, 'Tue');
  assert.equal(parts.month, 9);
});

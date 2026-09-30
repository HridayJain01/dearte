// node --test server/src/services/ai/blog.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftProblems, fitMeta, istParts, nextTopic, normaliseDraft, wordCount } from './blog.js';

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

test('list items written as paragraphs become bullets', () => {
  const draft = normaliseDraft({
    sections: [{ heading: 'Care', paragraphs: ['Keep it simple:', '• Warm water', '- A soft brush', '2) Dry with a cloth'], bullets: ['Store apart'] }],
  });
  assert.deepEqual(draft.sections[0].paragraphs, ['Keep it simple:']);
  assert.deepEqual(draft.sections[0].bullets, ['Store apart', 'Warm water', 'A soft brush', 'Dry with a cloth']);
});

test('an over-long meta description is cut cleanly, never mid-phrase', () => {
  const first = 'A practical checklist of rings, earrings, bangles and bracelets to stock on the counter before the Diwali rush begins.';
  const sentences = `${first} It also covers karats, metal colours and the house diamond quality.`;
  assert.ok(sentences.length > 165);
  assert.equal(fitMeta(sentences), first);
  const oneSentence = 'A practical checklist of ring, earring, bracelet and specialty items to have on the counter before the Diwali rush, with guidance on gold karats, diamond quality and lead times';
  const fitted = fitMeta(oneSentence);
  assert.ok(fitted.length <= 165 && fitted.endsWith('…') && !/\sand…$/.test(fitted), fitted);
  assert.equal(fitMeta('Short and sweet.'), 'Short and sweet.');
});

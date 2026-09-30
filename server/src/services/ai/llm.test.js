// node --test server/src/services/ai/llm.test.js
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chatJson, extractJson } from './llm.js';

process.env.AI_API_KEY = 'test-key';
process.env.AI_TEXT_MODEL = 'test-model';
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// Stub fetch with a queue of responses; records what was sent.
function stubFetch(responses) {
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return responses.shift();
  };
  return calls;
}
const busy = (seconds) => new Response('{"error":{}}', { status: 429, headers: { 'retry-after': String(seconds) } });
const answer = (content) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

test('a reasoning block or code fence around the JSON is ignored', () => {
  assert.deepEqual(extractJson('<think>hmm</think>```json\n{"ok": true}\n```'), { ok: true });
  assert.equal(extractJson('no json here'), null);
});

test('output headroom is added, and gpt-oss is asked to think briefly', async () => {
  const calls = stubFetch([answer('{"ok": true}'), answer('{"ok": true}')]);
  await chatJson({ system: 'JSON', user: 'JSON', maxTokens: 400 });
  assert.equal(calls[0].max_tokens, 1400);
  assert.equal(calls[0].reasoning_effort, undefined);
  await chatJson({ system: 'JSON', user: 'JSON', model: 'openai/gpt-oss-120b' });
  assert.equal(calls[1].reasoning_effort, 'low');
});

test('a short rate-limit wait is taken once when the time limit allows it', async () => {
  const calls = stubFetch([busy(1), answer('{"ok": true}')]);
  const started = Date.now();
  assert.deepEqual(await chatJson({ system: 'JSON', user: 'JSON', timeoutMs: 20_000 }), { ok: true });
  assert.equal(calls.length, 2);
  assert.ok(Date.now() - started >= 1000);
});

test('a wait that does not fit the time limit fails fast as busy', async () => {
  stubFetch([busy(1)]);
  await assert.rejects(chatJson({ system: 'JSON', user: 'JSON', timeoutMs: 3_000 }), { status: 429 });
  stubFetch([busy(40)]);
  await assert.rejects(chatJson({ system: 'JSON', user: 'JSON', timeoutMs: 60_000 }), { status: 429 });
  stubFetch([busy(1), busy(1)]);
  await assert.rejects(chatJson({ system: 'JSON', user: 'JSON', timeoutMs: 20_000 }), { status: 429 });
});

test('an invalid-JSON refusal is sampled once more', async () => {
  const invalid = () => new Response('{"error":{"code":"json_validate_failed","failed_generation":""}}', { status: 400 });
  const calls = stubFetch([invalid(), answer('{"ok": true}')]);
  assert.deepEqual(await chatJson({ system: 'JSON', user: 'JSON', timeoutMs: 20_000 }), { ok: true });
  assert.equal(calls.length, 2);
  stubFetch([invalid(), invalid()]);
  await assert.rejects(chatJson({ system: 'JSON', user: 'JSON', timeoutMs: 20_000 }), { status: 503 });
});

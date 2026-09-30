/**
 * Checks the AI provider settings without touching the database.
 *
 *   node server/scripts/ai-smoke.mjs [image-url]
 *
 * Reads AI_* from server/.env, then the repo-root .env, makes one text call and
 * one image call, and prints what came back. With no image URL a small
 * generated picture is sent, which proves the pipeline (key, model id, JSON
 * mode, image input) works.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: [join(here, '..', '.env'), join(here, '..', '..', '.env')], quiet: true });

const { aiStatus, chatJson } = await import('../src/services/ai/llm.js');

// A 64x64 gold square as a PNG, so the check needs no network image (vision
// models refuse images under 32 px a side).
const SAMPLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAT0lEQVR42u3PQQkAAAgEsGtmPwOZzwi+hcEKLNP1WgQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQELgt5CfFaeNZvTQAAAABJRU5ErkJggg==';

const status = aiStatus();
console.log('configured:', status, '| base:', process.env.AI_BASE_URL || 'groq default');
if (!status.text) {
  console.error('AI_API_KEY and AI_TEXT_MODEL must be set in server/.env or the repo-root .env');
  process.exit(1);
}

const started = Date.now();
const text = await chatJson({
  system: 'Reply with JSON only.',
  user: 'Return {"ok": true, "word": "<one word describing lab-grown diamonds>"} as JSON.',
  maxTokens: 200,
});
console.log(`text (${process.env.AI_TEXT_MODEL}, ${Date.now() - started} ms):`, text);

if (status.vision) {
  const imageStarted = Date.now();
  const image = await chatJson({
    system: 'Reply with JSON only.',
    user: 'Describe the main colour of this image as JSON: {"colour": "..."}',
    images: [process.argv[2] || SAMPLE_IMAGE],
    maxTokens: 200,
  });
  console.log(`vision (${process.env.AI_VISION_MODEL}, ${Date.now() - imageStarted} ms):`, image);
} else {
  console.log('vision: skipped (AI_VISION_MODEL not set)');
}

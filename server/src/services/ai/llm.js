/**
 * The one place the API talks to a language model.
 *
 * It speaks the OpenAI-compatible chat-completions protocol, which Groq, Gemini
 * (its OpenAI-compatible endpoint), OpenRouter, Cloudflare Workers AI and a
 * local Ollama all accept, so changing provider is an env change, not a code
 * change.
 *
 * Env:
 *   AI_API_KEY       required; every AI feature stays off without it
 *   AI_BASE_URL      defaults to Groq
 *   AI_TEXT_MODEL    required for the text features (search, blog, insights…)
 *   AI_VISION_MODEL  required for anything that reads an image
 *   AI_REVIEW_MODEL  optional second opinion for the blog; defaults to the text model
 */

import { sendError } from '../../utils/responses.js';

const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';
const TIMEOUT_MS = 45_000;

/** Which kinds of call this deployment can make. Never exposes the key itself. */
export function aiStatus() {
  const key = Boolean(process.env.AI_API_KEY);
  return {
    text: key && Boolean(process.env.AI_TEXT_MODEL),
    vision: key && Boolean(process.env.AI_VISION_MODEL),
  };
}

/**
 * A failure the caller can show as-is. Routes send `status` (429 or 503) with
 * this message instead of letting the global handler turn it into a bare 500.
 */
export class AiError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = 'AiError';
    this.status = status;
  }
}

/**
 * Route-level catch for AI endpoints. An AiError (busy, unreachable, not
 * configured) or a deliberate 4xx goes back with its own status and message;
 * anything else is a bug, logged here and answered with a plain 500.
 */
export function aiFailure(res, error) {
  if (error instanceof AiError) return sendError(res, error.message, error.status);
  const status = Number(error?.status);
  if (status >= 400 && status < 500) return sendError(res, error.message, status);
  console.error('[ai] request failed:', error);
  return sendError(res, 'Something went wrong. Please try again.', 500);
}

/** A 4xx for bad input, answered as-is by aiFailure. */
export function badRequest(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

/**
 * JSON mode normally hands back bare JSON, but some models still add a
 * reasoning block or a code fence around it. Take the outermost object.
 */
export function extractJson(text) {
  const cleaned = String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * One chat call that must come back as a JSON object.
 *
 * `images` are URLs or data: URIs; passing any switches the default model to
 * the vision one. Prompts must mention JSON — some providers refuse JSON mode
 * otherwise.
 */
export async function chatJson({
  system,
  user,
  images = [],
  model,
  maxTokens = 1500,
  temperature = 0.3,
  timeoutMs = TIMEOUT_MS,
}) {
  const apiKey = process.env.AI_API_KEY;
  const chosenModel = model || (images.length ? process.env.AI_VISION_MODEL : process.env.AI_TEXT_MODEL);
  if (!apiKey || !chosenModel) {
    throw new AiError('AI is not configured on the server.', 503);
  }

  const content = images.length
    ? [{ type: 'text', text: user }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))]
    : user;
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content },
        ],
        response_format: { type: 'json_object' },
        temperature,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    console.error('[ai] request failed:', error?.name, error?.message);
    throw new AiError(
      error?.name === 'TimeoutError' ? 'The AI service took too long to answer.' : 'The AI service could not be reached.',
      503,
    );
  }

  if (response.status === 429) {
    throw new AiError('The AI service is busy right now. Try again in a minute.', 429);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    // The provider's message stays in the server log; callers get a plain one.
    console.error(`[ai] ${chosenModel} answered ${response.status}: ${body.slice(0, 500)}`);
    throw new AiError('The AI service returned an error.', 503);
  }

  const payload = await response.json().catch(() => null);
  const parsed = extractJson(payload?.choices?.[0]?.message?.content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AiError('The AI service returned an answer that could not be read.', 503);
  }
  return parsed;
}

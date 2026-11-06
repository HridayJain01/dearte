// Downloads every Cloudinary image the bucket doesn't have yet.
// Usage: node backup-images.mjs <existing-keys.json> <out-dir> <manifest.json>
// existing-keys.json is `aws s3api list-objects-v2 --query 'Contents[].Key'` output
// (null when the bucket is empty). Prints counts only: the workflow log is public.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [existingFile, outDir, manifestFile] = process.argv.slice(2);
const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
// Caps Cloudinary bandwidth per night; the first full copy spreads over several runs.
const maxDownloads = Number(process.env.MAX_IMAGE_DOWNLOADS || 1500);

const keyOf = (r) => (r.format ? `${r.public_id}.${r.format}` : r.public_id);
const have = new Set(
  (JSON.parse(readFileSync(existingFile, 'utf8')) ?? []).map((k) => k.replace(/^images\//, '')),
);
const auth = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;

const all = [];
let cursor;
do {
  const url = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/image`);
  url.searchParams.set('max_results', '500');
  if (cursor) url.searchParams.set('next_cursor', cursor);
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) throw new Error(`Cloudinary listing failed with HTTP ${res.status}`);
  const page = await res.json();
  all.push(...page.resources);
  cursor = page.next_cursor;
} while (cursor);

const missing = all.filter((r) => !have.has(keyOf(r)));
let copied = 0;
let failed = 0;
for (const r of missing.slice(0, maxDownloads)) {
  const res = await fetch(r.secure_url);
  if (!res.ok) {
    failed++; // still missing, so tomorrow's run retries it
    continue;
  }
  const path = join(outDir, keyOf(r));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  copied++;
}

// Maps public_id -> file, for putting images back after a restore.
writeFileSync(manifestFile, JSON.stringify(all.map((r) => ({ public_id: r.public_id, format: r.format, url: r.secure_url }))));

const left = missing.length - copied;
console.log(`Cloudinary: ${all.length} images, ${missing.length} new, copied ${copied}, failed ${failed}, still to copy ${left}`);
if (failed) console.log(`::warning::${failed} image downloads failed; they will be retried next run`);

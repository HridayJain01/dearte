export const formatDate = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

export const formatWeight = (value, unit) => `${Number(value).toFixed(2)} ${unit}`;

// Cloudinary sends the original upload (often 4000px, ~1 MB) unless the URL
// asks for a size. `width` is the CSS slot width x2 for retina; c_limit never
// upscales and q_auto:good keeps diamond sparkle. URLs that already carry a
// transformation, or aren't Cloudinary, pass through untouched.
const CLOUDINARY_UPLOAD = /(res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?![a-z]{1,3}_[^/]*\/)/;
export const cdnImage = (url, width) =>
  typeof url === 'string' ? url.replace(CLOUDINARY_UPLOAD, `$1f_auto,q_auto:good,c_limit,w_${width}/`) : url;

const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** "Today, 2:13 pm", "Yesterday, 9:05 am", "29 Sept": how admins scan a list. */
export const formatWhen = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.round((dayStart(new Date()) - dayStart(date)) / 86400000);
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(days > 300 ? { year: 'numeric' } : {}) });
};

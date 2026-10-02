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

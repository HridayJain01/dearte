export const formatDate = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

export const formatWeight = (value, unit) => `${Number(value).toFixed(2)} ${unit}`;

export const sentence = (value) =>
  value
    ?.replaceAll('-', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase()) || '';

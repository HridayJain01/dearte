export function normalizeAsset(input) {
  if (!input) {
    return {
      publicId: '',
      secureUrl: '',
      width: 0,
      height: 0,
      alt: '',
      resourceType: 'image',
    };
  }

  return {
    publicId: input.publicId || '',
    secureUrl: input.secureUrl || input.url || '',
    width: Number(input.width || 0),
    height: Number(input.height || 0),
    alt: input.alt || '',
    resourceType: input.resourceType || 'image',
  };
}

export function normalizeAssetArray(items = []) {
  return items.filter(Boolean).map(normalizeAsset);
}

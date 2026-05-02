/**
 * Omit internal ops-only keys from storefront-facing site settings payloads.
 */
export function sanitizeSiteSettingsForPublic(doc) {
  if (!doc) return null;

  let plain =
    typeof doc.toObject === 'function'
      ? doc.toObject({ flattenMaps: true })
      : { ...doc };

  const { whatsappOperationsNumbers: _omit, ...rest } = plain;
  return rest;
}

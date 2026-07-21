/**
 * Omit internal ops-only keys from storefront-facing site settings payloads.
 */
export function sanitizeSiteSettingsForPublic(doc) {
  if (!doc) return null;

  let plain =
    typeof doc.toObject === 'function'
      ? doc.toObject({ flattenMaps: true })
      : { ...doc };

  const {
    whatsappOperationsNumbers: _omitWa,
    orderNotificationEmails: _omitEmail,
    // Guest catalogue rules are enforced server-side; the storefront never needs
    // the raw taxonomy ids, so keep them out of the public payload.
    guestCatalogue: _omitGuestCatalogue,
    ...rest
  } = plain;
  return rest;
}

/**
 * Normalize apartment listing images for API responses.
 * Handles legacy shapes and replaces known-dead Unsplash photo IDs from seed data.
 */

const DEAD_UNSPLASH_REPLACEMENTS = {
  '1502672023488-203a3bb6e526': '1600585154340-be6161a56a0c',
  '1555041469-db819a8be170': '1484154218962-a197022b5858',
};

function repairUnsplashUrl(url) {
  if (typeof url !== 'string' || !url) return url;
  let repaired = url;
  for (const [deadId, replacementId] of Object.entries(DEAD_UNSPLASH_REPLACEMENTS)) {
    if (repaired.includes(deadId)) {
      repaired = repaired.replace(deadId, replacementId);
    }
  }
  return repaired;
}

function extractImageUrl(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return repairUnsplashUrl(entry.trim()) || null;
  if (typeof entry === 'object') {
    const raw = entry.url || entry.secure_url || entry.secureUrl || null;
    return raw ? repairUnsplashUrl(String(raw).trim()) : null;
  }
  return null;
}

function normalizeApartmentImages(images) {
  if (!Array.isArray(images)) return [];

  const normalized = [];
  for (const entry of images) {
    const url = extractImageUrl(entry);
    if (!url) continue;

    if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
      normalized.push({ ...entry, url });
    } else {
      normalized.push({ url });
    }
  }
  return normalized;
}

function normalizeApartmentPayload(apartment) {
  if (!apartment) return apartment;
  const plain = typeof apartment.toJSON === 'function' ? apartment.toJSON() : { ...apartment };
  if (Array.isArray(plain.images)) {
    plain.images = normalizeApartmentImages(plain.images);
  }
  return plain;
}

module.exports = {
  normalizeApartmentImages,
  normalizeApartmentPayload,
  repairUnsplashUrl,
};

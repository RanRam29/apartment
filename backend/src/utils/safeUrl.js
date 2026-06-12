function isSafeImageUrl(url) {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { isSafeImageUrl };

function normalizeJwtSecret(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.trim();
  // Strip wrapping quotes from dashboard paste mistakes: "abc..." or 'abc...'
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function getJwtSecret() {
  const trimmed = normalizeJwtSecret(process.env.JWT_SECRET || '');
  if (trimmed.length < 20) {
    throw new Error(
      'JWT_SECRET must be set to a string of at least 20 characters (Render → Environment)'
    );
  }
  if (trimmed.includes('your_super_secret_jwt_key_change_in_production')) {
    throw new Error('JWT_SECRET cannot use the example placeholder text');
  }
  return trimmed;
}

module.exports = { getJwtSecret };

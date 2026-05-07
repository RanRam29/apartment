function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length < 20) {
    throw new Error('JWT_SECRET must be set');
  }
  const trimmed = secret.trim();
  if (trimmed.includes('your_super_secret_jwt_key_change_in_production')) {
    throw new Error('JWT_SECRET must be set');
  }
  return trimmed;
}

module.exports = { getJwtSecret };

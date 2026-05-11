const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /authorization/i,
  /secret/i,
  /api[-_]?key/i,
  /card/i,
  /cvv/i,
  /iban/i,
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(String(key)));
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (isPlainObject(value)) {
    return sanitizeObject(value);
  }
  return value;
}

function sanitizeObject(input) {
  if (!isPlainObject(input)) return input;
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = isSensitiveKey(key) ? '[REDACTED]' : sanitizeValue(value);
  }
  return output;
}

module.exports = { sanitizeObject };

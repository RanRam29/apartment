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

const SENSITIVE_QUERY_PARAM_PATTERN =
  /([?&](?:access_token|auth|authorization|id_token|refresh_token|token|verificationToken)=)[^&#\s]+/gi;
const VERIFY_PATH_PATTERN = /((?:\/api)?\/auth\/verify\/)[^/?#\s"'<>]+/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(String(key)));
}

function sanitizeString(value) {
  return String(value)
    .replace(VERIFY_PATH_PATTERN, '$1[REDACTED]')
    .replace(SENSITIVE_QUERY_PARAM_PATTERN, '$1[REDACTED]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]');
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (isPlainObject(value)) {
    return sanitizeObject(value);
  }
  if (typeof value === 'string') {
    return sanitizeString(value);
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

module.exports = { sanitizeObject, sanitizeString };

export function keepDigitsOnly(value: string) {
  return value.replace(/[^\d]/g, '');
}

export function keepDecimalNumber(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...decimalParts] = cleaned.split('.');
  if (decimalParts.length === 0) {
    return whole;
  }
  return `${whole}.${decimalParts.join('')}`;
}

export function isIntegerNumberText(value: string) {
  return /^\d+$/.test(value);
}

export function isDecimalNumberText(value: string) {
  return /^\d+(?:\.\d+)?$/.test(value);
}

/**
 * מרכזי עיר לסימון משוער על המפה כשלמודעה אין קואורדינטות.
 * ערכים בקירוב (lat, lng WGS84).
 */
export const CITY_CENTER_BY_NAME: Record<string, [number, number]> = {
  'תל אביב': [32.0853, 34.7818],
  'תל אביב-יפו': [32.0853, 34.7818],
  ירושלים: [31.7683, 35.2137],
  חיפה: [32.794, 34.9896],
  'באר שבע': [31.2518, 34.7915],
  הרצליה: [32.1624, 34.8447],
  'רמת גן': [32.0684, 34.8248],
  גבעתיים: [32.0723, 34.8122],
  'פתח תקווה': [32.0871, 34.8875],
  נתניה: [32.3324, 34.8575],
  'ראשון לציון': [31.964, 34.8044],
  אשדוד: [31.8044, 34.6553],
  רחובות: [31.8928, 34.8113],
  'כפר סבא': [32.175, 34.9069],
  'הוד השרון': [32.15, 34.8833],
  אילת: [29.5581, 34.9482],
  נצרת: [32.6996, 35.3035],
  עכו: [32.9268, 35.0716],
  'קריית אתא': [32.8051, 35.105],
  אשקלון: [31.6688, 34.5743],
  רעננה: [32.1848, 34.8714],
  רמלה: [31.9315, 34.8669],
  לוד: [31.951, 34.8881],
  'בני ברק': [32.0808, 34.8338],
  'רמת השרון': [32.1364, 34.8402],
  הולון: [32.0158, 34.7874],
};

const IL_CENTER: [number, number] = [31.46, 34.84];

/** סטייה קטנה כדי שלא ייעלמו כל הסיכות באותה נקודה */
export function jitterCoords(id: string, lat: number, lng: number): { lat: number; lng: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const dx = ((h % 4001) - 2000) / 500000;
  const dy = (((h >> 16) % 4001) - 2000) / 500000;
  return { lat: lat + dx, lng: lng + dy };
}

export function resolveMapCoords(
  apartmentId: string,
  city: string | undefined | null,
  latitude: unknown,
  longitude: unknown
): { lat: number; lng: number; approx: boolean } {
  const la = typeof latitude === 'number' ? latitude : parseFloat(String(latitude));
  const lo = typeof longitude === 'number' ? longitude : parseFloat(String(longitude));
  if (Number.isFinite(la) && Number.isFinite(lo) && la !== 0 && lo !== 0) {
    return { lat: la, lng: lo, approx: false };
  }
  const c = (city || '').trim();
  if (c) {
    const direct = CITY_CENTER_BY_NAME[c];
    if (direct) {
      const j = jitterCoords(apartmentId, direct[0], direct[1]);
      return { ...j, approx: true };
    }
    const lower = c.toLowerCase();
    const key = Object.keys(CITY_CENTER_BY_NAME).find((k) => k.toLowerCase() === lower);
    if (key) {
      const p = CITY_CENTER_BY_NAME[key];
      const j = jitterCoords(apartmentId, p[0], p[1]);
      return { ...j, approx: true };
    }
  }
  const j = jitterCoords(apartmentId, IL_CENTER[0], IL_CENTER[1]);
  return { ...j, approx: true };
}

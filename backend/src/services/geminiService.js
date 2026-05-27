const axios = require('axios');
const logger = require('../utils/logger');

const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_MODEL = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function geminiGenerateUrl() {
  return `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent`;
}

function geminiRequestConfig(apiKey) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    timeout: 10000,
  };
}

const PARSE_SYSTEM_PROMPT = `You are a real estate search assistant for an Israeli apartment rental app.
Parse free-text in Hebrew or English into a JSON filter object.

Output ONLY valid JSON. Optional fields:
{
  "city": string,
  "street": string,
  "minPrice": number,
  "maxPrice": number,
  "minRooms": number,
  "maxRooms": number,
  "amenities": string[],
  "petsAllowed": boolean,
  "availableFrom": string
}

Rules:
- Israeli city or English name → always set "city" (Hebrew spelling when the user wrote Hebrew).
- Room count: phrases like "3 חדרים", "דירת 4 חדרים", "4 rooms" → set "minRooms" to that integer (minimum rooms wanted).
- Budget: "עד 8000", "עד שמונה אלף", "מקסימום 7000", "under 5000" → "maxPrice" (number). "מעל 4000", "לפחות 5000 שקל" → "minPrice".
- Features map to "amenities" using ONLY these tokens: parking, balcony, elevator, ac, storage, pets_allowed, furnished, sun_boiler.
  Hebrew examples: חניה/חנייה → parking; מרפסת → balcony; מעלית → elevator; מזגן/אייסי → ac; מחסן → storage; ריהוט/מרוהט → furnished; דוד שמש → sun_boiler.
- Pets: חיות מחמד, עם כלב, pet friendly → "petsAllowed": true.

Output nothing but the JSON object.`;

const ALLOWED_AMENITIES = new Set([
  'parking', 'balcony', 'elevator', 'ac', 'storage', 'pets_allowed', 'furnished', 'sun_boiler',
]);

/**
 * Pull JSON object from Gemini output (handles markdown fences and trailing prose).
 * @param {string} text
 * @returns {object|null}
 */
function extractJsonObject(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

/**
 * Keep only known filter keys and safe types (defense-in-depth after LLM output).
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
function sanitizeParsedFilters(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  if (typeof raw.city === 'string' && raw.city.trim()) out.city = raw.city.trim();
  if (typeof raw.street === 'string' && raw.street.trim()) {
    out.street = raw.street.trim();
  }
  if (typeof raw.neighborhood === 'string' && raw.neighborhood.trim() && !out.street) {
    out.street = raw.neighborhood.trim();
  }
  for (const key of ['minPrice', 'maxPrice', 'minRooms', 'maxRooms']) {
    const n = Number(raw[key]);
    if (Number.isFinite(n)) out[key] = n;
  }
  if (Array.isArray(raw.amenities)) {
    const list = raw.amenities
      .filter((x) => typeof x === 'string')
      .map((x) => x.trim())
      .filter((x) => ALLOWED_AMENITIES.has(x));
    if (list.length) out.amenities = list;
  }
  if (typeof raw.petsAllowed === 'boolean') out.petsAllowed = raw.petsAllowed;
  if (typeof raw.availableFrom === 'string' && raw.availableFrom.trim()) {
    out.availableFrom = raw.availableFrom.trim();
  }
  return out;
}

/**
 * Fallback when Gemini returns nothing or misses geography: map known substrings to city (DB uses Hebrew names).
 * Longer patterns are tested first so e.g. "פתח תקווה" wins over shorter overlaps.
 */
const CITY_INFERENCE_RULES = [
  { city: 'פתח תקווה', patterns: ['פתח תקווה', 'petah tikva', 'petah tikvah'] },
  { city: 'ראשון לציון', patterns: ['ראשון לציון', 'rishon', 'rishon lezion'] },
  { city: 'באר שבע', patterns: ['באר שבע', 'beer sheva', 'beersheba'] },
  { city: 'הוד השרון', patterns: ['הוד השרון', 'hod hasharon'] },
  { city: 'קריית אתא', patterns: ['קריית אתא', 'קרית אתא', 'kiryat ata'] },
  { city: 'כפר סבא', patterns: ['כפר סבא', 'kfar saba', 'kfar sabba'] },
  { city: 'רמת גן', patterns: ['רמת גן', 'ramat gan'] },
  { city: 'תל אביב', patterns: ['תל אביב', 'תל-אביב', 'tel aviv', 'tel-aviv'] },
  { city: 'ירושלים', patterns: ['ירושלים', 'jerusalem'] },
  { city: 'חיפה', patterns: ['חיפה', 'haifa'] },
  { city: 'הרצליה', patterns: ['הרצליה', 'herzliya', 'herzlia'] },
  { city: 'גבעתיים', patterns: ['גבעתיים', 'givatayim'] },
  { city: 'נתניה', patterns: ['נתניה', 'netanya'] },
  { city: 'אשדוד', patterns: ['אשדוד', 'ashdod'] },
  { city: 'רחובות', patterns: ['רחובות', 'rehovot'] },
  { city: 'אילת', patterns: ['אילת', 'eilat', 'elat'] },
  { city: 'נצרת', patterns: ['נצרת', 'nazareth'] },
  { city: 'עכו', patterns: ['עכו', 'acre', 'akka'] },
  { city: 'אשקלון', patterns: ['אשקלון', 'ashkelon'] },
  { city: 'רעננה', patterns: ['רעננה', 'raanana', 'ra\'anana'] },
  { city: 'רמלה', patterns: ['רמלה', 'ramla', 'ramle'] },
  { city: 'לוד', patterns: ['לוד', 'lod'] },
];

/**
 * @returns {{ minRooms?: number }}
 */
function inferRoomConstraints(query) {
  const out = {};
  const m =
    query.match(/(\d+)\s*חדרים?/u) ||
    query.match(/חדרים?\s*(\d+)/u) ||
    query.match(/(\d+)\s*rooms?\b/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 20) out.minRooms = n;
  }
  return out;
}

/**
 * @returns {{ maxPrice?: number, minPrice?: number }}
 */
function inferPriceConstraints(query) {
  const out = {};
  const compact = query.replace(/\s/g, ' ');
  /** ₪ may sit flush before digits (₪8,000) */
  const moneyNum = '(?:₪\\s*)?([\\d][\\d,]*)';
  let m = compact.match(new RegExp(`עד\\s*${moneyNum}`, 'u'));
  if (m) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (Number.isFinite(n) && n > 0) out.maxPrice = n;
  }
  m = compact.match(new RegExp(`מקסימום\\s*${moneyNum}`, 'u'));
  if (m && out.maxPrice === undefined) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (Number.isFinite(n) && n > 0) out.maxPrice = n;
  }
  m = compact.match(new RegExp(`מתחת ל\\s*${moneyNum}`, 'u'));
  if (m && out.maxPrice === undefined) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (Number.isFinite(n) && n > 0) out.maxPrice = n;
  }
  m = compact.match(new RegExp(`לפחות\\s*${moneyNum}`, 'u'));
  if (m) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (Number.isFinite(n) && n > 0) out.minPrice = n;
  }
  m = compact.match(new RegExp(`מעל\\s*${moneyNum}`, 'u'));
  if (m && out.minPrice === undefined) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (Number.isFinite(n) && n > 0) out.minPrice = n;
  }
  return out;
}

const AMENITY_KEYWORD_RULES = [
  { token: 'parking', patterns: ['חניה', 'חנייה', 'חניון', 'parking', 'car spot'] },
  { token: 'balcony', patterns: ['מרפסת', 'balcony'] },
  { token: 'elevator', patterns: ['מעלית', 'elevator', 'lift'] },
  { token: 'ac', patterns: ['מזגן', 'אייסי', 'מיזוג', 'air cond'] },
  { token: 'storage', patterns: ['מחסן', 'מחסן אחסון', 'storage'] },
  { token: 'furnished', patterns: ['מרוהט', 'ריהוט', 'furnished'] },
  { token: 'sun_boiler', patterns: ['דוד שמש', 'sun boiler'] },
];

/**
 * @returns {{ amenities?: string[], petsAllowed?: boolean }}
 */
function inferAmenitiesAndPets(query) {
  const lower = query.toLowerCase();
  const trimmed = query.trim();
  const found = new Set();

  for (const { token, patterns } of AMENITY_KEYWORD_RULES) {
    for (const p of patterns) {
      const isHebrew = /[\u0590-\u05FF]/.test(p);
      const hay = isHebrew ? trimmed : lower;
      const needle = isHebrew ? p : p.toLowerCase();
      if (hay.includes(needle)) found.add(token);
    }
  }

  let petsAllowed = false;
  if (
    /חיות מחמד/u.test(trimmed) ||
    /ניתן לחיות/u.test(trimmed) ||
    /עם חיות/u.test(trimmed) ||
    /(?:^|[\s,.])(כלבים?|חתולים?)(?:[\s,.]|$)/u.test(trimmed) ||
    /\bpets?\b/i.test(lower)
  ) {
    petsAllowed = true;
  }

  const out = {};
  const amenities = [...found].filter((x) => ALLOWED_AMENITIES.has(x));
  if (amenities.length) out.amenities = amenities;
  if (petsAllowed) out.petsAllowed = true;
  return out;
}

function inferFiltersFromQuery(query) {
  if (!query || typeof query !== 'string') return {};
  const trimmed = query.trim();
  if (!trimmed) return {};

  const out = {};
  const lowerAscii = trimmed.toLowerCase();

  for (const { city, patterns } of CITY_INFERENCE_RULES) {
    let hit = false;
    for (const p of patterns) {
      const isHebrew = /[\u0590-\u05FF]/.test(p);
      const haystack = isHebrew ? trimmed : lowerAscii;
      const needle = isHebrew ? p : p.toLowerCase();
      if (haystack.includes(needle)) {
        out.city = city;
        hit = true;
        break;
      }
    }
    if (hit) break;
  }

  Object.assign(out, inferRoomConstraints(trimmed));
  Object.assign(out, inferPriceConstraints(trimmed));
  Object.assign(out, inferAmenitiesAndPets(trimmed));

  return out;
}

function mergeParsedFilters(query, geminiFilters) {
  const inferred = inferFiltersFromQuery(query);
  const gemini = geminiFilters && typeof geminiFilters === 'object' && !Array.isArray(geminiFilters) ? geminiFilters : {};

  const merged = { ...inferred, ...gemini };

  const amenUnion = [
    ...new Set([
      ...(Array.isArray(inferred.amenities) ? inferred.amenities : []),
      ...(Array.isArray(gemini.amenities) ? gemini.amenities : []),
    ]),
  ].filter((x) => typeof x === 'string' && ALLOWED_AMENITIES.has(x));
  if (amenUnion.length) merged.amenities = amenUnion;
  else delete merged.amenities;

  const minRoomsCand = [inferred.minRooms, gemini.minRooms].filter((x) => x != null && Number.isFinite(Number(x)));
  if (minRoomsCand.length) merged.minRooms = Math.max(...minRoomsCand.map(Number));

  const maxRoomsCand = [inferred.maxRooms, gemini.maxRooms].filter((x) => x != null && Number.isFinite(Number(x)));
  if (maxRoomsCand.length === 2) merged.maxRooms = Math.min(...maxRoomsCand.map(Number));
  else if (maxRoomsCand.length === 1) merged.maxRooms = maxRoomsCand[0];

  const maxPriceCand = [inferred.maxPrice, gemini.maxPrice].filter((x) => x != null && Number.isFinite(Number(x)));
  if (maxPriceCand.length) merged.maxPrice = Math.min(...maxPriceCand.map(Number));

  const minPriceCand = [inferred.minPrice, gemini.minPrice].filter((x) => x != null && Number.isFinite(Number(x)));
  if (minPriceCand.length) merged.minPrice = Math.max(...minPriceCand.map(Number));

  if (inferred.petsAllowed === true || gemini.petsAllowed === true) merged.petsAllowed = true;

  if (gemini.city && typeof gemini.city === 'string' && gemini.city.trim()) merged.city = gemini.city.trim();
  else if (inferred.city) merged.city = inferred.city;

  return merged;
}

/**
 * Parses a free-text apartment search query into structured filters using Gemini.
 * @param {string} query - User's natural language query (Hebrew or English)
 * @returns {object} Structured filter object
 */
async function parseSearchQuery(query) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set — using heuristic filters only');
    return inferFiltersFromQuery(query);
  }

  const t0 = Date.now();
  try {
    const response = await axios.post(
      geminiGenerateUrl(),
      {
        contents: [
          {
            parts: [
              { text: PARSE_SYSTEM_PROMPT },
              { text: `Query: "${query}"` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      },
      geminiRequestConfig(apiKey)
    );

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = extractJsonObject(rawText);
    if (!parsed) {
      logger.warn(`Gemini nlp_parse invalid_json ms=${Date.now() - t0}`);
      return inferFiltersFromQuery(query);
    }

    const geminiFilters = sanitizeParsedFilters(parsed);
    const filters = mergeParsedFilters(query, geminiFilters);
    logger.info(`Gemini nlp_parse ok ms=${Date.now() - t0} keys=${Object.keys(filters).length}`);
    return filters;
  } catch (err) {
    logger.error(`Gemini nlp_parse error ms=${Date.now() - t0}: ${err.message}`);
    return inferFiltersFromQuery(query);
  }
}

const COPY_STYLE_INSTRUCTIONS = {
  professional: 'Write in a professional, authoritative tone. Emphasise specifications, location advantages, and investment value. Use formal Hebrew.',
  friendly:     'Write in a warm, conversational tone. Emphasise lifestyle, comfort, and community feel. Use friendly, everyday Hebrew.',
  luxury:       'Write in a sophisticated, aspirational tone. Use premium descriptive language. Highlight exclusive features and prestige. Use elegant Hebrew.',
};

/**
 * Generates a short AI summary for a landlord's listing to improve engagement.
 * @param {object} apartment - Apartment data
 * @returns {string} Short marketing description
 */
async function generateListingSummary(apartment) {
  return generateMarketingCopy(apartment, 'professional');
}

/**
 * Generates style-variant marketing copy for a listing.
 * @param {object} apartment - Apartment data
 * @param {'professional'|'friendly'|'luxury'} style
 * @returns {string|null} Generated copy or null on failure
 */
async function generateMarketingCopy(apartment, style = 'professional') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const styleInstruction = COPY_STYLE_INSTRUCTIONS[style] || COPY_STYLE_INSTRUCTIONS.professional;

  const prompt = `${styleInstruction}

Write a compelling 2–3 sentence Hebrew apartment listing description for:
City: ${apartment.city}${(apartment.street || apartment.neighborhood) ? `, ${apartment.street || apartment.neighborhood}` : ''}
Rooms: ${apartment.rooms}, Size: ${apartment.sizeSqm ? `${apartment.sizeSqm} m²` : 'N/A'}, Floor: ${apartment.floor ?? 'N/A'}
Price: ₪${apartment.price}/month
Amenities: ${(apartment.amenities || []).join(', ') || 'None listed'}
Pets allowed: ${apartment.petsAllowed ? 'Yes' : 'No'}

Output only the description text, no labels or formatting.`;

  const t0 = Date.now();
  try {
    const response = await axios.post(
      geminiGenerateUrl(),
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 160 },
      },
      geminiRequestConfig(apiKey)
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    logger.info(`Gemini marketing_copy ok ms=${Date.now() - t0} style=${style}`);
    return text;
  } catch (err) {
    logger.error(`Gemini marketing_copy error ms=${Date.now() - t0} style=${style}: ${err.message}`);
    return null;
  }
}

const CONTRACT_EXTRACTION_PROMPT = `You are a Hebrew rental contract analyzer. Extract the following fields from this rental contract document.
Return a JSON object with exactly these keys:
- landlordName (string)
- landlordId (string, Israeli ID number)
- tenantName (string, or null if not present)
- tenantId (string, or null)
- address (string, full address)
- startDate (string, YYYY-MM-DD)
- endDate (string, YYYY-MM-DD)
- monthlyRent (number, in ILS)
- paymentDay (number, 1-31)
- cpiLinked (boolean)
- missingFields (array of field names that could not be extracted)
- warnings (array of strings for problematic clauses)
Return ONLY valid JSON, no markdown.`;

async function extractContractFields(fileBuffer) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for contract extraction');
  }

  const base64 = fileBuffer.toString('base64');
  const t0 = Date.now();

  try {
    const response = await axios.post(
      geminiGenerateUrl(),
      {
        contents: [
          {
            parts: [
              { text: CONTRACT_EXTRACTION_PROMPT },
              { inlineData: { mimeType: 'application/pdf', data: base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      },
      { ...geminiRequestConfig(apiKey), timeout: 30000 }
    );

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = extractJsonObject(rawText);
    if (!parsed) {
      logger.warn(`Gemini contract_extract invalid_json ms=${Date.now() - t0}`);
      return { missingFields: ['all'], warnings: ['Failed to parse contract'] };
    }

    logger.info(`Gemini contract_extract ok ms=${Date.now() - t0}`);
    return parsed;
  } catch (err) {
    logger.error(`Gemini contract_extract error ms=${Date.now() - t0}: ${err.message}`);
    return { missingFields: ['all'], warnings: [`Extraction failed: ${err.message}`] };
  }
}

module.exports = {
  parseSearchQuery,
  generateListingSummary,
  generateMarketingCopy,
  extractContractFields,
  COPY_STYLE_INSTRUCTIONS,
  sanitizeParsedFilters,
  extractJsonObject,
  inferFiltersFromQuery,
  mergeParsedFilters,
  geminiGenerateUrl,
  GEMINI_MODEL,
};

const axios = require('axios');
const logger = require('../utils/logger');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const PARSE_SYSTEM_PROMPT = `You are a real estate search assistant for an Israeli apartment rental app.
Your job is to parse a free-text search query in Hebrew or English into a structured JSON filter object.

Output ONLY valid JSON with these optional fields:
{
  "city": string,
  "neighborhood": string,
  "minPrice": number,
  "maxPrice": number,
  "minRooms": number,
  "maxRooms": number,
  "amenities": string[],  // from: ["parking","balcony","elevator","ac","storage","pets_allowed","furnished","sun_boiler"]
  "petsAllowed": boolean,
  "availableFrom": string  // ISO date YYYY-MM-DD
}

When the user names an Israeli city or area (Hebrew or English, e.g. תל אביב, Tel Aviv, חיפה), you MUST include the "city" field with that name (use Hebrew city name when the user wrote Hebrew).

Only include other fields that are clearly mentioned. Output nothing but the JSON object.`;

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
  if (typeof raw.neighborhood === 'string' && raw.neighborhood.trim()) {
    out.neighborhood = raw.neighborhood.trim();
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

function inferFiltersFromQuery(query) {
  if (!query || typeof query !== 'string') return {};
  const trimmed = query.trim();
  if (!trimmed) return {};
  const lowerAscii = trimmed.toLowerCase();

  for (const { city, patterns } of CITY_INFERENCE_RULES) {
    for (const p of patterns) {
      const isHebrew = /[\u0590-\u05FF]/.test(p);
      const haystack = isHebrew ? trimmed : lowerAscii;
      const needle = isHebrew ? p : p.toLowerCase();
      if (haystack.includes(needle)) return { city };
    }
  }
  return {};
}

function mergeParsedFilters(query, geminiFilters) {
  const inferred = inferFiltersFromQuery(query);
  return { ...inferred, ...geminiFilters };
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
      `${GEMINI_API_URL}?key=${apiKey}`,
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
      { timeout: 10000 }
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
City: ${apartment.city}${apartment.neighborhood ? `, ${apartment.neighborhood}` : ''}
Rooms: ${apartment.rooms}, Size: ${apartment.sizeSqm ? `${apartment.sizeSqm} m²` : 'N/A'}, Floor: ${apartment.floor ?? 'N/A'}
Price: ₪${apartment.price}/month
Amenities: ${(apartment.amenities || []).join(', ') || 'None listed'}
Pets allowed: ${apartment.petsAllowed ? 'Yes' : 'No'}

Output only the description text, no labels or formatting.`;

  const t0 = Date.now();
  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 160 },
      },
      { timeout: 10000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    logger.info(`Gemini marketing_copy ok ms=${Date.now() - t0} style=${style}`);
    return text;
  } catch (err) {
    logger.error(`Gemini marketing_copy error ms=${Date.now() - t0} style=${style}: ${err.message}`);
    return null;
  }
}

module.exports = {
  parseSearchQuery,
  generateListingSummary,
  generateMarketingCopy,
  COPY_STYLE_INSTRUCTIONS,
  sanitizeParsedFilters,
  extractJsonObject,
  inferFiltersFromQuery,
  mergeParsedFilters,
};

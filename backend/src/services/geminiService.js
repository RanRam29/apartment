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

Only include fields that are clearly mentioned. Do not guess. Output nothing but the JSON object.`;

/**
 * Parses a free-text apartment search query into structured filters using Gemini.
 * @param {string} query - User's natural language query (Hebrew or English)
 * @returns {object} Structured filter object
 */
async function parseSearchQuery(query) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set — returning empty filters');
    return {};
  }

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

    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Strip markdown code fences if Gemini wraps output
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const filters = JSON.parse(cleaned);

    logger.info(`Gemini parsed query "${query}" →`, filters);
    return filters;
  } catch (err) {
    logger.error('Gemini parse error:', err.message);
    return {};
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

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 160 },
      },
      { timeout: 10000 }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    logger.error('Gemini marketing copy error:', err.message);
    return null;
  }
}

module.exports = { parseSearchQuery, generateListingSummary, generateMarketingCopy, COPY_STYLE_INSTRUCTIONS };

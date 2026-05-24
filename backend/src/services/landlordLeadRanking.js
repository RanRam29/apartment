const { Op } = require('sequelize');
const { Swipe } = require('../models');
const { UserPreferences } = require('../models');
const { scoreLeads } = require('./aiServiceClient');

function toPlain(value) {
  if (!value) return value;
  return typeof value.toJSON === 'function' ? value.toJSON() : value;
}

async function fetchSwipeMap(tenantIds, apartmentIds) {
  if (!tenantIds.length || !apartmentIds.length) {
    return new Map();
  }

  const swipes = await Swipe.findAll({
    where: {
      tenantId: { [Op.in]: tenantIds },
      apartmentId: { [Op.in]: apartmentIds },
    },
    attributes: ['tenantId', 'apartmentId', 'direction', 'seenDurationMs'],
    raw: true,
  });

  return new Map(swipes.map((s) => [`${s.tenantId}:${s.apartmentId}`, s]));
}

async function fetchPreferencesMap(tenantIds) {
  if (!tenantIds.length) {
    return new Map();
  }

  const prefs = await UserPreferences.find({ userId: { $in: tenantIds } }).lean();
  return new Map(prefs.map((p) => [p.userId, p]));
}

/**
 * Attach _leadScore to landlord lead rows and sort by score descending.
 * Falls back to chronological order when scoring inputs are unavailable.
 */
async function rankLandlordLeads(matchRows) {
  if (!matchRows.length) {
    return [];
  }

  const tenantIds = [...new Set(matchRows.map((m) => m.tenantId))];
  const apartmentIds = [...new Set(matchRows.map((m) => m.apartmentId))];
  const [swipeMap, prefsMap] = await Promise.all([
    fetchSwipeMap(tenantIds, apartmentIds),
    fetchPreferencesMap(tenantIds),
  ]);

  const groups = new Map();

  for (const match of matchRows) {
    const aptId = match.apartmentId;
    if (!groups.has(aptId)) {
      groups.set(aptId, { apartment: toPlain(match.apartment), items: [] });
    }

    const swipe = swipeMap.get(`${match.tenantId}:${aptId}`);
    const prefs = prefsMap.get(match.tenantId);

    groups.get(aptId).items.push({
      matchId: match.id,
      leadInput: {
        id: match.id,
        swipeDirection: swipe?.direction ?? 'like',
        seenDurationMs: swipe?.seenDurationMs ?? 0,
        isVerified: match.tenant?.isVerified ?? false,
        phone: match.tenant?.phone ?? null,
        preferences: {
          budget: prefs?.budget ?? {},
          cities: prefs?.cities ?? [],
        },
      },
    });
  }

  const scoreByMatchId = new Map();

  for (const group of groups.values()) {
    const leadInputs = group.items.map((item) => item.leadInput);
    const ranked = await scoreLeads(leadInputs, group.apartment);
    for (const row of ranked) {
      scoreByMatchId.set(row.id, row._leadScore);
    }
  }

  return matchRows
    .map((match) => {
      const plain = toPlain(match);
      return {
        ...plain,
        leadScore: scoreByMatchId.get(match.id) ?? null,
      };
    })
    .sort((a, b) => (b.leadScore ?? 0) - (a.leadScore ?? 0));
}

module.exports = { rankLandlordLeads };

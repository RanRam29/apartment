/**
 * Lead scoring heuristics (ported from ai-service/src/lead_scoring.py).
 * Used as the default Node path; optional HTTP proxy via aiServiceClient.
 */

function scoreLeads(leads, apartment) {
  if (!leads?.length) {
    return [];
  }

  const aptPrice = apartment?.price ?? 0;
  const aptCity = (apartment?.city ?? '').toLowerCase();

  const scored = leads.map((lead) => {
    let score = 0;
    const prefs = lead.preferences ?? {};

    const budgetMax = prefs.budget?.max ?? 0;
    if (budgetMax >= aptPrice) {
      score += 35;
    } else if (budgetMax > 0) {
      score += (budgetMax / aptPrice) * 35;
    }

    const direction = lead.swipeDirection ?? 'like';
    if (direction === 'superlike') {
      score += 25;
    } else if (direction === 'like') {
      score += 15;
    }

    const seenMs = lead.seenDurationMs ?? 0;
    if (seenMs > 5000) {
      score += 10;
    } else if (seenMs > 2000) {
      score += 5;
    }

    if (lead.isVerified) {
      score += 10;
    }
    if (lead.phone) {
      score += 5;
    }

    const tenantCities = (prefs.cities ?? []).map((c) => String(c).toLowerCase());
    if (tenantCities.includes(aptCity)) {
      score += 15;
    }

    return { ...lead, _leadScore: Math.round(score * 10) / 10 };
  });

  return scored.sort((a, b) => b._leadScore - a._leadScore);
}

module.exports = { scoreLeads };

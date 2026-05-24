/**
 * Apartment recommendation scoring (ported from ai-service/src/recommendation_engine.py).
 * Pure JS — no numpy/sklearn dependency on the Node production path.
 */

function similarityBoost(apartment, likedApartments) {
  if (!likedApartments.length) {
    return 0;
  }

  const aptAmenities = new Set(apartment.amenities ?? []);
  const aptCity = (apartment.city ?? '').toLowerCase();
  const aptRooms = apartment.rooms ?? 0;

  const sims = likedApartments.map((liked) => {
    const likedAmenities = new Set(liked.amenities ?? []);
    const union = new Set([...aptAmenities, ...likedAmenities]);
    const amenitySim = union.size
      ? [...aptAmenities].filter((a) => likedAmenities.has(a)).length / union.size
      : 0;

    const citySim = aptCity === (liked.city ?? '').toLowerCase() ? 1 : 0;
    const roomsDiff = Math.abs(aptRooms - (liked.rooms ?? 0));
    const roomsSim = Math.max(0, 1 - roomsDiff * 0.25);

    return amenitySim * 0.4 + citySim * 0.4 + roomsSim * 0.2;
  });

  return sims.reduce((sum, v) => sum + v, 0) / sims.length;
}

function scoreApartments(apartments, preferences = {}, swipeHistory = []) {
  if (!apartments?.length) {
    return [];
  }

  const likedIds = new Set(
    swipeHistory
      .filter((s) => s.direction === 'like' || s.direction === 'superlike')
      .map((s) => s.apartmentId)
  );
  const seenIds = new Set(swipeHistory.map((s) => s.apartmentId));

  const candidates = apartments.filter((a) => !seenIds.has(a.id));
  if (!candidates.length) {
    return [];
  }

  const budgetMax = preferences.budget?.max ?? 99999;
  const budgetMin = preferences.budget?.min ?? 0;
  const prefCities = new Set((preferences.cities ?? []).map((c) => String(c).toLowerCase()));
  const prefRoomsMin = preferences.rooms?.min ?? 0;
  const prefRoomsMax = preferences.rooms?.max ?? 99;
  const reqAmenities = new Set(preferences.requiredAmenities ?? []);

  const likedApartments = apartments.filter((a) => likedIds.has(a.id));
  const scores = new Array(candidates.length).fill(0);

  candidates.forEach((apt, i) => {
    let score = 0;
    const price = apt.price ?? 0;
    const rooms = apt.rooms ?? 0;
    const city = (apt.city ?? '').toLowerCase();
    const amenities = new Set(apt.amenities ?? []);

    if (budgetMin <= price && price <= budgetMax) {
      score += 30;
    } else if (price < budgetMin) {
      score += 10;
    } else {
      const overshoot = (price - budgetMax) / Math.max(budgetMax, 1);
      score += Math.max(0, 30 - overshoot * 60);
    }

    if (prefCities.size && prefCities.has(city)) {
      score += 25;
    } else if (!prefCities.size) {
      score += 10;
    }

    if (prefRoomsMin <= rooms && rooms <= prefRoomsMax) {
      score += 20;
    } else {
      const diff = Math.min(Math.abs(rooms - prefRoomsMin), Math.abs(rooms - prefRoomsMax));
      score += Math.max(0, 20 - diff * 8);
    }

    if (reqAmenities.size) {
      const matched = [...reqAmenities].filter((a) => amenities.has(a)).length;
      score += (matched / reqAmenities.size) * 15;
    }

    score += Math.min(5, (apt.likeCount ?? 0) * 0.1);

    if (likedIds.size) {
      score += similarityBoost(apt, likedApartments) * 5;
    }

    scores[i] = score;
  });

  const maxScore = Math.max(...scores);
  const normalized = maxScore > 0 ? scores.map((s) => (s / maxScore) * 100) : scores;

  return candidates
    .map((apt, i) => ({
      ...apt,
      _score: Math.round(normalized[i] * 10) / 10,
    }))
    .sort((a, b) => b._score - a._score);
}

module.exports = { scoreApartments, similarityBoost };

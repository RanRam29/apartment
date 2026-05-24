const axios = require('axios');
const { UserPreferences } = require('../models');
const logger = require('../utils/logger');
const { scoreLeads: scoreLeadsLocal } = require('./leadScoringService');
const { scoreApartments: scoreApartmentsLocal } = require('./recommendationEngineService');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '8000', 10);

function getAiServiceBaseUrl() {
  const url = process.env.AI_SERVICE_URL?.trim();
  return url ? url.replace(/\/$/, '') : null;
}

function isAiServiceConfigured() {
  return Boolean(getAiServiceBaseUrl());
}

async function postToAiService(path, body) {
  const base = getAiServiceBaseUrl();
  if (!base) {
    return null;
  }

  try {
    const { data } = await axios.post(`${base}${path}`, body, {
      timeout: DEFAULT_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });
    return data;
  } catch (err) {
    logger.warn('ai-service request failed, using Node scoring fallback', {
      path,
      error: err.message,
    });
    return null;
  }
}

async function scoreLeads(leads, apartment) {
  const remote = await postToAiService('/api/leads/score', { leads, apartment });
  if (remote?.leads) {
    return remote.leads;
  }
  return scoreLeadsLocal(leads, apartment);
}

async function scoreApartmentsForUser(userId, apartments) {
  const remote = await postToAiService('/api/recommendations/score', {
    user_id: userId,
    apartments,
  });
  if (remote?.apartments) {
    return remote.apartments;
  }

  const prefsDoc = await UserPreferences.findOne({ userId }).lean();
  const preferences = prefsDoc ? { ...prefsDoc } : {};
  const swipeHistory = preferences.swipeHistory ?? [];
  delete preferences.swipeHistory;

  return scoreApartmentsLocal(apartments, preferences, swipeHistory);
}

module.exports = {
  getAiServiceBaseUrl,
  isAiServiceConfigured,
  scoreLeads,
  scoreApartmentsForUser,
};

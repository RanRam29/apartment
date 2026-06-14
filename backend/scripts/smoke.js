#!/usr/bin/env node
/**
 * C3 — Post-deploy smoke: health, auth, apartments feed.
 *
 * Usage (from backend/):
 *   API_BASE_URL=https://apartment-backend-v24y.onrender.com \
 *   SMOKE_EMAIL=... SMOKE_PASSWORD=... \
 *   npm run smoke
 *
 * Without SMOKE_EMAIL/SMOKE_PASSWORD only GET /health runs (still exit 0 if health ok).
 */
require('dotenv').config();
const axios = require('axios');

const BASE = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const HTTP_TIMEOUT = parseInt(process.env.SMOKE_HTTP_TIMEOUT_MS || '15000', 10);
const httpConfig = { timeout: HTTP_TIMEOUT, validateStatus: () => true };

let failed = false;

function fail(step, detail) {
  failed = true;
  console.error(`✗ ${step}: ${detail}`);
}

function pass(step) {
  console.log(`✓ ${step}`);
}

async function main() {
  console.log(`Smoke → ${BASE}`);

  try {
    const health = await axios.get(`${BASE}/health`, httpConfig);
    if (health.status !== 200 || health.data?.status !== 'ok') {
      fail('GET /health', `status ${health.status} body=${JSON.stringify(health.data)}`);
    } else {
      pass('GET /health');
    }
  } catch (err) {
    fail('GET /health', err.message);
  }

  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;

  if (!email || !password) {
    console.log('ℹ SMOKE_EMAIL/SMOKE_PASSWORD not set — skipping authenticated checks');
    process.exit(failed ? 1 : 0);
  }

  let token;
  try {
    const login = await axios.post(
      `${BASE}/api/auth/login`,
      { email, password },
      httpConfig
    );
    if (login.status !== 200 || !login.data?.token) {
      fail('POST /api/auth/login', `status ${login.status} — ${login.data?.error || 'no token'}`);
    } else {
      token = login.data.token;
      pass('POST /api/auth/login');
    }
  } catch (err) {
    fail('POST /api/auth/login', err.message);
  }

  if (token) {
    try {
      const apartments = await axios.get(`${BASE}/api/apartments/feed`, {
        ...httpConfig,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (apartments.status !== 200 || !Array.isArray(apartments.data?.apartments)) {
        fail(
          'GET /api/apartments/feed',
          `status ${apartments.status} — expected apartments array (use a tenant SMOKE account)`
        );
      } else {
        pass(`GET /api/apartments/feed (${apartments.data.apartments.length} listings)`);
      }
    } catch (err) {
      fail('GET /api/apartments/feed', err.message);
    }
  }

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke crashed:', err.message);
  process.exit(1);
});

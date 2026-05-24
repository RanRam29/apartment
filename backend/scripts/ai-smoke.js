#!/usr/bin/env node
/**
 * QA-050: Manual/staging smoke for Gemini-backed routes.
 *
 * Usage (from backend/):
 *   API_BASE_URL=https://your-backend.onrender.com \
 *   TENANT_EMAIL=... TENANT_PASSWORD=... \
 *   LANDLORD_EMAIL=... LANDLORD_PASSWORD=... \
 *   npm run smoke:ai
 *
 * Without credentials, only health check runs.
 */
require('dotenv').config();
const axios = require('axios');

const BASE = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const HTTP_TIMEOUT = parseInt(process.env.SMOKE_HTTP_TIMEOUT_MS || '8000', 10);
const httpConfig = { timeout: HTTP_TIMEOUT, validateStatus: () => true };

async function login(email, password) {
  const { data } = await axios.post(`${BASE}/api/auth/login`, { email, password }, httpConfig);
  if (!data.token) throw new Error('login failed');
  return data.token;
}

async function runStep(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error || err.message;
    console.error(`✗ ${name} (${status ?? 'network'}): ${detail}`);
    return false;
  }
}

async function main() {
  console.log(`AI smoke → ${BASE}`);
  let passed = 0;
  let total = 0;

  total += 1;
  if (await runStep('health', async () => {
    const { data } = await axios.get(`${BASE}/health`, httpConfig);
    if (data.status !== 'ok') throw new Error('unexpected health payload');
  })) passed += 1;

  const tenantEmail = process.env.TENANT_EMAIL;
  const tenantPassword = process.env.TENANT_PASSWORD;
  const landlordEmail = process.env.LANDLORD_EMAIL;
  const landlordPassword = process.env.LANDLORD_PASSWORD;

  if (tenantEmail && tenantPassword) {
    const tenantToken = await login(tenantEmail, tenantPassword);

    total += 1;
    if (await runStep('tenant NLP search', async () => {
      const { data, status } = await axios.post(
        `${BASE}/api/recommendations/search`,
        { query: 'דירת 3 חדרים בתל אביב עד 7000' },
        { headers: { Authorization: `Bearer ${tenantToken}` }, ...httpConfig }
      );
      if (status === 503) throw new Error('Gemini unavailable (503) — set GEMINI_API_KEY on backend');
      if (status !== 200) throw new Error(`unexpected status ${status}`);
      if (!Array.isArray(data.apartments)) throw new Error('missing apartments array');
    })) passed += 1;
  } else {
    console.log('⊘ tenant NLP search skipped (set TENANT_EMAIL / TENANT_PASSWORD)');
  }

  if (landlordEmail && landlordPassword) {
    const landlordToken = await login(landlordEmail, landlordPassword);

    total += 1;
    if (await runStep('landlord dashboard', async () => {
      const { data } = await axios.get(`${BASE}/api/landlord/dashboard`, {
        headers: { Authorization: `Bearer ${landlordToken}` },
        ...httpConfig,
      });
      if (!data.summary) throw new Error('missing dashboard summary');
    })) passed += 1;

    total += 1;
    if (await runStep('landlord ranked leads', async () => {
      const { data } = await axios.get(`${BASE}/api/landlord/leads?status=pending`, {
        headers: { Authorization: `Bearer ${landlordToken}` },
        ...httpConfig,
      });
      if (!Array.isArray(data.leads)) throw new Error('missing leads array');
    })) passed += 1;

    total += 1;
    if (await runStep('landlord marketing copy', async () => {
      const dash = await axios.get(`${BASE}/api/landlord/dashboard`, {
        headers: { Authorization: `Bearer ${landlordToken}` },
        ...httpConfig,
      });
      const aptId = dash.data.listings?.[0]?.id;
      if (!aptId) {
        console.log('  (no listings — skipping marketing copy body check)');
        return;
      }
      const { status, data } = await axios.post(
        `${BASE}/api/apartments/${aptId}/marketing-copy`,
        { style: 'professional' },
        { headers: { Authorization: `Bearer ${landlordToken}` }, ...httpConfig }
      );
      if (status === 503) throw new Error('Gemini unavailable (503) — set GEMINI_API_KEY on backend');
      if (status !== 200) throw new Error(`unexpected status ${status}`);
      if (!data.copy) throw new Error('missing copy field');
    })) passed += 1;
  } else {
    console.log('⊘ landlord flows skipped (set LANDLORD_EMAIL / LANDLORD_PASSWORD)');
  }

  console.log(`\nResult: ${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

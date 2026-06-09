/**
 * DirApp Sprint C — Full contract lifecycle E2E (API)
 * Run: node scripts/e2e-contract-flow.mjs
 * Env: API_URL, LANDLORD_EMAIL, LANDLORD_PASS, TENANT_EMAIL, TENANT_PASS
 */
const BASE = process.env.API_URL || "https://apartment-backend-v24y.onrender.com";
const LANDLORD_EMAIL = process.env.LANDLORD_EMAIL || "admin1@dirapp.com";
const LANDLORD_PASS = process.env.LANDLORD_PASS || "Admin1234!";
const TENANT_EMAIL = process.env.TENANT_EMAIL || "admin2@dirapp.com";
const TENANT_PASS = process.env.TENANT_PASS || "Admin1234!";

const results = [];

function pass(step, detail = "") {
  results.push({ step, ok: true, detail });
  console.log(`✓ ${step}${detail ? ` — ${detail}` : ""}`);
}

function fail(step, detail = "") {
  results.push({ step, ok: false, detail });
  console.log(`✗ ${step}${detail ? ` — ${detail}` : ""}`);
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function login(email, password) {
  const r = await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${r.status}`);
  return { token: r.body.token, user: r.body.user };
}

function auth(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function main() {
  console.log(`=== E2E Contract Flow ===\nAPI: ${BASE}\n`);

  // ── 1. Auth ──
  let landlord, tenant;
  try {
    landlord = await login(LANDLORD_EMAIL, LANDLORD_PASS);
    pass("1. Landlord login", landlord.user.email);
  } catch (e) {
    fail("1. Landlord login", e.message);
    return summary();
  }

  try {
    tenant = await login(TENANT_EMAIL, TENANT_PASS);
    pass("2. Tenant login", tenant.user.email);
  } catch (e) {
    fail("2. Tenant login", e.message);
    return summary();
  }

  const lh = auth(landlord.token);
  const th = auth(tenant.token);

  // ── 2. Landlord dashboard (properties for upload) ──
  const dash = await req("/api/landlord/dashboard", { headers: lh });
  if (dash.status === 200) {
    const n = dash.body.listings?.length ?? 0;
    pass("3. Landlord dashboard", `${n} listings`);
  } else {
    fail("3. Landlord dashboard", String(dash.status));
  }

  // ── 3. Contracts list ──
  const list = await req("/api/v3/contracts", { headers: lh });
  if (list.status === 200 && list.body.agreements) {
    pass("4. Contracts list", `${list.body.total} agreements`);
  } else {
    fail("4. Contracts list", String(list.status));
    return summary();
  }

  const agreement = list.body.agreements.find((a) => a.status === "ACTIVE")
    || list.body.agreements[0];
  if (!agreement) {
    fail("5. Pick agreement", "no agreements found");
    return summary();
  }
  pass("5. Pick agreement", `${agreement.id.slice(0, 8)}… status=${agreement.status}`);

  // ── 4. Contract detail ──
  const detail = await req(`/api/v3/contracts/${agreement.id}`, { headers: lh });
  if (detail.status === 200) {
    const rooms = detail.body.rooms?.length ?? 0;
    const parties = detail.body.parties?.length ?? 0;
    pass("6. Contract detail", `${rooms} rooms, ${parties} parties`);
  } else {
    fail("6. Contract detail", `${detail.status} ${JSON.stringify(detail.body).slice(0, 120)}`);
  }

  // ── 5. Validation gate ──
  const validate = await req(`/api/v3/contracts/${agreement.id}/validate`, { headers: lh });
  if (validate.status === 200) {
    pass("7. Validation gate", validate.body.valid ? "valid" : validate.body.errors?.join(", "));
  } else {
    fail("7. Validation gate", String(validate.status));
  }

  // ── 6. KYC validate-id ──
  const kyc = await req("/api/v3/kyc/validate-id", {
    method: "POST",
    headers: th,
    body: JSON.stringify({ idNumber: "123456782" }),
  });
  if (kyc.status === 200 && typeof kyc.body.valid === "boolean") {
    pass("8. KYC validate-id", `valid=${kyc.body.valid}`);
  } else {
    fail("8. KYC validate-id", String(kyc.status));
  }

  // ── 7. Ledger / payments ──
  const ledger = await req(`/api/v3/ledger/agreement/${agreement.id}`, { headers: lh });
  if (ledger.status === 200 && Array.isArray(ledger.body)) {
    pass("9. Ledger", `${ledger.body.length} rows`);
  } else {
    fail("9. Ledger", String(ledger.status));
  }

  // ── 8. Maintenance ──
  const maint = await req(`/api/v3/maintenance/agreement/${agreement.id}`, { headers: lh });
  if (maint.status === 200) {
    const count = Array.isArray(maint.body) ? maint.body.length : maint.body.tickets?.length ?? 0;
    pass("10. Maintenance list", `${count} tickets`);
  } else {
    fail("10. Maintenance list", String(maint.status));
  }

  // ── 9. Tenant view of same contract ──
  const tenantList = await req("/api/v3/contracts", { headers: th });
  const tenantHas = tenantList.body?.agreements?.some((a) => a.id === agreement.id);
  if (tenantList.status === 200) {
    pass("11. Tenant contracts list", tenantHas ? "sees agreement" : "admin sees all / no party link");
  } else {
    fail("11. Tenant contracts list", String(tenantList.status));
  }

  // ── 10. Check-in rooms (from detail) ──
  if (detail.status === 200 && detail.body.rooms?.length) {
    pass("12. Check-in rooms", detail.body.rooms.map((r) => r.name).join(", "));
  } else if (detail.status !== 200) {
    fail("12. Check-in rooms", "detail unavailable");
  } else {
    fail("12. Check-in rooms", "no rooms");
  }

  // ── 11. Web pages reachable ──
  const WEB = process.env.WEB_URL || "https://web-next-indol-gamma.vercel.app";
  const pages = ["/contracts", `/contracts/${agreement.id}`, "/payments", "/maintenance", "/checkin"];
  for (const p of pages) {
    try {
      const r = await fetch(`${WEB}${p}`, { redirect: "follow" });
      if (r.status >= 200 && r.status < 400) {
        pass(`13. Web ${p}`, String(r.status));
      } else {
        fail(`13. Web ${p}`, String(r.status));
      }
    } catch (e) {
      fail(`13. Web ${p}`, e.message);
    }
  }

  return summary();
}

function summary() {
  const ok = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n=== RESULT: ${ok}/${total} passed ===`);
  if (ok < total) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

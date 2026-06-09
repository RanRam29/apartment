const BASE = process.env.API_URL || "https://apartment-backend-v24y.onrender.com";
const EMAIL = "admin2@dirapp.com";
const PASS = "Admin1234!";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  return { status: res.status, body };
}

async function main() {
  const login = await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  console.log("LOGIN", login.status, login.body?.user?.role, login.body?.user?.activeRole, login.body?.user?.id);

  if (login.status !== 200) return;
  const h = { Authorization: `Bearer ${login.body.token}`, "Content-Type": "application/json" };

  const endpoints = [
    ["/api/v3/contracts", "GET"],
    ["/api/landlord/dashboard", "GET"],
    ["/api/apartments?mine=true", "GET"],
    ["/api/auth/me", "GET"],
    ["/api/users/me", "GET"],
    ["/api/profile", "GET"],
  ];

  for (const [path, method] of endpoints) {
    const r = await req(path, { method, headers: h });
    const summary = typeof r.body === "object"
      ? JSON.stringify(r.body).slice(0, 300)
      : r.body;
    console.log(`${method} ${path}:`, r.status, summary);
  }

  const contracts = await req("/api/v3/contracts", { headers: h });
  if (contracts.body?.agreements?.length) {
    const a = contracts.body.agreements[0];
    console.log("\nFIRST CONTRACT:", a.id, a.status, a.propertyId);
    const detail = await req(`/api/v3/contracts/${a.id}`, { headers: h });
    console.log("DETAIL status:", detail.status, JSON.stringify(detail.body).slice(0, 500));
    const ledger = await req(`/api/v3/ledger/agreement/${a.id}`, { headers: h });
    console.log("LEDGER v3:", ledger.status, Array.isArray(ledger.body) ? ledger.body.length + " rows" : ledger.body);
    const maint = await req(`/api/v3/maintenance?agreementId=${a.id}`, { headers: h });
    console.log("MAINTENANCE:", maint.status, JSON.stringify(maint.body).slice(0, 200));
    const validate = await req(`/api/v3/contracts/${a.id}/validate`, { headers: h });
    console.log("VALIDATE:", validate.status, validate.body);
  }
}

main().catch(console.error);

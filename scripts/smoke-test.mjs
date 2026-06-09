const BASE = process.env.API_URL || "https://apartment-backend-v24y.onrender.com";
const WEB = process.env.WEB_URL || "https://web-next-indol-gamma.vercel.app";
const EMAIL = "admin2@dirapp.com";
const PASS = "Admin1234!";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function main() {
  const results = [];

  const login = await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  results.push(["login", login.status, login.body.user?.email || login.body.error]);

  if (login.status !== 200) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  const token = login.body.token;
  const h = { Authorization: `Bearer ${token}` };

  for (const [name, path] of [
    ["health", "/health"],
    ["legacy_contracts", "/api/contracts"],
    ["v3_contracts_list", "/api/v3/contracts"],
    ["landlord_dashboard", "/api/landlord/dashboard"],
    ["profile", "/api/auth/me"],
  ]) {
    const r = await req(path, { headers: h });
    const summary = typeof r.body === "object"
      ? (r.body.total ?? r.body.agreements?.length ?? r.body.contracts?.length ?? r.body.user?.email ?? "ok")
      : String(r.body).slice(0, 40);
    results.push([name, r.status, summary]);
  }

  const pages = ["/", "/login", "/contracts", "/payments", "/profile"];
  for (const p of pages) {
    try {
      const r = await fetch(`${WEB}${p}`, { redirect: "follow" });
      results.push([`web${p}`, r.status, r.url]);
    } catch (e) {
      results.push([`web${p}`, 0, e.message]);
    }
  }

  console.log("=== SMOKE TEST ===");
  for (const [name, status, info] of results) {
    const ok = status >= 200 && status < 400;
    console.log(`${ok ? "✓" : "✗"} ${name}: ${status} — ${info}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

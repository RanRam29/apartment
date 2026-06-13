# Security Hardening: IDOR + Auth Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the critical IDOR vulnerabilities in the Contracts V3 and Ledger APIs, fix rate-limiting behind Render's proxy, make GDPR deletion actually execute, harden email-verification tokens, and fix three smaller security/correctness bugs (chat `imageUrl` XSS vector, frontend base64url JWT decode, duplicate route mounts).

**Architecture:** A new `agreementAccess` middleware centralizes "is this user a participant/landlord of this agreement" checks and is applied to every `/:id` route in `contractsV3.js` and `ledger.js`. Payment mutations get actor checks inside `ledgerService.js` so every entry point is covered. GDPR deletion moves from Redis (where it expired unprocessed) to a `deletion_requested_at` Postgres column processed by a new daily cron. Verification tokens are stored as SHA-256 hashes with an expiry column (legacy plaintext lookup kept as fallback for in-flight tokens).

**Tech Stack:** Node.js / Express 4, Sequelize (Postgres), Jest + supertest, node-cron, Next.js (web-next).

**Branch:** `fix/security-idor-hardening` off `main`.

**Prerequisites for running tests:** Backend tests hit a real Postgres (and optionally Redis) per the existing setup. From repo root: `docker-compose up -d` if services aren't running. All test commands below run from `C:\apartmentapp\backend`. The suite runs with `npm test` (jest `--runInBand`). To run one file: `npm test -- tests/<file>.test.js`.

**Conventions reminder (CLAUDE.md):** UUID PKs, Sequelize models in `backend/src/models/pg/`, auth via `const { authenticate, requireRole } = require('../middleware/auth')`, every schema change goes through the `ensure*Columns()` helpers in `database.js`.

---

### Task 0: Create branch

- [ ] **Step 1: Branch off main**

```bash
cd C:\apartmentapp
git checkout main
git pull
git checkout -b fix/security-idor-hardening
```

---

### Task 1: Agreement access middleware + protect `GET /api/v3/contracts/:id`

**Files:**
- Create: `backend/src/middleware/agreementAccess.js`
- Modify: `backend/src/routes/contractsV3.js` (route definitions)
- Test: `backend/tests/contractsV3-idor.test.js` (new file)

**Context for the implementer:** `RentalAgreement` has `landlordId` (UUID, the owner). Tenants are linked via `AgreementParty` rows (`agreementId`, `userId`, `role: 'tenant'`). Associations are defined in `backend/src/models/index.js` (`RentalAgreement.hasMany(AgreementParty, { as: 'parties' })`). `authenticate` puts `{ id, role, email, ... }` on `req.user`; `role` is `'admin'` for admins. Currently `GET /api/v3/contracts/:id` ([contractsV3.js:79](../../backend/src/routes/contractsV3.js)) returns ANY agreement to ANY authenticated user, including a presigned R2 URL to the contract document.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/contractsV3-idor.test.js`:

```js
process.env.JWT_SECRET = 'test_jwt_secret_for_idor_tests';
const request = require('supertest');
const app = require('../src/app');
const { User, RentalAgreement, AgreementParty } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');

// Mock R2 so presigned URLs don't require credentials
jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({ bucket: 'contract-docs', key: 'mock-key.pdf' }),
  getPresignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/mock-key.pdf'),
  BUCKETS: {
    CONTRACT_DOCS: 'contract-docs',
    CHECKIN_PHOTOS: 'checkin-photos',
    PAYMENT_RECEIPTS: 'payment-receipts',
  },
}));

async function registerUser(role, label) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await request(app).post('/api/auth/register').send({
    email,
    password: 'Password123!',
    firstName: label,
    lastName: 'User',
    role,
  });
  const user = await User.findOne({ where: { email } });
  await user.update({ isVerified: true, tosAcceptedAt: new Date() });
  return { token: res.body.token, user };
}

describe('Contracts V3 — IDOR protection', () => {
  let landlord, tenant, strangerTenant, strangerLandlord, agreement;

  beforeAll(async () => {
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    landlord = await registerUser('landlord', 'owner');
    tenant = await registerUser('tenant', 'party');
    strangerTenant = await registerUser('tenant', 'stranger-t');
    strangerLandlord = await registerUser('landlord', 'stranger-l');

    agreement = await RentalAgreement.create({
      propertyId: '00000000-0000-4000-8000-000000000003',
      landlordId: landlord.user.id,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      monthlyRentIls: 5000,
      paymentDueDay: 1,
      status: 'UPLOAD',
    });
    await AgreementParty.create({
      agreementId: agreement.id,
      userId: tenant.user.id,
      role: 'tenant',
    });
  });

  afterAll(async () => {
    await sequelize.close().catch(() => {});
  });

  describe('GET /api/v3/contracts/:id', () => {
    it('returns the agreement to its landlord', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}`)
        .set('Authorization', `Bearer ${landlord.token}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(agreement.id);
    });

    it('returns the agreement to a tenant party', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}`)
        .set('Authorization', `Bearer ${tenant.token}`);
      expect(res.status).toBe(200);
    });

    it('returns 404 (not 200, not 403) to an unrelated tenant', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 to an unrelated landlord', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`);
      expect(res.status).toBe(404);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/contractsV3-idor.test.js`
Expected: The two "404 to unrelated user" tests FAIL (they currently get 200). The landlord/tenant tests PASS.

- [ ] **Step 3: Create the middleware**

Create `backend/src/middleware/agreementAccess.js`:

```js
const { RentalAgreement, AgreementParty } = require('../models');

/**
 * Loads the agreement named by req.params[paramName] and verifies the
 * authenticated user is its landlord, one of its parties, or an admin.
 * Responds 404 (not 403) to outsiders so agreement existence is not leaked.
 * On success sets req.agreement and req.agreementAccess.
 * Must run AFTER authenticate.
 */
function loadAgreement(paramName = 'id') {
  return async (req, res, next) => {
    try {
      const agreement = await RentalAgreement.findByPk(req.params[paramName]);
      if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      const isAdmin = req.user.role === 'admin';
      const isLandlord = agreement.landlordId === req.user.id;
      let isParty = false;
      if (!isAdmin && !isLandlord) {
        isParty = !!(await AgreementParty.findOne({
          where: { agreementId: agreement.id, userId: req.user.id },
          attributes: ['id'],
        }));
      }

      if (!isAdmin && !isLandlord && !isParty) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      req.agreement = agreement;
      req.agreementAccess = { isAdmin, isLandlord, isParty };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Restricts a route to the agreement's landlord (or admin). Requires loadAgreement first. */
function requireAgreementLandlord(req, res, next) {
  if (req.agreementAccess?.isLandlord || req.agreementAccess?.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Only the agreement landlord may perform this action' });
}

module.exports = { loadAgreement, requireAgreementLandlord };
```

- [ ] **Step 4: Wire it onto `GET /:id`**

In `backend/src/routes/contractsV3.js`, add the import near the top (after the `authenticate` import on line 4):

```js
const { loadAgreement, requireAgreementLandlord } = require('../middleware/agreementAccess');
```

Change the route definition on line 79 from:

```js
router.get('/:id', async (req, res, next) => {
```

to:

```js
router.get('/:id', loadAgreement(), async (req, res, next) => {
```

(Leave the handler body unchanged — the re-fetch with includes is fine; the middleware is the gate.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/contractsV3-idor.test.js`
Expected: ALL tests PASS.

- [ ] **Step 6: Run the existing contracts suite to check for regressions**

Run: `npm test -- tests/contractsV3.test.js tests/amendments.test.js`
Expected: PASS (these tests act as landlord/tenant parties, never as strangers).

- [ ] **Step 7: Commit**

```bash
git add backend/src/middleware/agreementAccess.js backend/src/routes/contractsV3.js backend/tests/contractsV3-idor.test.js
git commit -m "fix(security): block IDOR on GET /api/v3/contracts/:id via agreement access middleware"
```

---

### Task 2: Protect the remaining contract lifecycle routes (fields, invite, validate, transition, sign, verify-ownership)

**Files:**
- Modify: `backend/src/routes/contractsV3.js`
- Test: `backend/tests/contractsV3-idor.test.js` (extend)

**Route → required access mapping** (all in `contractsV3.js`):

| Route | Line (pre-Task-1) | Middleware to add |
|---|---|---|
| `PATCH /:id/fields` | 111 | `loadAgreement(), requireAgreementLandlord` (replaces nothing — keep `requireRole('landlord')` too) |
| `POST /:id/invite-tenant` | 132 | `loadAgreement(), requireAgreementLandlord` |
| `GET /:id/validate` | 152 | `loadAgreement()` |
| `POST /:id/transition` | 162 | `loadAgreement(), requireAgreementLandlord` |
| `POST /:id/sign` | 174 | `loadAgreement()` |
| `POST /:id/verify-ownership` | 217 | `loadAgreement()` + must be a tenant party (check in handler) |

- [ ] **Step 1: Write the failing tests**

Append to the top-level `describe` block in `backend/tests/contractsV3-idor.test.js`:

```js
  describe('write routes', () => {
    it('blocks an unrelated landlord from PATCH /:id/fields', async () => {
      const res = await request(app)
        .patch(`/api/v3/contracts/${agreement.id}/fields`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`)
        .send({ monthlyRentIls: 9999 });
      expect(res.status).toBe(404);
      await agreement.reload();
      expect(Number(agreement.monthlyRentIls)).toBe(5000);
    });

    it('blocks an unrelated landlord from POST /:id/invite-tenant', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/invite-tenant`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`)
        .send({ tenantUserId: strangerLandlord.user.id });
      expect(res.status).toBe(404);
    });

    it('blocks a tenant party from POST /:id/transition (landlord-only)', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/transition`)
        .set('Authorization', `Bearer ${tenant.token}`)
        .send({ targetStatus: 'PENDING_SIGN' });
      expect(res.status).toBe(403);
    });

    it('blocks a stranger from POST /:id/transition', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/transition`)
        .set('Authorization', `Bearer ${strangerTenant.token}`)
        .send({ targetStatus: 'PENDING_SIGN' });
      expect(res.status).toBe(404);
    });

    it('blocks a stranger from GET /:id/validate', async () => {
      const res = await request(app)
        .get(`/api/v3/contracts/${agreement.id}/validate`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks a stranger from POST /:id/sign', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/sign`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks a non-party from POST /:id/verify-ownership', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/verify-ownership`)
        .set('Authorization', `Bearer ${strangerTenant.token}`)
        .send({ choice: 'verified' });
      expect(res.status).toBe(404);
    });

    it('still allows the landlord to verify-ownership? No — only tenant parties', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/verify-ownership`)
        .set('Authorization', `Bearer ${landlord.token}`)
        .send({ choice: 'verified' });
      expect(res.status).toBe(403);
    });

    it('allows the tenant party to verify-ownership', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/verify-ownership`)
        .set('Authorization', `Bearer ${tenant.token}`)
        .send({ choice: 'skipped' });
      expect(res.status).toBe(201);
    });
  });
```

- [ ] **Step 2: Run test to verify the new tests fail**

Run: `npm test -- tests/contractsV3-idor.test.js`
Expected: All new `write routes` tests FAIL except possibly the tenant-party success case.

- [ ] **Step 3: Apply middleware to each route**

In `backend/src/routes/contractsV3.js`, make these exact changes:

```js
// PATCH /:id/fields  (was: requireRole('landlord'))
router.patch('/:id/fields', requireRole('landlord'), loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
```

```js
// POST /:id/invite-tenant
router.post('/:id/invite-tenant', requireRole('landlord'), loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
```

```js
// GET /:id/validate
router.get('/:id/validate', loadAgreement(), async (req, res, next) => {
```

```js
// POST /:id/transition
router.post('/:id/transition', loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
```

```js
// POST /:id/sign
router.post('/:id/sign', loadAgreement(), async (req, res, next) => {
```

For `POST /:id/verify-ownership`, replace the whole handler signature and add a party check at the top:

```js
router.post('/:id/verify-ownership', loadAgreement(), async (req, res, next) => {
  try {
    // Only tenant parties record ownership verification (landlord verifying themselves is meaningless)
    if (!req.agreementAccess.isParty && !req.agreementAccess.isAdmin) {
      return res.status(403).json({ error: 'Only a tenant party may verify ownership' });
    }
    const { choice } = req.body; // 'verified' or 'skipped'
    if (!['verified', 'skipped'].includes(choice)) {
      return res.status(400).json({ error: 'choice must be "verified" or "skipped"' });
    }

    const record = await OwnershipVerification.create({
      agreementId: req.params.id,
      tenantId: req.user.id,
      choice,
    });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});
```

> Note on `/transition`: making it landlord-only is a behavior change — verify with `git grep -n "transition" backend/tests` that existing tests only call it as landlord (they do in `contractsV3.test.js`). If any legitimate tenant-driven transition exists in mobile flows, fall back to `loadAgreement()` only and document it; the stranger-404 test is the non-negotiable part.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/contractsV3-idor.test.js tests/contractsV3.test.js tests/amendments.test.js tests/stateMachine.test.js`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/contractsV3.js backend/tests/contractsV3-idor.test.js
git commit -m "fix(security): ownership checks on contract lifecycle routes (fields/invite/validate/transition/sign/verify-ownership)"
```

---

### Task 3: Protect check-in / check-out / renew routes

**Files:**
- Modify: `backend/src/routes/contractsV3.js`
- Test: `backend/tests/contractsV3-idor.test.js` (extend)

**Mapping:**

| Route | Middleware |
|---|---|
| `POST /:id/checkin/:roomId/photos` | `loadAgreement()` |
| `POST /:id/checkin/complete` | `loadAgreement(), requireAgreementLandlord` (keep `requireRole('landlord')`) |
| `POST /:id/checkout/:roomId/photos` | `loadAgreement()` |
| `POST /:id/checkout/review` | `loadAgreement(), requireAgreementLandlord` (keep `requireRole('landlord')`) |
| `POST /:id/checkout/complete` | `loadAgreement()` |
| `POST /:id/renew` | `loadAgreement(), requireAgreementLandlord` (keep `requireRole('landlord')`) |
| `POST /:id/amend/propose`, `/:id/amend/:aId/approve`, `/:id/amend/:aId/reject` | `loadAgreement()` (handlers already do landlord/tenant-party checks internally — middleware adds the outsider gate) |

- [ ] **Step 1: Write the failing tests** — append to `contractsV3-idor.test.js`:

```js
  describe('checkin/checkout/renew routes', () => {
    it('blocks a stranger from uploading checkin photos', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/checkin/00000000-0000-4000-8000-00000000aaaa/photos`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks an unrelated landlord from completing checkin', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/checkin/complete`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks a stranger from completing checkout', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/checkout/complete`)
        .set('Authorization', `Bearer ${strangerTenant.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks an unrelated landlord from renewing the contract', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/renew`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`);
      expect(res.status).toBe(404);
    });

    it('blocks a stranger from proposing an amendment', async () => {
      const res = await request(app)
        .post(`/api/v3/contracts/${agreement.id}/amend/propose`)
        .set('Authorization', `Bearer ${strangerTenant.token}`)
        .send({ field: 'monthlyRentIls', newValue: '1', reason: 'attack' });
      expect(res.status).toBe(404);
    });
  });
```

- [ ] **Step 2: Run to verify failures**

Run: `npm test -- tests/contractsV3-idor.test.js`
Expected: new tests FAIL (currently 422/404-for-other-reasons or 200 — assert they fail for the right reason: stranger gets past auth).

> If `checkin photos` already returns 404 because the room doesn't exist, that test passes vacuously — keep it anyway; the middleware makes the 404 happen *before* any DB writes/uploads.

- [ ] **Step 3: Apply middleware** — same pattern as Task 2, e.g.:

```js
router.post('/:id/checkin/:roomId/photos', loadAgreement(), upload.array('photos', 20), async (req, res, next) => {
```
```js
router.post('/:id/checkin/complete', requireRole('landlord'), loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
```
```js
router.post('/:id/checkout/:roomId/photos', loadAgreement(), upload.array('photos', 20), async (req, res, next) => {
```
```js
router.post('/:id/checkout/review', requireRole('landlord'), loadAgreement(), requireAgreementLandlord, async (req, res, next) => {
```
```js
router.post('/:id/checkout/complete', loadAgreement(), async (req, res, next) => {
```
```js
router.post('/:id/renew', requireRole('landlord'), loadAgreement(), requireAgreementLandlord, upload.single('contract'), async (req, res, next) => {
```
```js
router.post('/:id/amend/propose', loadAgreement(), async (req, res, next) => {
router.post('/:id/amend/:aId/approve', loadAgreement(), async (req, res, next) => {
router.post('/:id/amend/:aId/reject', loadAgreement(), async (req, res, next) => {
```

**Important:** `checkout/review` reads `roomId` from the body and never checked it belongs to this agreement. Add inside its handler, right after the room lookup:

```js
    if (!room || room.agreementId !== req.params.id) {
      return res.status(404).json({ error: 'Room not found' });
    }
```
(replacing the existing `if (!room) return res.status(404)...` line).

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/contractsV3-idor.test.js tests/checkin.test.js tests/checkout.test.js tests/contractsV3.test.js`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/contractsV3.js backend/tests/contractsV3-idor.test.js
git commit -m "fix(security): ownership checks on checkin/checkout/renew/amend contract routes"
```

---

### Task 4: Ledger service — actor authorization on report / confirm / reject

**Files:**
- Modify: `backend/src/services/ledgerService.js`
- Modify: `backend/src/routes/ledger.js` (pass `req.user` through)
- Test: `backend/tests/ledger-idor.test.js` (new file)

**Context:** `LedgerRow.belongsTo(RentalAgreement, { as: 'agreement' })` exists in `models/index.js:54`. Today `confirmPayment(id)` / `rejectPayment(id)` check nothing, and `reportPayment(id, tenantId, key)` receives the tenant ID **but never uses it**. Any landlord can mark any tenant's rent PAID; any user can report/wipe payments.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/ledger-idor.test.js`:

```js
process.env.JWT_SECRET = 'test_jwt_secret_for_ledger_idor';
const request = require('supertest');
const app = require('../src/app');
const { User, Apartment, RentalAgreement, AgreementParty, LedgerRow } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');

jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({}),
  getPresignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/x'),
  BUCKETS: { CONTRACT_DOCS: 'contract-docs', CHECKIN_PHOTOS: 'checkin-photos', PAYMENT_RECEIPTS: 'payment-receipts' },
}));

async function registerUser(role, label) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await request(app).post('/api/auth/register').send({
    email, password: 'Password123!', firstName: label, lastName: 'User', role,
  });
  const user = await User.findOne({ where: { email } });
  await user.update({ isVerified: true, tosAcceptedAt: new Date() });
  return { token: res.body.token, user };
}

describe('Ledger — IDOR protection', () => {
  let landlord, tenant, strangerTenant, strangerLandlord, agreement, row;

  beforeAll(async () => {
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    landlord = await registerUser('landlord', 'lg-owner');
    tenant = await registerUser('tenant', 'lg-party');
    strangerTenant = await registerUser('tenant', 'lg-stranger-t');
    strangerLandlord = await registerUser('landlord', 'lg-stranger-l');

    // NOTE: propertyId is a FK to apartments — a hardcoded UUID will throw
    // SequelizeForeignKeyConstraintError. Create a real apartment first.
    const apartment = await Apartment.create({
      landlordId: landlord.user.id,
      title: 'Ledger IDOR Test Apartment',
      price: 5000,
      rooms: 3,
      city: 'תל אביב',
    });

    agreement = await RentalAgreement.create({
      propertyId: apartment.id,
      landlordId: landlord.user.id,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      monthlyRentIls: 5000,
      paymentDueDay: 1,
      status: 'ACTIVE',
    });
    await AgreementParty.create({ agreementId: agreement.id, userId: tenant.user.id, role: 'tenant' });

    row = await LedgerRow.create({
      agreementId: agreement.id,
      period: 'יולי 2026',
      dueDate: '2026-07-01',
      amount: 5000,
      status: 'PENDING',
    });
  });

  afterAll(async () => {
    await sequelize.close().catch(() => {});
  });

  it('blocks a stranger from reading the agreement ledger', async () => {
    const res = await request(app)
      .get(`/api/v3/ledger/agreement/${agreement.id}`)
      .set('Authorization', `Bearer ${strangerTenant.token}`);
    expect(res.status).toBe(404);
  });

  it('allows the tenant party to read the ledger', async () => {
    const res = await request(app)
      .get(`/api/v3/ledger/agreement/${agreement.id}`)
      .set('Authorization', `Bearer ${tenant.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('blocks a stranger tenant from reporting a payment on someone else\'s row', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${row.id}/report`)
      .set('Authorization', `Bearer ${strangerTenant.token}`);
    expect(res.status).toBe(404);
    await row.reload();
    expect(row.status).toBe('PENDING');
  });

  it('allows the tenant party to report a payment', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${row.id}/report`)
      .set('Authorization', `Bearer ${tenant.token}`);
    expect(res.status).toBe(200);
    await row.reload();
    expect(row.status).toBe('REPORTED');
  });

  it('blocks an unrelated landlord from confirming the payment', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${row.id}/confirm`)
      .set('Authorization', `Bearer ${strangerLandlord.token}`);
    expect(res.status).toBe(404);
    await row.reload();
    expect(row.status).toBe('REPORTED');
  });

  it('blocks an unrelated landlord from rejecting the payment', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${row.id}/reject`)
      .set('Authorization', `Bearer ${strangerLandlord.token}`);
    expect(res.status).toBe(404);
    await row.reload();
    expect(row.status).toBe('REPORTED');
  });

  it('allows the agreement landlord to confirm the payment', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${row.id}/confirm`)
      .set('Authorization', `Bearer ${landlord.token}`);
    expect(res.status).toBe(200);
    await row.reload();
    expect(row.status).toBe('PAID');
  });
});
```

- [ ] **Step 2: Run to verify failures**

Run: `npm test -- tests/ledger-idor.test.js`
Expected: all "blocks ..." tests FAIL (strangers currently succeed).

- [ ] **Step 3: Implement service-level checks**

Replace `reportPayment`, `confirmPayment`, `rejectPayment` in `backend/src/services/ledgerService.js`:

```js
const { LedgerRow, RentalAgreement, AgreementParty } = require('../models');
```
(update the existing import on line 1), then:

```js
/** Throws 404 unless actor is the agreement's landlord (or admin). Returns the row. */
async function loadRowForLandlord(ledgerRowId, actor) {
  const row = await LedgerRow.findByPk(ledgerRowId, {
    include: [{ model: RentalAgreement, as: 'agreement', attributes: ['id', 'landlordId'] }],
  });
  if (!row) throw Object.assign(new Error('Ledger row not found'), { status: 404 });
  if (actor.role !== 'admin' && row.agreement.landlordId !== actor.id) {
    // 404, not 403 — don't leak row existence
    throw Object.assign(new Error('Ledger row not found'), { status: 404 });
  }
  return row;
}

async function reportPayment(ledgerRowId, actor, receiptR2Key) {
  const row = await LedgerRow.findByPk(ledgerRowId);
  if (!row) throw Object.assign(new Error('Ledger row not found'), { status: 404 });

  if (actor.role !== 'admin') {
    const party = await AgreementParty.findOne({
      where: { agreementId: row.agreementId, userId: actor.id },
      attributes: ['id'],
    });
    if (!party) throw Object.assign(new Error('Ledger row not found'), { status: 404 });
  }

  if (row.status === 'PAID') throw Object.assign(new Error('Already paid'), { status: 422 });

  await row.update({
    status: 'REPORTED',
    reportedByTenant: new Date(),
    receiptR2Key: receiptR2Key || null,
  });
  return row;
}

async function confirmPayment(ledgerRowId, actor) {
  const row = await loadRowForLandlord(ledgerRowId, actor);
  await row.update({
    status: 'PAID',
    confirmedByLandlord: new Date(),
  });
  return row;
}

async function rejectPayment(ledgerRowId, actor) {
  const row = await loadRowForLandlord(ledgerRowId, actor);
  await row.update({
    status: 'PENDING',
    reportedByTenant: null,
    receiptR2Key: null,
  });
  return row;
}
```

- [ ] **Step 4: Update the routes to pass the actor and gate the GET**

In `backend/src/routes/ledger.js`:

Add import:
```js
const { loadAgreement } = require('../middleware/agreementAccess');
```

Gate the read route:
```js
// Get ledger for an agreement — participants only
router.get('/agreement/:agreementId', loadAgreement('agreementId'), async (req, res, next) => {
```
(handler body unchanged)

Pass `req.user` in the three mutation routes:
```js
const row = await reportPayment(req.params.id, req.user, receiptKey);
```
```js
const row = await confirmPayment(req.params.id, req.user);
```
```js
const row = await rejectPayment(req.params.id, req.user);
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/ledger-idor.test.js tests/ledger.test.js tests/payments.test.js tests/cronJobs.test.js`
Expected: ALL PASS. (`autoConfirmStalePayments` is unchanged — it updates rows directly, not via `confirmPayment`.)

> If `tests/payments.test.js` or any other existing test calls `confirmPayment(id)` directly without an actor, update those call sites to pass `{ id: landlordUser.id, role: 'landlord' }` — the new signature is intentional.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/ledgerService.js backend/src/routes/ledger.js backend/tests/ledger-idor.test.js
git commit -m "fix(security): actor authorization on ledger read/report/confirm/reject"
```

---

### Task 5: Ledger generation — ownership + idempotency

**Files:**
- Modify: `backend/src/routes/ledger.js`
- Modify: `backend/src/services/ledgerService.js` (`generateLedger`)
- Test: `backend/tests/ledger-idor.test.js` (extend)

**Context:** `POST /generate/:agreementId` is `requireRole('landlord')` only — any landlord can generate rows for any agreement, and calling it twice duplicates every row. `generateLedger` is *also* called from the contract sign flow ([contractsV3.js:206](../../backend/src/routes/contractsV3.js)) where the actor may be the tenant signing last — so the ownership check belongs in the **route**, while idempotency belongs in the **service** (protects both call sites).

- [ ] **Step 1: Write the failing tests** — append to `ledger-idor.test.js`:

```js
  describe('POST /generate/:agreementId', () => {
    it('blocks an unrelated landlord from generating a ledger', async () => {
      const res = await request(app)
        .post(`/api/v3/ledger/generate/${agreement.id}`)
        .set('Authorization', `Bearer ${strangerLandlord.token}`);
      expect(res.status).toBe(404);
    });

    it('is idempotent — second generate call creates no duplicate rows', async () => {
      // beforeAll created 1 row manually; generate fills the rest only once
      const first = await request(app)
        .post(`/api/v3/ledger/generate/${agreement.id}`)
        .set('Authorization', `Bearer ${landlord.token}`);
      expect(first.status).toBe(201);

      const countAfterFirst = await LedgerRow.count({ where: { agreementId: agreement.id } });

      const second = await request(app)
        .post(`/api/v3/ledger/generate/${agreement.id}`)
        .set('Authorization', `Bearer ${landlord.token}`);
      expect(second.status).toBe(201);
      expect(second.body.generated).toBe(0);

      const countAfterSecond = await LedgerRow.count({ where: { agreementId: agreement.id } });
      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });
```

- [ ] **Step 2: Run to verify failures**

Run: `npm test -- tests/ledger-idor.test.js`
Expected: both new tests FAIL.

- [ ] **Step 3: Implement**

In `backend/src/services/ledgerService.js`, add at the top of `generateLedger` (after the agreement lookup):

```js
async function generateLedger(agreementId) {
  const agreement = await RentalAgreement.findByPk(agreementId);
  if (!agreement) throw new Error('Agreement not found');

  // Idempotency: ledger is generated exactly once per agreement
  const existingCount = await LedgerRow.count({ where: { agreementId } });
  if (existingCount > 0) return [];
  // ... rest unchanged
```

In `backend/src/routes/ledger.js`, change the generate route:

```js
const { loadAgreement, requireAgreementLandlord } = require('../middleware/agreementAccess');
```
(extend the Task 4 import) and:

```js
// Generate ledger (called when contract becomes ACTIVE) — agreement landlord only
router.post('/generate/:agreementId', requireRole('landlord'), loadAgreement('agreementId'), requireAgreementLandlord, async (req, res, next) => {
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/ledger-idor.test.js tests/ledger.test.js tests/contractsV3.test.js`
Expected: ALL PASS. (Note the idempotency test reuses the agreement that already has rows from Task 4 — `generated` is `0` on the second call by design; if the first call also returns 0 because Task 4's row already exists, that's fine: assert only that the counts are equal and `second.body.generated === 0`.)

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/ledgerService.js backend/src/routes/ledger.js backend/tests/ledger-idor.test.js
git commit -m "fix(security): ledger generation requires agreement ownership and is idempotent"
```

---

### Task 6: `trust proxy` + per-IP auth rate limit

**Files:**
- Modify: `backend/src/app.js`
- Test: `backend/tests/security-config.test.js` (extend — file already exists)

**Context:** The app runs behind Render's proxy but never sets `trust proxy`, so `req.ip` is the proxy address: every user shares one global rate-limit bucket (one hostile client can lock out production), and per-IP brute-force keys are meaningless. Separately, the auth limiter key `ip:path:email` gives each *email* its own 10/min budget — one IP can spray thousands of accounts.

- [ ] **Step 1: Write the failing test** — append to `backend/tests/security-config.test.js`:

```js
describe('proxy and rate-limit configuration', () => {
  const app = require('../src/app');

  it('trusts exactly one proxy hop (Render)', () => {
    // express stores the setting; 1 = trust first X-Forwarded-For hop
    expect(app.get('trust proxy')).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/security-config.test.js`
Expected: FAIL — `app.get('trust proxy')` is `undefined`.

- [ ] **Step 3: Implement**

In `backend/src/app.js`, immediately after `const app = express();` (line 34):

```js
const app = express();
// Render terminates TLS one hop in front of the app; without this, req.ip is
// the proxy address and every client shares a single rate-limit bucket.
app.set('trust proxy', 1);
```

Then add a pure-IP limiter for auth endpoints (place next to the existing `authLimiter` definition, ~line 87):

```js
// Per-IP ceiling across ALL auth requests regardless of email — blocks
// credential-spraying that rotates emails to dodge the per-email limiter.
const authIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
  handler: (req, res) => {
    logSystemEvent({
      source: 'rate-limit',
      category: SYSTEM_CATEGORY.SECURITY,
      severity: SYSTEM_SEVERITY.WARN,
      event: 'rate_limit.auth_ip',
      message: 'Auth per-IP rate limit exceeded',
      requestId: req.requestContext?.requestId,
      metadata: { ip: req.ip, path: req.path },
    });
    res.status(429).json({ error: 'Too many auth attempts, please try again later' });
  },
});
```

And mount it in front of the existing limiter (lines 145-146):

```js
app.use('/api/auth', authIpLimiter, authLimiter, authRoutes);
app.use('/api/auth', authIpLimiter, authLimiter, verifyRoutes);
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/security-config.test.js tests/verification-rate-limit.test.js tests/auth.test.js`
Expected: ALL PASS. If `auth.test.js` trips the new 30/min IP limit (it registers many users from one supertest "IP"), raise `max` to `60` for the limiter OR add `skip: () => process.env.NODE_ENV === 'test'` is **not** acceptable (that disables the protection under test) — prefer raising `max`, and note the value in the commit message.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app.js backend/tests/security-config.test.js
git commit -m "fix(security): enable trust proxy and add per-IP auth rate limit"
```

---

### Task 7: GDPR deletion — persist request + daily anonymization cron

**Files:**
- Modify: `backend/src/config/database.js` (`USER_V3_COLUMNS`)
- Modify: `backend/src/models/pg/User.js`
- Modify: `backend/src/routes/auth.js` (`POST /request-deletion`)
- Modify: `backend/src/app.js` (the `/api/users/me/request-deletion` stub)
- Create: `backend/src/cron/accountDeletion.js`
- Modify: `backend/src/server.js` (schedule the cron)
- Test: `backend/tests/accountDeletion.test.js` (new file)

**Context:** Today the deletion request lives only in Redis with a 30-day TTL — it expires exactly when it's due, and no cron processes it. The user is promised deletion within 30 days; nothing ever deletes anything. Fix: a `deletion_requested_at` column + a daily cron that anonymizes accounts past the grace period.

- [ ] **Step 1: Add the column (schema change → `ensureUserVerificationColumns` per CLAUDE.md)**

In `backend/src/config/database.js`, add to `USER_V3_COLUMNS` (line 37):

```js
  deletion_requested_at: { type: DataTypes.DATE, allowNull: true },
```

In `backend/src/models/pg/User.js`, add after the `bio` field (line 99-101):

```js
  deletionRequestedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
```

- [ ] **Step 2: Write the failing test**

Create `backend/tests/accountDeletion.test.js`:

```js
process.env.JWT_SECRET = 'test_jwt_secret_for_deletion_tests';
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { User } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');
const { runAccountDeletion } = require('../src/cron/accountDeletion');

describe('GDPR account deletion', () => {
  let token, user;

  beforeAll(async () => {
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    const email = `delete-me-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      email, password: 'Password123!', firstName: 'Soon', lastName: 'Gone', role: 'tenant',
    });
    token = res.body.token;
    user = await User.findOne({ where: { email } });
    await user.update({ isVerified: true });
  });

  afterAll(async () => {
    await sequelize.close().catch(() => {});
  });

  it('POST /api/auth/request-deletion persists deletionRequestedAt in Postgres', async () => {
    const res = await request(app)
      .post('/api/auth/request-deletion')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    await user.reload();
    expect(user.deletionRequestedAt).not.toBeNull();
  });

  it('cron does NOT anonymize accounts inside the 30-day grace period', async () => {
    await runAccountDeletion();
    await user.reload();
    expect(user.email).not.toMatch(/^deleted-/);
  });

  it('cron anonymizes accounts past the 30-day grace period', async () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await user.update({ deletionRequestedAt: thirtyOneDaysAgo });

    const processed = await runAccountDeletion();
    expect(processed).toBeGreaterThanOrEqual(1);

    await user.reload();
    expect(user.email).toBe(`deleted-${user.id}@deleted.dirapp.local`);
    expect(user.firstName).toBe('משתמש');
    expect(user.phone).toBeNull();
    expect(user.isLocked).toBe(true);
    // password is replaced with a non-bcrypt random string — login impossible
    const stillValid = await bcrypt.compare('Password123!', user.passwordHash).catch(() => false);
    expect(stillValid).toBe(false);
  });

  it('cron is idempotent — does not reprocess anonymized accounts', async () => {
    const before = user.passwordHash;
    await runAccountDeletion();
    await user.reload();
    expect(user.passwordHash).toBe(before);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- tests/accountDeletion.test.js`
Expected: FAIL — `Cannot find module '../src/cron/accountDeletion'`, and `deletionRequestedAt` is null after the request.

- [ ] **Step 4: Implement the cron**

Create `backend/src/cron/accountDeletion.js`:

```js
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User } = require('../models');
const logger = require('../utils/logger');
const { logAudit } = require('../services/auditLogService');
const { AUDIT_OUTCOMES } = require('../constants/logging');

const GRACE_PERIOD_DAYS = 30;

/**
 * Anonymizes accounts whose GDPR deletion request passed the grace period.
 * Anonymized accounts keep their UUID (FK integrity for agreements/ledger —
 * legally retained financial records) but lose all personal data and can
 * never log in again. Returns the number of accounts processed.
 */
async function runAccountDeletion() {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const users = await User.findAll({
    where: {
      deletionRequestedAt: { [Op.lt]: cutoff },
      email: { [Op.notLike]: 'deleted-%' },
    },
  });

  for (const user of users) {
    await user.update({
      email: `deleted-${user.id}@deleted.dirapp.local`,
      firstName: 'משתמש',
      lastName: 'שנמחק',
      phone: null,
      avatarUrl: null,
      bio: null,
      // Random non-bcrypt string: bcrypt.compare always fails, login impossible
      passwordHash: crypto.randomBytes(32).toString('hex'),
      verificationToken: null,
      isLocked: true,
      whatsappOptIn: false,
    });
    await logAudit({
      actorId: null,
      actorRole: 'system',
      action: 'GDPR_DELETION_EXECUTED',
      resourceType: 'user',
      resourceId: user.id,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      statusCode: 200,
    });
    logger.info(`GDPR deletion executed for user ${user.id}`);
  }

  return users.length;
}

module.exports = { runAccountDeletion, GRACE_PERIOD_DAYS };
```

- [ ] **Step 5: Persist the request in both endpoints**

In `backend/src/routes/auth.js`, inside `POST /request-deletion` (line ~618), right after the user lookup, add the DB write (keep the existing Redis write and audit log):

```js
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Persist in Postgres — Redis copy is informational only (it expires)
    if (!user.deletionRequestedAt) {
      await user.update({ deletionRequestedAt: new Date() });
    }
```

In `backend/src/app.js`, replace the stub (line ~247):

```js
app.post('/api/users/me/request-deletion', userAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.deletionRequestedAt) {
      await user.update({ deletionRequestedAt: new Date() });
    }
    res.json({ ok: true, message: 'בקשת מחיקת החשבון התקבלה בהצלחה ותטופל תוך 30 יום.' });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 6: Schedule the cron**

In `backend/src/server.js`, add to the cron requires block (after line 100):

```js
    const { runAccountDeletion } = require('./cron/accountDeletion');
```

and inside the `if (process.env.NODE_ENV !== 'test')` block:

```js
      cron.schedule('0 2 * * *', runAccountDeletion);     // Daily 02:00 — GDPR anonymization
```

- [ ] **Step 7: Run tests**

Run: `npm test -- tests/accountDeletion.test.js tests/auth.test.js tests/database-schema.test.js`
Expected: ALL PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/config/database.js backend/src/models/pg/User.js backend/src/routes/auth.js backend/src/app.js backend/src/cron/accountDeletion.js backend/src/server.js backend/tests/accountDeletion.test.js
git commit -m "fix(gdpr): persist deletion requests in Postgres and execute via daily anonymization cron"
```

---

### Task 8: Email verification tokens — hash at rest + 24h expiry

**Files:**
- Modify: `backend/src/config/database.js` (`USER_V3_COLUMNS`)
- Modify: `backend/src/models/pg/User.js`
- Modify: `backend/src/routes/auth.js`
- Test: `backend/tests/auth.test.js` (extend) — existing verification tests must keep passing

**Context:** The DB-path verification token (`User.verificationToken`) is stored in plaintext and **never expires** — the Redis copy has a 24h TTL but the DB fallback matches forever. Fix: store SHA-256 hash + `verification_token_expires_at`; keep a legacy plaintext lookup so in-flight production tokens still verify during the transition.

- [ ] **Step 1: Add the column**

`backend/src/config/database.js`, `USER_V3_COLUMNS`:

```js
  verification_token_expires_at: { type: DataTypes.DATE, allowNull: true },
```

`backend/src/models/pg/User.js`, after `verifiedAt` (line 53-56):

```js
  verificationTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
```

- [ ] **Step 2: Write the failing test** — append to `backend/tests/auth.test.js` (it already registers users and exposes `verificationToken` in test mode via the register payload):

```js
describe('verification token hardening', () => {
  const crypto = require('crypto');
  const { User } = require('../src/models');

  it('stores only a hash of the verification token in the database', async () => {
    const email = `hashcheck-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      email, password: 'Password123!', firstName: 'Hash', lastName: 'Check', role: 'tenant',
    });
    const rawToken = res.body.verificationToken; // exposed in NODE_ENV=test only
    expect(rawToken).toBeDefined();

    const user = await User.findOne({ where: { email } });
    expect(user.verificationToken).not.toBe(rawToken);
    expect(user.verificationToken).toBe(
      crypto.createHash('sha256').update(rawToken).digest('hex')
    );
    expect(user.verificationTokenExpiresAt).not.toBeNull();
  });

  it('rejects an expired verification token', async () => {
    const email = `expired-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      email, password: 'Password123!', firstName: 'Exp', lastName: 'Ired', role: 'tenant',
    });
    const rawToken = res.body.verificationToken;

    const user = await User.findOne({ where: { email } });
    await user.update({ verificationTokenExpiresAt: new Date(Date.now() - 60 * 1000) });

    const verifyRes = await request(app).get(`/api/auth/verify/${rawToken}`);
    expect(verifyRes.status).toBe(400);

    await user.reload();
    expect(user.isVerified).toBe(false);
  });

  it('verifies with a fresh token and clears token + expiry', async () => {
    const email = `fresh-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      email, password: 'Password123!', firstName: 'Fresh', lastName: 'Token', role: 'tenant',
    });
    const rawToken = res.body.verificationToken;

    const verifyRes = await request(app).get(`/api/auth/verify/${rawToken}`);
    expect(verifyRes.status).toBe(200);

    const user = await User.findOne({ where: { email } });
    expect(user.isVerified).toBe(true);
    expect(user.verificationToken).toBeNull();
    expect(user.verificationTokenExpiresAt).toBeNull();
  });
});
```

> If `auth.test.js` doesn't already import `request`/`app` at top level in a way these tests can reuse, put the block in a new file `backend/tests/verification-token-hardening.test.js` with the same header boilerplate as `accountDeletion.test.js` (set `JWT_SECRET`, require supertest/app/models, `sequelize.sync` in `beforeAll`).

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- tests/auth.test.js`
Expected: new tests FAIL (token stored raw, no expiry column populated).

- [ ] **Step 4: Implement in `backend/src/routes/auth.js`**

Add a helper near `issueVerificationTokenForUser` (line 18):

```js
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashVerificationToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
```

Replace `issueVerificationTokenForUser` so it persists hash + expiry itself:

```js
async function issueVerificationTokenForUser(user) {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationCacheKey = `email:verify:${verificationToken}`;
  await safeCacheSet(verificationCacheKey, { userId: user.id }, 24 * 60 * 60);

  try {
    await user.update({
      verificationToken: hashVerificationToken(verificationToken),
      verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      verifiedAt: null,
    });
  } catch (err) {
    logger.warn(`Failed to persist verification token for user ${user.id}: ${err.message}`);
  }

  const appBaseUrl =
    process.env.APP_BASE_URL ||
    process.env.CLIENT_ORIGIN ||
    'http://localhost:3000';
  const cleanBase = String(appBaseUrl).replace(/\/$/, '');
  const verificationUrl = `${cleanBase}/verify-email?token=${verificationToken}`;

  try {
    await sendVerificationEmail({ to: user.email, verificationUrl });
  } catch (err) {
    logger.warn(`Verification email failed for ${user.id}: ${err.message}`);
  }

  return verificationToken;
}
```

Then **remove the now-redundant `user.update({ verificationToken, verifiedAt: null })` calls** at the three call sites (register ~line 109, `/verify/resend` ~line 328, `/resend-verification` ~line 354) — `issueVerificationTokenForUser` persists for them now.

Update `GET /verify/:token` (line 266): replace the DB lookup block with:

```js
    // DB lookup: hashed token (new) with legacy plaintext fallback for in-flight tokens
    const tokenHash = hashVerificationToken(token);
    const userByToken =
      (await User.findOne({ where: { verificationToken: tokenHash } })) ||
      (await User.findOne({ where: { verificationToken: token } }));
    if (userByToken) {
      if (
        userByToken.verificationTokenExpiresAt &&
        userByToken.verificationTokenExpiresAt < new Date()
      ) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }
      await userByToken.update({
        isVerified: true,
        verifiedAt: new Date(),
        verificationToken: null,
        verificationTokenExpiresAt: null,
      });
      // ... existing cacheDel + logAudit + res.json unchanged
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/auth.test.js tests/verification-rate-limit.test.js tests/journeys.test.js`
Expected: ALL PASS. The existing verify-flow tests pass because the raw token still travels in the URL/response; only storage changed.

- [ ] **Step 6: Commit**

```bash
git add backend/src/config/database.js backend/src/models/pg/User.js backend/src/routes/auth.js backend/tests/
git commit -m "fix(security): hash email verification tokens at rest and enforce 24h expiry"
```

---

### Task 9: Validate chat `imageUrl` (REST + socket) and enforce content length on socket path

**Files:**
- Create: `backend/src/utils/safeUrl.js`
- Modify: `backend/src/routes/chat.js`
- Modify: `backend/src/config/socket.js`
- Test: `backend/tests/chat.test.js` (extend)

**Context:** `imageUrl` is persisted and broadcast verbatim ([chat.js:79-93](../../backend/src/routes/chat.js), [socket.js:175-199](../../backend/src/config/socket.js)). A `javascript:` URL is a stored-XSS vector in any client that renders it. The socket path also skips the 2000-char content limit the REST path enforces.

- [ ] **Step 1: Write the failing test** — append to `backend/tests/chat.test.js` (reuse its existing match/user fixtures; if its setup doesn't expose a token+matchId pair for reuse, create them in a nested `beforeAll` following the file's existing pattern):

```js
describe('imageUrl validation', () => {
  it('rejects a javascript: imageUrl', async () => {
    const res = await request(app)
      .post(`/api/chat/${matchId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ content: 'look', type: 'image', imageUrl: 'javascript:alert(1)' });
    expect(res.status).toBe(422);
  });

  it('rejects an http: (non-TLS) imageUrl', async () => {
    const res = await request(app)
      .post(`/api/chat/${matchId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ content: 'look', type: 'image', imageUrl: 'http://evil.example.com/x.jpg' });
    expect(res.status).toBe(422);
  });

  it('accepts an https imageUrl', async () => {
    const res = await request(app)
      .post(`/api/chat/${matchId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ content: 'look', type: 'image', imageUrl: 'https://res.cloudinary.com/demo/x.jpg' });
    expect(res.status).toBe(201);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/chat.test.js`
Expected: the two reject tests FAIL (currently 201).

- [ ] **Step 3: Implement**

Create `backend/src/utils/safeUrl.js`:

```js
/** Accepts only https URLs of sane length — blocks javascript:, data:, http:. */
function isSafeImageUrl(url) {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { isSafeImageUrl };
```

In `backend/src/routes/chat.js`, import it and add the check in `POST /:matchId` right after the content validation (line ~86):

```js
const { isSafeImageUrl } = require('../utils/safeUrl');
```
```js
      if (imageUrl !== undefined && imageUrl !== null && !isSafeImageUrl(imageUrl)) {
        return res.status(422).json({ error: 'imageUrl must be a valid https URL' });
      }
```

In `backend/src/config/socket.js`, in the `send_message` handler after the `matchId/content` presence check (line ~177-179):

```js
const { isSafeImageUrl } = require('../utils/safeUrl');
```
(top of file) and:

```js
        if (content.trim().length > 2000) {
          return ack?.({ error: 'Message must be 1-2000 chars' });
        }
        if (imageUrl !== undefined && imageUrl !== null && !isSafeImageUrl(imageUrl)) {
          return ack?.({ error: 'imageUrl must be a valid https URL' });
        }
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/chat.test.js tests/socket.test.js`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/safeUrl.js backend/src/routes/chat.js backend/src/config/socket.js backend/tests/chat.test.js
git commit -m "fix(security): validate chat imageUrl (https only) and enforce content length on socket path"
```

---

### Task 10: Fix base64url JWT decode in web-next

**Files:**
- Modify: `web-next/lib/auth.ts`

**Context:** `decodeToken` uses `atob(payload)` directly, but JWT segments are base64**url** (`-`/`_`, no padding). Tokens whose payload contains those characters fail to decode → treated as expired → user randomly logged out. `web-next` has no test runner configured, so verification is a one-off node script.

- [ ] **Step 1: Write a verification script (acts as the failing test)**

Create `web-next/scripts/check-decode.mjs` (temporary, deleted after verification — or keep it; it's harmless):

```js
// Verifies decodeToken handles base64url payloads.
// A payload crafted so its base64url form contains '-' and '_':
const payload = { id: 'x', email: 'a@b.c', role: 'tenant', sub: '???>>>~~~' };
const json = JSON.stringify(payload);
const b64url = Buffer.from(json).toString('base64url');
console.log('payload b64url:', b64url, 'contains - or _:', /[-_]/.test(b64url));

const token = `header.${b64url}.sig`;

// Inline copy of the FIXED implementation to verify before porting:
function base64UrlDecode(input) {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8'); // atob equivalent in node
}
const decoded = JSON.parse(base64UrlDecode(token.split('.')[1]));
console.log('decoded ok:', decoded.sub === payload.sub);

// Demonstrate the OLD implementation fails:
try {
  JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  // node's Buffer is lenient; in the browser atob() throws on '-'/'_'
  console.log('NOTE: node Buffer is lenient — browser atob() throws InvalidCharacterError here');
} catch (e) {
  console.log('old impl fails as expected:', e.message);
}
```

Run: `node web-next/scripts/check-decode.mjs`
Expected: `decoded ok: true`.

- [ ] **Step 2: Apply the fix**

In `web-next/lib/auth.ts`, replace `decodeToken`:

```ts
function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
  return atob(padded);
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Lint/type-check**

Run (from `C:\apartmentapp\web-next`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add web-next/lib/auth.ts web-next/scripts/check-decode.mjs
git commit -m "fix(web): decode JWT payloads as base64url - prevents spurious logouts"
```

---

### Task 11: Remove duplicate route mounts in app.js

**Files:**
- Modify: `backend/src/app.js`

**Context:** `/api/v3/ledger` and `/api/v3/admin` are mounted twice (lines 176-177 in the CASCADE block AND lines 185-188 in the "Cursor Agent" block). Every request traverses both stacks; a future router-level middleware would run twice.

- [ ] **Step 1: Delete the duplicate block**

In `backend/src/app.js`, delete these lines (184-188):

```js
// v3 routes (Cursor Agent: Financial + Admin)
const ledgerRoutes = require('./routes/ledger');
const adminRoutes = require('./routes/admin');
app.use('/api/v3/ledger', ledgerRoutes);
app.use('/api/v3/admin', adminRoutes);
```

(The first mounts at lines 176-177 remain.)

- [ ] **Step 2: Run the affected suites**

Run: `npm test -- tests/ledger.test.js tests/ledger-idor.test.js tests/admin.test.js tests/adminUsersV3.test.js tests/adminE2E.test.js`
Expected: ALL PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.js
git commit -m "chore: remove duplicate /api/v3/ledger and /api/v3/admin route mounts"
```

---

### Task 12: Full regression run + docs update + merge prep

**Files:**
- Modify: `BUGS.md`, `MASTER.md` (per CLAUDE.md rule 4)

- [ ] **Step 1: Full backend suite**

Run (from `C:\apartmentapp\backend`): `npm test`
Expected: ALL PASS. Fix any stragglers before proceeding (most likely candidates: tests that exercised the old unauthorized behavior, or call `confirmPayment`/`rejectPayment`/`reportPayment` with the old signatures).

- [ ] **Step 2: Update BUGS.md**

Add a dated section recording the five vulnerabilities found in the 2026-06-11 security review and their resolution (IDOR contracts V3, IDOR ledger, trust proxy/rate-limit, GDPR deletion never executed, verification token plaintext/no-expiry, chat imageUrl XSS vector, web JWT base64url decode), each marked **FIXED** with the commit shas (`git log --oneline main..HEAD`).

- [ ] **Step 3: Update MASTER.md**

Update the status section: security review completed 2026-06-11, all findings fixed on branch `fix/security-idor-hardening`.

- [ ] **Step 4: Commit docs**

```bash
git add BUGS.md MASTER.md
git commit -m "docs: record 2026-06-11 security review findings and fixes"
```

- [ ] **Step 5: Merge**

Per CLAUDE.md, merge to `main` is the Orchestrator's job (Claude Code session). Use the `superpowers:finishing-a-development-branch` skill: present merge/PR options to Ran. **Note:** push to `main` auto-deploys to Render (~3 min) — after merge, verify `GET https://apartment-backend-v24y.onrender.com/health` returns ok, then spot-check one IDOR fix against production with two demo accounts (expect 404 for the stranger).

---

## Out of scope (tracked, not in this plan)

These were review findings deliberately deferred — each is independent and can be its own small plan:

- Move web JWT storage from localStorage to httpOnly cookies (needs coordinated backend + web-next + mobile work).
- Replace `sequelize.sync({ alter })` with real migrations + add missing indexes.
- Replace the `JSON.stringify` WhatsApp-reminder matching in `GET /api/v3/ledger/agreement/:agreementId` with a `ledgerRowId` FK on `WhatsAppMessage`.
- PII (emails) in operational log lines.
- `generateLedger` timezone-safe date formatting.

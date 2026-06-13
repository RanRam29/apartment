# RFC: V2-1 Stripe Connect — Payment Gateway Integration

> **Status:** RFC only (no implementation)  
> **Author:** Cursor  
> **Date:** 2026-06-12  
> **Blocked by:** Israeli payment processing license (רישיון עיבוד תשלומים) — design for future implementation

---

## 1. Goal

Replace manual ledger "tenant reports payment → landlord confirms" with optional **Stripe Connect** flows for Israeli rental payments, while keeping the existing `LedgerRow` lifecycle as the source of truth for contract compliance.

**Non-goals (this RFC):**
- Production Stripe keys or webhook endpoints
- PCI scope expansion beyond Stripe-hosted elements
- Replacing WhatsApp payment reminders

---

## 2. Architecture Overview

```
Tenant App / Web
    │
    ▼
POST /api/v3/payments/intent          ──► Stripe PaymentIntent (Connect)
    │
    ▼
Stripe Checkout / Payment Element
    │
    ▼
POST /api/v3/webhooks/stripe          ──► Verify signature → payment_gateway_transactions
    │
    ▼
LedgerRow.status = PAID               ◄── reconciliation service
```

**Actors:**
- **Platform account** — DirApp Stripe platform (application fee optional)
- **Connected account** — Landlord Express/Custom account (`acct_…`)
- **Tenant** — Pays via PaymentIntent tied to `ledger_row_id`

All public API routes use **`/api/v3/`** prefix per DirApp v3 convention.

---

## 3. Database Schema (PostgreSQL, UUID PKs)

### 3.1 `payment_methods`

Stores tokenized payment methods for repeat rent (optional; Stripe Customer + PaymentMethod).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID FK → users | Tenant owner |
| `stripe_customer_id` | VARCHAR(64) | `cus_…` |
| `stripe_payment_method_id` | VARCHAR(64) | `pm_…` |
| `brand` | VARCHAR(20) | visa, mastercard, … |
| `last4` | CHAR(4) | |
| `exp_month` | SMALLINT | |
| `exp_year` | SMALLINT | |
| `is_default` | BOOLEAN | default false |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `(user_id)`, unique `(stripe_payment_method_id)`

### 3.2 `payment_gateway_transactions`

Immutable audit log of every Stripe object affecting a ledger row.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `ledger_row_id` | UUID FK → ledger_rows | Nullable until linked |
| `agreement_id` | UUID FK → rental_agreements | Denormalized for queries |
| `payer_user_id` | UUID FK → users | Tenant |
| `payee_user_id` | UUID FK → users | Landlord |
| `stripe_payment_intent_id` | VARCHAR(64) UNIQUE | `pi_…` |
| `stripe_charge_id` | VARCHAR(64) | `ch_…` after success |
| `stripe_transfer_id` | VARCHAR(64) | Connect transfer to landlord |
| `amount_ils` | DECIMAL(12,2) | Agreed ledger amount |
| `platform_fee_ils` | DECIMAL(12,2) | Optional DirApp fee |
| `currency` | CHAR(3) | `ILS` |
| `status` | VARCHAR(30) | see §4 |
| `failure_code` | VARCHAR(64) | Stripe error code |
| `failure_message` | TEXT | |
| `idempotency_key` | VARCHAR(255) UNIQUE | Client + server dedupe |
| `raw_event_id` | VARCHAR(64) | Last Stripe event `evt_…` |
| `metadata` | JSONB | `{ ledgerRowId, agreementId, period }` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `(ledger_row_id)`, `(status)`, `(stripe_payment_intent_id)`, `(payer_user_id, created_at DESC)`

### 3.3 Landlord Connect onboarding (extension to `users` or new table)

Recommend **`stripe_connect_accounts`** (1:1 landlord):

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK UNIQUE | Landlord |
| `stripe_account_id` | VARCHAR(64) UNIQUE | `acct_…` |
| `onboarding_status` | VARCHAR(20) | `pending`, `active`, `restricted` |
| `charges_enabled` | BOOLEAN | |
| `payouts_enabled` | BOOLEAN | |
| `details_submitted` | BOOLEAN | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

Bootstrapped via `ensure*` helper in `database.js` or Sequelize sync on first deploy.

---

## 4. Status Machine — `payment_gateway_transactions.status`

```
CREATED          → PaymentIntent created, client_secret issued
REQUIRES_ACTION  → 3DS / redirect
PROCESSING       → charge pending
SUCCEEDED        → charge captured; trigger LedgerRow update
FAILED           → terminal failure
CANCELLED        → intent cancelled before capture
REFUNDED         → full refund (LedgerRow → disputed workflow)
PARTIALLY_REFUNDED
```

**LedgerRow mapping (on `SUCCEEDED`):**
- `LedgerRow.status` → `PAID`
- `confirmedByLandlord` → webhook timestamp (auto-confirmed via gateway)
- `notes` → `Stripe pi_…`
- Cancel scheduled T-3 reminder: `cancelReminder({ dedupeKey: 'ledger:{rowId}:due3d' })`

---

## 5. API Surface (`/api/v3/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v3/payments/connect/onboard` | landlord | Create Connect account link |
| GET | `/api/v3/payments/connect/status` | landlord | Onboarding status |
| POST | `/api/v3/payments/intent` | tenant | Create PaymentIntent for `ledgerRowId` |
| GET | `/api/v3/payments/intent/:id` | tenant/landlord | Poll status |
| POST | `/api/v3/payments/methods` | tenant | Attach default PM |
| GET | `/api/v3/payments/methods` | tenant | List saved PMs |
| DELETE | `/api/v3/payments/methods/:id` | tenant | Detach PM |
| POST | `/api/v3/webhooks/stripe` | Stripe signature | Raw body, no JWT |

**POST `/api/v3/payments/intent` body:**
```json
{
  "ledgerRowId": "uuid",
  "idempotencyKey": "optional-client-key"
}
```

**Response:**
```json
{
  "transactionId": "uuid",
  "clientSecret": "pi_…_secret_…",
  "amountIls": 5000,
  "status": "CREATED"
}
```

---

## 6. Webhook Flow

**Endpoint:** `POST /api/v3/webhooks/stripe`  
**Middleware:** `express.raw({ type: 'application/json' })` on this route only; verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`.

### Handled events (minimum viable)

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Update `payment_gateway_transactions` → SUCCEEDED; reconcile LedgerRow |
| `payment_intent.payment_failed` | FAILED + store failure_code |
| `payment_intent.canceled` | CANCELLED |
| `charge.refunded` | REFUNDED / PARTIALLY_REFUNDED |
| `account.updated` | Sync `stripe_connect_accounts` flags |

### Processing steps (`payment_intent.succeeded`)

1. Load transaction by `stripe_payment_intent_id` (or create from metadata if missing — idempotent).
2. Verify `amount` matches `LedgerRow.amount` (±0 agorot); reject mismatch → alert admin.
3. Verify payer is agreement tenant and payee is landlord.
4. Update transaction row; set `stripe_charge_id`, `stripe_transfer_id` if present.
5. **Reconciliation:** `ledgerService.confirmPayment(ledgerRowId, { role: 'admin', id: SYSTEM_USER })` or dedicated `markPaidViaGateway()`.
6. Emit audit log + optional push to landlord.

**Idempotency:** Stripe may retry webhooks; use `raw_event_id` unique constraint or processed-events table.

---

## 7. Reconciliation & Ops

### 7.1 Daily reconciliation cron

Compare:
- `LedgerRow` where `status = PAID` and no matching `payment_gateway_transactions.status = SUCCEEDED`
- Stripe Dashboard PaymentIntents vs DB

Output: admin report `/api/v3/admin/payments/reconciliation?date=YYYY-MM-DD`

### 7.2 Manual ledger vs gateway

Landlords may still mark cash payments manually. Gateway-paid rows must not be overwritable except via refund webhook.

### 7.3 Disputes

`charge.dispute.created` → flag LedgerRow notes + notify admin; do not auto-reverse without review.

---

## 8. Security & Compliance

- **No card data** on DirApp servers — Stripe.js / Checkout only
- **Webhook signature** mandatory; reject unsigned in production
- **Connect OAuth** — store only account IDs, not bank details
- **License gate** — feature flag `AppConfig.stripe_connect_enabled = false` until legal approval
- **GDPR** — payment metadata in export; PM deletion on account deletion cascade

---

## 9. Environment Variables

```
STRIPE_SECRET_KEY=sk_live_…
STRIPE_PUBLISHABLE_KEY=pk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_CONNECT_CLIENT_ID=ca_…
STRIPE_PLATFORM_FEE_BPS=0
```

---

## 10. Migration Plan (when unblocked)

1. Add tables + models + `ensure*` boot helpers
2. Connect onboarding UI (landlord settings)
3. PaymentIntent on ledger "Pay with card" button (web + mobile)
4. Webhook handler + reconciliation cron
5. Gradual rollout: opt-in landlords → beta tenants
6. Deprecate manual "reported paid" for gateway-enabled agreements only

---

## 11. Open Questions

1. **Custom vs Express Connect** — Express recommended for faster landlord onboarding in IL market
2. **Application fee** — 0% at launch vs small platform fee
3. **Partial payments** — out of scope v1 (full ledger row amount only)
4. **Currency** — ILS only initially; Stripe IL support validation required

---

## 12. References

- Existing: `LedgerRow`, `ledgerService.js`, `scheduleReminder` / `cancelReminder`
- Stripe Connect docs: https://stripe.com/docs/connect
- DirApp prefix convention: `/api/v3/*` (guarantor, admin, contracts)

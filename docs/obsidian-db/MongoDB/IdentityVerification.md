---
tags: [db, mongodb, model, kyc, identity]
collection: identity_verifications
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/IdentityVerification.js
---

# IdentityVerification

Israeli ID verification with privacy-safe storage (hash + last 4 digits only).

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `userId` | String | Yes (unique) | — | References [[User]].id |
| `idNumberHash` | String | Yes (unique) | — | HMAC of full ID number — never plaintext |
| `idNumberLast4` | String | Yes | — | Last 4 digits for display |
| `fullName` | String | Yes | — | Legal name from ID |
| `phone` | String | Yes | — | Verified phone |
| `status` | String | No | `pending` | `pending`/`verified`/`rejected` |
| `rejectedReason` | String | No | `null` | Why rejected |
| `verifiedAt` | Date | No | `null` | When verified |

## Indexes

- `userId`, `status`, `idNumberHash` (unique)

## Business Logic

- Separate from [[UserKycProfile]] (PG) — this is the Israeli ID verification
- [[UserKycProfile]] handles Persona.com document verification
- `idNumberHash` ensures one ID can't be used by multiple accounts

---
tags: [db, postgres, model, lease, verification]
table: ownership_verifications
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/OwnershipVerification.js
---

# OwnershipVerification

Records whether a tenant verified or skipped property ownership verification.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `agreementId` | UUID | Yes | — | FK -> [[RentalAgreement]].id, CASCADE |
| `tenantId` | UUID | Yes | — | FK -> [[User]].id, CASCADE |
| `choice` | ENUM | Yes | — | `verified` / `skipped` |
| `verifiedAt` | DATE | Yes | NOW | When the choice was made |

## Indexes

- `(agreementId, tenantId)` UNIQUE

## Relationships

- belongsTo [[RentalAgreement]] as `agreement`

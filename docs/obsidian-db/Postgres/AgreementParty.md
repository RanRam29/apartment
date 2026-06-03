---
tags: [db, postgres, model, lease, agreement]
table: agreement_parties
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/AgreementParty.js
---

# AgreementParty

Links a user to a rental agreement with a specific role (tenant or guarantor).

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `agreementId` | UUID | Yes | — | FK -> [[RentalAgreement]].id, CASCADE |
| `userId` | UUID | Yes | — | FK -> [[User]].id, CASCADE |
| `role` | ENUM | Yes | — | `tenant` / `guarantor` |
| `signedAt` | DATE | No | — | When party signed |
| `kycStatus` | ENUM | No | `PENDING` | `PENDING`/`APPROVED`/`REJECTED` |
| `isHouseManager` | BOOLEAN | No | `false` | Designated house manager |

## Indexes

- `agreementId`, `userId`
- `(agreementId, userId)` UNIQUE

## Relationships

- belongsTo [[RentalAgreement]] as `agreement`
- belongsTo [[User]] as `user`

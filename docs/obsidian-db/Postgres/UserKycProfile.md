---
tags: [db, postgres, model, kyc, identity]
table: user_kyc_profiles
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/UserKycProfile.js
---

# UserKycProfile

Persona-based identity verification status for a user.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `userId` | UUID | Yes (unique) | — | FK -> [[User]].id, CASCADE |
| `status` | ENUM | No | `PENDING` | `PENDING`/`APPROVED`/`REJECTED` |
| `personaInquiryId` | STRING(255) | No (unique) | — | External Persona.com inquiry ID |

## Indexes

- `userId`, `status`, `personaInquiryId`

## Relationships

- belongsTo [[User]] as `user`

## Business Logic

- 1:1 with User — one KYC profile per user
- Integrates with Persona.com for ID document verification
- Status drives trust features and access to premium flows

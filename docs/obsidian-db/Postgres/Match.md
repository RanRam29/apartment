---
tags: [db, postgres, model, matching]
table: matches
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/Match.js
---

# Match

Created when a tenant likes an apartment and the landlord approves. Entry point to chat and agreements.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `tenantId` | UUID | Yes | — | FK -> [[User]].id, CASCADE |
| `landlordId` | UUID | Yes | — | FK -> [[User]].id, CASCADE |
| `apartmentId` | UUID | Yes | — | FK -> [[Apartment]].id, CASCADE |
| `status` | ENUM | No | `pending` | `pending`/`accepted`/`rejected`/`expired` |
| `tenantLikedAt` | DATE | No | — | When tenant swiped like |
| `landlordLikedAt` | DATE | No | — | When landlord approved |
| `lastMessageAt` | DATE | No | — | Updated on new chat message |
| `expiresAt` | DATE | No | — | Auto-expiration deadline |

## Indexes

- `(tenantId, apartmentId)` UNIQUE
- `tenantId`, `landlordId`, `apartmentId`, `status`

## Relationships

- belongsTo [[User]] as `tenant`
- belongsTo [[User]] as `landlord`
- belongsTo [[Apartment]] as `apartment`

## Business Logic

- Match.id is the key linking to [[Message]] chat in MongoDB
- Status flow: `pending` -> `accepted` -> (chat opens) -> leads to [[RentalAgreement]]
- `expiresAt` enables auto-cleanup of stale matches
- Landlord sees matches as "leads" in dashboard with tenant contact info

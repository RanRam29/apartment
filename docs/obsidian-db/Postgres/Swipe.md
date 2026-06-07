---
tags: [db, postgres, model, matching]
table: swipes
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/Swipe.js
---

# Swipe

Records a tenant's decision on an apartment card. The core input for the matching engine.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `tenantId` | UUID | Yes | — | FK -> [[User]].id, CASCADE |
| `apartmentId` | UUID | Yes | — | FK -> [[Apartment]].id, CASCADE |
| `direction` | ENUM | Yes | — | `like` / `dislike` / `superlike` |
| `seenDurationMs` | INTEGER | No | — | How long tenant viewed card before swiping |

## Indexes

- `(tenantId, apartmentId)` UNIQUE
- `tenantId`, `apartmentId`, `direction`

## Relationships

- belongsTo [[User]] as `tenant`
- belongsTo [[Apartment]] as `apartment`

## Business Logic

- Unique per tenant-apartment pair (can't swipe same apartment twice)
- `like`/`superlike` triggers match check: if landlord has also approved -> creates [[Match]]
- `seenDurationMs` used for engagement analytics
- Also recorded in [[UserPreferences]].swipeHistory (MongoDB) for ML/recommendations

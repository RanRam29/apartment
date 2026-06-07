---
tags: [db, postgres, model, lease, protocol]
table: agreement_rooms
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/AgreementRoom.js
---

# AgreementRoom

Rooms within a rental agreement, used for check-in/check-out photo documentation.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `agreementId` | UUID | Yes | — | FK -> [[RentalAgreement]].id, CASCADE |
| `name` | STRING(100) | Yes | — | Room name (e.g. "Living Room") |
| `type` | ENUM | No | `builtin` | `builtin` / `custom` |
| `checkinPhotos` | JSONB | No | `[]` | Photos taken at move-in |
| `checkoutPhotos` | JSONB | No | `[]` | Photos taken at move-out |
| `checkoutNotes` | TEXT | No | — | Notes on room condition at checkout |

## Indexes

- `agreementId`

## Relationships

- belongsTo [[RentalAgreement]] as `agreement`

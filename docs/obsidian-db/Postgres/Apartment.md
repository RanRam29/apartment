---
tags: [db, postgres, model, listings]
table: apartments
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/Apartment.js
---

# Apartment

Property listing created by a landlord. Core entity in the matching flow.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `landlordId` | UUID | Yes | — | FK -> [[User]].id, CASCADE |
| `title` | STRING(200) | Yes | — | Listing headline |
| `description` | TEXT | No | — | Free-text description |
| `price` | INTEGER | Yes | — | Monthly rent in ILS, >= 0 |
| `rooms` | FLOAT | Yes | — | Room count, >= 1 (supports 2.5) |
| `floor` | INTEGER | No | — | |
| `totalFloors` | INTEGER | No | — | |
| `sizeSqm` | INTEGER | No | — | Area in square meters |
| `city` | STRING(100) | Yes | — | City name |
| `street` | STRING(100) | No | — | Also aliased as `neighborhood` (virtual) |
| `neighborhood` | VIRTUAL | — | — | Getter/setter maps to `street` |
| `address` | STRING(255) | No | — | Full address |
| `latitude` | FLOAT | No | — | -90 to 90 |
| `longitude` | FLOAT | No | — | -180 to 180 |
| `images` | JSONB | No | `[]` | Array of image URLs |
| `amenities` | JSONB | No | `[]` | e.g. `["parking","balcony","elevator","ac","storage"]` |
| `availableFrom` | DATEONLY | No | — | Move-in date |
| `minLeasePeriod` | INTEGER | No | — | Months |
| `petsAllowed` | BOOLEAN | No | `false` | |
| `isActive` | BOOLEAN | No | `true` | Soft-delete / hide listing |
| `viewCount` | INTEGER | No | `0` | Analytics counter |
| `likeCount` | INTEGER | No | `0` | Analytics counter |

## Indexes

- `landlord_id`, `city`, `price`, `rooms`, `is_active`

## Relationships

- belongsTo [[User]] as `landlord` (via `landlordId`)
- hasMany [[Swipe]] as `swipes` (via `apartmentId`)
- hasMany [[Match]] as `matches` (via `apartmentId`)

## Business Logic

- Feed endpoint filters by `isActive`, `city`, `price`, `rooms`
- Cached in Redis as `feed:{city}` (TTL 300-600s) and `apartment:{id}` (TTL 600s)
- `viewCount`/`likeCount` incremented atomically on swipe

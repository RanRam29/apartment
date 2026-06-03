---
tags: [db, mongodb, model, marketplace]
collection: service_listings
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/ServiceListing.js
---

# ServiceListing

Service provider listings in the marketplace (movers, cleaners, etc.).

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `providerId` | String | Yes | — | References [[User]].id |
| `providerName` | String | No | — | Display name snapshot |
| `category` | String | Yes | — | `movers`/`cleaning`/`painting`/`plumbing`/`electricity`/`carpentry`/`other` |
| `title` | String | Yes | — | Listing title |
| `description` | String | No | — | |
| `priceType` | String | No | `fixed` | `hourly`/`fixed`/`quote` |
| `price` | Number | No | `null` | In ILS |
| `cities` | [String] | No | `[]` | Service areas |
| `phone` | String | No | — | Contact phone |
| `isActive` | Boolean | No | `true` | |
| `rating` | Number | No | `null` | Computed average |
| `reviewCount` | Number | No | `0` | |

## Indexes

- `(category, isActive)`, `(cities, isActive)`, `providerId`

## Relationships

- Has many [[ServiceReview]] (via `serviceId`)

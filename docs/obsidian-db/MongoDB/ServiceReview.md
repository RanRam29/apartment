---
tags: [db, mongodb, model, marketplace]
collection: service_reviews
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/ServiceReview.js
---

# ServiceReview

User reviews for service providers in the marketplace.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `serviceId` | ObjectId | Yes | — | Ref -> [[ServiceListing]] |
| `reviewerId` | String | Yes | — | References [[User]].id |
| `reviewerName` | String | No | — | Display snapshot |
| `rating` | Number | Yes | — | 1-5 |
| `comment` | String | No | — | |

## Indexes

- `(serviceId, reviewerId)` UNIQUE — one review per user per service

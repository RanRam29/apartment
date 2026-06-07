---
tags: [db, mongodb, model, preferences, matching]
collection: user_preferences
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/UserPreferences.js
---

# UserPreferences

Tenant's search preferences, swipe history, and NLP search history. Drives the recommendation engine.

## Fields

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `_id` | ObjectId | auto | |
| `userId` | String (unique) | — | References [[User]].id |
| `budget.min` | Number | `0` | Min monthly rent ILS |
| `budget.max` | Number | `20000` | Max monthly rent ILS |
| `cities` | [String] | `[]` | Preferred cities |
| `neighborhoods` | [String] | `[]` | Preferred neighborhoods |
| `rooms.min` | Number | `1` | Min rooms |
| `rooms.max` | Number | `10` | Max rooms |
| `requiredAmenities` | [String] | `[]` | From: `parking`, `balcony`, `elevator`, `ac`, `storage`, `pets_allowed`, `furnished`, `sun_boiler` |
| `maxDistanceFromWork` | Number | `null` | Km from work location |
| `workLocation.latitude` | Number | `null` | |
| `workLocation.longitude` | Number | `null` | |
| `swipeHistory[]` | Array | — | Embedded swipe log |
| `swipeHistory[].apartmentId` | String | — | |
| `swipeHistory[].direction` | String | — | `like`/`dislike`/`superlike` |
| `swipeHistory[].seenDurationMs` | Number | — | |
| `swipeHistory[].swipedAt` | Date | now | |
| `nlpSearchHistory[]` | Array | — | Embedded NLP search log |
| `nlpSearchHistory[].query` | String | — | Raw search text |
| `nlpSearchHistory[].parsedFilters` | Mixed | — | AI-parsed filter object |
| `nlpSearchHistory[].searchedAt` | Date | now | |

## Business Logic

- Used to filter apartment feed and rank recommendations
- Swipe history mirrors PG [[Swipe]] but adds `seenDurationMs` for analytics
- NLP search history stores natural language queries and their parsed interpretations

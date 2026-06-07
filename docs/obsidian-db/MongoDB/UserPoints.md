---
tags: [db, mongodb, model, gamification]
collection: user_points
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/UserPoints.js
---

# UserPoints

Gamification system — points, levels, and badges.

## Fields

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `_id` | ObjectId | auto | |
| `userId` | String (unique) | — | References [[User]].id |
| `points` | Number | `0` | Min: 0 |
| `level` | Number | `1` | 1-4 |
| `badges[]` | Array | — | Earned badges |
| `badges[].id` | String | — | Badge identifier |
| `badges[].name` | String | — | Display name |
| `badges[].earnedAt` | Date | now | |
| `lastActivityAt` | Date | `null` | |

## Level Thresholds

| Level | Points Range |
|-------|-------------|
| 1 | 0 - 99 |
| 2 | 100 - 499 |
| 3 | 500 - 1,499 |
| 4 | 1,500+ |

## Methods

- `computeLevel()` — recalculates level from current points

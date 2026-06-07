---
tags: [db, mongodb, model, chat]
collection: messages
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/Message.js
---

# Message

Chat messages between matched tenant and landlord.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `matchId` | String | Yes | — | References [[Match]].id (PG UUID as string) |
| `senderId` | String | Yes | — | References [[User]].id |
| `content` | String | Yes | — | Max 2000 chars |
| `type` | String | No | `text` | `text` / `image` / `system` |
| `imageUrl` | String | No | `null` | URL for image messages |
| `isRead` | Boolean | No | `false` | Read receipt |
| `readAt` | Date | No | `null` | When message was read |

## Indexes

- `matchId` (ascending)
- `(matchId, createdAt)` — descending createdAt for message history pagination

## Business Logic

- Match.id is the "chat room" key — all messages for a match share the same matchId
- Real-time delivery via Socket.io, persisted here
- `system` type used for automated notifications within chat

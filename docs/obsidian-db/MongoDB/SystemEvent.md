---
tags: [db, mongodb, model, logging, observability]
collection: system_events
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/SystemEvent.js
---

# SystemEvent

Structured application logging with auto-expiration (TTL).

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `requestId` | String | No | `null` | Correlation ID |
| `source` | String | Yes | — | Component name |
| `category` | String | No | `application` | `application`/`security`/`integration`/`performance` |
| `severity` | String | No | `info` | `debug`/`info`/`warn`/`error`/`critical` |
| `event` | String | Yes | — | Event identifier |
| `message` | String | Yes | — | Human-readable message |
| `actorId` | String | No | `null` | Who triggered the event |
| `tags` | [String] | No | — | Searchable tags |
| `metadata` | Mixed | No | `{}` | Additional context |

## Indexes

- `requestId`, `source`, `category`, `severity`, `event`, `actorId`
- `createdAt` — **TTL index**: auto-deletes after `SYSTEM_EVENT_RETENTION_DAYS` (default 30 days)

## Business Logic

- Complements PG [[AuditLog]] — this is for operational logging, AuditLog is for security/compliance
- TTL ensures automatic cleanup — no manual maintenance needed

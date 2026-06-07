---
tags: [db, postgres, model, security, audit]
table: audit_logs
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/AuditLog.js
---

# AuditLog

Immutable security audit trail for all significant actions.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `requestId` | STRING(64) | No | — | Correlation ID for request tracing |
| `actorId` | UUID | No | — | Who performed the action |
| `actorRole` | STRING(32) | No | — | Actor's role at time of action |
| `action` | STRING(120) | Yes | — | Action identifier (e.g. `user.login`) |
| `resourceType` | STRING(80) | No | — | Target entity type |
| `resourceId` | STRING(120) | No | — | Target entity ID |
| `outcome` | STRING(16) | No | `success` | `success` / `failure` / etc. |
| `statusCode` | INTEGER | No | — | HTTP status code |
| `ipAddress` | STRING(64) | No | — | Client IP |
| `userAgent` | STRING(512) | No | — | Client user-agent |
| `route` | STRING(255) | No | — | API route path |
| `method` | STRING(12) | No | — | HTTP method |
| `metadata` | JSONB | No | — | Additional context |

## Indexes

- `createdAt`
- `(actorId, createdAt)`
- `(action, createdAt)`
- `(resourceType, resourceId)`
- `requestId`

---
tags: [db, mongodb, model, maintenance, commercial]
collection: maintenance_tickets
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/MaintenanceTicket.js
---

# MaintenanceTicket (Mongo)

Maintenance tickets for commercial leases. Separate from PG [[MaintenanceTicket-PG]] which handles residential.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `leaseId` | String | Yes | — | References [[CommercialLease]] |
| `deviceId` | String | No | — | Related [[IoTDevice]] |
| `reporterId` | String | Yes | — | |
| `reporterName` | String | No | — | |
| `title` | String | Yes | — | |
| `description` | String | No | — | |
| `priority` | String | No | `medium` | `low`/`medium`/`high`/`critical` |
| `status` | String | No | `open` | `open`/`in_progress`/`resolved`/`closed` |
| `resolvedAt` | Date | No | — | |
| `resolvedBy` | String | No | — | |
| `resolutionNotes` | String | No | — | |

## Indexes

- `(leaseId, status)`

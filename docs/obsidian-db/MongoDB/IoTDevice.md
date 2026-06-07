---
tags: [db, mongodb, model, iot, smart-building]
collection: iot_devices
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/IoTDevice.js
---

# IoTDevice

Smart building device registry linked to leases.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `leaseId` | String | Yes | — | References a lease |
| `landlordId` | String | Yes | — | |
| `tenantId` | String | Yes | — | |
| `deviceId` | String | Yes (unique) | — | Hardware device identifier |
| `name` | String | Yes | — | Display name |
| `type` | String | Yes | — | `access_control`/`sensor`/`camera`/`meter`/`other` |
| `location` | String | No | — | Physical location description |
| `status` | String | No | `offline` | `online`/`offline`/`maintenance` |
| `lastSeenAt` | Date | No | — | Last heartbeat |
| `metadata` | Mixed | No | — | Device-specific data |

## Indexes

- `leaseId`, `deviceId` (unique)

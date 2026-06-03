---
tags: [db, mongodb, model, commercial]
collection: commercial_leases
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/CommercialLease.js
---

# CommercialLease

Commercial property lease with CAM (Common Area Maintenance) reconciliation.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `tenantId` | String | Yes | — | |
| `landlordId` | String | Yes | — | |
| `apartmentId` | String | No | — | |
| `businessName` | String | Yes | — | |
| `businessType` | String | No | `office` | `office`/`retail`/`warehouse`/`industrial`/`other` |
| `monthlyRent` | Number | Yes | — | |
| `annualCamEstimate` | Number | No | `0` | Estimated CAM costs |
| `camReconciliationMonth` | Number | No | `1` | Month for annual CAM true-up (1-12) |
| `camHistory[]` | Array | — | — | Annual CAM records |
| `camHistory[].year` | Number | Yes | — | |
| `camHistory[].estimated` | Number | Yes | — | |
| `camHistory[].actual` | Number | No | — | |
| `camHistory[].difference` | Number | No | — | positive = tenant owes |
| `camHistory[].settledAt` | Date | No | — | |
| `camHistory[].notes` | String | No | — | |
| `startDate` | Date | Yes | — | |
| `endDate` | Date | Yes | — | |
| `renewalOptionDate` | Date | No | — | |
| `renewalOptionMonths` | Number | No | — | |
| `rentEscalationDate` | Date | No | — | |
| `rentEscalationPercent` | Number | No | — | |
| `inspectionDate` | Date | No | — | |
| `tenantName` | String | No | — | Snapshot |
| `landlordName` | String | No | — | Snapshot |
| `propertyAddress` | String | No | — | Snapshot |
| `status` | String | No | `active` | `active`/`expired`/`terminated` |
| `notes` | String | No | — | |

## Indexes

- `(landlordId, status)`, `(tenantId, status)`, `endDate`, `renewalOptionDate`

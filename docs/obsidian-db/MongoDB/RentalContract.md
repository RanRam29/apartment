---
tags: [db, mongodb, model, contract, legacy]
collection: rental_contracts
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/RentalContract.js
---

# RentalContract

Legacy contract model in MongoDB. Newer flow uses PG [[RentalAgreement]].

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `matchId` | String | Yes | — | References [[Match]].id |
| `tenantId` | String | Yes | — | References [[User]].id |
| `landlordId` | String | Yes | — | References [[User]].id |
| `apartmentId` | String | Yes | — | References [[Apartment]].id |
| `monthlyRent` | Number | Yes | — | |
| `depositMonths` | Number | No | `1` | |
| `depositAmount` | Number | Yes | — | |
| `startDate` | Date | Yes | — | |
| `endDate` | Date | Yes | — | |
| `customClauses` | String | No | `''` | |
| `apartmentTitle` | String | No | `''` | Snapshot |
| `apartmentAddress` | String | No | `''` | Snapshot |
| `tenantName` | String | No | `''` | Snapshot |
| `landlordName` | String | No | `''` | Snapshot |
| `status` | String | No | `draft` | `draft`/`pending_tenant`/`pending_landlord`/`active`/`terminated` |
| `tenantSignedAt` | Date | No | — | |
| `landlordSignedAt` | Date | No | — | |
| `depositStatus` | String | No | `pending` | `pending`/`held`/`released`/`forfeited` |
| `depositPaidAt` | Date | No | — | |
| `depositSettledAt` | Date | No | — | |
| `uploadedDocumentFilename` | String | No | — | |
| `uploadedDocumentMimeType` | String | No | — | |
| `uploadedDocumentOriginalName` | String | No | — | |

## Indexes

- `matchId`, `tenantId`, `landlordId`, `status`

## Business Logic

- Stores name/address snapshots to preserve data even if source records change
- Deposit lifecycle: `pending` -> `held` -> `released`/`forfeited`
- Has many [[RentPayment]] (via `contractId`)

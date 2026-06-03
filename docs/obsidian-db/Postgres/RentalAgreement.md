---
tags: [db, postgres, model, lease, agreement]
table: rental_agreements
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/RentalAgreement.js
---

# RentalAgreement

The central lease document. Tracks the full lifecycle from upload through active tenancy to end.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `landlordId` | UUID | Yes | — | Owner of the agreement |
| `propertyId` | UUID | Yes | — | Linked apartment |
| `status` | ENUM | No | `UPLOAD` | See status flow below |
| `startDate` | DATEONLY | No | — | Lease start |
| `endDate` | DATEONLY | No | — | Lease end |
| `monthlyRentIls` | DECIMAL(10,2) | No | — | Monthly rent in ILS |
| `paymentDueDay` | INTEGER | No | `1` | Day of month rent is due |
| `cpiLinked` | BOOLEAN | No | `false` | CPI-adjusted rent |
| `r2DocKey` | STRING(512) | No | — | R2/S3 key for uploaded contract PDF |
| `extractedFields` | JSONB | No | — | AI-extracted fields from PDF |
| `landlordSignedAt` | DATE | No | — | Landlord signature timestamp |
| `checkinCompletedAt` | DATE | No | — | Property check-in done |
| `checkoutCompletedAt` | DATE | No | — | Property check-out done |
| `renewedFromId` | UUID | No | — | Previous agreement (renewal chain) |

## Status Flow

```
UPLOAD -> PENDING_SIGN -> PENDING_ACTIVATION -> ACTIVE -> EXPIRING -> ENDED
```

## Relationships

- hasMany [[AgreementParty]] as `parties`
- hasMany [[AgreementRoom]] as `rooms`
- hasMany [[LedgerRow]] as `ledgerRows`
- hasMany [[OwnershipVerification]] as `ownershipVerifications`

## Business Logic

- Landlord uploads PDF -> AI extracts fields -> parties invited to sign
- `cpiLinked` triggers CPI adjustment on [[LedgerRow]] amounts
- `renewedFromId` creates a chain for lease renewals
- Check-in/check-out timestamps gate [[ProtocolEvidence]] and [[AgreementRoom]] photo flows

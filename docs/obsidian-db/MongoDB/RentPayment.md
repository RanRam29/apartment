---
tags: [db, mongodb, model, payments, legacy]
collection: rent_payments
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/RentPayment.js
---

# RentPayment

Monthly rent payment records linked to a [[RentalContract]].

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | PK | auto | |
| `contractId` | ObjectId | Yes | — | Ref -> [[RentalContract]] |
| `apartmentId` | String | Yes | — | |
| `tenantId` | String | Yes | — | |
| `landlordId` | String | Yes | — | |
| `amount` | Number | Yes | — | |
| `month` | String | Yes | — | Format: `YYYY-MM` |
| `dueDate` | Date | Yes | — | |
| `status` | String | No | `pending` | `pending`/`initiated`/`paid`/`overdue`/`cancelled` |
| `paidAt` | Date | No | — | |
| `paymentMethod` | String | No | — | `bit`/`paybox`/`bank_transfer`/`manual` |
| `externalTransactionId` | String | No | — | |
| `reminderSentAt` | Date | No | — | |
| `landlordPhone` | String | No | — | For payment links |
| `apartmentTitle` | String | No | — | Snapshot |

## Indexes

- `(contractId, month)` UNIQUE
- `(tenantId, dueDate)` desc
- `(landlordId, dueDate)` desc
- `(dueDate, status)` — for overdue sweep cron

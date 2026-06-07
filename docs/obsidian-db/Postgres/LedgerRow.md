---
tags: [db, postgres, model, payments, ledger]
table: ledger_rows
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/LedgerRow.js
---

# LedgerRow

Individual payment line items within a rental agreement. One row per billing period.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `agreementId` | UUID | Yes | — | FK -> [[RentalAgreement]].id, CASCADE |
| `period` | STRING(20) | Yes | — | Billing period label (e.g. "2026-01") |
| `dueDate` | DATEONLY | Yes | — | Payment due date |
| `amount` | DECIMAL(10,2) | Yes | — | Amount due in ILS |
| `status` | ENUM | No | `PENDING` | `PENDING`/`REPORTED`/`PAID`/`OVERDUE` |
| `reportedByTenant` | DATE | No | — | When tenant marked as paid |
| `confirmedByLandlord` | DATE | No | — | When landlord confirmed receipt |
| `cpiAdjustment` | DECIMAL(10,2) | No | `0` | CPI inflation adjustment |
| `notes` | TEXT | No | — | Free-text notes |
| `receiptR2Key` | STRING(512) | No | — | R2/S3 key for payment receipt |

## Indexes

- `agreementId`, `dueDate`, `status`

## Relationships

- belongsTo [[RentalAgreement]] as `agreement`

## Business Logic

- Status flow: `PENDING` -> tenant reports (`REPORTED`) -> landlord confirms (`PAID`)
- Overdue detection: cron marks `PENDING` rows past `dueDate` as `OVERDUE`
- CPI adjustment added when [[RentalAgreement]].cpiLinked is true

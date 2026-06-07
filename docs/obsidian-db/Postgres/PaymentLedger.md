---
tags: [db, postgres, model, payments]
table: payment_ledger
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/PaymentLedger.js
---

# PaymentLedger

Parallel payment tracking with CPI calculations. Newer model alongside [[LedgerRow]].

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `agreementId` | UUID | Yes | — | FK -> [[RentalAgreement]].id, CASCADE |
| `billingPeriod` | DATEONLY | Yes | — | Period date |
| `baseAmountIls` | DECIMAL(10,2) | Yes | — | Base rent before CPI |
| `cpiAdjustmentIls` | DECIMAL(10,2) | No | `0.00` | CPI delta |
| `totalDueIls` | DECIMAL(10,2) | Yes | — | base + CPI adjustment |
| `status` | ENUM | No | `PENDING` | `PENDING`/`PAID`/`OVERDUE` |
| `paymentProofUrl` | STRING(512) | No | — | Receipt/proof URL |
| `paidAt` | DATE | No | — | Payment timestamp |

## Indexes

- `agreementId`, `billingPeriod`, `status`

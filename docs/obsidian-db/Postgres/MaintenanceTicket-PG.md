---
tags: [db, postgres, model, maintenance]
table: maintenance_tickets
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/MaintenanceTicket.js
---

# MaintenanceTicket (PG)

Maintenance/repair requests within residential rental agreements.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `agreementId` | UUID | Yes | — | Parent rental agreement |
| `reporterId` | UUID | Yes | — | FK -> [[User]].id, CASCADE |
| `description` | TEXT | Yes | — | Problem description |
| `photoR2Key` | STRING(512) | No | — | R2/S3 key for photo evidence |
| `status` | ENUM | No | `OPEN` | `OPEN`/`IN_PROGRESS`/`WAITING_INVOICE`/`CLOSED` |
| `landlordResponse` | ENUM | No | — | `handling`/`technician`/`alternative` |
| `landlordNote` | TEXT | No | — | Landlord's response text |

## Relationships

- hasMany [[TicketInvoice]] as `invoices`

## Business Logic

- Flow: tenant opens -> landlord responds -> invoice attached -> closed
- Separate from MongoDB [[MaintenanceTicket-Mongo]] which is for commercial leases

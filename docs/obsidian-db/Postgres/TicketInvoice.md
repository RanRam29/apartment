---
tags: [db, postgres, model, maintenance, payments]
table: ticket_invoices
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/TicketInvoice.js
---

# TicketInvoice

Invoice attached to a maintenance ticket, tracking cost and who pays.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `ticketId` | UUID | Yes | — | FK -> [[MaintenanceTicket-PG]].id, CASCADE |
| `r2Key` | STRING(512) | Yes | — | R2/S3 key for invoice document |
| `amount` | DECIMAL(10,2) | Yes | — | Invoice amount in ILS |
| `payer` | ENUM | Yes | — | `landlord` / `tenant` |

## Relationships

- belongsTo [[MaintenanceTicket-PG]] as `ticket`

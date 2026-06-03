---
tags: [db, postgres, model, lease, guarantor]
table: agreement_guarantors
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/AgreementGuarantor.js
---

# AgreementGuarantor

External guarantor invited by email to co-sign a rental agreement.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `agreementId` | UUID | Yes | — | Parent agreement |
| `email` | STRING(255) | Yes | — | Guarantor's email |
| `name` | STRING(100) | Yes | — | Guarantor's name |
| `invitationToken` | UUID | Yes | UUIDV4 | Unique invitation link token |
| `invitationExpiresAt` | DATE | Yes | — | Token expiry |
| `invitationStatus` | ENUM | No | `PENDING` | `PENDING`/`APPROVED`/`DECLINED`/`EXPIRED` |
| `signedAt` | DATE | No | — | When guarantor signed |

## Relationships

- None explicitly defined (references `agreementId` but no Sequelize association)

## Business Logic

- Guarantor receives email with invitation link containing `invitationToken`
- Token has expiration — status auto-moves to `EXPIRED` if not acted on
- Separate from [[AgreementParty]] — this is for external (non-registered) guarantors

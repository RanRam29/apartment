---
tags: [db, postgres, model, protocol, evidence]
table: protocol_evidence
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/ProtocolEvidence.js
---

# ProtocolEvidence

Tamper-resistant photo evidence for check-in/check-out protocols. GPS-stamped and hashed.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | UUID | PK | UUIDV4 | |
| `agreementId` | UUID | Yes | — | FK -> [[RentalAgreement]].id, CASCADE |
| `protocolType` | ENUM | Yes | — | `CHECK_IN` / `CHECK_OUT` |
| `roomZone` | STRING(64) | Yes | — | Room or zone identifier |
| `conditionTag` | ENUM | Yes | — | `CLEAN` / `MINOR_WEAR` / `DAMAGED` |
| `s3ImageKey` | STRING(512) | Yes | — | S3/R2 key for evidence photo |
| `imageHash` | STRING(64) | Yes | — | Hash for tamper detection |
| `gpsLatitude` | FLOAT | Yes | — | GPS lat at capture time |
| `gpsLongitude` | FLOAT | Yes | — | GPS lng at capture time |
| `capturedAt` | DATE | Yes | — | When photo was taken |

## Indexes

- `agreementId`, `protocolType`, `roomZone`

## Business Logic

- Compared between CHECK_IN and CHECK_OUT to detect damage
- `imageHash` prevents photo substitution after the fact
- GPS coordinates prove photo was taken at the property location

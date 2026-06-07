---
tags: [db, postgres, model, auth, identity]
table: users
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/User.js
---

# User

Central identity model. Every person in the system — tenant, landlord, or admin.

## Fields

| Field | Type | Required | Unique | Default | Notes |
|-------|------|----------|--------|---------|-------|
| `id` | UUID | PK | Yes | UUIDV4 | Auto-generated |
| `email` | STRING(255) | Yes | Yes | — | Validated email format |
| `phone` | STRING(20) | No | Yes | — | Israeli format: `+972`/`0` prefix |
| `passwordHash` | STRING(255) | Yes | No | — | Bcrypt hash, never exposed in API |
| `role` | ENUM | Yes | No | `tenant` | `tenant` / `landlord` / `admin` |
| `firstName` | STRING(100) | Yes | No | — | Display name |
| `lastName` | STRING(100) | Yes | No | — | Display name |
| `avatarUrl` | TEXT | No | No | — | Cloudinary URL |
| `isVerified` | BOOLEAN | No | No | `false` | Email verification gate |
| `verificationToken` | STRING(128) | No | No | — | One-time email token |
| `verifiedAt` | DATE | No | No | — | When verified |
| `isPremium` | BOOLEAN | No | No | `false` | Paid subscription flag |
| `lastActiveAt` | DATE | No | No | — | Updated on login |
| `tosAcceptedAt` | DATE | No | No | — | Terms of Service acceptance |
| `tosVersion` | STRING(20) | No | No | — | Currently `'3.0'` |
| `blockedCount` | INTEGER | No | No | `0` | Admin block counter |
| `isLocked` | BOOLEAN | No | No | `false` | Auto-locked at blockedCount >= 5 |
| `activeRole` | STRING(20) | No | No | — | `tenant`/`landlord` context switch |
| `trustScore` | INTEGER | No | No | `50` | Reputation (not yet active) |

## Indexes

- `email`
- `phone`
- `role`

## Hooks

- **beforeValidate**: Sets `activeRole` to `role` if missing (admin defaults to `tenant`). Deduplicates `verificationToken` collisions.

## Relationships

- hasMany [[Apartment]] as `listings` (via `landlordId`)
- hasMany [[Swipe]] as `swipes` (via `tenantId`)
- hasMany [[Match]] as `tenantMatches` (via `tenantId`)
- hasMany [[Match]] as `landlordMatches` (via `landlordId`)
- hasMany [[AgreementParty]] as `agreementRoles` (via `userId`)
- hasOne [[UserKycProfile]] as `kycProfile` (via `userId`)

## Business Logic

- **Login**: lookup by email, bcrypt compare, blocked if `isLocked` or `!isVerified`
- **JWT payload**: `id`, `email`, `role`, `isPremium`
- **Lead scoring**: `isVerified` = +10 pts, `phone` present = +5 pts
- **Role switching**: `activeRole` lets dual-role users toggle context
- **Moderation**: `blockedCount >= 5` auto-sets `isLocked`, admin can reset
- **ToS gate**: `requireTos()` middleware blocks routes until `tosAcceptedAt` is set

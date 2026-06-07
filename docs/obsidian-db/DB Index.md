---
tags: [db, index, dirapp]
---

# DirApp Database Index

## Architecture Overview

DirApp uses a **polyglot persistence** strategy:

| Engine | Purpose | Models |
|--------|---------|--------|
| **PostgreSQL** (Sequelize) | Core business data, transactions, agreements | 17 models |
| **MongoDB** (Mongoose) | Flexible documents, chat, preferences, marketplace | 13 models |
| **Redis** | Cache layer with in-memory fallback | Key-value patterns |

## Postgres Models

| Model | Table | Domain |
|-------|-------|--------|
| [[User]] | `users` | Identity & Auth |
| [[Apartment]] | `apartments` | Property Listings |
| [[Swipe]] | `swipes` | Matching Engine |
| [[Match]] | `matches` | Matching Engine |
| [[UserKycProfile]] | `user_kyc_profiles` | Identity Verification |
| [[RentalAgreement]] | `rental_agreements` | Lease Management |
| [[AgreementParty]] | `agreement_parties` | Lease Management |
| [[AgreementRoom]] | `agreement_rooms` | Lease Management |
| [[AgreementGuarantor]] | `agreement_guarantors` | Lease Management |
| [[LedgerRow]] | `ledger_rows` | Payments |
| [[PaymentLedger]] | `payment_ledger` | Payments |
| [[MaintenanceTicket-PG]] | `maintenance_tickets` | Maintenance |
| [[TicketInvoice]] | `ticket_invoices` | Maintenance |
| [[OwnershipVerification]] | `ownership_verifications` | Lease Management |
| [[ProtocolEvidence]] | `protocol_evidence` | Check-in/Check-out |
| [[AuditLog]] | `audit_logs` | Security & Compliance |
| [[AppConfig]] | `app_config` | System Settings |

## MongoDB Models

| Model | Collection | Domain |
|-------|-----------|--------|
| [[Message]] | `messages` | Chat |
| [[RentalContract]] | `rental_contracts` | Legacy Contracts |
| [[RentPayment]] | `rent_payments` | Legacy Payments |
| [[UserPreferences]] | `user_preferences` | Tenant Preferences |
| [[UserPoints]] | `user_points` | Gamification |
| [[IdentityVerification]] | `identity_verifications` | KYC |
| [[RoommateProfile]] | `roommate_profiles` | Roommate Matching |
| [[ServiceListing]] | `service_listings` | Marketplace |
| [[ServiceReview]] | `service_reviews` | Marketplace |
| [[CommercialLease]] | `commercial_leases` | Commercial |
| [[IoTDevice]] | `iot_devices` | Smart Building |
| [[MaintenanceTicket-Mongo]] | `maintenance_tickets` | Commercial Maintenance |
| [[SystemEvent]] | `system_events` | Logging |

## Redis Cache

See [[Redis Cache Patterns]]

## Relationship Maps

See [[DB Relationships]]

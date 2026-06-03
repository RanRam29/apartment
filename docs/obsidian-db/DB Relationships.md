---
tags: [db, relationships, erd]
---

# DB Relationships

## Core Flow: User -> Match -> Agreement

```
User (tenant) --swipes--> Apartment <--owns-- User (landlord)
        |                      |
        v                      v
      Swipe ----matched?----> Match
                                |
                                v
                         RentalAgreement
                          /    |     \
                AgreementParty |   AgreementRoom
                               |
                    LedgerRow / PaymentLedger
```

## Postgres Foreign Keys

### User Hub
- [[User]] `1:N` [[Apartment]] (via `landlordId`) — landlord owns apartments
- [[User]] `1:N` [[Swipe]] (via `tenantId`) — tenant swipes on apartments
- [[User]] `1:N` [[Match]] (via `tenantId`) — tenant side of match
- [[User]] `1:N` [[Match]] (via `landlordId`) — landlord side of match
- [[User]] `1:1` [[UserKycProfile]] (via `userId`) — KYC identity
- [[User]] `1:N` [[AgreementParty]] (via `userId`) — user in agreements

### Apartment Hub
- [[Apartment]] `N:1` [[User]] (via `landlordId`) — owned by landlord
- [[Apartment]] `1:N` [[Swipe]] (via `apartmentId`)
- [[Apartment]] `1:N` [[Match]] (via `apartmentId`)

### Match Triangle
- [[Match]] `N:1` [[User]] (tenant) via `tenantId`
- [[Match]] `N:1` [[User]] (landlord) via `landlordId`
- [[Match]] `N:1` [[Apartment]] via `apartmentId`
- **Unique constraint:** `(tenantId, apartmentId)`

### Rental Agreement Tree
- [[RentalAgreement]] `1:N` [[AgreementParty]] (via `agreementId`)
- [[RentalAgreement]] `1:N` [[AgreementRoom]] (via `agreementId`)
- [[RentalAgreement]] `1:N` [[LedgerRow]] (via `agreementId`)
- [[RentalAgreement]] `1:N` [[OwnershipVerification]] (via `agreementId`)
- [[RentalAgreement]] `1:N` [[ProtocolEvidence]] (via `agreementId`)

### Maintenance
- [[MaintenanceTicket-PG]] `1:N` [[TicketInvoice]] (via `ticketId`)

## MongoDB Cross-References (by string ID)

- [[Message]].`matchId` -> references Match.id (PG)
- [[RentalContract]].`tenantId`/`landlordId`/`apartmentId` -> references PG UUIDs
- [[RentPayment]].`contractId` -> references RentalContract._id (Mongo)
- [[UserPreferences]].`userId` -> references User.id (PG)
- [[UserPoints]].`userId` -> references User.id (PG)
- [[IdentityVerification]].`userId` -> references User.id (PG)
- [[RoommateProfile]].`userId` -> references User.id (PG)
- [[ServiceReview]].`serviceId` -> references ServiceListing._id (Mongo)

## Cascade Rules

| Parent | Child | On Delete |
|--------|-------|-----------|
| User | Apartment | CASCADE |
| User | Swipe | CASCADE |
| User | Match | CASCADE |
| User | UserKycProfile | CASCADE |
| User | AgreementParty | CASCADE |
| User | MaintenanceTicket | CASCADE |
| User | OwnershipVerification | CASCADE |
| Apartment | Swipe | CASCADE |
| Apartment | Match | CASCADE |
| RentalAgreement | AgreementParty | CASCADE |
| RentalAgreement | AgreementRoom | CASCADE |
| RentalAgreement | LedgerRow | CASCADE |
| RentalAgreement | OwnershipVerification | CASCADE |
| RentalAgreement | ProtocolEvidence | CASCADE |
| MaintenanceTicket | TicketInvoice | CASCADE |

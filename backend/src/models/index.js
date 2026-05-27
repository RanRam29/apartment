const User = require('./pg/User');
const Apartment = require('./pg/Apartment');
const Swipe = require('./pg/Swipe');
const Match = require('./pg/Match');
const AuditLog = require('./pg/AuditLog');
const RentalAgreement = require('./pg/RentalAgreement');
const PaymentLedger = require('./pg/PaymentLedger');
const AgreementGuarantor = require('./pg/AgreementGuarantor');
const MaintenanceTicket = require('./pg/MaintenanceTicket');
const ProtocolEvidence = require('./pg/ProtocolEvidence');
const UserKycProfile = require('./pg/UserKycProfile');
const AgreementParty = require('./pg/AgreementParty');
const AgreementRoom = require('./pg/AgreementRoom');
const OwnershipVerification = require('./pg/OwnershipVerification');
const UserPreferences = require('./mongo/UserPreferences');
const Message = require('./mongo/Message');
const SystemEvent = require('./mongo/SystemEvent');

// User → Apartments (landlord owns many apartments)
User.hasMany(Apartment, { foreignKey: 'landlordId', as: 'listings' });
Apartment.belongsTo(User, { foreignKey: 'landlordId', as: 'landlord' });

// User → Swipes (tenant swiped on many apartments)
User.hasMany(Swipe, { foreignKey: 'tenantId', as: 'swipes' });
Swipe.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });
Apartment.hasMany(Swipe, { foreignKey: 'apartmentId', as: 'swipes' });
Swipe.belongsTo(Apartment, { foreignKey: 'apartmentId', as: 'apartment' });

// User → Matches (tenant side)
User.hasMany(Match, { foreignKey: 'tenantId', as: 'tenantMatches' });
Match.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });

// User → Matches (landlord side)
User.hasMany(Match, { foreignKey: 'landlordId', as: 'landlordMatches' });
Match.belongsTo(User, { foreignKey: 'landlordId', as: 'landlord' });

// Apartment → Matches
Apartment.hasMany(Match, { foreignKey: 'apartmentId', as: 'matches' });
Match.belongsTo(Apartment, { foreignKey: 'apartmentId', as: 'apartment' });

// --- DirApp Lease Lifecycle Associations ---

// User → KYC Profile (one-to-one)
User.hasOne(UserKycProfile, { foreignKey: 'userId', as: 'kycProfile' });
UserKycProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User → RentalAgreements (landlord side)
User.hasMany(RentalAgreement, { foreignKey: 'landlordId', as: 'landlordAgreements' });
RentalAgreement.belongsTo(User, { foreignKey: 'landlordId', as: 'landlordUser' });

// User → RentalAgreements (tenant side)
User.hasMany(RentalAgreement, { foreignKey: 'tenantId', as: 'tenantAgreements' });
RentalAgreement.belongsTo(User, { foreignKey: 'tenantId', as: 'tenantUser' });

// Apartment → RentalAgreements
Apartment.hasMany(RentalAgreement, { foreignKey: 'propertyId', as: 'agreements' });
RentalAgreement.belongsTo(Apartment, { foreignKey: 'propertyId', as: 'property' });

// RentalAgreement → PaymentLedger
RentalAgreement.hasMany(PaymentLedger, { foreignKey: 'agreementId', as: 'ledgerEntries' });
PaymentLedger.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });

// RentalAgreement → AgreementGuarantors
RentalAgreement.hasMany(AgreementGuarantor, { foreignKey: 'agreementId', as: 'guarantors' });
AgreementGuarantor.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });
User.hasMany(AgreementGuarantor, { foreignKey: 'guarantorUserId', as: 'guarantorships' });
AgreementGuarantor.belongsTo(User, { foreignKey: 'guarantorUserId', as: 'guarantorUser' });

// RentalAgreement → MaintenanceTickets
RentalAgreement.hasMany(MaintenanceTicket, { foreignKey: 'agreementId', as: 'maintenanceTickets' });
MaintenanceTicket.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });

// RentalAgreement → ProtocolEvidence
RentalAgreement.hasMany(ProtocolEvidence, { foreignKey: 'agreementId', as: 'protocolEvidence' });
ProtocolEvidence.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });

// --- v3.0 Contract Lifecycle Associations ---

// RentalAgreement → AgreementParties (tenants + guarantors)
RentalAgreement.hasMany(AgreementParty, { foreignKey: 'agreementId', as: 'parties' });
AgreementParty.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });
User.hasMany(AgreementParty, { foreignKey: 'userId', as: 'agreementRoles' });
AgreementParty.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// RentalAgreement → AgreementRooms (check-in/out photos per room)
RentalAgreement.hasMany(AgreementRoom, { foreignKey: 'agreementId', as: 'rooms' });
AgreementRoom.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });

// RentalAgreement → OwnershipVerifications
RentalAgreement.hasMany(OwnershipVerification, { foreignKey: 'agreementId', as: 'ownershipVerifications' });
OwnershipVerification.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });

module.exports = {
  User,
  Apartment,
  Swipe,
  Match,
  AuditLog,
  RentalAgreement,
  PaymentLedger,
  AgreementGuarantor,
  MaintenanceTicket,
  ProtocolEvidence,
  UserKycProfile,
  AgreementParty,
  AgreementRoom,
  OwnershipVerification,
  UserPreferences,
  Message,
  SystemEvent,
};

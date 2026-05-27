const User = require('./pg/User');
const Apartment = require('./pg/Apartment');
const Swipe = require('./pg/Swipe');
const Match = require('./pg/Match');
const AuditLog = require('./pg/AuditLog');
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

// CASCADE associations
const UserKycProfile = require('./pg/UserKycProfile');
User.hasOne(UserKycProfile, { foreignKey: 'userId', as: 'kycProfile' });
UserKycProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const MaintenanceTicket = require('./pg/MaintenanceTicket');
const TicketInvoice = require('./pg/TicketInvoice');
MaintenanceTicket.hasMany(TicketInvoice, { foreignKey: 'ticketId', as: 'invoices' });
TicketInvoice.belongsTo(MaintenanceTicket, { foreignKey: 'ticketId', as: 'ticket' });

const AgreementGuarantor = require('./pg/AgreementGuarantor');

const RentalAgreement = require('./pg/RentalAgreement');
const LedgerRow = require('./pg/LedgerRow');
const AppConfig = require('./pg/AppConfig');

const AgreementParty = require('./pg/AgreementParty');
const AgreementRoom = require('./pg/AgreementRoom');
const OwnershipVerification = require('./pg/OwnershipVerification');

RentalAgreement.hasMany(LedgerRow, { foreignKey: 'agreementId', as: 'ledgerRows' });
LedgerRow.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });

RentalAgreement.hasMany(AgreementParty, { foreignKey: 'agreementId', as: 'parties' });
AgreementParty.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });
User.hasMany(AgreementParty, { foreignKey: 'userId', as: 'agreementRoles' });
AgreementParty.belongsTo(User, { foreignKey: 'userId', as: 'user' });

RentalAgreement.hasMany(AgreementRoom, { foreignKey: 'agreementId', as: 'rooms' });
AgreementRoom.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });

RentalAgreement.hasMany(OwnershipVerification, { foreignKey: 'agreementId', as: 'ownershipVerifications' });
OwnershipVerification.belongsTo(RentalAgreement, { foreignKey: 'agreementId', as: 'agreement' });

module.exports = {
  User,
  Apartment,
  Swipe,
  Match,
  AuditLog,
  UserPreferences,
  Message,
  SystemEvent,
  UserKycProfile,
  MaintenanceTicket,
  TicketInvoice,
  AgreementGuarantor,
  RentalAgreement,
  LedgerRow,
  AppConfig,
  AgreementParty,
  AgreementRoom,
  OwnershipVerification,
};


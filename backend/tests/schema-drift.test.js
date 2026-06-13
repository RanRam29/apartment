/**
 * C4 — Detect drift between Sequelize pg models and database.js ensure* boot helpers.
 * When ensure* adds a column, the matching model must declare it or sync will miss it on fresh DBs.
 */
const { Sequelize } = require('sequelize');
const {
  User,
  Apartment,
  RentalAgreement,
  UserKycProfile,
  ContractAmendment,
} = require('../src/models');

// Mirror database.js ensure* column maps (snake_case DB column names)
const ENSURE_USER_COLUMNS = [
  'verification_token',
  'verified_at',
  'tos_accepted_at',
  'google_id',
  'role_selected_at',
  'tos_version',
  'blocked_count',
  'is_locked',
  'active_role',
  'trust_score',
  'whatsapp_opt_in',
  'notification_preferences',
  'bio',
  'deletion_requested_at',
  'verification_token_expires_at',
  'onboarding_state',
];

const ENSURE_APARTMENT_COLUMNS = ['street', 'building_fee'];

const ENSURE_RENTAL_AGREEMENT_COLUMNS = [
  'tenant_id',
  'option_months',
  'option_notice_days',
  'habitability_declaration',
  'behavioral_clauses',
  'base_cpi_index',
  'tenant_signed_at',
  'checkin_unlocked_at',
];

const ENSURE_USER_KYC_COLUMNS = ['role_type'];

const ENSURE_CONTRACT_AMENDMENT_COLUMNS = [
  'contract_id',
  'proposed_by',
  'field',
  'old_value',
  'new_value',
  'reason',
  'status',
];

function dbColumnsForModel(Model) {
  return Object.entries(Model.rawAttributes)
    .filter(([, attr]) => attr.type?.key !== 'VIRTUAL')
    .map(([name, attr]) => attr.field || Sequelize.Utils.underscore(name));
}

function expectModelCoversColumns(Model, tableLabel, ensureColumns) {
  const modelColumns = new Set(dbColumnsForModel(Model));
  const missing = ensureColumns.filter((col) => !modelColumns.has(col));
  expect(missing).toEqual([]);
  if (missing.length) {
    throw new Error(
      `${tableLabel}: ensure* columns missing from model — ${missing.join(', ')}`
    );
  }
}

describe('Schema drift — pg models vs ensure*Columns()', () => {
  it('User covers ensureUserVerificationColumns()', () => {
    expectModelCoversColumns(User, 'users', ENSURE_USER_COLUMNS);
  });

  it('Apartment covers ensureApartmentStreetColumn()', () => {
    expectModelCoversColumns(Apartment, 'apartments', ENSURE_APARTMENT_COLUMNS);
  });

  it('RentalAgreement covers ensureRentalAgreementLifecycleColumns()', () => {
    expectModelCoversColumns(RentalAgreement, 'rental_agreements', ENSURE_RENTAL_AGREEMENT_COLUMNS);
  });

  it('UserKycProfile covers ensureUserKycRoleTypeColumn()', () => {
    expectModelCoversColumns(UserKycProfile, 'user_kyc_profiles', ENSURE_USER_KYC_COLUMNS);
  });

  it('ContractAmendment covers ensureContractAmendmentsTable()', () => {
    expectModelCoversColumns(ContractAmendment, 'contract_amendments', ENSURE_CONTRACT_AMENDMENT_COLUMNS);
  });
});

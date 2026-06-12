const { DataTypes, Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const databaseUrl = process.env.DATABASE_URL;
const useSSL =
  process.env.POSTGRES_SSL !== undefined
    ? process.env.POSTGRES_SSL !== 'false'
    : process.env.NODE_ENV !== 'test';
const rejectUnauthorized = process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false';

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      logging: (msg) => logger.debug(msg),
      dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized } } : {},
      pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
      define: { underscored: true, timestamps: true },
    })
  : new Sequelize({
      dialect: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'apartment_db',
      username: process.env.POSTGRES_USER || 'apartment_user',
      password: process.env.POSTGRES_PASSWORD || 'apartment_pass',
      logging: (msg) => logger.debug(msg),
      dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized } } : {},
      pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
      define: { underscored: true, timestamps: true },
    });

const USER_VERIFICATION_COLUMNS = {
  verification_token: { type: DataTypes.STRING(128), allowNull: true },
  verified_at: { type: DataTypes.DATE, allowNull: true },
};

// v3.0 columns added by Cascade (multi-tenant, ToS, blocking)
const USER_V3_COLUMNS = {
  tos_accepted_at: { type: DataTypes.DATE, allowNull: true },
  tos_version: { type: DataTypes.STRING(20), allowNull: true },
  blocked_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  active_role: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'tenant' },
  trust_score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 },
  whatsapp_opt_in: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  notification_preferences: { type: DataTypes.JSONB, allowNull: true, defaultValue: { push: true, email: true, paymentReminders: true, maintenance: true, whatsapp: false } },
  bio: { type: DataTypes.TEXT, allowNull: true },
  deletion_requested_at: { type: DataTypes.DATE, allowNull: true },
};
const APARTMENT_STREET_COLUMN = {
  street: { type: DataTypes.STRING(100), allowNull: true },
  building_fee: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
};

function isMissingUsersTableError(err) {
  const message = String(err?.message || '');
  return /users.*does not exist|relation "users" does not exist|No description found/i.test(message);
}

async function ensureUserVerificationColumns(queryInterface = sequelize.getQueryInterface()) {
  let usersTable;
  try {
    usersTable = await queryInterface.describeTable('users');
  } catch (err) {
    if (isMissingUsersTableError(err)) {
      return;
    }
    throw err;
  }

  const allUserColumns = { ...USER_VERIFICATION_COLUMNS, ...USER_V3_COLUMNS };
  for (const [columnName, definition] of Object.entries(allUserColumns)) {
    if (!usersTable[columnName]) {
      await queryInterface.addColumn('users', columnName, definition);
      logger.info(`Added missing users.${columnName} column`);
    }
  }
}

function isMissingApartmentsTableError(err) {
  const message = String(err?.message || '');
  return /apartments.*does not exist|relation "apartments" does not exist|No description found/i.test(message);
}

function isDuplicateColumnError(err) {
  const code = err?.parent?.code || err?.original?.code || err?.code;
  const message = String(err?.message || '');
  return code === '42701' || /column .* already exists|duplicate column/i.test(message);
}

function isMissingColumnError(err, columnName) {
  const code = err?.parent?.code || err?.original?.code || err?.code;
  const message = String(err?.message || '');
  return (
    code === '42703' ||
    new RegExp(`column .*${columnName}.* does not exist`, 'i').test(message) ||
    new RegExp(`${columnName}.* does not exist`, 'i').test(message)
  );
}

async function ensureApartmentStreetColumn(queryInterface = sequelize.getQueryInterface()) {
  let apartmentsTable;
  try {
    apartmentsTable = await queryInterface.describeTable('apartments');
  } catch (err) {
    if (isMissingApartmentsTableError(err)) {
      return;
    }
    throw err;
  }

  for (const [columnName, definition] of Object.entries(APARTMENT_STREET_COLUMN)) {
    if (!apartmentsTable[columnName]) {
      try {
        await queryInterface.addColumn('apartments', columnName, definition);
        logger.info(`Added missing apartments.${columnName} column`);
      } catch (err) {
        if (!isDuplicateColumnError(err)) {
          throw err;
        }
        logger.info(`apartments.${columnName} column already added by another instance`);
      }
    }
  }

  // One-time backfill + schema cleanup from legacy neighborhood column.
  if (apartmentsTable.neighborhood) {
    try {
      await sequelize.query(`
        UPDATE apartments
        SET street = neighborhood
        WHERE street IS NULL
          AND neighborhood IS NOT NULL
      `);
      await queryInterface.removeColumn('apartments', 'neighborhood');
      logger.info('Dropped legacy apartments.neighborhood column after backfill');
    } catch (err) {
      if (!isMissingColumnError(err, 'neighborhood')) {
        throw err;
      }
      logger.info('Legacy apartments.neighborhood column was already removed by another instance');
    }
  }
}

async function ensureContractAmendmentsTable(queryInterface = sequelize.getQueryInterface()) {
  try {
    await queryInterface.describeTable('contract_amendments');
  } catch (err) {
    await queryInterface.createTable('contract_amendments', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      contract_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'rental_agreements', key: 'id' }, onDelete: 'CASCADE' },
      proposed_by: { type: DataTypes.ENUM('tenant', 'landlord'), allowNull: false },
      field: { type: DataTypes.STRING(50), allowNull: false },
      old_value: { type: DataTypes.STRING(256), allowNull: false },
      new_value: { type: DataTypes.STRING(256), allowNull: false },
      reason: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    logger.info('Created missing contract_amendments table dynamically');
  }
}

const RENTAL_AGREEMENT_LIFECYCLE_COLUMNS = {
  tenant_id: { type: DataTypes.UUID, allowNull: true },
  option_months: { type: DataTypes.INTEGER, allowNull: true },
  option_notice_days: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 60 },
  habitability_declaration: { type: DataTypes.JSONB, allowNull: true },
  behavioral_clauses: { type: DataTypes.JSONB, allowNull: true },
  base_cpi_index: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
  tenant_signed_at: { type: DataTypes.DATE, allowNull: true },
  checkin_unlocked_at: { type: DataTypes.DATE, allowNull: true },
};

const USER_KYC_ROLE_TYPE_COLUMN = {
  role_type: { type: DataTypes.STRING(20), allowNull: true },
};

async function ensureRentalAgreementLifecycleColumns(queryInterface = sequelize.getQueryInterface()) {
  let table;
  try {
    table = await queryInterface.describeTable('rental_agreements');
  } catch (err) {
    if (isMissingUsersTableError(err)) return;
    throw err;
  }

  for (const [columnName, definition] of Object.entries(RENTAL_AGREEMENT_LIFECYCLE_COLUMNS)) {
    if (!table[columnName]) {
      try {
        await queryInterface.addColumn('rental_agreements', columnName, definition);
        logger.info(`Added missing rental_agreements.${columnName} column`);
      } catch (err) {
        if (!isDuplicateColumnError(err)) throw err;
      }
    }
  }

  // Legacy ENUM (UPLOAD, PENDING_SIGN, …) → VARCHAR for new lifecycle values
  if (table.status?.type && /enum/i.test(String(table.status.type))) {
    try {
      await sequelize.query(`
        ALTER TABLE rental_agreements
        ALTER COLUMN status TYPE VARCHAR(30)
        USING status::text
      `);
      logger.info('Migrated rental_agreements.status from ENUM to VARCHAR(30)');
    } catch (err) {
      logger.warn(`rental_agreements.status migration skipped: ${err.message}`);
    }
  }
}

async function ensureUserKycRoleTypeColumn(queryInterface = sequelize.getQueryInterface()) {
  let table;
  try {
    table = await queryInterface.describeTable('user_kyc_profiles');
  } catch (err) {
    return;
  }

  for (const [columnName, definition] of Object.entries(USER_KYC_ROLE_TYPE_COLUMN)) {
    if (!table[columnName]) {
      try {
        await queryInterface.addColumn('user_kyc_profiles', columnName, definition);
        logger.info(`Added missing user_kyc_profiles.${columnName} column`);
      } catch (err) {
        if (!isDuplicateColumnError(err)) throw err;
      }
    }
  }
}

async function initPostgres() {
  await sequelize.authenticate();
  await ensureUserVerificationColumns();
  await ensureApartmentStreetColumn();
  await ensureContractAmendmentsTable();
  await ensureRentalAgreementLifecycleColumns();
  await ensureUserKycRoleTypeColumn();
  const syncAlter =
    process.env.NODE_ENV === 'development' ||
    process.env.POSTGRES_SYNC_ALTER === 'true';
  await sequelize.sync({ alter: syncAlter });

  // Seed all AppConfig defaults (preserves existing values)
  const AppConfig = require('../models/pg/AppConfig');
  await AppConfig.seedAppConfig();
  logger.info('PostgreSQL connected, synced, and AppConfig seeded');
}

module.exports = {
  sequelize,
  initPostgres,
  ensureUserVerificationColumns,
  ensureApartmentStreetColumn,
  ensureContractAmendmentsTable,
  ensureRentalAgreementLifecycleColumns,
  ensureUserKycRoleTypeColumn,
};


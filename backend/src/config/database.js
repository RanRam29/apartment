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
};
const APARTMENT_STREET_COLUMN = {
  street: { type: DataTypes.STRING(100), allowNull: true },
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
      await queryInterface.addColumn('apartments', columnName, definition);
      logger.info(`Added missing apartments.${columnName} column`);
    }
  }

  // One-time backfill + schema cleanup from legacy neighborhood column.
  if (apartmentsTable.neighborhood) {
    await sequelize.query(`
      UPDATE apartments
      SET street = neighborhood
      WHERE street IS NULL
        AND neighborhood IS NOT NULL
    `);
    await queryInterface.removeColumn('apartments', 'neighborhood');
    logger.info('Dropped legacy apartments.neighborhood column after backfill');
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

async function initPostgres() {
  await sequelize.authenticate();
  await ensureUserVerificationColumns();
  await ensureApartmentStreetColumn();
  await ensureContractAmendmentsTable();
  const syncAlter =
    process.env.NODE_ENV === 'development' ||
    process.env.POSTGRES_SYNC_ALTER === 'true';
  await sequelize.sync({ alter: syncAlter });

  // Seed all AppConfig defaults (preserves existing values)
  const AppConfig = require('../models/pg/AppConfig');
  await AppConfig.seedAppConfig();
  logger.info('PostgreSQL connected, synced, and AppConfig seeded');
}

module.exports = { sequelize, initPostgres, ensureUserVerificationColumns, ensureApartmentStreetColumn, ensureContractAmendmentsTable };


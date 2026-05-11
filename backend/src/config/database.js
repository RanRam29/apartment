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

  for (const [columnName, definition] of Object.entries(USER_VERIFICATION_COLUMNS)) {
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

async function initPostgres() {
  await sequelize.authenticate();
  await ensureUserVerificationColumns();
  await ensureApartmentStreetColumn();
  const syncAlter =
    process.env.NODE_ENV === 'development' ||
    process.env.POSTGRES_SYNC_ALTER === 'true';
  await sequelize.sync({ alter: syncAlter });
  logger.info('PostgreSQL connected and synced');
}

module.exports = { sequelize, initPostgres, ensureUserVerificationColumns, ensureApartmentStreetColumn };

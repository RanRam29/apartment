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

async function ensureApartmentStreetColumn(queryInterface = sequelize.getQueryInterface(), database = sequelize) {
  let apartmentsTable;
  try {
    apartmentsTable = await queryInterface.describeTable('apartments');
  } catch (err) {
    if (isMissingApartmentsTableError(err)) {
      return;
    }
    throw err;
  }

  if (!apartmentsTable.street) {
    await database.query(`
      ALTER TABLE "apartments"
      ADD COLUMN IF NOT EXISTS "street" VARCHAR(100)
    `);
    logger.info('Added missing apartments.street column');
  }

  // One-time backfill + schema cleanup from legacy neighborhood column.
  if (apartmentsTable.neighborhood) {
    await database.query(`
      UPDATE "apartments"
      SET "street" = "neighborhood"
      WHERE NULLIF(TRIM("street"), '') IS NULL
        AND NULLIF(TRIM("neighborhood"), '') IS NOT NULL
    `);
    await database.query(`
      ALTER TABLE "apartments"
      DROP COLUMN IF EXISTS "neighborhood"
    `);
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

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Neon / hosted Postgres provide a full URL; local/K8s use separate vars
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
      logging: (msg) => logger.debug(msg),
      pool: { max: 10, min: 1, acquire: 30000, idle: 10000 },
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
      pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
      define: { underscored: true, timestamps: true },
    });

async function initPostgres() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  logger.info('PostgreSQL connected and synced');
}

module.exports = { sequelize, initPostgres };

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || 'apartment_db',
  username: process.env.POSTGRES_USER || 'apartment_user',
  password: process.env.POSTGRES_PASSWORD || 'apartment_pass',
  logging: (msg) => logger.debug(msg),
  pool: {
    max: 20,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    underscored: true,
    timestamps: true,
  },
});

async function initPostgres() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  logger.info('PostgreSQL connected and synced');
}

module.exports = { sequelize, initPostgres };

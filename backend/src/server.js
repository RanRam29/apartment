require('dotenv').config();

const { getJwtSecret } = require('./config/security');
const logger = require('./utils/logger');

const requireJwtAtBoot =
  process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

if (requireJwtAtBoot) {
  try {
    getJwtSecret();
  } catch (err) {
    logger.error('FATAL: Cannot start API — JWT_SECRET is missing or invalid.');
    logger.error(err.message);
    logger.error(
      'Fix: Render → Web Service → Environment → add JWT_SECRET (≥20 chars). Blueprint uses generateValue; manual services must set it. Example: openssl rand -base64 32'
    );
    process.exit(1);
  }
}

const app = require('./app');
const { initPostgres } = require('./config/database');
const { initMongoDB } = require('./config/mongodb');
const { initRedis } = require('./config/redis');
const { initKafka } = require('./config/kafka');
const { initSocket } = require('./config/socket');
const { autoSeed } = require('./seeders/demo');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initPostgres();
    await autoSeed();
    // MongoDB and Redis are soft dependencies — server starts even if unavailable
    await initMongoDB().catch((err) =>
      logger.warn('MongoDB unavailable, document-store features disabled:', err.message)
    );
    await initRedis();
    // Kafka is optional — not available in free-tier deployments (Render, etc.)
    await initKafka().catch((err) =>
      logger.warn('Kafka unavailable, running without event streaming:', err.message)
    );

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
    initSocket(server);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

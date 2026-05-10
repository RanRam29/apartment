require('dotenv').config();
const app = require('./app');
const { initPostgres } = require('./config/database');
const { initMongoDB } = require('./config/mongodb');
const { initRedis } = require('./config/redis');
const { initKafka } = require('./config/kafka');
const { initSocket } = require('./config/socket');
const { autoSeed } = require('./seeders/demo');
const logger = require('./utils/logger');

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

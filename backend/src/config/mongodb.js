const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function initMongoDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/apartment_preferences';
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  logger.info('MongoDB connected');
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

module.exports = { mongoose, initMongoDB };

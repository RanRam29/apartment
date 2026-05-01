const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

async function initRedis() {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    maxRetriesPerRequest: 3,
  });

  await new Promise((resolve, reject) => {
    redisClient.on('ready', () => {
      logger.info('Redis connected');
      resolve();
    });
    redisClient.on('error', reject);
  });
}

function getRedisClient() {
  if (!redisClient) throw new Error('Redis not initialized');
  return redisClient;
}

async function cacheGet(key) {
  const value = await getRedisClient().get(key);
  return value ? JSON.parse(value) : null;
}

async function cacheSet(key, value, ttlSeconds = 300) {
  await getRedisClient().setex(key, ttlSeconds, JSON.stringify(value));
}

async function cacheDel(key) {
  await getRedisClient().del(key);
}

module.exports = { initRedis, getRedisClient, cacheGet, cacheSet, cacheDel };

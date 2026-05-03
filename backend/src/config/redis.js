const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

async function initRedis() {
  const redisOpts = {
    retryStrategy: (times) => Math.min(times * 100, 3000),
    maxRetriesPerRequest: 3,
  };

  // Upstash (and other hosted Redis) provide a full URL; fall back to host/port for local/K8s
  redisClient = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisOpts)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        ...redisOpts,
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

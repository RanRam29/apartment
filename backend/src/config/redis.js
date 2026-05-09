const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

function createInMemoryRedis() {
  const store = new Map();
  return {
    disconnect: () => {},
    get: async (key) => {
      const value = store.get(key);
      return value === undefined ? null : String(value);
    },
    setex: async (key, _ttl, value) => {
      store.set(key, value);
      return 'OK';
    },
    del: async (key) => {
      store.delete(key);
      return 1;
    },
    incr: async (key) => {
      const current = Number(store.get(key) || 0) + 1;
      store.set(key, current);
      return current;
    },
    decr: async (key) => {
      const current = Math.max(0, Number(store.get(key) || 0) - 1);
      store.set(key, current);
      return current;
    },
    expireat: async () => 1,
  };
}

async function initRedis() {
  if (process.env.NODE_ENV === 'test') {
    redisClient = createInMemoryRedis();
    logger.info('Redis (in-memory) initialized for tests');
    return;
  }

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

  const redisConnection = redisClient;

  await new Promise((resolve) => {
    let initialized = false;
    let fellBack = false;
    let timeout;

    const cleanupStartupListeners = () => {
      clearTimeout(timeout);
      redisConnection.off('ready', onReady);
      redisConnection.off('error', onError);
    };

    const onRuntimeError = (err) => {
      logger.warn('Redis runtime error:', err?.message);
    };

    const fallbackToMemory = (message, err) => {
      if (fellBack) return;
      fellBack = true;
      cleanupStartupListeners();
      redisConnection.disconnect();
      redisClient = createInMemoryRedis();
      logger.warn(message, err?.message);
      if (!initialized) {
        initialized = true;
        resolve();
      }
    };

    const onReady = () => {
      if (initialized) return;
      initialized = true;
      cleanupStartupListeners();
      redisConnection.on('error', onRuntimeError);
      logger.info('Redis connected');
      resolve();
    };

    const onError = (err) => {
      fallbackToMemory('Redis connection error — falling back to in-memory store:', err);
    };

    timeout = setTimeout(() => {
      fallbackToMemory('Redis unavailable — falling back to in-memory store');
    }, 4000);

    redisConnection.on('ready', onReady);
    redisConnection.on('error', onError);
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

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
    del: async (...keys) => {
      let deleted = 0;
      for (const key of keys) {
        if (store.delete(key)) deleted += 1;
      }
      return deleted;
    },
    scan: async (cursor, _matchKeyword, pattern) => {
      if (cursor !== '0') return ['0', []];
      const keys = Array.from(store.keys());
      const regex = new RegExp(`^${String(pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
      return ['0', keys.filter((key) => regex.test(key))];
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

function isRedisAvailabilityError(err) {
  const text = `${err?.name || ''} ${err?.code || ''} ${err?.message || ''}`;
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EPIPE|ENOTFOUND|MaxRetriesPerRequest|Connection is closed|Connection is not writable|Stream isn't writeable|Reached the max retries/i.test(text);
}

function createResilientRedis(redisConnection) {
  const resilientClient = {};

  const runCommand = async (method, args) => {
    try {
      return await redisConnection[method](...args);
    } catch (err) {
      if (!isRedisAvailabilityError(err)) {
        throw err;
      }

      if (redisClient === resilientClient) {
        redisConnection.disconnect();
        redisClient = createInMemoryRedis();
        logger.warn('Redis command failed — falling back to in-memory store:', err?.message);
      }

      return getRedisClient()[method](...args);
    }
  };

  for (const method of ['get', 'setex', 'del', 'scan', 'incr', 'decr', 'expireat']) {
    resilientClient[method] = (...args) => runCommand(method, args);
  }
  resilientClient.disconnect = () => redisConnection.disconnect();

  return resilientClient;
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
  const redisConnection = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisOpts)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        ...redisOpts,
      });
  redisClient = createResilientRedis(redisConnection);

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

async function cacheDelPattern(pattern) {
  const client = getRedisClient();
  let cursor = '0';
  do {
    const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length) {
      await client.del(...keys);
    }
  } while (cursor !== '0');
}

module.exports = { initRedis, getRedisClient, cacheGet, cacheSet, cacheDel, cacheDelPattern };

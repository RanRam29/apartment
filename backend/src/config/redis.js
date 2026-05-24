const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

function createInMemoryRedis() {
  const store = new Map();

  const getRecord = (key) => {
    const record = store.get(key);
    if (!record) return undefined;
    if (record.expiresAt !== undefined && record.expiresAt <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    return record;
  };

  const setRecord = (key, value, expiresAt) => {
    store.set(key, { value, expiresAt });
  };

  return {
    disconnect: () => {},
    get: async (key) => {
      const record = getRecord(key);
      return record === undefined ? null : String(record.value);
    },
    setex: async (key, ttl, value) => {
      const ttlSeconds = Number(ttl);
      const expiresAt = Date.now() + ttlSeconds * 1000;
      if (!Number.isFinite(expiresAt) || ttlSeconds <= 0) {
        store.delete(key);
        return 'OK';
      }
      setRecord(key, value, expiresAt);
      return 'OK';
    },
    del: async (key) => {
      getRecord(key);
      return store.delete(key) ? 1 : 0;
    },
    incr: async (key) => {
      const record = getRecord(key);
      const current = Number(record?.value || 0) + 1;
      setRecord(key, current, record?.expiresAt);
      return current;
    },
    decr: async (key) => {
      const record = getRecord(key);
      const current = Math.max(0, Number(record?.value || 0) - 1);
      setRecord(key, current, record?.expiresAt);
      return current;
    },
    expireat: async (key, timestampSeconds) => {
      const record = getRecord(key);
      if (!record) return 0;

      const expiresAt = Number(timestampSeconds) * 1000;
      if (!Number.isFinite(expiresAt)) return 0;
      if (expiresAt <= Date.now()) {
        store.delete(key);
        return 1;
      }

      record.expiresAt = expiresAt;
      return 1;
    },
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

  for (const method of ['get', 'setex', 'del', 'incr', 'decr', 'expireat']) {
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

module.exports = { initRedis, getRedisClient, cacheGet, cacheSet, cacheDel };

describe('Redis fallback', () => {
  let originalNodeEnv;
  let originalRedisUrl;
  let originalRedisHost;
  let originalRedisPort;
  let originalRedisPassword;

  beforeEach(() => {
    jest.resetModules();
    originalNodeEnv = process.env.NODE_ENV;
    originalRedisUrl = process.env.REDIS_URL;
    originalRedisHost = process.env.REDIS_HOST;
    originalRedisPort = process.env.REDIS_PORT;
    originalRedisPassword = process.env.REDIS_PASSWORD;
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedisUrl;
    if (originalRedisHost === undefined) delete process.env.REDIS_HOST;
    else process.env.REDIS_HOST = originalRedisHost;
    if (originalRedisPort === undefined) delete process.env.REDIS_PORT;
    else process.env.REDIS_PORT = originalRedisPort;
    if (originalRedisPassword === undefined) delete process.env.REDIS_PASSWORD;
    else process.env.REDIS_PASSWORD = originalRedisPassword;
    jest.dontMock('ioredis');
    jest.dontMock('../src/utils/logger');
    jest.resetModules();
  });

  it('disconnects the failed client so fallback writes are not wiped by retries', async () => {
    const EventEmitter = require('events');
    const clients = [];

    jest.doMock('ioredis', () =>
      jest.fn(() => {
        const client = new EventEmitter();
        client.disconnect = jest.fn();
        clients.push(client);
        return client;
      })
    );
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    const { initRedis, cacheGet, cacheSet } = require('../src/config/redis');
    const initPromise = initRedis();

    clients[0].emit('error', new Error('ECONNREFUSED'));
    await initPromise;

    await cacheSet('swipes:daily:user-1:2026-05-09', { count: 1 });

    expect(clients[0].disconnect).toHaveBeenCalledTimes(1);
    expect(clients[0].listenerCount('error')).toBe(0);
    await expect(cacheGet('swipes:daily:user-1:2026-05-09')).resolves.toEqual({ count: 1 });
  });

  it('deletes all in-memory keys matching a cache pattern', async () => {
    process.env.NODE_ENV = 'test';

    const { initRedis, cacheGet, cacheSet, cacheDelPattern } = require('../src/config/redis');
    await initRedis();

    await cacheSet('feed:v2:tenant-1:all:0:99999:all:1', { stale: true });
    await cacheSet('feed:v2:tenant-2:Tel Aviv:0:99999:all:1', { stale: true });
    await cacheSet('landlord:dashboard:landlord-1', { keep: true });

    await cacheDelPattern('feed:v2:*');

    await expect(cacheGet('feed:v2:tenant-1:all:0:99999:all:1')).resolves.toBeNull();
    await expect(cacheGet('feed:v2:tenant-2:Tel Aviv:0:99999:all:1')).resolves.toBeNull();
    await expect(cacheGet('landlord:dashboard:landlord-1')).resolves.toEqual({ keep: true });
  });

  it('keeps the connected Redis client after a transient runtime error', async () => {
    const EventEmitter = require('events');
    const clients = [];

    jest.doMock('ioredis', () =>
      jest.fn(() => {
        const store = new Map();
        const client = new EventEmitter();
        client.disconnect = jest.fn();
        client.get = jest.fn(async (key) => store.get(key) ?? null);
        client.setex = jest.fn(async (key, _ttl, value) => {
          store.set(key, value);
          return 'OK';
        });
        clients.push(client);
        return client;
      })
    );
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    const { initRedis, cacheGet, cacheSet } = require('../src/config/redis');
    const initPromise = initRedis();

    clients[0].emit('ready');
    await initPromise;

    clients[0].emit('error', new Error('ECONNRESET'));
    await cacheSet('feed:test', { ok: true });

    expect(clients[0].disconnect).not.toHaveBeenCalled();
    expect(clients[0].setex).toHaveBeenCalledWith('feed:test', 300, JSON.stringify({ ok: true }));
    await expect(cacheGet('feed:test')).resolves.toEqual({ ok: true });
  });

  it('falls back to in-memory storage when ready Redis commands lose the connection', async () => {
    const EventEmitter = require('events');
    const clients = [];

    jest.doMock('ioredis', () =>
      jest.fn(() => {
        const client = new EventEmitter();
        const unavailable = Object.assign(
          new Error('Reached the max retries per request limit'),
          { name: 'MaxRetriesPerRequestError' }
        );
        client.disconnect = jest.fn();
        client.get = jest.fn(async () => {
          throw unavailable;
        });
        client.incr = jest.fn(async () => {
          throw unavailable;
        });
        clients.push(client);
        return client;
      })
    );
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    const { initRedis, getRedisClient, cacheGet, cacheSet } = require('../src/config/redis');
    const initPromise = initRedis();

    clients[0].emit('ready');
    await initPromise;

    const liveClient = getRedisClient();
    await expect(cacheGet('feed:test')).resolves.toBeNull();
    expect(clients[0].disconnect).toHaveBeenCalledTimes(1);

    await cacheSet('feed:test', { ok: true });
    await expect(cacheGet('feed:test')).resolves.toEqual({ ok: true });
    await expect(liveClient.incr('swipes:daily:user-1:2026-05-09')).resolves.toBe(1);
  });

  it('does not hide non-availability Redis command errors', async () => {
    const EventEmitter = require('events');
    const clients = [];

    jest.doMock('ioredis', () =>
      jest.fn(() => {
        const client = new EventEmitter();
        client.disconnect = jest.fn();
        client.get = jest.fn(async () => {
          throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
        });
        clients.push(client);
        return client;
      })
    );
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    const { initRedis, cacheGet } = require('../src/config/redis');
    const initPromise = initRedis();

    clients[0].emit('ready');
    await initPromise;

    await expect(cacheGet('feed:test')).rejects.toThrow('WRONGTYPE');
    expect(clients[0].disconnect).not.toHaveBeenCalled();
  });
});

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
});

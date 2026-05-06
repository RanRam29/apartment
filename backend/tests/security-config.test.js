const request = require('supertest');

describe('Security configuration', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.CLIENT_ORIGIN;
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_SSL;
  });

  it('uses a non-wildcard CORS origin when credentials are enabled', async () => {
    delete process.env.CLIENT_ORIGIN;

    const app = require('../src/app');
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example');

    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  }, 15_000);

  it('enforces postgres TLS certificate validation by default', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@db.example:5432/apartment_db';
    process.env.POSTGRES_SSL = 'true';

    const { sequelize } = require('../src/config/database');
    expect(sequelize.options.dialectOptions.ssl.rejectUnauthorized).toBe(true);
  });

  it('rejects missing or placeholder JWT secrets', () => {
    delete process.env.JWT_SECRET;
    let { getJwtSecret } = require('../src/config/security');
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');

    jest.resetModules();
    process.env.JWT_SECRET = 'your_super_secret_jwt_key_change_in_production';
    ({ getJwtSecret } = require('../src/config/security'));
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
  });
});

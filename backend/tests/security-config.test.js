const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Security configuration', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.CLIENT_ORIGIN;
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_SSL;
    delete process.env.JWT_SECRET;
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

  it('uses the normalized JWT secret for socket authentication', () => {
    const normalizedSecret = 'socket-test-secret-with-enough-length';
    process.env.JWT_SECRET = `"${normalizedSecret}"`;
    const token = jwt.sign({ id: 'user-1', role: 'tenant' }, normalizedSecret);

    const { verifySocketToken } = require('../src/config/socket');

    expect(verifySocketToken(token)).toEqual(
      expect.objectContaining({ id: 'user-1', role: 'tenant' })
    );
  });
});

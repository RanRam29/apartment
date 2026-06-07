describe('API security config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects insecure HTTP API URLs in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.EXPO_PUBLIC_API_URL = 'http://api.example.com';

    const { getApiBaseUrl } = require('../src/services/apiConfig');
    expect(() => getApiBaseUrl()).toThrow('EXPO_PUBLIC_API_URL');
  });
});

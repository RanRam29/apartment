const request = require('supertest');
const app = require('../src/app');

describe('Admin logs API', () => {
  it('blocks unauthenticated access', async () => {
    const res = await request(app).get('/api/admin/logs/audit');
    expect(res.status).toBe(401);
  });
});

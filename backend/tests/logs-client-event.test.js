const request = require('supertest');
const app = require('../src/app');

describe('POST /api/logs/client-event', () => {
  it('accepts anonymous client events', async () => {
    const res = await request(app)
      .post('/api/logs/client-event')
      .send({
        level: 'info',
        event: 'client.test.event',
        message: 'test',
        metadata: { source: 'jest' },
      });

    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(true);
  });
});

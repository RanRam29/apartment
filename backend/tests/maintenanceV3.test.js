process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';
jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({ bucket: 'test-bucket', key: 'test-key' }),
  getPresignedUrl: jest.fn().mockResolvedValue('https://dummy-presigned-url.com'),
  BUCKETS: {
    PROPERTY_IMAGES: 'property-images',
    CONTRACT_DOCS: 'contract-docs',
    CHECKIN_PHOTOS: 'checkin-photos',
    PAYMENT_RECEIPTS: 'payment-receipts',
    ARCHIVE: 'archive',
  }
}));

const request = require('supertest');
const app = require('../src/app');
const { User, MaintenanceTicket, TicketInvoice } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');

describe('Maintenance Ticket Flow (M15)', () => {
  let tenantToken = '';
  let landlordToken = '';
  let tenant = null;
  let landlord = null;
  let ticketId = '';
  const agreementId = '00000000-0000-4000-9000-000000000001'; // Mock agreement ID

  beforeAll(async () => {
    await sequelize.getQueryInterface().dropTable('ticket_invoices').catch(() => {});
    await sequelize.getQueryInterface().dropTable('maintenance_tickets').catch(() => {});

    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    const password = 'Password123!';

    // Register landlord
    const landlordEmail = `landlord-${Date.now()}@example.com`;
    const llRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: landlordEmail,
        password,
        firstName: 'Landlord',
        lastName: 'User',
        role: 'landlord',
      });
    landlordToken = llRes.body.token;
    landlord = await User.findOne({ where: { email: landlordEmail } });
    await landlord.update({ isVerified: true });

    // Register tenant
    const tenantEmail = `tenant-${Date.now()}@example.com`;
    const tRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: tenantEmail,
        password,
        firstName: 'Tenant',
        lastName: 'User',
        role: 'tenant',
      });
    tenantToken = tRes.body.token;
    tenant = await User.findOne({ where: { email: tenantEmail } });
    await tenant.update({ isVerified: true });
  });

  it('allows tenant to open a maintenance ticket', async () => {
    const res = await request(app)
      .post('/api/v3/maintenance')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        agreementId,
        description: 'The kitchen sink is leaking heavily.',
      });
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('The kitchen sink is leaking heavily.');
    expect(res.body.status).toBe('OPEN');
    ticketId = res.body.id;
  });

  it('allows listing tickets for an agreement', async () => {
    const res = await request(app)
      .get(`/api/v3/maintenance/agreement/${agreementId}`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(ticketId);
  });

  it('allows landlord to respond to the ticket', async () => {
    const res = await request(app)
      .post(`/api/v3/maintenance/${ticketId}/respond`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        response: 'technician',
        note: 'Plumber will arrive on Thursday morning.',
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
    expect(res.body.landlordResponse).toBe('technician');
    expect(res.body.landlordNote).toBe('Plumber will arrive on Thursday morning.');
  });

  it('allows landlord to upload an invoice for the ticket', async () => {
    // We upload a mock file to test multipart handling
    const res = await request(app)
      .post(`/api/v3/maintenance/${ticketId}/invoice`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .attach('invoice', Buffer.from('mock pdf invoice content'), 'receipt.pdf')
      .field('amount', '350.00')
      .field('payer', 'landlord');
    
    expect(res.status).toBe(201);
    expect(parseFloat(res.body.amount)).toBe(350.00);
    expect(res.body.payer).toBe('landlord');

    // Verify ticket status is WAITING_INVOICE
    const ticket = await MaintenanceTicket.findByPk(ticketId);
    expect(ticket.status).toBe('WAITING_INVOICE');
  });

  it('allows tenant to close the ticket', async () => {
    const res = await request(app)
      .post(`/api/v3/maintenance/${ticketId}/close`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CLOSED');
  });

  afterAll(async () => {
    await sequelize.close();
  });
});


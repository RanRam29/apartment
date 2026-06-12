process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

jest.mock('../src/config/redis', () => {
  const store = new Map();
  const mockClient = { disconnect: jest.fn() };
  return {
    initRedis: jest.fn().mockResolvedValue(undefined),
    getRedisClient: jest.fn(() => mockClient),
    cacheGet: jest.fn(async (key) => {
      const value = store.get(key);
      return value === undefined ? null : value;
    }),
    cacheSet: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    cacheDel: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

jest.mock('../src/services/r2Service', () => ({
  uploadFile: jest.fn().mockResolvedValue({ bucket: 'payment-receipts', key: 'mock-receipt.pdf' }),
  getPresignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/mock-receipt.pdf'),
  BUCKETS: {
    CONTRACT_DOCS: 'contract-docs',
    CHECKIN_PHOTOS: 'checkin-photos',
    PAYMENT_RECEIPTS: 'payment-receipts',
  },
}));

const request = require('supertest');
const { sequelize, ensureUserVerificationColumns } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const {
  User,
  Apartment,
  RentalAgreement,
  AgreementParty,
  LedgerRow,
} = require('../src/models');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

const password = generateStrongTestPassword();

let ownerLandlord;
let ownerLandlordToken;
let tenantParty;
let tenantPartyToken;
let strangerTenant;
let strangerTenantToken;
let strangerLandlord;
let strangerLandlordToken;
let agreement;
let ledgerRow;
let generateAgreement;

async function registerUser({ email, role, firstName, lastName }) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, firstName, lastName, role });
  expect(res.status).toBe(201);
  const user = await User.findByPk(res.body.user.id);
  await user.update({ isVerified: true, tosAcceptedAt: new Date() });
  return { user, token: res.body.token };
}

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    ensureUserVerificationColumns(),
    initRedis(),
  ]);

  const ts = Date.now();

  ({ user: ownerLandlord, token: ownerLandlordToken } = await registerUser({
    email: `ll-owner-${ts}@test.com`,
    role: 'landlord',
    firstName: 'Owner',
    lastName: 'Landlord',
  }));

  ({ user: tenantParty, token: tenantPartyToken } = await registerUser({
    email: `tn-party-${ts}@test.com`,
    role: 'tenant',
    firstName: 'Party',
    lastName: 'Tenant',
  }));

  ({ user: strangerTenant, token: strangerTenantToken } = await registerUser({
    email: `tn-stranger-${ts}@test.com`,
    role: 'tenant',
    firstName: 'Stranger',
    lastName: 'Tenant',
  }));

  ({ user: strangerLandlord, token: strangerLandlordToken } = await registerUser({
    email: `ll-stranger-${ts}@test.com`,
    role: 'landlord',
    firstName: 'Stranger',
    lastName: 'Landlord',
  }));

  const apartment = await Apartment.create({
    landlordId: ownerLandlord.id,
    title: 'Ledger IDOR Test Apt',
    city: 'Tel Aviv',
    price: 5000,
    rooms: 3,
  });

  agreement = await RentalAgreement.create({
    propertyId: apartment.id,
    landlordId: ownerLandlord.id,
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    monthlyRentIls: 5000,
    status: 'ACTIVE',
  });

  await AgreementParty.create({
    agreementId: agreement.id,
    userId: tenantParty.id,
    role: 'tenant',
  });

  ledgerRow = await LedgerRow.create({
    agreementId: agreement.id,
    period: 'יולי 2026',
    dueDate: '2026-07-01',
    amount: 5000,
    status: 'PENDING',
  });

  const generateApartment = await Apartment.create({
    landlordId: ownerLandlord.id,
    title: 'Ledger Generate Test Apt',
    city: 'Tel Aviv',
    price: 4500,
    rooms: 2,
  });

  generateAgreement = await RentalAgreement.create({
    propertyId: generateApartment.id,
    landlordId: ownerLandlord.id,
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    monthlyRentIls: 4500,
    status: 'ACTIVE',
  });
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('Ledger IDOR protections', () => {
  it('returns 404 when a stranger tenant GETs the ledger', async () => {
    const res = await request(app)
      .get(`/api/v3/ledger/agreement/${agreement.id}`)
      .set('Authorization', `Bearer ${strangerTenantToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 when an agreement party GETs the ledger', async () => {
    const res = await request(app)
      .get(`/api/v3/ledger/agreement/${agreement.id}`)
      .set('Authorization', `Bearer ${tenantPartyToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((r) => r.id === ledgerRow.id)).toBe(true);
  });

  it('returns 404 when a stranger reports payment and leaves row PENDING', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${ledgerRow.id}/report`)
      .set('Authorization', `Bearer ${strangerTenantToken}`);
    expect(res.status).toBe(404);
    await ledgerRow.reload();
    expect(ledgerRow.status).toBe('PENDING');
  });

  it('allows an agreement party to report payment', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${ledgerRow.id}/report`)
      .set('Authorization', `Bearer ${tenantPartyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REPORTED');
    await ledgerRow.reload();
    expect(ledgerRow.status).toBe('REPORTED');
  });

  it('returns 404 when a stranger landlord confirms and leaves row unchanged', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${ledgerRow.id}/confirm`)
      .set('Authorization', `Bearer ${strangerLandlordToken}`);
    expect(res.status).toBe(404);
    await ledgerRow.reload();
    expect(ledgerRow.status).toBe('REPORTED');
  });

  it('returns 404 when a stranger landlord rejects and leaves row unchanged', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${ledgerRow.id}/reject`)
      .set('Authorization', `Bearer ${strangerLandlordToken}`);
    expect(res.status).toBe(404);
    await ledgerRow.reload();
    expect(ledgerRow.status).toBe('REPORTED');
  });

  it('allows the owning landlord to confirm payment', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/${ledgerRow.id}/confirm`)
      .set('Authorization', `Bearer ${ownerLandlordToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');
    await ledgerRow.reload();
    expect(ledgerRow.status).toBe('PAID');
  });

  it('returns 404 when a stranger landlord generates a ledger', async () => {
    const res = await request(app)
      .post(`/api/v3/ledger/generate/${generateAgreement.id}`)
      .set('Authorization', `Bearer ${strangerLandlordToken}`);
    expect(res.status).toBe(404);
  });

  it('is idempotent on double generate for the owning landlord', async () => {
    const beforeCount = await LedgerRow.count({ where: { agreementId: generateAgreement.id } });
    expect(beforeCount).toBe(0);

    const first = await request(app)
      .post(`/api/v3/ledger/generate/${generateAgreement.id}`)
      .set('Authorization', `Bearer ${ownerLandlordToken}`);
    expect(first.status).toBe(201);
    expect(first.body.generated).toBeGreaterThan(0);

    const afterFirst = await LedgerRow.count({ where: { agreementId: generateAgreement.id } });

    const second = await request(app)
      .post(`/api/v3/ledger/generate/${generateAgreement.id}`)
      .set('Authorization', `Bearer ${ownerLandlordToken}`);
    expect(second.status).toBe(201);
    expect(second.body.generated).toBe(0);

    const afterSecond = await LedgerRow.count({ where: { agreementId: generateAgreement.id } });
    expect(afterSecond).toBe(afterFirst);
  });
});

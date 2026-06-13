process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

// Inject a failure into the audit log so one user's anonymization throws.
jest.mock('../src/services/auditLogService', () => ({
  logAudit: jest.fn(),
}));

const { Op } = require('sequelize');
const { sequelize, ensureUserVerificationColumns } = require('../src/config/database');
const { User } = require('../src/models');
const { logAudit } = require('../src/services/auditLogService');
const { runAccountDeletion } = require('../src/cron/accountDeletion');

describe('accountDeletion cron — per-user error isolation (BUG-018)', () => {
  let userA;
  let userB;

  beforeAll(async () => {
    await sequelize.sync({ force: false });
    await ensureUserVerificationColumns();

    const past = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const ts = Date.now();
    userA = await User.create({
      email: `iso-a-${ts}@test.com`,
      passwordHash: 'h',
      firstName: 'A',
      lastName: 'A',
      role: 'tenant',
      deletionRequestedAt: past,
    });
    userB = await User.create({
      email: `iso-b-${ts}@test.com`,
      passwordHash: 'h',
      firstName: 'B',
      lastName: 'B',
      role: 'tenant',
      deletionRequestedAt: past,
    });
  }, 30_000);

  afterAll(async () => {
    await User.destroy({ where: { id: { [Op.in]: [userA.id, userB.id] } } });
    await sequelize.close();
  });

  it('continues anonymizing remaining users when one fails', async () => {
    // The first audit-log write throws — a non-isolated loop would abort the
    // whole batch here and leave the second user un-anonymized.
    logAudit.mockReset();
    logAudit.mockImplementationOnce(() => {
      throw new Error('audit boom');
    });

    await expect(runAccountDeletion()).resolves.toBeDefined();

    const a = await User.findByPk(userA.id);
    const b = await User.findByPk(userB.id);
    expect(a.email).toMatch(/^deleted-/);
    expect(b.email).toMatch(/^deleted-/);
  });
});

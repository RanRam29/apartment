const { ensureUserVerificationColumns, ensureApartmentStreetColumn } = require('../src/config/database');

describe('Database schema compatibility', () => {
  it('adds missing email verification columns to existing users tables', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({
        id: {},
        email: {},
        is_verified: {},
      }),
      addColumn: jest.fn().mockResolvedValue(undefined),
    };

    await ensureUserVerificationColumns(queryInterface);

    expect(queryInterface.addColumn).toHaveBeenCalledTimes(2);
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'users',
      'verification_token',
      expect.objectContaining({ allowNull: true })
    );
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'users',
      'verified_at',
      expect.objectContaining({ allowNull: true })
    );
  });

  it('leaves fresh databases for sequelize sync to create', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockRejectedValue(new Error('No description found for "users" table')),
      addColumn: jest.fn(),
    };

    await expect(ensureUserVerificationColumns(queryInterface)).resolves.toBeUndefined();
    expect(queryInterface.addColumn).not.toHaveBeenCalled();
  });

  it('adds apartment street column with idempotent DDL', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({
        id: {},
        city: {},
      }),
    };
    const database = { query: jest.fn().mockResolvedValue(undefined) };

    await ensureApartmentStreetColumn(queryInterface, database);

    expect(database.query).toHaveBeenCalledTimes(1);
    expect(database.query.mock.calls[0][0]).toContain('ADD COLUMN IF NOT EXISTS "street"');
  });

  it('backfills blank street values before dropping legacy neighborhood column', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({
        id: {},
        street: {},
        neighborhood: {},
      }),
    };
    const database = { query: jest.fn().mockResolvedValue(undefined) };

    await ensureApartmentStreetColumn(queryInterface, database);

    expect(database.query).toHaveBeenCalledTimes(2);
    expect(database.query.mock.calls[0][0]).toContain('NULLIF(TRIM("street"), \'\') IS NULL');
    expect(database.query.mock.calls[0][0]).toContain('NULLIF(TRIM("neighborhood"), \'\') IS NOT NULL');
    expect(database.query.mock.calls[1][0]).toContain('DROP COLUMN IF EXISTS "neighborhood"');
  });
});

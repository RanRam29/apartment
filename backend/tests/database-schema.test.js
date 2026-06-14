const {
  sequelize,
  ensureUserVerificationColumns,
  ensureApartmentStreetColumn,
} = require('../src/config/database');

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

    expect(queryInterface.addColumn).toHaveBeenCalledTimes(16);
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
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'users',
      'tos_accepted_at',
      expect.objectContaining({ allowNull: true })
    );
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'users',
      'verification_token_expires_at',
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
      addColumn: jest.fn().mockResolvedValue(undefined),
      removeColumn: jest.fn().mockResolvedValue(undefined),
    };
    const querySpy = jest.spyOn(sequelize, 'query').mockResolvedValue(undefined);

    await ensureApartmentStreetColumn(queryInterface);

    expect(queryInterface.addColumn).toHaveBeenCalledTimes(2);
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'apartments',
      'street',
      expect.objectContaining({ allowNull: true })
    );
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'apartments',
      'building_fee',
      expect.objectContaining({ allowNull: true })
    );
    expect(querySpy).not.toHaveBeenCalled();
    expect(queryInterface.removeColumn).not.toHaveBeenCalled();

    querySpy.mockRestore();
  });

  it('backfills blank street values before dropping legacy neighborhood column', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({
        id: {},
        street: {},
        neighborhood: {},
      }),
      addColumn: jest.fn().mockResolvedValue(undefined),
      removeColumn: jest.fn().mockResolvedValue(undefined),
    };
    const querySpy = jest.spyOn(sequelize, 'query').mockResolvedValue(undefined);

    await ensureApartmentStreetColumn(queryInterface);

    expect(queryInterface.addColumn).toHaveBeenCalledTimes(1);
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'apartments',
      'building_fee',
      expect.objectContaining({ allowNull: true })
    );
    expect(querySpy).toHaveBeenCalledTimes(1);
    expect(querySpy.mock.calls[0][0]).toContain('SET street = neighborhood');
    expect(queryInterface.removeColumn).toHaveBeenCalledWith('apartments', 'neighborhood');

    querySpy.mockRestore();
  });
});

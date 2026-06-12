const { sequelize, ensureUserVerificationColumns, ensureApartmentStreetColumn } = require('../src/config/database');

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

  it('continues if another instance already added apartments.street', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ id: {}, city: {} }),
      addColumn: jest.fn().mockRejectedValue({ original: { code: '42701' }, message: 'column "street" already exists' }),
    };

    await expect(ensureApartmentStreetColumn(queryInterface)).resolves.toBeUndefined();
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'apartments',
      'street',
      expect.objectContaining({ allowNull: true })
    );
  });

  it('continues if another instance removed apartments.neighborhood before backfill', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ id: {}, city: {}, street: {}, neighborhood: {} }),
      addColumn: jest.fn(),
      removeColumn: jest.fn(),
    };
    const querySpy = jest.spyOn(sequelize, 'query').mockRejectedValue({
      original: { code: '42703' },
      message: 'column "neighborhood" does not exist',
    });

    await expect(ensureApartmentStreetColumn(queryInterface)).resolves.toBeUndefined();
    expect(queryInterface.removeColumn).not.toHaveBeenCalled();
    querySpy.mockRestore();
  });

  it('continues if another instance removed apartments.neighborhood after backfill', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ id: {}, city: {}, street: {}, neighborhood: {} }),
      addColumn: jest.fn(),
      removeColumn: jest.fn().mockRejectedValue({
        original: { code: '42703' },
        message: 'column "neighborhood" does not exist',
      }),
    };
    const querySpy = jest.spyOn(sequelize, 'query').mockResolvedValue(undefined);

    await expect(ensureApartmentStreetColumn(queryInterface)).resolves.toBeUndefined();
    expect(queryInterface.removeColumn).toHaveBeenCalledWith('apartments', 'neighborhood');
    querySpy.mockRestore();
  });
});

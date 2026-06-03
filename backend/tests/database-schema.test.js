const { ensureUserVerificationColumns } = require('../src/config/database');

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

    expect(queryInterface.addColumn).toHaveBeenCalledTimes(9);
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
});

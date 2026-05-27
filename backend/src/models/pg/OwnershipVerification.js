const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const OwnershipVerification = sequelize.define('OwnershipVerification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  agreementId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'rental_agreements', key: 'id' },
    onDelete: 'CASCADE',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  choice: {
    type: DataTypes.ENUM('verified', 'skipped'),
    allowNull: false,
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'ownership_verifications',
  indexes: [
    { fields: ['agreement_id', 'tenant_id'], unique: true },
  ],
});

module.exports = OwnershipVerification;

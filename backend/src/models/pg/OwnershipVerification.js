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
    field: 'agreement_id',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    field: 'tenant_id',
  },
  choice: {
    type: DataTypes.ENUM('verified', 'skipped'),
    allowNull: false,
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'verified_at',
  },
}, {
  tableName: 'ownership_verifications',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['agreement_id', 'tenant_id'], unique: true },
  ],
});

module.exports = OwnershipVerification;

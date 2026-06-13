const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const WarrantyClaim = sequelize.define('WarrantyClaim', {
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
  guarantorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'agreement_guarantors', key: 'id' },
    onDelete: 'CASCADE',
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'FILED',
    validate: { isIn: [['FILED', 'ACCEPTED', 'DISPUTED', 'RESOLVED']] },
  },
  filedByUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  resolutionNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'warranty_claims',
  indexes: [
    { fields: ['agreement_id'] },
    { fields: ['guarantor_id'] },
    { fields: ['status'] },
  ],
});

module.exports = WarrantyClaim;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ContractAmendment = sequelize.define('ContractAmendment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  contractId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'rental_agreements', key: 'id' },
    onDelete: 'CASCADE',
  },
  proposedBy: {
    type: DataTypes.ENUM('tenant', 'landlord'),
    allowNull: false,
  },
  field: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  oldValue: {
    type: DataTypes.STRING(256),
    allowNull: false,
  },
  newValue: {
    type: DataTypes.STRING(256),
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  tableName: 'contract_amendments',
  indexes: [
    { fields: ['contract_id'] },
    { fields: ['status'] },
  ],
});

module.exports = ContractAmendment;

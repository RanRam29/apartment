const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AgreementParty = sequelize.define('AgreementParty', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  role: {
    type: DataTypes.ENUM('tenant', 'guarantor'),
    allowNull: false,
  },
  signedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  kycStatus: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING',
  },
  isHouseManager: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'agreement_parties',
  indexes: [
    { fields: ['agreement_id'] },
    { fields: ['user_id'] },
    { unique: true, fields: ['agreement_id', 'user_id'] },
  ],
});

module.exports = AgreementParty;

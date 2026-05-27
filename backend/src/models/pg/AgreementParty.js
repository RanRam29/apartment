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
    field: 'agreement_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    field: 'user_id',
  },
  role: {
    type: DataTypes.ENUM('tenant', 'guarantor'),
    allowNull: false,
  },
  signedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'signed_at',
  },
  kycStatus: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING',
    field: 'kyc_status',
  },
  isHouseManager: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_house_manager',
  },
}, {
  tableName: 'agreement_parties',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['agreement_id'] },
    { fields: ['user_id'] },
    { unique: true, fields: ['agreement_id', 'user_id'] },
  ],
});

module.exports = AgreementParty;

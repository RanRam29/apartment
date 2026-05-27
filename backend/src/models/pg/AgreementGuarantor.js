const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AgreementGuarantor = sequelize.define('AgreementGuarantor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  agreementId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  invitationToken: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
  },
  invitationExpiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  invitationStatus: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED'),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  signedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'agreement_guarantors',
});

module.exports = AgreementGuarantor;

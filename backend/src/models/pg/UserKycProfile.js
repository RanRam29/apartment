const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const UserKycProfile = sequelize.define('UserKycProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  personaInquiryId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
}, {
  tableName: 'user_kyc_profiles',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['persona_inquiry_id'] },
  ],
});

module.exports = UserKycProfile;

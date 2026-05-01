const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  landlordId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  apartmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'apartments', key: 'id' },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'),
    allowNull: false,
    defaultValue: 'pending',
  },
  tenantLikedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  landlordLikedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'matches',
  indexes: [
    { unique: true, fields: ['tenant_id', 'apartment_id'] },
    { fields: ['tenant_id'] },
    { fields: ['landlord_id'] },
    { fields: ['apartment_id'] },
    { fields: ['status'] },
  ],
});

module.exports = Match;

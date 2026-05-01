const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Swipe = sequelize.define('Swipe', {
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
  apartmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'apartments', key: 'id' },
    onDelete: 'CASCADE',
  },
  direction: {
    type: DataTypes.ENUM('like', 'dislike', 'superlike'),
    allowNull: false,
  },
  seenDurationMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'How long tenant viewed the card before swiping',
  },
}, {
  tableName: 'swipes',
  indexes: [
    { unique: true, fields: ['tenant_id', 'apartment_id'] },
    { fields: ['tenant_id'] },
    { fields: ['apartment_id'] },
    { fields: ['direction'] },
  ],
});

module.exports = Swipe;

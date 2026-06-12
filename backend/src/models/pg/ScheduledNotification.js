const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ScheduledNotification = sequelize.define('ScheduledNotification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  fireAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  // { title, body, data?, emailSubject?, emailHtml? } — passed as-is to notify()
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'SCHEDULED',
    validate: { isIn: [['SCHEDULED', 'SENT', 'FAILED', 'CANCELLED']] },
  },
  // Optional idempotency key so the same business event never schedules twice
  dedupeKey: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'scheduled_notifications',
  indexes: [
    { fields: ['status', 'fire_at'] },
    { fields: ['user_id'] },
  ],
});

module.exports = ScheduledNotification;

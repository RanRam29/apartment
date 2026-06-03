const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const WhatsAppMessage = sequelize.define('WhatsAppMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  wamid: {
    type: DataTypes.STRING(128),
    allowNull: true,
    unique: true,
  },
  direction: {
    type: DataTypes.ENUM('inbound', 'outbound'),
    allowNull: false,
  },
  messageType: {
    type: DataTypes.ENUM('text', 'template', 'image', 'document', 'interactive'),
    allowNull: false,
    defaultValue: 'text',
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  templateName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  contractId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'whatsapp_messages',
  indexes: [
    { fields: ['phone_number', 'created_at'] },
    { fields: ['phone_number'] },
    { fields: ['user_id'] },
  ],
});

module.exports = WhatsAppMessage;

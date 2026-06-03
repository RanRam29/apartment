const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const CONVERSATION_STATES = [
  'idle',
  'awaiting_payment_confirm',
  'awaiting_maintenance_description',
  'awaiting_maintenance_image',
  'awaiting_invite_confirm',
];

const WhatsAppConversationState = sequelize.define('WhatsAppConversationState', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  state: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'idle',
  },
  context: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'whatsapp_conversation_states',
});

module.exports = WhatsAppConversationState;
module.exports.CONVERSATION_STATES = CONVERSATION_STATES;

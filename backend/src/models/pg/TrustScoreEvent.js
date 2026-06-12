const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const TrustScoreEvent = sequelize.define('TrustScoreEvent', {
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
  eventKey: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  delta: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  meta: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  dedupeKey: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
}, {
  tableName: 'trust_score_events',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['event_key'] },
  ],
});

module.exports = TrustScoreEvent;

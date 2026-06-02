const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ProtocolEvidence = sequelize.define('ProtocolEvidence', {
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
  protocolType: {
    type: DataTypes.ENUM('CHECK_IN', 'CHECK_OUT'),
    allowNull: false,
  },
  roomZone: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  conditionTag: {
    type: DataTypes.ENUM('CLEAN', 'MINOR_WEAR', 'DAMAGED'),
    allowNull: false,
  },
  s3ImageKey: {
    type: DataTypes.STRING(512),
    allowNull: false,
  },
  imageHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  gpsLatitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  gpsLongitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  capturedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'protocol_evidence',
  indexes: [
    { fields: ['agreement_id'] },
    { fields: ['protocol_type'] },
    { fields: ['room_zone'] },
  ],
});

module.exports = ProtocolEvidence;

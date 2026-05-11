const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  requestId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'request_id',
  },
  actorId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'actor_id',
  },
  actorRole: {
    type: DataTypes.STRING(32),
    allowNull: true,
    field: 'actor_role',
  },
  action: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  resourceType: {
    type: DataTypes.STRING(80),
    allowNull: true,
    field: 'resource_type',
  },
  resourceId: {
    type: DataTypes.STRING(120),
    allowNull: true,
    field: 'resource_id',
  },
  outcome: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'success',
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'status_code',
  },
  ipAddress: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.STRING(512),
    allowNull: true,
    field: 'user_agent',
  },
  route: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  method: {
    type: DataTypes.STRING(12),
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  underscored: true,
  indexes: [
    { fields: ['created_at'] },
    { fields: ['actor_id', 'created_at'] },
    { fields: ['action', 'created_at'] },
    { fields: ['resource_type', 'resource_id'] },
    { fields: ['request_id'] },
  ],
});

module.exports = AuditLog;

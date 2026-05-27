const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const MaintenanceTicket = sequelize.define('MaintenanceTicket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  agreementId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  reporterId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  photoR2Key: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'WAITING_INVOICE', 'CLOSED'),
    defaultValue: 'OPEN',
    allowNull: false,
  },
  landlordResponse: {
    type: DataTypes.ENUM('handling', 'technician', 'alternative'),
    allowNull: true,
  },
  landlordNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'maintenance_tickets',
});

module.exports = MaintenanceTicket;

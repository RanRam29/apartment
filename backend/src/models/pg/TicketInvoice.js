const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const TicketInvoice = sequelize.define('TicketInvoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'maintenance_tickets', key: 'id' },
    onDelete: 'CASCADE',
  },
  r2Key: {
    type: DataTypes.STRING(512),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payer: {
    type: DataTypes.ENUM('landlord', 'tenant'),
    allowNull: false,
  },
}, {
  tableName: 'ticket_invoices',
});

module.exports = TicketInvoice;

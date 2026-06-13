const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const LedgerRow = sequelize.define('LedgerRow', {
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
  period: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'REPORTED', 'PAID', 'OVERDUE'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  reportedByTenant: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  confirmedByLandlord: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cpiAdjustment: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  receiptR2Key: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
}, {
  tableName: 'ledger_rows',
  indexes: [
    { fields: ['agreement_id'] },
    { fields: ['due_date'] },
    { fields: ['status'] },
    // Prevents duplicate ledger rows for the same billing period under
    // concurrent SIGNED transitions (BUG-013 TOCTOU race).
    { fields: ['agreement_id', 'period'], unique: true, name: 'ledger_rows_agreement_period_unique' },
  ],
});

module.exports = LedgerRow;

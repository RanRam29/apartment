const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const PaymentLedger = sequelize.define('PaymentLedger', {
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
  billingPeriod: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  baseAmountIls: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  cpiAdjustmentIls: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  totalDueIls: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PAID', 'OVERDUE'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  paymentProofUrl: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'payment_ledger',
  indexes: [
    { fields: ['agreement_id'] },
    { fields: ['billing_period'] },
    { fields: ['status'] },
  ],
});

module.exports = PaymentLedger;

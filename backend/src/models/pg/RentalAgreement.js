const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const RentalAgreement = sequelize.define('RentalAgreement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  landlordId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'DRAFT',
    validate: {
      isIn: [['DRAFT', 'PENDING_REVIEW', 'READY_SIGN', 'SIGNED', 'UPLOAD', 'PENDING_SIGN', 'PENDING_ACTIVATION', 'ACTIVE', 'EXPIRING', 'ENDED']],
    },
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  monthlyRentIls: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  paymentDueDay: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
  cpiLinked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  baseCpiIndex: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
  },
  optionMonths: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  optionNoticeDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 60,
  },
  habitabilityDeclaration: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  behavioralClauses: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  r2DocKey: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  extractedFields: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  landlordSignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  tenantSignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  checkinUnlockedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  checkinCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  checkoutCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  renewedFromId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'rental_agreements',
});

module.exports = RentalAgreement;

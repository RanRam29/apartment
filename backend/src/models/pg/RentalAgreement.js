const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const RentalAgreement = sequelize.define('RentalAgreement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  status: {
    type: DataTypes.ENUM(
      'UPLOAD',
      'PENDING_SIGN',
      'ACTIVE',
      'EXPIRING',
      'PENDING_ACTIVATION',
      'ENDED'
    ),
    allowNull: false,
    defaultValue: 'UPLOAD',
  },
  landlordId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'apartments', key: 'id' },
    onDelete: 'CASCADE',
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
    validate: { min: 1, max: 31 },
  },
  cpiLinked: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  baseCpiIndex: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
  },
  optionMonths: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  optionNoticeDays: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
  },
  habitabilityDeclaration: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      water: false,
      electricity: false,
      sewage: false,
      ventilation: false,
      locking_door: false,
    },
  },
  guaranteeCapIls: {
    type: DataTypes.VIRTUAL,
    get() {
      const rent = this.getDataValue('monthlyRentIls');
      return rent ? parseFloat(rent) * 3 : null;
    },
  },
  behavioralClauses: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  pdfUrl: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  pdfHash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  extractedFields: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  r2DocKey: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  landlordSignedAt: {
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
    references: { model: 'rental_agreements', key: 'id' },
  },
}, {
  tableName: 'rental_agreements',
  indexes: [
    { fields: ['landlord_id'] },
    { fields: ['tenant_id'] },
    { fields: ['property_id'] },
    { fields: ['status'] },
  ],
});

module.exports = RentalAgreement;

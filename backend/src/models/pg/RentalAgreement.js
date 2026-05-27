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
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('UPLOAD', 'PENDING_SIGN', 'ACTIVE', 'EXPIRING', 'PENDING_ACTIVATION', 'ENDED'),
    allowNull: false,
    defaultValue: 'UPLOAD',
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

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AgreementRoom = sequelize.define('AgreementRoom', {
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
    field: 'agreement_id',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('builtin', 'custom'),
    defaultValue: 'builtin',
  },
  checkinPhotos: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'checkin_photos',
  },
  checkoutPhotos: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'checkout_photos',
  },
  checkoutNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'checkout_notes',
  },
}, {
  tableName: 'agreement_rooms',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['agreement_id'] },
  ],
});

module.exports = AgreementRoom;

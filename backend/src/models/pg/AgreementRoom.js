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
  },
  checkoutPhotos: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  checkoutNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'agreement_rooms',
  indexes: [
    { fields: ['agreement_id'] },
  ],
});

module.exports = AgreementRoom;

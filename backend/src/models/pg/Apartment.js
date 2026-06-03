const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Apartment = sequelize.define('Apartment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  landlordId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 },
  },
  rooms: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: { min: 1 },
  },
  floor: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  totalFloors: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sizeSqm: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  street: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  neighborhood: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('street');
    },
    set(value) {
      this.setDataValue('street', value);
    },
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: -90, max: 90 },
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: -180, max: 180 },
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  amenities: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'e.g. ["parking","balcony","elevator","ac","storage"]',
  },
  availableFrom: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  minLeasePeriod: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'months',
  },
  buildingFee: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
    comment: 'shekels per month',
  },
  petsAllowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'apartments',
  indexes: [
    { fields: ['landlord_id'] },
    { fields: ['city'] },
    { fields: ['price'] },
    { fields: ['rooms'] },
    { fields: ['is_active'] },
  ],
});

module.exports = Apartment;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AppConfig = sequelize.define('AppConfig', {
  key: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  value: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'app_config',
});

module.exports = AppConfig;

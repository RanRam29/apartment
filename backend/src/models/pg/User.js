const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    validate: {
      is: /^(\+972|0)[0-9]{8,9}$/,
    },
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('tenant', 'landlord', 'admin'),
    allowNull: false,
    defaultValue: 'tenant',
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verificationToken: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastActiveAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  tosAcceptedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  tosVersion: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  blockedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  activeRole: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: { isIn: [['tenant', 'landlord']] },
  },
  trustScore: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
  },
  whatsappOptIn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  notificationPreferences: {
    type: DataTypes.JSONB,
    defaultValue: { push: true, email: true, paymentReminders: true, maintenance: true, whatsapp: false },
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deletionRequestedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  indexes: [
    { fields: ['email'] },
    { fields: ['phone'] },
    { fields: ['role'] },
  ],
  hooks: {
    beforeValidate: async (user) => {
      if (!user.activeRole && user.role) {
        user.activeRole = user.role === 'admin' ? 'tenant' : user.role;
      }
      if (!user.verificationToken) return;
      const existing = await User.findOne({ where: { verificationToken: user.verificationToken } }).catch(() => null);
      if (existing) {
        user.verificationToken = `${user.verificationToken}-${Math.random().toString(36).slice(2, 10)}`;
      }
    },
  },
});

module.exports = User;

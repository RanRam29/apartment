const { body } = require('express-validator');

const registerValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),

  body('firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be 2-100 characters'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be 2-100 characters'),

  body('role')
    .isIn(['tenant', 'landlord'])
    .withMessage('Role must be tenant or landlord'),

  body('phone')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => {
      if (!value) return null;
      let cleaned = String(value).replace(/[-\s]/g, '');
      if (cleaned.startsWith('972')) {
        cleaned = '+' + cleaned;
      }
      if (/^[2-9][0-9]{8}$/.test(cleaned)) {
        cleaned = '0' + cleaned;
      }
      return cleaned;
    })
    .matches(/^(\+972|0)[0-9]{8,9}$/)
    .withMessage('Invalid Israeli phone number'),
];

const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = { registerValidator, loginValidator };

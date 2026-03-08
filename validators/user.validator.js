const { body } = require('express-validator');

const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const registerValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('userCode')
    .trim()
    .notEmpty()
    .withMessage('User code is required'),
  body('school')
    .trim()
    .notEmpty()
    .withMessage('School is required'),
  body('role')
    .isIn(['student', 'teacher'])
    .withMessage('Role must be "student" or "teacher"'),
];

module.exports = { loginValidator, registerValidator };

const express = require('express');
const { body, param } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().withMessage('Valid email required'), body('password').notEmpty().withMessage('Password required')],
  validate,
  authController.login
);

router.post('/logout', authController.logout);
router.get('/me', protect, authController.getMe);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('Valid email required')],
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password/:token',
  authLimiter,
  [param('token').notEmpty(), body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')],
  validate,
  authController.resetPassword
);

module.exports = router;

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { register, login, logout, refreshToken, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { errorResponse } = require('../utils/response');

const router = Router();

/**
 * Helper: run validation and return errors if any.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json(
      errorResponse('Validation failed', 422, errors.array())
    );
  }
  next();
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter.')
      .matches(/\d/)
      .withMessage('Password must contain at least one number.'),
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters.')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores.'),
  ],
  validate,
  register
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
);

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', authenticate, logout);

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post(
  '/refresh',
  [body('refresh_token').notEmpty().withMessage('Refresh token is required.')],
  validate,
  refreshToken
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, getMe);

module.exports = router;

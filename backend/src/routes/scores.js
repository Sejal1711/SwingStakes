const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const {
  getScores,
  getScore,
  createScore,
  updateScore,
  deleteScore,
  getStats,
} = require('../controllers/scoresController');
const { authenticate, requireActiveSubscription } = require('../middleware/auth');
const { errorResponse } = require('../utils/response');

const router = Router();

// All score routes require: 1) logged in, 2) active subscription
router.use(authenticate);
router.use(requireActiveSubscription);

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json(errorResponse('Validation failed', 422, errors.array()));
  }
  next();
}

// ─── GET /api/scores/stats ────────────────────────────────────────────────────
router.get('/stats', getStats);

// ─── GET /api/scores ──────────────────────────────────────────────────────────
router.get('/', getScores);

// ─── GET /api/scores/:id ──────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid score ID.')],
  validate,
  getScore
);

// ─── POST /api/scores ─────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('score_date').isISO8601().withMessage('score_date must be a valid date (YYYY-MM-DD).'),
    body('course_name')
      .trim()
      .notEmpty()
      .withMessage('Course name is required.')
      .isLength({ max: 200 })
      .withMessage('Course name must be under 200 characters.'),
    body('stableford_points')
      .isInt({ min: 0, max: 72 })
      .withMessage('Stableford points must be between 0 and 72.'),
    body('gross_score')
      .optional({ nullable: true })
      .isInt({ min: 50, max: 150 })
      .withMessage('Gross score must be between 50 and 150.'),
    body('handicap_at_time')
      .optional({ nullable: true })
      .isFloat({ min: 0, max: 54 })
      .withMessage('Handicap must be between 0 and 54.'),
    body('notes')
      .optional({ nullable: true })
      .isLength({ max: 500 })
      .withMessage('Notes must be under 500 characters.'),
  ],
  validate,
  createScore
);

// ─── PATCH /api/scores/:id ────────────────────────────────────────────────────
router.patch(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid score ID.'),
    body('score_date').optional().isISO8601().withMessage('score_date must be a valid date.'),
    body('course_name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Course name cannot be empty.')
      .isLength({ max: 200 }),
    body('stableford_points')
      .optional()
      .isInt({ min: 0, max: 72 })
      .withMessage('Stableford points must be between 0 and 72.'),
    body('gross_score')
      .optional({ nullable: true })
      .isInt({ min: 50, max: 150 }),
    body('handicap_at_time')
      .optional({ nullable: true })
      .isFloat({ min: 0, max: 54 }),
    body('notes')
      .optional({ nullable: true })
      .isLength({ max: 500 }),
  ],
  validate,
  updateScore
);

// ─── DELETE /api/scores/:id ───────────────────────────────────────────────────
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid score ID.')],
  validate,
  deleteScore
);

module.exports = router;

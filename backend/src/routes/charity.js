const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const { successResponse, errorResponse, createdResponse } = require('../utils/response');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json(errorResponse('Validation failed', 422, errors.array()));
  next();
}

// ─── GET /api/charity/featured ────────────────────────────────────────────────
router.get('/featured', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('charities')
      .select('id, name, description, image_url, website, events')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('name', { ascending: true });

    if (error) return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse(data ?? []));
  } catch (err) { next(err); }
});

// ─── GET /api/charity ─────────────────────────────────────────────────────────
// List all active charities with optional search
router.get('/', async (req, res, next) => {
  try {
    const search = req.query.search ?? '';

    let query = supabaseAdmin
      .from('charities')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })  // featured first
      .order('name', { ascending: true });

    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error } = await query;
    if (error) return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse(data ?? []));
  } catch (err) { next(err); }
});

// ─── GET /api/charity/my-charity ─────────────────────────────────────────────
router.get('/my-charity', authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_charities')
      .select('charity_percentage, charities(*)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') return res.status(400).json(errorResponse(error.message, 400));

    if (!data) return res.json(successResponse(null));
    return res.json(successResponse({
      ...data.charities,
      charity_percentage: data.charity_percentage,
    }));
  } catch (err) { next(err); }
});

// ─── PATCH /api/charity/my-settings ──────────────────────────────────────────
// Update the user's charity contribution percentage (min 10%)
router.patch(
  '/my-settings',
  authenticate,
  [
    body('charity_percentage')
      .isInt({ min: 10, max: 100 })
      .withMessage('Charity percentage must be between 10 and 100.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { charity_percentage } = req.body;
      const userId = req.user.id;

      const { data: existing } = await supabaseAdmin
        .from('user_charities')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!existing) return res.status(400).json(errorResponse('You must select a charity first.', 400));

      const { data, error } = await supabaseAdmin
        .from('user_charities')
        .update({ charity_percentage })
        .eq('user_id', userId)
        .select('charity_percentage, charities(*)')
        .single();

      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.json(successResponse({ charity_percentage: data.charity_percentage }, 'Charity percentage updated.'));
    } catch (err) { next(err); }
  }
);

// ─── POST /api/charity/select ─────────────────────────────────────────────────
router.post(
  '/select',
  authenticate,
  [body('charity_id').isUUID().withMessage('Valid charity_id is required.')],
  validate,
  async (req, res, next) => {
    try {
      const { charity_id } = req.body;
      const userId = req.user.id;

      const { data: charity } = await supabaseAdmin
        .from('charities')
        .select('id, name')
        .eq('id', charity_id)
        .eq('is_active', true)
        .single();

      if (!charity) return res.status(404).json(errorResponse('Charity not found or inactive.', 404));

      // Preserve existing percentage when switching charity
      const { data: existing } = await supabaseAdmin
        .from('user_charities')
        .select('charity_percentage')
        .eq('user_id', userId)
        .single();

      const charityPct = existing?.charity_percentage ?? 10;

      const { data, error } = await supabaseAdmin
        .from('user_charities')
        .upsert(
          { user_id: userId, charity_id, charity_percentage: charityPct },
          { onConflict: 'user_id' }
        )
        .select('charity_percentage, charities(*)')
        .single();

      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.status(201).json(createdResponse(
        { ...data.charities, charity_percentage: data.charity_percentage },
        `You are now supporting ${charity.name}.`
      ));
    } catch (err) { next(err); }
  }
);

// ─── GET /api/charity/:id ─────────────────────────────────────────────────────
// Charity profile — public
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('charities')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single();

    if (error || !data) return res.status(404).json(errorResponse('Charity not found.', 404));
    return res.json(successResponse(data));
  } catch (err) { next(err); }
});

// ─── POST /api/charity/donate ─────────────────────────────────────────────────
// Record an independent donation (outside of subscription)
router.post(
  '/donate',
  authenticate,
  [
    body('charity_id').isUUID().withMessage('Valid charity_id is required.'),
    body('amount').isFloat({ min: 0.50 }).withMessage('Amount must be at least £0.50.'),
    body('message').optional({ nullable: true }).isLength({ max: 300 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { charity_id, amount, message } = req.body;
      const userId = req.user.id;

      const { data: charity } = await supabaseAdmin
        .from('charities').select('id, name').eq('id', charity_id).eq('is_active', true).single();
      if (!charity) return res.status(404).json(errorResponse('Charity not found.', 404));

      const { data, error } = await supabaseAdmin
        .from('independent_donations')
        .insert({ user_id: userId, charity_id, amount: Number(amount), message: message ?? null })
        .select()
        .single();

      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.status(201).json(createdResponse(data, `Thank you! Your £${Number(amount).toFixed(2)} donation to ${charity.name} has been recorded.`));
    } catch (err) { next(err); }
  }
);

// ─── GET /api/charity/my-donations ────────────────────────────────────────────
router.get('/my-donations', authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('independent_donations')
      .select('*, charities(name)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse(data ?? []));
  } catch (err) { next(err); }
});

module.exports = router;

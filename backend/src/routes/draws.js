const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, requireActiveSubscription } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const { successResponse, errorResponse } = require('../utils/response');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json(errorResponse('Validation failed', 422, errors.array()));
  next();
}

// ─── GET /api/draws/my-winnings ───────────────────────────────────────────────
// Auth only — no active subscription required (former winners may have lapsed)
router.get('/my-winnings', authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('draw_winners')
      .select('*, monthly_draws(month_year, drawn_numbers, published)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse(data ?? []));
  } catch (err) { next(err); }
});

// ─── POST /api/draws/winners/:id/submit-proof ─────────────────────────────────
// Winner submits a screenshot URL as eligibility proof
router.post(
  '/winners/:id/submit-proof',
  authenticate,
  [
    param('id').isUUID(),
    body('proof_url').isURL().withMessage('A valid proof URL is required.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { proof_url } = req.body;

      // Ensure this winner row belongs to the requesting user
      const { data: winner } = await supabaseAdmin
        .from('draw_winners')
        .select('id, user_id, verification_status')
        .eq('id', id)
        .single();

      if (!winner) return res.status(404).json(errorResponse('Winner record not found.', 404));
      if (winner.user_id !== req.user.id) return res.status(403).json(errorResponse('Forbidden.', 403));
      if (winner.verification_status === 'approved') return res.status(400).json(errorResponse('Already verified.', 400));

      const { data, error } = await supabaseAdmin
        .from('draw_winners')
        .update({
          proof_url,
          proof_submitted_at: new Date().toISOString(),
          verification_status: 'submitted',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.json(successResponse(data, 'Proof submitted. Admin will review shortly.'));
    } catch (err) { next(err); }
  }
);

// ── All routes below require authenticate + active subscription ──────────────
router.use(authenticate);
router.use(requireActiveSubscription);

// ─── GET /api/draws ───────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('monthly_draws')
      .select('*')
      .order('month_year', { ascending: false });

    if (error) return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse(data ?? []));
  } catch (err) { next(err); }
});

// ─── GET /api/draws/current ───────────────────────────────────────────────────
router.get('/current', async (req, res, next) => {
  try {
    const { data: draw, error } = await supabaseAdmin
      .from('monthly_draws')
      .select('*')
      .eq('status', 'open')
      .order('month_year', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') return res.status(400).json(errorResponse(error.message, 400));

    if (!draw) return res.json(successResponse(null));

    // Get total participants (users who submitted picks)
    const { count: picksCount } = await supabaseAdmin
      .from('user_draw_picks')
      .select('*', { count: 'exact', head: true })
      .eq('draw_id', draw.id);

    return res.json(successResponse({ ...draw, total_picks: picksCount ?? 0 }));
  } catch (err) { next(err); }
});

// ─── GET /api/draws/:id/my-picks ─────────────────────────────────────────────
router.get('/:id/my-picks', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_draw_picks')
      .select('picked_numbers, match_count, created_at, updated_at')
      .eq('draw_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse(data ?? null));
  } catch (err) { next(err); }
});

// ─── POST /api/draws/:id/picks ────────────────────────────────────────────────
// Submit or update 5 number picks for a draw
router.post(
  '/:id/picks',
  [
    param('id').isUUID(),
    body('numbers')
      .isArray({ min: 5, max: 5 }).withMessage('You must pick exactly 5 numbers.')
      .custom(arr => {
        if (arr.some(n => !Number.isInteger(n) || n < 1 || n > 45)) throw new Error('Numbers must be integers between 1 and 45.');
        if (new Set(arr).size !== 5) throw new Error('All 5 numbers must be unique.');
        return true;
      }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const drawId = req.params.id;
      const userId = req.user.id;
      const numbers = req.body.numbers.map(Number).sort((a, b) => a - b);

      // Ensure draw exists and is still open
      const { data: draw } = await supabaseAdmin
        .from('monthly_draws')
        .select('id, status')
        .eq('id', drawId)
        .single();

      if (!draw) return res.status(404).json(errorResponse('Draw not found.', 404));
      if (draw.status !== 'open') return res.status(400).json(errorResponse('This draw is no longer accepting picks.', 400));

      // Upsert picks (one set per user per draw)
      const { data, error } = await supabaseAdmin
        .from('user_draw_picks')
        .upsert(
          { draw_id: drawId, user_id: userId, picked_numbers: numbers },
          { onConflict: 'draw_id,user_id' }
        )
        .select()
        .single();

      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.json(successResponse(data, 'Picks saved successfully.'));
    } catch (err) { next(err); }
  }
);

// ─── GET /api/draws/:id/my-entries ───────────────────────────────────────────
router.get('/:id/my-entries', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('draw_entries')
      .select('*')
      .eq('draw_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse({ entries_count: data?.entries_count ?? 0 }));
  } catch (err) { next(err); }
});

// ─── GET /api/draws/:id/results ───────────────────────────────────────────────
// Returns published draw results — drawn numbers, winners, user's own outcome
router.get('/:id/results', async (req, res, next) => {
  try {
    const { data: draw } = await supabaseAdmin
      .from('monthly_draws')
      .select('id, month_year, drawn_numbers, pool_5match, pool_4match, pool_3match, jackpot_amount, published, status')
      .eq('id', req.params.id)
      .single();

    if (!draw) return res.status(404).json(errorResponse('Draw not found.', 404));
    if (!draw.published) return res.status(403).json(errorResponse('Results have not been published yet.', 403));

    // Fetch all winners for this draw with usernames
    const { data: winnerRows } = await supabaseAdmin
      .from('draw_winners')
      .select('user_id, match_type, prize_amount')
      .eq('draw_id', req.params.id);

    // Fetch profiles for winners
    const winnerIds = [...new Set((winnerRows ?? []).map(w => w.user_id))];
    let profileMap = {};
    if (winnerIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('user_id, username')
        .in('user_id', winnerIds);
      (profiles ?? []).forEach(p => { profileMap[p.user_id] = p.username; });
    }

    const winners = (winnerRows ?? []).map(w => ({
      username: profileMap[w.user_id] ?? 'Anonymous',
      match_type: w.match_type,
      prize_amount: w.prize_amount,
      is_me: w.user_id === req.user.id,
    }));

    // User's own picks + match count
    const { data: myPicks } = await supabaseAdmin
      .from('user_draw_picks')
      .select('picked_numbers, match_count')
      .eq('draw_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    return res.json(successResponse({
      draw,
      winners,
      my_picks: myPicks ?? null,
    }));
  } catch (err) { next(err); }
});

// ─── GET /api/draws/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('monthly_draws')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json(errorResponse('Draw not found.', 404));
    return res.json(successResponse(data));
  } catch (err) { next(err); }
});

module.exports = router;

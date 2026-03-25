const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const { successResponse, errorResponse, createdResponse } = require('../utils/response');
const email = require('../services/email');

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireRole('admin'));

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json(errorResponse('Validation failed', 422, errors.array()));
  }
  next();
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [usersRes, subsRes, drawsRes, charityRes] = await Promise.all([
      // Total registered users
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),

      // Active subscribers
      supabaseAdmin.from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Current open draw prize pool
      supabaseAdmin.from('monthly_draws')
        .select('prize_pool_amount')
        .eq('status', 'open')
        .order('month_year', { ascending: false })
        .limit(1)
        .single(),

      // Total charity contributions estimate (5% of all active sub revenue)
      supabaseAdmin.from('subscriptions')
        .select('plan_type')
        .eq('status', 'active'),
    ]);

    const totalUsers       = usersRes.count ?? 0;
    const activeSubscribers = subsRes.count ?? 0;
    const prizePool        = drawsRes.data?.prize_pool_amount ?? 0;

    // Estimate charity raised: £0.50 per active subscriber per month
    const charityRaised = ((charityRes.data ?? []).length * 0.5).toFixed(2);

    return res.json(successResponse({
      totalUsers,
      activeSubscribers,
      prizePool: Number(prizePool).toFixed(2),
      charityRaised,
    }));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search ?? '';

    let query = supabaseAdmin
      .from('profiles')
      .select('id, user_id, username, role, handicap, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) query = query.ilike('username', `%${search}%`);

    const { data: profiles, count, error } = await query;
    if (error) {
      console.error('[admin/users] Supabase error:', error);
      return res.status(400).json(errorResponse(error.message, 400));
    }

    // Fetch subscriptions for these users separately
    const userIds = (profiles ?? []).map(p => p.user_id);
    let subMap = {};
    if (userIds.length > 0) {
      const { data: subs } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, plan_type, status, current_period_end')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      // Keep only the latest subscription per user
      (subs ?? []).forEach(s => {
        if (!subMap[s.user_id]) subMap[s.user_id] = s;
      });
    }

    const users = (profiles ?? []).map(p => ({
      ...p,
      subscription: subMap[p.user_id] ?? null,
    }));

    return res.json(successResponse({ users, total: count ?? 0, page, limit }));
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────────
router.patch(
  '/users/:id/role',
  [
    param('id').isUUID().withMessage('Invalid user ID.'),
    body('role').isIn(['subscriber', 'admin']).withMessage('Role must be subscriber or admin.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Prevent admin from demoting themselves
      if (req.user.id === id && role !== 'admin') {
        return res.status(400).json(errorResponse('You cannot change your own role.', 400));
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('user_id', id)
        .select()
        .single();

      if (error) return res.status(400).json(errorResponse(error.message, 400));

      return res.json(successResponse(data, `User role updated to ${role}.`));
    } catch (err) {
      next(err);
    }
  }
);

// ─── Draw number helpers ──────────────────────────────────────────────────────

/** Pick 5 unique random numbers from 1–45 */
function generateRandomNumbers() {
  const nums = new Set();
  while (nums.size < 5) nums.add(Math.floor(Math.random() * 45) + 1);
  return [...nums].sort((a, b) => a - b);
}

/** Pick 5 numbers weighted by frequency of Stableford scores across all users */
async function generateAlgorithmicNumbers() {
  const { data: scores } = await supabaseAdmin
    .from('golf_scores')
    .select('stableford_points');

  const freq = new Array(46).fill(1); // base weight of 1 for every number
  (scores ?? []).forEach(s => {
    if (s.stableford_points >= 1 && s.stableford_points <= 45) freq[s.stableford_points]++;
  });

  // Build weighted pool
  const pool = [];
  for (let i = 1; i <= 45; i++) for (let j = 0; j < freq[i]; j++) pool.push(i);

  const picked = new Set();
  while (picked.size < 5) picked.add(pool[Math.floor(Math.random() * pool.length)]);
  return [...picked].sort((a, b) => a - b);
}

/** Count how many of userPicks appear in drawnNumbers */
function countMatches(userPicks, drawnNums) {
  const s = new Set(drawnNums);
  return (userPicks ?? []).filter(n => s.has(n)).length;
}

/** Calculate tier prize pools from base amount + jackpot */
function calcPools(prizeAmount, jackpotAmount) {
  const base = Number(prizeAmount);
  const jackpot = Number(jackpotAmount ?? 0);
  return {
    pool_5match: +(base * 0.40 + jackpot).toFixed(2),
    pool_4match: +(base * 0.35).toFixed(2),
    pool_3match: +(base * 0.25).toFixed(2),
  };
}

// ─── GET /api/admin/draws ─────────────────────────────────────────────────────
router.get('/draws', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('monthly_draws')
      .select('*')
      .order('month_year', { ascending: false });

    if (error) return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse(data ?? []));
  } catch (err) { next(err); }
});

// ─── POST /api/admin/draws ────────────────────────────────────────────────────
router.post(
  '/draws',
  [
    body('month_year').matches(/^\d{4}-\d{2}$/).withMessage('month_year must be YYYY-MM.'),
    body('prize_pool_amount').custom(v => {
      if (isNaN(Number(v)) || Number(v) < 0) throw new Error('prize_pool_amount must be a positive number.');
      return true;
    }),
    body('draw_type').optional().isIn(['random', 'algorithmic']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { month_year } = req.body;
      const prize_pool_amount = Number(req.body.prize_pool_amount);
      const draw_type = req.body.draw_type ?? 'random';

      const { data: existing } = await supabaseAdmin
        .from('monthly_draws').select('id').eq('month_year', month_year).single();
      if (existing) return res.status(400).json(errorResponse(`A draw for ${month_year} already exists.`, 400));

      // Auto-pull jackpot: find most recent drawn draw with no 5-match winner
      let jackpot_amount = 0;
      const { data: prevDraw } = await supabaseAdmin
        .from('monthly_draws')
        .select('id, pool_5match, status')
        .eq('status', 'drawn')
        .order('month_year', { ascending: false })
        .limit(1)
        .single();

      if (prevDraw?.pool_5match) {
        const { count: fiveMatchCount } = await supabaseAdmin
          .from('draw_winners')
          .select('*', { count: 'exact', head: true })
          .eq('draw_id', prevDraw.id)
          .eq('match_type', 5);

        if ((fiveMatchCount ?? 0) === 0) {
          jackpot_amount = Number(prevDraw.pool_5match);
        }
      }

      const pools = calcPools(prize_pool_amount, jackpot_amount);

      const { data, error } = await supabaseAdmin
        .from('monthly_draws')
        .insert({ month_year, prize_pool_amount, draw_type, jackpot_amount, ...pools, status: 'open' })
        .select()
        .single();

      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.status(201).json(createdResponse(data, 'Draw created successfully.'));
    } catch (err) { next(err); }
  }
);

// ─── PATCH /api/admin/draws/:id ───────────────────────────────────────────────
router.patch(
  '/draws/:id',
  [
    param('id').isUUID(),
    body('prize_pool_amount').optional().custom(v => {
      if (isNaN(Number(v)) || Number(v) < 0) throw new Error('prize_pool_amount must be a positive number.');
      return true;
    }),
    body('status').optional().isIn(['open', 'closed', 'drawn']),
    body('draw_type').optional().isIn(['random', 'algorithmic']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = {};
      if (req.body.prize_pool_amount !== undefined) {
        updates.prize_pool_amount = Number(req.body.prize_pool_amount);
        // Recalculate pools when prize amount changes
        const { data: cur } = await supabaseAdmin.from('monthly_draws').select('jackpot_amount').eq('id', id).single();
        Object.assign(updates, calcPools(updates.prize_pool_amount, cur?.jackpot_amount ?? 0));
      }
      if (req.body.status     !== undefined) updates.status     = req.body.status;
      if (req.body.draw_type  !== undefined) updates.draw_type  = req.body.draw_type;

      const { data, error } = await supabaseAdmin
        .from('monthly_draws').update(updates).eq('id', id).select().single();
      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.json(successResponse(data, 'Draw updated.'));
    } catch (err) { next(err); }
  }
);

// ─── POST /api/admin/draws/:id/simulate ───────────────────────────────────────
// Generate hypothetical draw numbers and show potential winners — does NOT commit
router.post(
  '/draws/:id/simulate',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const { data: draw } = await supabaseAdmin
        .from('monthly_draws').select('*').eq('id', id).single();
      if (!draw) return res.status(404).json(errorResponse('Draw not found.', 404));
      if (draw.status === 'drawn') return res.status(400).json(errorResponse('Draw already run.', 400));

      const simNumbers = draw.draw_type === 'algorithmic'
        ? await generateAlgorithmicNumbers()
        : generateRandomNumbers();

      // Match all picks against simulated numbers
      const { data: picks } = await supabaseAdmin
        .from('user_draw_picks')
        .select('user_id, picked_numbers')
        .eq('draw_id', id);

      const tiers = { 5: [], 4: [], 3: [] };
      (picks ?? []).forEach(p => {
        const m = countMatches(p.picked_numbers, simNumbers);
        if (m >= 3) tiers[Math.min(m, 5)].push(p.user_id);
      });

      // Fetch usernames
      const allIds = [...tiers[5], ...tiers[4], ...tiers[3]];
      let profileMap = {};
      if (allIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('profiles').select('user_id, username').in('user_id', allIds);
        (profiles ?? []).forEach(p => { profileMap[p.user_id] = p.username; });
      }

      const buildWinners = (ids, matchType, pool) => ids.map(uid => ({
        username: profileMap[uid] ?? 'Unknown',
        match_type: matchType,
        prize_amount: ids.length > 0 ? +(pool / ids.length).toFixed(2) : 0,
      }));

      const simResult = {
        numbers: simNumbers,
        total_picks: (picks ?? []).length,
        winners: {
          5: buildWinners(tiers[5], 5, draw.pool_5match),
          4: buildWinners(tiers[4], 4, draw.pool_4match),
          3: buildWinners(tiers[3], 3, draw.pool_3match),
        },
        jackpot_rolled: tiers[5].length === 0,
      };

      // Save simulation result to draw (non-committing)
      await supabaseAdmin
        .from('monthly_draws')
        .update({ simulation_numbers: simNumbers, simulation_result: simResult })
        .eq('id', id);

      return res.json(successResponse(simResult, 'Simulation complete — results NOT published.'));
    } catch (err) { next(err); }
  }
);

// ─── POST /api/admin/draws/:id/run ────────────────────────────────────────────
// Generate winning numbers, match against user picks, store winners (unpublished)
router.post(
  '/draws/:id/run',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const { data: draw } = await supabaseAdmin
        .from('monthly_draws').select('*').eq('id', id).single();
      if (!draw) return res.status(404).json(errorResponse('Draw not found.', 404));
      if (draw.status === 'drawn') return res.status(400).json(errorResponse('Draw already run.', 400));

      // Generate winning numbers
      const drawnNumbers = draw.draw_type === 'algorithmic'
        ? await generateAlgorithmicNumbers()
        : generateRandomNumbers();

      // Fetch all picks for this draw
      const { data: picks } = await supabaseAdmin
        .from('user_draw_picks').select('id, user_id, picked_numbers').eq('draw_id', id);

      const tiers = { 5: [], 4: [], 3: [] };
      const matchUpdates = [];

      (picks ?? []).forEach(p => {
        const m = countMatches(p.picked_numbers, drawnNumbers);
        matchUpdates.push({ id: p.id, match_count: m });
        if (m >= 3) tiers[Math.min(m, 5)].push(p.user_id);
      });

      // Update match counts on picks
      for (const u of matchUpdates) {
        await supabaseAdmin.from('user_draw_picks').update({ match_count: u.match_count }).eq('id', u.id);
      }

      // Insert draw_winners rows
      const winnerInserts = [];
      const insertTier = (ids, matchType, pool) => {
        if (ids.length === 0) return;
        const prize = +(pool / ids.length).toFixed(2);
        ids.forEach(uid => winnerInserts.push({ draw_id: id, user_id: uid, match_type: matchType, prize_amount: prize }));
      };
      insertTier(tiers[5], 5, draw.pool_5match);
      insertTier(tiers[4], 4, draw.pool_4match);
      insertTier(tiers[3], 3, draw.pool_3match);

      if (winnerInserts.length > 0) {
        await supabaseAdmin.from('draw_winners').insert(winnerInserts);
      }

      // Update draw: mark as drawn, unpublished
      const { data: updatedDraw, error: upErr } = await supabaseAdmin
        .from('monthly_draws')
        .update({
          status: 'drawn',
          drawn_numbers: drawnNumbers,
          drawn_at: new Date().toISOString(),
          published: false,
        })
        .eq('id', id)
        .select()
        .single();

      if (upErr) return res.status(400).json(errorResponse(upErr.message, 400));

      return res.json(successResponse({
        draw: updatedDraw,
        drawn_numbers: drawnNumbers,
        summary: {
          total_picks: (picks ?? []).length,
          winners_5match: tiers[5].length,
          winners_4match: tiers[4].length,
          winners_3match: tiers[3].length,
          jackpot_rolls_over: tiers[5].length === 0,
        },
      }, 'Draw run successfully. Review and publish when ready.'));
    } catch (err) { next(err); }
  }
);

// ─── POST /api/admin/draws/:id/publish ────────────────────────────────────────
// Make draw results visible to all users
router.post(
  '/draws/:id/publish',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const { data: draw } = await supabaseAdmin
        .from('monthly_draws').select('status, published').eq('id', id).single();
      if (!draw) return res.status(404).json(errorResponse('Draw not found.', 404));
      if (draw.status !== 'drawn') return res.status(400).json(errorResponse('Draw must be run before publishing.', 400));
      if (draw.published) return res.status(400).json(errorResponse('Draw is already published.', 400));

      const { data, error } = await supabaseAdmin
        .from('monthly_draws').update({ published: true }).eq('id', id).select().single();
      if (error) return res.status(400).json(errorResponse(error.message, 400));

      // ── Fire-and-forget email notifications ───────────────────────────────
      // 1. Notify winners with winner alert
      // 2. Notify all participants with results notification
      setImmediate(async () => {
        try {
          const monthYear = data.month_year;

          // Fetch winners with emails
          const { data: winners } = await supabaseAdmin
            .from('draw_winners')
            .select('user_id, match_type, prize_amount')
            .eq('draw_id', id);

          // Fetch all participants (users who submitted picks)
          const { data: picks } = await supabaseAdmin
            .from('user_draw_picks')
            .select('user_id, match_count')
            .eq('draw_id', id);

          // Gather all unique user IDs
          const winnerIds    = new Set((winners ?? []).map(w => w.user_id));
          const participantIds = [...new Set((picks ?? []).map(p => p.user_id))];
          const allIds       = [...new Set([...winnerIds, ...participantIds])];

          if (allIds.length === 0) return;

          // Fetch auth emails from Supabase admin
          const emailMap = {};
          const usernameMap = {};
          const matchMap = {};
          (picks ?? []).forEach(p => { matchMap[p.user_id] = p.match_count; });

          for (const uid of allIds) {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(uid);
            const { data: profile  } = await supabaseAdmin.from('profiles').select('username').eq('user_id', uid).single();
            if (authUser?.user?.email) emailMap[uid] = authUser.user.email;
            if (profile?.username)     usernameMap[uid] = profile.username;
          }

          // Send winner alerts
          for (const w of (winners ?? [])) {
            const to = emailMap[w.user_id];
            if (!to) continue;
            await email.sendWinnerAlert({
              to, username: usernameMap[w.user_id] ?? 'Golfer',
              monthYear, matchType: w.match_type, prizeAmount: w.prize_amount,
            });
          }

          // Send draw results to non-winning participants
          for (const uid of participantIds) {
            if (winnerIds.has(uid)) continue; // winners already got a richer email
            const to = emailMap[uid];
            if (!to) continue;
            await email.sendDrawResultsNotification({
              to, username: usernameMap[uid] ?? 'Golfer',
              monthYear, matchCount: matchMap[uid] ?? 0,
            });
          }
        } catch (emailErr) {
          console.error('[publish] Email notification error:', emailErr.message);
        }
      });

      return res.json(successResponse(data, 'Draw results published successfully.'));
    } catch (err) { next(err); }
  }
);

// ─── GET /api/admin/winners ───────────────────────────────────────────────────
// Full winners list across all draws with user info + verification/payment status
router.get('/winners', async (req, res, next) => {
  try {
    const { verification_status, payment_status } = req.query;

    let query = supabaseAdmin
      .from('draw_winners')
      .select('*, monthly_draws(month_year, drawn_numbers)')
      .order('created_at', { ascending: false });

    if (verification_status) query = query.eq('verification_status', verification_status);
    if (payment_status)       query = query.eq('payment_status', payment_status);

    const { data: winners, error } = await query;
    if (error) return res.status(400).json(errorResponse(error.message, 400));

    // Enrich with usernames
    const userIds = [...new Set((winners ?? []).map(w => w.user_id))];
    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles').select('user_id, username').in('user_id', userIds);
      (profiles ?? []).forEach(p => { profileMap[p.user_id] = p.username; });
    }

    const enriched = (winners ?? []).map(w => ({
      ...w,
      username: profileMap[w.user_id] ?? 'Unknown',
    }));

    return res.json(successResponse(enriched));
  } catch (err) { next(err); }
});

// ─── PATCH /api/admin/winners/:id ─────────────────────────────────────────────
// Approve/reject verification and mark as paid
router.patch(
  '/winners/:id',
  [
    param('id').isUUID(),
    body('verification_status').optional().isIn(['pending', 'submitted', 'approved', 'rejected']),
    body('payment_status').optional().isIn(['pending', 'paid']),
    body('rejection_reason').optional({ nullable: true }).isLength({ max: 500 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = {};

      if (req.body.verification_status !== undefined) {
        updates.verification_status = req.body.verification_status;
        updates.reviewed_at = new Date().toISOString();
        updates.reviewed_by = req.user.id;
        if (req.body.verification_status === 'rejected' && req.body.rejection_reason) {
          updates.rejection_reason = req.body.rejection_reason;
        }
      }
      if (req.body.payment_status !== undefined) {
        updates.payment_status = req.body.payment_status;
      }

      const { data, error } = await supabaseAdmin
        .from('draw_winners').update(updates).eq('id', id).select().single();
      if (error) return res.status(400).json(errorResponse(error.message, 400));

      // Fire-and-forget email on status changes
      setImmediate(async () => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
          const { data: profile  } = await supabaseAdmin.from('profiles').select('username').eq('user_id', data.user_id).single();
          const to       = authUser?.user?.email;
          const username = profile?.username ?? 'Golfer';
          if (!to) return;

          if (updates.verification_status === 'approved') {
            await email.sendVerificationApproved({ to, username, prizeAmount: data.prize_amount });
          } else if (updates.verification_status === 'rejected') {
            await email.sendVerificationRejected({ to, username, reason: updates.rejection_reason });
          } else if (updates.payment_status === 'paid') {
            await email.sendPaymentSent({ to, username, prizeAmount: data.prize_amount });
          }
        } catch (emailErr) {
          console.error('[winner-patch] Email error:', emailErr.message);
        }
      });

      return res.json(successResponse(data, 'Winner updated.'));
    } catch (err) { next(err); }
  }
);

// ─── GET /api/admin/users/:id/scores ─────────────────────────────────────────
router.get('/users/:id/scores', [param('id').isUUID()], validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('golf_scores')
      .select('*')
      .eq('user_id', req.params.id)
      .order('score_date', { ascending: false });
    if (error) return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse(data ?? []));
  } catch (err) { next(err); }
});

// ─── DELETE /api/admin/scores/:id ─────────────────────────────────────────────
router.delete('/scores/:id', [param('id').isUUID()], validate, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('golf_scores').delete().eq('id', req.params.id);
    if (error) return res.status(400).json(errorResponse(error.message, 400));
    return res.json(successResponse(null, 'Score deleted.'));
  } catch (err) { next(err); }
});

// ─── PATCH /api/admin/scores/:id ──────────────────────────────────────────────
router.patch(
  '/scores/:id',
  [
    param('id').isUUID(),
    body('stableford_points').optional().isInt({ min: 0, max: 60 }),
    body('gross_score').optional().isInt({ min: 1, max: 200 }),
    body('course_name').optional().trim().notEmpty(),
    body('score_date').optional().isISO8601(),
    body('notes').optional({ nullable: true }).isLength({ max: 500 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const fields = ['stableford_points', 'gross_score', 'course_name', 'score_date', 'notes'];
      const updates = {};
      fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      const { data, error } = await supabaseAdmin
        .from('golf_scores').update(updates).eq('id', req.params.id).select().single();
      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.json(successResponse(data, 'Score updated.'));
    } catch (err) { next(err); }
  }
);

// ─── PATCH /api/admin/subscriptions/:id ───────────────────────────────────────
router.patch(
  '/subscriptions/:id',
  [
    param('id').isUUID(),
    body('status').optional().isIn(['active', 'cancelled', 'past_due']),
    body('plan_type').optional().isIn(['monthly', 'yearly']),
    body('current_period_end').optional().isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const fields = ['status', 'plan_type', 'current_period_end'];
      const updates = {};
      fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      const { data, error } = await supabaseAdmin
        .from('subscriptions').update(updates).eq('id', req.params.id).select().single();
      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.json(successResponse(data, 'Subscription updated.'));
    } catch (err) { next(err); }
  }
);

// ─── GET /api/admin/subscriptions ────────────────────────────────────────────
router.get('/subscriptions', async (req, res, next) => {
  try {
    // Fetch all subscriptions
    const { data: subs, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json(errorResponse(error.message, 400));

    // Fetch matching profiles
    const userIds = [...new Set((subs ?? []).map(s => s.user_id))];
    let profiles = [];
    if (userIds.length > 0) {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);
      profiles = p ?? [];
    }

    const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));

    const enriched = (subs ?? []).map(s => ({
      ...s,
      username: profileMap[s.user_id]?.username ?? 'Unknown',
    }));

    return res.json(successResponse(enriched));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/charities ─────────────────────────────────────────────────
router.get('/charities', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('charities')
      .select('*')
      .order('name', { ascending: true });

    if (error) return res.status(400).json(errorResponse(error.message, 400));

    return res.json(successResponse(data ?? []));
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/charities ────────────────────────────────────────────────
router.post(
  '/charities',
  [
    body('name').trim().notEmpty().withMessage('Charity name is required.').isLength({ max: 200 }),
    body('description').optional({ nullable: true }).isLength({ max: 500 }),
    body('website').optional({ nullable: true }).isURL().withMessage('Website must be a valid URL.'),
    body('image_url').optional({ nullable: true }).isURL().withMessage('Image URL must be a valid URL.'),
    body('is_featured').optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, description, website, image_url, is_featured } = req.body;

      const { data, error } = await supabaseAdmin
        .from('charities')
        .insert({
          name,
          description: description ?? null,
          website: website ?? null,
          image_url: image_url ?? null,
          is_featured: is_featured ?? false,
          is_active: true,
        })
        .select()
        .single();

      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.status(201).json(createdResponse(data, 'Charity added successfully.'));
    } catch (err) { next(err); }
  }
);

// ─── PATCH /api/admin/charities/:id ──────────────────────────────────────────
router.patch(
  '/charities/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty().isLength({ max: 200 }),
    body('description').optional({ nullable: true }).isLength({ max: 500 }),
    body('website').optional({ nullable: true }).isURL(),
    body('image_url').optional({ nullable: true }).isURL(),
    body('is_active').optional().isBoolean(),
    body('is_featured').optional().isBoolean(),
    body('events').optional().isArray(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const fields = ['name', 'description', 'website', 'image_url', 'is_active', 'is_featured', 'events'];
      const updates = {};
      fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      const { data, error } = await supabaseAdmin
        .from('charities').update(updates).eq('id', id).select().single();
      if (error) return res.status(400).json(errorResponse(error.message, 400));
      return res.json(successResponse(data, 'Charity updated.'));
    } catch (err) { next(err); }
  }
);

module.exports = router;

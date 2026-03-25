const { supabaseAdmin } = require('../services/supabase');
const {
  successResponse,
  errorResponse,
  createdResponse,
  deletedResponse,
} = require('../utils/response');

/**
 * Refresh draw_entries for a user based on their current score count and subscription plan.
 * Called non-blocking (via setImmediate) after score create/delete.
 */
async function refreshDrawEntries(userId) {
  try {
    const { data: draw } = await supabaseAdmin
      .from('monthly_draws')
      .select('id')
      .eq('status', 'open')
      .order('month_year', { ascending: false })
      .limit(1)
      .single();

    if (!draw) return;

    const { count } = await supabaseAdmin
      .from('golf_scores')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const entriesPerRound = sub?.plan_type === 'yearly' ? 2 : 1;
    const entries_count = (count ?? 0) * entriesPerRound;

    if (entries_count === 0) {
      await supabaseAdmin
        .from('draw_entries')
        .delete()
        .eq('draw_id', draw.id)
        .eq('user_id', userId);
      return;
    }

    await supabaseAdmin
      .from('draw_entries')
      .upsert(
        { draw_id: draw.id, user_id: userId, entries_count },
        { onConflict: 'draw_id,user_id' }
      );
  } catch (_) {
    // Non-critical — never block the score operation
  }
}

/**
 * GET /api/scores
 * List all golf scores for the authenticated user, with optional pagination.
 */
async function getScores(req, res, next) {
  try {
    const userId = req.user.id;

    // Always return last 5 scores, newest first
    const { data: scores, error } = await supabaseAdmin
      .from('golf_scores')
      .select('*')
      .eq('user_id', userId)
      .order('score_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return res.status(400).json(errorResponse(error.message, 400));
    }

    return res.json(successResponse(scores ?? []));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/scores/:id
 * Get a single score by ID (must belong to authenticated user).
 */
async function getScore(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: score, error } = await supabaseAdmin
      .from('golf_scores')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !score) {
      return res.status(404).json(errorResponse('Score not found.', 404));
    }

    return res.json(successResponse(score));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/scores
 * Create a new golf score for the authenticated user.
 */
async function createScore(req, res, next) {
  try {
    const userId = req.user.id;
    const { score_date, course_name, stableford_points, gross_score, handicap_at_time, notes } =
      req.body;

    // Insert the new score
    const { data: score, error } = await supabaseAdmin
      .from('golf_scores')
      .insert({
        user_id: userId,
        score_date,
        course_name,
        stableford_points,
        gross_score: gross_score ?? null,
        handicap_at_time: handicap_at_time ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json(errorResponse(error.message, 400));
    }

    // Enforce max 5 scores — fetch all scores ordered oldest first
    const { data: allScores } = await supabaseAdmin
      .from('golf_scores')
      .select('id, score_date, created_at')
      .eq('user_id', userId)
      .order('score_date', { ascending: true })  // oldest first
      .order('created_at', { ascending: true });

    // If user now has more than 5, delete the oldest ones
    if (allScores && allScores.length > 5) {
      const toDelete = allScores.slice(0, allScores.length - 5); // everything beyond 5
      const idsToDelete = toDelete.map(s => s.id);

      await supabaseAdmin
        .from('golf_scores')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', userId);
    }

    setImmediate(() => refreshDrawEntries(userId));
    return res.status(201).json(createdResponse(score, 'Score logged successfully.'));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/scores/:id
 * Update a golf score (must belong to authenticated user).
 */
async function updateScore(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { score_date, course_name, stableford_points, gross_score, handicap_at_time, notes } =
      req.body;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('golf_scores')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json(errorResponse('Score not found.', 404));
    }

    const updates = {};
    if (score_date !== undefined) updates.score_date = score_date;
    if (course_name !== undefined) updates.course_name = course_name;
    if (stableford_points !== undefined) updates.stableford_points = stableford_points;
    if (gross_score !== undefined) updates.gross_score = gross_score;
    if (handicap_at_time !== undefined) updates.handicap_at_time = handicap_at_time;
    if (notes !== undefined) updates.notes = notes;

    const { data: score, error } = await supabaseAdmin
      .from('golf_scores')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json(errorResponse(error.message, 400));
    }

    return res.json(successResponse(score, 'Score updated successfully.'));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/scores/:id
 * Delete a golf score (must belong to authenticated user).
 */
async function deleteScore(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: existing } = await supabaseAdmin
      .from('golf_scores')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json(errorResponse('Score not found.', 404));
    }

    const { error } = await supabaseAdmin
      .from('golf_scores')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json(errorResponse(error.message, 400));
    }

    setImmediate(() => refreshDrawEntries(userId));
    return res.json(deletedResponse('Score deleted successfully.'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/scores/stats
 * Return aggregated stats for the authenticated user.
 */
async function getStats(req, res, next) {
  try {
    const userId = req.user.id;

    const { data: scores, error } = await supabaseAdmin
      .from('golf_scores')
      .select('stableford_points, score_date')
      .eq('user_id', userId)
      .order('score_date', { ascending: false });

    if (error) {
      return res.status(400).json(errorResponse(error.message, 400));
    }

    if (!scores || scores.length === 0) {
      return res.json(
        successResponse({
          totalRounds: 0,
          averageStableford: null,
          bestStableford: null,
          recentTrend: [],
        })
      );
    }

    const points = scores.map((s) => s.stableford_points);
    const totalRounds = scores.length;
    const averageStableford = Math.round(
      points.reduce((a, b) => a + b, 0) / totalRounds
    );
    const bestStableford = Math.max(...points);
    const recentTrend = scores.slice(0, 10).map((s) => ({
      date: s.score_date,
      points: s.stableford_points,
    }));

    return res.json(
      successResponse({
        totalRounds,
        averageStableford,
        bestStableford,
        recentTrend,
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { getScores, getScore, createScore, updateScore, deleteScore, getStats };

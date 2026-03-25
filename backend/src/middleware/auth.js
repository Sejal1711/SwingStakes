const { supabaseAdmin } = require('../services/supabase');
const { errorResponse } = require('../utils/response');

/**
 * Verify Supabase JWT, attach user + their role to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse('No authentication token provided.', 401));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json(errorResponse('Invalid token format.', 401));
    }

    // 1. Verify JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json(errorResponse('Token is invalid or expired.', 401));
    }

    // 2. Fetch the user's role from profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, username, avatar_url, handicap')
      .eq('user_id', user.id)
      .single();

    // Attach user + role to request
    req.user = {
      ...user,
      role: profile?.role ?? 'subscriber',
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      handicap: profile?.handicap ?? null,
    };
    req.token = token;

    next();
  } catch (err) {
    console.error('[auth middleware] Error:', err);
    return res.status(500).json(errorResponse('Authentication failed.', 500));
  }
}

/**
 * Optional authentication — attaches user if token is provided, but doesn't block.
 */
async function optionalAuthenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, username')
        .eq('user_id', user.id)
        .single();

      req.user = {
        ...user,
        role: profile?.role ?? 'subscriber',
        username: profile?.username ?? null,
      };
      req.token = token;
    }
  } catch {
    // Silently fail for optional auth
  }
  next();
}

/**
 * Role-based access control middleware.
 * Usage: requireRole('admin') or requireRole('admin', 'subscriber')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('Not authenticated.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        errorResponse(`Access denied. Required role: ${roles.join(' or ')}.`, 403)
      );
    }

    next();
  };
}

/**
 * Subscription access control middleware.
 * Blocks users with no active subscription.
 * Admins are always allowed through.
 * Also handles lapsed subscriptions (period has ended).
 */
async function requireActiveSubscription(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse('Not authenticated.', 401));
    }

    // Admins bypass subscription check
    if (req.user.role === 'admin') return next();

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return res.status(403).json(
        errorResponse('An active subscription is required to access this feature.', 403, {
          code: 'NO_SUBSCRIPTION',
          redirect: '/pricing',
        })
      );
    }

    // Check if subscription period has lapsed (expired but not yet updated by webhook)
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end);
      if (periodEnd < new Date()) {
        return res.status(403).json(
          errorResponse('Your subscription has expired. Please renew to continue.', 403, {
            code: 'SUBSCRIPTION_EXPIRED',
            redirect: '/pricing',
          })
        );
      }
    }

    // Attach subscription info to request for use in controllers
    req.subscription = subscription;
    next();
  } catch (err) {
    console.error('[requireActiveSubscription] Error:', err);
    return res.status(500).json(errorResponse('Subscription check failed.', 500));
  }
}

module.exports = { authenticate, optionalAuthenticate, requireRole, requireActiveSubscription };

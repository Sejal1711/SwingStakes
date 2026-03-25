const { supabaseAdmin, supabasePublic } = require('../services/supabase');
const { successResponse, errorResponse, createdResponse } = require('../utils/response');

/**
 * POST /api/auth/register
 * Creates a new user account via Supabase Auth and a corresponding profile.
 */
async function register(req, res, next) {
  try {
    const { email, password, username } = req.body;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { username },
    });

    if (authError) {
      // Handle duplicate email specifically
      if (authError.message.includes('already registered')) {
        return res.status(409).json(errorResponse('An account with this email already exists.', 409));
      }
      return res.status(400).json(errorResponse(authError.message, 400));
    }

    const user = authData.user;

    // Create profile record
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: user.id,
        username,
      });

    if (profileError) {
      console.error('[register] Profile creation failed:', profileError);
      // Non-fatal: user is created, profile can be retried
    }

    return res.status(201).json(
      createdResponse(
        { id: user.id, email: user.email, username },
        'Account created successfully. Please check your email to verify your account.'
      )
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Signs in a user with email and password and returns a session token.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json(errorResponse('Invalid email or password.', 401));
    }

    return res.json(
      successResponse(
        {
          user: {
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata?.username,
          },
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          },
        },
        'Signed in successfully.'
      )
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Invalidates the current session.
 */
async function logout(req, res, next) {
  try {
    const { error } = await supabasePublic.auth.signOut();

    if (error) {
      return res.status(400).json(errorResponse(error.message, 400));
    }

    return res.json(successResponse(null, 'Signed out successfully.'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Exchanges a refresh token for a new session.
 */
async function refreshToken(req, res, next) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json(errorResponse('Refresh token is required.', 400));
    }

    const { data, error } = await supabasePublic.auth.refreshSession({ refresh_token });

    if (error) {
      return res.status(401).json(errorResponse('Refresh token is invalid or expired.', 401));
    }

    return res.json(
      successResponse(
        {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
        'Token refreshed.'
      )
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the current authenticated user and their profile.
 */
async function getMe(req, res, next) {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(400).json(errorResponse(error.message, 400));
    }

    return res.json(
      successResponse({
        user: {
          id: req.user.id,
          email: req.user.email,
          username: req.user.user_metadata?.username,
          emailVerified: !!req.user.email_confirmed_at,
        },
        profile: profile || null,
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, refreshToken, getMe };

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const { successResponse, errorResponse, createdResponse } = require('../utils/response');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json(errorResponse('Validation failed', 422, errors.array()));
  }
  next();
}

/**
 * GET /api/subscriptions/me
 * Get the current user's active subscription.
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    // Return the most recent subscription regardless of status
    // so the frontend can show cancelled/expired states too
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(400).json(errorResponse(error.message, 400));
    }

    return res.json(successResponse(subscription || null, 'Subscription fetched.'));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/subscriptions/create-checkout
 * Creates a Stripe checkout session for a new subscription.
 */
router.post(
  '/create-checkout',
  authenticate,
  [
    body('plan_type')
      .isIn(['monthly', 'yearly'])
      .withMessage('plan_type must be monthly or yearly.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const { plan_type } = req.body;

      const priceMap = {
        monthly: process.env.STRIPE_MONTHLY_PRICE_ID,
        yearly: process.env.STRIPE_YEARLY_PRICE_ID,
      };

      const priceId = priceMap[plan_type];

      if (!priceId) {
        return res.status(400).json(
          errorResponse(`Stripe price ID not configured for ${plan_type} plan.`, 400)
        );
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: req.user.email,
        metadata: {
          user_id: req.user.id,
          plan_type,
        },
        success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
        cancel_url: `${process.env.FRONTEND_URL}/pricing?subscription=cancelled`,
      });

      return res.json(successResponse({ checkout_url: session.url, session_id: session.id }));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/subscriptions/webhook
 * Stripe webhook handler — updates subscription status in the database.
 * Note: raw body parsing is configured in src/index.js for this route.
 */
router.post('/webhook', async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_id, plan_type } = session.metadata;

        // Fetch the subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        await supabaseAdmin.from('subscriptions').upsert({
          user_id,
          plan_type,
          status: 'active',
          stripe_subscription_id: subscription.id,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const status = subscription.status === 'active' ? 'active' : 'cancelled';

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/subscriptions/cancel
 * Cancels the current user's Stripe subscription at period end.
 */
router.delete('/cancel', authenticate, async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();

    if (error || !subscription) {
      return res.status(404).json(errorResponse('No active subscription found.', 404));
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return res.json(
      successResponse(null, 'Subscription will be cancelled at the end of the current period.')
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;

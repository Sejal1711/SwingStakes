import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Trophy, Heart, Zap, Crown, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'monthly',
    name: 'GreenPass Monthly',
    price: '£9.99',
    period: '/month',
    description: 'Perfect for trying out the platform',
    badge: null,
    features: [
      'Unlimited Stableford score tracking',
      'Monthly prize draw entry',
      'Choose your charity recipient',
      'Performance stats & history',
      'Mobile-friendly scorecard',
    ],
    cta: 'Start Monthly',
    highlight: false,
  },
  {
    id: 'yearly',
    name: 'GreenPass Annual',
    price: '£99.99',
    period: '/year',
    description: 'Best value — save over 2 months',
    badge: 'Best Value',
    savings: 'Save £19.89',
    features: [
      'Everything in Monthly',
      '2 months free vs monthly billing',
      'Priority draw entries',
      'Early access to new features',
      'Annual performance report',
    ],
    cta: 'Start Annual',
    highlight: true,
  },
];

const TRUST_ITEMS = [
  { icon: Trophy, text: 'Monthly prize draws for all subscribers' },
  { icon: Heart, text: 'A portion of every subscription goes to your chosen charity' },
  { icon: Zap, text: 'Cancel anytime — no lock-in contracts' },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');

  // Show a banner if redirected here because subscription is required
  const params = new URLSearchParams(window.location.search);
  const gated = params.get('reason') === 'subscription_required';

  async function handleSubscribe(planId) {
    if (!user) {
      navigate('/register');
      return;
    }

    setLoadingPlan(planId);
    setError('');

    try {
      const { session } = (await import('@/lib/supabase')).supabase.auth;
      const { data: sessionData } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/subscriptions/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plan_type: planId }),
        }
      );

      const json = await res.json();

      if (!res.ok || !json.data?.checkout_url) {
        setError(json.message || 'Failed to start checkout. Please try again.');
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = json.data.checkout_url;
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-16">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-sm text-emerald-400 mb-4">
            <Trophy className="w-4 h-4" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose your{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              GreenPass
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Track your golf. Support a charity. Win monthly prizes.
            One subscription, three ways to feel good.
          </p>
        </motion.div>

        {/* Gated access notice */}
        {gated && (
          <div className="max-w-md mx-auto mb-6 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
            A GreenPass subscription is required to access that feature.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-8 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'relative rounded-2xl border p-8 flex flex-col',
                plan.highlight
                  ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.1)]'
                  : 'border-white/10 bg-white/5'
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-semibold px-4 py-1 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan info */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-1">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground mb-1">{plan.period}</span>
                </div>
                {plan.savings && (
                  <span className="text-xs text-emerald-400 font-medium mt-1 block">
                    {plan.savings}
                  </span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingPlan !== null}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                  plan.highlight
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:opacity-90 hover:scale-[1.01]'
                    : 'bg-white/10 text-foreground hover:bg-white/15 hover:scale-[1.01]',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                )}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to checkout...
                  </>
                ) : (
                  plan.cta
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          {TRUST_ITEMS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-emerald-400" />
              </div>
              {text}
            </div>
          ))}
        </motion.div>

        {/* FAQ note */}
        <p className="text-center text-xs text-muted-foreground mt-12">
          Payments processed securely by Stripe. Cancel anytime from your account settings.
          <br />
          Prices include VAT where applicable.
        </p>
      </div>
    </div>
  );
}

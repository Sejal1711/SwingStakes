import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Trophy, Heart, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SubscriptionSuccess() {
  const { user, fetchProfile } = useAuth();

  // Refresh profile so subscription state updates
  useEffect(() => {
    if (user?.id) fetchProfile(user.id);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative text-center max-w-md"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </motion.div>

        <h1 className="text-3xl font-bold mb-3">You&apos;re in!</h1>
        <p className="text-muted-foreground mb-8">
          Welcome to GreenPass. Your subscription is now active — time to track some rounds,
          pick your charity, and get entered into this month&apos;s prize draw.
        </p>

        {/* What's next cards */}
        <div className="space-y-3 mb-8 text-left">
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Enter your first score</p>
              <p className="text-xs text-muted-foreground">Start tracking your Stableford points</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Choose your charity</p>
              <p className="text-xs text-muted-foreground">Pick the cause your subscription supports</p>
            </div>
          </div>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all hover:scale-[1.02]"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  );
}

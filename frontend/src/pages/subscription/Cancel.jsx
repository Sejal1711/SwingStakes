import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react';

export default function SubscriptionCancel() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6"
        >
          <XCircle className="w-10 h-10 text-amber-400" />
        </motion.div>

        <h1 className="text-3xl font-bold mb-3">Payment cancelled</h1>
        <p className="text-muted-foreground mb-8">
          No worries — nothing was charged. Your subscription has not started.
          You can try again whenever you&apos;re ready.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-white/10 text-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white/15 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

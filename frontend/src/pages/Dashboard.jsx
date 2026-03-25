import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, TrendingUp, Heart, Gift, LogOut, Plus,
  ChevronRight, Target, Calendar, CheckCircle, Crown,
  AlertTriangle, XCircle, Loader2, AlertCircle, RotateCcw,
  Upload, Clock, BadgeCheck, Ban, Banknote,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getInitials, cn } from '@/lib/utils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const quickActions = [
  { label: 'Log a Round', icon: Plus,      to: '/scores',  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'My Scores',   icon: TrendingUp, to: '/scores',  color: 'text-blue-400',   bg: 'bg-blue-500/10'    },
  { label: 'Monthly Draw',icon: Gift,       to: '/prizes',  color: 'text-amber-400',  bg: 'bg-amber-500/10'   },
  { label: 'My Charity',  icon: Heart,      to: '/charity', color: 'text-rose-400',   bg: 'bg-rose-500/10'    },
];

// ─── Cancel Confirmation Modal ────────────────────────────────────────────────
function CancelModal({ onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-lg font-bold mb-2">Cancel Subscription?</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your GreenPass will remain active until the end of your current billing period.
          After that, you'll lose access to score tracking, draw entries, and charity contributions.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-destructive text-destructive-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling...</> : 'Yes, Cancel'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-white/10 text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-white/15 transition-colors"
          >
            Keep It
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Subscription Banner ──────────────────────────────────────────────────────
function SubscriptionBanner({ subscription, loading, onCancel, cancelling }) {
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className="mb-8 rounded-2xl p-6 bg-gradient-to-r from-primary/20 via-emerald-600/15 to-teal-600/10 border border-primary/20">
        <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  // No subscription at all
  if (!subscription) {
    return (
      <div className="mb-8 rounded-2xl p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Subscription Status</p>
            <p className="font-semibold text-amber-400">No active subscription</p>
            <p className="text-sm text-muted-foreground mt-1">Subscribe to start tracking, giving, and winning.</p>
          </div>
          <Link to="/pricing" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all hover:scale-105 shrink-0">
            Subscribe Now
          </Link>
        </div>
      </div>
    );
  }

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const isExpired = subscription.current_period_end && new Date(subscription.current_period_end) < new Date();

  // Cancelled (but still active until period end)
  if (subscription.status === 'cancelled') {
    return (
      <div className="mb-8 rounded-2xl p-6 bg-gradient-to-r from-orange-500/10 to-red-500/5 border border-orange-500/20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-0.5">Subscription Status</p>
              <p className="font-semibold text-orange-400 capitalize">GreenPass {subscription.plan_type} — Cancelled</p>
              {periodEnd && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isExpired ? 'Expired on' : 'Access until'} {periodEnd}
                </p>
              )}
            </div>
          </div>
          <Link to="/pricing" className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shrink-0">
            <RotateCcw className="w-4 h-4" /> Resubscribe
          </Link>
        </div>
      </div>
    );
  }

  // Past due
  if (subscription.status === 'past_due') {
    return (
      <div className="mb-8 rounded-2xl p-6 bg-gradient-to-r from-red-500/10 to-rose-500/5 border border-red-500/20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-0.5">Subscription Status</p>
              <p className="font-semibold text-red-400">Payment Failed — Action Required</p>
              <p className="text-xs text-muted-foreground mt-0.5">Please update your payment details to keep access.</p>
            </div>
          </div>
          <Link to="/pricing" className="bg-destructive text-destructive-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-all shrink-0">
            Update Payment
          </Link>
        </div>
      </div>
    );
  }

  // Active subscription
  return (
    <>
      <AnimatePresence>
        {showModal && (
          <CancelModal
            onConfirm={async () => { await onCancel(); setShowModal(false); }}
            onClose={() => setShowModal(false)}
            loading={cancelling}
          />
        )}
      </AnimatePresence>

      <div className="mb-8 rounded-2xl p-6 bg-gradient-to-r from-primary/20 via-emerald-600/15 to-teal-600/10 border border-primary/20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              {subscription.plan_type === 'yearly'
                ? <Crown className="w-5 h-5 text-amber-400" />
                : <CheckCircle className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-0.5">Subscription Status</p>
              <p className={cn('font-semibold capitalize', subscription.plan_type === 'yearly' ? 'text-amber-400' : 'text-emerald-400')}>
                GreenPass {subscription.plan_type} — Active
              </p>
              {periodEnd && (
                <p className="text-xs text-muted-foreground mt-0.5">Renews {periodEnd}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2 shrink-0"
          >
            Cancel subscription
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [subscription, setSubscription]   = useState(null);
  const [subLoading, setSubLoading]       = useState(true);
  const [cancelling, setCancelling]       = useState(false);
  const [cancelError, setCancelError]     = useState('');

  // Real data for stat cards + recent rounds
  const [scores, setScores]               = useState([]);
  const [scoreStats, setScoreStats]       = useState({ averageStableford: null });
  const [drawStats, setDrawStats]         = useState({ entries: 0, prizePool: null, monthYear: null });
  const [statsLoading, setStatsLoading]   = useState(false);

  // Winnings
  const [winnings, setWinnings]           = useState([]);
  const [winningsLoading, setWinningsLoading] = useState(false);
  const [proofInput, setProofInput]       = useState({}); // winnerId -> url string
  const [submittingProof, setSubmittingProof] = useState(null);
  const [proofMsg, setProofMsg]           = useState('');

  const displayName =
    user?.user_metadata?.username || user?.email?.split('@')[0] || 'Golfer';

  // Fetch scores, draw entries (only when user has an active subscription)
  const fetchDashboardData = useCallback(async (token) => {
    setStatsLoading(true);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [scoresRes, statsRes, drawRes] = await Promise.all([
        fetch(`${API}/api/scores`, { headers: h }),
        fetch(`${API}/api/scores/stats`, { headers: h }),
        fetch(`${API}/api/draws/current`, { headers: h }),
      ]);
      const [scoresJson, statsJson, drawJson] = await Promise.all([
        scoresRes.json(), statsRes.json(), drawRes.json(),
      ]);
      setScores(scoresJson.data ?? []);
      setScoreStats({ averageStableford: statsJson.data?.averageStableford ?? null });

      const draw = drawJson.data;
      if (draw) {
        const entriesRes  = await fetch(`${API}/api/draws/${draw.id}/my-entries`, { headers: h });
        const entriesJson = await entriesRes.json();
        setDrawStats({
          entries:   entriesJson.data?.entries_count ?? 0,
          prizePool: draw.prize_pool_amount,
          monthYear: draw.month_year,
        });
      }
    } catch (_) { /* silently ignore */ }
    finally { setStatsLoading(false); }
  }, []);

  const fetchWinnings = useCallback(async (token) => {
    setWinningsLoading(true);
    try {
      const res  = await fetch(`${API}/api/draws/my-winnings`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setWinnings(json.data ?? []);
    } catch (_) { /* ignore */ }
    finally { setWinningsLoading(false); }
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setSubLoading(false); return; }
      const res  = await fetch(`${API}/api/subscriptions/me`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const sub  = json.data ?? null;
      setSubscription(sub);
      if (sub?.status === 'active') fetchDashboardData(token);
      fetchWinnings(token); // always fetch winnings (regardless of sub status)
    } catch (_) {
      setSubscription(null);
    } finally {
      setSubLoading(false);
    }
  }, [fetchDashboardData, fetchWinnings]);

  async function handleSubmitProof(winnerId) {
    const url = proofInput[winnerId]?.trim();
    if (!url) return;
    setSubmittingProof(winnerId);
    setProofMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API}/api/draws/winners/${winnerId}/submit-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ proof_url: url }),
      });
      const json = await res.json();
      if (res.ok) {
        setProofMsg(json.message || 'Proof submitted.');
        setProofInput(p => ({ ...p, [winnerId]: '' }));
        fetchWinnings(token);
        setTimeout(() => setProofMsg(''), 4000);
      } else {
        setProofMsg(json.message || 'Failed to submit.');
      }
    } catch (_) {
      setProofMsg('Something went wrong.');
    } finally {
      setSubmittingProof(null);
    }
  }

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  async function handleCancel() {
    setCancelling(true);
    setCancelError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res  = await fetch(`${API}/api/subscriptions/cancel`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) { setCancelError(json.message || 'Failed to cancel.'); return; }
      // Refresh subscription state
      await fetchSubscription();
    } catch (_) {
      setCancelError('Something went wrong. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-white/5 glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight">SwingStakes</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: 'Dashboard', to: '/dashboard' },
                { label: 'Scores',    to: '/scores'    },
                { label: 'Prizes',    to: '/prizes'    },
                { label: 'Charity',   to: '/charity'   },
              ].map(item => (
                <Link key={item.to} to={item.to} className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-xs font-bold text-white">
                  {getInitials(displayName)}
                </div>
                <span className="text-sm font-medium">{displayName}</span>
              </div>
              <button onClick={signOut} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            Welcome back, <span className="text-gradient">{displayName}</span>
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </motion.div>

        {/* Cancel error */}
        {cancelError && (
          <div className="mb-4 flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {cancelError}
          </div>
        )}

        {/* Subscription banner */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <SubscriptionBanner
            subscription={subscription}
            loading={subLoading}
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        </motion.div>

        {/* Stat cards */}
        {(() => {
          const currentMonth = new Date().toISOString().slice(0, 7);
          const roundsThisMonth = scores.filter(s => s.score_date?.startsWith(currentMonth)).length;
          const avgPts = scoreStats.averageStableford;
          // Estimate charity raised: £0.50/month since subscription started
          const charityRaised = (() => {
            if (!subscription?.created_at) return '£0.00';
            const months = Math.max(1, Math.round(
              (Date.now() - new Date(subscription.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
            ));
            return `£${(months * 0.5).toFixed(2)}`;
          })();
          const statCards = [
            { label: 'Rounds This Month', value: statsLoading ? '…' : String(roundsThisMonth), icon: Target,     color: 'text-emerald-400' },
            { label: 'Avg Stableford',    value: statsLoading ? '…' : (avgPts != null ? String(avgPts) : '--'),  icon: TrendingUp, color: 'text-blue-400'    },
            { label: 'Draw Entries',      value: statsLoading ? '…' : String(drawStats.entries),                 icon: Gift,       color: 'text-amber-400'   },
            { label: 'Charity Raised',    value: subLoading   ? '…' : charityRaised,                            icon: Heart,      color: 'text-rose-400'    },
          ];
          return (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map(stat => (
                <div key={stat.label} className="glass rounded-2xl p-5">
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          );
        })()}

        {/* Quick actions */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(action => (
              <Link key={action.label} to={action.to} className="glass rounded-xl p-4 flex flex-col items-center gap-3 hover:bg-white/5 transition-all hover:scale-[1.02] text-center group">
                <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Participation Summary */}
        {subscription?.status === 'active' && !statsLoading && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Rounds',    value: scores.length,        icon: Target,   color: 'text-emerald-400' },
              { label: 'Draws Entered',   value: drawStats.entries,    icon: Trophy,   color: 'text-amber-400'   },
              { label: 'Current Draw',    value: drawStats.monthYear ?? '—', icon: Calendar, color: 'text-blue-400' },
              { label: 'Total Winnings',  value: `£${winnings.reduce((s, w) => s + Number(w.prize_amount), 0).toFixed(2)}`, icon: Banknote, color: 'text-rose-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 shrink-0 ${s.color}`} />
                <div>
                  <p className="text-sm font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Winnings Overview */}
        {winnings.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5} className="mb-8 glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> My Winnings
            </h3>
            {proofMsg && (
              <div className={cn('flex items-center gap-2 text-sm rounded-lg p-3 mb-4',
                proofMsg.includes('submitted') || proofMsg.includes('Proof')
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-destructive bg-destructive/10 border border-destructive/20'
              )}>
                <CheckCircle className="w-4 h-4 shrink-0" /> {proofMsg}
              </div>
            )}
            <div className="space-y-3">
              {winningsLoading ? (
                [1,2].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)
              ) : winnings.map(w => {
                const verif = w.verification_status;
                const pay   = w.payment_status;
                const verifStyle = {
                  pending:   { label: 'Awaiting Proof',  cls: 'text-amber-400  bg-amber-500/10  border-amber-500/20'  },
                  submitted: { label: 'Under Review',    cls: 'text-blue-400   bg-blue-500/10   border-blue-500/20'   },
                  approved:  { label: 'Verified',        cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                  rejected:  { label: 'Rejected',        cls: 'text-red-400    bg-red-500/10    border-red-500/20'    },
                }[verif] ?? { label: verif, cls: 'text-muted-foreground bg-white/5 border-white/10' };

                return (
                  <div key={w.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-amber-400">
                          £{Number(w.prize_amount).toFixed(2)} — {w.match_type}-Match
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {w.monthly_draws?.month_year ?? '—'} draw
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', verifStyle.cls)}>
                          {verif === 'approved' ? <BadgeCheck className="w-3 h-3 inline mr-1" /> : null}
                          {verifStyle.label}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                          pay === 'paid'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-muted-foreground bg-white/5 border-white/10'
                        )}>
                          {pay === 'paid' ? '✓ Paid' : 'Payment Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Rejection reason */}
                    {verif === 'rejected' && w.rejection_reason && (
                      <p className="text-xs text-red-400/80 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                        <Ban className="w-3 h-3 inline mr-1" /> {w.rejection_reason}
                      </p>
                    )}

                    {/* Proof submission — only if pending or rejected */}
                    {(verif === 'pending' || verif === 'rejected') && (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={proofInput[w.id] ?? ''}
                          onChange={e => setProofInput(p => ({ ...p, [w.id]: e.target.value }))}
                          placeholder="Paste screenshot URL (Google Drive, Imgur…)"
                          className="flex-1 bg-input border border-white/15 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button
                          onClick={() => handleSubmitProof(w.id)}
                          disabled={submittingProof === w.id || !proofInput[w.id]?.trim()}
                          className="flex items-center gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-500/25 transition-colors disabled:opacity-50"
                        >
                          {submittingProof === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          Submit Proof
                        </button>
                      </div>
                    )}

                    {/* Proof submitted — show link */}
                    {verif === 'submitted' && w.proof_url && (
                      <a href={w.proof_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
                        <Clock className="w-3 h-3" /> View submitted proof
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Two columns */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent scores */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Recent Rounds</h3>
              <Link to="/scores" className="text-xs text-primary flex items-center gap-1 hover:underline">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {statsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : scores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No rounds logged yet.</p>
                <Link to="/scores" className="mt-3 text-xs text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Log your first round
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {scores.slice(0, 3).map(s => {
                  const pts = s.stableford_points;
                  const ptColor = pts >= 36 ? 'text-emerald-400' : pts >= 28 ? 'text-blue-400' : pts >= 20 ? 'text-amber-400' : 'text-red-400';
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.course_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.score_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <span className={cn('text-sm font-bold shrink-0', ptColor)}>{pts} pts</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Monthly draw */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Monthly Draw</h3>
              <Link to="/prizes" className="text-xs text-primary flex items-center gap-1 hover:underline">
                View draw <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {statsLoading ? (
              <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ) : drawStats.prizePool ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-7 h-7 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-400">£{Number(drawStats.prizePool).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{drawStats.monthYear} Prize Pool</p>
                <p className="text-sm font-medium mt-2">{drawStats.entries} {drawStats.entries === 1 ? 'entry' : 'entries'} this month</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-amber-400" />
                </div>
                <p className="font-semibold text-lg text-gradient-gold">Prize Pool Building</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Log rounds to earn draw entries every month.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

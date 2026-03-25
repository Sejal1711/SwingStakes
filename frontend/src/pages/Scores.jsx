import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Plus, Pencil, Trash2, Check, X,
  Calendar, MapPin, Target, LogOut, ChevronLeft,
  AlertCircle, Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MAX_SCORES = 5;

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// ─── Score Form (used for both Add and Edit) ──────────────────────────────────
function ScoreForm({ initial = {}, onSubmit, onCancel, loading }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    score_date:       initial.score_date    ?? today,
    course_name:      initial.course_name   ?? '',
    stableford_points: initial.stableford_points ?? '',
    notes:            initial.notes         ?? '',
  });
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const pts = Number(form.stableford_points);
    if (!form.score_date)   return setError('Date is required.');
    if (!form.course_name.trim()) return setError('Course name is required.');
    if (!pts || pts < 1 || pts > 45) return setError('Stableford points must be between 1 and 45.');
    onSubmit({ ...form, stableford_points: pts });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Round Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              name="score_date"
              value={form.score_date}
              onChange={handleChange}
              max={today}
              className="w-full bg-input border border-white/15 text-foreground rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Stableford Points */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Stableford Points
          </label>
          <div className="relative">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="number"
              name="stableford_points"
              value={form.stableford_points}
              onChange={handleChange}
              min={1}
              max={45}
              placeholder="1 – 45"
              className="w-full bg-input border border-white/15 text-foreground rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Course Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Course Name
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            name="course_name"
            value={form.course_name}
            onChange={handleChange}
            placeholder="e.g. St Andrews Links"
            maxLength={200}
            className="w-full bg-input border border-white/15 text-foreground rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Notes (optional) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Notes <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Any comments about the round..."
          maxLength={500}
          rows={2}
          className="w-full bg-input border border-white/15 text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : <><Check className="w-4 h-4" /> Save Score</>}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Score Card ───────────────────────────────────────────────────────────────
function ScoreCard({ score, index, onEdit, onDelete, deleting }) {
  const date = new Date(score.score_date).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const pointsColor =
    score.stableford_points >= 36 ? 'text-emerald-400' :
    score.stableford_points >= 28 ? 'text-blue-400'    :
    score.stableford_points >= 20 ? 'text-amber-400'   : 'text-rose-400';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors group"
    >
      {/* Points badge */}
      <div className="w-14 h-14 rounded-xl bg-background/60 border border-white/10 flex flex-col items-center justify-center shrink-0">
        <span className={cn('text-xl font-bold leading-none', pointsColor)}>
          {score.stableford_points}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">pts</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{score.course_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
        {score.notes && (
          <p className="text-xs text-muted-foreground/70 mt-1 truncate italic">
            "{score.notes}"
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(score)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(score.id)}
          disabled={deleting === score.id}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete"
        >
          {deleting === score.id
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Scores() {
  const { user, signOut } = useAuth();
  const [scores, setScores]         = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [editingScore, setEditingScore] = useState(null);
  const [apiError, setApiError]     = useState('');

  const displayName =
    user?.user_metadata?.username || user?.email?.split('@')[0] || 'Golfer';

  // ── Fetch scores ────────────────────────────────────────────────────────────
  const fetchScores = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/scores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setScores(json.data ?? []);
    } catch (_) {
      setApiError('Could not load scores. Check your connection.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => { fetchScores(); }, [fetchScores]);

  // ── Add score ───────────────────────────────────────────────────────────────
  async function handleAdd(formData) {
    setSaving(true);
    setApiError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) { setApiError(json.message || 'Failed to save score.'); return; }
      setShowForm(false);
      await fetchScores();
    } catch (_) {
      setApiError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Edit score ──────────────────────────────────────────────────────────────
  async function handleEdit(formData) {
    setSaving(true);
    setApiError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/scores/${editingScore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) { setApiError(json.message || 'Failed to update score.'); return; }
      setEditingScore(null);
      await fetchScores();
    } catch (_) {
      setApiError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete score ────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    setDeleting(id);
    setApiError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/scores/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setApiError('Failed to delete score.'); return; }
      setScores(prev => prev.filter(s => s.id !== id));
    } catch (_) {
      setApiError('Something went wrong.');
    } finally {
      setDeleting(null);
    }
  }

  const canAddMore = scores.length < MAX_SCORES;
  const avg = scores.length
    ? Math.round(scores.reduce((a, s) => a + s.stableford_points, 0) / scores.length)
    : null;
  const best = scores.length ? Math.max(...scores.map(s => s.stableford_points)) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <header className="border-b border-white/5 sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm">Score Tracker</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{displayName}</span>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Scores</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stableford format · Last {MAX_SCORES} rounds kept
            </p>
          </div>

          {/* Score counter pill */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm">
            <span className={cn('font-bold', scores.length >= MAX_SCORES ? 'text-amber-400' : 'text-emerald-400')}>
              {scores.length}
            </span>
            <span className="text-muted-foreground">/ {MAX_SCORES}</span>
          </div>
        </div>

        {/* Stats row */}
        {scores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{avg}</p>
              <p className="text-xs text-muted-foreground mt-1">Avg Stableford</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{best}</p>
              <p className="text-xs text-muted-foreground mt-1">Best Score</p>
            </div>
          </motion.div>
        )}

        {/* API error */}
        {apiError && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {apiError}
          </div>
        )}

        {/* Add score button / full form */}
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 border border-emerald-500/20 rounded-2xl p-6"
            >
              <h2 className="text-sm font-semibold mb-4 text-emerald-400">Log New Round</h2>
              <ScoreForm
                onSubmit={handleAdd}
                onCancel={() => setShowForm(false)}
                loading={saving}
              />
            </motion.div>
          ) : (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => { setShowForm(true); setEditingScore(null); }}
              disabled={!canAddMore}
              className={cn(
                'w-full border border-dashed rounded-2xl py-4 text-sm font-medium transition-all flex items-center justify-center gap-2',
                canAddMore
                  ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/50'
                  : 'border-white/10 text-muted-foreground cursor-not-allowed'
              )}
            >
              <Plus className="w-4 h-4" />
              {canAddMore
                ? 'Log a New Round'
                : `Maximum ${MAX_SCORES} scores reached — oldest will be replaced`}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Score list */}
        {pageLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : scores.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-emerald-400/50" />
            </div>
            <p className="text-muted-foreground font-medium">No rounds logged yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Click "Log a New Round" above to get started
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent Rounds — newest first
            </h2>
            <AnimatePresence>
              {scores.map((score, i) =>
                editingScore?.id === score.id ? (
                  <motion.div
                    key={`edit-${score.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/5 border border-amber-500/20 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-amber-400">Edit Round</h2>
                      <button
                        onClick={() => setEditingScore(null)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <ScoreForm
                      initial={score}
                      onSubmit={handleEdit}
                      onCancel={() => setEditingScore(null)}
                      loading={saving}
                    />
                  </motion.div>
                ) : (
                  <ScoreCard
                    key={score.id}
                    score={score}
                    index={i}
                    onEdit={s => { setEditingScore(s); setShowForm(false); }}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
                )
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Info note */}
        <p className="text-center text-xs text-muted-foreground/50 pb-4">
          Only your last {MAX_SCORES} scores are kept. Adding a new score automatically removes the oldest.
        </p>
      </main>
    </div>
  );
}

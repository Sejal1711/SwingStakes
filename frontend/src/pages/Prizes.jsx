import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, ChevronLeft, LogOut, Gift, Calendar,
  Crown, Clock, CheckCircle2, Loader2, AlertCircle,
  Star, Ticket, RefreshCw, Check, Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function formatMonthYear(str) {
  if (!str) return '';
  const [year, month] = str.split('-');
  return new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// ─── Number Grid Picker ───────────────────────────────────────────────────────
function NumberPicker({ selected, onChange, locked }) {
  const toggle = (n) => {
    if (locked) return;
    if (selected.includes(n)) onChange(selected.filter(x => x !== n));
    else if (selected.length < 5)  onChange([...selected, n].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Pick <span className="text-emerald-400 font-bold">5</span> numbers (1–45)
        </p>
        <span className={cn(
          'text-xs px-2.5 py-1 rounded-full border font-medium',
          selected.length === 5
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
            : 'bg-white/5 text-muted-foreground border-white/10'
        )}>
          {selected.length} / 5 selected
        </span>
      </div>

      {/* Selected display */}
      <div className="flex gap-2 min-h-[2.5rem] items-center">
        {selected.length === 0 ? (
          <p className="text-xs text-muted-foreground/50">Your picks will appear here...</p>
        ) : selected.map(n => (
          <motion.span
            key={n}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-9 h-9 rounded-lg bg-emerald-500 text-white text-sm font-bold flex items-center justify-center shadow-md"
          >
            {n}
          </motion.span>
        ))}
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-9 gap-1.5">
        {Array.from({ length: 45 }, (_, i) => i + 1).map(n => {
          const isSelected = selected.includes(n);
          const isDisabled = !isSelected && selected.length === 5;
          return (
            <button
              key={n}
              onClick={() => toggle(n)}
              disabled={isDisabled || locked}
              className={cn(
                'aspect-square rounded-lg text-xs font-semibold transition-all',
                isSelected
                  ? 'bg-emerald-500 text-white shadow-md scale-105'
                  : isDisabled
                    ? 'bg-white/5 text-muted-foreground/30 cursor-not-allowed'
                    : 'bg-white/8 text-foreground hover:bg-white/15 hover:scale-105'
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    open:   { label: 'Open',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    closed: { label: 'Closed', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20'       },
    drawn:  { label: 'Drawn',  cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20'           },
  };
  const s = map[status] ?? map.closed;
  return <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', s.cls)}>{s.label}</span>;
}

// ─── Prize Tier Row ───────────────────────────────────────────────────────────
function TierRow({ matchType, pool, icon, color, bgColor }) {
  const Icon = icon;
  return (
    <div className={cn('flex items-center justify-between p-3 rounded-xl border', bgColor)}>
      <div className="flex items-center gap-2.5">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <div>
          <p className="text-sm font-semibold">{matchType}-Number Match</p>
          {matchType === 5 && <p className="text-[10px] text-muted-foreground">Jackpot — rolls over if unclaimed</p>}
        </div>
      </div>
      <p className={cn('text-base font-bold', color)}>
        £{Number(pool ?? 0).toFixed(2)}
      </p>
    </div>
  );
}

// ─── Draw Results ─────────────────────────────────────────────────────────────
function DrawResults({ results }) {
  const { draw, winners, my_picks } = results;
  const won = winners.filter(w => w.is_me);

  return (
    <div className="space-y-5">
      {/* Winning numbers */}
      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Winning Numbers</p>
        <div className="flex gap-2 flex-wrap">
          {(draw.drawn_numbers ?? []).map(n => (
            <span
              key={n}
              className={cn(
                'w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center',
                my_picks?.picked_numbers?.includes(n)
                  ? 'bg-emerald-500 text-white shadow-glow'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              )}
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Your picks */}
      {my_picks && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Your Picks</p>
          <div className="flex items-center gap-2 flex-wrap">
            {(my_picks.picked_numbers ?? []).map(n => {
              const isMatch = draw.drawn_numbers?.includes(n);
              return (
                <span
                  key={n}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center',
                    isMatch ? 'bg-emerald-500 text-white' : 'bg-white/10 text-muted-foreground'
                  )}
                >
                  {n}
                </span>
              );
            })}
            <span className={cn(
              'ml-2 text-sm font-medium px-2 py-1 rounded-full',
              (my_picks.match_count ?? 0) >= 3
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-white/5 text-muted-foreground'
            )}>
              {my_picks.match_count ?? 0} match{(my_picks.match_count ?? 0) !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Won something? */}
      {won.length > 0 && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 rounded-xl p-5 text-center"
        >
          <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="font-bold text-lg text-amber-400">Congratulations! 🎉</p>
          {won.map((w, i) => (
            <p key={i} className="text-sm text-muted-foreground mt-1">
              {w.match_type}-Number Match — <span className="text-amber-400 font-semibold">£{Number(w.prize_amount).toFixed(2)}</span>
            </p>
          ))}
        </motion.div>
      )}

      {/* Winners list */}
      <div className="space-y-2">
        {[5, 4, 3].map(tier => {
          const tierWinners = winners.filter(w => w.match_type === tier);
          if (tierWinners.length === 0) return null;
          return (
            <div key={tier} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{tier}-Number Match Winners</p>
              {tierWinners.map((w, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className={cn('text-sm', w.is_me ? 'text-emerald-400 font-semibold' : '')}>
                    {w.is_me ? '★ ' : ''}{w.username}
                  </span>
                  <span className="text-sm font-medium text-amber-400">£{Number(w.prize_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Prizes() {
  const { user, signOut } = useAuth();
  const [currentDraw, setCurrentDraw]   = useState(null);
  const [pastDraws, setPastDraws]       = useState([]);
  const [myPicks, setMyPicks]           = useState(null);
  const [pickedNumbers, setPickedNumbers] = useState([]);
  const [results, setResults]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [successMsg, setSuccessMsg]     = useState('');
  const [viewingResult, setViewingResult] = useState(null); // draw id for results panel

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Golfer';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const h = { Authorization: `Bearer ${token}` };

      const [allRes, currentRes] = await Promise.all([
        fetch(`${API}/api/draws`, { headers: h }),
        fetch(`${API}/api/draws/current`, { headers: h }),
      ]);
      const [allJson, currentJson] = await Promise.all([allRes.json(), currentRes.json()]);

      const current = currentJson.data ?? null;
      setCurrentDraw(current);
      const all = allJson.data ?? [];
      setPastDraws(current ? all.filter(d => d.id !== current.id) : all);

      // Fetch user's existing picks for the current draw
      if (current) {
        const picksRes  = await fetch(`${API}/api/draws/${current.id}/my-picks`, { headers: h });
        const picksJson = await picksRes.json();
        if (picksJson.data?.picked_numbers) {
          setMyPicks(picksJson.data);
          setPickedNumbers(picksJson.data.picked_numbers);
        }
      }
    } catch (_) {
      setError('Could not load draw data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // View results for a drawn + published draw
  async function loadResults(drawId) {
    if (viewingResult === drawId) { setViewingResult(null); setResults(null); return; }
    const token = await getToken();
    const res  = await fetch(`${API}/api/draws/${drawId}/results`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json.success) { setResults(json.data); setViewingResult(drawId); }
    else setError(json.message);
  }

  async function handleSubmitPicks() {
    if (pickedNumbers.length !== 5) return;
    setSaving(true); setError(''); setSuccessMsg('');
    try {
      const token = await getToken();
      const res  = await fetch(`${API}/api/draws/${currentDraw.id}/picks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ numbers: pickedNumbers }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setMyPicks({ picked_numbers: pickedNumbers });
      setSuccessMsg('Your picks have been saved!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (_) { setError('Failed to save picks. Please try again.'); }
    finally { setSaving(false); }
  }

  const picksChanged = JSON.stringify(pickedNumbers) !== JSON.stringify(myPicks?.picked_numbers ?? []);

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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm">Monthly Draw</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{displayName}</span>
            <button onClick={signOut} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Prize Draw</h1>
          <p className="text-sm text-muted-foreground mt-1">Pick 5 numbers each month — match 3, 4, or 5 to win.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Current Draw */}
            {currentDraw ? (
              <div
                className="rounded-2xl border border-amber-500/30 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(16,185,129,0.05) 100%)' }}
              >
                <div className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={currentDraw.status} />
                        {(() => {
                          const [y, m] = (currentDraw.month_year ?? '').split('-').map(Number);
                          const daysLeft = Math.max(0, Math.ceil((new Date(y, m, 0) - new Date()) / 86400000));
                          return daysLeft <= 7 && <span className="text-xs text-rose-400 font-medium flex items-center gap-1"><Clock className="w-3 h-3" />{daysLeft}d left</span>;
                        })()}
                      </div>
                      <h2 className="text-xl font-bold">{formatMonthYear(currentDraw.month_year)} Draw</h2>
                      {currentDraw.jackpot_amount > 0 && (
                        <p className="text-xs text-amber-400 mt-1 font-medium">
                          🎰 Jackpot rolled over from last month included!
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>

                  {/* Prize tiers */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prize Tiers</p>
                    <TierRow matchType={5} pool={currentDraw.pool_5match} icon={Crown}  color="text-amber-400"   bgColor="bg-amber-500/8  border-amber-500/20"  />
                    <TierRow matchType={4} pool={currentDraw.pool_4match} icon={Star}   color="text-blue-400"    bgColor="bg-blue-500/8   border-blue-500/20"   />
                    <TierRow matchType={3} pool={currentDraw.pool_3match} icon={Ticket} color="text-emerald-400" bgColor="bg-emerald-500/8 border-emerald-500/20" />
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    {currentDraw.total_picks ?? 0} participant{(currentDraw.total_picks ?? 0) !== 1 ? 's' : ''} have submitted picks
                  </p>

                  {/* Number picker */}
                  <div className="bg-black/20 border border-white/10 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      {myPicks ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Ticket className="w-4 h-4 text-amber-400" />}
                      <h3 className="text-sm font-semibold">
                        {myPicks ? 'Your Picks (tap to change)' : 'Choose Your Numbers'}
                      </h3>
                    </div>

                    <NumberPicker selected={pickedNumbers} onChange={setPickedNumbers} locked={false} />

                    <AnimatePresence>
                      {successMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm mt-3"
                        >
                          <Check className="w-4 h-4 shrink-0" /> {successMsg}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleSubmitPicks}
                      disabled={pickedNumbers.length !== 5 || saving || !picksChanged}
                      className="mt-4 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                    >
                      {saving
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        : myPicks && !picksChanged
                          ? <><CheckCircle2 className="w-4 h-4" /> Picks Saved</>
                          : <><Check className="w-4 h-4" /> {myPicks ? 'Update Picks' : 'Submit Picks'}</>}
                    </button>
                  </div>

                  {/* How entries are earned */}
                  <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">How it works</p>
                    <div className="space-y-2">
                      {[
                        { icon: CheckCircle2, text: 'Pick 5 numbers from 1–45',       color: 'text-emerald-400' },
                        { icon: Star,         text: 'Match 3, 4, or 5 to win a tier', color: 'text-amber-400'  },
                        { icon: Crown,        text: '5-match jackpot rolls over if unclaimed', color: 'text-purple-400' },
                      ].map(({ icon: Icon, text, color }) => (
                        <div key={text} className="flex items-center gap-2.5 text-sm">
                          <Icon className={cn('w-4 h-4 shrink-0', color)} />
                          <span className="text-muted-foreground">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-amber-400/40" />
                </div>
                <p className="font-semibold text-muted-foreground">No draw open yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">The next monthly draw hasn't been opened yet.</p>
              </div>
            )}

            {/* Past Draws */}
            {pastDraws.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Past Draws</h2>
                {pastDraws.map((draw) => (
                  <div key={draw.id} className="rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', draw.status === 'drawn' ? 'bg-amber-500/10' : 'bg-white/5')}>
                          {draw.status === 'drawn' ? <Trophy className="w-4 h-4 text-amber-400" /> : <Gift className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{formatMonthYear(draw.month_year)}</p>
                          <p className="text-xs text-amber-400">£{Number(draw.prize_pool_amount).toFixed(2)} pool</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={draw.status} />
                        {draw.status === 'drawn' && draw.published && (
                          <button
                            onClick={() => loadResults(draw.id)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {viewingResult === draw.id ? 'Hide' : 'Results'}
                          </button>
                        )}
                        {draw.status === 'drawn' && !draw.published && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Results panel */}
                    <AnimatePresence>
                      {viewingResult === draw.id && results && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/10 px-4 pb-4 pt-4 overflow-hidden"
                        >
                          <DrawResults results={results} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground/50 pb-4">
              Draws run on the last day of each month. Winners are contacted via email.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CreditCard, Trophy, Heart, BarChart3, LogOut,
  Menu, Shield, ChevronRight, Loader2,
  Crown, UserCheck, UserX, Plus, Play, Pencil,
  CheckCircle2, XCircle, ExternalLink,
  FlaskConical, Send, Star, ChevronDown, ChevronUp,
  BadgeCheck, Ban, Banknote, Upload, Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function adminFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
  return res.json();
}

const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',     icon: BarChart3,  desc: 'Platform analytics'     },
  { id: 'users',         label: 'Users',         icon: Users,      desc: 'Manage users'           },
  { id: 'draws',         label: 'Draw Engine',   icon: Trophy,     desc: 'Run monthly draws'      },
  { id: 'winners',       label: 'Winners',       icon: Crown,      desc: 'Verify & pay winners'   },
  { id: 'charities',     label: 'Charities',     icon: Heart,      desc: 'Manage charities'       },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, desc: 'Billing overview'       },
];

// ─── Overview Panel (Reports & Analytics) ────────────────────────────────────
function OverviewPanel() {
  const [stats,   setStats]   = useState(null);
  const [winners, setWinners] = useState([]);
  const [draws,   setDraws]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch('/api/admin/stats'),
      adminFetch('/api/admin/winners'),
      adminFetch('/api/admin/draws'),
    ]).then(([s, w, d]) => {
      setStats(s.data);
      setWinners(w.data ?? []);
      setDraws(d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PanelLoader />;

  const totalPrizePaid   = winners.filter(w => w.payment_status === 'paid').reduce((s, w) => s + Number(w.prize_amount), 0);
  const totalPrizeEver   = winners.reduce((s, w) => s + Number(w.prize_amount), 0);
  const pendingVerif     = winners.filter(w => w.verification_status === 'submitted').length;
  const pendingPayment   = winners.filter(w => w.verification_status === 'approved' && w.payment_status === 'pending').length;
  const drawsRun         = draws.filter(d => d.status === 'drawn').length;
  const drawsOpen        = draws.filter(d => d.status === 'open').length;

  const topCards = [
    { label: 'Total Users',        value: stats?.totalUsers ?? 0,         icon: Users,      color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
    { label: 'Active Subscribers', value: stats?.activeSubscribers ?? 0,  icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Prize Pool (Open)',  value: `£${stats?.prizePool ?? '0.00'}`,icon: Trophy,     color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
    { label: 'Charity Est. (MTD)', value: `£${stats?.charityRaised ?? '0.00'}`, icon: Heart, color: 'text-rose-400',   bg: 'bg-rose-500/10'    },
  ];

  const drawCards = [
    { label: 'Total Draws Run',     value: drawsRun,                    color: 'text-blue-400'    },
    { label: 'Currently Open',      value: drawsOpen,                   color: 'text-emerald-400' },
    { label: 'Total Prize Awarded', value: `£${totalPrizeEver.toFixed(2)}`, color: 'text-amber-400' },
    { label: 'Prize Paid Out',      value: `£${totalPrizePaid.toFixed(2)}`, color: 'text-emerald-400' },
    { label: 'Pending Verification',value: pendingVerif,                color: 'text-blue-400'    },
    { label: 'Awaiting Payment',    value: pendingPayment,              color: 'text-amber-400'   },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Platform Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {topCards.map(card => (
            <div key={card.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-4', card.bg)}>
                <card.icon className={cn('w-4 h-4', card.color)} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3">Draw Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {drawCards.map(c => (
            <div key={c.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className={cn('text-xl font-bold', c.color)}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3">Recent Draws</h3>
        {draws.slice(0, 5).length === 0 ? (
          <p className="text-sm text-muted-foreground">No draws yet.</p>
        ) : (
          <div className="space-y-2">
            {draws.slice(0, 5).map(d => {
              const statusCls = { open: 'text-emerald-400', closed: 'text-amber-400', drawn: 'text-blue-400' }[d.status] ?? 'text-muted-foreground';
              return (
                <div key={d.id} className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{d.month_year}</p>
                    <p className="text-xs text-muted-foreground">
                      Pool: £{Number(d.prize_pool_amount || 0).toFixed(2)}
                      {d.jackpot_amount > 0 && ` + £${Number(d.jackpot_amount).toFixed(2)} jackpot`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn('capitalize', statusCls)}>{d.status}</span>
                    {d.published && <span className="text-emerald-400">· Published</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Users Panel ──────────────────────────────────────────────────────────────
function UsersPanel() {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(null);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(null);
  const [scores, setScores]     = useState({}); // userId → array
  const [scoresLoading, setScoresLoading] = useState(null);
  const [editingScore, setEditingScore]   = useState(null); // score id
  const [scoreEdit, setScoreEdit]         = useState({});

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true);
    const json = await adminFetch(`/api/admin/users?search=${encodeURIComponent(q)}`);
    setUsers(json.data?.users ?? []);
    setTotal(json.data?.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'subscriber' : 'admin';
    setUpdating(`role-${userId}`);
    await adminFetch(`/api/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
    await fetchUsers(search);
    setUpdating(null);
  }

  async function loadScores(userId) {
    if (scores[userId]) return;
    setScoresLoading(userId);
    const json = await adminFetch(`/api/admin/users/${userId}/scores`);
    setScores(p => ({ ...p, [userId]: json.data ?? [] }));
    setScoresLoading(null);
  }

  async function deleteScore(scoreId, userId) {
    if (!window.confirm('Delete this score?')) return;
    setUpdating(`score-${scoreId}`);
    await adminFetch(`/api/admin/scores/${scoreId}`, { method: 'DELETE' });
    setScores(p => ({ ...p, [userId]: (p[userId] ?? []).filter(s => s.id !== scoreId) }));
    setUpdating(null);
  }

  async function saveScore(scoreId, userId) {
    setUpdating(`score-${scoreId}`);
    await adminFetch(`/api/admin/scores/${scoreId}`, { method: 'PATCH', body: JSON.stringify(scoreEdit) });
    const json = await adminFetch(`/api/admin/users/${userId}/scores`);
    setScores(p => ({ ...p, [userId]: json.data ?? [] }));
    setEditingScore(null);
    setUpdating(null);
  }

  async function toggleSubStatus(sub) {
    if (!sub?.id) return;
    const newStatus = sub.status === 'active' ? 'cancelled' : 'active';
    if (!window.confirm(`Set subscription to ${newStatus}?`)) return;
    setUpdating(`sub-${sub.id}`);
    await adminFetch(`/api/admin/subscriptions/${sub.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
    await fetchUsers(search);
    setUpdating(null);
  }

  const subStatus = (u) => {
    const sub = u.subscription;
    if (!sub) return { label: 'None', cls: 'text-muted-foreground' };
    if (sub.status === 'active')    return { label: `Active · ${sub.plan_type}`, cls: 'text-emerald-400' };
    if (sub.status === 'cancelled') return { label: 'Cancelled', cls: 'text-orange-400' };
    return { label: sub.status, cls: 'text-muted-foreground' };
  };

  const inputCls = 'bg-input border border-white/15 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-bold">Users <span className="text-sm font-normal text-muted-foreground ml-1">({total})</span></h2>
        <input value={search} onChange={e => { setSearch(e.target.value); fetchUsers(e.target.value); }}
          placeholder="Search by username..."
          className="bg-input border border-white/15 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-56" />
      </div>

      {loading ? <PanelLoader /> : (
        <div className="space-y-2">
          {users.length === 0 ? <EmptyState message="No users found." /> : users.map(u => {
            const sub   = subStatus(u);
            const isExp = expanded === u.user_id;
            return (
              <div key={u.user_id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {/* User row */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                    {u.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.username ?? 'No username'}</p>
                    <p className={cn('text-xs mt-0.5', sub.cls)}>{sub.label}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-xs px-2 py-1 rounded-full border',
                      u.role === 'admin'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/20'
                        : 'bg-white/5 text-muted-foreground border-white/10'
                    )}>{u.role}</span>
                    <button onClick={() => toggleRole(u.user_id, u.role)} disabled={updating === `role-${u.user_id}`}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                      title={u.role === 'admin' ? 'Demote' : 'Promote to admin'}>
                      {updating === `role-${u.user_id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : u.role === 'admin' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => { setExpanded(isExp ? null : u.user_id); if (!isExp) loadScores(u.user_id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                      {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded: subscription + scores */}
                {isExp && (
                  <div className="border-t border-white/10 p-4 space-y-4">
                    {/* Subscription management */}
                    {u.subscription && (
                      <div className="flex items-center justify-between gap-3 bg-white/3 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-medium">Subscription</p>
                          <p className={cn('text-xs', sub.cls)}>{sub.label}</p>
                          {u.subscription.current_period_end && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Ends {new Date(u.subscription.current_period_end).toLocaleDateString('en-GB')}
                            </p>
                          )}
                        </div>
                        <button onClick={() => toggleSubStatus(u.subscription)} disabled={updating === `sub-${u.subscription.id}`}
                          className={cn('text-xs px-3 py-1.5 rounded-lg border transition-colors',
                            u.subscription.status === 'active'
                              ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20'
                              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                          )}>
                          {updating === `sub-${u.subscription.id}` ? <Loader2 className="w-3 h-3 animate-spin inline" />
                            : u.subscription.status === 'active' ? 'Cancel Sub' : 'Reactivate'}
                        </button>
                      </div>
                    )}

                    {/* Scores */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Golf Scores</p>
                      {scoresLoading === u.user_id ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                      ) : (scores[u.user_id] ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">No scores yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {(scores[u.user_id] ?? []).map(s => (
                            <div key={s.id} className="bg-white/5 rounded-lg p-2">
                              {editingScore === s.id ? (
                                <div className="space-y-1.5">
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input defaultValue={s.course_name} onChange={e => setScoreEdit(p => ({ ...p, course_name: e.target.value }))}
                                      placeholder="Course" className={cn(inputCls, 'col-span-2')} />
                                    <input type="number" defaultValue={s.stableford_points} onChange={e => setScoreEdit(p => ({ ...p, stableford_points: Number(e.target.value) }))}
                                      placeholder="Stableford pts" className={inputCls} />
                                    <input type="number" defaultValue={s.gross_score} onChange={e => setScoreEdit(p => ({ ...p, gross_score: Number(e.target.value) }))}
                                      placeholder="Gross score" className={inputCls} />
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button onClick={() => saveScore(s.id, u.user_id)} disabled={updating === `score-${s.id}`}
                                      className="flex items-center gap-1 text-xs bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600 disabled:opacity-50">
                                      {updating === `score-${s.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save
                                    </button>
                                    <button onClick={() => setEditingScore(null)} className="text-xs px-2 py-1 rounded bg-white/5 text-muted-foreground hover:bg-white/10">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-medium">{s.course_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(s.score_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      {' · '}{s.stableford_points} pts
                                      {s.gross_score ? ` · ${s.gross_score} gross` : ''}
                                    </p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => { setEditingScore(s.id); setScoreEdit({}); }}
                                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/10">
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => deleteScore(s.id, u.user_id)} disabled={updating === `score-${s.id}`}
                                      className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                      {updating === `score-${s.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Draws Panel ─────────────────────────────────────────────────────────────
function DrawsPanel() {
  const [draws, setDraws]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [running, setRunning]       = useState(null);
  const [simulating, setSimulating] = useState(null);
  const [publishing, setPublishing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [expanded, setExpanded]     = useState(null); // draw id with expanded details
  const [simResults, setSimResults] = useState({}); // drawId → result
  const [newDraw, setNewDraw]       = useState({ month_year: '', prize_pool_amount: '', draw_type: 'random' });
  const [error, setError]           = useState('');

  const fetchDraws = useCallback(async () => {
    setLoading(true);
    const json = await adminFetch('/api/admin/draws');
    setDraws(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDraws(); }, [fetchDraws]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true); setError('');
    const json = await adminFetch('/api/admin/draws', {
      method: 'POST',
      body: JSON.stringify({
        month_year: newDraw.month_year,
        prize_pool_amount: Number(newDraw.prize_pool_amount),
        draw_type: newDraw.draw_type,
      }),
    });
    if (json.success) {
      setShowCreate(false);
      setNewDraw({ month_year: '', prize_pool_amount: '', draw_type: 'random' });
      await fetchDraws();
    } else {
      setError(json.message);
    }
    setCreating(false);
  }

  async function handleSimulate(drawId) {
    setSimulating(drawId);
    const json = await adminFetch(`/api/admin/draws/${drawId}/simulate`, { method: 'POST' });
    if (json.success) {
      setSimResults(p => ({ ...p, [drawId]: json.data }));
      setExpanded(drawId);
    }
    setSimulating(null);
  }

  async function handleRun(drawId) {
    if (!window.confirm('Run this draw? Winning numbers will be drawn and winners calculated. Results stay unpublished until you publish.')) return;
    setRunning(drawId);
    const json = await adminFetch(`/api/admin/draws/${drawId}/run`, { method: 'POST' });
    if (json.success) {
      setExpanded(drawId);
      await fetchDraws();
    }
    setRunning(null);
  }

  async function handlePublish(drawId) {
    if (!window.confirm('Publish this draw? Results will become visible to all users.')) return;
    setPublishing(drawId);
    const json = await adminFetch(`/api/admin/draws/${drawId}/publish`, { method: 'POST' });
    if (json.success) await fetchDraws();
    setPublishing(null);
  }

  const statusStyle = {
    open:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    closed: 'text-amber-400  bg-amber-500/10  border-amber-500/20',
    drawn:  'text-blue-400   bg-blue-500/10   border-blue-500/20',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Draw Engine</h2>
        <button onClick={() => setShowCreate(v => !v)} className="flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-500/25 transition-colors">
          <Plus className="w-4 h-4" /> New Draw
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">Create New Draw</h3>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Month &amp; Year</label>
              <div className="flex gap-1.5">
                {(() => {
                  const [selYear, selMonth] = (newDraw.month_year || '-').split('-');
                  const now   = new Date();
                  const years = [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2];
                  const months = [
                    ['01','January'],['02','February'],['03','March'],['04','April'],
                    ['05','May'],['06','June'],['07','July'],['08','August'],
                    ['09','September'],['10','October'],['11','November'],['12','December'],
                  ];
                  const update = (year, month) =>
                    setNewDraw(p => ({ ...p, month_year: year && month ? `${year}-${month}` : '' }));
                  return (
                    <>
                      <select value={selMonth || ''} onChange={e => update(selYear || String(now.getFullYear()), e.target.value)}
                        className="flex-1 bg-input border border-white/15 rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="">Month</option>
                        {months.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                      </select>
                      <select value={selYear || ''} onChange={e => update(e.target.value, selMonth || '')}
                        className="w-24 bg-input border border-white/15 rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="">Year</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </>
                  );
                })()}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Prize Pool (£)</label>
              <input type="number" min="0" step="0.01" value={newDraw.prize_pool_amount}
                onChange={e => setNewDraw(p => ({ ...p, prize_pool_amount: e.target.value }))}
                placeholder="250.00"
                className="w-full bg-input border border-white/15 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Draw Type</label>
            <select value={newDraw.draw_type} onChange={e => setNewDraw(p => ({ ...p, draw_type: e.target.value }))}
              className="w-full bg-input border border-white/15 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="random">Random — pure random 5 numbers</option>
              <option value="algorithmic">Algorithmic — weighted by Stableford score frequency</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground bg-white/5 hover:bg-white/10">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <PanelLoader /> : draws.length === 0 ? <EmptyState message="No draws yet. Create one above." /> : (
        <div className="space-y-3">
          {draws.map(d => {
            const isExpanded = expanded === d.id;
            const sim = simResults[d.id];
            const isPublished = d.published;

            return (
              <div key={d.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{d.month_year}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border capitalize', statusStyle[d.status])}>{d.status}</span>
                      {isPublished && <span className="text-xs px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Published</span>}
                      {d.draw_type === 'algorithmic' && (
                        <span className="text-xs px-2 py-0.5 rounded-full border text-purple-400 bg-purple-500/10 border-purple-500/20">Algorithmic</span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1">
                      <p className="text-xs text-muted-foreground">Pool: <span className="text-foreground">£{Number(d.prize_pool_amount || 0).toFixed(2)}</span></p>
                      {d.jackpot_amount > 0 && <p className="text-xs text-amber-400">+£{Number(d.jackpot_amount).toFixed(2)} jackpot rollover</p>}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {d.status === 'open' && (
                      <>
                        <button onClick={() => handleSimulate(d.id)} disabled={!!simulating}
                          className="flex items-center gap-1.5 bg-purple-500/15 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-500/25 transition-colors disabled:opacity-50">
                          {simulating === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />} Simulate
                        </button>
                        <button onClick={() => handleRun(d.id)} disabled={!!running}
                          className="flex items-center gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-500/25 transition-colors disabled:opacity-50">
                          {running === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run Draw
                        </button>
                      </>
                    )}
                    {d.status === 'drawn' && !isPublished && (
                      <button onClick={() => handlePublish(d.id)} disabled={!!publishing}
                        className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                        {publishing === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Publish
                      </button>
                    )}
                    <button onClick={() => setExpanded(p => p === d.id ? null : d.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-4 space-y-4">
                    {/* Prize tier breakdown */}
                    {(d.pool_5match > 0 || d.pool_4match > 0 || d.pool_3match > 0) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Prize Tiers</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '5 Match', value: d.pool_5match, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                            { label: '4 Match', value: d.pool_4match, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                            { label: '3 Match', value: d.pool_3match, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                          ].map(tier => (
                            <div key={tier.label} className={cn('rounded-lg border p-3 text-center', tier.color)}>
                              <p className="text-sm font-bold">£{Number(tier.value || 0).toFixed(2)}</p>
                              <p className="text-xs opacity-70 mt-0.5">{tier.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Drawn numbers (after run) */}
                    {d.drawn_numbers && d.drawn_numbers.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Drawn Numbers</p>
                        <div className="flex gap-2 flex-wrap">
                          {d.drawn_numbers.map(n => (
                            <span key={n} className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-400">{n}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Simulation results */}
                    {sim && (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                        <p className="text-xs font-medium text-purple-400 mb-2 flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5" /> Simulation Preview (not committed)
                        </p>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {sim.numbers?.map(n => (
                            <span key={n} className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400">{n}</span>
                          ))}
                        </div>
                        <div className="space-y-1">
                          {[5, 4, 3].map(t => {
                            const w = sim.winners?.[t] ?? [];
                            return (
                              <p key={t} className="text-xs text-muted-foreground">
                                {t}-match: <span className="text-foreground">{w.length} winner{w.length !== 1 ? 's' : ''}</span>
                                {w.length > 0 && <span className="text-purple-300"> — {w.map(x => x.username).join(', ')}</span>}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Charities Panel ──────────────────────────────────────────────────────────
function CharitiesPanel() {
  const [charities, setCharities]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [adding, setAdding]         = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editData, setEditData]     = useState({});
  const [newCharity, setNewCharity] = useState({ name: '', description: '', website: '', image_url: '', is_featured: false });
  const [error, setError]           = useState('');

  const fetchCharities = useCallback(async () => {
    setLoading(true);
    const json = await adminFetch('/api/admin/charities');
    setCharities(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCharities(); }, [fetchCharities]);

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true); setError('');
    const json = await adminFetch('/api/admin/charities', {
      method: 'POST',
      body: JSON.stringify(newCharity),
    });
    if (json.success) {
      setShowAdd(false);
      setNewCharity({ name: '', description: '', website: '', image_url: '', is_featured: false });
      await fetchCharities();
    } else setError(json.message);
    setAdding(false);
  }

  async function toggleActive(id, current) {
    setSaving(id);
    await adminFetch(`/api/admin/charities/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !current }) });
    await fetchCharities();
    setSaving(null);
  }

  async function toggleFeatured(id, current) {
    setSaving(`feat-${id}`);
    await adminFetch(`/api/admin/charities/${id}`, { method: 'PATCH', body: JSON.stringify({ is_featured: !current }) });
    await fetchCharities();
    setSaving(null);
  }

  async function saveEdit(id) {
    setSaving(`edit-${id}`);
    await adminFetch(`/api/admin/charities/${id}`, { method: 'PATCH', body: JSON.stringify(editData) });
    setEditingId(null);
    await fetchCharities();
    setSaving(null);
  }

  const inputCls = 'w-full bg-input border border-white/15 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Charities</h2>
        <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-2 bg-rose-500/15 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-lg text-sm font-medium hover:bg-rose-500/25 transition-colors">
          <Plus className="w-4 h-4" /> Add Charity
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">Add New Charity</h3>
          {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          <input value={newCharity.name} onChange={e => setNewCharity(p => ({ ...p, name: e.target.value }))} placeholder="Charity name *" className={inputCls} />
          <textarea value={newCharity.description} onChange={e => setNewCharity(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" rows={2} className={cn(inputCls, 'resize-none')} />
          <input value={newCharity.website} onChange={e => setNewCharity(p => ({ ...p, website: e.target.value }))} placeholder="https://website.org (optional)" className={inputCls} />
          <input value={newCharity.image_url} onChange={e => setNewCharity(p => ({ ...p, image_url: e.target.value }))} placeholder="Image URL (optional)" className={inputCls} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newCharity.is_featured} onChange={e => setNewCharity(p => ({ ...p, is_featured: e.target.checked }))} className="rounded" />
            <span className="text-sm text-foreground">Featured charity (shown on home page)</span>
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-600 disabled:opacity-50">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground bg-white/5 hover:bg-white/10">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <PanelLoader /> : charities.length === 0 ? <EmptyState message="No charities yet." /> : (
        <div className="space-y-2">
          {charities.map(c => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {/* Charity row */}
              <div className="flex items-center gap-4 p-4">
                {c.image_url && (
                  <img src={c.image_url} alt={c.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.is_featured && <span className="text-xs px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20 flex items-center gap-1"><Star className="w-2.5 h-2.5" />Featured</span>}
                    {!c.is_active && <span className="text-xs text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.description}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => { setEditingId(editingId === c.id ? null : c.id); setEditData({ image_url: c.image_url ?? '', website: c.website ?? '', description: c.description ?? '' }); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleFeatured(c.id, c.is_featured)} disabled={saving === `feat-${c.id}`}
                    className={cn('p-1.5 rounded-lg transition-colors', c.is_featured ? 'text-amber-400 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-white/10')} title="Toggle featured">
                    {saving === `feat-${c.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => toggleActive(c.id, c.is_active)} disabled={saving === c.id}
                    className={cn('p-1.5 rounded-lg transition-colors', c.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-white/10')} title="Toggle active">
                    {saving === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : c.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Inline edit panel */}
              {editingId === c.id && (
                <div className="border-t border-white/10 p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Edit details</p>
                  <input value={editData.image_url} onChange={e => setEditData(p => ({ ...p, image_url: e.target.value }))} placeholder="Image URL" className={inputCls} />
                  <input value={editData.website} onChange={e => setEditData(p => ({ ...p, website: e.target.value }))} placeholder="Website URL" className={inputCls} />
                  <textarea value={editData.description} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} placeholder="Description" rows={2} className={cn(inputCls, 'resize-none')} />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(c.id)} disabled={saving === `edit-${c.id}`}
                      className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-600 disabled:opacity-50">
                      {saving === `edit-${c.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground bg-white/5 hover:bg-white/10">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subscriptions Panel ──────────────────────────────────────────────────────
function SubscriptionsPanel() {
  const [subs, setSubs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/api/admin/subscriptions')
      .then(j => setSubs(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const active    = subs.filter(s => s.status === 'active');
  const cancelled = subs.filter(s => s.status === 'cancelled');
  const monthly   = active.filter(s => s.plan_type === 'monthly');
  const yearly    = active.filter(s => s.plan_type === 'yearly');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Subscriptions & Billing</h2>
      {loading ? <PanelLoader /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Active',    value: active.length,    color: 'text-emerald-400' },
              { label: 'Monthly',   value: monthly.length,   color: 'text-blue-400'    },
              { label: 'Annual',    value: yearly.length,    color: 'text-amber-400'   },
              { label: 'Cancelled', value: cancelled.length, color: 'text-orange-400'  },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Subscribers</p>
            {active.length === 0 ? <EmptyState message="No active subscribers." /> : active.map(s => {
              const end = s.current_period_end
                ? new Date(s.current_period_end).toLocaleDateString('en-GB')
                : '—';
              return (
                <div key={s.id} className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-sm font-medium">{s.username}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="capitalize text-emerald-400">{s.plan_type}</span>
                    <span>Renews {end}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Winners Panel ────────────────────────────────────────────────────────────
function WinnersPanel() {
  const [winners, setWinners]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [updating, setUpdating]     = useState(null);
  const [filter, setFilter]         = useState('all'); // all | pending | submitted | approved | rejected
  const [rejectId, setRejectId]     = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    const params = filter !== 'all' ? `?verification_status=${filter}` : '';
    const json   = await adminFetch(`/api/admin/winners${params}`);
    setWinners(json.data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchWinners(); }, [fetchWinners]);

  async function updateWinner(id, updates) {
    setUpdating(id);
    await adminFetch(`/api/admin/winners/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    await fetchWinners();
    setUpdating(null);
  }

  async function handleReject(id) {
    await updateWinner(id, { verification_status: 'rejected', rejection_reason: rejectReason });
    setRejectId(null);
    setRejectReason('');
  }

  const FILTERS = ['all', 'pending', 'submitted', 'approved', 'rejected'];
  const verifStyle = {
    pending:   'text-amber-400  bg-amber-500/10  border-amber-500/20',
    submitted: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
    approved:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rejected:  'text-red-400    bg-red-500/10    border-red-500/20',
  };

  const totalPrize   = winners.reduce((s, w) => s + Number(w.prize_amount), 0);
  const totalPending = winners.filter(w => w.payment_status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Winners</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {winners.length} total · £{totalPrize.toFixed(2)} prize value · {totalPending} payment{totalPending !== 1 ? 's' : ''} pending
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                filter === f ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? <PanelLoader /> : winners.length === 0 ? <EmptyState message="No winners found." /> : (
        <div className="space-y-2">
          {winners.map(w => (
            <div key={w.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 p-4 flex-wrap">
                {/* User + draw info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{w.username}</p>
                    <span className="text-xs text-amber-400 font-medium">£{Number(w.prize_amount).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{w.match_type}-match</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{w.monthly_draws?.month_year ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border capitalize', verifStyle[w.verification_status])}>
                      {w.verification_status}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                      w.payment_status === 'paid'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-muted-foreground bg-white/5 border-white/10'
                    )}>
                      {w.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {w.proof_url && (
                    <a href={w.proof_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors">
                      <Upload className="w-3 h-3" /> View Proof
                    </a>
                  )}
                  {w.verification_status === 'submitted' && (
                    <>
                      <button onClick={() => updateWinner(w.id, { verification_status: 'approved' })} disabled={updating === w.id}
                        className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                        {updating === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />} Approve
                      </button>
                      <button onClick={() => { setRejectId(w.id); setRejectReason(''); }}
                        className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                        <Ban className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  {w.verification_status === 'approved' && w.payment_status === 'pending' && (
                    <button onClick={() => updateWinner(w.id, { payment_status: 'paid' })} disabled={updating === w.id}
                      className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                      {updating === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Banknote className="w-3 h-3" />} Mark Paid
                    </button>
                  )}
                </div>
              </div>

              {/* Rejection reason input */}
              {rejectId === w.id && (
                <div className="border-t border-white/10 p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Rejection reason (optional)</p>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} maxLength={500}
                    placeholder="e.g. Screenshot does not match registered score"
                    className="w-full bg-input border border-white/15 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleReject(w.id)} disabled={updating === w.id}
                      className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50">
                      {updating === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />} Confirm Reject
                    </button>
                    <button onClick={() => setRejectId(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground bg-white/5 hover:bg-white/10">Cancel</button>
                  </div>
                </div>
              )}

              {/* Show rejection reason */}
              {w.verification_status === 'rejected' && w.rejection_reason && (
                <div className="border-t border-red-500/20 px-4 py-2">
                  <p className="text-xs text-red-400/80">{w.rejection_reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Users Panel (enhanced with scores + subscription editing) ────────────────
// (existing UsersPanel already handles role toggle; adding score view + sub management via expanded row)

// ─── Shared helpers ───────────────────────────────────────────────────────────
function PanelLoader() {
  return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
}
function EmptyState({ message }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{message}</div>;
}

const PANELS = { overview: OverviewPanel, users: UsersPanel, draws: DrawsPanel, winners: WinnersPanel, charities: CharitiesPanel, subscriptions: SubscriptionsPanel };

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [active, setActive]         = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() { await signOut(); navigate('/'); }

  const Panel = PANELS[active];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-white/10 flex flex-col transition-transform duration-200',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">SwingStakes</p>
            <p className="text-xs text-emerald-400 mt-0.5">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setActive(id); setSidebarOpen(false); }}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                active === id ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active === id && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
              {profile?.username?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.username ?? 'Admin'}</p>
              <p className="text-xs text-emerald-400">Administrator</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/10 flex items-center gap-4 px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">{NAV_ITEMS.find(n => n.id === active)?.label}</h1>
          <p className="text-sm text-muted-foreground hidden sm:block ml-1">
            — {NAV_ITEMS.find(n => n.id === active)?.desc}
          </p>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Panel />
        </main>
      </div>
    </div>
  );
}

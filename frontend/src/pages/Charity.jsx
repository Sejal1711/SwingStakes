import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, ChevronLeft, LogOut, CheckCircle2,
  ExternalLink, Loader2, AlertCircle, Sparkles,
  Star, Calendar, MapPin, DollarSign, Send, Percent,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

const CARD_COLORS = [
  { bg: 'bg-rose-500/8',    border: 'border-rose-500/20',    icon: 'text-rose-400',    ring: 'ring-rose-500/40'    },
  { bg: 'bg-blue-500/8',    border: 'border-blue-500/20',    icon: 'text-blue-400',    ring: 'ring-blue-500/40'    },
  { bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', icon: 'text-emerald-400', ring: 'ring-emerald-500/40' },
  { bg: 'bg-purple-500/8',  border: 'border-purple-500/20',  icon: 'text-purple-400',  ring: 'ring-purple-500/40'  },
  { bg: 'bg-amber-500/8',   border: 'border-amber-500/20',   icon: 'text-amber-400',   ring: 'ring-amber-500/40'   },
];

// ─── Charity Card ─────────────────────────────────────────────────────────────
function CharityCard({ charity, isSelected, onSelect, saving, index }) {
  const color = CARD_COLORS[index % CARD_COLORS.length];
  const isLoading = saving === charity.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => !isSelected && !saving && onSelect(charity.id)}
      className={cn(
        'relative rounded-2xl border p-5 cursor-pointer transition-all duration-200 group',
        color.bg, color.border,
        isSelected
          ? `ring-2 ${color.ring} shadow-lg scale-[1.01]`
          : 'hover:scale-[1.01] hover:shadow-md',
        saving && !isLoading ? 'opacity-50 cursor-not-allowed' : ''
      )}
    >
      {/* Featured badge */}
      {charity.is_featured && (
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <Star className="w-2.5 h-2.5 fill-amber-400" /> Featured
          </span>
        </div>
      )}

      {/* Selected checkmark */}
      <AnimatePresence>
        {isSelected && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            className="absolute top-4 right-4">
            <CheckCircle2 className={cn('w-5 h-5', color.icon)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="absolute top-4 right-4">
          <Loader2 className={cn('w-5 h-5 animate-spin', color.icon)} />
        </div>
      )}

      {/* Image or icon */}
      {charity.image_url ? (
        <img src={charity.image_url} alt={charity.name}
          className={cn('w-12 h-12 rounded-xl object-cover mb-4 transition-transform group-hover:scale-105', charity.is_featured ? 'mt-6' : '')} />
      ) : (
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110', color.bg, `border ${color.border}`, charity.is_featured ? 'mt-6' : '')}>
          <Heart className={cn('w-5 h-5', color.icon)} />
        </div>
      )}

      <h3 className="font-semibold text-sm mb-2 pr-6">{charity.name}</h3>

      {charity.description && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">{charity.description}</p>
      )}

      {charity.website && (
        <a href={charity.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className={cn('inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline', color.icon)}>
          Visit website <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {isSelected && (
        <div className={cn('mt-3 pt-3 border-t flex items-center gap-1.5 text-xs font-medium', color.border, color.icon)}>
          <Sparkles className="w-3 h-3" />
          Your chosen charity
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Charity() {
  const { user, signOut } = useAuth();
  const [charities, setCharities]       = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [charityPct, setCharityPct]     = useState(10);
  const [pctInput, setPctInput]         = useState(10);
  const [savingPct, setSavingPct]       = useState(false);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(null);
  const [successMsg, setSuccessMsg]     = useState('');
  const [error, setError]               = useState('');

  // Donation form state
  const [donateCharityId, setDonateCharityId] = useState('');
  const [donateAmount, setDonateAmount]       = useState('');
  const [donateMsg, setDonateMsg]             = useState('');
  const [donating, setDonating]               = useState(false);
  const [donateSuccess, setDonateSuccess]     = useState('');
  const [donateError, setDonateError]         = useState('');

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Golfer';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const [charitiesRes, myCharityRes] = await Promise.all([
        fetch(`${API}/api/charity`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/charity/my-charity`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [charitiesJson, myCharityJson] = await Promise.all([
        charitiesRes.json(),
        myCharityRes.json(),
      ]);
      setCharities(charitiesJson.data ?? []);
      const myCharity = myCharityJson.data;
      if (myCharity) {
        setSelectedId(myCharity.id ?? null);
        const pct = myCharity.charity_percentage ?? 10;
        setCharityPct(pct);
        setPctInput(pct);
      }
    } catch (_) {
      setError('Could not load charities. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSelect(charityId) {
    if (charityId === selectedId) return;
    setSaving(charityId);
    setError('');
    setSuccessMsg('');
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/charity/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ charity_id: charityId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || 'Failed to select charity.'); return; }
      setSelectedId(charityId);
      setSuccessMsg(`You are now supporting ${json.data?.name ?? 'this charity'}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (_) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(null);
    }
  }

  async function handleSavePct() {
    if (pctInput < 10 || pctInput > 100) return;
    setSavingPct(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/charity/my-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ charity_percentage: Number(pctInput) }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || 'Failed to update percentage.'); return; }
      setCharityPct(Number(pctInput));
      setSuccessMsg('Charity contribution updated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (_) {
      setError('Failed to update. Please try again.');
    } finally {
      setSavingPct(false);
    }
  }

  async function handleDonate(e) {
    e.preventDefault();
    setDonating(true); setDonateError(''); setDonateSuccess('');
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/charity/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ charity_id: donateCharityId, amount: Number(donateAmount), message: donateMsg || null }),
      });
      const json = await res.json();
      if (!res.ok) { setDonateError(json.message || 'Donation failed.'); return; }
      setDonateSuccess(json.message || 'Donation recorded. Thank you!');
      setDonateAmount(''); setDonateMsg('');
      setTimeout(() => setDonateSuccess(''), 5000);
    } catch (_) {
      setDonateError('Something went wrong. Please try again.');
    } finally {
      setDonating(false);
    }
  }

  const selectedCharity = charities.find(c => c.id === selectedId);
  const featuredCharities = charities.filter(c => c.is_featured);
  const pctChanged = Number(pctInput) !== charityPct;

  // Monthly subscription is £9.99/month — derive contribution
  const MONTHLY_COST = 9.99;
  const monthlyContrib = ((MONTHLY_COST * charityPct) / 100).toFixed(2);

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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm">My Charity</span>
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

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Choose Your Charity</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A portion of your GreenPass subscription goes to your chosen charity every month.
          </p>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Currently supporting + contribution control */}
        {selectedCharity && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/8 border border-rose-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              {selectedCharity.image_url ? (
                <img src={selectedCharity.image_url} alt={selectedCharity.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                  <Heart className="w-6 h-6 text-rose-400" />
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Currently supporting</p>
                <p className="font-semibold text-rose-400">{selectedCharity.name}</p>
              </div>
            </div>

            {/* Contribution percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-rose-400" />
                  Contribution: <span className="text-rose-400">{pctInput}%</span>
                  <span className="text-xs text-muted-foreground">(≈ £{((MONTHLY_COST * pctInput) / 100).toFixed(2)}/mo)</span>
                </label>
                {pctChanged && (
                  <button onClick={handleSavePct} disabled={savingPct}
                    className="flex items-center gap-1.5 text-xs bg-rose-500 text-white px-3 py-1 rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors">
                    {savingPct ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save
                  </button>
                )}
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={pctInput}
                onChange={e => setPctInput(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10% (min)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Charity events */}
            {selectedCharity.events && selectedCharity.events.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming Events</p>
                {selectedCharity.events.map((ev, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-sm font-medium">{ev.title}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {ev.date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" /> {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {ev.location}
                        </span>
                      )}
                    </div>
                    {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Featured charities highlight */}
        {featuredCharities.length > 0 && !selectedCharity && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Featured Charities
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {featuredCharities.map((charity, i) => (
                <CharityCard key={charity.id} charity={charity} isSelected={charity.id === selectedId}
                  onSelect={handleSelect} saving={saving} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Charity grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : charities.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">No charities available yet.</p>
          </div>
        ) : (
          <div>
            {featuredCharities.length > 0 && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">All Charities</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              {charities.map((charity, i) => (
                <CharityCard key={charity.id} charity={charity} isSelected={charity.id === selectedId}
                  onSelect={handleSelect} saving={saving} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Independent donation form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Make a One-Off Donation
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Donate directly to any charity, separate from your subscription.</p>
          </div>

          <AnimatePresence>
            {donateSuccess && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {donateSuccess}
              </motion.div>
            )}
          </AnimatePresence>
          {donateError && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {donateError}
            </div>
          )}

          <form onSubmit={handleDonate} className="space-y-3">
            <select value={donateCharityId} onChange={e => setDonateCharityId(e.target.value)} required
              className="w-full bg-input border border-white/15 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Select a charity…</option>
              {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                <input type="number" min="0.50" step="0.01" value={donateAmount}
                  onChange={e => setDonateAmount(e.target.value)} placeholder="0.00" required
                  className="w-full bg-input border border-white/15 rounded-lg pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <button type="submit" disabled={donating || !donateCharityId || !donateAmount}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                {donating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Donate
              </button>
            </div>
            <textarea value={donateMsg} onChange={e => setDonateMsg(e.target.value)}
              placeholder="Add a message (optional, max 300 chars)" maxLength={300} rows={2}
              className="w-full bg-input border border-white/15 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 pb-4">
          You can change your charity at any time. The change takes effect from your next billing cycle.
        </p>
      </main>
    </div>
  );
}

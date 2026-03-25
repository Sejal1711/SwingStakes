import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Trophy,
  Heart,
  TrendingUp,
  Star,
  ArrowRight,
  ChevronRight,
  Users,
  Gift,
  Target,
  ExternalLink,
  Calendar,
  MapPin,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
};

const stats = [
  { label: 'Active Members', value: '2,400+', icon: Users },
  { label: 'Raised for Charity', value: '£84,000', icon: Heart },
  { label: 'Prizes Awarded', value: '£120,000', icon: Gift },
  { label: 'Rounds Tracked', value: '18,500+', icon: Target },
];

const features = [
  {
    icon: TrendingUp,
    title: 'Track Your Game',
    description:
      'Log every round with Stableford scoring. Watch your handicap trend, spot your strengths, and own your progress on the course.',
    color: 'from-emerald-500/20 to-green-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Heart,
    title: 'Play for a Cause',
    description:
      'Every subscription contributes to your chosen charity. Your passion for golf becomes a force for good in the world.',
    color: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-400',
  },
  {
    icon: Trophy,
    title: 'Win Monthly Prizes',
    description:
      'Enter our monthly draw with every round you play. Better performance earns more entries — more entries, more chances to win.',
    color: 'from-amber-500/20 to-yellow-500/20',
    iconColor: 'text-amber-400',
  },
];

const plans = [
  {
    name: 'Monthly',
    price: '£9.99',
    period: '/mo',
    features: [
      'Unlimited round tracking',
      '1 draw entry per round',
      'Charity contribution',
      'Performance analytics',
    ],
    cta: 'Start Monthly',
    highlight: false,
  },
  {
    name: 'Annual',
    price: '£89.99',
    period: '/yr',
    badge: 'Best Value',
    features: [
      'Everything in Monthly',
      '2x draw entries per round',
      'Priority charity selection',
      'Exclusive annual badge',
    ],
    cta: 'Go Annual',
    highlight: true,
  },
];

export default function Home() {
  const [featuredCharities, setFeaturedCharities] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/charity/featured`)
      .then(r => r.json())
      .then(j => setFeaturedCharities(j.data ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">SwingStakes</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#charity" className="hover:text-foreground transition-colors">Charity</a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-emerald-400 mb-8 border border-emerald-500/20"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Play. Give. Win — Every Month.</span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          >
            Golf that{' '}
            <span className="text-gradient">Gives Back</span>
            <br />
            and{' '}
            <span className="text-gradient-gold">Rewards</span> You
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Track your Stableford scores, support your chosen charity, and enter
            monthly prize draws — all in one subscription. The more you play,
            the more you give, the more you could win.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold hover:bg-primary/90 transition-all hover:scale-105 glow-green"
            >
              Join SwingStakes
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 glass px-8 py-4 rounded-xl text-lg font-medium hover:bg-white/10 transition-all"
            >
              See How It Works
              <ChevronRight className="w-5 h-5" />
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-5 text-center">
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              Built for golfers who{' '}
              <span className="text-gradient">care</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              SwingStakes combines performance tracking with purpose. Every round
              you play contributes to something bigger than par.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="relative rounded-2xl p-8 glass hover:bg-white/5 transition-all group"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to a better golf life</p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                step: '01',
                title: 'Subscribe & Choose Your Charity',
                desc: 'Pick your plan and select the charity you want to support. Part of every subscription goes directly to your chosen cause.',
                color: 'text-emerald-400',
              },
              {
                step: '02',
                title: 'Log Every Round',
                desc: 'Submit your Stableford scores after each round. Track your handicap trend and performance over time.',
                color: 'text-amber-400',
              },
              {
                step: '03',
                title: 'Enter the Monthly Draw',
                desc: 'Every round you log earns draw entries. At month end, winners are drawn from the prize pool. Your game, your charity, your prize.',
                color: 'text-rose-400',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="flex gap-6 glass rounded-2xl p-6"
              >
                <div className={`text-4xl font-bold ${item.color} opacity-60 shrink-0 w-12`}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              Simple, transparent{' '}
              <span className="text-gradient">pricing</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              No hidden fees. Cancel anytime. 100% of charity contribution goes to your cause.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className={`relative rounded-2xl p-8 ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-primary/20 to-emerald-600/20 border border-primary/30 glow-green'
                    : 'glass'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-3 rounded-xl font-medium transition-all hover:scale-105 ${
                    plan.highlight
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'glass hover:bg-white/10'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Charity Impact Section */}
      <section id="charity" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm px-4 py-2 rounded-full mb-6">
              <Heart className="w-3.5 h-3.5 fill-current" /> Real charities. Real impact.
            </div>
            <h2 className="text-4xl font-bold mb-4">
              Your game funds{' '}
              <span className="text-gradient">causes that matter</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every subscription directly supports real charities chosen by our members.
              You choose who benefits from your passion for golf.
            </p>
          </motion.div>

          {featuredCharities.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6 mb-14">
              {featuredCharities.slice(0, 4).map((c, i) => (
                <motion.div
                  key={c.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                  className="glass rounded-2xl p-6 border border-white/10 hover:border-rose-500/20 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="w-14 h-14 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Heart className="w-6 h-6 text-rose-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm">{c.name}</h3>
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-400" /> Featured
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{c.description}</p>
                      )}
                      {c.events && c.events.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Next event: {c.events[0].title}</span>
                          {c.events[0].location && (
                            <span className="flex items-center gap-0.5 ml-1">
                              <MapPin className="w-3 h-3" />{c.events[0].location}
                            </span>
                          )}
                        </div>
                      )}
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-rose-400 hover:underline mt-1.5">
                          Visit website <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="grid md:grid-cols-3 gap-5 mb-14"
            >
              {[
                { name: 'Children\'s Cancer Fund', desc: 'Funding cutting-edge research for childhood cancers', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
                { name: 'Veterans\' Support Network', desc: 'Providing mental health care for military veterans', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                { name: 'Local Food Banks Alliance', desc: 'Fighting food poverty in communities across the UK', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              ].map((c, i) => (
                <div key={c.name} className={`rounded-2xl p-5 border ${c.color}`}>
                  <Heart className={`w-6 h-6 mb-3 ${c.color.split(' ')[0]}`} />
                  <h3 className="font-semibold text-sm mb-1">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Final CTA */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center glass rounded-3xl p-12 border border-white/10"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-4xl font-bold mb-4">
              Ready to make your game{' '}
              <span className="text-gradient">matter</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Join thousands of golfers who turn every round into meaningful change.
              Play your game. Fund your cause. Win every month.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-4 rounded-xl text-lg font-semibold hover:bg-primary/90 transition-all hover:scale-105 glow-green"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-4 text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Trophy className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-foreground">SwingStakes</span>
        </div>
        <p>© {new Date().getFullYear()} SwingStakes. All rights reserved.</p>
        <p className="mt-1 text-xs">Play. Give. Win.</p>
      </footer>
    </div>
  );
}

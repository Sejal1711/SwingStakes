import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
];

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const failedRule = passwordRules.find((r) => !r.test(form.password));
    if (failedRule) {
      setError(`Password must meet: ${failedRule.label}`);
      return;
    }

    setLoading(true);
    setError('');

    const { error: signUpError } = await signUp({
      email: form.email,
      password: form.password,
      username: form.username,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Failed to create account. Please try again.');
      return;
    }

    setSuccess(true);
    // Navigate to dashboard after brief delay (or confirmation screen)
    setTimeout(() => navigate('/dashboard'), 2000);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center glass rounded-2xl p-12 max-w-md w-full border border-white/10"
        >
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
          <p className="text-muted-foreground">
            Welcome to SwingStakes. Check your email to verify your account.
          </p>
          <div className="mt-6 w-full h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2 }}
              className="h-full bg-primary"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-rose-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">SwingStakes</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-1">Join SwingStakes</h1>
          <p className="text-muted-foreground text-sm">
            Play golf. Support charity. Win prizes.
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="golfpro99"
                  className={cn(
                    'w-full bg-input border border-white/15 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground',
                    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                    'transition-colors hover:border-muted-foreground/50'
                  )}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={cn(
                    'w-full bg-input border border-white/15 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground',
                    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                    'transition-colors hover:border-muted-foreground/50'
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={cn(
                    'w-full bg-input border border-white/15 rounded-lg pl-10 pr-10 py-2.5 text-sm text-foreground',
                    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                    'transition-colors hover:border-muted-foreground/50'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicators */}
              {form.password && (
                <div className="flex gap-2 mt-2">
                  {passwordRules.map((rule) => (
                    <div
                      key={rule.label}
                      title={rule.label}
                      className={cn(
                        'flex-1 h-1 rounded-full transition-colors',
                        rule.test(form.password) ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={cn(
                    'w-full bg-input border border-white/15 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground',
                    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                    'transition-colors hover:border-muted-foreground/50',
                    form.confirmPassword &&
                      (form.password === form.confirmPassword
                        ? 'border-primary/50'
                        : 'border-destructive/50')
                  )}
                />
              </div>
            </div>

            {/* Terms */}
            <p className="text-xs text-muted-foreground text-center">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold',
                'hover:bg-primary/90 transition-all hover:scale-[1.01]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                'flex items-center justify-center gap-2'
              )}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

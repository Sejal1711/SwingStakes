import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);  // only: "do we know auth state yet?"
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch profile separately — never blocks auth loading
  async function fetchProfile(userId) {
    setProfileLoading(true);
    try {
      // 5 second timeout — if Supabase hangs, bail out gracefully
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('profile fetch timeout')), 5000)
      );
      const query = supabase
        .from('profiles')
        .select('role, username, avatar_url, handicap')
        .eq('user_id', userId)
        .single();

      const { data, error } = await Promise.race([query, timeout]);
      if (error) console.warn('[fetchProfile] error:', error.message);
      setProfile(data ?? null);
    } catch (err) {
      console.warn('[fetchProfile] failed:', err.message);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    // Step 1: Get current session — set loading=false as soon as we know
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);                          // ← loading done, auth state known
      if (session?.user) fetchProfile(session.user.id); // fetch profile in background
    }).catch(() => {
      setLoading(false);
    });

    // Step 2: Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signUp({ email, password, username }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return { data, error };
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  }

  const role         = profile?.role ?? null;
  const isAdmin      = role === 'admin';
  const isSubscriber = role === 'subscriber';
  const isVisitor    = !user;

  const value = {
    user,
    session,
    profile,
    role,
    isAdmin,
    isSubscriber,
    isVisitor,
    loading,
    profileLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;

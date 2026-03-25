import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Pricing from '@/pages/Pricing';
import SubscriptionSuccess from '@/pages/subscription/Success';
import SubscriptionCancel from '@/pages/subscription/Cancel';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import Scores from '@/pages/Scores';
import Prizes from '@/pages/Prizes';
import Charity from '@/pages/Charity';

// Spinner shown while auth state is loading
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Blocks logged-out users (visitors).
 * Redirects to /login if not authenticated.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Blocks users without an active subscription.
 * - Not logged in → /login
 * - Logged in, no subscription → /pricing
 * - Active subscription → render children
 */
function SubscriberRoute({ children }) {
  const { user, loading } = useAuth();
  const [subChecked, setSubChecked] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    // Wait for auth to fully resolve before checking subscription
    if (loading) return;

    if (!user) {
      setHasSubscription(false);
      setSubChecked(true);
      return;
    }

    // Auth is resolved and user is logged in — now check subscription
    setSubChecked(false);
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token;
      if (!token) { setSubChecked(true); return; }
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(json => {
          setHasSubscription(!!json.data);
          setSubChecked(true);
        })
        .catch(() => {
          setHasSubscription(false);
          setSubChecked(true);
        });
    });
  }, [user, loading]); // re-run when auth state changes

  if (loading || !subChecked) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasSubscription) return <Navigate to="/pricing?reason=subscription_required" replace />;
  return children;
}

/**
 * Blocks non-admin users.
 * - Not logged in → redirect to /login
 * - Logged in but not admin → redirect to /dashboard
 */
function AdminRoute({ children }) {
  const { user, isAdmin, loading, profileLoading } = useAuth();
  if (loading || profileLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes — accessible to visitors */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/subscription/success" element={<SubscriptionSuccess />} />
      <Route path="/subscription/cancel" element={<SubscriptionCancel />} />

      {/* Logged-in only */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Active subscription required */}
      <Route path="/scores"  element={<SubscriberRoute><Scores /></SubscriberRoute>} />
      <Route path="/prizes"  element={<SubscriberRoute><Prizes /></SubscriberRoute>} />
      <Route path="/charity" element={<SubscriberRoute><Charity /></SubscriberRoute>} />

      {/* Admin routes — must be logged in AND have role = 'admin' */}
      <Route path="/admin"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/*"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="dark">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

import React from 'react';
import { supabase } from '../lib/supabase';
import { setStoredToken } from '../services/apiClient';

interface LoginScreenProps {
  onLoggedIn: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoggedIn }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
      if (err) throw err;
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      const session = (await supabase.auth.getSession()).data.session;
      if (session) {
        setStoredToken(session.access_token);
        onLoggedIn();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-xl border border-slate-700">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Shotlab AI Tool</h1>
        <p className="text-slate-400 text-sm mb-6">Sign in to use the app (MVP: 50 images + 3 reels/day for 7 days).</p>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-300 text-sm">{error}</div>
        )}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {loading ? 'Redirecting…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
};

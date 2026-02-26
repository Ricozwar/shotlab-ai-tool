import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isApiConfigured, getStoredToken, setStoredToken } from '../services/apiClient';
import { LoginScreen } from './LoginScreen';
import App from '../App';

export const AuthGate: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<'loading' | 'no-token' | 'has-token'>('loading');

  useEffect(() => {
    if (!isApiConfigured()) {
      setAuthStatus('has-token');
      return;
    }
    const init = async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStoredToken(data.session.access_token);
          setAuthStatus('has-token');
        } else {
          setAuthStatus('no-token');
        }
        supabase.auth.onAuthStateChange((_, session) => {
          if (session) {
            setStoredToken(session.access_token);
            setAuthStatus('has-token');
          } else {
            setAuthStatus('no-token');
          }
        });
      } else {
        setAuthStatus(getStoredToken() ? 'has-token' : 'no-token');
      }
    };
    init();
  }, []);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }
  if (isApiConfigured() && authStatus === 'no-token') {
    return <LoginScreen onLoggedIn={() => setAuthStatus('has-token')} />;
  }
  return <App />;
};

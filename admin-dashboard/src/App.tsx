import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import LoginForm from './components/LoginForm';
import { supabase } from './lib/supabase';

function Dashboard({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">ADUN Admin Dashboard</h1>
        <div className="dashboard__user">
          <span>{email}</span>
          <button type="button" className="dashboard__sign-out" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="dashboard__main">
        <p>Ticket management UI coming in Phase 3.</p>
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!cancelled) {
        setSession(currentSession);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="status">Loading…</div>;
  }

  if (!session) {
    return <LoginForm />;
  }

  return (
    <Dashboard
      email={session.user.email ?? 'Staff'}
      onSignOut={() => void supabase.auth.signOut()}
    />
  );
}

export default App;

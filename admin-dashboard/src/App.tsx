import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AdminMap from './components/AdminMap';
import LoginForm from './components/LoginForm';
import StaffApprovals from './components/StaffApprovals';
import TicketTable from './components/TicketTable';
import { supabase } from './lib/supabase';
import type { StaffProfile } from './types/database';

function PendingApproval({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="status">
      <p>Akaun anda menunggu kelulusan. Sila hubungi pentadbir.</p>
      <button type="button" className="dashboard__sign-out" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}

function Dashboard({
  profile,
  onSignOut,
}: {
  profile: StaffProfile;
  onSignOut: () => void;
}) {
  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Panel Staf</h1>
        <div className="dashboard__user">
          <span>
            {profile.name} · {profile.role}
          </span>
          <button type="button" className="dashboard__sign-out" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="dashboard__main">
        <TicketTable role={profile.role} />
        <AdminMap />
        {profile.role === 'admin' && <StaffApprovals />}
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!cancelled) {
        setSession(currentSession);
        setAuthLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(userId: string) {
      setProfileLoading(true);
      setProfileError(null);

      const { data, error } = await supabase
        .from('staff')
        .select('user_id, name, email, role, active, created_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setProfile(null);
        setProfileError(error.message);
      } else {
        setProfile((data as StaffProfile | null) ?? null);
      }
      setProfileLoading(false);
    }

    if (!session) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError(null);
      return;
    }

    void loadProfile(session.user.id);

    return () => {
      cancelled = true;
    };
  }, [session]);

  function signOut() {
    void supabase.auth.signOut();
  }

  if (authLoading || (session && profileLoading)) {
    return <div className="status">Loading…</div>;
  }

  if (!session) {
    return <LoginForm />;
  }

  if (profileError) {
    return (
      <div className="status">
        <p className="status-text status-text--error">{profileError}</p>
        <button type="button" className="dashboard__sign-out" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  if (!profile || !profile.active) {
    return <PendingApproval onSignOut={signOut} />;
  }

  return <Dashboard profile={profile} onSignOut={signOut} />;
}

export default App;

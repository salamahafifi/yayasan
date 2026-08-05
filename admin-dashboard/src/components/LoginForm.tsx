import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

/** Set true to show password fields again. */
const ENABLE_PASSWORD_FALLBACK = false;

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    setInfo(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (otpError) {
      setError(otpError.message);
    } else {
      setInfo('Pautan log masuk telah dihantar ke e-mel anda. Sila semak peti masuk.');
    }
    setLoading(false);
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) setError(signInError.message);
    setLoading(false);
  }

  return (
    <div className="login">
      <div className="login__form">
        <p className="login__eyebrow">Staff only</p>
        <p className="login__brand">
          Peta Aduan <span className="login__brand-accent">Salamahafifi</span>
        </p>
        <h1 className="login__title">Panel Staf</h1>
        <p className="login__lede">
          Log masuk untuk mengurus aduan, status kes, dan gambar untuk peta awam.
        </p>

        <button
          type="button"
          disabled={loading}
          className="login__button"
          onClick={() => void handleGoogleSignIn()}
        >
          {loading ? 'Mengalihkan…' : 'Log masuk dengan Google'}
        </button>

        <form onSubmit={handleMagicLink} className="login__fallback">
          <label className="login__label">
            E-mel
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login__input"
              autoComplete="email"
            />
          </label>
          <button type="submit" disabled={loading} className="login__button login__button--secondary">
            {loading ? 'Menghantar…' : 'Log masuk dengan e-mel'}
          </button>
        </form>

        {ENABLE_PASSWORD_FALLBACK && (
          <form onSubmit={handlePasswordSubmit} className="login__fallback">
            <label className="login__label">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login__input"
              />
            </label>
            <button type="submit" disabled={loading} className="login__button login__button--secondary">
              {loading ? 'Signing in…' : 'Sign in with password'}
            </button>
          </form>
        )}

        {info && <p className="login__info">{info}</p>}
        {error && <p className="login__error">{error}</p>}
        <p className="login__staff-note">
          Akaun baharu perlu diluluskan oleh pentadbir sebelum boleh digunakan.
        </p>
      </div>
    </div>
  );
}

export default LoginForm;

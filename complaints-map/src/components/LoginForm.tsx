import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="login">
      <form onSubmit={handleSubmit} className="login__form">
        <h1 className="login__title">Complaints Site — Staff Login</h1>
        <label className="login__label">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login__input"
          />
        </label>
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
        {error && <p className="login__error">{error}</p>}
        <button type="submit" disabled={loading} className="login__button">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
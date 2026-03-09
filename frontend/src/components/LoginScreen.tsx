import { useState } from 'react';
import { authApi } from '../api';
import { extractApiError } from '../api/client';

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginRes = await authApi.login(login, password);
      if (loginRes.success) {
        const sessionRes = await authApi.session();
        if (!sessionRes.authenticated) {
          throw new Error('Sesja nie zostala zapisana. Sprawdz konfiguracje domeny API.');
        }
        setFadeOut(true);
        setTimeout(onLogin, 400);
      }
    } catch (err: any) {
      setError(extractApiError(err, 'Blad logowania'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-overlay ${fadeOut ? 'fade-out' : ''}`}>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img src="/motometr_logo.svg" alt="Motometr" className="login-brand-image" />
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Login</label>
          <input
            className="form-input"
            type="text"
            value={login}
            onChange={e => setLogin(e.target.value)}
            placeholder="Wpisz login"
            autoFocus
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Haslo</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Wpisz haslo"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary login-btn"
          disabled={loading || !login || !password}
        >
          {loading ? 'Logowanie...' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
}

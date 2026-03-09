import { useState } from 'react';
import api from '../api/client';

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
      const res = await api.post('/auth/login', { login, password });
      if (res.data.success) {
        setFadeOut(true);
        setTimeout(onLogin, 400);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-overlay ${fadeOut ? 'fade-out' : ''}`}>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-title">Garaż</div>
        <div className="login-subtitle">v2.0 // panel analityczny</div>

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
          <label className="form-label">Hasło</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Wpisz hasło"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary login-btn"
          disabled={loading || !login || !password}
        >
          {loading ? 'Logowanie...' : 'ZALOGUJ'}
        </button>
      </form>
    </div>
  );
}

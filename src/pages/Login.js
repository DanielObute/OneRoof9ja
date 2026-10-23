import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import { API, saveToken, firstError } from '../api';
import { labelStyle, inputStyle, primaryBtn } from '../styles';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/'; // where to go after logging in

  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const cleanEmail = email.trim().toLowerCase();
    const path = mode === 'signup' ? 'signup' : 'login';
    // the email is the login name
    const body =
      mode === 'signup'
        ? { email: cleanEmail, password }
        : { username: cleanEmail, password };

    try {
      const res = await fetch(`${API}/auth/${path}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(firstError(data));
        return;
      }

      saveToken(data.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError("We couldn't reach the server. Make sure the backend is running.");
    } finally {
      setBusy(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <PageWrapper>
      <div style={{ maxWidth: '440px' }}>
        <h1 style={{ color: '#4f5c3f', margin: '0 0 8px' }}>
          {isSignup ? 'Create your account' : 'Log in'}
        </h1>
        <p style={{ color: '#726f60', margin: '0 0 28px' }}>
          {isSignup
            ? 'You need an account to unlock a house. Browsing is always free.'
            : 'Welcome back. Log in to unlock houses and see your unlocked ones.'}
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email</label>
          <input
            required
            type="email"
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={labelStyle}>Password</label>
          <input
            required
            type="password"
            minLength={isSignup ? 8 : undefined}
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isSignup && (
            <p style={{ margin: '-8px 0 18px', fontSize: '13px', color: '#726f60' }}>
              At least 8 characters, and not something too common.
            </p>
          )}

          {error && <p style={{ color: '#b85c3e', marginTop: 0 }}>{error}</p>}

          <button type="submit" style={primaryBtn} disabled={busy}>
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p style={{ marginTop: '22px', fontSize: '14px' }}>
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? 'login' : 'signup');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#b85c3e',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {isSignup ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </div>
    </PageWrapper>
  );
}

export default Login;
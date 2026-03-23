import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('login'); // login, register, 2fa, dashboard
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Idle Timer
  const idleTimerRef = useRef(null);
  const IDLE_LIMIT = 5 * 60 * 1000; // 5 Minutes

  // Idle Detection System
  useEffect(() => {
    if (!user) return; // Only track when logged in

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        handleLogout(true); // True = auto logout
      }, IDLE_LIMIT);
    };

    // Events to track
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    resetTimer(); // Start timer immediately

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        setStep('2fa');
        setMessage(data.message);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection refused. Is backend running?');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
      });
      const data = await res.json();

      if (res.ok) {
        setStep('login');
        setMessage(data.message);
        setPassword('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Registration Failed');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, otp })
      });
      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        setStep('dashboard');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection Error');
    }
  };

  const handleLogout = async (isAuto = false) => {
    try {
      await fetch('http://localhost:3001/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // Ignore error on logout
    }
    setUser(null);
    setStep('login');
    setUsername('');
    setPassword('');
    setOtp('');

    if (isAuto) {
      setError('Session expired due to inactivity. Please login again.');
    } else {
      setMessage('');
      setError('');
    }
  };

  if (step === 'dashboard' && user) {
    return <Dashboard user={user} onLogout={() => handleLogout(false)} />;
  }

  return (
    <div className="center-screen">
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>

        {/* Header with Emblem */}
        <div className="text-center" style={{ marginBottom: '2.5rem' }}>
          <div className="emblem" style={{ margin: '0 auto 1.5rem' }}>
            <span>🛡️</span>
          </div>
          <h1 className="text-gradient" style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            VANGUARD
          </h1>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            Secure Command Portal
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        )}
        {message && (
          <div className="alert alert-success">
            <span>✓</span>
            {message}
          </div>
        )}

        {step === 'login' || step === 'register' ? (
          <form onSubmit={step === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group">
              <label className="input-label">
                Badge ID / Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter credentials"
                autoComplete="off"
              />
            </div>
            <div className="input-group">
              <label className="input-label">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
              />
            </div>
            {step === 'register' && (
              <div className="input-group">
                <label className="input-label">
                  Secure Email (Required for OTP)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="name@agency.gov"
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              {step === 'login' ? 'Authenticate' : 'Register Officer'}
            </button>

            <div className="text-center" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              {step === 'login' ? (
                <span
                  onClick={() => { setStep('register'); setError(''); setMessage(''); }}
                  style={{ cursor: 'pointer', color: 'var(--accent)' }}
                  className="text-glow"
                >
                  New assignment? Register
                </span>
              ) : (
                <span
                  onClick={() => { setStep('login'); setError(''); setMessage(''); }}
                  style={{ cursor: 'pointer', color: 'var(--accent)' }}
                  className="text-glow"
                >
                  Return to Login
                </span>
              )}
            </div>

            {step === 'login' && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                border: '1px solid var(--border)'
              }}>
                <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>DEMO ACCESS:</p>
                <div className="mono">
                  commissioner // password123
                </div>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="text-center">
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                filter: 'drop-shadow(0 0 10px var(--accent-glow))'
              }}>🔐</div>
              <p style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: 'var(--text-main)',
                marginBottom: '0.5rem'
              }}>
                Two-Factor Security
              </p>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
              }}>
                Enter the 6-digit secure code
              </p>
            </div>
            <div>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={6}
                className="input-field text-center mono"
                style={{
                  fontSize: '2rem',
                  letterSpacing: '0.5em',
                  fontWeight: '600',
                  padding: '1rem',
                  borderColor: 'var(--accent)'
                }}
                placeholder="000000"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Verify Identity
            </button>
            <button
              type="button"
              onClick={() => setStep('login')}
              className="btn btn-ghost"
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;

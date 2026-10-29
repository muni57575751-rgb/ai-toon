import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, loginDemoUser, loginDemoAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(trimmedEmail, password);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Invalid email or password.');
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleDemoStudentLogin = () => {
    loginDemoUser();
    navigate(from, { replace: true });
  };

  const handleDemoAdminLogin = () => {
    loginDemoAdmin();
    // If user was trying to go to /admin or /dashboard, respect that
    navigate(from === '/login' ? '/admin' : from, { replace: true });
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon-badge">
            🎒
          </div>
          <h2 className="auth-title">Welcome Back!</h2>
          <p className="auth-subtitle">
            Sign in to continue your AI-powered cartoon learning adventure.
          </p>
        </div>

        {/* Quick Testing Accounts */}
        <div className="auth-alert-info" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            <span>⚡</span> Quick Role Testing
          </div>
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', lineHeight: 1.4 }}>
            Instantly test role restrictions, dashboard access, and admin governance:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDemoStudentLogin}
              className="btn-neoclay-secondary"
              style={{ flex: 1, fontSize: '0.82rem', padding: '0.45rem', minWidth: '130px' }}
            >
              🧑‍🎓 Student Login
            </button>
            <button
              type="button"
              onClick={handleDemoAdminLogin}
              className="btn-neoclay-secondary"
              style={{
                flex: 1,
                fontSize: '0.82rem',
                padding: '0.45rem',
                minWidth: '130px',
                borderColor: '#a855f7',
                color: '#6b21a8',
                fontWeight: 800,
              }}
            >
              🛡️ Admin Login
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="auth-alert-error" style={{ marginBottom: '1.25rem' }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-neoclay-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In to AI Toon'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="auth-footer">
          Don&apos;t have an account yet?
          <Link to="/signup" className="auth-link">
            Sign Up
          </Link>
          <div style={{ marginTop: '0.75rem' }}>
            <Link to="/" style={{ fontSize: '0.82rem', color: 'var(--navy-500)', textDecoration: 'none' }}>
              ← Back to AI Toon Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD } from '../../context/AuthContext';
import '../../styles/auth.css';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
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
      setErrorMsg(error.message);
    } else {
      // If logging in as Muni admin, redirect to admin console if coming from general login
      if (trimmedEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() && from === '/dashboard') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  const fillAdminCredentials = () => {
    setEmail(MASTER_ADMIN_EMAIL);
    setPassword(MASTER_ADMIN_PASSWORD);
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
            Sign in to access AI Toon. New accounts require Administrator approval before logging in.
          </p>
        </div>

        {/* Master Admin One-Click Quick Fill */}
        <div
          className="auth-alert-info"
          style={{
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, rgba(243, 232, 255, 0.8) 0%, rgba(224, 242, 254, 0.8) 100%)',
            border: '1.5px solid rgba(168, 85, 247, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 800, color: '#581c87', fontSize: '0.86rem' }}>
              🛡️ Master Administrator Access
            </span>
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="btn-neoclay-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '0.25rem 0.65rem',
                borderColor: '#a855f7',
                color: '#6b21a8',
                fontWeight: 800,
              }}
            >
              Autofill Credentials
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b21a8', lineHeight: 1.45 }}>
            Admin Email: <code>{MASTER_ADMIN_EMAIL}</code>
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
              placeholder="e.g. muni57575751@gmail.com"
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

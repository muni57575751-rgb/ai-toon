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

  const { signIn, isConfigured, loginDemoUser } = useAuth();
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

  const handleDemoLogin = () => {
    loginDemoUser();
    navigate(from, { replace: true });
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

        {/* Supabase Notice if not configured */}
        {!isConfigured && (
          <div className="auth-alert-info" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
              <span>ℹ️</span> Supabase Setup Required for Production Auth
            </div>
            <p style={{ margin: '0.2rem 0 0.5rem', fontSize: '0.82rem', lineHeight: 1.4 }}>
              Set <code style={{ background: '#e0e7ff', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>VITE_SUPABASE_URL</code> and <code style={{ background: '#e0e7ff', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>VITE_SUPABASE_ANON_KEY</code> in <code style={{ background: '#e0e7ff', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>frontend/.env.local</code>.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="btn-neoclay-secondary"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
            >
              🚀 Quick Test: Explore Dashboard via Demo Account
            </button>
          </div>
        )}

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

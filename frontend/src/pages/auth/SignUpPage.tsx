import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

export const SignUpPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp, isConfigured, loginDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-check.');
      return;
    }

    setIsSubmitting(true);
    const { error, needsEmailConfirmation } = await signUp(trimmedName, trimmedEmail, password);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Registration failed. Please try again.');
    } else if (needsEmailConfirmation) {
      setSuccessMsg(
        'Registration successful! Please check your email inbox to confirm your account before logging in.'
      );
    } else {
      // Auto-confirmed, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  };

  const handleDemoLogin = () => {
    loginDemoUser();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon-badge">
            🚀
          </div>
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">
            Join AI Toon to start learning through personalized cartoon stories!
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

        {/* Success Banner */}
        {successMsg && (
          <div className="auth-alert-success" style={{ marginBottom: '1.25rem' }}>
            <span>🎉</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="auth-alert-error" style={{ marginBottom: '1.25rem' }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">
              Full Name
            </label>
            <input
              id="signup-name"
              type="text"
              className="form-input"
              placeholder="e.g. Alex Explorer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">
              Email Address
            </label>
            <input
              id="signup-email"
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
            <label className="form-label" htmlFor="signup-password">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
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

          <div className="form-group">
            <label className="form-label" htmlFor="signup-confirm-password">
              Confirm Password
            </label>
            <input
              id="signup-confirm-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-neoclay-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Student Account...' : 'Create My AI Toon Account'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="auth-footer">
          Already have an account?
          <Link to="/login" className="auth-link">
            Sign In
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

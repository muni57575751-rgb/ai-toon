import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

  const { signUp } = useAuth();

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
    const { error, needsAdminApproval } = await signUp(trimmedName, trimmedEmail, password);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Registration failed. Please try again.');
    } else if (needsAdminApproval) {
      setSuccessMsg(
        'Registration successful! A notification has been sent to the Administrator (muni57575751@gmail.com). You will be able to log in as soon as the admin approves your account.'
      );
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
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
            Join AI Toon! Newly created accounts are submitted to the Admin for approval.
          </p>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div
            className="auth-alert-success"
            style={{
              marginBottom: '1.5rem',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              <span>🔔</span> Approval Request Sent!
            </div>
            <div>{successMsg}</div>
            <div style={{ marginTop: '1rem' }}>
              <Link
                to="/login"
                className="btn-neoclay-primary"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  padding: '0.55rem 1.25rem',
                }}
              >
                Go to Sign In Page →
              </Link>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="auth-alert-error" style={{ marginBottom: '1.25rem' }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Registration Form (hidden when successMsg is shown) */}
        {!successMsg && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="signup-name">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                className="form-input"
                placeholder="e.g. John Doe"
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
                placeholder="e.g. student@example.com"
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
              {isSubmitting ? 'Submitting Registration...' : 'Create Account & Request Approval'}
            </button>
          </form>
        )}

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

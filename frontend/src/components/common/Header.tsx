import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  const closeMenu = () => setMobileMenuOpen(false);

  const displayName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const isAdmin = profile?.role === 'admin' || user?.user_metadata?.role === 'admin';

  return (
    <header className="app-header">
      <div className="container" style={{ padding: 0 }}>
        <div className="app-header-bar">
          {/* Prominently Highlighted Brand & Logo (Clickable back to Home) */}
          <Link
            to="/"
            onClick={closeMenu}
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                minWidth: '46px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #ec4899 100%)',
                border: '2px solid rgba(255, 255, 255, 0.95)',
                boxShadow: '0 6px 18px rgba(14, 165, 233, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                transform: 'rotate(-4deg)',
                transition: 'transform var(--transition-smooth)',
                flexShrink: 0,
              }}
            >
              🎨
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: 'var(--liquid-navy-dark)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  AI
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 60%, #4f46e5 100%)',
                    color: '#ffffff',
                    padding: '0.12rem 0.65rem',
                    borderRadius: '12px',
                    boxShadow: '0 3px 12px rgba(14, 165, 233, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                    border: '1.5px solid rgba(255, 255, 255, 0.6)',
                    letterSpacing: '0.04em',
                  }}
                >
                  TOON
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--liquid-navy-muted)',
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  marginTop: '0.05rem',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                Story-Based Visual Learning
              </div>
            </div>
          </Link>

          {/* Desktop Navigation (>= 768px) */}
          <nav className="desktop-nav-menu" aria-label="Main Navigation">
            {user ? (
              <>
                <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                  <span
                    className={isAdmin ? 'liquid-badge badge-lavender' : 'liquid-badge badge-blue'}
                    style={{ cursor: 'pointer', fontWeight: 700 }}
                  >
                    <span>{isAdmin ? '🛡️ Admin:' : '🧑‍🎓'}</span> {displayName}
                  </span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="btn-liquid-secondary"
                    style={{
                      textDecoration: 'none',
                      padding: '0.5rem 1.15rem',
                      fontSize: '0.88rem',
                      borderColor: '#a855f7',
                      color: '#6b21a8',
                      background: 'rgba(243, 232, 255, 0.7)',
                      fontWeight: 800,
                    }}
                  >
                    🛡️ Admin Panel
                  </Link>
                )}
                <Link
                  to="/search"
                  className="btn-liquid-secondary"
                  style={{ textDecoration: 'none', padding: '0.5rem 1.05rem', fontSize: '0.88rem' }}
                >
                  🔍 Search
                </Link>
                <Link
                  to="/generate"
                  className="btn-liquid-primary"
                  style={{ textDecoration: 'none', padding: '0.5rem 1.15rem', fontSize: '0.88rem' }}
                >
                  ✨ Generator
                </Link>
                <Link
                  to="/dashboard"
                  className="btn-liquid-secondary"
                  style={{ textDecoration: 'none', padding: '0.5rem 1.1rem', fontSize: '0.88rem' }}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-liquid-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.88rem', color: '#be123c' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-liquid-secondary"
                  style={{ textDecoration: 'none', padding: '0.52rem 1.25rem', fontSize: '0.9rem' }}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn-liquid-primary"
                  style={{ textDecoration: 'none', padding: '0.52rem 1.35rem', fontSize: '0.9rem' }}
                >
                  🚀 Sign Up Free
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Hamburger Button (< 768px) */}
          <button
            type="button"
            className="mobile-nav-toggle-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Slide-Down Drawer (< 768px) */}
        {mobileMenuOpen && (
          <nav className="mobile-nav-drawer" aria-label="Mobile Navigation">
            {user ? (
              <>
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    marginBottom: '0.25rem',
                    borderBottom: '1px solid rgba(221, 242, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    className={isAdmin ? 'liquid-badge badge-lavender' : 'liquid-badge badge-blue'}
                    style={{ fontWeight: 700 }}
                  >
                    <span>{isAdmin ? '🛡️ Admin:' : '🧑‍🎓'}</span> {displayName}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>
                    Active
                  </span>
                </div>

                <Link to="/generate" onClick={closeMenu} className="mobile-nav-item primary">
                  <span>✨</span> Visual Lesson Generator
                </Link>

                <Link to="/dashboard" onClick={closeMenu} className="mobile-nav-item">
                  <span>🎒</span> Student Dashboard
                </Link>

                <Link to="/search" onClick={closeMenu} className="mobile-nav-item">
                  <span>🔍</span> Live Educational Search
                </Link>

                {isAdmin && (
                  <Link to="/admin" onClick={closeMenu} className="mobile-nav-item admin">
                    <span>🛡️</span> SaaS Admin Console
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mobile-nav-item danger"
                  style={{ cursor: 'pointer', textAlign: 'left', border: 'none', font: 'inherit' }}
                >
                  <span>🚪</span> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/signup" onClick={closeMenu} className="mobile-nav-item primary">
                  <span>🚀</span> Sign Up Free
                </Link>
                <Link to="/login" onClick={closeMenu} className="mobile-nav-item">
                  <span>🔐</span> Sign In
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

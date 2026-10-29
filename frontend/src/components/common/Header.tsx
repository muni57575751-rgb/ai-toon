import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const isAdmin = profile?.role === 'admin' || user?.user_metadata?.role === 'admin';

  return (
    <header
      style={{
        position: 'sticky',
        top: '1rem',
        zIndex: 50,
        margin: '0 1rem',
      }}
    >
      <div
        className="container"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(221, 242, 255, 0.45) 45%, rgba(234, 228, 255, 0.45) 80%, rgba(255, 228, 239, 0.5) 100%)',
          backdropFilter: 'blur(20px) saturate(170%)',
          WebkitBackdropFilter: 'blur(20px) saturate(170%)',
          borderRadius: 'var(--radius-xl)',
          border: '1.5px solid rgba(255, 255, 255, 0.9)',
          boxShadow: 'var(--shadow-liquid-glass)',
          padding: '0.85rem 1.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Prominently Highlighted Brand & Logo (Clickable back to Home) */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #ec4899 100%)',
              border: '2px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 22px rgba(14, 165, 233, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.85rem',
              transform: 'rotate(-4deg)',
              transition: 'transform var(--transition-smooth)',
            }}
          >
            🎨
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.7rem',
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
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 60%, #4f46e5 100%)',
                  color: '#ffffff',
                  padding: '0.15rem 0.75rem',
                  borderRadius: '14px',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                  border: '1.5px solid rgba(255, 255, 255, 0.6)',
                  letterSpacing: '0.04em',
                }}
              >
                TOON
              </span>
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--liquid-navy-muted)',
                fontWeight: 700,
                letterSpacing: '0.01em',
                marginTop: '0.08rem',
              }}
            >
              Story-Based Visual Learning
            </div>
          </div>
        </Link>

        {/* Dynamic Auth Actions / Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
        </div>
      </div>
    </header>
  );
};

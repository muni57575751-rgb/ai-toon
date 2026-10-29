import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const AdminRoute: React.FC = () => {
  const { user, profile, loading, loginDemoAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '4px solid var(--sky-200)',
            borderTopColor: 'var(--sky-500)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--navy-700)',
            fontWeight: 600,
          }}
        >
          Verifying administrator permissions...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 1. Logged-out users are redirected to /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Logged-in normal users are strictly blocked from admin-only pages
  const isAdmin = profile?.role === 'admin' || user.user_metadata?.role === 'admin';

  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        <div
          className="liquid-glass-card"
          style={{
            maxWidth: '560px',
            width: '100%',
            padding: '3rem 2.5rem',
            textAlign: 'center',
            borderRadius: 'var(--radius-xl)',
            background:
              'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 226, 226, 0.5) 50%, rgba(255, 241, 242, 0.8) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.35)',
            boxShadow: '0 20px 40px rgba(239, 68, 68, 0.15)',
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #f87171 0%, #ef4444 60%, #b91c1c 100%)',
              color: '#ffffff',
              fontSize: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 10px 25px rgba(239, 68, 68, 0.35)',
            }}
          >
            🚫
          </div>

          <span
            className="liquid-badge"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#b91c1c',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              marginBottom: '1rem',
              fontWeight: 800,
            }}
          >
            403 FORBIDDEN • ADMIN ACCESS ONLY
          </span>

          <h2
            style={{
              fontSize: '1.75rem',
              color: '#7f1d1d',
              margin: '0.75rem 0 0.5rem',
              fontFamily: 'var(--font-heading)',
            }}
          >
            Access Denied
          </h2>

          <p
            style={{
              color: 'var(--liquid-navy-muted)',
              fontSize: '0.98rem',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            This section is restricted strictly to verified <strong>Administrators</strong>.
            Your current account (<span style={{ color: '#0369a1', fontWeight: 700 }}>{user.email}</span>) is registered with the role{' '}
            <span
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 700,
              }}
            >
              {profile?.role || 'user'}
            </span>
            .
          </p>

          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'rgba(255, 255, 255, 0.85)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '0.86rem',
              color: 'var(--navy-700)',
              marginBottom: '2rem',
              textAlign: 'left',
            }}
          >
            <strong>🛡️ Admin Limit & Security Rule:</strong>
            <p style={{ margin: '0.35rem 0 0', lineHeight: 1.5 }}>
              Platform policies limit administrative access to at most <strong>5 members</strong>.
              If you require administrative privileges, an existing administrator must verify and
              promote your account from the Admin Console.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.85rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/dashboard"
              className="btn-liquid-primary"
              style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}
            >
              ← Back to Student Dashboard
            </Link>

            <button
              onClick={() => loginDemoAdmin()}
              className="btn-liquid-secondary"
              style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }}
              title="Sign in with Master Admin Muni credentials"
            >
              🔑 Sign In as Admin (Muni)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated administrators proceed to the admin page
  return <Outlet />;
};


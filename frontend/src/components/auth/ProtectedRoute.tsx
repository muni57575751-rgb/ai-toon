import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, MASTER_ADMIN_EMAIL } from '../../context/AuthContext';
import { isAccountApproved } from '@ai-toon/shared';

export const ProtectedRoute: React.FC = () => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(false);

  // Auto-poll approval status every 4 seconds while awaiting review
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.verificationStatus === 'pending') {
      const interval = setInterval(() => {
        refreshProfile();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [user, profile?.verificationStatus, refreshProfile]);

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '4px solid var(--sky-200)',
          borderTopColor: 'var(--sky-500)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--navy-700)', fontWeight: 600 }}>
          Loading your student session...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated users to /login, remembering where they were trying to go
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admins always have immediate access
  if (profile?.role === 'admin' || user.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return <Outlet />;
  }

  // Approved users proceed to the requested route
  if (isAccountApproved(profile?.verificationStatus)) {
    return <Outlet />;
  }

  // Account Pending Approval Screen
  if (profile?.verificationStatus === 'pending') {
    const handleCheckStatus = async () => {
      setChecking(true);
      await refreshProfile();
      setChecking(false);
    };

    return (
      <div className="auth-page-container" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="auth-card" style={{ maxWidth: '540px', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'bounce 2s infinite' }}>
            ⏳
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', color: 'var(--navy-900)', marginBottom: '0.75rem' }}>
            Account Pending Approval
          </h2>
          <div style={{
            display: 'inline-block',
            padding: '0.35rem 0.85rem',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            borderRadius: '999px',
            color: '#b45309',
            fontWeight: 800,
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            Status: Under Review
          </div>
          <p style={{ color: 'var(--navy-600)', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.98rem' }}>
            Welcome to AI Toon, <strong>{profile.fullName}</strong>! Your account has been registered and is currently waiting for administrator review.
          </p>
          <div style={{
            background: 'var(--sky-50)',
            border: '1.5px solid var(--sky-200)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            textAlign: 'left',
            marginBottom: '1.75rem',
            fontSize: '0.9rem',
            color: 'var(--navy-800)',
          }}>
            <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--sky-900)' }}>
              🛡️ Approval Notice:
            </div>
            <div>
              An administrator (<strong>{MASTER_ADMIN_EMAIL}</strong>) must verify and approve your registration before you can generate stories and access interactive lessons.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="btn-neoclay-primary"
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.95rem' }}
            >
              {checking ? 'Checking...' : '🔄 Check Approval Status'}
            </button>
            <button
              onClick={() => signOut()}
              className="btn-neoclay-secondary"
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.95rem' }}
            >
              Sign Out
            </button>
          </div>
          <style>{`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Account Suspended Screen
  if (profile?.verificationStatus === 'suspended') {
    return (
      <div className="auth-page-container" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="auth-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
            🚫
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: '#991b1b', marginBottom: '0.75rem' }}>
            Account Suspended
          </h2>
          <p style={{ color: 'var(--navy-600)', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Your account has been suspended by the platform administrator. You cannot access educational stories or interactive features at this time.
          </p>
          <div style={{
            background: '#fef2f2',
            border: '1.5px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            color: '#991b1b',
          }}>
            For assistance, please contact the administrator at <strong>{MASTER_ADMIN_EMAIL}</strong>.
          </div>
          <button
            onClick={() => signOut()}
            className="btn-neoclay-secondary"
            style={{ padding: '0.65rem 1.5rem' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Account Rejected Screen
  if (profile?.verificationStatus === 'rejected') {
    return (
      <div className="auth-page-container" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="auth-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
            ❌
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: '#dc2626', marginBottom: '0.75rem' }}>
            Registration Not Approved
          </h2>
          <p style={{ color: 'var(--navy-600)', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Your registration application was reviewed and not approved by the administrator.
          </p>
          <div style={{
            background: '#fef2f2',
            border: '1.5px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            color: '#991b1b',
          }}>
            If you believe this was an error, please reach out to <strong>{MASTER_ADMIN_EMAIL}</strong>.
          </div>
          <button
            onClick={() => signOut()}
            className="btn-neoclay-secondary"
            style={{ padding: '0.65rem 1.5rem' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

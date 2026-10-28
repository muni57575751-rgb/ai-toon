import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

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

  return <Outlet />;
};

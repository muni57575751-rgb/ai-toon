import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Footer: React.FC = () => {
  const { user } = useAuth();

  return (
    <footer style={{
      margin: '4rem 1rem 1.5rem',
    }}>
      <div className="container" style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(240, 247, 254, 0.75) 100%)',
        backdropFilter: 'blur(12px)',
        borderRadius: 'var(--radius-lg)',
        border: 'var(--clay-border-card)',
        boxShadow: 'var(--neo-shadow-sm), var(--clay-volume-subtle)',
        padding: '1.75rem 2rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem',
        fontSize: '0.9rem',
        color: 'var(--navy-600)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🎓</span>
          <div>
            <strong style={{ color: 'var(--navy-900)' }}>AI Toon</strong> — Capstone: Story-Based Learning Using AI
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', fontSize: '0.88rem' }}>
          <Link to="/" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Home</Link>
          {user ? (
            <Link to="/dashboard" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Sign In</Link>
              <Link to="/signup" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Sign Up</Link>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="neoclay-badge badge-green" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
            Supabase Auth Active
          </span>
          <span className="neoclay-badge badge-sky" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
            React 19 + Vite
          </span>
          <span className="neoclay-badge badge-purple" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
            Express + TS
          </span>
        </div>
      </div>
    </footer>
  );
};

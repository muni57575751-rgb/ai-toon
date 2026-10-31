import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Footer: React.FC = () => {
  const { user } = useAuth();

  return (
    <footer
      style={{
        margin: '3rem 0.5rem 1.5rem',
      }}
    >
      <div
        className="container"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(221, 242, 255, 0.45) 40%, rgba(234, 228, 255, 0.45) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-lg)',
          border: 'var(--liquid-border-card)',
          boxShadow: 'var(--shadow-liquid-subtle)',
          padding: '1.35rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.88rem',
          color: 'var(--liquid-navy-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.35rem' }}>🎨</span>
          <div>
            <strong style={{ color: 'var(--liquid-navy-dark)' }}>AI Toon</strong> — Playful Cartoon Visual Learning for Students
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: 'var(--liquid-navy)', fontWeight: 700 }}>
            Home
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" style={{ color: 'var(--liquid-navy)', fontWeight: 700 }}>
                Dashboard
              </Link>
              <Link to="/generate" style={{ color: 'var(--liquid-navy)', fontWeight: 700 }}>
                Generator
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--liquid-navy)', fontWeight: 700 }}>
                Sign In
              </Link>
              <Link to="/signup" style={{ color: 'var(--liquid-navy)', fontWeight: 700 }}>
                Sign Up
              </Link>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="liquid-badge badge-mint" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
            Supabase Auth
          </span>
          <span className="liquid-badge badge-blue" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
            Wikimedia Commons
          </span>
          <span className="liquid-badge badge-lavender" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
            Gemini AI
          </span>
        </div>
      </div>
    </footer>
  );
};

import React from 'react';

export const Header: React.FC = () => {
  return (
    <header style={{
      position: 'sticky',
      top: '1rem',
      zIndex: 50,
      margin: '0 1rem',
    }}>
      <div className="container" style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(240, 247, 254, 0.85) 100%)',
        backdropFilter: 'blur(16px)',
        borderRadius: 'var(--radius-xl)',
        border: 'var(--clay-border-card)',
        boxShadow: 'var(--neo-shadow-md), var(--clay-volume-subtle)',
        padding: '0.85rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            border: '1.5px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '5px 7px 16px rgba(14, 165, 233, 0.35), -3px -3px 8px #ffffff, inset 2px 2px 5px rgba(255, 255, 255, 0.85), inset -2px -2px 6px rgba(3, 105, 161, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            transform: 'rotate(-4deg)',
            transition: 'transform var(--transition-smooth)'
          }}>
            📖
          </div>
          <div>
            <h1 style={{
              fontSize: '1.45rem',
              margin: 0,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, var(--navy-950) 0%, var(--sky-700) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              AI Toon
            </h1>
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--navy-600)',
              fontWeight: 700,
              letterSpacing: '0.01em'
            }}>
              Story-Based Learning Using AI
            </div>
          </div>
        </div>

        {/* Badges / Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span className="neoclay-badge badge-sky">
            <span>✨</span> Phase 1: Architecture
          </span>
          <span className="neoclay-badge badge-green">
            <span>🟢</span> v0.1.0 Ready
          </span>
        </div>
      </div>
    </header>
  );
};

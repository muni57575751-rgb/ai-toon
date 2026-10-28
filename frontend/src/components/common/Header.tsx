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
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 247, 254, 0.9) 100%)',
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
        {/* Prominently Highlighted Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            boxShadow: '0 8px 18px rgba(14, 165, 233, 0.4), inset 2.5px 2.5px 5px rgba(255, 255, 255, 0.9), inset -2.5px -2.5px 6px rgba(2, 132, 199, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            transform: 'rotate(-3deg)',
            transition: 'transform var(--transition-smooth)'
          }}>
            📖
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.65rem',
                fontWeight: 800,
                color: 'var(--navy-950)',
                letterSpacing: '-0.02em',
                textShadow: '0 1px 2px rgba(255, 255, 255, 0.9)'
              }}>
                AI
              </span>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: '#ffffff',
                padding: '0.15rem 0.65rem',
                borderRadius: '12px',
                boxShadow: '3px 5px 14px rgba(14, 165, 233, 0.38), inset 2px 2px 4px rgba(255, 255, 255, 0.8), inset -2px -2px 4px rgba(2, 132, 199, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.7)',
                textShadow: '0 1px 2px rgba(2, 44, 77, 0.35)',
                letterSpacing: '0.04em'
              }}>
                TOON
              </span>
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--navy-600)',
              fontWeight: 700,
              letterSpacing: '0.01em',
              marginTop: '0.08rem'
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

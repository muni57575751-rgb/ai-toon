import React from 'react';

export const Header: React.FC = () => {
  return (
    <header style={{
      borderBottom: '2.5px solid var(--navy-900)',
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.9rem 0'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--sky-400)',
            border: '2px solid var(--navy-900)',
            boxShadow: 'var(--shadow-cartoon-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            📖
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--navy-950)' }}>
              AI Toon
            </h1>
            <span style={{ fontSize: '0.78rem', color: 'var(--navy-600)', fontWeight: 600 }}>
              Story-Based Learning Using AI
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="cartoon-badge badge-sky">
            Phase 1: Architecture Setup
          </span>
          <span className="cartoon-badge badge-green">
            v0.1.0 Ready
          </span>
        </div>
      </div>
    </header>
  );
};

import React from 'react';

export const Footer: React.FC = () => {
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
        gap: '1rem',
        fontSize: '0.9rem',
        color: 'var(--navy-600)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🎓</span>
          <div>
            <strong style={{ color: 'var(--navy-900)' }}>AI Toon</strong> — Capstone Project: Story-Based Learning Using AI
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="neoclay-badge badge-sky" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
            React 19 + Vite
          </span>
          <span className="neoclay-badge badge-purple" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
            Express + TS
          </span>
          <span className="neoclay-badge badge-green" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
            Supabase Free Tier
          </span>
        </div>
      </div>
    </footer>
  );
};

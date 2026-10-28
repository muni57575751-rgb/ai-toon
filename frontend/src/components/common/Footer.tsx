import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      borderTop: '2.5px solid var(--navy-900)',
      background: 'var(--white)',
      padding: '2rem 0',
      marginTop: '4rem'
    }}>
      <div className="container" style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        fontSize: '0.9rem',
        color: 'var(--navy-600)'
      }}>
        <div>
          <strong style={{ color: 'var(--navy-900)' }}>AI Toon</strong> — Capstone Project: Story-Based Learning Using Artificial Intelligence
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>Frontend: React + Vite + TS</span>
          <span>•</span>
          <span>Backend: Node + Express + TS</span>
          <span>•</span>
          <span>Database & Auth: Supabase (Free Tier)</span>
        </div>
      </div>
    </footer>
  );
};

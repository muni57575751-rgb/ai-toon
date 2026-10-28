import React from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { SystemStatus } from './components/common/SystemStatus';
import './App.css';

interface FeatureItem {
  id: number;
  title: string;
  category: string;
  badge: 'green' | 'yellow' | 'purple' | 'coral' | 'sky';
  status: 'Ready (Phase 1)' | 'Planned';
}

const plannedFeatures: FeatureItem[] = [
  { id: 1, title: 'Student Authentication & Dashboard', category: 'Auth & Profile', badge: 'purple', status: 'Planned' },
  { id: 2, title: 'Recent Stories, Saved Stories & Progress', category: 'Dashboard', badge: 'sky', status: 'Planned' },
  { id: 3, title: 'Topic-Based AI Educational Story Generation', category: 'AI Engine', badge: 'green', status: 'Planned' },
  { id: 4, title: 'Multi-Language Story Selection', category: 'Localization', badge: 'yellow', status: 'Planned' },
  { id: 5, title: 'Funny, Adventure & Comic Storytelling Tones', category: 'AI Engine', badge: 'coral', status: 'Planned' },
  { id: 6, title: 'Cartoon-Style Educational Scenes & Panels', category: 'Creative UI', badge: 'sky', status: 'Planned' },
  { id: 7, title: 'Interactive Multiple-Choice Quizzes', category: 'Learning Assessment', badge: 'green', status: 'Planned' },
  { id: 8, title: 'Instant Feedback & Detailed Explanations', category: 'Learning Assessment', badge: 'yellow', status: 'Planned' },
  { id: 9, title: 'Score Calculation & Performance Summary', category: 'Analytics', badge: 'purple', status: 'Planned' },
  { id: 10, title: 'Story Library, Search, Favorites & History', category: 'Library', badge: 'sky', status: 'Planned' },
  { id: 11, title: 'Student Learning Progress Tracking', category: 'Analytics', badge: 'green', status: 'Planned' },
  { id: 12, title: 'Responsive Cartoon Desktop & Mobile Interface', category: 'UI / UX', badge: 'coral', status: 'Ready (Phase 1)' },
  { id: 13, title: 'Smart Caching & AI Free-Quota Rate Limiting', category: 'Optimization', badge: 'yellow', status: 'Planned' },
  { id: 14, title: 'Curated Fallback Stories & Offline Quizzes', category: 'Reliability', badge: 'purple', status: 'Planned' },
  { id: 15, title: 'Browser Text-to-Speech (TTS) & Offline Access', category: 'Accessibility', badge: 'green', status: 'Planned' },
  { id: 16, title: 'Secure API Key Handling & Production Deployment', category: 'DevOps & Security', badge: 'sky', status: 'Ready (Phase 1)' },
];

export const App: React.FC = () => {
  return (
    <div className="app-shell">
      <Header />

      <main className="container" style={{ padding: '2.5rem 1.75rem' }}>
        {/* Hero Section */}
        <section className="hero-banner">
          <div className="hero-content">
            {/* Prominent App Name Badge */}
            <div className="hero-app-brand-badge">
              <span className="brand-pill-text">AI TOON</span>
              <span className="brand-pill-desc">Interactive Story-Based Learning</span>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <span className="neoclay-badge badge-yellow">✨ AI Educational Engine</span>
              <span className="neoclay-badge badge-sky">🎨 Comic, Funny & Adventure</span>
              <span className="neoclay-badge badge-green">🚀 Free-Tier Capstone</span>
            </div>

            <h1 className="hero-title">
              Master Any Concept with <span className="hero-brand-name">AI Toon</span>: Fun Cartoon Stories & Quizzes!
            </h1>
            <p className="hero-description">
              <strong style={{ color: 'var(--navy-950)' }}>AI Toon</strong> transforms textbook concepts and curious questions into memorable educational cartoon stories
              with vibrant scenes, customizable storytelling styles, and instant interactive quizzes.
            </p>

            <div className="hero-tags">
              <span className="style-tag">🎭 Funny</span>
              <span className="style-tag">🗺️ Adventure</span>
              <span className="style-tag">💥 Comic</span>
              <span className="style-tag">🌍 Multilingual</span>
              <span className="style-tag">🧠 Quizzes & Badges</span>
            </div>
          </div>

          <div className="hero-illustration">
            <div className="floating-toon-card">
              <div className="totem-logo-badge">
                <span>✨</span> AI TOON
              </div>
              <span className="toon-emoji">🤖🎨</span>
              <div className="toon-caption">
                <strong>Story-Based AI Learning</strong>
                <p>Neomorphic & Claymorphic Interface</p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Backend Connection Tester */}
        <SystemStatus />

        {/* Architecture & Stack Section */}
        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.65rem', marginBottom: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span>🏗️</span> Clean Project Architecture
          </h2>

          <div className="architecture-grid">
            <div className="arch-card">
              <div className="arch-header">
                <span className="arch-icon">💻</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Frontend App</h3>
                  <span className="arch-subtitle">React + Vite + TypeScript</span>
                </div>
              </div>
              <p>Tactile Neoclay design system with smooth dual-light highlights, responsive layouts, and accessible components.</p>
              <div className="arch-path">frontend/</div>
            </div>

            <div className="arch-card">
              <div className="arch-header">
                <span className="arch-icon">⚙️</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Backend API</h3>
                  <span className="arch-subtitle">Node.js + Express + TypeScript</span>
                </div>
              </div>
              <p>Modular Express server with health checking, error middlewares, and replaceable AI provider interfaces.</p>
              <div className="arch-path">backend/</div>
            </div>

            <div className="arch-card">
              <div className="arch-header">
                <span className="arch-icon">📦</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Shared Types</h3>
                  <span className="arch-subtitle">@ai-toon/shared</span>
                </div>
              </div>
              <p>Common TypeScript contracts for stories, quizzes, user profiles, and standardized API envelopes.</p>
              <div className="arch-path">packages/shared/</div>
            </div>

            <div className="arch-card">
              <div className="arch-header">
                <span className="arch-icon">📚</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Documentation</h3>
                  <span className="arch-subtitle">Architecture & Phases</span>
                </div>
              </div>
              <p>Detailed architectural guides, step-by-step implementation phases, and environment setup instructions.</p>
              <div className="arch-path">docs/</div>
            </div>
          </div>
        </section>

        {/* 16 Planned Features Roadmap */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
            <h2 style={{ fontSize: '1.65rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span>🗺️</span> Implementation Roadmap (16 Features)
            </h2>
            <span style={{ fontSize: '0.9rem', color: 'var(--navy-600)', fontWeight: 700 }}>
              All 16 capstone features mapped out
            </span>
          </div>

          <div className="features-grid">
            {plannedFeatures.map((feat) => (
              <div key={feat.id} className="feature-item-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="feature-id">#{feat.id}</span>
                    <span className={`neoclay-badge badge-${feat.badge}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
                      {feat.category}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.02rem', marginBottom: '0.75rem', color: 'var(--navy-950)', lineHeight: 1.35 }}>
                    {feat.title}
                  </h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--navy-600)', fontWeight: 700 }}>
                  <span style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: feat.status.includes('Ready') ? 'var(--clay-mint)' : 'var(--navy-300)',
                    boxShadow: feat.status.includes('Ready') ? '0 0 8px rgba(52, 211, 153, 0.7)' : 'none'
                  }} />
                  {feat.status}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default App;

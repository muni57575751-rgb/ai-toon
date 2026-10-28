import React from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { SystemStatus } from './components/common/SystemStatus';
import './App.css';

interface FeatureItem {
  id: number;
  title: string;
  category: string;
  badge: 'green' | 'yellow' | 'purple' | 'pink' | 'sky';
  status: 'Ready (Phase 1)' | 'Planned';
}

const plannedFeatures: FeatureItem[] = [
  { id: 1, title: 'Student Authentication & Dashboard', category: 'Auth & Profile', badge: 'purple', status: 'Planned' },
  { id: 2, title: 'Recent Stories, Saved Stories & Progress', category: 'Dashboard', badge: 'sky', status: 'Planned' },
  { id: 3, title: 'Topic-Based AI Educational Story Generation', category: 'AI Engine', badge: 'green', status: 'Planned' },
  { id: 4, title: 'Multi-Language Story Selection', category: 'Localization', badge: 'yellow', status: 'Planned' },
  { id: 5, title: 'Funny, Adventure & Comic Storytelling Tones', category: 'AI Engine', badge: 'pink', status: 'Planned' },
  { id: 6, title: 'Cartoon-Style Educational Scenes & Panels', category: 'Creative UI', badge: 'sky', status: 'Planned' },
  { id: 7, title: 'Interactive Multiple-Choice Quizzes', category: 'Learning Assessment', badge: 'green', status: 'Planned' },
  { id: 8, title: 'Instant Feedback & Detailed Explanations', category: 'Learning Assessment', badge: 'yellow', status: 'Planned' },
  { id: 9, title: 'Score Calculation & Performance Summary', category: 'Analytics', badge: 'purple', status: 'Planned' },
  { id: 10, title: 'Story Library, Search, Favorites & History', category: 'Library', badge: 'sky', status: 'Planned' },
  { id: 11, title: 'Student Learning Progress Tracking', category: 'Analytics', badge: 'green', status: 'Planned' },
  { id: 12, title: 'Responsive Cartoon Desktop & Mobile Interface', category: 'UI / UX', badge: 'pink', status: 'Ready (Phase 1)' },
  { id: 13, title: 'Smart Caching & AI Free-Quota Rate Limiting', category: 'Optimization', badge: 'yellow', status: 'Planned' },
  { id: 14, title: 'Curated Fallback Stories & Offline Quizzes', category: 'Reliability', badge: 'purple', status: 'Planned' },
  { id: 15, title: 'Browser Text-to-Speech (TTS) & Offline Access', category: 'Accessibility', badge: 'green', status: 'Planned' },
  { id: 16, title: 'Secure API Key Handling & Production Deployment', category: 'DevOps & Security', badge: 'sky', status: 'Ready (Phase 1)' },
];

export const App: React.FC = () => {
  return (
    <div className="app-shell">
      <Header />

      <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
        {/* Hero Section */}
        <section className="hero-banner cartoon-card">
          <div className="hero-content">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span className="cartoon-badge badge-yellow">✨ AI Educational Platform</span>
              <span className="cartoon-badge badge-sky">🎨 Comic & Adventure Stories</span>
              <span className="cartoon-badge badge-green">🚀 Free-Tier Ready</span>
            </div>

            <h1 className="hero-title">
              Turn Complex Concepts into <span className="highlight-text">Fun Cartoon Stories</span>!
            </h1>
            <p className="hero-description">
              AI Toon transforms syllabus topics and curious questions into engaging educational stories
              with cartoon scenes, adaptable tones (Funny, Adventure, Comic), and instant interactive quizzes.
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
              <span className="toon-emoji">🤖🎨</span>
              <div className="toon-caption">
                <strong>Phase 1: Foundation Ready</strong>
                <p>Clean Monorepo & Type-Safe Architecture</p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Backend Connection Tester */}
        <SystemStatus />

        {/* Architecture & Stack Section */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏗️</span> Clean Project Architecture
          </h2>

          <div className="architecture-grid">
            <div className="cartoon-card arch-card">
              <div className="arch-header">
                <span className="arch-icon">💻</span>
                <div>
                  <h3>Frontend App</h3>
                  <span className="arch-subtitle">React + Vite + TypeScript</span>
                </div>
              </div>
              <p>Polished cartoon design system with CSS custom properties, responsive layout, and accessible components.</p>
              <div className="arch-path">frontend/</div>
            </div>

            <div className="cartoon-card arch-card">
              <div className="arch-header">
                <span className="arch-icon">⚙️</span>
                <div>
                  <h3>Backend API</h3>
                  <span className="arch-subtitle">Node.js + Express + TypeScript</span>
                </div>
              </div>
              <p>Modular Express server with health checking, error middlewares, and replaceable AI provider interfaces.</p>
              <div className="arch-path">backend/</div>
            </div>

            <div className="cartoon-card arch-card">
              <div className="arch-header">
                <span className="arch-icon">📦</span>
                <div>
                  <h3>Shared Types</h3>
                  <span className="arch-subtitle">@ai-toon/shared</span>
                </div>
              </div>
              <p>Common TypeScript contracts for stories, quizzes, user profiles, and standardized API envelopes.</p>
              <div className="arch-path">packages/shared/</div>
            </div>

            <div className="cartoon-card arch-card">
              <div className="arch-header">
                <span className="arch-icon">📚</span>
                <div>
                  <h3>Documentation</h3>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🗺️</span> Implementation Roadmap (16 Features)
            </h2>
            <span style={{ fontSize: '0.88rem', color: 'var(--navy-600)', fontWeight: 600 }}>
              All 16 capstone features mapped out
            </span>
          </div>

          <div className="features-grid">
            {plannedFeatures.map((feat) => (
              <div key={feat.id} className="feature-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="feature-id">#{feat.id}</span>
                  <span className={`cartoon-badge badge-${feat.badge}`}>
                    {feat.category}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.02rem', marginBottom: '0.5rem', color: 'var(--navy-950)' }}>
                  {feat.title}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--navy-600)' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: feat.status.includes('Ready') ? 'var(--mint-green)' : 'var(--navy-400)'
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

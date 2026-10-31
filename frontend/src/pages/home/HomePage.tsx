import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { SystemStatus } from '../../components/common/SystemStatus';
import '../../App.css';

interface FeatureItem {
  id: number;
  title: string;
  category: string;
  badge: 'green' | 'yellow' | 'purple' | 'coral' | 'sky';
  status: 'Ready' | 'Planned';
}

const plannedFeatures: FeatureItem[] = [
  { id: 1, title: 'Student Authentication & Dashboard', category: 'Auth & Profile', badge: 'green', status: 'Ready' },
  { id: 2, title: 'Recent Stories, Saved Stories & Progress', category: 'Dashboard', badge: 'green', status: 'Ready' },
  { id: 3, title: 'Topic-Aware Educational Visual Learning', category: 'AI Engine', badge: 'green', status: 'Ready' },
  { id: 4, title: 'Multi-Language Selection (EN, Telugu, Hindi)', category: 'Localization', badge: 'green', status: 'Ready' },
  { id: 5, title: 'Funny, Adventure & Comic Storytelling Tones', category: 'AI Engine', badge: 'green', status: 'Ready' },
  { id: 6, title: 'Topic-Aware Public Media for People & Places', category: 'Image Search', badge: 'green', status: 'Ready' },
  { id: 7, title: 'Interactive Multiple-Choice Quizzes', category: 'Learning Assessment', badge: 'green', status: 'Ready' },
  { id: 8, title: 'Instant Feedback & Detailed Explanations', category: 'Learning Assessment', badge: 'green', status: 'Ready' },
  { id: 9, title: 'Score Calculation & Performance Summary', category: 'Analytics', badge: 'green', status: 'Ready' },
  { id: 10, title: 'Interactive Educational UI with Pastel Gradients', category: 'Design System', badge: 'sky', status: 'Ready' },
  { id: 11, title: 'Student Learning Progress Tracking', category: 'Analytics', badge: 'green', status: 'Ready' },
  { id: 12, title: 'Responsive Cartoon Desktop & Mobile Interface', category: 'UI / UX', badge: 'coral', status: 'Ready' },
  { id: 13, title: 'Wikimedia Caching & In-flight Deduplication', category: 'Optimization', badge: 'yellow', status: 'Ready' },
  { id: 14, title: 'Curated Fallback Stories & Offline Quizzes', category: 'Reliability', badge: 'purple', status: 'Ready' },
  { id: 15, title: 'Gemini HTTP 503 Exponential Backoff with Jitter', category: 'Reliability', badge: 'green', status: 'Ready' },
  { id: 16, title: 'Secure API Key Handling & Production Deployment', category: 'DevOps & Security', badge: 'sky', status: 'Ready' },
];

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <Header />

      <main className="container page-main-container">
        {/* Hero Section */}
        <section className="hero-banner">
          <div className="hero-content">
            {/* Prominent App Name Badge */}
            <div className="hero-app-brand-badge">
              <span className="brand-pill-text">AI TOON</span>
              <span className="brand-pill-desc">Interactive Visual Learning</span>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <span className="liquid-badge badge-mint">🔐 Supabase Auth Active</span>
              <span className="liquid-badge badge-blue">🎨 Modern Visual Learning</span>
              <span className="liquid-badge badge-lavender">🖼️ Entity-Aware Public Media</span>
            </div>

            <h1 className="hero-title">
              Master Any Concept with <span className="hero-brand-name">AI Toon</span>: Fun Visual Guides & Quizzes!
            </h1>
            <p className="hero-description">
              <strong style={{ color: 'var(--liquid-navy-dark)' }}>AI Toon</strong> transforms textbook concepts, historical figures, universities, and technical topics into memorable visual learning guides with point-wise explanations, verified authentic public domain media, and interactive scoring.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.85rem' }}>
              {user ? (
                <Link to="/dashboard" className="btn-liquid-primary" style={{ textDecoration: 'none' }}>
                  🎒 Open Student Dashboard →
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="btn-liquid-primary" style={{ textDecoration: 'none' }}>
                    🚀 Get Started Free
                  </Link>
                  <Link to="/login" className="btn-liquid-secondary" style={{ textDecoration: 'none' }}>
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="hero-tags">
              <span className="style-tag">🎭 Funny</span>
              <span className="style-tag">🗺️ Adventure</span>
              <span className="style-tag">💥 Comic</span>
              <span className="style-tag">🏛️ People & Institutions</span>
              <span className="style-tag">🔬 Science & Tech Diagrams</span>
            </div>
          </div>

          <div className="hero-illustration">
            <div className="floating-toon-card">
              <div className="totem-logo-badge">
                <span>✨</span> AI TOON
              </div>
              <span className="toon-emoji">🎨🤖💡</span>
              <div className="toon-caption">
                <strong>Interactive Modern UI</strong>
                <p>Pastel Gradients & Entity Search</p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Backend Connection Tester */}
        <SystemStatus />

        {/* Architecture & Stack Section */}
        <section style={{ marginBottom: '3.5rem' }}>
          <h2
            style={{
              fontSize: '1.65rem',
              marginBottom: '1.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: 'var(--liquid-navy-dark)',
            }}
          >
            <span>🏗️</span> Clean Project Architecture
          </h2>

          <div className="architecture-grid">
            <div className="arch-card">
              <div className="arch-header">
                <span className="arch-icon">💻</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--liquid-navy-dark)' }}>Frontend App</h3>
                  <span className="arch-subtitle">React 19 + Vite + TypeScript</span>
                </div>
              </div>
              <p>Modern design system with soft pastel mesh gradients, responsive cards, and secure auth.</p>
              <div className="arch-path">frontend/</div>
            </div>

            <div className="arch-card">
              <div className="arch-header">
                <span className="arch-icon">🔐</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--liquid-navy-dark)' }}>Authentication & DB</h3>
                  <span className="arch-subtitle">Supabase (Free Tier)</span>
                </div>
              </div>
              <p>User registration, session persistence, and row-level security (RLS) integration.</p>
              <div className="arch-path">Supabase Cloud</div>
            </div>

            <div className="arch-card">
              <div className="arch-header">
                <span className="arch-icon">⚙️</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--liquid-navy-dark)' }}>Backend API</h3>
                  <span className="arch-subtitle">Node.js + Express + TypeScript</span>
                </div>
              </div>
              <p>Entity-aware image classification, Wikimedia Commons API integration, and Gemini AI retry engine.</p>
              <div className="arch-path">backend/</div>
            </div>

            <div className="arch-card">
              <div className="arch-header">
                <span className="arch-icon">📦</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--liquid-navy-dark)' }}>Shared Types</h3>
                  <span className="arch-subtitle">@ai-toon/shared</span>
                </div>
              </div>
              <p>Common TypeScript contracts for point-wise stories, illustrations, quizzes, and standardized envelopes.</p>
              <div className="arch-path">packages/shared/</div>
            </div>
          </div>
        </section>

        {/* 16 Planned Features Roadmap */}
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              marginBottom: '1.4rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: 'var(--liquid-navy-dark)',
              }}
            >
              <span>🗺️</span> Completed Features & Roadmap
            </h2>
            <span style={{ fontSize: '0.9rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
              All capstone milestones integrated
            </span>
          </div>

          <div className="features-grid">
            {plannedFeatures.map((feat) => (
              <div key={feat.id} className="feature-item-card">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span className="feature-id">#{feat.id}</span>
                    <span
                      className={`liquid-badge badge-${feat.badge}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                    >
                      {feat.category}
                    </span>
                  </div>
                  <h4
                    style={{
                      fontSize: '1.02rem',
                      marginBottom: '0.75rem',
                      color: 'var(--liquid-navy-dark)',
                      lineHeight: 1.35,
                    }}
                  >
                    {feat.title}
                  </h4>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.8rem',
                    color: 'var(--liquid-navy-muted)',
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: feat.status === 'Ready' ? '#10b981' : 'var(--navy-300)',
                      boxShadow: feat.status === 'Ready' ? '0 0 8px rgba(16, 185, 129, 0.7)' : 'none',
                    }}
                  />
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

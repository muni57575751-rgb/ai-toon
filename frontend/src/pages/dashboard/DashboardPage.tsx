import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { SystemStatus } from '../../components/common/SystemStatus';

export const DashboardPage: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Curious Student';
  const displayEmail = user?.email || profile?.email || 'student@example.com';

  return (
    <div className="app-shell">
      <Header />

      <main className="container" style={{ padding: '2.5rem 1.75rem' }}>
        {/* Student Welcome Banner */}
        <section className="neoclay-card" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(224, 242, 254, 0.95) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2.5rem',
          padding: '2.5rem 2.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
              border: '2px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 10px 24px rgba(14, 165, 233, 0.35), inset 2px 2px 5px rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              transform: 'rotate(-4deg)',
            }}>
              🧑‍🎓
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.95rem', margin: 0, color: 'var(--navy-950)' }}>
                  Hello, {displayName}!
                </h1>
                <span className="neoclay-badge badge-green" style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem' }}>
                  Authenticated Student
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--navy-600)', fontSize: '0.92rem', fontWeight: 600 }}>
                Logged in as: <span style={{ color: 'var(--sky-700)', fontWeight: 700 }}>{displayEmail}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <Link to="/generate" className="btn-neoclay-primary" style={{ textDecoration: 'none', padding: '0.65rem 1.35rem' }}>
              ✨ Open Story Generator
            </Link>
            <button
              onClick={handleLogout}
              className="btn-neoclay-secondary"
              style={{ color: 'var(--clay-coral-dark)', fontWeight: 700 }}
            >
              🚪 Sign Out
            </button>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.45rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📊</span> Your Learning Overview
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}>
            <div className="neoclay-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>📚</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                3
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--navy-600)', fontWeight: 700 }}>
                Stories Available
              </span>
            </div>

            <div className="neoclay-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>🎯</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                Phase 4
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--navy-600)', fontWeight: 700 }}>
                Interactive Quizzes
              </span>
            </div>

            <div className="neoclay-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>⭐</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                100%
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--navy-600)', fontWeight: 700 }}>
                Offline Ready
              </span>
            </div>

            <div className="neoclay-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>🔥</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                1 Day
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--navy-600)', fontWeight: 700 }}>
                Learning Streak
              </span>
            </div>
          </div>
        </section>

        {/* Phase 3 AI Story Generator Feature Banner */}
        <section className="neoclay-card" style={{ marginBottom: '2.5rem', padding: '2.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)',
                boxShadow: 'var(--clay-volume-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
              }}>
                🎨
              </div>
              <div>
                <h3 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--navy-950)' }}>
                  AI Story Generation Engine
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--navy-600)', fontWeight: 600 }}>
                  Active in Phase 3 • Powered by Replaceable Free-Tier AI & Built-in Catalog
                </span>
              </div>
            </div>
            <span className="neoclay-badge badge-green">
              ✨ Phase 3 Live
            </span>
          </div>

          <div className="neoclay-recessed" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <span style={{ fontSize: '2.8rem', display: 'block', marginBottom: '0.65rem' }}>🧙‍♂️📖✨</span>
            <h4 style={{ fontSize: '1.25rem', color: 'var(--navy-950)', marginBottom: '0.45rem' }}>
              Turn Any Syllabus Topic into a Visual Point-Wise Guide!
            </h4>
            <p style={{ maxWidth: '580px', margin: '0 auto 1.5rem', color: 'var(--navy-600)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Select any academic concept. Get an engaging point-by-point breakdown with 2–3 cartoon illustrations, key takeaways, and an interactive quiz in English, Telugu, or Hindi.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <Link to="/generate" className="btn-neoclay-primary" style={{ textDecoration: 'none', padding: '0.85rem 1.85rem' }}>
                🚀 Launch AI Story Generator
              </Link>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="style-tag">🎭 Funny Style</span>
              <span className="style-tag">🗺️ Adventure Style</span>
              <span className="style-tag">💥 Comic Style</span>
              <span className="style-tag">🌍 English • తెలుగు • हिंदी</span>
            </div>
          </div>
        </section>

        {/* Live Backend Connection */}
        <SystemStatus />
      </main>

      <Footer />
    </div>
  );
};

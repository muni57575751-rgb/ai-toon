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
        {/* Student Welcome Banner with Liquid Glass and Mascot */}
        <section
          className="liquid-glass-card"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(221, 242, 255, 0.55) 45%, rgba(255, 228, 239, 0.5) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            padding: '2.5rem 2.25rem',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, #ddf2ff 0%, #ffe4ef 50%, #eae4ff 100%)',
                border: '2px solid rgba(255, 255, 255, 0.95)',
                boxShadow: '0 10px 24px rgba(14, 165, 233, 0.25), inset 0 2px 3px rgba(255, 255, 255, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                transform: 'rotate(-4deg)',
              }}
            >
              🧑‍🎓
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '2rem', margin: 0, color: 'var(--liquid-navy-dark)' }}>
                  Welcome back, {displayName}!
                </h1>
                <span className="liquid-badge badge-mint" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
                  ✓ Active Student
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--liquid-navy-muted)', fontSize: '0.94rem', fontWeight: 600 }}>
                Logged in as: <span style={{ color: 'var(--accent-cyan-hover)', fontWeight: 700 }}>{displayEmail}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <Link
              to="/generate"
              className="btn-liquid-primary"
              style={{ textDecoration: 'none', padding: '0.75rem 1.65rem' }}
            >
              ✨ Open Lesson Generator
            </Link>
            <button
              onClick={handleLogout}
              className="btn-liquid-secondary"
              style={{ color: '#be123c', fontWeight: 700, padding: '0.7rem 1.35rem' }}
            >
              🚪 Sign Out
            </button>
          </div>
        </section>

        {/* Learning Overview Grid with Liquid Glass Pastel Tiles */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: 'var(--liquid-navy-dark)',
            }}
          >
            <span>📊</span> Your Visual Learning Dashboard
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <div
              className="liquid-glass-card"
              style={{
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(221, 242, 255, 0.6) 100%)',
                padding: '1.6rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.35rem' }}>📚</span>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--liquid-navy-dark)',
                }}
              >
                100+
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
                Topics Supported
              </span>
            </div>

            <div
              className="liquid-glass-card"
              style={{
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 228, 239, 0.6) 100%)',
                padding: '1.6rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.35rem' }}>🖼️</span>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#9d174d',
                }}
              >
                Topic-Aware
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
                Public Educational Media
              </span>
            </div>

            <div
              className="liquid-glass-card"
              style={{
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(234, 228, 255, 0.6) 100%)',
                padding: '1.6rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.35rem' }}>🎯</span>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#5b21b6',
                }}
              >
                3-Question
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
                Interactive Quizzes
              </span>
            </div>

            <div
              className="liquid-glass-card"
              style={{
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 240, 223, 0.7) 100%)',
                padding: '1.6rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.35rem' }}>🌍</span>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#92400e',
                }}
              >
                3 Languages
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
                EN • Telugu • Hindi
              </span>
            </div>
          </div>
        </section>

        {/* Story Generator Feature Card */}
        <section
          className="liquid-glass-card"
          style={{
            marginBottom: '2.5rem',
            padding: '2.5rem',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(234, 228, 255, 0.45) 50%, rgba(221, 242, 255, 0.5) 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #ec4899 100%)',
                  boxShadow: '0 8px 18px rgba(14, 165, 233, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                }}
              >
                ✨
              </div>
              <div>
                <h3 style={{ fontSize: '1.45rem', margin: 0, color: 'var(--liquid-navy-dark)' }}>
                  Entity-Aware AI Visual Learning
                </h3>
                <span style={{ fontSize: '0.88rem', color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>
                  Point-wise explanations, 2–3 authentic photos or diagrams, and interactive scoring
                </span>
              </div>
            </div>
            <span className="liquid-badge badge-lavender" style={{ fontSize: '0.82rem' }}>
              🎨 Liquid Glass Identity
            </span>
          </div>

          <div className="liquid-glass-inset" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>📖🔍💡</span>
            <h4 style={{ fontSize: '1.35rem', color: 'var(--liquid-navy-dark)', marginBottom: '0.5rem' }}>
              Search Any Person, University, Place, or Science Topic
            </h4>
            <p
              style={{
                maxWidth: '620px',
                margin: '0 auto 1.75rem',
                color: 'var(--liquid-navy-muted)',
                fontSize: '0.96rem',
                lineHeight: 1.65,
                fontWeight: 600,
              }}
            >
              Enter any topic—from <strong>Narendra Modi</strong> and <strong>Vignan University</strong> to <strong>Photosynthesis</strong> and <strong>Binary Search</strong>. Get a point-by-point guide with verified public domain media and quiz questions.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '1.5rem',
              }}
            >
              <Link
                to="/generate"
                className="btn-liquid-primary"
                style={{ textDecoration: 'none', padding: '0.95rem 2.25rem', fontSize: '1.05rem' }}
              >
                🚀 Launch Learning Generator
              </Link>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="style-tag">🎭 Funny</span>
              <span className="style-tag">🗺️ Adventure</span>
              <span className="style-tag">💥 Comic</span>
              <span className="style-tag">🏛️ People & Institutions</span>
              <span className="style-tag">🔬 Science & Tech Diagrams</span>
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

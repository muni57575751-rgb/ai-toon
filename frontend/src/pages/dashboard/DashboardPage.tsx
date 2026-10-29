import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { SystemStatus } from '../../components/common/SystemStatus';
import { API_BASE_URL } from '../../config/api';
import type { Story, QuizAttemptRecord } from '@ai-toon/shared';

interface UserProgressData {
  storiesCompleted: number;
  quizzesCompleted: number;
  averageScorePercentage: number;
  recentAttempts: QuizAttemptRecord[];
}

export const DashboardPage: React.FC = () => {
  const { user, profile, signOut, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Stories & Progress State
  const [savedStories, setSavedStories] = useState<Story[]>([]);
  const [progress, setProgress] = useState<UserProgressData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Profile Management State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.fullName || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const headers = {
          'x-user-id': user.id,
          'x-user-email': user.email || '',
        };

        const [storiesRes, progressRes] = await Promise.all([
          fetch(`${API_BASE_URL}/stories/my-stories`, { headers }),
          fetch(`${API_BASE_URL}/stories/my-progress`, { headers }),
        ]);

        if (storiesRes.ok) {
          const sJson = await storiesRes.json();
          if (sJson.data) setSavedStories(sJson.data);
        }

        if (progressRes.ok) {
          const pJson = await progressRes.json();
          if (pJson.data) setProgress(pJson.data);
        }
      } catch (err) {
        console.warn('Dashboard data fetch error:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 2) {
      setProfileMsg({ type: 'error', text: 'Full name must be at least 2 characters.' });
      return;
    }

    setProfileLoading(true);
    setProfileMsg(null);
    const res = await updateProfile(trimmed);
    setProfileLoading(false);

    if (res.success) {
      setProfileMsg({ type: 'success', text: 'Profile name updated successfully!' });
      setIsEditingName(false);
    } else {
      setProfileMsg({ type: 'error', text: res.error || 'Failed to update profile.' });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    const res = await deleteAccount();
    setDeleteLoading(false);
    if (!res.success) {
      setProfileMsg({ type: 'error', text: res.error || 'Failed to delete account.' });
    }
  };

  const displayName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Curious Student';
  const displayEmail = user?.email || profile?.email || 'student@example.com';
  const isAdmin = profile?.role === 'admin' || user?.user_metadata?.role === 'admin';

  return (
    <div className="app-shell">
      <Header />

      <main className="container" style={{ padding: '2.5rem 1.75rem' }}>
        {/* Student Welcome Banner with Mascot */}
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
              {isAdmin ? '🛡️' : '🧑‍🎓'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '2rem', margin: 0, color: 'var(--liquid-navy-dark)' }}>
                  Welcome back, {displayName}!
                </h1>
                <span
                  className={isAdmin ? 'liquid-badge badge-lavender' : 'liquid-badge badge-mint'}
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                >
                  {isAdmin ? '🛡️ Administrator' : '✓ Active Student'}
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--liquid-navy-muted)', fontSize: '0.94rem', fontWeight: 600 }}>
                Logged in as: <span style={{ color: 'var(--accent-cyan-hover)', fontWeight: 700 }}>{displayEmail}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            {isAdmin && (
              <Link
                to="/admin"
                className="btn-liquid-secondary"
                style={{
                  textDecoration: 'none',
                  padding: '0.75rem 1.45rem',
                  borderColor: '#a855f7',
                  color: '#6b21a8',
                  background: 'rgba(243, 232, 255, 0.75)',
                  fontWeight: 800,
                }}
              >
                🛡️ Admin Console
              </Link>
            )}
            <Link
              to="/search"
              className="btn-liquid-secondary"
              style={{ textDecoration: 'none', padding: '0.75rem 1.4rem' }}
            >
              🔍 Web Search
            </Link>
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

        {/* Administrator Fast-Access Callout */}
        {isAdmin && (
          <section
            className="liquid-glass-card"
            style={{
              background: 'linear-gradient(135deg, rgba(243, 232, 255, 0.9) 0%, rgba(224, 242, 254, 0.8) 100%)',
              border: '2px solid rgba(168, 85, 247, 0.35)',
              padding: '1.35rem 1.75rem',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <span style={{ fontSize: '2rem' }}>🛡️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#581c87' }}>
                  Administrator Privileges Active
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: '#6b21a8' }}>
                  Access the Admin Console to view real-time member sessions (logged in / logged out), verify accounts, and manage member roles within the 5-admin cap.
                </p>
              </div>
            </div>
            <Link
              to="/admin"
              className="btn-liquid-primary"
              style={{
                textDecoration: 'none',
                fontSize: '0.88rem',
                padding: '0.65rem 1.45rem',
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              }}
            >
              Launch Admin Console →
            </Link>
          </section>
        )}

        {/* Learning Statistics & Progress Overview */}
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
            <span>📊</span> Your Learning & Quiz Performance
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
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.35rem' }}>📖</span>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--liquid-navy-dark)',
                }}
              >
                {progress?.storiesCompleted ?? savedStories.length}
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
                Visual Stories Explored
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
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.35rem' }}>📝</span>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#9d174d',
                }}
              >
                {progress?.quizzesCompleted ?? 0}
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
                Quizzes Attempted
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
                {progress?.averageScorePercentage ?? 0}%
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
                Average Quiz Accuracy
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
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.35rem' }}>🌐</span>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#92400e',
                }}
              >
                Verified
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
                Live Web Search Sources
              </span>
            </div>
          </div>
        </section>

        {/* Saved Stories & Lessons Section */}
        <section
          className="liquid-glass-card"
          style={{
            marginBottom: '2.5rem',
            padding: '2.25rem',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(221, 242, 255, 0.45) 50%, rgba(234, 228, 255, 0.45) 100%)',
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
            <div>
              <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.35rem 0', color: 'var(--liquid-navy-dark)' }}>
                📚 Your Saved Stories & Learning History
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--liquid-navy-muted)' }}>
                Review topics you've generated and continue your lessons.
              </p>
            </div>
            <Link to="/generate" className="btn-neoclay-primary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}>
              + Create New Lesson
            </Link>
          </div>

          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--navy-500)' }}>
              Loading your learning history...
            </div>
          ) : savedStories.length === 0 ? (
            <div
              className="liquid-glass-inset"
              style={{
                textAlign: 'center',
                padding: '2.5rem 1.5rem',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(255, 255, 255, 0.75)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌱</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--navy-800)', marginBottom: '0.35rem' }}>
                No visual lessons yet
              </div>
              <p style={{ color: 'var(--navy-600)', fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto 1.25rem auto' }}>
                Try creating your first lesson on <strong>Photosynthesis</strong>, <strong>Binary Search</strong>, or <strong>Narendra Modi</strong>.
              </p>
              <Link to="/generate" className="btn-neoclay-primary" style={{ display: 'inline-block', padding: '0.6rem 1.4rem' }}>
                Generate First Lesson
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {savedStories.map((story, sIdx) => (
                <div
                  key={`${story.id}-${sIdx}`}
                  style={{
                    background: '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    border: '1.5px solid var(--sky-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="liquid-badge badge-blue" style={{ fontSize: '0.75rem' }}>
                        {story.topic}
                      </span>
                      {story.difficulty && (
                        <span className="liquid-badge badge-lavender" style={{ fontSize: '0.75rem' }}>
                          {story.difficulty}
                        </span>
                      )}
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--navy-900)', fontSize: '1.05rem', lineHeight: 1.35 }}>
                      {story.title}
                    </h4>
                    <p style={{ margin: 0, color: 'var(--navy-600)', fontSize: '0.85rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {story.introduction || story.summary}
                    </p>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <Link
                      to={`/generate?topic=${encodeURIComponent(story.topic)}`}
                      className="btn-neoclay-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                    >
                      Revisit Topic →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Student Profile & Privacy Management */}
        <section
          className="liquid-glass-card"
          style={{
            marginBottom: '2.5rem',
            padding: '2.25rem',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 232, 255, 0.4) 100%)',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.35rem 0', color: 'var(--liquid-navy-dark)' }}>
              ⚙️ Account & Privacy Settings
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--liquid-navy-muted)' }}>
              Manage your personal student profile and account settings. Role changes are strictly managed by Administrators.
            </p>
          </div>

          {profileMsg && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: profileMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                border: `1.5px solid ${profileMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                color: profileMsg.type === 'success' ? '#065f46' : '#991b1b',
                fontSize: '0.88rem',
              }}
            >
              {profileMsg.type === 'success' ? '✓ ' : '⚠️ '} {profileMsg.text}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--sky-100)',
            }}
          >
            {/* Profile Info */}
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-500)', textTransform: 'uppercase' }}>
                  Full Name
                </label>
                {isEditingName ? (
                  <form onSubmit={handleUpdateName} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--sky-300)',
                        fontSize: '0.92rem',
                        flex: 1,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="btn-neoclay-primary"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    >
                      {profileLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="btn-neoclay-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                      {profile?.fullName || displayName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewName(profile?.fullName || displayName);
                        setIsEditingName(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--sky-600)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Edit Name
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-500)', textTransform: 'uppercase' }}>
                  Registered Email Address
                </label>
                <div style={{ fontSize: '0.95rem', color: 'var(--navy-800)', marginTop: '0.2rem', fontWeight: 600 }}>
                  {displayEmail}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-500)', textTransform: 'uppercase' }}>
                  Account Verification Status
                </label>
                <div style={{ marginTop: '0.25rem' }}>
                  <span className="liquid-badge badge-mint" style={{ fontSize: '0.8rem' }}>
                    ✓ Approved & Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Account Deletion / Data Privacy */}
            <div style={{ borderLeft: '1px solid var(--sky-100)', paddingLeft: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '1rem' }}>
                Danger Zone
              </h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--navy-600)', lineHeight: 1.5 }}>
                You can delete your account at any time. All your learning history, quiz scores, and saved sessions will be permanently removed.
              </p>

              {showDeleteConfirm ? (
                <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1.5px solid #fecaca' }}>
                  <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                    Are you sure you want to permanently delete your account?
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {deleteLoading ? 'Deleting...' : 'Yes, Permanently Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-neoclay-secondary"
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    background: 'none',
                    border: '1.5px solid #fca5a5',
                    color: '#dc2626',
                    padding: '0.45rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Request Account Deletion
                </button>
              )}
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

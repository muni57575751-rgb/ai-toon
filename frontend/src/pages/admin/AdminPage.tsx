import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { API_BASE_URL } from '../../config/api';
import type {
  MemberRecord,
  AdminStats,
  UserRole,
  MemberVerificationStatus,
} from '@ai-toon/shared';

export const AdminPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalMembers: 0,
    loggedInCount: 0,
    loggedOutCount: 0,
    adminCount: 0,
    maxAdmins: 5,
    userCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'all' | 'logged_in' | 'logged_out' | 'admins' | 'pending'
  >('all');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Fetch members and stats from backend
  const fetchMembers = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/members`, {
        headers: {
          'x-user-id': user.id,
          'x-user-email': user.email || '',
          'x-user-role': profile?.role || 'admin',
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message || `Failed to fetch members (${res.status})`);
      }

      const body = await res.json();
      if (body.success && body.data) {
        setMembers(body.data.members || []);
        if (body.data.stats) {
          setStats(body.data.stats);
        }
      }
    } catch (err) {
      console.error('[AdminPage] fetch error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load member data.');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMembers();
    }, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMembers]);

  // Handle Verify & Set Role
  const handleVerify = async (
    targetId: string,
    status: MemberVerificationStatus,
    targetRole?: UserRole
  ) => {
    if (!user) return;
    setActionLoadingId(targetId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/members/${targetId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
          'x-user-role': profile?.role || 'admin',
        },
        body: JSON.stringify({
          verificationStatus: status,
          role: targetRole,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Verification update failed.');
      }

      setSuccessMsg(
        `Account status updated to "${status}"${targetRole ? ` with role "${targetRole}"` : ''} successfully.`
      );
      await fetchMembers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Change Role (User <-> Admin)
  const handleChangeRole = async (targetId: string, newRole: UserRole) => {
    if (!user) return;
    setActionLoadingId(targetId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/members/${targetId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
          'x-user-role': profile?.role || 'admin',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Role change failed.');
      }

      setSuccessMsg(`Member successfully updated to role "${newRole}".`);
      await fetchMembers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Role change failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Tab filter
    if (activeTab === 'logged_in') return m.sessionStatus === 'logged_in';
    if (activeTab === 'logged_out') return m.sessionStatus === 'logged_out';
    if (activeTab === 'admins') return m.role === 'admin';
    if (activeTab === 'pending') return m.verificationStatus === 'pending';
    return true;
  });

  const adminSlotsRemaining = Math.max(0, stats.maxAdmins - stats.adminCount);
  const isMaxAdminsReached = stats.adminCount >= stats.maxAdmins;

  return (
    <div className="app-shell">
      <Header />

      <main className="container" style={{ padding: '2.5rem 1.75rem' }}>
        {/* Admin Navigation Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Link
              to="/dashboard"
              style={{
                textDecoration: 'none',
                color: 'var(--liquid-navy-muted)',
                fontSize: '0.92rem',
                fontWeight: 600,
              }}
            >
              ← Student Dashboard
            </Link>
            <span style={{ color: 'var(--sky-300)' }}>/</span>
            <span style={{ color: 'var(--liquid-navy-dark)', fontWeight: 800, fontSize: '0.92rem' }}>
              🛡️ Admin Console
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="btn-liquid-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '0.45rem 0.95rem',
                borderColor: autoRefresh ? '#10b981' : undefined,
                color: autoRefresh ? '#047857' : undefined,
                fontWeight: 700,
              }}
            >
              {autoRefresh ? '🟢 Auto-Sync ON (6s)' : '⚪ Auto-Sync OFF'}
            </button>
            <button
              onClick={() => fetchMembers()}
              className="btn-liquid-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1.15rem' }}
              disabled={loading}
            >
              🔄 Refresh Now
            </button>
          </div>
        </div>

        {/* Hero Admin Banner */}
        <section
          className="liquid-glass-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(224, 242, 254, 0.6) 50%, rgba(243, 232, 255, 0.65) 100%)',
            padding: '2.25rem 2rem',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '2rem',
            border: '2px solid rgba(255, 255, 255, 0.95)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '22px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 50%, #9333ea 100%)',
                  boxShadow: '0 10px 24px rgba(79, 70, 229, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  color: '#ffffff',
                }}
              >
                🛡️
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.95rem', margin: 0, color: 'var(--liquid-navy-dark)' }}>
                    Admin Member Management & Presence
                  </h1>
                  <span
                    className="liquid-badge badge-lavender"
                    style={{ fontSize: '0.82rem', padding: '0.25rem 0.75rem' }}
                  >
                    👑 Super Admin Control
                  </span>
                </div>
                <p
                  style={{
                    margin: '0.35rem 0 0',
                    color: 'var(--liquid-navy-muted)',
                    fontSize: '0.94rem',
                    fontWeight: 600,
                  }}
                >
                  Track all logged-in and logged-out members in real time. Verify created accounts and assign
                  roles (User vs Admin) with strict 5-admin cap enforcement.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Global Feedback Notifications */}
        {errorMsg && (
          <div
            className="liquid-glass-card"
            style={{
              background: 'rgba(254, 226, 226, 0.95)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              color: '#991b1b',
              padding: '1rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              <div>
                <strong>Action Error:</strong> {errorMsg}
              </div>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#991b1b',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '1.1rem',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div
            className="liquid-glass-card"
            style={{
              background: 'rgba(209, 250, 229, 0.95)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              color: '#065f46',
              padding: '1rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🎉</span>
              <div>{successMsg}</div>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#065f46',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '1.1rem',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 5-Admin Limit Governance Alert Bar */}
        <div
          className="liquid-glass-card"
          style={{
            background: isMaxAdminsReached
              ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.9) 0%, rgba(255, 237, 213, 0.85) 100%)'
              : 'linear-gradient(135deg, rgba(240, 249, 255, 0.9) 0%, rgba(238, 242, 255, 0.85) 100%)',
            border: isMaxAdminsReached
              ? '2px solid rgba(245, 158, 11, 0.5)'
              : '1.5px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>{isMaxAdminsReached ? '🔒' : '⚖️'}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h3
                  style={{
                    fontSize: '1.1rem',
                    margin: 0,
                    color: isMaxAdminsReached ? '#92400e' : '#1e3a8a',
                  }}
                >
                  Admin Cap Enforcement: Strictly Maximum 5 Administrators Allowed
                </h3>
                <span
                  style={{
                    background: isMaxAdminsReached ? '#dc2626' : '#2563eb',
                    color: '#ffffff',
                    padding: '0.15rem 0.65rem',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                  }}
                >
                  {stats.adminCount} / {stats.maxAdmins} Slots Filled
                </span>
              </div>
              <p
                style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.86rem',
                  color: isMaxAdminsReached ? '#78350f' : '#3b82f6',
                  lineHeight: 1.45,
                }}
              >
                {isMaxAdminsReached ? (
                  <span>
                    ⚠️ <strong>Admin limit reached!</strong> All 5 administrator seats are currently filled.
                    You cannot promote another account to admin unless an existing admin is first demoted to user.
                  </span>
                ) : (
                  <span>
                    ✓ <strong>{adminSlotsRemaining} administrator seat{adminSlotsRemaining !== 1 ? 's' : ''} available.</strong>{' '}
                    New accounts can be verified and assigned as standard Users or promoted to Admin.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Progress Bar of Admin Slots */}
          <div style={{ minWidth: '180px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '0.35rem',
                color: isMaxAdminsReached ? '#92400e' : '#1e3a8a',
              }}
            >
              <span>Admin Quota</span>
              <span>{Math.round((stats.adminCount / stats.maxAdmins) * 100)}%</span>
            </div>
            <div
              style={{
                height: '10px',
                background: 'rgba(0,0,0,0.08)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(stats.adminCount / stats.maxAdmins) * 100}%`,
                  background: isMaxAdminsReached
                    ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    : 'linear-gradient(90deg, #38bdf8, #6366f1)',
                  borderRadius: '6px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Real-time Metric Cards */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Total Members */}
          <div
            className="liquid-glass-card"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(224,242,254,0.6) 100%)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.25rem' }}>👥</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--liquid-navy-dark)' }}>
              {stats.totalMembers}
            </div>
            <span style={{ fontSize: '0.86rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
              Total Registered Members
            </span>
          </div>

          {/* Logged In Members */}
          <div
            className="liquid-glass-card"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(209,250,229,0.6) 100%)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              border: '2px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 10px #10b981',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '1.8rem' }}>🟢</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#065f46' }}>
              {stats.loggedInCount}
            </div>
            <span style={{ fontSize: '0.86rem', color: '#047857', fontWeight: 700 }}>
              Currently Logged In
            </span>
          </div>

          {/* Logged Out Members */}
          <div
            className="liquid-glass-card"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.7) 100%)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.25rem' }}>⚪</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#475569' }}>
              {stats.loggedOutCount}
            </div>
            <span style={{ fontSize: '0.86rem', color: 'var(--liquid-navy-muted)', fontWeight: 700 }}>
              Logged Out Members
            </span>
          </div>

          {/* Admin Seats */}
          <div
            className="liquid-glass-card"
            style={{
              background: isMaxAdminsReached
                ? 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(254,226,226,0.6) 100%)'
                : 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(243,232,255,0.6) 100%)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              border: isMaxAdminsReached ? '2px solid rgba(239, 68, 68, 0.4)' : undefined,
            }}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.25rem' }}>🛡️</span>
            <div
              style={{
                fontSize: '2.2rem',
                fontWeight: 800,
                color: isMaxAdminsReached ? '#991b1b' : '#5b21b6',
              }}
            >
              {stats.adminCount} / {stats.maxAdmins}
            </div>
            <span
              style={{
                fontSize: '0.86rem',
                color: isMaxAdminsReached ? '#b91c1c' : '#6d28d9',
                fontWeight: 700,
              }}
            >
              Admins (Limit: 5)
            </span>
          </div>

          {/* Pending Verifications */}
          <div
            className="liquid-glass-card"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(254,243,199,0.6) 100%)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.25rem' }}>⏳</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#92400e' }}>
              {stats.pendingCount}
            </div>
            <span style={{ fontSize: '0.86rem', color: '#b45309', fontWeight: 700 }}>
              Pending Verification
            </span>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <section
          className="liquid-glass-card"
          style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Tab Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('all')}
              className={activeTab === 'all' ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              All Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('logged_in')}
              className={activeTab === 'logged_in' ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              🟢 Logged In ({stats.loggedInCount})
            </button>
            <button
              onClick={() => setActiveTab('logged_out')}
              className={activeTab === 'logged_out' ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              ⚪ Logged Out ({stats.loggedOutCount})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={activeTab === 'pending' ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              ⏳ Pending Review ({stats.pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={activeTab === 'admins' ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              🛡️ Admins ({stats.adminCount}/5)
            </button>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '260px', flex: '1', maxWidth: '380px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ margin: 0, padding: '0.55rem 1rem', fontSize: '0.88rem' }}
            />
          </div>
        </section>

        {/* Member Directory & Action Table */}
        <section
          className="liquid-glass-card"
          style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            padding: '0.5rem',
            background: 'rgba(255, 255, 255, 0.94)',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid var(--sky-200)',
                  borderTopColor: 'var(--sky-500)',
                  borderRadius: '50%',
                  margin: '0 auto 1rem',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p style={{ color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>Loading members data...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🔍</span>
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--liquid-navy-dark)' }}>No Members Match Filters</h3>
              <p style={{ color: 'var(--liquid-navy-muted)', fontSize: '0.9rem' }}>
                Try adjusting your search query or switching tabs.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid rgba(226, 232, 240, 0.8)',
                      background: 'rgba(248, 250, 252, 0.8)',
                    }}
                  >
                    <th style={{ padding: '1rem 1.25rem', color: 'var(--liquid-navy-dark)' }}>Member</th>
                    <th style={{ padding: '1rem', color: 'var(--liquid-navy-dark)' }}>Session Status</th>
                    <th style={{ padding: '1rem', color: 'var(--liquid-navy-dark)' }}>Assigned Role</th>
                    <th style={{ padding: '1rem', color: 'var(--liquid-navy-dark)' }}>Verification</th>
                    <th style={{ padding: '1rem', color: 'var(--liquid-navy-dark)' }}>Last Active</th>
                    <th style={{ padding: '1rem 1.25rem', color: 'var(--liquid-navy-dark)', textAlign: 'right' }}>
                      Admin Verification & Role Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => {
                    const isTargetLoading = actionLoadingId === m.id;
                    const isSelf = user?.id === m.id || user?.email === m.email;

                    return (
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: '1px solid rgba(241, 245, 249, 0.8)',
                          transition: 'background 0.2s ease',
                          background: m.role === 'admin' ? 'rgba(243, 232, 255, 0.2)' : 'transparent',
                        }}
                      >
                        {/* Member Info */}
                        <td style={{ padding: '1.1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '14px',
                                background:
                                  m.role === 'admin'
                                    ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
                                    : 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {m.role === 'admin' ? '🛡️' : '🧑‍🎓'}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span style={{ fontWeight: 800, color: 'var(--liquid-navy-dark)' }}>
                                  {m.fullName}
                                </span>
                                {isSelf && (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      background: '#dbeafe',
                                      color: '#1e40af',
                                      padding: '0.1rem 0.45rem',
                                      borderRadius: '6px',
                                      fontWeight: 700,
                                    }}
                                  >
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--liquid-navy-muted)',
                                  display: 'block',
                                }}
                              >
                                {m.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Session Status: Logged In vs Logged Out */}
                        <td style={{ padding: '1rem' }}>
                          {m.sessionStatus === 'logged_in' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '0.3rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                border: '1px solid rgba(22, 101, 52, 0.2)',
                              }}
                            >
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: '#16a34a',
                                  boxShadow: '0 0 6px #16a34a',
                                }}
                              />
                              Logged In
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                background: '#f1f5f9',
                                color: '#64748b',
                                padding: '0.3rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: '#94a3b8',
                                }}
                              />
                              Logged Out
                            </span>
                          )}
                        </td>

                        {/* Role: User vs Admin */}
                        <td style={{ padding: '1rem' }}>
                          {m.role === 'admin' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#f3e8ff',
                                color: '#6b21a8',
                                padding: '0.3rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                border: '1px solid rgba(107, 33, 168, 0.25)',
                              }}
                            >
                              🛡️ Administrator
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '0.3rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                border: '1px solid rgba(3, 105, 161, 0.25)',
                              }}
                            >
                              🧑‍🎓 Student / User
                            </span>
                          )}
                        </td>

                        {/* Verification Status */}
                        <td style={{ padding: '1rem' }}>
                          {m.verificationStatus === 'verified' ? (
                            <span
                              style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: '1px solid rgba(4, 120, 87, 0.2)',
                              }}
                            >
                              ✓ Verified
                            </span>
                          ) : m.verificationStatus === 'pending' ? (
                            <span
                              style={{
                                background: '#fffbeb',
                                color: '#b45309',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: '1px solid rgba(180, 83, 9, 0.2)',
                              }}
                            >
                              ⏳ Pending Review
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#fef2f2',
                                color: '#b91c1c',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                              }}
                            >
                              ✕ Rejected
                            </span>
                          )}
                        </td>

                        {/* Last Active Timestamp */}
                        <td style={{ padding: '1rem', color: 'var(--liquid-navy-muted)', fontSize: '0.82rem' }}>
                          {new Date(m.lastActiveAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          at{' '}
                          {new Date(m.lastActiveAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* Action Buttons: Verify & Set Role */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '0.5rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            {/* Verification Workflow for Pending accounts */}
                            {m.verificationStatus === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleVerify(m.id, 'verified', 'user')}
                                  disabled={isTargetLoading}
                                  className="btn-liquid-secondary"
                                  style={{
                                    fontSize: '0.78rem',
                                    padding: '0.35rem 0.75rem',
                                    color: '#0369a1',
                                    borderColor: '#0284c7',
                                    fontWeight: 700,
                                  }}
                                  title="Verify this newly registered account as a regular User"
                                >
                                  ✓ Verify as User
                                </button>

                                <button
                                  onClick={() => handleVerify(m.id, 'verified', 'admin')}
                                  disabled={isTargetLoading || isMaxAdminsReached}
                                  className="btn-liquid-primary"
                                  style={{
                                    fontSize: '0.78rem',
                                    padding: '0.35rem 0.75rem',
                                    opacity: isMaxAdminsReached ? 0.45 : 1,
                                    cursor: isMaxAdminsReached ? 'not-allowed' : 'pointer',
                                  }}
                                  title={
                                    isMaxAdminsReached
                                      ? 'Cannot verify as Admin: 5-admin limit reached (5/5)'
                                      : 'Verify this account and grant Administrator privileges'
                                  }
                                >
                                  🛡️ Verify as Admin {isMaxAdminsReached ? '(Full)' : ''}
                                </button>
                              </>
                            ) : (
                              /* Role Assignment Workflow for already verified accounts */
                              <>
                                {m.role === 'user' ? (
                                  <button
                                    onClick={() => handleChangeRole(m.id, 'admin')}
                                    disabled={isTargetLoading || isMaxAdminsReached}
                                    className="btn-liquid-secondary"
                                    style={{
                                      fontSize: '0.78rem',
                                      padding: '0.35rem 0.8rem',
                                      color: isMaxAdminsReached ? '#94a3b8' : '#6b21a8',
                                      borderColor: isMaxAdminsReached ? '#cbd5e1' : '#a855f7',
                                      opacity: isMaxAdminsReached ? 0.5 : 1,
                                      cursor: isMaxAdminsReached ? 'not-allowed' : 'pointer',
                                      fontWeight: 700,
                                    }}
                                    title={
                                      isMaxAdminsReached
                                        ? 'Admin limit of 5 is reached. Demote another admin first.'
                                        : 'Promote this member to Administrator'
                                    }
                                  >
                                    ⬆️ Make Admin {isMaxAdminsReached ? '(5/5 Full)' : ''}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleChangeRole(m.id, 'user')}
                                    disabled={isTargetLoading || stats.adminCount <= 1}
                                    className="btn-liquid-secondary"
                                    style={{
                                      fontSize: '0.78rem',
                                      padding: '0.35rem 0.8rem',
                                      color: stats.adminCount <= 1 ? '#94a3b8' : '#b91c1c',
                                      borderColor: stats.adminCount <= 1 ? '#cbd5e1' : '#f87171',
                                      fontWeight: 700,
                                    }}
                                    title={
                                      stats.adminCount <= 1
                                        ? 'Cannot demote the last remaining administrator'
                                        : 'Demote this administrator to regular User'
                                    }
                                  >
                                    ⬇️ Make User
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    handleVerify(
                                      m.id,
                                      m.verificationStatus === 'verified' ? 'pending' : 'verified'
                                    )
                                  }
                                  disabled={isTargetLoading}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '0.78rem',
                                    color: 'var(--liquid-navy-muted)',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: '0.35rem',
                                  }}
                                  title="Toggle verification flag"
                                >
                                  {m.verificationStatus === 'verified' ? 'Revoke Verify' : 'Re-verify'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

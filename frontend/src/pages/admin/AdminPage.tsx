import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, MASTER_ADMIN_EMAIL } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { API_BASE_URL } from '../../config/api';
import type {
  MemberRecord,
  AdminStats,
  AdminNotification,
  UserRole,
  MemberVerificationStatus,
  LoginAuditEvent,
  AdminAuditEvent,
  SystemSettings,
} from '@ai-toon/shared';

export const AdminPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalMembers: 0,
    loggedInCount: 0,
    loggedOutCount: 0,
    adminCount: 0,
    maxAdmins: 5,
    userCount: 0,
    pendingCount: 0,
    unreadNotificationsCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'all' | 'notifications' | 'logged_in' | 'logged_out' | 'admins' | 'pending' | 'audit' | 'settings'
  >('all');

  // Audit & Settings State
  const [loginAudits, setLoginAudits] = useState<LoginAuditEvent[]>([]);
  const [adminAudits, setAdminAudits] = useState<AdminAuditEvent[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Fetch members, notifications, and stats from backend
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const headers = {
        'x-user-id': user.id,
        'x-user-email': user.email || '',
        'x-user-role': profile?.role || 'admin',
      };

      const [membersRes, notifsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/members`, { headers }),
        fetch(`${API_BASE_URL}/admin/notifications`, { headers }),
      ]);

      if (membersRes.ok) {
        const body = await membersRes.json();
        if (body.success && body.data) {
          setMembers(body.data.members || []);
          if (body.data.stats) {
            setStats(body.data.stats);
          }
        }
      }

      if (notifsRes.ok) {
        const body = await notifsRes.json();
        if (body.success && body.data) {
          setNotifications(body.data.notifications || []);
        }
      }
    } catch (err) {
      console.error('[AdminPage] fetch error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load member data.');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const fetchAudit = useCallback(async () => {
    if (!user) return;
    try {
      const headers = {
        'x-user-id': user.id,
        'x-user-email': user.email || '',
        'x-user-role': profile?.role || 'admin',
      };
      const [loginRes, adminRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/audit/logins`, { headers }),
        fetch(`${API_BASE_URL}/admin/audit/actions`, { headers }),
      ]);
      if (loginRes.ok) {
        const body = await loginRes.json();
        if (body.data) setLoginAudits(body.data);
      }
      if (adminRes.ok) {
        const body = await adminRes.json();
        if (body.data) setAdminAudits(body.data);
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    }
  }, [user, profile]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const headers = {
        'x-user-id': user.id,
        'x-user-email': user.email || '',
        'x-user-role': profile?.role || 'admin',
      };
      const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers });
      if (res.ok) {
        const body = await res.json();
        if (body.data) setSettings(body.data);
      }
    } catch (err) {
      console.warn('Failed to fetch settings:', err);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAudit();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab, fetchAudit, fetchSettings]);

  // Auto-refresh interval (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Approve registration notification
  const handleApproveNotification = async (notificationId: string, targetRole: UserRole) => {
    if (!user) return;
    setActionLoadingId(notificationId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/notifications/${notificationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
          'x-user-role': profile?.role || 'admin',
        },
        body: JSON.stringify({ role: targetRole }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Approval failed.');
      }

      setSuccessMsg(
        `Account approved successfully as "${targetRole}". The user is now verified and can log in.`
      );
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject registration notification
  const handleRejectNotification = async (notificationId: string) => {
    if (!user) return;
    setActionLoadingId(notificationId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/notifications/${notificationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
          'x-user-role': profile?.role || 'admin',
        },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Rejection failed.');
      }

      setSuccessMsg('Account registration rejected.');
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Verify & Set Role directly on member row
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
        `Account status updated to "${status}"${targetRole ? ` with role "${targetRole}"` : ''}.`
      );
      await fetchData();
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
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Role change failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Purge / Clean System
  const handleResetAccounts = async () => {
    if (!window.confirm('Are you sure you want to remove all accounts except Master Admin Muni?')) {
      return;
    }
    if (!user) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/members/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
          'x-user-role': profile?.role || 'admin',
        },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Reset failed.');
      }

      setSuccessMsg('All accounts except Master Admin Muni have been wiped cleanly.');
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Reset failed.');
    }
  };

  const handleSuspendMember = async (targetId: string) => {
    if (!user) return;
    setActionLoadingId(targetId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/members/${targetId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
          'x-user-role': profile?.role || 'admin',
        },
        body: JSON.stringify({ reason: 'Suspended by admin' }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Suspension failed.');
      setSuccessMsg('Account suspended successfully.');
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Suspension failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReactivateMember = async (targetId: string) => {
    if (!user) return;
    setActionLoadingId(targetId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/members/${targetId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
          'x-user-role': profile?.role || 'admin',
        },
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Reactivation failed.');
      setSuccessMsg('Account reactivated successfully.');
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Reactivation failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (!user) return;
    setSettingsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
          'x-user-role': profile?.role || 'admin',
        },
        body: JSON.stringify(newSettings),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Settings update failed.');
      setSettings(body.data);
      setSuccessMsg('System settings updated successfully.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleExportReport = async () => {
    if (!user) return;
    try {
      const headers = {
        'x-user-id': user.id,
        'x-user-email': user.email || '',
        'x-user-role': profile?.role || 'admin',
      };
      const res = await fetch(`${API_BASE_URL}/admin/export`, { headers });
      if (res.ok) {
        const body = await res.json();
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(body.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `ai-toon-audit-report-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
    } catch {
      setErrorMsg('Failed to export system report.');
    }
  };

  // Pending notifications
  const pendingNotifications = notifications.filter((n) => n.status === 'pending');

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);
      if (!match) return false;
    }

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
        {/* Navigation Breadcrumb & Live Controls */}
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
              🛡️ Muni Admin Console
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleResetAccounts()}
              className="btn-liquid-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.85rem',
                color: '#b91c1c',
                borderColor: '#fca5a5',
                fontWeight: 700,
              }}
              title="Remove all created accounts and keep only Muni"
            >
              🧹 Wipe All Except Muni
            </button>

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
              {autoRefresh ? '🟢 Auto-Sync ON (5s)' : '⚪ Auto-Sync OFF'}
            </button>

            <button
              onClick={() => fetchData()}
              className="btn-liquid-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1.15rem' }}
              disabled={loading}
            >
              🔄 Refresh Now
            </button>
          </div>
        </div>

        {/* Hero Admin Header Card */}
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
                    Admin Member Management & Approvals
                  </h1>
                  <span
                    className="liquid-badge badge-lavender"
                    style={{ fontSize: '0.82rem', padding: '0.25rem 0.75rem' }}
                  >
                    👑 Master Admin: {MASTER_ADMIN_EMAIL}
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
                  Newly created accounts trigger an instant notification to this portal for your verification.
                  Approve accounts as User or Admin, with strict 5-admin limit enforcement.
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

        {/* REAL-TIME INCOMING NOTIFICATION BANNER */}
        {pendingNotifications.length > 0 && (
          <section
            className="liquid-glass-card"
            style={{
              background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(255, 237, 213, 0.9) 100%)',
              border: '2.5px solid #f59e0b',
              padding: '1.5rem',
              borderRadius: 'var(--radius-xl)',
              marginBottom: '2rem',
              boxShadow: '0 12px 28px rgba(245, 158, 11, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.8rem', animation: 'pulse 1.5s infinite' }}>🔔</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#92400e' }}>
                  Action Required: {pendingNotifications.length} New Account{pendingNotifications.length > 1 ? 's' : ''} Awaiting Your Approval!
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: '#b45309' }}>
                  These users registered on the website and cannot access the app until you approve them.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {pendingNotifications.map((notif) => {
                const isLoading = actionLoadingId === notif.id;

                return (
                  <div
                    key={notif.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '1.5px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.1rem 1.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: '#fef3c7',
                          color: '#d97706',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.3rem',
                          fontWeight: 700,
                        }}
                      >
                        👤
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--liquid-navy-dark)' }}>
                            {notif.fullName}
                          </span>
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#b45309',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                            }}
                          >
                            New Registration
                          </span>
                        </div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--liquid-navy-muted)', marginTop: '0.15rem' }}>
                          Email: <strong>{notif.email}</strong> • Requested at:{' '}
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on notification */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <button
                        onClick={() => handleApproveNotification(notif.id, 'user')}
                        disabled={isLoading}
                        className="btn-liquid-primary"
                        style={{
                          fontSize: '0.82rem',
                          padding: '0.45rem 1rem',
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        }}
                      >
                        ✓ Approve as User
                      </button>

                      <button
                        onClick={() => handleApproveNotification(notif.id, 'admin')}
                        disabled={isLoading || isMaxAdminsReached}
                        className="btn-liquid-secondary"
                        style={{
                          fontSize: '0.82rem',
                          padding: '0.45rem 1rem',
                          borderColor: '#a855f7',
                          color: '#6b21a8',
                          fontWeight: 800,
                          opacity: isMaxAdminsReached ? 0.45 : 1,
                        }}
                        title={isMaxAdminsReached ? '5-admin limit reached' : 'Approve and grant Admin access'}
                      >
                        🛡️ Approve as Admin {isMaxAdminsReached ? '(Full)' : ''}
                      </button>

                      <button
                        onClick={() => handleRejectNotification(notif.id)}
                        disabled={isLoading}
                        className="btn-liquid-secondary"
                        style={{
                          fontSize: '0.82rem',
                          padding: '0.45rem 0.85rem',
                          color: '#b91c1c',
                          borderColor: '#fca5a5',
                          fontWeight: 700,
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
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
                  Admin Cap Policy: Exactly Maximum 5 Administrators Allowed
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
                    ⚠️ <strong>Admin slots full (5/5).</strong> To assign admin privileges to another member,
                    an existing administrator must first be demoted.
                  </span>
                ) : (
                  <span>
                    ✓ <strong>{adminSlotsRemaining} administrator slot{adminSlotsRemaining !== 1 ? 's' : ''} available.</strong>{' '}
                    Muni ({MASTER_ADMIN_EMAIL}) controls member role assignments.
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
              Registered Members
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
              Admins (Max: 5)
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
              Awaiting Approval
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
              onClick={() => setActiveTab('notifications')}
              className={activeTab === 'notifications' ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
              style={{
                fontSize: '0.85rem',
                padding: '0.45rem 1rem',
                borderColor: pendingNotifications.length > 0 ? '#f59e0b' : undefined,
                color: pendingNotifications.length > 0 ? '#b45309' : undefined,
                fontWeight: 800,
              }}
            >
              🔔 Notifications ({pendingNotifications.length})
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
            <button
              onClick={() => setActiveTab('audit')}
              className={activeTab === 'audit' ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              📋 Audit Trail
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={activeTab === 'settings' ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              ⚙️ Controls & Export
            </button>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '260px', flex: '1', maxWidth: '380px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ margin: 0, padding: '0.55rem 1rem', fontSize: '0.88rem' }}
            />
          </div>
        </section>

        {/* Tab 1: Notifications Feed */}
        {activeTab === 'notifications' ? (
          <section
            className="liquid-glass-card"
            style={{
              padding: '1.75rem',
              borderRadius: 'var(--radius-xl)',
              background: 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <h3 style={{ margin: '0 0 1.25rem', color: 'var(--liquid-navy-dark)' }}>
              🔔 Registration Notifications & Approval Requests
            </h3>

            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--liquid-navy-muted)' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
                No registration notifications received yet. When users sign up, they will appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #e2e8f0',
                      background: n.status === 'pending' ? '#fffbeb' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--liquid-navy-dark)' }}>{n.fullName}</span>
                        <span style={{ color: 'var(--liquid-navy-muted)', fontSize: '0.85rem' }}>({n.email})</span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            background:
                              n.status === 'approved'
                                ? '#ecfdf5'
                                : n.status === 'rejected'
                                ? '#fef2f2'
                                : '#fef3c7',
                            color:
                              n.status === 'approved'
                                ? '#047857'
                                : n.status === 'rejected'
                                ? '#b91c1c'
                                : '#b45309',
                          }}
                        >
                          {n.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--liquid-navy-muted)', marginTop: '0.2rem' }}>
                        Requested: {new Date(n.createdAt).toLocaleString()}
                        {n.actionedBy && ` • Actioned by ${n.actionedBy}`}
                      </div>
                    </div>

                    {n.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleApproveNotification(n.id, 'user')}
                          className="btn-liquid-primary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                        >
                          Approve as User
                        </button>
                        <button
                          onClick={() => handleApproveNotification(n.id, 'admin')}
                          disabled={isMaxAdminsReached}
                          className="btn-liquid-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', fontWeight: 800 }}
                        >
                          Approve as Admin
                        </button>
                        <button
                          onClick={() => handleRejectNotification(n.id)}
                          className="btn-liquid-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', color: '#b91c1c' }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : activeTab === 'audit' ? (
          /* Tab: Audit Trail */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Login Activity Logs */}
            <section
              className="liquid-glass-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                padding: '1.5rem',
                background: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--liquid-navy-dark)', fontSize: '1.25rem' }}>
                    🔐 Login & Authentication Activity
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--liquid-navy-muted)' }}>
                    Real-time login successes, failures, and device metadata recorded for security audit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchAudit}
                  className="btn-neoclay-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                >
                  🔄 Refresh Logs
                </button>
              </div>

              {loginAudits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--navy-500)' }}>
                  No login events recorded yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Time</th>
                        <th style={{ padding: '0.75rem 1rem' }}>User / Email</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Reason / Note</th>
                        <th style={{ padding: '0.75rem 1rem' }}>IP Address</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginAudits.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--navy-600)' }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                            {log.email}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: log.success ? '#dcfce7' : '#fee2e2',
                                color: log.success ? '#15803d' : '#b91c1c',
                              }}
                            >
                              {log.success ? '✓ SUCCESS' : '✕ FAILED'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: log.success ? '#15803d' : '#b91c1c', fontSize: '0.82rem' }}>
                            {log.reason || (log.success ? 'Authenticated successfully' : 'Failed')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--navy-700)' }}>
                            {log.ip || '127.0.0.1'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--navy-600)' }}>
                            {log.browser || 'Browser'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Admin Actions Audit Log */}
            <section
              className="liquid-glass-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                padding: '1.5rem',
                background: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--liquid-navy-dark)', fontSize: '1.25rem' }}>
                🛡️ Administrative Action Audit Trail
              </h3>
              {adminAudits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--navy-500)' }}>
                  No admin actions recorded yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Time</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Admin</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Target Account</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminAudits.map((act) => (
                        <tr key={act.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--navy-600)' }}>
                            {new Date(act.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#6b21a8' }}>
                            {act.adminEmail}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: '#f3e8ff',
                                color: '#581c87',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                              }}
                            >
                              {act.action}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--navy-800)' }}>
                            {act.targetEmail || act.targetId || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'settings' ? (
          /* Tab: Settings & System Controls */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <section
              className="liquid-glass-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                background: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--liquid-navy-dark)', fontSize: '1.3rem' }}>
                ⚙️ Platform Configuration & Safety Controls
              </h3>
              <p style={{ margin: '0 0 2rem 0', color: 'var(--navy-600)', fontSize: '0.9rem' }}>
                Control platform availability, registration approval requirements, and safety guidelines.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* AI Generation Toggle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-lg)',
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy-900)' }}>
                      AI Story & Lesson Generation
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--navy-600)', marginTop: '0.2rem' }}>
                      When paused, users cannot generate new stories. Public sample lessons remain readable.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={settingsSaving}
                    onClick={() =>
                      handleUpdateSettings({
                        storyGenerationEnabled: !(settings?.storyGenerationEnabled ?? true),
                      })
                    }
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      background: (settings?.storyGenerationEnabled ?? true) ? '#10b981' : '#f59e0b',
                      color: '#ffffff',
                    }}
                  >
                    {(settings?.storyGenerationEnabled ?? true) ? 'Active (Enabled)' : 'Paused (Disabled)'}
                  </button>
                </div>

                {/* Registration Approval Toggle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-lg)',
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy-900)' }}>
                      Mandatory Admin Approval for Registrations
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--navy-600)', marginTop: '0.2rem' }}>
                      Newly registered accounts must be approved by Muni before gaining access.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={settingsSaving}
                    onClick={() =>
                      handleUpdateSettings({
                        userApprovalRequired: !(settings?.userApprovalRequired ?? true),
                      })
                    }
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      background: (settings?.userApprovalRequired ?? true) ? '#3b82f6' : '#64748b',
                      color: '#ffffff',
                    }}
                  >
                    {(settings?.userApprovalRequired ?? true) ? 'Required (Strict)' : 'Open (Instant)'}
                  </button>
                </div>

                {/* Safety Moderation Level */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-lg)',
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy-900)' }}>
                      Content Safety & Academic Moderation
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--navy-600)', marginTop: '0.2rem' }}>
                      Filters inappropriate queries and enforces academic educational themes.
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: '#ecfdf5',
                      color: '#065f46',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    🛡️ Strict (K-12 Safe)
                  </span>
                </div>
              </div>
            </section>

            {/* Export & Compliance Card */}
            <section
              className="liquid-glass-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                background: 'rgba(255, 255, 255, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--liquid-navy-dark)', fontSize: '1.15rem' }}>
                  📥 Export Authorized System & Audit Reports
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--navy-600)', maxWidth: '580px' }}>
                  Download a structured JSON archive containing active member registries, system settings, login security audits, and administrative change logs.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportReport}
                className="btn-neoclay-primary"
                style={{ padding: '0.75rem 1.6rem', fontSize: '0.95rem' }}
              >
                Download Audit Report (JSON) 📥
              </button>
            </section>
          </div>
        ) : (
          /* Tab 2: Members Directory Table */
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
                <p style={{ color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>Loading member records...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🔍</span>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--liquid-navy-dark)' }}>No Members Found</h3>
                <p style={{ color: 'var(--liquid-navy-muted)', fontSize: '0.9rem' }}>
                  Try adjusting your search query or tab filters.
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
                      <th style={{ padding: '1rem', color: 'var(--liquid-navy-dark)' }}>Approval Status</th>
                      <th style={{ padding: '1rem', color: 'var(--liquid-navy-dark)' }}>Last Active</th>
                      <th style={{ padding: '1rem 1.25rem', color: 'var(--liquid-navy-dark)', textAlign: 'right' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => {
                      const isTargetLoading = actionLoadingId === m.id;
                      const isMasterAdmin = m.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

                      return (
                        <tr
                          key={m.id}
                          style={{
                            borderBottom: '1px solid rgba(241, 245, 249, 0.8)',
                            transition: 'background 0.2s ease',
                            background: isMasterAdmin ? 'rgba(243, 232, 255, 0.35)' : 'transparent',
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
                                  {isMasterAdmin && (
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        background: '#f3e8ff',
                                        color: '#6b21a8',
                                        padding: '0.1rem 0.45rem',
                                        borderRadius: '6px',
                                        fontWeight: 800,
                                      }}
                                    >
                                      MASTER ADMIN
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

                          {/* Session Status */}
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

                          {/* Role */}
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
                                }}
                              >
                                🛡️ Admin
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
                                }}
                              >
                                🧑‍🎓 User
                              </span>
                            )}
                          </td>

                          {/* Verification */}
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
                                }}
                              >
                                ✓ Approved
                              </span>
                            ) : m.verificationStatus === 'suspended' ? (
                              <span
                                style={{
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  border: '1.5px solid #f87171',
                                }}
                              >
                                🚫 Suspended
                              </span>
                            ) : m.verificationStatus === 'pending' ? (
                              <span
                                style={{
                                  background: '#fffbeb',
                                  color: '#b45309',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  border: '1.5px solid #f59e0b',
                                }}
                              >
                                ⏳ Pending Approval
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

                          {/* Last Active */}
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

                          {/* Action Buttons */}
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
                              {m.verificationStatus === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => handleVerify(m.id, 'verified', 'user')}
                                    disabled={isTargetLoading}
                                    className="btn-liquid-primary"
                                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={() => handleVerify(m.id, 'verified', 'admin')}
                                    disabled={isTargetLoading || isMaxAdminsReached}
                                    className="btn-liquid-secondary"
                                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}
                                  >
                                    🛡️ Make Admin
                                  </button>
                                </>
                              ) : (
                                <>
                                  {!isMasterAdmin && (
                                    <>
                                      {m.role === 'user' ? (
                                        <button
                                          onClick={() => handleChangeRole(m.id, 'admin')}
                                          disabled={isTargetLoading || isMaxAdminsReached}
                                          className="btn-liquid-secondary"
                                          style={{
                                            fontSize: '0.78rem',
                                            padding: '0.35rem 0.75rem',
                                            fontWeight: 700,
                                          }}
                                        >
                                          ⬆️ Promote Admin
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleChangeRole(m.id, 'user')}
                                          disabled={isTargetLoading}
                                          className="btn-liquid-secondary"
                                          style={{
                                            fontSize: '0.78rem',
                                            padding: '0.35rem 0.75rem',
                                            color: '#b91c1c',
                                          }}
                                        >
                                          ⬇️ Demote User
                                        </button>
                                      )}

                                      {m.verificationStatus === 'suspended' ? (
                                        <button
                                          onClick={() => handleReactivateMember(m.id)}
                                          disabled={isTargetLoading}
                                          className="btn-liquid-secondary"
                                          style={{
                                            fontSize: '0.78rem',
                                            padding: '0.35rem 0.75rem',
                                            color: '#047857',
                                            borderColor: '#34d399',
                                            fontWeight: 700,
                                          }}
                                        >
                                          ✓ Reactivate
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleSuspendMember(m.id)}
                                          disabled={isTargetLoading}
                                          className="btn-liquid-secondary"
                                          style={{
                                            fontSize: '0.78rem',
                                            padding: '0.35rem 0.75rem',
                                            color: '#dc2626',
                                            borderColor: '#fca5a5',
                                          }}
                                        >
                                          🚫 Suspend
                                        </button>
                                      )}
                                    </>
                                  )}
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
        )}
      </main>

      <Footer />
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, MASTER_ADMIN_EMAIL } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { API_BASE_URL, safeJsonParse } from '../../config/api';
import type {
  MemberRecord,
  AdminStats,
  AdminNotification,
  UserRole,
  MemberVerificationStatus,
  LoginAuditEvent,
  AdminAuditEvent,
  SystemSettings,
  Story,
  QuizAttemptRecord,
} from '@ai-toon/shared';
import { isAccountApproved } from '@ai-toon/shared';

interface LessonRecord extends Story {
  userId: string;
  userEmail?: string;
  createdAtString?: string;
}

interface QuizRecord extends QuizAttemptRecord {
  userEmail?: string;
  userName?: string;
}

type AdminTab = 'overview' | 'users' | 'notifications' | 'lessons' | 'quizzes' | 'audit' | 'settings';

export const AdminPage: React.FC = () => {
  const { user, profile, getAuthHeaders, signOut } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Core Data
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalMembers: 0,
    loggedInCount: 0,
    loggedOutCount: 0,
    adminCount: 0,
    maxAdmins: 5,
    userCount: 0,
    pendingCount: 0,
    suspendedCount: 0,
    unreadNotificationsCount: 0,
    totalLessonsGenerated: 0,
    totalQuizzesCompleted: 0,
    averageQuizScore: 0,
  });

  // Audit & Settings State
  const [loginAudits, setLoginAudits] = useState<LoginAuditEvent[]>([]);
  const [adminAudits, setAdminAudits] = useState<AdminAuditEvent[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // UI Feedback & Controls
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Filtering & Modal State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'verified' | 'pending' | 'suspended' | 'rejected'>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [userSortOrder, setUserSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [notifView, setNotifView] = useState<'pending' | 'all'>('pending');
  const [selectedUser, setSelectedUser] = useState<MemberRecord | null>(null);
  const [lessonSearch, setLessonSearch] = useState<string>('');
  const [quizSearch, setQuizSearch] = useState<string>('');

  // Fetch core data (members, notifications, stats, lessons, quizzes)
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const headers = getAuthHeaders();
      headers['x-user-role'] = profile?.role || 'admin';

      const [membersRes, notifsRes, lessonsRes, quizzesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/members`, { headers }),
        fetch(`${API_BASE_URL}/admin/notifications`, { headers }),
        fetch(`${API_BASE_URL}/admin/lessons`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/admin/quizzes`, { headers }).catch(() => null),
      ]);

      if (membersRes.ok) {
        const parsedMembers = await safeJsonParse(membersRes);
        if (parsedMembers.ok && parsedMembers.data?.success && parsedMembers.data.data) {
          setMembers(parsedMembers.data.data.members || []);
          if (parsedMembers.data.data.stats) {
            setStats((prev) => ({ ...prev, ...parsedMembers.data.data.stats }));
          }
        }
      }

      if (notifsRes.ok) {
        const parsedNotifs = await safeJsonParse(notifsRes);
        if (parsedNotifs.ok && parsedNotifs.data?.success && parsedNotifs.data.data) {
          setNotifications(parsedNotifs.data.data.notifications || []);
        }
      }

      if (lessonsRes && lessonsRes.ok) {
        const parsedLessons = await safeJsonParse(lessonsRes);
        if (parsedLessons.ok && parsedLessons.data?.data) {
          setLessons(parsedLessons.data.data);
          setStats((prev) => ({ ...prev, totalLessonsGenerated: parsedLessons.data.data.length }));
        }
      }

      if (quizzesRes && quizzesRes.ok) {
        const parsedQuizzes = await safeJsonParse(quizzesRes);
        if (parsedQuizzes.ok && parsedQuizzes.data?.data) {
          setQuizzes(parsedQuizzes.data.data);
          const qList = parsedQuizzes.data.data;
          const avg = qList.length === 0 ? 0 : Math.round(qList.reduce((acc: number, curr: any) => acc + (curr.percentage || 0), 0) / qList.length);
          setStats((prev) => ({
            ...prev,
            totalQuizzesCompleted: qList.length,
            averageQuizScore: avg,
          }));
        }
      }
    } catch (err) {
      console.error('[AdminPage] fetch error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load member and learning data.');
    } finally {
      setLoading(false);
    }
  }, [user, profile, getAuthHeaders]);

  const fetchAudit = useCallback(async () => {
    if (!user) return;
    try {
      const headers = getAuthHeaders();
      headers['x-user-role'] = profile?.role || 'admin';
      const [loginRes, adminRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/audit/logins`, { headers }),
        fetch(`${API_BASE_URL}/admin/audit/actions`, { headers }),
      ]);
      if (loginRes.ok) {
        const parsedLogin = await safeJsonParse(loginRes);
        if (parsedLogin.ok && parsedLogin.data?.data) setLoginAudits(parsedLogin.data.data);
      }
      if (adminRes.ok) {
        const parsedAdmin = await safeJsonParse(adminRes);
        if (parsedAdmin.ok && parsedAdmin.data?.data) setAdminAudits(parsedAdmin.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    }
  }, [user, profile, getAuthHeaders]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const headers = getAuthHeaders();
      headers['x-user-role'] = profile?.role || 'admin';
      const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers });
      if (res.ok) {
        const parsedSettings = await safeJsonParse(res);
        if (parsedSettings.ok && parsedSettings.data?.data) setSettings(parsedSettings.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch settings:', err);
    }
  }, [user, profile, getAuthHeaders]);

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

  // Auto-refresh interval (every 8 seconds when active)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 6000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // --- Member Actions ---
  const handleApproveMember = async (id: string, targetRole: UserRole = 'user') => {
    setActionLoadingId(id);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/members/${id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role: targetRole }),
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        showNotification('Student account approved successfully! Access granted.');
        fetchData();
      } else {
        showNotification(parsed.error || parsed.data?.error?.message || 'Failed to approve member', true);
      }
    } catch {
      showNotification('Network error approving member.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectMember = async (id: string) => {
    if (!window.confirm('Are you sure you want to reject this registration application?')) {
      return;
    }
    setActionLoadingId(id);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/members/${id}/reject`, {
        method: 'POST',
        headers,
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        showNotification('Registration application rejected.');
        fetchData();
      } else {
        showNotification(parsed.error || parsed.data?.error?.message || 'Failed to reject member', true);
      }
    } catch {
      showNotification('Network error rejecting member.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerify = async (id: string, verificationStatus: MemberVerificationStatus) => {
    setActionLoadingId(id);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/members/${id}/verify`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ verificationStatus }),
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        showNotification(parsed.data.meta?.message || `Account updated to ${verificationStatus}`);
        fetchData();
      } else {
        showNotification(parsed.error || parsed.data?.error?.message || 'Failed to update verification status', true);
      }
    } catch {
      showNotification('Network error updating member verification.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuspend = async (id: string) => {
    const reason = window.prompt('Please enter the reason for suspending this student account:', 'Violation of platform terms');
    if (!reason) return;
    setActionLoadingId(id);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/members/${id}/suspend`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        showNotification(`Student account suspended: ${reason}`);
        fetchData();
      } else {
        showNotification(parsed.error || parsed.data?.error?.message || 'Failed to suspend account', true);
      }
    } catch {
      showNotification('Network error suspending member.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReactivate = async (id: string) => {
    setActionLoadingId(id);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/members/${id}/reactivate`, {
        method: 'POST',
        headers,
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        showNotification('Account reactivated successfully.');
        fetchData();
      } else {
        showNotification(parsed.error || parsed.data?.error?.message || 'Failed to reactivate account', true);
      }
    } catch {
      showNotification('Network error reactivating member.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleToggle = async (id: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === 'admin' ? 'user' : 'admin';
    if (newRole === 'admin' && stats.adminCount >= stats.maxAdmins) {
      showNotification(`Maximum administrator limit reached (${stats.maxAdmins}). You cannot appoint more administrators.`, true);
      return;
    }
    if (!window.confirm(`Are you sure you want to change this member's role to ${newRole.toUpperCase()}?`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/members/${id}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        showNotification(`Role updated to ${newRole}`);
        fetchData();
      } else {
        showNotification(parsed.error || parsed.data?.error?.message || 'Failed to update role', true);
      }
    } catch {
      showNotification('Network error updating member role.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteMember = async (id: string, email: string) => {
    if (email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      showNotification('The Master Administrator account cannot be deleted.', true);
      return;
    }
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete account ${email}? This action cannot be undone.`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/members/${id}`, {
        method: 'DELETE',
        headers,
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        showNotification('Member removed permanently.');
        if (selectedUser?.id === id) setSelectedUser(null);
        fetchData();
      } else {
        showNotification(parsed.error || parsed.data?.error?.message || 'Failed to delete member', true);
      }
    } catch {
      showNotification('Network error deleting member.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- Notification Actions ---
  const handleApproveNotif = async (notifId: string, targetRole: UserRole = 'user') => {
    setActionLoadingId(notifId);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/notifications/${notifId}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role: targetRole }),
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        showNotification('Registration approved successfully! Student can now log in.');
        fetchData();
      } else {
        showNotification(parsed.error || parsed.data?.error?.message || 'Failed to approve registration', true);
      }
    } catch {
      showNotification('Network error approving notification.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectNotif = async (notifId: string) => {
    setActionLoadingId(notifId);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/notifications/${notifId}/reject`, {
        method: 'POST',
        headers,
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        showNotification('Registration rejected.');
        fetchData();
      } else {
        showNotification(parsed.error || parsed.data?.error?.message || 'Failed to reject registration', true);
      }
    } catch {
      showNotification('Network error rejecting notification.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- Settings Update ---
  const handleToggleSetting = async (key: keyof SystemSettings, val: boolean) => {
    setSettingsSaving(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ [key]: val }),
      });
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success) {
        setSettings(parsed.data.data);
        showNotification(`System setting updated.`);
      } else {
        showNotification('Failed to update system setting.', true);
      }
    } catch {
      showNotification('Network error updating system setting.', true);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/export`, { headers });
      if (res.ok) {
        const parsed = await safeJsonParse(res);
        const jsonStr = JSON.stringify(parsed.data?.data || parsed.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-toon-audit-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Audit export downloaded successfully.');
      }
    } catch {
      showNotification('Failed to export system data.', true);
    }
  };

  // Filtered and sorted lists
  const filteredMembers = members
    .filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.email.toLowerCase().includes(q) ||
        m.fullName.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);
      const matchesStatus =
        userStatusFilter === 'all'
          ? true
          : userStatusFilter === 'verified'
          ? isAccountApproved(m.verificationStatus)
          : userStatusFilter === 'pending'
          ? m.verificationStatus === 'pending'
          : userStatusFilter === 'rejected'
          ? m.verificationStatus === 'rejected'
          : m.verificationStatus === 'suspended';
      const matchesRole = userRoleFilter === 'all' ? true : m.role === userRoleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      if (userSortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (userSortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return a.fullName.localeCompare(b.fullName);
    });

  const pendingNotifs = notifications.filter((n) => n.status === 'pending');
  const displayedNotifs = notifView === 'pending' ? pendingNotifs : notifications;

  const filteredLessons = lessons.filter((l) => {
    const q = lessonSearch.toLowerCase().trim();
    return !q || l.topic.toLowerCase().includes(q) || (l.title && l.title.toLowerCase().includes(q)) || (l.userEmail && l.userEmail.toLowerCase().includes(q));
  });

  const filteredQuizzes = quizzes.filter((q) => {
    const s = quizSearch.toLowerCase().trim();
    return !s || q.topic.toLowerCase().includes(s) || (q.userEmail && q.userEmail.toLowerCase().includes(s));
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <Header />

      <div className="admin-portal-wrapper">
        {/* --- 1. SaaS Navigation Sidebar --- */}
        <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="admin-sidebar-header">
            <span className="admin-brand-badge">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              SaaS Console v2.0
            </span>
            <h2 className="admin-brand-title">AI Toon Admin</h2>
            <p className="admin-brand-sub">Platform Management & Auditing</p>
          </div>

          <nav className="admin-sidebar-nav">
            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
            >
              <span className="admin-nav-icon-label">
                <span>📊</span> Overview & Metrics
              </span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
            >
              <span className="admin-nav-icon-label">
                <span>👥</span> User Management
              </span>
              <span className="admin-nav-badge">{members.length}</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }}
            >
              <span className="admin-nav-icon-label">
                <span>🔔</span> Pending Approvals
              </span>
              {pendingNotifs.length > 0 && (
                <span className="admin-nav-badge urgent">{pendingNotifs.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'lessons' ? 'active' : ''}`}
              onClick={() => { setActiveTab('lessons'); setMobileMenuOpen(false); }}
            >
              <span className="admin-nav-icon-label">
                <span>📚</span> Lessons Generated
              </span>
              <span className="admin-nav-badge">{stats.totalLessonsGenerated || lessons.length}</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'quizzes' ? 'active' : ''}`}
              onClick={() => { setActiveTab('quizzes'); setMobileMenuOpen(false); }}
            >
              <span className="admin-nav-icon-label">
                <span>🎯</span> Quizzes & Scores
              </span>
              <span className="admin-nav-badge">{stats.totalQuizzesCompleted || quizzes.length}</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }}
            >
              <span className="admin-nav-icon-label">
                <span>🛡️</span> Security & Audits
              </span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
            >
              <span className="admin-nav-icon-label">
                <span>⚙️</span> System Settings
              </span>
            </button>
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-profile-chip">
              <div className="admin-avatar">M</div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Muni (Admin)
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {MASTER_ADMIN_EMAIL}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="admin-btn admin-btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* --- 2. Main Administration Area --- */}
        <main className="admin-main-content">
          {/* Top Bar */}
          <div className="admin-top-bar">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="mobile-nav-toggle"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle Navigation"
                >
                  ☰
                </button>
                <h1 className="admin-header-title">
                  {activeTab === 'overview' && 'System Overview & Analytics'}
                  {activeTab === 'users' && 'Student & User Directory'}
                  {activeTab === 'notifications' && 'Registration Approval Queue'}
                  {activeTab === 'lessons' && 'Lessons & Content Management'}
                  {activeTab === 'quizzes' && 'Assessments & Student Scores'}
                  {activeTab === 'audit' && 'Security Audits & Access Logs'}
                  {activeTab === 'settings' && 'Global System Configuration'}
                </h1>
              </div>
              <p className="admin-header-subtitle">
                Database synchronization active • Single source of truth across Vercel serverless deployment
              </p>
            </div>

            <div className="admin-actions-group">
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  background: '#ffffff',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-sync (8s)
              </label>

              <button
                type="button"
                onClick={() => fetchData()}
                className="admin-btn admin-btn-secondary"
                title="Refresh real-time data"
              >
                🔄 Refresh
              </button>

              <button
                type="button"
                onClick={handleExportData}
                className="admin-btn admin-btn-primary"
              >
                📥 Export JSON
              </button>
            </div>
          </div>

          {/* Toast Messages */}
          {successMsg && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '0.75rem',
                padding: '0.85rem 1.25rem',
                color: '#065f46',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <span>✅</span> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.75rem',
                padding: '0.85rem 1.25rem',
                color: '#991b1b',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: '3px solid #cbd5e1',
                  borderTopColor: '#3b82f6',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 1rem auto',
                }}
              />
              <span style={{ fontWeight: 600 }}>Loading SaaS console records...</span>
            </div>
          ) : (
            <>
              {/* --- TAB 1: OVERVIEW & ANALYTICS --- */}
              {activeTab === 'overview' && (
                <div>
                  {/* KPI Cards Grid */}
                  <div className="admin-kpi-grid">
                    <div className="admin-kpi-card">
                      <div className="admin-kpi-top">
                        <span className="admin-kpi-title">Total Members</span>
                        <div className="admin-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                          👥
                        </div>
                      </div>
                      <div className="admin-kpi-value">{stats.totalMembers}</div>
                      <div className="admin-kpi-subtitle">
                        <span>{stats.userCount} students</span> • <span>{stats.adminCount} admins</span>
                      </div>
                    </div>

                    <div className="admin-kpi-card">
                      <div className="admin-kpi-top">
                        <span className="admin-kpi-title">Active Sessions</span>
                        <div className="admin-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                          🟢
                        </div>
                      </div>
                      <div className="admin-kpi-value">{stats.loggedInCount}</div>
                      <div className="admin-kpi-subtitle">
                        <span>{stats.loggedOutCount} logged out</span>
                      </div>
                    </div>

                    <div className="admin-kpi-card" style={pendingNotifs.length > 0 ? { border: '1.5px solid #f59e0b', background: '#fffbeb' } : {}}>
                      <div className="admin-kpi-top">
                        <span className="admin-kpi-title" style={pendingNotifs.length > 0 ? { color: '#92400e', fontWeight: 700 } : {}}>
                          Pending Approvals
                        </span>
                        <div className="admin-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                          ⏳
                        </div>
                      </div>
                      <div className="admin-kpi-value" style={pendingNotifs.length > 0 ? { color: '#b45309' } : {}}>
                        {pendingNotifs.length}
                      </div>
                      <div className="admin-kpi-subtitle">
                        {pendingNotifs.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab('notifications')}
                            style={{ background: 'none', border: 'none', color: '#b45309', fontWeight: 700, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Review now →
                          </button>
                        ) : (
                          'All registrations reviewed'
                        )}
                      </div>
                    </div>

                    <div className="admin-kpi-card">
                      <div className="admin-kpi-top">
                        <span className="admin-kpi-title">Suspended Accounts</span>
                        <div className="admin-kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
                          🚫
                        </div>
                      </div>
                      <div className="admin-kpi-value">{stats.suspendedCount || 0}</div>
                      <div className="admin-kpi-subtitle">Policy restricted</div>
                    </div>

                    <div className="admin-kpi-card">
                      <div className="admin-kpi-top">
                        <span className="admin-kpi-title">Lessons Generated</span>
                        <div className="admin-kpi-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
                          📖
                        </div>
                      </div>
                      <div className="admin-kpi-value">{stats.totalLessonsGenerated || lessons.length}</div>
                      <div className="admin-kpi-subtitle">Interactive AI lessons</div>
                    </div>

                    <div className="admin-kpi-card">
                      <div className="admin-kpi-top">
                        <span className="admin-kpi-title">Quizzes Taken</span>
                        <div className="admin-kpi-icon" style={{ background: '#ecfeff', color: '#0891b2' }}>
                          🎯
                        </div>
                      </div>
                      <div className="admin-kpi-value">{stats.totalQuizzesCompleted || quizzes.length}</div>
                      <div className="admin-kpi-subtitle">
                        Avg Score: <strong>{stats.averageQuizScore || 0}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Visual Analytics Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    {/* Member Status Breakdown */}
                    <div className="admin-panel-card" style={{ marginBottom: 0 }}>
                      <div className="admin-panel-header">
                        <h3 className="admin-panel-title">👥 User Status Distribution</h3>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Real Database Distribution</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                            <span style={{ color: '#166534' }}>Verified / Active</span>
                            <span>{members.filter((m) => m.verificationStatus === 'verified').length} / {members.length}</span>
                          </div>
                          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${members.length ? (members.filter((m) => m.verificationStatus === 'verified').length / members.length) * 100 : 0}%`,
                                height: '100%',
                                background: '#22c55e',
                                borderRadius: 999,
                                transition: 'width 0.5s ease',
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                            <span style={{ color: '#92400e' }}>Pending Approval</span>
                            <span>{members.filter((m) => m.verificationStatus === 'pending').length} / {members.length}</span>
                          </div>
                          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${members.length ? (members.filter((m) => m.verificationStatus === 'pending').length / members.length) * 100 : 0}%`,
                                height: '100%',
                                background: '#f59e0b',
                                borderRadius: 999,
                                transition: 'width 0.5s ease',
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                            <span style={{ color: '#991b1b' }}>Suspended</span>
                            <span>{members.filter((m) => m.verificationStatus === 'suspended').length} / {members.length}</span>
                          </div>
                          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${members.length ? (members.filter((m) => m.verificationStatus === 'suspended').length / members.length) * 100 : 0}%`,
                                height: '100%',
                                background: '#ef4444',
                                borderRadius: 999,
                                transition: 'width 0.5s ease',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Learning Pulse */}
                    <div className="admin-panel-card" style={{ marginBottom: 0 }}>
                      <div className="admin-panel-header">
                        <h3 className="admin-panel-title">📚 Learning Activity Overview</h3>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Platform Metrics</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Stories</span>
                          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
                            {stats.totalLessonsGenerated || lessons.length}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>Active Generator</span>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Quizzes Scored</span>
                          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
                            {stats.totalQuizzesCompleted || quizzes.length}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                            {stats.averageQuizScore || 0}% avg accuracy
                          </span>
                        </div>
                      </div>

                      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                          Stories & Quizzes synchronized in real-time
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('lessons')}
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                        >
                          View All →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Recent Registrations Table */}
                  <div className="admin-panel-card">
                    <div className="admin-panel-header">
                      <div>
                        <h3 className="admin-panel-title">Recent User Registrations</h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                          Latest students registered on the platform
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('users')}
                        className="admin-btn admin-btn-secondary"
                      >
                        View Full Directory ({members.length}) →
                      </button>
                    </div>

                    <div className="admin-table-container">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Registered Date</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.slice(0, 5).map((m) => (
                            <tr key={m.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                  <div
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: '50%',
                                      background: m.role === 'admin' ? '#f3e8ff' : '#e0f2fe',
                                      color: m.role === 'admin' ? '#7e22ce' : '#0369a1',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.82rem',
                                    }}
                                  >
                                    {m.fullName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.fullName}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{m.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`status-pill ${m.role}`}>
                                  {m.role === 'admin' ? '🛡️ Admin' : '🎓 Student'}
                                </span>
                              </td>
                              <td>
                                <span className={`status-pill ${m.verificationStatus}`}>
                                  {m.verificationStatus === 'verified' && '✅ Verified'}
                                  {m.verificationStatus === 'pending' && '⏳ Pending Review'}
                                  {m.verificationStatus === 'suspended' && '🚫 Suspended'}
                                </span>
                              </td>
                              <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                {new Date(m.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {m.verificationStatus === 'pending' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleVerify(m.id, 'verified')}
                                    disabled={actionLoadingId === m.id}
                                    className="admin-btn admin-btn-success"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                  >
                                    Approve
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedUser(m)}
                                    className="admin-btn admin-btn-secondary"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                  >
                                    View
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 2: USER DIRECTORY --- */}
              {activeTab === 'users' && (
                <div className="admin-panel-card">
                  <div className="admin-panel-header">
                    <div>
                      <h3 className="admin-panel-title">User Directory & Permissions</h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Manage student accounts, approvals, role promotions, and suspensions
                      </p>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
                      Showing {filteredMembers.length} of {members.length} members
                    </span>
                  </div>

                  {/* Filters Bar */}
                  <div className="admin-filters-bar">
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Search by name, email, or user ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* Status Tabs */}
                      {[
                        { key: 'all', label: `All (${members.length})` },
                        { key: 'verified', label: `Approved (${members.filter(m => isAccountApproved(m.verificationStatus)).length})` },
                        { key: 'pending', label: `Pending (${members.filter(m => m.verificationStatus === 'pending').length})` },
                        { key: 'rejected', label: `Rejected (${members.filter(m => m.verificationStatus === 'rejected').length})` },
                        { key: 'suspended', label: `Suspended (${members.filter(m => m.verificationStatus === 'suspended').length})` },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setUserStatusFilter(key as any)}
                          className={`admin-btn ${userStatusFilter === key ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                        >
                          {label}
                        </button>
                      ))}

                      {/* Sort Order Selector */}
                      <select
                        value={userSortOrder}
                        onChange={(e) => setUserSortOrder(e.target.value as any)}
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '0.45rem 0.75rem', cursor: 'pointer', background: '#ffffff' }}
                        aria-label="Sort users"
                      >
                        <option value="newest">📅 Newest First</option>
                        <option value="oldest">📅 Oldest First</option>
                        <option value="name">🔤 Name (A-Z)</option>
                      </select>

                      {/* Role Tabs */}
                      {(['all', 'user', 'admin'] as const).map((rl) => (
                        <button
                          key={rl}
                          type="button"
                          onClick={() => setUserRoleFilter(rl)}
                          className={`admin-btn ${userRoleFilter === rl ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                        >
                          {rl === 'all' ? 'All Roles' : rl === 'admin' ? 'Admins' : 'Students'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="admin-table-container">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Member Profile</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Session</th>
                          <th>Registered</th>
                          <th>Last Active</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                              No members match your search criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((m) => {
                            const isMaster = m.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
                            return (
                              <tr key={m.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <div
                                      style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        background: m.role === 'admin' ? '#f3e8ff' : '#e0f2fe',
                                        color: m.role === 'admin' ? '#7e22ce' : '#0369a1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: '0.9rem',
                                      }}
                                    >
                                      {m.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        {m.fullName}
                                        {isMaster && (
                                          <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.4rem', borderRadius: 999 }}>
                                            Master
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{m.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className={`status-pill ${m.role}`}>
                                    {m.role === 'admin' ? '🛡️ Admin' : '🎓 Student'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`status-pill ${isAccountApproved(m.verificationStatus) ? 'verified' : m.verificationStatus}`}>
                                    {isAccountApproved(m.verificationStatus) && '✅ Approved'}
                                    {m.verificationStatus === 'pending' && '⏳ Pending Review'}
                                    {m.verificationStatus === 'suspended' && '🚫 Suspended'}
                                    {m.verificationStatus === 'rejected' && '❌ Rejected'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                    <span
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: m.sessionStatus === 'logged_in' ? '#22c55e' : '#cbd5e1',
                                      }}
                                    />
                                    {m.sessionStatus === 'logged_in' ? 'Online' : 'Offline'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  {new Date(m.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  {m.lastActiveAt ? new Date(m.lastActiveAt).toLocaleDateString() : '—'}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedUser(m)}
                                      className="admin-btn admin-btn-secondary"
                                      title="View details"
                                      style={{ padding: '0.35rem 0.6rem' }}
                                    >
                                      Details
                                    </button>

                                    {m.verificationStatus === 'pending' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleApproveMember(m.id)}
                                          disabled={actionLoadingId === m.id}
                                          className="admin-btn admin-btn-success"
                                          style={{ padding: '0.35rem 0.6rem' }}
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRejectMember(m.id)}
                                          disabled={actionLoadingId === m.id}
                                          className="admin-btn admin-btn-secondary"
                                          style={{ color: '#dc2626', padding: '0.35rem 0.6rem' }}
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}

                                    {m.verificationStatus === 'rejected' && (
                                      <button
                                        type="button"
                                        onClick={() => handleApproveMember(m.id)}
                                        disabled={actionLoadingId === m.id}
                                        className="admin-btn admin-btn-success"
                                        style={{ padding: '0.35rem 0.6rem' }}
                                      >
                                        Approve
                                      </button>
                                    )}

                                    {!isMaster && isAccountApproved(m.verificationStatus) && (
                                      <button
                                        type="button"
                                        onClick={() => handleSuspend(m.id)}
                                        disabled={actionLoadingId === m.id}
                                        className="admin-btn admin-btn-secondary"
                                        style={{ color: '#dc2626', padding: '0.35rem 0.6rem' }}
                                      >
                                        Suspend
                                      </button>
                                    )}

                                    {!isMaster && m.verificationStatus === 'suspended' && (
                                      <button
                                        type="button"
                                        onClick={() => handleReactivate(m.id)}
                                        disabled={actionLoadingId === m.id}
                                        className="admin-btn admin-btn-success"
                                        style={{ padding: '0.35rem 0.6rem' }}
                                      >
                                        Reactivate
                                      </button>
                                    )}

                                    {!isMaster && (
                                      <button
                                        type="button"
                                        onClick={() => handleRoleToggle(m.id, m.role)}
                                        disabled={actionLoadingId === m.id}
                                        className="admin-btn admin-btn-secondary"
                                        style={{ padding: '0.35rem 0.6rem' }}
                                        title={m.role === 'admin' ? 'Demote to Student' : 'Promote to Admin'}
                                      >
                                        {m.role === 'admin' ? 'Demote' : 'Promote'}
                                      </button>
                                    )}

                                    {!isMaster && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMember(m.id, m.email)}
                                        disabled={actionLoadingId === m.id}
                                        className="admin-btn admin-btn-danger"
                                        style={{ padding: '0.35rem 0.6rem' }}
                                        title="Delete user"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --- TAB 3: PENDING REGISTRATION QUEUE --- */}
              {activeTab === 'notifications' && (
                <div className="admin-panel-card">
                  <div className="admin-panel-header">
                    <div>
                      <h3 className="admin-panel-title">Registration Approval Queue</h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Review student registration requests before granting platform access
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setNotifView('pending')}
                        className={`admin-btn ${notifView === 'pending' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                      >
                        Pending Review ({pendingNotifs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifView('all')}
                        className={`admin-btn ${notifView === 'all' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                      >
                        All History ({notifications.length})
                      </button>
                    </div>
                  </div>

                  {displayedNotifs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
                      <h4 style={{ margin: '0 0 0.35rem 0', color: '#0f172a', fontWeight: 800 }}>Queue is all clear!</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>No student registrations found for this view.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {displayedNotifs.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            padding: '1.25rem',
                            borderRadius: '0.75rem',
                            border: '1px solid #fed7aa',
                            background: '#fffaf0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: '50%',
                                background: '#fef3c7',
                                color: '#b45309',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '1.1rem',
                              }}
                            >
                              {n.fullName ? n.fullName.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                                {n.fullName}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                                {n.email} • Registered {new Date(n.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {n.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveNotif(n.id, 'user')}
                                  disabled={actionLoadingId === n.id}
                                  className="admin-btn admin-btn-success"
                                  style={{ padding: '0.5rem 1rem' }}
                                >
                                  Approve Student
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectNotif(n.id)}
                                  disabled={actionLoadingId === n.id}
                                  className="admin-btn admin-btn-danger"
                                  style={{ padding: '0.5rem 1rem' }}
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className={`status-pill ${n.status === 'approved' ? 'verified' : n.status}`}>
                                {n.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 4: LESSONS MANAGEMENT --- */}
              {activeTab === 'lessons' && (
                <div className="admin-panel-card">
                  <div className="admin-panel-header">
                    <div>
                      <h3 className="admin-panel-title">Lessons Generated by Students</h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Live catalog of interactive AI lessons generated on the platform
                      </p>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                      {filteredLessons.length} lessons found
                    </span>
                  </div>

                  <div className="admin-filters-bar">
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Filter by topic, title, or student email..."
                      value={lessonSearch}
                      onChange={(e) => setLessonSearch(e.target.value)}
                    />
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Topic / Title</th>
                          <th>Generated By</th>
                          <th>Language</th>
                          <th>Difficulty</th>
                          <th>Key Points</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLessons.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
                              No lessons generated yet. Lessons generated by students will automatically appear here.
                            </td>
                          </tr>
                        ) : (
                          filteredLessons.map((l, idx) => (
                            <tr key={`${l.id}-${idx}`}>
                              <td>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{l.topic}</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{l.title || 'Interactive Lesson'}</div>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                                  {l.userEmail || l.userId}
                                </span>
                              </td>
                              <td>
                                <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                                  {l.language || 'en'}
                                </span>
                              </td>
                              <td>
                                <span style={{ textTransform: 'capitalize', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                                  {l.difficulty || 'intermediate'}
                                </span>
                              </td>
                              <td style={{ fontWeight: 700, color: '#0f172a' }}>
                                {l.keyPoints?.length || 0} points
                              </td>
                              <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                {l.createdAtString ? new Date(l.createdAtString).toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --- TAB 5: QUIZZES MANAGEMENT --- */}
              {activeTab === 'quizzes' && (
                <div className="admin-panel-card">
                  <div className="admin-panel-header">
                    <div>
                      <h3 className="admin-panel-title">Assessments & Quiz Submissions</h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Live student quiz scores and performance history
                      </p>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                      {filteredQuizzes.length} quiz submissions
                    </span>
                  </div>

                  <div className="admin-filters-bar">
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Filter by student email or topic..."
                      value={quizSearch}
                      onChange={(e) => setQuizSearch(e.target.value)}
                    />
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Topic</th>
                          <th>Score</th>
                          <th>Performance</th>
                          <th>Completed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQuizzes.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
                              No quiz attempts recorded yet. Student quiz submissions will appear here automatically.
                            </td>
                          </tr>
                        ) : (
                          filteredQuizzes.map((q) => (
                            <tr key={q.id}>
                              <td>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{q.userName || 'Student'}</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{q.userEmail}</div>
                              </td>
                              <td style={{ fontWeight: 600, color: '#334155' }}>
                                {q.topic}
                              </td>
                              <td style={{ fontWeight: 800, color: '#0f172a' }}>
                                {q.score} / {q.total}
                              </td>
                              <td>
                                <span
                                  className="status-pill"
                                  style={{
                                    background: q.percentage >= 80 ? '#dcfce7' : q.percentage >= 60 ? '#fef3c7' : '#fee2e2',
                                    color: q.percentage >= 80 ? '#166534' : q.percentage >= 60 ? '#92400e' : '#991b1b',
                                  }}
                                >
                                  {q.percentage}%
                                </span>
                              </td>
                              <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                {new Date(q.completedAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --- TAB 6: SECURITY & AUDIT LOGS --- */}
              {activeTab === 'audit' && (
                <div>
                  <div className="admin-panel-card">
                    <div className="admin-panel-header">
                      <div>
                        <h3 className="admin-panel-title">🛡️ Login & Access Security Audit Trail</h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                          Real-time authentication events, IP addresses, and user agent records
                        </p>
                      </div>
                      <span className="status-pill verified">
                        {loginAudits.length} events logged
                      </span>
                    </div>

                    <div className="admin-table-container">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>Email Address</th>
                            <th>Status</th>
                            <th>IP Address</th>
                            <th>Client Browser</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loginAudits.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                No login audit records available.
                              </td>
                            </tr>
                          ) : (
                            loginAudits.slice(0, 50).map((l) => (
                              <tr key={l.id}>
                                <td style={{ fontWeight: 600 }}>{l.email}</td>
                                <td>
                                  <span className={`status-pill ${l.success ? 'verified' : 'suspended'}`}>
                                    {l.success ? 'Success' : l.reason || 'Failed'}
                                  </span>
                                </td>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.ip || '127.0.0.1'}</td>
                                <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{l.browser || l.userAgent || 'Desktop'}</td>
                                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(l.timestamp).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="admin-panel-card">
                    <div className="admin-panel-header">
                      <div>
                        <h3 className="admin-panel-title">⚡ Administrator Mutation Audit Trail</h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                          Verified log of administrative actions, user approvals, and setting changes
                        </p>
                      </div>
                      <span className="status-pill admin">
                        {adminAudits.length} actions logged
                      </span>
                    </div>

                    <div className="admin-table-container">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>Admin Email</th>
                            <th>Target User</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminAudits.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                No administrative actions recorded.
                              </td>
                            </tr>
                          ) : (
                            adminAudits.slice(0, 50).map((a) => (
                              <tr key={a.id}>
                                <td>
                                  <span style={{ fontWeight: 700, color: '#0f172a', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.78rem' }}>
                                    {a.action}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{a.adminEmail}</td>
                                <td style={{ color: '#475569' }}>{a.targetEmail || a.targetId || '—'}</td>
                                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(a.timestamp).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 7: SYSTEM SETTINGS --- */}
              {activeTab === 'settings' && (
                <div className="admin-panel-card">
                  <div className="admin-panel-header">
                    <div>
                      <h3 className="admin-panel-title">Global Platform Configuration</h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Controls system-wide generation toggles, registration approvals, and safety rules
                      </p>
                    </div>
                    {settingsSaving && <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>Saving changes...</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>AI Story Generation</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>When paused, users cannot generate new stories. Public sample lessons remain readable.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings?.storyGenerationEnabled ?? true}
                        onChange={(e) => handleToggleSetting('storyGenerationEnabled', e.target.checked)}
                        style={{ width: 22, height: 22, cursor: 'pointer' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>Mandatory Admin Approval</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Newly registered accounts must be approved by Muni before gaining access.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings?.userApprovalRequired ?? true}
                        onChange={(e) => handleToggleSetting('userApprovalRequired', e.target.checked)}
                        style={{ width: 22, height: 22, cursor: 'pointer' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>Strict Content Safety Mode</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Enforces high-safety pedagogical filters on AI generated stories.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings?.contentSafetyStrict ?? true}
                        onChange={(e) => handleToggleSetting('contentSafetyStrict', e.target.checked)}
                        style={{ width: 22, height: 22, cursor: 'pointer' }}
                      />
                    </div>

                    <div style={{ padding: '1.25rem', background: '#eff6ff', borderRadius: '0.75rem', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '0.25rem' }}>Active AI Engine</div>
                      <div style={{ fontSize: '0.85rem', color: '#1e3a8a' }}>
                        Model: <strong>gemini-3.5-flash-lite</strong> via Google AI Studio Free Tier. Configured exclusively for visual point-wise educational story generation.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* User Details Modal */}
          {selectedUser && (
            <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
              <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Student Member Details</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      background: selectedUser.role === 'admin' ? '#f3e8ff' : '#e0f2fe',
                      color: selectedUser.role === 'admin' ? '#7e22ce' : '#0369a1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.25rem',
                    }}
                  >
                    {selectedUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{selectedUser.fullName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{selectedUser.email}</div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                      <span className={`status-pill ${selectedUser.role}`}>{selectedUser.role}</span>
                      <span className={`status-pill ${selectedUser.verificationStatus}`}>{selectedUser.verificationStatus}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>Member ID</div>
                    <div style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 700 }}>{selectedUser.id}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>Registration Date</div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>{new Date(selectedUser.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>Last Active</div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>{selectedUser.lastActiveAt ? new Date(selectedUser.lastActiveAt).toLocaleString() : '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>Session Status</div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>{selectedUser.sessionStatus}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  {selectedUser.verificationStatus === 'pending' && (
                    <button
                      type="button"
                      onClick={() => { handleVerify(selectedUser.id, 'verified'); setSelectedUser(null); }}
                      className="admin-btn admin-btn-success"
                    >
                      Approve Member
                    </button>
                  )}
                  {selectedUser.verificationStatus === 'verified' && selectedUser.email !== MASTER_ADMIN_EMAIL && (
                    <button
                      type="button"
                      onClick={() => { handleSuspend(selectedUser.id); setSelectedUser(null); }}
                      className="admin-btn admin-btn-danger"
                    >
                      Suspend Account
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="admin-btn admin-btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};

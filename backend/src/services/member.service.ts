import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  MemberRecord,
  AdminStats,
  AdminNotification,
  UserRole,
  MemberVerificationStatus,
  MemberSessionStatus,
  MAX_ADMIN_LIMIT,
  LoginAuditEvent,
  AdminAuditEvent,
  SystemSettings,
  QuizAttemptRecord,
  Story,
  LearningProgress,
} from '@ai-toon/shared';

import os from 'os';

let serviceDir = process.cwd();
try {
  if (typeof import.meta !== 'undefined' && import.meta?.url) {
    serviceDir = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  // fallback to cwd
}

function resolveDataDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'backend/data'),
    path.resolve(process.cwd(), 'data'),
    path.resolve(serviceDir, '../../data'),
    path.resolve(serviceDir, '../data'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        fs.accessSync(c, fs.constants.W_OK);
        return c;
      } catch {
        // Not writable
      }
    }
  }

  try {
    const defaultDir = candidates[0];
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.accessSync(defaultDir, fs.constants.W_OK);
    return defaultDir;
  } catch {
    const tmpDir = path.resolve(os.tmpdir(), 'ai-toon-data');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch {
        // ignore
      }
    }
    // Copy bundled seed data to writable tmpDir if not already present
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          const files = fs.readdirSync(cand);
          for (const f of files) {
            const dest = path.resolve(tmpDir, f);
            if (!fs.existsSync(dest) && f.endsWith('.json')) {
              fs.copyFileSync(path.resolve(cand, f), dest);
            }
          }
          break;
        } catch {
          // ignore
        }
      }
    }
    return tmpDir;
  }
}

const DATA_DIR = resolveDataDir();
const DATA_FILE = path.resolve(DATA_DIR, 'members.json');
const NOTIFICATIONS_FILE = path.resolve(DATA_DIR, 'notifications.json');
const LOGIN_AUDIT_FILE = path.resolve(DATA_DIR, 'login-audit.json');
const ADMIN_AUDIT_FILE = path.resolve(DATA_DIR, 'admin-audit.json');
const SETTINGS_FILE = path.resolve(DATA_DIR, 'settings.json');
const QUIZ_ATTEMPTS_FILE = path.resolve(DATA_DIR, 'quiz-attempts.json');
const USER_STORIES_FILE = path.resolve(DATA_DIR, 'user-stories.json');

export const MASTER_ADMIN_EMAIL = 'muni57575751@gmail.com';
export const MASTER_ADMIN_PASSWORD = 'Poola@1234';

const INITIAL_MEMBERS: MemberRecord[] = [
  {
    id: 'admin-muni-master',
    email: MASTER_ADMIN_EMAIL,
    fullName: 'Muni (Super Admin)',
    password: MASTER_ADMIN_PASSWORD,
    role: 'admin',
    verificationStatus: 'verified',
    sessionStatus: 'logged_out',
    lastActiveAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
    verifiedBy: 'System Master Root',
  },
];

const DEFAULT_SETTINGS: SystemSettings = {
  userApprovalRequired: true,
  storyGenerationEnabled: true,
  aiModel: 'gemini-3.5-flash-lite',
  maxStoryLength: 5,
  searchProvider: 'wikipedia-wikimedia',
  imageProvider: 'wikimedia',
  supportedLanguages: ['en', 'te', 'hi', 'es', 'fr', 'de', 'ta'],
  contentSafetyStrict: true,
  dataRetentionDays: 90,
};

export class MemberService {
  private members: Map<string, MemberRecord> = new Map();
  private notifications: Map<string, AdminNotification> = new Map();
  private loginAudit: LoginAuditEvent[] = [];
  private adminAudit: AdminAuditEvent[] = [];
  private quizAttempts: QuizAttemptRecord[] = [];
  private userStories: Map<string, Story[]> = new Map(); // userId -> Story[]
  private settings: SystemSettings = { ...DEFAULT_SETTINGS };

  constructor() {
    this.initStore();
  }

  private initStore(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // 1. Members
      let resetNeeded = false;
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        try {
          const list: MemberRecord[] = JSON.parse(raw);
          if (list.some((m) => m.email === 'admin@aitoon.edu' || m.email.includes('@aitoon.edu'))) {
            resetNeeded = true;
          } else {
            for (const item of list) {
              this.members.set(item.id, item);
            }
          }
        } catch {
          resetNeeded = true;
        }
      } else {
        resetNeeded = true;
      }

      if (resetNeeded || !this.getMemberByEmail(MASTER_ADMIN_EMAIL)) {
        this.members.clear();
        for (const item of INITIAL_MEMBERS) {
          this.members.set(item.id, item);
        }
        this.saveToFile();
      }

      // 2. Notifications
      if (fs.existsSync(NOTIFICATIONS_FILE)) {
        try {
          const raw = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
          const notifs: AdminNotification[] = JSON.parse(raw);
          for (const n of notifs) {
            this.notifications.set(n.id, n);
          }
        } catch {
          this.notifications.clear();
          this.saveNotificationsToFile();
        }
      }

      // 3. Login Audit
      if (fs.existsSync(LOGIN_AUDIT_FILE)) {
        try {
          this.loginAudit = JSON.parse(fs.readFileSync(LOGIN_AUDIT_FILE, 'utf-8'));
        } catch {
          this.loginAudit = [];
        }
      }

      // 4. Admin Audit
      if (fs.existsSync(ADMIN_AUDIT_FILE)) {
        try {
          this.adminAudit = JSON.parse(fs.readFileSync(ADMIN_AUDIT_FILE, 'utf-8'));
        } catch {
          this.adminAudit = [];
        }
      }

      // 5. Settings
      if (fs.existsSync(SETTINGS_FILE)) {
        try {
          this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) };
        } catch {
          this.settings = { ...DEFAULT_SETTINGS };
        }
      }

      // 6. Quiz Attempts
      if (fs.existsSync(QUIZ_ATTEMPTS_FILE)) {
        try {
          this.quizAttempts = JSON.parse(fs.readFileSync(QUIZ_ATTEMPTS_FILE, 'utf-8'));
        } catch {
          this.quizAttempts = [];
        }
      }

      // 7. User Stories
      if (fs.existsSync(USER_STORIES_FILE)) {
        try {
          const raw = JSON.parse(fs.readFileSync(USER_STORIES_FILE, 'utf-8')) as Record<string, Story[]>;
          for (const [uid, stories] of Object.entries(raw)) {
            this.userStories.set(uid, stories);
          }
        } catch {
          this.userStories.clear();
        }
      }
    } catch (err) {
      console.warn('[MemberService] Could not access local storage file, using in-memory store:', err);
      this.members.clear();
      for (const item of INITIAL_MEMBERS) {
        this.members.set(item.id, item);
      }
    }
  }

  private saveToFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(this.members.values()), null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemberService] Failed to persist members to disk:', err);
    }
  }

  private saveNotificationsToFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(Array.from(this.notifications.values()), null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemberService] Failed to persist notifications to disk:', err);
    }
  }

  private saveLoginAuditToFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(LOGIN_AUDIT_FILE, JSON.stringify(this.loginAudit.slice(-200), null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemberService] Failed to persist login audit to disk:', err);
    }
  }

  private saveAdminAuditToFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ADMIN_AUDIT_FILE, JSON.stringify(this.adminAudit.slice(-200), null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemberService] Failed to persist admin audit to disk:', err);
    }
  }

  private saveSettingsToFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemberService] Failed to persist settings to disk:', err);
    }
  }

  private saveQuizAttemptsToFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(QUIZ_ATTEMPTS_FILE, JSON.stringify(this.quizAttempts.slice(-500), null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemberService] Failed to persist quiz attempts to disk:', err);
    }
  }

  private saveUserStoriesToFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const record: Record<string, Story[]> = {};
      for (const [uid, stories] of this.userStories.entries()) {
        record[uid] = stories.slice(-50);
      }
      fs.writeFileSync(USER_STORIES_FILE, JSON.stringify(record, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemberService] Failed to persist user stories to disk:', err);
    }
  }

  // --- Member Retrieval & Statistics ---

  public getAllMembers(filter?: {
    search?: string;
    status?: MemberSessionStatus;
    role?: UserRole;
    verificationStatus?: MemberVerificationStatus;
  }): MemberRecord[] {
    let list = Array.from(this.members.values());

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
      );
    }

    if (filter?.status) {
      list = list.filter((m) => m.sessionStatus === filter.status);
    }

    if (filter?.role) {
      list = list.filter((m) => m.role === filter.role);
    }

    if (filter?.verificationStatus) {
      list = list.filter((m) => m.verificationStatus === filter.verificationStatus);
    }

    // Sort: admins first, then logged_in members, then latest activity
    return list.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      if (a.sessionStatus === 'logged_in' && b.sessionStatus !== 'logged_in') return -1;
      if (a.sessionStatus !== 'logged_in' && b.sessionStatus === 'logged_in') return 1;
      return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    });
  }

  public getMemberById(id: string): MemberRecord | undefined {
    return this.members.get(id);
  }

  public getMemberByEmail(email: string): MemberRecord | undefined {
    const normalized = email.toLowerCase().trim();
    for (const m of this.members.values()) {
      if (m.email.toLowerCase().trim() === normalized) {
        return m;
      }
    }
    return undefined;
  }

  public getAdminCount(): number {
    let count = 0;
    for (const m of this.members.values()) {
      if (m.role === 'admin') count++;
    }
    return count;
  }

  public getStats(): AdminStats {
    let loggedInCount = 0;
    let loggedOutCount = 0;
    let adminCount = 0;
    let userCount = 0;
    let pendingCount = 0;
    let suspendedCount = 0;
    let unreadNotificationsCount = 0;

    for (const m of this.members.values()) {
      if (m.sessionStatus === 'logged_in') loggedInCount++;
      else loggedOutCount++;

      if (m.role === 'admin') adminCount++;
      else userCount++;

      if (m.verificationStatus === 'pending') pendingCount++;
      if (m.verificationStatus === 'suspended') suspendedCount++;
    }

    for (const n of this.notifications.values()) {
      if (!n.read && n.status === 'pending') {
        unreadNotificationsCount++;
      }
    }

    let totalLessonsGenerated = 0;
    for (const stories of this.userStories.values()) {
      totalLessonsGenerated += stories.length;
    }
    const totalQuizzesCompleted = this.quizAttempts.length;
    const averageQuizScore =
      totalQuizzesCompleted === 0
        ? 0
        : Math.round(
            this.quizAttempts.reduce((acc, q) => acc + (q.percentage || 0), 0) /
              totalQuizzesCompleted
          );

    return {
      totalMembers: this.members.size,
      loggedInCount,
      loggedOutCount,
      adminCount,
      maxAdmins: MAX_ADMIN_LIMIT,
      userCount,
      pendingCount,
      suspendedCount,
      unreadNotificationsCount,
      totalLessonsGenerated,
      totalQuizzesCompleted,
      averageQuizScore,
    };
  }

  // --- Authentication with Login Audit Logging ---

  public authenticate(
    email: string,
    password: string,
    meta?: { ip?: string; browser?: string; userAgent?: string }
  ): {
    success: boolean;
    member?: MemberRecord;
    code?: string;
    error?: string;
  } {
    const normalized = email.toLowerCase().trim();

    // Check Master Admin
    if (normalized === MASTER_ADMIN_EMAIL.toLowerCase()) {
      if (password === MASTER_ADMIN_PASSWORD) {
        let master = this.getMemberByEmail(MASTER_ADMIN_EMAIL);
        if (!master) {
          master = INITIAL_MEMBERS[0];
          this.members.set(master.id, master);
        }
        master.sessionStatus = 'logged_in';
        master.lastLoginAt = new Date().toISOString();
        master.lastActiveAt = new Date().toISOString();
        this.saveToFile();

        this.recordLoginAttempt({
          userId: master.id,
          email: master.email,
          success: true,
          ip: meta?.ip,
          browser: meta?.browser,
          userAgent: meta?.userAgent,
        });

        return { success: true, member: master };
      } else {
        this.recordLoginAttempt({
          email: normalized,
          success: false,
          reason: 'Invalid administrator password',
          ip: meta?.ip,
          browser: meta?.browser,
          userAgent: meta?.userAgent,
        });

        return {
          success: false,
          code: 'INVALID_CREDENTIALS',
          error: 'Invalid administrator credentials. Please check your password.',
        };
      }
    }

    // Normal User Authentication
    const member = this.getMemberByEmail(normalized);
    if (!member) {
      this.recordLoginAttempt({
        email: normalized,
        success: false,
        reason: 'Account not found',
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent,
      });

      return {
        success: false,
        code: 'USER_NOT_FOUND',
        error: 'No account found with this email. Please create an account first.',
      };
    }

    // Verify Password if recorded
    if (member.password && member.password !== password) {
      this.recordLoginAttempt({
        userId: member.id,
        email: member.email,
        success: false,
        reason: 'Incorrect password',
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent,
      });

      return {
        success: false,
        code: 'INVALID_PASSWORD',
        error: 'Invalid password. Please check your password.',
      };
    }

    // Verify Approval & Suspension Status
    if (member.verificationStatus === 'pending') {
      this.recordLoginAttempt({
        userId: member.id,
        email: member.email,
        success: false,
        reason: 'Pending administrator approval',
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent,
      });

      return {
        success: false,
        code: 'PENDING_APPROVAL',
        error: `Your account registration is awaiting approval from the Administrator (${MASTER_ADMIN_EMAIL}). A notification has been sent to the admin portal. You will be able to log in once approved.`,
      };
    }

    if (member.verificationStatus === 'suspended') {
      this.recordLoginAttempt({
        userId: member.id,
        email: member.email,
        success: false,
        reason: 'Account suspended',
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent,
      });

      return {
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        error: 'Your account has been suspended by an administrator. Please contact support.',
      };
    }

    if (member.verificationStatus === 'rejected') {
      this.recordLoginAttempt({
        userId: member.id,
        email: member.email,
        success: false,
        reason: 'Account rejected',
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent,
      });

      return {
        success: false,
        code: 'ACCOUNT_REJECTED',
        error: 'Your account registration was not approved by the administrator.',
      };
    }

    // Approved member login
    member.sessionStatus = 'logged_in';
    member.lastLoginAt = new Date().toISOString();
    member.lastActiveAt = new Date().toISOString();
    this.members.set(member.id, member);
    this.saveToFile();

    this.recordLoginAttempt({
      userId: member.id,
      email: member.email,
      success: true,
      ip: meta?.ip,
      browser: meta?.browser,
      userAgent: meta?.userAgent,
    });

    return { success: true, member };
  }

  // --- Registration & Notification ---

  public register(
    name: string,
    email: string,
    password: string
  ): {
    success: boolean;
    member?: MemberRecord;
    notification?: AdminNotification;
    error?: string;
    pendingApproval?: boolean;
  } {
    const normalized = email.toLowerCase().trim();

    if (normalized === MASTER_ADMIN_EMAIL.toLowerCase()) {
      return {
        success: false,
        error: 'This email is reserved for the Master Administrator. Please sign in instead.',
      };
    }

    if (this.getMemberByEmail(normalized)) {
      return {
        success: false,
        error: 'An account with this email address already exists.',
      };
    }

    const now = new Date().toISOString();
    const newMemberId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Check system settings for auto-approval vs manual approval
    const initialStatus: MemberVerificationStatus = this.settings.userApprovalRequired ? 'pending' : 'verified';

    const newMember: MemberRecord = {
      id: newMemberId,
      email: normalized,
      fullName: name.trim(),
      password,
      role: 'user',
      verificationStatus: initialStatus,
      sessionStatus: 'logged_out',
      lastActiveAt: now,
      lastLoginAt: now,
      createdAt: now,
      verifiedAt: initialStatus === 'verified' ? now : undefined,
      verifiedBy: initialStatus === 'verified' ? 'System (Auto-Approval)' : undefined,
    };

    this.members.set(newMember.id, newMember);
    this.saveToFile();

    // Create Admin Notification
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const notification: AdminNotification = {
      id: notifId,
      type: 'NEW_REGISTRATION',
      memberId: newMember.id,
      fullName: newMember.fullName,
      email: newMember.email,
      createdAt: now,
      read: false,
      status: initialStatus === 'verified' ? 'approved' : 'pending',
    };

    this.notifications.set(notification.id, notification);
    this.saveNotificationsToFile();

    return {
      success: true,
      pendingApproval: initialStatus === 'pending',
      member: newMember,
      notification,
    };
  }

  // --- Notifications Management ---

  public getNotifications(): AdminNotification[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public approveNotification(
    notificationId: string,
    role: UserRole = 'user',
    adminEmail: string = MASTER_ADMIN_EMAIL
  ): { success: boolean; member?: MemberRecord; notification?: AdminNotification; error?: string } {
    const notif = this.notifications.get(notificationId);
    if (!notif) {
      return { success: false, error: 'Notification not found.' };
    }

    const member = this.getMemberById(notif.memberId) || this.getMemberByEmail(notif.email);
    if (!member) {
      return { success: false, error: 'Corresponding member not found.' };
    }

    if (role === 'admin' && member.role !== 'admin') {
      const currentAdmins = this.getAdminCount();
      if (currentAdmins >= MAX_ADMIN_LIMIT) {
        return {
          success: false,
          error: `Cannot approve as Admin. Maximum limit of ${MAX_ADMIN_LIMIT} administrators has been reached (${currentAdmins}/${MAX_ADMIN_LIMIT}).`,
        };
      }
      member.role = 'admin';
    } else {
      member.role = role;
    }

    const now = new Date().toISOString();
    member.verificationStatus = 'verified';
    member.verifiedAt = now;
    member.verifiedBy = adminEmail;
    this.members.set(member.id, member);
    this.saveToFile();

    notif.status = 'approved';
    notif.read = true;
    notif.actionedAt = now;
    notif.actionedBy = adminEmail;
    notif.approvedRole = member.role;
    this.notifications.set(notif.id, notif);
    this.saveNotificationsToFile();

    this.recordAdminAction({
      adminId: 'admin',
      adminEmail,
      action: 'APPROVE_ACCOUNT',
      targetId: member.id,
      targetEmail: member.email,
      details: { role: member.role },
    });

    return { success: true, member, notification: notif };
  }

  public rejectNotification(
    notificationId: string,
    adminEmail: string = MASTER_ADMIN_EMAIL
  ): { success: boolean; member?: MemberRecord; notification?: AdminNotification; error?: string } {
    const notif = this.notifications.get(notificationId);
    if (!notif) {
      return { success: false, error: 'Notification not found.' };
    }

    const member = this.getMemberById(notif.memberId) || this.getMemberByEmail(notif.email);
    if (member) {
      member.verificationStatus = 'rejected';
      this.members.set(member.id, member);
      this.saveToFile();
    }

    const now = new Date().toISOString();
    notif.status = 'rejected';
    notif.read = true;
    notif.actionedAt = now;
    notif.actionedBy = adminEmail;
    this.notifications.set(notif.id, notif);
    this.saveNotificationsToFile();

    this.recordAdminAction({
      adminId: 'admin',
      adminEmail,
      action: 'REJECT_ACCOUNT',
      targetId: member?.id,
      targetEmail: member?.email,
    });

    return { success: true, member, notification: notif };
  }

  public markNotificationsRead(): void {
    for (const n of this.notifications.values()) {
      n.read = true;
    }
    this.saveNotificationsToFile();
  }

  // --- Session Status & Updates ---

  public updateSessionStatus(
    userId: string,
    email: string,
    fullName?: string,
    status: MemberSessionStatus = 'logged_in'
  ): MemberRecord {
    const existing = this.getMemberById(userId) || this.getMemberByEmail(email);
    const now = new Date().toISOString();

    if (existing) {
      existing.sessionStatus = status;
      existing.lastActiveAt = now;
      if (status === 'logged_in') {
        existing.lastLoginAt = now;
      }
      if (fullName && existing.fullName === 'Student') {
        existing.fullName = fullName;
      }
      this.members.set(existing.id, existing);
      this.saveToFile();
      return existing;
    }

    // New member created directly via session ping
    const initialStatus: MemberVerificationStatus = this.settings.userApprovalRequired ? 'pending' : 'verified';
    const newMember: MemberRecord = {
      id: userId,
      email,
      fullName: fullName || email.split('@')[0] || 'New Member',
      role: 'user',
      verificationStatus: initialStatus,
      sessionStatus: status,
      lastActiveAt: now,
      lastLoginAt: now,
      createdAt: now,
      verifiedAt: initialStatus === 'verified' ? now : undefined,
      verifiedBy: initialStatus === 'verified' ? 'System' : undefined,
    };

    this.members.set(newMember.id, newMember);
    this.saveToFile();

    // Trigger notification
    const notif: AdminNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'NEW_REGISTRATION',
      memberId: newMember.id,
      fullName: newMember.fullName,
      email: newMember.email,
      createdAt: now,
      read: false,
      status: initialStatus === 'verified' ? 'approved' : 'pending',
    };
    this.notifications.set(notif.id, notif);
    this.saveNotificationsToFile();

    return newMember;
  }

  // --- Role, Verification, Suspension ---

  public setMemberRole(
    targetId: string,
    newRole: UserRole,
    performedBy: string = MASTER_ADMIN_EMAIL
  ): { success: boolean; member?: MemberRecord; error?: string } {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: `Member with id "${targetId}" not found.` };
    }

    if (newRole === 'admin') {
      const currentAdmins = this.getAdminCount();
      if (target.role !== 'admin' && currentAdmins >= MAX_ADMIN_LIMIT) {
        return {
          success: false,
          error: `Cannot assign Admin role. Maximum limit of ${MAX_ADMIN_LIMIT} administrators has been reached (currently ${currentAdmins}/${MAX_ADMIN_LIMIT}). Please demote an existing admin before promoting another member.`,
        };
      }
    } else if (newRole === 'user' && target.role === 'admin') {
      const currentAdmins = this.getAdminCount();
      if (currentAdmins <= 1) {
        return {
          success: false,
          error: 'Cannot demote the last remaining administrator in the system.',
        };
      }
    }

    const oldRole = target.role;
    target.role = newRole;
    if (newRole === 'admin' && target.verificationStatus === 'pending') {
      target.verificationStatus = 'verified';
      target.verifiedAt = new Date().toISOString();
      target.verifiedBy = performedBy;
    }
    target.lastActiveAt = new Date().toISOString();

    this.members.set(target.id, target);
    this.saveToFile();

    this.recordAdminAction({
      adminId: 'admin',
      adminEmail: performedBy,
      action: 'UPDATE_ROLE',
      targetId: target.id,
      targetEmail: target.email,
      details: { oldRole, newRole },
    });

    return { success: true, member: target };
  }

  public verifyMember(
    targetId: string,
    verificationStatus: MemberVerificationStatus,
    newRole?: UserRole,
    performedBy: string = MASTER_ADMIN_EMAIL
  ): { success: boolean; member?: MemberRecord; error?: string } {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: `Member with id "${targetId}" not found.` };
    }

    if (newRole === 'admin' && target.role !== 'admin') {
      const currentAdmins = this.getAdminCount();
      if (currentAdmins >= MAX_ADMIN_LIMIT) {
        return {
          success: false,
          error: `Cannot set Admin role. Maximum limit of ${MAX_ADMIN_LIMIT} administrators has been reached (${currentAdmins}/${MAX_ADMIN_LIMIT}).`,
        };
      }
      target.role = 'admin';
    } else if (newRole && newRole !== target.role) {
      if (target.role === 'admin' && newRole === 'user') {
        const currentAdmins = this.getAdminCount();
        if (currentAdmins <= 1) {
          return {
            success: false,
            error: 'Cannot demote the last remaining administrator in the system.',
          };
        }
      }
      target.role = newRole;
    }

    target.verificationStatus = verificationStatus;
    if (verificationStatus === 'verified') {
      target.verifiedAt = new Date().toISOString();
      target.verifiedBy = performedBy;
    }
    target.lastActiveAt = new Date().toISOString();

    this.members.set(target.id, target);
    this.saveToFile();

    this.recordAdminAction({
      adminId: 'admin',
      adminEmail: performedBy,
      action: 'VERIFY_MEMBER',
      targetId: target.id,
      targetEmail: target.email,
      details: { verificationStatus, role: target.role },
    });

    return { success: true, member: target };
  }

  public suspendMember(
    targetId: string,
    reason: string = 'Administrative review',
    adminEmail: string = MASTER_ADMIN_EMAIL
  ): { success: boolean; member?: MemberRecord; error?: string } {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: 'Member not found.' };
    }
    if (target.role === 'admin' && this.getAdminCount() <= 1) {
      return { success: false, error: 'Cannot suspend the primary administrator.' };
    }

    target.verificationStatus = 'suspended';
    target.suspendedAt = new Date().toISOString();
    target.suspendedReason = reason;
    target.sessionStatus = 'logged_out'; // immediately terminate active session

    this.members.set(target.id, target);
    this.saveToFile();

    this.recordAdminAction({
      adminId: 'admin',
      adminEmail,
      action: 'SUSPEND_ACCOUNT',
      targetId: target.id,
      targetEmail: target.email,
      details: { reason },
    });

    return { success: true, member: target };
  }

  public reactivateMember(
    targetId: string,
    adminEmail: string = MASTER_ADMIN_EMAIL
  ): { success: boolean; member?: MemberRecord; error?: string } {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: 'Member not found.' };
    }

    target.verificationStatus = 'verified';
    target.suspendedAt = undefined;
    target.suspendedReason = undefined;

    this.members.set(target.id, target);
    this.saveToFile();

    this.recordAdminAction({
      adminId: 'admin',
      adminEmail,
      action: 'REACTIVATE_ACCOUNT',
      targetId: target.id,
      targetEmail: target.email,
    });

    return { success: true, member: target };
  }

  public deleteMember(
    targetId: string,
    adminEmail: string = MASTER_ADMIN_EMAIL
  ): { success: boolean; error?: string } {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: 'Member not found.' };
    }
    if (target.role === 'admin' && this.getAdminCount() <= 1) {
      return { success: false, error: 'Cannot delete the only administrator.' };
    }

    this.members.delete(targetId);
    this.saveToFile();

    this.recordAdminAction({
      adminId: 'admin',
      adminEmail,
      action: 'DELETE_ACCOUNT',
      targetId,
      targetEmail: target.email,
    });

    return { success: true };
  }

  public resetAllExceptMasterAdmin(): void {
    const master = this.getMemberByEmail(MASTER_ADMIN_EMAIL) || INITIAL_MEMBERS[0];
    master.sessionStatus = 'logged_out';
    this.members.clear();
    this.members.set(master.id, master);
    this.notifications.clear();
    this.saveToFile();
    this.saveNotificationsToFile();
  }

  // --- Audit Trails ---

  public recordLoginAttempt(event: Omit<LoginAuditEvent, 'id' | 'timestamp'>): void {
    const logItem: LoginAuditEvent = {
      id: `login_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.loginAudit.unshift(logItem);
    this.saveLoginAuditToFile();
  }

  public getLoginAuditLogs(limit: number = 50): LoginAuditEvent[] {
    return this.loginAudit.slice(0, limit);
  }

  public recordAdminAction(event: Omit<AdminAuditEvent, 'id' | 'timestamp'>): void {
    const logItem: AdminAuditEvent = {
      id: `admin_act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.adminAudit.unshift(logItem);
    this.saveAdminAuditToFile();
  }

  public getAdminAuditLogs(limit: number = 50): AdminAuditEvent[] {
    return this.adminAudit.slice(0, limit);
  }

  // --- System Settings ---

  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<SystemSettings>, adminEmail: string = MASTER_ADMIN_EMAIL): SystemSettings {
    this.settings = { ...this.settings, ...partial };
    this.saveSettingsToFile();

    this.recordAdminAction({
      adminId: 'admin',
      adminEmail,
      action: 'UPDATE_SETTINGS',
      details: partial,
    });

    return { ...this.settings };
  }

  // --- User Saved Stories & Quizzes ---

  public saveUserStory(userId: string, story: Story): Story {
    const list = this.userStories.get(userId) || [];
    // Deduplicate by story ID or topic
    const updated = [story, ...list.filter((s) => s.id !== story.id && s.topic !== story.topic)];
    this.userStories.set(userId, updated);
    this.saveUserStoriesToFile();
    return story;
  }

  public getUserStories(userId: string): Story[] {
    return this.userStories.get(userId) || [];
  }

  public recordQuizAttempt(attempt: Omit<QuizAttemptRecord, 'id' | 'completedAt'>): QuizAttemptRecord {
    const record: QuizAttemptRecord = {
      id: `quiz_att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      completedAt: new Date().toISOString(),
      ...attempt,
    };
    this.quizAttempts.unshift(record);
    this.saveQuizAttemptsToFile();
    return record;
  }

  public getUserQuizAttempts(userId: string): QuizAttemptRecord[] {
    return this.quizAttempts.filter((q) => q.userId === userId);
  }

  public getUserProgress(userId: string): LearningProgress {
    const userStories = this.getUserStories(userId);
    const userQuizzes = this.getUserQuizAttempts(userId);

    const totalStories = userStories.length;
    const totalQuizzes = userQuizzes.length;
    const avgScore =
      totalQuizzes === 0
        ? 0
        : Math.round(userQuizzes.reduce((acc, curr) => acc + curr.percentage, 0) / totalQuizzes);

    const topics = Array.from(new Set(userStories.map((s) => s.topic)));

    return {
      userId,
      totalStoriesRead: totalStories,
      totalQuizzesTaken: totalQuizzes,
      averageQuizScore: avgScore,
      topicsExplored: topics,
      recentStoryIds: userStories.slice(0, 5).map((s) => s.id),
      favoriteStoryIds: userStories.filter((s) => s.isFavorite).map((s) => s.id),
      lastActiveAt: new Date().toISOString(),
    };
  }
  public ensureMemberFromToken(payload: {
    id: string;
    email: string;
    fullName?: string;
    role?: UserRole;
    verificationStatus?: MemberVerificationStatus;
  }): MemberRecord {
    const existing = this.getMemberById(payload.id) || this.getMemberByEmail(payload.email);
    if (existing) {
      return existing;
    }

    const newMember: MemberRecord = {
      id: payload.id,
      email: payload.email,
      fullName: payload.fullName || payload.email.split('@')[0],
      password: '',
      role: payload.role || (payload.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user'),
      verificationStatus: payload.verificationStatus || (payload.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? 'verified' : 'pending'),
      sessionStatus: 'logged_in',
      lastActiveAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.members.set(newMember.id, newMember);
    this.saveToFile();
    return newMember;
  }

  public getAllUserStories(): (Story & { userEmail?: string; userId: string; createdAtString?: string })[] {
    const all: (Story & { userEmail?: string; userId: string; createdAtString?: string })[] = [];
    for (const [userId, stories] of this.userStories.entries()) {
      const member = this.getMemberById(userId);
      const userEmail = member ? member.email : 'student@aitoon.edu';
      for (const s of stories) {
        all.push({
          ...s,
          userId,
          userEmail,
          createdAtString: s.createdAt || new Date().toISOString(),
        });
      }
    }
    return all.sort((a, b) => new Date(b.createdAtString || 0).getTime() - new Date(a.createdAtString || 0).getTime());
  }

  public getAllQuizAttempts(): (QuizAttemptRecord & { userEmail?: string; userName?: string })[] {
    return this.quizAttempts.map((q) => {
      const member = this.getMemberById(q.userId);
      return {
        ...q,
        userEmail: member?.email || q.userId,
        userName: member?.fullName || 'Student',
      };
    });
  }
}

export const memberService = new MemberService();

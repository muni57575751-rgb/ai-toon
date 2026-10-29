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
} from '@ai-toon/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.resolve(DATA_DIR, 'members.json');
const NOTIFICATIONS_FILE = path.resolve(DATA_DIR, 'notifications.json');

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

export class MemberService {
  private members: Map<string, MemberRecord> = new Map();
  private notifications: Map<string, AdminNotification> = new Map();

  constructor() {
    this.initStore();
  }

  private initStore(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Check if we need to clean out old demo accounts
      let resetNeeded = false;
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        try {
          const list: MemberRecord[] = JSON.parse(raw);
          // If old test accounts like 'admin@aitoon.edu' exist, purge and reset to only Muni
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

      // Load or init notifications
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
      } else {
        this.notifications.clear();
        this.saveNotificationsToFile();
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
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.members.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemberService] Failed to persist members to disk:', err);
    }
  }

  private saveNotificationsToFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.notifications.values());
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[MemberService] Failed to persist notifications to disk:', err);
    }
  }

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
    let unreadNotificationsCount = 0;

    for (const m of this.members.values()) {
      if (m.sessionStatus === 'logged_in') loggedInCount++;
      else loggedOutCount++;

      if (m.role === 'admin') adminCount++;
      else userCount++;

      if (m.verificationStatus === 'pending') pendingCount++;
    }

    for (const n of this.notifications.values()) {
      if (!n.read && n.status === 'pending') {
        unreadNotificationsCount++;
      }
    }

    return {
      totalMembers: this.members.size,
      loggedInCount,
      loggedOutCount,
      adminCount,
      maxAdmins: MAX_ADMIN_LIMIT,
      userCount,
      pendingCount,
      unreadNotificationsCount,
    };
  }

  /**
   * Primary Authentication Handler
   */
  public authenticate(
    email: string,
    password: string
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
        return { success: true, member: master };
      } else {
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
      return {
        success: false,
        code: 'USER_NOT_FOUND',
        error: 'No account found with this email. Please create an account first.',
      };
    }

    // Verify Password if recorded
    if (member.password && member.password !== password) {
      return {
        success: false,
        code: 'INVALID_PASSWORD',
        error: 'Invalid password. Please check your password.',
      };
    }

    // Verify Approval Status
    if (member.verificationStatus === 'pending') {
      return {
        success: false,
        code: 'PENDING_APPROVAL',
        error: `Your account registration is awaiting approval from the Administrator (${MASTER_ADMIN_EMAIL}). A notification has been sent to the admin portal. You will be able to log in once approved.`,
      };
    }

    if (member.verificationStatus === 'rejected') {
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

    return { success: true, member };
  }

  /**
   * User Registration with automatic Admin Portal notification
   */
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

    const newMember: MemberRecord = {
      id: newMemberId,
      email: normalized,
      fullName: name.trim(),
      password,
      role: 'user',
      verificationStatus: 'pending', // Requires admin verification
      sessionStatus: 'logged_out',
      lastActiveAt: now,
      lastLoginAt: now,
      createdAt: now,
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
      status: 'pending',
    };

    this.notifications.set(notification.id, notification);
    this.saveNotificationsToFile();

    return {
      success: true,
      pendingApproval: true,
      member: newMember,
      notification,
    };
  }

  /**
   * Notifications Management
   */
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

    return { success: true, member, notification: notif };
  }

  public markNotificationsRead(): void {
    for (const n of this.notifications.values()) {
      n.read = true;
    }
    this.saveNotificationsToFile();
  }

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
    const newMember: MemberRecord = {
      id: userId,
      email,
      fullName: fullName || email.split('@')[0] || 'New Member',
      role: 'user',
      verificationStatus: 'pending',
      sessionStatus: status,
      lastActiveAt: now,
      lastLoginAt: now,
      createdAt: now,
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
      status: 'pending',
    };
    this.notifications.set(notif.id, notif);
    this.saveNotificationsToFile();

    return newMember;
  }

  public setMemberRole(
    targetId: string,
    newRole: UserRole,
    performedBy?: string
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

    target.role = newRole;
    if (newRole === 'admin' && target.verificationStatus === 'pending') {
      target.verificationStatus = 'verified';
      target.verifiedAt = new Date().toISOString();
      if (performedBy) target.verifiedBy = performedBy;
    }
    target.lastActiveAt = new Date().toISOString();

    this.members.set(target.id, target);
    this.saveToFile();
    return { success: true, member: target };
  }

  public verifyMember(
    targetId: string,
    verificationStatus: MemberVerificationStatus,
    newRole?: UserRole,
    performedBy?: string
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
      if (performedBy) target.verifiedBy = performedBy;
    }
    target.lastActiveAt = new Date().toISOString();

    this.members.set(target.id, target);
    this.saveToFile();
    return { success: true, member: target };
  }

  public deleteMember(targetId: string): { success: boolean; error?: string } {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: 'Member not found.' };
    }
    if (target.role === 'admin' && this.getAdminCount() <= 1) {
      return { success: false, error: 'Cannot delete the only administrator.' };
    }
    this.members.delete(targetId);
    this.saveToFile();
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
}

export const memberService = new MemberService();

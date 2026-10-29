import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  MemberRecord,
  AdminStats,
  UserRole,
  MemberVerificationStatus,
  MemberSessionStatus,
  MAX_ADMIN_LIMIT,
} from '@ai-toon/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.resolve(DATA_DIR, 'members.json');

const INITIAL_MEMBERS: MemberRecord[] = [
  {
    id: 'admin-super-001',
    email: 'admin@aitoon.edu',
    fullName: 'System Administrator',
    role: 'admin',
    verificationStatus: 'verified',
    sessionStatus: 'logged_in',
    lastActiveAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    createdAt: '2026-09-01T08:00:00.000Z',
    verifiedAt: '2026-09-01T08:00:00.000Z',
    verifiedBy: 'System Init',
  },
  {
    id: 'admin-faculty-002',
    email: 'faculty.admin@aitoon.edu',
    fullName: 'Dr. Sarah Chen',
    role: 'admin',
    verificationStatus: 'verified',
    sessionStatus: 'logged_out',
    lastActiveAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    createdAt: '2026-09-10T09:30:00.000Z',
    verifiedAt: '2026-09-10T10:00:00.000Z',
    verifiedBy: 'admin@aitoon.edu',
  },
  {
    id: 'demo-student-id-123',
    email: 'alex.explorer@student.aitoon.edu',
    fullName: 'Alex Explorer',
    role: 'user',
    verificationStatus: 'verified',
    sessionStatus: 'logged_in',
    lastActiveAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    createdAt: '2026-10-01T11:15:00.000Z',
    verifiedAt: '2026-10-01T12:00:00.000Z',
    verifiedBy: 'admin@aitoon.edu',
  },
  {
    id: 'user-maya-004',
    email: 'maya.patel@student.aitoon.edu',
    fullName: 'Maya Patel',
    role: 'user',
    verificationStatus: 'verified',
    sessionStatus: 'logged_out',
    lastActiveAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000 * 9).toISOString(),
    createdAt: '2026-10-12T14:20:00.000Z',
    verifiedAt: '2026-10-12T15:00:00.000Z',
    verifiedBy: 'admin@aitoon.edu',
  },
  {
    id: 'user-rohit-005',
    email: 'rohit.sharma@student.aitoon.edu',
    fullName: 'Rohit Sharma',
    role: 'user',
    verificationStatus: 'verified',
    sessionStatus: 'logged_out',
    lastActiveAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000 * 26).toISOString(),
    createdAt: '2026-10-18T16:00:00.000Z',
    verifiedAt: '2026-10-18T16:30:00.000Z',
    verifiedBy: 'faculty.admin@aitoon.edu',
  },
  {
    id: 'user-priya-006',
    email: 'priya.verma@student.aitoon.edu',
    fullName: 'Priya Verma',
    role: 'user',
    verificationStatus: 'pending',
    sessionStatus: 'logged_out',
    lastActiveAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'user-arjun-007',
    email: 'arjun.reddy@student.aitoon.edu',
    fullName: 'Arjun Reddy',
    role: 'user',
    verificationStatus: 'pending',
    sessionStatus: 'logged_in',
    lastActiveAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

export class MemberService {
  private members: Map<string, MemberRecord> = new Map();

  constructor() {
    this.initStore();
  }

  private initStore(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const list: MemberRecord[] = JSON.parse(raw);
        for (const item of list) {
          this.members.set(item.id, item);
        }
      } else {
        for (const item of INITIAL_MEMBERS) {
          this.members.set(item.id, item);
        }
        this.saveToFile();
      }
    } catch (err) {
      console.warn('[MemberService] Could not access local storage file, using in-memory store:', err);
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

    for (const m of this.members.values()) {
      if (m.sessionStatus === 'logged_in') loggedInCount++;
      else loggedOutCount++;

      if (m.role === 'admin') adminCount++;
      else userCount++;

      if (m.verificationStatus === 'pending') pendingCount++;
    }

    return {
      totalMembers: this.members.size,
      loggedInCount,
      loggedOutCount,
      adminCount,
      maxAdmins: MAX_ADMIN_LIMIT,
      userCount,
      pendingCount,
    };
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

    // New member created
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
      // If target is already an admin, no-op or re-affirm
      if (target.role !== 'admin' && currentAdmins >= MAX_ADMIN_LIMIT) {
        return {
          success: false,
          error: `Cannot assign Admin role. Maximum limit of ${MAX_ADMIN_LIMIT} administrators has been reached (currently ${currentAdmins}/${MAX_ADMIN_LIMIT}). Please demote an existing admin before promoting another member.`,
        };
      }
    } else if (newRole === 'user' && target.role === 'admin') {
      // Prevent demoting the last remaining admin
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
}

export const memberService = new MemberService();


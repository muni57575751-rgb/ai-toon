import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  MemberRecord,
  AdminNotification,
  UserRole,
  MemberVerificationStatus,
  normalizeVerificationStatus,
} from '@ai-toon/shared';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://zrtylqnfkwiakrxkgwkr.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_sOzEvnLWOE0XcmRRwf5tZg_qyR1yabn';

class DatabaseService {
  private client: SupabaseClient | null = null;
  private isSupabaseOnline: boolean = false;
  private checkedConnectivity: boolean = false;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
      } catch (err) {
        console.warn('[DbService] Could not initialize Supabase client:', err);
        this.client = null;
      }
    }
  }

  /**
   * Tests if Supabase database and public.members table is reachable.
   */
  public async checkConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { data, error } = await this.client
        .from('members')
        .select('id')
        .limit(1);

      if (error) {
        this.isSupabaseOnline = false;
        return false;
      }
      this.isSupabaseOnline = true;
      return true;
    } catch {
      this.isSupabaseOnline = false;
      return false;
    } finally {
      this.checkedConnectivity = true;
    }
  }

  public isConnected(): boolean {
    return this.isSupabaseOnline;
  }

  /**
   * Fetches all members from Supabase if table exists
   */
  public async fetchMembers(): Promise<MemberRecord[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('members').select('*');
      if (error || !Array.isArray(data)) {
        return null;
      }
      this.isSupabaseOnline = true;
      return data.map((row) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name || row.fullName || row.email.split('@')[0],
        password: row.password || '',
        role: (row.role as UserRole) || 'user',
        verificationStatus: normalizeVerificationStatus(row.verification_status || row.verificationStatus),
        sessionStatus: row.session_status || row.sessionStatus || 'logged_out',
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        verifiedAt: row.verified_at || row.verifiedAt,
        verifiedBy: row.verified_by || row.verifiedBy,
        suspendedAt: row.suspended_at || row.suspendedAt,
        suspendedReason: row.suspended_reason || row.suspendedReason,
        lastLoginAt: row.last_login_at || row.lastLoginAt || new Date().toISOString(),
        lastActiveAt: row.last_active_at || row.lastActiveAt || new Date().toISOString(),
      }));
    } catch {
      return null;
    }
  }

  /**
   * Upserts a member in Supabase
   */
  public async upsertMember(m: MemberRecord): Promise<boolean> {
    if (!this.client) return false;
    try {
      const payload = {
        id: m.id,
        email: m.email,
        full_name: m.fullName,
        password: m.password || '',
        role: m.role,
        verification_status: normalizeVerificationStatus(m.verificationStatus),
        session_status: m.sessionStatus,
        created_at: m.createdAt,
        verified_at: m.verifiedAt || null,
        verified_by: m.verifiedBy || null,
        suspended_at: m.suspendedAt || null,
        suspended_reason: m.suspendedReason || null,
        last_login_at: m.lastLoginAt,
        last_active_at: m.lastActiveAt,
      };

      const { error } = await this.client.from('members').upsert(payload, { onConflict: 'id' });
      if (error) {
        return false;
      }
      this.isSupabaseOnline = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Updates verification status of a member in Supabase
   */
  public async updateMemberStatus(
    id: string,
    status: MemberVerificationStatus,
    role?: UserRole,
    verifiedBy?: string
  ): Promise<boolean> {
    if (!this.client) return false;
    try {
      const now = new Date().toISOString();
      const updates: Record<string, any> = {
        verification_status: normalizeVerificationStatus(status),
        last_active_at: now,
      };
      if (status === 'verified' || status === 'approved') {
        updates.verified_at = now;
        if (verifiedBy) updates.verified_by = verifiedBy;
      }
      if (role) {
        updates.role = role;
      }

      const { error } = await this.client.from('members').update(updates).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a member from Supabase
   */
  public async deleteMember(id: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('members').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Fetches notifications from Supabase
   */
  public async fetchNotifications(): Promise<AdminNotification[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('notifications').select('*');
      if (error || !Array.isArray(data)) return null;
      return data.map((n) => ({
        id: n.id,
        type: n.type || 'NEW_REGISTRATION',
        memberId: n.member_id || n.memberId,
        fullName: n.full_name || n.fullName,
        email: n.email,
        createdAt: n.created_at || n.createdAt,
        read: Boolean(n.read),
        status: n.status || 'pending',
        actionedAt: n.actioned_at || n.actionedAt,
        actionedBy: n.actioned_by || n.actionedBy,
        approvedRole: n.approved_role || n.approvedRole,
      }));
    } catch {
      return null;
    }
  }

  /**
   * Upserts a notification in Supabase
   */
  public async upsertNotification(n: AdminNotification): Promise<boolean> {
    if (!this.client) return false;
    try {
      const payload = {
        id: n.id,
        type: n.type,
        member_id: n.memberId,
        full_name: n.fullName,
        email: n.email,
        created_at: n.createdAt,
        read: n.read,
        status: n.status,
        actioned_at: n.actionedAt || null,
        actioned_by: n.actionedBy || null,
        approved_role: n.approvedRole || 'user',
      };
      const { error } = await this.client.from('notifications').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch {
      return false;
    }
  }
}

export const dbService = new DatabaseService();


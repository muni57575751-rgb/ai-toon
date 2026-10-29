export type UserRole = 'user' | 'admin';
export type MemberVerificationStatus = 'verified' | 'pending' | 'rejected';
export type MemberSessionStatus = 'logged_in' | 'logged_out';

export const MAX_ADMIN_LIMIT = 5;

export interface AdminNotification {
  id: string;
  type: 'NEW_REGISTRATION' | 'ROLE_PROMOTION';
  memberId: string;
  fullName: string;
  email: string;
  createdAt: string;
  read: boolean;
  status: 'pending' | 'approved' | 'rejected';
  actionedAt?: string;
  actionedBy?: string;
  approvedRole?: UserRole;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  verificationStatus: MemberVerificationStatus;
  sessionStatus: MemberSessionStatus;
  avatarUrl?: string;
  preferredLanguage?: string;
  preferredTone?: string;
  createdAt: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
}

export interface MemberRecord {
  id: string;
  email: string;
  fullName: string;
  password?: string;
  role: UserRole;
  verificationStatus: MemberVerificationStatus;
  sessionStatus: MemberSessionStatus;
  lastActiveAt: string;
  lastLoginAt: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface AdminStats {
  totalMembers: number;
  loggedInCount: number;
  loggedOutCount: number;
  adminCount: number;
  maxAdmins: number;
  userCount: number;
  pendingCount: number;
  unreadNotificationsCount?: number;
}

export interface LearningProgress {
  userId: string;
  totalStoriesRead: number;
  totalQuizzesTaken: number;
  averageQuizScore: number;
  topicsExplored: string[];
  recentStoryIds: string[];
  favoriteStoryIds: string[];
  lastActiveAt: string;
}

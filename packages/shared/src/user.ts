export type UserRole = 'user' | 'admin';
export type MemberVerificationStatus = 'verified' | 'pending' | 'rejected' | 'suspended';
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
  suspendedAt?: string;
  suspendedReason?: string;
}

export interface AdminStats {
  totalMembers: number;
  loggedInCount: number;
  loggedOutCount: number;
  adminCount: number;
  maxAdmins: number;
  userCount: number;
  pendingCount: number;
  suspendedCount?: number;
  unreadNotificationsCount?: number;
  totalLessonsGenerated?: number;
  totalQuizzesCompleted?: number;
  averageQuizScore?: number;
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

export interface LoginAuditEvent {
  id: string;
  userId?: string;
  email: string;
  success: boolean;
  reason?: string;
  timestamp: string;
  ip?: string;
  browser?: string;
  userAgent?: string;
}

export interface AdminAuditEvent {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  targetEmail?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  source?: string;
  publishedDate?: string;
  sourceType?: 'web' | 'encyclopedic' | 'documentation';
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  provider: string;
}

export interface QaRequest {
  question: string;
  storyContext?: string;
  topic?: string;
  language?: string;
  difficulty?: string;
}

export interface QaSourceItem {
  title: string;
  url: string;
  domain?: string;
  snippet?: string;
  source?: string;
}

export interface QaResponse {
  question: string;
  answer: string;
  directAnswer?: string;
  explanation?: string;
  example?: string;
  realWorldExample?: string;
  sources?: QaSourceItem[];
}

export interface SystemSettings {
  userApprovalRequired: boolean;
  registrationApprovalRequired?: boolean;
  storyGenerationEnabled: boolean;
  aiGenerationEnabled?: boolean;
  aiModel: string;
  maxStoryLength: number;
  searchProvider: string;
  imageProvider: string;
  supportedLanguages: string[];
  contentSafetyStrict: boolean;
  dataRetentionDays: number;
  safetyFilterLevel?: 'strict' | 'moderate' | 'off';
  updatedAt?: string;
  updatedBy?: string;
  maxAdmins?: number;
}

export interface QuizAttemptRecord {
  id: string;
  userId: string;
  storyId: string;
  topic: string;
  score: number;
  total: number;
  percentage: number;
  completedAt: string;
}

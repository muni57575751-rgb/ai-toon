export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  preferredTone?: string;
  createdAt: string;
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

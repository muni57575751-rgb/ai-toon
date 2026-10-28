import type { QuizQuestion } from './quiz.js';

export type StoryTone = 'funny' | 'adventure' | 'comic';

export type StoryDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type SupportedLanguage =
  | 'en' // English
  | 'te' // Telugu
  | 'hi' // Hindi
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'ta'; // Tamil

export interface KeyPoint {
  pointNumber: number;
  heading: string;
  bulletPoints: string[];
}

export interface TopicIllustration {
  id: string;
  title: string;
  caption: string;
  description: string;
  keyword: string;
  positionIndex: number; // point after which this illustration appears (e.g. 2, 4)
  imageUrl?: string;
}

export interface Story {
  id: string;
  title: string;
  topic: string;
  tone: StoryTone;
  language: SupportedLanguage;
  difficulty?: StoryDifficulty;
  introduction: string;
  keyPoints: KeyPoint[];
  illustrations: TopicIllustration[];
  keyTakeaway: string;
  quizQuestions?: QuizQuestion[];
  createdAt: string;
  userId?: string;
  isFavorite?: boolean;
  isCached?: boolean;
  isExample?: boolean;
  provider?: string;
  summary?: string;
  keyTakeaways?: string[];
}

export interface StoryGenerationRequest {
  topic: string;
  tone: StoryTone;
  language: SupportedLanguage;
  difficulty?: StoryDifficulty;
  targetAgeGroup?: 'kids' | 'teens' | 'general';
}


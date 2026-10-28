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

export interface StoryScene {
  id: string;
  order: number;
  title: string;
  text: string;
  educationalExplanation: string;
  visualDescription: string;
  illustrationKeyword?: string;
  speechText?: string;
}

export interface Story {
  id: string;
  title: string;
  topic: string;
  tone: StoryTone;
  language: SupportedLanguage;
  difficulty?: StoryDifficulty;
  summary: string;
  scenes: StoryScene[];
  keyTakeaways: string[];
  createdAt: string;
  userId?: string;
  isFavorite?: boolean;
  isCached?: boolean;
  isExample?: boolean;
  provider?: string;
}

export interface StoryGenerationRequest {
  topic: string;
  tone: StoryTone;
  language: SupportedLanguage;
  difficulty?: StoryDifficulty;
  targetAgeGroup?: 'kids' | 'teens' | 'general';
}

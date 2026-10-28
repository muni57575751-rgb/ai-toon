export type StoryTone = 'funny' | 'adventure' | 'comic';

export type SupportedLanguage =
  | 'en' // English
  | 'es' // Spanish
  | 'hi' // Hindi
  | 'fr' // French
  | 'de' // German
  | 'ta' // Tamil
  | 'te'; // Telugu

export interface StoryScene {
  id: string;
  order: number;
  text: string;
  promptDescription?: string;
  illustrationKeyword?: string;
  speechText?: string;
}

export interface Story {
  id: string;
  title: string;
  topic: string;
  tone: StoryTone;
  language: SupportedLanguage;
  summary: string;
  scenes: StoryScene[];
  keyTakeaways: string[];
  createdAt: string;
  userId?: string;
  isFavorite?: boolean;
  isCached?: boolean;
}

export interface StoryGenerationRequest {
  topic: string;
  tone: StoryTone;
  language: SupportedLanguage;
  targetAgeGroup?: 'kids' | 'teens' | 'general';
}

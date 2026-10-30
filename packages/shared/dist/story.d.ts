import type { QuizQuestion } from './quiz.js';
import type { LocationDetails, TopicCategory } from './geo.js';
export type StoryTone = 'funny' | 'adventure' | 'comic';
export type StoryDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type SupportedLanguage = 'en' | 'te' | 'hi' | 'es' | 'fr' | 'de' | 'ta';
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
    positionIndex: number;
    searchQuery?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    sourcePageUrl?: string;
    author?: string;
    license?: string;
    licenseUrl?: string;
    attribution?: string;
    width?: number;
    height?: number;
    sourceType?: 'wikimedia' | 'openverse' | 'wikipedia' | 'svg_fallback';
    alternativeUrls?: string[];
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
    locationDetails?: LocationDetails;
    requiresMap?: boolean;
    topicCategory?: TopicCategory;
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
    locationDetails?: LocationDetails;
    requiresMap?: boolean;
    topicCategory?: TopicCategory;
}

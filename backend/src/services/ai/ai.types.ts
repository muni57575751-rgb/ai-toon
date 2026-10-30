import type { Story, StoryGenerationRequest, GeminiTopicClassification } from '@ai-toon/shared';

export interface IAiProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  generateStory(request: StoryGenerationRequest, timeoutMs?: number): Promise<Story>;
  classifyTopic?(topic: string, timeoutMs?: number): Promise<GeminiTopicClassification | null>;
}

export interface GeneratedStorySchema {
  title: string;
  introduction: string;
  keyPoints: Array<{
    pointNumber?: number;
    heading: string;
    bulletPoints: string[];
  }>;
  illustrations: Array<{
    title: string;
    caption: string;
    description: string;
    keyword: string;
    searchQuery?: string;
    positionIndex?: number;
  }>;
  keyTakeaway: string;
  quizQuestions?: Array<{
    question: string;
    options: Array<{ id: string; text: string }>;
    correctOptionId: string;
    explanation: string;
  }>;
}


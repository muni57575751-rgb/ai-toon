import type { Story, StoryGenerationRequest } from '@ai-toon/shared';

export interface IAiProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  generateStory(request: StoryGenerationRequest, timeoutMs?: number): Promise<Story>;
}

export interface GeneratedStorySchema {
  title: string;
  summary: string;
  keyTakeaways: string[];
  scenes: Array<{
    title: string;
    text: string;
    educationalExplanation: string;
    visualDescription: string;
    illustrationKeyword?: string;
  }>;
}

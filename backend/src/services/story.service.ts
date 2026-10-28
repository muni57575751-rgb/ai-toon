import type { Story, StoryGenerationRequest } from '@ai-toon/shared';
import { getAiProvider } from './ai/provider.factory.js';
import { storyCache } from './cache.service.js';
import { BUILT_IN_EXAMPLE_STORIES } from './exampleStories.data.js';
import { config } from '../config/env.js';

export class StoryService {
  /**
   * Generates or retrieves a story for the student
   */
  public async getOrGenerateStory(request: StoryGenerationRequest): Promise<{ story: Story; cached: boolean }> {
    const topic = request.topic?.trim();
    if (!topic) {
      throw new Error('Please specify an academic topic for the story.');
    }

    const cacheKey = storyCache.generateKey(request);

    // 1. Check in-memory cache first to conserve free-tier API quota
    const cachedStory = storyCache.get(cacheKey);
    if (cachedStory) {
      return { story: cachedStory, cached: true };
    }

    // 2. Check if the topic closely matches a built-in example story
    const matchingExample = this.findMatchingExample(topic);

    // 3. Check AI Provider
    const provider = getAiProvider();
    if (!provider.isConfigured()) {
      if (matchingExample) {
        return { story: matchingExample, cached: false };
      }
      throw new Error(
        'No AI API key is configured on the server. Please set GEMINI_API_KEY in backend/.env, or choose one of our built-in example stories (Photosynthesis, The Solar System, or The Water Cycle).'
      );
    }

    // 4. Request from live AI provider with timeout
    try {
      const generated = await provider.generateStory(request, config.aiRequestTimeoutMs);

      // Save to cache
      storyCache.set(cacheKey, generated);

      return { story: generated, cached: false };
    } catch (err: unknown) {
      // If live AI provider fails or is rate-limited, fall back to matching example if available
      if (matchingExample) {
        console.warn(`[StoryService] Live AI generation failed. Falling back to built-in example for "${topic}".`, err);
        return { story: matchingExample, cached: false };
      }
      throw err;
    }
  }

  /**
   * Returns all available built-in example stories
   */
  public getBuiltInExamples(): Story[] {
    return BUILT_IN_EXAMPLE_STORIES;
  }

  /**
   * Returns a single built-in example story by ID
   */
  public getBuiltInExampleById(id: string): Story | null {
    return BUILT_IN_EXAMPLE_STORIES.find((s) => s.id === id) || null;
  }

  /**
   * Inspects provider configuration & cache metrics
   */
  public getStatus(): {
    providerName: string;
    model: string;
    isConfigured: boolean;
    cacheStats: { size: number; hits: number; misses: number; hitRate: string };
  } {
    const provider = getAiProvider();
    return {
      providerName: provider.name,
      model: provider.model,
      isConfigured: provider.isConfigured(),
      cacheStats: storyCache.getStats(),
    };
  }

  private findMatchingExample(topic: string): Story | null {
    const normalized = topic.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const example of BUILT_IN_EXAMPLE_STORIES) {
      const exampleNorm = example.topic.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized.includes(exampleNorm) || exampleNorm.includes(normalized)) {
        return example;
      }
    }
    return null;
  }
}

export const storyService = new StoryService();

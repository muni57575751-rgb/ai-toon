import type { Story, StoryGenerationRequest } from '@ai-toon/shared';
import { getAiProvider } from './ai/provider.factory.js';
import { storyCache } from './cache.service.js';
import { BUILT_IN_EXAMPLE_STORIES } from './exampleStories.data.js';
import { config } from '../config/env.js';

import { imageSearchService } from './imageSearch/imageSearch.service.js';
import { geoDetectionService } from './geoDetection.service.js';
import type { IAiProvider } from './ai/ai.types.js';

export class StoryService {
  constructor(private readonly getProvider: () => IAiProvider = getAiProvider) {}

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

    // 2. Detect if the topic is an identifiable geographical place
    let enrichedRequest: StoryGenerationRequest = { ...request };
    try {
      const location = await geoDetectionService.detectAndGeocode(topic);
      if (location && location.isLocation) {
        console.log(`[StoryService] Geographical entity detected for "${topic}": ${location.placeName} (${location.category}) at ${location.latitude}, ${location.longitude}`);
        enrichedRequest.locationDetails = location;
      }
    } catch (geoErr) {
      console.warn(`[StoryService] Geocoding detection failed for "${topic}":`, geoErr);
    }

    // 3. Check if the topic closely matches a built-in example story
    const matchingExample = this.findMatchingExample(topic);

    // 4. Check AI Provider
    const provider = this.getProvider();
    if (!provider.isConfigured()) {
      if (matchingExample) {
        const enhancedExample = await imageSearchService.enhanceStoryIllustrations({
          ...matchingExample,
          locationDetails: enrichedRequest.locationDetails,
        });
        return { story: enhancedExample, cached: false };
      }
      throw new Error(
        'No AI API key is configured on the server. Please set GEMINI_API_KEY in backend/.env, or choose one of our built-in example stories (Photosynthesis, The Solar System, or The Water Cycle).'
      );
    }

    // 5. Request from live AI provider with timeout
    try {
      const generated = await provider.generateStory(enrichedRequest, config.aiRequestTimeoutMs);

      // 6. Ensure verified location details are attached
      if (enrichedRequest.locationDetails) {
        generated.locationDetails = enrichedRequest.locationDetails;
      }

      // 7. Enhance illustrations with authentic educational images from public sources
      let finalStory = generated;
      try {
        finalStory = await imageSearchService.enhanceStoryIllustrations(generated);
      } catch (imgErr) {
        console.warn('[StoryService] Image enhancement failed, continuing with SVG fallback:', imgErr);
      }

      if (enrichedRequest.locationDetails) {
        finalStory.locationDetails = enrichedRequest.locationDetails;
      }

      // Save to cache (includes enhanced image metadata and location details to prevent duplicate requests)
      storyCache.set(cacheKey, finalStory);

      return { story: finalStory, cached: false };
    } catch (err: unknown) {
      // If live AI provider fails or is rate-limited, fall back to matching example if available
      if (matchingExample) {
        console.warn(`[StoryService] Live AI generation failed. Falling back to built-in example for "${topic}".`, err);
        const enhancedFallback = await imageSearchService.enhanceStoryIllustrations({
          ...matchingExample,
          locationDetails: enrichedRequest.locationDetails,
        });
        return { story: enhancedFallback, cached: false };
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
    const provider = this.getProvider();
    return {
      providerName: provider.name,
      model: provider.model,
      isConfigured: provider.isConfigured(),
      cacheStats: storyCache.getStats(),
    };
  }

  private findMatchingExample(topic: string): Story | null {
    const clean = topic.trim().toLowerCase();
    if (!clean) return null;

    // Define genuine matching keywords for the 3 built-in examples
    const examplePatterns: Array<{ id: string; patterns: RegExp[] }> = [
      {
        id: 'example_photosynthesis',
        patterns: [
          /\bphotosynthesis\b/i,
          /\bhow plants make food\b/i,
          /\bchloroplast(s)?\b/i,
          /\bchlorophyll\b/i,
        ],
      },
      {
        id: 'example_solar_system',
        patterns: [
          /\bsolar system\b/i,
          /\bplanets of (the|our) sun\b/i,
          /\bplanets in (the|our) solar system\b/i,
          /\beight planets\b/i,
        ],
      },
      {
        id: 'example_water_cycle',
        patterns: [
          /\bwater cycle\b/i,
          /\bhydrologic(al)? cycle\b/i,
        ],
      },
    ];

    for (const item of examplePatterns) {
      const isMatch = item.patterns.some((pattern) => pattern.test(clean));
      if (isMatch) {
        return BUILT_IN_EXAMPLE_STORIES.find((s) => s.id === item.id) || null;
      }
    }

    return null;
  }
}

export const storyService = new StoryService();

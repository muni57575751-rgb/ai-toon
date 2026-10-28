import { config } from '../../config/env.js';
import type { IAiProvider } from './ai.types.js';
import { GeminiProvider } from './gemini.provider.js';

class MockAiProvider implements IAiProvider {
  public readonly name = 'Built-in Offline Story Engine';
  public readonly model = 'mock-fallback';

  public isConfigured(): boolean {
    return false;
  }

  public async generateStory(): Promise<never> {
    throw new Error('No live AI provider configured. Set GEMINI_API_KEY in backend/.env to enable live generation.');
  }
}

let cachedProvider: IAiProvider | null = null;

export const getAiProvider = (): IAiProvider => {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = (config.aiProvider || 'gemini').toLowerCase();

  switch (providerType) {
    case 'gemini':
    case 'google':
      cachedProvider = new GeminiProvider(config.aiApiKey, config.aiModel);
      break;
    default:
      console.warn(`[AI Provider] Unknown provider "${providerType}". Falling back to Gemini provider.`);
      cachedProvider = new GeminiProvider(config.aiApiKey, config.aiModel);
      break;
  }

  return cachedProvider;
};

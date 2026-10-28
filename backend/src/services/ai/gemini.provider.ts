import type { Story, StoryGenerationRequest, StoryScene } from '@ai-toon/shared';
import type { IAiProvider, GeneratedStorySchema } from './ai.types.js';

export class GeminiProvider implements IAiProvider {
  public readonly name = 'Google Gemini (Free Tier)';
  public readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model: string = 'gemini-3.5-flash-lite') {
    this.apiKey = apiKey.trim();
    this.model = model;
  }

  public isConfigured(): boolean {
    return Boolean(
      this.apiKey &&
      !this.apiKey.includes('your-free-tier') &&
      !this.apiKey.includes('your-gemini-api-key')
    );
  }

  public async generateStory(request: StoryGenerationRequest, timeoutMs: number = 45000): Promise<Story> {
    if (!this.isConfigured()) {
      throw new Error(
        'Gemini API key is not configured on the server. Set GEMINI_API_KEY in backend/.env or explore our built-in example stories.'
      );
    }

    const startTime = Date.now();
    const prompt = this.buildPrompt(request);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    console.log(
      `[GeminiProvider] Starting story generation. Model: "${this.model}", Topic: "${request.topic}", Tone: "${request.tone}", Lang: "${request.language}", Timeout: ${Math.round(timeoutMs / 1000)}s`
    );

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      });

      clearTimeout(timeoutTimer);
      const elapsedMs = Date.now() - startTime;
      console.log(`[GeminiProvider] Received response in ${elapsedMs}ms with HTTP status ${response.status}`);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('AI Provider quota limit reached (HTTP 429). Please try again shortly or view our built-in example stories.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid or unauthorized Gemini API key. Please verify your GEMINI_API_KEY in backend/.env.');
        }
        const errorText = await response.text();
        const sanitizedError = errorText.replace(/key=[^&\s]+/gi, 'key=[REDACTED]').slice(0, 300);
        console.error(`[GeminiProvider] HTTP ${response.status} provider error after ${elapsedMs}ms: ${sanitizedError}`);
        throw new Error(`AI Provider error (HTTP ${response.status}): ${sanitizedError}`);
      }

      const jsonResult = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const rawText = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('AI Provider returned an empty generation response.');
      }

      const parsedStory = this.parseAndValidate(rawText, request);
      console.log(`[GeminiProvider] Story generated successfully in ${elapsedMs}ms. Scenes: ${parsedStory.scenes.length}`);
      return parsedStory;
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      const elapsedMs = Date.now() - startTime;
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.warn(`[GeminiProvider] Request aborted after ${elapsedMs}ms (timeout limit was ${Math.round(timeoutMs / 1000)}s).`);
          throw new Error(`AI generation timed out after ${Math.round(timeoutMs / 1000)} seconds. Please try a simpler topic or check network connection.`);
        }
        console.error(`[GeminiProvider] Story generation failed after ${elapsedMs}ms:`, err.message);
        throw err;
      }
      throw new Error('An unexpected error occurred during AI story generation.');
    }
  }

  private buildPrompt(request: StoryGenerationRequest): string {
    const languageNames: Record<string, string> = {
      en: 'English',
      te: 'Telugu (తెలుగు)',
      hi: 'Hindi (हिंदी)',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ta: 'Tamil',
    };

    const targetLang = languageNames[request.language] || 'English';
    const difficulty = request.difficulty || 'intermediate';

    return `You are AI Toon, an expert educational cartoon creator.
Generate a concise, captivating, educational story divided into 3 to 4 cartoon scenes about: "${request.topic}".

Story Specifications:
- Storytelling Tone: ${request.tone.toUpperCase()} (funny = humorous, witty jokes; adventure = exciting discovery and quest; comic = animated superheroes, sound effects like BOOM/WHOOSH).
- Target Language: ${targetLang}. All story text, scene titles, summary, and educational explanations MUST be written in ${targetLang}.
- Student Level: ${difficulty.toUpperCase()}.
- Length: Exactly 3 to 4 scenes. Keep text concise and punchy to conserve student attention.

Required JSON Schema output:
{
  "title": "Short creative cartoon title",
  "summary": "1-2 sentence overview of the concept taught",
  "keyTakeaways": ["Core lesson 1", "Core lesson 2", "Core lesson 3"],
  "scenes": [
    {
      "title": "Scene title",
      "text": "2-3 sentences of engaging cartoon narrative dialog/action",
      "educationalExplanation": "1-2 sentences clearly explaining the real scientific/academic principle",
      "visualDescription": "Detailed cartoon description for the illustration (e.g. A smiling green leaf wearing chef hat inside a laboratory)",
      "illustrationKeyword": "leaf_solar"
    }
  ]
}

Return ONLY valid JSON matching this schema. Do not add markdown backticks outside the JSON.`;
  }

  private parseAndValidate(rawJsonText: string, request: StoryGenerationRequest): Story {
    let cleanText = rawJsonText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: GeneratedStorySchema;
    try {
      parsed = JSON.parse(cleanText) as GeneratedStorySchema;
    } catch {
      throw new Error('Failed to parse AI output as structured story JSON.');
    }

    if (!parsed.title || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error('AI output was incomplete (missing story title or scenes).');
    }

    const storyId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const scenes: StoryScene[] = parsed.scenes.map((s, index) => ({
      id: `${storyId}_scene_${index + 1}`,
      order: index + 1,
      title: s.title || `Scene ${index + 1}`,
      text: s.text || '',
      educationalExplanation: s.educationalExplanation || 'Key educational insight for this scene.',
      visualDescription: s.visualDescription || 'Cartoon scene depicting the story.',
      illustrationKeyword: s.illustrationKeyword || request.topic.toLowerCase().replace(/\s+/g, '_'),
    }));

    return {
      id: storyId,
      title: parsed.title,
      topic: request.topic,
      tone: request.tone,
      language: request.language,
      difficulty: request.difficulty,
      summary: parsed.summary || `An educational story about ${request.topic}.`,
      scenes,
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      createdAt: new Date().toISOString(),
      isCached: false,
      isExample: false,
      provider: this.name,
    };
  }
}

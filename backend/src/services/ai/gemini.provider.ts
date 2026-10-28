import type { Story, StoryGenerationRequest } from '@ai-toon/shared';
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

  // Testing simulation hook
  private simulation: { failStatus: number; failCount: number } | null = null;

  public setSimulation(sim: { failStatus: number; failCount: number } | null): void {
    this.simulation = sim;
  }

  public async generateStory(request: StoryGenerationRequest, timeoutMs: number = 45000): Promise<Story> {
    if (!this.isConfigured()) {
      throw new Error(
        'Gemini API key is not configured on the server. Set GEMINI_API_KEY in backend/.env or explore our built-in example stories.'
      );
    }

    const startTime = Date.now();
    const deadline = startTime + timeoutMs;
    const prompt = this.buildPrompt(request);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const maxRetries = 2; // Up to 2 additional retries (3 attempts total)
    let attempt = 0;
    let lastError: Error | null = null;

    console.log(
      `[GeminiProvider] Starting story generation. Model: "${this.model}", Topic: "${request.topic}", Tone: "${request.tone}", Lang: "${request.language}", Timeout: ${Math.round(timeoutMs / 1000)}s`
    );

    while (attempt <= maxRetries) {
      attempt++;
      const now = Date.now();
      const remainingTimeMs = deadline - now;

      if (remainingTimeMs <= 1000) {
        throw new Error(
          `AI generation timed out after ${Math.round(timeoutMs / 1000)} seconds. Please try again in a moment.`
        );
      }

      const attemptController = new AbortController();
      const attemptTimer = setTimeout(() => attemptController.abort(), remainingTimeMs);

      try {
        console.log(
          `[GeminiProvider] Attempt ${attempt}/${maxRetries + 1}. Topic: "${request.topic}", Remaining: ${Math.round(remainingTimeMs / 1000)}s`
        );

        let response: Response;

        // Check if simulation is active for verification tests
        if (this.simulation && this.simulation.failCount > 0) {
          const simStatus = this.simulation.failStatus;
          this.simulation.failCount--;
          console.warn(`[GeminiProvider] [SIMULATION] Injecting HTTP ${simStatus} failure (Remaining sim fails: ${this.simulation.failCount})`);
          response = new Response(
            JSON.stringify({ error: { code: simStatus, message: `Simulated HTTP ${simStatus} error` } }),
            { status: simStatus, statusText: simStatus === 503 ? 'Service Unavailable' : 'Error' }
          );
        } else {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: attemptController.signal,
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
        }

        clearTimeout(attemptTimer);
        const elapsedMs = Date.now() - startTime;
        console.log(`[GeminiProvider] Attempt ${attempt} returned HTTP ${response.status} in ${elapsedMs}ms`);

        if (response.ok) {
          const jsonResult = (await response.json()) as {
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
          console.log(
            `[GeminiProvider] Story generated successfully on attempt ${attempt} in ${elapsedMs}ms. Points: ${parsedStory.keyPoints.length}, Illustrations: ${parsedStory.illustrations.length}, Quiz: ${parsedStory.quizQuestions?.length || 0}`
          );
          return parsedStory;
        }

        // Non-OK HTTP status handling
        const status = response.status;
        const retryAfterHeader = response.headers.get('Retry-After');
        const errorText = await response.text();
        const sanitizedError = errorText.replace(/key=[^&\s]+/gi, 'key=[REDACTED]').slice(0, 300);

        console.warn(
          `[GeminiProvider] Attempt ${attempt} failed with HTTP ${status}: ${sanitizedError}`
        );

        // Permanent/non-transient errors (DO NOT RETRY)
        if (status === 400) {
          throw new Error('Invalid request parameters sent to AI Provider (HTTP 400).');
        }
        if (status === 401 || status === 403) {
          throw new Error('Invalid or unauthorized Gemini API key. Please verify your GEMINI_API_KEY in backend/.env.');
        }
        if (status === 404) {
          throw new Error(`Configured AI model "${this.model}" was not found (HTTP 404).`);
        }

        // Detect transient errors: HTTP 503, 502, 504, 429
        const isTransient = status === 503 || status === 502 || status === 504 || status === 429;
        if (!isTransient) {
          throw new Error(`AI Provider error (HTTP ${status}): ${sanitizedError}`);
        }

        // Handle transient errors with exponential backoff and jitter
        if (attempt <= maxRetries) {
          let delayMs = 1500 * Math.pow(2, attempt - 1); // 1.5s, 3.0s
          const jitter = Math.floor(Math.random() * 500); // 0-500ms jitter
          delayMs += jitter;

          if (retryAfterHeader) {
            const parsedSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              delayMs = Math.max(delayMs, parsedSeconds * 1000);
            }
          }

          const timeLeft = deadline - Date.now();
          if (delayMs + 1500 > timeLeft) {
            console.warn(`[GeminiProvider] Insufficient time remaining for retry backoff (${delayMs}ms needed, ${timeLeft}ms left).`);
            break;
          }

          console.log(`[GeminiProvider] Transient HTTP ${status} error. Retrying attempt ${attempt + 1} in ${Math.round(delayMs)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        } else {
          lastError = new Error(
            'AI Toon is temporarily busy. Your lesson could not be generated right now. Please try again in a moment.'
          );
        }
      } catch (err: unknown) {
        clearTimeout(attemptTimer);
        const elapsedMs = Date.now() - startTime;

        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.warn(`[GeminiProvider] Request aborted after ${elapsedMs}ms.`);
            throw new Error(
              `AI generation timed out after ${Math.round(timeoutMs / 1000)} seconds. Please try again in a moment.`
            );
          }

          // Do not retry authorization or invalid request errors
          if (
            err.message.includes('Invalid or unauthorized') ||
            err.message.includes('Invalid request') ||
            err.message.includes('not found (HTTP 404)')
          ) {
            throw err;
          }

          // Transient network errors (fetch failed, connection reset, socket hang up)
          if (attempt <= maxRetries) {
            const delayMs = 1500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
            const timeLeft = deadline - Date.now();
            if (delayMs + 1500 <= timeLeft) {
              console.warn(`[GeminiProvider] Network failure on attempt ${attempt} (${err.message}). Retrying in ${delayMs}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }
          }

          lastError = err;
        } else {
          lastError = new Error('An unexpected error occurred during AI story generation.');
        }
      }
    }

    if (lastError) {
      if (
        lastError.message.includes('503') ||
        lastError.message.includes('502') ||
        lastError.message.includes('504') ||
        lastError.message.includes('429') ||
        lastError.message.includes('UNAVAILABLE') ||
        lastError.message.includes('high demand') ||
        lastError.message.includes('temporarily busy')
      ) {
        throw new Error(
          'AI Toon is temporarily busy. Your lesson could not be generated right now. Please try again in a moment.'
        );
      }
      throw lastError;
    }

    throw new Error(
      'AI Toon is temporarily busy. Your lesson could not be generated right now. Please try again in a moment.'
    );
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
    const pointsCount = difficulty === 'beginner' ? '4 to 5' : difficulty === 'advanced' ? '6 to 7' : '5 to 6';

    return `You are AI Toon, an expert educator and visual learning specialist.
Explain the educational topic "${request.topic}" as an engaging point-wise learning guide supported by 2 to 3 cartoon illustrations and a 3-question quiz.

CRITICAL INSTRUCTIONS:
- DO NOT generate scenes, slides, chapters, or comic panels.
- Generate a unified, point-wise educational explanation that will be read as a single continuous article.
- Target Language: ${targetLang}. All titles, introductions, headings, bullet points, captions, takeaways, and quiz questions MUST be written in ${targetLang}.
- Educational Tone / Flavor: ${request.tone.toUpperCase()} (conversational, fun, relatable, with clever analogies, but strictly educational).
- Student Level: ${difficulty.toUpperCase()}.
- Number of Key Points: Exactly ${pointsCount} numbered points. Each point MUST have a clear heading and 1 to 3 informative bullet points.
- Illustrations: Exactly 2 to 3 educational cartoon illustration concepts that visually explain the core concepts (place them after points like point 2 and point 4).
- Quiz: Exactly 3 quick multiple-choice quiz questions with 4 options ('a', 'b', 'c', 'd'), the correct option ID, and a brief explanation.

Required JSON Schema output:
{
  "title": "Clear, engaging educational title",
  "introduction": "1-2 sentences introducing the core concept clearly and engagingly.",
  "keyPoints": [
    {
      "pointNumber": 1,
      "heading": "Short descriptive heading for Point 1",
      "bulletPoints": [
        "First concise explanation sentence highlighting key concepts.",
        "Second supportive detail, analogy, or real-world example."
      ]
    }
  ],
  "illustrations": [
    {
      "title": "Illustration 1 Title",
      "caption": "1 sentence explaining what this diagram/cartoon visualizes for the student",
      "description": "Vivid cartoon description (e.g. Cartoon tectonic plates sliding with jagged edges and glowing stress lines beneath Earth's crust)",
      "keyword": "earthquake_fault",
      "positionIndex": 2
    },
    {
      "title": "Illustration 2 Title",
      "caption": "1 sentence explaining seismic wave propagation or safety",
      "description": "Cartoon shockwaves rippling out in colorful rings from a glowing underground hypocenter focus",
      "keyword": "seismic_waves",
      "positionIndex": 4
    }
  ],
  "keyTakeaway": "1-2 sentences summarizing the most essential learning takeaway.",
  "quizQuestions": [
    {
      "question": "Clear multiple choice question testing understanding of the topic?",
      "options": [
        { "id": "a", "text": "Option A" },
        { "id": "b", "text": "Option B" },
        { "id": "c", "text": "Option C" },
        { "id": "d", "text": "Option D" }
      ],
      "correctOptionId": "b",
      "explanation": "Why option B is correct."
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

    if (!parsed.title || !Array.isArray(parsed.keyPoints) || parsed.keyPoints.length === 0) {
      throw new Error('AI output was incomplete (missing title or educational key points).');
    }

    const storyId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const keyPoints = parsed.keyPoints.map((p, idx) => ({
      pointNumber: typeof p.pointNumber === 'number' ? p.pointNumber : idx + 1,
      heading: p.heading || `Point ${idx + 1}`,
      bulletPoints: Array.isArray(p.bulletPoints) && p.bulletPoints.length > 0 ? p.bulletPoints : ['Key concept explanation.'],
    }));

    const rawIllustrations = Array.isArray(parsed.illustrations) && parsed.illustrations.length > 0
      ? parsed.illustrations
      : [
          {
            title: `${request.topic} Overview`,
            caption: `Visual overview of ${request.topic}`,
            description: `Cartoon diagram illustrating ${request.topic}`,
            keyword: request.topic.toLowerCase().replace(/\s+/g, '_'),
            positionIndex: 2,
          },
          {
            title: `${request.topic} Mechanism`,
            caption: `How ${request.topic} works in nature`,
            description: `Detailed cartoon process of ${request.topic}`,
            keyword: request.topic.toLowerCase().replace(/\s+/g, '_'),
            positionIndex: 4,
          },
        ];

    const illustrations = rawIllustrations.slice(0, 3).map((ill, idx) => ({
      id: `${storyId}_ill_${idx + 1}`,
      title: ill.title || `Concept Illustration ${idx + 1}`,
      caption: ill.caption || ill.description || 'Educational illustration',
      description: ill.description || 'Cartoon illustration explaining the concept',
      keyword: ill.keyword || request.topic.toLowerCase().replace(/\s+/g, '_'),
      positionIndex: typeof ill.positionIndex === 'number' ? ill.positionIndex : (idx + 1) * 2,
    }));

    const quizQuestions = Array.isArray(parsed.quizQuestions)
      ? parsed.quizQuestions.slice(0, 3).map((q, idx) => ({
          id: `${storyId}_q_${idx + 1}`,
          question: q.question,
          options: (q.options || []).map((o, oIdx) => ({
            id: o.id || String.fromCharCode(97 + oIdx),
            text: o.text || '',
          })),
          correctOptionId: q.correctOptionId || 'a',
          explanation: q.explanation || 'Correct answer explanation.',
        }))
      : [];

    return {
      id: storyId,
      title: parsed.title,
      topic: request.topic,
      tone: request.tone,
      language: request.language,
      difficulty: request.difficulty,
      introduction: parsed.introduction || `Let's explore ${request.topic} with this point-wise visual learning guide.`,
      keyPoints,
      illustrations,
      keyTakeaway: parsed.keyTakeaway || 'Mastering this concept helps us understand the world around us.',
      quizQuestions,
      createdAt: new Date().toISOString(),
      isCached: false,
      isExample: false,
      provider: this.name,
      summary: parsed.introduction || parsed.keyTakeaway,
      keyTakeaways: [parsed.keyTakeaway || 'Key educational concept mastered.'],
    };
  }
}


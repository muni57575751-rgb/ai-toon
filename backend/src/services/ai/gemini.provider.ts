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
      console.log(
        `[GeminiProvider] Story generated successfully in ${elapsedMs}ms. Points: ${parsedStory.keyPoints.length}, Illustrations: ${parsedStory.illustrations.length}, Quiz: ${parsedStory.quizQuestions?.length || 0}`
      );
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


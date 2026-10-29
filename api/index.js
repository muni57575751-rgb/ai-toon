// backend/src/app.ts
import express from "express";
import cors from "cors";

// backend/src/config/env.ts
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var currentDir = process.cwd();
try {
  if (typeof import.meta !== "undefined" && import.meta?.url) {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
}
var candidateEnvPaths = [
  path.resolve(process.cwd(), "backend", ".env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(currentDir, "../../backend/.env"),
  path.resolve(currentDir, "../../../.env")
];
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
dotenv.config();
var config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  aiProvider: process.env.AI_PROVIDER || "gemini",
  aiApiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "",
  aiModel: process.env.AI_MODEL || "gemini-3.5-flash-lite",
  storyCacheEnabled: process.env.STORY_CACHE_ENABLED !== "false",
  storyCacheTtlMs: parseInt(process.env.STORY_CACHE_TTL_MS || "86400000", 10),
  // 24 hours
  aiRequestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || "45000", 10),
  // 45 seconds
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "15", 10),
  // 15 req/min
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10)
};

// backend/src/routes/api.routes.ts
import { Router as Router7 } from "express";

// backend/src/routes/health.routes.ts
import { Router } from "express";

// backend/src/controllers/health.controller.ts
var startTime = Date.now();
var getHealth = (_req, res) => {
  const healthData = {
    status: "ok",
    service: "ai-toon-backend",
    version: "0.1.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1e3)
  };
  const response = {
    success: true,
    data: healthData,
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  res.status(200).json(response);
};

// backend/src/routes/health.routes.ts
var router = Router();
router.get("/", getHealth);
var health_routes_default = router;

// backend/src/routes/story.routes.ts
import { Router as Router2 } from "express";

// backend/src/services/ai/gemini.provider.ts
var GeminiProvider = class {
  name = "Google Gemini (Free Tier)";
  model;
  apiKey;
  constructor(apiKey, model = "gemini-3.5-flash-lite") {
    this.apiKey = apiKey.trim();
    this.model = model;
  }
  isConfigured() {
    return Boolean(
      this.apiKey && !this.apiKey.includes("your-free-tier") && !this.apiKey.includes("your-gemini-api-key")
    );
  }
  // Testing simulation hook
  simulation = null;
  setSimulation(sim) {
    this.simulation = sim;
  }
  async generateStory(request, timeoutMs = 45e3) {
    if (!this.isConfigured()) {
      throw new Error(
        "Gemini API key is not configured on the server. Set GEMINI_API_KEY in backend/.env or explore our built-in example stories."
      );
    }
    const startTime2 = Date.now();
    const deadline = startTime2 + timeoutMs;
    const prompt = this.buildPrompt(request);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const maxRetries = 2;
    let attempt = 0;
    let lastError = null;
    console.log(
      `[GeminiProvider] Starting story generation. Model: "${this.model}", Topic: "${request.topic}", Tone: "${request.tone}", Lang: "${request.language}", Timeout: ${Math.round(timeoutMs / 1e3)}s`
    );
    while (attempt <= maxRetries) {
      attempt++;
      const now = Date.now();
      const remainingTimeMs = deadline - now;
      if (remainingTimeMs <= 1e3) {
        throw new Error(
          `AI generation timed out after ${Math.round(timeoutMs / 1e3)} seconds. Please try again in a moment.`
        );
      }
      const attemptController = new AbortController();
      const attemptTimer = setTimeout(() => attemptController.abort(), remainingTimeMs);
      try {
        console.log(
          `[GeminiProvider] Attempt ${attempt}/${maxRetries + 1}. Topic: "${request.topic}", Remaining: ${Math.round(remainingTimeMs / 1e3)}s`
        );
        let response;
        if (this.simulation && this.simulation.failCount > 0) {
          const simStatus = this.simulation.failStatus;
          this.simulation.failCount--;
          console.warn(`[GeminiProvider] [SIMULATION] Injecting HTTP ${simStatus} failure (Remaining sim fails: ${this.simulation.failCount})`);
          response = new Response(
            JSON.stringify({ error: { code: simStatus, message: `Simulated HTTP ${simStatus} error` } }),
            { status: simStatus, statusText: simStatus === 503 ? "Service Unavailable" : "Error" }
          );
        } else {
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            signal: attemptController.signal,
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                responseMimeType: "application/json"
              }
            })
          });
        }
        clearTimeout(attemptTimer);
        const elapsedMs = Date.now() - startTime2;
        console.log(`[GeminiProvider] Attempt ${attempt} returned HTTP ${response.status} in ${elapsedMs}ms`);
        if (response.ok) {
          const jsonResult = await response.json();
          const rawText = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) {
            throw new Error("AI Provider returned an empty generation response.");
          }
          const parsedStory = this.parseAndValidate(rawText, request);
          console.log(
            `[GeminiProvider] Story generated successfully on attempt ${attempt} in ${elapsedMs}ms. Points: ${parsedStory.keyPoints.length}, Illustrations: ${parsedStory.illustrations.length}, Quiz: ${parsedStory.quizQuestions?.length || 0}`
          );
          return parsedStory;
        }
        const status = response.status;
        const retryAfterHeader = response.headers.get("Retry-After");
        const errorText = await response.text();
        const sanitizedError = errorText.replace(/key=[^&\s]+/gi, "key=[REDACTED]").slice(0, 300);
        console.warn(
          `[GeminiProvider] Attempt ${attempt} failed with HTTP ${status}: ${sanitizedError}`
        );
        if (status === 400) {
          throw new Error("Invalid request parameters sent to AI Provider (HTTP 400).");
        }
        if (status === 401 || status === 403) {
          throw new Error("Invalid or unauthorized Gemini API key. Please verify your GEMINI_API_KEY in backend/.env.");
        }
        if (status === 404) {
          throw new Error(`Configured AI model "${this.model}" was not found (HTTP 404).`);
        }
        const isTransient = status === 503 || status === 502 || status === 504 || status === 429;
        if (!isTransient) {
          throw new Error(`AI Provider error (HTTP ${status}): ${sanitizedError}`);
        }
        if (attempt <= maxRetries) {
          let delayMs = 1500 * Math.pow(2, attempt - 1);
          const jitter = Math.floor(Math.random() * 500);
          delayMs += jitter;
          if (retryAfterHeader) {
            const parsedSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              delayMs = Math.max(delayMs, parsedSeconds * 1e3);
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
            "AI Toon is temporarily busy. Your lesson could not be generated right now. Please try again in a moment."
          );
        }
      } catch (err) {
        clearTimeout(attemptTimer);
        const elapsedMs = Date.now() - startTime2;
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            console.warn(`[GeminiProvider] Request aborted after ${elapsedMs}ms.`);
            throw new Error(
              `AI generation timed out after ${Math.round(timeoutMs / 1e3)} seconds. Please try again in a moment.`
            );
          }
          if (err.message.includes("Invalid or unauthorized") || err.message.includes("Invalid request") || err.message.includes("not found (HTTP 404)")) {
            throw err;
          }
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
          lastError = new Error("An unexpected error occurred during AI story generation.");
        }
      }
    }
    if (lastError) {
      if (lastError.message.includes("503") || lastError.message.includes("502") || lastError.message.includes("504") || lastError.message.includes("429") || lastError.message.includes("UNAVAILABLE") || lastError.message.includes("high demand") || lastError.message.includes("temporarily busy")) {
        throw new Error(
          "AI Toon is temporarily busy. Your lesson could not be generated right now. Please try again in a moment."
        );
      }
      throw lastError;
    }
    throw new Error(
      "AI Toon is temporarily busy. Your lesson could not be generated right now. Please try again in a moment."
    );
  }
  buildPrompt(request) {
    const languageNames = {
      en: "English",
      te: "Telugu (\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41)",
      hi: "Hindi (\u0939\u093F\u0902\u0926\u0940)",
      es: "Spanish",
      fr: "French",
      de: "German",
      ta: "Tamil"
    };
    const targetLang = languageNames[request.language] || "English";
    const difficulty = request.difficulty || "intermediate";
    const pointsCount = difficulty === "beginner" ? "4 to 5" : difficulty === "advanced" ? "6 to 7" : "5 to 6";
    return `You are AI Toon, an expert educator and visual learning specialist.
Explain the educational topic "${request.topic}" as an engaging point-wise learning guide supported by 2 to 3 cartoon illustrations and a 3-question quiz.

CRITICAL INSTRUCTIONS:
- DO NOT generate scenes, slides, chapters, or comic panels.
- Generate a unified, point-wise educational explanation that will be read as a single continuous article.
- Target Language: ${targetLang}. All titles, introductions, headings, bullet points, captions, takeaways, and quiz questions MUST be written in ${targetLang}.
- Educational Tone / Flavor: ${request.tone.toUpperCase()} (conversational, fun, relatable, with clever analogies, but strictly educational).
- Student Level: ${difficulty.toUpperCase()}.
- Number of Key Points: Exactly ${pointsCount} numbered points. Each point MUST have a clear heading and 1 to 3 informative bullet points.
- Illustrations: Exactly 2 to 3 educational illustration concepts that visually explain the core concepts (place them after points like point 2 and point 4).
  For each illustration, provide:
  * title: Clear title of the visual concept
  * caption: 1 sentence explaining what this visual depicts for the student
  * description: Vivid visual description of what appears in the visual
  * keyword: 1-2 words identifying the concept (e.g. "narendra_modi", "vignan_university", "binary_search", "photosynthesis")
  * searchQuery: A specific 4 to 8 word image-search query tailored to the subject and category:
    - If the topic is a PERSON (e.g. Narendra Modi, scientists, historical figures): query MUST search for an official portrait or photograph (e.g. "Narendra Modi official portrait", "Narendra Modi photograph"). NEVER search for a diagram of a person.
    - If the topic is an INSTITUTION or UNIVERSITY (e.g. Vignan University): query MUST search for the campus or official building (e.g. "Vignan University Vadlamudi campus", "Vignan University building"). NEVER search for a diagram of an institution.
    - If the topic is a PLACE or LANDMARK (e.g. Taj Mahal, India Gate): query MUST search for landmark architecture photographs (e.g. "Taj Mahal landmark photograph").
    - If the topic is an EDUCATIONAL/SCIENTIFIC concept (e.g. photosynthesis, human heart): query MUST search for labeled scientific diagrams (e.g. "photosynthesis labeled scientific diagram", "human heart labeled anatomy blood flow diagram").
    - If the topic is a TECHNICAL concept (e.g. binary search, neural networks): query MUST search for technical diagrams (e.g. "binary search sorted array middle element diagram").
  * positionIndex: After which point to display it (e.g. 2, 4)
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
      "caption": "1 sentence explaining what this visual depicts for the student",
      "description": "Vivid visual description of the visual element",
      "keyword": "concept_keyword",
      "searchQuery": "specific subject-appropriate 4 to 8 word search query",
      "positionIndex": 2
    },
    {
      "title": "Illustration 2 Title",
      "caption": "1 sentence explaining the second visual element",
      "description": "Vivid visual description",
      "keyword": "concept_keyword_2",
      "searchQuery": "specific subject-appropriate 4 to 8 word search query",
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
  parseAndValidate(rawJsonText, request) {
    let cleanText = rawJsonText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      throw new Error("Failed to parse AI output as structured story JSON.");
    }
    if (!parsed.title || !Array.isArray(parsed.keyPoints) || parsed.keyPoints.length === 0) {
      throw new Error("AI output was incomplete (missing title or educational key points).");
    }
    const storyId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const keyPoints = parsed.keyPoints.map((p, idx) => ({
      pointNumber: typeof p.pointNumber === "number" ? p.pointNumber : idx + 1,
      heading: p.heading || `Point ${idx + 1}`,
      bulletPoints: Array.isArray(p.bulletPoints) && p.bulletPoints.length > 0 ? p.bulletPoints : ["Key concept explanation."]
    }));
    const rawIllustrations = Array.isArray(parsed.illustrations) && parsed.illustrations.length > 0 ? parsed.illustrations : [
      {
        title: `${request.topic} Overview`,
        caption: `Visual overview of ${request.topic}`,
        description: `Visual illustration explaining ${request.topic}`,
        keyword: request.topic.toLowerCase().replace(/\s+/g, "_"),
        positionIndex: 2
      },
      {
        title: `${request.topic} Key Features`,
        caption: `Key characteristics of ${request.topic}`,
        description: `Detailed visual depicting ${request.topic}`,
        keyword: request.topic.toLowerCase().replace(/\s+/g, "_"),
        positionIndex: 4
      }
    ];
    const illustrations = rawIllustrations.slice(0, 3).map((ill, idx) => ({
      id: `${storyId}_ill_${idx + 1}`,
      title: ill.title || `Concept Illustration ${idx + 1}`,
      caption: ill.caption || ill.description || "Educational visual",
      description: ill.description || "Educational illustration explaining the concept",
      keyword: ill.keyword || request.topic.toLowerCase().replace(/\s+/g, "_"),
      searchQuery: ill.searchQuery || `${request.topic} ${ill.title || ""}`.trim(),
      positionIndex: typeof ill.positionIndex === "number" ? ill.positionIndex : (idx + 1) * 2
    }));
    const quizQuestions = Array.isArray(parsed.quizQuestions) ? parsed.quizQuestions.slice(0, 3).map((q, idx) => ({
      id: `${storyId}_q_${idx + 1}`,
      question: q.question,
      options: (q.options || []).map((o, oIdx) => ({
        id: o.id || String.fromCharCode(97 + oIdx),
        text: o.text || ""
      })),
      correctOptionId: q.correctOptionId || "a",
      explanation: q.explanation || "Correct answer explanation."
    })) : [];
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
      keyTakeaway: parsed.keyTakeaway || "Mastering this concept helps us understand the world around us.",
      quizQuestions,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      isCached: false,
      isExample: false,
      provider: this.name,
      summary: parsed.introduction || parsed.keyTakeaway,
      keyTakeaways: [parsed.keyTakeaway || "Key educational concept mastered."]
    };
  }
};

// backend/src/services/ai/provider.factory.ts
var cachedProvider = null;
var getAiProvider = () => {
  if (cachedProvider) {
    return cachedProvider;
  }
  const providerType = (config.aiProvider || "gemini").toLowerCase();
  switch (providerType) {
    case "gemini":
    case "google":
      cachedProvider = new GeminiProvider(config.aiApiKey, config.aiModel);
      break;
    default:
      console.warn(`[AI Provider] Unknown provider "${providerType}". Falling back to Gemini provider.`);
      cachedProvider = new GeminiProvider(config.aiApiKey, config.aiModel);
      break;
  }
  return cachedProvider;
};

// backend/src/services/cache.service.ts
var StoryCacheService = class {
  cache = /* @__PURE__ */ new Map();
  hits = 0;
  misses = 0;
  /**
   * Generates a normalized cache key based on topic, language, tone, and difficulty
   */
  generateKey(req) {
    const normTopic = req.topic.trim().toLowerCase().replace(/\s+/g, "_");
    const lang = req.language || "en";
    const tone = req.tone || "funny";
    const diff = req.difficulty || "intermediate";
    return `story_${normTopic}_${lang}_${tone}_${diff}`;
  }
  get(key) {
    if (!config.storyCacheEnabled) {
      return null;
    }
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return {
      ...entry.story,
      isCached: true
    };
  }
  set(key, story, ttlMs = config.storyCacheTtlMs) {
    if (!config.storyCacheEnabled) {
      return;
    }
    if (this.cache.size >= 200) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, {
      story,
      expiresAt: Date.now() + ttlMs
    });
  }
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? `${Math.round(this.hits / total * 100)}%` : "0%";
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate
    };
  }
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
};
var storyCache = new StoryCacheService();

// backend/src/services/exampleStories.data.ts
var BUILT_IN_EXAMPLE_STORIES = [
  {
    id: "example_photosynthesis",
    title: "How Plants Make Food: The Magic of Photosynthesis",
    topic: "Photosynthesis",
    tone: "funny",
    language: "en",
    difficulty: "beginner",
    introduction: "Plants don't need grocery stores or chef hats to eat! Through a super-cool process called photosynthesis, green leaves turn sunshine, water, and air into delicious plant food and fresh oxygen.",
    keyPoints: [
      {
        pointNumber: 1,
        heading: "Solar Collectors Inside Leaves (Chloroplasts)",
        bulletPoints: [
          "Plant cells contain microscopic food-making factories called chloroplasts.",
          "These chloroplasts are packed with a bright green pigment called chlorophyll, which grabs energy directly from sunlight like a solar panel."
        ]
      },
      {
        pointNumber: 2,
        heading: "The Underground Water Delivery (Roots & Xylem)",
        bulletPoints: [
          "Thirsty plants drink water and soil minerals deep underground through their spreading root networks.",
          "Special internal plant pipelines called xylem pump this water all the way up the stem to every leaf."
        ]
      },
      {
        pointNumber: 3,
        heading: "Inhaling Carbon Dioxide (Stomata Trapdoors)",
        bulletPoints: [
          "On the underside of every leaf are thousands of microscopic doorways called stomata.",
          "These tiny valves open wide to breathe in carbon dioxide gas floating through the air."
        ]
      },
      {
        pointNumber: 4,
        heading: "The Sweet Chemical Reaction (Making Glucose)",
        bulletPoints: [
          "Using the sun's light energy, the plant mixes water and carbon dioxide together.",
          "This reaction creates glucose\u2014a sweet, energy-rich sugar that helps stems, leaves, flowers, and fruits grow big and strong."
        ]
      },
      {
        pointNumber: 5,
        heading: "The Clean Air Bonus (Releasing Oxygen)",
        bulletPoints: [
          "As a happy bonus, photosynthesis creates pure oxygen as an extra product.",
          "The plant releases this fresh oxygen back out through its stomata into the atmosphere for humans and animals to breathe."
        ]
      }
    ],
    illustrations: [
      {
        id: "ill_photo_1",
        title: "Chef Chlorophyll at the Solar Kitchen",
        caption: "Inside plant chloroplasts, green chlorophyll pigments capture sunlight to power the food-making process.",
        description: "A cheerful cartoon leaf character wearing a chef hat, capturing golden sunbeams in a shiny solar frying pan.",
        keyword: "photosynthesis_chlorophyll",
        positionIndex: 2
      },
      {
        id: "ill_photo_2",
        title: "The Photosynthesis Equation: Sun + Water + CO\u2082 = Sugar + Oxygen",
        caption: "Plants turn water and carbon dioxide into energy-packed glucose sugar and release life-giving oxygen.",
        description: "A colorful cartoon diagram showing water droplets climbing tree roots, air bubbles entering leaves, and sparkling sugar cubes and oxygen balloons floating out.",
        keyword: "photosynthesis_sugar_oxygen",
        positionIndex: 4
      }
    ],
    keyTakeaway: "Photosynthesis is nature's ultimate solar-powered kitchen: plants use sunlight, water, and carbon dioxide to make food for themselves and clean oxygen for the entire planet!",
    quizQuestions: [
      {
        id: "quiz_photo_1",
        question: "What is the green pigment in leaves that absorbs sunlight for photosynthesis?",
        options: [
          { id: "a", text: "Melanin" },
          { id: "b", text: "Chlorophyll" },
          { id: "c", text: "Hemoglobin" },
          { id: "d", text: "Carotene" }
        ],
        correctOptionId: "b",
        explanation: "Chlorophyll is the green pigment inside plant chloroplasts that captures light energy from the sun."
      },
      {
        id: "quiz_photo_2",
        question: "Which gas do plants take in from the atmosphere through microscopic leaf pores (stomata)?",
        options: [
          { id: "a", text: "Nitrogen" },
          { id: "b", text: "Helium" },
          { id: "c", text: "Carbon Dioxide" },
          { id: "d", text: "Methane" }
        ],
        correctOptionId: "c",
        explanation: "Plants absorb carbon dioxide (CO\u2082) from the air through microscopic openings called stomata."
      },
      {
        id: "quiz_photo_3",
        question: "What essential gas is released into the air as a byproduct of photosynthesis?",
        options: [
          { id: "a", text: "Oxygen" },
          { id: "b", text: "Carbon Monoxide" },
          { id: "c", text: "Hydrogen" },
          { id: "d", text: "Argon" }
        ],
        correctOptionId: "a",
        explanation: "Photosynthesis converts water and carbon dioxide into glucose, releasing oxygen (O\u2082) into the atmosphere for living things to breathe."
      }
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    isCached: false,
    isExample: true,
    provider: "AI Toon Built-in Catalog",
    summary: "How green leaves turn sunlight, water, and carbon dioxide into glucose sugar and fresh oxygen.",
    keyTakeaways: ["Plants capture sunlight using chlorophyll.", "Photosynthesis makes glucose sugar for plant energy.", "Oxygen is released for all living creatures."]
  },
  {
    id: "example_solar_system",
    title: "Wonders of Our Solar System: The Sun and Its 8 Worlds",
    topic: "The Solar System",
    tone: "adventure",
    language: "en",
    difficulty: "intermediate",
    introduction: "Our solar system is a bustling cosmic neighborhood bound together by gravity, centered around a dazzling yellow star we call the Sun.",
    keyPoints: [
      {
        pointNumber: 1,
        heading: "The Blazing Centerpiece: The Sun",
        bulletPoints: [
          "The Sun contains over 99.8% of all the mass in the entire solar system.",
          "Its tremendous gravitational grip acts like an invisible cosmic tether, keeping every planet, moon, and asteroid in stable orbit."
        ]
      },
      {
        pointNumber: 2,
        heading: "The Rocky Inner Planets (Terrestrial Worlds)",
        bulletPoints: [
          "The four inner planets closest to the Sun are Mercury, Venus, Earth, and Mars.",
          "These worlds have solid, rocky surfaces; Earth is uniquely blessed with liquid oceans and breathable air, while Mars features red iron-oxide dust."
        ]
      },
      {
        pointNumber: 3,
        heading: "The Asteroid Belt: The Cosmic Highway Divider",
        bulletPoints: [
          "Between Mars and Jupiter lies a vast donut-shaped region filled with millions of rocky remnants called asteroids.",
          "This belt cleanly marks the boundary separating the inner rocky planets from the outer giants."
        ]
      },
      {
        pointNumber: 4,
        heading: "The Gas & Ice Giants: Jupiter, Saturn, Uranus & Neptune",
        bulletPoints: [
          "Jupiter is the king of planets with a swirling hurricane storm (the Great Red Spot) larger than planet Earth.",
          "Saturn boasts breathtaking rings made of billions of shimmering water-ice chunks, while Uranus and Neptune are freezing, high-wind ice giants."
        ]
      },
      {
        pointNumber: 5,
        heading: "The Outer Frontier: Kuiper Belt and Beyond",
        bulletPoints: [
          "Past Neptune lies the chilly Kuiper Belt, home to icy dwarf planets like Pluto and long-period comets.",
          'Comets are giant "dirty snowballs" that sprout brilliant glowing tails when their orbits bring them close to the warming Sun.'
        ]
      }
    ],
    illustrations: [
      {
        id: "ill_solar_1",
        title: "The Inner Rocky Squad vs. The Outer Giants",
        caption: "Our solar system features four dense terrestrial planets up close and four gargantuan gas and ice giants in the outer orbit.",
        description: "A vibrant cartoon solar system map showing the smiling Sun shining on rocky Mercury, Venus, Earth, Mars, followed by massive striped Jupiter and ringed Saturn.",
        keyword: "solar_system_planets",
        positionIndex: 2
      },
      {
        id: "ill_solar_2",
        title: "Saturn's Sparkling Ice Rings & Asteroid Belt",
        caption: "Saturn's famous rings consist of countless chunks of reflective water-ice and rock orbiting in harmony.",
        description: "A playful astronaut cat peering out of a spaceship window at golden-striped Saturn adorned with shining ice rings in deep space.",
        keyword: "saturn_rings_space",
        positionIndex: 4
      }
    ],
    keyTakeaway: "Our solar system consists of eight distinct planetary worlds governed by the Sun's gravity, ranging from sun-baked inner rocks to majestic, ringed outer giants!",
    quizQuestions: [
      {
        id: "quiz_solar_1",
        question: "Which is the largest planet in our solar system?",
        options: [
          { id: "a", text: "Saturn" },
          { id: "b", text: "Jupiter" },
          { id: "c", text: "Neptune" },
          { id: "d", text: "Earth" }
        ],
        correctOptionId: "b",
        explanation: "Jupiter is the largest planet in the solar system, with more mass than all other planets combined."
      },
      {
        id: "quiz_solar_2",
        question: "What keeps the planets in orbit around the Sun instead of drifting into deep space?",
        options: [
          { id: "a", text: "Magnetic force" },
          { id: "b", text: "Solar wind" },
          { id: "c", text: "The Sun's gravitational pull" },
          { id: "d", text: "Atmospheric pressure" }
        ],
        correctOptionId: "c",
        explanation: "The immense mass of the Sun produces powerful gravitational attraction that holds all orbiting bodies in stable elliptical paths."
      },
      {
        id: "quiz_solar_3",
        question: "What are the magnificent rings of Saturn primarily composed of?",
        options: [
          { id: "a", text: "Water ice chunks and dust" },
          { id: "b", text: "Molten gold and copper" },
          { id: "c", text: "Solid diamond sheets" },
          { id: "d", text: "Burning gases" }
        ],
        correctOptionId: "a",
        explanation: "Saturn's rings are made almost entirely of billions of pieces of water ice, ranging from tiny specks to house-sized boulders."
      }
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    isCached: false,
    isExample: true,
    provider: "AI Toon Built-in Catalog",
    summary: "Explore our 8 planetary worlds orbiting around the powerful central Sun.",
    keyTakeaways: ["The Sun makes up over 99.8% of the system's mass.", "The four inner planets are rocky, outer four are giants.", "Gravity keeps all orbits stable."]
  },
  {
    id: "example_water_cycle",
    title: "Earth's Endless Water Ride: The Global Water Cycle",
    topic: "The Water Cycle",
    tone: "comic",
    language: "en",
    difficulty: "beginner",
    introduction: "Every sip of water you drink today was once part of a cloud, a prehistoric glacier, or even a dinosaur's bath! Water on Earth is constantly moving in a giant, endless recycling loop.",
    keyPoints: [
      {
        pointNumber: 1,
        heading: "Evaporation: The Skyward Lift",
        bulletPoints: [
          "The Sun's heat warms surface water in oceans, lakes, and rivers.",
          "This heat energy transforms liquid water into invisible gas called water vapor, which rises gracefully into the warm air."
        ]
      },
      {
        pointNumber: 2,
        heading: "Transpiration: Plants Joining the Cycle",
        bulletPoints: [
          "It's not just oceans that give off water\u2014trees and plants also release moisture from tiny leaf pores.",
          'This plant "perspiration" process is called transpiration and adds millions of gallons of vapor to the sky every day.'
        ]
      },
      {
        pointNumber: 3,
        heading: "Condensation: Building Fluffy Clouds",
        bulletPoints: [
          "As water vapor climbs miles high into the cold upper atmosphere, it cools down and clumps together.",
          "Billions of tiny cooled water droplets cling to airborne dust particles, puffing up to form white cumulus clouds."
        ]
      },
      {
        pointNumber: 4,
        heading: "Precipitation: The Rainy Skydive",
        bulletPoints: [
          "When cloud droplets bump into each other and become too heavy to float in the air currents, gravity takes over.",
          "They tumble down to Earth as precipitation\u2014which can be rain, snow, sleet, or hail depending on the temperature."
        ]
      },
      {
        pointNumber: 5,
        heading: "Collection & Runoff: Returning to the Source",
        bulletPoints: [
          "Fallen rainwater trickles through soil into underground aquifers or runs down mountain streams into rivers.",
          "Eventually, it returns to the lakes and vast oceans, ready to be heated by the sun and start the entire ride all over again!"
        ]
      }
    ],
    illustrations: [
      {
        id: "ill_water_1",
        title: "Evaporation & Condensation in the Sky",
        caption: "Solar energy evaporates surface water into vapor, which cools in the upper atmosphere to form clouds.",
        description: "Smiling cartoon water droplets gaining tiny vapor wings under a warm sun, ascending together into a puffy cloud squad.",
        keyword: "water_evaporation_cloud",
        positionIndex: 2
      },
      {
        id: "ill_water_2",
        title: "Precipitation & The Return Flow",
        caption: "Raindrops parachute from heavy clouds to water soils and rivers, returning to lakes in an endless cycle.",
        description: "Energetic cartoon raindrops with safety goggles skydiving into a glistening blue river that curves through green hills.",
        keyword: "precipitation_river_cycle",
        positionIndex: 4
      }
    ],
    keyTakeaway: "The water cycle is Earth's natural recycling engine: water continuously evaporates, condenses into clouds, precipitates as rain, and collects to repeat the cycle forever!",
    quizQuestions: [
      {
        id: "quiz_water_1",
        question: "What process turns liquid water from oceans and lakes into invisible gas vapor?",
        options: [
          { id: "a", text: "Condensation" },
          { id: "b", text: "Evaporation" },
          { id: "c", text: "Precipitation" },
          { id: "d", text: "Filtration" }
        ],
        correctOptionId: "b",
        explanation: "Evaporation is the process where heat energy causes liquid water to transform into gaseous water vapor."
      },
      {
        id: "quiz_water_2",
        question: "When rising water vapor cools high in the sky and clumps together on dust particles, it forms:",
        options: [
          { id: "a", text: "Clouds" },
          { id: "b", text: "Rainbows" },
          { id: "c", text: "Hurricanes" },
          { id: "d", text: "Sandstorms" }
        ],
        correctOptionId: "a",
        explanation: "Condensation occurs as water vapor cools in the upper atmosphere, clustering into billions of micro-droplets that form clouds."
      },
      {
        id: "quiz_water_3",
        question: "What is it called when water drops fall from clouds as rain, snow, sleet, or hail?",
        options: [
          { id: "a", text: "Transpiration" },
          { id: "b", text: "Sublimation" },
          { id: "c", text: "Precipitation" },
          { id: "d", text: "Photosynthesis" }
        ],
        correctOptionId: "c",
        explanation: "Precipitation is any liquid or frozen water that forms in the atmosphere and falls back down to Earth's surface."
      }
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    isCached: false,
    isExample: true,
    provider: "AI Toon Built-in Catalog",
    summary: "Discover how water continuously journeys through evaporation, condensation, and precipitation.",
    keyTakeaways: ["Water changes states between liquid, vapor, and ice.", "The Sun powers the entire water cycle.", "All water on Earth is continuously recycled."]
  }
];

// backend/src/services/imageSearch/imageDeduplicator.ts
function extractCanonicalFileIdentifier(target) {
  if (!target) return "";
  let raw = "";
  if (typeof target === "string") {
    raw = target;
  } else if (target.title && target.title.toLowerCase().startsWith("file:")) {
    raw = target.title;
  } else if (target.imageUrl) {
    raw = target.imageUrl;
  } else if (target.thumbnailUrl) {
    raw = target.thumbnailUrl;
  } else if (target.title) {
    raw = target.title;
  } else if (target.id) {
    raw = target.id;
  }
  if (raw.includes("/wikipedia/commons/")) {
    const afterCommons = raw.split("/wikipedia/commons/")[1] || "";
    if (afterCommons.startsWith("thumb/")) {
      const parts = afterCommons.split("/");
      if (parts.length >= 4) {
        raw = parts[3];
      } else {
        raw = parts[parts.length - 1];
      }
    } else {
      const parts = afterCommons.split("/");
      raw = parts[parts.length - 1];
    }
  }
  raw = raw.split("?")[0].split("#")[0];
  raw = raw.replace(/^file[:%3A]+/i, "");
  raw = raw.replace(/^\d+px-/i, "");
  try {
    raw = decodeURIComponent(raw);
  } catch {
  }
  return raw.replace(/_/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}
function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  const clean = url.trim().split("?")[0].split("#")[0];
  const match = clean.match(/^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/([0-9a-f]\/[0-9a-f]{2}\/[^/]+)\/\d+px-[^/]+$/i);
  if (match) {
    return `https://upload.wikimedia.org/wikipedia/commons/${match[1]}`;
  }
  return clean.toLowerCase();
}
function deduplicateCandidates(candidates, existingUsedIdentifiers = /* @__PURE__ */ new Set()) {
  const seenInList = /* @__PURE__ */ new Set();
  const unique = [];
  for (const candidate of candidates) {
    const canonical = extractCanonicalFileIdentifier(candidate);
    const normUrl = candidate.imageUrl ? normalizeImageUrl(candidate.imageUrl) : "";
    const isUsed = canonical && existingUsedIdentifiers.has(canonical) || candidate.id && existingUsedIdentifiers.has(candidate.id) || normUrl && existingUsedIdentifiers.has(normUrl);
    const isDuplicateInList = canonical && seenInList.has(canonical) || candidate.id && seenInList.has(candidate.id) || normUrl && seenInList.has(normUrl);
    if (!isUsed && !isDuplicateInList) {
      if (canonical) seenInList.add(canonical);
      if (candidate.id) seenInList.add(candidate.id);
      if (normUrl) seenInList.add(normUrl);
      unique.push(candidate);
    }
  }
  return unique;
}
function registerUsedImage(image, usedSet) {
  const canonical = extractCanonicalFileIdentifier(image);
  if (canonical) usedSet.add(canonical);
  if (image.id) usedSet.add(image.id);
  if (image.imageUrl) usedSet.add(normalizeImageUrl(image.imageUrl));
  if (image.thumbnailUrl) usedSet.add(normalizeImageUrl(image.thumbnailUrl));
}

// backend/src/services/imageSearch/wikimedia.provider.ts
var WikimediaImageProvider = class {
  name = "Wikimedia Commons API";
  userAgent = "AIToonEducationalApp/1.0 (https://github.com/ai-toon; contact: educational-app@example.com)";
  async searchImages(query, options = {}, limit = 10) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];
    const timeoutMs = options.timeoutMs ?? 8e3;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const searchQuery = `${cleanQuery} -filetype:pdf -filetype:djvu`;
      const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        searchQuery
      )}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=800&format=json`;
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json"
        },
        signal: controller.signal
      });
      if (!res.ok) {
        console.warn(`[WikimediaProvider] HTTP ${res.status} response for query "${cleanQuery}"`);
        return [];
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("json")) {
        console.warn(`[WikimediaProvider] Non-JSON response for query "${cleanQuery}": ${contentType}`);
        return [];
      }
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.warn(`[WikimediaProvider] Failed to parse JSON response for "${cleanQuery}":`, parseErr);
        return [];
      }
      const pages = Object.values(data.query?.pages || {});
      if (pages.length === 0) {
        return [];
      }
      const candidates = [];
      const queryTokens = this.tokenize(cleanQuery);
      const entityCategory = options.entityCategory || "other";
      const entityName = options.entityName || "";
      const entityTokens = entityName ? this.tokenize(entityName) : [];
      for (const page of pages) {
        const info = page.imageinfo?.[0];
        if (!info || !info.url) continue;
        const mime = (info.mime || "").toLowerCase();
        const lowerTitle = page.title.toLowerCase();
        const isSupportedImage = (mime === "image/jpeg" || mime === "image/png" || mime === "image/svg+xml" || mime === "image/webp") && !lowerTitle.endsWith(".pdf") && !lowerTitle.endsWith(".djvu") && !lowerTitle.endsWith(".tif") && !lowerTitle.endsWith(".tiff");
        if (!isSupportedImage) continue;
        if (info.width && info.width < 180 || info.height && info.height < 140) {
          continue;
        }
        const ext = info.extmetadata || {};
        const rawArtist = ext.Artist?.value || "";
        const author = this.cleanHtml(rawArtist) || "Wikimedia Commons contributor";
        const license = ext.LicenseShortName?.value || ext.License?.value || "Open License";
        const licenseUrl = ext.LicenseUrl?.value;
        const attribution = this.cleanHtml(ext.Credit?.value || ext.UsageTerms?.value) || author;
        const description = this.cleanHtml(ext.ImageDescription?.value) || "";
        const score = this.calculateRelevance(
          page.title,
          description,
          queryTokens,
          entityCategory,
          entityName,
          entityTokens,
          options.secondaryContext,
          mime,
          info.width,
          info.height
        );
        if (score <= 0) continue;
        const cleanTitle = page.title.replace(/^File:/i, "").replace(/\.[^.]+$/, "").replace(/_/g, " ").trim();
        const canonicalSourceUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`;
        candidates.push({
          score,
          result: {
            id: `wiki_${page.pageid}`,
            title: cleanTitle,
            imageUrl: info.thumburl || info.url,
            thumbnailUrl: info.thumburl || info.url,
            sourcePageUrl: canonicalSourceUrl,
            author,
            license,
            licenseUrl,
            attribution,
            width: info.width,
            height: info.height,
            mime: info.mime,
            sourceType: "wikimedia",
            entityCategory
          }
        });
      }
      if (candidates.length === 0) {
        return [];
      }
      candidates.sort((a, b) => b.score - a.score);
      const excludedSet = /* @__PURE__ */ new Set();
      if (options.excludeIdentifiers && Array.isArray(options.excludeIdentifiers)) {
        for (const id of options.excludeIdentifiers) {
          const canonical = extractCanonicalFileIdentifier(id);
          if (canonical) excludedSet.add(canonical);
          excludedSet.add(id);
        }
      }
      const deduplicated = deduplicateCandidates(
        candidates.map((c) => c.result),
        excludedSet
      );
      return deduplicated.slice(0, limit);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.warn(`[WikimediaProvider] Image search timed out after ${timeoutMs}ms for query "${cleanQuery}"`);
      } else {
        console.warn(`[WikimediaProvider] Image search failed for query "${cleanQuery}":`, err);
      }
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
  async searchImage(query, options = {}) {
    const results = await this.searchImages(query, options, 1);
    return results[0] || null;
  }
  tokenize(text) {
    const stopWords = /* @__PURE__ */ new Set([
      "the",
      "and",
      "for",
      "with",
      "from",
      "into",
      "that",
      "this",
      "how",
      "does",
      "work",
      "what",
      "file",
      "image",
      "photo"
    ]);
    return text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  }
  calculateRelevance(title, description, queryTokens, entityCategory, entityName, entityTokens, secondaryContext, mime, width, height) {
    const combined = `${title} ${description}`.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const isPhoto = mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
    const isSvg = mime === "image/svg+xml";
    const genericInstitutionWords = /* @__PURE__ */ new Set([
      "university",
      "college",
      "institute",
      "institution",
      "school",
      "academy",
      "foundation",
      "corporation",
      "company",
      "ltd",
      "inc",
      "org",
      "organization",
      "hospital",
      "center",
      "centre",
      "department"
    ]);
    const genericPersonWords = /* @__PURE__ */ new Set([
      "shri",
      "mr",
      "mrs",
      "ms",
      "dr",
      "prof",
      "professor",
      "sir",
      "lord",
      "president",
      "minister",
      "prime",
      "pm",
      "king",
      "queen",
      "leader",
      "politician"
    ]);
    if (entityCategory === "person" || entityCategory === "institution") {
      const lowerEntity = entityName.toLowerCase().trim();
      const genericSet = entityCategory === "institution" ? genericInstitutionWords : genericPersonWords;
      const distinctiveTokens = entityTokens.filter((t) => !genericSet.has(t));
      if (lowerEntity.includes("narendra modi") || lowerEntity.includes("modi")) {
        const hasModiMatch = lowerTitle.includes("modi") || combined.includes("modi");
        if (!hasModiMatch) {
          return 0;
        }
      } else if (lowerEntity.includes("vignan")) {
        const hasVignanMatch = lowerTitle.includes("vignan") || combined.includes("vignan");
        if (!hasVignanMatch) {
          return 0;
        }
      } else {
        const hasDistinctiveMatch = lowerEntity.length > 3 && combined.includes(lowerEntity) || distinctiveTokens.length > 0 && distinctiveTokens.some((token) => combined.includes(token));
        if (distinctiveTokens.length > 0 && !hasDistinctiveMatch) {
          return 0;
        }
      }
    }
    let score = 0;
    for (const token of queryTokens) {
      if (lowerTitle.includes(token)) {
        score += 4;
      } else if (combined.includes(token)) {
        score += 2;
      }
    }
    if (entityName) {
      const lowerEntity = entityName.toLowerCase().trim();
      if (lowerTitle.includes(lowerEntity)) {
        score += 20;
      } else if (combined.includes(lowerEntity)) {
        score += 10;
      }
    }
    if (secondaryContext) {
      const secTokens = this.tokenize(secondaryContext);
      for (const st of secTokens) {
        if (combined.includes(st)) {
          score += 12;
        }
      }
    }
    switch (entityCategory) {
      case "person": {
        if (isPhoto) score += 12;
        if (isSvg) score -= 8;
        if (lowerTitle.includes("portrait")) score += 12;
        if (lowerTitle.includes("official")) score += 10;
        if (lowerTitle.includes("photograph") || lowerTitle.includes("photo")) score += 8;
        if (lowerTitle.includes("prime minister") || lowerTitle.includes("president")) score += 6;
        if (lowerTitle.includes("address") || lowerTitle.includes("speech") || lowerTitle.includes("meeting")) {
          score += 6;
        }
        if (combined.includes("caricature") || combined.includes("satire") || combined.includes("graffiti") || combined.includes("parody")) {
          score -= 20;
        }
        break;
      }
      case "institution": {
        if (isPhoto) score += 8;
        if (lowerTitle.includes("building") || lowerTitle.includes("campus")) score += 14;
        if (lowerTitle.includes("university") || lowerTitle.includes("college")) score += 6;
        if (lowerTitle.includes("entrance") || lowerTitle.includes("gate") || lowerTitle.includes("library")) score += 10;
        if (lowerTitle.includes("vadlamudi")) score += 15;
        if (lowerTitle.includes("logo")) score += 5;
        if (isSvg && lowerTitle.includes("diagram")) score -= 10;
        break;
      }
      case "place": {
        if (isPhoto) score += 8;
        if (lowerTitle.includes("landmark") || lowerTitle.includes("monument")) score += 10;
        if (lowerTitle.includes("view") || lowerTitle.includes("architecture")) score += 8;
        break;
      }
      case "scientific": {
        if (combined.includes("diagram")) score += 16;
        if (combined.includes("labeled") || combined.includes("anatomy")) score += 12;
        if (combined.includes("scheme") || combined.includes("schematic")) score += 8;
        if (combined.includes("cycle") || combined.includes("process")) score += 8;
        if (combined.includes("blood flow")) score += 10;
        if (combined.includes("chloroplast") || combined.includes("photosynthesis")) score += 10;
        if (isSvg) score += 8;
        break;
      }
      case "technical": {
        if (combined.includes("diagram")) score += 16;
        if (combined.includes("tree") || combined.includes("array") || combined.includes("search")) score += 10;
        if (combined.includes("neural network") || combined.includes("architecture") || combined.includes("model")) score += 10;
        if (combined.includes("flowchart") || combined.includes("algorithm") || combined.includes("structure")) score += 8;
        if (isSvg) score += 8;
        break;
      }
      default: {
        if (combined.includes("diagram") || combined.includes("illustration")) score += 4;
        break;
      }
    }
    if (width && width >= 600) score += 2;
    if (height && height >= 400) score += 2;
    return score;
  }
  cleanHtml(html) {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  }
};
var wikimediaProvider = new WikimediaImageProvider();

// backend/src/services/imageSearch/imageSearch.cache.ts
var ImageSearchCache = class {
  cache = /* @__PURE__ */ new Map();
  inFlight = /* @__PURE__ */ new Map();
  inFlightCandidates = /* @__PURE__ */ new Map();
  defaultTtlMs;
  hits = 0;
  misses = 0;
  constructor(ttlHours = 24) {
    this.defaultTtlMs = ttlHours * 60 * 60 * 1e3;
  }
  normalizeKey(query, options) {
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
    const cat = options?.entityCategory ? `__${options.entityCategory}` : "";
    const ent = options?.entityName ? `__${options.entityName.toLowerCase().trim()}` : "";
    return `${cleanQuery}${cat}${ent}`;
  }
  get(query, options) {
    const key = this.normalizeKey(query, options);
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return void 0;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return void 0;
    }
    this.hits++;
    return entry.result;
  }
  getCandidates(query, options) {
    const key = this.normalizeKey(query, options);
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return void 0;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return void 0;
    }
    this.hits++;
    return entry.candidates;
  }
  set(query, result, options, ttlMs) {
    const key = this.normalizeKey(query, options);
    this.cache.set(key, {
      result,
      candidates: result ? [result] : [],
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs)
    });
  }
  setCandidates(query, candidates, options, ttlMs) {
    const key = this.normalizeKey(query, options);
    this.cache.set(key, {
      result: candidates[0] || null,
      candidates,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs)
    });
  }
  async getOrFetch(query, fetchFn, options) {
    const key = this.normalizeKey(query, options);
    const cached = this.get(query, options);
    if (cached !== void 0) {
      return cached;
    }
    const existingPromise = this.inFlight.get(key);
    if (existingPromise) {
      return existingPromise;
    }
    const fetchPromise = (async () => {
      try {
        const result = await fetchFn(key);
        this.set(query, result, options);
        return result;
      } catch (err) {
        this.set(query, null, options, 5 * 60 * 1e3);
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, fetchPromise);
    return fetchPromise;
  }
  async getOrFetchCandidates(query, fetchFn, options) {
    const key = this.normalizeKey(query, options);
    const cached = this.getCandidates(query, options);
    if (cached !== void 0) {
      return cached;
    }
    const existingPromise = this.inFlightCandidates.get(key);
    if (existingPromise) {
      return existingPromise;
    }
    const fetchPromise = (async () => {
      try {
        const candidates = await fetchFn(key);
        this.setCandidates(query, candidates, options);
        return candidates;
      } catch (err) {
        this.setCandidates(query, [], options, 5 * 60 * 1e3);
        throw err;
      } finally {
        this.inFlightCandidates.delete(key);
      }
    })();
    this.inFlightCandidates.set(key, fetchPromise);
    return fetchPromise;
  }
  getStats() {
    const total = this.hits + this.misses;
    const rate = total === 0 ? "0%" : `${Math.round(this.hits / total * 100)}%`;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: rate
    };
  }
  clear() {
    this.cache.clear();
    this.inFlight.clear();
    this.inFlightCandidates.clear();
    this.hits = 0;
    this.misses = 0;
  }
};
var imageSearchCache = new ImageSearchCache(24);

// backend/src/services/imageSearch/entityClassifier.ts
var QUESTION_PREFIXES = [
  /^(who\s+is\s+|who\s+was\s+)/i,
  /^(what\s+is\s+|what\s+are\s+)/i,
  /^(how\s+does\s+|how\s+do\s+|how\s+to\s+|how\s+is\s+)/i,
  /^(why\s+does\s+|why\s+is\s+)/i,
  /^(tell\s+me\s+about\s+|explain\s+|biography\s+of\s+|history\s+of\s+)/i,
  /^(the\s+story\s+of\s+|guide\s+to\s+)/i
];
var QUESTION_SUFFIXES = [
  /\s+(work|works|pumps?\s+blood|functions?|operate|explained)\??$/i,
  /\s*\?+$/
];
var INSTITUTION_KEYWORDS = [
  "university",
  "college",
  "institute",
  "school",
  "academy",
  "vidyalaya",
  "foundation",
  "corporation",
  "company",
  "agency",
  "hospital",
  "laboratory",
  "vignan",
  "iit",
  "nit",
  "bits",
  "stanford",
  "harvard",
  "oxford",
  "cambridge",
  "mit",
  "isro",
  "nasa",
  "cern",
  "who",
  "unesco",
  "unicef"
];
var PLACE_KEYWORDS = [
  "gate",
  "mahal",
  "tower",
  "bridge",
  "fort",
  "palace",
  "temple",
  "statue",
  "monument",
  "pyramid",
  "colosseum",
  "mountain",
  "everest",
  "river",
  "ganga",
  "yamuna",
  "amazon",
  "nile",
  "ocean",
  "canyon",
  "falls",
  "island",
  "india gate",
  "taj mahal",
  "eiffel tower",
  "red fort",
  "statue of unity"
];
var SCIENTIFIC_KEYWORDS = [
  "photosynthesis",
  "heart",
  "cardiac",
  "blood flow",
  "earthquake",
  "seismic",
  "tectonic",
  "plate tectonics",
  "water cycle",
  "solar system",
  "cell",
  "mitosis",
  "meiosis",
  "dna",
  "rna",
  "respiration",
  "digestive",
  "nervous system",
  "neuron",
  "brain",
  "lungs",
  "kidney",
  "atom",
  "molecule",
  "gravity",
  "magnetism",
  "electromagnetism",
  "light refraction",
  "photosynthetic",
  "chloroplast",
  "chlorophyll",
  "volcano",
  "osmosis",
  "ecosystem",
  "food chain",
  "carbon cycle"
];
var TECHNICAL_KEYWORDS = [
  "binary search",
  "search algorithm",
  "sorting",
  "bubble sort",
  "merge sort",
  "quicksort",
  "algorithm",
  "data structure",
  "linked list",
  "stack",
  "queue",
  "hash table",
  "tree",
  "graph",
  "artificial intelligence",
  "neural network",
  "machine learning",
  "deep learning",
  "operating system",
  "compiler",
  "database",
  "sql",
  "blockchain",
  "cryptography",
  "cybersecurity",
  "computer network",
  "tcp",
  "ip address",
  "udp",
  "recursion",
  "dynamic programming",
  "big o",
  "cpu",
  "gpu",
  "cloud computing"
];
var KNOWN_PEOPLE = [
  "narendra modi",
  "modi",
  "apj abdul kalam",
  "abdul kalam",
  "albert einstein",
  "einstein",
  "isaac newton",
  "newton",
  "alan turing",
  "turing",
  "marie curie",
  "mahatma gandhi",
  "gandhi",
  "charles darwin",
  "darwin",
  "nikola tesla",
  "tesla",
  "srinivasa ramanujan",
  "ramanujan",
  "stephen hawking",
  "william shakespeare",
  "shakespeare",
  "abraham lincoln",
  "george washington",
  "nelson mandela",
  "subhas chandra bose",
  "bhagat singh",
  "ada lovelace",
  "galileo",
  "galilei",
  "aristotle",
  "plato",
  "socrates",
  "steve jobs",
  "bill gates",
  "elon musk",
  "sundar pichai",
  "satya nadella"
];
var HONORIFICS = [
  /\b(shri|mr|mrs|ms|dr|prof|professor|sir|lord|president|prime\s+minister|pm|king|queen)\b/i
];
var EntityClassifier = class {
  /**
   * Cleans a user topic into its core entity name and detects secondary context (e.g. location)
   */
  cleanTopic(rawTopic) {
    let text = rawTopic.trim();
    for (const prefix of QUESTION_PREFIXES) {
      text = text.replace(prefix, "");
    }
    for (const suffix of QUESTION_SUFFIXES) {
      text = text.replace(suffix, "");
    }
    text = text.trim();
    if (text.includes(",")) {
      const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          cleanName: parts[0],
          context: parts.slice(1).join(" ")
        };
      }
    }
    return { cleanName: text };
  }
  /**
   * Classifies a topic into an educational entity category
   */
  classify(rawTopic) {
    const { cleanName, context } = this.cleanTopic(rawTopic);
    const lower = cleanName.toLowerCase();
    const rawLower = rawTopic.toLowerCase();
    for (const person of KNOWN_PEOPLE) {
      if (lower === person || lower.includes(person) || rawLower.includes(person)) {
        return {
          category: "person",
          confidence: 0.95,
          entityName: cleanName,
          secondaryContext: context
        };
      }
    }
    for (const hon of HONORIFICS) {
      if (hon.test(cleanName) || hon.test(rawTopic)) {
        return {
          category: "person",
          confidence: 0.85,
          entityName: cleanName,
          secondaryContext: context
        };
      }
    }
    for (const inst of INSTITUTION_KEYWORDS) {
      if (lower.includes(inst) || rawLower.includes(inst)) {
        return {
          category: "institution",
          confidence: 0.92,
          entityName: cleanName,
          secondaryContext: context
        };
      }
    }
    for (const place of PLACE_KEYWORDS) {
      if (lower.includes(place) || rawLower.includes(place)) {
        return {
          category: "place",
          confidence: 0.88,
          entityName: cleanName,
          secondaryContext: context
        };
      }
    }
    for (const tech of TECHNICAL_KEYWORDS) {
      if (lower.includes(tech) || rawLower.includes(tech)) {
        return {
          category: "technical",
          confidence: 0.9,
          entityName: cleanName,
          secondaryContext: context
        };
      }
    }
    for (const sci of SCIENTIFIC_KEYWORDS) {
      if (lower.includes(sci) || rawLower.includes(sci)) {
        return {
          category: "scientific",
          confidence: 0.9,
          entityName: cleanName,
          secondaryContext: context
        };
      }
    }
    const words = cleanName.split(/\s+/).filter(Boolean);
    const isCapitalizedName = words.length >= 2 && words.length <= 3 && words.every((w) => /^[A-Z][a-z]+$/.test(w)) && !["How", "What", "Why", "Who", "When", "Where", "The"].includes(words[0]);
    if (isCapitalizedName) {
      return {
        category: "person",
        confidence: 0.7,
        entityName: cleanName,
        secondaryContext: context
      };
    }
    return {
      category: "other",
      confidence: 0.5,
      entityName: cleanName,
      secondaryContext: context
    };
  }
  /**
   * Generates prioritized, entity-aware search queries tailored to the illustration slot
   */
  generateQueries(classification, extraHint, slotIndex = 0) {
    const { category, entityName, secondaryContext } = classification;
    const queries = [];
    const hintLower = (extraHint || "").toLowerCase();
    switch (category) {
      case "person": {
        if (slotIndex === 0) {
          queries.push(`${entityName} official portrait`);
          queries.push(`${entityName} portrait`);
          queries.push(`${entityName} photograph`);
          queries.push(entityName);
        } else {
          queries.push(`${entityName} speech photograph`);
          queries.push(`${entityName} official photograph`);
          queries.push(`${entityName} photograph`);
          queries.push(`${entityName} portrait`);
          queries.push(entityName);
        }
        break;
      }
      case "institution": {
        if (slotIndex === 0) {
          if (secondaryContext) {
            queries.push(`${entityName} ${secondaryContext}`);
            queries.push(`${entityName} ${secondaryContext} building`);
          }
          queries.push(`${entityName}`);
          queries.push(`${entityName} building`);
          queries.push(`${entityName} campus`);
        } else {
          if (secondaryContext) {
            queries.push(`${entityName} ${secondaryContext} building`);
            queries.push(`${entityName} ${secondaryContext}`);
          }
          queries.push(`${entityName} building`);
          queries.push(`${entityName} entrance`);
          queries.push(`${entityName} library`);
          queries.push(`${entityName}`);
        }
        break;
      }
      case "place": {
        if (secondaryContext) {
          queries.push(`${entityName} ${secondaryContext} landmark`);
        }
        queries.push(`${entityName} landmark photograph`);
        queries.push(`${entityName} architecture`);
        queries.push(entityName);
        break;
      }
      case "scientific": {
        const lower = entityName.toLowerCase();
        if (lower.includes("photosynthesis")) {
          if (slotIndex === 0 || hintLower.includes("process") || hintLower.includes("sunlight")) {
            queries.push("photosynthesis process diagram");
            queries.push("photosynthesis diagram");
            queries.push("photosynthesis labeled diagram");
          } else {
            queries.push("chloroplast diagram");
            queries.push("photosynthesis equation diagram");
            queries.push("photosynthesis light reaction diagram");
            queries.push("photosynthesis diagram");
          }
        } else if (lower.includes("heart")) {
          if (slotIndex === 0 || hintLower.includes("anatomy") || hintLower.includes("chamber")) {
            queries.push("human heart diagram");
            queries.push("heart anatomy diagram");
            queries.push("human heart labeled anatomy");
          } else {
            queries.push("heart diagram blood flow");
            queries.push("cardiac cycle diagram");
            queries.push("human heart blood flow diagram");
            queries.push("human heart diagram");
          }
        } else if (lower.includes("earthquake") || lower.includes("seismic") || lower.includes("tectonic")) {
          if (slotIndex === 0) {
            queries.push("earthquake fault line diagram");
            queries.push("tectonic plates diagram");
          } else {
            queries.push("seismic shock waves diagram");
            queries.push("earthquake focus epicenter diagram");
          }
        } else if (lower.includes("water cycle")) {
          if (slotIndex === 0) {
            queries.push("water cycle process diagram");
            queries.push("water cycle diagram");
          } else {
            queries.push("water cycle precipitation evaporation diagram");
            queries.push("water cycle diagram");
          }
        } else if (lower.includes("solar system")) {
          if (slotIndex === 0) {
            queries.push("solar system planets orbit diagram");
            queries.push("solar system diagram");
          } else {
            queries.push("inner rocky planets outer gas giants diagram");
            queries.push("solar system diagram");
          }
        } else {
          queries.push(`${entityName} process diagram`);
          queries.push(`${entityName} labeled diagram`);
          queries.push(`${entityName} diagram`);
        }
        break;
      }
      case "technical": {
        const lower = entityName.toLowerCase();
        if (lower.includes("binary search")) {
          if (slotIndex === 0 || hintLower.includes("algorithm") || hintLower.includes("overview")) {
            queries.push("binary search diagram");
            queries.push("binary search algorithm diagram");
            queries.push("binary search algorithm");
          } else {
            queries.push("binary search sorted array diagram");
            queries.push("binary search tree");
            queries.push("binary search example");
            queries.push("binary search diagram");
          }
        } else if (lower.includes("artificial intelligence") || lower === "ai") {
          if (slotIndex === 0 || hintLower.includes("overview") || hintLower.includes("system")) {
            queries.push("artificial intelligence diagram");
            queries.push("artificial intelligence workflow diagram");
            queries.push("artificial intelligence");
          } else {
            queries.push("neural network architecture diagram");
            queries.push("deep learning neural network diagram");
            queries.push("machine learning diagram");
            queries.push("artificial intelligence diagram");
          }
        } else if (lower.includes("neural network")) {
          queries.push("neural network architecture diagram");
          queries.push("deep learning neural network diagram");
          queries.push("neural network diagram");
        } else {
          queries.push(`${entityName} algorithm diagram`);
          queries.push(`${entityName} architecture diagram`);
          queries.push(`${entityName} diagram`);
          queries.push(entityName);
        }
        break;
      }
      case "other":
      default: {
        if (extraHint) {
          queries.push(`${entityName} ${extraHint}`);
        }
        queries.push(entityName);
        break;
      }
    }
    if (extraHint && extraHint.trim().length > 3) {
      const cleanHint = extraHint.replace(/illustration|figure|\d+/gi, "").trim();
      if (cleanHint.length > 3 && category !== "person") {
        queries.push(`${entityName} ${cleanHint} diagram`);
      }
    }
    return Array.from(new Set(queries.map((q) => q.trim()))).filter((q) => q.length > 0);
  }
};
var entityClassifier = new EntityClassifier();

// backend/src/services/imageSearch/imageSearch.service.ts
var ImageSearchService = class {
  constructor(provider = wikimediaProvider) {
    this.provider = provider;
  }
  provider;
  /**
   * Retrieves a ranked list of candidate images for a query, using cache and in-flight deduplication
   */
  async findEducationalCandidates(query, options = {}, limit = 8) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];
    const cacheKey = `${cleanQuery}__candidates__${options.entityCategory || "all"}`;
    return imageSearchCache.getOrFetchCandidates(
      cacheKey,
      async () => {
        console.log(
          `[ImageSearchService] Fetching candidates for: "${cleanQuery}" (Entity: ${options.entityCategory || "auto"}, Name: "${options.entityName || ""}")`
        );
        if (typeof this.provider.searchImages === "function") {
          return await this.provider.searchImages(cleanQuery, options, limit);
        }
        const single = await this.provider.searchImage(cleanQuery, options);
        return single ? [single] : [];
      },
      options
    );
  }
  /**
   * Searches for a single relevant educational image using entity-aware classification and queries
   */
  async findEducationalImage(query, options = {}) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;
    const cacheKey = `${cleanQuery}__${options.entityCategory || "all"}`;
    return imageSearchCache.getOrFetch(
      cacheKey,
      async () => {
        console.log(
          `[ImageSearchService] Searching image for: "${cleanQuery}" (Entity: ${options.entityCategory || "auto"}, Name: "${options.entityName || ""}")`
        );
        const result = await this.provider.searchImage(cleanQuery, options);
        if (result) {
          console.log(
            `[ImageSearchService] Found image for "${cleanQuery}": "${result.title}" (${result.license}) [MIME: ${result.mime || "unknown"}]`
          );
          return result;
        }
        return null;
      },
      options
    );
  }
  /**
   * Enhances all illustrations in an educational lesson with entity-aware authentic public media.
   * Guarantees:
   * 1. No duplicate images within the lesson (canonical identifier, page ID, and normalized URL tracking).
   * 2. Distinct candidate selection for different concepts/slots.
   * 3. Graceful SVG fallback if fewer than 2 distinct suitable images exist without duplicating or choosing unrelated images.
   * 4. Multi-candidate caching and fallback URLs for frontend retry.
   */
  async enhanceStoryIllustrations(story) {
    if (!Array.isArray(story.illustrations) || story.illustrations.length === 0) {
      return story;
    }
    const classification = entityClassifier.classify(story.topic);
    console.log(
      `[ImageSearchService] Classified topic "${story.topic}" as [${classification.category.toUpperCase()}] (confidence: ${classification.confidence}, entity: "${classification.entityName}")`
    );
    const usedIdentifiers = /* @__PURE__ */ new Set();
    const enhancedIllustrations = [];
    for (let idx = 0; idx < story.illustrations.length; idx++) {
      const ill = story.illustrations[idx];
      const pairedKeyPoint = this.findPairedKeyPoint(story.keyPoints, ill, idx);
      const queries = this.buildPrioritizedQueries(story.topic, classification, ill, idx, pairedKeyPoint);
      const searchOptions = {
        entityCategory: classification.category,
        entityName: classification.entityName,
        secondaryContext: classification.secondaryContext,
        excludeIdentifiers: Array.from(usedIdentifiers)
      };
      let chosenCandidate = null;
      let successfulQuery = "";
      const backupCandidateUrls = [];
      for (const candidateQuery of queries) {
        try {
          const candidates = await this.findEducationalCandidates(candidateQuery, searchOptions, 6);
          const unusedCandidates = deduplicateCandidates(candidates, usedIdentifiers);
          if (unusedCandidates.length > 0) {
            if (!chosenCandidate) {
              chosenCandidate = unusedCandidates[0];
              successfulQuery = candidateQuery;
              registerUsedImage(chosenCandidate, usedIdentifiers);
              for (let cIdx = 1; cIdx < unusedCandidates.length; cIdx++) {
                const alt = unusedCandidates[cIdx];
                const altUrl = alt.thumbnailUrl || alt.imageUrl;
                if (altUrl && !backupCandidateUrls.includes(altUrl)) {
                  backupCandidateUrls.push(altUrl);
                }
              }
              break;
            }
          }
        } catch (err) {
          console.warn(`[ImageSearchService] Query "${candidateQuery}" failed:`, err);
        }
      }
      if (chosenCandidate) {
        enhancedIllustrations.push({
          ...ill,
          searchQuery: successfulQuery || ill.searchQuery,
          imageUrl: chosenCandidate.imageUrl,
          thumbnailUrl: chosenCandidate.thumbnailUrl,
          sourcePageUrl: chosenCandidate.sourcePageUrl,
          author: chosenCandidate.author,
          license: chosenCandidate.license,
          licenseUrl: chosenCandidate.licenseUrl,
          attribution: chosenCandidate.attribution,
          width: chosenCandidate.width,
          height: chosenCandidate.height,
          sourceType: "wikimedia",
          alternativeUrls: backupCandidateUrls.slice(0, 3)
        });
      } else {
        console.log(
          `[ImageSearchService] No distinct verified public image found for "${story.topic}" (slot ${idx + 1}). Using topic-specific SVG fallback.`
        );
        enhancedIllustrations.push({
          ...ill,
          searchQuery: queries[0] || ill.searchQuery,
          imageUrl: void 0,
          thumbnailUrl: void 0,
          sourceType: "svg_fallback",
          alternativeUrls: []
        });
      }
    }
    return {
      ...story,
      illustrations: enhancedIllustrations
    };
  }
  /**
   * Matches an illustration to its corresponding educational key point
   */
  findPairedKeyPoint(keyPoints, ill, idx) {
    if (!Array.isArray(keyPoints) || keyPoints.length === 0) return void 0;
    if (typeof ill.positionIndex === "number") {
      const match = keyPoints.find((kp) => kp.pointNumber === ill.positionIndex);
      if (match) return match;
    }
    return keyPoints[idx] || keyPoints[0];
  }
  /**
   * Generates a ranked list of search queries tailored to the entity category, illustration slot, and concept
   */
  buildPrioritizedQueries(topic, classification, ill, illustrationIndex, pairedKeyPoint) {
    const candidateQueries = [];
    const titleHint = (ill.title || "").replace(/illustration|figure|\d+/gi, "").trim();
    const headingHint = pairedKeyPoint?.heading ? pairedKeyPoint.heading.trim() : "";
    const extraHint = titleHint || headingHint;
    const entityQueries = entityClassifier.generateQueries(classification, extraHint, illustrationIndex);
    for (const eq of entityQueries) {
      candidateQueries.push(eq);
    }
    if (ill.searchQuery && ill.searchQuery.trim().length >= 8 && !ill.searchQuery.toLowerCase().includes("undefined")) {
      candidateQueries.push(ill.searchQuery.trim());
    }
    if (classification.category === "scientific" || classification.category === "technical") {
      if (titleHint.length > 2) {
        candidateQueries.push(`${classification.entityName} ${titleHint} diagram`);
      }
      if (headingHint.length > 2 && headingHint !== titleHint) {
        candidateQueries.push(`${classification.entityName} ${headingHint} diagram`);
      }
    }
    return Array.from(new Set(candidateQueries.map((q) => q.trim()))).filter((q) => q.length > 0);
  }
};
var imageSearchService = new ImageSearchService();

// backend/src/services/story.service.ts
var StoryService = class {
  constructor(getProvider = getAiProvider) {
    this.getProvider = getProvider;
  }
  getProvider;
  /**
   * Generates or retrieves a story for the student
   */
  async getOrGenerateStory(request) {
    const topic = request.topic?.trim();
    if (!topic) {
      throw new Error("Please specify an academic topic for the story.");
    }
    const cacheKey = storyCache.generateKey(request);
    const cachedStory = storyCache.get(cacheKey);
    if (cachedStory) {
      return { story: cachedStory, cached: true };
    }
    const matchingExample = this.findMatchingExample(topic);
    const provider = this.getProvider();
    if (!provider.isConfigured()) {
      if (matchingExample) {
        const enhancedExample = await imageSearchService.enhanceStoryIllustrations(matchingExample);
        return { story: enhancedExample, cached: false };
      }
      throw new Error(
        "No AI API key is configured on the server. Please set GEMINI_API_KEY in backend/.env, or choose one of our built-in example stories (Photosynthesis, The Solar System, or The Water Cycle)."
      );
    }
    try {
      const generated = await provider.generateStory(request, config.aiRequestTimeoutMs);
      let finalStory = generated;
      try {
        finalStory = await imageSearchService.enhanceStoryIllustrations(generated);
      } catch (imgErr) {
        console.warn("[StoryService] Image enhancement failed, continuing with SVG fallback:", imgErr);
      }
      storyCache.set(cacheKey, finalStory);
      return { story: finalStory, cached: false };
    } catch (err) {
      if (matchingExample) {
        console.warn(`[StoryService] Live AI generation failed. Falling back to built-in example for "${topic}".`, err);
        const enhancedFallback = await imageSearchService.enhanceStoryIllustrations(matchingExample);
        return { story: enhancedFallback, cached: false };
      }
      throw err;
    }
  }
  /**
   * Returns all available built-in example stories
   */
  getBuiltInExamples() {
    return BUILT_IN_EXAMPLE_STORIES;
  }
  /**
   * Returns a single built-in example story by ID
   */
  getBuiltInExampleById(id) {
    return BUILT_IN_EXAMPLE_STORIES.find((s) => s.id === id) || null;
  }
  /**
   * Inspects provider configuration & cache metrics
   */
  getStatus() {
    const provider = this.getProvider();
    return {
      providerName: provider.name,
      model: provider.model,
      isConfigured: provider.isConfigured(),
      cacheStats: storyCache.getStats()
    };
  }
  findMatchingExample(topic) {
    const clean = topic.trim().toLowerCase();
    if (!clean) return null;
    const examplePatterns = [
      {
        id: "example_photosynthesis",
        patterns: [
          /\bphotosynthesis\b/i,
          /\bhow plants make food\b/i,
          /\bchloroplast(s)?\b/i,
          /\bchlorophyll\b/i
        ]
      },
      {
        id: "example_solar_system",
        patterns: [
          /\bsolar system\b/i,
          /\bplanets of (the|our) sun\b/i,
          /\bplanets in (the|our) solar system\b/i,
          /\beight planets\b/i
        ]
      },
      {
        id: "example_water_cycle",
        patterns: [
          /\bwater cycle\b/i,
          /\bhydrologic(al)? cycle\b/i
        ]
      }
    ];
    for (const item of examplePatterns) {
      const isMatch = item.patterns.some((pattern) => pattern.test(clean));
      if (isMatch) {
        return BUILT_IN_EXAMPLE_STORIES.find((s) => s.id === item.id) || null;
      }
    }
    return null;
  }
};
var storyService = new StoryService();

// backend/src/services/member.service.ts
import fs2 from "fs";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import {
  MAX_ADMIN_LIMIT
} from "@ai-toon/shared";
import os from "os";
var serviceDir = process.cwd();
try {
  if (typeof import.meta !== "undefined" && import.meta?.url) {
    serviceDir = path2.dirname(fileURLToPath2(import.meta.url));
  }
} catch {
}
function resolveDataDir() {
  const candidates = [
    path2.resolve(process.cwd(), "backend/data"),
    path2.resolve(process.cwd(), "data"),
    path2.resolve(serviceDir, "../../data"),
    path2.resolve(serviceDir, "../data")
  ];
  for (const c of candidates) {
    if (fs2.existsSync(c)) {
      try {
        fs2.accessSync(c, fs2.constants.W_OK);
        return c;
      } catch {
      }
    }
  }
  try {
    const defaultDir = candidates[0];
    fs2.mkdirSync(defaultDir, { recursive: true });
    fs2.accessSync(defaultDir, fs2.constants.W_OK);
    return defaultDir;
  } catch {
    const tmpDir = path2.resolve(os.tmpdir(), "ai-toon-data");
    if (!fs2.existsSync(tmpDir)) {
      try {
        fs2.mkdirSync(tmpDir, { recursive: true });
      } catch {
      }
    }
    return tmpDir;
  }
}
var DATA_DIR = resolveDataDir();
var DATA_FILE = path2.resolve(DATA_DIR, "members.json");
var NOTIFICATIONS_FILE = path2.resolve(DATA_DIR, "notifications.json");
var LOGIN_AUDIT_FILE = path2.resolve(DATA_DIR, "login-audit.json");
var ADMIN_AUDIT_FILE = path2.resolve(DATA_DIR, "admin-audit.json");
var SETTINGS_FILE = path2.resolve(DATA_DIR, "settings.json");
var QUIZ_ATTEMPTS_FILE = path2.resolve(DATA_DIR, "quiz-attempts.json");
var USER_STORIES_FILE = path2.resolve(DATA_DIR, "user-stories.json");
var MASTER_ADMIN_EMAIL = "muni57575751@gmail.com";
var MASTER_ADMIN_PASSWORD = "Poola@1234";
var INITIAL_MEMBERS = [
  {
    id: "admin-muni-master",
    email: MASTER_ADMIN_EMAIL,
    fullName: "Muni (Super Admin)",
    password: MASTER_ADMIN_PASSWORD,
    role: "admin",
    verificationStatus: "verified",
    sessionStatus: "logged_out",
    lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastLoginAt: (/* @__PURE__ */ new Date()).toISOString(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    verifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
    verifiedBy: "System Master Root"
  }
];
var DEFAULT_SETTINGS = {
  userApprovalRequired: true,
  storyGenerationEnabled: true,
  aiModel: "gemini-3.5-flash-lite",
  maxStoryLength: 5,
  searchProvider: "wikipedia-wikimedia",
  imageProvider: "wikimedia",
  supportedLanguages: ["en", "te", "hi", "es", "fr", "de", "ta"],
  contentSafetyStrict: true,
  dataRetentionDays: 90
};
var MemberService = class {
  members = /* @__PURE__ */ new Map();
  notifications = /* @__PURE__ */ new Map();
  loginAudit = [];
  adminAudit = [];
  quizAttempts = [];
  userStories = /* @__PURE__ */ new Map();
  // userId -> Story[]
  settings = { ...DEFAULT_SETTINGS };
  constructor() {
    this.initStore();
  }
  initStore() {
    try {
      if (!fs2.existsSync(DATA_DIR)) {
        fs2.mkdirSync(DATA_DIR, { recursive: true });
      }
      let resetNeeded = false;
      if (fs2.existsSync(DATA_FILE)) {
        const raw = fs2.readFileSync(DATA_FILE, "utf-8");
        try {
          const list = JSON.parse(raw);
          if (list.some((m) => m.email === "admin@aitoon.edu" || m.email.includes("@aitoon.edu"))) {
            resetNeeded = true;
          } else {
            for (const item of list) {
              this.members.set(item.id, item);
            }
          }
        } catch {
          resetNeeded = true;
        }
      } else {
        resetNeeded = true;
      }
      if (resetNeeded || !this.getMemberByEmail(MASTER_ADMIN_EMAIL)) {
        this.members.clear();
        for (const item of INITIAL_MEMBERS) {
          this.members.set(item.id, item);
        }
        this.saveToFile();
      }
      if (fs2.existsSync(NOTIFICATIONS_FILE)) {
        try {
          const raw = fs2.readFileSync(NOTIFICATIONS_FILE, "utf-8");
          const notifs = JSON.parse(raw);
          for (const n of notifs) {
            this.notifications.set(n.id, n);
          }
        } catch {
          this.notifications.clear();
          this.saveNotificationsToFile();
        }
      }
      if (fs2.existsSync(LOGIN_AUDIT_FILE)) {
        try {
          this.loginAudit = JSON.parse(fs2.readFileSync(LOGIN_AUDIT_FILE, "utf-8"));
        } catch {
          this.loginAudit = [];
        }
      }
      if (fs2.existsSync(ADMIN_AUDIT_FILE)) {
        try {
          this.adminAudit = JSON.parse(fs2.readFileSync(ADMIN_AUDIT_FILE, "utf-8"));
        } catch {
          this.adminAudit = [];
        }
      }
      if (fs2.existsSync(SETTINGS_FILE)) {
        try {
          this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(fs2.readFileSync(SETTINGS_FILE, "utf-8")) };
        } catch {
          this.settings = { ...DEFAULT_SETTINGS };
        }
      }
      if (fs2.existsSync(QUIZ_ATTEMPTS_FILE)) {
        try {
          this.quizAttempts = JSON.parse(fs2.readFileSync(QUIZ_ATTEMPTS_FILE, "utf-8"));
        } catch {
          this.quizAttempts = [];
        }
      }
      if (fs2.existsSync(USER_STORIES_FILE)) {
        try {
          const raw = JSON.parse(fs2.readFileSync(USER_STORIES_FILE, "utf-8"));
          for (const [uid, stories] of Object.entries(raw)) {
            this.userStories.set(uid, stories);
          }
        } catch {
          this.userStories.clear();
        }
      }
    } catch (err) {
      console.warn("[MemberService] Could not access local storage file, using in-memory store:", err);
      this.members.clear();
      for (const item of INITIAL_MEMBERS) {
        this.members.set(item.id, item);
      }
    }
  }
  saveToFile() {
    try {
      if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
      fs2.writeFileSync(DATA_FILE, JSON.stringify(Array.from(this.members.values()), null, 2), "utf-8");
    } catch (err) {
      console.warn("[MemberService] Failed to persist members to disk:", err);
    }
  }
  saveNotificationsToFile() {
    try {
      if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
      fs2.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(Array.from(this.notifications.values()), null, 2), "utf-8");
    } catch (err) {
      console.warn("[MemberService] Failed to persist notifications to disk:", err);
    }
  }
  saveLoginAuditToFile() {
    try {
      if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
      fs2.writeFileSync(LOGIN_AUDIT_FILE, JSON.stringify(this.loginAudit.slice(-200), null, 2), "utf-8");
    } catch (err) {
      console.warn("[MemberService] Failed to persist login audit to disk:", err);
    }
  }
  saveAdminAuditToFile() {
    try {
      if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
      fs2.writeFileSync(ADMIN_AUDIT_FILE, JSON.stringify(this.adminAudit.slice(-200), null, 2), "utf-8");
    } catch (err) {
      console.warn("[MemberService] Failed to persist admin audit to disk:", err);
    }
  }
  saveSettingsToFile() {
    try {
      if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
      fs2.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), "utf-8");
    } catch (err) {
      console.warn("[MemberService] Failed to persist settings to disk:", err);
    }
  }
  saveQuizAttemptsToFile() {
    try {
      if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
      fs2.writeFileSync(QUIZ_ATTEMPTS_FILE, JSON.stringify(this.quizAttempts.slice(-500), null, 2), "utf-8");
    } catch (err) {
      console.warn("[MemberService] Failed to persist quiz attempts to disk:", err);
    }
  }
  saveUserStoriesToFile() {
    try {
      if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
      const record = {};
      for (const [uid, stories] of this.userStories.entries()) {
        record[uid] = stories.slice(-50);
      }
      fs2.writeFileSync(USER_STORIES_FILE, JSON.stringify(record, null, 2), "utf-8");
    } catch (err) {
      console.warn("[MemberService] Failed to persist user stories to disk:", err);
    }
  }
  // --- Member Retrieval & Statistics ---
  getAllMembers(filter) {
    let list = Array.from(this.members.values());
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (m) => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
      );
    }
    if (filter?.status) {
      list = list.filter((m) => m.sessionStatus === filter.status);
    }
    if (filter?.role) {
      list = list.filter((m) => m.role === filter.role);
    }
    if (filter?.verificationStatus) {
      list = list.filter((m) => m.verificationStatus === filter.verificationStatus);
    }
    return list.sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (a.role !== "admin" && b.role === "admin") return 1;
      if (a.sessionStatus === "logged_in" && b.sessionStatus !== "logged_in") return -1;
      if (a.sessionStatus !== "logged_in" && b.sessionStatus === "logged_in") return 1;
      return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    });
  }
  getMemberById(id) {
    return this.members.get(id);
  }
  getMemberByEmail(email) {
    const normalized = email.toLowerCase().trim();
    for (const m of this.members.values()) {
      if (m.email.toLowerCase().trim() === normalized) {
        return m;
      }
    }
    return void 0;
  }
  getAdminCount() {
    let count = 0;
    for (const m of this.members.values()) {
      if (m.role === "admin") count++;
    }
    return count;
  }
  getStats() {
    let loggedInCount = 0;
    let loggedOutCount = 0;
    let adminCount = 0;
    let userCount = 0;
    let pendingCount = 0;
    let suspendedCount = 0;
    let unreadNotificationsCount = 0;
    for (const m of this.members.values()) {
      if (m.sessionStatus === "logged_in") loggedInCount++;
      else loggedOutCount++;
      if (m.role === "admin") adminCount++;
      else userCount++;
      if (m.verificationStatus === "pending") pendingCount++;
      if (m.verificationStatus === "suspended") suspendedCount++;
    }
    for (const n of this.notifications.values()) {
      if (!n.read && n.status === "pending") {
        unreadNotificationsCount++;
      }
    }
    return {
      totalMembers: this.members.size,
      loggedInCount,
      loggedOutCount,
      adminCount,
      maxAdmins: MAX_ADMIN_LIMIT,
      userCount,
      pendingCount,
      suspendedCount,
      unreadNotificationsCount
    };
  }
  // --- Authentication with Login Audit Logging ---
  authenticate(email, password, meta) {
    const normalized = email.toLowerCase().trim();
    if (normalized === MASTER_ADMIN_EMAIL.toLowerCase()) {
      if (password === MASTER_ADMIN_PASSWORD) {
        let master = this.getMemberByEmail(MASTER_ADMIN_EMAIL);
        if (!master) {
          master = INITIAL_MEMBERS[0];
          this.members.set(master.id, master);
        }
        master.sessionStatus = "logged_in";
        master.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
        master.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
        this.saveToFile();
        this.recordLoginAttempt({
          userId: master.id,
          email: master.email,
          success: true,
          ip: meta?.ip,
          browser: meta?.browser,
          userAgent: meta?.userAgent
        });
        return { success: true, member: master };
      } else {
        this.recordLoginAttempt({
          email: normalized,
          success: false,
          reason: "Invalid administrator password",
          ip: meta?.ip,
          browser: meta?.browser,
          userAgent: meta?.userAgent
        });
        return {
          success: false,
          code: "INVALID_CREDENTIALS",
          error: "Invalid administrator credentials. Please check your password."
        };
      }
    }
    const member = this.getMemberByEmail(normalized);
    if (!member) {
      this.recordLoginAttempt({
        email: normalized,
        success: false,
        reason: "Account not found",
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent
      });
      return {
        success: false,
        code: "USER_NOT_FOUND",
        error: "No account found with this email. Please create an account first."
      };
    }
    if (member.password && member.password !== password) {
      this.recordLoginAttempt({
        userId: member.id,
        email: member.email,
        success: false,
        reason: "Incorrect password",
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent
      });
      return {
        success: false,
        code: "INVALID_PASSWORD",
        error: "Invalid password. Please check your password."
      };
    }
    if (member.verificationStatus === "pending") {
      this.recordLoginAttempt({
        userId: member.id,
        email: member.email,
        success: false,
        reason: "Pending administrator approval",
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent
      });
      return {
        success: false,
        code: "PENDING_APPROVAL",
        error: `Your account registration is awaiting approval from the Administrator (${MASTER_ADMIN_EMAIL}). A notification has been sent to the admin portal. You will be able to log in once approved.`
      };
    }
    if (member.verificationStatus === "suspended") {
      this.recordLoginAttempt({
        userId: member.id,
        email: member.email,
        success: false,
        reason: "Account suspended",
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent
      });
      return {
        success: false,
        code: "ACCOUNT_SUSPENDED",
        error: "Your account has been suspended by an administrator. Please contact support."
      };
    }
    if (member.verificationStatus === "rejected") {
      this.recordLoginAttempt({
        userId: member.id,
        email: member.email,
        success: false,
        reason: "Account rejected",
        ip: meta?.ip,
        browser: meta?.browser,
        userAgent: meta?.userAgent
      });
      return {
        success: false,
        code: "ACCOUNT_REJECTED",
        error: "Your account registration was not approved by the administrator."
      };
    }
    member.sessionStatus = "logged_in";
    member.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
    member.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
    this.members.set(member.id, member);
    this.saveToFile();
    this.recordLoginAttempt({
      userId: member.id,
      email: member.email,
      success: true,
      ip: meta?.ip,
      browser: meta?.browser,
      userAgent: meta?.userAgent
    });
    return { success: true, member };
  }
  // --- Registration & Notification ---
  register(name, email, password) {
    const normalized = email.toLowerCase().trim();
    if (normalized === MASTER_ADMIN_EMAIL.toLowerCase()) {
      return {
        success: false,
        error: "This email is reserved for the Master Administrator. Please sign in instead."
      };
    }
    if (this.getMemberByEmail(normalized)) {
      return {
        success: false,
        error: "An account with this email address already exists."
      };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newMemberId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const initialStatus = this.settings.userApprovalRequired ? "pending" : "verified";
    const newMember = {
      id: newMemberId,
      email: normalized,
      fullName: name.trim(),
      password,
      role: "user",
      verificationStatus: initialStatus,
      sessionStatus: "logged_out",
      lastActiveAt: now,
      lastLoginAt: now,
      createdAt: now,
      verifiedAt: initialStatus === "verified" ? now : void 0,
      verifiedBy: initialStatus === "verified" ? "System (Auto-Approval)" : void 0
    };
    this.members.set(newMember.id, newMember);
    this.saveToFile();
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const notification = {
      id: notifId,
      type: "NEW_REGISTRATION",
      memberId: newMember.id,
      fullName: newMember.fullName,
      email: newMember.email,
      createdAt: now,
      read: false,
      status: initialStatus === "verified" ? "approved" : "pending"
    };
    this.notifications.set(notification.id, notification);
    this.saveNotificationsToFile();
    return {
      success: true,
      pendingApproval: initialStatus === "pending",
      member: newMember,
      notification
    };
  }
  // --- Notifications Management ---
  getNotifications() {
    return Array.from(this.notifications.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  approveNotification(notificationId, role = "user", adminEmail = MASTER_ADMIN_EMAIL) {
    const notif = this.notifications.get(notificationId);
    if (!notif) {
      return { success: false, error: "Notification not found." };
    }
    const member = this.getMemberById(notif.memberId) || this.getMemberByEmail(notif.email);
    if (!member) {
      return { success: false, error: "Corresponding member not found." };
    }
    if (role === "admin" && member.role !== "admin") {
      const currentAdmins = this.getAdminCount();
      if (currentAdmins >= MAX_ADMIN_LIMIT) {
        return {
          success: false,
          error: `Cannot approve as Admin. Maximum limit of ${MAX_ADMIN_LIMIT} administrators has been reached (${currentAdmins}/${MAX_ADMIN_LIMIT}).`
        };
      }
      member.role = "admin";
    } else {
      member.role = role;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    member.verificationStatus = "verified";
    member.verifiedAt = now;
    member.verifiedBy = adminEmail;
    this.members.set(member.id, member);
    this.saveToFile();
    notif.status = "approved";
    notif.read = true;
    notif.actionedAt = now;
    notif.actionedBy = adminEmail;
    notif.approvedRole = member.role;
    this.notifications.set(notif.id, notif);
    this.saveNotificationsToFile();
    this.recordAdminAction({
      adminId: "admin",
      adminEmail,
      action: "APPROVE_ACCOUNT",
      targetId: member.id,
      targetEmail: member.email,
      details: { role: member.role }
    });
    return { success: true, member, notification: notif };
  }
  rejectNotification(notificationId, adminEmail = MASTER_ADMIN_EMAIL) {
    const notif = this.notifications.get(notificationId);
    if (!notif) {
      return { success: false, error: "Notification not found." };
    }
    const member = this.getMemberById(notif.memberId) || this.getMemberByEmail(notif.email);
    if (member) {
      member.verificationStatus = "rejected";
      this.members.set(member.id, member);
      this.saveToFile();
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    notif.status = "rejected";
    notif.read = true;
    notif.actionedAt = now;
    notif.actionedBy = adminEmail;
    this.notifications.set(notif.id, notif);
    this.saveNotificationsToFile();
    this.recordAdminAction({
      adminId: "admin",
      adminEmail,
      action: "REJECT_ACCOUNT",
      targetId: member?.id,
      targetEmail: member?.email
    });
    return { success: true, member, notification: notif };
  }
  markNotificationsRead() {
    for (const n of this.notifications.values()) {
      n.read = true;
    }
    this.saveNotificationsToFile();
  }
  // --- Session Status & Updates ---
  updateSessionStatus(userId, email, fullName, status = "logged_in") {
    const existing = this.getMemberById(userId) || this.getMemberByEmail(email);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (existing) {
      existing.sessionStatus = status;
      existing.lastActiveAt = now;
      if (status === "logged_in") {
        existing.lastLoginAt = now;
      }
      if (fullName && existing.fullName === "Student") {
        existing.fullName = fullName;
      }
      this.members.set(existing.id, existing);
      this.saveToFile();
      return existing;
    }
    const initialStatus = this.settings.userApprovalRequired ? "pending" : "verified";
    const newMember = {
      id: userId,
      email,
      fullName: fullName || email.split("@")[0] || "New Member",
      role: "user",
      verificationStatus: initialStatus,
      sessionStatus: status,
      lastActiveAt: now,
      lastLoginAt: now,
      createdAt: now,
      verifiedAt: initialStatus === "verified" ? now : void 0,
      verifiedBy: initialStatus === "verified" ? "System" : void 0
    };
    this.members.set(newMember.id, newMember);
    this.saveToFile();
    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: "NEW_REGISTRATION",
      memberId: newMember.id,
      fullName: newMember.fullName,
      email: newMember.email,
      createdAt: now,
      read: false,
      status: initialStatus === "verified" ? "approved" : "pending"
    };
    this.notifications.set(notif.id, notif);
    this.saveNotificationsToFile();
    return newMember;
  }
  // --- Role, Verification, Suspension ---
  setMemberRole(targetId, newRole, performedBy = MASTER_ADMIN_EMAIL) {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: `Member with id "${targetId}" not found.` };
    }
    if (newRole === "admin") {
      const currentAdmins = this.getAdminCount();
      if (target.role !== "admin" && currentAdmins >= MAX_ADMIN_LIMIT) {
        return {
          success: false,
          error: `Cannot assign Admin role. Maximum limit of ${MAX_ADMIN_LIMIT} administrators has been reached (currently ${currentAdmins}/${MAX_ADMIN_LIMIT}). Please demote an existing admin before promoting another member.`
        };
      }
    } else if (newRole === "user" && target.role === "admin") {
      const currentAdmins = this.getAdminCount();
      if (currentAdmins <= 1) {
        return {
          success: false,
          error: "Cannot demote the last remaining administrator in the system."
        };
      }
    }
    const oldRole = target.role;
    target.role = newRole;
    if (newRole === "admin" && target.verificationStatus === "pending") {
      target.verificationStatus = "verified";
      target.verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      target.verifiedBy = performedBy;
    }
    target.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
    this.members.set(target.id, target);
    this.saveToFile();
    this.recordAdminAction({
      adminId: "admin",
      adminEmail: performedBy,
      action: "UPDATE_ROLE",
      targetId: target.id,
      targetEmail: target.email,
      details: { oldRole, newRole }
    });
    return { success: true, member: target };
  }
  verifyMember(targetId, verificationStatus, newRole, performedBy = MASTER_ADMIN_EMAIL) {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: `Member with id "${targetId}" not found.` };
    }
    if (newRole === "admin" && target.role !== "admin") {
      const currentAdmins = this.getAdminCount();
      if (currentAdmins >= MAX_ADMIN_LIMIT) {
        return {
          success: false,
          error: `Cannot set Admin role. Maximum limit of ${MAX_ADMIN_LIMIT} administrators has been reached (${currentAdmins}/${MAX_ADMIN_LIMIT}).`
        };
      }
      target.role = "admin";
    } else if (newRole && newRole !== target.role) {
      if (target.role === "admin" && newRole === "user") {
        const currentAdmins = this.getAdminCount();
        if (currentAdmins <= 1) {
          return {
            success: false,
            error: "Cannot demote the last remaining administrator in the system."
          };
        }
      }
      target.role = newRole;
    }
    target.verificationStatus = verificationStatus;
    if (verificationStatus === "verified") {
      target.verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      target.verifiedBy = performedBy;
    }
    target.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
    this.members.set(target.id, target);
    this.saveToFile();
    this.recordAdminAction({
      adminId: "admin",
      adminEmail: performedBy,
      action: "VERIFY_MEMBER",
      targetId: target.id,
      targetEmail: target.email,
      details: { verificationStatus, role: target.role }
    });
    return { success: true, member: target };
  }
  suspendMember(targetId, reason = "Administrative review", adminEmail = MASTER_ADMIN_EMAIL) {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: "Member not found." };
    }
    if (target.role === "admin" && this.getAdminCount() <= 1) {
      return { success: false, error: "Cannot suspend the primary administrator." };
    }
    target.verificationStatus = "suspended";
    target.suspendedAt = (/* @__PURE__ */ new Date()).toISOString();
    target.suspendedReason = reason;
    target.sessionStatus = "logged_out";
    this.members.set(target.id, target);
    this.saveToFile();
    this.recordAdminAction({
      adminId: "admin",
      adminEmail,
      action: "SUSPEND_ACCOUNT",
      targetId: target.id,
      targetEmail: target.email,
      details: { reason }
    });
    return { success: true, member: target };
  }
  reactivateMember(targetId, adminEmail = MASTER_ADMIN_EMAIL) {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: "Member not found." };
    }
    target.verificationStatus = "verified";
    target.suspendedAt = void 0;
    target.suspendedReason = void 0;
    this.members.set(target.id, target);
    this.saveToFile();
    this.recordAdminAction({
      adminId: "admin",
      adminEmail,
      action: "REACTIVATE_ACCOUNT",
      targetId: target.id,
      targetEmail: target.email
    });
    return { success: true, member: target };
  }
  deleteMember(targetId, adminEmail = MASTER_ADMIN_EMAIL) {
    const target = this.getMemberById(targetId);
    if (!target) {
      return { success: false, error: "Member not found." };
    }
    if (target.role === "admin" && this.getAdminCount() <= 1) {
      return { success: false, error: "Cannot delete the only administrator." };
    }
    this.members.delete(targetId);
    this.saveToFile();
    this.recordAdminAction({
      adminId: "admin",
      adminEmail,
      action: "DELETE_ACCOUNT",
      targetId,
      targetEmail: target.email
    });
    return { success: true };
  }
  resetAllExceptMasterAdmin() {
    const master = this.getMemberByEmail(MASTER_ADMIN_EMAIL) || INITIAL_MEMBERS[0];
    master.sessionStatus = "logged_out";
    this.members.clear();
    this.members.set(master.id, master);
    this.notifications.clear();
    this.saveToFile();
    this.saveNotificationsToFile();
  }
  // --- Audit Trails ---
  recordLoginAttempt(event) {
    const logItem = {
      id: `login_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...event
    };
    this.loginAudit.unshift(logItem);
    this.saveLoginAuditToFile();
  }
  getLoginAuditLogs(limit = 50) {
    return this.loginAudit.slice(0, limit);
  }
  recordAdminAction(event) {
    const logItem = {
      id: `admin_act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...event
    };
    this.adminAudit.unshift(logItem);
    this.saveAdminAuditToFile();
  }
  getAdminAuditLogs(limit = 50) {
    return this.adminAudit.slice(0, limit);
  }
  // --- System Settings ---
  getSettings() {
    return { ...this.settings };
  }
  updateSettings(partial, adminEmail = MASTER_ADMIN_EMAIL) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettingsToFile();
    this.recordAdminAction({
      adminId: "admin",
      adminEmail,
      action: "UPDATE_SETTINGS",
      details: partial
    });
    return { ...this.settings };
  }
  // --- User Saved Stories & Quizzes ---
  saveUserStory(userId, story) {
    const list = this.userStories.get(userId) || [];
    const updated = [story, ...list.filter((s) => s.id !== story.id && s.topic !== story.topic)];
    this.userStories.set(userId, updated);
    this.saveUserStoriesToFile();
    return story;
  }
  getUserStories(userId) {
    return this.userStories.get(userId) || [];
  }
  recordQuizAttempt(attempt) {
    const record = {
      id: `quiz_att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...attempt
    };
    this.quizAttempts.unshift(record);
    this.saveQuizAttemptsToFile();
    return record;
  }
  getUserQuizAttempts(userId) {
    return this.quizAttempts.filter((q) => q.userId === userId);
  }
  getUserProgress(userId) {
    const userStories = this.getUserStories(userId);
    const userQuizzes = this.getUserQuizAttempts(userId);
    const totalStories = userStories.length;
    const totalQuizzes = userQuizzes.length;
    const avgScore = totalQuizzes === 0 ? 0 : Math.round(userQuizzes.reduce((acc, curr) => acc + curr.percentage, 0) / totalQuizzes);
    const topics = Array.from(new Set(userStories.map((s) => s.topic)));
    return {
      userId,
      totalStoriesRead: totalStories,
      totalQuizzesTaken: totalQuizzes,
      averageQuizScore: avgScore,
      topicsExplored: topics,
      recentStoryIds: userStories.slice(0, 5).map((s) => s.id),
      favoriteStoryIds: userStories.filter((s) => s.isFavorite).map((s) => s.id),
      lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};
var memberService = new MemberService();

// backend/src/services/webSearch/webSearch.service.ts
var WebSearchService = class {
  userAgent = "AIToonEducationalApp/1.0 (https://github.com/ai-toon; contact: educational-app@example.com)";
  /**
   * Submits a live query to indexed web and educational encyclopedic sources
   */
  async search(query, page = 1, limit = 8) {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { query: "", results: [], total: 0, provider: "AI Toon Web Index" };
    }
    const collectedResults = [];
    try {
      const wikiEndpoint = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cleanQuery
      )}&gsrlimit=15&prop=extracts|info&exintro=1&explaintext=1&exchars=400&inprop=url&format=json`;
      const wikiRes = await fetch(wikiEndpoint, {
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(6e3)
      });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const pages = Object.values(wikiData.query?.pages || {});
        for (const p of pages) {
          if (!p.fullurl || !p.title) continue;
          const snippet = (p.extract || "").replace(/\s+/g, " ").trim();
          if (!snippet) continue;
          let domain = "en.wikipedia.org";
          try {
            domain = new URL(p.fullurl).hostname;
          } catch {
          }
          collectedResults.push({
            title: p.title,
            url: p.fullurl,
            snippet: snippet.slice(0, 320) + (snippet.length > 320 ? "..." : ""),
            domain,
            publishedDate: p.touched ? p.touched.split("T")[0] : void 0,
            sourceType: "encyclopedic"
          });
        }
      }
    } catch (err) {
      console.warn(`[WebSearchService] Wikipedia search provider error for "${cleanQuery}":`, err);
    }
    try {
      const ddgEndpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(
        cleanQuery
      )}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgEndpoint, {
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(6e3)
      });
      if (ddgRes.ok) {
        const ddgData = await ddgRes.json();
        if (ddgData.AbstractText && ddgData.AbstractURL) {
          let domain = "duckduckgo.com";
          try {
            domain = new URL(ddgData.AbstractURL).hostname;
          } catch {
          }
          collectedResults.unshift({
            title: ddgData.Heading || cleanQuery,
            url: ddgData.AbstractURL,
            snippet: ddgData.AbstractText.slice(0, 320),
            domain,
            sourceType: "web"
          });
        }
        if (Array.isArray(ddgData.RelatedTopics)) {
          for (const item of ddgData.RelatedTopics) {
            const topic = item.Topics ? item.Topics[0] : item;
            if (topic?.FirstURL && topic?.Text) {
              let domain = "web";
              try {
                domain = new URL(topic.FirstURL).hostname;
              } catch {
              }
              const parts = topic.Text.split(" - ");
              const title = parts[0]?.trim() || cleanQuery;
              const snippet = parts[1]?.trim() || topic.Text;
              collectedResults.push({
                title,
                url: topic.FirstURL,
                snippet: snippet.slice(0, 280),
                domain,
                sourceType: "web"
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[WebSearchService] DuckDuckGo search provider error for "${cleanQuery}":`, err);
    }
    const seenUrls = /* @__PURE__ */ new Set();
    const deduplicated = [];
    for (const item of collectedResults) {
      const norm = item.url.toLowerCase().split("#")[0].replace(/\/+$/, "");
      if (!seenUrls.has(norm)) {
        seenUrls.add(norm);
        deduplicated.push(item);
      }
    }
    const qLower = cleanQuery.toLowerCase();
    const queryTokens = qLower.split(/\s+/).filter((w) => w.length > 2);
    deduplicated.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();
      if (titleA === qLower) scoreA += 20;
      if (titleB === qLower) scoreB += 20;
      for (const tok of queryTokens) {
        if (titleA.includes(tok)) scoreA += 5;
        if (titleB.includes(tok)) scoreB += 5;
        if (a.snippet.toLowerCase().includes(tok)) scoreA += 2;
        if (b.snippet.toLowerCase().includes(tok)) scoreB += 2;
      }
      if (a.domain.includes("wikipedia") || a.domain.includes(".edu") || a.domain.includes(".org")) scoreA += 3;
      if (b.domain.includes("wikipedia") || b.domain.includes(".edu") || b.domain.includes(".org")) scoreB += 3;
      return scoreB - scoreA;
    });
    const offset = Math.max(0, (page - 1) * limit);
    const paginated = deduplicated.slice(offset, offset + limit);
    return {
      query: cleanQuery,
      results: paginated,
      total: deduplicated.length,
      provider: "Verified Educational Search Index (Wikipedia & Web)"
    };
  }
};
var webSearchService = new WebSearchService();

// backend/src/services/qa/qa.service.ts
var QaService = class {
  /**
   * Responds to educational questions using story context and verified web citations
   */
  async answerQuestion(request) {
    const question = request.question?.trim();
    if (!question) {
      throw new Error("Please provide an educational question.");
    }
    const searchQuery = request.topic ? `${request.topic} ${question}` : question;
    const searchResponse = await webSearchService.search(searchQuery, 1, 4);
    const verifiedSources = searchResponse.results.slice(0, 3).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet
    }));
    const storyContextText = request.storyContext ? `
Lesson Context:
${request.storyContext}
` : "";
    const sourceContextText = verifiedSources.length > 0 ? `
Verified Web Research Evidence:
${verifiedSources.map((s, idx) => `[Source ${idx + 1}: ${s.title}] (${s.url})
${s.snippet}`).join("\n\n")}
` : "";
    const aiProvider = getAiProvider();
    if (aiProvider.isConfigured()) {
      try {
        const prompt = `You are AI Toon Educational Tutor, a friendly, accurate teacher for students.
Answer the following student question accurately, clearly, and engagingly.

Student Question: "${question}"
Target Language: ${request.language || "en"}
Target Learning Level: ${request.difficulty || "intermediate"}
${storyContextText}
${sourceContextText}

Instructions:
1. Provide a direct, factual answer first (1-2 clear sentences).
2. Follow with a concise, easy-to-understand explanation.
3. Provide a helpful real-world example or memorable analogy.
4. If using external facts, only cite the provided verified sources. Never invent URLs or facts.
5. If uncertain or evidence is insufficient, honestly state the uncertainty.

Required JSON format:
{
  "answer": "Direct factual answer to the question.",
  "explanation": "Clear educational breakdown of why this happens.",
  "example": "A relatable real-world example or analogy."
}
Return ONLY valid JSON.`;
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiProvider.model}:generateContent?key=${config.aiApiKey}`;
        const aiRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              // low temperature for high factual accuracy
              responseMimeType: "application/json"
            }
          }),
          signal: AbortSignal.timeout(12e3)
        });
        if (aiRes.ok) {
          const json = await aiRes.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleanText = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
            const parsed = JSON.parse(cleanText);
            return {
              question,
              answer: parsed.answer || "Here is the verified explanation for your question.",
              explanation: parsed.explanation || "",
              example: parsed.example || "",
              sources: verifiedSources.map((s) => ({ title: s.title, url: s.url }))
            };
          }
        }
      } catch (err) {
        console.warn("[QaService] AI generation error, falling back to grounded search synthesis:", err);
      }
    }
    let directAnswer = "";
    let explanation = "";
    let example = "";
    if (verifiedSources.length > 0) {
      directAnswer = verifiedSources[0].snippet.split(".")[0] + ".";
      explanation = verifiedSources[0].snippet;
      example = `For example, in ${verifiedSources[0].title}, this principle can be observed in action.`;
    } else if (request.storyContext) {
      directAnswer = `Based on your lesson, here is the key concept:`;
      explanation = request.storyContext.slice(0, 300) + "...";
      example = "Review the educational diagrams and points above for a step-by-step walkthrough.";
    } else {
      directAnswer = `Educational guide for: "${question}"`;
      explanation = "Consult your lesson points and verified reference links for in-depth educational coverage.";
      example = "Try searching with specific terms for more detailed references.";
    }
    return {
      question,
      answer: directAnswer,
      explanation,
      example,
      sources: verifiedSources.map((s) => ({ title: s.title, url: s.url }))
    };
  }
};
var qaService = new QaService();

// backend/src/controllers/story.controller.ts
var generateStoryController = async (req, res) => {
  try {
    const settings = memberService.getSettings();
    if (!settings.storyGenerationEnabled || settings.aiGenerationEnabled === false) {
      res.status(503).json({
        success: false,
        error: {
          code: "GENERATION_PAUSED",
          message: "AI Story generation is currently paused by the system administrator."
        },
        meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      });
      return;
    }
    const { topic, tone, language, difficulty } = req.body;
    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TOPIC",
          message: "Please provide a valid educational topic (at least 2 characters)."
        },
        meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      });
      return;
    }
    if (topic.trim().length > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: "TOPIC_TOO_LONG",
          message: "Topic name must be under 100 characters to conserve prompt quota."
        },
        meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      });
      return;
    }
    const validTones = ["funny", "adventure", "comic"];
    const chosenTone = validTones.includes(tone) ? tone : "funny";
    const validLanguages = ["en", "te", "hi", "es", "fr", "de", "ta"];
    const chosenLang = validLanguages.includes(language) ? language : "en";
    const validDiff = ["beginner", "intermediate", "advanced"];
    const chosenDiff = validDiff.includes(difficulty) ? difficulty : "intermediate";
    const requestPayload = {
      topic: topic.trim(),
      tone: chosenTone,
      language: chosenLang,
      difficulty: chosenDiff
    };
    const { story, cached } = await storyService.getOrGenerateStory(requestPayload);
    if (req.user?.id) {
      memberService.saveUserStory(req.user.id, story);
    }
    const response = {
      success: true,
      data: story,
      meta: {
        cached,
        provider: story.provider,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    res.status(200).json(response);
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : "Story generation failed.";
    const isBusy = rawMessage.includes("temporarily busy") || rawMessage.includes("503") || rawMessage.includes("502") || rawMessage.includes("504") || rawMessage.includes("UNAVAILABLE") || rawMessage.includes("high demand") || rawMessage.includes("timed out");
    const isAuth = rawMessage.includes("Invalid or unauthorized") || rawMessage.includes("API key") || rawMessage.includes("HTTP 401") || rawMessage.includes("HTTP 403");
    const isQuota = rawMessage.includes("quota") || rawMessage.includes("429") || rawMessage.includes("RESOURCE_EXHAUSTED");
    const isConfig = rawMessage.includes("No AI API key is configured");
    let statusCode = 500;
    let errorCode = "GENERATION_ERROR";
    let friendlyMessage = "Story generation could not be completed right now. Please try again in a moment.";
    if (isBusy) {
      statusCode = 503;
      errorCode = "AI_TEMPORARILY_BUSY";
      friendlyMessage = "AI Toon is temporarily busy. Your lesson could not be generated right now. Please try again in a moment.";
    } else if (isAuth) {
      statusCode = 401;
      errorCode = "AI_PROVIDER_AUTH_ERROR";
      friendlyMessage = "The AI provider rejected the request due to invalid credentials. Please check your API key.";
    } else if (isQuota) {
      statusCode = 429;
      errorCode = "AI_QUOTA_EXHAUSTED";
      friendlyMessage = "The free-tier AI generation quota has been reached for this minute. Please wait 60 seconds and try again.";
    } else if (isConfig) {
      statusCode = 503;
      errorCode = "AI_NOT_CONFIGURED";
      friendlyMessage = rawMessage;
    }
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: friendlyMessage,
        details: process.env.NODE_ENV !== "production" ? rawMessage : void 0
      },
      meta: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  }
};
var getExamplesController = (_req, res) => {
  const examples = storyService.getBuiltInExamples();
  const response = {
    success: true,
    data: examples,
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  res.status(200).json(response);
};
var getExampleByIdController = (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const example = storyService.getBuiltInExampleById(id);
  if (!example) {
    res.status(404).json({
      success: false,
      error: {
        code: "EXAMPLE_NOT_FOUND",
        message: `No example story found with ID "${id}".`
      },
      meta: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    return;
  }
  const response = {
    success: true,
    data: example,
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  res.status(200).json(response);
};
var getStatusController = (_req, res) => {
  const status = storyService.getStatus();
  res.status(200).json({
    success: true,
    data: status,
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var askQuestionController = async (req, res) => {
  try {
    const response = await qaService.answerQuestion(req.body);
    res.status(200).json({
      success: true,
      data: response,
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        code: "QA_ERROR",
        message: err.message || "Failed to process educational question."
      },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
  }
};
var saveQuizAttemptController = async (req, res) => {
  try {
    const { storyId, topic, score, total, totalQuestions } = req.body;
    const userId = req.user?.id || "anonymous";
    const totalCount = Number(total || totalQuestions || 0);
    const scoreCount = Number(score || 0);
    const percentage = totalCount > 0 ? Math.round(scoreCount / totalCount * 100) : 0;
    const attempt = memberService.recordQuizAttempt({
      userId,
      storyId: storyId || "general",
      topic: topic || "Educational Quiz",
      score: scoreCount,
      total: totalCount,
      percentage
    });
    res.status(200).json({
      success: true,
      data: attempt,
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        code: "QUIZ_ATTEMPT_ERROR",
        message: err.message || "Failed to record quiz score."
      },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
  }
};
var getUserStoriesController = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
    return;
  }
  const stories = memberService.getUserStories(userId);
  res.status(200).json({
    success: true,
    data: stories,
    meta: { total: stories.length, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};
var getUserProgressController = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
    return;
  }
  const progress = memberService.getUserProgress(userId);
  res.status(200).json({
    success: true,
    data: {
      ...progress,
      storiesCompleted: progress.totalStoriesRead,
      quizzesCompleted: progress.totalQuizzesTaken,
      averageScorePercentage: progress.averageQuizScore
    },
    meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};

// backend/src/middleware/rateLimit.middleware.ts
var requestMap = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, history] of requestMap.entries()) {
    history.timestamps = history.timestamps.filter((t) => now - t < config.rateLimitWindowMs);
    if (history.timestamps.length === 0) {
      requestMap.delete(ip);
    }
  }
}, 3e5);
var storyRateLimiter = (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown-client";
  const now = Date.now();
  let history = requestMap.get(ip);
  if (!history) {
    history = { timestamps: [] };
    requestMap.set(ip, history);
  }
  history.timestamps = history.timestamps.filter((t) => now - t < config.rateLimitWindowMs);
  if (history.timestamps.length >= config.rateLimitMaxRequests) {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Request limit exceeded. Please wait a moment before generating another story to protect AI quota."
      },
      meta: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    return;
  }
  history.timestamps.push(now);
  next();
};

// backend/src/middleware/auth.middleware.ts
var requireAuth = (req, res, next) => {
  const userId = req.headers["x-user-id"] || "";
  const userEmail = req.headers["x-user-email"] || "";
  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required. Please sign in to access private educational features."
      },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
    return;
  }
  const member = (userId ? memberService.getMemberById(userId) : void 0) || (userEmail ? memberService.getMemberByEmail(userEmail) : void 0);
  if (!member) {
    res.status(401).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Account not recognized. Please sign in or register to continue."
      },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
    return;
  }
  req.user = member;
  next();
};
var requireApprovedUser = (req, res, next) => {
  if (!req.user) {
    const userId = req.headers["x-user-id"] || "";
    const userEmail = req.headers["x-user-email"] || "";
    if (!userId && !userEmail) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required. Please sign in to access private educational features."
        },
        meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      });
      return;
    }
    const member = (userId ? memberService.getMemberById(userId) : void 0) || (userEmail ? memberService.getMemberByEmail(userEmail) : void 0);
    if (!member) {
      res.status(401).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "Account not recognized. Please sign in or register to continue."
        },
        meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      });
      return;
    }
    req.user = member;
  }
  const user = req.user;
  if (user.role === "admin") {
    next();
    return;
  }
  if (user.verificationStatus === "pending") {
    res.status(403).json({
      success: false,
      error: {
        code: "PENDING_APPROVAL",
        message: "Your account is currently awaiting approval from the Administrator (muni57575751@gmail.com). You cannot access story generation, quizzes, or personal learning tools until your account is approved."
      },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
    return;
  }
  if (user.verificationStatus === "suspended") {
    res.status(403).json({
      success: false,
      error: {
        code: "ACCOUNT_SUSPENDED",
        message: "Your account has been suspended by an administrator. Please contact support."
      },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
    return;
  }
  if (user.verificationStatus === "rejected") {
    res.status(403).json({
      success: false,
      error: {
        code: "ACCOUNT_REJECTED",
        message: "Your account registration was not approved by the administrator."
      },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
    return;
  }
  next();
};

// backend/src/routes/story.routes.ts
var router2 = Router2();
router2.get("/examples", getExamplesController);
router2.get("/examples/:id", getExampleByIdController);
router2.get("/status", getStatusController);
router2.post("/generate", requireApprovedUser, storyRateLimiter, generateStoryController);
router2.post("/qa", requireApprovedUser, askQuestionController);
router2.post("/quiz/attempt", requireApprovedUser, saveQuizAttemptController);
router2.get("/my-stories", requireAuth, getUserStoriesController);
router2.get("/my-progress", requireAuth, getUserProgressController);
var story_routes_default = router2;

// backend/src/routes/admin.routes.ts
import { Router as Router3 } from "express";

// backend/src/middleware/admin.middleware.ts
var requireAdmin = (req, res, next) => {
  const userId = req.headers["x-user-id"] || "";
  const userEmail = req.headers["x-user-email"] || "";
  const claimedRole = req.headers["x-user-role"] || "";
  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required: You must be signed in to access admin resources."
      },
      meta: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    return;
  }
  const member = (userId ? memberService.getMemberById(userId) : void 0) || (userEmail ? memberService.getMemberByEmail(userEmail) : void 0);
  if (!member) {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_ADMIN_ONLY",
        message: "Access denied: Member profile not found in system or not authorized as administrator."
      },
      meta: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    return;
  }
  if (member.role !== "admin" || claimedRole && claimedRole !== "admin") {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_ADMIN_ONLY",
        message: "Access denied: Admin privileges required. Normal student/user accounts cannot access admin-only pages or APIs."
      },
      meta: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    return;
  }
  req.adminMember = {
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    role: member.role
  };
  next();
};

// backend/src/controllers/admin.controller.ts
var getParamId = (param) => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};
var getMembers = (req, res) => {
  const { search, status, role, verificationStatus } = req.query;
  const members = memberService.getAllMembers({
    search: typeof search === "string" ? search : void 0,
    status: typeof status === "string" ? status : void 0,
    role: typeof role === "string" ? role : void 0,
    verificationStatus: typeof verificationStatus === "string" ? verificationStatus : void 0
  });
  const stats = memberService.getStats();
  res.json({
    success: true,
    data: {
      members,
      stats
    },
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var getStats = (_req, res) => {
  const stats = memberService.getStats();
  res.json({
    success: true,
    data: stats,
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var updateMemberRole = (req, res) => {
  const id = getParamId(req.params.id);
  const { role } = req.body;
  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: "MISSING_ID", message: "Target member ID is required." }
    });
    return;
  }
  if (!role || role !== "user" && role !== "admin") {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_ROLE",
        message: 'Invalid role provided. Role must be either "user" or "admin".'
      }
    });
    return;
  }
  const result = memberService.setMemberRole(id, role, req.adminMember?.email);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "ADMIN_LIMIT_EXCEEDED",
        message: result.error
      },
      meta: {
        stats: memberService.getStats()
      }
    });
    return;
  }
  res.json({
    success: true,
    data: {
      member: result.member,
      stats: memberService.getStats()
    },
    meta: {
      message: `Member role updated to "${role}".`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var verifyMember = (req, res) => {
  const id = getParamId(req.params.id);
  const { verificationStatus, role } = req.body;
  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: "MISSING_ID", message: "Target member ID is required." }
    });
    return;
  }
  if (!verificationStatus || !["verified", "pending", "rejected"].includes(verificationStatus)) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_VERIFICATION_STATUS",
        message: 'Invalid verification status. Must be one of: "verified", "pending", "rejected".'
      }
    });
    return;
  }
  if (role && role !== "user" && role !== "admin") {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_ROLE",
        message: 'Invalid role. Must be either "user" or "admin".'
      }
    });
    return;
  }
  const result = memberService.verifyMember(
    id,
    verificationStatus,
    role,
    req.adminMember?.email
  );
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VERIFICATION_ERROR",
        message: result.error
      },
      meta: {
        stats: memberService.getStats()
      }
    });
    return;
  }
  res.json({
    success: true,
    data: {
      member: result.member,
      stats: memberService.getStats()
    },
    meta: {
      message: `Account status updated to "${verificationStatus}"${role ? ` with role "${role}"` : ""}.`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var deleteMember = (req, res) => {
  const id = getParamId(req.params.id);
  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: "MISSING_ID", message: "Target member ID is required." }
    });
    return;
  }
  const result = memberService.deleteMember(id);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "CANNOT_DELETE_MEMBER",
        message: result.error
      }
    });
    return;
  }
  res.json({
    success: true,
    data: {
      id,
      stats: memberService.getStats()
    },
    meta: {
      message: "Member removed successfully.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var getNotifications = (_req, res) => {
  const notifications = memberService.getNotifications();
  const stats = memberService.getStats();
  res.json({
    success: true,
    data: {
      notifications,
      stats
    },
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var approveNotification = (req, res) => {
  const id = getParamId(req.params.id);
  const { role } = req.body;
  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: "MISSING_ID", message: "Notification ID is required." }
    });
    return;
  }
  const targetRole = role === "admin" ? "admin" : "user";
  const result = memberService.approveNotification(id, targetRole, req.adminMember?.email);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "APPROVAL_ERROR",
        message: result.error
      },
      meta: {
        stats: memberService.getStats()
      }
    });
    return;
  }
  res.json({
    success: true,
    data: {
      member: result.member,
      notification: result.notification,
      stats: memberService.getStats()
    },
    meta: {
      message: `Account approved as "${targetRole}".`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var rejectNotification = (req, res) => {
  const id = getParamId(req.params.id);
  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: "MISSING_ID", message: "Notification ID is required." }
    });
    return;
  }
  const result = memberService.rejectNotification(id, req.adminMember?.email);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "REJECTION_ERROR",
        message: result.error
      }
    });
    return;
  }
  res.json({
    success: true,
    data: {
      member: result.member,
      notification: result.notification,
      stats: memberService.getStats()
    },
    meta: {
      message: "Account registration rejected.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var resetAllAccounts = (_req, res) => {
  memberService.resetAllExceptMasterAdmin();
  res.json({
    success: true,
    data: {
      members: memberService.getAllMembers(),
      stats: memberService.getStats()
    },
    meta: {
      message: "All accounts except the Master Admin have been cleared.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var suspendMember = (req, res) => {
  const id = getParamId(req.params.id);
  const { reason } = req.body;
  const result = memberService.suspendMember(id, reason, req.adminMember?.email);
  if (!result.success) {
    res.status(400).json({ success: false, error: { code: "SUSPEND_ERROR", message: result.error } });
    return;
  }
  res.json({
    success: true,
    data: { member: result.member, stats: memberService.getStats() },
    meta: { message: "Member account suspended.", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};
var reactivateMember = (req, res) => {
  const id = getParamId(req.params.id);
  const result = memberService.reactivateMember(id, req.adminMember?.email);
  if (!result.success) {
    res.status(400).json({ success: false, error: { code: "REACTIVATE_ERROR", message: result.error } });
    return;
  }
  res.json({
    success: true,
    data: { member: result.member, stats: memberService.getStats() },
    meta: { message: "Member account reactivated.", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};
var getLoginAudit = (_req, res) => {
  const logs = memberService.getLoginAuditLogs(100);
  res.json({
    success: true,
    data: logs,
    meta: { total: logs.length, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};
var getAdminAudit = (_req, res) => {
  const logs = memberService.getAdminAuditLogs(100);
  res.json({
    success: true,
    data: logs,
    meta: { total: logs.length, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};
var getSettings = (_req, res) => {
  const settings = memberService.getSettings();
  res.json({
    success: true,
    data: settings,
    meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};
var updateSettings = (req, res) => {
  const updated = memberService.updateSettings(req.body, req.adminMember?.email);
  res.json({
    success: true,
    data: updated,
    meta: { message: "System settings updated successfully.", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};
var exportReport = (_req, res) => {
  const report = {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    stats: memberService.getStats(),
    members: memberService.getAllMembers(),
    recentLoginAudit: memberService.getLoginAuditLogs(50),
    recentAdminAudit: memberService.getAdminAuditLogs(50),
    settings: memberService.getSettings()
  };
  res.json({
    success: true,
    data: report,
    meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};

// backend/src/routes/admin.routes.ts
var adminRouter = Router3();
adminRouter.use(requireAdmin);
adminRouter.get("/members", getMembers);
adminRouter.get("/stats", getStats);
adminRouter.patch("/members/:id/role", updateMemberRole);
adminRouter.patch("/members/:id/verify", verifyMember);
adminRouter.post("/members/:id/suspend", suspendMember);
adminRouter.post("/members/:id/reactivate", reactivateMember);
adminRouter.delete("/members/:id", deleteMember);
adminRouter.get("/notifications", getNotifications);
adminRouter.post("/notifications/:id/approve", approveNotification);
adminRouter.post("/notifications/:id/reject", rejectNotification);
adminRouter.get("/audit/logins", getLoginAudit);
adminRouter.get("/audit/actions", getAdminAudit);
adminRouter.get("/settings", getSettings);
adminRouter.patch("/settings", updateSettings);
adminRouter.get("/export", exportReport);
adminRouter.post("/members/reset", resetAllAccounts);
var admin_routes_default = adminRouter;

// backend/src/routes/member.routes.ts
import { Router as Router4 } from "express";

// backend/src/controllers/member.controller.ts
var updateSession = (req, res) => {
  const { userId, email, fullName, status } = req.body;
  if (!userId || !email) {
    res.status(400).json({
      success: false,
      error: {
        code: "MISSING_FIELDS",
        message: "userId and email are required to update session status."
      }
    });
    return;
  }
  const sessionStatus = status === "logged_out" ? "logged_out" : "logged_in";
  const member = memberService.updateSessionStatus(userId, email, fullName, sessionStatus);
  res.json({
    success: true,
    data: member,
    meta: {
      message: `Session status updated to "${sessionStatus}".`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var getMyProfile = (req, res) => {
  const userId = req.headers["x-user-id"] || "";
  const userEmail = req.headers["x-user-email"] || "";
  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Sign-in authentication headers required."
      }
    });
    return;
  }
  const member = (userId ? memberService.getMemberById(userId) : void 0) || (userEmail ? memberService.getMemberByEmail(userEmail) : void 0);
  if (!member) {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Member record not found in system."
      }
    });
    return;
  }
  res.json({
    success: true,
    data: member,
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var updateMyProfile = (req, res) => {
  const userId = req.headers["x-user-id"] || "";
  const userEmail = req.headers["x-user-email"] || "";
  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." }
    });
    return;
  }
  const member = (userId ? memberService.getMemberById(userId) : void 0) || (userEmail ? memberService.getMemberByEmail(userEmail) : void 0);
  if (!member) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Member record not found." }
    });
    return;
  }
  const { fullName } = req.body;
  if (fullName && typeof fullName === "string" && fullName.trim().length >= 2) {
    member.fullName = fullName.trim();
    member.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  res.json({
    success: true,
    data: member,
    meta: { message: "Profile updated successfully.", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};
var deleteMyAccount = (req, res) => {
  const userId = req.headers["x-user-id"] || "";
  const userEmail = req.headers["x-user-email"] || "";
  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." }
    });
    return;
  }
  const member = (userId ? memberService.getMemberById(userId) : void 0) || (userEmail ? memberService.getMemberByEmail(userEmail) : void 0);
  if (!member) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Member record not found." }
    });
    return;
  }
  const result = memberService.deleteMember(member.id);
  if (!result.success) {
    res.status(400).json({ success: false, error: { code: "DELETE_ERROR", message: result.error } });
    return;
  }
  res.json({
    success: true,
    meta: { message: "Account deleted successfully.", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
};

// backend/src/routes/member.routes.ts
var memberRouter = Router4();
memberRouter.post("/session", updateSession);
memberRouter.get("/profile", getMyProfile);
memberRouter.get("/me", getMyProfile);
memberRouter.patch("/profile", updateMyProfile);
memberRouter.post("/delete-account", deleteMyAccount);
var member_routes_default = memberRouter;

// backend/src/routes/auth.routes.ts
import { Router as Router5 } from "express";

// backend/src/controllers/auth.controller.ts
var login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: {
        code: "MISSING_FIELDS",
        message: "Email and password are required."
      }
    });
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Browser Client";
  let browser = "Desktop Browser";
  if (/mobile/i.test(userAgent)) browser = "Mobile Browser";
  else if (/tablet/i.test(userAgent)) browser = "Tablet Browser";
  else if (/chrome/i.test(userAgent)) browser = "Chrome";
  else if (/firefox/i.test(userAgent)) browser = "Firefox";
  else if (/safari/i.test(userAgent)) browser = "Safari";
  const result = memberService.authenticate(email, password, { ip, browser, userAgent });
  if (!result.success) {
    const statusCode = result.code === "PENDING_APPROVAL" || result.code === "ACCOUNT_SUSPENDED" || result.code === "ACCOUNT_REJECTED" ? 403 : 401;
    res.status(statusCode).json({
      success: false,
      error: {
        code: result.code || "AUTH_ERROR",
        message: result.error || "Authentication failed."
      },
      meta: {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    return;
  }
  const member = result.member;
  res.json({
    success: true,
    data: {
      user: {
        id: member.id,
        email: member.email,
        fullName: member.fullName,
        role: member.role,
        verificationStatus: member.verificationStatus,
        sessionStatus: member.sessionStatus
      },
      profile: {
        id: member.id,
        email: member.email,
        fullName: member.fullName,
        role: member.role,
        verificationStatus: member.verificationStatus,
        sessionStatus: member.sessionStatus,
        createdAt: member.createdAt,
        lastLoginAt: member.lastLoginAt,
        lastActiveAt: member.lastActiveAt
      }
    },
    meta: {
      message: "Logged in successfully.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var register = (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({
      success: false,
      error: {
        code: "MISSING_FIELDS",
        message: "Name, email, and password are required for registration."
      }
    });
    return;
  }
  const result = memberService.register(name, email, password);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "REGISTRATION_ERROR",
        message: result.error || "Registration failed."
      }
    });
    return;
  }
  const member = result.member;
  const userPayload = {
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    role: member.role,
    verificationStatus: member.verificationStatus,
    sessionStatus: member.sessionStatus
  };
  res.status(201).json({
    success: true,
    data: {
      user: userPayload,
      member: userPayload,
      pendingApproval: result.pendingApproval,
      notification: result.notification
    },
    meta: {
      message: result.pendingApproval ? "Account registered successfully. Notification dispatched to Administrator for approval." : "Account created and verified.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};
var logout = (req, res) => {
  const userId = req.headers["x-user-id"] || req.body?.userId;
  const userEmail = req.headers["x-user-email"] || req.body?.email;
  if (userId || userEmail) {
    const member = (userId ? memberService.getMemberById(userId) : void 0) || (userEmail ? memberService.getMemberByEmail(userEmail) : void 0);
    if (member) {
      member.sessionStatus = "logged_out";
      member.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
    }
  }
  res.json({
    success: true,
    meta: {
      message: "Logged out successfully.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};

// backend/src/routes/auth.routes.ts
var authRouter = Router5();
authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.post("/logout", logout);
var auth_routes_default = authRouter;

// backend/src/routes/search.routes.ts
import { Router as Router6 } from "express";

// backend/src/controllers/search.controller.ts
var webSearchController = async (req, res) => {
  try {
    const q = (req.query.q || req.query.query || "").trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || "8", 10)));
    if (!q) {
      res.status(200).json({
        success: true,
        data: {
          query: "",
          results: [],
          total: 0,
          provider: "AI Toon Web Index"
        },
        meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
      });
      return;
    }
    const response = await webSearchService.search(q, page, limit);
    res.status(200).json({
      success: true,
      data: response,
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
  } catch (err) {
    console.error("[webSearchController] Error searching:", err);
    res.status(500).json({
      success: false,
      error: {
        code: "SEARCH_ERROR",
        message: "Web search failed. Please try again."
      },
      meta: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
  }
};

// backend/src/routes/search.routes.ts
var searchRouter = Router6();
searchRouter.get("/", webSearchController);
var search_routes_default = searchRouter;

// backend/src/routes/api.routes.ts
var apiRouter = Router7();
apiRouter.use("/health", health_routes_default);
apiRouter.use("/stories", story_routes_default);
apiRouter.use("/auth", auth_routes_default);
apiRouter.use("/search", search_routes_default);
apiRouter.use("/admin", admin_routes_default);
apiRouter.use("/members", member_routes_default);
var api_routes_default = apiRouter;

// backend/src/middleware/notFound.middleware.ts
var notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.path}`
    },
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};

// backend/src/middleware/error.middleware.ts
var errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected internal server error occurred";
  console.error(`[Error] ${statusCode} - ${message}`, err.stack);
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message
    },
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
};

// backend/src/app.ts
var createApp = () => {
  const app2 = express();
  app2.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin === config.frontendUrl || origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173" || origin.endsWith(".vercel.app")) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true
    })
  );
  app2.use(express.json());
  app2.use(express.urlencoded({ extended: true }));
  app2.use("/api", api_routes_default);
  app2.use("/", api_routes_default);
  app2.get("/", (_req, res) => {
    res.json({
      message: "Welcome to AI Toon API \u2014 Story-Based Learning Using Artificial Intelligence",
      version: "0.1.0",
      status: "active",
      endpoints: {
        health: "/api/health"
      }
    });
  });
  app2.use(notFoundHandler);
  app2.use(errorHandler);
  return app2;
};

// api/index.ts
var app = createApp();
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};

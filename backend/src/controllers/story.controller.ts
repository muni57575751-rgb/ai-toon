import { Request, Response } from 'express';
import type { ApiResponse, Story, StoryGenerationRequest, StoryTone, SupportedLanguage, StoryDifficulty } from '@ai-toon/shared';
import { storyService } from '../services/story.service.js';

export const generateStoryController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, tone, language, difficulty } = req.body as Partial<StoryGenerationRequest>;

    if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOPIC',
          message: 'Please provide a valid educational topic (at least 2 characters).',
        },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    if (topic.trim().length > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TOPIC_TOO_LONG',
          message: 'Topic name must be under 100 characters to conserve prompt quota.',
        },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const validTones: StoryTone[] = ['funny', 'adventure', 'comic'];
    const chosenTone: StoryTone = validTones.includes(tone as StoryTone) ? (tone as StoryTone) : 'funny';

    const validLanguages: SupportedLanguage[] = ['en', 'te', 'hi', 'es', 'fr', 'de', 'ta'];
    const chosenLang: SupportedLanguage = validLanguages.includes(language as SupportedLanguage)
      ? (language as SupportedLanguage)
      : 'en';

    const validDiff: StoryDifficulty[] = ['beginner', 'intermediate', 'advanced'];
    const chosenDiff: StoryDifficulty = validDiff.includes(difficulty as StoryDifficulty)
      ? (difficulty as StoryDifficulty)
      : 'intermediate';

    const requestPayload: StoryGenerationRequest = {
      topic: topic.trim(),
      tone: chosenTone,
      language: chosenLang,
      difficulty: chosenDiff,
    };

    const { story, cached } = await storyService.getOrGenerateStory(requestPayload);

    const response: ApiResponse<Story> = {
      success: true,
      data: story,
      meta: {
        cached,
        provider: story.provider,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Story generation failed.';
    const isConfigError = message.includes('No AI API key is configured');
    const isQuotaError = message.includes('quota') || message.includes('429');

    const statusCode = isConfigError ? 400 : isQuotaError ? 429 : 500;

    res.status(statusCode).json({
      success: false,
      error: {
        code: isConfigError ? 'AI_NOT_CONFIGURED' : isQuotaError ? 'AI_QUOTA_EXCEEDED' : 'GENERATION_ERROR',
        message,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }
};

export const getExamplesController = (_req: Request, res: Response): void => {
  const examples = storyService.getBuiltInExamples();
  const response: ApiResponse<Story[]> = {
    success: true,
    data: examples,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(response);
};

export const getExampleByIdController = (req: Request, res: Response): void => {
  const id = typeof req.params.id === 'string' ? req.params.id : Array.isArray(req.params.id) ? req.params.id[0] : '';
  const example = storyService.getBuiltInExampleById(id);

  if (!example) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Built-in example story "${id}" not found.`,
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const response: ApiResponse<Story> = {
    success: true,
    data: example,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(response);
};

export const getStatusController = (_req: Request, res: Response): void => {
  const status = storyService.getStatus();
  res.status(200).json({
    success: true,
    data: status,
    meta: { timestamp: new Date().toISOString() },
  });
};

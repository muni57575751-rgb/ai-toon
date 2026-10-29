import { Response } from 'express';
import type { ApiResponse, Story, StoryGenerationRequest, StoryTone, SupportedLanguage, StoryDifficulty } from '@ai-toon/shared';
import { storyService } from '../services/story.service.js';
import { memberService } from '../services/member.service.js';
import { qaService } from '../services/qa/qa.service.js';
import type { AuthenticatedUserRequest } from '../middleware/auth.middleware.js';

export const generateStoryController = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
  try {
    // 1. Check if Story Generation is enabled in System Settings
    const settings = memberService.getSettings();
    if (!settings.storyGenerationEnabled || settings.aiGenerationEnabled === false) {
      res.status(503).json({
        success: false,
        error: {
          code: 'GENERATION_PAUSED',
          message: 'AI Story generation is currently paused by the system administrator.',
        },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

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

    // Save story under authenticated user's private library
    if (req.user?.id) {
      memberService.saveUserStory(req.user.id, story);
    }

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
    const rawMessage = err instanceof Error ? err.message : 'Story generation failed.';

    const isBusy =
      rawMessage.includes('temporarily busy') ||
      rawMessage.includes('503') ||
      rawMessage.includes('502') ||
      rawMessage.includes('504') ||
      rawMessage.includes('UNAVAILABLE') ||
      rawMessage.includes('high demand') ||
      rawMessage.includes('timed out');

    const isAuth =
      rawMessage.includes('Invalid or unauthorized') ||
      rawMessage.includes('API key') ||
      rawMessage.includes('HTTP 401') ||
      rawMessage.includes('HTTP 403');

    const isQuota =
      rawMessage.includes('quota') ||
      rawMessage.includes('429') ||
      rawMessage.includes('RESOURCE_EXHAUSTED');

    const isConfig = rawMessage.includes('No AI API key is configured');

    let statusCode = 500;
    let errorCode = 'GENERATION_ERROR';
    let friendlyMessage = 'Story generation could not be completed right now. Please try again in a moment.';

    if (isBusy) {
      statusCode = 503;
      errorCode = 'AI_TEMPORARILY_BUSY';
      friendlyMessage = 'AI Toon is temporarily busy. Your lesson could not be generated right now. Please try again in a moment.';
    } else if (isAuth) {
      statusCode = 401;
      errorCode = 'AI_PROVIDER_AUTH_ERROR';
      friendlyMessage = 'The AI provider rejected the request due to invalid credentials. Please check your API key.';
    } else if (isQuota) {
      statusCode = 429;
      errorCode = 'AI_QUOTA_EXHAUSTED';
      friendlyMessage = 'The free-tier AI generation quota has been reached for this minute. Please wait 60 seconds and try again.';
    } else if (isConfig) {
      statusCode = 503;
      errorCode = 'AI_NOT_CONFIGURED';
      friendlyMessage = rawMessage;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: friendlyMessage,
        details: process.env.NODE_ENV !== 'production' ? rawMessage : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
};

export const getExamplesController = (_req: AuthenticatedUserRequest, res: Response): void => {
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

export const getExampleByIdController = (req: AuthenticatedUserRequest, res: Response): void => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const example = storyService.getBuiltInExampleById(id);

  if (!example) {
    res.status(404).json({
      success: false,
      error: {
        code: 'EXAMPLE_NOT_FOUND',
        message: `No example story found with ID "${id}".`,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
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

export const getStatusController = (_req: AuthenticatedUserRequest, res: Response): void => {
  const status = storyService.getStatus();
  res.status(200).json({
    success: true,
    data: status,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

export const askQuestionController = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
  try {
    const response = await qaService.answerQuestion(req.body);
    res.status(200).json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'QA_ERROR',
        message: err.message || 'Failed to process educational question.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }
};

export const saveQuizAttemptController = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
  try {
    const { storyId, topic, score, total, totalQuestions } = req.body;
    const userId = req.user?.id || 'anonymous';
    const totalCount = Number(total || totalQuestions || 0);
    const scoreCount = Number(score || 0);
    const percentage = totalCount > 0 ? Math.round((scoreCount / totalCount) * 100) : 0;

    const attempt = memberService.recordQuizAttempt({
      userId,
      storyId: storyId || 'general',
      topic: topic || 'Educational Quiz',
      score: scoreCount,
      total: totalCount,
      percentage,
    });

    res.status(200).json({
      success: true,
      data: attempt,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'QUIZ_ATTEMPT_ERROR',
        message: err.message || 'Failed to record quiz score.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }
};

export const getUserStoriesController = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const stories = memberService.getUserStories(userId);
  res.status(200).json({
    success: true,
    data: stories,
    meta: { total: stories.length, timestamp: new Date().toISOString() },
  });
};

export const getUserProgressController = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      meta: { timestamp: new Date().toISOString() },
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
      averageScorePercentage: progress.averageQuizScore,
    },
    meta: { timestamp: new Date().toISOString() },
  });
};

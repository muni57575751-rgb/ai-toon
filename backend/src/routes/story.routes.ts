import { Router } from 'express';
import {
  generateStoryController,
  getExamplesController,
  getExampleByIdController,
  getStatusController,
  saveQuizAttemptController,
  getUserStoriesController,
  getUserProgressController,
} from '../controllers/story.controller.js';
import { storyRateLimiter } from '../middleware/rateLimit.middleware.js';
import { requireAuth, requireApprovedUser } from '../middleware/auth.middleware.js';

const router = Router();

// Public sample content (Requirements: "Visitors can view only explicitly public landing pages and sample content")
router.get('/examples', getExamplesController);
router.get('/examples/:id', getExampleByIdController);
router.get('/status', getStatusController);

// Protected learning features (Requires authentication and approved account status)
router.post('/generate', requireApprovedUser, storyRateLimiter, generateStoryController);
router.post('/quiz/attempt', requireApprovedUser, saveQuizAttemptController);

// Private authenticated user content (Requirement: "Users must sign in to access their private dashboard, personal stories, saved quizzes")
router.get('/my-stories', requireAuth, getUserStoriesController);
router.get('/my-progress', requireAuth, getUserProgressController);

export default router;

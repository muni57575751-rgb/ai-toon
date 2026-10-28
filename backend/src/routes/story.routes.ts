import { Router } from 'express';
import {
  generateStoryController,
  getExamplesController,
  getExampleByIdController,
  getStatusController,
} from '../controllers/story.controller.js';
import { storyRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// GET /api/stories/examples -> list of built-in offline educational stories
router.get('/examples', getExamplesController);

// GET /api/stories/examples/:id -> get specific example story
router.get('/examples/:id', getExampleByIdController);

// GET /api/stories/status -> check AI provider & cache health
router.get('/status', getStatusController);

// POST /api/stories/generate -> generate story with rate limiting & caching
router.post('/generate', storyRateLimiter, generateStoryController);

export default router;

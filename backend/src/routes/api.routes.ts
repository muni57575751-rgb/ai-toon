import { Router } from 'express';
import healthRouter from './health.routes.js';
import storyRouter from './story.routes.js';

const apiRouter = Router();

// Health check endpoint: /api/health
apiRouter.use('/health', healthRouter);

// Story generation and examples endpoint: /api/stories
apiRouter.use('/stories', storyRouter);

// Future endpoints will be mounted here:
// apiRouter.use('/quizzes', quizzesRouter);
// apiRouter.use('/progress', progressRouter);

export default apiRouter;

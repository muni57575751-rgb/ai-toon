import { Router } from 'express';
import healthRouter from './health.routes.js';

const apiRouter = Router();

// Health check endpoint: /api/health
apiRouter.use('/health', healthRouter);

// Future endpoints will be mounted here:
// apiRouter.use('/auth', authRouter);
// apiRouter.use('/stories', storiesRouter);
// apiRouter.use('/quizzes', quizzesRouter);
// apiRouter.use('/progress', progressRouter);

export default apiRouter;

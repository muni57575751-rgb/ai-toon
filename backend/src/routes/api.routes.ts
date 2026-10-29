import { Router } from 'express';
import healthRouter from './health.routes.js';
import storyRouter from './story.routes.js';
import adminRouter from './admin.routes.js';
import memberRouter from './member.routes.js';
import authRouter from './auth.routes.js';

const apiRouter = Router();

// Health check endpoint: /api/health
apiRouter.use('/health', healthRouter);

// Story generation and examples endpoint: /api/stories
apiRouter.use('/stories', storyRouter);

// Dedicated authentication & registration endpoints: /api/auth
apiRouter.use('/auth', authRouter);

// Admin-only management endpoints: /api/admin
apiRouter.use('/admin', adminRouter);

// Member session presence and profile endpoints: /api/members
apiRouter.use('/members', memberRouter);

export default apiRouter;

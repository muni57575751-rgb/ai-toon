import { Router } from 'express';
import healthRouter from './health.routes.js';
import storyRouter from './story.routes.js';
import adminRouter from './admin.routes.js';
import memberRouter from './member.routes.js';
import authRouter from './auth.routes.js';
import searchRouter from './search.routes.js';
import geoRouter from './geo.routes.js';

const apiRouter = Router();

// Health check endpoint: /api/health
apiRouter.use('/health', healthRouter);

// Story generation, Q&A, and examples endpoint: /api/stories
apiRouter.use('/stories', storyRouter);

// Geographical Intelligence & Geocoding endpoints: /api/geo
apiRouter.use('/geo', geoRouter);

// Dedicated authentication & registration endpoints: /api/auth
apiRouter.use('/auth', authRouter);

// Live Web Search & Educational Research endpoint: /api/search
apiRouter.use('/search', searchRouter);

// Admin-only management endpoints: /api/admin
apiRouter.use('/admin', adminRouter);

// Member session presence and profile endpoints: /api/members
apiRouter.use('/members', memberRouter);

export default apiRouter;

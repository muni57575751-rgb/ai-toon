import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRouter from './routes/api.routes.js';
import { getHealth } from './controllers/health.controller.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

export const createApp = (): Express => {
  const app = express();

  // CORS Middleware supporting local dev, custom frontend ports, preview environments, and Vercel
  const corsMiddleware = cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        origin === config.frontendUrl ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin.endsWith('.vercel.app');
      return callback(null, isAllowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-email', 'x-user-role', 'x-session-id'],
  });

  app.use(corsMiddleware);
  app.options('*', corsMiddleware);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Restore original request URL when rewritten by serverless catch-all routing
  app.use((req, _res, next) => {
    const headerPath =
      (req.headers['x-matched-path'] as string) ||
      (req.headers['x-forwarded-uri'] as string) ||
      (req.headers['x-original-url'] as string) ||
      (req.headers['x-invoke-path'] as string) ||
      (req.headers['x-rewrite-url'] as string);

    if (headerPath && headerPath.startsWith('/api') && headerPath !== '/api' && headerPath !== '/api/') {
      req.url = headerPath;
    } else if (req.query && typeof req.query.__url === 'string') {
      const original = req.query.__url;
      delete req.query.__url;
      req.url = original;
    }
    next();
  });

  // Dedicated direct health endpoints (accessible both at /health and /api/health)
  app.get('/health', getHealth);
  app.get('/api/health', getHealth);

  // API Routes (mounted at /api and / so direct paths and stripped serverless paths both resolve)
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  // Root and /api welcome routes
  const welcomeHandler = (req: express.Request, res: express.Response) => {
    res.json({
      message: 'Welcome to AI Toon API — Story-Based Learning Using Artificial Intelligence',
      version: '0.1.0',
      status: 'active',
      endpoints: {
        health: '/api/health',
        directHealth: '/health',
      },
      requestInfo: {
        url: req.url,
        originalUrl: req.originalUrl,
        matchedPath: req.headers['x-matched-path'],
        invokePath: req.headers['x-invoke-path'],
      },
    });
  };
  app.get('/', welcomeHandler);
  app.get('/api', welcomeHandler);
  app.get('/api/', welcomeHandler);

  // 404 & Centralized Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

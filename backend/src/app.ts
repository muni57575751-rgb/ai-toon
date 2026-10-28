import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRouter from './routes/api.routes.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api', apiRouter);

  // Root welcome route
  app.get('/', (_req, res) => {
    res.json({
      message: 'Welcome to AI Toon API — Story-Based Learning Using Artificial Intelligence',
      version: '0.1.0',
      status: 'active',
      endpoints: {
        health: '/api/health',
      },
    });
  });

  // 404 & Centralized Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

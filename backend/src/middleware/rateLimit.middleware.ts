import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

interface ClientHistory {
  timestamps: number[];
}

const requestMap = new Map<string, ClientHistory>();

// Clean up stale client entries periodically (every 5 minutes)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, history] of requestMap.entries()) {
    history.timestamps = history.timestamps.filter((t) => now - t < config.rateLimitWindowMs);
    if (history.timestamps.length === 0) {
      requestMap.delete(ip);
    }
  }
}, 300000);
if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

export const storyRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();

  let history = requestMap.get(ip);
  if (!history) {
    history = { timestamps: [] };
    requestMap.set(ip, history);
  }

  // Filter timestamps within sliding window
  history.timestamps = history.timestamps.filter((t) => now - t < config.rateLimitWindowMs);

  if (history.timestamps.length >= config.rateLimitMaxRequests) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Request limit exceeded. Please wait a moment before generating another story to protect AI quota.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  history.timestamps.push(now);
  next();
};

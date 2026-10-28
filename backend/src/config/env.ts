import dotenv from 'dotenv';

dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  aiProvider: string;
  aiApiKey: string;
  aiModel: string;
  storyCacheEnabled: boolean;
  storyCacheTtlMs: number;
  aiRequestTimeoutMs: number;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  aiApiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gemini-3.5-flash-lite',
  storyCacheEnabled: process.env.STORY_CACHE_ENABLED !== 'false',
  storyCacheTtlMs: parseInt(process.env.STORY_CACHE_TTL_MS || '86400000', 10), // 24 hours
  aiRequestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '15000', 10), // 15 seconds
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '15', 10), // 15 req/min
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
};

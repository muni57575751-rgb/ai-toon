import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

let currentDir = process.cwd();
try {
  if (typeof import.meta !== 'undefined' && import.meta?.url) {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  // fallback to cwd
}

// Look for .env in backend directory, current working directory, and project root
const candidateEnvPaths = [
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(currentDir, '../../backend/.env'),
  path.resolve(currentDir, '../../../.env'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
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
  geoapifyApiKey: string;
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
  aiRequestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '45000', 10), // 45 seconds
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '15', 10), // 15 req/min
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  geoapifyApiKey: process.env.GEOAPIFY_API_KEY || '',
};

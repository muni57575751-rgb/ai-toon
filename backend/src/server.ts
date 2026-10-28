import { createApp } from './app.js';
import { config } from './config/env.js';

export const app = createApp();

if (!process.env.VERCEL) {
  const server = app.listen(config.port, () => {
    console.log(`🚀 [AI Toon Backend] Running on http://localhost:${config.port}`);
    console.log(`📡 [Health Check] Available at http://localhost:${config.port}/api/health`);
    console.log(`🌐 [Environment] Mode: ${config.nodeEnv}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });
}

export default app;

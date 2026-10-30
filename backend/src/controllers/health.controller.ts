import { Request, Response } from 'express';
import type { ApiResponse, HealthCheckData } from '@ai-toon/shared';

const startTime = Date.now();

export const getHealth = (_req: Request, res: Response): void => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const now = new Date().toISOString();

  const healthData: HealthCheckData = {
    status: 'ok',
    service: 'ai-toon-backend',
    version: '0.1.0',
    timestamp: now,
    uptime: uptimeSeconds,
  };

  const response: ApiResponse<HealthCheckData> & {
    status: string;
    service: string;
    version: string;
    uptime: number;
    timestamp: string;
  } = {
    status: 'ok',
    success: true,
    service: 'ai-toon-backend',
    version: '0.1.0',
    uptime: uptimeSeconds,
    timestamp: now,
    data: healthData,
    meta: {
      timestamp: now,
    },
  };

  res.status(200).json(response);
};

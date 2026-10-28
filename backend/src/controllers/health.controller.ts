import { Request, Response } from 'express';
import type { ApiResponse, HealthCheckData } from '@ai-toon/shared';

const startTime = Date.now();

export const getHealth = (_req: Request, res: Response): void => {
  const healthData: HealthCheckData = {
    status: 'ok',
    service: 'ai-toon-backend',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  const response: ApiResponse<HealthCheckData> = {
    success: true,
    data: healthData,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(200).json(response);
};

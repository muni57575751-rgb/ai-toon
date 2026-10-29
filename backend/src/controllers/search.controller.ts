import { Request, Response } from 'express';
import { webSearchService } from '../services/webSearch/webSearch.service.js';

export const webSearchController = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = ((req.query.q || req.query.query || '') as string).trim();
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(20, Math.max(1, parseInt((req.query.limit as string) || '8', 10)));

    if (!q) {
      res.status(200).json({
        success: true,
        data: {
          query: '',
          results: [],
          total: 0,
          provider: 'AI Toon Web Index',
        },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const response = await webSearchService.search(q, page, limit);

    res.status(200).json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err: any) {
    console.error('[webSearchController] Error searching:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Web search failed. Please try again.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }
};

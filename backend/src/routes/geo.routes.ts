import { Router, Request, Response } from 'express';
import { geoapifyService } from '../services/geoapify.service.js';
import { geoDetectionService } from '../services/geoDetection.service.js';

const geoRouter = Router();

/**
 * GET /api/geo/lookup?query=...
 * Forward Geocoding endpoint
 */
geoRouter.get('/lookup', async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.query as string || req.query.q as string || '').trim();
  if (!query) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_QUERY', message: 'Query parameter "query" is required.' },
    });
    return;
  }

  try {
    const location = await geoapifyService.geocodeLocation(query);
    if (!location) {
      res.status(404).json({
        success: false,
        error: { code: 'LOCATION_NOT_FOUND', message: `Could not resolve geographical location for "${query}".` },
      });
      return;
    }

    res.json({
      success: true,
      data: location,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'GEOCODING_ERROR', message: err instanceof Error ? err.message : 'Geocoding request failed.' },
    });
  }
});

/**
 * GET /api/geo/detect?topic=...
 * Evaluates whether a topic is a geographical entity and returns location details if verified
 */
geoRouter.get('/detect', async (req: Request, res: Response): Promise<void> => {
  const topic = (req.query.topic as string || req.query.t as string || '').trim();
  if (!topic) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_TOPIC', message: 'Query parameter "topic" is required.' },
    });
    return;
  }

  try {
    const result = await geoDetectionService.evaluateTopic(topic);
    res.json({
      success: true,
      data: {
        topic,
        category: result.classification.category,
        requiresMap: result.requiresMap,
        isGeographical: result.requiresMap,
        confidence: result.classification.confidence,
        reasoning: result.classification.reasoning || result.classification.reason,
        reason: result.classification.reason || result.classification.reasoning,
        isAmbiguous: Boolean(result.classification.isAmbiguous),
        ambiguityOptions: result.classification.ambiguityOptions || [],
        identifiedPlace: result.classification.identifiedPlace || null,
        location: result.location,
        locationDetails: result.location,
        isLocation: Boolean(result.location && result.location.isLocation),
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'DETECTION_ERROR', message: err instanceof Error ? err.message : 'Detection failed.' },
    });
  }
});

/**
 * GET /api/geo/reverse?lat=...&lon=...
 * Reverse geocoding endpoint
 */
geoRouter.get('/reverse', async (req: Request, res: Response): Promise<void> => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_COORDINATES', message: 'Valid latitude (lat) and longitude (lon) are required.' },
    });
    return;
  }

  try {
    const location = await geoapifyService.reverseGeocode(lat, lon);
    res.json({
      success: true,
      data: location,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'REVERSE_GEO_ERROR', message: err instanceof Error ? err.message : 'Reverse geocoding failed.' },
    });
  }
});

export default geoRouter;


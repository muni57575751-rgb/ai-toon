import type { LocationDetails } from '@ai-toon/shared';
import { geoapifyService } from './geoapify.service.js';

/**
 * High-confidence exclusion keywords: Topics that are definitively NOT geographical locations.
 * Prevents wasting geocoding credits and prevents false map displays on science, food, and abstract topics.
 */
const NON_GEOGRAPHICAL_PATTERNS = [
  // Science concepts
  /\bphotosynthesis\b/i,
  /\bchloroplast\b/i,
  /\brespiration\b/i,
  /\bmitosis\b/i,
  /\bmeiosis\b/i,
  /\bgravity\b/i,
  /\bquantum\b/i,
  /\belectricity\b/i,
  /\bmagnetism\b/i,
  /\bthermodynamics\b/i,
  /\batom\b/i,
  /\bmolecule\b/i,
  /\bdna\b/i,
  /\brna\b/i,
  /\bcell\s+structure\b/i,
  /\bevolution\b/i,
  /\bnewton('?s)?\s+(law|laws|motion)\b/i,
  /\beuler\b/i,
  /\bpythagor(as|ean)\b/i,
  /\bwater\s+cycle\b/i,
  /\bsolar\s+system\b/i,
  /\bcirculatory\s+system\b/i,
  /\bdigestive\s+system\b/i,

  // Food, sweets, and dishes
  /\bjalebi\b/i,
  /\bbiryani\b/i,
  /\bsamosa\b/i,
  /\bdosa\b/i,
  /\bidli\b/i,
  /\bgulab\s+jamun\b/i,
  /\bladd(oo|u)\b/i,
  /\bpizza\b/i,
  /\bburger\b/i,
  /\bpasta\b/i,
  /\bice\s*cream\b/i,
  /\bchocolate\b/i,
  /\broti\b/i,
  /\bnaan\b/i,
  /\bcurry\b/i,
  /\bsandwich\b/i,

  // General non-geographical nouns / animals / devices
  /\bcomputer\b/i,
  /\bpython\s+(programming|code)\b/i,
  /\bjavascript\b/i,
  /\balgorithm\b/i,
  /\bartificial\s+intelligence\b/i,
  /\bmachine\s+learning\b/i,
  /\btiger\b/i,
  /\blion\b/i,
  /\belephant\b/i,
  /\bpeacock\b/i,
  /\bmathematics\b/i,
  /\balgebra\b/i,
  /\bcalculus\b/i,
  /\bgeometry\b/i,
  /\bgrammar\b/i,
  /\bmetaphor\b/i,
];

/**
 * Indicators that strongly suggest geographical intent
 */
const GEOGRAPHICAL_INDICATORS = [
  /\bvillage\b/i,
  /\btown\b/i,
  /\bcity\b/i,
  /\bdistrict\b/i,
  /\bmandal\b/i,
  /\btehsil\b/i,
  /\btaluk\b/i,
  /\bstate\b/i,
  /\bcountry\b/i,
  /\bprovince\b/i,
  /\btemple\b/i,
  /\bmonument\b/i,
  /\bfort\b/i,
  /\bpalace\b/i,
  /\bmountain\b/i,
  /\bpeak\b/i,
  /\bhills?\b/i,
  /\bglen\b/i,
  /\bvalley\b/i,
  /\briver\b/i,
  /\blake\b/i,
  /\bocean\b/i,
  /\bsea\b/i,
  /\bisland\b/i,
  /\bpeninsula\b/i,
  /\bwaterfall\b/i,
  /\bcave\b/i,
  /\bheritage\b/i,
  /\btourist\b/i,
  /\bmahal\b/i,
  /\bgate\b/i,
  /\bstupa\b/i,
  /\bdesert\b/i,
  /\bplateau\b/i,
  /\bforest\b/i,
];

export class GeoDetectionService {
  /**
   * Evaluates if a topic is a geographical entity.
   * If yes, queries the geocoding service and returns full LocationDetails.
   * If no, returns null.
   */
  public async detectAndGeocode(topic: string): Promise<LocationDetails | null> {
    const cleanTopic = topic.trim();
    if (!cleanTopic || cleanTopic.length < 2) {
      return null;
    }

    // 1. Check strict non-geographical patterns (Photosynthesis, Jalebi, etc.)
    for (const pattern of NON_GEOGRAPHICAL_PATTERNS) {
      if (pattern.test(cleanTopic)) {
        console.log(`[GeoDetection] Topic "${cleanTopic}" matched non-geographical pattern ${pattern}. Skipping geocoding.`);
        return null;
      }
    }

    // 2. Normalize and check if query matches geocoding service cache / seed benchmarks
    const directResult = await geoapifyService.geocodeLocation(cleanTopic);
    if (directResult && directResult.isLocation) {
      // Additional safety check: Verify confidence & category
      if (this.isConfidentLocation(cleanTopic, directResult)) {
        return directResult;
      }
    }

    // 3. If explicit geographical indicator is in the text, try geocoding with cleaned variations
    const hasIndicator = GEOGRAPHICAL_INDICATORS.some((re) => re.test(cleanTopic));
    if (hasIndicator) {
      const stripped = cleanTopic.replace(/\b(the\s+city\s+of|the\s+village\s+of|the\s+temple\s+of|the\s+monument|the|story\s+of|guide\s+to)\b/gi, '').trim();
      if (stripped && stripped !== cleanTopic) {
        const retryResult = await geoapifyService.geocodeLocation(stripped);
        if (retryResult && retryResult.isLocation) {
          return retryResult;
        }
      }
    }

    return null;
  }

  /**
   * Validates whether a geocoding result is genuinely a location match
   * rather than a spurious partial string match on a common dictionary word.
   */
  private isConfidentLocation(rawTopic: string, result: LocationDetails): boolean {
    const topicLower = rawTopic.toLowerCase().trim();
    const nameLower = result.placeName.toLowerCase().trim();

    // High confidence if confidence >= 0.7 or name is a close match
    if (result.confidence && result.confidence >= 0.6) {
      return true;
    }

    if (nameLower.includes(topicLower) || topicLower.includes(nameLower)) {
      return true;
    }

    // If result has village, district, state, country, it's an authentic place
    if (result.district || result.state || result.country) {
      return true;
    }

    return false;
  }
}

export const geoDetectionService = new GeoDetectionService();

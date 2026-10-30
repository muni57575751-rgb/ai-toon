import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LocationDetails, LocationCategory } from '@ai-toon/shared';
import { config } from '../config/env.js';
import { dbService } from './db.service.js';

let currentDir = process.cwd();
try {
  if (typeof import.meta !== 'undefined' && import.meta?.url) {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  // fallback to cwd
}

const DATA_DIR = path.resolve(process.cwd(), 'backend', 'data');
const GEO_CACHE_FILE = path.resolve(DATA_DIR, 'geocoding-cache.json');

/**
 * Pre-verified authoritative benchmark coordinates for Indian & World landmarks
 * Used for zero-latency, quota-conserving seed lookups
 */
const SEED_GEO_RECORDS: Record<string, Partial<LocationDetails>> = {
  'donakonda': {
    placeName: 'Donakonda',
    displayName: 'Donakonda, Prakasam District, Andhra Pradesh, India',
    category: 'village',
    villageOrTown: 'Donakonda',
    mandalOrTehsil: 'Donakonda Mandal',
    district: 'Prakasam',
    state: 'Andhra Pradesh',
    country: 'India',
    countryCode: 'IN',
    postalCode: '523305',
    postalCodeVerified: true,
    latitude: 15.7828,
    longitude: 79.4975,
    bbox: [79.4675, 15.7528, 79.5275, 15.8128],
    nearbyTowns: ['Darsi', 'Markapur', 'Podili', 'Giddalur'],
    importantLandmarks: ['Donakonda Railway Station (Historic South Central Railway Junction)', 'Historic World War II Airstrip / Aerodrome'],
    geographicalCharacteristics: 'Semi-arid Deccan Plateau foothills with dry deciduous scrubland and red gravel soil',
    historicalSignificance: 'Strategic British-era railway junction and home to a historic World War II royal air force emergency airstrip',
  },
  'ganga donakonda': {
    placeName: 'Ganga Donakonda',
    displayName: 'Ganga Donakonda (Gangadevipalli / Donakonda), Prakasam District, Andhra Pradesh, India',
    category: 'village',
    villageOrTown: 'Donakonda',
    mandalOrTehsil: 'Donakonda Mandal',
    district: 'Prakasam',
    state: 'Andhra Pradesh',
    country: 'India',
    countryCode: 'IN',
    postalCode: '523305',
    postalCodeVerified: true,
    latitude: 15.7865,
    longitude: 79.5020,
    bbox: [79.4700, 15.7600, 79.5300, 15.8200],
    nearbyTowns: ['Darsi', 'Markapur', 'Kurichedu', 'Vinukonda'],
    importantLandmarks: ['Local Sri Gangamma Devi Temple', 'Donakonda Historic Airstrip Ground', 'South Central Railway Loop'],
    geographicalCharacteristics: 'Farming village landscape surrounded by open dryland agriculture, granite outcrops, and scrub hills',
    historicalSignificance: 'Associated with the traditional rural Gangamma folk festival traditions and the historic Donakonda British airstrip',
  },
  'tirupati': {
    placeName: 'Tirupati',
    displayName: 'Tirupati, Tirupati District, Andhra Pradesh, India',
    category: 'city',
    villageOrTown: 'Tirupati',
    mandalOrTehsil: 'Tirupati Urban',
    district: 'Tirupati',
    state: 'Andhra Pradesh',
    country: 'India',
    countryCode: 'IN',
    postalCode: '517501',
    postalCodeVerified: true,
    latitude: 13.6288,
    longitude: 79.4192,
    bbox: [79.3500, 13.5800, 79.4800, 13.6800],
    nearbyTowns: ['Chandragiri', 'Renigunta', 'Srikalahasti'],
    importantLandmarks: ['Sri Venkateswara Swamy Temple (Tirumala Hills)', 'Kapila Theertham', 'Chandragiri Fort'],
    geographicalCharacteristics: 'Foothills of the Eastern Ghats Seshachalam range covered with moist deciduous forests',
    historicalSignificance: 'Ancient pilgrimage destination dating back to the Pallava, Chola, and Vijayanagara empires',
  },
  'guntur': {
    placeName: 'Guntur',
    displayName: 'Guntur, Guntur District, Andhra Pradesh, India',
    category: 'city',
    villageOrTown: 'Guntur',
    mandalOrTehsil: 'Guntur Urban',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    country: 'India',
    countryCode: 'IN',
    postalCode: '522002',
    postalCodeVerified: true,
    latitude: 16.3067,
    longitude: 80.4365,
    bbox: [80.3800, 16.2500, 80.5000, 16.3600],
    nearbyTowns: ['Vijayawada', 'Tenali', 'Mangalagiri', 'Amaravati'],
    importantLandmarks: ['Kondaveedu Fort', 'Amaravati Buddhist Stupa & Museum', 'Jinnah Tower'],
    geographicalCharacteristics: 'Fertile Krishna River delta plains renowned for black cotton soil and chili farming',
    historicalSignificance: 'Historic capital of Satavahanas and Ikshvakus, and major historic center of Buddhism',
  },
  'taj mahal': {
    placeName: 'Taj Mahal',
    displayName: 'Taj Mahal, Dharmapuri, Agra, Uttar Pradesh 282001, India',
    category: 'monument',
    villageOrTown: 'Agra',
    mandalOrTehsil: 'Agra Sadar',
    district: 'Agra',
    state: 'Uttar Pradesh',
    country: 'India',
    countryCode: 'IN',
    postalCode: '282001',
    postalCodeVerified: true,
    latitude: 27.1751,
    longitude: 78.0421,
    bbox: [78.0380, 27.1700, 78.0460, 27.1800],
    nearbyTowns: ['Fatehpur Sikri', 'Mathura', 'Firozabad'],
    importantLandmarks: ['Agra Fort', 'Yamuna Riverbank', 'Mehtab Bagh'],
    geographicalCharacteristics: 'Right bank of the Yamuna River in the Indo-Gangetic alluvial plains',
    historicalSignificance: 'UNESCO World Heritage ivory-white marble mausoleum built by Mughal Emperor Shah Jahan in 1632',
  },
  'mount everest': {
    placeName: 'Mount Everest',
    displayName: 'Mount Everest (Sagarmatha / Chomolungma), Mahalangur Himal, Solukhumbu, Nepal / Tibet',
    category: 'mountain',
    district: 'Solukhumbu',
    state: 'Koshi Province',
    country: 'Nepal',
    countryCode: 'NP',
    latitude: 27.9881,
    longitude: 86.9250,
    bbox: [86.9100, 27.9700, 86.9400, 28.0000],
    nearbyTowns: ['Namche Bazaar', 'Lukla', 'Dingboche'],
    importantLandmarks: ['Sagarmatha National Park', 'Khumbu Glacier', 'Hillary Step'],
    geographicalCharacteristics: 'Highest peak on Earth at 8,848.86 m elevation, crowned by glacial ice, moraines, and granite peaks',
    historicalSignificance: 'First officially summitted on 29 May 1953 by Sir Edmund Hillary and Tenzing Norgay',
  },
  'india': {
    placeName: 'India',
    displayName: 'Republic of India (Bharat), South Asia',
    category: 'country',
    country: 'India',
    countryCode: 'IN',
    latitude: 20.5937,
    longitude: 78.9629,
    bbox: [68.1766, 6.7535, 97.4025, 37.0900],
    nearbyTowns: ['New Delhi (Capital)', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru'],
    importantLandmarks: ['Himalayan Mountain Range', 'Indo-Gangetic Plain', 'Deccan Plateau', 'Thar Desert'],
    geographicalCharacteristics: 'Diverse South Asian subcontinent spanning the Himalayas, peninsular plateau, coastal plains, and islands',
    historicalSignificance: 'One of the oldest civilizations with rich heritage from Indus Valley to modern democratic republic',
  },
  'pedanandipadu': {
    placeName: 'Pedanandipadu',
    displayName: 'Pedanandipadu Village, Guntur District, Andhra Pradesh, India',
    category: 'village',
    villageOrTown: 'Pedanandipadu',
    mandalOrTehsil: 'Pedanandipadu Mandal',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    country: 'India',
    countryCode: 'IN',
    postalCode: '522235',
    postalCodeVerified: true,
    latitude: 16.0358,
    longitude: 80.3256,
    bbox: [80.3000, 16.0100, 80.3500, 16.0600],
    nearbyTowns: ['Guntur', 'Chilakaluripet', 'Bapatla', 'Kakumanu'],
    importantLandmarks: ['Parvataneni Veerayya Choudhary Memorial', 'Sri Rama Temple'],
    geographicalCharacteristics: 'Rich agricultural black soil plains in the lower Krishna basin',
    historicalSignificance: 'Epicenter of the famous 1922 Pedanandipadu non-cooperation tax resistance movement against British rule led by Parvataneni Veerayya Choudhary',
  },
};

export class GeoapifyService {
  private readonly apiKey: string;
  private readonly cache = new Map<string, LocationDetails>();
  private static lastNominatimCallTime = 0;

  constructor() {
    this.apiKey = (config.geoapifyApiKey || process.env.GEOAPIFY_API_KEY || '').trim();
    this.loadCacheFromDisk();
    this.seedAuthoritativeCache();
  }

  private loadCacheFromDisk(): void {
    try {
      if (fs.existsSync(GEO_CACHE_FILE)) {
        const raw = fs.readFileSync(GEO_CACHE_FILE, 'utf-8');
        const list: LocationDetails[] = JSON.parse(raw);
        for (const item of list) {
          if (item && item.placeName) {
            this.cache.set(this.normalizeKey(item.placeName), item);
            if (item.displayName) {
              this.cache.set(this.normalizeKey(item.displayName), item);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[GeoapifyService] Could not read disk geocoding cache:', err);
    }
  }

  private saveCacheToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const unique = Array.from(new Set(this.cache.values()));
      fs.writeFileSync(GEO_CACHE_FILE, JSON.stringify(unique, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[GeoapifyService] Failed to persist geocoding cache:', err);
    }
  }

  private seedAuthoritativeCache(): void {
    for (const [key, val] of Object.entries(SEED_GEO_RECORDS)) {
      const full = this.completeLocationDetails(val as LocationDetails);
      this.cache.set(this.normalizeKey(key), full);
    }
  }

  private normalizeKey(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[,\-_.]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Primary Geocoding entry point: Checks multi-tier cache, queries Geoapify Forward Geocoding,
   * and falls back to OpenStreetMap Nominatim with strict verification.
   */
  public async geocodeLocation(rawQuery: string): Promise<LocationDetails | null> {
    const query = rawQuery.trim();
    if (!query || query.length < 2) return null;

    const normKey = this.normalizeKey(query);

    // 1. Check in-memory & persistent cache first (conserves 3,000 daily Geoapify credits)
    if (this.cache.has(normKey)) {
      return this.cache.get(normKey)!;
    }

    // Check prefix / substring / token matches in seed/cached records
    for (const [cachedKey, item] of this.cache.entries()) {
      if (
        normKey === cachedKey ||
        normKey.startsWith(cachedKey) ||
        cachedKey.startsWith(normKey) ||
        (normKey.includes(cachedKey) && cachedKey.length >= 4)
      ) {
        return item;
      }
    }

    // 2. Check Supabase geocoding_cache (persisted across independent Vercel serverless instances)
    try {
      const dbCached = await dbService.fetchGeocache(normKey);
      if (dbCached && dbCached.placeName && typeof dbCached.latitude === 'number') {
        const full = this.completeLocationDetails(dbCached);
        this.cache.set(normKey, full);
        return full;
      }
    } catch {
      // Non-blocking fallback if Supabase is initializing or table not yet applied
    }

    // 3. Query Geoapify Forward Geocoding if API key is present
    if (this.apiKey && !this.apiKey.includes('your-geoapify-key')) {
      try {
        const geoapifyResult = await this.queryGeoapifyForward(query);
        if (geoapifyResult) {
          this.cache.set(normKey, geoapifyResult);
          this.saveCacheToDisk();
          // Persist to Supabase asynchronously for cross-serverless caching
          dbService.upsertGeocache(normKey, geoapifyResult.placeName, geoapifyResult).catch(() => {});
          return geoapifyResult;
        }
      } catch (err) {
        console.warn(`[GeoapifyService] Geoapify forward geocoding failed for "${query}":`, err);
      }
    }

    // 4. Resilient OpenStreetMap Fallback (Free, zero-credential, compliant)
    try {
      const osmResult = await this.queryOsmNominatim(query);
      if (osmResult) {
        this.cache.set(normKey, osmResult);
        this.saveCacheToDisk();
        // Persist to Supabase asynchronously for cross-serverless caching
        dbService.upsertGeocache(normKey, osmResult.placeName, osmResult).catch(() => {});
        return osmResult;
      }
    } catch (osmErr) {
      console.warn(`[GeoapifyService] OSM fallback geocoding failed for "${query}":`, osmErr);
    }

    return null;
  }

  /**
   * Queries Geoapify Forward Geocoding API
   * Endpoint: https://api.geoapify.com/v1/geocode/search
   */
  private async queryGeoapifyForward(query: string): Promise<LocationDetails | null> {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      query
    )}&limit=1&format=geojson&apiKey=${encodeURIComponent(this.apiKey)}`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[GeoapifyService] Geoapify free credit rate limit reached (HTTP 429). Using OSM fallback.');
      }
      return null;
    }

    const data = await res.json();
    const features = data?.features || [];
    if (!features.length) return null;

    const feat = features[0];
    const props = feat.properties || {};
    const coords = feat.geometry?.coordinates || [];
    const lon = typeof coords[0] === 'number' ? coords[0] : props.lon;
    const lat = typeof coords[1] === 'number' ? coords[1] : props.lat;

    if (typeof lat !== 'number' || typeof lon !== 'number') return null;

    const category = this.mapGeoapifyCategory(props);
    const villageOrTown = props.village || props.hamlet || props.town || props.city || props.suburb;
    const mandalOrTehsil = props.county || props.district || props.subdistrict;
    const district = props.state_district || props.county || props.district;
    const state = props.state;
    const country = props.country || 'India';
    const countryCode = (props.country_code || 'in').toUpperCase();
    const postalCode = props.postcode ? String(props.postcode).trim() : undefined;

    const placeName = props.name || props.address_line1 || query;
    const displayName = props.formatted || `${placeName}, ${district || state || country}`;

    const location: LocationDetails = {
      isLocation: true,
      placeName,
      displayName,
      category,
      villageOrTown,
      mandalOrTehsil,
      district,
      state,
      country,
      countryCode,
      postalCode,
      postalCodeVerified: Boolean(postalCode && postalCode.length >= 4),
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6)),
      bbox: feat.bbox || [lon - 0.03, lat - 0.03, lon + 0.03, lat + 0.03],
      formattedAddress: props.formatted || displayName,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      osmUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
      confidence: props.rank?.confidence || 0.85,
      source: 'geoapify',
    };

    return this.completeLocationDetails(location);
  }

  /**
   * Fallback to OpenStreetMap Nominatim when Geoapify API key is not configured or depleted.
   * Strictly enforces Nominatim Public Usage Policy (max 1 request per second).
   */
  private async queryOsmNominatim(query: string): Promise<LocationDetails | null> {
    // 1 request per second throttling to respect Nominatim policy
    const now = Date.now();
    const timeSinceLastCall = now - GeoapifyService.lastNominatimCallTime;
    if (timeSinceLastCall < 1000) {
      const waitMs = 1000 - timeSinceLastCall;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    GeoapifyService.lastNominatimCallTime = Date.now();

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&addressdetails=1&limit=1`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AIToon-EducationalApp/1.0 (educational platform; info@ai-toon.edu)',
      },
    });

    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return null;

    const item = list[0];
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (isNaN(lat) || isNaN(lon)) return null;

    const addr = item.address || {};
    const category = this.mapOsmCategory(item.type, item.class);
    const villageOrTown = addr.village || addr.hamlet || addr.town || addr.city || addr.suburb;
    const mandalOrTehsil = addr.county || addr.subdistrict || addr.district;
    const district = addr.state_district || addr.county || addr.district;
    const state = addr.state;
    const country = addr.country || 'India';
    const countryCode = (addr.country_code || 'in').toUpperCase();
    const postalCode = addr.postcode ? String(addr.postcode).trim() : undefined;

    const placeName = item.name || query;
    const displayName = item.display_name || `${placeName}, ${state || country}`;

    const location: LocationDetails = {
      isLocation: true,
      placeName,
      displayName,
      category,
      villageOrTown,
      mandalOrTehsil,
      district,
      state,
      country,
      countryCode,
      postalCode,
      postalCodeVerified: Boolean(postalCode && postalCode.length >= 4),
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6)),
      bbox: item.boundingbox
        ? [parseFloat(item.boundingbox[2]), parseFloat(item.boundingbox[0]), parseFloat(item.boundingbox[3]), parseFloat(item.boundingbox[1])]
        : [lon - 0.03, lat - 0.03, lon + 0.03, lat + 0.03],
      formattedAddress: displayName,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      osmUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
      confidence: 0.8,
      source: 'osm',
    };

    return this.completeLocationDetails(location);
  }

  private mapGeoapifyCategory(props: any): LocationCategory {
    const cat = String(props.category || props.result_type || '').toLowerCase();
    if (cat.includes('village') || cat.includes('hamlet')) return 'village';
    if (cat.includes('city')) return 'city';
    if (cat.includes('town')) return 'town';
    if (cat.includes('state') && !cat.includes('district')) return 'state';
    if (cat.includes('country')) return 'country';
    if (cat.includes('district') || cat.includes('county')) return 'district';
    if (cat.includes('temple') || cat.includes('place_of_worship')) return 'temple';
    if (cat.includes('monument') || cat.includes('memorial') || cat.includes('castle')) return 'monument';
    if (cat.includes('mountain') || cat.includes('peak')) return 'mountain';
    if (cat.includes('water') || cat.includes('river')) return 'river';
    return 'landmark';
  }

  private mapOsmCategory(type?: string, cls?: string): LocationCategory {
    const combined = `${cls || ''} ${type || ''}`.toLowerCase();
    if (combined.includes('village') || combined.includes('hamlet')) return 'village';
    if (combined.includes('city')) return 'city';
    if (combined.includes('town')) return 'town';
    if (combined.includes('state') && !combined.includes('district')) return 'state';
    if (combined.includes('country')) return 'country';
    if (combined.includes('district') || combined.includes('county')) return 'district';
    if (combined.includes('temple') || combined.includes('place_of_worship')) return 'temple';
    if (combined.includes('monument') || combined.includes('castle') || combined.includes('historic')) return 'monument';
    if (combined.includes('mountain') || combined.includes('peak')) return 'mountain';
    if (combined.includes('water') || combined.includes('river')) return 'river';
    return 'landmark';
  }

  private completeLocationDetails(loc: Partial<LocationDetails>): LocationDetails {
    const lat = loc.latitude || 0;
    const lon = loc.longitude || 0;
    return {
      isLocation: true,
      placeName: loc.placeName || 'Location',
      displayName: loc.displayName || loc.placeName || 'Location',
      category: loc.category || 'landmark',
      villageOrTown: loc.villageOrTown,
      mandalOrTehsil: loc.mandalOrTehsil,
      district: loc.district,
      state: loc.state,
      country: loc.country || 'India',
      countryCode: loc.countryCode || 'IN',
      postalCode: loc.postalCode,
      postalCodeVerified: Boolean(loc.postalCodeVerified && loc.postalCode),
      latitude: lat,
      longitude: lon,
      bbox: loc.bbox || [lon - 0.03, lat - 0.03, lon + 0.03, lat + 0.03],
      formattedAddress: loc.formattedAddress || loc.displayName,
      nearbyTowns: loc.nearbyTowns || [],
      importantLandmarks: loc.importantLandmarks || [],
      geographicalCharacteristics: loc.geographicalCharacteristics,
      historicalSignificance: loc.historicalSignificance,
      localAttractions: loc.localAttractions || [],
      googleMapsUrl: loc.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      osmUrl: loc.osmUrl || `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`,
      directionsUrl: loc.directionsUrl || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
      confidence: loc.confidence || 0.9,
      source: loc.source || 'verified_cache',
    };
  }

  /**
   * Reverse Geocoding helper
   */
  public async reverseGeocode(lat: number, lon: number): Promise<LocationDetails | null> {
    if (!this.apiKey) return null;
    try {
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const features = data?.features || [];
      if (!features.length) return null;
      const props = features[0].properties;
      return {
        isLocation: true,
        placeName: props.name || props.formatted,
        displayName: props.formatted,
        category: 'landmark',
        district: props.district || props.county,
        state: props.state,
        country: props.country,
        postalCode: props.postcode,
        latitude: lat,
        longitude: lon,
        source: 'geoapify',
      };
    } catch {
      return null;
    }
  }
}

export const geoapifyService = new GeoapifyService();

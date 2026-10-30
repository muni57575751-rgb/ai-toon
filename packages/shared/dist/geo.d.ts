/**
 * Geographical Intelligence Data Models for AI Toon
 */
export type LocationCategory = 'village' | 'town' | 'city' | 'district' | 'state' | 'country' | 'temple' | 'monument' | 'historical_site' | 'tourist_destination' | 'mountain' | 'river' | 'lake' | 'landmark' | 'other';
export interface LocationDetails {
    /** Indicates whether the analyzed topic represents an identifiable geographical entity */
    isLocation: boolean;
    /** Primary official or common place name */
    placeName: string;
    /** Full formatted display name or address line */
    displayName: string;
    /** Recognized geographical classification */
    category: LocationCategory;
    /** Village or town name where applicable */
    villageOrTown?: string;
    /** Mandal, Tehsil, Taluk, or equivalent sub-district administrative unit */
    mandalOrTehsil?: string;
    /** District name */
    district?: string;
    /** State or province name */
    state?: string;
    /** Country name */
    country?: string;
    /** Two-letter ISO country code */
    countryCode?: string;
    /** Verified PIN or Postal Code (never fabricated; omitted if unverified) */
    postalCode?: string;
    /** Whether the postal code was strictly verified from authoritative geocoding data */
    postalCodeVerified?: boolean;
    /** Latitude coordinate */
    latitude: number;
    /** Longitude coordinate */
    longitude: number;
    /** Bounding box coordinates [minLon, minLat, maxLon, maxLat] */
    bbox?: [number, number, number, number];
    /** Clean formatted address string */
    formattedAddress?: string;
    /** Nearby towns or administrative centers */
    nearbyTowns?: string[];
    /** Notable historical or local landmarks nearby */
    importantLandmarks?: string[];
    /** Natural geographical landscape characteristics (e.g. plains, rocky hills, river basin) */
    geographicalCharacteristics?: string;
    /** Historical notes or context for the location */
    historicalSignificance?: string;
    /** Local attractions, temples, or points of interest */
    localAttractions?: string[];
    /** Deep link to open location in Google Maps */
    googleMapsUrl?: string;
    /** Deep link to open location in OpenStreetMap */
    osmUrl?: string;
    /** Direct directions link */
    directionsUrl?: string;
    /** Geocoding match confidence score (0 to 1) */
    confidence?: number;
    /** Primary provider/source used for geocoding */
    source: 'geoapify' | 'osm' | 'verified_cache';
    /** Set to true when multiple distant locations match and clarification may be warranted */
    isAmbiguous?: boolean;
    /** Alternative possible matches if ambiguous */
    possibleMatches?: Array<{
        name: string;
        state?: string;
        country?: string;
        coordinates: [number, number];
    }>;
}

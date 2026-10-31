import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationDetails } from '@ai-toon/shared';

interface LocationMapProps {
  location: LocationDetails;
}

/**
 * Helper component that recenters and revalidates map size upon mounting or location change
 */
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
    // Timeout ensures DOM layout completes before sizing calculations
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map, center, zoom]);

  return null;
};

/**
 * Sharp, retina-ready SVG marker pin that does not rely on fragile external asset paths
 */
function createCustomPin(color: string = '#0284c7'): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 26 16 26s16-15.5 16-26c0-8.837-7.163-16-16-16z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="16" cy="15" r="6" fill="#ffffff"/>
      <circle cx="16" cy="15" r="3.5" fill="${color}"/>
    </svg>
  `;
  return L.divIcon({
    className: 'ai-toon-custom-pin',
    html: svg,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
}

export const LocationMap: React.FC<LocationMapProps> = ({ location }) => {
  const [mapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { latitude, longitude, placeName, displayName } = location;

  const center = useMemo<[number, number]>(() => {
    return [latitude, longitude];
  }, [latitude, longitude]);

  // Determine initial zoom level based on location category
  const initialZoom = useMemo(() => {
    switch (location.category) {
      case 'country':
        return 5;
      case 'state':
        return 7;
      case 'district':
        return 9;
      case 'city':
        return 12;
      case 'town':
        return 13;
      case 'village':
        return 14;
      case 'monument':
      case 'temple':
      case 'mountain':
        return 15;
      default:
        return 13;
    }
  }, [location.category]);

  // Geoapify Tiles API with OpenStreetMap standard fallback
  const geoapifyKey = (import.meta.env.VITE_GEOAPIFY_MAP_KEY || '').trim();
  const hasGeoapifyKey = Boolean(geoapifyKey && !geoapifyKey.includes('your-'));

  const tileUrl = hasGeoapifyKey
    ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(geoapifyKey)}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = hasGeoapifyKey
    ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors | Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Geoapify</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

  const markerIcon = useMemo(() => {
    if (location.category === 'temple' || location.category === 'monument') {
      return createCustomPin('#d97706'); // Warm gold for heritage/temples
    }
    if (location.category === 'mountain' || location.category === 'river') {
      return createCustomPin('#059669'); // Emerald green for natural features
    }
    return createCustomPin('#0284c7'); // Ocean blue for towns, villages, cities
  }, [location.category]);

  const administrativeBreadcrumbs = useMemo(() => {
    const parts: string[] = [];
    if (location.villageOrTown && location.villageOrTown !== location.placeName) {
      parts.push(location.villageOrTown);
    }
    if (location.mandalOrTehsil) {
      parts.push(location.mandalOrTehsil);
    }
    if (location.district) {
      parts.push(`${location.district} Dist.`);
    }
    if (location.state) {
      parts.push(location.state);
    }
    if (location.country) {
      parts.push(location.country);
    }
    return parts.join(' • ');
  }, [location]);

  return (
    <section
      className="liquid-glass-card"
      style={{
        padding: 'clamp(1rem, 3vw, 2rem) clamp(0.85rem, 3.5vw, 2.25rem)',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(240, 249, 255, 0.6) 40%, rgba(234, 228, 255, 0.5) 100%)',
        border: '1.5px solid rgba(186, 230, 253, 0.8)',
        boxShadow: '0 12px 32px rgba(14, 165, 233, 0.12)',
        marginTop: '1.5rem',
        marginBottom: '1.5rem',
      }}
    >
      {/* 1. Header with Place Title, Category Badge, and Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.6rem' }}>📍</span>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.25rem, 3.5vw, 1.65rem)',
                overflowWrap: 'break-word',
                fontWeight: 800,
                color: 'var(--liquid-navy-dark)',
                lineHeight: 1.2,
              }}
            >
              {placeName}
            </h2>
            <span
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: 'rgba(14, 165, 233, 0.15)',
                color: '#0284c7',
                border: '1px solid rgba(14, 165, 233, 0.3)',
              }}
            >
              {location.category}
            </span>
          </div>

          {administrativeBreadcrumbs && (
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#475569', fontWeight: 600 }}>
              {administrativeBreadcrumbs}
            </p>
          )}
        </div>

        {/* Directions & External Links */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {location.googleMapsUrl && (
            <a
              href={location.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-liquid-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '0.45rem 0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
              }}
              title="Open location in Google Maps"
            >
              <span>🧭</span> Google Maps
            </a>
          )}
          {location.osmUrl && (
            <a
              href={location.osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-liquid-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '0.45rem 0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
              }}
              title="Open location in OpenStreetMap"
            >
              <span>🗺️</span> OpenStreetMap
            </a>
          )}
        </div>
      </div>

      {/* 2. Key Metadata Badges (Coordinates, Verified PIN, Mandal, District) */}
      <div
        style={{
          display: 'flex',
          gap: '0.65rem',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
        }}
      >
        <span
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.5rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#1e293b',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <span style={{ color: '#0284c7' }}>🌐</span>
          Lat: {latitude.toFixed(4)}°, Lon: {longitude.toFixed(4)}°
        </span>

        {location.postalCode ? (
          <span
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '0.5rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>📮</span> PIN: {location.postalCode} (Verified)
          </span>
        ) : (
          <span
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '0.5rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontWeight: 600,
            }}
          >
            📮 PIN: Unverified
          </span>
        )}

        {location.district && (
          <span
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '0.5rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontWeight: 600,
            }}
          >
            🏛️ District: {location.district}
          </span>
        )}

        {location.state && (
          <span
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '0.5rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontWeight: 600,
            }}
          >
            🇮🇳 State: {location.state}
          </span>
        )}
      </div>

      {/* 3. Interactive Leaflet Map Container */}
      <div
        style={{
          position: 'relative',
          height: 'clamp(240px, 48vw, 380px)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '2px solid rgba(186, 230, 253, 0.9)',
          boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.06)',
          background: '#e2e8f0',
        }}
      >
        {mapError ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
              background: '#fff',
            }}
          >
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</span>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>Map Display Unavailable</div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '380px' }}>
              {mapError}
            </p>
            {location.googleMapsUrl && (
              <a
                href={location.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-liquid-primary"
                style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.4rem 1rem' }}
              >
                View on Google Maps →
              </a>
            )}
          </div>
        ) : (
          <>
            {isLoading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(248, 250, 252, 0.85)',
                  zIndex: 20,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: '#0284c7',
                }}
              >
                <span>🌍 Loading Interactive Map...</span>
              </div>
            )}
            <MapContainer
              center={center}
              zoom={initialZoom}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%', zIndex: 10 }}
              whenReady={() => setIsLoading(false)}
            >
            <MapUpdater center={center} zoom={initialZoom} />

            <TileLayer
              attribution={attribution}
              url={tileUrl}
              maxZoom={19}
            />

            <Marker position={center} icon={markerIcon}>
              <Popup>
                <div style={{ minWidth: '180px', padding: '0.2rem 0' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                    {placeName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.45rem', lineHeight: 1.35 }}>
                    {displayName || administrativeBreadcrumbs}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}>
                    📍 {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
                  </div>
                  {location.directionsUrl && (
                    <a
                      href={location.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
                        fontSize: '0.76rem',
                        color: '#0284c7',
                        fontWeight: 700,
                        textDecoration: 'underline',
                      }}
                    >
                      Get Directions →
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
          </>
        )}
      </div>

      {/* 4. Educational Geographic Context (Nearby Towns & Landmarks) */}
      {(location.nearbyTowns?.length || location.importantLandmarks?.length || location.geographicalCharacteristics) && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1.15rem 1.35rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            fontSize: '0.86rem',
            color: '#334155',
            lineHeight: 1.55,
          }}
        >
          {location.geographicalCharacteristics && (
            <div style={{ marginBottom: '0.65rem' }}>
              <strong style={{ color: '#0f172a' }}>🏞️ Natural Landscape: </strong>
              {location.geographicalCharacteristics}
            </div>
          )}

          {location.importantLandmarks && location.importantLandmarks.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#0f172a' }}>🏛️ Notable Landmarks: </strong>
              <span style={{ color: '#475569' }}>{location.importantLandmarks.join(' • ')}</span>
            </div>
          )}

          {location.nearbyTowns && location.nearbyTowns.length > 0 && (
            <div>
              <strong style={{ color: '#0f172a' }}>🏘️ Nearby Centers: </strong>
              <span style={{ color: '#475569' }}>{location.nearbyTowns.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

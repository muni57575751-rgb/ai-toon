import React, { useState, useEffect } from 'react';
import type { HealthCheckData } from '@ai-toon/shared';
import { API_BASE_URL, safeJsonParse } from '../../config/api';

export const SystemStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [activeEndpoint, setActiveEndpoint] = useState<string>('/api/health');

  const checkBackend = async () => {
    setLoading(true);
    setError(null);
    setHttpStatus(null);

    // Normalize base URL to ensure clean, non-duplicated /api/health target on same domain
    const cleanBase = (API_BASE_URL || '/api').trim().replace(/\/+$/, '');
    let targetEndpoint = cleanBase.endsWith('/api') ? `${cleanBase}/health` : `${cleanBase}/api/health`;

    // In browser production, ensure same-origin relative path is always preferred
    if (import.meta.env.PROD && typeof window !== 'undefined' && targetEndpoint.startsWith('http')) {
      targetEndpoint = '/api/health';
    }

    setActiveEndpoint(targetEndpoint);

    // 12-second abort timeout prevents premature cancellation during serverless cold starts
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      let res: Response;
      try {
        res = await fetch(targetEndpoint, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
      } catch (fetchErr: any) {
        // Fallback to relative /api/health if an absolute URL failed cross-origin/network fetch
        if (targetEndpoint.startsWith('http')) {
          try {
            targetEndpoint = '/api/health';
            setActiveEndpoint(targetEndpoint);
            res = await fetch(targetEndpoint, {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            });
          } catch {
            throw fetchErr;
          }
        } else {
          throw fetchErr;
        }
      }

      setHttpStatus(res.status);

      const parsed = await safeJsonParse<any>(res, 'Backend currently offline');
      const raw = parsed.data || {};
      const dataObj = raw.data || raw;

      // Recognize healthy response matching { status: "ok" } or { success: true }
      const isHealthy =
        res.ok &&
        (raw.status === 'ok' ||
          dataObj.status === 'ok' ||
          raw.success === true ||
          dataObj.success === true);

      if (isHealthy) {
        setHealth({
          status: 'ok',
          service: dataObj.service || raw.service || 'ai-toon-backend',
          version: dataObj.version || raw.version || '0.1.0',
          timestamp: dataObj.timestamp || raw.timestamp || new Date().toISOString(),
          uptime:
            typeof dataObj.uptime === 'number'
              ? dataObj.uptime
              : typeof raw.uptime === 'number'
              ? raw.uptime
              : 0,
        });
        setError(null);
      } else {
        const errMsg =
          parsed.error ||
          dataObj?.error?.message ||
          raw?.message ||
          `Server returned HTTP ${res.status}`;
        throw new Error(errMsg);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Connection timed out (warming up serverless API)');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('fetch failed')) {
          setError('Failed to fetch');
        } else {
          setError(err.message);
        }
      } else {
        setError('Backend currently offline');
      }
      setHealth(null);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <div className="neoclay-card" style={{ marginBottom: '2.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
              boxShadow:
                'var(--clay-volume-subtle), 4px 6px 12px rgba(12, 58, 96, 0.08), -3px -3px 8px #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            🔌
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--navy-950)' }}>
              Backend API Connection
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--navy-600)', fontWeight: 600 }}>
              Live connection status between React client & Vercel Serverless Express API
            </span>
          </div>
        </div>

        <button
          onClick={checkBackend}
          disabled={loading}
          className="btn-neoclay-primary"
          style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
        >
          {loading ? 'Pinging...' : '🔄 Test Connection'}
        </button>
      </div>

      {/* Recessed Neumorphic Clay Well */}
      <div
        className="neoclay-recessed"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '0.98rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Status:
            {loading ? (
              <span style={{ color: 'var(--navy-500)', fontWeight: 600 }}>Pinging backend...</span>
            ) : health ? (
              <span
                style={{
                  color: 'var(--clay-mint-dark)',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--clay-mint)',
                    boxShadow: '0 0 10px rgba(52, 211, 153, 0.8)',
                  }}
                />
                Online ({health.service} v{health.version})
              </span>
            ) : (
              <span
                style={{
                  color: 'var(--clay-coral-dark)',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--clay-coral)',
                    boxShadow: '0 0 10px rgba(251, 113, 133, 0.8)',
                  }}
                />
                Offline ({error})
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--navy-600)',
              margin: '0.35rem 0 0',
              fontWeight: 600,
            }}
          >
            {health
              ? `Uptime: ${health.uptime}s • Endpoint: ${activeEndpoint} • Verified: ${new Date(
                  health.timestamp
                ).toLocaleTimeString()}`
              : `Endpoint: ${activeEndpoint}${
                  httpStatus ? ` • HTTP ${httpStatus}` : ''
                } • ${error ? `Diagnostics: ${error}` : 'Connecting to Vercel Serverless API...'}`}
          </p>
        </div>

        <div>
          {health ? (
            <span className="neoclay-badge badge-green">
              <span>●</span> Healthy
            </span>
          ) : (
            <span className="neoclay-badge badge-yellow">
              <span>○</span> Standby
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

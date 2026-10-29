import React, { useState, useEffect } from 'react';
import type { ApiResponse, HealthCheckData } from '@ai-toon/shared';
import { API_BASE_URL, safeJsonParse } from '../../config/api';

export const SystemStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkBackend = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      const parsed = await safeJsonParse<ApiResponse<HealthCheckData>>(res, 'Backend currently offline');
      if (parsed.ok && parsed.data?.success && parsed.data.data) {
        setHealth(parsed.data.data);
      } else {
        throw new Error(parsed.error || parsed.data?.error?.message || `Server returned HTTP ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backend currently offline');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <div className="neoclay-card" style={{ marginBottom: '2.5rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            boxShadow: 'var(--clay-volume-subtle), 4px 6px 12px rgba(12, 58, 96, 0.08), -3px -3px 8px #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            🔌
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--navy-950)' }}>
              Backend API Connection
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--navy-600)', fontWeight: 600 }}>
              Live connection status between React client & Express server
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
      <div className="neoclay-recessed" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Status:
            {loading ? (
              <span style={{ color: 'var(--navy-500)', fontWeight: 600 }}>Pinging /api/health...</span>
            ) : health ? (
              <span style={{
                color: 'var(--clay-mint-dark)',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--clay-mint)',
                  boxShadow: '0 0 10px rgba(52, 211, 153, 0.8)'
                }} />
                Connected ({health.service} v{health.version})
              </span>
            ) : (
              <span style={{
                color: 'var(--clay-coral-dark)',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--clay-coral)',
                  boxShadow: '0 0 10px rgba(251, 113, 133, 0.8)'
                }} />
                Offline ({error})
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--navy-600)', margin: '0.35rem 0 0', fontWeight: 600 }}>
            {health
              ? `Uptime: ${health.uptime}s • Endpoint: /api/health • Verified: ${new Date(health.timestamp).toLocaleTimeString()}`
              : 'Express server running on http://localhost:5000'}
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

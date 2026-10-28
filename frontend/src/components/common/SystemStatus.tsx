import React, { useState, useEffect } from 'react';
import type { ApiResponse, HealthCheckData } from '@ai-toon/shared';

export const SystemStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkBackend = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data: ApiResponse<HealthCheckData> = await res.json();
      if (data.success && data.data) {
        setHealth(data.data);
      } else {
        throw new Error(data.error?.message || 'Failed to retrieve health status');
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
    <div className="cartoon-card" style={{ marginBottom: '2rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🔌</span>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
            Backend API Connection
          </h2>
        </div>
        <button
          onClick={checkBackend}
          disabled={loading}
          className="btn-cartoon-primary"
          style={{ padding: '0.45rem 1rem', fontSize: '0.88rem' }}
        >
          {loading ? 'Checking...' : '🔄 Test Connection'}
        </button>
      </div>

      <div style={{
        padding: '1rem',
        background: 'var(--sky-50)',
        borderRadius: 'var(--radius-md)',
        border: '1.5px dashed var(--navy-700)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy-900)' }}>
            Status:{' '}
            {loading ? (
              <span style={{ color: 'var(--navy-500)' }}>Pinging /api/health...</span>
            ) : health ? (
              <span style={{ color: 'var(--mint-green)', fontWeight: 800 }}>
                ● Connected ({health.service} v{health.version})
              </span>
            ) : (
              <span style={{ color: 'var(--coral-pink)', fontWeight: 800 }}>
                ○ Offline ({error})
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--navy-600)', margin: '0.25rem 0 0' }}>
            {health
              ? `Backend uptime: ${health.uptime}s • Endpoint: /api/health • Timestamp: ${new Date(health.timestamp).toLocaleTimeString()}`
              : 'Run "npm run dev:backend" or "npm run dev" to start the Express server.'}
          </p>
        </div>

        <div>
          {health ? (
            <span className="cartoon-badge badge-green">Healthy</span>
          ) : (
            <span className="cartoon-badge badge-yellow">Standby / Offline</span>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import type { SearchResultItem, SearchResponse } from '@ai-toon/shared';

const POPULAR_SEARCHES = [
  'Photosynthesis',
  'Binary Search',
  'Narendra Modi',
  'Vignan University',
  'Human Heart',
  'Artificial Intelligence',
  'Solar System',
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState('');

  const executeSearch = async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorMsg(null);
    setSearchedQuery(trimmed);
    setSearchParams({ q: trimmed });

    try {
      const headers: Record<string, string> = {};
      if (user) {
        headers['x-user-id'] = user.id;
        headers['x-user-email'] = user.email || '';
      }

      const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(trimmed)}`, {
        headers,
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setErrorMsg(body.error?.message || 'Failed to complete web search.');
        setResults([]);
      } else {
        const responseData = body.data as SearchResponse;
        setResults(responseData.results || []);
      }
    } catch {
      setErrorMsg('Network error while searching educational web sources.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleCreateStory = (topicTitle: string) => {
    navigate(`/generate?topic=${encodeURIComponent(topicTitle)}`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <Header />

      <main style={{ flex: 1, padding: '2rem 1rem' }}>
        <div className="container" style={{ maxWidth: '960px', margin: '0 auto' }}>
          {/* Page Heading */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1.5px solid rgba(56, 189, 248, 0.35)',
                color: 'var(--sky-800)',
                fontWeight: 700,
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              <span>🌐</span> Live Knowledge & Fact Verification
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.4rem',
                color: 'var(--navy-900)',
                marginBottom: '0.5rem',
              }}
            >
              Educational Web Search
            </h1>
            <p style={{ color: 'var(--navy-600)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
              Search real-time, verified academic sources (Wikipedia & DuckDuckGo) to discover topics, inspect facts, and turn discoveries into visual stories.
            </p>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              gap: '0.75rem',
              background: '#ffffff',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 30px rgba(14, 165, 233, 0.12)',
              border: '2px solid var(--sky-200)',
              marginBottom: '1.25rem',
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts, scientists, history, algorithms (e.g., Photosynthesis)..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '1.05rem',
                padding: '0.5rem 0.75rem',
                fontFamily: 'inherit',
                color: 'var(--navy-900)',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--navy-400)',
                  fontSize: '1.2rem',
                  padding: '0 0.5rem',
                }}
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn-neoclay-primary"
              style={{ padding: '0.6rem 1.6rem', fontSize: '1rem', whiteSpace: 'nowrap' }}
            >
              {loading ? 'Searching...' : '🔍 Search'}
            </button>
          </form>

          {/* Suggested Topic Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-500)' }}>
              Popular Topics:
            </span>
            {POPULAR_SEARCHES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  executeSearch(item);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid var(--sky-200)',
                  borderRadius: '999px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.82rem',
                  color: 'var(--navy-700)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                background: 'rgba(255, 255, 255, 0.65)',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--sky-200)',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: '4px solid var(--sky-200)',
                  borderTopColor: 'var(--sky-500)',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 1rem auto',
                }}
              />
              <div style={{ fontWeight: 700, color: 'var(--navy-800)', fontSize: '1.05rem' }}>
                Fetching verified sources for "{searchedQuery}"...
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--navy-500)', marginTop: '0.25rem' }}>
                Consulting Wikipedia & DuckDuckGo knowledge bases
              </div>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                color: '#991b1b',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Search Results */}
          {!loading && results.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--navy-800)', fontSize: '1.1rem' }}>
                  {results.length} Verified {results.length === 1 ? 'Result' : 'Results'} for "{searchedQuery}"
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {results.map((item, idx) => (
                  <div
                    key={`${item.url}-${idx}`}
                    style={{
                      background: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--sky-100)',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: item.source === 'wikipedia' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: item.source === 'wikipedia' ? 'var(--sky-800)' : '#b45309',
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.source}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--navy-400)', fontWeight: 600 }}>
                          {item.domain}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCreateStory(item.title)}
                        className="btn-neoclay-secondary"
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.25rem 0.75rem',
                          color: 'var(--sky-700)',
                          borderColor: 'var(--sky-300)',
                          fontWeight: 700,
                        }}
                      >
                        ✨ Create Story on this Topic
                      </button>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: 'var(--sky-700)',
                        textDecoration: 'none',
                        lineHeight: 1.3,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {item.title} ↗
                    </a>

                    <p style={{ color: 'var(--navy-700)', fontSize: '0.94rem', lineHeight: 1.6, margin: 0 }}>
                      {item.snippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Results State */}
          {!loading && searchedQuery && results.length === 0 && !errorMsg && (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px dashed var(--sky-200)',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🧐</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--navy-800)', marginBottom: '0.5rem' }}>
                No verified articles found for "{searchedQuery}"
              </h3>
              <p style={{ color: 'var(--navy-600)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
                Try broader keywords or search for a well-known scientific principle, historical figure, or technical concept.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('Photosynthesis');
                  executeSearch('Photosynthesis');
                }}
                className="btn-neoclay-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Try "Photosynthesis"
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

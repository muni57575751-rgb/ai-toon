import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Story, StoryTone, SupportedLanguage, StoryDifficulty, ApiResponse } from '@ai-toon/shared';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { StoryViewer } from '../../components/story/StoryViewer';

interface ProviderStatus {
  providerName: string;
  model: string;
  isConfigured: boolean;
  cacheStats: { size: number; hits: number; misses: number; hitRate: string };
}

export const StoryGeneratorPage: React.FC = () => {
  // Form State
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<StoryTone>('funny');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [difficulty, setDifficulty] = useState<StoryDifficulty>('intermediate');

  // Generation / Loading / Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<Story | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Examples & AI Provider Status
  const [examples, setExamples] = useState<Story[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  // Fetch AI provider status and built-in examples on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [statusRes, examplesRes] = await Promise.all([
          fetch('/api/stories/status'),
          fetch('/api/stories/examples'),
        ]);

        if (statusRes.ok) {
          const statusJson: ApiResponse<ProviderStatus> = await statusRes.json();
          if (statusJson.data) setProviderStatus(statusJson.data);
        }

        if (examplesRes.ok) {
          const examplesJson: ApiResponse<Story[]> = await examplesRes.json();
          if (examplesJson.data) setExamples(examplesJson.data);
        }
      } catch (err) {
        console.warn('Could not fetch stories metadata:', err);
      }
    };

    fetchMeta();
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const trimmed = topic.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a topic or person (e.g. Narendra Modi, Vignan University, Photosynthesis, Binary Search).');
      return;
    }

    if (trimmed.length < 2) {
      setErrorMsg('Topic name must be at least 2 characters long.');
      return;
    }

    setIsGenerating(true);
    setGeneratedStory(null);

    try {
      const res = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: trimmed,
          tone,
          language,
          difficulty,
        }),
      });

      const data: ApiResponse<Story> = await res.json();

      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error?.message || 'Failed to generate visual lesson.');
      }

      setGeneratedStory(data.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Visual lesson generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectExample = (example: Story) => {
    setErrorMsg(null);
    setTopic(example.topic);
    setTone(example.tone);
    setLanguage(example.language);
    if (example.difficulty) setDifficulty(example.difficulty);
    setGeneratedStory(example);
  };

  const handleResetStory = () => {
    setGeneratedStory(null);
    setErrorMsg(null);
  };

  return (
    <div className="app-shell">
      <Header />

      <main className="container" style={{ padding: '2.5rem 1.75rem' }}>
        {/* Navigation Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.88rem',
            color: 'var(--liquid-navy-muted)',
            marginBottom: '1.5rem',
            fontWeight: 700,
          }}
        >
          <Link to="/dashboard" style={{ color: 'var(--accent-cyan-hover)' }}>
            ← Back to Student Dashboard
          </Link>
          <span>/</span>
          <span>Visual Lesson Generator</span>
        </div>

        {/* If a story is loaded, show the StoryViewer */}
        {generatedStory ? (
          <StoryViewer story={generatedStory} onReset={handleResetStory} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
            {/* Left: Story Creation Form */}
            <div
              className="liquid-glass-card"
              style={{
                padding: '2.5rem 2.25rem',
                borderRadius: 'var(--radius-xl)',
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.94) 0%, rgba(221, 242, 255, 0.45) 50%, rgba(255, 228, 239, 0.45) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.65rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.65rem',
                    boxShadow: '0 8px 18px rgba(14, 165, 233, 0.25)',
                  }}
                >
                  ✨
                </div>
                <div>
                  <h1 style={{ fontSize: '1.95rem', margin: 0, color: 'var(--liquid-navy-dark)' }}>
                    Visual Learning Generator
                  </h1>
                  <span style={{ fontSize: '0.9rem', color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>
                    Enter any person, university, landmark, or science concept
                  </span>
                </div>
              </div>

              {/* Error Notice with Retry Action */}
              {errorMsg && (
                <div
                  className="auth-alert-error"
                  style={{
                    margin: '1.25rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: '1 1 240px' }}>
                    <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                    <span style={{ fontSize: '0.94rem', lineHeight: 1.45 }}>{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    disabled={isGenerating}
                    className="btn-liquid-secondary"
                    style={{
                      padding: '0.45rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>🔄</span>
                    <span>Try Again</span>
                  </button>
                </div>
              )}

              {/* Generator Form */}
              <form
                onSubmit={handleGenerate}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.45rem', marginTop: '1.5rem' }}
              >
                {/* Topic Input */}
                <div className="form-group">
                  <label className="form-label" htmlFor="story-topic">
                    Educational Topic, Person, or Institution
                  </label>
                  <input
                    id="story-topic"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Narendra Modi, Vignan University, Photosynthesis, Binary Search..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isGenerating}
                    required
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--liquid-navy-subtle)', fontWeight: 600 }}>
                    💡 Topic-aware search retrieves official photographs for people/universities, and labeled diagrams for science/tech.
                  </span>
                </div>

                {/* Language Selector (English, Telugu, Hindi) */}
                <div className="form-group">
                  <label className="form-label">Lesson Language</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                      { code: 'en' as SupportedLanguage, label: 'English', flag: '🇬🇧' },
                      { code: 'te' as SupportedLanguage, label: 'Telugu (తెలుగు)', flag: '🇮🇳' },
                      { code: 'hi' as SupportedLanguage, label: 'Hindi (हिंदी)', flag: '🇮🇳' },
                    ].map((lang) => (
                      <button
                        type="button"
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={language === lang.code ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
                        style={{
                          padding: '0.75rem 0.5rem',
                          fontSize: '0.88rem',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Storytelling Style / Tone Selector */}
                <div className="form-group">
                  <label className="form-label">Educational Tone</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                      { toneVal: 'funny' as StoryTone, label: 'Funny', emoji: '🎭', desc: 'Witty & playful' },
                      { toneVal: 'adventure' as StoryTone, label: 'Adventure', emoji: '🗺️', desc: 'Heroic discovery' },
                      { toneVal: 'comic' as StoryTone, label: 'Comic', emoji: '💥', desc: 'Dynamic superhero' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.toneVal}
                        onClick={() => setTone(item.toneVal)}
                        className={tone === item.toneVal ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
                        style={{
                          padding: '0.75rem 0.5rem',
                          fontSize: '0.88rem',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <span style={{ fontSize: '1.3rem' }}>{item.emoji}</span>
                        <strong>{item.label}</strong>
                        <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Selector */}
                <div className="form-group">
                  <label className="form-label">Student Level</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                      { level: 'beginner' as StoryDifficulty, label: 'Beginner', badge: '🌱 4-5 Points' },
                      { level: 'intermediate' as StoryDifficulty, label: 'Intermediate', badge: '🧠 5-6 Points' },
                      { level: 'advanced' as StoryDifficulty, label: 'Advanced', badge: '🔬 6-7 Points' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.level}
                        onClick={() => setDifficulty(item.level)}
                        className={difficulty === item.level ? 'btn-liquid-primary' : 'btn-liquid-secondary'}
                        style={{
                          padding: '0.65rem 0.5rem',
                          fontSize: '0.88rem',
                          flexDirection: 'column',
                          gap: '0.2rem',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <strong>{item.label}</strong>
                        <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{item.badge}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button with Loading Indicator */}
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="btn-liquid-primary"
                  style={{
                    padding: '1.05rem',
                    fontSize: '1.1rem',
                    marginTop: '0.5rem',
                  }}
                >
                  {isGenerating ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: '2.5px solid #ffffff',
                          borderTopColor: 'transparent',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                      Generating Point-Wise Visual Lesson...
                    </span>
                  ) : (
                    '🚀 Generate Point-Wise Visual Lesson'
                  )}
                </button>
              </form>
            </div>

            {/* Right: Built-in Catalog & Provider Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Built-in Examples Card */}
              <div
                className="liquid-glass-card"
                style={{
                  padding: '2rem 1.85rem',
                  borderRadius: 'var(--radius-xl)',
                  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(234, 228, 255, 0.45) 50%, rgba(221, 242, 255, 0.5) 100%)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.6rem' }}>📚</span>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--liquid-navy-dark)' }}>
                      Built-in Example Lessons
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>
                      No AI key required • Instant offline access
                    </span>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--liquid-navy)',
                    lineHeight: 1.55,
                    marginBottom: '1.25rem',
                    fontWeight: 500,
                  }}
                >
                  Explore these curated, complete educational lessons with point-wise explanations and verified public diagrams:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {examples.map((ex) => (
                    <div
                      key={ex.id}
                      onClick={() => handleSelectExample(ex)}
                      className="liquid-glass-inset"
                      style={{
                        cursor: 'pointer',
                        padding: '1.05rem 1.25rem',
                        transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
                      }}
                      title="Click to view lesson"
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.35rem',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '0.82rem',
                            color: 'var(--accent-cyan-hover)',
                            fontWeight: 800,
                          }}
                        >
                          {ex.topic}
                        </span>
                        <span className="liquid-badge badge-pink" style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem' }}>
                          {ex.tone}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.98rem', margin: '0 0 0.35rem', color: 'var(--liquid-navy-dark)' }}>
                        {ex.title}
                      </h4>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem',
                          color: 'var(--liquid-navy-subtle)',
                          fontWeight: 600,
                        }}
                      >
                        <span>{ex.keyPoints?.length || 5} Points • {ex.illustrations?.length || 2} Visuals</span>
                        <span style={{ color: 'var(--accent-cyan-hover)', fontWeight: 800 }}>Explore Guide →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Engine & Quota Protection Card */}
              <div
                className="liquid-glass-card"
                style={{
                  padding: '1.85rem',
                  borderRadius: 'var(--radius-xl)',
                  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 240, 223, 0.45) 50%, rgba(221, 242, 255, 0.5) 100%)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--liquid-navy-dark)' }}>
                      AI Engine & Quota Protection
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>
                      Free-Tier Rate Limiting & Wikimedia Caching
                    </span>
                  </div>
                </div>

                <div
                  className="liquid-glass-inset"
                  style={{
                    padding: '0.95rem 1.15rem',
                    fontSize: '0.86rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>Provider:</span>
                    <strong style={{ color: 'var(--liquid-navy-dark)' }}>
                      {providerStatus?.providerName || 'Google Gemini (Free Tier)'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>Live AI Key:</span>
                    {providerStatus?.isConfigured ? (
                      <span style={{ color: '#047857', fontWeight: 800 }}>● Active</span>
                    ) : (
                      <span style={{ color: '#b45309', fontWeight: 800 }}>○ Built-in Fallback Active</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>Cached Lessons:</span>
                    <strong style={{ color: 'var(--accent-cyan-hover)' }}>
                      {providerStatus?.cacheStats?.size ?? 0} saved
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--liquid-navy-muted)', fontWeight: 600 }}>Quota Cache Hits:</span>
                    <strong style={{ color: '#047857' }}>
                      {providerStatus?.cacheStats?.hits ?? 0} ({providerStatus?.cacheStats?.hitRate ?? '0%'})
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

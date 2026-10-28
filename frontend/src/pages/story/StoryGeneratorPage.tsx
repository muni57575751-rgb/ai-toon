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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = topic.trim();
    if (!trimmed) {
      setErrorMsg('Please enter an educational topic (e.g., Photosynthesis, Gravity, Black Holes).');
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
        throw new Error(data.error?.message || 'Failed to generate story.');
      }

      setGeneratedStory(data.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Story generation failed.');
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.88rem',
          color: 'var(--navy-600)',
          marginBottom: '1.5rem',
          fontWeight: 600,
        }}>
          <Link to="/dashboard" style={{ color: 'var(--sky-700)' }}>← Back to Student Dashboard</Link>
          <span>/</span>
          <span>Story Generator</span>
        </div>

        {/* If a story is loaded, show the StoryViewer */}
        {generatedStory ? (
          <StoryViewer story={generatedStory} onReset={handleResetStory} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
            {/* Left: Story Creation Form */}
            <div className="neoclay-card" style={{ padding: '2.5rem 2.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  boxShadow: 'var(--clay-volume-subtle)',
                }}>
                  ✨
                </div>
                <div>
                  <h1 style={{ fontSize: '1.85rem', margin: 0, color: 'var(--navy-950)' }}>
                    AI Story Generator
                  </h1>
                  <span style={{ fontSize: '0.88rem', color: 'var(--navy-600)', fontWeight: 600 }}>
                    Turn your syllabus concepts into engaging cartoon adventures
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {errorMsg && (
                <div className="auth-alert-error" style={{ margin: '1.25rem 0' }}>
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Generator Form */}
              <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem', marginTop: '1.5rem' }}>
                {/* Topic Input */}
                <div className="form-group">
                  <label className="form-label" htmlFor="story-topic">
                    Academic Topic or Curiosity Question
                  </label>
                  <input
                    id="story-topic"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Photosynthesis, Gravity, How volcano works, Solar System..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isGenerating}
                    required
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--navy-500)', fontWeight: 600 }}>
                    Tip: Enter any science, history, or math concept you want to learn.
                  </span>
                </div>

                {/* Language Selector (English, Telugu, Hindi) */}
                <div className="form-group">
                  <label className="form-label">
                    Story Language
                  </label>
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
                        className={language === lang.code ? 'btn-neoclay-primary' : 'btn-neoclay-secondary'}
                        style={{
                          padding: '0.65rem 0.5rem',
                          fontSize: '0.85rem',
                          flexDirection: 'column',
                          gap: '0.2rem',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Storytelling Style / Tone Selector */}
                <div className="form-group">
                  <label className="form-label">
                    Storytelling Style
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                      { toneVal: 'funny' as StoryTone, label: 'Funny', emoji: '🎭', desc: 'Humorous & witty' },
                      { toneVal: 'adventure' as StoryTone, label: 'Adventure', emoji: '🗺️', desc: 'Exciting discovery' },
                      { toneVal: 'comic' as StoryTone, label: 'Comic', emoji: '💥', desc: 'Action-packed hero' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.toneVal}
                        onClick={() => setTone(item.toneVal)}
                        className={tone === item.toneVal ? 'btn-neoclay-primary' : 'btn-neoclay-secondary'}
                        style={{
                          padding: '0.65rem 0.5rem',
                          fontSize: '0.85rem',
                          flexDirection: 'column',
                          gap: '0.2rem',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                        <strong>{item.label}</strong>
                        <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Selector */}
                <div className="form-group">
                  <label className="form-label">
                    Difficulty Level (Optional)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                      { level: 'beginner' as StoryDifficulty, label: 'Beginner', badge: '🌱 Easy & Fun' },
                      { level: 'intermediate' as StoryDifficulty, label: 'Intermediate', badge: '🧠 Balanced' },
                      { level: 'advanced' as StoryDifficulty, label: 'Advanced', badge: '🔬 In-depth' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.level}
                        onClick={() => setDifficulty(item.level)}
                        className={difficulty === item.level ? 'btn-neoclay-primary' : 'btn-neoclay-secondary'}
                        style={{
                          padding: '0.55rem 0.5rem',
                          fontSize: '0.85rem',
                          flexDirection: 'column',
                          gap: '0.2rem',
                        }}
                      >
                        <strong>{item.label}</strong>
                        <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>{item.badge}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="btn-neoclay-primary"
                  style={{
                    padding: '0.95rem',
                    fontSize: '1.05rem',
                    marginTop: '0.5rem',
                    boxShadow: 'var(--shadow-neoclay-btn)',
                  }}
                >
                  {isGenerating ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: '2.5px solid #ffffff',
                        borderTopColor: 'transparent',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Crafting Cartoon Scenes...
                    </span>
                  ) : (
                    '🚀 Generate Educational Cartoon Story'
                  )}
                </button>
              </form>
            </div>

            {/* Right: Built-in Catalog & AI Quota Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Built-in Examples Card */}
              <div className="neoclay-card" style={{ padding: '2rem 1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📚</span>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--navy-950)' }}>
                      Built-in Example Stories
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--navy-600)', fontWeight: 600 }}>
                      No AI key required • Instant offline access
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--navy-700)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Explore these curated, complete educational cartoon stories with full cartoon scene cards and educational explanations:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {examples.map((ex) => (
                    <div
                      key={ex.id}
                      onClick={() => handleSelectExample(ex)}
                      className="neoclay-recessed"
                      style={{
                        cursor: 'pointer',
                        padding: '1rem 1.15rem',
                        transition: 'transform var(--transition-fast)',
                      }}
                      title="Click to view story"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '0.78rem',
                          color: 'var(--sky-700)',
                          fontWeight: 800,
                        }}>
                          {ex.topic}
                        </span>
                        <span className="neoclay-badge badge-coral" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                          {ex.tone}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.35rem', color: 'var(--navy-950)' }}>
                        {ex.title}
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--navy-500)', fontWeight: 600 }}>
                        <span>{ex.keyPoints?.length || 5} Points • {ex.illustrations?.length || 2} Diagrams</span>
                        <span style={{ color: 'var(--sky-600)', fontWeight: 800 }}>Explore Guide →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Quota & Provider Status Card */}
              <div className="neoclay-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🛡️</span>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--navy-950)' }}>
                      AI Engine & Quota Protection
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--navy-600)', fontWeight: 600 }}>
                      Replaceable Free-Tier Architecture
                    </span>
                  </div>
                </div>

                <div className="neoclay-recessed" style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--navy-600)', fontWeight: 600 }}>Provider:</span>
                    <strong style={{ color: 'var(--navy-950)' }}>{providerStatus?.providerName || 'Google Gemini (Free Tier)'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--navy-600)', fontWeight: 600 }}>Live Key Configured:</span>
                    {providerStatus?.isConfigured ? (
                      <span style={{ color: 'var(--clay-mint-dark)', fontWeight: 800 }}>● Active</span>
                    ) : (
                      <span style={{ color: 'var(--clay-yellow-dark)', fontWeight: 800 }}>○ Built-in Fallback Active</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--navy-600)', fontWeight: 600 }}>Cached Stories:</span>
                    <strong style={{ color: 'var(--sky-700)' }}>{providerStatus?.cacheStats?.size ?? 0} saved</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--navy-600)', fontWeight: 600 }}>Quota Cache Hits:</span>
                    <strong style={{ color: 'var(--clay-mint-dark)' }}>{providerStatus?.cacheStats?.hits ?? 0} ({providerStatus?.cacheStats?.hitRate ?? '0%'})</strong>
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

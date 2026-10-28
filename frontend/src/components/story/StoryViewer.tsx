import React, { useState } from 'react';
import type { Story } from '@ai-toon/shared';
import { SceneCard } from './SceneCard';

interface StoryViewerProps {
  story: Story;
  onReset?: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ story, onReset }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'carousel' | 'comic'>('carousel');

  const totalScenes = story.scenes.length;
  const currentScene = story.scenes[currentSceneIndex] || story.scenes[0];

  const handleNext = () => {
    if (currentSceneIndex < totalScenes - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex((prev) => prev - 1);
    }
  };

  const toneEmojis: Record<string, string> = {
    funny: '🎭 Funny',
    adventure: '🗺️ Adventure',
    comic: '💥 Comic',
  };

  const langNames: Record<string, string> = {
    en: 'English',
    te: 'Telugu (తెలుగు)',
    hi: 'Hindi (हिंदी)',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ta: 'Tamil',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Story Meta Header */}
      <div className="neoclay-card" style={{ padding: '2rem 2.25rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
              <span className="neoclay-badge badge-sky">
                Topic: {story.topic}
              </span>
              <span className="neoclay-badge badge-coral">
                {toneEmojis[story.tone] || story.tone}
              </span>
              <span className="neoclay-badge badge-yellow">
                {langNames[story.language] || story.language}
              </span>
              {story.difficulty && (
                <span className="neoclay-badge badge-purple" style={{ textTransform: 'capitalize' }}>
                  Level: {story.difficulty}
                </span>
              )}
            </div>

            <h2 style={{
              fontSize: '2.1rem',
              color: 'var(--navy-950)',
              margin: '0.25rem 0 0.5rem',
            }}>
              {story.title}
            </h2>
          </div>

          {/* Badges: Cached / Built-in / Live */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {story.isCached && (
              <span className="neoclay-badge badge-green" title="Reused from cache to preserve free AI quota">
                ⚡ Quota Saved (Cached)
              </span>
            )}
            {story.isExample && (
              <span className="neoclay-badge badge-sky" title="Original built-in offline educational story">
                📚 Built-in Catalog
              </span>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="btn-neoclay-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                ✨ New Story
              </button>
            )}
          </div>
        </div>

        {/* Story Summary */}
        <p style={{
          fontSize: '1.05rem',
          color: 'var(--navy-700)',
          lineHeight: 1.6,
          margin: '0 0 1.25rem',
          fontWeight: 600,
        }}>
          {story.summary}
        </p>

        {/* View Mode Switcher & Scene Dots */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(196, 221, 246, 0.6)',
        }}>
          {/* Scene Jump Dots (when in carousel mode) */}
          {viewMode === 'carousel' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-600)' }}>
                Scenes:
              </span>
              {story.scenes.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSceneIndex(idx)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: currentSceneIndex === idx ? 'var(--sky-500)' : 'var(--clay-surface)',
                    color: currentSceneIndex === idx ? '#ffffff' : 'var(--navy-800)',
                    border: '1.5px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: currentSceneIndex === idx
                      ? '0 4px 10px rgba(14, 165, 233, 0.4), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.8)'
                      : 'var(--neo-shadow-sm)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  title={`Jump to Scene ${s.order}: ${s.title}`}
                >
                  {s.order}
                </button>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.9rem', color: 'var(--navy-600)', fontWeight: 700 }}>
              Viewing all {totalScenes} scenes in Comic Strip mode
            </span>
          )}

          {/* Toggle Button */}
          <button
            onClick={() => setViewMode(viewMode === 'carousel' ? 'comic' : 'carousel')}
            className="btn-neoclay-secondary"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.95rem' }}
          >
            {viewMode === 'carousel' ? '📜 Expand All Scenes' : '🎞️ Slide-by-Slide Mode'}
          </button>
        </div>
      </div>

      {/* Main Scenes Rendering */}
      {viewMode === 'carousel' ? (
        <SceneCard
          scene={currentScene}
          totalScenes={totalScenes}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={currentSceneIndex < totalScenes - 1}
          hasPrev={currentSceneIndex > 0}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {story.scenes.map((scene, idx) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              totalScenes={totalScenes}
              onNext={() => {}}
              onPrev={() => {}}
              hasNext={idx < totalScenes - 1}
              hasPrev={idx > 0}
            />
          ))}
        </div>
      )}

      {/* Key Takeaways Checklist Card */}
      {story.keyTakeaways && story.keyTakeaways.length > 0 && (
        <div className="neoclay-card" style={{ padding: '2rem 2.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🎯</span>
            <h3 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--navy-950)' }}>
              Key Educational Takeaways
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {story.keyTakeaways.map((takeaway, idx) => (
              <div
                key={idx}
                className="neoclay-recessed"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1.25rem',
                }}
              >
                <span style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--clay-mint)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
                }}>
                  ✓
                </span>
                <span style={{ fontSize: '0.95rem', color: 'var(--navy-900)', fontWeight: 600 }}>
                  {takeaway}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

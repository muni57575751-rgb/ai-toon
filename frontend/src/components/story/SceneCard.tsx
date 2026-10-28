import React from 'react';
import type { StoryScene } from '@ai-toon/shared';
import { CartoonIllustration } from './CartoonIllustration';

interface SceneCardProps {
  scene: StoryScene;
  totalScenes: number;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  totalScenes,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}) => {
  return (
    <div className="neoclay-card" style={{ padding: '2rem 2.25rem' }}>
      {/* Top Scene Stepper */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className="neoclay-badge badge-sky" style={{ fontSize: '0.85rem' }}>
            Scene {scene.order} of {totalScenes}
          </span>
          <h3 style={{
            fontSize: '1.35rem',
            margin: 0,
            color: 'var(--navy-950)',
          }}>
            {scene.title}
          </h3>
        </div>

        {/* Scene Pagination Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="btn-neoclay-secondary"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.88rem',
              opacity: hasPrev ? 1 : 0.45,
              cursor: hasPrev ? 'pointer' : 'not-allowed',
            }}
          >
            ← Previous
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="btn-neoclay-primary"
            style={{
              padding: '0.45rem 1.15rem',
              fontSize: '0.88rem',
              opacity: hasNext ? 1 : 0.45,
              cursor: hasNext ? 'pointer' : 'not-allowed',
            }}
          >
            Next Scene →
          </button>
        </div>
      </div>

      {/* Main Two-Column or Stacked Scene Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        alignItems: 'start',
      }}>
        {/* Left: Cartoon Scene Illustration */}
        <CartoonIllustration
          order={scene.order}
          keyword={scene.illustrationKeyword}
          visualDescription={scene.visualDescription}
        />

        {/* Right: Narrative Story Text & Educational Takeaway */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Comic Dialogue / Narrative Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid rgba(196, 221, 246, 0.9)',
            boxShadow: 'var(--neo-shadow-sm), inset 2px 2px 5px rgba(255, 255, 255, 0.95)',
            padding: '1.5rem 1.75rem',
            position: 'relative',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--sky-700)',
              marginBottom: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              <span>💬</span> Story Scene Dialog
            </div>
            <p style={{
              fontSize: '1.05rem',
              lineHeight: 1.65,
              color: 'var(--navy-900)',
              fontWeight: 600,
              margin: 0,
            }}>
              {scene.text}
            </p>
          </div>

          {/* Educational Insight Callout Box */}
          <div style={{
            background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid rgba(234, 179, 8, 0.4)',
            boxShadow: '0 6px 14px rgba(234, 179, 8, 0.15), inset 2px 2px 4px rgba(255, 255, 255, 0.8)',
            padding: '1.15rem 1.35rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 800,
              fontSize: '0.92rem',
              color: '#854d0e',
              marginBottom: '0.35rem',
            }}>
              <span>💡</span> Educational Takeaway
            </div>
            <p style={{
              fontSize: '0.92rem',
              color: '#713f12',
              lineHeight: 1.5,
              margin: 0,
              fontWeight: 600,
            }}>
              {scene.educationalExplanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

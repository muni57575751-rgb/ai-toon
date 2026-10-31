import React, { useState } from 'react';
import type { Story, QuizQuestion, KeyPoint, TopicIllustration, QuizOption } from '@ai-toon/shared';
import { CartoonIllustration } from './CartoonIllustration';
import { LocationMap } from '../geo/LocationMap';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

interface StoryViewerProps {
  story: Story;
  onReset?: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ story, onReset }) => {
  const { user, getAuthHeaders } = useAuth();

  // Interactive Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const keyPoints = story.keyPoints || [];
  const illustrations = story.illustrations || [];
  const quizQuestions = story.quizQuestions || [];

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const handleCheckAnswers = async () => {
    setSubmitted(true);
    if (!user) return;
    try {
      await fetch(`${API_BASE_URL}/stories/quiz/attempt`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          storyId: story.id,
          topic: story.topic,
          score: correctCount,
          totalQuestions: quizQuestions.length,
          answers: selectedAnswers,
        }),
      });
    } catch (err) {
      console.warn('Failed to record quiz attempt:', err);
    }
  };

  // Calculate score
  const correctCount = quizQuestions.reduce((acc, q) => {
    return selectedAnswers[q.id] === q.correctOptionId ? acc + 1 : acc;
  }, 0);

  const toneLabels: Record<string, string> = {
    funny: 'Humorous & Fun',
    adventure: 'Adventurous Quest',
    comic: 'Dynamic Superhero',
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
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        maxWidth: '960px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* 1. Header Card with Title, Metadata, and Back Button */}
      <header className="liquid-glass-card story-header-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="liquid-badge badge-blue">
              Topic: {story.topic}
            </span>
            {story.difficulty && (
              <span className="liquid-badge badge-lavender" style={{ textTransform: 'capitalize' }}>
                Level: {story.difficulty}
              </span>
            )}
            <span className="liquid-badge badge-cream">
              Language: {langNames[story.language] || story.language}
            </span>
            <span className="liquid-badge badge-pink">
              Tone: {toneLabels[story.tone] || story.tone}
            </span>
            {story.isCached && (
              <span className="liquid-badge badge-mint">
                ⚡ Fast Cached
              </span>
            )}
            {story.isExample && (
              <span className="liquid-badge badge-cream">
                📚 Built-in Catalog
              </span>
            )}
          </div>

          {onReset && (
            <button
              onClick={onReset}
              className="btn-liquid-secondary"
              style={{
                fontSize: '0.86rem',
                padding: '0.5rem 1.15rem',
              }}
            >
              ← Explore Another Topic
            </button>
          )}
        </div>

        {/* Main Article Title */}
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            fontWeight: 800,
            color: 'var(--liquid-navy-dark)',
            lineHeight: 1.25,
            marginBottom: '1.25rem',
            overflowWrap: 'break-word',
          }}
        >
          {story.title}
        </h1>

        {/* Introduction Callout Inset */}
        <div
          className="liquid-glass-inset"
          style={{
            padding: 'clamp(1rem, 2.5vw, 1.35rem) clamp(1rem, 3vw, 1.5rem)',
            borderRadius: 'var(--radius-lg)',
            borderLeft: '5px solid var(--accent-cyan)',
            fontSize: 'clamp(0.95rem, 2vw, 1.05rem)',
            lineHeight: 1.68,
            color: 'var(--liquid-navy)',
            fontWeight: 600,
          }}
        >
          {story.introduction || story.summary}
        </div>
      </header>

      {/* Geographical Intelligence & Interactive Map (Rendered ONLY when genuinely relevant: requiresMap === true) */}
      {Boolean(story.requiresMap && story.locationDetails && story.locationDetails.isLocation) && (
        <LocationMap location={story.locationDetails!} />
      )}

      {/* 2. Unified Point-Wise Educational Content */}
      <section className="liquid-glass-card story-section-card">
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              minWidth: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ddf2ff 0%, #bae6fd 100%)',
              color: 'var(--accent-cyan-hover)',
              fontWeight: 900,
              fontSize: '1rem',
              boxShadow: '0 4px 10px rgba(14, 165, 233, 0.2)',
            }}
          >
            ✓
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(1.2rem, 3vw, 1.55rem)',
              fontWeight: 800,
              color: 'var(--liquid-navy-dark)',
              lineHeight: 1.3,
            }}
          >
            Core Concepts & Point-Wise Breakdown
          </h2>
        </div>

        {/* List of Numbered Points with Integrated Visuals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {keyPoints.map((point: KeyPoint, index: number) => {
            const pointNum = point.pointNumber || index + 1;

            // Find illustrations positioned after this point
            const matchingIllustrations = illustrations.filter((ill: TopicIllustration, illIdx: number) => {
              if (typeof ill.positionIndex === 'number') {
                return ill.positionIndex === pointNum;
              }
              return (illIdx + 1) * 2 === pointNum;
            });

            return (
              <React.Fragment key={`point_${pointNum}`}>
                {/* Single Point Item */}
                <div
                  className="liquid-glass-inset story-point-item"
                  style={{
                    background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.88)' : 'rgba(240, 249, 255, 0.7)',
                  }}
                >
                  {/* Number Badge */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                    }}
                  >
                    {pointNum}
                  </div>

                  {/* Point Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: '0 0 0.55rem 0',
                        fontSize: 'clamp(1.05rem, 2.5vw, 1.22rem)',
                        fontWeight: 800,
                        color: 'var(--liquid-navy-dark)',
                        lineHeight: 1.35,
                      }}
                    >
                      {point.heading}
                    </h3>

                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        color: 'var(--liquid-navy)',
                        fontSize: 'clamp(0.9rem, 2vw, 0.98rem)',
                        lineHeight: 1.6,
                        fontWeight: 500,
                      }}
                    >
                      {point.bulletPoints.map((bullet: string, bIdx: number) => (
                        <li key={bIdx} style={{ listStyleType: 'disc' }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Integrated Educational Visual inserted seamlessly between points */}
                {matchingIllustrations.map((ill: TopicIllustration, illIdx: number) => {
                  const globalIllIdx = illustrations.indexOf(ill) + 1;
                  return (
                    <CartoonIllustration
                      key={ill.id || `ill_${illIdx}`}
                      title={ill.title}
                      caption={ill.caption}
                      description={ill.description}
                      keyword={ill.keyword}
                      imageUrl={ill.imageUrl}
                      thumbnailUrl={ill.thumbnailUrl}
                      sourcePageUrl={ill.sourcePageUrl}
                      author={ill.author}
                      license={ill.license}
                      licenseUrl={ill.licenseUrl}
                      attribution={ill.attribution}
                      width={ill.width}
                      height={ill.height}
                      sourceType={ill.sourceType}
                      alternativeUrls={ill.alternativeUrls}
                      figureNumber={globalIllIdx > 0 ? globalIllIdx : illIdx + 1}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Any remaining visuals not placed yet */}
          {illustrations
            .filter((ill: TopicIllustration, illIdx: number) => {
              const pos = typeof ill.positionIndex === 'number' ? ill.positionIndex : (illIdx + 1) * 2;
              return pos > keyPoints.length;
            })
            .map((ill: TopicIllustration, illIdx: number) => {
              const globalIllIdx = illustrations.indexOf(ill) + 1;
              return (
                <CartoonIllustration
                  key={ill.id || `extra_ill_${illIdx}`}
                  title={ill.title}
                  caption={ill.caption}
                  description={ill.description}
                  keyword={ill.keyword}
                  imageUrl={ill.imageUrl}
                  thumbnailUrl={ill.thumbnailUrl}
                  sourcePageUrl={ill.sourcePageUrl}
                  author={ill.author}
                  license={ill.license}
                  licenseUrl={ill.licenseUrl}
                  attribution={ill.attribution}
                  width={ill.width}
                  height={ill.height}
                  sourceType={ill.sourceType}
                  alternativeUrls={ill.alternativeUrls}
                  figureNumber={globalIllIdx > 0 ? globalIllIdx : illIdx + 1}
                />
              );
            })}
        </div>

        {/* 3. Key Takeaway Section */}
        <div
          style={{
            marginTop: '2rem',
            padding: 'clamp(1rem, 3vw, 1.65rem) clamp(1rem, 3.5vw, 1.85rem)',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(255, 240, 223, 0.95) 0%, rgba(254, 243, 199, 0.8) 100%)',
            border: '2px solid rgba(251, 191, 36, 0.6)',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.12)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🌟</span>
            <h3
              style={{
                margin: 0,
                fontSize: 'clamp(1.05rem, 2.5vw, 1.2rem)',
                fontWeight: 800,
                color: '#92400e',
              }}
            >
              Key Learning Takeaway
            </h3>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(0.92rem, 2vw, 1.02rem)',
              lineHeight: 1.65,
              color: '#78350f',
              fontWeight: 600,
            }}
          >
            {story.keyTakeaway || story.keyTakeaways?.[0] || 'Mastering this concept is an essential foundation for deeper academic understanding.'}
          </p>
        </div>
      </section>

      {/* 3. Interactive Quiz Section */}
      {quizQuestions.length > 0 && (
        <section className="liquid-glass-card story-section-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <span className="liquid-badge badge-lavender" style={{ marginBottom: '0.45rem' }}>
                Knowledge Check
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.2rem, 3vw, 1.55rem)',
                  fontWeight: 800,
                  color: 'var(--liquid-navy-dark)',
                }}
              >
                Quick Quiz ({quizQuestions.length} Questions)
              </h2>
            </div>

            {submitted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '0.55rem 1.15rem',
                    borderRadius: 'var(--radius-pill)',
                    background: correctCount === quizQuestions.length ? 'rgba(209, 250, 229, 0.95)' : 'rgba(254, 243, 199, 0.95)',
                    color: correctCount === quizQuestions.length ? '#065f46' : '#92400e',
                    border: correctCount === quizQuestions.length ? '1.5px solid #34d399' : '1.5px solid #fbbf24',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 12px rgba(36, 50, 75, 0.08)',
                  }}
                >
                  Score: {correctCount} / {quizQuestions.length}
                </span>
                <button
                  onClick={handleResetQuiz}
                  className="btn-liquid-secondary"
                  style={{ fontSize: '0.88rem', padding: '0.5rem 1rem' }}
                >
                  ↺ Retake Quiz
                </button>
              </div>
            ) : (
              <button
                onClick={handleCheckAnswers}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="btn-liquid-primary"
                style={{
                  fontSize: '0.92rem',
                  padding: '0.65rem 1.45rem',
                  opacity: Object.keys(selectedAnswers).length === 0 ? 0.6 : 1,
                  cursor: Object.keys(selectedAnswers).length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Check Answers
              </button>
            )}
          </div>

          {/* Quiz Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {quizQuestions.map((q: QuizQuestion, qIndex: number) => {
              const selectedOptId = selectedAnswers[q.id];
              const isCorrect = selectedOptId === q.correctOptionId;

              return (
                <div
                  key={q.id || `q_${qIndex}`}
                  className="liquid-glass-inset"
                  style={{
                    padding: 'clamp(1rem, 3vw, 1.6rem) clamp(0.95rem, 3vw, 1.75rem)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(255, 255, 255, 0.88)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 1rem 0',
                      fontSize: 'clamp(0.98rem, 2.2vw, 1.1rem)',
                      fontWeight: 800,
                      color: 'var(--liquid-navy-dark)',
                      lineHeight: 1.48,
                    }}
                  >
                    <span style={{ color: 'var(--accent-cyan-hover)', marginRight: '0.55rem' }}>
                      Q{qIndex + 1}.
                    </span>
                    {q.question}
                  </p>

                  {/* Options Grid */}
                  <div
                    className="quiz-options-grid"
                    style={{
                      marginBottom: submitted ? '1.15rem' : 0,
                    }}
                  >
                    {q.options.map((opt: QuizOption) => {
                      const isSelected = selectedOptId === opt.id;
                      const isThisCorrect = opt.id === q.correctOptionId;

                      let optBg = 'rgba(255, 255, 255, 0.9)';
                      let optBorder = '1.5px solid rgba(221, 242, 255, 0.9)';
                      let optColor = 'var(--liquid-navy)';

                      if (submitted) {
                        if (isThisCorrect) {
                          optBg = 'rgba(209, 250, 229, 0.95)';
                          optBorder = '2px solid #10b981';
                          optColor = '#065f46';
                        } else if (isSelected && !isThisCorrect) {
                          optBg = 'rgba(255, 228, 239, 0.95)';
                          optBorder = '2px solid #f43f5e';
                          optColor = '#9f1239';
                        }
                      } else if (isSelected) {
                        optBg = 'rgba(221, 242, 255, 0.95)';
                        optBorder = '2px solid var(--accent-cyan)';
                        optColor = 'var(--accent-cyan-hover)';
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.8rem 1rem',
                            minHeight: 'var(--touch-target-min)',
                            borderRadius: 'var(--radius-md)',
                            background: optBg,
                            border: optBorder,
                            color: optColor,
                            fontSize: '0.94rem',
                            fontWeight: isSelected || (submitted && isThisCorrect) ? 800 : 600,
                            textAlign: 'left',
                            cursor: submitted ? 'default' : 'pointer',
                            boxShadow: '0 2px 8px rgba(36, 50, 75, 0.04)',
                            transition: 'all 0.16s ease',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: isSelected ? 'var(--accent-cyan)' : 'rgba(221, 242, 255, 0.9)',
                              color: isSelected ? '#ffffff' : 'var(--liquid-navy)',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              flexShrink: 0,
                            }}
                          >
                            {opt.id}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation card after submit */}
                  {submitted && (
                    <div
                      style={{
                        padding: '0.85rem 1.15rem',
                        borderRadius: 'var(--radius-md)',
                        background: isCorrect ? 'rgba(209, 250, 229, 0.9)' : 'rgba(255, 240, 223, 0.9)',
                        borderLeft: `4px solid ${isCorrect ? '#10b981' : '#f59e0b'}`,
                        fontSize: '0.9rem',
                        lineHeight: 1.55,
                        color: 'var(--liquid-navy)',
                        boxShadow: '0 2px 8px rgba(36, 50, 75, 0.04)',
                      }}
                    >
                      <strong style={{ color: isCorrect ? '#065f46' : '#92400e' }}>
                        {isCorrect ? '✓ Correct! ' : 'Note: '}
                      </strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Footer Return / Reset CTA */}
      {onReset && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0 2rem' }}>
          <button
            onClick={onReset}
            className="btn-liquid-primary"
            style={{
              padding: '0.9rem 2.25rem',
              fontSize: '1rem',
              width: '100%',
              maxWidth: '380px',
            }}
          >
            ✨ Learn Another Topic
          </button>
        </div>
      )}
    </article>
  );
};

import React, { useState } from 'react';
import type { Story, QuizQuestion } from '@ai-toon/shared';
import { CartoonIllustration } from './CartoonIllustration';

interface StoryViewerProps {
  story: Story;
  onReset?: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ story, onReset }) => {
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
        maxWidth: '920px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* 1. Header Card with Title, Metadata, and Back Button */}
      <header
        className="neoclay-card"
        style={{
          padding: '2.25rem 2.5rem',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)',
          border: '2px solid rgba(14, 165, 233, 0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="neoclay-badge badge-sky" style={{ fontWeight: 700 }}>
              Topic: {story.topic}
            </span>
            {story.difficulty && (
              <span className="neoclay-badge badge-navy" style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                Level: {story.difficulty}
              </span>
            )}
            <span className="neoclay-badge badge-amber" style={{ fontWeight: 700 }}>
              Language: {langNames[story.language] || story.language}
            </span>
            <span className="neoclay-badge badge-sky" style={{ fontWeight: 700 }}>
              Tone: {toneLabels[story.tone] || story.tone}
            </span>
            {story.isCached && (
              <span className="neoclay-badge badge-mint" style={{ fontWeight: 700 }}>
                ⚡ Fast Cached
              </span>
            )}
            {story.isExample && (
              <span className="neoclay-badge badge-amber" style={{ fontWeight: 700 }}>
                📚 Built-in Catalog
              </span>
            )}
          </div>

          {onReset && (
            <button
              onClick={onReset}
              className="neoclay-btn btn-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              ← Explore Another Topic
            </button>
          )}
        </div>

        {/* Main Article Title */}
        <h1
          style={{
            fontSize: '2.1rem',
            fontWeight: 900,
            color: 'var(--navy-900)',
            lineHeight: 1.25,
            marginBottom: '1.25rem',
          }}
        >
          {story.title}
        </h1>

        {/* Introduction Callout */}
        <div
          style={{
            padding: '1.15rem 1.35rem',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255, 255, 255, 0.9)',
            borderLeft: '5px solid var(--sky-500)',
            boxShadow: '0 4px 12px rgba(15, 43, 72, 0.05)',
            fontSize: '1.05rem',
            lineHeight: 1.65,
            color: 'var(--navy-800)',
            fontWeight: 500,
          }}
        >
          {story.introduction || story.summary}
        </div>
      </header>

      {/* 2. Unified Point-Wise Educational Content */}
      <section
        className="neoclay-card"
        style={{
          padding: '2.5rem',
          borderRadius: 'var(--radius-xl)',
          background: '#ffffff',
        }}
      >
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--sky-100)',
              color: 'var(--sky-700)',
              fontWeight: 900,
              fontSize: '1rem',
            }}
          >
            ✓
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--navy-900)',
            }}
          >
            Core Concepts & Point-Wise Breakdown
          </h2>
        </div>

        {/* List of Numbered Points with Integrated Illustrations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {keyPoints.map((point, index) => {
            const pointNum = point.pointNumber || index + 1;

            // Find illustrations positioned after this point
            // By default, if positionIndex is not specified, place ill 0 after point 2 and ill 1 after point 4
            const matchingIllustrations = illustrations.filter((ill, illIdx) => {
              if (typeof ill.positionIndex === 'number') {
                return ill.positionIndex === pointNum;
              }
              return (illIdx + 1) * 2 === pointNum;
            });

            return (
              <React.Fragment key={`point_${pointNum}`}>
                {/* Single Point Item */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1.25rem',
                    padding: '1.35rem 1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    background: index % 2 === 0 ? 'rgba(240, 249, 255, 0.45)' : '#ffffff',
                    border: '1.5px solid rgba(226, 232, 240, 0.8)',
                    boxShadow: '0 4px 10px rgba(15, 43, 72, 0.03)',
                  }}
                >
                  {/* Number Badge */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--sky-500) 0%, var(--sky-600) 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      boxShadow: '0 4px 10px rgba(14, 165, 233, 0.35)',
                    }}
                  >
                    {pointNum}
                  </div>

                  {/* Point Content */}
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: '0 0 0.65rem 0',
                        fontSize: '1.18rem',
                        fontWeight: 800,
                        color: 'var(--navy-900)',
                        lineHeight: 1.35,
                      }}
                    >
                      {point.heading}
                    </h3>

                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '1.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        color: 'var(--navy-700)',
                        fontSize: '0.98rem',
                        lineHeight: 1.6,
                      }}
                    >
                      {point.bulletPoints.map((bullet, bIdx) => (
                        <li key={bIdx} style={{ listStyleType: 'disc' }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Integrated Educational Illustration inserted seamlessly between points */}
                {matchingIllustrations.map((ill, illIdx) => {
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
                      figureNumber={globalIllIdx > 0 ? globalIllIdx : illIdx + 1}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Any remaining illustrations not placed yet */}
          {illustrations
            .filter((ill, illIdx) => {
              const pos = typeof ill.positionIndex === 'number' ? ill.positionIndex : (illIdx + 1) * 2;
              return pos > keyPoints.length;
            })
            .map((ill, illIdx) => {
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
                  figureNumber={globalIllIdx > 0 ? globalIllIdx : illIdx + 1}
                />
              );
            })}
        </div>

        {/* 3. Key Takeaway Section at the end of the explanation */}
        <div
          style={{
            marginTop: '2.5rem',
            padding: '1.5rem 1.75rem',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
            border: '2px solid #fde047',
            boxShadow: '0 8px 20px rgba(234, 179, 8, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🌟</span>
            <h3
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#854d0e',
              }}
            >
              Key Takeaway
            </h3>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '1.02rem',
              lineHeight: 1.6,
              color: '#713f12',
              fontWeight: 600,
            }}
          >
            {story.keyTakeaway || story.keyTakeaways?.[0] || 'Mastering this concept is a vital building block in scientific learning.'}
          </p>
        </div>
      </section>

      {/* 4. Interactive Quiz Section */}
      {quizQuestions.length > 0 && (
        <section
          className="neoclay-card"
          style={{
            padding: '2.5rem',
            borderRadius: 'var(--radius-xl)',
            background: '#ffffff',
            border: '2px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <span
                className="neoclay-badge badge-navy"
                style={{
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.35rem',
                }}
              >
                Knowledge Check
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: 'var(--navy-900)',
                }}
              >
                Quick Quiz ({quizQuestions.length} Questions)
              </h2>
            </div>

            {submitted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: 'var(--radius-pill)',
                    background: correctCount === quizQuestions.length ? '#dcfce7' : '#fef3c7',
                    color: correctCount === quizQuestions.length ? '#15803d' : '#854d0e',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                  }}
                >
                  Score: {correctCount} / {quizQuestions.length}
                </span>
                <button
                  onClick={handleResetQuiz}
                  className="neoclay-btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
                >
                  ↺ Try Again
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="neoclay-btn btn-primary"
                style={{
                  fontSize: '0.9rem',
                  padding: '0.55rem 1.25rem',
                  borderRadius: 'var(--radius-pill)',
                  opacity: Object.keys(selectedAnswers).length === 0 ? 0.6 : 1,
                  cursor: Object.keys(selectedAnswers).length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Check Answers
              </button>
            )}
          </div>

          {/* Quiz Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.85rem' }}>
            {quizQuestions.map((q: QuizQuestion, qIndex: number) => {
              const selectedOptId = selectedAnswers[q.id];
              const isCorrect = selectedOptId === q.correctOptionId;

              return (
                <div
                  key={q.id || `q_${qIndex}`}
                  style={{
                    padding: '1.45rem 1.65rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(248, 250, 252, 0.75)',
                    border: '1.5px solid rgba(226, 232, 240, 0.9)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 1rem 0',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: 'var(--navy-900)',
                      lineHeight: 1.45,
                    }}
                  >
                    <span style={{ color: 'var(--sky-600)', marginRight: '0.5rem' }}>
                      Q{qIndex + 1}.
                    </span>
                    {q.question}
                  </p>

                  {/* Options Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '0.75rem',
                      marginBottom: submitted ? '1rem' : 0,
                    }}
                  >
                    {q.options.map((opt) => {
                      const isSelected = selectedOptId === opt.id;
                      const isThisCorrect = opt.id === q.correctOptionId;

                      let optBg = '#ffffff';
                      let optBorder = 'rgba(203, 213, 225, 0.8)';
                      let optColor = 'var(--navy-800)';

                      if (submitted) {
                        if (isThisCorrect) {
                          optBg = '#dcfce7';
                          optBorder = '#22c55e';
                          optColor = '#15803d';
                        } else if (isSelected && !isThisCorrect) {
                          optBg = '#fee2e2';
                          optBorder = '#ef4444';
                          optColor = '#b91c1c';
                        }
                      } else if (isSelected) {
                        optBg = 'var(--sky-50)';
                        optBorder = 'var(--sky-500)';
                        optColor = 'var(--sky-800)';
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            background: optBg,
                            border: `2px solid ${optBorder}`,
                            color: optColor,
                            fontSize: '0.94rem',
                            fontWeight: isSelected || (submitted && isThisCorrect) ? 700 : 500,
                            textAlign: 'left',
                            cursor: submitted ? 'default' : 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: isSelected ? 'var(--sky-500)' : '#e2e8f0',
                              color: isSelected ? '#ffffff' : 'var(--navy-700)',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              flexShrink: 0,
                            }}
                          >
                            {opt.id}
                          </span>
                          <span style={{ flex: 1 }}>{opt.text}</span>
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
                        background: isCorrect ? '#f0fdf4' : '#fffbeb',
                        borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#f59e0b'}`,
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        color: 'var(--navy-800)',
                      }}
                    >
                      <strong style={{ color: isCorrect ? '#166534' : '#b45309' }}>
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
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0 3rem' }}>
          <button
            onClick={onReset}
            className="neoclay-btn btn-primary"
            style={{
              padding: '0.85rem 2.25rem',
              fontSize: '1.05rem',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            ✨ Learn Another Topic
          </button>
        </div>
      )}
    </article>
  );
};

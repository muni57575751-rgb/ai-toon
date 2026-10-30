import React, { useState } from 'react';
import type { Story, QuizQuestion, KeyPoint, TopicIllustration, QuizOption, QaResponse } from '@ai-toon/shared';
import { CartoonIllustration } from './CartoonIllustration';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, safeJsonParse } from '../../config/api';

interface StoryViewerProps {
  story: Story;
  onReset?: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ story, onReset }) => {
  const { user } = useAuth();

  // Interactive Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Q&A State
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaResult, setQaResult] = useState<QaResponse | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [qaListening, setQaListening] = useState<boolean>(false);

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
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
        },
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

  
  const handleQaVoiceInput = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setQaError('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = story.language === 'te' ? 'te-IN' : story.language === 'hi' ? 'hi-IN' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setQaListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setQaQuestion(transcript);
        }
        setQaListening(false);
      };
      recognition.onerror = () => setQaListening(false);
      recognition.onend = () => setQaListening(false);
      recognition.start();
    } catch {
      setQaListening(false);
    }
  };

  const handleAskQa = async (questionText?: string) => {
    const q = (questionText || qaQuestion).trim();
    if (!q) return;

    setQaLoading(true);
    setQaError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) {
        headers['x-user-id'] = user.id;
        headers['x-user-email'] = user.email || '';
      }

      const res = await fetch(`${API_BASE_URL}/stories/qa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          storyId: story.id,
          topic: story.topic,
          question: q,
        }),
      });

      const parsed = await safeJsonParse(res, 'Failed to get answer from tutor.');
      if (!parsed.ok || !parsed.data?.success) {
        setQaError(parsed.error || parsed.data?.error?.message || 'Failed to get answer from tutor.');
      } else {
        setQaResult(parsed.data.data as QaResponse);
      }
    } catch {
      setQaError('Network error asking tutor.');
    } finally {
      setQaLoading(false);
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
        gap: '2.25rem',
        maxWidth: '960px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* 1. Header Card with Title, Metadata, and Back Button */}
      <header
        className="liquid-glass-card"
        style={{
          padding: '2.5rem 2.75rem',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(221, 242, 255, 0.5) 45%, rgba(234, 228, 255, 0.45) 80%, rgba(255, 228, 239, 0.45) 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
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
            fontSize: '2.25rem',
            fontWeight: 800,
            color: 'var(--liquid-navy-dark)',
            lineHeight: 1.25,
            marginBottom: '1.25rem',
          }}
        >
          {story.title}
        </h1>

        {/* Introduction Callout Inset */}
        <div
          className="liquid-glass-inset"
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            borderLeft: '5px solid var(--accent-cyan)',
            fontSize: '1.05rem',
            lineHeight: 1.68,
            color: 'var(--liquid-navy)',
            fontWeight: 600,
          }}
        >
          {story.introduction || story.summary}
        </div>
      </header>

      {/* 2. Unified Point-Wise Educational Content */}
      <section
        className="liquid-glass-card"
        style={{
          padding: '2.75rem',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 240, 223, 0.3) 25%, rgba(221, 242, 255, 0.45) 60%, rgba(234, 228, 255, 0.45) 100%)',
        }}
      >
        <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ddf2ff 0%, #bae6fd 100%)',
              color: 'var(--accent-cyan-hover)',
              fontWeight: 900,
              fontSize: '1.1rem',
              boxShadow: '0 4px 10px rgba(14, 165, 233, 0.2)',
            }}
          >
            ✓
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.55rem',
              fontWeight: 800,
              color: 'var(--liquid-navy-dark)',
            }}
          >
            Core Concepts & Point-Wise Breakdown
          </h2>
        </div>

        {/* List of Numbered Points with Integrated Visuals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.85rem' }}>
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
                  className="liquid-glass-inset"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1.35rem',
                    padding: '1.5rem 1.65rem',
                    borderRadius: 'var(--radius-lg)',
                    background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(240, 249, 255, 0.65)',
                    border: '1.5px solid rgba(221, 242, 255, 0.85)',
                  }}
                >
                  {/* Number Badge */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      boxShadow: '0 6px 16px rgba(14, 165, 233, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                    }}
                  >
                    {pointNum}
                  </div>

                  {/* Point Content */}
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: '0 0 0.65rem 0',
                        fontSize: '1.22rem',
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
                        paddingLeft: '1.4rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        color: 'var(--liquid-navy)',
                        fontSize: '0.98rem',
                        lineHeight: 1.62,
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
            marginTop: '2.5rem',
            padding: '1.65rem 1.85rem',
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
                fontSize: '1.2rem',
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
              fontSize: '1.02rem',
              lineHeight: 1.65,
              color: '#78350f',
              fontWeight: 600,
            }}
          >
            {story.keyTakeaway || story.keyTakeaways?.[0] || 'Mastering this concept is an essential foundation for deeper academic understanding.'}
          </p>
        </div>
      </section>

      {/* 3. Interactive AI Tutor & Grounded Q&A Section */}
      <section
        className="liquid-glass-card"
        style={{
          padding: '2.5rem',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 232, 255, 0.45) 50%, rgba(224, 242, 254, 0.45) 100%)',
          border: '1.5px solid rgba(168, 85, 247, 0.25)',
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <span className="liquid-badge badge-lavender" style={{ marginBottom: '0.45rem' }}>
            🧑‍🏫 Verified Knowledge & Citations
          </span>
          <h2
            style={{
              margin: '0.35rem 0 0.45rem 0',
              fontSize: '1.55rem',
              fontWeight: 800,
              color: 'var(--liquid-navy-dark)',
            }}
          >
            Ask AI Toon Tutor
          </h2>
          <p style={{ margin: 0, color: 'var(--navy-600)', fontSize: '0.96rem', lineHeight: 1.5 }}>
            Have a question about <strong>{story.topic}</strong>? Ask for an instant explanation with real-world examples and live web sources.
          </p>
        </div>

        {/* Suggested Quick Inquiries */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {[
            `Why does ${story.topic} matter?`,
            `What is a real-world example of ${story.topic}?`,
            `What is the most common misconception?`,
          ].map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => {
                setQaQuestion(promptText);
                handleAskQa(promptText);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid var(--sky-200)',
                borderRadius: '999px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.82rem',
                color: 'var(--navy-700)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              💭 {promptText}
            </button>
          ))}
        </div>

        {/* Question Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQa();
          }}
          style={{
            display: 'flex',
            gap: '0.75rem',
            background: '#ffffff',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            boxShadow: '0 4px 16px rgba(168, 85, 247, 0.08)',
            marginBottom: qaResult || qaLoading || qaError ? '1.5rem' : 0,
          }}
        >
          <input
            type="text"
            value={qaQuestion}
            onChange={(e) => setQaQuestion(e.target.value)}
            placeholder={`Ask a specific question about ${story.topic}...`}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              padding: '0.5rem',
              fontFamily: 'inherit',
              color: 'var(--navy-900)',
            }}
          />
          <button
            type="button"
            onClick={handleQaVoiceInput}
            title={qaListening ? 'Listening... Speak now' : 'Click to ask with your voice'}
            style={{
              background: qaListening ? 'rgba(239, 68, 68, 0.15)' : 'rgba(243, 232, 255, 0.8)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.45rem 0.75rem',
              cursor: 'pointer',
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {qaListening ? '🔴' : '🎙️'}
          </button>
          <button
            type="submit"
            disabled={qaLoading || !qaQuestion.trim()}
            className="btn-neoclay-primary"
            style={{
              padding: '0.55rem 1.35rem',
              fontSize: '0.92rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            }}
          >
            {qaLoading ? 'Consulting Sources...' : 'Ask Tutor 💡'}
          </button>
        </form>

        {/* Loading */}
        {qaLoading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--navy-600)' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid rgba(168, 85, 247, 0.2)',
                borderTopColor: '#8b5cf6',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 0.75rem auto',
              }}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Grounding answer with verified facts & web references...
            </span>
          </div>
        )}

        {/* Error */}
        {qaError && (
          <div
            style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.15rem',
              color: '#991b1b',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>⚠️</span> {qaError}
          </div>
        )}

        {/* Grounded Tutor Answer Card */}
        {qaResult && !qaLoading && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid rgba(168, 85, 247, 0.25)',
              padding: '1.75rem',
              boxShadow: '0 6px 20px rgba(168, 85, 247, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Direct Answer */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🎯</span>
                <span style={{ fontWeight: 800, color: '#581c87', fontSize: '0.95rem' }}>Direct Answer</span>
              </div>
              <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--navy-900)', fontWeight: 600, lineHeight: 1.55 }}>
                {qaResult.directAnswer}
              </p>
            </div>

            {/* Detailed Explanation */}
            <div style={{ background: 'rgba(243, 232, 255, 0.4)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.1rem' }}>📖</span>
                <span style={{ fontWeight: 800, color: '#6b21a8', fontSize: '0.92rem' }}>Detailed Explanation</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--navy-800)', lineHeight: 1.6 }}>
                {qaResult.explanation}
              </p>
            </div>

            {/* Real World Example */}
            {qaResult.realWorldExample && (
              <div style={{ background: 'rgba(224, 242, 254, 0.4)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>💡</span>
                  <span style={{ fontWeight: 800, color: 'var(--sky-900)', fontSize: '0.92rem' }}>Real-World Example</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--navy-800)', lineHeight: 1.6 }}>
                  {qaResult.realWorldExample}
                </p>
              </div>
            )}

            {/* Verified Sources & Citations */}
            {qaResult.sources && qaResult.sources.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '1rem' }}>🔗</span>
                  <span style={{ fontWeight: 800, color: 'var(--navy-700)', fontSize: '0.88rem' }}>
                    Verified Citations & Academic References
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {qaResult.sources.map((src, sIdx) => (
                    <div
                      key={`${src.url}-${sIdx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.5rem',
                        fontSize: '0.88rem',
                      }}
                    >
                      <span style={{ color: 'var(--sky-600)', fontWeight: 700 }}>[{sIdx + 1}]</span>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--sky-700)',
                          textDecoration: 'none',
                          fontWeight: 700,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        {src.title} ({src.domain}) ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Interactive Quiz Section */}
      {quizQuestions.length > 0 && (
        <section
          className="liquid-glass-card"
          style={{
            padding: '2.75rem',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.94) 0%, rgba(234, 228, 255, 0.45) 50%, rgba(221, 242, 255, 0.45) 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.85rem',
            }}
          >
            <div>
              <span className="liquid-badge badge-lavender" style={{ marginBottom: '0.45rem' }}>
                Knowledge Check
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.55rem',
                  fontWeight: 800,
                  color: 'var(--liquid-navy-dark)',
                }}
              >
                Quick Quiz ({quizQuestions.length} Questions)
              </h2>
            </div>

            {submitted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span
                  style={{
                    padding: '0.55rem 1.15rem',
                    borderRadius: 'var(--radius-pill)',
                    background: correctCount === quizQuestions.length ? 'rgba(209, 250, 229, 0.95)' : 'rgba(254, 243, 199, 0.95)',
                    color: correctCount === quizQuestions.length ? '#065f46' : '#92400e',
                    border: correctCount === quizQuestions.length ? '1.5px solid #34d399' : '1.5px solid #fbbf24',
                    fontWeight: 800,
                    fontSize: '1rem',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {quizQuestions.map((q: QuizQuestion, qIndex: number) => {
              const selectedOptId = selectedAnswers[q.id];
              const isCorrect = selectedOptId === q.correctOptionId;

              return (
                <div
                  key={q.id || `q_${qIndex}`}
                  className="liquid-glass-inset"
                  style={{
                    padding: '1.6rem 1.75rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(255, 255, 255, 0.85)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 1.15rem 0',
                      fontSize: '1.1rem',
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
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '0.85rem',
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
                            padding: '0.85rem 1.15rem',
                            borderRadius: 'var(--radius-md)',
                            background: optBg,
                            border: optBorder,
                            color: optColor,
                            fontSize: '0.96rem',
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
                          <span style={{ flex: 1 }}>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation card after submit */}
                  {submitted && (
                    <div
                      style={{
                        padding: '0.95rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: isCorrect ? 'rgba(209, 250, 229, 0.9)' : 'rgba(255, 240, 223, 0.9)',
                        borderLeft: `4px solid ${isCorrect ? '#10b981' : '#f59e0b'}`,
                        fontSize: '0.92rem',
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
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0 3rem' }}>
          <button
            onClick={onReset}
            className="btn-liquid-primary"
            style={{
              padding: '0.95rem 2.5rem',
              fontSize: '1.05rem',
            }}
          >
            ✨ Learn Another Topic
          </button>
        </div>
      )}
    </article>
  );
};

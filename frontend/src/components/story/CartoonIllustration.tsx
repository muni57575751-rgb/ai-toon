import React from 'react';

interface CartoonIllustrationProps {
  keyword?: string;
  visualDescription: string;
  order: number;
}

export const CartoonIllustration: React.FC<CartoonIllustrationProps> = ({
  keyword = '',
  visualDescription,
  order,
}) => {
  const normKey = keyword.toLowerCase();

  // Determine illustration theme based on keyword or visual description
  let bgGradient = 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)';
  let primaryEmoji = '🎨';
  let secondaryEmoji = '✨';
  let accentColor = 'rgba(14, 165, 233, 0.3)';

  if (normKey.includes('leaf') || normKey.includes('photo') || normKey.includes('plant') || normKey.includes('root')) {
    bgGradient = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #86efac 100%)';
    primaryEmoji = order % 2 === 0 ? '🌿' : '🍃';
    secondaryEmoji = order === 1 ? '☀️' : order === 2 ? '💧' : order === 3 ? '🫧' : '🍬';
    accentColor = 'rgba(34, 197, 94, 0.35)';
  } else if (normKey.includes('solar') || normKey.includes('space') || normKey.includes('planet') || normKey.includes('rocket')) {
    bgGradient = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)';
    primaryEmoji = order === 1 ? '☀️' : order === 2 ? '🌍' : order === 3 ? '🪐' : '🚀';
    secondaryEmoji = '⭐';
    accentColor = 'rgba(99, 102, 241, 0.45)';
  } else if (normKey.includes('water') || normKey.includes('cloud') || normKey.includes('rain') || normKey.includes('cycle')) {
    bgGradient = 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 60%, #38bdf8 100%)';
    primaryEmoji = order === 1 ? '💧' : order === 2 ? '☁️' : order === 3 ? '🌧️' : '🌈';
    secondaryEmoji = '🌊';
    accentColor = 'rgba(14, 165, 233, 0.4)';
  } else {
    // General / custom topic
    const emojis = ['💡', '🔬', '🧠', '⚡', '🌟', '📚', '🧪'];
    primaryEmoji = emojis[(order - 1) % emojis.length];
    secondaryEmoji = '✨';
    bgGradient = 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 60%, #fdba74 100%)';
    accentColor = 'rgba(245, 158, 11, 0.35)';
  }

  const isDarkBg = normKey.includes('solar') || normKey.includes('space');

  return (
    <div style={{
      width: '100%',
      minHeight: '220px',
      borderRadius: 'var(--radius-lg)',
      background: bgGradient,
      border: '2px solid rgba(255, 255, 255, 0.85)',
      boxShadow: `0 12px 24px ${accentColor}, inset 2.5px 2.5px 6px rgba(255, 255, 255, 0.85), inset -2.5px -2.5px 8px rgba(0, 0, 0, 0.1)`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.25rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative cartoon backdrop bubbles */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.25)',
        pointerEvents: 'none',
      }} />

      {/* Top Banner Tag */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 2,
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.8rem',
          fontWeight: 800,
          background: 'rgba(255, 255, 255, 0.9)',
          color: 'var(--navy-900)',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-pill)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
        }}>
          Scene #{order} Illustration
        </span>

        <span style={{ fontSize: '1.4rem' }}>{secondaryEmoji}</span>
      </div>

      {/* Main Animated Cartoon Emoji Totem */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0.75rem 0',
        zIndex: 2,
      }}>
        <div style={{
          fontSize: '4.2rem',
          filter: 'drop-shadow(0 8px 12px rgba(0, 0, 0, 0.15))',
          animation: 'bounce 3s ease-in-out infinite',
        }}>
          {primaryEmoji}
        </div>
      </div>

      {/* Cartoon Scene Visual Description Box */}
      <div style={{
        background: isDarkBg ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.65rem 0.95rem',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.06)',
        zIndex: 2,
      }}>
        <p style={{
          fontSize: '0.82rem',
          color: isDarkBg ? '#e2e8f0' : 'var(--navy-800)',
          margin: 0,
          lineHeight: 1.45,
          fontStyle: 'italic',
        }}>
          🎨 <strong>Cartoon Scene:</strong> {visualDescription}
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-6px) scale(1.05); }
        }
      `}</style>
    </div>
  );
};

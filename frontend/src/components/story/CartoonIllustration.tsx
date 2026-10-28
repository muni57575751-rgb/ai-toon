import React, { useState } from 'react';

interface CartoonIllustrationProps {
  keyword?: string;
  title?: string;
  caption?: string;
  description?: string;
  figureNumber?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  sourcePageUrl?: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
  attribution?: string;
  width?: number;
  height?: number;
  sourceType?: 'wikimedia' | 'openverse' | 'svg_fallback';
}

export const CartoonIllustration: React.FC<CartoonIllustrationProps> = ({
  keyword = '',
  title,
  caption,
  description,
  figureNumber = 1,
  imageUrl,
  thumbnailUrl,
  sourcePageUrl,
  author,
  license,
  licenseUrl,
  attribution,
  sourceType,
}) => {
  const [imageError, setImageError] = useState(false);
  const normKey = (keyword + ' ' + (description || '') + ' ' + (title || '')).toLowerCase();

  const renderSvgArtwork = () => {
    // 1. Earthquakes / Tectonic Plates / Seismic Waves
    if (
      normKey.includes('earthquake') ||
      normKey.includes('tectonic') ||
      normKey.includes('fault') ||
      normKey.includes('seismic') ||
      normKey.includes('tremor')
    ) {
      return (
        <svg viewBox="0 0 760 320" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Tectonic plate fault line and seismic waves diagram">
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id="crustGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#854d0e" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <linearGradient id="crustGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a16207" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <linearGradient id="mantleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <radialGradient id="focusGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Sky background */}
          <rect x="0" y="0" width="760" height="90" fill="url(#skyGrad)" rx="12" />

          {/* Surface hills and grass */}
          <path d="M 0,90 Q 180,75 360,90 Q 540,105 760,90 L 760,110 L 0,110 Z" fill="#22c55e" />

          {/* Surface houses and trees */}
          <polygon points="120,70 140,50 160,70" fill="#ef4444" />
          <rect x="128" y="70" width="24" height="20" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="136" y="78" width="8" height="12" fill="#3b82f6" />
          <circle cx="210" cy="65" r="14" fill="#15803d" />
          <rect x="207" y="78" width="6" height="12" fill="#78350f" />

          <polygon points="600,68 620,48 640,68" fill="#f59e0b" />
          <rect x="608" y="68" width="24" height="22" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="560" cy="66" r="12" fill="#16a34a" />
          <rect x="557" y="78" width="6" height="12" fill="#78350f" />

          {/* Left Tectonic Plate */}
          <polygon points="0,110 370,110 350,170 380,240 360,320 0,320" fill="url(#crustGrad1)" />

          {/* Right Tectonic Plate */}
          <polygon points="370,110 760,110 760,320 360,320 380,240 350,170" fill="url(#crustGrad2)" />

          {/* Earth strata lines */}
          <path d="M 0,180 L 352,175 M 378,175 L 760,180" stroke="#fde047" strokeWidth="3" strokeDasharray="6,4" opacity="0.6" />
          <path d="M 0,250 L 378,245 M 372,245 L 760,250" stroke="#fbbf24" strokeWidth="4" opacity="0.5" />

          {/* Jagged Fault Line */}
          <path d="M 370,105 L 348,168 L 382,238 L 360,320" stroke="#ef4444" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M 370,105 L 348,168 L 382,238 L 360,320" stroke="#fef08a" strokeWidth="2" fill="none" strokeDasharray="8,4" />

          {/* Concentric Seismic Shockwaves */}
          <circle cx="365" cy="205" r="30" stroke="#ef4444" strokeWidth="2.5" fill="none" opacity="0.8" />
          <circle cx="365" cy="205" r="60" stroke="#f97316" strokeWidth="2.5" fill="none" opacity="0.7" strokeDasharray="5,4" />
          <circle cx="365" cy="205" r="95" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.6" strokeDasharray="7,5" />
          <circle cx="365" cy="205" r="135" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.4" strokeDasharray="9,6" />

          {/* Hypocenter Glowing Energy Core */}
          <circle cx="365" cy="205" r="22" fill="url(#focusGlow)" />
          <circle cx="365" cy="205" r="7" fill="#ffffff" />

          {/* Plate Motion Arrows */}
          <path d="M 230,140 L 290,140 M 280,132 L 295,140 L 280,148" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 530,140 L 470,140 M 480,132 L 465,140 L 480,148" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Educational Labels */}
          <rect x="20" y="125" width="155" height="30" rx="8" fill="rgba(15, 23, 42, 0.85)" />
          <text x="28" y="145" fill="#f8fafc" fontSize="13" fontWeight="bold">Tectonic Plate A ➔</text>

          <rect x="585" y="125" width="155" height="30" rx="8" fill="rgba(15, 23, 42, 0.85)" />
          <text x="593" y="145" fill="#f8fafc" fontSize="13" fontWeight="bold">⬅ Tectonic Plate B</text>

          <rect x="300" y="260" width="140" height="32" rx="8" fill="#b91c1c" stroke="#fef08a" strokeWidth="1.5" />
          <text x="312" y="281" fill="#ffffff" fontSize="12" fontWeight="bold">⚡ Hypocenter (Focus)</text>

          <rect x="310" y="30" width="120" height="28" rx="8" fill="#0369a1" />
          <text x="322" y="49" fill="#ffffff" fontSize="12" fontWeight="bold">📍 Epicenter</text>
          <line x1="370" y1="60" x2="370" y2="105" stroke="#0369a1" strokeWidth="2.5" strokeDasharray="3,3" />
        </svg>
      );
    }

    // 2. Photosynthesis / Plants / Leaves
    if (
      normKey.includes('photo') ||
      normKey.includes('leaf') ||
      normKey.includes('plant') ||
      normKey.includes('chlorophyll') ||
      normKey.includes('glucose')
    ) {
      return (
        <svg viewBox="0 0 760 300" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Photosynthesis process diagram inside leaf">
          <defs>
            <linearGradient id="photoSky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="760" height="300" fill="url(#photoSky)" rx="12" />

          {/* Smiling Sun with Rays */}
          <circle cx="100" cy="80" r="45" fill="#facc15" stroke="#f59e0b" strokeWidth="3" />
          <circle cx="100" cy="80" r="35" fill="#fef08a" />
          <circle cx="88" cy="74" r="4" fill="#854d0e" />
          <circle cx="112" cy="74" r="4" fill="#854d0e" />
          <path d="M 90,88 Q 100,98 110,88" stroke="#854d0e" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Sunbeams traveling to leaf */}
          <line x1="150" y1="100" x2="310" y2="160" stroke="#eab308" strokeWidth="4" strokeDasharray="8,4" />
          <line x1="160" y1="120" x2="315" y2="185" stroke="#f59e0b" strokeWidth="4" strokeDasharray="8,4" />

          {/* Large Stylized Leaf (Cell Cross-Section) */}
          <path d="M 280,180 C 280,90 490,90 600,180 C 490,270 280,270 280,180 Z" fill="url(#leafGrad)" stroke="#166534" strokeWidth="5" />
          <path d="M 280,180 L 600,180" stroke="#bbf7d0" strokeWidth="4" />
          <path d="M 370,180 Q 420,135 470,120 M 370,180 Q 420,225 470,240" stroke="#bbf7d0" strokeWidth="2.5" />
          <path d="M 450,180 Q 490,145 530,140 M 450,180 Q 490,215 530,220" stroke="#bbf7d0" strokeWidth="2.5" />

          {/* Microscopic Chloroplast Factories */}
          <g transform="translate(360, 135)">
            <ellipse cx="25" cy="18" rx="20" ry="14" fill="#14532d" stroke="#86efac" strokeWidth="2" />
            <rect x="15" y="10" width="20" height="4" rx="2" fill="#4ade80" />
            <rect x="15" y="16" width="20" height="4" rx="2" fill="#4ade80" />
            <rect x="15" y="22" width="20" height="4" rx="2" fill="#4ade80" />
          </g>
          <g transform="translate(480, 185)">
            <ellipse cx="25" cy="18" rx="20" ry="14" fill="#14532d" stroke="#86efac" strokeWidth="2" />
            <rect x="15" y="10" width="20" height="4" rx="2" fill="#4ade80" />
            <rect x="15" y="16" width="20" height="4" rx="2" fill="#4ade80" />
          </g>

          {/* Incoming Inputs */}
          <g transform="translate(40, 210)">
            <rect width="180" height="42" rx="10" fill="#0284c7" />
            <text x="14" y="26" fill="#ffffff" fontSize="13" fontWeight="bold">💧 Water (H₂O) from Roots</text>
          </g>
          <path d="M 225,230 L 275,200" stroke="#0284c7" strokeWidth="3" strokeDasharray="5,3" markerEnd="url(#arrow)" />

          <g transform="translate(310, 20)">
            <rect width="190" height="40" rx="10" fill="#7c3aed" />
            <text x="12" y="25" fill="#ffffff" fontSize="13" fontWeight="bold">🫧 CO₂ from Air (Stomata)</text>
          </g>
          <path d="M 400,62 L 400,105" stroke="#7c3aed" strokeWidth="3" strokeDasharray="5,3" />

          {/* Outgoing Products */}
          <g transform="translate(560, 70)">
            <rect width="175" height="42" rx="10" fill="#16a34a" />
            <text x="14" y="26" fill="#ffffff" fontSize="13" fontWeight="bold">🍬 Glucose Sugar (Food)</text>
          </g>
          <path d="M 550,150 L 590,115" stroke="#16a34a" strokeWidth="3" />

          <g transform="translate(560, 230)">
            <rect width="175" height="42" rx="10" fill="#0ea5e9" />
            <text x="14" y="26" fill="#ffffff" fontSize="13" fontWeight="bold">🎈 Oxygen (O₂) Released</text>
          </g>
          <path d="M 550,210 L 590,230" stroke="#0ea5e9" strokeWidth="3" />
        </svg>
      );
    }

    // 3. Solar System / Astronomy / Space / Planets
    if (
      normKey.includes('solar') ||
      normKey.includes('space') ||
      normKey.includes('planet') ||
      normKey.includes('orbit') ||
      normKey.includes('sun') ||
      normKey.includes('jupiter') ||
      normKey.includes('saturn')
    ) {
      return (
        <svg viewBox="0 0 760 300" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Solar system planets and orbits diagram">
          <rect x="0" y="0" width="760" height="300" fill="#090d16" rx="12" />

          {/* Stars in Deep Space */}
          <g fill="#ffffff" opacity="0.75">
            <circle cx="45" cy="35" r="1.5" />
            <circle cx="160" cy="40" r="1" />
            <circle cx="280" cy="25" r="2" />
            <circle cx="390" cy="55" r="1.5" />
            <circle cx="510" cy="30" r="1" />
            <circle cx="680" cy="45" r="2" />
            <circle cx="90" cy="270" r="1.5" />
            <circle cx="230" cy="285" r="1" />
            <circle cx="460" cy="280" r="2" />
            <circle cx="620" cy="265" r="1" />
            <circle cx="720" cy="280" r="2" />
          </g>

          {/* Central Sun Cutout on Left */}
          <circle cx="0" cy="150" r="110" fill="#f97316" />
          <circle cx="0" cy="150" r="95" fill="#facc15" />
          <circle cx="0" cy="150" r="80" fill="#fef08a" />
          <text x="18" y="155" fill="#78350f" fontSize="14" fontWeight="bold">THE SUN</text>

          {/* Elliptical Orbital Lines */}
          <ellipse cx="0" cy="150" rx="160" ry="110" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />
          <ellipse cx="0" cy="150" rx="220" ry="125" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />
          <ellipse cx="0" cy="150" rx="290" ry="140" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />
          <ellipse cx="0" cy="150" rx="360" ry="155" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />
          <ellipse cx="0" cy="150" rx="480" ry="170" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />
          <ellipse cx="0" cy="150" rx="600" ry="185" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />
          <ellipse cx="0" cy="150" rx="710" ry="195" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />

          {/* Inner Planets */}
          {/* Mercury */}
          <circle cx="160" cy="140" r="7" fill="#94a3b8" />
          <text x="145" y="165" fill="#cbd5e1" fontSize="10">Mercury</text>

          {/* Venus */}
          <circle cx="218" cy="120" r="11" fill="#fdba74" />
          <text x="206" y="145" fill="#cbd5e1" fontSize="10">Venus</text>

          {/* Earth & Moon */}
          <circle cx="285" cy="170" r="14" fill="#38bdf8" />
          <path d="M 280,165 Q 290,168 292,176" stroke="#22c55e" strokeWidth="4" fill="none" />
          <circle cx="304" cy="162" r="3" fill="#f1f5f9" />
          <text x="272" y="196" fill="#38bdf8" fontSize="11" fontWeight="bold">Earth</text>

          {/* Mars */}
          <circle cx="355" cy="125" r="10" fill="#ef4444" />
          <text x="344" y="150" fill="#cbd5e1" fontSize="10">Mars</text>

          {/* Asteroid Belt */}
          <g fill="#94a3b8" opacity="0.6">
            <circle cx="410" cy="80" r="2.5" />
            <circle cx="415" cy="115" r="3" />
            <circle cx="408" cy="150" r="2" />
            <circle cx="418" cy="185" r="3.5" />
            <circle cx="412" cy="220" r="2.5" />
          </g>

          {/* Jupiter */}
          <circle cx="480" cy="160" r="28" fill="#d97706" />
          <ellipse cx="480" cy="155" rx="26" ry="6" fill="#fef3c7" opacity="0.8" />
          <ellipse cx="480" cy="168" rx="27" ry="5" fill="#b45309" opacity="0.8" />
          <circle cx="492" cy="168" r="5" fill="#dc2626" />
          <text x="462" y="202" fill="#fde68a" fontSize="12" fontWeight="bold">Jupiter</text>

          {/* Saturn */}
          <g transform="translate(600, 130)">
            <ellipse cx="0" cy="0" rx="36" ry="9" fill="none" stroke="#fef08a" strokeWidth="5" transform="rotate(-18)" opacity="0.9" />
            <circle cx="0" cy="0" r="20" fill="#eab308" />
            <ellipse cx="0" cy="0" rx="36" ry="9" fill="none" stroke="#fde047" strokeWidth="2.5" transform="rotate(-18)" />
          </g>
          <text x="583" y="172" fill="#fef08a" fontSize="11" fontWeight="bold">Saturn</text>

          {/* Uranus & Neptune */}
          <circle cx="690" cy="110" r="14" fill="#2dd4bf" />
          <text x="672" y="138" fill="#99f6e4" fontSize="10">Uranus</text>

          <circle cx="735" cy="180" r="13" fill="#2563eb" />
          <text x="712" y="205" fill="#93c5fd" fontSize="10">Neptune</text>

          {/* Division label */}
          <rect x="365" y="255" width="370" height="32" rx="8" fill="rgba(30, 41, 59, 0.85)" stroke="#475569" strokeWidth="1" />
          <text x="378" y="276" fill="#f8fafc" fontSize="11.5">🪐 Rocky Terrestrial Inner Planets ➔ Massive Outer Gas Giants</text>
        </svg>
      );
    }

    // 4. Water Cycle / Weather / Oceans / Rain
    if (
      normKey.includes('water') ||
      normKey.includes('rain') ||
      normKey.includes('cloud') ||
      normKey.includes('evaporat') ||
      normKey.includes('condens') ||
      normKey.includes('precipitat') ||
      normKey.includes('cycle')
    ) {
      return (
        <svg viewBox="0 0 760 300" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Earth water cycle process diagram">
          <defs>
            <linearGradient id="waterSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="760" height="300" fill="url(#waterSky)" rx="12" />

          {/* Warm Sun in Upper Right */}
          <circle cx="680" cy="50" r="35" fill="#facc15" stroke="#f59e0b" strokeWidth="3" />
          <circle cx="680" cy="50" r="28" fill="#fef08a" />

          {/* Mountain on Left */}
          <polygon points="0,300 160,110 320,300" fill="#64748b" />
          <polygon points="125,155 160,110 195,155" fill="#f8fafc" />
          <polygon points="140,300 240,160 380,300" fill="#475569" />
          <polygon points="215,195 240,160 265,195" fill="#f8fafc" />

          {/* Green Foothills */}
          <path d="M 260,300 Q 380,240 500,280 L 500,300 Z" fill="#22c55e" />

          {/* Ocean Water Basin */}
          <path d="M 460,250 C 540,240 640,245 760,240 L 760,300 L 460,300 Z" fill="url(#oceanGrad)" />
          <path d="M 460,250 C 520,245 600,255 760,245" stroke="#7dd3fc" strokeWidth="3" fill="none" />

          {/* River Runoff flowing down mountain into ocean */}
          <path d="M 195,200 Q 280,240 470,255" stroke="#38bdf8" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 195,200 Q 280,240 470,255" stroke="#ffffff" strokeWidth="3" strokeDasharray="8,6" fill="none" />

          {/* Fluffy Clouds (Condensation) */}
          <g fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2">
            <circle cx="240" cy="65" r="28" />
            <circle cx="275" cy="55" r="34" />
            <circle cx="315" cy="65" r="26" />
            <rect x="235" y="70" width="85" height="22" rx="10" stroke="none" />
          </g>
          <g fill="#94a3b8" stroke="#64748b" strokeWidth="1.5">
            <circle cx="120" cy="75" r="24" />
            <circle cx="150" cy="65" r="30" />
            <circle cx="180" cy="75" r="22" />
            <rect x="115" y="75" width="70" height="20" rx="10" stroke="none" />
          </g>

          {/* Precipitation Raindrops falling */}
          <g stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round">
            <line x1="120" y1="110" x2="110" y2="135" />
            <line x1="145" y1="115" x2="135" y2="140" />
            <line x1="170" y1="110" x2="160" y2="135" />
            <line x1="130" y1="145" x2="120" y2="170" />
            <line x1="155" y1="150" x2="145" y2="175" />
          </g>

          {/* Evaporation Waves rising from Ocean */}
          <path d="M 580,230 Q 590,200 580,170 Q 570,140 580,110" stroke="#f59e0b" strokeWidth="3.5" fill="none" strokeDasharray="6,4" />
          <path d="M 640,230 Q 650,200 640,170 Q 630,140 640,110" stroke="#f59e0b" strokeWidth="3.5" fill="none" strokeDasharray="6,4" />
          <path d="M 700,230 Q 710,200 700,170 Q 690,140 700,110" stroke="#f59e0b" strokeWidth="3.5" fill="none" strokeDasharray="6,4" />

          {/* Educational Callout Tags */}
          <rect x="560" y="115" width="165" height="28" rx="6" fill="#ea580c" />
          <text x="572" y="134" fill="#ffffff" fontSize="12" fontWeight="bold">1. Evaporation ⬆</text>

          <rect x="235" y="10" width="165" height="28" rx="6" fill="#2563eb" />
          <text x="247" y="29" fill="#ffffff" fontSize="12" fontWeight="bold">2. Condensation ☁</text>

          <rect x="60" y="185" width="160" height="28" rx="6" fill="#0284c7" />
          <text x="70" y="204" fill="#ffffff" fontSize="12" fontWeight="bold">3. Precipitation 🌧</text>

          <rect x="330" y="260" width="160" height="28" rx="6" fill="#15803d" />
          <text x="342" y="279" fill="#ffffff" fontSize="12" fontWeight="bold">4. Collection / Runoff 🌊</text>
        </svg>
      );
    }

    // 5. Default General Educational Illustration Unavailable State
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          background: '#f8fafc',
          width: '100%',
          minHeight: '180px',
        }}
      >
        <span style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>🖼️</span>
        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', color: 'var(--navy-900)', fontWeight: 700 }}>
          Educational Diagram Unavailable
        </h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--navy-600)', maxWidth: '440px', lineHeight: 1.5 }}>
          No verified public domain diagram is available for this concept. Please refer to the concept guide below.
        </p>
      </div>
    );
  };

  return (
    <div
      className="neoclay-card"
      style={{
        margin: '2rem 0',
        padding: '1.25rem',
        borderRadius: 'var(--radius-xl)',
        background: '#ffffff',
        border: '2px solid rgba(14, 165, 233, 0.25)',
        boxShadow: '0 16px 32px rgba(15, 43, 72, 0.08), inset 2px 2px 4px rgba(255, 255, 255, 0.9)',
        overflow: 'hidden',
      }}
    >
      {/* Figure Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span
            className="neoclay-badge badge-sky"
            style={{
              fontWeight: 800,
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Figure {figureNumber}
          </span>
          <h4
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 800,
              color: 'var(--navy-900)',
            }}
          >
            {title || 'Concept Illustration'}
          </h4>
        </div>

        {imageUrl && !imageError ? (
          <span className="neoclay-badge badge-mint" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', fontWeight: 700 }}>
            ✓ Verified Public Diagram
          </span>
        ) : (
          <span className="neoclay-badge badge-sky" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', fontWeight: 700 }}>
            Topic Diagram
          </span>
        )}
      </div>

      {/* Visual Display (Public Image or SVG Fallback) */}
      <div
        style={{
          width: '100%',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f8fafc',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          padding: imageUrl && !imageError ? '0.75rem' : '0',
        }}
      >
        {imageUrl && !imageError ? (
          <img
            src={thumbnailUrl || imageUrl}
            alt={title ? `${title} - educational diagram` : 'Educational concept diagram'}
            loading="lazy"
            onError={() => setImageError(true)}
            style={{
              maxWidth: '100%',
              maxHeight: '440px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(15, 43, 72, 0.06)',
            }}
          />
        ) : (
          renderSvgArtwork()
        )}
      </div>

      {/* Educational Caption & Source Attribution */}
      <div
        style={{
          marginTop: '0.85rem',
          padding: '0.95rem 1.15rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(240, 249, 255, 0.75)',
          borderLeft: '4px solid var(--sky-500)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        <div style={{ fontSize: '0.92rem', color: 'var(--navy-800)', lineHeight: 1.55 }}>
          <strong>Concept Guide: </strong>
          {caption || description || 'Detailed diagram illustrating the educational concept.'}
        </div>

        {/* Source and License Attribution */}
        {imageUrl && !imageError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
              paddingTop: '0.55rem',
              borderTop: '1px solid rgba(14, 165, 233, 0.2)',
              fontSize: '0.78rem',
              color: 'var(--navy-600)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span>📷 <strong>Source:</strong></span>
              {sourcePageUrl ? (
                <a
                  href={sourcePageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--sky-700)', textDecoration: 'underline', fontWeight: 600 }}
                  title="View original image on Wikimedia Commons"
                >
                  {sourceType === 'wikimedia' ? 'Wikimedia Commons ↗' : 'Public Media ↗'}
                </a>
              ) : (
                <span>{sourceType === 'wikimedia' ? 'Wikimedia Commons' : 'Public Media'}</span>
              )}
              {author && <span>• <strong>Author:</strong> {author}</span>}
              {attribution && attribution !== author && <span>• <strong>Credit:</strong> {attribution}</span>}
            </div>

            {license && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="neoclay-badge badge-sky" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                  {licenseUrl ? (
                    <a
                      href={licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      title="View license details"
                    >
                      ⚖️ {license} ↗
                    </a>
                  ) : (
                    <span>⚖️ {license}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

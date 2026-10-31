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
  sourceType?: 'wikimedia' | 'openverse' | 'wikipedia' | 'svg_fallback';
  alternativeUrls?: string[];
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
  alternativeUrls = [],
}) => {
  // Candidate fallback list: primary image first, followed by alternative candidate URLs
  const candidateUrls: string[] = [];
  const primaryUrl = thumbnailUrl || imageUrl;
  if (primaryUrl) {
    candidateUrls.push(primaryUrl);
  }
  if (Array.isArray(alternativeUrls)) {
    for (const alt of alternativeUrls) {
      if (alt && !candidateUrls.includes(alt)) {
        candidateUrls.push(alt);
      }
    }
  }

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [allImagesFailed, setAllImagesFailed] = useState(candidateUrls.length === 0);

  const currentUrl = !allImagesFailed && candidateIndex < candidateUrls.length ? candidateUrls[candidateIndex] : null;

  const handleImageError = () => {
    const nextIndex = candidateIndex + 1;
    if (nextIndex < candidateUrls.length) {
      console.warn(`[CartoonIllustration] Image failed to load, attempting candidate ${nextIndex + 1}/${candidateUrls.length}`);
      setCandidateIndex(nextIndex);
    } else {
      console.warn('[CartoonIllustration] All candidate image URLs failed to load. Switching to educational SVG diagram.');
      setAllImagesFailed(true);
    }
  };

  const normKey = (keyword + ' ' + (description || '') + ' ' + (title || '') + ' ' + (caption || '')).toLowerCase();

  const renderSvgArtwork = () => {
    // 1. Binary Search / Search Algorithms / Sorted Arrays
    if (
      normKey.includes('binary search') ||
      normKey.includes('binary') ||
      (normKey.includes('search') && normKey.includes('array'))
    ) {
      return (
        <svg viewBox="0 0 760 320" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Binary search algorithm sorted array diagram">
          <defs>
            <linearGradient id="binBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id="matchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
            <linearGradient id="midGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="760" height="320" fill="url(#binBg)" rx="12" />

          {/* Title Header inside SVG */}
          <text x="380" y="38" textAnchor="middle" fill="#0f172a" fontSize="16" fontWeight="bold">
            Binary Search: Halving the Search Space in a Sorted Array
          </text>
          <text x="380" y="60" textAnchor="middle" fill="#0369a1" fontSize="13" fontWeight="600">
            Target Value = 23 (Search range cut in half each step: O(log n))
          </text>

          {/* Sorted Array Elements */}
          {/* Index 0: 2 */}
          <g transform="translate(60, 100)">
            <rect width="80" height="65" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
            <text x="40" y="42" textAnchor="middle" fill="#64748b" fontSize="22" fontWeight="bold">2</text>
            <text x="40" y="85" textAnchor="middle" fill="#94a3b8" fontSize="12">[0] low</text>
            <path d="M 40,88 L 40,70" stroke="#0284c7" strokeWidth="2.5" markerEnd="url(#arrow)" />
          </g>

          {/* Index 1: 5 */}
          <g transform="translate(150, 100)">
            <rect width="80" height="65" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
            <text x="40" y="42" textAnchor="middle" fill="#64748b" fontSize="22" fontWeight="bold">5</text>
            <text x="40" y="85" textAnchor="middle" fill="#94a3b8" fontSize="12">[1]</text>
          </g>

          {/* Index 2: 8 */}
          <g transform="translate(240, 100)">
            <rect width="80" height="65" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
            <text x="40" y="42" textAnchor="middle" fill="#64748b" fontSize="22" fontWeight="bold">8</text>
            <text x="40" y="85" textAnchor="middle" fill="#94a3b8" fontSize="12">[2]</text>
          </g>

          {/* Index 3: 12 (Middle Element in Step 1) */}
          <g transform="translate(330, 100)">
            <rect width="80" height="65" rx="8" fill="url(#midGrad)" stroke="#0369a1" strokeWidth="2.5" />
            <text x="40" y="42" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="bold">12</text>
            <text x="40" y="85" textAnchor="middle" fill="#0369a1" fontSize="13" fontWeight="bold">[3] mid</text>
            <path d="M 40,88 L 40,70" stroke="#0284c7" strokeWidth="3" />
          </g>

          {/* Index 4: 16 */}
          <g transform="translate(420, 100)">
            <rect width="80" height="65" rx="8" fill="#ffffff" stroke="#38bdf8" strokeWidth="2" />
            <text x="40" y="42" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="bold">16</text>
            <text x="40" y="85" textAnchor="middle" fill="#64748b" fontSize="12">[4]</text>
          </g>

          {/* Index 5: 23 (TARGET MATCH!) */}
          <g transform="translate(510, 100)">
            <rect width="80" height="65" rx="8" fill="url(#matchGrad)" stroke="#166534" strokeWidth="3" />
            <text x="40" y="42" textAnchor="middle" fill="#ffffff" fontSize="24" fontWeight="bold">23</text>
            <text x="40" y="85" textAnchor="middle" fill="#15803d" fontSize="13" fontWeight="bold">🎯 Found!</text>
          </g>

          {/* Index 6: 38 */}
          <g transform="translate(600, 100)">
            <rect width="80" height="65" rx="8" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
            <text x="40" y="42" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="bold">38</text>
            <text x="40" y="85" textAnchor="middle" fill="#0284c7" fontSize="12">[6] high</text>
            <path d="M 40,88 L 40,70" stroke="#0284c7" strokeWidth="2.5" />
          </g>

          {/* Eliminated Left Half Banner */}
          <rect x="60" y="200" width="350" height="40" rx="8" fill="#fee2e2" stroke="#fca5a5" strokeWidth="1.5" />
          <text x="235" y="225" textAnchor="middle" fill="#b91c1c" fontSize="12.5" fontWeight="bold">
            ✖ Left Half (≤ 12) Discarded: 23 &gt; 12
          </text>

          {/* Selected Right Half Search Space */}
          <rect x="420" y="200" width="260" height="40" rx="8" fill="#dcfce7" stroke="#86efac" strokeWidth="1.5" />
          <text x="550" y="225" textAnchor="middle" fill="#166534" fontSize="12.5" fontWeight="bold">
            ✓ Search Right Subarray: [16, 23, 38]
          </text>

          {/* Educational Step Callout */}
          <rect x="60" y="260" width="620" height="42" rx="8" fill="rgba(15, 23, 42, 0.85)" />
          <text x="370" y="286" textAnchor="middle" fill="#f8fafc" fontSize="13">
            💡 <strong>Key Principle:</strong> Compare target to middle element. If target &gt; mid, search right. If target &lt; mid, search left.
          </text>
        </svg>
      );
    }

    // 2. Human Heart / Cardiac Blood Flow / Anatomy
    if (
      normKey.includes('heart') ||
      normKey.includes('cardiac') ||
      normKey.includes('blood flow') ||
      normKey.includes('ventricle') ||
      normKey.includes('atrium') ||
      normKey.includes('aorta')
    ) {
      return (
        <svg viewBox="0 0 760 320" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Human heart 4-chambers and blood flow circulation diagram">
          <defs>
            <linearGradient id="heartBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff1f2" />
              <stop offset="100%" stopColor="#ffe4e6" />
            </linearGradient>
            <linearGradient id="oxygenated" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id="deoxygenated" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="760" height="320" fill="url(#heartBg)" rx="12" />

          {/* Header */}
          <text x="380" y="32" textAnchor="middle" fill="#881337" fontSize="16" fontWeight="bold">
            Human Heart Anatomy &amp; Double Circulation
          </text>

          {/* Blue Side: Right Atrium and Right Ventricle (Deoxygenated from Body) */}
          <g transform="translate(180, 50)">
            {/* Vena Cava input */}
            <path d="M 60,10 L 60,60" stroke="#0284c7" strokeWidth="18" strokeLinecap="round" />
            <text x="10" y="38" fill="#1e3a8a" fontSize="11" fontWeight="bold">Superior Vena Cava ⬇</text>

            {/* Right Atrium */}
            <rect x="30" y="60" width="90" height="75" rx="14" fill="url(#deoxygenated)" />
            <text x="75" y="95" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Right</text>
            <text x="75" y="112" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Atrium</text>

            {/* Tricuspid Valve */}
            <line x1="50" y1="135" x2="100" y2="135" stroke="#fef08a" strokeWidth="4" strokeDasharray="4,2" />

            {/* Right Ventricle */}
            <rect x="20" y="140" width="105" height="95" rx="16" fill="url(#deoxygenated)" />
            <text x="72" y="180" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Right</text>
            <text x="72" y="198" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Ventricle</text>

            {/* Pulmonary Artery to Lungs */}
            <path d="M 72,140 Q 60,90 20,70" stroke="#0284c7" strokeWidth="12" fill="none" strokeLinecap="round" />
            <text x="5" y="248" fill="#1e40af" fontSize="11" fontWeight="bold">➔ To Lungs for Oxygen</text>
          </g>

          {/* Septum Wall */}
          <rect x="375" y="90" width="14" height="170" rx="4" fill="#fda4af" stroke="#f43f5e" strokeWidth="2" />

          {/* Red Side: Left Atrium and Left Ventricle (Oxygenated to Body) */}
          <g transform="translate(410, 50)">
            {/* Pulmonary Veins from Lungs */}
            <path d="M 110,65 L 75,75" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" />
            <text x="115" y="70" fill="#991b1b" fontSize="11" fontWeight="bold">⬅ From Lungs (O₂)</text>

            {/* Left Atrium */}
            <rect x="25" y="60" width="90" height="75" rx="14" fill="url(#oxygenated)" />
            <text x="70" y="95" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Left</text>
            <text x="70" y="112" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Atrium</text>

            {/* Bicuspid / Mitral Valve */}
            <line x1="45" y1="135" x2="95" y2="135" stroke="#fef08a" strokeWidth="4" strokeDasharray="4,2" />

            {/* Left Ventricle (Thick Muscular Wall) */}
            <rect x="15" y="140" width="115" height="100" rx="18" fill="url(#oxygenated)" />
            <text x="72" y="182" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Left</text>
            <text x="72" y="200" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Ventricle</text>

            {/* Aorta Arch to Rest of Body */}
            <path d="M 72,140 Q 90,60 140,25" stroke="#dc2626" strokeWidth="16" fill="none" strokeLinecap="round" />
            <text x="110" y="25" fill="#991b1b" fontSize="12" fontWeight="bold">Aorta ➔ Body</text>
          </g>

          {/* Legend Banner */}
          <g transform="translate(140, 275)">
            <rect width="220" height="32" rx="8" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="1" />
            <circle cx="20" cy="16" r="7" fill="#0284c7" />
            <text x="36" y="21" fill="#1e3a8a" fontSize="12" fontWeight="bold">Deoxygenated Blood (Blue)</text>

            <g transform="translate(260, 0)">
              <rect width="220" height="32" rx="8" fill="#fee2e2" stroke="#fecaca" strokeWidth="1" />
              <circle cx="20" cy="16" r="7" fill="#ef4444" />
              <text x="36" y="21" fill="#991b1b" fontSize="12" fontWeight="bold">Oxygenated Blood (Red)</text>
            </g>
          </g>
        </svg>
      );
    }

    // 3. Artificial Intelligence / Neural Networks / Machine Learning
    if (
      normKey.includes('artificial intelligence') ||
      normKey.includes('neural') ||
      normKey.includes('machine learning') ||
      normKey.includes('deep learning') ||
      normKey.includes('ai')
    ) {
      return (
        <svg viewBox="0 0 760 300" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Artificial intelligence neural network architecture diagram">
          <defs>
            <linearGradient id="aiBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id="nodeInput" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="nodeHidden" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
            <linearGradient id="nodeOutput" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="760" height="300" fill="url(#aiBg)" rx="12" />

          {/* Title */}
          <text x="380" y="34" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold">
            Artificial Neural Network: Input ➔ Hidden Layers ➔ Output Prediction
          </text>

          {/* Synapses (Connecting Lines) */}
          <g stroke="rgba(147, 197, 253, 0.28)" strokeWidth="1.5">
            {/* Input to Hidden 1 */}
            <line x1="160" y1="80" x2="330" y2="70" />
            <line x1="160" y1="80" x2="330" y2="130" />
            <line x1="160" y1="80" x2="330" y2="190" />
            <line x1="160" y1="80" x2="330" y2="250" />

            <line x1="160" y1="160" x2="330" y2="70" />
            <line x1="160" y1="160" x2="330" y2="130" />
            <line x1="160" y1="160" x2="330" y2="190" />
            <line x1="160" y1="160" x2="330" y2="250" />

            <line x1="160" y1="240" x2="330" y2="70" />
            <line x1="160" y1="240" x2="330" y2="130" />
            <line x1="160" y1="240" x2="330" y2="190" />
            <line x1="160" y1="240" x2="330" y2="250" />

            {/* Hidden 1 to Hidden 2 */}
            <line x1="330" y1="70" x2="480" y2="100" />
            <line x1="330" y1="70" x2="480" y2="160" />
            <line x1="330" y1="70" x2="480" y2="220" />

            <line x1="330" y1="130" x2="480" y2="100" />
            <line x1="330" y1="130" x2="480" y2="160" />
            <line x1="330" y1="130" x2="480" y2="220" />

            <line x1="330" y1="190" x2="480" y2="100" />
            <line x1="330" y1="190" x2="480" y2="160" />
            <line x1="330" y1="190" x2="480" y2="220" />

            <line x1="330" y1="250" x2="480" y2="100" />
            <line x1="330" y1="250" x2="480" y2="160" />
            <line x1="330" y1="250" x2="480" y2="220" />

            {/* Hidden 2 to Output */}
            <line x1="480" y1="100" x2="620" y2="120" stroke="#4ade80" strokeWidth="2.5" />
            <line x1="480" y1="100" x2="620" y2="200" />
            <line x1="480" y1="160" x2="620" y2="120" stroke="#4ade80" strokeWidth="2.5" />
            <line x1="480" y1="160" x2="620" y2="200" />
            <line x1="480" y1="220" x2="620" y2="120" stroke="#4ade80" strokeWidth="2.5" />
            <line x1="480" y1="220" x2="620" y2="200" />
          </g>

          {/* Input Layer Nodes */}
          <g>
            <circle cx="160" cy="80" r="18" fill="url(#nodeInput)" stroke="#bae6fd" strokeWidth="2" />
            <circle cx="160" cy="160" r="18" fill="url(#nodeInput)" stroke="#bae6fd" strokeWidth="2" />
            <circle cx="160" cy="240" r="18" fill="url(#nodeInput)" stroke="#bae6fd" strokeWidth="2" />
            <text x="160" y="280" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">Input Features</text>
          </g>

          {/* Hidden Layers */}
          <g>
            <circle cx="330" cy="70" r="18" fill="url(#nodeHidden)" stroke="#e9d5ff" strokeWidth="2" />
            <circle cx="330" cy="130" r="18" fill="url(#nodeHidden)" stroke="#e9d5ff" strokeWidth="2" />
            <circle cx="330" cy="190" r="18" fill="url(#nodeHidden)" stroke="#e9d5ff" strokeWidth="2" />
            <circle cx="330" cy="250" r="18" fill="url(#nodeHidden)" stroke="#e9d5ff" strokeWidth="2" />

            <circle cx="480" cy="100" r="18" fill="url(#nodeHidden)" stroke="#e9d5ff" strokeWidth="2" />
            <circle cx="480" cy="160" r="18" fill="url(#nodeHidden)" stroke="#e9d5ff" strokeWidth="2" />
            <circle cx="480" cy="220" r="18" fill="url(#nodeHidden)" stroke="#e9d5ff" strokeWidth="2" />
            <text x="405" y="280" textAnchor="middle" fill="#c084fc" fontSize="13" fontWeight="bold">Deep Hidden Layers</text>
          </g>

          {/* Output Layer Nodes */}
          <g>
            <circle cx="620" cy="120" r="22" fill="url(#nodeOutput)" stroke="#bbf7d0" strokeWidth="3" />
            <circle cx="620" cy="200" r="18" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="620" y="280" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="bold">Prediction</text>
          </g>
        </svg>
      );
    }

    // 4. Institutions / Universities / Academic Campuses (e.g. Vignan University fallback)
    if (
      normKey.includes('vignan') ||
      normKey.includes('university') ||
      normKey.includes('college') ||
      normKey.includes('institute') ||
      normKey.includes('academy')
    ) {
      return (
        <svg viewBox="0 0 760 300" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Academic university campus architectural diagram">
          <defs>
            <linearGradient id="univSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
            <linearGradient id="univBldg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="760" height="300" fill="url(#univSky)" rx="12" />

          {/* Green Campus Lawns */}
          <path d="M 0,220 Q 380,205 760,220 L 760,300 L 0,300 Z" fill="#15803d" />
          <path d="M 280,300 L 340,220 L 420,220 L 480,300 Z" fill="#cbd5e1" />

          {/* Classical Academic University Building */}
          {/* Triangular Pediment */}
          <polygon points="380,60 220,110 540,110" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2.5" />
          <circle cx="380" cy="90" r="12" fill="#0284c7" />
          <text x="380" y="95" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">🏛️</text>

          {/* Main Hall */}
          <rect x="230" y="110" width="300" height="110" fill="url(#univBldg)" stroke="#94a3b8" strokeWidth="2" />

          {/* Classical Columns */}
          <rect x="250" y="115" width="20" height="105" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="310" y="115" width="20" height="105" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="370" y="115" width="20" height="105" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="430" y="115" width="20" height="105" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="490" y="115" width="20" height="105" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Central Entrance Doors */}
          <rect x="360" y="170" width="40" height="50" rx="4" fill="#0369a1" />

          {/* Academic Badge Label */}
          <rect x="240" y="240" width="280" height="38" rx="8" fill="rgba(15, 23, 42, 0.88)" />
          <text x="380" y="264" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold">
            🎓 Academic Campus &amp; Research Institution
          </text>
        </svg>
      );
    }

    // 5. People / Leaders / Historical Figures (e.g. Narendra Modi fallback)
    if (
      normKey.includes('modi') ||
      normKey.includes('person') ||
      normKey.includes('leader') ||
      normKey.includes('prime minister') ||
      normKey.includes('president')
    ) {
      return (
        <svg viewBox="0 0 760 300" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Distinguished leadership and educational portrait diagram">
          <defs>
            <linearGradient id="leaderBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="100%" stopColor="#ffedd5" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="760" height="300" fill="url(#leaderBg)" rx="12" />

          {/* Podium and Backdrop */}
          <circle cx="380" cy="115" r="55" fill="#fed7aa" stroke="#fb923c" strokeWidth="2" />
          <path d="M 320,240 C 320,180 440,180 440,240 Z" fill="#0f172a" />
          <circle cx="380" cy="110" r="32" fill="#fdba74" />

          {/* Laurel Wreath Crest */}
          <path d="M 280,115 Q 310,170 380,180 Q 450,170 480,115" stroke="#f59e0b" strokeWidth="4" fill="none" />

          {/* Presentation Title */}
          <rect x="210" y="235" width="340" height="42" rx="8" fill="#1e293b" />
          <text x="380" y="261" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold">
            🇮🇳 Leadership &amp; Public Service Educational Profile
          </text>
        </svg>
      );
    }

    // 6. Earthquakes / Tectonic Plates / Seismic Waves
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
          <circle cx="210" cy="65" r="14" fill="#15803d" />
          <polygon points="600,68 620,48 640,68" fill="#f59e0b" />
          <rect x="608" y="68" width="24" height="22" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Left Tectonic Plate */}
          <polygon points="0,110 370,110 350,170 380,240 360,320 0,320" fill="url(#crustGrad1)" />

          {/* Right Tectonic Plate */}
          <polygon points="370,110 760,110 760,320 360,320 380,240 350,170" fill="url(#crustGrad2)" />

          {/* Jagged Fault Line */}
          <path d="M 370,105 L 348,168 L 382,238 L 360,320" stroke="#ef4444" strokeWidth="5" fill="none" strokeLinecap="round" />

          {/* Concentric Seismic Shockwaves */}
          <circle cx="365" cy="205" r="30" stroke="#ef4444" strokeWidth="2.5" fill="none" opacity="0.8" />
          <circle cx="365" cy="205" r="60" stroke="#f97316" strokeWidth="2.5" fill="none" opacity="0.7" strokeDasharray="5,4" />
          <circle cx="365" cy="205" r="95" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.6" strokeDasharray="7,5" />

          {/* Hypocenter Core */}
          <circle cx="365" cy="205" r="22" fill="url(#focusGlow)" />
          <circle cx="365" cy="205" r="7" fill="#ffffff" />

          {/* Educational Labels */}
          <rect x="20" y="125" width="155" height="30" rx="8" fill="rgba(15, 23, 42, 0.85)" />
          <text x="28" y="145" fill="#f8fafc" fontSize="13" fontWeight="bold">Tectonic Plate A ➔</text>

          <rect x="585" y="125" width="155" height="30" rx="8" fill="rgba(15, 23, 42, 0.85)" />
          <text x="593" y="145" fill="#f8fafc" fontSize="13" fontWeight="bold">⬅ Tectonic Plate B</text>

          <rect x="300" y="260" width="140" height="32" rx="8" fill="#b91c1c" stroke="#fef08a" strokeWidth="1.5" />
          <text x="312" y="281" fill="#ffffff" fontSize="12" fontWeight="bold">⚡ Hypocenter (Focus)</text>
        </svg>
      );
    }

    // 7. Photosynthesis / Plants / Leaves
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

          {/* Sun */}
          <circle cx="100" cy="80" r="45" fill="#facc15" stroke="#f59e0b" strokeWidth="3" />
          <circle cx="100" cy="80" r="35" fill="#fef08a" />
          <line x1="150" y1="100" x2="310" y2="160" stroke="#eab308" strokeWidth="4" strokeDasharray="8,4" />

          {/* Large Stylized Leaf (Cell Cross-Section) */}
          <path d="M 280,180 C 280,90 490,90 600,180 C 490,270 280,270 280,180 Z" fill="url(#leafGrad)" stroke="#166534" strokeWidth="5" />
          <path d="M 280,180 L 600,180" stroke="#bbf7d0" strokeWidth="4" />

          {/* Inputs & Outputs */}
          <g transform="translate(40, 210)">
            <rect width="180" height="42" rx="10" fill="#0284c7" />
            <text x="14" y="26" fill="#ffffff" fontSize="13" fontWeight="bold">💧 Water (H₂O) from Roots</text>
          </g>

          <g transform="translate(310, 20)">
            <rect width="190" height="40" rx="10" fill="#7c3aed" />
            <text x="12" y="25" fill="#ffffff" fontSize="13" fontWeight="bold">🫧 CO₂ from Air (Stomata)</text>
          </g>

          <g transform="translate(560, 70)">
            <rect width="175" height="42" rx="10" fill="#16a34a" />
            <text x="14" y="26" fill="#ffffff" fontSize="13" fontWeight="bold">🍬 Glucose Sugar (Food)</text>
          </g>

          <g transform="translate(560, 230)">
            <rect width="175" height="42" rx="10" fill="#0ea5e9" />
            <text x="14" y="26" fill="#ffffff" fontSize="13" fontWeight="bold">🎈 Oxygen (O₂) Released</text>
          </g>
        </svg>
      );
    }

    // 8. Solar System / Astronomy / Space
    if (
      normKey.includes('solar') ||
      normKey.includes('space') ||
      normKey.includes('planet') ||
      normKey.includes('orbit') ||
      normKey.includes('jupiter')
    ) {
      return (
        <svg viewBox="0 0 760 300" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Solar system planets and orbits diagram">
          <rect x="0" y="0" width="760" height="300" fill="#090d16" rx="12" />
          {/* Central Sun Cutout on Left */}
          <circle cx="0" cy="150" r="110" fill="#f97316" />
          <circle cx="0" cy="150" r="95" fill="#facc15" />
          <text x="18" y="155" fill="#78350f" fontSize="14" fontWeight="bold">THE SUN</text>

          {/* Orbits & Planets */}
          <ellipse cx="0" cy="150" rx="160" ry="110" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />
          <ellipse cx="0" cy="150" rx="285" ry="140" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />
          <ellipse cx="0" cy="150" rx="480" ry="170" stroke="#334155" strokeWidth="1.2" fill="none" strokeDasharray="3,3" />

          <circle cx="160" cy="140" r="7" fill="#94a3b8" />
          <circle cx="285" cy="170" r="14" fill="#38bdf8" />
          <text x="272" y="196" fill="#38bdf8" fontSize="11" fontWeight="bold">Earth</text>
          <circle cx="480" cy="160" r="28" fill="#d97706" />
          <text x="462" y="202" fill="#fde68a" fontSize="12" fontWeight="bold">Jupiter</text>
        </svg>
      );
    }

    // 9. Water Cycle / Weather / Oceans / Rain
    if (
      normKey.includes('water') ||
      normKey.includes('rain') ||
      normKey.includes('cloud') ||
      normKey.includes('evaporat') ||
      normKey.includes('condens')
    ) {
      return (
        <svg viewBox="0 0 760 300" width="100%" height="100%" style={{ maxHeight: '300px' }} role="img" aria-label="Earth water cycle process diagram">
          <defs>
            <linearGradient id="waterSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="760" height="300" fill="url(#waterSky)" rx="12" />
          <circle cx="680" cy="50" r="35" fill="#facc15" stroke="#f59e0b" strokeWidth="3" />
          <polygon points="0,300 160,110 320,300" fill="#64748b" />
          <path d="M 460,250 C 540,240 640,245 760,240 L 760,300 L 460,300 Z" fill="#0284c7" />

          {/* Educational Callout Tags */}
          <rect x="560" y="115" width="165" height="28" rx="6" fill="#ea580c" />
          <text x="572" y="134" fill="#ffffff" fontSize="12" fontWeight="bold">1. Evaporation ⬆</text>
          <rect x="235" y="10" width="165" height="28" rx="6" fill="#2563eb" />
          <text x="247" y="29" fill="#ffffff" fontSize="12" fontWeight="bold">2. Condensation ☁</text>
          <rect x="60" y="185" width="160" height="28" rx="6" fill="#0284c7" />
          <text x="70" y="204" fill="#ffffff" fontSize="12" fontWeight="bold">3. Precipitation 🌧</text>
        </svg>
      );
    }

    // 10. Default General Educational Illustration State
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
        <span style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>🎨</span>
        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', color: 'var(--navy-900)', fontWeight: 700 }}>
          Educational Concept Guide
        </h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--navy-600)', maxWidth: '440px', lineHeight: 1.5 }}>
          {description || caption || 'Follow along with the detailed point-by-point explanation below.'}
        </p>
      </div>
    );
  };

  return (
    <div
      className="liquid-glass-card"
      style={{
        margin: '2rem 0',
        padding: 'clamp(0.95rem, 2.5vw, 1.5rem)',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(221, 242, 255, 0.45) 50%, rgba(255, 228, 239, 0.45) 100%)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        border: '1.5px solid rgba(255, 255, 255, 0.95)',
        boxShadow: 'var(--shadow-liquid-glass)',
        overflow: 'hidden',
      }}
    >
      {/* Figure Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.65rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            className="liquid-badge badge-blue"
            style={{
              fontWeight: 800,
              fontSize: '0.8rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Figure {figureNumber}
          </span>
          <h4
            style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--liquid-navy-dark)',
            }}
          >
            {title || 'Concept Illustration'}
          </h4>
        </div>

        {currentUrl ? (
          <span className="liquid-badge badge-mint" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', fontWeight: 700 }}>
            ✓ Verified Public Media
          </span>
        ) : (
          <span className="liquid-badge badge-lavender" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', fontWeight: 700 }}>
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
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(255, 255, 255, 0.9)',
          boxShadow: 'var(--shadow-liquid-inset)',
          padding: currentUrl ? '0.85rem' : '0',
        }}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={title ? `${title} - educational visual` : 'Educational concept visual'}
            loading="lazy"
            onError={handleImageError}
            style={{
              maxWidth: '100%',
              maxHeight: '460px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 6px 18px rgba(36, 50, 75, 0.08)',
            }}
          />
        ) : (
          renderSvgArtwork()
        )}
      </div>

      {/* Educational Caption & Source Attribution */}
      <div
        style={{
          marginTop: '1rem',
          padding: 'clamp(0.85rem, 2.5vw, 1.1rem) clamp(0.85rem, 2.5vw, 1.35rem)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(12px)',
          borderLeft: '4px solid var(--accent-cyan)',
          border: '1px solid rgba(221, 242, 255, 0.9)',
          boxShadow: '0 4px 14px rgba(36, 50, 75, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ fontSize: '0.96rem', color: 'var(--liquid-navy)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--liquid-navy-dark)' }}>Visual Guide: </strong>
          {caption || description || 'Authentic educational visual illustrating the concept.'}
        </div>

        {/* Source and License Attribution */}
        {currentUrl && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.65rem',
              paddingTop: '0.65rem',
              borderTop: '1px solid rgba(221, 242, 255, 0.85)',
              fontSize: '0.82rem',
              color: 'var(--liquid-navy-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>📷 <strong>Source:</strong></span>
              {sourcePageUrl ? (
                <a
                  href={sourcePageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-cyan-hover)', textDecoration: 'underline', fontWeight: 700 }}
                  title="View original image on Wikimedia Commons"
                >
                  {sourceType === 'wikimedia'
                    ? 'Wikimedia Commons ↗'
                    : sourceType === 'wikipedia'
                    ? 'Wikipedia / Wikimedia ↗'
                    : 'Public Media ↗'}
                </a>
              ) : (
                <span>
                  {sourceType === 'wikimedia'
                    ? 'Wikimedia Commons'
                    : sourceType === 'wikipedia'
                    ? 'Wikipedia / Wikimedia'
                    : 'Public Media'}
                </span>
              )}
              {author && <span>• <strong>Author:</strong> {author}</span>}
              {attribution && attribution !== author && <span>• <strong>Credit:</strong> {attribution}</span>}
            </div>

            {license && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="liquid-badge badge-blue" style={{ fontSize: '0.74rem', padding: '0.2rem 0.6rem' }}>
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

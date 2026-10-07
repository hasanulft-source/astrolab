// Astrolab — XP, Level & Badge System
// Extracted from App.jsx (Wave 2)

// Setiap tier punya icon SVG sendiri, sub-level dibedakan dengan jumlah pip / accent
export const TIERS = [
  { id: "nebula",    name: "Nebula",    color: "#7c3aed", bg: "#f3e8ff", accent: "#a78bfa", desc: "Awal perjalanan" },
  { id: "bintang",   name: "Bintang",   color: "#d97706", bg: "#fffbeb", accent: "#fbbf24", desc: "Mulai bersinar" },
  { id: "planet",    name: "Planet",    color: "#0d6b7a", bg: "#eaf4f3", accent: "#5eead4", desc: "Semakin kokoh" },
  { id: "astronot",  name: "Astronot",  color: "#1d4ed8", bg: "#eff6ff", accent: "#60a5fa", desc: "Terbang tinggi" },
  { id: "commander", name: "Commander", color: "#b45309", bg: "#fef3c7", accent: "#f59e0b", desc: "Puncak galaksi" },
];

// XP cumulative per level (progressive scaling)
// Disesuaikan: 1 semester siswa terbaik bisa Astronot III-IV, 1 tahun penuh Commander III-IV
export const LEVEL_XP = [
  0,     50,    120,    200,    // Nebula I-IV
  300,   450,   650,    850,    // Bintang I-IV
  1100,  1400,  1750,   2100,   // Planet I-IV
  2500,  2900,  3300,   3750,   // Astronot I-IV
  4300,  5000,  5800,   6800,   // Commander I-IV
];

export const SUB_ROMAN = ["I", "II", "III", "IV"];

// Generate LEVELS array dari TIERS × 4 sub-level
export const LEVELS = TIERS.flatMap((tier, tIdx) =>
  [0, 1, 2, 3].map((sub, sIdx) => {
    const id = tIdx * 4 + sIdx + 1;
    const min = LEVEL_XP[id - 1];
    const max = id < 20 ? LEVEL_XP[id] - 1 : Infinity;
    return {
      id,
      tierId: tier.id,
      tierName: tier.name,
      subLevel: sub + 1,
      name: `${tier.name} ${SUB_ROMAN[sub]}`,
      shortName: tier.name,
      min, max,
      color: tier.color,
      bg: tier.bg,
      accent: tier.accent,
      desc: tier.desc,
    };
  })
);

export function getLevel(poin) {
  return LEVELS.find(l => poin >= l.min && poin <= l.max) || LEVELS[0];
}
export function getTier(poin) {
  const lv = getLevel(poin);
  return TIERS.find(t => t.id === lv.tierId);
}

// Setiap icon punya unique gradient ID berbasis size+tierId untuk avoid conflict
export function TierIcon({ tierId, size = 16, color = "currentColor" }) {
  const uid = `${tierId}-${size}`;
  const props = { width: size, height: size, viewBox: "0 0 100 100", style: { display: "inline-block", verticalAlign: "middle" } };

  switch (tierId) {
    case "nebula":
      return (
        <svg {...props}>
          <defs>
            <radialGradient id={`neb-${uid}`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#f0abfc" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#581c87" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="42" fill={`url(#neb-${uid})`} />
          <circle cx="38" cy="38" r="14" fill="#fff" opacity="0.35" />
          <circle cx="50" cy="50" r="8" fill="#fef3c7" opacity="0.9" />
          <circle cx="22" cy="28" r="2.5" fill="#fff" opacity="0.95" />
          <circle cx="78" cy="38" r="2" fill="#fff" opacity="0.9" />
          <circle cx="72" cy="72" r="1.8" fill="#fff" opacity="0.8" />
          <circle cx="26" cy="68" r="2.2" fill="#fff" opacity="0.85" />
        </svg>
      );
    case "bintang":
      return (
        <svg {...props}>
          <defs>
            <radialGradient id={`bin-${uid}`} cx="40%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
          </defs>
          <polygon points="50,8 60,38 92,38 66,58 76,90 50,71 24,90 34,58 8,38 40,38" fill={`url(#bin-${uid})`} stroke="#92400e" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="50,22 55,38 70,38 58,49 62,65 50,55 38,65 42,49 30,38 45,38" fill="#fef3c7" opacity="0.55" />
          <circle cx="42" cy="35" r="3" fill="#fff" opacity="0.9" />
        </svg>
      );
    case "planet":
      return (
        <svg {...props}>
          <defs>
            <radialGradient id={`pla-${uid}`} cx="30%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="58" rx="46" ry="9" transform="rotate(-15 50 58)" fill="#0e7490" opacity="0.5" />
          <ellipse cx="50" cy="58" rx="44" ry="8" transform="rotate(-15 50 58)" fill="none" stroke="#fef3c7" strokeWidth="3" />
          <circle cx="50" cy="50" r="30" fill={`url(#pla-${uid})`} stroke="#064e3b" strokeWidth="2" />
          <ellipse cx="38" cy="38" rx="12" ry="9" fill="#fff" opacity="0.5" />
          <ellipse cx="42" cy="48" rx="5" ry="3" fill="#0e7490" opacity="0.6" />
          <ellipse cx="58" cy="56" rx="6" ry="3" fill="#0e7490" opacity="0.5" />
          <ellipse cx="50" cy="58" rx="44" ry="8" transform="rotate(-15 50 58)" fill="none" stroke="#fef3c7" strokeWidth="3" strokeDasharray="0,250,80,300" />
        </svg>
      );
    case "astronot":
      return (
        <svg {...props}>
          <defs>
            <radialGradient id={`ast-${uid}`} cx="30%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="92" rx="22" ry="5" fill="#1e3a8a" opacity="0.2" />
          <path d="M44 22 Q28 38 28 60 L72 60 Q72 38 56 22 Q52 18 48 18 Q46 18 44 22 Z" fill={`url(#ast-${uid})`} stroke="#1e3a8a" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="50" cy="40" rx="12" ry="10" fill="#fef3c7" stroke="#1e3a8a" strokeWidth="2" />
          <ellipse cx="46" cy="37" rx="4" ry="3" fill="#fff" opacity="0.85" />
          <path d="M28 60 L18 72 L22 82 L34 76 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M72 60 L82 72 L78 82 L66 76 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="22" cy="74" r="2.5" fill="#fbbf24" />
          <circle cx="78" cy="74" r="2.5" fill="#fbbf24" />
          <path d="M40 50 L46 56 M40 56 L46 50" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "commander":
      return (
        <svg {...props}>
          <defs>
            <radialGradient id={`cmd-${uid}`} cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#7c2d12" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="42" fill={`url(#cmd-${uid})`} />
          <path d="M50 18 Q72 28 80 50 Q72 60 50 56 Q38 50 36 38 Q42 22 50 18 Z" fill="#fef08a" opacity="0.7" />
          <path d="M50 82 Q28 72 20 50 Q28 40 50 44 Q62 50 64 62 Q58 78 50 82 Z" fill="#fef08a" opacity="0.7" />
          <circle cx="50" cy="50" r="9" fill="#fff" />
          <circle cx="50" cy="50" r="4.5" fill="#fef08a" />
          <circle cx="30" cy="30" r="2" fill="#fef3c7" />
          <circle cx="70" cy="32" r="1.8" fill="#fef3c7" />
          <circle cx="32" cy="70" r="1.8" fill="#fef3c7" />
          <circle cx="68" cy="68" r="2" fill="#fef3c7" />
        </svg>
      );
    default:
      return <svg {...props}><circle cx="50" cy="50" r="40" fill={color} opacity="0.3" /></svg>;
  }
}

export function LevelBadge({ poin = 0, size = "sm", showName = true, showSubLevel = true }) {
  const lv = getLevel(poin);
  const sizes = {
    xs: { padX: 6, padY: 2, fs: 9, gap: 4, iconSize: 14 },
    sm: { padX: 8, padY: 3, fs: 10, gap: 5, iconSize: 16 },
    md: { padX: 10, padY: 4, fs: 11, gap: 6, iconSize: 20 },
  };
  const s = sizes[size] || sizes.sm;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: s.gap,
      padding: `${s.padY}px ${s.padX}px`,
      background: lv.bg, color: lv.color,
      borderRadius: 99, fontSize: s.fs, fontWeight: 700,
      lineHeight: 1, whiteSpace: "nowrap",
    }}>
      <TierIcon tierId={lv.tierId} size={s.iconSize} color={lv.color} />
      {showName && (showSubLevel ? lv.name : lv.shortName)}
    </span>
  );
}
export function getLevelProgress(poin) {
  const lv = getLevel(poin);
  if (lv.id === LEVELS.length) return { pct: 100, current: poin, needed: 0, next: null };
  const range = lv.max - lv.min + 1;
  const prog = poin - lv.min;
  const pct = Math.min(100, Math.round((prog / range) * 100));
  const next = LEVELS[lv.id]; // next level (0-indexed so lv.id = next index)
  return { pct, current: poin, needed: lv.max + 1 - poin, next };
}

// Setiap badge = perisai dengan rim gradient + glyph unik di tengah.
// 'type' menentukan glyph; 'rim' menentukan warna frame.
export const BADGE_RIMS = {
  amber:  { a: "#f0b429", b: "#b45309", inA: "#fff8e6", inB: "#fde9b8", glyph: "#b45309" },
  teal:   { a: "#0c7a91", b: "#063f4d", inA: "#eafafb", inB: "#c9eef0", glyph: "#0c7a91" },
  red:    { a: "#ef5350", b: "#b91c1c", inA: "#fff0ef", inB: "#fbd5d3", glyph: "#c0392b" },
  violet: { a: "#a78bfa", b: "#6d28d9", inA: "#f4f0ff", inB: "#e0d4fb", glyph: "#6d28d9" },
  blue:   { a: "#60a5fa", b: "#1d4ed8", inA: "#eef5ff", inB: "#d3e4fb", glyph: "#1d4ed8" },
  green:  { a: "#4ade80", b: "#15803d", inA: "#effdf4", inB: "#c8f2d6", glyph: "#15803d" },
  rose:   { a: "#fb7185", b: "#be123c", inA: "#fff1f3", inB: "#fbd0d8", glyph: "#be123c" },
};

// Glyph unik per badge — digambar dalam koordinat lokal (-18..18), center (0,0)
export function BadgeGlyph({ type, color }) {
  const s = { stroke: color, strokeWidth: 2.2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const f = { fill: color };
  switch (type) {
    // Prestasi
    case "bullseye": return <g {...s}><circle r="14" /><circle r="8.5" /><circle r="3" {...f} stroke="none" /></g>;
    case "rosette": return <g><circle r="9" {...s} /><circle r="4" {...f} stroke="none" /><g {...f} stroke="none">{[0,1,2,3,4,5,6,7].map(i => <ellipse key={i} cx="0" cy="-12" rx="2.6" ry="4.5" transform={`rotate(${i*45})`} opacity="0.85" />)}</g><circle r="5" fill="#fff" /><circle r="2.5" {...f} stroke="none" /></g>;
    case "crown": return <g {...f} stroke={color} strokeWidth="1"><path d="M-14 7 L-14 -7 L-7 0 L0 -10 L7 0 L14 -7 L14 7 Z" /><rect x="-14" y="7" width="28" height="4" rx="1" /><circle cx="0" cy="-10" r="2" fill="#fff" /></g>;
    // Streak
    case "flame1": return <g><path d="M0 -16 Q-10 -4 -10 6 Q-10 14 0 16 Q10 14 10 4 Q10 -6 0 -16 Z" {...f} stroke="none" /><path d="M0 -3 Q-5 3 -4 9 Q-1 13 2 10 Q5 5 0 -3 Z" fill="#fff" opacity="0.55" /></g>;
    case "flame2": return <g><path d="M-2 -16 Q-12 -4 -12 6 Q-12 14 -2 16 Q6 14 6 5 Q6 -5 -2 -16 Z" {...f} stroke="none" /><path d="M7 -8 Q1 0 1 8 Q1 14 8 15 Q14 13 14 6 Q14 -2 7 -8 Z" {...f} stroke="none" opacity="0.7" /><path d="M-2 -3 Q-6 3 -5 9 Q-2 12 0 10 Q3 5 -2 -3 Z" fill="#fff" opacity="0.55" /></g>;
    case "sun": return <g {...s}><circle r="8" {...f} stroke="none" />{[0,1,2,3,4,5,6,7].map(i => <line key={i} x1="0" y1="-12" x2="0" y2="-16" transform={`rotate(${i*45})`} />)}</g>;
    // Tugas
    case "footprint": return <g {...f} stroke="none"><ellipse cx="0" cy="2" rx="7" ry="11" /><circle cx="-6" cy="-12" r="2.5" /><circle cx="-1" cy="-14" r="2.5" /><circle cx="4" cy="-13" r="2.3" /><circle cx="8" cy="-9" r="2" /></g>;
    case "book": return <g><path d="M-14 -10 Q0 -14 14 -10 L14 12 Q0 8 -14 12 Z" {...f} stroke={color} strokeWidth="1" /><path d="M0 -11 L0 10" stroke="#fff" strokeWidth="1.6" /><path d="M-10 -6 Q-5 -7 -3 -6 M-10 -1 Q-5 -2 -3 -1 M3 -6 Q8 -7 10 -6 M3 -1 Q8 -2 10 -1" stroke="#fff" strokeWidth="1.2" fill="none" /></g>;
    case "gradcap": return <g><polygon points="0,-12 16,-5 0,2 -16,-5" {...f} stroke="none" /><path d="M-9 -2 L-9 7 Q0 13 9 7 L9 -2" {...s} /><line x1="16" y1="-5" x2="16" y2="7" {...s} /><circle cx="16" cy="9" r="2" {...f} stroke="none" /></g>;
    case "shield": return <g><path d="M0 -15 L13 -10 L13 4 Q13 13 0 16 Q-13 13 -13 4 L-13 -10 Z" {...f} stroke={color} strokeWidth="1" /><path d="M-6 0 L-2 5 L7 -6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>;
    // Speed
    case "stopwatch": return <g {...s}><circle cx="0" cy="2" r="12" /><line x1="0" y1="-10" x2="0" y2="-14" /><line x1="-4" y1="-14" x2="4" y2="-14" /><line x1="0" y1="2" x2="0" y2="-4" /><line x1="0" y1="2" x2="5" y2="4" /></g>;
    case "bolt": return <g><polygon points="4,-16 -10,4 -1,4 -4,16 11,-4 2,-4" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /></g>;
    // Ranking
    case "trophy": return <g><path d="M-9 -12 L9 -12 L8 1 Q8 7 0 8 Q-8 7 -8 1 Z" {...f} stroke={color} strokeWidth="1" /><path d="M-9 -10 Q-15 -10 -15 -4 Q-15 2 -9 2" {...s} /><path d="M9 -10 Q15 -10 15 -4 Q15 2 9 2" {...s} /><rect x="-2" y="8" width="4" height="5" {...f} stroke="none" /><rect x="-7" y="13" width="14" height="3" rx="1" {...f} stroke="none" /></g>;
    case "podium": return <g {...f} stroke="none"><rect x="-15" y="0" width="9" height="12" rx="1" opacity="0.7" /><rect x="-4.5" y="-8" width="9" height="20" rx="1" /><rect x="6" y="4" width="9" height="8" rx="1" opacity="0.5" /></g>;
    // Level — bintang bertingkat
    case "star1": return <g><polygon points="0,-15 4,-4 16,-4 6,3 10,14 0,7 -10,14 -6,3 -16,-4 -4,-4" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /></g>;
    case "star2": return <g><polygon points="0,-15 3,-5 14,-5 5,2 8,13 0,6 -8,13 -5,2 -14,-5 -3,-5" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /><polygon points="0,-7 1.5,-2 6,-2 2.5,1 4,6 0,3 -4,6 -2.5,1 -6,-2 -1.5,-2" fill="#fff" opacity="0.6" /></g>;
    case "constellation": return <g><g {...f} stroke="none"><circle cx="-11" cy="-8" r="2.5" /><circle cx="2" cy="-12" r="2" /><circle cx="10" cy="-2" r="2.8" /><circle cx="-3" cy="6" r="2" /><circle cx="6" cy="12" r="2.3" /></g><path d="M-11 -8 L2 -12 L10 -2 L-3 6 L6 12" {...s} strokeWidth="1.3" opacity="0.7" /></g>;
    case "starcrown": return <g><polygon points="0,-15 3.5,-5 14,-5 5.5,2 9,13 0,6 -9,13 -5.5,2 -14,-5 -3.5,-5" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /><path d="M-9 -9 L-4 -6 L0 -11 L4 -6 L9 -9 L8 -3 L-8 -3 Z" fill="#fff" opacity="0.5" /></g>;
    // XP — gem progression
    case "gem1": return <g><polygon points="0,14 -10,-2 -5,-10 5,-10 10,-2" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /><polygon points="0,14 -10,-2 10,-2" fill="#fff" opacity="0.25" /><line x1="-5" y1="-10" x2="0" y2="-2" stroke="#fff" strokeWidth="1" opacity="0.5" /><line x1="5" y1="-10" x2="0" y2="-2" stroke="#fff" strokeWidth="1" opacity="0.5" /></g>;
    case "gem2": return <g><polygon points="0,15 -12,-1 -6,-11 6,-11 12,-1" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /><polygon points="-6,-11 6,-11 6,-1 -6,-1" fill="#fff" opacity="0.3" /><line x1="-6" y1="-1" x2="0" y2="15" stroke="#fff" strokeWidth="1" opacity="0.4" /><line x1="6" y1="-1" x2="0" y2="15" stroke="#fff" strokeWidth="1" opacity="0.4" /></g>;
    case "diamond": return <g><polygon points="0,16 -13,-2 -7,-12 7,-12 13,-2" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /><polygon points="-7,-12 7,-12 13,-2 -13,-2" fill="#fff" opacity="0.35" /><polygon points="-13,-2 0,16 13,-2" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5" /><line x1="0" y1="-12" x2="0" y2="16" stroke="#fff" strokeWidth="0.8" opacity="0.4" /></g>;
    // Special
    case "ribbon": return <g><circle cx="0" cy="-4" r="11" {...f} stroke={color} strokeWidth="1" /><circle cx="0" cy="-4" r="6" fill="#fff" opacity="0.5" /><path d="M-7 5 L-10 17 L0 12 L10 17 L7 5" {...f} stroke="none" /><text y="-1" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">★</text></g>;
    case "bulb": return <g><path d="M-9 4 Q-13 -1 -13 -6 Q-13 -15 0 -15 Q13 -15 13 -6 Q13 -1 9 4 L9 9 L-9 9 Z" {...f} stroke={color} strokeWidth="1" /><path d="M-9 4 Q-13 -1 -13 -6 Q-13 -12 -6 -14" fill="#fff" opacity="0.45" /><rect x="-7" y="9" width="14" height="3" rx="1" fill={color} /><rect x="-5" y="13" width="10" height="2" rx="1" fill={color} opacity="0.7" /></g>;
    case "handshake": return <g {...s}><path d="M-14 -2 L-6 -2 L0 2 L8 -4 L14 0" /><path d="M-6 -2 L-2 6 M2 0 L6 7 M0 2 L4 9" /></g>;
    case "arrowup": return <g><polygon points="0,-15 11,-2 4,-2 4,14 -4,14 -4,-2 -11,-2" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /></g>;
    case "flag": return <g><line x1="-11" y1="-15" x2="-11" y2="16" {...s} /><path d="M-11 -14 L13 -14 L8 -7 L13 0 L-11 0 Z" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /></g>;
    case "heart": return <g><path d="M0 14 Q-14 4 -14 -5 Q-14 -13 -7 -13 Q-2 -13 0 -7 Q2 -13 7 -13 Q14 -13 14 -5 Q14 4 0 14 Z" {...f} stroke={color} strokeWidth="1" strokeLinejoin="round" /><ellipse cx="-5" cy="-6" rx="3" ry="2" fill="#fff" opacity="0.5" /></g>;
    // Perilaku & Keaktifan
    case "question": return <g><path d="M-6 -8 Q-6 -14 0 -14 Q7 -14 7 -8 Q7 -3 1 -1 L1 4" {...s} strokeWidth="2.6" /><circle cx="0" cy="11" r="2" {...f} stroke="none" /></g>;
    case "eye": return <g><path d="M-15 0 Q0 -12 15 0 Q0 12 -15 0 Z" {...s} strokeWidth="2.2" /><circle cx="0" cy="0" r="5" {...f} stroke="none" /><circle cx="-1.5" cy="-1.5" r="1.6" fill="#fff" stroke="none" /></g>;
    case "moonstar": return <g><path d="M6 -14 A11 11 0 100 14 A9 9 0 016 -14Z" {...f} stroke="none" /><polygon points="-9,-9 -8,-6 -5,-6 -7.5,-4.3 -6.5,-1.5 -9,-3.3 -11.5,-1.5 -10.5,-4.3 -13,-6 -10,-6" {...f} stroke="none" opacity="0.9" /></g>;
    case "magnify": return <g {...s} strokeWidth="2.4"><circle cx="-2" cy="-2" r="9" /><line x1="5" y1="5" x2="14" y2="14" strokeLinecap="round" /></g>;
    case "rocket": return <g><path d="M0 -16 Q8 -8 8 4 L8 10 L-8 10 L-8 4 Q-8 -8 0 -16Z" {...f} stroke={color} strokeWidth="1" /><circle cx="0" cy="-4" r="3" fill="#fff" opacity="0.6" /><path d="M-8 6 L-14 14 L-6 11 Z" {...f} stroke="none" /><path d="M8 6 L14 14 L6 11 Z" {...f} stroke="none" /><path d="M-3 10 L0 17 L3 10 Z" fill="#fbbf24" stroke="none" /></g>;
    case "compass": return <g><circle r="13" {...s} strokeWidth="2" /><polygon points="0,-9 3,0 0,9 -3,0" {...f} stroke="none" /><circle r="1.5" fill="#fff" stroke="none" /></g>;
    case "starorbit": return <g><ellipse rx="15" ry="6" {...s} strokeWidth="1.3" opacity="0.6" /><polygon points="0,-9 2,-2 9,-2 3.5,2 5.5,9 0,5 -5.5,9 -3.5,2 -9,-2 -2,-2" {...f} stroke="none" /></g>;
    default: return <circle r="10" {...f} stroke="none" />;
  }
}

export function BadgeIcon({ type, rim = "teal", size = 32, locked = false }) {
  const c = locked
    ? { a: "#c2cdd0", b: "#9aa8ab", inA: "#eef2f3", inB: "#dfe6e7", glyph: "#9aa8ab" }
    : (BADGE_RIMS[rim] || BADGE_RIMS.teal);
  const gid = `bdg-${type}-${rim}-${size}-${locked ? "L" : "E"}`;
  return (
    <svg width={size} height={size} viewBox="0 0 72 80" style={{ display: "inline-block", filter: locked ? "none" : "drop-shadow(0 2px 2.5px rgba(11,58,68,0.18))" }}>
      <defs>
        <linearGradient id={`${gid}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.a} /><stop offset="100%" stopColor={c.b} />
        </linearGradient>
        <radialGradient id={`${gid}-in`} cx="50%" cy="36%" r="65%">
          <stop offset="0%" stopColor={c.inA} /><stop offset="100%" stopColor={c.inB} />
        </radialGradient>
      </defs>
      {/* Shield frame */}
      <path d="M36 3 L67 13 L67 42 Q67 67 36 78 Q5 67 5 42 L5 13 Z" fill={`url(#${gid}-rim)`} />
      <path d="M36 12 L59 20 L59 42 Q59 60 36 70 Q13 60 13 42 L13 20 Z" fill={`url(#${gid}-in)`} />
      {/* Glyph */}
      <g transform="translate(36,40)"><BadgeGlyph type={type} color={c.glyph} /></g>
    </svg>
  );
}

// 'iconType' = type yang dipakai oleh BadgeIcon component.
export const AUTO_BADGES = [
  // === Prestasi (nilai/akurasi) ===
  { id: "perfect",     icon: "bullseye",     rim: "amber",  name: "Perfect Score",  desc: "Nilai 100 di satu tugas",          color: "#b45309", bg: "#fef3c7", category: "Prestasi", poin: 50 },
  { id: "perfect5",    icon: "rosette",      rim: "amber",  name: "Perfectionist",  desc: "5x nilai 100",                     color: "#92400e", bg: "#fef3c7", category: "Prestasi", poin: 50 },
  { id: "perfect10",   icon: "crown",        rim: "amber",  name: "Master Mind",    desc: "10x nilai 100",                    color: "#78350f", bg: "#fde68a", category: "Prestasi", poin: 50 },

  // === Streak ===
  { id: "onfire",      icon: "flame1",       rim: "red",    name: "On Fire",        desc: "Streak 5 hari berturut-turut",     color: "#dc2626", bg: "#fef2f2", category: "Streak", poin: 50 },
  { id: "blazing",     icon: "flame2",       rim: "red",    name: "Blazing Hot",    desc: "Streak 10 hari berturut-turut",    color: "#b91c1c", bg: "#fee2e2", category: "Streak", poin: 50 },
  { id: "inferno",     icon: "sun",          rim: "red",    name: "Inferno",        desc: "Streak 20 hari berturut-turut",    color: "#7f1d1d", bg: "#fecaca", category: "Streak", poin: 50 },

  // === Tugas ===
  { id: "firstblood",  icon: "footprint",    rim: "green",  name: "First Step",     desc: "Selesaikan tugas pertama",         color: "#16a34a", bg: "#f0fdf4", category: "Tugas", poin: 50 },
  { id: "rajin",       icon: "book",         rim: "teal",   name: "Rajin Belajar",  desc: "Selesaikan 10 tugas",              color: "#0d6b7a", bg: "#eaf4f3", category: "Tugas", poin: 50 },
  { id: "scholar",     icon: "gradcap",      rim: "teal",   name: "Scholar",        desc: "Selesaikan 25 tugas",              color: "#0e7490", bg: "#cffafe", category: "Tugas", poin: 50 },
  { id: "veteran",     icon: "shield",       rim: "teal",   name: "Veteran",        desc: "Selesaikan 50 tugas",              color: "#155e75", bg: "#a5f3fc", category: "Tugas", poin: 50 },

  // === Speed ===
  { id: "fast",        icon: "stopwatch",    rim: "violet", name: "Fast Finisher",  desc: "Submit < 3 jam setelah publish",   color: "#7c3aed", bg: "#f5f3ff", category: "Speed", poin: 50 },
  { id: "lightning",   icon: "bolt",         rim: "violet", name: "Lightning",      desc: "5x submit di hari yang sama",      color: "#6d28d9", bg: "#ede9fe", category: "Speed", poin: 50 },

  // === Ranking ===
  { id: "topclass",    icon: "trophy",       rim: "amber",  name: "Top of Class",   desc: "Rank #1 di leaderboard",           color: "#d97706", bg: "#fffbeb", category: "Ranking", poin: 50 },
  { id: "podium",      icon: "podium",       rim: "amber",  name: "Podium",         desc: "Masuk Top 3 leaderboard",          color: "#ea580c", bg: "#fff7ed", category: "Ranking", poin: 50 },

  // === Level ===
  { id: "lv5",         icon: "star1",        rim: "amber",  name: "Rising Star",    desc: "Capai Level 5 (Bintang I)",        color: "#d97706", bg: "#fffbeb", category: "Level", poin: 50 },
  { id: "lv10",        icon: "star2",        rim: "teal",   name: "Stellar",        desc: "Capai Level 10 (Planet II)",       color: "#0d6b7a", bg: "#eaf4f3", category: "Level", poin: 50 },
  { id: "lv15",        icon: "constellation",rim: "blue",   name: "Celestial",      desc: "Capai Level 15 (Astronot III)",    color: "#1d4ed8", bg: "#eff6ff", category: "Level", poin: 50 },
  { id: "lv20",        icon: "starcrown",    rim: "amber",  name: "Galactic",       desc: "Capai Level 20 (Commander IV)",    color: "#b45309", bg: "#fef3c7", category: "Level", poin: 50 },

  // === XP ===
  { id: "xp1k",        icon: "gem1",         rim: "teal",   name: "1K Club",        desc: "Total 1.000 XP",                   color: "#0d6b7a", bg: "#eaf4f3", category: "XP", poin: 50 },
  { id: "xp5k",        icon: "gem2",         rim: "violet", name: "3K Club",        desc: "Total 3.000 XP",                   color: "#7c3aed", bg: "#f5f3ff", category: "XP", poin: 50 },
  { id: "xp10k",       icon: "diamond",      rim: "amber",  name: "5K Elite",       desc: "Total 5.000 XP",                   color: "#b45309", bg: "#fef3c7", category: "XP", poin: 50 },
];

export const MANUAL_BADGES = [
  { id: "guruspick",   icon: "ribbon",       rim: "teal",   name: "Guru's Pick",    desc: "Pilihan khusus dari guru",         color: "#0d6b7a", bg: "#eaf4f3", category: "Special", poin: 15 },
  { id: "creative",    icon: "bulb",         rim: "violet", name: "Most Creative",  desc: "Kreativitas luar biasa",           color: "#7c3aed", bg: "#f5f3ff", category: "Special", poin: 15 },
  { id: "teamplayer",  icon: "handshake",    rim: "blue",   name: "Team Player",    desc: "Kontribusi luar biasa di kelas",   color: "#1d4ed8", bg: "#eff6ff", category: "Special", poin: 15 },
  { id: "improver",    icon: "arrowup",      rim: "green",  name: "Most Improved",  desc: "Peningkatan nilai terbaik",        color: "#16a34a", bg: "#f0fdf4", category: "Special", poin: 15 },
  { id: "leader",      icon: "flag",         rim: "amber",  name: "Class Leader",   desc: "Memimpin diskusi & inspirasi",     color: "#d97706", bg: "#fffbeb", category: "Special", poin: 15 },
  { id: "helper",      icon: "heart",        rim: "rose",   name: "Helper",         desc: "Selalu membantu teman sekelas",    color: "#dc2626", bg: "#fef2f2", category: "Special", poin: 15 },

  // === Perilaku & Keaktifan (guru-awarded, observasi manual) ===
  { id: "curious",     icon: "question",     rim: "blue",   name: "Si Penasaran",   desc: "Rajin bertanya untuk memperdalam pemahaman",         color: "#1d4ed8", bg: "#eff6ff", category: "Perilaku", poin: 15 },
  { id: "monitor",     icon: "eye",          rim: "teal",   name: "Pemantau Setia", desc: "Rutin memantau progress & nilai lewat aplikasi",     color: "#0d6b7a", bg: "#eaf4f3", category: "Perilaku", poin: 15 },
  { id: "nightowl",    icon: "moonstar",     rim: "violet", name: "Night Explorer", desc: "Aktif belajar mandiri di luar jam sekolah",          color: "#7c3aed", bg: "#f5f3ff", category: "Perilaku", poin: 15 },
  { id: "researcher",  icon: "magnify",      rim: "green",  name: "Peneliti Kecil", desc: "Sering menggali materi lebih dalam dari yang diajarkan", color: "#16a34a", bg: "#f0fdf4", category: "Perilaku", poin: 15 },
  { id: "spiritrocket",icon: "rocket",       rim: "amber",  name: "Roket Semangat", desc: "Semangat & antusias tinggi meski hasil belum sempurna", color: "#d97706", bg: "#fffbeb", category: "Perilaku", poin: 15 },
  { id: "navigator",   icon: "compass",      rim: "rose",   name: "Navigator Kelas",desc: "Aktif memberi masukan membangun untuk kelas",        color: "#be123c", bg: "#fff1f3", category: "Perilaku", poin: 15 },
  { id: "steadystar",  icon: "starorbit",    rim: "blue",   name: "Konsisten Bintang", desc: "Hadir & aktif di aplikasi secara rutin tiap minggu", color: "#1d4ed8", bg: "#eff6ff", category: "Perilaku", poin: 15 },
];
export const ALL_BADGES = [...AUTO_BADGES, ...MANUAL_BADGES];

export function checkAutoBadges(stats, submission, isTopClass = false, isTopThree = false, ownedBadges = []) {
  const earned = [];
  const nilai = submission.nilai || 0;
  const tugasSelesai = (stats.tugasSelesai || 0) + 1; // setelah submission ini
  // Harus persis mengikuti aturan streak di updateStats: naik kalau ontime, reset ke 0 kalau telat.
  // Tanpa cek ontime, siswa dengan streak 4 yang submit TELAT tetap dapat badge "On Fire" (streak 5)
  // padahal streak aslinya barusan direset jadi 0.
  const newStreak = submission.ontime ? (stats.streak || 0) + 1 : 0;
  const totalPerfectBefore = stats.perfectCount || 0;
  const totalPerfect = totalPerfectBefore + (nilai === 100 ? 1 : 0);
  const newPoin = (stats.poin || 0) + (submission.poinDapat || 0);
  const newLevel = getLevel(newPoin).id;

  // First tugas
  if (tugasSelesai === 1) earned.push("firstblood");

  // Prestasi (nilai)
  if (nilai === 100) earned.push("perfect");
  if (totalPerfect >= 5 && totalPerfectBefore < 5) earned.push("perfect5");
  if (totalPerfect >= 10 && totalPerfectBefore < 10) earned.push("perfect10");

  // Speed
  if (submission.ontime) {
    const msPub = submission.publishedAt ? Date.now() - submission.publishedAt : Infinity;
    if (msPub < 3 * 3600000) earned.push("fast");
  }

  // Streak milestones
  if (newStreak === 5) earned.push("onfire");
  if (newStreak === 10) earned.push("blazing");
  if (newStreak === 20) earned.push("inferno");

  // Tugas milestones
  if (tugasSelesai === 10) earned.push("rajin");
  if (tugasSelesai === 25) earned.push("scholar");
  if (tugasSelesai === 50) earned.push("veteran");

  // Ranking
  if (isTopClass) earned.push("topclass");
  if (isTopThree && !isTopClass) earned.push("podium");

  // Level milestones — award kalau qualified DAN belum punya badge-nya
  // (pakai ownedBadges biar aman kalau threshold diubah — siswa yang retroaktif melewati level tetap dapat)
  if (newLevel >= 5 && !ownedBadges.includes("lv5")) earned.push("lv5");
  if (newLevel >= 10 && !ownedBadges.includes("lv10")) earned.push("lv10");
  if (newLevel >= 15 && !ownedBadges.includes("lv15")) earned.push("lv15");
  if (newLevel >= 20 && !ownedBadges.includes("lv20")) earned.push("lv20");

  // XP milestones — same pattern
  if (newPoin >= 1000 && !ownedBadges.includes("xp1k")) earned.push("xp1k");
  if (newPoin >= 3000 && !ownedBadges.includes("xp5k")) earned.push("xp5k");
  if (newPoin >= 5000 && !ownedBadges.includes("xp10k")) earned.push("xp10k");

  return earned;
}

export function LevelCard({ poin, compact = false }) {
  const lv = getLevel(poin);
  const prog = getLevelProgress(poin);
  if (compact) return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: lv.bg, border: `1.5px solid ${lv.color}22` }}>
      <TierIcon tierId={lv.tierId} size={14} color={lv.color} />
      <span style={{ fontSize: 11, fontWeight: 700, color: lv.color }}>{lv.name}</span>
    </div>
  );
  return (
    <div style={{ background: lv.bg, border: `1.5px solid ${lv.color}33`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <TierIcon tierId={lv.tierId} size={26} color={lv.color} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: lv.color }}>{lv.name}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{lv.desc}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Level</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: lv.color, fontFamily: "var(--mono)" }}>{lv.id}</div>
        </div>
      </div>
      <div style={{ height: 6, background: "rgba(0,0,0,.08)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${prog.pct}%`, background: lv.color, borderRadius: 99, transition: "width .5s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{poin} XP</span>
        {prog.next ? <span style={{ fontSize: 10, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 4 }}>{prog.needed} lagi → <TierIcon tierId={prog.next.tierId} size={11} color="var(--ink-3)" /> {prog.next.name}</span>
          : <span style={{ fontSize: 10, color: lv.color, fontWeight: 700 }}>MAX LEVEL</span>}
      </div>
    </div>
  );
}

export function BadgeChip({ badgeId, size = "md" }) {
  const b = ALL_BADGES.find(x => x.id === badgeId);
  if (!b) return null;
  if (size === "sm") return (
    <div title={`${b.name}: ${b.desc}`} style={{ display: "inline-grid", placeItems: "center", cursor: "default" }}>
      <BadgeIcon type={b.icon} rim={b.rim} size={38} />
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 76, textAlign: "center" }}>
      <BadgeIcon type={b.icon} rim={b.rim} size={52} />
      <span style={{ fontSize: 10, fontWeight: 700, color: b.color, lineHeight: 1.3 }}>{b.name}</span>
    </div>
  );
}
export function BadgesRow({ badges = [], emptyText = "Belum ada badge" }) {
  if (!badges.length) return <div style={{ fontSize: 12, color: "var(--ink-4)", padding: "8px 0" }}>{emptyText}</div>;
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{badges.map(id => <BadgeChip key={id} badgeId={id} />)}</div>;
}

export function PoinChart({ data }) {
  if (!data || data.length < 2) return <div style={{ height: 80, display: "grid", placeItems: "center", color: "var(--ink-4)", fontSize: 12 }}>Belum ada data</div>;
  const max = Math.max(...data.map(d => d.poin), 1), min = Math.min(...data.map(d => d.poin)), range = max - min || 1;
  const W = 100, H = 60;
  const pts = data.map((d, i) => { const x = (i / (data.length - 1)) * W, y = H - ((d.poin - min) / range) * (H - 8) - 4; return `${x},${y}`; });
  const area = `${pts[0].split(",")[0]},${H} ${pts.join(" ")} ${pts[pts.length - 1].split(",")[0]},${H}`;
  return <div className="chart-wrap"><svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".2" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs><polygon points={area} fill="url(#cg)" /><polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}

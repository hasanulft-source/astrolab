// Astrolab — Visual/presentational components
// Extracted from App.jsx (Wave 1 Step 4)

import { useState, useEffect, useRef, useId } from "react";
import { I } from './icons';

// ─── Api Kristal (Nov 2026) ───
// 6 tingkat, naik tiap 10 hari, puncak di 50. Tiap tingkat: warna baru + detail tambahan
// (kilau → cahaya → warna kosmik), jadi naik tingkat terasa. Angka TIDAK digambar di dalam api;
// angka selalu ditulis di sebelah ikon oleh pemanggil.
export const FLAME_TIERS = [
  { min: 50, nama: "Kosmik",       kiri: ["#22d3ee", "#8b5cf6"], kanan: ["#7c3aed", "#db2777"], atas: ["#fde68a", "#f0abfc"], inti: "#fff7ed", kilau: "#fbbf24", cahaya: "rgba(217,70,239,.45)", nKilau: 3 },
  { min: 40, nama: "Magenta",      kiri: ["#f9a8d4", "#ec4899"], kanan: ["#be185d", "#831843"], atas: ["#fce7f3", "#f9a8d4"], inti: "#fdf2f8", kilau: "#f472b6", cahaya: "rgba(236,72,153,.38)", nKilau: 2 },
  { min: 30, nama: "Ungu",         kiri: ["#c4b5fd", "#8b5cf6"], kanan: ["#6d28d9", "#4c1d95"], atas: ["#ede9fe", "#c4b5fd"], inti: "#f5f3ff", kilau: "#a78bfa", cahaya: null, nKilau: 2 },
  { min: 20, nama: "Biru listrik", kiri: ["#93c5fd", "#3b82f6"], kanan: ["#1d4ed8", "#1e3a8a"], atas: ["#dbeafe", "#93c5fd"], inti: "#eff6ff", kilau: "#60a5fa", cahaya: null, nKilau: 1 },
  { min: 10, nama: "Cyan",         kiri: ["#67e8f9", "#06b6d4"], kanan: ["#0891b2", "#155e75"], atas: ["#cffafe", "#67e8f9"], inti: "#ecfeff", kilau: null, cahaya: null, nKilau: 0 },
  { min: 0,  nama: "Biru muda",    kiri: ["#bae6fd", "#7dd3fc"], kanan: ["#38bdf8", "#0369a1"], atas: ["#f0f9ff", "#bae6fd"], inti: "#f0f9ff", kilau: null, cahaya: null, nKilau: 0 },
];
export function getFlameTheme(streak) {
  return FLAME_TIERS.find(t => (streak || 0) >= t.min) || FLAME_TIERS[FLAME_TIERS.length - 1];
}
// Untuk teks motivasi: tingkat sekarang, tingkat berikutnya, dan sisa hari
export function infoTingkatApi(streak) {
  const n = streak || 0;
  const kini = getFlameTheme(n);
  const naik = [...FLAME_TIERS].reverse().find(t => t.min > n) || null;
  return { kini, berikut: naik, sisa: naik ? naik.min - n : 0 };
}
const KILAU_POS = [[41, 6, 1], [6, 10, 0.75], [43, 36, 0.6]];
const bintang = (x, y, k) => `M${x} ${y - 4 * k}l${1.1 * k} ${2.9 * k} ${2.9 * k} ${1.1 * k}-${2.9 * k} ${1.1 * k}L${x} ${y + 4 * k}l-${1.1 * k}-${2.9 * k}-${2.9 * k}-${1.1 * k} ${2.9 * k}-${1.1 * k}z`;
export function FlameAnimated({ size = 44, streak = 1 }) {
  const t = getFlameTheme(streak);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const g = k => `fk${uid}${k}`;
  const hidup = size >= 28;
  return (
    <svg width={size} height={Math.round(size * 1.17)} viewBox="0 -4 48 56" className={`flame-animated${hidup ? " hidup" : ""}`} role="img" aria-label={`Api streak tingkat ${t.nama}`}>
      <defs>
        <linearGradient id={g("l")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.kiri[0]} /><stop offset="1" stopColor={t.kiri[1]} /></linearGradient>
        <linearGradient id={g("r")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.kanan[0]} /><stop offset="1" stopColor={t.kanan[1]} /></linearGradient>
        <linearGradient id={g("t")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={t.atas[0]} /><stop offset="1" stopColor={t.atas[1]} /></linearGradient>
        {t.cahaya && <radialGradient id={g("c")}><stop offset="0" stopColor={t.cahaya} /><stop offset="1" stopColor={t.cahaya} stopOpacity="0" /></radialGradient>}
      </defs>
      {t.cahaya && <circle cx="24" cy="28" r="24" fill={`url(#${g("c")})`} />}
      <path d="M24 2L13 17L8 30L14 42L24 47L24 23Z" fill={`url(#${g("l")})`} />
      <path d="M24 2L35 17L40 30L34 42L24 47L24 23Z" fill={`url(#${g("r")})`} />
      <path d="M24 2L13 17L24 23Z" fill={`url(#${g("t")})`} />
      <path d="M24 2L35 17L24 23Z" fill={t.kiri[1]} opacity=".8" />
      <path d="M24 23L30 32L24 43L18 32Z" fill={t.inti} />
      <path d="M24 23L30 32L24 43Z" fill={t.kanan[0]} opacity=".28" />
      {t.min >= 50 && <path d="M13 17L8 30L14 26Z M35 17L40 30L34 26Z" fill="#fff" opacity=".22" />}
      {t.kilau && KILAU_POS.slice(0, t.nKilau).map(([x, y, k], i) => (
        <path key={i} className="fk-kilau" style={{ animationDelay: `${i * 0.6}s` }} d={bintang(x, y, k)} fill={t.kilau} />
      ))}
    </svg>
  );
}

// Comet flame trail dengan arrow tip di kanan, trail memanjang ke kiri.
// Level 2 animations: bloom breathing dramatic, layered flame pulse cepat,
// white core super-flicker (0.28s), 5 particle emit dari tip drift ke kiri,
// 3 trailing streak lines, arrow tip bob dengan bright ball scale pulse.
// Reusable di hero card dashboard & compact card result screen.
// Prop: streak (int), width (%), heightPx (int), rightPx & topPx (positioning).
export function StreakCometSVG({ streak, width = "70%", heightPx = 130, rightPx = 0, topPx = 0 }) {
  if (!streak || streak <= 0) return null;
  const t = getFlameTheme(streak);
  const uid = `sc${streak}-${heightPx}`;

  return (
    <svg style={{ position: "absolute", right: rightPx, top: topPx, height: heightPx, width, pointerEvents: "none" }} viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-outer`} x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor={t.outer[2]} stopOpacity="0" />
          <stop offset="40%" stopColor={t.outer[2]} stopOpacity="0.55" />
          <stop offset="80%" stopColor={t.outer[1]} stopOpacity="0.9" />
          <stop offset="100%" stopColor={t.outer[0]} />
        </linearGradient>
        <linearGradient id={`${uid}-mid`} x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor={t.outer[1]} stopOpacity="0" />
          <stop offset="50%" stopColor={t.outer[0]} stopOpacity="0.75" />
          <stop offset="100%" stopColor={t.inner[0]} />
        </linearGradient>
        <linearGradient id={`${uid}-inner`} x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor={t.inner[0]} stopOpacity="0" />
          <stop offset="60%" stopColor={t.inner[1]} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      {/* Background bloom — breathing dramatic */}
      <ellipse cx="600" cy="100" rx="220" ry="55" fill={t.outer[1]} opacity="0.18">
        <animate attributeName="rx" values="180;250;200;180" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.10;0.28;0.15;0.10" dur="1.8s" repeatCount="indefinite" />
      </ellipse>

      {/* 3 trailing streak lines (thin cyan/white) */}
      <line x1="770" y1="94" x2="150" y2="82" stroke={t.inner[0]} strokeWidth="1.2" opacity="0.35">
        <animate attributeName="opacity" values="0.15;0.55;0.25;0.15" dur="1.3s" repeatCount="indefinite" />
      </line>
      <line x1="770" y1="106" x2="120" y2="118" stroke={t.inner[1]} strokeWidth="1" opacity="0.3">
        <animate attributeName="opacity" values="0.1;0.5;0.2;0.1" dur="1.6s" repeatCount="indefinite" />
      </line>
      <line x1="765" y1="100" x2="200" y2="100" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.25">
        <animate attributeName="opacity" values="0.1;0.4;0.15;0.1" dur="1.1s" repeatCount="indefinite" />
      </line>

      {/* Layer 1 — Outer flame */}
      <path d="M 50 100 Q 200 68, 380 62 Q 550 52, 680 74 L 770 94 L 780 100 L 770 106 L 680 126 Q 550 146, 380 138 Q 200 132, 50 100 Z" fill={`url(#${uid}-outer)`}>
        <animate attributeName="opacity" values="0.82;1;0.88;1;0.82" dur="1.4s" repeatCount="indefinite" />
      </path>

      {/* Layer 2 — Mid blue */}
      <path d="M 100 100 Q 240 78, 400 76 Q 560 70, 680 88 L 760 100 L 680 112 Q 560 130, 400 124 Q 240 122, 100 100 Z" fill={`url(#${uid}-mid)`} opacity="0.9">
        <animate attributeName="opacity" values="0.7;1;0.8;1;0.7" dur="1s" repeatCount="indefinite" />
      </path>

      {/* Layer 3 — Inner cyan */}
      <path d="M 200 100 Q 320 86, 480 86 Q 600 83, 690 96 L 755 100 L 690 104 Q 600 117, 480 114 Q 320 114, 200 100 Z" fill={`url(#${uid}-inner)`} opacity="0.9">
        <animate attributeName="opacity" values="0.6;1;0.8;1;0.6" dur="0.6s" repeatCount="indefinite" />
      </path>

      {/* Layer 4 — White core spine (super flicker 0.28s) */}
      <path d="M 350 100 Q 480 96, 620 97 L 750 100 L 620 103 Q 480 104, 350 100 Z" fill="#FFFFFF" opacity="0.9">
        <animate attributeName="opacity" values="0.55;1;0.75;1;0.55" dur="0.28s" repeatCount="indefinite" />
      </path>

      {/* Sparks — static twinkle */}
      <circle cx="200" cy="70" r="2" fill={t.inner[1]}>
        <animate attributeName="opacity" values="0.3;1;0.5;0.3" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="320" cy="55" r="2.5" fill="#FFFFFF">
        <animate attributeName="opacity" values="1;0.4;0.8;1" dur="1.1s" repeatCount="indefinite" />
      </circle>
      <circle cx="450" cy="45" r="2" fill={t.inner[0]}>
        <animate attributeName="opacity" values="0.5;1;0.6;0.5" dur="1.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="580" cy="55" r="3" fill="#FFFFFF">
        <animate attributeName="opacity" values="0.7;0.3;1;0.7" dur="0.9s" repeatCount="indefinite" />
      </circle>
      <circle cx="700" cy="40" r="2" fill={t.inner[1]}>
        <animate attributeName="opacity" values="0.4;1;0.6;0.4" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="230" cy="140" r="1.8" fill={t.inner[0]}>
        <animate attributeName="opacity" values="0.6;0.2;0.9;0.6" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="380" cy="155" r="2.2" fill="#FFFFFF">
        <animate attributeName="opacity" values="0.4;1;0.5;0.4" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="540" cy="150" r="2" fill={t.inner[1]}>
        <animate attributeName="opacity" values="0.7;0.3;1;0.7" dur="1.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="680" cy="160" r="1.5" fill="#FFFFFF">
        <animate attributeName="opacity" values="1;0.4;0.7;1" dur="0.8s" repeatCount="indefinite" />
      </circle>

      {/* 5 emit particles — drift from arrow tip ke kiri */}
      <circle r="1.8" fill="#FFFFFF" opacity="0">
        <animate attributeName="opacity" values="0;1;0.6;0" dur="1.6s" repeatCount="indefinite" />
        <animateMotion path="M 770 95 L 100 88" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle r="1.5" fill={t.inner[1]} opacity="0">
        <animate attributeName="opacity" values="0;1;0.4;0" dur="1.9s" begin="0.3s" repeatCount="indefinite" />
        <animateMotion path="M 770 100 L 80 110" dur="1.9s" begin="0.3s" repeatCount="indefinite" />
      </circle>
      <circle r="1.8" fill={t.inner[0]} opacity="0">
        <animate attributeName="opacity" values="0;0.9;0.3;0" dur="2.2s" begin="0.7s" repeatCount="indefinite" />
        <animateMotion path="M 770 106 L 120 128" dur="2.2s" begin="0.7s" repeatCount="indefinite" />
      </circle>
      <circle r="1.2" fill="#FFFFFF" opacity="0">
        <animate attributeName="opacity" values="0;1;0.5;0" dur="1.4s" begin="1s" repeatCount="indefinite" />
        <animateMotion path="M 770 90 L 200 70" dur="1.4s" begin="1s" repeatCount="indefinite" />
      </circle>
      <circle r="1.6" fill={t.inner[1]} opacity="0">
        <animate attributeName="opacity" values="0;0.8;0.4;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
        <animateMotion path="M 770 110 L 90 140" dur="2s" begin="0.5s" repeatCount="indefinite" />
      </circle>

      {/* Arrow tip bright ball — bob + scale pulse */}
      <g>
        <circle cx="780" cy="100" r="4" fill="#FFFFFF" opacity="0.95">
          <animate attributeName="r" values="3.5;5;4;5;3.5" dur="0.5s" repeatCount="indefinite" />
        </circle>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-2; 0,1; 0,-1; 0,0" dur="0.7s" repeatCount="indefinite" />
      </g>
    </svg>
  );
}

// Dashboard pakai layout merged di HeroCard (langsung inline dengan Total Poin),
// bukan komponen ini. StreakCard ini dedicated untuk result screen compact.
export function StreakCard({ streak, compact = false, label }) {
  if (!streak || streak <= 0) return null;
  const t = getFlameTheme(streak);
  const h = compact ? 80 : 120;
  const numSize = compact ? 34 : 56;

  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(135deg, #0a1220 0%, #142338 60%, #1a3554 100%)",
      borderRadius: 16,
      padding: compact ? "14px 20px" : "20px 24px",
      height: h,
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      marginBottom: 12,
      boxShadow: `0 4px 20px ${t.glow}`,
    }}>
      {/* Angka streak di kiri */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: numSize, fontWeight: 500, color: "#ffffff", lineHeight: 1, fontFamily: "var(--mono)" }}>{streak}</span>
          <span style={{ fontSize: compact ? 16 : 22, color: t.inner[1], fontWeight: 500 }}>×</span>
          {compact && label && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginLeft: 6, fontWeight: 500 }}>{label}</span>}
        </div>
        {!compact && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500, marginTop: 4 }}>streak on fire</div>}
      </div>

      {/* Comet backdrop */}
      <StreakCometSVG streak={streak} width={compact ? "60%" : "70%"} heightPx={h} rightPx={0} topPx={0} />
    </div>
  );
}

export const AVC = [["#0d6b7a","#d8ebe9"],["#1e40af","#dbeafe"],["#7c3aed","#ede9fe"],["#b45309","#fef3c7"],["#0f766e","#ccfbf1"],["#c2410c","#ffedd5"]];
export function hn(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000; return h; }
export function inits(n) { const p = n.trim().split(/\s+/); return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase(); }
export function Avatar({ name, size = "md", photo = null }) {
  const [bg, fg] = AVC[hn(name || "?") % AVC.length];
  const px = { xs: 22, sm: 28, md: 36, lg: 48, xl: 64 }[size] || 36;
  const fs = Math.round(px * 0.35);
  if (photo) return <img src={photo} alt={name} className="av-photo" style={{ width: px, height: px }} />;
  return <span className="av" style={{ width: px, height: px }}><svg width={px} height={px} viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill={bg} /><text x="50" y="63" textAnchor="middle" fontFamily="Plus Jakarta Sans,sans-serif" fontWeight="700" fontSize={fs * (100 / px)} fill={fg}>{inits(name || "?")}</text></svg></span>;
}
// UserAvatar: auto-fetch foto dari store berdasarkan userId
export function UserAvatar({ userId, name, size = "md", store, showOnline = false }) {
  const photo = store ? store.getPhoto(userId) : null;
  const online = showOnline && store?.isOnline(userId);
  return (
    <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <Avatar name={name} size={size} photo={photo} />
      {online && <OnlineDot size={size === "sm" ? 8 : 10} style={{ position: "absolute", bottom: 0, right: 0 }} />}
    </div>
  );
}

export function OnlineDot({ size = 8, style = {} }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      borderRadius: "50%", background: "#0d9488",
      border: "1.5px solid var(--surface)",
      flexShrink: 0, ...style
    }} />
  );
}
export function Confirm({ title, desc, onOk, onCancel }) {
  return <div className="modal-overlay" onClick={onCancel}><div className="modal" onClick={e => e.stopPropagation()}><h3>{title}</h3><p>{desc}</p><div className="modal-actions"><button className="btn btn-outline btn-sm" onClick={onCancel}>Batal</button><button className="btn btn-danger btn-sm" onClick={onOk}>Hapus</button></div></div></div>;
}

// 4 elemen geometric tersusun membentuk huruf "A":
// - Apex rhombus (Astro) — visi, anchor sistem
// - Left + Right pillars (Lab) — eksekusi, daily work
// - Cross bar (Bridge) — pendidikan: penghubung visi & eksekusi
// Prop `onDark`: kalau true, render versi putih (untuk dark background).
export function LogoBold({ size = 32, onDark = false }) {
  const apex = "0,-11 5.5,-3.5 0,1 -5.5,-3.5";
  const left = "-5.5,-3.5 -2,3.5 -8,9 -11.5,2";
  const right = "5.5,-3.5 11.5,2 8,9 2,3.5";
  if (onDark) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32">
        <g transform="translate(16, 17)">
          <polygon points={apex} fill="#ffffff"/>
          <polygon points={left} fill="#ffffff" opacity="0.82"/>
          <polygon points={right} fill="#ffffff" opacity="0.82"/>
          <rect x="-3.5" y="1" width="7" height="2.2" rx="0.5" fill="#ffffff" opacity="0.55"/>
        </g>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <g transform="translate(16, 17)">
        <polygon points={apex} fill="#09637E"/>
        <polygon points={left} fill="#088395"/>
        <polygon points={right} fill="#088395"/>
        <rect x="-3.5" y="1" width="7" height="2.2" rx="0.5" fill="#7AB2B2"/>
      </g>
    </svg>
  );
}

// Dipakai di podium leaderboard rank 1-3. Intensity beda per rank:
// high (rank 1) = padat, 4 bentuk (rect/circle/star/streamer), 8 warna
// medium (rank 2) = jarang, 2 bentuk, 4 warna netral+gold
// low (rank 3) = jarang, 2 bentuk, 4 warna bronze+gold
// PENTING: pakai cancelAnimationFrame di cleanup — animasi WAJIB berhenti
// begitu komponen unmount (siswa pindah halaman), supaya gak jalan terus di background.
export function ConfettiRain({ intensity = "high" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const presets = {
      high: { colors: ["#fbbf24", "#f97316", "#ef4444", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#06b6d4"], spawnRate: 4, spawnCount: 3, stars: true, streamers: true },
      medium: { colors: ["#94a3b8", "#fbbf24", "#10b981", "#e2e8f0"], spawnRate: 10, spawnCount: 1, stars: false, streamers: false },
      low: { colors: ["#cd7f32", "#fbbf24", "#ef4444", "#f0c987"], spawnRate: 9, spawnCount: 1, stars: false, streamers: false },
    };
    const opts = presets[intensity] || presets.medium;
    let particles = [];
    let t = 0;

    function spawn() {
      const shapeRoll = Math.random();
      let shape = "rect";
      if (opts.stars && shapeRoll < 0.25) shape = "star";
      else if (opts.streamers && shapeRoll < 0.4) shape = "streamer";
      else if (shapeRoll > 0.7) shape = "circle";
      particles.push({
        x: Math.random() * rect.width,
        y: -10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 1.5 + 1.5,
        size: Math.random() * 6 + 4,
        color: opts.colors[Math.floor(Math.random() * opts.colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8,
        shape,
        sway: Math.random() * 2,
        swayPhase: Math.random() * Math.PI * 2,
      });
    }

    function drawStar(size) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = Math.cos(angle) * size / 2;
        const y = Math.sin(angle) * size / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    function animate() {
      t++;
      if (t % opts.spawnRate === 0) {
        for (let i = 0; i < opts.spawnCount; i++) spawn();
      }
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y += p.vy;
        p.x += Math.sin(t * 0.05 + p.swayPhase) * p.sway * 0.3;
        p.rotation += p.rotSpeed;
        if (p.y > rect.height + 20) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        else if (p.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        else if (p.shape === "star") drawStar(p.size * 1.3);
        else if (p.shape === "streamer") ctx.fillRect(-p.size / 6, -p.size * 1.2, p.size / 3, p.size * 2.4);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [intensity]);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: -60, left: 0, width: "100%", height: "calc(100% + 60px)", pointerEvents: "none", zIndex: 1 }} />;
}

export function CelebrationAvatar({ userId, name, size, store }) {
  const [tick, setTick] = useState(0);
  // Reset konfeti setiap 6 detik supaya loop terus
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 6000);
    return () => clearInterval(t);
  }, []);

  const COLORS = ["#fbbf24","#f97316","#10b981","#3b82f6","#a855f7","#ec4899","#ef4444","#06b6d4"];
  const confettiPieces = Array.from({ length: 12 }, (_, i) => ({
    id: `${tick}-${i}`,
    color: COLORS[i % COLORS.length],
    left: 5 + (i * 8) % 90,
    delay: i * 0.18,
    tx: (i % 2 === 0 ? 1 : -1) * (8 + (i * 9) % 35),
    shape: i % 3,
    size: 4 + (i % 3) * 2,
  }));

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {/* Konfeti pieces */}
      {confettiPieces.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          width: p.shape === 0 ? p.size : p.size - 1,
          height: p.shape === 1 ? p.size * 1.8 : p.size,
          borderRadius: p.shape === 2 ? "50%" : 2,
          background: p.color,
          left: `${p.left}%`,
          top: "0%",
          "--tx": `${p.tx}px`,
          animation: `confetti-side ${0.9 + p.delay * 0.6}s ease-out ${p.delay * 0.25}s forwards`,
          pointerEvents: "none",
          zIndex: 10,
          opacity: 0,
        }} />
      ))}
      {/* Ring gold permanen */}
      <div style={{
        position: "absolute",
        inset: -5,
        borderRadius: "50%",
        border: "2.5px solid #fbbf24",
        animation: "podium-glow 1.8s ease-in-out infinite",
        pointerEvents: "none",
      }} />
      <UserAvatar userId={userId} name={name} size={size} store={store} />
    </div>
  );
}

export function MapelIcon({ mapel, size = 24 }) {
  if (mapel === "IPA") return <I n="atom" s={size} />;
  return <I n="code" s={size} />;
}

export function Card({ children, cls = "", style, pad = "p", ...rest }) {

  const p = { p: "cp", lg: "clg", none: "cn" }[pad] || "cp";

  return <div className={`card ${p} ${cls}`} style={style} {...rest}>{children}</div>;

}

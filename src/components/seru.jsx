// Astrolab — lapisan gamifikasi (redesign, Okt 2026)
// Aturan: tampilan kerja (kartu, teks, status, nilai) tetap teal & tenang. Warna "game" hanya dipakai untuk
// momen gamifikasi: peringkat (emas/perak/perunggu), level (warna tier), streak (api), badge, sorotan, perayaan.
import { getLevel, getLevelProgress, TierIcon } from "./gamification";
import { FlameAnimated } from "./visual";
import "../styles/seru.css";

// Medali peringkat 1–3, angka biasa untuk sisanya
export function Medal({ rank, size = "md" }) {
  const cls = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "plain";
  return <span className={`sr-medal ${cls} ${size}`} aria-label={`Peringkat ${rank}`}>{rank}</span>;
}

// Level dengan warna tier: ikon tier + nama + bar berwarna tier
export function LevelStrip({ poin = 0, onDark = false }) {
  const lv = getLevel(poin), prog = getLevelProgress(poin);
  return (
    <div className={`sr-level${onDark ? " dark" : ""}`} style={{ "--tier": lv.color, "--tier-bg": lv.bg, "--tier-accent": lv.accent || lv.color }}>
      <span className="sr-level-ic"><TierIcon tierId={lv.tierId} size={26} color={lv.color} /></span>
      <div className="sr-level-main">
        <div className="sr-level-row"><b>{lv.name}</b><span>{prog.next ? `${prog.needed.toLocaleString("id-ID")} poin lagi ke ${prog.next.name}` : "Level tertinggi"}</span></div>
        <div className="sr-level-bar"><i style={{ width: `${prog.next ? prog.pct : 100}%` }} /></div>
      </div>
    </div>
  );
}

// Angka streak dengan api (api Astrolab: biru-cyan yang makin "panas" seiring streak)
export function StreakValue({ streak = 0 }) {
  if (!streak) return <span className="sr-streak off">0 <small>hari</small></span>;
  return <span className="sr-streak"><FlameAnimated size={20} streak={streak} /><span>{streak} <small>hari</small></span></span>;
}

// Hiasan orbit + bintang untuk kartu teal (dekorasi saja, tidak dibaca pembaca layar)
export function Orbit() {
  return (
    <svg className="sr-orbit" viewBox="0 0 240 160" aria-hidden="true" preserveAspectRatio="xMaxYMin slice">
      <circle cx="210" cy="10" r="70" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1.2" />
      <circle cx="210" cy="10" r="112" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.2" strokeDasharray="3 6" />
      <circle cx="150" cy="12" r="3.6" fill="#F6C453" />
      <circle cx="226" cy="58" r="2.6" fill="rgba(255,255,255,.7)" />
      <path d="M118 16l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4z" fill="rgba(255,255,255,.45)" />
    </svg>
  );
}

// Ikon berwarna untuk sorotan/pencapaian. tone: gold | flame | sky | violet | teal
export function GameIcon({ tone = "gold", children }) {
  return <span className={`sr-ic ${tone}`} aria-hidden="true">{children}</span>;
}

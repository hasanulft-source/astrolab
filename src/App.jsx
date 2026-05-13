// Cendekia IPA — Leaderboard System
// SMP Negeri 15 Banda Aceh
// Unified single-file React artifact

import { useState, useEffect, useMemo, useRef, useCallback } from "react";

// ============================================================
// STYLES
// ============================================================
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --accent: #0d6b7a;
  --accent-2: #0a525c;
  --accent-soft: #d8ebe9;
  --accent-tint: #d8ebe9;
  --accent-ink: #0a525c;
  --surface: #ffffff;
  --surface-alt: #f7f8fa;
  --bg: #f2f4f6;
  --line: #e2e6ea;
  --line-soft: #edf0f3;
  --ink: #1a1c1e;
  --ink-2: #3a3d42;
  --ink-3: #6b7280;
  --ink-4: #9ca3af;
  --good: #16a34a;
  --warn: #d97706;
  --bad: #dc2626;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04);
  --shadow: 0 4px 12px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-xs: 5px;
  --font: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'DM Mono', monospace;
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --nav-h: 60px;
}

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

/* APP SHELL */
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-header {
  position: sticky; top: 0; z-index: 100;
  background: var(--accent);
  color: white;
  padding: 0 20px;
  height: 52px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 2px 8px rgba(13,107,122,.25);
}
.app-header-brand { display: flex; align-items: center; gap: 10px; }
.app-header-mark {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(255,255,255,.2);
  display: grid; place-items: center;
  font-weight: 800; font-size: 15px; letter-spacing: -.02em;
  backdrop-filter: blur(4px);
}
.app-header-name { line-height: 1.2; }
.app-header-name b { font-size: 13px; font-weight: 700; display: block; }
.app-header-name small { font-size: 10px; opacity: .7; }

.content-area { flex: 1; display: flex; }

/* SIDEBAR */
.side-rail {
  display: none;
  width: 200px; flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--line);
  padding: 16px 10px;
  position: sticky; top: 52px;
  height: calc(100vh - 52px);
  overflow-y: auto;
  flex-direction: column;
}
@media(min-width: 768px) { .side-rail { display: flex; } }

.side-link {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 500; color: var(--ink-2);
  cursor: pointer; transition: all .15s;
}
.side-link:hover { background: var(--surface-alt); }
.side-link.active { background: var(--accent-soft); color: var(--accent-2); font-weight: 600; }
.side-link .ico { flex-shrink: 0; }
.side-foot { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--line-soft); }
.side-user { display: flex; align-items: center; gap: 10px; padding: 8px 4px; }
.side-user-name { font-size: 12px; font-weight: 600; }
.side-user-meta { font-size: 10px; color: var(--ink-3); }

/* MAIN */
.main-area { flex: 1; min-width: 0; padding-bottom: 80px; }
@media(min-width: 768px) { .main-area { padding-bottom: 24px; } }

/* BOTTOM NAV */
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 90;
  background: var(--surface);
  border-top: 1px solid var(--line);
  display: flex;
  height: var(--nav-h);
  padding: 0 4px;
}
@media(min-width: 768px) { .bottom-nav { display: none; } }
.bottom-nav-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px;
  font-size: 10px; font-weight: 500; color: var(--ink-3);
  background: none; border: none; cursor: pointer;
  transition: color .15s; padding: 8px 4px;
}
.bottom-nav-item.active { color: var(--accent); }
.bottom-nav-item.active .ico { color: var(--accent); }

/* TOPBAR */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; gap: 12px; position: sticky; top: 52px; z-index: 50;
  background: var(--bg);
}
.topbar.with-border { border-bottom: 1px solid var(--line-soft); background: var(--surface); }
@media(min-width: 768px) { .topbar { display: none; } }
.topbar-title { font-size: 15px; font-weight: 700; flex: 1; text-align: center; }
.topbar-back {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--surface-alt); border: none; cursor: pointer;
  display: grid; place-items: center; color: var(--ink-2); flex-shrink: 0;
}

/* PAGE */
.page-pad { padding: 16px; }
@media(min-width: 768px) { .page-pad { padding: 24px 28px; } }
.desktop-title { display: none; margin-bottom: 20px; }
@media(min-width: 768px) { .desktop-title { display: flex; align-items: flex-start; justify-content: space-between; } }
.desktop-title h1 { font-size: 22px; font-weight: 800; letter-spacing: -.02em; }
.desktop-title p { font-size: 13px; color: var(--ink-3); margin-top: 2px; }

/* CARD */
.card {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--line-soft);
  padding: 16px;
}
.card.pad-lg { padding: 20px; }
.card.pad-none { padding: 0; }

/* TABS */
.tabs { display: flex; gap: 4px; background: var(--surface-alt); padding: 4px; border-radius: var(--radius-sm); width: fit-content; }
.tab {
  padding: 6px 14px; border-radius: var(--radius-xs); font-size: 13px;
  font-weight: 500; color: var(--ink-3); border: none; background: none;
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.tab.active { background: var(--surface); color: var(--ink); font-weight: 600; box-shadow: var(--shadow-sm); }

/* CHIPS */
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 99px; font-size: 11px;
  font-weight: 500; background: var(--surface-alt);
  color: var(--ink-2); border: 1px solid var(--line);
}
.chip-accent { background: var(--accent-soft); color: var(--accent-2); border-color: transparent; }
.chip-good { background: oklch(0.95 0.05 155); color: oklch(0.35 0.12 155); border-color: transparent; }
.chip-warn { background: oklch(0.97 0.06 85); color: oklch(0.45 0.13 85); border-color: transparent; }
.chip-bad { background: oklch(0.96 0.05 25); color: oklch(0.42 0.15 25); border-color: transparent; }

/* BUTTONS */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 600; font-family: var(--font);
  cursor: pointer; border: none; transition: all .15s; white-space: nowrap;
}
.btn-primary { background: var(--accent); color: white; }
.btn-primary:hover { background: var(--accent-2); }
.btn-outline { background: transparent; color: var(--ink-2); border: 1px solid var(--line); }
.btn-outline:hover { background: var(--surface-alt); }
.btn-soft { background: var(--surface-alt); color: var(--ink-2); }
.btn-sm { padding: 5px 12px; font-size: 12px; }

/* LEADERBOARD */
.lb-row {
  display: grid;
  grid-template-columns: 36px 40px 1fr auto auto;
  align-items: center; gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--line-soft);
  transition: background .15s;
}
.lb-row:last-child { border-bottom: none; }
.lb-row.me { background: var(--accent-soft); }
.lb-row:hover { background: var(--surface-alt); }
.lb-rank {
  font-family: var(--font-mono); font-size: 13px;
  font-weight: 600; color: var(--ink-3); text-align: center;
}
.lb-rank.top1 { color: oklch(0.6 0.18 85); }
.lb-rank.top2 { color: oklch(0.55 0.02 264); }
.lb-rank.top3 { color: oklch(0.55 0.1 50); }
.lb-name { font-size: 14px; font-weight: 500; }
.lb-meta { font-size: 11px; color: var(--ink-3); margin-top: 1px; }
.lb-points { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--accent-2); }

/* STAT */
.stat-num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

/* SECTION HEADER */
.section-h {
  display: flex; align-items: center; justify-content: space-between;
  margin: 20px 0 10px;
}
.section-h h2 { font-size: 14px; font-weight: 700; }

/* PROGRESS */
.progress {
  height: 6px; background: var(--surface-alt);
  border-radius: 99px; overflow: hidden;
}
.progress > div {
  height: 100%; background: var(--accent);
  border-radius: 99px; transition: width .4s ease;
}

/* ROW */
.row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line-soft);
}
.row:last-child { border-bottom: none; }
.row-main { flex: 1; min-width: 0; }
.row-title { font-size: 13px; font-weight: 500; }
.row-sub { font-size: 11px; color: var(--ink-3); margin-top: 1px; }

/* DELTA */
.delta { font-family: var(--font-mono); font-size: 11px; font-weight: 600; }
.delta.pos { color: var(--good); }
.delta.neg { color: var(--bad); }
.delta.neu { color: var(--ink-4); }

/* EMPTY */
.empty { text-align: center; padding: 40px 20px; color: var(--ink-3); font-size: 13px; }

/* GRID */
.grid-2 { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media(min-width: 640px) { .grid-2 { grid-template-columns: 1fr 1fr; } }

/* AVATAR */
.avatar { border-radius: 50%; overflow: hidden; flex-shrink: 0; display: inline-block; }
.avatar-sm { width: 28px; height: 28px; }
.avatar-md { width: 36px; height: 36px; }
.avatar-lg { width: 48px; height: 48px; }
.avatar-xl { width: 64px; height: 64px; }

/* LOGIN */
.login-wrap {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--accent) 0%, #0a4a56 100%);
  padding: 20px;
}
.login-card {
  background: white; border-radius: 20px; padding: 32px 28px;
  width: 100%; max-width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
.login-logo {
  width: 56px; height: 56px; border-radius: 16px;
  background: var(--accent); color: white;
  display: grid; place-items: center;
  font-size: 24px; font-weight: 800; margin-bottom: 20px;
}
.login-title { font-size: 22px; font-weight: 800; letter-spacing: -.02em; }
.login-sub { font-size: 13px; color: var(--ink-3); margin-top: 4px; }
.form-group { margin-top: 16px; }
.form-label { font-size: 12px; font-weight: 600; color: var(--ink-2); margin-bottom: 6px; display: block; }
.form-input {
  width: 100%; padding: 10px 14px; border-radius: var(--radius-sm);
  border: 1.5px solid var(--line); font-family: var(--font); font-size: 14px;
  background: var(--surface); color: var(--ink); outline: none;
  transition: border-color .15s;
}
.form-input:focus { border-color: var(--accent); }
.quick-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.quick-btn {
  padding: 5px 12px; border-radius: 99px; border: 1.5px solid var(--line);
  font-size: 12px; font-weight: 500; cursor: pointer; background: var(--surface-alt);
  color: var(--ink-2); transition: all .15s; font-family: var(--font);
}
.quick-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.error-msg { font-size: 12px; color: var(--bad); margin-top: 8px; }

/* CHART SVG */
.chart-wrap { width: 100%; height: 140px; position: relative; }

/* BADGE BLOB */
.badge-blob { transition: transform .15s, box-shadow .15s; }
.badge-blob:hover { transform: translateY(-1px); box-shadow: var(--shadow); }

/* PODIUM */
.podium-wrap { display: flex; align-items: flex-end; justify-content: space-around; gap: 8px; padding-top: 16px; }

/* MOBILE ONLY / DESKTOP ONLY */
.mobile-only { display: flex; }
@media(min-width: 768px) { .mobile-only { display: none !important; } }
.desktop-only { display: none; }
@media(min-width: 768px) { .desktop-only { display: block; } }

/* FOOTER */
.app-footer {
  text-align: center; font-size: 11px; color: var(--ink-4);
  padding: 16px; border-top: 1px solid var(--line-soft);
  background: var(--surface); display: none;
}
@media(min-width: 768px) { .app-footer { display: block; } }

/* TASK TAKING SCREEN */
.quiz-opt {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: var(--radius-sm);
  border: 1.5px solid var(--line); background: var(--surface);
  cursor: pointer; transition: all .15s; text-align: left;
  font-family: var(--font); font-size: 14px; width: 100%;
  margin-bottom: 8px;
}
.quiz-opt:hover { border-color: var(--accent); background: var(--accent-soft); }
.quiz-opt.selected { border-color: var(--accent); background: var(--accent-soft); font-weight: 600; }
.quiz-opt.correct { border-color: var(--good); background: oklch(0.95 0.05 155); }
.quiz-opt.wrong { border-color: var(--bad); background: oklch(0.96 0.05 25); }
.quiz-num { font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); margin-bottom: 8px; }

/* AVATAR PICKER */
.avatar-picker-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.5);
  z-index: 200; display: flex; align-items: flex-end; justify-content: center;
}
@media(min-width: 600px) { .avatar-picker-overlay { align-items: center; } }
.avatar-picker-sheet {
  background: white; border-radius: 20px 20px 0 0; padding: 24px;
  width: 100%; max-width: 480px;
}
@media(min-width: 600px) { .avatar-picker-sheet { border-radius: 20px; } }
.avatar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
.avatar-option { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.avatar-option.active .avatar { box-shadow: 0 0 0 3px var(--accent); }
.avatar-option-label { font-size: 10px; color: var(--ink-3); text-align: center; }

/* TWEAKS PANEL */
.tweaks-fab {
  position: fixed; bottom: 80px; right: 16px; z-index: 150;
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--accent); color: white; border: none;
  display: grid; place-items: center; cursor: pointer;
  box-shadow: 0 4px 14px rgba(13,107,122,.4); transition: transform .15s;
}
.tweaks-fab:hover { transform: scale(1.05); }
@media(min-width: 768px) { .tweaks-fab { bottom: 24px; } }
.tweaks-panel {
  position: fixed; bottom: 130px; right: 16px; z-index: 149;
  background: white; border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,.15);
  padding: 16px; width: 220px;
  border: 1px solid var(--line);
}
@media(min-width: 768px) { .tweaks-panel { bottom: 80px; } }
.tweaks-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); margin-bottom: 12px; }
.tweaks-section { font-size: 11px; font-weight: 600; color: var(--ink-3); margin: 12px 0 6px; text-transform: uppercase; letter-spacing: .05em; }
.tweaks-row { display: flex; gap: 6px; flex-wrap: wrap; }
.tweak-btn {
  padding: 5px 10px; border-radius: 99px; border: 1.5px solid var(--line);
  font-size: 11px; font-weight: 500; cursor: pointer; background: var(--surface-alt);
  color: var(--ink-2); transition: all .15s; font-family: var(--font);
}
.tweak-btn.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-2); }
.color-swatch {
  width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent;
  cursor: pointer; transition: transform .15s;
}
.color-swatch.active { border-color: var(--ink); transform: scale(1.15); }
`;

// ============================================================
// DATA
// ============================================================
const NAMA_DEPAN_L = ['Yusuf','Rafi','Aldo','Bima','Faris','Galih','Hafiz','Iqbal','Kemal','Luthfi','Naufal','Reza','Syahrul','Taufik','Zaki','Arman','Dimas','Ferdi','Gilang','Haikal','Iqra','Jihan','Khairul','Maulana','Nizam','Putra','Rian','Satria','Tirta','Umar','Wahyu','Yoga'];
const NAMA_DEPAN_P = ['Aisyah','Bilqis','Cut Nadia','Dinda','Elsa','Farah','Ghina','Hana','Indira','Jasmine','Khansa','Laila','Maira','Nabila','Olivia','Putri','Qonita','Rania','Salsa','Talita','Ulya','Vania','Widya','Yumna','Zahra','Adelia','Bunga','Citra','Dewi','Elsa','Fitri','Gita'];
const MARGA = ['Pratama','Saputra','Hidayat','Maulana','Ramadhan','Iskandar','Hasanah','Anggraini','Safitri','Lestari','Nasution','Harahap','Siregar','Lubis','Tanjung','Daud','Yusra','Mahmud','Rahman','Karim','Syahputra','Aulia','Fadhilah','Ramadhani','Permata','Ariffin','Husna','Zulfikar'];

function makeRng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const rng = makeRng(42);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

function makeSiswa(jenjang, idx) {
  const isL = rng() > 0.48;
  const depan = isL ? pick(NAMA_DEPAN_L) : pick(NAMA_DEPAN_P);
  const belakang = pick(MARGA);
  const nama = `${depan} ${belakang}`;
  const poin = Math.floor(800 + Math.pow(rng(), 1.6) * 4200);
  const streak = Math.floor(rng() * 18);
  const deltaMinggu = Math.floor((rng() - 0.4) * 12);
  return {
    id: `${jenjang}-${idx}`,
    nama, jenjang,
    kelas: `${jenjang}-${['A','B'][idx % 2]}`,
    poin, streak, deltaMinggu,
    tugasSelesai: Math.floor(8 + rng() * 14),
    tugasTotal: 22,
    nilaiRata: Math.floor(70 + rng() * 28),
    badges: [], role: 'siswa',
  };
}

let SISWA = [];
for (let i = 0; i < 32; i++) SISWA.push(makeSiswa('VII', i + 1));
for (let i = 0; i < 32; i++) SISWA.push(makeSiswa('VIII', i + 1));

function rankInJenjang(jenjang) {
  const arr = SISWA.filter(s => s.jenjang === jenjang).sort((a, b) => b.poin - a.poin);
  arr.forEach((s, i) => { s.rank = i + 1; });
  return arr;
}
rankInJenjang('VII');
rankInJenjang('VIII');

SISWA.forEach(s => {
  const b = [];
  if (s.streak >= 10) b.push({ id: 'streak', label: 'Konsisten', icon: '🔥' });
  if (s.rank <= 3) b.push({ id: 'top3', label: 'Top 3', icon: '⭐' });
  if (s.deltaMinggu >= 5) b.push({ id: 'rising', label: 'Naik Drastis', icon: '⚡' });
  if (s.nilaiRata >= 90) b.push({ id: 'sempurna', label: 'Penalar Hebat', icon: '🧠' });
  if (s.tugasSelesai >= 18) b.push({ id: 'rajin', label: 'Rajin Latihan', icon: '📚' });
  s.badges = b;
});

// Fix "Yusuf" as the default logged-in student
const yusuf = SISWA.find(s => s.nama.startsWith('Yusuf') && s.jenjang === 'VII');
const RANK_VII_SORTED = SISWA.filter(s => s.jenjang === 'VII').sort((a, b) => b.poin - a.poin);
if (yusuf) {
  yusuf.poin = RANK_VII_SORTED[3].poin + 10;
  yusuf.streak = 12;
  yusuf.deltaMinggu = 3;
}
rankInJenjang('VII');
const ME_ID = yusuf ? yusuf.id : SISWA[0].id;

const GURU = {
  id: 'guru-1', nama: 'Bu Anissa',
  namaPanjang: 'Anissa Mardhiah, S.Pd',
  role: 'guru', mapel: 'IPA',
  sekolah: 'SMP Negeri 15 Banda Aceh',
};

const TUGAS = [
  {
    id: 't1', judul: 'Sistem Tata Surya', jenjang: 'VII', bab: 'Bab 6 — Tata Surya',
    deadline: '2026-05-14', poinMax: 100, durasi: 20, tipe: 'pilihan-ganda',
    deskripsi: 'Latihan tentang urutan planet, ciri-ciri, dan revolusi planet di tata surya kita.',
    soal: [
      { tipe: 'pg', q: 'Planet manakah yang dijuluki "Planet Merah"?', opt: ['Venus','Mars','Jupiter','Saturnus'], jawaban: 1 },
      { tipe: 'pg', q: 'Planet yang memiliki cincin paling jelas terlihat adalah...', opt: ['Jupiter','Saturnus','Uranus','Neptunus'], jawaban: 1 },
      { tipe: 'pg', q: 'Planet terdekat dari Matahari adalah...', opt: ['Venus','Bumi','Merkurius','Mars'], jawaban: 2 },
      { tipe: 'pg', q: 'Planet terbesar di tata surya adalah...', opt: ['Saturnus','Jupiter','Neptunus','Uranus'], jawaban: 1 },
    ],
    status: 'aktif', sudahKerja: 18, totalSiswa: 32,
  },
  {
    id: 't2', judul: 'Klasifikasi Makhluk Hidup', jenjang: 'VII', bab: 'Bab 4 — Keanekaragaman Hayati',
    deadline: '2026-05-10', poinMax: 100, durasi: 25,
    deskripsi: 'Mengenal kingdom dan ciri-ciri makhluk hidup berdasarkan klasifikasinya.',
    soal: [], status: 'lewat-deadline', sudahKerja: 28, totalSiswa: 32,
  },
  {
    id: 't3', judul: 'Sifat Cahaya & Pembiasan', jenjang: 'VIII', bab: 'Bab 11 — Cahaya & Optik',
    deadline: '2026-05-15', poinMax: 100, durasi: 30,
    deskripsi: 'Pembiasan, pemantulan, dan sifat-sifat cahaya pada lensa cembung dan cekung.',
    soal: [], status: 'aktif', sudahKerja: 11, totalSiswa: 32,
  },
  {
    id: 't4', judul: 'Gerak Lurus Beraturan', jenjang: 'VIII', bab: 'Bab 5 — Gerak & Gaya',
    deadline: '2026-05-18', poinMax: 100, durasi: 20,
    deskripsi: 'Latihan rumus GLB, kecepatan, dan jarak.',
    soal: [], status: 'aktif', sudahKerja: 6, totalSiswa: 32,
  },
  {
    id: 't5', judul: 'Lapisan Bumi', jenjang: 'VII', bab: 'Bab 7 — Bumi & Lapisannya',
    deadline: '2026-05-22', poinMax: 100, durasi: 15,
    deskripsi: 'Struktur lapisan bumi dari kerak sampai inti.',
    soal: [], status: 'aktif', sudahKerja: 3, totalSiswa: 32,
  },
  {
    id: 't6', judul: 'Pesawat Sederhana', jenjang: 'VIII', bab: 'Bab 8 — Pesawat Sederhana',
    deadline: '2026-04-28', poinMax: 100, durasi: 25,
    deskripsi: 'Tuas, katrol, bidang miring — dan keuntungan mekanisnya.',
    soal: [], status: 'selesai', sudahKerja: 31, totalSiswa: 32,
  },
];

const RIWAYAT_AKTIVITAS = [
  { id: 'a1', tanggal: '2026-05-07', tugas: 'Sistem Tata Surya', poin: 80, nilai: 80 },
  { id: 'a2', tanggal: '2026-05-04', tugas: 'Klasifikasi Makhluk Hidup', poin: 95, nilai: 95 },
  { id: 'a3', tanggal: '2026-04-30', tugas: 'Ciri-ciri Makhluk Hidup', poin: 70, nilai: 70 },
  { id: 'a4', tanggal: '2026-04-25', tugas: 'Pengukuran', poin: 100, nilai: 100, bonus: 'Sempurna' },
  { id: 'a5', tanggal: '2026-04-21', tugas: 'Suhu & Kalor', poin: 85, nilai: 85 },
];

const PENGUMUMAN = [
  { id: 'p1', dari: 'Bu Anissa', tanggal: 'hari ini', text: 'Tugas Tata Surya sudah dibuka. Deadline Rabu malam ya, jangan kebut subuh 😅' },
  { id: 'p2', dari: 'Bu Anissa', tanggal: '2 hari lalu', text: 'Selamat untuk Cut Nadia, peraih poin tertinggi minggu ini di kelas VII!' },
];

function getSiswaByJenjang(j) {
  return SISWA.filter(s => s.jenjang === j).sort((a, b) => b.poin - a.poin);
}
function getTugasByJenjang(j) { return TUGAS.filter(t => t.jenjang === j); }

function genRiwayat(targetPoin) {
  const rng2 = makeRng(targetPoin);
  const data = [];
  let cum = 0;
  for (let i = 0; i < 16; i++) {
    const inc = Math.floor(targetPoin / 16 + (rng2() - 0.5) * 80);
    cum += Math.max(0, inc);
    data.push({ minggu: i + 1, poin: cum });
  }
  const factor = targetPoin / (cum || 1);
  return data.map(d => ({ ...d, poin: Math.floor(d.poin * factor) }));
}

function getPrestasiMingguan(jenjang) {
  const pool = SISWA.filter(s => s.jenjang === jenjang);
  const naik = [...pool].sort((a, b) => b.deltaMinggu - a.deltaMinggu)[0];
  const konsisten = [...pool].sort((a, b) => b.streak - a.streak)[0];
  const aktif = [...pool].sort((a, b) => b.tugasSelesai - a.tugasSelesai)[0];
  return [
    { kategori: 'Naik Tertinggi', icon: '⚡', siswa: naik, value: `+${naik.deltaMinggu} posisi` },
    { kategori: 'Paling Konsisten', icon: '🔥', siswa: konsisten, value: `${konsisten.streak} hari streak` },
    { kategori: 'Paling Aktif', icon: '📚', siswa: aktif, value: `${aktif.tugasSelesai} tugas` },
  ];
}

function fmtDeadline(dl) {
  const now = new Date('2026-05-11');
  const d = new Date(dl);
  const diff = Math.round((d - now) / 86400000);
  if (diff < 0) return { label: 'Lewat deadline', tone: 'bad' };
  if (diff === 0) return { label: 'Hari ini!', tone: 'warn' };
  if (diff === 1) return { label: 'Besok', tone: 'warn' };
  if (diff <= 3) return { label: `${diff} hari lagi`, tone: 'warn' };
  return { label: `${diff} hari lagi`, tone: 'neutral' };
}

// ============================================================
// AVATAR PRESETS (simplified geometric)
// ============================================================
const AVATAR_COLORS = [
  { bg: '#0d6b7a', fg: '#d8ebe9' }, { bg: '#f59e0b', fg: '#451a03' },
  { bg: '#15803d', fg: '#dcfce7' }, { bg: '#1f2937', fg: '#e5e7eb' },
  { bg: '#fb7185', fg: '#4c0519' }, { bg: '#4338ca', fg: '#e0e7ff' },
  { bg: '#7e22ce', fg: '#faf5ff' }, { bg: '#0ea5e9', fg: '#082f49' },
  { bg: '#65a30d', fg: '#1a2e05' }, { bg: '#e11d48', fg: '#fff1f2' },
  { bg: '#0f766e', fg: '#ccfbf1' }, { bg: '#475569', fg: '#f1f5f9' },
  { bg: '#facc15', fg: '#422006' }, { bg: '#10b981', fg: '#022c22' },
  { bg: '#07363d', fg: '#a7f3d0' }, { bg: '#e7e5e4', fg: '#1c1917' },
];

function nameHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}
function initials(nama) {
  const parts = nama.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// localStorage for avatar picks
const AVATAR_KEY = 'cendekia.avatars.v1';
function getStoredAvatars() {
  try { return JSON.parse(localStorage.getItem(AVATAR_KEY) || '{}'); } catch { return {}; }
}
function setStoredAvatar(id, colorIdx) {
  const m = getStoredAvatars();
  m[id] = colorIdx;
  localStorage.setItem(AVATAR_KEY, JSON.stringify(m));
  window.dispatchEvent(new CustomEvent('avatar-changed'));
}
function getColorFor(siswa) {
  if (!siswa) return AVATAR_COLORS[0];
  const m = getStoredAvatars();
  const idx = m[siswa.id] !== undefined ? m[siswa.id] : nameHash(siswa.nama) % AVATAR_COLORS.length;
  return { ...AVATAR_COLORS[idx], idx };
}

// ============================================================
// SHARED ATOMS
// ============================================================
function Icon({ name, size = 16, style, className }) {
  const icons = {
    home: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
    trophy: <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />,
    book: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />,
    layers: <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />,
    chevL: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />,
    chevR: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />,
    edit: <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />,
    download: <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />,
    plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
    target: <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />,
    flag: <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />,
    eye: <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
    flame: <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />,
    settings: <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={style} className={className}>
      {icons[name] || null}
    </svg>
  );
}

function Avatar({ siswa, nama: namaProp, size = 'md' }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('avatar-changed', handler);
    return () => window.removeEventListener('avatar-changed', handler);
  }, []);
  const name = siswa ? siswa.nama : (namaProp || '?');
  const color = getColorFor(siswa || { id: name, nama: name });
  const inits = initials(name);
  const sizeMap = { sm: 28, md: 36, lg: 48, xl: 64 };
  const px = sizeMap[size] || 36;
  const fs = px * 0.35;
  return (
    <span className={`avatar avatar-${size}`} style={{ width: px, height: px, display: 'inline-block' }}>
      <svg width={px} height={px} viewBox="0 0 100 100">
        <rect width="100" height="100" rx="50" fill={color.bg} />
        <text x="50" y="63" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" fontSize={fs * (100 / px)} fill={color.fg}>{inits}</text>
      </svg>
    </span>
  );
}

function Delta({ value }) {
  if (!value) return <span className="delta neu">—</span>;
  if (value > 0) return <span className="delta pos">↑{value}</span>;
  return <span className="delta neg">↓{Math.abs(value)}</span>;
}

function Card({ children, className = '', style, pad }) {
  const padClass = pad === 'lg' ? 'pad-lg' : pad === 'none' ? 'pad-none' : '';
  return <div className={`card ${padClass} ${className}`} style={style}>{children}</div>;
}

function DesktopTitle({ title, subtitle, right }) {
  return (
    <div className="desktop-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

function PoinChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.poin));
  const min = Math.min(...data.map(d => d.poin));
  const range = max - min || 1;
  const W = 100, H = 60;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.poin - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `${pts[0].split(',')[0]},${H} ` + polyline + ` ${pts[pts.length - 1].split(',')[0]},${H}`;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#chartGrad)" />
        <polyline points={polyline} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const [x, y] = pts[i].split(',');
          if (i === data.length - 1) return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--accent)" />;
          return null;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
        <span>Mgg 1</span><span>Mgg 8</span><span>Mgg 16</span>
      </div>
    </div>
  );
}

// ============================================================
// ACCENT PALETTES
// ============================================================
const ACCENT_PALETTES = {
  '#0d6b7a': { soft: '#d8ebe9', ink: '#0a525c', name: 'Deep Teal (default)' },
  '#0e8a8a': { soft: '#cfeae8', ink: '#075e5e', name: 'Bright Teal' },
  '#0f766e': { soft: '#ccfbf1', ink: '#0c5e57', name: 'Emerald Teal' },
  '#155e75': { soft: '#cffafe', ink: '#0e4659', name: 'Cool Teal' },
};

// ============================================================
// LOGIN
// ============================================================
function LoginScreen({ onLogin }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const quickAccounts = [
    { id: 'CDK-7-001', label: 'Yusuf · VII', user: SISWA.find(s => s.nama.startsWith('Yusuf') && s.jenjang === 'VII') || SISWA[0] },
    { id: 'CDK-8-001', label: 'Siswa · VIII', user: SISWA.find(s => s.jenjang === 'VIII') || SISWA[32] },
    { id: 'CDK-G-001', label: 'Bu Anissa · Guru', user: GURU },
  ];

  function submit() {
    const match = quickAccounts.find(q => q.id.toLowerCase() === id.trim().toLowerCase());
    if (match) { onLogin(match.user); return; }
    if (id.trim() && pw.trim()) { onLogin(quickAccounts[0].user); return; }
    setErr('ID atau password belum diisi.');
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">C</div>
        <div className="login-title">Cendekia IPA</div>
        <div className="login-sub">SMP Negeri 15 Banda Aceh</div>

        <div className="form-group">
          <label className="form-label">ID Siswa / Guru</label>
          <input className="form-input" value={id} onChange={e => setId(e.target.value)} placeholder="Contoh: CDK-7-001" onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        {err && <div className="error-msg">{err}</div>}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }} onClick={submit}>
          Masuk
        </button>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Coba akun demo:</div>
          <div className="quick-btns">
            {quickAccounts.map(q => (
              <button key={q.id} className="quick-btn" onClick={() => onLogin(q.user)}>{q.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AVATAR PICKER
// ============================================================
function AvatarPicker({ open, currentIdx, onClose, onSelect }) {
  if (!open) return null;
  return (
    <div className="avatar-picker-overlay" onClick={onClose}>
      <div className="avatar-picker-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Pilih Avatar</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Pilih warna profil kamu</div>
        <div className="avatar-grid">
          {AVATAR_COLORS.map((c, i) => (
            <div key={i} className={`avatar-option ${currentIdx === i ? 'active' : ''}`} onClick={() => { onSelect(i); onClose(); }}>
              <span className="avatar avatar-lg" style={{ display: 'inline-block', width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 100 100">
                  <rect width="100" height="100" rx="50" fill={c.bg} />
                  <text x="50" y="63" textAnchor="middle" fontFamily="Plus Jakarta Sans" fontWeight="700" fontSize="38" fill={c.fg}>A</text>
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD SISWA
// ============================================================
function DashboardSiswa({ user, navigate }) {
  const rankList = getSiswaByJenjang(user.jenjang);
  const myRow = rankList.find(s => s.id === user.id);
  const tugasList = getTugasByJenjang(user.jenjang).filter(t => t.status === 'aktif');

  return (
    <>
      <div className="topbar with-border">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Beranda</div>
        <Avatar siswa={user} size="sm" />
      </div>

      <div className="page-pad">
        <DesktopTitle
          title={`Halo, ${user.nama.split(' ')[0]}! 👋`}
          subtitle={`${user.kelas} · SMP Negeri 15 Banda Aceh`}
        />

        {/* Hero stat card */}
        <Card pad="lg" style={{ background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)`, color: 'white', marginBottom: 12, border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, opacity: .8, fontWeight: 500 }}>TOTAL POIN</div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-.03em', fontFamily: 'var(--font-mono)' }}>{user.poin.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: 13, opacity: .8, marginTop: 2 }}>Ranking #{myRow?.rank || '?'} di Kelas {user.jenjang}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 32 }}>🔥</div>
              <div style={{ fontSize: 13, opacity: .85, fontWeight: 600 }}>{user.streak} hari streak</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.2)', color: 'white', backdropFilter: 'blur(4px)' }} onClick={() => navigate('leaderboard')}>
              <Icon name="trophy" size={13} /> Lihat ranking
            </button>
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: 'white', backdropFilter: 'blur(4px)' }} onClick={() => navigate('tugas')}>
              <Icon name="book" size={13} /> Tugas saya
            </button>
          </div>
        </Card>

        {/* Mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Tugas selesai', val: `${user.tugasSelesai}/${user.tugasTotal}`, icon: '✅' },
            { label: 'Nilai rata-rata', val: user.nilaiRata, icon: '📊' },
            { label: 'Badge', val: `${user.badges.length}/5`, icon: '🏅' },
          ].map(s => (
            <Card key={s.label} style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div className="stat-num" style={{ fontSize: 16, fontWeight: 700 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Pengumuman */}
        {PENGUMUMAN.length > 0 && (
          <>
            <div className="section-h"><h2>Pengumuman</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {PENGUMUMAN.map(p => (
                <Card key={p.id} style={{ borderLeft: '3px solid var(--accent)' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{p.dari} · {p.tanggal}</div>
                  <div style={{ fontSize: 13 }}>{p.text}</div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Tugas aktif */}
        <div className="section-h">
          <h2>Tugas aktif</h2>
          <button className="btn btn-soft btn-sm" onClick={() => navigate('tugas')}>Semua <Icon name="chevR" size={12} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {tugasList.length === 0 && <div className="empty">Tidak ada tugas aktif saat ini.</div>}
          {tugasList.slice(0, 3).map(t => {
            const dl = fmtDeadline(t.deadline);
            return (
              <button key={t.id} onClick={() => navigate('tugas-detail', { tugasId: t.id })} style={{ textAlign: 'left', display: 'block', width: '100%' }}>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent-2)', flexShrink: 0 }}>
                      <Icon name="book" size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.judul}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{t.bab}</div>
                    </div>
                    <span className={`chip chip-${dl.tone === 'neutral' ? '' : dl.tone}`} style={{ flexShrink: 0 }}>{dl.label}</span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Top 3 teaser */}
        <div className="section-h">
          <h2>Top 3 Kelas {user.jenjang}</h2>
          <button className="btn btn-soft btn-sm" onClick={() => navigate('leaderboard')}>Semua <Icon name="chevR" size={12} /></button>
        </div>
        <Card pad="none" style={{ overflow: 'hidden' }}>
          {rankList.slice(0, 3).map(s => (
            <div key={s.id} className="lb-row" style={{ gridTemplateColumns: '28px 36px 1fr auto auto' }}>
              <div className={`lb-rank ${s.rank === 1 ? 'top1' : s.rank === 2 ? 'top2' : 'top3'}`}>{s.rank}</div>
              <Avatar siswa={s} size="sm" />
              <div>
                <div className="lb-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nama}</div>
                <div className="lb-meta">{s.kelas}</div>
              </div>
              <div className="lb-points">{s.poin.toLocaleString('id-ID')}</div>
              <Delta value={s.deltaMinggu} />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

// ============================================================
// LEADERBOARD
// ============================================================
function Podium({ top3 }) {
  if (top3.length < 3) return null;
  const [first, second, third] = top3;
  const podiumOrder = [
    { siswa: second, h: 80, place: 2, color: 'oklch(0.85 0.01 264)' },
    { siswa: first, h: 110, place: 1, color: 'oklch(0.86 0.13 90)' },
    { siswa: third, h: 60, place: 3, color: 'oklch(0.78 0.08 50)' },
  ];
  return (
    <Card pad="lg">
      <div className="podium-wrap">
        {podiumOrder.map(({ siswa, h, place, color }) => (
          <div key={siswa.id} style={{ flex: 1, textAlign: 'center', maxWidth: 120 }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
              <Avatar siswa={siswa} size={place === 1 ? 'xl' : 'lg'} />
              {place === 1 && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 22 }}>👑</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{siswa.nama.split(' ')[0]}</div>
            <div className="stat-num" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{siswa.poin.toLocaleString('id-ID')} pt</div>
            <div style={{ height: h, marginTop: 8, background: color, borderTopLeftRadius: 'var(--radius-sm)', borderTopRightRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 800, color: 'rgba(26,24,21,.45)' }}>
              {place}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LeaderboardRow({ siswa, isMe }) {
  const rankClass = siswa.rank === 1 ? 'top1' : siswa.rank === 2 ? 'top2' : siswa.rank === 3 ? 'top3' : '';
  return (
    <div className={`lb-row ${isMe ? 'me' : ''}`}>
      <div className={`lb-rank ${rankClass}`}>{siswa.rank}</div>
      <Avatar siswa={siswa} size="md" />
      <div style={{ minWidth: 0 }}>
        <div className="lb-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {siswa.nama} {isMe && <span style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>· kamu</span>}
        </div>
        <div className="lb-meta">{siswa.kelas} · streak {siswa.streak}🔥</div>
      </div>
      <div className="lb-points">{siswa.poin.toLocaleString('id-ID')}</div>
      <Delta value={siswa.deltaMinggu} />
    </div>
  );
}

function LeaderboardScreen({ user, navigate }) {
  const [tab, setTab] = useState(user.jenjang || 'VII');
  const isOtherJenjang = user.jenjang && tab !== user.jenjang;
  const list = useMemo(() => getSiswaByJenjang(tab), [tab]);
  const top10 = list.slice(0, 10);
  const myRow = list.find(s => s.id === user.id);
  const myInTop = myRow && myRow.rank <= 10;
  const prestasi = useMemo(() => getPrestasiMingguan(tab), [tab]);

  return (
    <>
      <div className="topbar with-border">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Leaderboard</div>
        <Icon name="trophy" size={18} style={{ color: 'var(--accent)' }} />
      </div>

      <div className="page-pad">
        <DesktopTitle title="Leaderboard" subtitle="Ranking poin akumulatif semester ini · pisah per jenjang" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="tabs">
            <button className={`tab ${tab === 'VII' ? 'active' : ''}`} onClick={() => setTab('VII')}>
              Kelas VII {user.jenjang === 'VII' && <span style={{ opacity: .6 }}>· lo</span>}
            </button>
            <button className={`tab ${tab === 'VIII' ? 'active' : ''}`} onClick={() => setTab('VIII')}>
              Kelas VIII {user.jenjang === 'VIII' && <span style={{ opacity: .6 }}>· lo</span>}
            </button>
          </div>
          {isOtherJenjang && (
            <span className="chip" style={{ background: 'transparent', border: '1px dashed var(--line)', color: 'var(--ink-3)' }}>
              <Icon name="eye" size={11} /> Lintas jenjang · cuma intip
            </span>
          )}
        </div>

        <Podium top3={list.slice(0, 3)} />

        <div className="grid-2" style={{ alignItems: 'flex-start', marginTop: 16 }}>
          <div>
            <div className="section-h" style={{ marginTop: 0 }}>
              <h2>Top 10 · Kelas {tab}</h2>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{SISWA.filter(s => s.jenjang === tab).length} siswa</span>
            </div>
            <Card pad="none" style={{ overflow: 'hidden' }}>
              {top10.map(s => (
                <LeaderboardRow key={s.id} siswa={s} isMe={s.id === user.id} />
              ))}
            </Card>
            {!myInTop && !isOtherJenjang && myRow && (
              <>
                <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--ink-4)', fontSize: 11, letterSpacing: '.1em' }}>· · ·</div>
                <Card pad="none" style={{ overflow: 'hidden' }}>
                  <LeaderboardRow siswa={myRow} isMe={true} />
                </Card>
                <p style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', margin: '8px 0' }}>
                  Posisi lo tetap kelihatan, tapi yang lain gak diumbar. Kompetisinya sehat 🌱
                </p>
              </>
            )}
          </div>

          <div>
            <div className="section-h" style={{ marginTop: 0 }}>
              <h2>Prestasi minggu ini</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prestasi.map((p, i) => (
                <Card key={i} className="badge-blob" style={{ background: i === 0 ? 'var(--accent-soft)' : 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--surface)', display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0, border: '1px solid var(--line)' }}>{p.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{p.kategori}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.siswa.nama}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{p.value}</div>
                    </div>
                    <Avatar siswa={p.siswa} size="md" />
                  </div>
                </Card>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 14, border: '1px dashed var(--line)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--ink-2)' }}>Kenapa cuma Top 10?</strong><br />
              Biar gak ada yang mempermalukan. Kompetisinya sehat, bukan toxic 🌱
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// DAFTAR TUGAS
// ============================================================
function DaftarTugas({ user, navigate }) {
  const [filter, setFilter] = useState('aktif');
  const semua = TUGAS.filter(t => t.jenjang === user.jenjang);
  const filtered = filter === 'semua' ? semua : semua.filter(t => t.status === filter);

  return (
    <>
      <div className="topbar with-border">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Tugas</div>
        <Icon name="book" size={18} style={{ color: 'var(--accent)' }} />
      </div>

      <div className="page-pad">
        <DesktopTitle title="Tugas" subtitle={`Bab IPA Kelas ${user.jenjang} · semester genap`} />

        <div className="tabs" style={{ marginBottom: 16 }}>
          {['aktif','selesai','lewat-deadline','semua'].map(f => (
            <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'aktif' ? 'Aktif' : f === 'selesai' ? 'Selesai' : f === 'lewat-deadline' ? 'Telat' : 'Semua'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && <div className="empty">Tidak ada tugas di kategori ini.</div>}
          {filtered.map(t => {
            const dl = fmtDeadline(t.deadline);
            const sudah = t.status === 'selesai';
            const telat = t.status === 'lewat-deadline';
            return (
              <button key={t.id} onClick={() => navigate('tugas-detail', { tugasId: t.id })} style={{ textAlign: 'left', display: 'block', width: '100%' }}>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 'var(--radius)',
                      background: sudah ? 'oklch(0.96 0.05 155)' : telat ? 'oklch(0.96 0.05 25)' : 'var(--accent-soft)',
                      color: sudah ? 'oklch(0.4 0.13 155)' : telat ? 'oklch(0.42 0.15 25)' : 'var(--accent-ink)',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      <Icon name={sudah ? 'check' : telat ? 'flag' : 'book'} size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>{t.bab}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{t.judul}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {sudah ? (
                          <span className="chip chip-good"><Icon name="check" size={11} /> Selesai · {t.poinMax} pt</span>
                        ) : (
                          <>
                            <span className={`chip ${dl.tone !== 'neutral' ? `chip-${dl.tone}` : ''}`}><Icon name="clock" size={11} />{dl.label}</span>
                            <span className="chip"><Icon name="target" size={11} />+{t.poinMax} pt</span>
                            <span className="chip"><Icon name="clock" size={11} />~{t.durasi} mnt</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Icon name="chevR" size={16} style={{ color: 'var(--ink-3)', marginTop: 12, flexShrink: 0 }} />
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============================================================
// DETAIL TUGAS
// ============================================================
function DetailTugas({ user, tugasId, navigate }) {
  const t = TUGAS.find(x => x.id === tugasId);
  if (!t) return <div className="empty">Tugas tidak ditemukan.</div>;
  const dl = fmtDeadline(t.deadline);
  const bisa = t.soal && t.soal.length > 0 && t.status === 'aktif';

  return (
    <>
      <div className="topbar with-border">
        <button className="topbar-back" onClick={() => navigate('tugas')}><Icon name="chevL" /></button>
        <div className="topbar-title">Detail Tugas</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-pad">
        <DesktopTitle title={t.judul} subtitle={t.bab} />

        <Card pad="lg" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{t.bab}</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.01em', marginBottom: 12 }}>{t.judul}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16 }}>{t.deskripsi}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`chip ${dl.tone !== 'neutral' ? `chip-${dl.tone}` : ''}`}><Icon name="clock" size={11} />{dl.label}</span>
            <span className="chip"><Icon name="target" size={11} />+{t.poinMax} pt</span>
            <span className="chip"><Icon name="clock" size={11} />~{t.durasi} mnt</span>
            <span className="chip">{t.soal.length} soal</span>
          </div>
        </Card>

        {/* Progress kelas */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Progress kelas</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="progress"><div style={{ width: `${(t.sudahKerja / t.totalSiswa) * 100}%` }} /></div>
            </div>
            <div className="stat-num" style={{ fontSize: 13, fontWeight: 600 }}>{t.sudahKerja}/{t.totalSiswa}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>{t.totalSiswa - t.sudahKerja} siswa belum mengerjakan</div>
        </Card>

        <div style={{ marginTop: 16 }}>
          {bisa ? (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => navigate('kerjakan', { tugasId: t.id })}>
              <Icon name="book" size={16} /> Mulai Kerjakan
            </button>
          ) : t.status === 'selesai' ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--good)', fontWeight: 600 }}>✅ Tugas sudah selesai</div>
          ) : t.status === 'lewat-deadline' ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--bad)', fontWeight: 600 }}>⏰ Sudah lewat deadline</div>
          ) : (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--ink-3)' }}>Soal belum tersedia</div>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// KERJAKAN TUGAS (Quiz)
// ============================================================
function KerjakanTugas({ user, tugasId, navigate }) {
  const t = TUGAS.find(x => x.id === tugasId);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  if (!t || !t.soal.length) return <div className="empty">Soal tidak tersedia.</div>;
  const soal = t.soal[current];
  const total = t.soal.length;

  function answer(val) {
    if (submitted) return;
    setAnswers(a => ({ ...a, [current]: val }));
  }

  function submit() {
    let correct = 0;
    t.soal.forEach((s, i) => {
      if (answers[i] === s.jawaban) correct++;
    });
    const finalScore = Math.round((correct / total) * t.poinMax);
    setScore(finalScore);
    setSubmitted(true);
  }

  if (submitted) {
    const pct = Math.round((score / t.poinMax) * 100);
    const emoji = pct >= 90 ? '🎉' : pct >= 70 ? '👍' : '📚';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Selesai!</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>{t.judul}</div>
        <div className="stat-num" style={{ fontSize: 56, fontWeight: 800, color: 'var(--accent)', margin: '24px 0 4px', letterSpacing: '-.03em' }}>{score}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>dari {t.poinMax} poin</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          {Object.values(answers).filter((a, i) => a === t.soal[i]?.jawaban).length}/{total} benar
        </div>
        {pct >= 90 && <span className="chip chip-good" style={{ marginTop: 12 }}>🧠 Penalar Hebat!</span>}
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button className="btn btn-outline" onClick={() => navigate('tugas')}>Kembali ke Tugas</button>
          <button className="btn btn-primary" onClick={() => navigate('leaderboard')}>Lihat Ranking</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Quiz header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <button className="topbar-back" onClick={() => navigate('tugas-detail', { tugasId })}><Icon name="chevL" /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{t.judul}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Soal {current + 1} dari {total}</div>
        </div>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>{Math.round(((current + 1) / total) * 100)}%</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--surface-alt)' }}>
        <div style={{ height: '100%', background: 'var(--accent)', width: `${((current + 1) / total) * 100}%`, transition: 'width .3s ease' }} />
      </div>

      <div style={{ flex: 1, padding: 20, maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <div className="quiz-num">Soal {current + 1}</div>
        <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, marginBottom: 20 }}>{soal.q}</div>

        {soal.tipe === 'pg' && soal.opt.map((o, i) => (
          <button key={i} className={`quiz-opt ${answers[current] === i ? 'selected' : ''}`} onClick={() => answer(i)}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${answers[current] === i ? 'var(--accent)' : 'var(--line)'}`, display: 'grid', placeItems: 'center', flexShrink: 0, background: answers[current] === i ? 'var(--accent)' : 'transparent' }}>
              {answers[current] === i && <Icon name="check" size={12} style={{ color: 'white' }} />}
            </span>
            <span>{String.fromCharCode(65 + i)}. {o}</span>
          </button>
        ))}
      </div>

      {/* Footer nav */}
      <div style={{ padding: '12px 20px', background: 'var(--surface)', borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
        {current > 0 && (
          <button className="btn btn-outline" onClick={() => setCurrent(c => c - 1)}>← Sebelumnya</button>
        )}
        <div style={{ flex: 1 }} />
        {current < total - 1 ? (
          <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)} disabled={answers[current] === undefined}>
            Selanjutnya →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={submit} disabled={Object.keys(answers).length < total}>
            <Icon name="check" size={14} /> Kumpulkan
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PROFIL SISWA
// ============================================================
function ProfilSiswa({ user, navigate }) {
  const riwayat = useMemo(() => genRiwayat(user.poin), [user.poin]);
  const recentDelta = riwayat[riwayat.length - 1].poin - riwayat[riwayat.length - 5].poin;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, forceUpdate] = useState(0);
  const color = getColorFor(user);

  function handleSelectAvatar(idx) {
    setStoredAvatar(user.id, idx);
    forceUpdate(n => n + 1);
  }

  return (
    <>
      <div className="topbar with-border">
        <button className="topbar-back" onClick={() => navigate('home')}><Icon name="chevL" /></button>
        <div className="topbar-title">Profil</div>
        <button className="topbar-back" onClick={() => setPickerOpen(true)}><Icon name="edit" size={16} /></button>
      </div>

      <AvatarPicker open={pickerOpen} currentIdx={color.idx} onClose={() => setPickerOpen(false)} onSelect={handleSelectAvatar} />

      <div className="page-pad">
        <DesktopTitle title="Profil" subtitle="Track record kamu sepanjang tahun ajaran"
          right={<button className="btn btn-outline btn-sm" onClick={() => setPickerOpen(true)}><Icon name="edit" size={12} /> Ganti avatar</button>}
        />

        <Card pad="lg" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <button onClick={() => setPickerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', borderRadius: '50%' }}>
              <Avatar siswa={user} size="xl" />
              <span style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
                <Icon name="edit" size={11} />
              </span>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.01em' }}>{user.nama}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{user.kelas} · SMP Negeri 15 Banda Aceh</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="chip chip-accent">#{user.rank} di {user.jenjang}</span>
                <span className="chip"><Icon name="flame" size={11} />{user.streak} hari</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
            {[
              { label: 'total poin', val: user.poin.toLocaleString('id-ID') },
              { label: 'tugas', val: `${user.tugasSelesai}/${user.tugasTotal}` },
              { label: 'nilai rata-rata', val: user.nilaiRata },
            ].map(s => (
              <div key={s.label}>
                <div className="stat-num" style={{ fontSize: 22, fontWeight: 700 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Perjalanan poin</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>16 minggu · semester genap</div>
            </div>
            <span className="chip chip-good" style={{ fontFamily: 'var(--font-mono)' }}>+{recentDelta} <span style={{ opacity: .7 }}>5 mgg</span></span>
          </div>
          <PoinChart data={riwayat} />
        </Card>

        {/* Badges */}
        <div className="section-h"><h2>Badge</h2><span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{user.badges.length}/5</span></div>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
            {[
              { id: 'streak', label: 'Konsisten', icon: '🔥', desc: '10+ hari streak' },
              { id: 'top3', label: 'Top 3', icon: '⭐', desc: 'Masuk podium' },
              { id: 'rising', label: 'Naik Drastis', icon: '⚡', desc: 'Naik 5+ posisi' },
              { id: 'sempurna', label: 'Penalar Hebat', icon: '🧠', desc: 'Rata-rata 90+' },
              { id: 'rajin', label: 'Rajin Latihan', icon: '📚', desc: '18+ tugas selesai' },
            ].map(b => {
              const have = user.badges.find(x => x.id === b.id);
              return (
                <div key={b.id} style={{ textAlign: 'center', padding: '12px 6px', background: have ? 'var(--accent-soft)' : 'var(--surface-alt)', borderRadius: 'var(--radius)', opacity: have ? 1 : .45 }}>
                  <div style={{ fontSize: 26, marginBottom: 4, filter: have ? 'none' : 'grayscale(1)' }}>{b.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{b.desc}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="section-h"><h2>Aktivitas terakhir</h2></div>
        <Card pad="none" style={{ marginBottom: 12 }}>
          <div style={{ padding: '4px 16px' }}>
            {RIWAYAT_AKTIVITAS.map(a => (
              <div key={a.id} className="row">
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="check" size={16} />
                </div>
                <div className="row-main">
                  <div className="row-title">{a.tugas}</div>
                  <div className="row-sub">{a.tanggal} · nilai {a.nilai}{a.bonus && ` · ${a.bonus}`}</div>
                </div>
                <div className="stat-num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--good)' }}>+{a.poin}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="section-h"><h2>Topik IPA</h2></div>
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <Card>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Terkuat</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Tata Surya</div>
            <div className="progress" style={{ marginTop: 8 }}><div style={{ width: '92%' }} /></div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>92% akurasi</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Perlu latihan</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Pengukuran</div>
            <div className="progress" style={{ marginTop: 8 }}><div style={{ width: '54%', background: 'var(--warn)' }} /></div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>54% akurasi</div>
          </Card>
        </div>
      </div>
    </>
  );
}

// ============================================================
// DASHBOARD GURU
// ============================================================
function DashboardGuru({ navigate }) {
  const [jenjang, setJenjang] = useState('VII');
  const tugasJenjang = TUGAS.filter(t => t.jenjang === jenjang);
  const tugasAktif = tugasJenjang.filter(t => t.status === 'aktif');
  const totalSiswa = SISWA.filter(s => s.jenjang === jenjang).length;
  const totalKerja = tugasAktif.reduce((sum, t) => sum + t.sudahKerja, 0);
  const totalKap = tugasAktif.reduce((sum, t) => sum + t.totalSiswa, 0);
  const submitRate = totalKap ? Math.round((totalKerja / totalKap) * 100) : 0;
  const rataPoin = Math.round(SISWA.filter(s => s.jenjang === jenjang).reduce((sum, s) => sum + s.poin, 0) / totalSiswa);
  const sorted = SISWA.filter(s => s.jenjang === jenjang).sort((a, b) => b.poin - a.poin);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  return (
    <>
      <div className="topbar with-border">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Dashboard Guru</div>
        <button className="topbar-back"><Icon name="download" size={16} /></button>
      </div>

      <div className="page-pad">
        <DesktopTitle
          title={`Halo, ${GURU.nama}`}
          subtitle={`${GURU.mapel} · ${GURU.sekolah}`}
          right={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm"><Icon name="download" size={14} /> Export nilai</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('buat-tugas')}><Icon name="plus" size={14} /> Tugas baru</button>
            </div>
          }
        />

        <div className="mobile-only" style={{ gap: 8, marginBottom: 16 }}>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('buat-tugas')}><Icon name="plus" size={14} /> Tugas baru</button>
          <button className="btn btn-outline"><Icon name="download" size={14} /></button>
        </div>

        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${jenjang === 'VII' ? 'active' : ''}`} onClick={() => setJenjang('VII')}>Kelas VII</button>
          <button className={`tab ${jenjang === 'VIII' ? 'active' : ''}`} onClick={() => setJenjang('VIII')}>Kelas VIII</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Tugas aktif', val: tugasAktif.length, suffix: '' },
            { label: 'Sudah ngerjain', val: submitRate, suffix: '%' },
            { label: 'Rata poin kelas', val: rataPoin.toLocaleString('id-ID'), suffix: '' },
            { label: 'Total siswa', val: totalSiswa, suffix: '' },
          ].map(s => (
            <Card key={s.label}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.label}</div>
              <div className="stat-num" style={{ fontSize: 26, fontWeight: 700 }}>{s.val}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>{s.suffix}</span></div>
            </Card>
          ))}
        </div>

        <div className="section-h"><h2>Tugas yang sedang berjalan</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {tugasAktif.map(t => {
            const dl = fmtDeadline(t.deadline);
            const pct = (t.sudahKerja / t.totalSiswa) * 100;
            return (
              <Card key={t.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{t.bab}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{t.judul}</div>
                  </div>
                  <span className={`chip ${dl.tone !== 'neutral' ? `chip-${dl.tone}` : ''}`}><Icon name="clock" size={11} />{dl.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div className="progress"><div style={{ width: `${pct}%`, background: pct < 30 ? 'var(--bad)' : pct < 70 ? 'var(--warn)' : 'var(--good)' }} /></div>
                  </div>
                  <div className="stat-num" style={{ fontSize: 13, fontWeight: 600, minWidth: 50, textAlign: 'right' }}>{t.sudahKerja}<span style={{ color: 'var(--ink-3)' }}>/{t.totalSiswa}</span></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
                  <span>{t.totalSiswa - t.sudahKerja} siswa belum ngerjain</span>
                  <button className="btn btn-soft btn-sm">Lihat detail <Icon name="chevR" size={12} /></button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid-2">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Top performer</div>
              <span className="chip chip-good">Pertahankan ✨</span>
            </div>
            {top3.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{ width: 20, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>{i + 1}</div>
                <Avatar siswa={s} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nama}</div>
                </div>
                <div className="stat-num" style={{ fontSize: 12, fontWeight: 600 }}>{s.poin.toLocaleString('id-ID')}</div>
              </div>
            ))}
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Perlu perhatian</div>
              <span className="chip chip-warn">Follow-up</span>
            </div>
            {bottom3.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                <Avatar siswa={s} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nama}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.poin.toLocaleString('id-ID')} pt</div>
                </div>
                <button className="btn btn-soft btn-sm">Pantau</button>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}

// ============================================================
// BUAT TUGAS
// ============================================================
function BuatTugas({ navigate }) {
  const [form, setForm] = useState({ judul: '', jenjang: 'VII', bab: '', deadline: '', poinMax: 100, durasi: 20, deskripsi: '' });
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function submit() {
    if (!form.judul || !form.deadline) return;
    setSaved(true);
    setTimeout(() => navigate('home-guru'), 1500);
  }

  if (saved) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Tugas berhasil dibuat!</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Kembali ke dashboard...</div>
    </div>
  );

  return (
    <>
      <div className="topbar with-border">
        <button className="topbar-back" onClick={() => navigate('home-guru')}><Icon name="chevL" /></button>
        <div className="topbar-title">Buat Tugas</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-pad">
        <DesktopTitle title="Buat Tugas Baru" subtitle="Isi detail tugas untuk dikirim ke siswa" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginTop: 0 }}>
                <label className="form-label">Judul Tugas *</label>
                <input className="form-input" value={form.judul} onChange={e => set('judul', e.target.value)} placeholder="Contoh: Sistem Tata Surya" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Jenjang</label>
                  <select className="form-input" value={form.jenjang} onChange={e => set('jenjang', e.target.value)}>
                    <option value="VII">Kelas VII</option>
                    <option value="VIII">Kelas VIII</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Deadline *</label>
                  <input className="form-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="form-label">Nama Bab</label>
                <input className="form-input" value={form.bab} onChange={e => set('bab', e.target.value)} placeholder="Bab 6 — Tata Surya" />
              </div>
              <div className="form-group" style={{ marginTop: 0 }}>
                <label className="form-label">Deskripsi</label>
                <textarea className="form-input" value={form.deskripsi} onChange={e => set('deskripsi', e.target.value)} placeholder="Jelaskan isi tugas ini..." rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Poin maksimal</label>
                  <input className="form-input" type="number" value={form.poinMax} onChange={e => set('poinMax', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Durasi (menit)</label>
                  <input className="form-input" type="number" value={form.durasi} onChange={e => set('durasi', e.target.value)} />
                </div>
              </div>
            </div>
          </Card>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} onClick={submit}>
            <Icon name="check" size={16} /> Buat Tugas
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// KELAS VIEW (teacher)
// ============================================================
function KelasView({ navigate }) {
  const [jenjang, setJenjang] = useState('VII');
  const list = SISWA.filter(s => s.jenjang === jenjang).sort((a, b) => b.poin - a.poin);

  return (
    <>
      <div className="topbar with-border">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Siswa</div>
        <button className="topbar-back"><Icon name="search" size={16} /></button>
      </div>

      <div className="page-pad">
        <DesktopTitle title="Siswa" subtitle="Daftar lengkap kelas yang kamu ajar" />
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${jenjang === 'VII' ? 'active' : ''}`} onClick={() => setJenjang('VII')}>Kelas VII ({SISWA.filter(s => s.jenjang === 'VII').length})</button>
          <button className={`tab ${jenjang === 'VIII' ? 'active' : ''}`} onClick={() => setJenjang('VIII')}>Kelas VIII ({SISWA.filter(s => s.jenjang === 'VIII').length})</button>
        </div>
        <Card pad="none" style={{ overflow: 'hidden' }}>
          {list.map(s => (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '32px 36px 1fr auto auto', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--line-soft)' }}>
              <div className="lb-rank">{s.rank}</div>
              <Avatar siswa={s} size="sm" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nama}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.kelas} · {s.tugasSelesai}/{s.tugasTotal} tugas</div>
              </div>
              <div className="stat-num" style={{ fontSize: 13, fontWeight: 600 }}>{s.poin.toLocaleString('id-ID')}</div>
              <Delta value={s.deltaMinggu} />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

// ============================================================
// TWEAKS PANEL
// ============================================================
function TweaksPanel({ accent, setAccent, density, setDensity }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="tweaks-fab" onClick={() => setOpen(o => !o)} title="Pengaturan tampilan">
        <Icon name="settings" size={18} />
      </button>
      {open && (
        <div className="tweaks-panel">
          <div className="tweaks-title">Tampilan</div>
          <div className="tweaks-section">Kepadatan</div>
          <div className="tweaks-row">
            {['compact', 'comfortable'].map(d => (
              <button key={d} className={`tweak-btn ${density === d ? 'active' : ''}`} onClick={() => setDensity(d)}>
                {d === 'compact' ? 'Compact' : 'Comfortable'}
              </button>
            ))}
          </div>
          <div className="tweaks-section">Warna Aksen</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {Object.keys(ACCENT_PALETTES).map(c => (
              <div key={c} className={`color-swatch ${accent === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setAccent(c)} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6 }}>{ACCENT_PALETTES[accent]?.name || ''}</div>
        </div>
      )}
    </>
  );
}

// ============================================================
// NAV CONFIG
// ============================================================
const STUDENT_NAV = [
  { id: 'home', label: 'Beranda', icon: 'home' },
  { id: 'leaderboard', label: 'Ranking', icon: 'trophy' },
  { id: 'tugas', label: 'Tugas', icon: 'book' },
  { id: 'profil', label: 'Profil', icon: 'user' },
];
const TEACHER_NAV = [
  { id: 'home-guru', label: 'Dashboard', icon: 'layers' },
  { id: 'tugas-guru', label: 'Tugas', icon: 'book' },
  { id: 'leaderboard', label: 'Ranking', icon: 'trophy' },
  { id: 'kelas', label: 'Siswa', icon: 'user' },
];

function Sidebar({ user, route, navigate, onLogout }) {
  const isGuru = user.role === 'guru';
  const items = isGuru ? TEACHER_NAV : STUDENT_NAV;
  return (
    <aside className="side-rail">
      {items.map(item => (
        <div key={item.id} className={`side-link ${route === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
          <Icon name={item.icon} size={17} className="ico" />
          <span>{item.label}</span>
        </div>
      ))}
      <div className="side-foot">
        <div className="side-user">
          <Avatar siswa={isGuru ? null : user} nama={user.nama} size="md" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="side-user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.nama}</div>
            <div className="side-user-meta">{isGuru ? `${user.mapel} · Guru` : user.kelas}</div>
          </div>
          <button onClick={onLogout} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }} title="Keluar">
            <Icon name="chevR" size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ user, route, navigate }) {
  const isGuru = user.role === 'guru';
  const items = isGuru ? TEACHER_NAV : STUDENT_NAV;
  return (
    <nav className="bottom-nav">
      {items.map(item => {
        const active = route === item.id ||
          (route === 'tugas-detail' && item.id === 'tugas') ||
          (route === 'kerjakan' && item.id === 'tugas') ||
          (route === 'buat-tugas' && item.id === 'tugas-guru') ||
          (route === 'tugas-guru' && item.id === 'tugas-guru');
        return (
          <button key={item.id} className={`bottom-nav-item ${active ? 'active' : ''}`} onClick={() => navigate(item.id)}>
            <Icon name={item.icon} size={20} className="ico" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState('home');
  const [routeParams, setRouteParams] = useState({});
  const [accent, setAccentState] = useState('#0d6b7a');
  const [density, setDensityState] = useState('comfortable');

  function setAccent(v) {
    setAccentState(v);
    const pal = ACCENT_PALETTES[v] || ACCENT_PALETTES['#0d6b7a'];
    document.documentElement.style.setProperty('--accent', v);
    document.documentElement.style.setProperty('--accent-2', pal.ink);
    document.documentElement.style.setProperty('--accent-soft', pal.soft);
    document.documentElement.style.setProperty('--accent-tint', pal.soft);
    document.documentElement.style.setProperty('--accent-ink', pal.ink);
  }
  function setDensity(v) {
    setDensityState(v);
    document.documentElement.setAttribute('data-density', v);
  }

  function navigate(r, params = {}) {
    setRoute(r);
    setRouteParams(params);
    window.scrollTo(0, 0);
  }

  function handleLogin(u) {
    setUser(u);
    setRoute(u.role === 'guru' ? 'home-guru' : 'home');
  }
  function handleLogout() { setUser(null); setRoute('home'); }

  if (!user) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <LoginScreen onLogin={handleLogin} />
    </>
  );

  const isGuru = user.role === 'guru';
  const hideNav = route === 'kerjakan';
  let screen = null;

  if (isGuru) {
    if (route === 'home-guru' || route === 'tugas' || route === 'tugas-guru') screen = <DashboardGuru navigate={navigate} />;
    else if (route === 'buat-tugas') screen = <BuatTugas navigate={navigate} />;
    else if (route === 'leaderboard') {
      const dummyUser = { ...SISWA[0], id: 'guru-observer' };
      screen = <LeaderboardScreen user={dummyUser} navigate={navigate} />;
    }
    else if (route === 'kelas') screen = <KelasView navigate={navigate} />;
    else screen = <DashboardGuru navigate={navigate} />;
  } else {
    if (route === 'home') screen = <DashboardSiswa user={user} navigate={navigate} />;
    else if (route === 'leaderboard') screen = <LeaderboardScreen user={user} navigate={navigate} />;
    else if (route === 'tugas') screen = <DaftarTugas user={user} navigate={navigate} />;
    else if (route === 'tugas-detail') screen = <DetailTugas user={user} tugasId={routeParams.tugasId} navigate={navigate} />;
    else if (route === 'kerjakan') screen = <KerjakanTugas user={user} tugasId={routeParams.tugasId} navigate={navigate} />;
    else if (route === 'profil') screen = <ProfilSiswa user={user} navigate={navigate} />;
    else screen = <DashboardSiswa user={user} navigate={navigate} />;
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="app-header-brand">
            <div className="app-header-mark">C</div>
            <div className="app-header-name">
              <b>Cendekia IPA</b>
              <small>SMP 15 Banda Aceh</small>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, opacity: .85, display: 'none' }} className="desktop-only">
              {isGuru ? `${user.mapel} · Guru` : `Kelas ${user.jenjang} · ${user.kelas}`}
            </span>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,.15)', color: 'white', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer' }}>
              Keluar
            </button>
          </div>
        </header>

        {/* Shell body */}
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar user={user} route={route} navigate={navigate} onLogout={handleLogout} />
          <main className="main-area">{screen}</main>
        </div>

        <footer className="app-footer">© 2026 <b>Cendekia IPA</b> · SMP Negeri 15 Banda Aceh — All rights reserved</footer>
      </div>

      {!hideNav && <BottomNav user={user} route={route} navigate={navigate} />}
      <TweaksPanel accent={accent} setAccent={setAccent} density={density} setDensity={setDensity} />
    </>
  );
}

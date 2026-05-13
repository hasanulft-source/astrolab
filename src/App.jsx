// Astrolab Classroom — Production LMS
// SMP Negeri 15 Banda Aceh
// UI: Original (Plus Jakarta Sans + teal #0d6b7a)
// Engine: Production (localStorage, real quiz, question builder)

import { useState, useCallback } from "react";

// ─── STORAGE ───
const DB = {
  get: (k, d = null) => { try { const v = localStorage.getItem(`astrolab.${k}`); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(`astrolab.${k}`, JSON.stringify(v)); } catch {} },
};

// ─── ACCOUNTS ───
const ACCOUNTS = [
  { id: "FATA-001", password: "MY_SCH119", role: "guru", nama: "M. Hasanul Fatta, S.Pd.", namaDisplay: "Pak Fatta", mapel: "IPA & Informatika" },
  { id: "YJS-42",   password: "yusuf2026",  role: "siswa", nama: "Yusuf Julian Saputra", namaDisplay: "Yusuf",  kelas: "VIII-A", jenjang: "VIII" },
  { id: "SAN-17",   password: "shelia2026", role: "siswa", nama: "Shelia Anatasha",       namaDisplay: "Shelia", kelas: "VII-A",  jenjang: "VII"  },
];

// ─── CSS ───
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --accent:#0d6b7a;
  --accent-2:#0a525c;
  --accent-soft:#d8ebe9;
  --accent-tint:#eaf4f3;
  --surface:#ffffff;
  --surface-alt:#f7f8fa;
  --bg:#f2f4f6;
  --line:#e2e6ea;
  --line-soft:#edf0f3;
  --ink:#1a1c1e;
  --ink-2:#3a3d42;
  --ink-3:#6b7280;
  --ink-4:#9ca3af;
  --good:#16a34a;--good-bg:#f0fdf4;
  --warn:#d97706;--warn-bg:#fffbeb;
  --bad:#dc2626;--bad-bg:#fef2f2;
  --shadow-sm:0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.04);
  --shadow:0 4px 12px rgba(0,0,0,.08),0 1px 3px rgba(0,0,0,.05);
  --r:12px;--r-sm:8px;--r-xs:5px;
  --font:'Plus Jakarta Sans',system-ui,sans-serif;
  --mono:'DM Mono',monospace;
  --nav-h:60px;--hdr-h:52px;
}
body{font-family:var(--font);background:var(--bg);color:var(--ink);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;}
button,input,select,textarea{font-family:var(--font);}

/* SHELL */
.shell{min-height:100vh;display:flex;flex-direction:column;}
.hdr{position:sticky;top:0;z-index:100;background:var(--accent);color:#fff;padding:0 20px;height:var(--hdr-h);display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(13,107,122,.25);}
.hdr-brand{display:flex;align-items:center;gap:10px;}
.hdr-mark{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.2);display:grid;place-items:center;backdrop-filter:blur(4px);}
.hdr-name b{font-size:13px;font-weight:700;display:block;line-height:1.2;}
.hdr-name small{font-size:10px;opacity:.7;}
.body{flex:1;display:flex;}

/* SIDEBAR */
.sidebar{display:none;width:200px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--line);padding:16px 10px;position:sticky;top:var(--hdr-h);height:calc(100vh - var(--hdr-h));overflow-y:auto;flex-direction:column;}
@media(min-width:768px){.sidebar{display:flex;}}
.side-link{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r-sm);font-size:13px;font-weight:500;color:var(--ink-2);cursor:pointer;transition:all .15s;border:none;background:none;width:100%;text-align:left;}
.side-link:hover{background:var(--surface-alt);}
.side-link.active{background:var(--accent-soft);color:var(--accent-2);font-weight:600;}
.side-foot{margin-top:auto;padding-top:16px;border-top:1px solid var(--line-soft);}
.side-user{display:flex;align-items:center;gap:10px;padding:8px 4px;}
.side-user-name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.side-user-meta{font-size:10px;color:var(--ink-3);}

/* MAIN */
.main{flex:1;min-width:0;padding-bottom:80px;}
@media(min-width:768px){.main{padding-bottom:24px;}}

/* BOTTOM NAV */
.bnav{position:fixed;bottom:0;left:0;right:0;z-index:90;background:var(--surface);border-top:1px solid var(--line);display:flex;height:var(--nav-h);padding:0 4px;}
@media(min-width:768px){.bnav{display:none;}}
.bn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:10px;font-weight:500;color:var(--ink-3);background:none;border:none;cursor:pointer;transition:color .15s;padding:8px 4px;}
.bn.active{color:var(--accent);}

/* TOPBAR (mobile) */
.topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;gap:12px;position:sticky;top:var(--hdr-h);z-index:50;background:var(--surface);border-bottom:1px solid var(--line-soft);}
@media(min-width:768px){.topbar{display:none;}}
.topbar-title{font-size:15px;font-weight:700;flex:1;text-align:center;}
.topbar-back{width:36px;height:36px;border-radius:50%;background:var(--surface-alt);border:none;cursor:pointer;display:grid;place-items:center;color:var(--ink-2);flex-shrink:0;}

/* PAGE */
.page{padding:16px;}
@media(min-width:768px){.page{padding:24px 28px;}}
.dt{display:none;margin-bottom:20px;align-items:flex-start;justify-content:space-between;}
@media(min-width:768px){.dt{display:flex;}}
.dt h1{font-size:22px;font-weight:800;letter-spacing:-.02em;}
.dt p{font-size:13px;color:var(--ink-3);margin-top:2px;}

/* CARD */
.card{background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow-sm);border:1px solid var(--line-soft);}
.cp{padding:16px;}.clg{padding:20px;}.cn{padding:0;}

/* TABS */
.tabs{display:flex;gap:4px;background:var(--surface-alt);padding:4px;border-radius:var(--r-sm);width:fit-content;}
.tab{padding:6px 14px;border-radius:var(--r-xs);font-size:13px;font-weight:500;color:var(--ink-3);border:none;background:none;cursor:pointer;transition:all .15s;white-space:nowrap;}
.tab.active{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:var(--shadow-sm);}

/* CHIPS */
.chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:99px;font-size:11px;font-weight:500;background:var(--surface-alt);color:var(--ink-2);border:1px solid var(--line);}
.chip-accent{background:var(--accent-soft);color:var(--accent-2);border-color:transparent;}
.chip-good{background:var(--good-bg);color:var(--good);border-color:transparent;}
.chip-warn{background:var(--warn-bg);color:var(--warn);border-color:transparent;}
.chip-bad{background:var(--bad-bg);color:var(--bad);border-color:transparent;}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--r-sm);font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;border:none;transition:all .15s;white-space:nowrap;}
.btn-primary{background:var(--accent);color:#fff;}
.btn-primary:hover{background:var(--accent-2);}
.btn-outline{background:transparent;color:var(--ink-2);border:1px solid var(--line);}
.btn-outline:hover{background:var(--surface-alt);}
.btn-soft{background:var(--surface-alt);color:var(--ink-2);}
.btn-soft:hover{background:var(--line-soft);}
.btn-danger{background:var(--bad-bg);color:var(--bad);border:1px solid #fca5a5;}
.btn-danger:hover{background:#fee2e2;}
.btn-ghost{background:transparent;color:var(--ink-3);border:none;}
.btn-ghost:hover{background:var(--surface-alt);color:var(--ink-2);}
.btn-sm{padding:5px 12px;font-size:12px;}
.btn-lg{padding:12px 20px;font-size:14px;}
.btn-full{width:100%;justify-content:center;}
.btn:disabled{opacity:.4;cursor:not-allowed;}

/* FORM */
.fg{display:flex;flex-direction:column;gap:6px;}
.lbl{font-size:12px;font-weight:600;color:var(--ink-2);display:block;}
.inp{width:100%;padding:9px 13px;border-radius:var(--r-sm);border:1.5px solid var(--line);font-family:var(--font);font-size:14px;color:var(--ink);background:var(--surface);outline:none;transition:border-color .15s;}
.inp:focus{border-color:var(--accent);}
.inp:focus-within{border-color:var(--accent);}
textarea.inp{resize:vertical;min-height:80px;}
select.inp{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:34px;}
.ferr{font-size:12px;color:var(--bad);margin-top:4px;}

/* SECTION HEADER */
.sh{display:flex;align-items:center;justify-content:space-between;margin:20px 0 10px;}
.sh h2{font-size:14px;font-weight:700;}

/* PROGRESS */
.progress{height:6px;background:var(--surface-alt);border-radius:99px;overflow:hidden;}
.progress>div{height:100%;background:var(--accent);border-radius:99px;transition:width .4s ease;}

/* LEADERBOARD */
.lb-row{display:grid;grid-template-columns:36px 40px 1fr auto;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--line-soft);transition:background .15s;}
.lb-row:last-child{border-bottom:none;}
.lb-row:hover{background:var(--surface-alt);}
.lb-row.me{background:var(--accent-soft);}
.lb-rank{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--ink-3);text-align:center;}
.lb-rank.top1{color:#b45309;} .lb-rank.top2{color:#64748b;} .lb-rank.top3{color:#92400e;}
.lb-name{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lb-meta{font-size:11px;color:var(--ink-3);margin-top:1px;}
.lb-pts{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--accent-2);}

/* AVATAR */
.av{border-radius:50%;overflow:hidden;flex-shrink:0;display:inline-block;}

/* EMPTY */
.empty{text-align:center;padding:40px 20px;color:var(--ink-3);font-size:13px;}
.empty-box{display:flex;flex-direction:column;align-items:center;gap:10px;}
.empty-box h3{font-size:15px;font-weight:700;color:var(--ink-2);}
.empty-box p{font-size:13px;max-width:280px;line-height:1.6;}

/* LOGIN */
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent) 0%,#0a4a56 100%);padding:20px;}
.login-card{background:#fff;border-radius:20px;padding:32px 28px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.2);}
.login-logo{width:56px;height:56px;border-radius:16px;background:var(--accent);color:#fff;display:grid;place-items:center;margin-bottom:20px;}

/* ROW */
.row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line-soft);}
.row:last-child{border-bottom:none;}
.row-main{flex:1;min-width:0;}
.row-title{font-size:13px;font-weight:500;}
.row-sub{font-size:11px;color:var(--ink-3);margin-top:1px;}

/* CHART */
.chart-wrap{width:100%;height:120px;}

/* PODIUM */
.podium{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;padding-top:12px;}

/* FOOTER */
.footer{text-align:center;font-size:11px;color:var(--ink-4);padding:16px;border-top:1px solid var(--line-soft);background:var(--surface);display:none;}
@media(min-width:768px){.footer{display:block;}}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
.modal{background:var(--surface);border-radius:16px;padding:24px;width:100%;max-width:380px;box-shadow:var(--shadow);}
.modal h3{font-size:17px;font-weight:700;margin-bottom:8px;}
.modal p{font-size:13px;color:var(--ink-3);line-height:1.6;}
.modal-actions{display:flex;gap:10px;margin-top:20px;justify-content:flex-end;}

/* GRID */
.g2{display:grid;grid-template-columns:1fr;gap:12px;}
@media(min-width:600px){.g2{grid-template-columns:1fr 1fr;}}
.g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;}

/* QUIZ */
.quiz-opt{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r-sm);border:1.5px solid var(--line);background:var(--surface);cursor:pointer;transition:all .15s;text-align:left;font-family:var(--font);font-size:14px;width:100%;margin-bottom:8px;color:var(--ink-2);}
.quiz-opt:hover{border-color:var(--accent);background:var(--accent-soft);}
.quiz-opt.selected{border-color:var(--accent);background:var(--accent-soft);font-weight:600;}
.quiz-opt.correct{border-color:var(--good);background:var(--good-bg);}
.quiz-opt.wrong{border-color:var(--bad);background:var(--bad-bg);}
.quiz-letter{width:28px;height:28px;border-radius:6px;background:var(--surface-alt);border:1.5px solid var(--line);display:grid;place-items:center;font-size:12px;font-weight:700;color:var(--ink-3);flex-shrink:0;font-family:var(--mono);transition:all .15s;}
.quiz-opt.selected .quiz-letter{background:var(--accent);color:#fff;border-color:var(--accent);}
.quiz-opt.correct .quiz-letter{background:var(--good);color:#fff;border-color:var(--good);}
.quiz-opt.wrong .quiz-letter{background:var(--bad);color:#fff;border-color:var(--bad);}

/* BUAT TUGAS — 2 col layout */
.buat-layout{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:900px){.buat-layout{grid-template-columns:1fr 300px;align-items:start;}}
.preview-card-label{font-size:10px;font-weight:600;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;}
.preview-task-card{border:1px solid var(--line);border-radius:var(--r);padding:16px;background:var(--surface-alt);}
.preview-bab{font-size:11px;color:var(--ink-3);font-family:var(--mono);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;}
.preview-title{font-size:17px;font-weight:700;letter-spacing:-.02em;margin-bottom:10px;}
.target-card{border:1px solid var(--line);border-radius:var(--r);padding:14px;margin-top:14px;}
.target-kelas-badge{width:36px;height:36px;border-radius:8px;background:var(--accent-soft);color:var(--accent-2);display:grid;place-items:center;font-size:12px;font-weight:700;flex-shrink:0;font-family:var(--mono);}

/* QUESTION TYPE SELECTOR */
.qtype-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px;}
@media(min-width:500px){.qtype-grid{grid-template-columns:repeat(4,1fr);}}
.qtype-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border-radius:var(--r-sm);border:1.5px solid var(--line);background:var(--surface);cursor:pointer;transition:all .15s;text-align:center;font-family:var(--font);}
.qtype-btn:hover{border-color:var(--accent);background:var(--accent-tint);}
.qtype-btn.active{border-color:var(--accent);background:var(--accent-soft);}
.qtype-icon{width:34px;height:34px;border-radius:8px;background:var(--surface-alt);display:grid;place-items:center;transition:all .15s;}
.qtype-btn.active .qtype-icon{background:var(--accent);color:#fff;}
.qtype-name{font-size:12px;font-weight:600;color:var(--ink-2);}
.qtype-desc{font-size:10px;color:var(--ink-3);}

/* QUESTION BUILDER ITEM */
.qb-item{border:1px solid var(--line);border-radius:var(--r);margin-bottom:10px;background:var(--surface);overflow:hidden;}
.qb-item-head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surface-alt);border-bottom:1px solid var(--line);}
.qb-item-num{width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;flex-shrink:0;font-family:var(--mono);}
.qb-item-body{padding:16px;}
.qb-opt-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.qb-radio{width:20px;height:20px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;cursor:pointer;flex-shrink:0;transition:all .15s;}
.qb-radio.on{border-color:var(--good);background:var(--good);}
.qb-checkbox{width:20px;height:20px;border-radius:4px;border:2px solid var(--line);display:grid;place-items:center;cursor:pointer;flex-shrink:0;transition:all .15s;}
.qb-checkbox.on{border-color:var(--good);background:var(--good);}
.qb-letter{width:26px;height:26px;border-radius:6px;background:var(--surface-alt);border:1px solid var(--line);display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--ink-3);flex-shrink:0;font-family:var(--mono);}

/* STAT NUM */
.stat-num{font-family:var(--mono);font-variant-numeric:tabular-nums;}

/* DIVIDER */
.divider{text-align:center;font-size:11px;color:var(--ink-4);letter-spacing:.08em;padding:8px 0;}
`;

// ─── ICONS ───
const IC = {
  home: "M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9",
  trophy: "M8 21h8m-4-4v4M5 7H3a2 2 0 000 4c0 1.7 1 3.2 2.5 3.9M19 7h2a2 2 0 010 4c0 1.7-1 3.2-2.5 3.9M5 7V4h14v3M5 7a7 7 0 0014 0",
  book: "M12 6.5A8.5 8.5 0 006 4.5C4.3 4.5 2.7 4.9 1.5 5.5v14c1.2-.6 2.8-1 4.5-1 2.4 0 4.6.8 6 2 1.4-1.2 3.6-2 6-2 1.7 0 3.3.4 4.5 1v-14c-1.2-.6-2.8-1-4.5-1A8.5 8.5 0 0012 6.5z",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  chevL: "M15 18l-6-6 6-6", chevR: "M9 18l6-6-6-6",
  check: "M20 6L9 17l-5-5", x: "M18 6L6 18M6 6l12 12",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  target: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  link2: "M15 7h3a5 5 0 015 5 5 5 0 01-5 5h-3m-6 0H6a5 5 0 01-5-5 5 5 0 015-5h3m-1 5h8",
  sortDesc: "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12",
};
function I({ n, s = 16, style, cls = "" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style} className={cls}><path d={IC[n] || ""} /></svg>;
}

// ─── AVATAR ───
const AVC = [["#0d6b7a","#d8ebe9"],["#1e40af","#dbeafe"],["#7c3aed","#ede9fe"],["#b45309","#fef3c7"],["#0f766e","#ccfbf1"],["#c2410c","#ffedd5"]];
function hn(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000; return h; }
function inits(n) { const p = n.trim().split(/\s+/); return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase(); }
function Avatar({ name, size = "md" }) {
  const [bg, fg] = AVC[hn(name || "?") % AVC.length];
  const px = { sm: 28, md: 36, lg: 48, xl: 64 }[size] || 36;
  const fs = Math.round(px * 0.35);
  return <span className="av" style={{ width: px, height: px }}><svg width={px} height={px} viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill={bg} /><text x="50" y="63" textAnchor="middle" fontFamily="Plus Jakarta Sans,sans-serif" fontWeight="700" fontSize={fs * (100 / px)} fill={fg}>{inits(name || "?")}</text></svg></span>;
}

// ─── HELPERS ───
function fmtDl(dl) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dl); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - now) / 86400000);
  if (diff < 0) return { label: "Lewat deadline", tone: "bad" };
  if (diff === 0) return { label: "Hari ini!", tone: "warn" };
  if (diff <= 3) return { label: `${diff} hari lagi`, tone: "warn" };
  return { label: `${diff} hari lagi`, tone: "" };
}
function uid() { return Math.random().toString(36).slice(2, 10); }
function Card({ children, cls = "", style, pad = "p" }) {
  const p = { p: "cp", lg: "clg", none: "cn" }[pad] || "cp";
  return <div className={`card ${p} ${cls}`} style={style}>{children}</div>;
}
function PoinChart({ data }) {
  if (!data || data.length < 2) return <div style={{ height: 80, display: "grid", placeItems: "center", color: "var(--ink-4)", fontSize: 12 }}>Belum ada data</div>;
  const max = Math.max(...data.map(d => d.poin), 1), min = Math.min(...data.map(d => d.poin)), range = max - min || 1;
  const W = 100, H = 60;
  const pts = data.map((d, i) => { const x = (i / (data.length - 1)) * W, y = H - ((d.poin - min) / range) * (H - 8) - 4; return `${x},${y}`; });
  const area = `${pts[0].split(",")[0]},${H} ${pts.join(" ")} ${pts[pts.length - 1].split(",")[0]},${H}`;
  return <div className="chart-wrap"><svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".2" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs><polygon points={area} fill="url(#cg)" /><polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}

// ─── STORE ───
function useStore() {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  const getTugas = () => DB.get("tugas", []);
  const saveTugas = (list) => { DB.set("tugas", list); refresh(); };
  const addTugas = (t) => saveTugas([...getTugas(), { ...t, id: uid(), createdAt: new Date().toISOString(), status: "aktif" }]);
  const deleteTugas = (id) => saveTugas(getTugas().filter(t => t.id !== id));
  const updateTugas = (id, patch) => saveTugas(getTugas().map(t => t.id === id ? { ...t, ...patch } : t));
  const getSubs = () => DB.get("submissions", []);
  const saveSubs = (list) => { DB.set("submissions", list); refresh(); };
  const addSub = (s) => saveSubs([...getSubs(), { ...s, id: uid(), submittedAt: new Date().toISOString() }]);
  const hasSub = (sid, tid) => getSubs().some(s => s.siswaId === sid && s.tugasId === tid);
  const getSubBy = (sid, tid) => getSubs().find(s => s.siswaId === sid && s.tugasId === tid);
  const getStats = (sid) => DB.get(`stats.${sid}`, { poin: 0, poinHistory: [], tugasSelesai: 0, nilaiList: [], nilaiRata: 0 });
  const updateStats = (sid, nilai, poinDapat) => {
    const s = getStats(sid);
    const newPoin = s.poin + poinDapat;
    const newHistory = [...s.poinHistory, { minggu: s.poinHistory.length + 1, poin: newPoin }];
    const newNilai = [...s.nilaiList, nilai];
    DB.set(`stats.${sid}`, { poin: newPoin, poinHistory: newHistory, tugasSelesai: s.tugasSelesai + 1, nilaiList: newNilai, nilaiRata: Math.round(newNilai.reduce((a, b) => a + b, 0) / newNilai.length) });
    refresh();
  };
  const getLeaderboard = (jenjang) => {
    return ACCOUNTS.filter(a => a.role === "siswa" && (!jenjang || a.jenjang === jenjang))
      .map(s => { const st = getStats(s.id); return { ...s, ...st }; })
      .sort((a, b) => b.poin - a.poin).map((s, i) => ({ ...s, rank: i + 1 }));
  };
  return { getTugas, addTugas, deleteTugas, updateTugas, getSubs, addSub, hasSub, getSubBy, getStats, updateStats, getLeaderboard, tick };
}

// ─── CONFIRM MODAL ───
function Confirm({ title, desc, onOk, onCancel }) {
  return <div className="modal-overlay" onClick={onCancel}><div className="modal" onClick={e => e.stopPropagation()}><h3>{title}</h3><p>{desc}</p><div className="modal-actions"><button className="btn btn-outline btn-sm" onClick={onCancel}>Batal</button><button className="btn btn-danger btn-sm" onClick={onOk}>Hapus</button></div></div></div>;
}

// ─── LOGIN ───
function LoginScreen({ onLogin }) {
  const [id, setId] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  function submit() {
    if (!id.trim()) { setErr("ID belum diisi."); return; }
    if (!pw.trim()) { setErr("Password belum diisi."); return; }
    const acc = ACCOUNTS.find(a => a.id.toLowerCase() === id.trim().toLowerCase() && a.password === pw.trim());
    if (acc) onLogin(acc); else setErr("ID atau password salah.");
  }
  return <div className="login-wrap"><div className="login-card">
    <div className="login-logo"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="4" fill="white" /><ellipse cx="16" cy="16" rx="13" ry="5" stroke="white" strokeWidth="1.5" fill="none" transform="rotate(-30 16 16)" /><ellipse cx="16" cy="16" rx="13" ry="5" stroke="white" strokeWidth="1.5" fill="none" opacity=".5" transform="rotate(30 16 16)" /></svg></div>
    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Astrolab Classroom</div>
    <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4, marginBottom: 20 }}>SMP Negeri 15 Banda Aceh</div>
    <div className="fg"><label className="lbl">ID Siswa / Guru</label><input className="inp" value={id} onChange={e => { setId(e.target.value); setErr(""); }} placeholder="Contoh: FATA-001" onKeyDown={e => e.key === "Enter" && submit()} /></div>
    <div className="fg" style={{ marginTop: 12 }}><label className="lbl">Password</label><input className="inp" type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} placeholder="••••••" onKeyDown={e => e.key === "Enter" && submit()} /></div>
    {err && <div className="ferr">{err}</div>}
    <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 16 }} onClick={submit}>Masuk</button>
  </div></div>;
}

// ─── DASHBOARD SISWA ───
function DashboardSiswa({ user, store, navigate }) {
  const stats = store.getStats(user.id);
  const tugas = store.getTugas().filter(t => t.jenjang === user.jenjang && t.status === "aktif");
  const lb = store.getLeaderboard(user.jenjang);
  const myRank = lb.find(s => s.id === user.id);
  return <>
    <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Beranda</div><Avatar name={user.nama} size="sm" /></div>
    <div className="page">
      <div className="dt"><div><h1>Halo, {user.namaDisplay}! 👋</h1><p>{user.kelas} · SMP Negeri 15 Banda Aceh</p></div></div>
      <Card pad="lg" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "#fff", marginBottom: 12, border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, opacity: .8, fontWeight: 500 }}>TOTAL POIN</div>
            <div className="stat-num" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.03em" }}>{stats.poin.toLocaleString("id-ID")}</div>
            <div style={{ fontSize: 13, opacity: .8, marginTop: 2 }}>Ranking #{myRank?.rank || "—"} di Kelas {user.jenjang}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32 }}>🔭</div>
            <div style={{ fontSize: 13, opacity: .85, fontWeight: 600 }}>{stats.tugasSelesai} tugas selesai</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.2)", color: "#fff", backdropFilter: "blur(4px)" }} onClick={() => navigate("leaderboard")}><I n="trophy" s={13} /> Ranking</button>
          <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.15)", color: "#fff", backdropFilter: "blur(4px)" }} onClick={() => navigate("tugas")}><I n="book" s={13} /> Tugas</button>
        </div>
      </Card>
      <div className="g3" style={{ marginBottom: 16 }}>
        {[{ label: "Tugas selesai", val: stats.tugasSelesai, icon: "✅" }, { label: "Nilai rata-rata", val: stats.nilaiRata || "—", icon: "📊" }, { label: "Total poin", val: stats.poin, icon: "🏅" }].map(s => <Card key={s.label} style={{ textAlign: "center", padding: "12px 8px" }}><div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div><div className="stat-num" style={{ fontSize: 16, fontWeight: 700 }}>{s.val}</div><div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{s.label}</div></Card>)}
      </div>
      <div className="sh"><h2>Tugas aktif</h2><button className="btn btn-soft btn-sm" onClick={() => navigate("tugas")}>Semua <I n="chevR" s={12} /></button></div>
      {tugas.length === 0 ? <div className="empty">Belum ada tugas aktif dari guru.</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {tugas.slice(0, 3).map(t => { const dl = fmtDl(t.deadline); const done = store.hasSub(user.id, t.id); return <button key={t.id} onClick={() => navigate("tugas-detail", { tugasId: t.id })} style={{ textAlign: "left", display: "block", width: "100%", background: "none", border: "none" }}><Card><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", background: done ? "var(--good-bg)" : "var(--accent-soft)", display: "grid", placeItems: "center", color: done ? "var(--good)" : "var(--accent-2)", flexShrink: 0 }}><I n={done ? "check" : "book"} s={18} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{t.judul}</div><div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{t.mapel}</div></div>{done ? <span className="chip chip-good">Selesai</span> : <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}>{dl.label}</span>}</div></Card></button>; })}
        </div>}
      <div className="sh"><h2>Top 3 Kelas {user.jenjang}</h2><button className="btn btn-soft btn-sm" onClick={() => navigate("leaderboard")}>Semua <I n="chevR" s={12} /></button></div>
      <Card pad="none" style={{ overflow: "hidden" }}>
        {lb.length === 0 ? <div className="empty">Belum ada ranking. Kerjakan tugas dulu! 🚀</div> :
          lb.slice(0, 3).map(s => <div key={s.id} className="lb-row" style={{ gridTemplateColumns: "28px 34px 1fr auto" }}><div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : "top3"}`}>{s.rank}</div><Avatar name={s.nama} size="sm" /><div><div className="lb-name">{s.nama}{s.id === user.id && <span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span>}</div><div className="lb-meta">{s.kelas}</div></div><div className="lb-pts">{s.poin.toLocaleString("id-ID")}</div></div>)}
      </Card>
    </div>
  </>;
}

// ─── LEADERBOARD ───
function LeaderboardScreen({ user, store }) {
  const isGuru = user.role === "guru";
  const [tab, setTab] = useState(isGuru ? "VII" : user.jenjang);
  const lb = store.getLeaderboard(tab);
  const myRow = lb.find(s => s.id === user.id);
  const myInTop = myRow && myRow.rank <= 10;
  return <>
    <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Leaderboard</div><I n="trophy" s={18} /></div>
    <div className="page">
      <div className="dt"><div><h1>Leaderboard</h1><p>Ranking poin akumulatif · semester ini</p></div></div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === "VII" ? "active" : ""}`} onClick={() => setTab("VII")}>Kelas VII</button>
        <button className={`tab ${tab === "VIII" ? "active" : ""}`} onClick={() => setTab("VIII")}>Kelas VIII</button>
      </div>
      {lb.length === 0 ? <Card><div className="empty empty-box"><I n="trophy" s={32} /><h3>Belum ada ranking</h3><p>Ranking muncul setelah siswa menyelesaikan tugas pertama.</p></div></Card> : <>
        {lb.length >= 3 && <Card pad="lg" style={{ marginBottom: 12 }}>
          <div className="podium">
            {[lb[1], lb[0], lb[2]].map((s, idx) => { const place = [2, 1, 3][idx], h = [80, 110, 60][idx], col = ["#94a3b8", "#b45309", "#78716c"][idx]; return <div key={s.id} style={{ flex: 1, textAlign: "center", maxWidth: 110 }}><div style={{ position: "relative", display: "inline-block", marginBottom: 6 }}><Avatar name={s.nama} size={place === 1 ? "xl" : "lg"} />{place === 1 && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontSize: 20 }}>👑</div>}</div><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nama.split(" ")[0]}</div><div className="stat-num" style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.poin.toLocaleString("id-ID")} pt</div><div style={{ height: h, marginTop: 8, background: col, borderTopLeftRadius: "var(--r-sm)", borderTopRightRadius: "var(--r-sm)", display: "grid", placeItems: "center", fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,.75)" }}>{place}</div></div>; })}
          </div>
        </Card>}
        <Card pad="none" style={{ overflow: "hidden" }}>
          {lb.slice(0, 10).map(s => <div key={s.id} className={`lb-row ${!isGuru && s.id === user.id ? "me" : ""}`}><div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : s.rank === 3 ? "top3" : ""}`}>{s.rank}</div><Avatar name={s.nama} size="md" /><div style={{ minWidth: 0 }}><div className="lb-name">{s.nama}{!isGuru && s.id === user.id && <span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span>}</div><div className="lb-meta">{s.kelas} · {s.tugasSelesai || 0} tugas</div></div><div className="lb-pts">{s.poin.toLocaleString("id-ID")}</div></div>)}
        </Card>
        {!isGuru && !myInTop && myRow && <><div className="divider">· · ·</div><Card pad="none" style={{ overflow: "hidden" }}><div className="lb-row me"><div className="lb-rank">{myRow.rank}</div><Avatar name={myRow.nama} size="md" /><div style={{ minWidth: 0 }}><div className="lb-name">{myRow.nama}<span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span></div><div className="lb-meta">{myRow.kelas}</div></div><div className="lb-pts">{myRow.poin.toLocaleString("id-ID")}</div></div></Card></>}
      </>}
    </div>
  </>;
}

// ─── DAFTAR TUGAS (SISWA) ───
function DaftarTugas({ user, store, navigate }) {
  const [filter, setFilter] = useState("aktif");
  const semua = store.getTugas().filter(t => t.jenjang === user.jenjang);
  const filtered = filter === "semua" ? semua : semua.filter(t => t.status === filter);
  return <>
    <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Tugas</div><I n="book" s={18} /></div>
    <div className="page">
      <div className="dt"><div><h1>Tugas</h1><p>Kelas {user.jenjang} · {user.kelas}</p></div></div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[["aktif", "Aktif"], ["selesai", "Selesai"], ["semua", "Semua"]].map(([v, l]) => <button key={v} className={`tab ${filter === v ? "active" : ""}`} onClick={() => setFilter(v)}>{l}</button>)}
      </div>
      {filtered.length === 0 ? <Card><div className="empty empty-box"><I n="book" s={32} /><h3>Belum ada tugas</h3><p>Tugas akan muncul di sini setelah guru membuat tugas untuk kelasmu.</p></div></Card> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(t => { const dl = fmtDl(t.deadline); const done = store.hasSub(user.id, t.id); return <button key={t.id} onClick={() => navigate("tugas-detail", { tugasId: t.id })} style={{ textAlign: "left", display: "block", width: "100%", background: "none", border: "none" }}><Card><div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}><div style={{ width: 42, height: 42, borderRadius: "var(--r-sm)", background: done ? "var(--good-bg)" : "var(--accent-soft)", color: done ? "var(--good)" : "var(--accent-2)", display: "grid", placeItems: "center", flexShrink: 0 }}><I n={done ? "check" : "book"} s={18} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>{t.mapel}</div><div style={{ fontSize: 15, fontWeight: 600 }}>{t.judul}</div><div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{done ? <span className="chip chip-good"><I n="check" s={10} /> Selesai</span> : <><span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span><span className="chip"><I n="target" s={10} />+{t.poinMax} pt</span><span className="chip">{t.soal?.length || 0} soal</span></>}</div></div><I n="chevR" s={16} style={{ color: "var(--ink-3)", marginTop: 12, flexShrink: 0 }} /></div></Card></button>; })}
        </div>}
    </div>
  </>;
}

// ─── DETAIL TUGAS ───
function DetailTugas({ user, store, tugasId, navigate }) {
  const t = store.getTugas().find(x => x.id === tugasId);
  if (!t) return <div className="empty">Tugas tidak ditemukan.</div>;
  const dl = fmtDl(t.deadline);
  const done = store.hasSub(user.id, t.id);
  const sub = store.getSubBy(user.id, t.id);
  const bisa = !done && t.status === "aktif" && t.soal?.length > 0 && dl.tone !== "bad";
  return <>
    <div className="topbar"><button className="topbar-back" onClick={() => navigate("tugas")}><I n="chevL" s={18} /></button><div className="topbar-title">Detail Tugas</div><div style={{ width: 36 }} /></div>
    <div className="page">
      <div className="dt"><div><h1>{t.judul}</h1><p>{t.mapel}</p></div></div>
      <Card pad="lg" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{t.mapel}</div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>{t.judul}</div>
        {t.deskripsi && <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65, marginBottom: 14 }}>{t.deskripsi}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span>
          <span className="chip"><I n="target" s={10} />+{t.poinMax} pt maks</span>
          <span className="chip">{t.soal?.length || 0} soal</span>
        </div>
      </Card>
      {done && sub && <Card pad="lg" style={{ marginBottom: 12, background: "var(--good-bg)", border: "1px solid #86efac" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ fontSize: 36 }}>✅</div><div><div style={{ fontWeight: 700, color: "var(--good)" }}>Sudah dikerjakan!</div><div style={{ fontSize: 13, marginTop: 2 }}>Nilai: <strong>{sub.nilai}</strong> · Poin: <strong>+{sub.poinDapat}</strong></div><div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{new Date(sub.submittedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div></div></div></Card>}
      {bisa && <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate("kerjakan", { tugasId: t.id })}><I n="book" s={16} /> Mulai Kerjakan</button>}
      {bisa && <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "var(--ink-4)" }}>Bismillah ✨</div>}
      {!bisa && !done && <div style={{ textAlign: "center", padding: 16, color: "var(--ink-3)", fontSize: 13 }}>{dl.tone === "bad" ? "⏰ Sudah lewat deadline" : t.soal?.length === 0 ? "Soal belum tersedia" : "Tugas tidak aktif"}</div>}
    </div>
  </>;
}

// ─── QUIZ ENGINE ───
function KerjakanTugas({ user, store, tugasId, navigate }) {
  const t = store.getTugas().find(x => x.id === tugasId);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  if (!t || !t.soal?.length) return <div className="empty">Soal tidak tersedia.</div>;
  const total = t.soal.length, soal = t.soal[idx];
  function answer(val) { if (!submitted) setAnswers(a => ({ ...a, [idx]: val })); }
  function toggleMulti(val) { if (submitted) return; const cur = answers[idx] || []; setAnswers(a => ({ ...a, [idx]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] })); }
  function submit() {
    let totalPoin = 0, correctCount = 0;
    t.soal.forEach((s, i) => {
      const ans = answers[i]; const poinSoal = s.poin || Math.floor(t.poinMax / total); let correct = false;
      if (s.type === "pg" || s.type === "tf") correct = ans === s.jawaban;
      else if (s.type === "komplex") correct = (ans || []).slice().sort().join(",") === (s.jawaban || []).slice().sort().join(",");
      else if (s.type === "pasang") correct = s.jawaban?.every((j, ki) => (ans || {})[ki] === j);
      if (correct) { totalPoin += poinSoal; correctCount++; }
    });
    const nilai = Math.round((correctCount / total) * 100);
    setResult({ nilai, poinDapat: totalPoin, correctCount });
    store.addSub({ siswaId: user.id, tugasId: t.id, nilai, poinDapat: totalPoin, correctCount, total });
    store.updateStats(user.id, nilai, totalPoin);
    setSubmitted(true);
  }
  if (submitted && result) {
    const emoji = result.nilai >= 90 ? "🎉" : result.nilai >= 70 ? "👍" : "📚";
    return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Selesai!</div>
      <div style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 4 }}>{t.judul}</div>
      <div className="stat-num" style={{ fontSize: 52, fontWeight: 800, color: "var(--accent)", margin: "24px 0 4px", letterSpacing: "-.03em" }}>{result.nilai}</div>
      <div style={{ fontSize: 13, color: "var(--ink-3)" }}>nilai · {result.correctCount}/{total} benar</div>
      <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>+{result.poinDapat} poin didapat</div>
      <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
        <button className="btn btn-outline" onClick={() => navigate("tugas")}>Kembali ke Tugas</button>
        <button className="btn btn-primary" onClick={() => navigate("leaderboard")}>Lihat Ranking</button>
      </div>
    </div>;
  }
  const pct = Math.round(((idx + 1) / total) * 100);
  const answered = Object.keys(answers).length;
  const curOk = answers[idx] !== undefined && answers[idx] !== null && !(Array.isArray(answers[idx]) && answers[idx].length === 0);
  return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
    <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
      <button className="topbar-back" onClick={() => navigate("tugas-detail", { tugasId })}><I n="chevL" s={18} /></button>
      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{t.judul}</div><div style={{ fontSize: 11, color: "var(--ink-3)" }}>Soal {idx + 1} dari {total}</div></div>
      <div style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--accent)" }}>{pct}%</div>
    </div>
    <div style={{ height: 3, background: "var(--surface-alt)" }}><div style={{ height: "100%", background: "var(--accent)", width: `${pct}%`, transition: "width .3s" }} /></div>
    <div style={{ flex: 1, padding: "20px 16px", maxWidth: 560, margin: "0 auto", width: "100%" }}>
      <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--mono)", marginBottom: 8 }}>SOAL {idx + 1} · {soal.poin || Math.floor(t.poinMax / total)} POIN</div>
      <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.55, marginBottom: 20 }}>{soal.pertanyaan}</div>
      {soal.type === "pg" && soal.opsi?.map((o, i) => <button key={i} className={`quiz-opt ${answers[idx] === i ? "selected" : ""}`} onClick={() => answer(i)}><div className="quiz-letter">{String.fromCharCode(65 + i)}</div><span style={{ flex: 1 }}>{o}</span></button>)}
      {soal.type === "tf" && <div style={{ display: "flex", gap: 10 }}>{["Benar", "Salah"].map((o, i) => <button key={i} className={`quiz-opt ${answers[idx] === i ? "selected" : ""}`} style={{ flex: 1 }} onClick={() => answer(i)}><div className="quiz-letter">{i === 0 ? "T" : "F"}</div><span style={{ flex: 1 }}>{i === 0 ? "✅" : "❌"} {o}</span></button>)}</div>}
      {soal.type === "komplex" && <><div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Pilih semua jawaban yang benar</div>{soal.opsi?.map((o, i) => { const sel = (answers[idx] || []).includes(i); return <button key={i} className={`quiz-opt ${sel ? "selected" : ""}`} onClick={() => toggleMulti(i)}><div style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${sel ? "var(--accent)" : "var(--line)"}`, background: sel ? "var(--accent)" : "var(--surface-alt)", display: "grid", placeItems: "center", flexShrink: 0 }}>{sel && <I n="check" s={13} style={{ color: "#fff" }} />}</div><span style={{ flex: 1 }}>{String.fromCharCode(65 + i)}. {o}</span></button>; })}</>}
      {soal.type === "pasang" && <><div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Pasangkan kolom kiri dengan kolom kanan</div>{soal.kiri?.map((k, ki) => <div key={ki} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ flex: 1, padding: "8px 12px", background: "var(--accent-soft)", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, color: "var(--accent-2)" }}>{k}</div><I n="chevR" s={14} /><select className="inp" style={{ flex: 1, fontSize: 13 }} value={(answers[idx] || {})[ki] ?? ""} onChange={e => { const cur = answers[idx] || {}; answer({ ...cur, [ki]: Number(e.target.value) }); }}><option value="">Pilih...</option>{soal.kanan?.map((r, ri) => <option key={ri} value={ri}>{r}</option>)}</select></div>)}</>}
    </div>
    <div style={{ padding: "12px 16px", background: "var(--surface)", borderTop: "1px solid var(--line)", display: "flex", gap: 10 }}>
      {idx > 0 && <button className="btn btn-outline" onClick={() => setIdx(i => i - 1)}>← Sebelumnya</button>}
      <div style={{ flex: 1 }} />
      {idx < total - 1 ? <button className="btn btn-primary" onClick={() => setIdx(i => i + 1)} disabled={!curOk}>Selanjutnya →</button> : <button className="btn btn-primary" onClick={submit} disabled={answered < total}><I n="check" s={14} /> Kumpulkan ({answered}/{total})</button>}
    </div>
  </div>;
}

// ─── PROFIL SISWA ───
function ProfilSiswa({ user, store }) {
  const stats = store.getStats(user.id);
  const lb = store.getLeaderboard(user.jenjang);
  const myRank = lb.find(s => s.id === user.id);
  const subs = store.getSubs().filter(s => s.siswaId === user.id);
  return <>
    <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Profil</div><Avatar name={user.nama} size="sm" /></div>
    <div className="page">
      <div className="dt"><div><h1>Profil</h1><p>Track record semester ini</p></div></div>
      <Card pad="lg" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <Avatar name={user.nama} size="xl" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>{user.nama}</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{user.kelas} · SMP Negeri 15 Banda Aceh</div>
            <div style={{ marginTop: 8, display: "flex", gap: 6 }}>{myRank && <span className="chip chip-accent">#{myRank.rank} Kelas {user.jenjang}</span>}<span className="chip">{stats.tugasSelesai} tugas selesai</span></div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, paddingTop: 16, borderTop: "1px solid var(--line-soft)" }}>
          {[{ v: stats.poin.toLocaleString("id-ID"), l: "total poin" }, { v: String(stats.tugasSelesai), l: "tugas selesai" }, { v: stats.nilaiRata || "—", l: "nilai rata" }].map(s => <div key={s.l}><div className="stat-num" style={{ fontSize: 22, fontWeight: 700 }}>{s.v}</div><div style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.l}</div></div>)}
        </div>
      </Card>
      {stats.poinHistory.length > 0 && <Card style={{ marginBottom: 12 }}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Perjalanan poin</div><PoinChart data={stats.poinHistory} /></Card>}
      <div className="sh"><h2>Riwayat pengerjaan</h2></div>
      {subs.length === 0 ? <Card><div className="empty">Belum ada tugas yang dikerjakan.</div></Card> :
        <Card pad="none" style={{ overflow: "hidden" }}><div style={{ padding: "4px 16px" }}>{subs.slice().reverse().map(s => { const t = store.getTugas().find(x => x.id === s.tugasId); return <div key={s.id} className="row"><div style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center", flexShrink: 0 }}><I n="check" s={16} /></div><div className="row-main"><div className="row-title">{t?.judul || "Tugas dihapus"}</div><div className="row-sub">{new Date(s.submittedAt).toLocaleDateString("id-ID")} · nilai {s.nilai}</div></div><div className="stat-num" style={{ fontSize: 14, fontWeight: 600, color: "var(--good)" }}>+{s.poinDapat}</div></div>; })}</div></Card>}
    </div>
  </>;
}

// ─── QUESTION BUILDER ───
const QTYPES = [
  { id: "pg", name: "Pilihan Ganda", desc: "4 opsi, 1 jawaban", icon: "list" },
  { id: "tf", name: "Benar / Salah", desc: "Pernyataan B/S", icon: "check" },
  { id: "komplex", name: "Mencocokkan", desc: "Multi jawaban benar", icon: "link2" },
  { id: "pasang", name: "Susun Urutan", desc: "Pasangan kiri-kanan", icon: "sortDesc" },
];

function QuestionBuilder({ soal, setSoal }) {
  function addQ(type) {
    const base = { id: uid(), type, pertanyaan: "", poin: 10 };
    if (type === "pg" || type === "komplex") setSoal(s => [...s, { ...base, opsi: ["", "", "", ""], jawaban: type === "pg" ? 0 : [] }]);
    else if (type === "tf") setSoal(s => [...s, { ...base, jawaban: 0 }]);
    else setSoal(s => [...s, { ...base, kiri: ["", ""], kanan: ["", ""], jawaban: [0, 1] }]);
  }
  function upQ(id, patch) { setSoal(s => s.map(q => q.id === id ? { ...q, ...patch } : q)); }
  function rmQ(id) { setSoal(s => s.filter(q => q.id !== id)); }
  function upOpsi(id, i, val) { setSoal(s => s.map(q => { if (q.id !== id) return q; const o = [...(q.opsi || [])]; o[i] = val; return { ...q, opsi: o }; })); }
  function addOpsi(id) { setSoal(s => s.map(q => q.id === id ? { ...q, opsi: [...(q.opsi || []), ""] } : q)); }
  function rmOpsi(id, i) { setSoal(s => s.map(q => q.id === id ? { ...q, opsi: q.opsi.filter((_, oi) => oi !== i) } : q)); }

  return <div>
    {soal.map((q, qi) => {
      const qt = QTYPES.find(t => t.id === q.type);
      return <div key={q.id} className="qb-item">
        <div className="qb-item-head">
          <div className="qb-item-num">{qi + 1}</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-2)" }}>{qt?.name}</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" className="inp" style={{ width: 68, padding: "4px 8px", fontSize: 12 }} value={q.poin} min={1} onChange={e => upQ(q.id, { poin: Number(e.target.value) })} title="Poin soal" />
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>pt</span>
            <button className="btn btn-ghost btn-sm" onClick={() => rmQ(q.id)} style={{ color: "var(--bad)", padding: "4px 8px" }}>× Hapus</button>
          </div>
        </div>
        <div className="qb-item-body">
          <textarea className="inp" rows={2} placeholder="Tulis pertanyaan / instruksi..." value={q.pertanyaan} onChange={e => upQ(q.id, { pertanyaan: e.target.value })} style={{ marginBottom: 12 }} />

          {/* PG */}
          {(q.type === "pg" || q.type === "komplex") && <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>{q.type === "pg" ? "Klik ● untuk tandai jawaban benar" : "Centang semua jawaban yang benar"}</div>
            {(q.opsi || []).map((o, i) => <div key={i} className="qb-opt-row">
              {q.type === "pg"
                ? <div className={`qb-radio ${q.jawaban === i ? "on" : ""}`} onClick={() => upQ(q.id, { jawaban: i })} title="Jawaban benar">{q.jawaban === i && <I n="check" s={11} style={{ color: "#fff" }} />}</div>
                : <div className={`qb-checkbox ${(q.jawaban || []).includes(i) ? "on" : ""}`} onClick={() => { const c = q.jawaban || []; upQ(q.id, { jawaban: c.includes(i) ? c.filter(v => v !== i) : [...c, i] }); }}>{(q.jawaban || []).includes(i) && <I n="check" s={11} style={{ color: "#fff" }} />}</div>}
              <div className="qb-letter">{String.fromCharCode(65 + i)}</div>
              <input className="inp" style={{ flex: 1, padding: "7px 11px", fontSize: 13 }} placeholder={`Pilihan ${String.fromCharCode(65 + i)}`} value={o} onChange={e => upOpsi(q.id, i, e.target.value)} />
              {(q.opsi || []).length > 2 && <button className="btn btn-ghost btn-sm" onClick={() => rmOpsi(q.id, i)} style={{ padding: "4px 8px" }}><I n="x" s={13} /></button>}
            </div>)}
            {(q.opsi || []).length < 6 && <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => addOpsi(q.id)}><I n="plus" s={13} /> Tambah pilihan</button>}
          </div>}

          {/* TF */}
          {q.type === "tf" && <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>Tandai jawaban yang benar</div>
            <div style={{ display: "flex", gap: 8 }}>{["Benar", "Salah"].map((o, i) => <button key={i} className={`btn ${q.jawaban === i ? "btn-primary" : "btn-outline"} btn-sm`} onClick={() => upQ(q.id, { jawaban: i })}>{i === 0 ? "✅" : "❌"} {o}</button>)}</div>
          </div>}

          {/* Pasang */}
          {q.type === "pasang" && <div>
            <div className="g2" style={{ marginBottom: 10 }}>
              <div><div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>Kolom Kiri</div>{(q.kiri || []).map((k, i) => <input key={i} className="inp" style={{ fontSize: 13, padding: "7px 10px", marginBottom: 6 }} value={k} placeholder={`Item ${i + 1}`} onChange={e => { const kiri = [...(q.kiri || [])]; kiri[i] = e.target.value; upQ(q.id, { kiri }); }} />)}</div>
              <div><div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>Kolom Kanan</div>{(q.kanan || []).map((r, i) => <input key={i} className="inp" style={{ fontSize: 13, padding: "7px 10px", marginBottom: 6 }} value={r} placeholder={`Pasangan ${i + 1}`} onChange={e => { const kanan = [...(q.kanan || [])]; kanan[i] = e.target.value; upQ(q.id, { kanan }); }} />)}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => upQ(q.id, { kiri: [...(q.kiri || []), ""], kanan: [...(q.kanan || []), ""], jawaban: [...(q.jawaban || []), (q.kanan || []).length] })} style={{ marginBottom: 10 }}><I n="plus" s={13} /> Tambah pasangan</button>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>Tentukan pasangan yang benar:</div>
            {(q.kiri || []).map((k, ki) => <div key={ki} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12 }}>
              <span style={{ flex: 1, fontWeight: 500 }}>{k || `Item ${ki + 1}`}</span>
              <I n="chevR" s={13} style={{ color: "var(--ink-3)" }} />
              <select className="inp" style={{ flex: 1, fontSize: 12, padding: "5px 10px" }} value={(q.jawaban || [])[ki] ?? ""} onChange={e => { const j = [...(q.jawaban || [])]; j[ki] = Number(e.target.value); upQ(q.id, { jawaban: j }); }}>
                <option value="">Pilih...</option>
                {(q.kanan || []).map((r, ri) => <option key={ri} value={ri}>{r || `Pasangan ${ri + 1}`}</option>)}
              </select>
            </div>)}
          </div>}
        </div>
      </div>;
    })}

    {/* Add question type selector */}
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, marginBottom: 10 }}>+ Tambah soal baru:</div>
      <div className="qtype-grid">
        {QTYPES.map(t => <button key={t.id} className="qtype-btn" onClick={() => addQ(t.id)}>
          <div className="qtype-icon"><I n={t.icon} s={16} /></div>
          <div className="qtype-name">{t.name}</div>
          <div className="qtype-desc">{t.desc}</div>
        </button>)}
      </div>
    </div>
  </div>;
}

// ─── BUAT / EDIT TUGAS (2-column layout) ───
function BuatTugas({ store, navigate, editId = null }) {
  const existing = editId ? store.getTugas().find(t => t.id === editId) : null;
  const [form, setForm] = useState({
    judul: existing?.judul || "", mapel: existing?.mapel || "IPA",
    jenjang: existing?.jenjang || "VII", deadline: existing?.deadline || "",
    poinMax: existing?.poinMax || 100, deskripsi: existing?.deskripsi || "",
  });
  const [soal, setSoal] = useState(existing?.soal || []);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totalPoin = soal.reduce((s, q) => s + (q.poin || 0), 0);

  function submit() {
    if (!form.judul.trim()) { setErr("Judul tugas wajib diisi."); return; }
    if (!form.deadline) { setErr("Deadline wajib diisi."); return; }
    if (soal.length === 0) { setErr("Tambahkan minimal 1 soal."); return; }
    const data = { ...form, soal, poinMax: totalPoin || Number(form.poinMax) };
    if (editId) store.updateTugas(editId, data); else store.addTugas(data);
    setSaved(true); setTimeout(() => navigate("home-guru"), 1200);
  }

  if (saved) return <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}><div style={{ fontSize: 48 }}>✅</div><div style={{ fontSize: 18, fontWeight: 800 }}>Tugas berhasil {editId ? "diperbarui" : "diterbitkan"}!</div><div style={{ fontSize: 13, color: "var(--ink-3)" }}>Siswa sudah bisa mulai mengerjakan</div></div>;

  return <>
    {/* Header desktop */}
    <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: "var(--hdr-h)", zIndex: 40 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>{editId ? "Edit tugas" : "Tugas baru"}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Bikin tugas pilihan ganda · auto-grading</div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("home-guru")}>Batal</button>
        <button className="btn btn-primary" onClick={submit}><I n="check" s={14} /> {editId ? "Simpan perubahan" : `Publish ke Kelas ${form.jenjang}`}</button>
      </div>
    </div>

    {/* Mobile topbar */}
    <div className="topbar">
      <button className="topbar-back" onClick={() => navigate("home-guru")}><I n="chevL" s={18} /></button>
      <div className="topbar-title">{editId ? "Edit Tugas" : "Tugas Baru"}</div>
      <button className="btn btn-primary btn-sm" onClick={submit}>Publish</button>
    </div>

    <div className="page">
      <div className="buat-layout">
        {/* LEFT: Form */}
        <div>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="fg">
                <label className="lbl">Judul tugas</label>
                <input className="inp" value={form.judul} onChange={e => set("judul", e.target.value)} placeholder="Misal: Sistem Tata Surya" />
              </div>
              <div className="g2">
                <div className="fg">
                  <label className="lbl">Bab / Mapel</label>
                  <select className="inp" value={form.mapel} onChange={e => set("mapel", e.target.value)}>
                    <option>IPA</option>
                    <option>Informatika</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Jenjang</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["VII", "VIII"].map(j => <button key={j} type="button" className={`btn ${form.jenjang === j ? "btn-primary" : "btn-outline"} btn-sm`} style={{ flex: 1, justifyContent: "center" }} onClick={() => set("jenjang", j)}>{j}</button>)}
                  </div>
                </div>
              </div>
              <div className="g2">
                <div className="fg">
                  <label className="lbl">Deadline</label>
                  <input className="inp" type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} />
                </div>
                <div className="fg">
                  <label className="lbl">Poin per soal benar</label>
                  <input className="inp" type="number" value={form.poinMax / (soal.length || 1)} readOnly style={{ color: "var(--ink-3)", background: "var(--surface-alt)" }} placeholder="Otomatis" />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Deskripsi (opsional)</label>
                <textarea className="inp" value={form.deskripsi} onChange={e => set("deskripsi", e.target.value)} placeholder="Instruksi tambahan untuk siswa..." rows={2} />
              </div>
            </div>
          </Card>

          {/* Soal section */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 0 12px" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Soal · {soal.length}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>Total maks: {totalPoin} pt</div>
          </div>

          <QuestionBuilder soal={soal} setSoal={setSoal} />

          {err && <div style={{ color: "var(--bad)", fontSize: 12, margin: "12px 0", padding: "10px 14px", background: "var(--bad-bg)", borderRadius: "var(--r-sm)", border: "1px solid #fca5a5" }}>⚠️ {err}</div>}
          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 16 }} onClick={submit}><I n="check" s={16} /> {editId ? "Simpan Perubahan" : "Terbitkan Tugas"}</button>
        </div>

        {/* RIGHT: Preview (desktop only) */}
        <div style={{ display: "none" }} className="dt-right">
          <div style={{ position: "sticky", top: "calc(var(--hdr-h) + 80px)" }}>
            <div className="preview-card-label">Preview kartu tugas</div>
            <div className="preview-task-card">
              <div className="preview-bab">{form.mapel || "BAB —"}</div>
              <div className="preview-title">{form.judul || "Judul tugas"}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="chip"><I n="clock" s={10} />{form.deadline || "—"}</span>
                <span className="chip"><I n="target" s={10} />+{totalPoin || 20} pt</span>
                <span className="chip">{soal.length} soal</span>
              </div>
            </div>
            <div className="target-card" style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 10 }}>Akan terkirim ke</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="target-kelas-badge">{form.jenjang}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Kelas {form.jenjang}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{ACCOUNTS.filter(a => a.role === "siswa" && a.jenjang === form.jenjang).length} siswa</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <style>{`.dt-right{display:block !important;}@media(max-width:899px){.dt-right{display:none !important;}}`}</style>
  </>;
}

// ─── DASHBOARD GURU ───
function DashboardGuru({ store, navigate }) {
  const [jenjang, setJenjang] = useState("VII");
  const [confirm, setConfirm] = useState(null);
  const tugasAll = store.getTugas().filter(t => t.jenjang === jenjang);
  const lb = store.getLeaderboard(jenjang);
  const siswa = ACCOUNTS.filter(a => a.role === "siswa" && a.jenjang === jenjang);
  const subs = store.getSubs();
  const totalSubs = subs.filter(s => { const t = store.getTugas().find(x => x.id === s.tugasId); return t && t.jenjang === jenjang; }).length;
  return <>
    {confirm && <Confirm title="Hapus tugas?" desc="Tugas dihapus. Poin siswa yang sudah mengerjakan tidak berubah." onOk={() => { store.deleteTugas(confirm); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Dashboard</div><button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => navigate("buat-tugas")}><I n="plus" s={20} /></button></div>
    <div className="page">
      <div className="dt"><div><h1>Dashboard</h1><p>M. Hasanul Fatta, S.Pd. · IPA & Informatika</p></div><button className="btn btn-primary" onClick={() => navigate("buat-tugas")}><I n="plus" s={14} /> Tugas baru</button></div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${jenjang === "VII" ? "active" : ""}`} onClick={() => setJenjang("VII")}>Kelas VII</button>
        <button className={`tab ${jenjang === "VIII" ? "active" : ""}`} onClick={() => setJenjang("VIII")}>Kelas VIII</button>
      </div>
      <div className="g3" style={{ marginBottom: 18 }}>
        {[{ l: "Tugas aktif", v: tugasAll.filter(t => t.status === "aktif").length }, { l: "Pengumpulan", v: totalSubs }, { l: "Siswa", v: siswa.length }].map(s => <Card key={s.l} style={{ padding: "14px 16px" }}><div className="stat-num" style={{ fontSize: 26, fontWeight: 800 }}>{s.v}</div><div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{s.l}</div></Card>)}
      </div>
      <div className="sh"><h2>Tugas yang sedang berjalan</h2><button className="btn btn-primary btn-sm" onClick={() => navigate("buat-tugas")}><I n="plus" s={12} /> Baru</button></div>
      {tugasAll.length === 0 ? <Card><div className="empty empty-box"><I n="book" s={32} /><h3>Belum ada tugas</h3><p>Buat tugas pertama untuk Kelas {jenjang} dan mulai perjalanan belajar!</p><button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate("buat-tugas")}><I n="plus" s={14} /> Buat Tugas Pertama</button></div></Card> :
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {tugasAll.map(t => { const dl = fmtDl(t.deadline); const subCount = subs.filter(s => s.tugasId === t.id).length; const pct = siswa.length ? Math.round((subCount / siswa.length) * 100) : 0; return <Card key={t.id}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".05em" }}>{t.mapel}</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, letterSpacing: "-.01em" }}>{t.judul}</div><div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}><span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span><span className="chip">{t.soal?.length || 0} soal</span><span className="chip">+{t.poinMax} pt</span></div></div><div style={{ display: "flex", gap: 6, flexShrink: 0 }}><button className="btn btn-soft btn-sm" onClick={() => navigate("edit-tugas", { tugasId: t.id })}><I n="edit" s={13} /></button><button className="btn btn-danger btn-sm" onClick={() => setConfirm(t.id)}><I n="trash" s={13} /></button></div></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ flex: 1 }}><div className="progress"><div style={{ width: `${pct}%`, background: pct < 30 ? "var(--bad)" : pct < 70 ? "var(--warn)" : "var(--good)" }} /></div></div><div className="stat-num" style={{ fontSize: 12, fontWeight: 600 }}>{subCount}/{siswa.length}</div></div><div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>{siswa.length - subCount} siswa belum mengerjakan</div></Card>; })}
        </div>}
      <div className="sh"><h2>Ranking Siswa</h2><button className="btn btn-ghost btn-sm" onClick={() => navigate("leaderboard")}>Semua <I n="chevR" s={12} /></button></div>
      <Card pad="none" style={{ overflow: "hidden" }}>
        {lb.length === 0 ? <div className="empty">Belum ada siswa dengan poin.</div> :
          lb.slice(0, 5).map(s => <div key={s.id} className="lb-row"><div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : s.rank === 3 ? "top3" : ""}`}>{s.rank}</div><Avatar name={s.nama} size="md" /><div style={{ minWidth: 0 }}><div className="lb-name">{s.nama}</div><div className="lb-meta">{s.kelas} · {s.tugasSelesai || 0} tugas</div></div><div className="lb-pts">{s.poin.toLocaleString("id-ID")} pt</div></div>)}
      </Card>
    </div>
  </>;
}

// ─── KELAS VIEW ───
function KelasView({ store }) {
  const [jenjang, setJenjang] = useState("VII");
  const lb = store.getLeaderboard(jenjang);
  return <>
    <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Siswa</div><I n="user" s={18} /></div>
    <div className="page">
      <div className="dt"><div><h1>Siswa</h1><p>Daftar dan performa siswa</p></div></div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${jenjang === "VII" ? "active" : ""}`} onClick={() => setJenjang("VII")}>Kelas VII ({ACCOUNTS.filter(a => a.role === "siswa" && a.jenjang === "VII").length})</button>
        <button className={`tab ${jenjang === "VIII" ? "active" : ""}`} onClick={() => setJenjang("VIII")}>Kelas VIII ({ACCOUNTS.filter(a => a.role === "siswa" && a.jenjang === "VIII").length})</button>
      </div>
      {lb.length === 0 ? <Card><div className="empty empty-box"><I n="user" s={32} /><h3>Belum ada data</h3><p>Siswa belum mengerjakan tugas apapun.</p></div></Card> :
        <Card pad="none" style={{ overflow: "hidden" }}>
          {lb.map(s => <div key={s.id} style={{ display: "grid", gridTemplateColumns: "32px 36px 1fr auto", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: "1px solid var(--line-soft)" }}><div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : s.rank === 3 ? "top3" : ""}`}>{s.rank}</div><Avatar name={s.nama} size="sm" /><div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nama}</div><div style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.kelas} · {s.tugasSelesai || 0} tugas selesai</div></div><div className="stat-num lb-pts">{s.poin.toLocaleString("id-ID")} pt</div></div>)}
        </Card>}
    </div>
  </>;
}

// ─── NAV ───
const SNAV = [{ id: "home", l: "Beranda", ic: "home" }, { id: "leaderboard", l: "Ranking", ic: "trophy" }, { id: "tugas", l: "Tugas", ic: "book" }, { id: "profil", l: "Profil", ic: "user" }];
const GNAV = [{ id: "home-guru", l: "Dashboard", ic: "layers" }, { id: "tugas-guru", l: "Tugas", ic: "book" }, { id: "leaderboard", l: "Ranking", ic: "trophy" }, { id: "kelas", l: "Siswa", ic: "user" }];

function Sidebar({ user, route, navigate, onLogout }) {
  const nav = user.role === "guru" ? GNAV : SNAV;
  return <aside className="sidebar">
    {nav.map(item => <button key={item.id} className={`side-link ${route === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}><I n={item.ic} s={16} /><span>{item.l}</span></button>)}
    <div className="side-foot">
      <div className="side-user">
        <Avatar name={user.nama} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="side-user-name">{user.nama}</div>
          <div className="side-user-meta">{user.role === "guru" ? user.mapel + " · Guru" : user.kelas}</div>
        </div>
        <button onClick={onLogout} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4 }} title="Keluar"><I n="chevR" s={14} /></button>
      </div>
    </div>
  </aside>;
}
function BottomNav({ user, route, navigate }) {
  const nav = user.role === "guru" ? GNAV : SNAV;
  return <nav className="bnav">
    {nav.map(item => { const active = route === item.id || (route === "tugas-detail" && item.id === "tugas") || (route === "kerjakan" && item.id === "tugas") || (route === "buat-tugas" && item.id === "tugas-guru") || (route === "edit-tugas" && item.id === "tugas-guru"); return <button key={item.id} className={`bn ${active ? "active" : ""}`} onClick={() => navigate(item.id)}><I n={item.ic} s={20} /><span>{item.l}</span></button>; })}
  </nav>;
}

// ─── APP ───
export default function App() {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState("home");
  const [params, setParams] = useState({});
  const store = useStore();
  function navigate(r, p = {}) { setRoute(r); setParams(p); window.scrollTo(0, 0); }
  function handleLogin(u) { setUser(u); setRoute(u.role === "guru" ? "home-guru" : "home"); }
  function handleLogout() { setUser(null); setRoute("home"); setParams({}); }
  const hideNav = route === "kerjakan";
  let screen = null;
  if (user) {
    const isGuru = user.role === "guru";
    if (isGuru) {
      if (route === "home-guru" || route === "tugas-guru") screen = <DashboardGuru store={store} navigate={navigate} />;
      else if (route === "buat-tugas") screen = <BuatTugas store={store} navigate={navigate} />;
      else if (route === "edit-tugas") screen = <BuatTugas store={store} navigate={navigate} editId={params.tugasId} />;
      else if (route === "leaderboard") screen = <LeaderboardScreen user={user} store={store} />;
      else if (route === "kelas") screen = <KelasView store={store} />;
      else screen = <DashboardGuru store={store} navigate={navigate} />;
    } else {
      if (route === "home") screen = <DashboardSiswa user={user} store={store} navigate={navigate} />;
      else if (route === "leaderboard") screen = <LeaderboardScreen user={user} store={store} />;
      else if (route === "tugas") screen = <DaftarTugas user={user} store={store} navigate={navigate} />;
      else if (route === "tugas-detail") screen = <DetailTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "kerjakan") screen = <KerjakanTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "profil") screen = <ProfilSiswa user={user} store={store} />;
      else screen = <DashboardSiswa user={user} store={store} navigate={navigate} />;
    }
  }
  return <>
    <style>{CSS}</style>
    {!user ? <LoginScreen onLogin={handleLogin} /> :
      <div className="shell">
        <header className="hdr">
          <div className="hdr-brand">
            <div className="hdr-mark"><svg width="18" height="18" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="4" fill="white" /><ellipse cx="16" cy="16" rx="13" ry="5" stroke="white" strokeWidth="2" fill="none" transform="rotate(-30 16 16)" /><ellipse cx="16" cy="16" rx="13" ry="5" stroke="white" strokeWidth="2" fill="none" opacity=".5" transform="rotate(30 16 16)" /></svg></div>
            <div className="hdr-name"><b>Astrolab Classroom</b><small>SMP N 15 Banda Aceh</small></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, opacity: .85 }}>{user.role === "guru" ? `${user.mapel} · Guru` : `Kelas ${user.jenjang} · ${user.kelas}`}</span>
            <button onClick={handleLogout} style={{ background: "rgba(255,255,255,.15)", color: "#fff", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid rgba(255,255,255,.2)", cursor: "pointer" }}>Keluar</button>
          </div>
        </header>
        <div className="body">
          <Sidebar user={user} route={route} navigate={navigate} onLogout={handleLogout} />
          <main className="main">{screen}</main>
        </div>
        <footer className="footer">© 2026 <b>Astrolab Classroom</b> · SMP Negeri 15 Banda Aceh — All rights reserved</footer>
        {!hideNav && <BottomNav user={user} route={route} navigate={navigate} />}
      </div>}
  </>;
}
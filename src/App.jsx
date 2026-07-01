// Astrolab Classroom — Production LMS
// © 2026 M. Hasanul Fatta
// UI: Original (Plus Jakarta Sans + teal #0d6b7a)
// Engine: Firebase Realtime Database + Firebase Authentication

import { useState, useEffect, useRef, Component } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, onValue, remove, update, onDisconnect, serverTimestamp } from "firebase/database";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// ─── FIREBASE CONFIG ───
const firebaseConfig = {
  apiKey: "AIzaSyDUUUr43q_GYT1IssuWYa_nPliKKOQPGlE",
  authDomain: "astrolab-classroom.firebaseapp.com",
  databaseURL: "https://astrolab-classroom-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "astrolab-classroom",
  storageBucket: "astrolab-classroom.firebasestorage.app",
  messagingSenderId: "21058860325",
  appId: "1:21058860325:web:ac720574480b80d8a996cc",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

// ─── GURU UID (hardcoded, immutable) ───
const GURU_UID = "bSfqRHsI3iadcjX56cShfDiuupq1";

// ─── ONLINE PRESENCE ───
async function setOnline(userId) {
  const presRef = ref(db, `presence/${userId}`);
  await set(presRef, { online: true, lastSeen: serverTimestamp() });
  onDisconnect(presRef).set({ online: false, lastSeen: serverTimestamp() });
}
async function setOffline(userId) {
  try { await set(ref(db, `presence/${userId}`), { online: false, lastSeen: serverTimestamp() }); } catch {}
}

// ─── SHUFFLE (Fisher-Yates) ───
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── ACCOUNTS ───
// Hardcoded accounts removed — semua akun dikelola via Firebase Auth + /accounts/{id}
// Data siswa diambil dari fbAccounts (Firebase Realtime DB)
const ACCOUNTS = [];

// ─── CSS ───
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap');
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
  --nav-h:60px;--hdr-h:62px;
}
body{font-family:var(--font);background:var(--bg);color:var(--ink);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;}
button,input,select,textarea{font-family:var(--font);}

/* SHELL */
.shell{min-height:100vh;display:flex;flex-direction:column;}
.hdr{position:sticky;top:0;z-index:100;background:var(--accent);color:#fff;padding:0 24px;height:var(--hdr-h);display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 12px rgba(13,107,122,.3);}
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
.btn-warn{background:#fffbeb;color:#92400e;border:1.5px solid #fde68a;}
.btn-warn:hover{background:#fef3c7;}
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

/* LOGIN — Design A: Mobile Split Hero + Wave */
.login-wrap{min-height:100vh;display:flex;flex-direction:column;background:#fff;overflow:hidden;}
@media(min-width:500px){.login-wrap{align-items:center;justify-content:center;background:linear-gradient(160deg,var(--accent-2) 0%,#062a35 100%);padding:24px;}}
.login-shell{display:flex;flex-direction:column;width:100%;min-height:100vh;background:#fff;overflow:hidden;}
@media(min-width:500px){.login-shell{min-height:unset;max-width:400px;border-radius:28px;box-shadow:0 40px 80px rgba(0,0,0,.45);overflow:hidden;}}
.login-hero{position:relative;background:linear-gradient(160deg,#1a8a9b 0%,var(--accent) 40%,var(--accent-2) 70%,#062a35 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 28px 52px;gap:8px;overflow:hidden;min-height:220px;}
.login-hero-deco1{position:absolute;width:220px;height:220px;border-radius:50%;border:1.5px solid rgba(255,255,255,.08);top:-80px;right:-70px;pointer-events:none;}
.login-hero-deco2{position:absolute;width:140px;height:140px;border-radius:50%;border:1px solid rgba(255,255,255,.06);bottom:40px;left:-50px;pointer-events:none;}
.login-hero-stars{position:absolute;inset:0;pointer-events:none;}
.login-wave{position:absolute;bottom:-1px;left:0;right:0;line-height:0;}
.login-logo-box{width:60px;height:60px;border-radius:18px;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.22);display:grid;place-items:center;backdrop-filter:blur(8px);box-shadow:0 8px 24px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.2);margin-bottom:4px;}
.login-brand{font-size:22px;font-weight:900;color:#fff;letter-spacing:-.03em;}
.login-tagline{font-size:11px;color:rgba(255,255,255,.55);letter-spacing:.04em;}
.login-form{flex:1;padding:24px 24px 28px;display:flex;flex-direction:column;gap:0;background:#fff;}
.login-form-title{font-size:16px;font-weight:800;color:var(--ink);margin-bottom:4px;letter-spacing:-.01em;}
.login-form-sub{font-size:12px;color:var(--ink-3);margin-bottom:20px;}
.login-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
.login-lbl{font-size:10px;font-weight:700;color:var(--ink-2);letter-spacing:.06em;text-transform:uppercase;}
.login-inp{padding:10px 13px;border:1.5px solid var(--line);border-radius:10px;font-size:14px;font-family:var(--font);color:var(--ink);background:var(--surface);outline:none;transition:border-color .15s;}
.login-inp:focus{border-color:var(--accent);}
.login-btn{width:100%;background:linear-gradient(135deg,#1a8a9b,var(--accent),var(--accent-2));color:#fff;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:800;font-family:var(--font);cursor:pointer;margin-top:8px;box-shadow:0 6px 20px rgba(13,107,122,.38);letter-spacing:.01em;transition:opacity .15s;}
.login-btn:hover{opacity:.9;}
.login-foot{text-align:center;font-size:10px;color:var(--ink-4);margin-top:16px;line-height:1.6;}
.login-err{font-size:12px;color:var(--bad);margin-top:6px;padding:8px 12px;background:var(--bad-bg);border-radius:8px;border:1px solid #fca5a5;display:flex;align-items:center;gap:6px;}
/* legacy — keep for any leftover refs */
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
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}

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

/* STREAK BADGE */
.streak-flame{display:inline-flex;flex-direction:column;align-items:center;gap:2px;color:#ea580c;}
.streak-flame svg{filter:drop-shadow(0 2px 6px rgba(234,88,12,.5));}
.streak-num{font-family:var(--mono);font-size:13px;font-weight:800;color:#fff;line-height:1;margin-top:2px;text-shadow:0 1px 2px rgba(0,0,0,.2);}
.streak-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:99px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-size:11px;font-weight:700;font-family:var(--mono);}
.streak-pill svg{flex-shrink:0;}

/* FLAME ANIMATION */
@keyframes flame-flicker {
  0%, 100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 8px rgba(251,146,60,.6)) drop-shadow(0 2px 4px rgba(234,88,12,.5)); }
  25% { transform: scale(1.08) rotate(2deg); filter: drop-shadow(0 0 12px rgba(251,146,60,.8)) drop-shadow(0 3px 6px rgba(234,88,12,.6)); }
  50% { transform: scale(0.96) rotate(-1deg); filter: drop-shadow(0 0 10px rgba(251,191,36,.7)) drop-shadow(0 2px 5px rgba(234,88,12,.5)); }
  75% { transform: scale(1.04) rotate(1deg); filter: drop-shadow(0 0 14px rgba(252,165,76,.8)) drop-shadow(0 4px 8px rgba(234,88,12,.6)); }
}
@keyframes flame-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes slideIn {
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes podium-glow {
  0%, 100% { box-shadow: 0 0 12px rgba(251,191,36,.4), 0 4px 16px rgba(251,191,36,.2); }
  50% { box-shadow: 0 0 24px rgba(251,191,36,.7), 0 6px 24px rgba(251,191,36,.4); }
}
@keyframes confetti-fall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(60px) rotate(720deg); opacity: 0; }
}
@keyframes confetti-side {
  0% { transform: translateX(0) rotate(0deg); opacity: 1; }
  100% { transform: translateX(var(--tx)) translateY(50px) rotate(540deg); opacity: 0; }
}
@keyframes star-burst {
  0% { transform: scale(0) rotate(0deg); opacity: 1; }
  60% { transform: scale(1.4) rotate(180deg); opacity: 1; }
  100% { transform: scale(0.8) rotate(360deg); opacity: 0; }
}
.flame-animated{animation:flame-flicker 1.4s ease-in-out infinite;transform-origin:center bottom;}
.flame-inner{animation:flame-glow 1.4s ease-in-out infinite;}
.podium-1{animation:podium-glow 2s ease-in-out infinite;}

/* MINI STAT ICON CARDS (replace emojis) */
.mini-icon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;margin:0 auto 6px;}
.mini-icon-1{background:#d1fae5;color:#047857;}
.mini-icon-2{background:#dbeafe;color:#1e40af;}
.mini-icon-3{background:#fef3c7;color:#b45309;}
.mini-icon-bad{background:var(--bad-bg);color:var(--bad);}

/* QUIZ STICKY FOOTER */
.quiz-foot-sticky{position:sticky;bottom:0;z-index:50;padding:12px 16px;background:var(--surface);border-top:1px solid var(--line);display:flex;gap:10px;box-shadow:0 -4px 16px rgba(0,0,0,.04);}
@supports (padding:env(safe-area-inset-bottom)){.quiz-foot-sticky{padding-bottom:calc(12px + env(safe-area-inset-bottom));}}

/* CHAT */
.chat-wrap{display:flex;flex-direction:column;}
.chat-list{overflow-y:auto;padding-bottom:80px;}
@media(min-width:768px){.chat-list{padding-bottom:24px;}}
.chat-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line-soft);cursor:pointer;transition:background .12s;}
.chat-item:last-child{border-bottom:none;}
.chat-item:hover{background:var(--surface-alt);}
.chat-item.unread{background:var(--accent-tint);}

/* Chat thread — full screen takeover */
.chat-thread{
  position:fixed;
  inset:0;
  top:var(--hdr-h);
  display:flex;
  flex-direction:column;
  background:var(--bg);
  z-index:80;
}
@media(min-width:768px){.chat-thread{left:200px;}}
.chat-thread-hdr{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--line);flex-shrink:0;}
.chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;overscroll-behavior:contain;}
.msg{max-width:78%;padding:9px 13px;border-radius:14px;font-size:14px;line-height:1.5;word-break:break-word;}
.msg-me{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-right-radius:4px;}
.msg-them{align-self:flex-start;background:var(--surface);border:1px solid var(--line);color:var(--ink);border-bottom-left-radius:4px;}
.msg-name{font-size:10px;color:var(--ink-3);margin-bottom:3px;font-weight:600;}
.msg-time{font-size:10px;opacity:.6;margin-top:4px;}
.chat-input-wrap{
  padding:8px 16px;
  background:transparent;
  display:flex;
  gap:8px;
  align-items:flex-end;
  flex-shrink:0;
  padding-bottom:calc(var(--nav-h) + 10px);
}
@media(min-width:768px){
  .chat-input-wrap{padding-bottom:16px;}
}
@supports (padding:env(safe-area-inset-bottom)){
  @media(max-width:767px){
    .chat-input-wrap{padding-bottom:calc(var(--nav-h) + 10px + env(safe-area-inset-bottom));}
  }
}
.chat-input{flex:1;padding:9px 13px;border-radius:20px;border:1.5px solid var(--line);font-family:var(--font);font-size:14px;color:var(--ink);background:var(--surface-alt);outline:none;resize:none;max-height:120px;line-height:1.4;}
.chat-input:focus{border-color:var(--accent);background:var(--surface);}
.unread-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;}

/* BROADCAST */
.bc-box{border-radius:var(--r);padding:14px 16px;border-left:4px solid var(--accent);background:linear-gradient(135deg,var(--accent-soft),var(--accent-tint));position:relative;}
.bc-expired{opacity:.5;pointer-events:none;}

/* PHOTO */
.av-photo{border-radius:50%;object-fit:cover;display:block;}
.avatar-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0;}
.avatar-opt{width:100%;aspect-ratio:1;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .15s;overflow:hidden;display:grid;place-items:center;}
.avatar-opt.sel{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
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
  chevL: "M15 18l-6-6 6-6", chevR: "M9 18l6-6-6-6", chevD: "M6 9l6 6 6-6",
  check: "M20 6L9 17l-5-5", x: "M18 6L6 18M6 6l12 12",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  target: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  link2: "M15 7h3a5 5 0 015 5 5 5 0 01-5 5h-3m-6 0H6a5 5 0 01-5-5 5 5 0 015-5h3m-1 5h8",
  sortDesc: "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12",
  // Modern minimalist icons
  checkCircle: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  chartBar: "M3 3v18h18M7 16V10M12 16V6M17 16v-3",
  medal: "M12 15a6 6 0 100-12 6 6 0 000 12zm0 0v7m-3-3l3 3 3-3M9 9l3-2 3 2",
  flame: "M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  atom: "M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5zM3.8 20.2c-2.04-2.03-.02-7.36 4.5-11.9 4.54-4.52 9.87-6.54 11.9-4.5 2.04 2.03.02 7.36-4.5 11.9-4.54 4.52-9.87 6.54-11.9 4.5z",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  alert: "M10.3 3.7L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.7a2 2 0 00-3.4 0zM12 9v4M12 17h.01",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  send: "M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  // === Badge icons ===
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 4H4a2 2 0 00-2 2v1a4 4 0 004 4M17 4h3a2 2 0 012 2v1a4 4 0 01-4 4",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
  lightbulb: "M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.5.5.8 1.2.8 1.9V18h6.4v-1.4c0-.7.3-1.4.8-1.9A7 7 0 0012 2z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  flag: "M4 22V4a2 2 0 012-2h11l-3 5 3 5H6M4 22h4",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  award: "M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
};
function I({ n, s = 16, style, cls = "" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style} className={cls}><path d={IC[n] || ""} /></svg>;
}

// ─── ANIMATED FLAME ───
function getFlameTheme(streak) {
  if (streak >= 300) return { outer: ["#d8b4fe","#9333ea","#4c1d95"], inner: ["#f5f3ff","#d8b4fe"], text: "#fff" };
  if (streak >= 200) return { outer: ["#e879f9","#a21caf","#6b21a8"], inner: ["#fdf4ff","#f0abfc"], text: "#fff" };
  if (streak >= 100) return { outer: ["#f472b6","#db2777","#9d174d"], inner: ["#fdf2f8","#f9a8d4"], text: "#fff" };
  if (streak >= 60)  return { outer: ["#f87171","#dc2626","#7f1d1d"], inner: ["#fff1f2","#fca5a5"], text: "#fff" };
  if (streak >= 30)  return { outer: ["#fca5a5","#ef4444","#7f1d1d"], inner: ["#fee2e2","#fca5a5"], text: "#fff" };
  if (streak >= 20)  return { outer: ["#fb923c","#f97316","#9a3412"], inner: ["#fed7aa","#fb923c"], text: "#fff" };
  if (streak >= 10)  return { outer: ["#fdba74","#f97316","#c2410c"], inner: ["#ffedd5","#fdba74"], text: "#fff" };
  if (streak >= 7)   return { outer: ["#fcd34d","#fb923c","#c2410c"], inner: ["#fffbeb","#fde68a"], text: "#78350f" };
  return               { outer: ["#fef08a","#fbbf24","#d97706"], inner: ["#fff","#fef9c3"], text: "#78350f" };
}
function FlameAnimated({ size = 44, streak = 1 }) {
  const t = getFlameTheme(streak);
  const oid = `fo${streak}`, iid = `fi${streak}`;
  const fs = streak >= 100 ? 9 : streak >= 10 ? 11 : 13;
  const ty = Math.round(size * 0.73);
  return (
    <svg width={size} height={Math.round(size * 1.17)} viewBox="0 0 48 56" className="flame-animated">
      <defs>
        <linearGradient id={oid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.outer[0]} />
          <stop offset="60%" stopColor={t.outer[1]} />
          <stop offset="100%" stopColor={t.outer[2]} />
        </linearGradient>
        <linearGradient id={iid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.inner[0]} />
          <stop offset="100%" stopColor={t.inner[1]} />
        </linearGradient>
      </defs>
      {/* outer — 3-tip classic flame */}
      <path d={`M24 2 C22 9,18 12,15 17 C12 21,11 25,13 29 C10 25,7 23,7 30 C7 41,15 53,24 54 C33 53,41 41,41 30 C41 23,38 25,35 29 C37 25,36 21,33 17 C30 12,26 9,24 2Z`} fill={`url(#${oid})`} />
      {/* inner glow */}
      <path className="flame-inner" d="M24 15 C22 20,19 24,19 30 C19 37,21 42,24 44 C27 42,29 37,29 30 C29 24,26 20,24 15Z" fill={`url(#${iid})`} opacity="0.85" />
      {/* number */}
      <text x="24" y="41" textAnchor="middle" fontFamily="DM Mono,monospace" fontWeight="700" fontSize={fs} fill={t.text} style={{ userSelect: "none" }}>{streak}</text>
    </svg>
  );
}

// ─── AVATAR ───
const AVC = [["#0d6b7a","#d8ebe9"],["#1e40af","#dbeafe"],["#7c3aed","#ede9fe"],["#b45309","#fef3c7"],["#0f766e","#ccfbf1"],["#c2410c","#ffedd5"]];
function hn(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000; return h; }
function inits(n) { const p = n.trim().split(/\s+/); return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase(); }
function Avatar({ name, size = "md", photo = null }) {
  const [bg, fg] = AVC[hn(name || "?") % AVC.length];
  const px = { xs: 22, sm: 28, md: 36, lg: 48, xl: 64 }[size] || 36;
  const fs = Math.round(px * 0.35);
  if (photo) return <img src={photo} alt={name} className="av-photo" style={{ width: px, height: px }} />;
  return <span className="av" style={{ width: px, height: px }}><svg width={px} height={px} viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill={bg} /><text x="50" y="63" textAnchor="middle" fontFamily="Plus Jakarta Sans,sans-serif" fontWeight="700" fontSize={fs * (100 / px)} fill={fg}>{inits(name || "?")}</text></svg></span>;
}
// UserAvatar: auto-fetch foto dari store berdasarkan userId
function UserAvatar({ userId, name, size = "md", store, showOnline = false }) {
  const photo = store ? store.getPhoto(userId) : null;
  const online = showOnline && store?.isOnline(userId);
  return (
    <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <Avatar name={name} size={size} photo={photo} />
      {online && <OnlineDot size={size === "sm" ? 8 : 10} style={{ position: "absolute", bottom: 0, right: 0 }} />}
    </div>
  );
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

// ─── TAHUN AJARAN HELPERS ───
// Tahun ajaran di Indonesia dimulai Juli, berakhir Juni tahun depan.
// Semester Ganjil: Juli–Desember. Semester Genap: Januari–Juni.
function getTahunAjaran(date = new Date()) {
  const month = date.getMonth(); // 0 = Januari
  const year = date.getFullYear();
  // Juli (6) ke depan = mulai tahun ajaran baru
  if (month >= 6) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}
function getSemesterAktif(date = new Date()) {
  const month = date.getMonth();
  // Juli–Desember = Ganjil; Januari–Juni = Genap
  return (month >= 6 && month <= 11) ? "Ganjil" : "Genap";
}
function getPeriodeAktif(date = new Date()) {
  return `Semester ${getSemesterAktif(date)} ${getTahunAjaran(date)}`;
}
// Generate opsi dropdown periode: 4 jenis × 3 tahun (lalu, sekarang, depan)
function getPeriodeOptions(date = new Date()) {
  const ta = getTahunAjaran(date);
  const [yStart] = ta.split("/").map(Number);
  const tahunList = [
    `${yStart - 1}/${yStart}`,
    `${yStart}/${yStart + 1}`,
    `${yStart + 1}/${yStart + 2}`,
  ];
  const jenis = ["Semester Ganjil", "Semester Genap", "Tengah Semester Ganjil", "Tengah Semester Genap"];
  // Default tahun aktif duluan, lalu jenis lain di tahun aktif, lalu tahun lain
  const tahunAktif = ta;
  const result = [];
  // Tahun aktif: semua 4 jenis
  jenis.forEach(j => result.push(`${j} ${tahunAktif}`));
  // Tahun lain: semua 4 jenis
  tahunList.filter(y => y !== tahunAktif).forEach(y => {
    jenis.forEach(j => result.push(`${j} ${y}`));
  });
  return result;
}

// Format last seen timestamp jadi teks relatif
function fmtLastSeen(ts) {
  if (!ts) return null;
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "kemarin";
  if (days < 7) return `${days} hari lalu`;
  const d = new Date(ts);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// ─── TIMEOUT HELPER ───
// Firebase Realtime DB tidak fail-fast saat offline — promise menggantung sampai network balik.
// Helper ini membungkus promise dengan timeout 10 detik supaya user dapat feedback jelas
// kalau koneksi lambat/terputus, bukannya nunggu UI freeze tanpa kepastian.
function withTimeout(promise, ms = 10000, errMsg = "Koneksi lambat atau terputus. Cek internet kamu lalu coba lagi.") {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errMsg)), ms)),
  ]);
}

// ─── FUZZY MATCH TEXT ───
// Dipakai untuk grading tipe soal Pseudocode Trace (output) dan Debug Challenge (perbaikan).
// Strategy: normalisasi (lowercase + collapse whitespace + trim) lalu exact match.
// Toleran typo spasi/case, tapi strict soal typo huruf. Cocok untuk output pendek & syntax code.
function fuzzyMatchText(input, expected) {
  const norm = s => (s == null ? "" : s.toString()).toLowerCase().replace(/\s+/g, " ").trim();
  const a = norm(input), b = norm(expected);
  return a.length > 0 && a === b;
}

// ─── XP / LEVEL / BADGE SYSTEM ───
// ─── LEVEL SYSTEM: 5 Tier × 4 Sub-level = 20 Levels ───
// Setiap tier punya icon SVG sendiri, sub-level dibedakan dengan jumlah pip / accent
const TIERS = [
  { id: "nebula",    name: "Nebula",    color: "#7c3aed", bg: "#f3e8ff", accent: "#a78bfa", desc: "Awal perjalanan" },
  { id: "bintang",   name: "Bintang",   color: "#d97706", bg: "#fffbeb", accent: "#fbbf24", desc: "Mulai bersinar" },
  { id: "planet",    name: "Planet",    color: "#0d6b7a", bg: "#eaf4f3", accent: "#5eead4", desc: "Semakin kokoh" },
  { id: "astronot",  name: "Astronot",  color: "#1d4ed8", bg: "#eff6ff", accent: "#60a5fa", desc: "Terbang tinggi" },
  { id: "commander", name: "Commander", color: "#b45309", bg: "#fef3c7", accent: "#f59e0b", desc: "Puncak galaksi" },
];

// XP cumulative per level (progressive scaling)
const LEVEL_XP = [
  0,     200,   500,    950,    // Nebula I-IV
  1500,  2200,  3000,   4000,   // Bintang I-IV
  5200,  6700,  8500,   10700,  // Planet I-IV
  13300, 16500, 20300,  24800,  // Astronot I-IV
  30000, 36000, 43000,  51000,  // Commander I-IV
];

const SUB_ROMAN = ["I", "II", "III", "IV"];

// Generate LEVELS array dari TIERS × 4 sub-level
const LEVELS = TIERS.flatMap((tier, tIdx) =>
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

function getLevel(poin) {
  return LEVELS.find(l => poin >= l.min && poin <= l.max) || LEVELS[0];
}
function getTier(poin) {
  const lv = getLevel(poin);
  return TIERS.find(t => t.id === lv.tierId);
}

// ─── SVG TIER ICONS (Style C — Playful Dimensional) ───
// Setiap icon punya unique gradient ID berbasis size+tierId untuk avoid conflict
function TierIcon({ tierId, size = 16, color = "currentColor" }) {
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

// ─── LEVEL BADGE (compact pill — full SVG dimensional, no emoji) ───
function LevelBadge({ poin = 0, size = "sm", showName = true, showSubLevel = true }) {
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
function getLevelProgress(poin) {
  const lv = getLevel(poin);
  if (lv.id === LEVELS.length) return { pct: 100, current: poin, needed: 0, next: null };
  const range = lv.max - lv.min + 1;
  const prog = poin - lv.min;
  const pct = Math.min(100, Math.round((prog / range) * 100));
  const next = LEVELS[lv.id]; // next level (0-indexed so lv.id = next index)
  return { pct, current: poin, needed: lv.max + 1 - poin, next };
}

// ─── BADGE ICONS (Style C — Playful Dimensional) ───
// ─── BADGE ICON (Style C — Shield Crest, frame seragam + glyph unik) ───
// Setiap badge = perisai dengan rim gradient + glyph unik di tengah.
// 'type' menentukan glyph; 'rim' menentukan warna frame.
const BADGE_RIMS = {
  amber:  { a: "#f0b429", b: "#b45309", inA: "#fff8e6", inB: "#fde9b8", glyph: "#b45309" },
  teal:   { a: "#0c7a91", b: "#063f4d", inA: "#eafafb", inB: "#c9eef0", glyph: "#0c7a91" },
  red:    { a: "#ef5350", b: "#b91c1c", inA: "#fff0ef", inB: "#fbd5d3", glyph: "#c0392b" },
  violet: { a: "#a78bfa", b: "#6d28d9", inA: "#f4f0ff", inB: "#e0d4fb", glyph: "#6d28d9" },
  blue:   { a: "#60a5fa", b: "#1d4ed8", inA: "#eef5ff", inB: "#d3e4fb", glyph: "#1d4ed8" },
  green:  { a: "#4ade80", b: "#15803d", inA: "#effdf4", inB: "#c8f2d6", glyph: "#15803d" },
  rose:   { a: "#fb7185", b: "#be123c", inA: "#fff1f3", inB: "#fbd0d8", glyph: "#be123c" },
};

// Glyph unik per badge — digambar dalam koordinat lokal (-18..18), center (0,0)
function BadgeGlyph({ type, color }) {
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
    default: return <circle r="10" {...f} stroke="none" />;
  }
}

function BadgeIcon({ type, rim = "teal", size = 32, locked = false }) {
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

// ─── BADGES (SVG-based dimensional, no emoji) ───
// 'iconType' = type yang dipakai oleh BadgeIcon component.
const AUTO_BADGES = [
  // === Prestasi (nilai/akurasi) ===
  { id: "perfect",     icon: "bullseye",     rim: "amber",  name: "Perfect Score",  desc: "Nilai 100 di satu tugas",          color: "#b45309", bg: "#fef3c7", category: "Prestasi" },
  { id: "perfect5",    icon: "rosette",      rim: "amber",  name: "Perfectionist",  desc: "5x nilai 100",                     color: "#92400e", bg: "#fef3c7", category: "Prestasi" },
  { id: "perfect10",   icon: "crown",        rim: "amber",  name: "Master Mind",    desc: "10x nilai 100",                    color: "#78350f", bg: "#fde68a", category: "Prestasi" },

  // === Streak ===
  { id: "onfire",      icon: "flame1",       rim: "red",    name: "On Fire",        desc: "Streak 5 hari berturut-turut",     color: "#dc2626", bg: "#fef2f2", category: "Streak" },
  { id: "blazing",     icon: "flame2",       rim: "red",    name: "Blazing Hot",    desc: "Streak 10 hari berturut-turut",    color: "#b91c1c", bg: "#fee2e2", category: "Streak" },
  { id: "inferno",     icon: "sun",          rim: "red",    name: "Inferno",        desc: "Streak 20 hari berturut-turut",    color: "#7f1d1d", bg: "#fecaca", category: "Streak" },

  // === Tugas ===
  { id: "firstblood",  icon: "footprint",    rim: "green",  name: "First Step",     desc: "Selesaikan tugas pertama",         color: "#16a34a", bg: "#f0fdf4", category: "Tugas" },
  { id: "rajin",       icon: "book",         rim: "teal",   name: "Rajin Belajar",  desc: "Selesaikan 10 tugas",              color: "#0d6b7a", bg: "#eaf4f3", category: "Tugas" },
  { id: "scholar",     icon: "gradcap",      rim: "teal",   name: "Scholar",        desc: "Selesaikan 25 tugas",              color: "#0e7490", bg: "#cffafe", category: "Tugas" },
  { id: "veteran",     icon: "shield",       rim: "teal",   name: "Veteran",        desc: "Selesaikan 50 tugas",              color: "#155e75", bg: "#a5f3fc", category: "Tugas" },

  // === Speed ===
  { id: "fast",        icon: "stopwatch",    rim: "violet", name: "Fast Finisher",  desc: "Submit < 3 jam setelah publish",   color: "#7c3aed", bg: "#f5f3ff", category: "Speed" },
  { id: "lightning",   icon: "bolt",         rim: "violet", name: "Lightning",      desc: "5x submit di hari yang sama",      color: "#6d28d9", bg: "#ede9fe", category: "Speed" },

  // === Ranking ===
  { id: "topclass",    icon: "trophy",       rim: "amber",  name: "Top of Class",   desc: "Rank #1 di leaderboard",           color: "#d97706", bg: "#fffbeb", category: "Ranking" },
  { id: "podium",      icon: "podium",       rim: "amber",  name: "Podium",         desc: "Masuk Top 3 leaderboard",          color: "#ea580c", bg: "#fff7ed", category: "Ranking" },

  // === Level ===
  { id: "lv5",         icon: "star1",        rim: "amber",  name: "Rising Star",    desc: "Capai Level 5 (Bintang I)",        color: "#d97706", bg: "#fffbeb", category: "Level" },
  { id: "lv10",        icon: "star2",        rim: "teal",   name: "Stellar",        desc: "Capai Level 10 (Planet II)",       color: "#0d6b7a", bg: "#eaf4f3", category: "Level" },
  { id: "lv15",        icon: "constellation",rim: "blue",   name: "Celestial",      desc: "Capai Level 15 (Astronot III)",    color: "#1d4ed8", bg: "#eff6ff", category: "Level" },
  { id: "lv20",        icon: "starcrown",    rim: "amber",  name: "Galactic",       desc: "Capai Level 20 (Commander IV)",    color: "#b45309", bg: "#fef3c7", category: "Level" },

  // === XP ===
  { id: "xp1k",        icon: "gem1",         rim: "teal",   name: "1K Club",        desc: "Total 1.000 XP",                   color: "#0d6b7a", bg: "#eaf4f3", category: "XP" },
  { id: "xp5k",        icon: "gem2",         rim: "violet", name: "5K Club",        desc: "Total 5.000 XP",                   color: "#7c3aed", bg: "#f5f3ff", category: "XP" },
  { id: "xp10k",       icon: "diamond",      rim: "amber",  name: "10K Elite",      desc: "Total 10.000 XP",                  color: "#b45309", bg: "#fef3c7", category: "XP" },
];

const MANUAL_BADGES = [
  { id: "guruspick",   icon: "ribbon",       rim: "teal",   name: "Guru's Pick",    desc: "Pilihan khusus dari guru",         color: "#0d6b7a", bg: "#eaf4f3", category: "Special" },
  { id: "creative",    icon: "bulb",         rim: "violet", name: "Most Creative",  desc: "Kreativitas luar biasa",           color: "#7c3aed", bg: "#f5f3ff", category: "Special" },
  { id: "teamplayer",  icon: "handshake",    rim: "blue",   name: "Team Player",    desc: "Kontribusi luar biasa di kelas",   color: "#1d4ed8", bg: "#eff6ff", category: "Special" },
  { id: "improver",    icon: "arrowup",      rim: "green",  name: "Most Improved",  desc: "Peningkatan nilai terbaik",        color: "#16a34a", bg: "#f0fdf4", category: "Special" },
  { id: "leader",      icon: "flag",         rim: "amber",  name: "Class Leader",   desc: "Memimpin diskusi & inspirasi",     color: "#d97706", bg: "#fffbeb", category: "Special" },
  { id: "helper",      icon: "heart",        rim: "rose",   name: "Helper",         desc: "Selalu membantu teman sekelas",    color: "#dc2626", bg: "#fef2f2", category: "Special" },
];
const ALL_BADGES = [...AUTO_BADGES, ...MANUAL_BADGES];

function checkAutoBadges(stats, submission, isTopClass = false, isTopThree = false) {
  const earned = [];
  const nilai = submission.nilai || 0;
  const tugasSelesai = (stats.tugasSelesai || 0) + 1; // setelah submission ini
  const newStreak = (stats.streak || 0) + 1;
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

  // Level milestones — cek apakah crossing threshold
  const prevLevel = getLevel(stats.poin || 0).id;
  if (newLevel >= 5 && prevLevel < 5) earned.push("lv5");
  if (newLevel >= 10 && prevLevel < 10) earned.push("lv10");
  if (newLevel >= 15 && prevLevel < 15) earned.push("lv15");
  if (newLevel >= 20 && prevLevel < 20) earned.push("lv20");

  // XP milestones
  if (newPoin >= 1000 && (stats.poin || 0) < 1000) earned.push("xp1k");
  if (newPoin >= 5000 && (stats.poin || 0) < 5000) earned.push("xp5k");
  if (newPoin >= 10000 && (stats.poin || 0) < 10000) earned.push("xp10k");

  return earned;
}

// ─── ONLINE DOT ───
function OnlineDot({ size = 8, style = {} }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      borderRadius: "50%", background: "#0d9488",
      border: "1.5px solid var(--surface)",
      flexShrink: 0, ...style
    }} />
  );
}
function LevelCard({ poin, compact = false }) {
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

// ─── BADGE DISPLAY ───
function BadgeChip({ badgeId, size = "md" }) {
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
function BadgesRow({ badges = [], emptyText = "Belum ada badge" }) {
  if (!badges.length) return <div style={{ fontSize: 12, color: "var(--ink-4)", padding: "8px 0" }}>{emptyText}</div>;
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{badges.map(id => <BadgeChip key={id} badgeId={id} />)}</div>;
}
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

// ─── STORE (Firebase) ───
// ─── IMAGE COMPRESSION HELPER ───
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL("image/jpeg", quality);
        resolve(b64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── EXCEL FORMULA EVALUATOR ───
// Support: SUM, AVERAGE/AVG/MEAN, COUNT, COUNTA, MAX, MIN, IF, ROUND
// Range: A1:A5, A1:C3 (cell refs)
function evalExcelFormula(formula, tableData) {
  if (!formula || !formula.startsWith("=")) return { error: "Rumus harus diawali dengan =" };
  try {
    const expr = formula.slice(1).trim();
    // Build cell map: A1 -> value, B2 -> value, dst
    const cellMap = {};
    tableData.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const col = String.fromCharCode(65 + ci); // A, B, C...
        cellMap[`${col}${ri + 1}`] = cell;
      });
    });

    // Resolve range like A1:B3
    function resolveRange(rangeStr) {
      const m = rangeStr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      if (!m) {
        // single cell
        const val = cellMap[rangeStr];
        return val !== undefined ? [val] : [];
      }
      const c1 = m[1].charCodeAt(0) - 65, r1 = parseInt(m[2]) - 1;
      const c2 = m[3].charCodeAt(0) - 65, r2 = parseInt(m[4]) - 1;
      const vals = [];
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
        for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
          const col = String.fromCharCode(65 + c);
          const v = cellMap[`${col}${r + 1}`];
          if (v !== undefined) vals.push(v);
        }
      }
      return vals;
    }

    function toNum(v) {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    }

    // Functions
    const FUNCS = {
      SUM: args => args.reduce((s, v) => s + toNum(v), 0),
      AVERAGE: args => args.length ? args.reduce((s, v) => s + toNum(v), 0) / args.length : 0,
      AVG: args => args.length ? args.reduce((s, v) => s + toNum(v), 0) / args.length : 0,
      MEAN: args => args.length ? args.reduce((s, v) => s + toNum(v), 0) / args.length : 0,
      COUNT: args => args.filter(v => !isNaN(parseFloat(v))).length,
      COUNTA: args => args.filter(v => v !== "" && v !== undefined && v !== null).length,
      MAX: args => Math.max(...args.map(toNum)),
      MIN: args => Math.min(...args.map(toNum)),
      ROUND: args => Math.round(toNum(args[0]) * Math.pow(10, toNum(args[1] || 0))) / Math.pow(10, toNum(args[1] || 0)),
    };

    // Parse function call: FN(ARG1, ARG2, ...)
    const fnMatch = expr.match(/^([A-Z]+)\((.+)\)$/i);
    if (fnMatch) {
      const fnName = fnMatch[1].toUpperCase();
      const argsStr = fnMatch[2];
      if (!FUNCS[fnName]) return { error: `Fungsi ${fnName} belum didukung` };

      // Split args (simple split by comma, considering ranges)
      const argParts = argsStr.split(",").map(s => s.trim());
      let args = [];
      argParts.forEach(part => {
        if (/^[A-Z]+\d+:[A-Z]+\d+$/.test(part)) {
          args = args.concat(resolveRange(part));
        } else if (/^[A-Z]+\d+$/.test(part)) {
          const v = cellMap[part];
          if (v !== undefined) args.push(v);
        } else if (!isNaN(parseFloat(part))) {
          args.push(parseFloat(part));
        } else {
          // Try eval as expression (basic: number or string)
          args.push(part.replace(/^["']|["']$/g, ""));
        }
      });

      const result = FUNCS[fnName](args);
      return { value: typeof result === "number" ? (Number.isInteger(result) ? result : Math.round(result * 100) / 100) : result };
    }

    // Simple cell reference: =A1
    if (/^[A-Z]+\d+$/.test(expr)) {
      const v = cellMap[expr];
      return v !== undefined ? { value: v } : { error: `Cell ${expr} kosong` };
    }

    // Simple arithmetic: =A1+B1*2
    let arithExpr = expr.replace(/[A-Z]+\d+/g, (match) => {
      const v = cellMap[match];
      return v !== undefined ? toNum(v) : 0;
    });
    // Only allow safe characters
    if (!/^[\d+\-*/().\s]+$/.test(arithExpr)) {
      return { error: "Rumus tidak dikenali atau mengandung karakter tidak valid" };
    }
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${arithExpr})`)();
    return { value: typeof result === "number" ? (Number.isInteger(result) ? result : Math.round(result * 100) / 100) : result };
  } catch (e) {
    return { error: "Error: " + e.message };
  }
}

// ─── SISWA ID HELPERS ───
const SKIP_PREFIXES = new Set([
  "muhammad","muhamad","ahmad","ahmed","abdul","abdu","abd",
  "nur","noor","siti","sitti","st","hj","h","dra","dr","ir",
  "m","a","r","s","n","d","f","z","e","y","k","l","t","w","b","c","g","j","o","p","q","u","v","x"
]);

function genSiswaId(nama, usedIds = new Set()) {
  const words = nama.trim().toLowerCase().split(/\s+/).map(w => w.replace(/\./g, ""));
  const meaningful = words.find(w => w.length > 1 && !SKIP_PREFIXES.has(w)) || words[words.length - 1];
  let baseId = meaningful.replace(/[^a-z]/g, "");
  let finalId = baseId;
  let counter = 2;
  while (usedIds.has(finalId)) { finalId = `${baseId}${counter}`; counter++; }
  return finalId;
}

// Get meaningful first name (skip "M.", "Muh.", "Abd.", "Siti", dll)
function getFirstName(nama) {
  if (!nama) return "";
  const words = nama.trim().split(/\s+/);
  // Cari kata pertama yang meaningful (skip prefix religius/initials)
  const meaningful = words.find(w => {
    const clean = w.toLowerCase().replace(/\./g, "");
    return clean.length > 1 && !SKIP_PREFIXES.has(clean);
  });
  return meaningful || words[0] || "";
}

function genPassword(id) {
  const num = Math.floor(Math.random() * 900) + 100;
  return `${id}${num}`;
}

function useStore() {
  const [tugas, setTugas] = useState([]);
  const [subs, setSubs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Set loading false setelah max 2 detik — tidak bergantung pada Firebase response
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Realtime listeners
  useEffect(() => {
    const tugasRef = ref(db, "tugas");
    const subsRef = ref(db, "submissions");
    const statsRef = ref(db, "stats");
    const u1 = onValue(tugasRef, snap => {
      const data = snap.val();
      setTugas(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
      setLoading(false);
    }, () => setLoading(false)); // error handler
    const u2 = onValue(subsRef, snap => {
      const data = snap.val();
      setSubs(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
    }, () => {});
    const u3 = onValue(statsRef, snap => {
      setStats(snap.val() || {});
    }, () => {});
    return () => { u1(); u2(); u3(); };
  }, []);

  // TUGAS
  const getTugas = () => tugas;
  const addTugas = async (t) => {
    const newRef = push(ref(db, "tugas"));
    await set(newRef, { ...t, createdAt: new Date().toISOString(), status: t.scheduledAt ? "scheduled" : "aktif" });
  };
  const deleteTugas = async (id) => { await remove(ref(db, `tugas/${id}`)); };
  const updateTugas = async (id, patch) => { await update(ref(db, `tugas/${id}`), patch); };
  const duplicateTugas = async (t) => {
    const newRef = push(ref(db, "tugas"));
    const { id, createdAt, ...rest } = t;
    await set(newRef, { ...rest, judul: `${t.judul} (Salinan)`, createdAt: new Date().toISOString(), status: "aktif", scheduledAt: null });
  };

  // BANK SOAL
  const [bankSoal, setBankSoal] = useState([]);
  useEffect(() => {
    const bsRef = ref(db, "banksoal");
    const unsub = onValue(bsRef, snap => {
      const data = snap.val() || {};
      setBankSoal(Object.entries(data).map(([id, s]) => ({ ...s, id })));
    }, () => setBankSoal([]));
    return () => unsub();
  }, []);
  const getBankSoal = () => bankSoal;
  const addBankSoal = async (s) => {
    const newRef = push(ref(db, "banksoal"));
    await set(newRef, { ...s, createdAt: new Date().toISOString() });
  };
  const updateBankSoal = async (id, patch) => { await update(ref(db, `banksoal/${id}`), patch); };
  const deleteBankSoal = async (id) => { await remove(ref(db, `banksoal/${id}`)); };
  const addBankSoalBulk = async (soalList) => {
    const updates = {};
    soalList.forEach(s => {
      const newRef = push(ref(db, "banksoal"));
      updates[newRef.key] = { ...s, createdAt: new Date().toISOString() };
    });
    await update(ref(db, "banksoal"), updates);
  };

  // SUBMISSIONS
  const getSubs = () => subs;
  const addSub = async (s) => {
    // Deterministic key: {siswaId}_{tugasId} mencegah duplicate submission dari multi-device.
    // Kalau 2 device submit untuk tugas yang sama (offline lalu replay), Firebase last-write-wins
    // → cuma 1 entry yang persist. Combined dengan hasSub guard di doSubmit, ini cover edge case
    // konkuren tanpa butuh migration data lama (yang masih pakai push-key).
    if (s.siswaId && s.tugasId) {
      await set(ref(db, `submissions/${s.siswaId}_${s.tugasId}`), { ...s, submittedAt: new Date().toISOString() });
    } else {
      // Fallback ke push-key kalau siswaId/tugasId hilang (shouldn't happen, but safe)
      const newRef = push(ref(db, "submissions"));
      await set(newRef, { ...s, submittedAt: new Date().toISOString() });
    }
  };
  const hasSub = (sid, tid) => subs.some(s => s.siswaId === sid && s.tugasId === tid);
  const getSubBy = (sid, tid) => subs.find(s => s.siswaId === sid && s.tugasId === tid);

  // STATS
  const getStats = (sid) => stats[sid] || { poin: 0, poinHistory: [], tugasSelesai: 0, nilaiList: [], nilaiRata: 0, streak: 0 };
  const updateStats = async (sid, nilai, poinDapat, ontime = true) => {
    const s = getStats(sid);
    const newPoin = s.poin + poinDapat;
    const now = Date.now();
    const newHistory = [...(s.poinHistory || []), { minggu: (s.poinHistory || []).length + 1, poin: newPoin, ts: now }];
    const newNilai = [...(s.nilaiList || []), nilai];
    const nilaiRata = Math.round(newNilai.reduce((a, b) => a + b, 0) / newNilai.length);
    // STREAK: naik kalau ontime, reset kalau telat
    const newStreak = ontime ? (s.streak || 0) + 1 : 0;
    await update(ref(db, `stats/${sid}`), {
      poin: newPoin,
      poinHistory: newHistory,
      tugasSelesai: (s.tugasSelesai || 0) + 1,
      nilaiList: newNilai,
      nilaiRata,
      streak: newStreak,
    });
  };
  // Reset streak siswa kalau kelewat deadline (dipanggil saat siswa buka tugas yang udah lewat & belum dikerjain)
  const resetStreakIfMissed = async (sid) => {
    const s = getStats(sid);
    if ((s.streak || 0) === 0) return;
    await update(ref(db, `stats/${sid}`), { streak: 0 });
  };

  const [messages, setMessages] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!currentUser) return; // Tunggu user login dulu
    const msgsRef = ref(db, "messages");
    const u4 = onValue(msgsRef, snap => {
      setMessages(snap.val() || {});
    }, () => setMessages({}));
    return () => u4();
  }, [currentUser?.uid]);

  // CHAT — threadId = sorted pair of IDs e.g. "akhdan__fata"
  const getThreadId = (id1, id2) => [id1, id2].sort().join("__");
  const getThread = (id1, id2) => {
    const tid = getThreadId(id1, id2);
    const raw = messages[tid] || {};
    return Object.entries(raw).map(([k, v]) => ({ ...v, key: k })).sort((a, b) => a.ts - b.ts);
  };
  const sendMessage = async (fromId, toId, text) => {
    if (!text.trim()) return;
    const tid = getThreadId(fromId, toId);
    const newRef = push(ref(db, `messages/${tid}`));
    await set(newRef, { fromId, toId, text: text.trim(), ts: Date.now() });
  };
  const getUnreadCount = (myId) => {
    let count = 0;
    Object.values(messages).forEach(thread => {
      Object.values(thread).forEach(msg => {
        if (msg.toId === myId && !msg.read) count++;
      });
    });
    return count;
  };
  const markRead = async (id1, id2) => {
    const tid = getThreadId(id1, id2);
    const thread = messages[tid] || {};
    const updates = {};
    Object.entries(thread).forEach(([k, msg]) => {
      if (msg.toId === id1 && !msg.read) updates[`messages/${tid}/${k}/read`] = true;
    });
    if (Object.keys(updates).length > 0) await update(ref(db), updates);
  };
  const getContacts = (myId, myJenjang, myRole) => {
    const allSiswa = getAllAccounts().filter(a => a.role === "siswa");
    const guru = fbGuru || { id: "fata", uid: GURU_UID, role: "guru", nama: "M. Hasanul Fatta", namaDisplay: "Pak Fatta", mapel: "IPA & Informatika" };
    if (myRole === "guru") return allSiswa;
    // Siswa bisa chat ke guru + sesama siswa sekelas
    const sekelas = allSiswa.filter(a => a.id !== myId && a.jenjang === myJenjang);
    return [guru, ...sekelas];
  };
  const getLastMsg = (id1, id2) => {
    const thread = getThread(id1, id2);
    return thread[thread.length - 1] || null;
  };

  // BROADCAST
  const [broadcasts, setBroadcasts] = useState([]);
  useEffect(() => {
    const bcRef = ref(db, "broadcasts");
    const u5 = onValue(bcRef, snap => {
      const data = snap.val();
      const now = Date.now();
      // Filter yang belum expired
      const list = data ? Object.entries(data)
        .map(([id, v]) => ({ ...v, id }))
        .filter(b => b.expiresAt > now)
        : [];
      setBroadcasts(list.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => u5();
  }, []);

  const addBroadcast = async (pesan, target, durasiHari) => {
    const now = Date.now();
    const newRef = push(ref(db, "broadcasts"));
    await set(newRef, { pesan, target, createdAt: now, expiresAt: now + durasiHari * 86400000, durasiHari });
  };
  const editBroadcast = async (id, pesan, target, durasiHari) => {
    const now = Date.now();
    await update(ref(db, `broadcasts/${id}`), { pesan, target, expiresAt: now + durasiHari * 86400000, durasiHari, editedAt: now });
  };
  const deleteBroadcast = async (id) => { await remove(ref(db, `broadcasts/${id}`)); };
  const getBroadcasts = (jenjang) => broadcasts.filter(b => b.target === "semua" || b.target === jenjang);

  const [photos, setPhotos] = useState({});

  useEffect(() => {
    const photosRef = ref(db, "photos");
    const u6 = onValue(photosRef, snap => {
      setPhotos(snap.val() || {});
    });
    return () => u6();
  }, []);

  // FOTO PROFIL — simpan base64 terkompresi ke Firebase
  const getPhoto = (userId) => {
    if (!userId) return null;
    // Coba langsung pakai userId sebagai key
    if (photos[userId]) return photos[userId];
    // Cari uid dari fbAccounts atau fbGuru
    const acc = fbAccounts.find(a => a.id === userId);
    if (acc?.uid && photos[acc.uid]) return photos[acc.uid];
    if (fbGuru?.id === userId && photos[GURU_UID]) return photos[GURU_UID];
    return null;
  };
  const savePhoto = async (userId, base64OrNull) => {
    if (!base64OrNull) {
      await remove(ref(db, `photos/${userId}`));
      return;
    }
    // Kompres ke max 120x120px sebelum simpan
    const compressed = await new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 120;
        const canvas = document.createElement("canvas");
        const ratio = Math.min(MAX / img.width, MAX / img.height);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => resolve(base64OrNull);
      img.src = base64OrNull;
    });
    await set(ref(db, `photos/${userId}`), compressed);
  };

  // ACCOUNTS (Firebase) — siswa baru di /accounts/{id}
  const [fbAccounts, setFbAccounts] = useState([]);
  const [fbGuru, setFbGuru] = useState(null);
  useEffect(() => {
    const accRef = ref(db, "accounts");
    const u8 = onValue(accRef, snap => {
      const data = snap.val();
      const list = data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : [];
      setFbAccounts(list.filter(a => a.role !== "guru"));
    }, () => setFbAccounts([]));
    // Load guru profile dari /users/{GURU_UID}
    const guruRef = ref(db, `users/${GURU_UID}`);
    const u9 = onValue(guruRef, snap => {
      if (snap.exists()) setFbGuru(snap.val());
      else setFbGuru({ id: "fata", uid: GURU_UID, role: "guru", nama: "M. Hasanul Fatta", namaDisplay: "Pak Fatta", mapel: "IPA & Informatika" });
    });
    return () => { u8(); u9(); };
  }, []);

  // Merge: hardcoded siswa + Firebase siswa
  const getAllAccounts = () => {
    const fbIds = new Set(fbAccounts.map(a => a.id));
    const hardcoded = ACCOUNTS.filter(a => !fbIds.has(a.id));
    return [...hardcoded, ...fbAccounts];
  };
  const getAllSiswa = (jenjang) => {
    return getAllAccounts().filter(a => a.role === "siswa" && (!jenjang || a.jenjang === jenjang));
  };

  // Generate ID otomatis: akronim 3 huruf + counter global 9XX
  const SERVER_URL = import.meta.env?.VITE_SERVER_URL || "https://astrolab-push-server.vercel.app";
  const SERVER_SECRET = import.meta.env?.VITE_SERVER_SECRET || "";

  async function callServer(action, payload) {
    const res = await fetch(`${SERVER_URL}/api/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVER_SECRET}`,
      },
      body: JSON.stringify({ action, payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Server error");
    return data;
  }

  // CRUD akun siswa
  const addSiswa = async (data) => {
    const id = data.id || genSiswaId(data.nama);
    const password = data.password || genPassword(id);
    // namaDisplay: capitalize huruf pertama
    const namaDisplay = data.namaDisplay || (id.charAt(0).toUpperCase() + id.slice(1));
    const result = await callServer("create", {
      id, password,
      nama: data.nama,
      namaDisplay,
      jenjang: data.jenjang,
      kelas: data.kelas || `Kelas ${data.jenjang}`,
    });
    return { id: result.id, password: result.password, uid: result.uid };
  };

  const deleteSiswa = async (id) => {
    const acc = fbAccounts.find(a => a.id === id);
    await callServer("delete", { uid: acc?.uid, id });
    // Cleanup messages thread yang involve siswa ini (format threadId: "id1__id2" sorted).
    // Non-fatal: kalau gagal, akun udah dihapus, thread orphan acceptable.
    try {
      const msgsSnap = await get(ref(db, "messages"));
      if (msgsSnap.exists()) {
        const threadKeys = Object.keys(msgsSnap.val());
        const involved = threadKeys.filter(tid => tid.split("__").includes(id));
        await Promise.allSettled(
          involved.map(tid => remove(ref(db, `messages/${tid}`)))
        );
      }
    } catch (e) {
      console.warn("Cleanup thread chat gagal (non-fatal):", e?.message);
    }
  };

  const resetPassword = async (id, newPassword) => {
    const acc = fbAccounts.find(a => a.id === id);
    await callServer("reset-password", { uid: acc?.uid, id, newPassword });
  };
  const isFbAccount = (id) => fbAccounts.some(a => a.id === id);

  // LEADERBOARD — merge hardcoded + Firebase siswa
  const getLeaderboard = (jenjang) => {
    return getAllSiswa(jenjang)
      .map(s => { const st = getStats(s.id); return { ...s, ...st }; })
      .sort((a, b) => {
        if (b.poin !== a.poin) return b.poin - a.poin;
        const aFirst = a.poinHistory?.[0]?.ts || Infinity;
        const bFirst = b.poinHistory?.[0]?.ts || Infinity;
        return aFirst - bFirst;
      })
      .map((s, i) => ({ ...s, rank: i + 1 }));
  };

  // AUTO-PUBLISH SCHEDULER — cek setiap menit
  useEffect(() => {
    const checkScheduled = async () => {
      const now = new Date().toISOString();
      tugas.filter(t => t.status === "scheduled" && t.scheduledAt && t.scheduledAt <= now)
        .forEach(t => {
          update(ref(db, `tugas/${t.id}`), { status: "aktif" });
        });
    };
    checkScheduled();
    const interval = setInterval(checkScheduled, 60000);
    return () => clearInterval(interval);
  }, [tugas]);
  const [presenceData, setPresenceData] = useState({});
  useEffect(() => {
    const presRef = ref(db, "presence");
    const unsub = onValue(presRef, snap => setPresenceData(snap.val() || {}));
    return () => unsub();
  }, []);
  const isOnline = (userId) => {
    // userId bisa berupa id ("akhdan") atau uid — coba keduanya
    if (presenceData[userId]?.online) return true;
    const acc = fbAccounts.find(a => a.id === userId);
    if (acc?.uid && presenceData[acc.uid]?.online) return true;
    if (fbGuru?.id === userId && presenceData[GURU_UID]?.online) return true;
    return false;
  };
  const getLastSeen = (userId) => {
    // Coba id langsung, lalu uid mapping (sama seperti isOnline)
    if (presenceData[userId]?.lastSeen) return presenceData[userId].lastSeen;
    const acc = fbAccounts.find(a => a.id === userId);
    if (acc?.uid && presenceData[acc.uid]?.lastSeen) return presenceData[acc.uid].lastSeen;
    if (fbGuru?.id === userId && presenceData[GURU_UID]?.lastSeen) return presenceData[GURU_UID].lastSeen;
    return null;
  };
  const getOnlineUsers = () => Object.entries(presenceData).filter(([, v]) => v?.online).map(([id]) => id);
  const [badgesData, setBadgesData] = useState({});
  useEffect(() => {
    const badgesRef = ref(db, "badges");
    const u7 = onValue(badgesRef, snap => { setBadgesData(snap.val() || {}); });
    return () => u7();
  }, []);
  const getBadges = (sid) => Object.keys(badgesData[sid] || {});
  const awardBadge = async (sid, badgeId) => {
    const current = badgesData[sid] || {};
    if (current[badgeId]) return;
    await update(ref(db, `badges/${sid}`), { [badgeId]: true });
  };
  const removeBadge = async (sid, badgeId) => {
    await remove(ref(db, `badges/${sid}/${badgeId}`));
  };

  // IMPORT MASSAL
  const importSiswaBulk = async (rows, onProgress) => {
    const results = [];
    const usedIds = new Set(fbAccounts.map(a => a.id));
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const id = genSiswaId(row.nama, usedIds);
        const password = genPassword(id);
        usedIds.add(id);
        const result = await addSiswa({ ...row, id, password });
        results.push({ ...row, ...result, status: "ok" });
      } catch (e) {
        results.push({ ...row, status: "error", error: e.message });
      }
      onProgress?.(i + 1, rows.length);
    }
    return results;
  };

  return { getTugas, addTugas, deleteTugas, updateTugas, duplicateTugas, getBankSoal, addBankSoal, updateBankSoal, deleteBankSoal, addBankSoalBulk, getSubs, addSub, hasSub, getSubBy, getStats, updateStats, resetStreakIfMissed, getLeaderboard, getAllSiswa, addSiswa, deleteSiswa, resetPassword, isFbAccount, importSiswaBulk, genSiswaId: (n) => genSiswaId(n, new Set(fbAccounts.map(a => a.id))), genPassword, getThread, sendMessage, getUnreadCount, markRead, getContacts, getLastMsg, getBroadcasts, addBroadcast, editBroadcast, deleteBroadcast, getPhoto, savePhoto, getBadges, awardBadge, removeBadge, isOnline, getLastSeen, getOnlineUsers, fbGuru, setCurrentUser, loading };
}

// ─── CONFIRM MODAL ───
function Confirm({ title, desc, onOk, onCancel }) {
  return <div className="modal-overlay" onClick={onCancel}><div className="modal" onClick={e => e.stopPropagation()}><h3>{title}</h3><p>{desc}</p><div className="modal-actions"><button className="btn btn-outline btn-sm" onClick={onCancel}>Batal</button><button className="btn btn-danger btn-sm" onClick={onOk}>Hapus</button></div></div></div>;
}

// ─── LOGO SVG (Bold Orbit — putih, dipakai di semua konteks teal) ───
// ─── ASTROLAB MARK (A-CLUSTER) ───
// 4 elemen geometric tersusun membentuk huruf "A":
// - Apex rhombus (Astro) — visi, anchor sistem
// - Left + Right pillars (Lab) — eksekusi, daily work
// - Cross bar (Bridge) — pendidikan: penghubung visi & eksekusi
// Prop `onDark`: kalau true, render versi putih (untuk dark background).
function LogoBold({ size = 32, onDark = false }) {
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

// Versi teal — untuk pakai di background putih
// ─── LOGIN ───
function LoginScreen({ onLogin }) {
  const [id, setId] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);

  async function submit() {
    if (!id.trim()) { setErr("ID belum diisi."); return; }
    if (!pw.trim()) { setErr("Password belum diisi."); return; }
    setLoading(true); setErr("");
    try {
      const email = `${id.trim().toLowerCase()}@astrolab.id`;
      const cred = await signInWithEmailAndPassword(auth, email, pw.trim());
      const uid = cred.user.uid;
      // Ambil profil dari /users/{uid}
      const snap = await get(ref(db, `users/${uid}`));
      if (!snap.exists()) throw new Error("Profil tidak ditemukan.");
      const profile = snap.val();
      onLogin({ ...profile, uid });
    } catch (e) {
      const msg = e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found"
        ? "ID atau password salah." : e.message || "Login gagal.";
      setErr(msg);
    }
    setLoading(false);
  }
  return (
    <div className="login-wrap">
      <div className="login-shell">
        {/* ── HERO SECTION ── */}
        <div className="login-hero">
          {/* Deco circles */}
          <div className="login-hero-deco1" />
          <div className="login-hero-deco2" />
          {/* Stars */}
          <svg className="login-hero-stars" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
            {[[40,28],[310,18],[180,42],[90,90],[340,70],[260,30],[60,160],[370,140],[140,110]].map(([x,y],i)=>
              <circle key={i} cx={x} cy={y} r={i%3===0?1.4:0.9} fill="white" opacity={.25+i*.03}/>
            )}
          </svg>
          {/* Logo + Brand */}
          <div className="login-logo-box"><LogoBold size={36} onDark /></div>
          <div className="login-brand">Astrolab</div>
          <div className="login-tagline">Our Classroom</div>
          {/* Wave divider */}
          <div className="login-wave">
            <svg viewBox="0 0 400 48" preserveAspectRatio="none" style={{ width: "100%", height: 48, display: "block" }}>
              <path d="M0,28 C60,6 110,48 180,24 C240,4 300,44 360,22 C380,14 392,20 400,24 L400,48 L0,48 Z" fill="white"/>
            </svg>
          </div>
        </div>

        {/* ── FORM SECTION ── */}
        <div className="login-form">
          <div className="login-form-title">Selamat datang</div>
          <div className="login-form-sub">Masuk untuk melanjutkan belajar</div>

          <div className="login-field">
            <label className="login-lbl">ID Siswa / Guru</label>
            <input className="login-inp" value={id} onChange={e => { setId(e.target.value); setErr(""); }}
              placeholder="Contoh: fata" onKeyDown={e => e.key === "Enter" && submit()} autoCapitalize="none" />
          </div>
          <div className="login-field">
            <label className="login-lbl">Password</label>
            <input className="login-inp" type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(""); }}
              placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} />
          </div>

          {err && <div className="login-err"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{err}</div>}

          <button className="login-btn" onClick={submit} disabled={loading}>{loading ? "Memeriksa..." : "Masuk →"}</button>
          <div className="login-foot">Our Classroom · <b>© 2026 M. Hasanul Fatta</b></div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD SISWA ───
function DashboardSiswa({ user, store, navigate }) {
  const stats = store.getStats(user.id);
  const allTugas = store.getTugas().filter(t => t.jenjang === user.jenjang && t.status === "aktif");
  const byNewest = (a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  };
  const tugas = allTugas.filter(t => fmtDl(t.deadline).tone !== "bad").sort(byNewest); // belum lewat deadline
  const tugasLewat = allTugas.filter(t => fmtDl(t.deadline).tone === "bad" && !store.hasSub(user.id, t.id));
  const lb = store.getLeaderboard(user.jenjang);
  const myRank = lb.find(s => s.id === user.id);

  // Reset streak kalau siswa lewatin deadline tanpa submit. Trigger sekali per session pas data ready.
  const hasCheckedStreak = useRef(false);
  useEffect(() => {
    if (hasCheckedStreak.current) return;
    // Tunggu sampai data loaded (allTugas terisi atau confirmed empty)
    if (store.loading) return;
    if (tugasLewat.length > 0 && (stats.streak || 0) > 0) {
      hasCheckedStreak.current = true;
      store.resetStreakIfMissed(user.id);
    }
  }, [tugasLewat.length, stats.streak, store.loading]);

  // Dynamic greeting by waktu
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return <>
    <div className="page">
      {/* Greeting — mobile & desktop */}
      <div style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 3 }}>{greeting}!</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Halo, {user.namaDisplay}</h1>
      </div>
      <div className="dt" style={{ paddingTop: 0, marginBottom: 4 }}></div>
      <Card pad="lg" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "#fff", marginBottom: 12, border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, opacity: .8, fontWeight: 500 }}>TOTAL POIN</div>
            <div className="stat-num" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.03em" }}>{stats.poin.toLocaleString("id-ID")}</div>
            <div style={{ fontSize: 13, opacity: .8, marginTop: 2 }}>Ranking #{myRank?.rank || "—"} di Kelas {user.jenjang}</div>
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {(stats.streak || 0) > 0 ? (
              <div className="streak-flame">
                <FlameAnimated size={44} streak={stats.streak} />
              </div>
            ) : (
              <div style={{ color: "rgba(255,255,255,.4)" }}><I n="flame" s={36} /></div>
            )}
            <div style={{ fontSize: 12, opacity: .85, fontWeight: 600 }}>{stats.tugasSelesai} tugas selesai</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.2)", color: "#fff", backdropFilter: "blur(4px)" }} onClick={() => navigate("leaderboard")}><I n="trophy" s={13} /> Ranking</button>
          <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.15)", color: "#fff", backdropFilter: "blur(4px)" }} onClick={() => navigate("tugas")}><I n="book" s={13} /> Tugas</button>
        </div>
      </Card>
      <div className="g3" style={{ marginBottom: 12 }}>
        {[
          { label: "Tugas selesai", val: stats.tugasSelesai, icon: "checkCircle", cls: "mini-icon-1" },
          { label: "Nilai rata-rata", val: stats.nilaiRata || "—", icon: "chartBar", cls: "mini-icon-2" },
          { label: "Total poin", val: stats.poin, icon: "medal", cls: "mini-icon-3" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center", padding: "14px 8px" }}>
            <div className={`mini-icon ${s.cls}`}><I n={s.icon} s={18} /></div>
            <div className="stat-num" style={{ fontSize: 17, fontWeight: 700 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Progress menuju level berikutnya — isi ruang kosong */}
      {(() => {
        const prog = getLevelProgress(stats.poin || 0);
        const lv = getLevel(stats.poin || 0);
        return (
          <Card style={{ marginBottom: 16, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <TierIcon tierId={lv.tierId} size={32} color={lv.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: lv.color }}>{lv.name}</span>
                  {prog.next
                    ? <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{prog.needed} poin lagi → {prog.next.name}</span>
                    : <span style={{ fontSize: 10, color: lv.color, fontWeight: 700 }}>LEVEL MAKS</span>}
                </div>
                <div style={{ height: 6, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${prog.pct}%`, background: lv.color, borderRadius: 99, transition: "width .5s" }} />
                </div>
              </div>
              {(stats.streak || 0) > 0 && (
                <div style={{ textAlign: "center", flexShrink: 0, paddingLeft: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, color: "#dc2626", fontWeight: 800, fontSize: 16 }}>
                    <I n="flame" s={16} />{stats.streak}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--ink-3)" }}>streak</div>
                </div>
              )}
            </div>
          </Card>
        );
      })()}
      <div className="sh"><h2>Tugas aktif</h2><button className="btn btn-soft btn-sm" onClick={() => navigate("tugas")}>Semua <I n="chevR" s={12} /></button></div>
      {tugas.length === 0 ? <div className="empty">Belum ada tugas aktif dari guru.</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {tugas.slice(0, 3).map(t => { const dl = fmtDl(t.deadline); const done = store.hasSub(user.id, t.id); return <button key={t.id} onClick={() => navigate("tugas-detail", { tugasId: t.id })} style={{ textAlign: "left", display: "block", width: "100%", background: "none", border: "none" }}><Card><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", background: done ? "var(--good-bg)" : "var(--accent-soft)", display: "grid", placeItems: "center", color: done ? "var(--good)" : "var(--accent-2)", flexShrink: 0 }}><I n={done ? "check" : "book"} s={18} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{t.judul}</div><div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{t.mapel}</div></div>{done ? <span className="chip chip-good">Selesai</span> : <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}>{dl.label}</span>}</div></Card></button>; })}
        </div>}
      <div className="sh"><h2>Top 3 Kelas {user.jenjang}</h2><button className="btn btn-soft btn-sm" onClick={() => navigate("leaderboard")}>Semua <I n="chevR" s={12} /></button></div>
      <Card pad="none" style={{ overflow: "hidden" }}>
        {lb.length === 0 ? <div className="empty">Belum ada ranking. Kerjakan tugas dulu!</div> :
          lb.slice(0, 3).map(s => <div key={s.id} className="lb-row" style={{ gridTemplateColumns: "28px 34px 1fr auto" }}><div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : "top3"}`}>{s.rank}</div><UserAvatar userId={s.id} name={s.nama} size="sm" store={store} /><div><div className="lb-name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span>{s.nama}{s.id === user.id && <span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span>}</span><LevelBadge poin={s.poin || 0} size="xs" showName={false} /></div><div className="lb-meta">{s.kelas}</div></div><div className="lb-pts">{s.poin.toLocaleString("id-ID")}</div></div>)}
      </Card>
    </div>
  </>;
}

// ─── CELEBRATION AVATAR (animasi konfeti untuk rank #1) ───
function CelebrationAvatar({ userId, name, size, store }) {
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

// ─── LEADERBOARD ───
function LeaderboardScreen({ user, store }) {
  const isGuru = user.role === "guru";
  const [tab, setTab] = useState(isGuru ? "VII" : user.jenjang);
  const lb = store.getLeaderboard(tab);
  const myRow = lb.find(s => s.id === user.id);
  const myInTop = myRow && myRow.rank <= 10;

  // Prestasi minggu ini — 5 nominasi dengan metrik BERBEDA
  const subsAll = store.getSubs();
  const oneWeekAgo = Date.now() - 7 * 24 * 3600000;

  // Helper: subs minggu ini per siswa
  function weekSubs(siswaId) {
    return subsAll.filter(s => s.siswaId === siswaId && s.submittedAt && new Date(s.submittedAt).getTime() >= oneWeekAgo);
  }

  // 1. Top Performer — poin tertinggi
  const topPerformer = [...lb].sort((a, b) => (b.poin || 0) - (a.poin || 0))[0];

  // 2. Comeback King — peningkatan nilai paling drastis (nilai terakhir vs sebelumnya)
  let comebackKing = null, maxJump = 0;
  lb.forEach(s => {
    const sSubs = subsAll.filter(x => x.siswaId === s.id && x.submittedAt).sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    if (sSubs.length >= 2) {
      const jump = sSubs[sSubs.length - 1].nilai - sSubs[sSubs.length - 2].nilai;
      if (jump > maxJump) { maxJump = jump; comebackKing = { ...s, jump }; }
    }
  });

  // 3. Perfectionist — paling banyak nilai 100
  let perfectionist = null, maxPerfect = 0;
  lb.forEach(s => {
    const perfectCount = subsAll.filter(x => x.siswaId === s.id && x.nilai === 100).length;
    if (perfectCount > maxPerfect) { maxPerfect = perfectCount; perfectionist = { ...s, perfectCount }; }
  });

  // 4. Speed Runner — rata-rata submit tercepat (relatif terhadap deadline)
  let speedRunner = null, bestSpeed = Infinity;
  lb.forEach(s => {
    const sSubs = subsAll.filter(x => x.siswaId === s.id && x.submittedAt && x.ontime);
    if (sSubs.length >= 2) {
      // Pakai jumlah ontime sebagai proxy speed (lebih banyak ontime = lebih cepat)
      const ontimeRate = sSubs.length;
      if (-ontimeRate < bestSpeed) { bestSpeed = -ontimeRate; speedRunner = { ...s, ontimeCount: sSubs.length }; }
    }
  });

  // 5. Most Improved — peningkatan rata-rata nilai (paruh kedua vs paruh pertama subs)
  let mostImproved = null, maxImprove = 0;
  lb.forEach(s => {
    const sSubs = subsAll.filter(x => x.siswaId === s.id && x.submittedAt).sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    if (sSubs.length >= 4) {
      const half = Math.floor(sSubs.length / 2);
      const firstAvg = sSubs.slice(0, half).reduce((a, b) => a + b.nilai, 0) / half;
      const secondAvg = sSubs.slice(half).reduce((a, b) => a + b.nilai, 0) / (sSubs.length - half);
      const improve = Math.round(secondAvg - firstAvg);
      if (improve > maxImprove) { maxImprove = improve; mostImproved = { ...s, improve }; }
    }
  });

  const nominasi = [
    topPerformer && { label: "TOP PERFORMER", icon: "trophy", color: "#b45309", bg: "#fef3c7", siswa: topPerformer, sub: `${topPerformer.poin?.toLocaleString("id-ID") || 0} poin` },
    comebackKing && { label: "COMEBACK KING", icon: "flame", color: "#dc2626", bg: "#fef2f2", siswa: comebackKing, sub: `Naik +${comebackKing.jump} poin nilai` },
    perfectionist && maxPerfect > 0 && { label: "PERFECTIONIST", icon: "target", color: "#d97706", bg: "#fffbeb", siswa: perfectionist, sub: `${perfectionist.perfectCount}x nilai 100` },
    speedRunner && { label: "SPEED RUNNER", icon: "zap", color: "#7c3aed", bg: "#f5f3ff", siswa: speedRunner, sub: `${speedRunner.ontimeCount}x submit tepat waktu` },
    mostImproved && maxImprove > 0 && { label: "MOST IMPROVED", icon: "trending", color: "#16a34a", bg: "#f0fdf4", siswa: mostImproved, sub: `Rata-rata naik +${mostImproved.improve}` },
  ].filter(Boolean);

  return <>
    <div className="page">
      <div className="dt"><div><h1>Leaderboard</h1><p>Ranking poin akumulatif · semester ini</p></div></div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === "VII" ? "active" : ""}`} onClick={() => setTab("VII")}>Kelas VII</button>
        <button className={`tab ${tab === "VIII" ? "active" : ""}`} onClick={() => setTab("VIII")}>Kelas VIII</button>
      </div>

      {lb.length === 0 ? <Card><div className="empty empty-box"><I n="trophy" s={32} /><h3>Belum ada ranking</h3><p>Ranking muncul setelah siswa menyelesaikan tugas pertama.</p></div></Card> : <>

        {/* Podium compact */}
        {lb.length >= 3 && <Card style={{ marginBottom: 12, padding: "20px 16px 0", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6 }}>
            {[lb[1], lb[0], lb[2]].map((s, idx) => {
              const place = [2, 1, 3][idx];
              const isFirst = place === 1;
              const podH = [52, 72, 40][idx];
              const podBg = isFirst ? "#fbbf24" : place === 2 ? "#94a3b8" : "#cd7f32";
              const podTextCol = isFirst ? "#78350f" : "#fff";
              return (
                <div key={s.id} style={{ flex: 1, maxWidth: 100, textAlign: "center", minWidth: 0 }}>
                  {isFirst
                    ? <CelebrationAvatar userId={s.id} name={s.nama} size="lg" store={store} />
                    : <UserAvatar userId={s.id} name={s.nama} size="md" store={store} />
                  }
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingInline: 4 }}>{getFirstName(s.nama)}</div>
                  <div className="stat-num" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 6 }}>{s.poin.toLocaleString("id-ID")} pt</div>
                  <div className={isFirst ? "podium-1" : ""} style={{
                    height: podH,
                    background: podBg,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--mono)",
                    fontSize: isFirst ? 18 : 14,
                    fontWeight: 800,
                    color: podTextCol,
                  }}>
                    {place}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>}

        {/* Top 10 + Prestasi minggu ini */}
        <div className="g2" style={{ alignItems: "start" }}>
          {/* Top 10 */}
          <Card pad="none" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Top 10 · Kelas {tab}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{lb.length} siswa</div>
            </div>
            {lb.slice(0, 10).map(s => (
              <div key={s.id} className={`lb-row ${!isGuru && s.id === user.id ? "me" : ""}`}>
                <div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : s.rank === 3 ? "top3" : ""}`}>{s.rank}</div>
                <UserAvatar userId={s.id} name={s.nama} size="md" store={store} />
                <div style={{ minWidth: 0 }}>
                  <div className="lb-name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>{s.nama}{!isGuru && s.id === user.id && <span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span>}</span>
                    <LevelBadge poin={s.poin || 0} size="xs" showName={false} />
                  </div>
                  <div className="lb-meta">
                    {s.kelas}
                    {(s.streak || 0) >= 3 && <span className="streak-pill" style={{ marginLeft: 4 }}><FlameAnimated size={14} streak={s.streak} /> {s.streak}x</span>}
                  </div>
                </div>
                <div className="lb-pts">{s.poin.toLocaleString("id-ID")}</div>
              </div>
            ))}
            {!isGuru && !myInTop && myRow && (
              <><div className="divider">· · ·</div>
              <div className="lb-row me">
                <div className="lb-rank">{myRow.rank}</div>
                <UserAvatar userId={myRow.id} name={myRow.nama} size="md" store={store} />
                <div style={{ minWidth: 0 }}><div className="lb-name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span>{myRow.nama}<span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span></span><LevelBadge poin={myRow.poin || 0} size="xs" showName={false} /></div><div className="lb-meta">{myRow.kelas}</div></div>
                <div className="lb-pts">{myRow.poin.toLocaleString("id-ID")}</div>
              </div></>
            )}
          </Card>

          {/* Prestasi minggu ini */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Prestasi minggu ini</div>
              {nominasi.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--ink-3)", padding: "8px 0" }}>Nominasi muncul setelah siswa mengerjakan beberapa tugas.</div>
              ) : nominasi.map((item, i) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < nominasi.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: item.bg, color: item.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <I n={item.icon} s={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: item.color, letterSpacing: ".08em", textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.siswa?.nama ? getFirstName(item.siswa.nama) : "—"}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{item.sub}</div>
                  </div>
                  {item.siswa && <UserAvatar userId={item.siswa.id} name={item.siswa.nama} size="sm" store={store} />}
                </div>
              ))}
            </Card>
            {!isGuru && <Card style={{ background: "linear-gradient(135deg, var(--accent-soft), #eaf4f3)", border: "1px solid var(--accent-soft)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><I n="zap" s={15} /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-2)", marginBottom: 4 }}>Namamu bisa ada di sini!</div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>Setiap tugas yang kamu kerjain tepat waktu = poin + streak. Konsisten ngerjain = namamu naik terus di ranking. Mulai dari sekarang!</div>
                </div>
              </div>
            </Card>}
          </div>
        </div>
      </>}
    </div>
  </>;
}

// ─── MAPEL ICON ───
function MapelIcon({ mapel, size = 24 }) {
  if (mapel === "IPA") return <I n="atom" s={size} />;
  return <I n="code" s={size} />;
}

// ─── DAFTAR TUGAS (SISWA) ───
function DaftarTugas({ user, store, navigate }) {
  const isVII = user.jenjang === "VII";
  const [mapel, setMapel] = useState("IPA");
  const [showArsip, setShowArsip] = useState(false);

  const semua = store.getTugas().filter(t => t.jenjang === user.jenjang && t.mapel === mapel);
  // Sort by newest first (createdAt desc)
  const byNewest = (a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  };

  // Split: aktif = deadline belum lewat ATAU sudah dikerjakan, arsip = lewat deadline & belum dikerjakan
  const aktif = semua.filter(t => {
    const dl = fmtDl(t.deadline);
    const done = store.hasSub(user.id, t.id);
    return done || dl.tone !== "bad";
  }).sort(byNewest);
  const arsip = semua.filter(t => {
    const dl = fmtDl(t.deadline);
    const done = store.hasSub(user.id, t.id);
    return !done && dl.tone === "bad";
  }).sort(byNewest);

  function TugasCard({ t }) {
    const dl = fmtDl(t.deadline);
    const done = store.hasSub(user.id, t.id);
    const lewat = dl.tone === "bad";
    return (
      <button onClick={() => navigate("tugas-detail", { tugasId: t.id })}
        style={{ textAlign: "left", display: "block", width: "100%", background: "none", border: "none" }}>
        <Card style={{ opacity: lewat ? 0.6 : 1 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: "var(--r-sm)", flexShrink: 0, display: "grid", placeItems: "center",
              background: done ? "var(--good-bg)" : lewat ? "var(--surface-alt)" : "var(--accent-soft)",
              color: done ? "var(--good)" : lewat ? "var(--ink-3)" : "var(--accent-2)" }}>
              <I n={done ? "check" : lewat ? "clock" : "book"} s={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>{t.mapel}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: lewat && !done ? "var(--ink-2)" : "var(--ink)" }}>{t.judul}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {done
                  ? <span className="chip chip-good"><I n="check" s={10} /> Selesai</span>
                  : lewat
                    ? <span className="chip chip-bad"><I n="clock" s={10} /> Lewat deadline</span>
                    : <>
                        <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span>
                        <span className="chip">+{t.poinMax} pt</span>
                        <span className="chip">{t.soal?.length || 0} soal</span>
                      </>
                }
              </div>
            </div>
            <I n="chevR" s={16} style={{ color: "var(--ink-3)", marginTop: 12, flexShrink: 0 }} />
          </div>
        </Card>
      </button>
    );
  }

  return <>
    <div className="page">
      <div className="dt"><div><h1>Tugas {mapel}</h1><p>Kelas {user.jenjang}</p></div></div>

      {isVII && (
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button className={`tab ${mapel === "IPA" ? "active" : ""}`} onClick={() => setMapel("IPA")}><MapelIcon mapel="IPA" size={13} /> IPA</button>
          <button className={`tab ${mapel === "Informatika" ? "active" : ""}`} onClick={() => setMapel("Informatika")}><MapelIcon mapel="Informatika" size={13} /> Informatika</button>
        </div>
      )}

      {/* Tugas aktif */}
      {aktif.length === 0 && arsip.length === 0
        ? <Card><div className="empty empty-box">
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center", marginBottom: 8 }}><MapelIcon mapel={mapel} size={28} /></div>
            <h3>Belum ada tugas {mapel}</h3>
            <p>Tugas akan muncul di sini setelah guru membuat tugas untuk kelasmu.</p>
          </div></Card>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {aktif.map(t => <TugasCard key={t.id} t={t} />)}
          </div>
      }

      {/* Tugas lewat deadline — collapsible */}
      {arsip.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setShowArsip(s => !s)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "8px 0", width: "100%" }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
              <I n="clock" s={12} /> Lewat Deadline ({arsip.length})
            </span>
            <I n={showArsip ? "chevD" : "chevR"} s={12} style={{ color: "var(--ink-3)" }} />
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </button>
          {showArsip && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {arsip.map(t => <TugasCard key={t.id} t={t} />)}
            </div>
          )}
        </div>
      )}
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
  const lewat = dl.tone === "bad";
  const bisa = !done && t.status === "aktif" && t.soal?.length > 0 && !lewat;

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
          {lewat && !done && <span className="chip chip-bad">Ditutup</span>}
        </div>
      </Card>

      {/* Sudah dikerjakan */}
      {done && sub && (
        <Card pad="lg" style={{ marginBottom: 12, background: "var(--good-bg)", border: "1px solid #86efac" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--good)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><I n="check" s={24} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "var(--good)" }}>Sudah dikerjakan!</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>Nilai: <strong>{sub.nilai}</strong> · Poin: <strong>+{sub.poinDapat}</strong></div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{new Date(sub.submittedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
          </div>
          {/* Review jawaban hanya setelah deadline lewat */}
          {lewat && (
            <button className="btn btn-outline btn-full btn-sm" style={{ marginTop: 12 }} onClick={() => navigate("review-tugas", { tugasId: t.id })}>
              <I n="book" s={14} /> Lihat Jawaban & Pembahasan
            </button>
          )}
          {!lewat && (
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10, textAlign: "center", fontStyle: "italic" }}>Review jawaban tersedia setelah deadline berakhir</div>
          )}
        </Card>
      )}

      {/* Tombol kerjakan */}
      {bisa && (
        <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate("kerjakan", { tugasId: t.id })}>
          <I n="book" s={16} /> Mulai Kerjakan
        </button>
      )}

      {/* Terkunci — lewat deadline */}
      {!bisa && !done && lewat && (
        <div style={{ background: "var(--surface-alt)", border: "1.5px solid var(--line)", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bad-bg)", color: "var(--bad)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
            <I n="clock" s={22} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-2)" }}>Tugas Sudah Ditutup</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.6 }}>
            Deadline tugas ini sudah lewat.<br />Kamu tidak bisa lagi mengerjakan tugas ini.
          </div>
        </div>
      )}

      {!bisa && !done && !lewat && (
        <div style={{ textAlign: "center", padding: 16, color: "var(--ink-3)", fontSize: 13 }}>
          {t.soal?.length === 0 ? "Soal belum tersedia" : "Tugas tidak aktif"}
        </div>
      )}
    </div>
  </>;
}

// ─── REVIEW TUGAS (siswa lihat jawaban setelah expired) ───
function ReviewTugas({ user, store, tugasId, navigate }) {
  const t = store.getTugas().find(x => x.id === tugasId);
  if (!t) return <div className="empty">Tugas tidak ditemukan.</div>;
  const sub = store.getSubBy(user.id, t.id);
  if (!sub) return <div className="empty">Kamu belum mengerjakan tugas ini.</div>;

  // Bangun map jawaban siswa per origIdx
  const resultByIdx = {};
  (sub.soalResults || []).forEach(r => { resultByIdx[r.origIdx] = r; });

  return <>
    <div className="topbar"><button className="topbar-back" onClick={() => navigate("tugas-detail", { tugasId: t.id })}><I n="chevL" s={18} /></button><div className="topbar-title">Review Jawaban</div><div style={{ width: 36 }} /></div>
    <div className="page">
      <div className="dt"><div><h1>{t.judul}</h1><p>{t.mapel} · Review jawaban</p></div></div>

      {/* Skor ringkas */}
      <Card pad="lg" style={{ marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: sub.nilai >= 80 ? "var(--good)" : sub.nilai >= 60 ? "var(--warn)" : "var(--bad)", fontFamily: "var(--mono)" }}>{sub.nilai}</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{sub.correctCount} dari {sub.total} benar · +{sub.poinDapat} poin</div>
      </Card>

      {/* Per soal */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(t.soal || []).map((soal, idx) => {
          const r = resultByIdx[idx];
          const isEssay = soal.type === "essay";
          const isRefleksi = soal.type === "refleksi";
          const isManual = isEssay || isRefleksi;
          const isCorrect = isManual ? (r?.statusNilai === "dinilai" && (r?.nilaiEssay || 0) >= 60) : r?.correct === true;
          const studentAns = isEssay ? r?.jawabanEssay : (r ? undefined : undefined);

          return (
            <Card key={idx} pad="md" style={{ borderLeft: `4px solid ${isManual && r?.statusNilai !== "dinilai" ? "var(--warn)" : isCorrect ? "var(--good)" : "var(--bad)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>SOAL {idx + 1}</span>
                {isManual
                  ? (r?.statusNilai === "dinilai"
                      ? <span className="chip" style={{ fontSize: 10, background: isCorrect ? "var(--good-bg)" : "var(--bad-bg)", color: isCorrect ? "var(--good)" : "var(--bad)" }}>{isRefleksi ? "Refleksi" : "Essay"} · {r.nilaiEssay}/100</span>
                      : <span className="chip" style={{ fontSize: 10, background: "#fef3c7", color: "#92400e" }}>Belum dinilai</span>)
                  : <span className="chip" style={{ fontSize: 10, background: isCorrect ? "var(--good-bg)" : "var(--bad-bg)", color: isCorrect ? "var(--good)" : "var(--bad)" }}>{isCorrect ? "✓ Benar" : "✗ Salah"}</span>
                }
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>{soal.pertanyaan}</div>
              {soal.gambar && <img src={soal.gambar} alt="" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, marginBottom: 10, border: "1px solid var(--line)" }} />}

              {/* PG / TF / Excel: tampilkan opsi dengan tanda benar/salah + pilihan siswa */}
              {(soal.type === "pg" || soal.type === "tf" || soal.type === "excel") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(soal.type === "tf" ? ["Benar", "Salah"] : soal.opsi || []).map((opt, i) => {
                    const isKey = soal.jawaban === i;
                    const isPicked = r?.pickedAnswer === i;
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8,
                        background: isKey ? "var(--good-bg)" : isPicked ? "var(--bad-bg)" : "var(--surface-alt)",
                        border: `1px solid ${isKey ? "#86efac" : isPicked ? "#fca5a5" : "var(--line)"}`,
                      }}>
                        <div style={{ width: 22, height: 22, borderRadius: 5, background: isKey ? "var(--good)" : isPicked ? "var(--bad)" : "var(--surface)", color: (isKey || isPicked) ? "#fff" : "var(--ink-3)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</div>
                        <span style={{ flex: 1, fontSize: 13 }}>{opt}</span>
                        {isKey && <span style={{ fontSize: 10, color: "var(--good)", fontWeight: 700 }}>KUNCI</span>}
                        {isPicked && !isKey && <span style={{ fontSize: 10, color: "var(--bad)", fontWeight: 700 }}>PILIHANMU</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Essay: tampilkan jawaban siswa + komentar guru */}
              {isEssay && (
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>Jawaban kamu:</div>
                  <div style={{ padding: "10px 12px", background: "var(--surface-alt)", borderRadius: 8, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {r?.jawabanEssay || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>(tidak menjawab)</span>}
                  </div>
                  {r?.komentarGuru && (
                    <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--accent-tint)", borderRadius: 8, fontSize: 12 }}>
                      <b style={{ color: "var(--accent-2)" }}>Komentar guru:</b> {r.komentarGuru}
                    </div>
                  )}
                </div>
              )}

              {/* Kompleks & Pasang: tampilkan kunci */}
              {soal.type === "komplex" && (
                <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  <b>Kunci jawaban:</b> {(soal.jawaban || []).map(i => String.fromCharCode(65 + i)).join(", ")}
                </div>
              )}
              {soal.type === "pasang" && (
                <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  <b>Pasangan benar:</b>
                  <div style={{ marginTop: 4 }}>
                    {(soal.kiri || []).map((k, ki) => (
                      <div key={ki} style={{ fontSize: 12 }}>{k} → {soal.kanan?.[(soal.jawaban || [])[ki]] ?? "—"}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pseudocode Trace: kode + jawaban siswa vs kunci */}
              {soal.type === "pseudocode" && (
                <div>
                  <pre style={{ background: "#1e293b", color: "#e2e8f0", padding: "10px 12px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.55, overflowX: "auto", marginBottom: 8 }}>{soal.kode}</pre>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>Jawaban kamu:</div>
                  <div style={{ padding: "8px 12px", background: isCorrect ? "var(--good-bg)" : "var(--bad-bg)", borderRadius: 8, fontSize: 13, fontFamily: "var(--mono)", marginBottom: 6, whiteSpace: "pre-wrap" }}>
                    {r?.pickedText || <span style={{ fontStyle: "italic", color: "var(--ink-3)" }}>(kosong)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    <b>Output benar:</b> <span style={{ fontFamily: "var(--mono)" }}>{soal.jawabanBenar}</span>
                  </div>
                </div>
              )}

              {/* Debug Challenge: kode + jawaban siswa vs kunci */}
              {soal.type === "debug" && (
                <div>
                  <div style={{ background: "#1e293b", color: "#e2e8f0", padding: "10px 0", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.6, overflowX: "auto", marginBottom: 8 }}>
                    {(soal.kodeBuggy || "").split("\n").map((line, i) => (
                      <div key={i} style={{ display: "flex", padding: "0 12px", background: (i + 1) === soal.barisBug ? "rgba(220,38,38,0.18)" : "transparent" }}>
                        <span style={{ color: "#64748b", minWidth: 24, textAlign: "right", marginRight: 12 }}>{i + 1}</span>
                        <span style={{ whiteSpace: "pre" }}>{line || " "}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>Jawaban kamu:</div>
                  <div style={{ padding: "6px 12px", background: "var(--surface-alt)", borderRadius: 8, fontSize: 12, marginBottom: 6 }}>
                    Baris: <b>{r?.pickedDebug?.baris ?? "—"}</b> · Perbaikan: <span style={{ fontFamily: "var(--mono)" }}>{r?.pickedDebug?.perbaikan || "(kosong)"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    <b>Baris bug:</b> {soal.barisBug} · <b>Perbaikan benar:</b> <span style={{ fontFamily: "var(--mono)" }}>{soal.perbaikanBenar}</span>
                  </div>
                </div>
              )}

              {/* Refleksi Terstruktur: 4 kolom siswa + panduan penilaian guru */}
              {soal.type === "refleksi" && (
                <div>
                  {["k1", "k2", "k3", "k4"].map((key, i) => {
                    const label = soal[`labelKolom${i + 1}`] || ["Prediksi saya", "Yang saya observasi", "Yang salah/bug", "Pelajaran yang saya ambil"][i];
                    const val = r?.jawabanRefleksi?.[key] || "";
                    return (
                      <div key={key} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-2)", marginBottom: 2 }}>{i + 1}. {label}</div>
                        <div style={{ padding: "6px 10px", background: "var(--surface-alt)", borderRadius: 6, fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                          {val || <span style={{ fontStyle: "italic", color: "var(--ink-3)" }}>(kosong)</span>}
                        </div>
                      </div>
                    );
                  })}
                  {r?.komentarGuru && (
                    <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--accent-tint)", borderRadius: 8, fontSize: 12 }}>
                      <b style={{ color: "var(--accent-2)" }}>Komentar guru:</b> {r.komentarGuru}
                    </div>
                  )}
                </div>
              )}

              {/* Pembahasan (kalau guru isi) — muncul untuk semua tipe soal */}
              {soal.pembahasan && soal.pembahasan.trim() && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--accent-tint)", borderRadius: 8, borderLeft: "3px solid var(--accent-2)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-2)", letterSpacing: ".08em", marginBottom: 4, textTransform: "uppercase" }}>Pembahasan</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-1)", whiteSpace: "pre-wrap" }}>{soal.pembahasan}</div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  </>;
}

// ─── QUIZ ENGINE ───
// ─── EXCEL SANDBOX PLAYER (siswa view) ───
function ExcelSandboxPlayer({ soal, answer, selected }) {
  const [formula, setFormula] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]); // simpan rumus & hasil yg sudah dicoba

  function hitung() {
    if (!formula.trim()) return;
    const r = evalExcelFormula(formula, soal.table || []);
    setResult(r);
    if (!r.error) {
      setHistory(h => [{ formula, value: r.value }, ...h.slice(0, 4)]);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Table */}
      <div style={{ overflowX: "auto", marginBottom: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--surface-alt)" }}>
              <th style={{ padding: "6px 10px", fontSize: 10, color: "var(--ink-3)", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)", width: 32 }}></th>
              {(soal.headers || []).map((h, hi) => (
                <th key={hi} style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  <div style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "var(--mono)", marginBottom: 2 }}>{String.fromCharCode(65 + hi)}</div>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(soal.table || []).map((row, ri) => (
              <tr key={ri}>
                <td style={{ padding: "6px 10px", textAlign: "center", color: "var(--ink-3)", borderRight: "1px solid var(--line)", borderTop: "1px solid var(--line-soft)", fontFamily: "var(--mono)", fontSize: 11, background: "var(--surface-alt)" }}>{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "6px 10px", borderRight: "1px solid var(--line)", borderTop: "1px solid var(--line-soft)", fontFamily: !isNaN(parseFloat(cell)) ? "var(--mono)" : "inherit", textAlign: !isNaN(parseFloat(cell)) ? "right" : "left" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formula input */}
      <div style={{ background: "var(--surface-alt)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <I n="chartBar" s={12} /> COBA RUMUS
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="inp"
            style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 13 }}
            placeholder="Contoh: =SUM(B1:B3) atau =AVERAGE(B1:B3)"
            value={formula}
            onChange={e => setFormula(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), hitung())}
          />
          <button className="btn btn-primary btn-sm" onClick={hitung} disabled={!formula.trim()}>Hitung</button>
        </div>

        {result && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: result.error ? "var(--bad-bg)" : "var(--good-bg)", border: `1px solid ${result.error ? "#fca5a5" : "var(--good)"}`, borderRadius: 6, fontSize: 13, fontFamily: "var(--mono)" }}>
            {result.error ? <span style={{ color: "var(--bad)" }}>⚠ {result.error}</span> : <span style={{ color: "var(--good)" }}>= {result.value}</span>}
          </div>
        )}

        {history.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-3)" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Histori percobaan:</div>
            {history.map((h, i) => (
              <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "2px 0" }}>
                <span style={{ color: "var(--ink-2)" }}>{h.formula}</span> <span style={{ color: "var(--ink-3)" }}>→</span> <span style={{ color: "var(--accent-2)", fontWeight: 600 }}>{h.value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 10, color: "var(--ink-3)" }}>
          💡 Fungsi: <b>SUM</b>, <b>AVERAGE</b>, <b>COUNT</b>, <b>MAX</b>, <b>MIN</b>, <b>ROUND</b>. Range: <b>A1:B3</b>
        </div>
      </div>

      {/* PG options */}
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10, fontWeight: 600 }}>Pilih jawaban yang benar:</div>
      {(soal.opsi || []).map((o, i) => (
        <button key={i} className={`quiz-opt ${selected === i ? "selected" : ""}`} onClick={() => answer(i)}>
          <div className="quiz-letter">{String.fromCharCode(65 + i)}</div>
          <span style={{ flex: 1 }}>{o}</span>
        </button>
      ))}
    </div>
  );
}

function KerjakanTugas({ user, store, tugasId, navigate }) {
  const t = store.getTugas().find(x => x.id === tugasId);
  const SAVE_KEY = `astrolab.quiz.${user.id}.${tugasId}`;

  // Randomize soal order — seed per user+tugas biar konsisten kalau refresh
  const [shuffledSoal] = useState(() => {
    if (!t?.soal?.length) return [];
    // Cek apakah ada saved order
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (s) {
        const d = JSON.parse(s);
        if (d.order) return d.order.map(i => ({ ...t.soal[i], _origIdx: i }));
      }
    } catch {}
    // Generate random order baru
    const order = shuffle(t.soal.map((_, i) => i));
    try {
      const s = localStorage.getItem(SAVE_KEY);
      const d = s ? JSON.parse(s) : {};
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, order }));
    } catch {}
    return order.map(i => ({ ...t.soal[i], _origIdx: i }));
  });

  // Auto-restore dari localStorage
  const [idx, setIdx] = useState(() => {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s).idx || 0 : 0; } catch { return 0; }
  });
  const [answers, setAnswers] = useState(() => {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s).answers || {} : {}; } catch { return {}; }
  });
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false); // synchronous guard against double-tap race
  const [savedAt, setSavedAt] = useState(null); // timestamp untuk auto-save indicator
  const [savedTick, setSavedTick] = useState(0); // force re-render setelah save

  // Auto-fade save indicator setelah 2.5s
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedTick(x => x + 1), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  if (!t || !t.soal?.length) return <div className="empty">Soal tidak tersedia.</div>;
  const soalList = shuffledSoal.length ? shuffledSoal : t.soal.map((s, i) => ({ ...s, _origIdx: i }));
  const total = soalList.length;
  // Safety: kalau idx out of bound (data corrupt / soal berubah), reset ke 0
  const safeIdx = (idx >= 0 && idx < total) ? idx : 0;
  const soal = soalList[safeIdx];
  if (!soal) return <div className="empty">Data soal tidak valid. <button className="btn btn-primary btn-sm" onClick={() => { try { localStorage.removeItem(SAVE_KEY); } catch {} window.location.reload(); }}>Reset & Reload</button></div>;

  // Auto-save setiap ada perubahan jawaban — PRESERVE order field
  function answer(val) {
    if (submitted) return;
    const next = { ...answers, [safeIdx]: val };
    setAnswers(next);
    try {
      const s = localStorage.getItem(SAVE_KEY);
      const d = s ? JSON.parse(s) : {};
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, answers: next, idx: safeIdx }));
      setSavedAt(Date.now());
    } catch {}
  }
  function toggleMulti(val) {
    if (submitted) return;
    const cur = answers[safeIdx] || [];
    const next = { ...answers, [safeIdx]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
    setAnswers(next);
    try {
      const s = localStorage.getItem(SAVE_KEY);
      const d = s ? JSON.parse(s) : {};
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, answers: next, idx: safeIdx }));
      setSavedAt(Date.now());
    } catch {}
  }
  function goTo(i) {
    setIdx(i);
    try { const s = localStorage.getItem(SAVE_KEY); const d = s ? JSON.parse(s) : {}; localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, idx: i })); } catch {}
  }

  async function doSubmit() {
    // Guard: cegah double-submit dari double-tap atau klik berulang saat lag
    if (submitLockRef.current || submitted) return;
    // Guard: cegah double-submit dari multi-device (Device B liat state lama, klik submit).
    // hasSub cek local state — kalau Device B udah sync, di-block di sini.
    // Kalau Device B masih offline-state-lama, deterministic key di addSub yang nge-catch.
    if (store.hasSub(user.id, t.id)) {
      alert("Tugas ini sudah pernah kamu kumpulkan dari perangkat lain. Buka detail tugas untuk lihat hasilnya.");
      navigate("tugas-detail", { tugasId });
      return;
    }
    submitLockRef.current = true;
    setIsSubmitting(true);
    setShowConfirm(false);
    let totalPoin = 0, correctCount = 0;
    const soalResults = []; // simpan hasil per soal untuk analisis
    soalList.forEach((s, i) => {
      const ans = answers[i];
      const poinSoal = s.poin || Math.floor(t.poinMax / total);
      let correct = false;
      if (s.type === "pg" || s.type === "tf") correct = ans === s.jawaban;
      else if (s.type === "komplex") correct = (ans || []).slice().sort().join(",") === (s.jawaban || []).slice().sort().join(",");
      else if (s.type === "pasang") correct = s.jawaban?.every((j, ki) => (ans || {})[ki] === j);
      else if (s.type === "excel") correct = ans === s.jawaban;
      else if (s.type === "pseudocode") correct = fuzzyMatchText(ans, s.jawabanBenar);
      else if (s.type === "debug") {
        // Cek 2 field: nomor baris (int match) & perbaikan (fuzzy text)
        const barisCocok = Number(ans?.baris) === Number(s.barisBug);
        const perbaikanCocok = fuzzyMatchText(ans?.perbaikan, s.perbaikanBenar);
        correct = barisCocok && perbaikanCocok;
      }
      else if (s.type === "essay") { correct = null; /* perlu penilaian manual */ }
      else if (s.type === "refleksi") { correct = null; /* perlu penilaian manual */ }
      if (correct === true) { totalPoin += poinSoal; correctCount++; }
      const resultItem = { origIdx: s._origIdx ?? i, correct, poinSoal };
      // Simpan jawaban siswa untuk review (kecuali essay yang pakai jawabanEssay)
      if (s.type === "pg" || s.type === "tf" || s.type === "excel") {
        resultItem.pickedAnswer = ans ?? null;
      } else if (s.type === "komplex") {
        resultItem.pickedMulti = ans || [];
      } else if (s.type === "pasang") {
        resultItem.pickedPasang = ans || {};
      } else if (s.type === "pseudocode") {
        resultItem.pickedText = ans || "";
      } else if (s.type === "debug") {
        resultItem.pickedDebug = { baris: ans?.baris ?? null, perbaikan: ans?.perbaikan || "" };
      }
      if (s.type === "essay") {
        resultItem.jawabanEssay = ans || "";
        resultItem.statusNilai = "perlu_dinilai";
      }
      if (s.type === "refleksi") {
        resultItem.jawabanRefleksi = ans || { k1: "", k2: "", k3: "", k4: "" };
        resultItem.statusNilai = "perlu_dinilai";
      }
      soalResults.push(resultItem);
    });
    // Hitung nilai hanya dari soal auto-graded (essay & refleksi menyusul setelah dinilai guru)
    const nonEssayTotal = t.soal.filter(s => s.type !== "essay" && s.type !== "refleksi").length || 1;
    const nilai = Math.round((correctCount / nonEssayTotal) * 100);
    const hasEssay = t.soal.some(s => s.type === "essay" || s.type === "refleksi");
    const dl = fmtDl(t.deadline);
    const ontime = dl.tone !== "bad";
    const prevStats = store.getStats(user.id);
    const prevStreak = prevStats.streak || 0;
    const lb = store.getLeaderboard(user.jenjang);
    const isTopClass = lb.length > 0 && lb[0].id === user.id;
    const isTopThree = lb.length > 0 && lb.slice(0, 3).some(s => s.id === user.id);
    const subForBadge = { nilai, ontime, poinDapat: totalPoin, publishedAt: t.createdAt ? new Date(t.createdAt).getTime() : 0 };
    const newBadges = checkAutoBadges(prevStats, subForBadge, isTopClass, isTopThree);

    // CRITICAL: tunggu Firebase write selesai dengan timeout 10 detik. Firebase RTDB tidak
    // fail-fast saat offline (queue silent + retry), jadi tanpa timeout tombol bisa stuck
    // selamanya. Dengan timeout, siswa dapat feedback jelas untuk retry.
    try {
      await withTimeout(Promise.all([
        store.addSub({ siswaId: user.id, tugasId: t.id, nilai, poinDapat: totalPoin, correctCount, total, ontime, soalResults, hasEssay }),
        store.updateStats(user.id, nilai, totalPoin, ontime),
      ]));
      // Update perfectCount setelah updateStats selesai (urutan penting biar gak overwrite)
      if (nilai === 100) {
        const cur = store.getStats(user.id);
        await withTimeout(update(ref(db, `stats/${user.id}`), { perfectCount: (cur.perfectCount || 0) + 1 }));
      }
      // Award badges (best-effort, gak fatal kalau gagal/timeout — siswa udah submit sukses)
      await Promise.all(newBadges.map(bid =>
        withTimeout(store.awardBadge(user.id, bid), 5000).catch(() => {})
      ));
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      setResult({ nilai, poinDapat: totalPoin, correctCount, ontime, newStreak: ontime ? prevStreak + 1 : 0, newBadges });
      setSubmitted(true);
    } catch (e) {
      // Rollback: izinkan siswa coba submit ulang
      submitLockRef.current = false;
      setIsSubmitting(false);
      alert("Gagal mengumpulkan tugas.\n\n" + (e?.message || "Coba lagi nanti."));
    }
  }

  // Result screen
  if (submitted && result) {
    const iconKey = result.nilai >= 90 ? "trophy" : result.nilai >= 70 ? "checkCircle" : "book";
    const iconColor = result.nilai >= 90 ? "#b45309" : result.nilai >= 70 ? "var(--good)" : "var(--accent)";
    const newPoin = (store.getStats(user.id).poin || 0);
    return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: result.nilai >= 90 ? "#fef3c7" : result.nilai >= 70 ? "var(--good-bg)" : "var(--accent-soft)", color: iconColor, display: "grid", placeItems: "center", marginBottom: 18 }}>
        <I n={iconKey} s={36} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Selesai!</div>
      <div style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 4 }}>{t.judul}</div>
      <div className="stat-num" style={{ fontSize: 52, fontWeight: 800, color: "var(--accent)", margin: "20px 0 4px", letterSpacing: "-.03em" }}>{result.nilai}</div>
      <div style={{ fontSize: 13, color: "var(--ink-3)" }}>nilai · {result.correctCount}/{total} benar</div>
      <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>+{result.poinDapat} poin didapat</div>
      <div style={{ width: "100%", maxWidth: 320, marginTop: 16 }}><LevelCard poin={newPoin} /></div>
      {result.ontime && result.newStreak > 0 && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, padding: "8px 16px", borderRadius: 99, background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fed7aa", fontSize: 14, fontWeight: 700 }}>
          <FlameAnimated size={28} streak={result.newStreak} /> Streak {result.newStreak}x!
        </div>
      )}
      {!result.ontime && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "6px 14px", borderRadius: 99, background: "var(--bad-bg)", color: "var(--bad)", border: "1px solid #fca5a5", fontSize: 12, fontWeight: 600 }}>
          Telat — streak direset
        </div>
      )}
      {result.newBadges?.length > 0 && (
        <div style={{ marginTop: 16, padding: "14px 16px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 14, width: "100%", maxWidth: 320 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Badge Baru Terbuka!</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {result.newBadges.map(id => <BadgeChip key={id} badgeId={id} />)}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button className="btn btn-outline" onClick={() => navigate("tugas")}>Kembali ke Tugas</button>
        <button className="btn btn-primary" onClick={() => navigate("leaderboard")}>Lihat Ranking</button>
      </div>
    </div>;
  }

  const pct = Math.round(((idx + 1) / total) * 100);
  const answered = Object.keys(answers).length;
  // Pakai soalList (display order) supaya konsisten dengan answers[i].
  // Kalau pakai t.soal[i] (original order), pas shuffled bisa mismatch: answers[i] adalah jawaban
  // untuk soal display ke-i, tapi type-check dilakuin terhadap soal original ke-i (soal beda).
  const belumDijawab = soalList.map((_, i) => i).filter(i => {
    const a = answers[i];
    const s = soalList[i];
    if (a === undefined || a === null) return true;
    if (Array.isArray(a) && a.length === 0) return true;
    // Type-aware validation untuk tipe baru
    if (s?.type === "pseudocode" || s?.type === "essay") {
      return !a || !a.toString().trim();
    }
    if (s?.type === "debug") {
      return !a.baris || !a.perbaikan || !a.perbaikan.toString().trim();
    }
    if (s?.type === "refleksi") {
      return !a.k1?.trim() || !a.k2?.trim() || !a.k3?.trim() || !a.k4?.trim();
    }
    return false;
  });
  const curOk = !belumDijawab.includes(idx);

  // Modal konfirmasi submit
  const ConfirmSubmit = () => (
    <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Kumpulkan Jawaban?</h3>
        {belumDijawab.length > 0 ? (
          <>
            <p style={{ marginBottom: 12 }}>Masih ada <strong>{belumDijawab.length} soal</strong> yang belum dijawab:</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {belumDijawab.map(i => (
                <button key={i} onClick={() => { setShowConfirm(false); goTo(i); }}
                  style={{ width: 32, height: 32, borderRadius: 8, background: "var(--warn-bg)", color: "var(--warn)", border: "1.5px solid var(--warn)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--mono)" }}>
                  {i + 1}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-3)" }}>Klik nomor soal untuk kembali mengisi, atau tetap kumpulkan.</p>
          </>
        ) : (
          <p>Semua {total} soal sudah dijawab. Yakin ingin mengumpulkan?</p>
        )}
        <div className="modal-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>Cek Lagi</button>
          <button className="btn btn-primary btn-sm" onClick={doSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Mengirim..." : <><I n="check" s={13} /> Kumpulkan Sekarang</>}
          </button>
        </div>
      </div>
    </div>
  );

  return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
    {showConfirm && <ConfirmSubmit />}
    {/* Header */}
    <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
      <button className="topbar-back" onClick={() => navigate("tugas-detail", { tugasId })}><I n="chevL" s={18} /></button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.judul}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Soal {safeIdx + 1} dari {total} · {answered} dijawab</div>
      </div>
      {/* Auto-save indicator */}
      {savedAt && (Date.now() - savedAt < 2500) ? (
        <div style={{ fontSize: 10, color: "var(--good)", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
          <I n="check" s={10} /> Tersimpan
        </div>
      ) : (
        <div style={{ fontSize: 10, color: "var(--ink-4)", display: "flex", alignItems: "center", gap: 3 }}>
          <I n="check" s={10} /> Auto-save
        </div>
      )}
      <div style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--accent)" }}>{pct}%</div>
    </div>

    {/* Progress bar */}
    <div style={{ height: 3, background: "var(--surface-alt)" }}>
      <div style={{ height: "100%", background: "var(--accent)", width: `${pct}%`, transition: "width .3s" }} />
    </div>

    {/* Soal navigator dots */}
    <div style={{ padding: "8px 16px", display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--line-soft)", background: "var(--surface)" }}>
      {t.soal.map((_, i) => {
        const isAnswered = !belumDijawab.includes(i);
        const isCurrent = i === idx;
        return (
          <button key={i} onClick={() => goTo(i)} style={{
            width: 24, height: 24, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--mono)", border: `1.5px solid ${isCurrent ? "var(--accent)" : isAnswered ? "var(--good)" : "var(--line)"}`,
            background: isCurrent ? "var(--accent)" : isAnswered ? "var(--good-bg)" : "var(--surface-alt)",
            color: isCurrent ? "#fff" : isAnswered ? "var(--good)" : "var(--ink-3)",
          }}>{i + 1}</button>
        );
      })}
    </div>

    {/* Soal content */}
    <div style={{ flex: 1, padding: "20px 16px 16px", maxWidth: 560, margin: "0 auto", width: "100%" }}>
      <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--mono)", marginBottom: 8 }}>SOAL {idx + 1} · {soal.poin || Math.floor(t.poinMax / total)} POIN</div>
      <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.55, marginBottom: 20 }}>{soal.pertanyaan}</div>
      {soal.gambar && <div style={{ marginBottom: 20, textAlign: "center" }}><img src={soal.gambar} alt="" style={{ maxWidth: "100%", maxHeight: 400, borderRadius: 8, border: "1px solid var(--line)" }} /></div>}
      {soal.type === "excel" && <ExcelSandboxPlayer soal={soal} answer={answer} selected={answers[safeIdx]} />}
      {soal.type === "essay" && <div>
        <textarea
          className="inp"
          rows={8}
          style={{ fontSize: 14, lineHeight: 1.5, fontFamily: "inherit" }}
          placeholder="Tulis jawaban kamu di sini..."
          value={answers[safeIdx] || ""}
          onChange={e => answer(e.target.value)}
        />
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, display: "flex", justifyContent: "space-between" }}>
          <span>{(answers[safeIdx] || "").length} karakter · {((answers[safeIdx] || "").trim().split(/\s+/).filter(Boolean) || []).length} kata</span>
          <span>📝 Dinilai manual oleh guru</span>
        </div>
      </div>}
      {soal.type === "pg" && soal.opsi?.map((o, i) => <button key={i} className={`quiz-opt ${answers[safeIdx] === i ? "selected" : ""}`} onClick={() => answer(i)}><div className="quiz-letter">{String.fromCharCode(65 + i)}</div><span style={{ flex: 1 }}>{o}</span></button>)}
      {soal.type === "tf" && <div style={{ display: "flex", gap: 10 }}>{["Benar", "Salah"].map((o, i) => <button key={i} className={`quiz-opt ${answers[safeIdx] === i ? "selected" : ""}`} style={{ flex: 1 }} onClick={() => answer(i)}><div className="quiz-letter">{i === 0 ? "B" : "S"}</div><span style={{ flex: 1 }}>{o}</span></button>)}</div>}
      {soal.type === "komplex" && <><div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Pilih semua jawaban yang benar</div>{soal.opsi?.map((o, i) => { const sel = (answers[safeIdx] || []).includes(i); return <button key={i} className={`quiz-opt ${sel ? "selected" : ""}`} onClick={() => toggleMulti(i)}><div style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${sel ? "var(--accent)" : "var(--line)"}`, background: sel ? "var(--accent)" : "var(--surface-alt)", display: "grid", placeItems: "center", flexShrink: 0 }}>{sel && <I n="check" s={13} style={{ color: "#fff" }} />}</div><span style={{ flex: 1 }}>{String.fromCharCode(65 + i)}. {o}</span></button>; })}</>}
      {soal.type === "pasang" && <><div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Pasangkan kolom kiri dengan kolom kanan</div>{soal.kiri?.map((k, ki) => <div key={ki} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ flex: 1, padding: "8px 12px", background: "var(--accent-soft)", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, color: "var(--accent-2)" }}>{k}</div><I n="chevR" s={14} /><select className="inp" style={{ flex: 1, fontSize: 13 }} value={(answers[safeIdx] || {})[ki] ?? ""} onChange={e => { const cur = answers[safeIdx] || {}; answer({ ...cur, [ki]: Number(e.target.value) }); }}><option value="">Pilih...</option>{soal.kanan?.map((r, ri) => <option key={ri} value={ri}>{r}</option>)}</select></div>)}</>}
      {soal.type === "pseudocode" && <div>
        <pre style={{ background: "#1e293b", color: "#e2e8f0", padding: "14px 16px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre", marginBottom: 14 }}>{soal.kode}</pre>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>Trace output di kepala/kertas, lalu tulis hasil di sini:</div>
        <textarea className="inp" rows={3} style={{ fontSize: 14, fontFamily: "var(--mono)" }} placeholder="Output..." value={answers[safeIdx] || ""} onChange={e => answer(e.target.value)} />
      </div>}
      {soal.type === "debug" && <div>
        <div style={{ background: "#1e293b", color: "#e2e8f0", padding: "14px 0", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.7, overflowX: "auto", marginBottom: 14 }}>
          {(soal.kodeBuggy || "").split("\n").map((line, i) => (
            <div key={i} style={{ display: "flex", padding: "0 14px" }}>
              <span style={{ color: "#64748b", minWidth: 28, textAlign: "right", marginRight: 14, userSelect: "none" }}>{i + 1}</span>
              <span style={{ whiteSpace: "pre" }}>{line || " "}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>Nomor baris bug</div>
            <input className="inp" type="number" min="1" placeholder="Baris ke..." value={(answers[safeIdx] || {}).baris ?? ""} onChange={e => { const cur = answers[safeIdx] || {}; answer({ ...cur, baris: e.target.value ? Number(e.target.value) : null }); }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>Perbaikan yang benar</div>
            <input className="inp" style={{ fontFamily: "var(--mono)", fontSize: 13 }} placeholder="Tulis baris yang sudah benar..." value={(answers[safeIdx] || {}).perbaikan || ""} onChange={e => { const cur = answers[safeIdx] || {}; answer({ ...cur, perbaikan: e.target.value }); }} />
          </div>
        </div>
      </div>}
      {soal.type === "refleksi" && <div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Isi keempat kolom refleksi berikut (semua wajib):</div>
        {["k1", "k2", "k3", "k4"].map((key, i) => {
          const label = soal[`labelKolom${i + 1}`] || ["Prediksi saya", "Yang saya observasi", "Yang salah/bug", "Pelajaran yang saya ambil"][i];
          return (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-2)", marginBottom: 4 }}>{i + 1}. {label}</div>
              <textarea className="inp" rows={3} style={{ fontSize: 13, lineHeight: 1.5 }} placeholder={`Tulis ${label.toLowerCase()}...`} value={(answers[safeIdx] || {})[key] || ""} onChange={e => { const cur = answers[safeIdx] || { k1: "", k2: "", k3: "", k4: "" }; answer({ ...cur, [key]: e.target.value }); }} />
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>📝 Dinilai manual oleh guru</div>
      </div>}
    </div>

    {/* Footer nav */}
    <div className="quiz-foot-sticky">
      {idx > 0 && <button className="btn btn-outline" onClick={() => goTo(idx - 1)}>← Sebelumnya</button>}
      <div style={{ flex: 1 }} />
      {idx < total - 1
        ? <button className="btn btn-primary" onClick={() => goTo(idx + 1)} disabled={!curOk}>Selanjutnya →</button>
        : <button className="btn btn-primary" onClick={() => setShowConfirm(true)}><I n="check" s={14} /> Kumpulkan ({answered}/{total})</button>
      }
    </div>
  </div>;
}

// ─── BROADCAST BOX ───
function BroadcastBox({ broadcasts, isGuru, onEdit, onDelete }) {
  if (!broadcasts.length) return null;
  const fmtSisa = (exp) => {
    const diff = exp - Date.now();
    if (diff <= 0) return "Berakhir";
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d > 0) return `${d} hari lagi`;
    return `${h} jam lagi`;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
      {broadcasts.map(b => (
        <div key={b.id} className="bc-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-2)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
                Pengumuman · {b.target === "semua" ? "Semua Kelas" : `Kelas ${b.target}`}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", lineHeight: 1.55 }}>{b.pesan}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>{fmtSisa(b.expiresAt)}</div>
            </div>
            {isGuru && (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: "4px 6px" }} onClick={() => onEdit(b)}><I n="edit" s={13} /></button>
                <button className="btn btn-ghost btn-sm" style={{ padding: "4px 6px", color: "var(--bad)" }} onClick={() => onDelete(b.id)}><I n="trash" s={13} /></button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── BUAT/EDIT BROADCAST MODAL ───
function BroadcastModal({ existing, onSave, onClose }) {
  const [pesan, setPesan] = useState(existing?.pesan || "");
  const [target, setTarget] = useState(existing?.target || "semua");
  const [durasi, setDurasi] = useState(existing?.durasiHari || 3);
  const [err, setErr] = useState("");

  function submit() {
    if (!pesan.trim()) { setErr("Pesan tidak boleh kosong."); return; }
    onSave({ pesan, target, durasi });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3>{existing ? "Edit Pengumuman" : "Buat Pengumuman"}</h3>
        <p style={{ marginBottom: 16 }}>Broadcast akan otomatis hilang setelah masa waktu habis.</p>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label className="lbl">Pesan</label>
          <textarea className="inp" rows={3} value={pesan} onChange={e => { setPesan(e.target.value); setErr(""); }} placeholder="Tulis pengumuman..." />
        </div>
        <div className="g2" style={{ marginBottom: 12 }}>
          <div className="fg">
            <label className="lbl">Target kelas</label>
            <select className="inp" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="semua">Semua Kelas</option>
              <option value="VII">Kelas VII</option>
              <option value="VIII">Kelas VIII</option>
            </select>
          </div>
          <div className="fg">
            <label className="lbl">Durasi</label>
            <select className="inp" value={durasi} onChange={e => setDurasi(Number(e.target.value))}>
              <option value={1}>1 hari</option>
              <option value={3}>3 hari</option>
              <option value={7}>7 hari</option>
              <option value={14}>14 hari</option>
              <option value={30}>30 hari</option>
            </select>
          </div>
        </div>
        {err && <div style={{ fontSize: 12, color: "var(--bad)", marginBottom: 10 }}>{err}</div>}
        <div className="modal-actions">
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={submit}><I n="send" s={13} /> {existing ? "Simpan" : "Kirim"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PROFIL SISWA ───
function ProfilSiswa({ user, store }) {
  const stats = store.getStats(user.id);
  const lb = store.getLeaderboard(user.jenjang);
  const myRank = lb.find(s => s.id === user.id);
  const subs = store.getSubs().filter(s => s.siswaId === user.id);
  const myBadges = store.getBadges(user.id);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const photo = store.getPhoto(user.uid || user.id);

  const PRESETS = [
    "#0d6b7a","#1e40af","#7c3aed","#b45309","#0f766e",
    "#c2410c","#be185d","#065f46","#1e3a5f","#4a1d96"
  ];

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Foto maksimal 5MB"); return; }
    const reader = new FileReader();
    reader.onload = async ev => {
      const b64 = ev.target.result;
      try {
        await withTimeout(store.savePhoto(user.uid || user.id, b64));
        setShowPhotoPicker(false);
      } catch (e) {
        alert("Gagal menyimpan foto: " + (e?.message || "coba lagi"));
      }
    };
    reader.readAsDataURL(file);
  }

  function setPresetAvatar(color) {
    const initials = user.nama.trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="100" fill="${color}"/><text x="100" y="130" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-weight="700" font-size="80" fill="white">${initials}</text></svg>`;
    const b64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    withTimeout(store.savePhoto(user.uid || user.id, b64)).catch(e => alert("Gagal menyimpan avatar: " + (e?.message || "coba lagi")));
    setShowPhotoPicker(false);
  }

  return <>
    {showPhotoPicker && (
      <div className="modal-overlay" onClick={() => setShowPhotoPicker(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3>Ganti Foto Profil</h3>
          <p>Pilih avatar atau upload foto dari device.</p>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginTop: 14, marginBottom: 6 }}>AVATAR WARNA</div>
          <div className="avatar-grid">
            {PRESETS.map(c => {
              const initials = user.nama.trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
              return (
                <button key={c} className="avatar-opt" onClick={() => setPresetAvatar(c)} style={{ background: c }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "var(--font)" }}>{initials}</span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginTop: 12, marginBottom: 8 }}>UPLOAD FOTO</div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1.5px dashed var(--line)", borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 13, color: "var(--ink-2)" }}>
            <I n="user" s={18} /> Pilih foto dari device (maks 2MB)
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
          </label>
          {photo && (
            <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 10, color: "var(--bad)" }} onClick={() => { withTimeout(store.savePhoto(user.uid || user.id, null)).catch(e => alert("Gagal menghapus foto: " + (e?.message || "coba lagi"))); setShowPhotoPicker(false); }}>
              Hapus foto profil
            </button>
          )}
        </div>
      </div>
    )}

    <div className="page">
      <div className="dt"><div><h1>Profil</h1><p>Track record semester ini</p></div></div>

      {/* Profile header card */}
      <Card pad="lg" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Avatar name={user.nama} size="xl" photo={photo} />
            <button onClick={() => setShowPhotoPicker(true)} style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", color: "#fff", border: "2px solid var(--surface)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <I n="edit" s={11} />
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>{user.nama}</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>Kelas {user.jenjang}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {myRank && <span className="chip chip-accent">#{myRank.rank} Kelas {user.jenjang}</span>}
              {(stats.streak || 0) > 0 && <span className="streak-pill"><I n="flame" s={11} /> {stats.streak}x streak</span>}
            </div>
          </div>
        </div>

        {/* Level progress */}
        <LevelCard poin={stats.poin} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, paddingTop: 14, marginTop: 14, borderTop: "1px solid var(--line-soft)" }}>
          {[{ v: stats.poin.toLocaleString("id-ID"), l: "total poin" }, { v: String(stats.tugasSelesai), l: "tugas selesai" }, { v: stats.nilaiRata || "—", l: "nilai rata" }].map(s => <div key={s.l} style={{ textAlign: "center" }}><div className="stat-num" style={{ fontSize: 22, fontWeight: 700 }}>{s.v}</div><div style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.l}</div></div>)}
        </div>
      </Card>

      {/* Badges */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Badge Koleksi</div>
        <BadgesRow badges={myBadges} emptyText="Belum ada badge. Terus kerjakan tugas!" />
      </Card>

      {stats.poinHistory?.length > 0 && <Card style={{ marginBottom: 12 }}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Perjalanan poin</div><PoinChart data={stats.poinHistory} /></Card>}

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
  { id: "excel", name: "Excel Sandbox", desc: "Tabel + rumus + PG (Informatika)", icon: "chartBar" },
  { id: "essay", name: "Essay", desc: "Jawaban panjang, dinilai manual", icon: "edit" },
];

function QuestionBuilder({ soal, setSoal }) {
  function addQ(type) {
    const base = { id: uid(), type, pertanyaan: "", poin: 10 };
    if (type === "pg" || type === "komplex") setSoal(s => [...s, { ...base, opsi: ["", "", "", ""], jawaban: type === "pg" ? 0 : [] }]);
    else if (type === "tf") setSoal(s => [...s, { ...base, jawaban: 0 }]);
    else if (type === "excel") setSoal(s => [...s, { ...base, headers: ["Nama", "Nilai"], table: [["Budi", "85"], ["Sari", "92"], ["Andi", "78"]], opsi: ["", "", "", ""], jawaban: 0 }]);
    else if (type === "essay") setSoal(s => [...s, { ...base, kataKunci: "", panduanNilai: "" }]);
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

          {/* Image upload */}
          <div style={{ marginBottom: 12 }}>
            {q.gambar ? (
              <div style={{ position: "relative", display: "inline-block", marginBottom: 6 }}>
                <img src={q.gambar} alt="" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, border: "1px solid var(--line)" }} />
                <button onClick={() => upQ(q.id, { gambar: null })} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>×</button>
              </div>
            ) : (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1.5px dashed var(--line)", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "var(--ink-2)" }}>
                <I n="plus" s={12} /> Tambah Gambar (opsional)
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                  const file = e.target.files[0]; if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { alert("Gambar maksimal 5MB"); return; }
                  const compressed = await compressImage(file, 800, 0.7);
                  upQ(q.id, { gambar: compressed });
                }} />
              </label>
            )}
          </div>

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
            <div style={{ display: "flex", gap: 8 }}>{["Benar", "Salah"].map((o, i) => <button key={i} className={`btn ${q.jawaban === i ? "btn-primary" : "btn-outline"} btn-sm`} onClick={() => upQ(q.id, { jawaban: i })}>{o}</button>)}</div>
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

          {/* Excel Sandbox */}
          {q.type === "excel" && <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>Buat tabel data dan tentukan jawaban PG. Siswa akan menulis rumus untuk mengeksplorasi tabel ini.</div>

            {/* Headers */}
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600 }}>Header Kolom:</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {(q.headers || []).map((h, hi) => (
                <div key={hi} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{String.fromCharCode(65 + hi)}</span>
                  <input className="inp" style={{ fontSize: 12, padding: "5px 8px", width: 100 }} value={h} placeholder={`Kolom ${hi + 1}`} onChange={e => { const h2 = [...q.headers]; h2[hi] = e.target.value; upQ(q.id, { headers: h2 }); }} />
                  {q.headers.length > 1 && <button className="btn btn-ghost btn-sm" style={{ padding: "2px 6px" }} onClick={() => {
                    upQ(q.id, { headers: q.headers.filter((_, i) => i !== hi), table: q.table.map(row => row.filter((_, i) => i !== hi)) });
                  }}><I n="x" s={11} /></button>}
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => upQ(q.id, { headers: [...q.headers, `Kolom ${q.headers.length + 1}`], table: q.table.map(row => [...row, ""]) })}><I n="plus" s={11} /> Kolom</button>
            </div>

            {/* Table data */}
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600 }}>Data Tabel:</div>
            <div style={{ overflowX: "auto", marginBottom: 10, border: "1px solid var(--line)", borderRadius: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--surface-alt)" }}>
                    <th style={{ padding: "4px 8px", fontSize: 10, color: "var(--ink-3)", borderRight: "1px solid var(--line)", width: 30 }}>#</th>
                    {(q.headers || []).map((h, hi) => <th key={hi} style={{ padding: "4px 8px", fontSize: 10, fontWeight: 700, borderRight: "1px solid var(--line)" }}>{String.fromCharCode(65 + hi)} · {h}</th>)}
                    <th style={{ width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(q.table || []).map((row, ri) => (
                    <tr key={ri}>
                      <td style={{ padding: "4px 8px", textAlign: "center", color: "var(--ink-3)", borderRight: "1px solid var(--line)", borderTop: "1px solid var(--line)", fontFamily: "var(--mono)" }}>{ri + 1}</td>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ borderRight: "1px solid var(--line)", borderTop: "1px solid var(--line)" }}>
                          <input style={{ width: "100%", border: "none", padding: "5px 8px", fontSize: 12, background: "transparent", outline: "none" }} value={cell} onChange={e => {
                            const t2 = q.table.map((r, i) => i === ri ? r.map((c, j) => j === ci ? e.target.value : c) : r);
                            upQ(q.id, { table: t2 });
                          }} />
                        </td>
                      ))}
                      <td style={{ borderTop: "1px solid var(--line)", textAlign: "center" }}>
                        {q.table.length > 1 && <button onClick={() => upQ(q.id, { table: q.table.filter((_, i) => i !== ri) })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 12 }}>×</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, marginBottom: 12 }} onClick={() => upQ(q.id, { table: [...q.table, new Array(q.headers.length).fill("")] })}><I n="plus" s={11} /> Tambah Baris</button>

            <div style={{ fontSize: 11, color: "var(--ink-3)", padding: "8px 12px", background: "var(--surface-alt)", borderRadius: 6, marginBottom: 12 }}>
              💡 Rumus yang didukung: <b>=SUM(A1:A5)</b>, <b>=AVERAGE(B2:B6)</b>, <b>=COUNT(C1:C10)</b>, <b>=MAX</b>, <b>=MIN</b>, <b>=IF</b>, <b>=ROUND</b>, <b>=A1+B1</b>
            </div>

            {/* Opsi PG */}
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600 }}>Opsi Jawaban PG:</div>
            {(q.opsi || []).map((o, i) => <div key={i} className="qb-opt-row">
              <div className={`qb-radio ${q.jawaban === i ? "on" : ""}`} onClick={() => upQ(q.id, { jawaban: i })}>{q.jawaban === i && <I n="check" s={11} style={{ color: "#fff" }} />}</div>
              <div className="qb-letter">{String.fromCharCode(65 + i)}</div>
              <input className="inp" style={{ flex: 1, padding: "7px 11px", fontSize: 13 }} placeholder={`Pilihan ${String.fromCharCode(65 + i)}`} value={o} onChange={e => upOpsi(q.id, i, e.target.value)} />
            </div>)}
          </div>}

          {/* Essay */}
          {q.type === "essay" && <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>Essay dinilai manual oleh guru. Tambahkan kata kunci & panduan agar penilaian lebih objektif.</div>
            <div className="fg" style={{ marginBottom: 10 }}>
              <label className="lbl" style={{ fontSize: 11 }}>Kata Kunci Jawaban (opsional)</label>
              <input className="inp" value={q.kataKunci || ""} onChange={e => upQ(q.id, { kataKunci: e.target.value })} placeholder="mis: fotosintesis, klorofil, cahaya matahari" />
              <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>Pisahkan dengan koma. Ini akan ditampilkan saat guru menilai.</div>
            </div>
            <div className="fg">
              <label className="lbl" style={{ fontSize: 11 }}>Panduan Penilaian (opsional)</label>
              <textarea className="inp" rows={2} value={q.panduanNilai || ""} onChange={e => upQ(q.id, { panduanNilai: e.target.value })} placeholder="mis: nilai 100 jika jelaskan 3 tahap fotosintesis lengkap, 70 jika 2 tahap, 40 jika hanya menyebut" />
            </div>
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
// ─── MATERI SELECT (dropdown + tambah baru) ───
function MateriSelect({ store, value, mapel, jenjang, onChange }) {
  const [adding, setAdding] = useState(false);
  const [newMateri, setNewMateri] = useState("");

  // Kumpulkan materi unik dari semua tugas (filter by mapel & jenjang biar relevan)
  const allMateri = [...new Set(
    store.getTugas()
      .filter(t => t.materi && t.materi.trim())
      .filter(t => !mapel || t.mapel === mapel)
      .map(t => t.materi.trim())
  )].sort();

  function confirmAdd() {
    const m = newMateri.trim();
    if (!m) return;
    onChange(m);
    setNewMateri("");
    setAdding(false);
  }

  if (adding) {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <input className="inp" value={newMateri} onChange={e => setNewMateri(e.target.value)} placeholder="Nama materi baru..." autoFocus
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), confirmAdd())} />
        <button type="button" className="btn btn-primary btn-sm" onClick={confirmAdd}>Simpan</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { setAdding(false); setNewMateri(""); }}>Batal</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select className="inp" value={value || ""} onChange={e => onChange(e.target.value)} style={{ flex: 1 }}>
        <option value="">— Tanpa Materi —</option>
        {allMateri.map(m => <option key={m} value={m}>{m}</option>)}
        {value && !allMateri.includes(value) && <option value={value}>{value}</option>}
      </select>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(true)} title="Tambah materi baru"><I n="plus" s={14} /></button>
    </div>
  );
}

function BuatTugas({ store, navigate, editId = null }) {
  const existing = editId ? store.getTugas().find(t => t.id === editId) : null;
  const [form, setForm] = useState({
    judul: existing?.judul || "", mapel: existing?.mapel || "IPA",
    jenjang: existing?.jenjang || "VII", deadline: existing?.deadline || "",
    poinMax: existing?.poinMax || 100, deskripsi: existing?.deskripsi || "",
    materi: existing?.materi || "",
  });
  const [soal, setSoal] = useState(existing?.soal || []);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [showBank, setShowBank] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totalPoin = soal.reduce((s, q) => s + (q.poin || 0), 0);

  function handleBankSelect(picked) {
    // Convert bank soal format ke tugas soal format
    const converted = picked.map(p => {
      const base = { id: uid(), pertanyaan: p.pertanyaan, gambar: p.gambar || null, type: p.type === "kompleks" ? "komplex" : p.type === "pasangkan" ? "pasang" : p.type, poin: 10, pembahasan: p.pembahasan || "" };
      if (p.type === "pg") return { ...base, opsi: p.opsi, jawaban: p.jawaban };
      if (p.type === "tf") return { ...base, jawaban: p.jawaban };
      if (p.type === "kompleks") {
        const jawaban = (p.benarOpsi || []).map((b, i) => b ? i : null).filter(x => x !== null);
        return { ...base, opsi: p.opsi, jawaban };
      }
      if (p.type === "pasangkan") {
        const kiri = (p.pasangan || []).map(x => x[0]);
        const kanan = (p.pasangan || []).map(x => x[1]);
        return { ...base, kiri, kanan, jawaban: kiri.map((_, i) => i) };
      }
      if (p.type === "excel") return { ...base, headers: p.headers, table: p.table, opsi: p.opsi, jawaban: p.jawaban };
      if (p.type === "essay") return { ...base, kataKunci: p.kataKunci || "", panduanNilai: p.panduanNilai || "" };
      return base;
    });
    setSoal([...soal, ...converted]);
    setShowBank(false);
  }

  function submit() {
    if (!form.judul.trim()) { setErr("Judul tugas wajib diisi."); return; }
    if (!form.deadline) { setErr("Deadline wajib diisi."); return; }
    if (soal.length === 0) { setErr("Tambahkan minimal 1 soal."); return; }
    // Validasi tiap soal
    for (let i = 0; i < soal.length; i++) {
      const q = soal[i], num = i + 1;
      if (!q.pertanyaan?.trim()) { setErr(`Soal ${num}: pertanyaan belum diisi.`); return; }
      if (q.type === "pg" || q.type === "komplex") {
        const opsiKosong = (q.opsi || []).some(o => !o?.trim());
        if (opsiKosong) { setErr(`Soal ${num}: ada opsi yang masih kosong.`); return; }
        if (q.type === "pg" && (q.jawaban === undefined || q.jawaban === null)) { setErr(`Soal ${num}: jawaban benar belum dipilih.`); return; }
        if (q.type === "komplex" && (!q.jawaban?.length)) { setErr(`Soal ${num}: pilih minimal 1 jawaban benar.`); return; }
      }
      if (q.type === "pasang") {
        const kiriKosong = (q.kiri || []).some(k => !k?.trim());
        const kananKosong = (q.kanan || []).some(k => !k?.trim());
        if (kiriKosong || kananKosong) { setErr(`Soal ${num}: ada item pasangan yang masih kosong.`); return; }
      }
      if (q.type === "excel") {
        if (!(q.headers || []).length) { setErr(`Soal ${num}: tabel butuh minimal 1 kolom.`); return; }
        if (!(q.table || []).length) { setErr(`Soal ${num}: tabel butuh minimal 1 baris.`); return; }
        const opsiKosong = (q.opsi || []).some(o => !o?.trim());
        if (opsiKosong) { setErr(`Soal ${num}: ada opsi PG yang masih kosong.`); return; }
        if (q.jawaban === undefined || q.jawaban === null) { setErr(`Soal ${num}: pilih jawaban PG yang benar.`); return; }
      }
    }
    const data = { ...form, soal, poinMax: totalPoin || Number(form.poinMax) };
    if (editId) store.updateTugas(editId, data); else store.addTugas(data);
    setSaved(true); setTimeout(() => navigate("home-guru"), 1200);
  }

  if (saved) return <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
    <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--good-bg)", color: "var(--good)", display: "grid", placeItems: "center" }}>
      <I n="checkCircle" s={36} />
    </div>
    <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>Tugas berhasil {editId ? "diperbarui" : "diterbitkan"}</div>
    <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Siswa sudah bisa mulai mengerjakan</div>
  </div>;

  return <>
    {/* Header desktop */}
    <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: "var(--hdr-h)", zIndex: 40 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>{editId ? "Edit tugas" : "Tugas baru"}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Tugas bervariasi dengan Auto Grading</div>
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
              <div className="fg">
                <label className="lbl">Materi / Bab</label>
                <MateriSelect store={store} value={form.materi} mapel={form.mapel} jenjang={form.jenjang} onChange={v => set("materi", v)} />
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>Tugas dengan materi sama akan dirata-rata di laporan</div>
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
              {/* Schedule publish */}
              <div className="fg">
                <label className="lbl">Jadwal Publish (opsional)</label>
                <input className="inp" type="datetime-local" value={form.scheduledAt || ""} onChange={e => set("scheduledAt", e.target.value || null)} />
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                  {form.scheduledAt ? `Tugas akan otomatis publish pada ${new Date(form.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Kosongkan untuk publish sekarang"}
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

          {/* Import & Template buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 600, background: "var(--accent-soft)", color: "var(--accent-2)", border: "1.5px solid var(--accent-soft)", cursor: "pointer", transition: "all .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--accent-soft)"}>
              <I n="layers" s={14} /> Import dari Excel
              <input type="file" accept=".xlsx" style={{ display: "none" }} onChange={async e => {
                const file = e.target.files[0]; if (!file) return;
                try {
                  const imported = await importSoalFromExcel(file);
                  if (imported.length === 0) { alert("Tidak ada soal yang berhasil diimpor. Pastikan format file sesuai template."); return; }
                  setSoal(s => [...s, ...imported]);
                  alert(`✅ Berhasil mengimpor ${imported.length} soal!`);
                } catch { alert("Gagal membaca file. Pastikan file .xlsx sesuai format template."); }
                e.target.value = "";
              }} />
            </label>
            <button className="btn btn-ghost btn-sm" onClick={downloadTemplateSoal} title="Download template soal Excel">
              <I n="chartBar" s={14} /> Download Template
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowBank(true)} title="Pilih dari Bank Soal">
              <I n="book" s={14} /> Bank Soal
            </button>
          </div>

          {showBank && <PilihDariBankSoalModal store={store} defaultMapel={form.mapel} defaultJenjang={form.jenjang} onClose={() => setShowBank(false)} onSelect={handleBankSelect} />}

          <QuestionBuilder soal={soal} setSoal={setSoal} />

          {err && <div style={{ color: "var(--bad)", fontSize: 12, margin: "12px 0", padding: "10px 14px", background: "var(--bad-bg)", borderRadius: "var(--r-sm)", border: "1px solid #fca5a5", display: "flex", alignItems: "center", gap: 8 }}><I n="alert" s={14} />{err}</div>}
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
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{store.getAllSiswa(form.jenjang).length} siswa</div>
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

// ─── EXCEL HELPERS (SheetJS via CDN) ───
function loadXLSX() {
  return new Promise((resolve) => {
    if (window.XLSX) { resolve(window.XLSX); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve(window.XLSX);
    document.head.appendChild(s);
  });
}


// ─── EXCEL TEMPLATES (base64 embedded) ───
const EXCEL_EXPORT_IPA_B64 = "UEsDBBQAAAAIAFUmsVxGx01IlQAAAM0AAAAQAAAAZG9jUHJvcHMvYXBwLnhtbE3PTQvCMAwG4L9SdreZih6kDkQ9ip68zy51hbYpbYT67+0EP255ecgboi6JIia2mEXxLuRtMzLHDUDWI/o+y8qhiqHke64x3YGMsRoPpB8eA8OibdeAhTEMOMzit7Dp1C5GZ3XPlkJ3sjpRJsPiWDQ6sScfq9wcChDneiU+ixNLOZcrBf+LU8sVU57mym/8ZAW/B7oXUEsDBBQAAAAIAFUmsVzmsp3A7wAAACsCAAARAAAAZG9jUHJvcHMvY29yZS54bWzNklFLwzAQx7+K5L29tN0mhK4vik8KggPFt5DctmCThuSk3bc3jVuH6AfwMXf//O53cK3yQg0Bn8PgMZDBeDPZ3kWh/JYdibwAiOqIVsYyJVxq7odgJaVnOICX6kMeEGrON2CRpJYkYQYWfiGyrtVKqICShnDGa7Xg/WfoM0wrwB4tOopQlRWwbp7oT1PfwhUwwwiDjd8F1AsxV//E5g6wc3KKZkmN41iOTc6lHSp4e3p8yesWxkWSTmH6FY2gk8ctu0x+be7udw+sq3m9Kfi6qG53fCXWXKya99n1h99V2A7a7M0/Nr4Idi38uovuC1BLAwQUAAAACABVJrFcmVycIxAGAACcJwAAEwAAAHhsL3RoZW1lL3RoZW1lMS54bWztWltz2jgUfu+v0Hhn9m0LxjaBtrQTc2l227SZhO1OH4URWI1seWSRhH+/RzYQy5YN7ZJNups8BCzp+85FR+foOHnz7i5i6IaIlPJ4YNkv29a7ty/e4FcyJBFBMBmnr/DACqVMXrVaaQDDOH3JExLD3IKLCEt4FMvWXOBbGi8j1uq0291WhGlsoRhHZGB9XixoQNBUUVpvXyC05R8z+BXLVI1lowETV0EmuYi08vlsxfza3j5lz+k6HTKBbjAbWCB/zm+n5E5aiOFUwsTAamc/VmvH0dJIgILJfZQFukn2o9MVCDINOzqdWM52fPbE7Z+Mytp0NG0a4OPxeDi2y9KLcBwE4FG7nsKd9Gy/pEEJtKNp0GTY9tqukaaqjVNP0/d93+ubaJwKjVtP02t33dOOicat0HgNvvFPh8Ouicar0HTraSYn/a5rpOkWaEJG4+t6EhW15UDTIABYcHbWzNIDll4p+nWUGtkdu91BXPBY7jmJEf7GxQTWadIZljRGcp2QBQ4AN8TRTFB8r0G2iuDCktJckNbPKbVQGgiayIH1R4Ihxdyv/fWXu8mkM3qdfTrOa5R/aasBp+27m8+T/HPo5J+nk9dNQs5wvCwJ8fsjW2GHJ247E3I6HGdCfM/29pGlJTLP7/kK6048Zx9WlrBdz8/knoxyI7vd9lh99k9HbiPXqcCzIteURiRFn8gtuuQROLVJDTITPwidhphqUBwCpAkxlqGG+LTGrBHgE323vgjI342I96tvmj1XoVhJ2oT4EEYa4pxz5nPRbPsHpUbR9lW83KOXWBUBlxjfNKo1LMXWeJXA8a2cPB0TEs2UCwZBhpckJhKpOX5NSBP+K6Xa/pzTQPCULyT6SpGPabMjp3QmzegzGsFGrxt1h2jSPHr+BfmcNQockRsdAmcbs0YhhGm78B6vJI6arcIRK0I+Yhk2GnK1FoG2camEYFoSxtF4TtK0EfxZrDWTPmDI7M2Rdc7WkQ4Rkl43Qj5izouQEb8ehjhKmu2icVgE/Z5ew0nB6ILLZv24fobVM2wsjvdH1BdK5A8mpz/pMjQHo5pZCb2EVmqfqoc0PqgeMgoF8bkePuV6eAo3lsa8UK6CewH/0do3wqv4gsA5fy59z6XvufQ9odK3NyN9Z8HTi1veRm5bxPuuMdrXNC4oY1dyzcjHVK+TKdg5n8Ds/Wg+nvHt+tkkhK+aWS0jFpBLgbNBJLj8i8rwKsQJ6GRbJQnLVNNlN4oSnkIbbulT9UqV1+WvuSi4PFvk6a+hdD4sz/k8X+e0zQszQ7dyS+q2lL61JjhK9LHMcE4eyww7ZzySHbZ3oB01+/ZdduQjpTBTl0O4GkK+A226ndw6OJ6YkbkK01KQb8P56cV4GuI52QS5fZhXbefY0dH758FRsKPvPJYdx4jyoiHuoYaYz8NDh3l7X5hnlcZQNBRtbKwkLEa3YLjX8SwU4GRgLaAHg69RAvJSVWAxW8YDK5CifEyMRehw55dcX+PRkuPbpmW1bq8pdxltIlI5wmmYE2eryt5lscFVHc9VW/Kwvmo9tBVOz/5ZrcifDBFOFgsSSGOUF6ZKovMZU77nK0nEVTi/RTO2EpcYvOPmx3FOU7gSdrYPAjK5uzmpemUxZ6by3y0MCSxbiFkS4k1d7dXnm5yueiJ2+pd3wWDy/XDJRw/lO+df9F1Drn723eP6bpM7SEycecURAXRFAiOVHAYWFzLkUO6SkAYTAc2UyUTwAoJkphyAmPoLvfIMuSkVzq0+OX9FLIOGTl7SJRIUirAMBSEXcuPv75Nqd4zX+iyBbYRUMmTVF8pDicE9M3JD2FQl867aJguF2+JUzbsaviZgS8N6bp0tJ//bXtQ9tBc9RvOjmeAes4dzm3q4wkWs/1jWHvky3zlw2zreA17mEyxDpH7BfYqKgBGrYr66r0/5JZw7tHvxgSCb/NbbpPbd4Ax81KtapWQrET9LB3wfkgZjjFv0NF+PFGKtprGtxtoxDHmAWPMMoWY434dFmhoz1YusOY0Kb0HVQOU/29QNaPYNNByRBV4xmbY2o+ROCjzc/u8NsMLEjuHti78BUEsDBBQAAAAIAFUmsVxkTjlQSAYAABEXAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1snVj7b+I4EP5XrJy02pVuSx7kBQWJN5Q+EHS7Pxsw4CMkXGJK93R//E0SB4LrBPYqFYL9fTNjzxcnM/fHINxGG0IY+th5ftRQNozta5VKtNiQHY7ugj3xYWYVhDvM4Ge4rkT7kOBlQtp5FV1VrcoOU19p3idjk7B5z/C8E3hBiML1vKGoqtq12nZLqTTvgwPzqE8mIYoOux0Of7WJFxwbiqZkA1O63rB4ANB7vCYzwn7sAb+i7DWYwACfq5y8LemO+BENfBSSVUNpabWxZsaQBPFGyTHKXaN4yfMg2MY/RksIT4kd+QR9zPYeBdeGgn7xS0tBLNg/khXrEM9rKF1bQXjB6DuZAKOhzAPGgl0SMiyAYQZjqzD4h/iJf+IRAENg+wQNplKoZC61FHsqnuV+0gDSgFrxxv3N133elnht+etsA/pJHmE35zgikKKfdMk2DcVR0JKs8MFj0+A4JDwDyR4uAi9KPtExxZoKWhwiiIZzIYAd9dNv/MGTk8MbegFB5wRdIGhqAcHgBEMg6EWEKidUbyWYnGDeSrA4wbqVYHOCfSvB4QRH3KVqAcHlBPdWQrzfaeZUkeIUUU7JTjWXiiRRWBcz3LwPgyMKE3ysJMPK7Jy0BffcIkYk+k2AMEr9+GyYsRBmKRhkzS9/aLpjqFododbsdfry2GojGHOMOnr5MUWdx9ZsNn15eUIw6uiaDrgp2eI9eqYepmhMPByht9FolLFGk9Z9hUHIsf3KAv4h1FO8ehrved2f49WTePWCeGdPE/RM1iSkSDNRG/tLjFoLskGZf/SKNwcftf7CIfaRruomnKC6dZ7v0gVheIveKTAjFgYenpdEbKQRSwO+AFZToK4XL62aLM2QLy1+PtSiPV7AaQQPgIiE70RpIvTYG/Seu60aSpagu4YJyYJkOKpZd0w0w/4aM9gJugXEvwnKdR23jmw1SZlWd6qX05BxXbPqyDQ5wHJR57A97M8GHMepf/nDMlUDDH3xWN000YSE3gG16W5OwaVfsmfmrXtmcfmqxXtmJXtWLZDDc3AZRsJpX+HgHUYzGh2xhNsp5yZ6l9C65bTXwxpuE01C7N1C1CXE/i1EQ0Ic3EKsSojDW4imhDgqJ07hQPsewoeE+nDFZ8CwhyYB9SXccTl3EpIl3WJWomOb39LVYnnaiQ8z8RG/ob03IcvveTGmCOuqGKXy6KRsu4AdH7wyNX6OytUvw+p9hjjOJaQvsWJeQgYSKwJkKLGiXkJGKcQpgTykEDcHqZqCp3GKiZ+2hY+69PTMnZkl2XeuZ99JPWq5sIR9bnNI0fMsl3/ZXd7h9IJnRqEAOK2aC8wW0tuTYBwh+r7MjqgB56qShjJXogg45sKOeme6+T9BFM5nUaiGIAputuj+yx6WV7TgXteCmzqyc9EIsbQ5xLmuBdnB3eF09ze1kNJ0NReYJeSw50ryLCSoL7MjJHogsyNoaiizI4qBY/I3lmUL2Xc/Zd8wxCOB2ym6+87vQsn7T4kA4lPlmgJiTOzNyAtSkECGuf5yIn0GdzK++ZsiyHjWxQkqqEAGMkUZZKB8/sSjeCB1J54KUneCWkYZyC6J6YGD8lrQRdA4s1R0+4mvvbe/72q8rNFLyhpNL38Jar22vscfaNyDmkuaQl4ZuUBaNacvP567X1tvvWlr0PvatWuQ4m9/at/uK6t4+WJmS7g9u9Yr4fbLuH271i/hDsq4A7s2KOEOy7hDuzYs4Y4411Al3JFdG5VwH85+i3SSFMKyN87/Rb2UUlZGlpREGq8ji2t6x4Ti8CRkFLcM0JIi+IoQXmIPb9Bk2nsb9X7epZMRiQ7+en3Y+L8wwluonBmU2BFFAUSAGY1QhOGNaUnJxz4I4QJDAZ5Vz3dl6+G1oFbWoTDT9RSd0pmfU2PiEKIO1GFRGAS7c2EP3xasNqn2n+7QEEfYP3iojxks8Fz+x8udkzCiK1hQiDc4oli2gEqu27Ij4TrpB0ZoERz8pG+ZG+Vt0WptnDTCxHHNzPqln2b0WkfTZTN6bSwd18CJJvcCE0mv6Bxs2t99wuGa+hHyyAoCV+9s2O4wzUH6gwX7pEGU9kDTphLBSxLGAJhfBQHLfpx7xoc9CkJKfIbjNmpD8bC/jBZ4T5S0k3zqaMUxnbrgzf8AUEsDBBQAAAAIAFUmsVxtdzNPsgQAAJUvAAANAAAAeGwvc3R5bGVzLnhtbN1aba+iOBT+K4QfsLxpL2zURL2QbLK7mWTuh/2KUrUJbwP1rs6v3xbQVuVMqjCujDc30p4+z3nO6aE0xUlJjzH+usOYaockTsupvqM0/90wyvUOJ2H5W5bjlFk2WZGElDWLrVHmBQ6jkoOS2LBNExlJSFJ9Nkn3SZDQUltn+5ROdVM3ZpNNlooeG+l1DxsbJlj7DOOpvgxjsipINThMSHysu23esc7irNAo04KnusV7yu+12apbXGbDk5A0K3inUXu49jMvSBhz+6phEA6K7YrJNYPqc+HFUSEkECFavNmuKRN6nQRac2tp+f3x3QbckW+xCOzRRQLNngNWI/y5WbuN0upEaL6zQpn3mLZbhR3rDs2d0QMCeyG5R1W3ebgl7Jg2f2TOg65pe5DkHlUd03ZD2C1t70sbsSdFt7Q9SnKPqm5puyXsezHvuorcEipFfMfj0JX4qq+S8ZI4Pu8YPL3umE3ykFJcpAFrVJiq88akNdcfx5ztGLZFeLTssa4MKLOYRNzldimEB4FYoA0J2pHUnwejwOmZNLAZKeqbNAhc3+o7fDcY+17fpA5LwHvv4fsL3wdJqy9Wt6usiHBxrtw3/dQ1m8R4Qxm8INsd/6ZZzu+7jNIsYRcRCbdZGlZlfULISK3apU91uqt22eurqWnuUYMPbXwoIqqxlRxFABt50q2IqAc/EJhv+8if3xOYhFALTAIoBiYhHg5M7M2UZ0wgFGdMAFRnTCAeDkzsnlQDkxBqgUkAxcAkxOOBnfc3yoEJhGJgAqAamEA8HJjYgagGJiHUApMAioFJiJvAmgu22K5xHH/lJP9sziuuxagOG60+hfgj4gcQGt9TnC7ZMt1c1jR1gzuS2WpuidZxHuLVcvKZ0cWehZBW7W/7jOIvBd6QQ9U+bM4CIHZLsNtX7GGex8d5TLZpguvglR3OJuEJp+2ygnxn3vhmbM06cKFrn7igZC33/FuE+Qc+0GZTZxw2sGZbaHaGotkRmkc/XzO/17oqHgGVYb1wlsdC81jWbL+wZvRUzX1UxtsAs+wCmp0X1uwB69wr59kyB5hoS3oKoqFkGj1Vc8/rxmCybNlDFO0AokevLHo0RNHSjuNtKOWBnqq555VjMFm2npvmnkRDmR6/smh3iKKl3Z07lPJAT9Xc88oxmCzb5hBFW4Bo9Mqi7SGKlnZ3gzmZsYd4nCRVx0AO7WxpP3p9Wvy/p9lojr2ls/WLk/Vzr8Zf+U/1v/lPAmOhQlvtSUxJ2rR2JIpwpfvigJ3R03AV40t+Nj7Cm3Af04+zcaqL679wRPaJdx71hWemGSWu/+RvJCx0/tkB80XSCB9wtGyaxXYlvdk1mw8HXFvEK8xbC4Spbe0WboP8QAogTI2C/PxK8bhgPLUN0ua2WlwQ44KYGtVmWVZ/kJ92jMc+7ZF6nuMgBGV0uWxVsITyhhD/b2eDtHEE5Id7ui/X8GzDFfLjOoDm9EcVAkUKVyIUKZxrbmnPG0d4XvtsQ344ApoFqHa4/3Y/vKbaMY7DZxXSBt3BsMXzIAuvxfYaRQjIDuJ/7fMD3SWO43ntFm5rV+A4kIXfjbAFUsA1QBan/qHX1fPIOD2nDPFD/Nl/UEsDBBQAAAAIAFUmsVyXirscwAAAABMCAAALAAAAX3JlbHMvLnJlbHOdkrluwzAMQH/F0J4wB9AhiDNl8RYE+QFWog/YEgWKRZ2/r9qlcZALGXk9PBLcHmlA7TiktoupGP0QUmla1bgBSLYlj2nOkUKu1CweNYfSQETbY0OwWiw+QC4ZZre9ZBanc6RXiFzXnaU92y9PQW+ArzpMcUJpSEszDvDN0n8y9/MMNUXlSiOVWxp40+X+duBJ0aEiWBaaRcnToh2lfx3H9pDT6a9jIrR6W+j5cWhUCo7cYyWMcWK0/jWCyQ/sfgBQSwMEFAAAAAgAVSaxXD3U9CM3AQAAJgIAAA8AAAB4bC93b3JrYm9vay54bWyNUdFKw0AQ/JVwH2DSogVLI4hFLUgtVvp+TTbN0rvbsLdptV/vJiFY8MWnu5ld5mbmFmfi457omHx5F2JuapFmnqaxqMHbeEMNBJ1UxN6KQj6ksWGwZawBxLt0mmWz1FsM5mExam04vQYkUAhSULIjdgjn+DvvYHLCiHt0KN+56e8OTOIxoMcLlLnJTBJrOr8S44WCWLctmJzLzWQY7IAFiz/0tjP5afexZ8TuP6wayc0sU8EKOUq/0etb9XgCXR5QK/SMToCXVuCFqW0wHDoZTZFexeh7GM+hxDn/p0aqKixgSUXrIcjQI4PrDIZYYxNNEqyH3KzRWUxWm8cukz6yKod8osau2uI56oBX5WBx9FVChQHKtUpF5bWjYsNJd/Q609u7yb120Tr3pNx7eCNbjjHHL3r4AVBLAwQUAAAACABVJrFcJB6boq0AAAD4AQAAGgAAAHhsL19yZWxzL3dvcmtib29rLnhtbC5yZWxztZE9DoMwDIWvEuUANVCpQwVMXVgrLhAF8yMSEsWuCrcvhQGQOnRhsp4tf+/JTp9oFHduoLbzJEZrBspky+zvAKRbtIouzuMwT2oXrOJZhga80r1qEJIoukHYM2Se7pminDz+Q3R13Wl8OP2yOPAPMLxd6KlFZClKFRrkTMJotjbBUuLLTJaiqDIZiiqWcFog4skgbWlWfbBPTrTneRc390WuzeMJrt8McHh0/gFQSwMEFAAAAAgAVSaxXGWQeZIZAQAAzwMAABMAAABbQ29udGVudF9UeXBlc10ueG1srZNNTsMwEIWvEmVbJS4sWKCmG2ALXXABY08aq/6TZ1rS2zNO2kqgEhWFTax43rzPnpes3o8RsOid9diUHVF8FAJVB05iHSJ4rrQhOUn8mrYiSrWTWxD3y+WDUMETeKooe5Tr1TO0cm+peOl5G03wTZnAYlk8jcLMakoZozVKEtfFwesflOpEqLlz0GBnIi5YUIqrhFz5HXDqeztASkZDsZGJXqVjleitQDpawHra4soZQ9saBTqoveOWGmMCqbEDIGfr0XQxTSaeMIzPu9n8wWYKyMpNChE5sQR/x50jyd1VZCNIZKaveCGy9ez7QU5bg76RzeP9DGk35IFiWObP+HvGF/8bzvERwu6/P7G81k4af+aL4T9efwFQSwECFAMUAAAACABVJrFcRsdNSJUAAADNAAAAEAAAAAAAAAAAAAAAgAEAAAAAZG9jUHJvcHMvYXBwLnhtbFBLAQIUAxQAAAAIAFUmsVzmsp3A7wAAACsCAAARAAAAAAAAAAAAAACAAcMAAABkb2NQcm9wcy9jb3JlLnhtbFBLAQIUAxQAAAAIAFUmsVyZXJwjEAYAAJwnAAATAAAAAAAAAAAAAACAAeEBAAB4bC90aGVtZS90aGVtZTEueG1sUEsBAhQDFAAAAAgAVSaxXGROOVBIBgAAERcAABgAAAAAAAAAAAAAAICBIggAAHhsL3dvcmtzaGVldHMvc2hlZXQxLnhtbFBLAQIUAxQAAAAIAFUmsVxtdzNPsgQAAJUvAAANAAAAAAAAAAAAAACAAaAOAAB4bC9zdHlsZXMueG1sUEsBAhQDFAAAAAgAVSaxXJeKuxzAAAAAEwIAAAsAAAAAAAAAAAAAAIABfRMAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgAVSaxXD3U9CM3AQAAJgIAAA8AAAAAAAAAAAAAAIABZhQAAHhsL3dvcmtib29rLnhtbFBLAQIUAxQAAAAIAFUmsVwkHpuirQAAAPgBAAAaAAAAAAAAAAAAAACAAcoVAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc1BLAQIUAxQAAAAIAFUmsVxlkHmSGQEAAM8DAAATAAAAAAAAAAAAAACAAa8WAABbQ29udGVudF9UeXBlc10ueG1sUEsFBgAAAAAJAAkAPgIAAPkXAAAAAA==";
const EXCEL_EXPORT_INFO_B64 = "UEsDBBQAAAAIAFYmsVxGx01IlQAAAM0AAAAQAAAAZG9jUHJvcHMvYXBwLnhtbE3PTQvCMAwG4L9SdreZih6kDkQ9ip68zy51hbYpbYT67+0EP255ecgboi6JIia2mEXxLuRtMzLHDUDWI/o+y8qhiqHke64x3YGMsRoPpB8eA8OibdeAhTEMOMzit7Dp1C5GZ3XPlkJ3sjpRJsPiWDQ6sScfq9wcChDneiU+ixNLOZcrBf+LU8sVU57mym/8ZAW/B7oXUEsDBBQAAAAIAFYmsVxCS2g18gAAACsCAAARAAAAZG9jUHJvcHMvY29yZS54bWzNks9OwzAMh18F5d46/bMhRV0vIE4gITEJxC1KvC1a00aJUbu3Jw1bB4IH4Bj7l8+fJTfKCTV4fPaDQ08Gw81kuz4I5TbsQOQEQFAHtDLkMdHH5m7wVlJ8+j04qY5yj1ByvgaLJLUkCTMwcwuRtY1WQnmUNPgzXqsF7z58l2BaAXZosacARV4Aa+eJ7jR1DVwBM4zQ2/BVQL0QU/VPbOoAOyenYJbUOI75WKVc3KGAt6fHl7RuZvpAslcYfwUj6ORwwy6TX6u7++0Da0terjO+yorbLa/Fiou6ep9df/hdhe2gzc78M+P6m/FFsG3g1120n1BLAwQUAAAACABWJrFcmVycIxAGAACcJwAAEwAAAHhsL3RoZW1lL3RoZW1lMS54bWztWltz2jgUfu+v0Hhn9m0LxjaBtrQTc2l227SZhO1OH4URWI1seWSRhH+/RzYQy5YN7ZJNups8BCzp+85FR+foOHnz7i5i6IaIlPJ4YNkv29a7ty/e4FcyJBFBMBmnr/DACqVMXrVaaQDDOH3JExLD3IKLCEt4FMvWXOBbGi8j1uq0291WhGlsoRhHZGB9XixoQNBUUVpvXyC05R8z+BXLVI1lowETV0EmuYi08vlsxfza3j5lz+k6HTKBbjAbWCB/zm+n5E5aiOFUwsTAamc/VmvH0dJIgILJfZQFukn2o9MVCDINOzqdWM52fPbE7Z+Mytp0NG0a4OPxeDi2y9KLcBwE4FG7nsKd9Gy/pEEJtKNp0GTY9tqukaaqjVNP0/d93+ubaJwKjVtP02t33dOOicat0HgNvvFPh8Ouicar0HTraSYn/a5rpOkWaEJG4+t6EhW15UDTIABYcHbWzNIDll4p+nWUGtkdu91BXPBY7jmJEf7GxQTWadIZljRGcp2QBQ4AN8TRTFB8r0G2iuDCktJckNbPKbVQGgiayIH1R4Ihxdyv/fWXu8mkM3qdfTrOa5R/aasBp+27m8+T/HPo5J+nk9dNQs5wvCwJ8fsjW2GHJ247E3I6HGdCfM/29pGlJTLP7/kK6048Zx9WlrBdz8/knoxyI7vd9lh99k9HbiPXqcCzIteURiRFn8gtuuQROLVJDTITPwidhphqUBwCpAkxlqGG+LTGrBHgE323vgjI342I96tvmj1XoVhJ2oT4EEYa4pxz5nPRbPsHpUbR9lW83KOXWBUBlxjfNKo1LMXWeJXA8a2cPB0TEs2UCwZBhpckJhKpOX5NSBP+K6Xa/pzTQPCULyT6SpGPabMjp3QmzegzGsFGrxt1h2jSPHr+BfmcNQockRsdAmcbs0YhhGm78B6vJI6arcIRK0I+Yhk2GnK1FoG2camEYFoSxtF4TtK0EfxZrDWTPmDI7M2Rdc7WkQ4Rkl43Qj5izouQEb8ehjhKmu2icVgE/Z5ew0nB6ILLZv24fobVM2wsjvdH1BdK5A8mpz/pMjQHo5pZCb2EVmqfqoc0PqgeMgoF8bkePuV6eAo3lsa8UK6CewH/0do3wqv4gsA5fy59z6XvufQ9odK3NyN9Z8HTi1veRm5bxPuuMdrXNC4oY1dyzcjHVK+TKdg5n8Ds/Wg+nvHt+tkkhK+aWS0jFpBLgbNBJLj8i8rwKsQJ6GRbJQnLVNNlN4oSnkIbbulT9UqV1+WvuSi4PFvk6a+hdD4sz/k8X+e0zQszQ7dyS+q2lL61JjhK9LHMcE4eyww7ZzySHbZ3oB01+/ZdduQjpTBTl0O4GkK+A226ndw6OJ6YkbkK01KQb8P56cV4GuI52QS5fZhXbefY0dH758FRsKPvPJYdx4jyoiHuoYaYz8NDh3l7X5hnlcZQNBRtbKwkLEa3YLjX8SwU4GRgLaAHg69RAvJSVWAxW8YDK5CifEyMRehw55dcX+PRkuPbpmW1bq8pdxltIlI5wmmYE2eryt5lscFVHc9VW/Kwvmo9tBVOz/5ZrcifDBFOFgsSSGOUF6ZKovMZU77nK0nEVTi/RTO2EpcYvOPmx3FOU7gSdrYPAjK5uzmpemUxZ6by3y0MCSxbiFkS4k1d7dXnm5yueiJ2+pd3wWDy/XDJRw/lO+df9F1Drn723eP6bpM7SEycecURAXRFAiOVHAYWFzLkUO6SkAYTAc2UyUTwAoJkphyAmPoLvfIMuSkVzq0+OX9FLIOGTl7SJRIUirAMBSEXcuPv75Nqd4zX+iyBbYRUMmTVF8pDicE9M3JD2FQl867aJguF2+JUzbsaviZgS8N6bp0tJ//bXtQ9tBc9RvOjmeAes4dzm3q4wkWs/1jWHvky3zlw2zreA17mEyxDpH7BfYqKgBGrYr66r0/5JZw7tHvxgSCb/NbbpPbd4Ax81KtapWQrET9LB3wfkgZjjFv0NF+PFGKtprGtxtoxDHmAWPMMoWY434dFmhoz1YusOY0Kb0HVQOU/29QNaPYNNByRBV4xmbY2o+ROCjzc/u8NsMLEjuHti78BUEsDBBQAAAAIAFYmsVzJu0LISgYAABQXAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1snVhrb+I4FP0rVlYazUg7JQ/ygoLEG0ofCDqdzwYMZAkJ65jSWe2P35vEgeA6gdlKhWCf43vte+z43vtjSLfRhhCGPnZ+EDWUDWP7WqUSLTZkh6O7cE8C6FmFdIcZ/KTrSrSnBC8T0s6v6KpqVXbYC5TmfdI2oc17hued0A8pout5Q1FVtWu17ZZSad6HB+Z7AZlQFB12O0x/tYkfHhuKpmQNU2+9YXEDoPd4TWaE/dgDfuWx13ACDbyvcrK29HYkiLwwQJSsGkpLq401M4YkiDePHKPcM4qnPA/DbfxjtAT3lNhQQNDHbO97YNpQ0C/+aCmIhftHsmId4vsNpWsrCC+Y904mwGgo85CxcJe4DBNgmEHbiob/kCCxT3wCYHBsn6BhqBQq6UtHii0V93I7qQOpQ6144f7m8z4vSzy3/HO2AP0kjrCacxwRCNFPb8k2DcVR0JKs8MFn0/A4JDwCyRouQj9KPtExxZoKWhwi8IZzwYGdF6Tf+IMHJ4c39AKCzgm6QNDUAoLBCYZA0IsIVU6o3kowOcG8lWBxgnUrweYE+1aCwwmOuErVAoLLCe6thHi908ipIsUpopyCnWouFUmisC5muHlPwyOiCT5WkmFl45y0BXtuESMS/SZAaPWC+GyYMQq9HgzIml/+0HTHULU6Qq3Z6/TlsdVG0OYYdfTyY4o6j63ZbPry8oSg1dE1HXBTssV79Oz52ENj4uMIvY1GGWkUpCeZt8X3FQaex2YqC/gHj09u66nb5+l/dltP3NYL3J49TdAzWRPqIc1EbRwsMWotyAZlfqBXvDkEqPUXpjhAuqqbcJDq1rm/6y0Iw1v07gEzYjT08bzEYyP1WOrwBbCaAnW9eGrVZGqGfGrxa6IW7fECDiV4D0SEvhOlidBjb9B77rZqKJmC7homxAxi4qhm3THRDAdrzGAlvC0g/k1Qruu4dWSrSeS0ulO97IbA65pVR6bJAZaLOoftYX8ewHGc+pc/LFM1YKAvPqubJpoQ6h9Q29vNPTAZlKyZeeuaWVzFavGaWcmaVQvk8BxeupFw2lc4eIfRzIuOWMLtlHMT2Uto3XLa62ENu0WTEHu3EHUJsX8L0ZAQB7cQqxLi8BaiKSGOyolTONe+U/iQUB+u2AwZ9tEk9AIJd1zOnVCyhMOKlejY5lu6WixPO7FhJjbii9p7E6L8nhdjirCuilEqj07KtgvYcP7KxPjZKVe/9Kr3GeI4l5C+ZBTzEjKQjCJAhpJR1EvIKIU4JZCHFOLmIFVTsDROMfE7t/CFlx6euSOzJPjO9eA7qUUt55awzm0OKXqd5cIv2+QdTi94ZRTFn7OqOb9sIbo9CcYRnO/LxhEl4FwV0lBmStQAx1yMo96Zbv5P0ITzWROqIWiCD1u0+7JX5RUpuNel4KaG7Jw3gi9tDnGuS0F2bHc43f09KaQsXc35ZQkh7LmSMAvx6cvGEeI8kI0jSGooG0fUAsfkt5VlC8F3PwXfMMQDgY9TtPfOF6Hk8lMS//hMuSaAGBNbM/J6FBSQYa7fTKQv4E7GN39PAxnNujg+BRHIQKaoggyUD594Dg+k5sQzQWpOEMsoA9klPj1wUF4KuggaZyMVbT7xynv7XVfjKY1ektJoevkFqPXa+h5/oHEP0i5pCHlW5AJp1Zy+/Hjufm299aatQe9r165BiL/9qX27r6zi6YuRLeH27FqvhNsv4/btWr+EOyjjDuzaoIQ7LOMO7dqwhDviXEOVcEd2bVTCfTjbLdJJkgvLbpv/i3oppSyFLEmHNJ5DFqf1jgmJ4UnIKK4aoKWH4CtCeIl9vEGTae9t1Pt5l3ZGJDoE6/VhE/zCCG8ha2aQXkceCsEDSOgjFGG4Li098rEPKTxgSL6zzPmubD48D9TKihRmOp+iQzqzc6pNHCjqQA4W0TDcnZN6+LZgtkmm/3SHhjjCwcFHfcxggufUP57unNDIW8GEKN7gyJNWKyq5gsuO0HVSEozQIjwESeky18oro9XaOKmFie2amZVMP/XotY6my3r02ljaroERTW4FOpJy0dnZtMT7hOnaCyLkkxU4rt7ZsNw0jUH6g4X7pEaUlkHTuhLBS0JjAPSvwpBlP85l48MehdQjAcNxJbWh+DhYRgu8J0paTD4VtWKfToXw5n9QSwMEFAAAAAgAViaxXG13M0+yBAAAlS8AAA0AAAB4bC9zdHlsZXMueG1s3Vptr6I4FP4rhB+wvGkvbNREvZBssruZZO6H/YpStQlvA/Wuzq/fFtBW5UyqMK6MNzfSnj7Pec7poTTFSUmPMf66w5hqhyROy6m+ozT/3TDK9Q4nYflbluOUWTZZkYSUNYutUeYFDqOSg5LYsE0TGUlIUn02SfdJkNBSW2f7lE51Uzdmk02Wih4b6XUPGxsmWPsM46m+DGOyKkg1OExIfKy7bd6xzuKs0CjTgqe6xXvK77XZqltcZsOTkDQreKdRe7j2My9IGHP7qmEQDortisk1g+pz4cVRISQQIVq82a4pE3qdBFpza2n5/fHdBtyRb7EI7NFFAs2eA1Yj/LlZu43S6kRovrNCmfeYtluFHesOzZ3RAwJ7IblHVbd5uCXsmDZ/ZM6Drml7kOQeVR3TdkPYLW3vSxuxJ0W3tD1Kco+qbmm7Jex7Me+6itwSKkV8x+PQlfiqr5Lxkjg+7xg8ve6YTfKQUlykAWtUmKrzxqQ11x/HnO0YtkV4tOyxrgwos5hE3OV2KYQHgVigDQnakdSfB6PA6Zk0sBkp6ps0CFzf6jt8Nxj7Xt+kDkvAe+/h+wvfB0mrL1a3q6yIcHGu3Df91DWbxHhDGbwg2x3/plnO77uM0ixhFxEJt1kaVmV9QshIrdqlT3W6q3bZ66upae5Rgw9tfCgiqrGVHEUAG3nSrYioBz8QmG/7yJ/fE5iEUAtMAigGJiEeDkzszZRnTCAUZ0wAVGdMIB4OTOyeVAOTEGqBSQDFwCTE44Gd9zfKgQmEYmACoBqYQDwcmNiBqAYmIdQCkwCKgUmIm8CaC7bYrnEcf+Uk/2zOK67FqA4brT6F+CPiBxAa31OcLtky3VzWNHWDO5LZam6J1nEe4tVy8pnRxZ6FkFbtb/uM4i8F3pBD1T5szgIgdkuw21fsYZ7Hx3lMtmmC6+CVHc4m4Qmn7bKCfGfe+GZszTpwoWufuKBkLff8W4T5Bz7QZlNnHDawZltodoai2RGaRz9fM7/XuioeAZVhvXCWx0LzWNZsv7Bm9FTNfVTG2wCz7AKanRfW7AHr3Cvn2TIHmGhLegqioWQaPVVzz+vGYLJs2UMU7QCiR68sejRE0dKO420o5YGeqrnnlWMwWbaem+aeREOZHr+yaHeIoqXdnTuU8kBP1dzzyjGYLNvmEEVbgGj0yqLtIYqWdneDOZmxh3icJFXHQA7tbGk/en1a/L+n2WiOvaWz9YuT9XOvxl/5T/W/+U8CY6FCW+1JTEnatHYkinCl++KAndHTcBXjS342PsKbcB/Tj7Nxqovrv3BE9ol3HvWFZ6YZJa7/5G8kLHT+2QHzRdIIH3C0bJrFdiW92TWbDwdcW8QrzFsLhKlt7RZug/xACiBMjYL8/ErxuGA8tQ3S5rZaXBDjgpga1WZZVn+Qn3aMxz7tkXqe4yAEZXS5bFWwhPKGEP9vZ4O0cQTkh3u6L9fwbMMV8uM6gOb0RxUCRQpXIhQpnGtuac8bR3he+2xDfjgCmgWodrj/dj+8ptoxjsNnFdIG3cGwxfMgC6/F9hpFCMgO4n/t8wPdJY7jee0WbmtX4DiQhd+NsAVSwDVAFqf+odfV88g4PacM8UP82X9QSwMEFAAAAAgAViaxXJeKuxzAAAAAEwIAAAsAAABfcmVscy8ucmVsc52SuW7DMAxAf8XQnjAH0CGIM2XxFgT5AVaiD9gSBYpFnb+v2qVxkAsZeT08EtweaUDtOKS2i6kY/RBSaVrVuAFItiWPac6RQq7ULB41h9JARNtjQ7BaLD5ALhlmt71kFqdzpFeIXNedpT3bL09Bb4CvOkxxQmlISzMO8M3SfzL38ww1ReVKI5VbGnjT5f524EnRoSJYFppFydOiHaV/Hcf2kNPpr2MitHpb6PlxaFQKjtxjJYxxYrT+NYLJD+x+AFBLAwQUAAAACABWJrFcK22Q2TkBAAAuAgAADwAAAHhsL3dvcmtib29rLnhtbI1R0W7CMAz8lSofsBa0IQ1RXoa2IU0MjYn30LrUIokrx4WNr5/bqhrSXvbk+Oxc7i6LC/HpQHRKvrwLMTe1SDNP01jU4G28owaCTipib0VbPqaxYbBlrAHEu3SaZbPUWwxmuRi5tpzeNiRQCFJQsAP2CJf4O+/a5IwRD+hQvnPTnx2YxGNAj1coc5OZJNZ0eSXGKwWxblcwOZebyTDYAwsWf+BdJ/LTHmKPiD18WBWSm1mmhBVylH6j57eq8Qy6PHSt0DM6AV5ZgRemtsFw7GjURXpjo89hrEOIc/5PjFRVWMCKitZDkCFHBtcJDLHGJpokWA+52aCzmKzDcBlPtvOmj63LwaeowJvUeI464HU5SB31lVBhgHKjlFFxzarYctKVnmd6/zB51Exa554Uew9vZMvR7vhVyx9QSwMEFAAAAAgAViaxXCQem6KtAAAA+AEAABoAAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc7WRPQ6DMAyFrxLlADVQqUMFTF1YKy4QBfMjEhLFrgq3L4UBkDp0YbKeLX/vyU6faBR3bqC28yRGawbKZMvs7wCkW7SKLs7jME9qF6ziWYYGvNK9ahCSKLpB2DNknu6Zopw8/kN0dd1pfDj9sjjwDzC8XeipRWQpShUa5EzCaLY2wVLiy0yWoqgyGYoqlnBaIOLJIG1pVn2wT06053kXN/dFrs3jCa7fDHB4dP4BUEsDBBQAAAAIAFYmsVxlkHmSGQEAAM8DAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbK2TTU7DMBCFrxJlWyUuLFigphtgC11wAWNPGqv+k2da0tszTtpKoBIVhU2seN68z56XrN6PEbDonfXYlB1RfBQCVQdOYh0ieK60ITlJ/Jq2Ikq1k1sQ98vlg1DBE3iqKHuU69UztHJvqXjpeRtN8E2ZwGJZPI3CzGpKGaM1ShLXxcHrH5TqRKi5c9BgZyIuWFCKq4Rc+R1w6ns7QEpGQ7GRiV6lY5XorUA6WsB62uLKGUPbGgU6qL3jlhpjAqmxAyBn69F0MU0mnjCMz7vZ/MFmCsjKTQoRObEEf8edI8ndVWQjSGSmr3ghsvXs+0FOW4O+kc3j/QxpN+SBYljmz/h7xhf/G87xEcLuvz+xvNZOGn/mi+E/Xn8BUEsBAhQDFAAAAAgAViaxXEbHTUiVAAAAzQAAABAAAAAAAAAAAAAAAIABAAAAAGRvY1Byb3BzL2FwcC54bWxQSwECFAMUAAAACABWJrFcQktoNfIAAAArAgAAEQAAAAAAAAAAAAAAgAHDAAAAZG9jUHJvcHMvY29yZS54bWxQSwECFAMUAAAACABWJrFcmVycIxAGAACcJwAAEwAAAAAAAAAAAAAAgAHkAQAAeGwvdGhlbWUvdGhlbWUxLnhtbFBLAQIUAxQAAAAIAFYmsVzJu0LISgYAABQXAAAYAAAAAAAAAAAAAACAgSUIAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWxQSwECFAMUAAAACABWJrFcbXczT7IEAACVLwAADQAAAAAAAAAAAAAAgAGlDgAAeGwvc3R5bGVzLnhtbFBLAQIUAxQAAAAIAFYmsVyXirscwAAAABMCAAALAAAAAAAAAAAAAACAAYITAABfcmVscy8ucmVsc1BLAQIUAxQAAAAIAFYmsVwrbZDZOQEAAC4CAAAPAAAAAAAAAAAAAACAAWsUAAB4bC93b3JrYm9vay54bWxQSwECFAMUAAAACABWJrFcJB6boq0AAAD4AQAAGgAAAAAAAAAAAAAAgAHRFQAAeGwvX3JlbHMvd29ya2Jvb2sueG1sLnJlbHNQSwECFAMUAAAACABWJrFcZZB5khkBAADPAwAAEwAAAAAAAAAAAAAAgAG2FgAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLBQYAAAAACQAJAD4CAAAAGAAAAAA=";

function downloadBase64Excel(b64, filename) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

// ─── DOWNLOAD TEMPLATE SOAL ───
async function downloadTemplateSoal() {
  if (!window.ExcelJS) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const ExcelJS = window.ExcelJS;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Astrolab · Our Classroom";

  const headerStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6B7A" } }, font: { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } };
  const exampleStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF4F3" } }, font: { name: "Arial", italic: true, color: { argb: "FF6B7280" }, size: 10 }, alignment: { vertical: "top", wrapText: true } };

  // Sheet 1: Pilihan Ganda
  const ws1 = wb.addWorksheet("1. Pilihan Ganda", { properties: { tabColor: { argb: "FF3B82F6" } } });
  ws1.columns = [
    { header: "Pertanyaan", width: 50 },
    { header: "Pilihan A", width: 20 },
    { header: "Pilihan B", width: 20 },
    { header: "Pilihan C", width: 20 },
    { header: "Pilihan D", width: 20 },
    { header: "Jawaban (A/B/C/D)", width: 18 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws1.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws1.getRow(1).height = 35;
  ws1.addRow(["Apa ibukota Indonesia?", "Surabaya", "Jakarta", "Bandung", "Medan", "B", 10, "Jakarta adalah ibukota Indonesia sejak 1945.", "geografi, indonesia"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 2: Benar/Salah
  const ws2 = wb.addWorksheet("2. Benar Salah", { properties: { tabColor: { argb: "FF10B981" } } });
  ws2.columns = [
    { header: "Pernyataan", width: 60 },
    { header: "Jawaban (Benar/Salah)", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws2.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws2.getRow(1).height = 35;
  ws2.addRow(["Matahari adalah bintang terdekat dengan bumi.", "Benar", 10, "Matahari ±150 juta km dari Bumi (1 AU), bintang terdekat.", "astronomi, bintang"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 3: PG Kompleks
  const ws3 = wb.addWorksheet("3. PG Kompleks", { properties: { tabColor: { argb: "FFF97316" } } });
  ws3.columns = [
    { header: "Pertanyaan", width: 50 },
    { header: "Pilihan A", width: 20 },
    { header: "Pilihan B", width: 20 },
    { header: "Pilihan C", width: 20 },
    { header: "Pilihan D", width: 20 },
    { header: "Jawaban Benar (A,B,C,D)", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws3.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws3.getRow(1).height = 35;
  ws3.addRow(["Manakah yang termasuk planet di tata surya?", "Bumi", "Mars", "Bulan", "Venus", "A,B,D", 15, "Bumi, Mars, Venus = planet. Bulan = satelit alami Bumi.", "astronomi, tata-surya"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 4: Pasangkan
  const ws4 = wb.addWorksheet("4. Pasangkan", { properties: { tabColor: { argb: "FF8B5CF6" } } });
  ws4.columns = [
    { header: "Pertanyaan / Instruksi", width: 40 },
    { header: "Item Kiri 1", width: 18 }, { header: "Pasangan Kanan 1", width: 22 },
    { header: "Item Kiri 2", width: 18 }, { header: "Pasangan Kanan 2", width: 22 },
    { header: "Item Kiri 3", width: 18 }, { header: "Pasangan Kanan 3", width: 22 },
    { header: "Item Kiri 4", width: 18 }, { header: "Pasangan Kanan 4", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws4.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws4.getRow(1).height = 35;
  ws4.addRow(["Pasangkan negara dengan ibukotanya", "Indonesia", "Jakarta", "Malaysia", "Kuala Lumpur", "Thailand", "Bangkok", "Singapura", "Singapura", 10, "Ibukota negara ASEAN. Singapura adalah negara-kota.", "geografi, asean"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 5: Excel Sandbox
  const ws5 = wb.addWorksheet("5. Excel Sandbox", { properties: { tabColor: { argb: "FFEAB308" } } });
  ws5.columns = [
    { header: "Pertanyaan", width: 40 },
    { header: "Header Kolom (pisah |)", width: 25 },
    { header: "Data Tabel (baris pisah ;, kolom pisah |)", width: 40 },
    { header: "Pilihan A", width: 15 },
    { header: "Pilihan B", width: 15 },
    { header: "Pilihan C", width: 15 },
    { header: "Pilihan D", width: 15 },
    { header: "Jawaban (A/B/C/D)", width: 18 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws5.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws5.getRow(1).height = 35;
  ws5.addRow([
    "Hitung rata-rata nilai siswa di tabel berikut",
    "Nama|Nilai",
    "Budi|85;Sari|92;Andi|78",
    "75", "85", "92", "78", "B", 15,
    "Rata-rata = (85+92+78)/3 = 85. Pakai =AVERAGE(B2:B4).",
    "informatika, excel"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 6: Essay
  const ws6 = wb.addWorksheet("6. Essay", { properties: { tabColor: { argb: "FFEC4899" } } });
  ws6.columns = [
    { header: "Pertanyaan", width: 50 },
    { header: "Kata Kunci (pisah koma)", width: 35 },
    { header: "Panduan Penilaian", width: 40 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws6.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws6.getRow(1).height = 35;
  ws6.addRow([
    "Jelaskan proses fotosintesis pada tumbuhan!",
    "klorofil, cahaya matahari, karbondioksida, glukosa, oksigen",
    "Nilai 100 jika menjelaskan 5 elemen lengkap, 70 jika 3 elemen, 40 jika hanya menyebut",
    20,
    "6CO2 + 6H2O + cahaya → C6H12O6 + 6O2. Terjadi di kloroplas dengan klorofil.",
    "biologi, tumbuhan"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 7: Pseudocode Trace (khusus Informatika)
  const ws7p = wb.addWorksheet("7. Pseudocode Trace", { properties: { tabColor: { argb: "FF06B6D4" } } });
  ws7p.columns = [
    { header: "Pertanyaan", width: 40 },
    { header: "Kode Pseudocode", width: 45 },
    { header: "Jawaban Output", width: 25 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws7p.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws7p.getRow(1).height = 35;
  ws7p.addRow([
    "Trace output dari pseudocode berikut:",
    "x = 5\ny = 3\nz = x + y\nprint(z)\nprint(x * y)",
    "8\n15",
    10,
    "Baris 3: z = 5+3 = 8. Baris 4 cetak z. Baris 5 cetak 5*3 = 15.",
    "informatika, pseudocode, trace"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 8: Debug Challenge (khusus Informatika)
  const ws8d = wb.addWorksheet("8. Debug Challenge", { properties: { tabColor: { argb: "FFDC2626" } } });
  ws8d.columns = [
    { header: "Pertanyaan", width: 40 },
    { header: "Kode Buggy", width: 45 },
    { header: "Nomor Baris Bug", width: 15 },
    { header: "Perbaikan yang Benar", width: 30 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws8d.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws8d.getRow(1).height = 35;
  ws8d.addRow([
    "Ada bug pada kode berikut. Cari baris yang salah dan tulis perbaikannya:",
    "total = 0\nfor i = 1 to 5\n  total = total + i\nprint(total * 2)",
    4,
    "print(total)",
    15,
    "Baris 4 seharusnya cetak total saja, bukan total*2 (yang tidak sesuai instruksi).",
    "informatika, debug"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 9: Refleksi Terstruktur (4 kolom wajib)
  const ws9r = wb.addWorksheet("9. Refleksi", { properties: { tabColor: { argb: "FF7C3AED" } } });
  ws9r.columns = [
    { header: "Prompt Utama", width: 45 },
    { header: "Label Kolom 1", width: 22 },
    { header: "Label Kolom 2", width: 22 },
    { header: "Label Kolom 3", width: 22 },
    { header: "Label Kolom 4", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Panduan Penilaian", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws9r.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws9r.getRow(1).height = 35;
  ws9r.addRow([
    "Refleksikan proses debugging kamu tadi.",
    "Prediksi saya",
    "Yang saya observasi",
    "Yang salah/bug",
    "Pelajaran yang saya ambil",
    20,
    "Nilai 100 kalau semua 4 kolom terisi dengan reflektif dan spesifik. Turun proporsional untuk yang generik atau kosong.",
    "informatika, refleksi, metakognisi"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet PETUNJUK
  const ws7 = wb.addWorksheet("PETUNJUK", { properties: { tabColor: { argb: "FFDC2626" } } });
  ws7.columns = [{ width: 90 }];
  const petunjuk = [
    "PETUNJUK PENGISIAN TEMPLATE SOAL ASTROLAB",
    "",
    "1. Isi soal di sheet sesuai TIPE soal yang diinginkan (tab di bawah).",
    "2. Setiap baris = 1 soal. Hapus contoh sebelum import (atau biarkan, akan ikut terimport).",
    "3. Kolom POIN: nilai per soal (default 10).",
    "",
    "=== KOLOM BARU ===",
    "",
    "Pembahasan (opsional): penjelasan jawaban yang ditampilkan ke siswa",
    "   setelah deadline. Kosongkan kalau tidak perlu.",
    "",
    "Tags (opsional): label untuk filter di Bank Soal. Pisah dengan koma.",
    "   Contoh: 'bab-3, UTS, energi' atau 'astronomi, tata-surya'.",
    "   Tips: gunakan tag konsisten supaya gampang dicari.",
    "",
    "=== TIPE SOAL ===",
    "",
    "Pilihan Ganda: 4 opsi, 1 jawaban. Tulis huruf A/B/C/D di kolom Jawaban.",
    "",
    "Benar/Salah: ketik 'Benar' atau 'Salah' di kolom Jawaban.",
    "",
    "PG Kompleks: Multi jawaban. Pisah dengan koma. Contoh: 'A,B,D'.",
    "",
    "Pasangkan: Isi pasangan kiri-kanan berurutan. Bisa 2-4 pasangan.",
    "",
    "Excel Sandbox (khusus Informatika):",
    "   - Header Kolom: pisah dengan tanda | (pipe). Contoh: 'Nama|Nilai|Kelas'",
    "   - Data Tabel: baris pisah ; (semicolon), kolom pisah | (pipe).",
    "     Contoh: 'Budi|85|VII;Sari|92|VII;Andi|78|VIII'",
    "   - Siswa akan mencoba rumus Excel (SUM, AVERAGE, dll) lalu pilih PG.",
    "",
    "Essay: Jawaban panjang, dinilai manual oleh guru.",
    "   - Kata Kunci: pisah dengan koma. Akan ditampilkan ke guru saat menilai.",
    "   - Panduan Penilaian: rubrik untuk guru, opsional.",
    "",
    "Pseudocode Trace (khusus Informatika): Siswa trace output pseudocode.",
    "   - Kode Pseudocode: tulis dengan baris terpisah pakai Enter (Alt+Enter di Excel).",
    "   - Jawaban Output: hasil output persis (auto-check exact match, toleran spasi/case).",
    "",
    "Debug Challenge (khusus Informatika): Siswa cari bug & tulis perbaikan.",
    "   - Kode Buggy: tulis dengan baris terpisah pakai Enter (Alt+Enter di Excel).",
    "   - Nomor Baris Bug: angka (dihitung dari 1 di atas).",
    "   - Perbaikan yang Benar: kode/teks pengganti baris yang salah (auto-check).",
    "",
    "Refleksi Terstruktur: 4 kolom wajib, dinilai manual oleh guru.",
    "   - Prompt Utama: pertanyaan/instruksi refleksi.",
    "   - Label Kolom 1-4: nama kolom yang siswa isi (contoh default: Prediksi saya,",
    "     Yang saya observasi, Yang salah/bug, Pelajaran yang saya ambil).",
    "   - Semua 4 kolom wajib diisi siswa sebelum bisa submit.",
    "",
    "=== TIPS ===",
    "",
    "- Boleh kosongkan sheet yang tidak dipakai (akan diskip).",
    "- Soal dengan pertanyaan kosong akan diskip otomatis.",
    "- Setelah edit, simpan & upload via tombol 'Import Excel'.",
    "",
    "Astrolab · Our Classroom · © 2026 M. Hasanul Fatta",
  ];
  petunjuk.forEach((line, i) => {
    const row = ws7.addRow([line]);
    if (i === 0) {
      row.font = { name: "Arial", bold: true, size: 14, color: { argb: "FF0D6B7A" } };
      row.height = 26;
    } else if (line.startsWith("===")) {
      row.font = { name: "Arial", bold: true, size: 11, color: { argb: "FFDC2626" } };
    } else if (line.match(/^[A-Z][a-z]+ (Ganda|Salah|Kompleks|Sandbox)/) || line === "Essay: Jawaban panjang, dinilai manual oleh guru." || line === "Pasangkan: Isi pasangan kiri-kanan berurutan. Bisa 2-4 pasangan.") {
      row.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF1A1C1E" } };
    } else {
      row.font = { name: "Arial", size: 10, color: { argb: "FF374151" } };
    }
    row.alignment = { wrapText: true, vertical: "top" };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "Template_Soal_Astrolab.xlsx";
  a.click(); URL.revokeObjectURL(url);
}

// ─── EXPORT NILAI (ExcelJS — full color dari data real) ───
async function exportNilai(store, jenjang) {
  if (!window.ExcelJS) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const ExcelJS = window.ExcelJS;
  const siswaList = store.getAllSiswa(jenjang);
  const tugasList = store.getTugas().filter(t => t.jenjang === jenjang);
  const subs = store.getSubs();
  const mapelGroups = jenjang === "VII" ? ["IPA", "Informatika"] : [null];

  for (const mapel of mapelGroups) {
    const tugasMapel = mapel ? tugasList.filter(t => t.mapel === mapel) : tugasList;
    if (tugasMapel.length === 0) continue;
    const mapelLabel = mapel || "IPA";
    const nTugas = tugasMapel.length;

    const siswaData = siswaList.map(s => {
      const st = store.getStats(s.id);
      const nilaiArr = tugasMapel.map(t => {
        const sub = subs.find(sb => sb.siswaId === s.id && sb.tugasId === t.id);
        return sub ? sub.nilai : null;
      });
      const angka = nilaiArr.filter(v => v !== null);
      const rata = angka.length ? Math.round(angka.reduce((a,b)=>a+b,0)/angka.length) : null;
      return { siswa: s, stats: st, nilaiArr, rata };
    }).sort((a,b) => (b.rata||0) - (a.rata||0));

    const gradeStyle = (n) => {
      if (n === null) return { label:"—", fill:"F3F4F6", font:"6B7280", bold:false };
      if (n >= 85) return { label:"Sangat Baik",      fill:"FFFFF8E1", font:"B45309", bold:true };
      if (n >= 70) return { label:"Baik",             fill:"F0FDF4",   font:"15803D", bold:true };
      if (n >= 55) return { label:"Cukup",            fill:"EFF6FF",   font:"1D4ED8", bold:true };
      return              { label:"Perlu Bimbingan",  fill:"FEF2F2",   font:"DC2626", bold:true };
    };
    const valStyle = (n) => {
      if (n === null) return { fill:"F3F4F6", font:"9CA3AF", bold:false };
      if (n >= 85) return { fill:"FFFFF8E1", font:"B45309", bold:true };
      if (n >= 70) return { fill:"F0FDF4",   font:"15803D", bold:true };
      if (n >= 55) return { fill:"EFF6FF",   font:"1D4ED8", bold:true };
      return              { fill:"FEF2F2",   font:"DC2626", bold:true };
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = "Astrolab · Our Classroom";
    const ws = wb.addWorksheet(`Nilai ${mapelLabel}`, { pageSetup:{ orientation:"landscape", fitToPage:true, fitToWidth:1 } });
    const totalCols = 6 + nTugas;
    ws.columns = [
      { width:5 }, { width:32 }, { width:10 },
      ...tugasMapel.map(() => ({ width:20 })),
      { width:13 }, { width:13 }, { width:20 }
    ];
    const lastColLetter = ws.getColumn(totalCols).letter;

    const sc = (cell, val, opts={}) => {
      cell.value = val;
      if (opts.fill) cell.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF"+opts.fill } };
      cell.font = { name:"Arial", size:opts.size||10, bold:opts.bold||false, color:{ argb:"FF"+(opts.font||"1A1C1E") }, italic:opts.italic||false };
      cell.alignment = { horizontal:opts.halign||"center", vertical:"middle", wrapText:true };
      if (opts.border) { const bs={ style:"thin", color:{ argb:"FF"+(opts.borderColor||"E2E6EA") } }; cell.border={ top:bs,bottom:bs,left:bs,right:bs }; }
    };

    ws.mergeCells(`A1:${lastColLetter}1`);
    sc(ws.getCell("A1"), `ASTROLAB · OUR CLASSROOM  —  Rekap Nilai Kelas ${jenjang} · ${mapelLabel}`, { fill:"0D6B7A", font:"FFFFFF", size:13, bold:true });
    ws.getRow(1).height = 36;

    ws.mergeCells(`A2:${lastColLetter}2`);
    sc(ws.getCell("A2"), `SMP Negeri 15 Banda Aceh  ·  Tahun Ajaran ${getTahunAjaran()}  ·  Dicetak: ${new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}`, { fill:"EAF4F3", font:"6B7280", size:9, italic:true });
    ws.getRow(2).height = 18;
    ws.getRow(3).height = 8;

    ws.mergeCells(`A4:${lastColLetter}4`);
    sc(ws.getCell("A4"), "  LEGENDA:   Sangat Baik ≥85   |   Baik 70–84   |   Cukup 55–69   |   Perlu Bimbingan <55", { fill:"F2F4F6", font:"1A1C1E", size:9, bold:true, halign:"left" });
    ws.getRow(4).height = 22;
    ws.getRow(5).height = 8;

    const headers = ["No","Nama Siswa","Kelas",...tugasMapel.map(t=>t.judul),"Rata-rata","Total Poin","Predikat"];
    const headerRow = ws.getRow(6);
    headerRow.height = 30;
    headers.forEach((h,ci) => sc(headerRow.getCell(ci+1), h, { fill:"0D6B7A", font:"FFFFFF", size:9, bold:true, border:true, borderColor:"FFFFFF" }));

    siswaData.forEach((d,ri) => {
      const row = ws.getRow(7+ri); row.height = 24;
      const gs = gradeStyle(d.rata);
      sc(row.getCell(1), ri+1, { fill:gs.fill, font:gs.font, bold:true, border:true });
      sc(row.getCell(2), d.siswa.nama, { fill:gs.fill, font:"1A1C1E", bold:true, halign:"left", border:true });
      sc(row.getCell(3), d.siswa.kelas, { fill:gs.fill, font:"1A1C1E", border:true });
      d.nilaiArr.forEach((n,ti) => { const vs=valStyle(n); sc(row.getCell(4+ti), n!==null?n:"—", { fill:vs.fill, font:vs.font, bold:vs.bold, border:true }); });
      sc(row.getCell(4+nTugas), d.rata!==null?d.rata:"—", { fill:gs.fill, font:gs.font, size:11, bold:true, border:true, borderColor:gs.font });
      sc(row.getCell(5+nTugas), d.stats.poin, { fill:"EAF4F3", font:"0A525C", bold:true, border:true });
      sc(row.getCell(6+nTugas), gs.label, { fill:gs.fill, font:gs.font, size:9, bold:true, border:true, borderColor:gs.font });
    });

    const sumRowIdx = 7+siswaData.length;
    const sumRow = ws.getRow(sumRowIdx); sumRow.height = 28;
    ws.mergeCells(`A${sumRowIdx}:C${sumRowIdx}`);
    sc(sumRow.getCell(1), "RATA-RATA KELAS", { fill:"0D6B7A", font:"FFFFFF", size:9, bold:true, border:true, borderColor:"FFFFFF" });
    tugasMapel.forEach((_,ti) => {
      const vals=siswaData.map(d=>d.nilaiArr[ti]).filter(v=>v!==null);
      sc(sumRow.getCell(4+ti), vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):"—", { fill:"0D6B7A", font:"FFFFFF", bold:true, border:true, borderColor:"FFFFFF" });
    });
    const allRata=siswaData.map(d=>d.rata).filter(v=>v!==null);
    sc(sumRow.getCell(4+nTugas), allRata.length?Math.round(allRata.reduce((a,b)=>a+b,0)/allRata.length):"—", { fill:"0D6B7A", font:"FFFFFF", size:11, bold:true, border:true, borderColor:"FFFFFF" });
    sc(sumRow.getCell(5+nTugas), "—", { fill:"0D6B7A", font:"FFFFFF", bold:true, border:true, borderColor:"FFFFFF" });
    sc(sumRow.getCell(6+nTugas), "—", { fill:"0D6B7A", font:"FFFFFF", bold:true, border:true, borderColor:"FFFFFF" });

    const footIdx = sumRowIdx+2; ws.getRow(footIdx).height=16;
    ws.mergeCells(`A${footIdx}:${lastColLetter}${footIdx}`);
    sc(ws.getCell(`A${footIdx}`), "Astrolab · Our Classroom  ·  © 2026 M. Hasanul Fatta  ·  Data bersifat rahasia", { font:"6B7280", size:8, italic:true });

    ws.views = [{ state:"frozen", xSplit:3, ySplit:6 }];
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url;
    a.download = `Nilai_Kelas${jenjang}${mapel?"_"+mapel:""}_Astrolab.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  }
}
async function importSoalFromExcel(file) {
  const XLSX = await loadXLSX();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const soal = [];

        wb.SheetNames.forEach(name => {
          const ws = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          if (!rows.length) return;

          // Deteksi tipe dari nama sheet
          const n = name.toLowerCase();
          let tipe = null;
          if (n.includes("pilihan ganda") || n.includes("1.") || n.includes("biru")) tipe = "pg";
          else if (n.includes("benar") || n.includes("salah") || n.includes("2.") || n.includes("hijau")) tipe = "tf";
          else if (n.includes("kompleks") || n.includes("cocok") || n.includes("3.") || n.includes("oranye") || n.includes("orange")) tipe = "komplex";
          else if (n.includes("pasangkan") || n.includes("urutan") || n.includes("susun") || n.includes("4.") || n.includes("ungu") || n.includes("pasang")) tipe = "pasang";
          else if (n.includes("excel") || n.includes("sandbox") || n.includes("5.") || n.includes("kuning")) tipe = "excel";
          else if (n.includes("essay") || n.includes("6.") || n.includes("pink") || n.includes("magenta")) tipe = "essay";
          else if (n.includes("pseudocode") || n.includes("trace") || n.includes("7.")) tipe = "pseudocode";
          else if (n.includes("debug") || n.includes("challenge") || n.includes("8.")) tipe = "debug";
          else if (n.includes("refleksi") || n.includes("terstruktur") || n.includes("9.")) tipe = "refleksi";
          if (!tipe) return;

          rows.forEach(row => {
            const pertanyaan = row["Pertanyaan"] || row["Pertanyaan / Instruksi"] || row["Pernyataan"] || row["Prompt Utama"] || "";
            if (!pertanyaan.toString().trim()) return;
            const poin = Number(row["Poin"]) || 10;
            // Pembahasan & Tags (optional, common untuk semua tipe)
            const pembahasan = (row["Pembahasan"] || "").toString().trim();
            const tagsRaw = (row["Tags"] || "").toString().trim();
            const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

            if (tipe === "pg") {
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwb = (row["Jawaban (A/B/C/D)"] || row["Jawaban Benar\n(A/B/C/D)"] || "A").toString().trim().toUpperCase();
              const jwbIdx = ["A","B","C","D"].indexOf(jwb);
              soal.push({ id: uid(), type: "pg", pertanyaan: pertanyaan.toString(), opsi, jawaban: jwbIdx >= 0 ? jwbIdx : 0, poin, pembahasan, tags });
            } else if (tipe === "tf") {
              const jwb = (row["Jawaban (Benar/Salah)"] || "Benar").toString().trim().toLowerCase();
              soal.push({ id: uid(), type: "tf", pertanyaan: pertanyaan.toString(), jawaban: jwb === "benar" ? 0 : 1, poin, pembahasan, tags });
            } else if (tipe === "komplex") {
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwbStr = (row["Jawaban Benar (A,B,C,D)"] || row["Jawaban Benar (misal: A,C)"] || row["Jawaban Benar\n(misal: A,C)"] || "A").toString();
              const jwb = jwbStr.split(",").map(s => ["A","B","C","D"].indexOf(s.trim().toUpperCase())).filter(i => i >= 0);
              soal.push({ id: uid(), type: "komplex", pertanyaan: pertanyaan.toString(), opsi, jawaban: jwb, poin, pembahasan, tags });
            } else if (tipe === "pasang") {
              const kiri = [], kanan = [];
              for (let i = 1; i <= 4; i++) {
                const k = row[`Item Kiri ${i}`] || row[`Item Kiri ${i} (pasangan Kiri ${i})`];
                const kn = row[`Pasangan Kanan ${i}`] || row[`Item Kanan ${i} (pasangan Kiri ${i})`];
                if (k && k.toString().trim()) kiri.push(k.toString());
                if (kn && kn.toString().trim()) kanan.push(kn.toString());
              }
              if (kiri.length === 0) return;
              const jwb = kiri.map((_, i) => i);
              soal.push({ id: uid(), type: "pasang", pertanyaan: pertanyaan.toString(), kiri, kanan, jawaban: jwb, poin, pembahasan, tags });
            } else if (tipe === "excel") {
              const headersStr = (row["Header Kolom (pisah |)"] || "").toString();
              const dataStr = (row["Data Tabel (baris pisah ;, kolom pisah |)"] || "").toString();
              if (!headersStr || !dataStr) return;
              const headers = headersStr.split("|").map(h => h.trim());
              const table = dataStr.split(";").map(rowStr => rowStr.split("|").map(c => c.trim()));
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwb = (row["Jawaban (A/B/C/D)"] || "A").toString().trim().toUpperCase();
              const jwbIdx = ["A","B","C","D"].indexOf(jwb);
              soal.push({ id: uid(), type: "excel", pertanyaan: pertanyaan.toString(), headers, table, opsi, jawaban: jwbIdx >= 0 ? jwbIdx : 0, poin, pembahasan, tags });
            } else if (tipe === "essay") {
              const kataKunci = (row["Kata Kunci (pisah koma)"] || "").toString();
              const panduanNilai = (row["Panduan Penilaian"] || "").toString();
              soal.push({ id: uid(), type: "essay", pertanyaan: pertanyaan.toString(), kataKunci, panduanNilai, poin, pembahasan, tags });
            } else if (tipe === "pseudocode") {
              const kode = (row["Kode Pseudocode"] || row["Kode"] || "").toString();
              const jawabanBenar = (row["Jawaban Output"] || row["Output"] || "").toString();
              if (!kode.trim() || !jawabanBenar.trim()) return;
              soal.push({ id: uid(), type: "pseudocode", pertanyaan: pertanyaan.toString(), kode, jawabanBenar, poin, pembahasan, tags });
            } else if (tipe === "debug") {
              const kodeBuggy = (row["Kode Buggy"] || row["Kode"] || "").toString();
              const barisBug = Number(row["Nomor Baris Bug"] || row["Baris Bug"] || 0);
              const perbaikanBenar = (row["Perbaikan yang Benar"] || row["Perbaikan"] || "").toString();
              if (!kodeBuggy.trim() || !barisBug || !perbaikanBenar.trim()) return;
              soal.push({ id: uid(), type: "debug", pertanyaan: pertanyaan.toString(), kodeBuggy, barisBug, perbaikanBenar, poin, pembahasan, tags });
            } else if (tipe === "refleksi") {
              const labelKolom1 = (row["Label Kolom 1"] || "Prediksi saya").toString();
              const labelKolom2 = (row["Label Kolom 2"] || "Yang saya observasi").toString();
              const labelKolom3 = (row["Label Kolom 3"] || "Yang salah/bug").toString();
              const labelKolom4 = (row["Label Kolom 4"] || "Pelajaran yang saya ambil").toString();
              const panduanNilai = (row["Panduan Penilaian"] || "").toString();
              soal.push({ id: uid(), type: "refleksi", pertanyaan: pertanyaan.toString(), labelKolom1, labelKolom2, labelKolom3, labelKolom4, panduanNilai, poin, pembahasan, tags });
            }
          });
        });

        resolve(soal);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}


// ─── BACKUP JSON ───
async function downloadBackupJSON() {
  try {
    const { getDatabase, ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
    const snap = await get(ref(db, "/"));
    const data = snap.val();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `astrolab-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Fallback: collect from store
    alert("Backup dimulai. Cek file yang terdownload.");
  }
}

// Versi yang pakai data dari store (tidak perlu re-fetch)
function backupFromStore(store) {
  const tugas = store.getTugas();
  const subs = store.getSubs();
  const data = {
    exported_at: new Date().toISOString(),
    app: "Astrolab · Our Classroom",
    tugas,
    submissions: subs,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `astrolab-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── DASHBOARD GURU ───
// ─── DASHBOARD TUGAS ANALISIS (inline expand) ───
function DashboardTugasAnalisis({ tugas, subs, siswaList, navigate }) {
  const siswaCount = siswaList.length;
  const nilaiList = subs.map(s => s.nilai);
  const avg = Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length);
  const max = Math.max(...nilaiList);
  const min = Math.min(...nilaiList);

  // Distribusi nilai (buckets) — palet teal kalem
  const buckets = [
    { label: "90-100", min: 90, max: 100, color: "#09637E" },
    { label: "80-89", min: 80, max: 89, color: "#088395" },
    { label: "70-79", min: 70, max: 79, color: "#7AB2B2" },
    { label: "60-69", min: 60, max: 69, color: "#cbb26a" },
    { label: "<60", min: 0, max: 59, color: "#c98a8a" },
  ].map(b => ({ ...b, count: nilaiList.filter(n => n >= b.min && n <= b.max).length }));
  const maxBucket = Math.max(...buckets.map(b => b.count), 1);

  // Analisis per soal (ringkas)
  const soalStats = (tugas.soal || []).map((s, i) => {
    const correctCount = subs.filter(sub => {
      const r = sub.soalResults?.find(x => x.origIdx === i);
      if (!r) return false;
      if (s.type === "essay") return r.statusNilai === "dinilai" && (r.nilaiEssay || 0) >= 60;
      return r.correct === true;
    }).length;
    const pct = subs.length ? Math.round((correctCount / subs.length) * 100) : 0;
    return { i, pct, type: s.type, pertanyaan: s.pertanyaan };
  });
  const tersulit = [...soalStats].sort((a, b) => a.pct - b.pct)[0];

  // Siswa yang belum mengerjakan
  const submittedIds = new Set(subs.map(s => s.siswaId));
  const belumNgerjain = siswaList.filter(s => !submittedIds.has(s.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Quick stats */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { l: "Rata-rata", v: avg, c: avg >= 80 ? "var(--accent-2)" : avg >= 60 ? "#9a7d2e" : "#a85f5f" },
          { l: "Tertinggi", v: max, c: "var(--accent-2)" },
          { l: "Terendah", v: min, c: min < 60 ? "#a85f5f" : "var(--ink)" },
          { l: "Dikerjakan", v: `${subs.length}/${siswaCount}`, c: "var(--ink)" },
        ].map(s => (
          <div key={s.l} style={{ flex: 1, textAlign: "center", padding: "10px 4px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--line-soft)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.c, fontFamily: "var(--mono)" }}>{s.v}</div>
            <div style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Distribusi nilai */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", marginBottom: 10 }}>Distribusi Nilai</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {buckets.map(b => (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: "var(--ink-3)", width: 46, fontFamily: "var(--mono)", textAlign: "right" }}>{b.label}</span>
              <div style={{ flex: 1, height: 8, background: "var(--surface)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(b.count / maxBucket) * 100}%`, background: b.color, borderRadius: 99, transition: "width .4s", minWidth: b.count > 0 ? 6 : 0 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: b.count > 0 ? "var(--ink-2)" : "var(--ink-4)", width: 16, textAlign: "right" }}>{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Soal tersulit highlight */}
      {tersulit && tersulit.pct < 70 && (
        <div style={{ padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--line)", borderLeft: "3px solid #c98a8a", borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a85f5f", marginBottom: 3, letterSpacing: ".04em" }}>SOAL PALING SULIT</div>
          <div style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.45 }}>Soal {tersulit.i + 1}: {tersulit.pertanyaan?.slice(0, 60)}{tersulit.pertanyaan?.length > 60 ? "..." : ""} <b style={{ color: "#a85f5f" }}>({tersulit.pct}% benar)</b></div>
        </div>
      )}

      {/* Tombol full analisis */}
      <button className="btn btn-outline btn-sm" onClick={() => navigate("analisis-tugas", { tugasId: tugas.id })} style={{ alignSelf: "flex-start" }}>
        Analisis lengkap per soal <I n="chevR" s={12} />
      </button>

      {/* Belum mengerjakan */}
      <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
        {belumNgerjain.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--accent-2)", fontWeight: 600 }}>
            <I n="check" s={14} /> Semua siswa sudah mengerjakan tugas ini
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Belum mengerjakan ({belumNgerjain.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {belumNgerjain.map(s => (
                <button key={s.id} onClick={() => navigate("chat", { openChat: s.id })}
                  title={`Chat ${s.nama}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px 5px 5px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 99, cursor: "pointer", fontFamily: "var(--font)" }}>
                  <UserAvatar userId={s.id} name={s.nama} size="xs" store={null} />
                  <span style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 500 }}>{getFirstName(s.nama)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DashboardGuru({ store, navigate }) {
  const [jenjang, setJenjang] = useState("VII");
  const [showLaporan, setShowLaporan] = useState(false);
  const [expandedTugas, setExpandedTugas] = useState(null);
  const tugasAll = store.getTugas().filter(t => t.jenjang === jenjang);
  const lb = store.getLeaderboard(jenjang);
  const siswa = store.getAllSiswa(jenjang);
  const subs = store.getSubs();
  const totalSubs = subs.filter(s => { const t = store.getTugas().find(x => x.id === s.tugasId); return t && t.jenjang === jenjang; }).length;
  const tugasAktif = tugasAll.filter(t => fmtDl(t.deadline).tone !== "bad");
  const tugasLewat = tugasAll.filter(t => fmtDl(t.deadline).tone === "bad");
  const pctNgerjain = tugasAll.length === 0 ? "—"
    : `${Math.min(100, Math.round((totalSubs / (tugasAll.length * (siswa.length || 1))) * 100))}%`;

  // 5 tugas terbaru (newest first) — sort by createdAt desc
  const tugasTerbaru = [...tugasAll].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  }).slice(0, 5);

  // Rata poin kelas
  const rataPoin = lb.length ? Math.round(lb.reduce((a,s) => a + (s.poin||0), 0) / lb.length) : 0;

  // Perlu perhatian: siswa dengan tugas paling sedikit
  const perluPerhatian = [...lb].sort((a,b) => (a.tugasSelesai||0) - (b.tugasSelesai||0)).slice(0, 3).filter(s => (s.tugasSelesai||0) < tugasAktif.length);

  // Dynamic greeting
  const hour = new Date().getHours();
  const greetingGuru = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return <>
    {showLaporan && <LaporanModal store={store} onClose={() => setShowLaporan(false)} />}
    <div className="page">
      {/* Greeting */}
      <div style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 3 }}>{greetingGuru}!</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Halo, Pak Fatta</h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>M. Hasanul Fatta, S.Pd.</p>
      </div>
      <div className="dt" style={{ paddingTop: 0, marginBottom: 8 }}>
        <div />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => backupFromStore(store)} title="Download backup data"><I n="chartBar" s={13} /> Backup</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowLaporan(true)}><I n="chartBar" s={13} /> Laporan</button>
          <button className="btn btn-outline btn-sm" onClick={() => exportNilai(store, jenjang)}><I n="chartBar" s={13} /> Export Nilai</button>
          <button className="btn btn-primary" onClick={() => navigate("buat-tugas")}><I n="plus" s={14} /> Tugas baru</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${jenjang === "VII" ? "active" : ""}`} onClick={() => setJenjang("VII")}>Kelas VII</button>
        <button className={`tab ${jenjang === "VIII" ? "active" : ""}`} onClick={() => setJenjang("VIII")}>Kelas VIII</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { l: "Tugas aktif", v: tugasAktif.length, icon: "book", cls: "mini-icon-2" },
          { l: "Sudah ngerjain", v: pctNgerjain, icon: "checkCircle", cls: "mini-icon-1" },
          { l: "Rata poin kelas", v: rataPoin.toLocaleString("id-ID"), icon: "chartBar", cls: "mini-icon-3" },
          { l: tugasLewat.length > 0 ? "Lewat deadline" : "Total siswa", v: tugasLewat.length > 0 ? tugasLewat.length : siswa.length, icon: tugasLewat.length > 0 ? "clock" : "user", cls: tugasLewat.length > 0 ? "mini-icon-bad" : "mini-icon-1" },
        ].map(s => (
          <Card key={s.l} style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`mini-icon ${s.cls}`} style={{ margin: 0, flexShrink: 0 }}><I n={s.icon} s={17} /></div>
            <div>
              <div className="stat-num" style={{ fontSize: 20, fontWeight: 800 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{s.l}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tugas Terbaru (merged dengan analisis inline) */}
      <div className="sh" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Tugas Terbaru</h2>
        {tugasAll.length > 5 && <button className="btn btn-ghost btn-sm" onClick={() => navigate("tugas-guru")}>Semua Tugas <I n="chevR" s={12} /></button>}
      </div>
      {tugasTerbaru.length === 0 ? (
        <Card><div className="empty empty-box"><I n="book" s={32} /><h3>Belum ada tugas</h3><p>Buat tugas pertama untuk Kelas {jenjang}!</p><button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate("buat-tugas")}><I n="plus" s={14} /> Buat Tugas</button></div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {tugasTerbaru.map(t => {
            const dl = fmtDl(t.deadline);
            const tugasSubs = subs.filter(s => s.tugasId === t.id);
            const subCount = tugasSubs.length;
            const isExpanded = expandedTugas === t.id;
            const avgNilai = subCount > 0 ? Math.round(tugasSubs.reduce((a, s) => a + s.nilai, 0) / subCount) : null;
            const color = avgNilai === null ? "var(--ink-3)" : avgNilai >= 80 ? "var(--good)" : avgNilai >= 60 ? "var(--warn)" : "var(--bad)";
            const label = avgNilai === null ? "Belum ada" : avgNilai >= 80 ? "Mudah" : avgNilai >= 60 ? "Sedang" : "Sulit";
            return (
              <Card key={t.id} pad="none" style={{ overflow: "hidden" }}>
                {/* Header — clickable */}
                <button onClick={() => setExpandedTugas(isExpanded ? null : t.id)}
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 16px", fontFamily: "var(--font)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".05em" }}>{t.mapel}{t.materi ? ` · ${t.materi}` : ""}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{t.judul}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span>
                        <span className="chip">{t.soal?.length || 0} soal</span>
                        <span className="chip">{subCount} dikerjakan</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      {avgNilai !== null && (
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color }}>{avgNilai}</div>
                          <div style={{ fontSize: 10, color, fontWeight: 600 }}>{label}</div>
                        </div>
                      )}
                      <I n={isExpanded ? "chevD" : "chevR"} s={16} style={{ color: "var(--ink-3)" }} />
                    </div>
                  </div>
                </button>

                {/* Expanded analysis inline */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--line)", padding: "14px 16px", background: "var(--surface-alt)" }}>
                    {subCount === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", padding: "12px 0" }}>Belum ada siswa yang mengerjakan tugas ini.</div>
                    ) : (
                      <DashboardTugasAnalisis tugas={t} subs={tugasSubs} siswaList={siswa} navigate={navigate} />
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Top performer + Perlu perhatian */}
      <div className="g2" style={{ marginBottom: 20 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><I n="trophy" s={14} style={{ color: "#b45309" }} /> Top performer</div>
          {lb.length === 0 ? <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Belum ada data</div> :
            lb.slice(0, 3).map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 2 ? "1px solid var(--line-soft)" : "none" }}>
                <div className={`lb-rank ${i === 0 ? "top1" : i === 1 ? "top2" : "top3"}`} style={{ fontSize: 11 }}>{i + 1}</div>
                <UserAvatar userId={s.id} name={s.nama} size="sm" store={store} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nama}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{s.tugasSelesai || 0} tugas</div>
                </div>
                <div className="stat-num" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-2)" }}>{s.poin.toLocaleString("id-ID")}</div>
              </div>
            ))}
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><I n="alert" s={14} style={{ color: "var(--warn)" }} /> Perlu perhatian</div>
          {perluPerhatian.length === 0 ? <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Semua siswa aktif</div> :
            perluPerhatian.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < perluPerhatian.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
                <UserAvatar userId={s.id} name={s.nama} size="sm" store={store} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nama}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{s.tugasSelesai || 0}/{tugasAktif.length} tugas · streak {s.streak || 0}</div>
                </div>
                <button className="btn btn-warn btn-sm" style={{ fontSize: 10, padding: "4px 10px" }}
                  onClick={() => navigate("chat", { openChat: s.id })}>
                  Follow up
                </button>
              </div>
            ))}
        </Card>
      </div>

    </div>
  </>;
}


// ─── ANALISIS TUGAS DETAIL ───
// ─── NILAI ESSAY MODAL ───
function NilaiEssayModal({ tugas, store, onClose }) {
  const allSubs = store.getSubs().filter(s => s.tugasId === tugas.id);
  // Filter siswa yang punya essay perlu dinilai
  const subsWithEssay = allSubs.filter(sub => (sub.soalResults || []).some(r => r.statusNilai === "perlu_dinilai"));
  const siswaList = store.getAllSiswa();
  const [activeSubIdx, setActiveSubIdx] = useState(0);
  const [savingFor, setSavingFor] = useState(null);

  const essaySoals = (tugas.soal || []).map((s, i) => ({ ...s, idx: i })).filter(s => s.type === "essay" || s.type === "refleksi");

  if (subsWithEssay.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3>Tidak ada jawaban untuk dinilai</h3>
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Semua essay/refleksi sudah dinilai. ✅</p>
          <div className="modal-actions" style={{ marginTop: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    );
  }

  const currentSub = subsWithEssay[activeSubIdx];
  const siswa = siswaList.find(s => s.id === currentSub?.siswaId);

  async function nilaiEssay(soalIdx, nilaiEssay, komentar) {
    setSavingFor(soalIdx);
    try {
      const newResults = currentSub.soalResults.map(r => {
        if (r.origIdx === soalIdx && r.statusNilai === "perlu_dinilai") {
          return { ...r, statusNilai: "dinilai", nilaiEssay: Number(nilaiEssay), komentarGuru: komentar || "" };
        }
        return r;
      });
      // Hitung ulang nilai total
      const allResults = newResults;
      let totalPoinBaru = 0;
      let correctCountBaru = 0;
      allResults.forEach(r => {
        if (r.correct === true) { totalPoinBaru += r.poinSoal; correctCountBaru++; }
        else if (r.statusNilai === "dinilai") {
          // Tambah poin proporsional dari nilai essay (nilai/100 * poinSoal)
          totalPoinBaru += Math.round((r.nilaiEssay / 100) * r.poinSoal);
          if (r.nilaiEssay >= 60) correctCountBaru++;
        }
      });
      // Pakai total soal SAAT SISWA SUBMIT (snapshot di currentSub.total), bukan jumlah soal sekarang.
      // Kalau guru edit tugas (tambah/hapus soal) setelah siswa submit, nilai siswa tidak boleh berubah
      // gara-gara denominator berubah. Fallback ke tugas.soal.length kalau snapshot tidak ada (data lama).
      const totalSoal = currentSub.total || (tugas.soal || []).length || 1;
      const nilaiBaru = Math.round((correctCountBaru / totalSoal) * 100);

      await update(ref(db, `submissions/${currentSub.id}`), {
        soalResults: newResults,
        nilai: nilaiBaru,
        poinDapat: totalPoinBaru,
        correctCount: correctCountBaru,
      });

      // Update stats siswa (selisih poin)
      const selisihPoin = totalPoinBaru - (currentSub.poinDapat || 0);
      if (selisihPoin !== 0) {
        const stats = store.getStats(currentSub.siswaId);
        await update(ref(db, `stats/${currentSub.siswaId}`), {
          poin: (stats.poin || 0) + selisihPoin,
        });
      }
    } catch (e) {
      alert("Gagal menyimpan nilai: " + e.message);
    } finally {
      setSavingFor(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600, maxHeight: "92vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Nilai Manual</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--ink-3)" }}>×</button>
        </div>

        {/* Siswa navigator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", paddingBottom: 2 }}>
          {subsWithEssay.map((sub, i) => {
            const s = siswaList.find(x => x.id === sub.siswaId);
            const isCurrent = i === activeSubIdx;
            const perluDinilai = (sub.soalResults || []).filter(r => r.statusNilai === "perlu_dinilai").length;
            return (
              <button key={sub.id} onClick={() => setActiveSubIdx(i)} title={s?.nama || sub.siswaId} style={{
                height: 28, padding: "0 12px",
                borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${isCurrent ? "var(--accent)" : "var(--line)"}`,
                background: isCurrent ? "var(--accent)" : "var(--surface)",
                color: isCurrent ? "#fff" : "var(--ink-2)",
                maxWidth: 200, whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                lineHeight: 1,
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{s?.nama || s?.namaDisplay || sub.siswaId}</span>
                {perluDinilai > 0 && <span style={{ minWidth: 16, height: 16, padding: "0 5px", background: isCurrent ? "rgba(255,255,255,.28)" : "#fef3c7", color: isCurrent ? "#fff" : "#92400e", borderRadius: 999, fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1 }}>{perluDinilai}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 4px" }}>
          <div style={{ marginBottom: 14, padding: "10px 12px", background: "var(--accent-tint)", borderRadius: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: "var(--accent-2)" }}>{siswa?.nama || siswa?.namaDisplay || currentSub.siswaId}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{essaySoals.length} essay dalam tugas ini</div>
          </div>

          {essaySoals.map(s => {
            const result = currentSub.soalResults?.find(r => r.origIdx === s.idx);
            const isDinilai = result?.statusNilai === "dinilai";
            return (
              <EssayCard key={s.idx} soal={s} result={result} isDinilai={isDinilai} saving={savingFor === s.idx} onNilai={(n, k) => nilaiEssay(s.idx, n, k)} />
            );
          })}
        </div>

        <div className="modal-actions" style={{ marginTop: 14 }}>
          {activeSubIdx > 0 && <button className="btn btn-outline btn-sm" onClick={() => setActiveSubIdx(activeSubIdx - 1)}>← Siswa sebelumnya</button>}
          <div style={{ flex: 1 }} />
          {activeSubIdx < subsWithEssay.length - 1 && <button className="btn btn-primary btn-sm" onClick={() => setActiveSubIdx(activeSubIdx + 1)}>Siswa berikutnya →</button>}
        </div>
      </div>
    </div>
  );
}

function EssayCard({ soal, result, isDinilai, saving, onNilai }) {
  const [nilai, setNilai] = useState(result?.nilaiEssay ?? "");
  const [komentar, setKomentar] = useState(result?.komentarGuru || "");
  const isRefleksi = soal.type === "refleksi";

  return (
    <Card pad="md" style={{ marginBottom: 10, border: isDinilai ? "1.5px solid var(--good)" : "1.5px solid #fde68a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>SOAL {soal.idx + 1} · {isRefleksi ? "REFLEKSI" : "ESSAY"}</span>
        {isDinilai ? <span className="chip chip-good" style={{ fontSize: 10 }}>✓ Dinilai · {result.nilaiEssay}/100</span> : <span style={{ fontSize: 10, padding: "1px 6px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontWeight: 600 }}>Perlu dinilai</span>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{soal.pertanyaan}</div>
      {soal.gambar && <img src={soal.gambar} alt="" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 6, marginBottom: 8 }} />}

      {soal.kataKunci && (
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8, padding: "6px 10px", background: "var(--surface-alt)", borderRadius: 6 }}>
          <b>Kata kunci:</b> {soal.kataKunci}
        </div>
      )}
      {soal.panduanNilai && (
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8, padding: "6px 10px", background: "var(--surface-alt)", borderRadius: 6 }}>
          <b>Panduan:</b> {soal.panduanNilai}
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4, fontWeight: 600 }}>Jawaban Siswa:</div>
        {isRefleksi ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["k1", "k2", "k3", "k4"].map((key, i) => {
              const label = soal[`labelKolom${i + 1}`] || ["Prediksi saya", "Yang saya observasi", "Yang salah/bug", "Pelajaran yang saya ambil"][i];
              const val = result?.jawabanRefleksi?.[key] || "";
              return (
                <div key={key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-2)", marginBottom: 2 }}>{i + 1}. {label}</div>
                  <div style={{ padding: "6px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {val || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>(kosong)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {result?.jawabanEssay || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>(tidak menjawab)</span>}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ width: 90 }}>
          <label className="lbl" style={{ fontSize: 11 }}>Nilai (0-100)</label>
          <input className="inp" type="number" min={0} max={100} value={nilai} onChange={e => setNilai(e.target.value)} style={{ fontFamily: "var(--mono)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="lbl" style={{ fontSize: 11 }}>Komentar (opsional)</label>
          <input className="inp" value={komentar} onChange={e => setKomentar(e.target.value)} placeholder="Feedback untuk siswa..." />
        </div>
        <button className="btn btn-primary btn-sm" disabled={saving || nilai === "" || nilai < 0 || nilai > 100} onClick={() => onNilai(nilai, komentar)}>
          {saving ? "..." : isDinilai ? "Update" : "Simpan"}
        </button>
      </div>
    </Card>
  );
}

function AnalisisTugasDetail({ store, tugasId, navigate, onBack }) {
  const t = store.getTugas().find(x => x.id === tugasId);
  if (!t) return <div className="empty">Tugas tidak ditemukan.</div>;
  const subs = store.getSubs().filter(s => s.tugasId === t.id);
  const total = subs.length;
  const [nilaiEssayTarget, setNilaiEssayTarget] = useState(null);
  const hasEssay = (t.soal || []).some(s => s.type === "essay");
  const perluDinilai = subs.filter(sub => (sub.soalResults || []).some(r => r.statusNilai === "perlu_dinilai")).length;

  if (total === 0) return <div className="empty">Belum ada siswa yang mengerjakan.</div>;

  const avgNilai = Math.round(subs.reduce((a, s) => a + s.nilai, 0) / total);
  const feedback = avgNilai >= 85
    ? "Soal tergolong mudah dikuasai siswa. Pertimbangkan meningkatkan kompleksitas soal untuk menantang siswa lebih jauh."
    : avgNilai >= 65
      ? "Tingkat kesulitan soal cukup baik. Sebagian siswa sudah memahami materi, namun masih ada ruang untuk perbaikan."
      : "Soal tergolong sulit bagi siswa. Pertimbangkan mengulang materi sebelum memberikan tugas serupa.";

  // Hitung akurasi per soal dari soalResults
  const soalStats = (t.soal || []).map((s, i) => {
    const correctCount = subs.filter(sub => {
      const r = sub.soalResults?.find(x => x.origIdx === i);
      if (!r) return false;
      if (s.type === "essay") {
        // Essay: dianggap "benar" kalau nilai >= 60
        return r.statusNilai === "dinilai" && (r.nilaiEssay || 0) >= 60;
      }
      return r.correct === true;
    }).length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const label = pct >= 80 ? "Mudah" : pct >= 50 ? "Sedang" : "Sulit";
    const color = pct >= 80 ? "var(--good)" : pct >= 50 ? "var(--warn)" : "var(--bad)";
    const bg = pct >= 80 ? "var(--good-bg)" : pct >= 50 ? "#fffbeb" : "var(--bad-bg)";
    return { ...s, i, correctCount, pct, label, color, bg };
  }).sort((a, b) => a.pct - b.pct); // urutkan dari paling sulit

  // Soal tersulit & termudah
  const tersulit = soalStats[0];
  const termudah = soalStats[soalStats.length - 1];

  return <>
    <div className="topbar">
      <button className="topbar-back" onClick={() => onBack ? onBack() : navigate("home-guru")}><I n="chevL" s={18} /></button>
      <div className="topbar-title">Analisis Soal</div>
      <div style={{ width: 36 }} />
    </div>
    <div className="page">
      <div style={{ paddingTop: 8, paddingBottom: 14 }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>{t.mapel}</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>{t.judul}</h1>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{total} siswa · {t.soal?.length || 0} soal</div>
      </div>

      {/* Banner nilai essay */}
      {hasEssay && (
        <Card pad="lg" style={{ marginBottom: 12, background: perluDinilai > 0 ? "#fef3c7" : "var(--good-bg)", border: `1.5px solid ${perluDinilai > 0 ? "#fde68a" : "#86efac"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", display: "grid", placeItems: "center", color: perluDinilai > 0 ? "#92400e" : "var(--good)", flexShrink: 0 }}>
              <I n={perluDinilai > 0 ? "edit" : "check"} s={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: perluDinilai > 0 ? "#92400e" : "var(--good)" }}>
                {perluDinilai > 0 ? `${perluDinilai} essay perlu dinilai` : "Semua essay sudah dinilai"}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 2 }}>
                {perluDinilai > 0 ? "Klik tombol di sebelah untuk mulai menilai." : "Bagus! Semua submission lengkap."}
              </div>
            </div>
            {perluDinilai > 0 && (
              <button className="btn btn-primary btn-sm" onClick={() => setNilaiEssayTarget(t)}>Nilai Essay</button>
            )}
          </div>
        </Card>
      )}

      {nilaiEssayTarget && <NilaiEssayModal tugas={nilaiEssayTarget} store={store} onClose={() => setNilaiEssayTarget(null)} />}

      {/* Summary */}
      <Card pad="lg" style={{ marginBottom: 12, background: avgNilai >= 80 ? "var(--good-bg)" : avgNilai >= 60 ? "#fffbeb" : "var(--bad-bg)", border: `1.5px solid ${avgNilai >= 80 ? "#86efac" : avgNilai >= 60 ? "#fde68a" : "#fca5a5"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: avgNilai >= 80 ? "var(--good)" : avgNilai >= 60 ? "var(--warn)" : "var(--bad)", letterSpacing: "-.03em", fontFamily: "var(--mono)" }}>{avgNilai}</div>
            <div style={{ fontSize: 10, color: "var(--ink-3)" }}>rata-rata</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{avgNilai >= 85 ? "Mudah" : avgNilai >= 65 ? "Sedang" : "Sulit"}</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>{feedback}</div>
          </div>
        </div>
      </Card>

      {/* Quick insight */}
      {soalStats.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <Card style={{ background: "var(--bad-bg)", border: "1px solid #fca5a5" }}>
            <div style={{ fontSize: 10, color: "var(--bad)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Paling Sulit</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.4, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>Soal {tersulit.i + 1}: {tersulit.pertanyaan}</div>
            <div style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--bad)" }}>{tersulit.correctCount}/{total} benar</div>
          </Card>
          <Card style={{ background: "var(--good-bg)", border: "1px solid #86efac" }}>
            <div style={{ fontSize: 10, color: "var(--good)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Paling Mudah</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.4, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>Soal {termudah.i + 1}: {termudah.pertanyaan}</div>
            <div style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--good)" }}>{termudah.correctCount}/{total} benar</div>
          </Card>
        </div>
      )}

      {/* Per soal — sorted sulit ke mudah */}
      <div className="sh"><h2>Per Soal</h2></div>
      <Card pad="none" style={{ overflow: "hidden", marginBottom: 16 }}>
        {soalStats.map((s, idx) => (
          <div key={s.i} style={{ padding: "14px 16px", borderBottom: idx < soalStats.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>
                  Soal {s.i + 1} · {s.poin || Math.floor(t.poinMax / t.soal.length)} poin
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{s.pertanyaan}</div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: s.color, padding: "3px 8px", background: s.bg, borderRadius: 6 }}>{s.label}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 5, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 99, transition: "width .5s" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0, fontFamily: "var(--mono)" }}>{s.correctCount}/{total} benar ({s.pct}%)</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Distribusi nilai siswa */}
      <div className="sh"><h2>Distribusi Nilai</h2></div>
      <Card pad="none" style={{ overflow: "hidden", marginBottom: 16 }}>
        {subs.slice().sort((a, b) => b.nilai - a.nilai).map((s, i) => {
          const siswa = store.getAllSiswa().find(x => x.id === s.siswaId) || { nama: s.siswaId };
          return (
            <div key={s.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < subs.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", width: 20, textAlign: "right", flexShrink: 0, fontFamily: "var(--mono)" }}>{i + 1}</div>
              <UserAvatar userId={s.siswaId} name={siswa.nama} size="sm" store={store} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{siswa.nama}</div>
                <div style={{ height: 4, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${s.nilai}%`, background: s.nilai >= 80 ? "var(--good)" : s.nilai >= 60 ? "var(--warn)" : "var(--bad)", borderRadius: 99 }} />
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.nilai >= 80 ? "var(--good)" : s.nilai >= 60 ? "var(--warn)" : "var(--bad)", flexShrink: 0, fontFamily: "var(--mono)" }}>{s.nilai}</div>
            </div>
          );
        })}
      </Card>
    </div>
  </>;
}

// ─── TUGAS GURU (halaman daftar tugas) ───
// ─── MATERI MANAGER MODAL (bulk-assign materi ke tugas) ───
function MateriManagerModal({ store, jenjang, onClose, onSuccess }) {
  const tugasList = store.getTugas().filter(t => t.jenjang === jenjang);
  const [edits, setEdits] = useState({}); // {tugasId: materi}
  const [saving, setSaving] = useState(false);
  const [bulkMateri, setBulkMateri] = useState("");
  const [selected, setSelected] = useState(new Set());

  const allMateri = [...new Set(
    tugasList.filter(t => t.materi && t.materi.trim()).map(t => t.materi.trim())
  )].sort();

  function getMateri(t) {
    return edits[t.id] !== undefined ? edits[t.id] : (t.materi || "");
  }
  function setMateri(tid, val) {
    setEdits(e => ({ ...e, [tid]: val }));
  }
  function toggleSelect(tid) {
    const next = new Set(selected);
    if (next.has(tid)) next.delete(tid); else next.add(tid);
    setSelected(next);
  }
  function applyBulk() {
    if (!bulkMateri.trim() || selected.size === 0) return;
    const next = { ...edits };
    selected.forEach(tid => { next[tid] = bulkMateri.trim(); });
    setEdits(next);
    setSelected(new Set());
    setBulkMateri("");
  }

  async function saveAll() {
    setSaving(true);
    try {
      const changes = Object.entries(edits).filter(([tid, m]) => {
        const t = tugasList.find(x => x.id === tid);
        return t && (t.materi || "") !== m;
      });
      for (const [tid, materi] of changes) {
        await store.updateTugas(tid, { materi });
      }
      onSuccess(`${changes.length} tugas diperbarui materinya.`);
    } catch (e) {
      alert("Gagal menyimpan: " + e.message);
      setSaving(false);
    }
  }

  const changeCount = Object.entries(edits).filter(([tid, m]) => {
    const t = tugasList.find(x => x.id === tid);
    return t && (t.materi || "") !== m;
  }).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: "92vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Atur Materi Tugas · Kelas {jenjang}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--ink-3)" }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>Kelompokkan tugas ke dalam materi. Tugas dalam materi sama akan dirata-rata di laporan.</p>

        {/* Bulk assign */}
        {selected.size > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12, padding: 10, background: "var(--accent-tint)", borderRadius: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-2)", whiteSpace: "nowrap" }}>{selected.size} dipilih →</span>
            <input className="inp" value={bulkMateri} onChange={e => setBulkMateri(e.target.value)} placeholder="Materi untuk yang dipilih..." style={{ flex: 1 }} list="materi-list" />
            <button className="btn btn-primary btn-sm" onClick={applyBulk} disabled={!bulkMateri.trim()}>Terapkan</button>
          </div>
        )}
        <datalist id="materi-list">
          {allMateri.map(m => <option key={m} value={m} />)}
        </datalist>

        <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
          {tugasList.length === 0
            ? <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>Belum ada tugas di Kelas {jenjang}.</div>
            : tugasList.map(t => {
              const mat = getMateri(t);
              const changed = (t.materi || "") !== mat;
              return (
                <div key={t.id} style={{ padding: "10px 12px", borderBottom: "1px solid var(--line-soft)", display: "flex", gap: 10, alignItems: "center", background: changed ? "var(--accent-tint)" : "transparent" }}>
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.judul}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{t.mapel}</div>
                  </div>
                  <input className="inp" style={{ width: 180, fontSize: 12, padding: "6px 10px" }} value={mat} onChange={e => setMateri(t.id, e.target.value)} placeholder="— Tanpa Materi —" list="materi-list" />
                </div>
              );
            })
          }
        </div>

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={saving}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={saveAll} disabled={saving || changeCount === 0}>
            {saving ? "Menyimpan..." : `Simpan ${changeCount > 0 ? `(${changeCount})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function TugasGuru({ store, navigate }) {
  const [jenjang, setJenjang] = useState("VII");
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState("aktif");
  const [toast, setToast] = useState("");
  const [showMateriManager, setShowMateriManager] = useState(false);
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }
  const tugasAll = store.getTugas().filter(t => t.jenjang === jenjang);
  const siswa = store.getAllSiswa(jenjang);
  const subs = store.getSubs();

  const aktifList = tugasAll.filter(t => fmtDl(t.deadline).tone !== "bad");
  const lewatList = tugasAll.filter(t => fmtDl(t.deadline).tone === "bad");
  const displayed = filter === "aktif" ? aktifList : filter === "lewat" ? lewatList : tugasAll;

  return <>
    {confirm && <Confirm title="Hapus tugas?" desc="Tugas dihapus permanen. Poin siswa yang sudah mengerjakan tidak berubah." onOk={() => { store.deleteTugas(confirm); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    {toast && <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 500, whiteSpace: "nowrap", boxShadow: "var(--shadow)" }}>{toast}</div>}
    <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Tugas</div><button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-2)" }} onClick={() => navigate("buat-tugas")}><I n="plus" s={22} /></button></div>
    <div className="page">
      <div className="dt">
        <div><h1>Tugas</h1><p>Semua tugas yang pernah dibuat</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowMateriManager(true)}><I n="book" s={14} /> Atur Materi</button>
          <button className="btn btn-primary" onClick={() => navigate("buat-tugas")}><I n="plus" s={14} /> Tugas baru</button>
        </div>
      </div>

      {showMateriManager && <MateriManagerModal store={store} jenjang={jenjang} onClose={() => setShowMateriManager(false)} onSuccess={(msg) => { setShowMateriManager(false); showToast(msg); }} />}

      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={`tab ${jenjang === "VII" ? "active" : ""}`} onClick={() => setJenjang("VII")}>Kelas VII</button>
        <button className={`tab ${jenjang === "VIII" ? "active" : ""}`} onClick={() => setJenjang("VIII")}>Kelas VIII</button>
      </div>

      {/* Filter tabs + counter lewat deadline */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div className="tabs">
          {[["aktif", `Aktif (${aktifList.length})`], ["lewat", `Lewat (${lewatList.length})`], ["semua", "Semua"]].map(([v, l]) =>
            <button key={v} className={`tab ${filter === v ? "active" : ""}`} onClick={() => setFilter(v)}>{l}</button>
          )}
        </div>
        {lewatList.length > 0 && filter !== "lewat" && (
          <span className="chip chip-bad" style={{ fontSize: 11 }}><I n="clock" s={10} />{lewatList.length} lewat</span>
        )}
      </div>

      {displayed.length === 0 ? (
        <Card><div className="empty empty-box"><I n="book" s={32} /><h3>{filter === "lewat" ? "Tidak ada tugas lewat deadline" : "Belum ada tugas"}</h3><p>{filter === "lewat" ? "Semua tugas masih dalam batas waktu." : `Buat tugas pertama untuk Kelas ${jenjang}!`}</p>{filter !== "lewat" && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate("buat-tugas")}><I n="plus" s={14} /> Buat Tugas Pertama</button>}</div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {displayed.map(t => {
            const dl = fmtDl(t.deadline);
            const lewat = dl.tone === "bad";
            const subCount = subs.filter(s => s.tugasId === t.id).length;
            const pct = siswa.length ? Math.round((subCount / siswa.length) * 100) : 0;
            const belumKerjain = siswa.length - subCount;
            return (
              <Card key={t.id} style={{ borderLeft: lewat ? "3px solid var(--bad)" : "none", opacity: lewat ? 0.85 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".05em" }}>{t.mapel}</span>
                      {lewat && <span className="chip chip-bad" style={{ fontSize: 9 }}>Ditutup</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>{t.judul}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span>
                      <span className="chip">{t.soal?.length || 0} soal</span>
                      <span className="chip">+{t.poinMax} pt</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!lewat && <button className="btn btn-soft btn-sm" onClick={() => navigate("edit-tugas", { tugasId: t.id })}><I n="edit" s={13} /></button>}
                      <button className="btn btn-soft btn-sm" title="Duplikat" onClick={() => { store.duplicateTugas(t); showToast?.("Tugas diduplikat!"); }}><I n="copy" s={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm(t.id)}><I n="trash" s={13} /></button>
                    </div>
                    {t.status === "scheduled" && t.scheduledAt && (
                      <span style={{ fontSize: 9, color: "var(--ink-3)", fontWeight: 600 }}>Publish: {new Date(t.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}><div className="progress"><div style={{ width: `${pct}%`, background: pct < 30 ? "var(--bad)" : pct < 70 ? "var(--warn)" : "var(--good)" }} /></div></div>
                  <div className="stat-num" style={{ fontSize: 12, fontWeight: 600 }}>{subCount}/{siswa.length}</div>
                </div>
                <div style={{ fontSize: 11, color: lewat && belumKerjain > 0 ? "var(--bad)" : "var(--ink-3)", marginTop: 6, fontWeight: lewat && belumKerjain > 0 ? 600 : 400 }}>
                  {lewat && belumKerjain > 0
                    ? `${belumKerjain} siswa tidak mengerjakan`
                    : belumKerjain > 0
                      ? `${belumKerjain} siswa belum mengerjakan`
                      : "Semua siswa sudah mengerjakan ✓"
                  }
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  </>;
}

// ─── CHAT ───
function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function ChatThread({ user, contact, store, onBack }) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const msgs = store.getThread(user.id, contact.id);

  useEffect(() => {
    store.markRead(user.id, contact.id);
  }, [msgs.length]);

  useEffect(() => {
    const el = document.getElementById("chat-msgs-end");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send() {
    if (!text.trim() || isSending) return;
    const t = text;
    setText("");
    setIsSending(true);
    try {
      await withTimeout(store.sendMessage(user.id, contact.id, t));
    } catch (e) {
      setText(t); // restore text agar bisa coba kirim ulang
      alert("Pesan gagal terkirim.\n\n" + (e?.message || "Coba lagi."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="chat-thread">
      {/* Header */}
      <div className="chat-thread-hdr">
        <button className="topbar-back" onClick={onBack}><I n="chevL" s={18} /></button>
        <UserAvatar userId={contact.id} name={contact.nama} size="md" store={store} showOnline />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.nama}</span>
            {contact.role !== "guru" && <LevelBadge poin={(store.getStats(contact.id).poin) || 0} size="xs" />}
          </div>
          {(() => {
            const online = store.isOnline(contact.id);
            if (online) return <div style={{ fontSize: 11, color: "var(--good)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><OnlineDot size={7} /> Online</div>;
            const ls = fmtLastSeen(store.getLastSeen(contact.id));
            return <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{ls ? `Terakhir online ${ls}` : (contact.role === "guru" ? "Guru · IPA & Informatika" : `Kelas ${contact.jenjang}`)}</div>;
          })()}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-msgs" style={{ background: "var(--bg)" }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-3)", fontSize: 13 }}>
            <div style={{ marginBottom: 8, opacity: .3 }}><I n="chat" s={32} /></div>
            Belum ada pesan. Mulai percakapan!
          </div>
        )}
        {msgs.map((m, i) => {
          const isMe = m.fromId === user.id;
          const allAcc = store.getAllSiswa ? [...store.getAllSiswa(), store.fbGuru].filter(Boolean) : [];
          const sender = allAcc.find(a => a.id === m.fromId) || { namaDisplay: m.fromId };
          const prevMsg = msgs[i - 1];
          const showName = !isMe && (!prevMsg || prevMsg.fromId !== m.fromId);
          return (
            <div key={m.key || i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              {showName && <div className="msg-name" style={{ marginLeft: 4 }}>{sender?.namaDisplay || getFirstName(sender?.nama || "")}</div>}
              <div className={`msg ${isMe ? "msg-me" : "msg-them"}`}>
                {m.text}
                <div className="msg-time">{fmtTime(m.ts)}</div>
              </div>
            </div>
          );
        })}
        <div id="chat-msgs-end" />
      </div>

      {/* Input */}
      <div className="chat-input-wrap">
        <textarea className="chat-input" rows={1} placeholder="Tulis pesan..." value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ boxShadow: "var(--shadow-sm)" }}
        />
        <button onClick={send} disabled={!text.trim() || isSending} style={{ width: 40, height: 40, borderRadius: "50%", background: (text.trim() && !isSending) ? "var(--accent)" : "var(--surface-alt)", color: (text.trim() && !isSending) ? "#fff" : "var(--ink-4)", border: "none", cursor: (text.trim() && !isSending) ? "pointer" : "default", display: "grid", placeItems: "center", flexShrink: 0, transition: "all .15s" }}>
          <I n="send" s={16} />
        </button>
      </div>
    </div>
  );
}

function ChatScreen({ user, store, params = {} }) {
  const [activeContact, setActiveContact] = useState(null);
  const [tab, setTab] = useState("VII");
  const [showBcModal, setShowBcModal] = useState(false);
  const [editBc, setEditBc] = useState(null);
  const isGuru = user.role === "guru";
  const contacts = store.getContacts(user.id, user.jenjang, user.role);

  // Auto-open chat dari Follow Up button
  useEffect(() => {
    if (params.openChat && contacts.length > 0) {
      const target = contacts.find(c => c.id === params.openChat);
      if (target) setActiveContact(target);
    }
  }, [params.openChat, contacts.length]);
  const broadcasts = isGuru
    ? store.getBroadcasts("semua") // guru lihat semua
    : store.getBroadcasts(user.jenjang);

  async function handleSaveBc({ pesan, target, durasi }) {
    if (editBc) {
      await store.editBroadcast(editBc.id, pesan, target, durasi);
      setEditBc(null);
    } else {
      await store.addBroadcast(pesan, target, durasi);
    }
    setShowBcModal(false);
  }

  // Sort contacts — guru selalu paling atas untuk siswa, lainnya by last message
  const sortContacts = (list) => {
    return [...list].sort((a, b) => {
      // Guru selalu paling atas (untuk siswa)
      if (!isGuru) {
        if (a.role === "guru") return -1;
        if (b.role === "guru") return 1;
      }
      const la = store.getLastMsg(user.id, a.id);
      const lb = store.getLastMsg(user.id, b.id);
      if (la && lb) return lb.ts - la.ts;
      if (la) return -1;
      if (lb) return 1;
      return a.nama.localeCompare(b.nama);
    });
  };

  if (activeContact) {
    return <ChatThread user={user} contact={activeContact} store={store} onBack={() => setActiveContact(null)} />;
  }

  const ContactItem = ({ c }) => {
    const last = store.getLastMsg(user.id, c.id);
    const thread = store.getThread(user.id, c.id);
    const unread = thread.filter(m => m.toId === user.id && !m.read).length;
    return (
      <div className={`chat-item ${unread > 0 ? "unread" : ""}`} onClick={() => setActiveContact(c)}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <UserAvatar userId={c.id} name={c.nama} size="lg" store={store} showOnline={true} />
          {unread > 0 && <div style={{ position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", fontFamily: "var(--mono)", border: "2px solid var(--surface)" }}>{unread > 9 ? "9+" : unread}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: unread > 0 ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nama}</span>
              {c.role === "guru" && <span style={{ fontSize: 10, background: "var(--accent-soft)", color: "var(--accent-2)", borderRadius: 99, padding: "1px 6px", fontWeight: 600 }}>Guru</span>}
              {c.role !== "guru" && <LevelBadge poin={(store.getStats(c.id).poin) || 0} size="xs" showName={false} />}
            </div>
            {last && <div style={{ fontSize: 11, color: "var(--ink-4)", flexShrink: 0 }}>{fmtTime(last.ts)}</div>}
          </div>
          <div style={{ fontSize: 12, color: unread > 0 ? "var(--ink-2)" : "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2, fontWeight: unread > 0 ? 600 : 400 }}>
            {store.isOnline(c.id)
              ? <span style={{ color: "#0d9488", fontWeight: 500, fontSize: 11 }}>Online</span>
              : last ? (last.fromId === user.id ? `Kamu: ${last.text}` : last.text)
                : (() => { const ls = fmtLastSeen(store.getLastSeen(c.id)); return ls ? <span style={{ fontSize: 11 }}>Terakhir online {ls}</span> : (c.role === "guru" ? "IPA & Informatika" : `Kelas ${c.jenjang}`); })()
            }
          </div>
        </div>
        {unread === 0 && <I n="chevR" s={14} style={{ color: "var(--ink-4)", flexShrink: 0 }} />}
      </div>
    );
  };

  // Guru: filter by tab kelas
  const filtered = isGuru
    ? sortContacts(contacts.filter(c => c.jenjang === tab))
    : sortContacts(contacts);

  return (
    <div className="chat-wrap">
      {(showBcModal || editBc) && (
        <BroadcastModal
          existing={editBc}
          onSave={handleSaveBc}
          onClose={() => { setShowBcModal(false); setEditBc(null); }}
        />
      )}
      {isGuru && (
        <div className="topbar">
          <div style={{ width: 36 }} />
          <div className="topbar-title">Pesan</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowBcModal(true)} style={{ fontSize: 11, padding: "5px 10px" }}><I n="send" s={12} /> Broadcast</button>
        </div>
      )}
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="dt">
          <div><h1>Pesan</h1><p>{isGuru ? "Chat dengan semua siswa" : "Chat dengan guru dan teman sekelas"}</p></div>
          {isGuru && <button className="btn btn-primary btn-sm" onClick={() => setShowBcModal(true)}><I n="send" s={13} /> Broadcast</button>}
        </div>

        {/* Broadcast box */}
        {broadcasts.length > 0 && (
          <BroadcastBox
            broadcasts={broadcasts}
            isGuru={isGuru}
            onEdit={b => { setEditBc(b); }}
            onDelete={id => store.deleteBroadcast(id)}
          />
        )}

        {isGuru && (
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${tab === "VII" ? "active" : ""}`} onClick={() => setTab("VII")}>Kelas VII</button>
            <button className={`tab ${tab === "VIII" ? "active" : ""}`} onClick={() => setTab("VIII")}>Kelas VIII</button>
          </div>
        )}
      </div>
      <div className="chat-list" style={{ marginTop: 8 }}>
        <Card pad="none" style={{ overflow: "hidden", margin: "0 16px" }}>
          {filtered.length === 0
            ? <div className="empty" style={{ padding: 32 }}>Belum ada siswa di kelas ini.</div>
            : filtered.map(c => <ContactItem key={c.id} c={c} />)
          }
        </Card>
      </div>
    </div>
  );
}

// ─── KELAS VIEW ───
// ─── EXPORT LAPORAN PRINT-FRIENDLY ───
// ─── BANK SOAL PAGE ───
function BankSoal({ store, navigate }) {
  const [filterMapel, setFilterMapel] = useState("semua");
  const [filterJenjang, setFilterJenjang] = useState("semua");
  const [filterLevel, setFilterLevel] = useState("semua");
  const [filterTag, setFilterTag] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState("");

  const soalList = store.getBankSoal();

  // Filter & search
  const filtered = soalList.filter(s => {
    if (filterMapel !== "semua" && s.mapel !== filterMapel) return false;
    if (filterJenjang !== "semua" && s.jenjang !== filterJenjang) return false;
    if (filterLevel !== "semua" && s.level !== filterLevel) return false;
    if (filterTag && !(s.tags || []).some(t => t.toLowerCase().includes(filterTag.toLowerCase()))) return false;
    if (search && !s.pertanyaan.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Collect all tags
  const allTags = [...new Set(soalList.flatMap(s => s.tags || []))];

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await store.deleteBankSoal(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Soal dihapus.");
    } catch (e) {
      showToast("Gagal menghapus soal: " + (e?.message || "coba lagi"));
    }
  }

  return (
    <div className="page">
      <div className="dt">
        <div>
          <h1>Bank Soal</h1>
          <p>Kelola koleksi soal untuk dipakai ulang di tugas</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplateSoal} title="Download template Excel">
            <I n="chartBar" s={13} /> Template
          </button>
          <label className="btn btn-outline btn-sm" style={{ cursor: "pointer", margin: 0 }} title="Import dari Excel">
            <I n="upload" s={13} /> Import
            <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={async e => {
              const file = e.target.files[0]; if (!file) return;
              try {
                const imported = await importSoalFromExcel(file);
                if (!imported.length) { showToast("Tidak ada soal yang valid di file."); e.target.value = ""; return; }
                // Convert ke format bank soal
                const bankSoalList = imported.map(s => {
                  const base = { mapel: "IPA", jenjang: "VII", level: "sedang", type: s.type === "komplex" ? "kompleks" : s.type === "pasang" ? "pasangkan" : s.type, pertanyaan: s.pertanyaan, gambar: null, tags: (s.tags && s.tags.length) ? s.tags : ["import"], pembahasan: s.pembahasan || "" };
                  if (s.type === "pg") return { ...base, opsi: s.opsi, jawaban: s.jawaban };
                  if (s.type === "tf") return { ...base, jawaban: s.jawaban };
                  if (s.type === "komplex") {
                    const benarOpsi = (s.opsi || []).map((_, i) => (s.jawaban || []).includes(i));
                    return { ...base, opsi: s.opsi, benarOpsi };
                  }
                  if (s.type === "pasang") {
                    const pasangan = (s.kiri || []).map((k, i) => [k, (s.kanan || [])[i] || ""]);
                    return { ...base, pasangan };
                  }
                  if (s.type === "excel") return { ...base, headers: s.headers, table: s.table, opsi: s.opsi, jawaban: s.jawaban };
                  if (s.type === "essay") return { ...base, kataKunci: s.kataKunci || "", panduanNilai: s.panduanNilai || "" };
                  return base;
                });
                await store.addBankSoalBulk(bankSoalList);
                showToast(`${bankSoalList.length} soal berhasil diimport!`);
              } catch (err) {
                showToast("Gagal import: " + err.message);
              }
              e.target.value = "";
            }} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditTarget(null); setShowForm(true); }}>
            <I n="plus" s={13} /> Tambah
          </button>
        </div>
      </div>

      <div className="topbar">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Bank Soal</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplateSoal} title="Template"><I n="chartBar" s={13} /></button>
          <label className="btn btn-outline btn-sm" style={{ cursor: "pointer", margin: 0, padding: "6px 10px" }} title="Import">
            <I n="upload" s={13} />
            <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={async e => {
              const file = e.target.files[0]; if (!file) return;
              try {
                const imported = await importSoalFromExcel(file);
                if (!imported.length) { showToast("Tidak ada soal yang valid."); e.target.value = ""; return; }
                const bankSoalList = imported.map(s => {
                  const base = { mapel: "IPA", jenjang: "VII", level: "sedang", type: s.type === "komplex" ? "kompleks" : s.type === "pasang" ? "pasangkan" : s.type, pertanyaan: s.pertanyaan, gambar: null, tags: (s.tags && s.tags.length) ? s.tags : ["import"], pembahasan: s.pembahasan || "" };
                  if (s.type === "pg") return { ...base, opsi: s.opsi, jawaban: s.jawaban };
                  if (s.type === "tf") return { ...base, jawaban: s.jawaban };
                  if (s.type === "komplex") {
                    const benarOpsi = (s.opsi || []).map((_, i) => (s.jawaban || []).includes(i));
                    return { ...base, opsi: s.opsi, benarOpsi };
                  }
                  if (s.type === "pasang") {
                    const pasangan = (s.kiri || []).map((k, i) => [k, (s.kanan || [])[i] || ""]);
                    return { ...base, pasangan };
                  }
                  if (s.type === "excel") return { ...base, headers: s.headers, table: s.table, opsi: s.opsi, jawaban: s.jawaban };
                  if (s.type === "essay") return { ...base, kataKunci: s.kataKunci || "", panduanNilai: s.panduanNilai || "" };
                  return base;
                });
                await store.addBankSoalBulk(bankSoalList);
                showToast(`${bankSoalList.length} soal berhasil diimport!`);
              } catch (err) {
                showToast("Gagal import: " + err.message);
              }
              e.target.value = "";
            }} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditTarget(null); setShowForm(true); }}><I n="plus" s={13} /></button>
        </div>
      </div>

      {toast && <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: "var(--shadow)" }}>{toast}</div>}
      {deleteTarget && <Confirm title="Hapus soal?" desc={deleteTarget.pertanyaan.slice(0, 80) + "..."} onOk={handleDelete} onCancel={() => setDeleteTarget(null)} />}
      {showForm && <BankSoalForm store={store} editTarget={editTarget} onClose={() => { setShowForm(false); setEditTarget(null); }} onSuccess={() => { setShowForm(false); setEditTarget(null); showToast(editTarget ? "Soal diupdate." : "Soal ditambahkan."); }} />}

      {/* Filter bar */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="inp" placeholder="🔍 Cari pertanyaan..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <select className="inp" style={{ flex: "1 1 110px", maxWidth: 180 }} value={filterMapel} onChange={e => setFilterMapel(e.target.value)}>
              <option value="semua">Semua Mapel</option>
              <option value="IPA">IPA</option>
              <option value="Informatika">Informatika</option>
            </select>
            <select className="inp" style={{ flex: "1 1 110px", maxWidth: 180 }} value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)}>
              <option value="semua">Semua Kelas</option>
              <option value="VII">Kelas VII</option>
              <option value="VIII">Kelas VIII</option>
            </select>
            <select className="inp" style={{ flex: "1 1 110px", maxWidth: 180 }} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
              <option value="semua">Semua Level</option>
              <option value="mudah">Mudah</option>
              <option value="sedang">Sedang</option>
              <option value="sulit">Sulit</option>
            </select>
            <input className="inp" style={{ flex: "1 1 110px", maxWidth: 180 }} placeholder="Filter tag..." value={filterTag} onChange={e => setFilterTag(e.target.value)} />
          </div>
          {allTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allTags.slice(0, 15).map(t => (
                <button key={t} onClick={() => setFilterTag(t)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 99, border: "1px solid var(--line)", background: filterTag === t ? "var(--accent-tint)" : "var(--surface)", color: filterTag === t ? "var(--accent-2)" : "var(--ink-2)", fontWeight: 600, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
        {filtered.length} dari {soalList.length} soal
      </div>

      {filtered.length === 0
        ? <Card><div className="empty empty-box"><I n="book" s={32} /><h3>Belum ada soal</h3><p>Tambah soal pertama atau ubah filter.</p></div></Card>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(s => (
              <Card key={s.id} pad="sm">
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                      <span className="chip chip-info" style={{ fontSize: 10 }}>{s.mapel}</span>
                      <span className="chip" style={{ fontSize: 10, background: "var(--accent-tint)", color: "var(--accent-2)" }}>Kelas {s.jenjang}</span>
                      <span className="chip" style={{ fontSize: 10, background: s.level === "mudah" ? "#d1fae5" : s.level === "sedang" ? "#fef3c7" : "#fee2e2", color: s.level === "mudah" ? "#065f46" : s.level === "sedang" ? "#713f12" : "#991b1b" }}>{s.level}</span>
                      <span className="chip" style={{ fontSize: 10, background: "var(--surface-alt)" }}>{s.type === "pg" ? "Pilihan Ganda" : s.type === "tf" ? "Benar/Salah" : s.type === "kompleks" ? "PG Kompleks" : s.type === "excel" ? "Excel Sandbox" : s.type === "essay" ? "Essay" : s.type === "pseudocode" ? "Pseudocode Trace" : s.type === "debug" ? "Debug Challenge" : s.type === "refleksi" ? "Refleksi" : "Pasangkan"}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.pertanyaan}</div>
                    {(s.tags || []).length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                        {s.tags.map(t => <span key={t} style={{ fontSize: 10, color: "var(--ink-3)" }}>#{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-soft btn-sm" style={{ fontSize: 11 }} onClick={() => { setEditTarget(s); setShowForm(true); }}><I n="edit" s={12} /></button>
                    <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }} onClick={() => setDeleteTarget(s)}><I n="trash" s={12} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
      }
    </div>
  );
}

// ─── BANK SOAL FORM ───
function BankSoalForm({ store, editTarget, onClose, onSuccess }) {
  const init = editTarget || {
    mapel: "IPA", jenjang: "VII", level: "sedang", type: "pg",
    pertanyaan: "", gambar: null, opsi: ["", "", "", ""], jawaban: 0,
    benarOpsi: [false, false, false, false], // untuk kompleks
    pasangan: [["", ""], ["", ""], ["", ""], ["", ""]], // untuk pasangkan
    headers: ["Nama", "Nilai"], table: [["Budi", "85"], ["Sari", "92"], ["Andi", "78"]], // untuk excel
    kataKunci: "", panduanNilai: "", // untuk essay
    pembahasan: "", tags: [],
  };
  const [form, setForm] = useState(init);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addTag() {
    if (!tagInput.trim()) return;
    const newTag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if ((form.tags || []).includes(newTag)) return;
    set("tags", [...(form.tags || []), newTag]);
    setTagInput("");
  }

  function removeTag(t) { set("tags", (form.tags || []).filter(x => x !== t)); }

  async function submit() {
    if (!form.pertanyaan.trim()) return;
    setSaving(true);
    setSubmitErr("");
    try {
      const data = {
        mapel: form.mapel, jenjang: form.jenjang, level: form.level, type: form.type,
        pertanyaan: form.pertanyaan.trim(),
        gambar: form.gambar || null,
        tags: form.tags || [],
        pembahasan: form.pembahasan.trim(),
      };
      if (form.type === "pg") { data.opsi = form.opsi; data.jawaban = form.jawaban; }
      else if (form.type === "tf") { data.jawaban = form.jawaban; }
      else if (form.type === "kompleks") { data.opsi = form.opsi; data.benarOpsi = form.benarOpsi; }
      else if (form.type === "pasangkan") { data.pasangan = form.pasangan; }
      else if (form.type === "excel") { data.headers = form.headers; data.table = form.table; data.opsi = form.opsi; data.jawaban = form.jawaban; }
      else if (form.type === "essay") { data.kataKunci = form.kataKunci || ""; data.panduanNilai = form.panduanNilai || ""; }
      if (editTarget) await store.updateBankSoal(editTarget.id, data);
      else await store.addBankSoal(data);
      onSuccess();
    } catch (e) {
      setSubmitErr(e?.message?.includes("PERMISSION_DENIED")
        ? "Akses ditolak. Firebase Rules belum diupdate untuk Bank Soal."
        : "Gagal menyimpan: " + (e?.message || "error tidak diketahui"));
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <h3>{editTarget ? "Edit Soal" : "Tambah Soal Baru"}</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="fg" style={{ flex: 1 }}>
              <label className="lbl">Mapel</label>
              <select className="inp" value={form.mapel} onChange={e => set("mapel", e.target.value)}>
                <option value="IPA">IPA</option>
                <option value="Informatika">Informatika</option>
              </select>
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label className="lbl">Kelas</label>
              <select className="inp" value={form.jenjang} onChange={e => set("jenjang", e.target.value)}>
                <option value="VII">VII</option>
                <option value="VIII">VIII</option>
              </select>
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label className="lbl">Level</label>
              <select className="inp" value={form.level} onChange={e => set("level", e.target.value)}>
                <option value="mudah">Mudah</option>
                <option value="sedang">Sedang</option>
                <option value="sulit">Sulit</option>
              </select>
            </div>
          </div>

          <div className="fg">
            <label className="lbl">Tipe Soal</label>
            <select className="inp" value={form.type} onChange={e => set("type", e.target.value)}>
              <option value="pg">Pilihan Ganda</option>
              <option value="tf">Benar / Salah</option>
              <option value="kompleks">PG Kompleks (multi jawab)</option>
              <option value="pasangkan">Pasangkan</option>
              <option value="excel">Excel Sandbox (Informatika)</option>
              <option value="essay">Essay (jawaban panjang)</option>
            </select>
          </div>

          <div className="fg">
            <label className="lbl">Pertanyaan</label>
            <textarea className="inp" rows={3} value={form.pertanyaan} onChange={e => set("pertanyaan", e.target.value)} placeholder="Tulis pertanyaan..." />
          </div>

          {/* Gambar (opsional) */}
          <div className="fg">
            <label className="lbl">Gambar (opsional)</label>
            {form.gambar ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={form.gambar} alt="" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, border: "1px solid var(--line)" }} />
                <button type="button" onClick={() => set("gambar", null)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>×</button>
              </div>
            ) : (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1.5px dashed var(--line)", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "var(--ink-2)" }}>
                <I n="plus" s={12} /> Tambah Gambar
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                  const file = e.target.files[0]; if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { alert("Gambar maksimal 5MB"); return; }
                  const compressed = await compressImage(file, 800, 0.7);
                  set("gambar", compressed);
                }} />
              </label>
            )}
          </div>

          {/* PG */}
          {form.type === "pg" && (
            <div className="fg">
              <label className="lbl">Opsi (centang yang benar)</label>
              {form.opsi.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <input type="radio" checked={form.jawaban === i} onChange={() => set("jawaban", i)} />
                  <input className="inp" value={opt} onChange={e => set("opsi", form.opsi.map((o, j) => j === i ? e.target.value : o))} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
          )}

          {/* TF */}
          {form.type === "tf" && (
            <div className="fg">
              <label className="lbl">Jawaban</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className={`btn btn-sm ${form.jawaban === 1 ? "btn-primary" : "btn-outline"}`} style={{ flex: 1 }} onClick={() => set("jawaban", 1)}>Benar</button>
                <button type="button" className={`btn btn-sm ${form.jawaban === 0 ? "btn-primary" : "btn-outline"}`} style={{ flex: 1 }} onClick={() => set("jawaban", 0)}>Salah</button>
              </div>
            </div>
          )}

          {/* Kompleks */}
          {form.type === "kompleks" && (
            <div className="fg">
              <label className="lbl">Opsi (centang semua yang benar)</label>
              {form.opsi.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={form.benarOpsi[i]} onChange={() => set("benarOpsi", form.benarOpsi.map((b, j) => j === i ? !b : b))} />
                  <input className="inp" value={opt} onChange={e => set("opsi", form.opsi.map((o, j) => j === i ? e.target.value : o))} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
          )}

          {/* Pasangkan */}
          {form.type === "pasangkan" && (
            <div className="fg">
              <label className="lbl">Pasangan</label>
              {form.pasangan.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input className="inp" value={p[0]} onChange={e => set("pasangan", form.pasangan.map((x, j) => j === i ? [e.target.value, x[1]] : x))} placeholder="Kiri" />
                  <span style={{ alignSelf: "center", color: "var(--ink-3)" }}>↔</span>
                  <input className="inp" value={p[1]} onChange={e => set("pasangan", form.pasangan.map((x, j) => j === i ? [x[0], e.target.value] : x))} placeholder="Kanan" />
                </div>
              ))}
            </div>
          )}

          {/* Excel Sandbox */}
          {form.type === "excel" && (
            <div className="fg">
              <label className="lbl">Tabel Data + Opsi PG</label>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>Siswa akan menggunakan rumus pada tabel ini, lalu pilih jawaban PG.</div>

              {/* Headers */}
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600 }}>Header Kolom:</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {(form.headers || []).map((h, hi) => (
                  <div key={hi} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{String.fromCharCode(65 + hi)}</span>
                    <input className="inp" style={{ fontSize: 12, padding: "5px 8px", width: 100 }} value={h} placeholder={`Kolom ${hi + 1}`} onChange={e => { const h2 = [...form.headers]; h2[hi] = e.target.value; set("headers", h2); }} />
                    {form.headers.length > 1 && <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "2px 6px" }} onClick={() => {
                      set("headers", form.headers.filter((_, i) => i !== hi));
                      set("table", form.table.map(row => row.filter((_, i) => i !== hi)));
                    }}><I n="x" s={11} /></button>}
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => {
                  set("headers", [...form.headers, `Kolom ${form.headers.length + 1}`]);
                  set("table", form.table.map(row => [...row, ""]));
                }}><I n="plus" s={11} /> Kolom</button>
              </div>

              {/* Table data */}
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600 }}>Data:</div>
              <div style={{ overflowX: "auto", marginBottom: 10, border: "1px solid var(--line)", borderRadius: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-alt)" }}>
                      <th style={{ padding: "4px 8px", fontSize: 10, color: "var(--ink-3)", borderRight: "1px solid var(--line)", width: 30 }}>#</th>
                      {(form.headers || []).map((h, hi) => <th key={hi} style={{ padding: "4px 8px", fontSize: 10, fontWeight: 700, borderRight: "1px solid var(--line)" }}>{String.fromCharCode(65 + hi)} · {h}</th>)}
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.table || []).map((row, ri) => (
                      <tr key={ri}>
                        <td style={{ padding: "4px 8px", textAlign: "center", color: "var(--ink-3)", borderRight: "1px solid var(--line)", borderTop: "1px solid var(--line)", fontFamily: "var(--mono)" }}>{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ borderRight: "1px solid var(--line)", borderTop: "1px solid var(--line)" }}>
                            <input style={{ width: "100%", border: "none", padding: "5px 8px", fontSize: 12, background: "transparent", outline: "none" }} value={cell} onChange={e => {
                              const t2 = form.table.map((r, i) => i === ri ? r.map((c, j) => j === ci ? e.target.value : c) : r);
                              set("table", t2);
                            }} />
                          </td>
                        ))}
                        <td style={{ borderTop: "1px solid var(--line)", textAlign: "center" }}>
                          {form.table.length > 1 && <button type="button" onClick={() => set("table", form.table.filter((_, i) => i !== ri))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 12 }}>×</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, marginBottom: 12 }} onClick={() => set("table", [...form.table, new Array(form.headers.length).fill("")])}><I n="plus" s={11} /> Tambah Baris</button>

              {/* Opsi PG */}
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600 }}>Opsi Jawaban PG (centang yang benar):</div>
              {form.opsi.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <input type="radio" checked={form.jawaban === i} onChange={() => set("jawaban", i)} />
                  <input className="inp" value={opt} onChange={e => set("opsi", form.opsi.map((o, j) => j === i ? e.target.value : o))} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
          )}

          {/* Essay */}
          {form.type === "essay" && (
            <div className="fg">
              <label className="lbl">Essay (dinilai manual)</label>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>Jawaban siswa akan dinilai manual oleh guru.</div>
              <input className="inp" style={{ marginBottom: 8 }} value={form.kataKunci || ""} onChange={e => set("kataKunci", e.target.value)} placeholder="Kata kunci jawaban (pisah dengan koma)" />
              <textarea className="inp" rows={2} value={form.panduanNilai || ""} onChange={e => set("panduanNilai", e.target.value)} placeholder="Panduan penilaian (mis: 100 jika lengkap, 70 jika hanya konsep dasar)" />
            </div>
          )}

          <div className="fg">
            <label className="lbl">Pembahasan (opsional)</label>
            <textarea className="inp" rows={2} value={form.pembahasan} onChange={e => set("pembahasan", e.target.value)} placeholder="Penjelasan jawaban..." />
          </div>

          <div className="fg">
            <label className="lbl">Tags (mis: bab-3, UTS, energi)</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input className="inp" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Ketik tag, tekan Enter" />
              <button type="button" className="btn btn-outline btn-sm" onClick={addTag}>+ Tag</button>
            </div>
            {(form.tags || []).length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {form.tags.map(t => (
                  <span key={t} style={{ fontSize: 11, padding: "3px 8px", background: "var(--accent-tint)", color: "var(--accent-2)", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    #{t} <button type="button" onClick={() => removeTag(t)} style={{ background: "none", border: "none", color: "var(--accent-2)", cursor: "pointer", padding: 0, fontSize: 12 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {submitErr && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--bad-bg)", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 12, color: "var(--bad)" }}>
            ⚠ {submitErr}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving || !form.pertanyaan.trim()}>
            {saving ? "Menyimpan..." : editTarget ? "Update" : "Tambah"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PILIH DARI BANK SOAL MODAL ───
function PilihDariBankSoalModal({ store, defaultMapel, defaultJenjang, onClose, onSelect }) {
  const [filterMapel, setFilterMapel] = useState(defaultMapel || "semua");
  const [filterJenjang, setFilterJenjang] = useState(defaultJenjang || "semua");
  const [filterLevel, setFilterLevel] = useState("semua");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());

  const soalList = store.getBankSoal();
  const filtered = soalList.filter(s => {
    if (filterMapel !== "semua" && s.mapel !== filterMapel) return false;
    if (filterJenjang !== "semua" && s.jenjang !== filterJenjang) return false;
    if (filterLevel !== "semua" && s.level !== filterLevel) return false;
    if (search && !s.pertanyaan.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function selectAll() { setSelected(new Set(filtered.map(s => s.id))); }
  function clearAll() { setSelected(new Set()); }

  function handleSelect() {
    const picked = soalList.filter(s => selected.has(s.id));
    onSelect(picked);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <h3>Pilih Soal dari Bank</h3>
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>Centang soal yang ingin dipakai di tugas ini</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          <input className="inp" placeholder="🔍 Cari pertanyaan..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: "flex", gap: 6 }}>
            <select className="inp" style={{ flex: 1 }} value={filterMapel} onChange={e => setFilterMapel(e.target.value)}>
              <option value="semua">Semua Mapel</option>
              <option value="IPA">IPA</option>
              <option value="Informatika">Informatika</option>
            </select>
            <select className="inp" style={{ flex: 1 }} value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)}>
              <option value="semua">Semua Kelas</option>
              <option value="VII">VII</option>
              <option value="VIII">VIII</option>
            </select>
            <select className="inp" style={{ flex: 1 }} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
              <option value="semua">Semua Level</option>
              <option value="mudah">Mudah</option>
              <option value="sedang">Sedang</option>
              <option value="sulit">Sulit</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "var(--ink-3)" }}>
            <span>{selected.size} dipilih dari {filtered.length} soal</span>
            <button onClick={selectAll} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>Pilih semua</button>
            {selected.size > 0 && <button onClick={clearAll} style={{ background: "none", border: "none", color: "var(--bad)", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>Clear</button>}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
          {filtered.length === 0
            ? <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>Tidak ada soal yang cocok dengan filter.</div>
            : filtered.map(s => (
              <div key={s.id} onClick={() => toggle(s.id)} style={{ padding: "10px 12px", borderBottom: "1px solid var(--line-soft)", cursor: "pointer", background: selected.has(s.id) ? "var(--accent-tint)" : "transparent", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} onClick={e => e.stopPropagation()} style={{ marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, padding: "1px 6px", background: "var(--surface-alt)", color: "var(--ink-2)", borderRadius: 4 }}>{s.type === "pg" ? "PG" : s.type === "tf" ? "TF" : s.type === "kompleks" ? "Kompleks" : s.type === "excel" ? "Excel" : s.type === "essay" ? "Essay" : "Pasangkan"}</span>
                    <span style={{ fontSize: 10, padding: "1px 6px", background: s.level === "mudah" ? "#d1fae5" : s.level === "sedang" ? "#fef3c7" : "#fee2e2", color: s.level === "mudah" ? "#065f46" : s.level === "sedang" ? "#713f12" : "#991b1b", borderRadius: 4 }}>{s.level}</span>
                    <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{s.mapel} · {s.jenjang}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>{s.pertanyaan}</div>
                </div>
              </div>
            ))
          }
        </div>

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleSelect} disabled={selected.size === 0}>
            Tambah {selected.size} Soal ke Tugas
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LAPORAN HELPER ───
function tierIconSvg(tierId, color = "#0d6b7a", size = 12) {
  // Unique gradient ID per tier (size in case multiple sizes used)
  const gid = `gtier-${tierId}-${size}-${Math.floor(Math.random() * 9999)}`;
  const paths = {
    nebula: `
      <defs><radialGradient id="${gid}" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#f0abfc"/><stop offset="60%" stop-color="#a855f7"/><stop offset="100%" stop-color="#581c87"/>
      </radialGradient></defs>
      <circle cx="50" cy="50" r="42" fill="url(#${gid})"/>
      <circle cx="38" cy="38" r="14" fill="#fff" opacity="0.35"/>
      <circle cx="50" cy="50" r="8" fill="#fef3c7" opacity="0.9"/>
      <circle cx="22" cy="28" r="2.5" fill="#fff"/><circle cx="78" cy="38" r="2" fill="#fff"/><circle cx="72" cy="72" r="1.8" fill="#fff" opacity="0.8"/><circle cx="26" cy="68" r="2.2" fill="#fff"/>`,
    bintang: `
      <defs><radialGradient id="${gid}" cx="40%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#fef3c7"/><stop offset="50%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#d97706"/>
      </radialGradient></defs>
      <polygon points="50,8 60,38 92,38 66,58 76,90 50,71 24,90 34,58 8,38 40,38" fill="url(#${gid})" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/>
      <polygon points="50,22 55,38 70,38 58,49 62,65 50,55 38,65 42,49 30,38 45,38" fill="#fef3c7" opacity="0.55"/>
      <circle cx="42" cy="35" r="3" fill="#fff" opacity="0.9"/>`,
    planet: `
      <defs><radialGradient id="${gid}" cx="30%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#a7f3d0"/><stop offset="50%" stop-color="#14b8a6"/><stop offset="100%" stop-color="#064e3b"/>
      </radialGradient></defs>
      <ellipse cx="50" cy="58" rx="46" ry="9" transform="rotate(-15 50 58)" fill="#0e7490" opacity="0.5"/>
      <ellipse cx="50" cy="58" rx="44" ry="8" transform="rotate(-15 50 58)" fill="none" stroke="#fef3c7" stroke-width="3"/>
      <circle cx="50" cy="50" r="30" fill="url(#${gid})" stroke="#064e3b" stroke-width="2"/>
      <ellipse cx="38" cy="38" rx="12" ry="9" fill="#fff" opacity="0.5"/>
      <ellipse cx="50" cy="58" rx="44" ry="8" transform="rotate(-15 50 58)" fill="none" stroke="#fef3c7" stroke-width="3" stroke-dasharray="0,250,80,300"/>`,
    astronot: `
      <defs><radialGradient id="${gid}" cx="30%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#bfdbfe"/><stop offset="60%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1e3a8a"/>
      </radialGradient></defs>
      <ellipse cx="50" cy="92" rx="22" ry="5" fill="#1e3a8a" opacity="0.2"/>
      <path d="M44 22 Q28 38 28 60 L72 60 Q72 38 56 22 Q52 18 48 18 Q46 18 44 22 Z" fill="url(#${gid})" stroke="#1e3a8a" stroke-width="2"/>
      <ellipse cx="50" cy="40" rx="12" ry="10" fill="#fef3c7" stroke="#1e3a8a" stroke-width="2"/>
      <ellipse cx="46" cy="37" rx="4" ry="3" fill="#fff" opacity="0.85"/>
      <path d="M28 60 L18 72 L22 82 L34 76 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>
      <path d="M72 60 L82 72 L78 82 L66 76 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>`,
    commander: `
      <defs><radialGradient id="${gid}" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#fef08a"/><stop offset="40%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#7c2d12"/>
      </radialGradient></defs>
      <circle cx="50" cy="50" r="42" fill="url(#${gid})"/>
      <path d="M50 18 Q72 28 80 50 Q72 60 50 56 Q38 50 36 38 Q42 22 50 18 Z" fill="#fef08a" opacity="0.7"/>
      <path d="M50 82 Q28 72 20 50 Q28 40 50 44 Q62 50 64 62 Q58 78 50 82 Z" fill="#fef08a" opacity="0.7"/>
      <circle cx="50" cy="50" r="9" fill="#fff"/>
      <circle cx="50" cy="50" r="4.5" fill="#fef08a"/>`,
  };
  const body = paths[tierId] || `<circle cx="50" cy="50" r="40" fill="${color}" opacity="0.3"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="vertical-align:-2px;display:inline-block">${body}</svg>`;
}

// Badge inline SVG untuk laporan HTML print (simplified dimensional)
function badgeIconSvg(iconType, rim = "teal", size = 16) {
  const gid = `gbdg-${iconType}-${Math.floor(Math.random() * 99999)}`;
  const rims = {
    amber:  { a: "#f0b429", b: "#b45309", inA: "#fff8e6", inB: "#fde9b8", g: "#b45309" },
    teal:   { a: "#0c7a91", b: "#063f4d", inA: "#eafafb", inB: "#c9eef0", g: "#0c7a91" },
    red:    { a: "#ef5350", b: "#b91c1c", inA: "#fff0ef", inB: "#fbd5d3", g: "#c0392b" },
    violet: { a: "#a78bfa", b: "#6d28d9", inA: "#f4f0ff", inB: "#e0d4fb", g: "#6d28d9" },
    blue:   { a: "#60a5fa", b: "#1d4ed8", inA: "#eef5ff", inB: "#d3e4fb", g: "#1d4ed8" },
    green:  { a: "#4ade80", b: "#15803d", inA: "#effdf4", inB: "#c8f2d6", g: "#15803d" },
    rose:   { a: "#fb7185", b: "#be123c", inA: "#fff1f3", inB: "#fbd0d8", g: "#be123c" },
  };
  const c = rims[rim] || rims.teal;
  const C = c.g;
  // glyph dalam koordinat lokal center (0,0), -18..18
  const glyphs = {
    bullseye: `<g stroke="${C}" stroke-width="2.2" fill="none"><circle r="14"/><circle r="8.5"/><circle r="3" fill="${C}" stroke="none"/></g>`,
    rosette: `<g><circle r="9" stroke="${C}" stroke-width="2.2" fill="none"/><circle r="5" fill="#fff"/><circle r="2.5" fill="${C}"/></g>`,
    crown: `<g fill="${C}"><path d="M-14 7 L-14 -7 L-7 0 L0 -10 L7 0 L14 -7 L14 7 Z"/><rect x="-14" y="7" width="28" height="4" rx="1"/></g>`,
    flame1: `<g><path d="M0 -16 Q-10 -4 -10 6 Q-10 14 0 16 Q10 14 10 4 Q10 -6 0 -16 Z" fill="${C}"/><path d="M0 -3 Q-5 3 -4 9 Q-1 13 2 10 Q5 5 0 -3 Z" fill="#fff" opacity="0.55"/></g>`,
    flame2: `<g><path d="M-2 -16 Q-12 -4 -12 6 Q-12 14 -2 16 Q6 14 6 5 Q6 -5 -2 -16 Z" fill="${C}"/><path d="M7 -8 Q1 0 1 8 Q1 14 8 15 Q14 13 14 6 Q14 -2 7 -8 Z" fill="${C}" opacity="0.7"/></g>`,
    sun: `<g stroke="${C}" stroke-width="2.2"><circle r="8" fill="${C}"/><line x1="0" y1="-12" x2="0" y2="-16"/><line x1="0" y1="12" x2="0" y2="16"/><line x1="-12" y1="0" x2="-16" y2="0"/><line x1="12" y1="0" x2="16" y2="0"/><line x1="-9" y1="-9" x2="-12" y2="-12"/><line x1="9" y1="9" x2="12" y2="12"/><line x1="-9" y1="9" x2="-12" y2="12"/><line x1="9" y1="-9" x2="12" y2="-12"/></g>`,
    footprint: `<g fill="${C}"><ellipse cx="0" cy="2" rx="7" ry="11"/><circle cx="-6" cy="-12" r="2.5"/><circle cx="-1" cy="-14" r="2.5"/><circle cx="4" cy="-13" r="2.3"/><circle cx="8" cy="-9" r="2"/></g>`,
    book: `<g><path d="M-14 -10 Q0 -14 14 -10 L14 12 Q0 8 -14 12 Z" fill="${C}"/><path d="M0 -11 L0 10" stroke="#fff" stroke-width="1.6"/></g>`,
    gradcap: `<g><polygon points="0,-12 16,-5 0,2 -16,-5" fill="${C}"/><path d="M-9 -2 L-9 7 Q0 13 9 7 L9 -2" stroke="${C}" stroke-width="2.2" fill="none"/><line x1="16" y1="-5" x2="16" y2="7" stroke="${C}" stroke-width="2.2"/></g>`,
    shield: `<g><path d="M0 -15 L13 -10 L13 4 Q13 13 0 16 Q-13 13 -13 4 L-13 -10 Z" fill="${C}"/><path d="M-6 0 L-2 5 L7 -6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    stopwatch: `<g stroke="${C}" stroke-width="2.2" fill="none"><circle cx="0" cy="2" r="12"/><line x1="0" y1="-10" x2="0" y2="-14"/><line x1="-4" y1="-14" x2="4" y2="-14"/><line x1="0" y1="2" x2="0" y2="-4"/><line x1="0" y1="2" x2="5" y2="4"/></g>`,
    bolt: `<polygon points="4,-16 -10,4 -1,4 -4,16 11,-4 2,-4" fill="${C}" stroke="${C}" stroke-width="1" stroke-linejoin="round"/>`,
    trophy: `<g><path d="M-9 -12 L9 -12 L8 1 Q8 7 0 8 Q-8 7 -8 1 Z" fill="${C}"/><path d="M-9 -10 Q-15 -10 -15 -4 Q-15 2 -9 2" stroke="${C}" stroke-width="2.2" fill="none"/><path d="M9 -10 Q15 -10 15 -4 Q15 2 9 2" stroke="${C}" stroke-width="2.2" fill="none"/><rect x="-2" y="8" width="4" height="5" fill="${C}"/><rect x="-7" y="13" width="14" height="3" rx="1" fill="${C}"/></g>`,
    podium: `<g fill="${C}"><rect x="-15" y="0" width="9" height="12" rx="1" opacity="0.7"/><rect x="-4.5" y="-8" width="9" height="20" rx="1"/><rect x="6" y="4" width="9" height="8" rx="1" opacity="0.5"/></g>`,
    star1: `<polygon points="0,-15 4,-4 16,-4 6,3 10,14 0,7 -10,14 -6,3 -16,-4 -4,-4" fill="${C}"/>`,
    star2: `<g><polygon points="0,-15 3,-5 14,-5 5,2 8,13 0,6 -8,13 -5,2 -14,-5 -3,-5" fill="${C}"/><polygon points="0,-7 1.5,-2 6,-2 2.5,1 4,6 0,3 -4,6 -2.5,1 -6,-2 -1.5,-2" fill="#fff" opacity="0.6"/></g>`,
    constellation: `<g><g fill="${C}"><circle cx="-11" cy="-8" r="2.5"/><circle cx="2" cy="-12" r="2"/><circle cx="10" cy="-2" r="2.8"/><circle cx="-3" cy="6" r="2"/><circle cx="6" cy="12" r="2.3"/></g><path d="M-11 -8 L2 -12 L10 -2 L-3 6 L6 12" stroke="${C}" stroke-width="1.3" fill="none" opacity="0.7"/></g>`,
    starcrown: `<g><polygon points="0,-15 3.5,-5 14,-5 5.5,2 9,13 0,6 -9,13 -5.5,2 -14,-5 -3.5,-5" fill="${C}"/><path d="M-9 -9 L-4 -6 L0 -11 L4 -6 L9 -9 L8 -3 L-8 -3 Z" fill="#fff" opacity="0.5"/></g>`,
    gem1: `<g><polygon points="0,14 -10,-2 -5,-10 5,-10 10,-2" fill="${C}"/><polygon points="0,14 -10,-2 10,-2" fill="#fff" opacity="0.25"/></g>`,
    gem2: `<g><polygon points="0,15 -12,-1 -6,-11 6,-11 12,-1" fill="${C}"/><polygon points="-6,-11 6,-11 6,-1 -6,-1" fill="#fff" opacity="0.3"/></g>`,
    diamond: `<g><polygon points="0,16 -13,-2 -7,-12 7,-12 13,-2" fill="${C}"/><polygon points="-7,-12 7,-12 13,-2 -13,-2" fill="#fff" opacity="0.35"/></g>`,
    ribbon: `<g><circle cx="0" cy="-4" r="11" fill="${C}"/><circle cx="0" cy="-4" r="6" fill="#fff" opacity="0.5"/><path d="M-7 5 L-10 17 L0 12 L10 17 L7 5" fill="${C}"/></g>`,
    bulb: `<g><path d="M-9 4 Q-13 -1 -13 -6 Q-13 -15 0 -15 Q13 -15 13 -6 Q13 -1 9 4 L9 9 L-9 9 Z" fill="${C}"/><rect x="-7" y="9" width="14" height="3" rx="1" fill="${C}"/></g>`,
    handshake: `<g stroke="${C}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M-14 -2 L-6 -2 L0 2 L8 -4 L14 0"/><path d="M-6 -2 L-2 6 M2 0 L6 7"/></g>`,
    arrowup: `<polygon points="0,-15 11,-2 4,-2 4,14 -4,14 -4,-2 -11,-2" fill="${C}"/>`,
    flag: `<g><line x1="-11" y1="-15" x2="-11" y2="16" stroke="${C}" stroke-width="2.2"/><path d="M-11 -14 L13 -14 L8 -7 L13 0 L-11 0 Z" fill="${C}"/></g>`,
    heart: `<path d="M0 14 Q-14 4 -14 -5 Q-14 -13 -7 -13 Q-2 -13 0 -7 Q2 -13 7 -13 Q14 -13 14 -5 Q14 4 0 14 Z" fill="${C}"/>`,
  };
  const glyph = glyphs[iconType] || `<circle r="10" fill="${C}"/>`;
  return `<svg width="${size}" height="${Math.round(size * 80 / 72)}" viewBox="0 0 72 80" style="vertical-align:-3px;display:inline-block">
    <defs>
      <linearGradient id="${gid}-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c.a}"/><stop offset="100%" stop-color="${c.b}"/></linearGradient>
      <radialGradient id="${gid}-i" cx="50%" cy="36%" r="65%"><stop offset="0%" stop-color="${c.inA}"/><stop offset="100%" stop-color="${c.inB}"/></radialGradient>
    </defs>
    <path d="M36 3 L67 13 L67 42 Q67 67 36 78 Q5 67 5 42 L5 13 Z" fill="url(#${gid}-r)"/>
    <path d="M36 12 L59 20 L59 42 Q59 60 36 70 Q13 60 13 42 L13 20 Z" fill="url(#${gid}-i)"/>
    <g transform="translate(36,40)">${glyph}</g>
  </svg>`;
}

function generateBarSVG(nilai, max = 100, color = "#0d9488") {
  const w = Math.round((nilai / max) * 120);
  return `<svg width="120" height="10" style="vertical-align:middle"><rect width="120" height="10" rx="5" fill="#e2e8f0"/><rect width="${w}" height="10" rx="5" fill="${color}"/></svg>`;
}

function getNilaiColor(n) {
  if (n >= 85) return "#059669";
  if (n >= 70) return "#0d9488";
  if (n >= 55) return "#d97706";
  return "#dc2626";
}

function getNilaiLabel(n) {
  if (n >= 85) return "Sangat Baik";
  if (n >= 70) return "Baik";
  if (n >= 55) return "Cukup";
  return "Perlu Perhatian";
}

// CSS bersama untuk semua laporan
const LAPORAN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Plus Jakarta Sans',system-ui,sans-serif; color:#1a2332; font-size:12px; background:#fff; }
  .page { padding:32px 36px; max-width:800px; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:16px; border-bottom:3px solid #0d6b7a; margin-bottom:24px; }
  .logo { font-size:18px; font-weight:800; color:#0d6b7a; letter-spacing:-.02em; }
  .logo small { display:block; font-size:11px; font-weight:400; color:#7a8fa3; margin-top:2px; }
  .meta { text-align:right; font-size:11px; color:#7a8fa3; line-height:1.7; }
  .section { margin-bottom:20px; }
  .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#0d9488; margin-bottom:10px; padding-bottom:4px; border-bottom:1px solid #e2e8f0; }
  table { width:100%; border-collapse:collapse; }
  th { background:#f0fdfa; color:#0d6b7a; padding:9px 10px; text-align:left; font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; border-bottom:2px solid #0d9488; }
  td { padding:9px 10px; border-bottom:1px solid #f1f5f9; font-size:11px; vertical-align:middle; }
  tr:last-child td { border-bottom:none; }
  .badge-pill { display:inline-block; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:600; margin:1px; }
  .chip-green { background:#d1fae5; color:#065f46; }
  .chip-teal { background:#ccfbf1; color:#0f766e; }
  .chip-yellow { background:#fef9c3; color:#713f12; }
  .chip-red { background:#fee2e2; color:#991b1b; }
  .chip-gray { background:#f1f5f9; color:#475569; }
  .footer { margin-top:24px; padding-top:12px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; }
  .sign-box { text-align:center; }
  .sign-line { width:140px; border-bottom:1px solid #1a2332; margin:40px auto 4px; }
  .page-break { page-break-after:always; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none; }
  }
`;

// ─── LAPORAN PER SISWA ───
function generateLaporanSiswa(s, store, jenjang, periode) {
  const stats = store.getStats(s.id);
  const lv = getLevel(stats.poin || 0);
  const badges = store.getBadges(s.id);
  const allTugas = store.getTugas().filter(t => t.jenjang === jenjang);
  const subs = store.getSubs().filter(sub => sub.siswaId === s.id);
  const now = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
  const nilaiRata = stats.nilaiRata || (subs.length ? Math.round(subs.reduce((a,b) => a+b.nilai,0)/subs.length) : 0);

  // Kelompokkan tugas per materi → hitung rata-rata, jumlah, range nilai
  const materiMap = {};
  allTugas.forEach(t => {
    const key = (t.materi && t.materi.trim()) || "Tanpa Materi";
    if (!materiMap[key]) materiMap[key] = [];
    const sub = subs.find(x => x.tugasId === t.id);
    materiMap[key].push({ tugas: t, nilai: sub ? sub.nilai : null });
  });

  const materiRows = Object.entries(materiMap).map(([materi, items]) => {
    const dikerjakan = items.filter(x => x.nilai !== null);
    const totalTugas = items.length;
    const sudah = dikerjakan.length;
    const nilaiList = dikerjakan.map(x => x.nilai);
    const rata = nilaiList.length ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) : null;
    const min = nilaiList.length ? Math.min(...nilaiList) : null;
    const max = nilaiList.length ? Math.max(...nilaiList) : null;
    const color = rata !== null ? getNilaiColor(rata) : "#94a3b8";
    const label = rata !== null ? getNilaiLabel(rata) : "Belum";
    const range = nilaiList.length > 1 ? `${min}–${max}` : nilaiList.length === 1 ? `${nilaiList[0]}` : "—";
    return `<tr>
      <td style="font-weight:600">${materi}</td>
      <td style="text-align:center;color:#64748b">${sudah}/${totalTugas}</td>
      <td style="text-align:center">
        ${rata !== null ? `<span style="font-weight:700;color:${color}">${rata}</span>` : `<span style="color:#94a3b8">—</span>`}
      </td>
      <td style="text-align:center;color:#64748b;font-family:monospace;font-size:11px">${range}</td>
      <td style="text-align:center">
        <span class="badge-pill ${rata >= 85 ? 'chip-green' : rata >= 70 ? 'chip-teal' : rata >= 55 ? 'chip-yellow' : rata !== null ? 'chip-red' : 'chip-gray'}">${label}</span>
      </td>
      <td>${generateBarSVG(rata || 0, 100, color)}</td>
    </tr>`;
  }).join("");

  const badgeHtml = badges.length
    ? badges.map(bid => {
        const b = ALL_BADGES?.find(x => x.id === bid) || { name: bid, icon: "medal", color: "#0d6b7a" };
        return `<span class="badge-pill chip-teal">${badgeIconSvg(b.icon, b.rim || "teal", 18)} ${b.name}</span>`;
      }).join("")
    : '<span style="color:#94a3b8;font-size:11px">Belum ada badge</span>';

  return `
  <div class="page">
    <div class="header">
      <div>
        <div class="logo">Astrolab · Our Classroom<small>Laporan Hasil Belajar Siswa</small></div>
        <div style="margin-top:8px;font-size:13px;font-weight:700">${s.nama}</div>
        <div style="font-size:11px;color:#64748b">Kelas ${jenjang} · ID: ${s.id}</div>
      </div>
      <div class="meta">
        Periode: <b>${periode}</b><br>
        Dicetak: ${now}<br>
        M. Hasanul Fatta, S.Pd.
      </div>
    </div>

    <!-- Ringkasan -->
    <div class="section">
      <div class="section-title">Ringkasan Capaian</div>
      <table>
        <tr>
          <td style="width:25%;font-weight:600">Total Poin XP</td>
          <td style="font-weight:800;color:#0d9488;font-size:16px">${stats.poin || 0}</td>
          <td style="width:25%;font-weight:600">Level</td>
          <td><span class="badge-pill chip-teal">${tierIconSvg(lv.tierId, lv.color, 16)} ${lv.name}</span></td>
        </tr>
        <tr>
          <td style="font-weight:600">Tugas Selesai</td>
          <td><b>${stats.tugasSelesai || 0}</b> dari ${allTugas.length} tugas</td>
          <td style="font-weight:600">Nilai Rata-rata</td>
          <td style="font-weight:800;color:${getNilaiColor(nilaiRata)};font-size:16px">
            ${nilaiRata || "—"}
            ${nilaiRata ? `<span style="font-size:11px;font-weight:400;margin-left:6px">${getNilaiLabel(nilaiRata)}</span>` : ""}
          </td>
        </tr>
        <tr>
          <td style="font-weight:600">Streak Belajar</td>
          <td>${stats.streak || 0} hari berturut-turut</td>
          <td style="font-weight:600">Badge Diraih</td>
          <td>${badges.length} badge</td>
        </tr>
      </table>
    </div>

    <!-- Badge -->
    <div class="section">
      <div class="section-title">Badge & Penghargaan</div>
      <div style="padding:8px 0">${badgeHtml}</div>
    </div>

    <!-- Detail Nilai per Materi -->
    <div class="section">
      <div class="section-title">Detail Nilai per Materi</div>
      ${allTugas.length === 0
        ? '<p style="color:#94a3b8">Belum ada tugas.</p>'
        : `<table>
          <thead><tr>
            <th>Materi</th>
            <th style="text-align:center">Tugas</th>
            <th style="text-align:center">Rata-rata</th>
            <th style="text-align:center">Rentang</th>
            <th style="text-align:center">Keterangan</th>
            <th>Grafik</th>
          </tr></thead>
          <tbody>${materiRows}</tbody>
        </table>`}
    </div>

    <!-- Catatan Guru -->
    <div class="section">
      <div class="section-title">Catatan Guru</div>
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;min-height:60px;color:#94a3b8;font-size:11px">
        ${nilaiRata >= 85
          ? `${s.namaDisplay} menunjukkan capaian yang sangat baik. Pertahankan konsistensi belajar dan terus tingkatkan kemampuan analitis.`
          : nilaiRata >= 70
            ? `${s.namaDisplay} menunjukkan capaian yang baik. Perlu sedikit peningkatan pada beberapa kompetensi.`
            : nilaiRata >= 55
              ? `${s.namaDisplay} cukup dalam mengikuti pembelajaran. Disarankan untuk lebih aktif berlatih soal dan berkonsultasi.`
              : `${s.namaDisplay} perlu pendampingan lebih intensif. Harap segera berkomunikasi dengan guru untuk remedial.`}
      </div>
    </div>

    <!-- TTD -->
    <div style="display:flex;justify-content:space-between;margin-top:28px;gap:20px">
      <div class="sign-box" style="flex:1">
        <div style="font-size:11px;color:#64748b">Mengetahui,</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Orang Tua / Wali Murid</div>
        <div class="sign-line"></div>
        <div style="font-size:11px;color:#94a3b8">(................................)</div>
      </div>
      <div class="sign-box" style="flex:1">
        <div style="font-size:11px;color:#64748b">Banda Aceh, ${now}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Guru IPA & Informatika</div>
        <div class="sign-line"></div>
        <div style="font-size:12px;font-weight:700">M. Hasanul Fatta, S.Pd.</div>
      </div>
    </div>

    <div class="footer">
      <span>Astrolab · Our Classroom — © 2026 M. Hasanul Fatta</span>
      <span>Dokumen ini digenerate otomatis oleh sistem</span>
    </div>
  </div>`;
}

// ─── LAPORAN PER KELAS ───
function exportLaporan(store, jenjang, mode = "kelas", periode = getPeriodeAktif()) {
  const siswa = store.getAllSiswa(jenjang);
  const tugas = store.getTugas().filter(t => t.jenjang === jenjang);
  const subs = store.getSubs();
  const now = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });

  let bodyContent = "";

  if (mode === "siswa") {
    // Per siswa — 1 halaman per siswa
    bodyContent = siswa.map((s, i) =>
      `${generateLaporanSiswa(s, store, jenjang, periode)}${i < siswa.length - 1 ? '<div class="page-break"></div>' : ''}`
    ).join("");
  } else {
    // Per kelas — rekap semua siswa
    const rows = siswa.map((s, i) => {
      const stats = store.getStats(s.id);
      const lv = getLevel(stats.poin || 0);
      const badges = store.getBadges(s.id);
      const nilaiRata = stats.nilaiRata || 0;
      const rank = i + 1;
      return `<tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${rank}</td>
        <td style="font-weight:600">${s.nama}</td>
        <td style="text-align:center;font-family:monospace">${s.id}</td>
        <td style="text-align:center;font-weight:700;color:#0d9488">${stats.poin || 0}</td>
        <td style="text-align:center">${stats.tugasSelesai || 0}/${tugas.length}</td>
        <td style="text-align:center;font-weight:700;color:${getNilaiColor(nilaiRata)}">${nilaiRata || "—"}</td>
        <td style="text-align:center"><span class="badge-pill chip-teal" style="font-size:10px">${tierIconSvg(lv.tierId, lv.color, 14)} ${lv.name}</span></td>
        <td style="text-align:center">${badges.length}</td>
        <td style="text-align:center">
          <span class="badge-pill ${nilaiRata >= 85 ? 'chip-green' : nilaiRata >= 70 ? 'chip-teal' : nilaiRata >= 55 ? 'chip-yellow' : nilaiRata > 0 ? 'chip-red' : 'chip-gray'}" style="font-size:10px">
            ${getNilaiLabel(nilaiRata)}
          </span>
        </td>
      </tr>`;
    }).join("");

    const avgNilai = siswa.length ? Math.round(siswa.reduce((a, s) => a + (store.getStats(s.id).nilaiRata || 0), 0) / siswa.length) : 0;
    const avgPoin = siswa.length ? Math.round(siswa.reduce((a, s) => a + (store.getStats(s.id).poin || 0), 0) / siswa.length) : 0;

    bodyContent = `
    <div class="page">
      <div class="header">
        <div>
          <div class="logo">Astrolab · Our Classroom<small>Laporan Rekap Hasil Belajar Kelas</small></div>
          <div style="margin-top:6px;font-size:13px;font-weight:700">Kelas ${jenjang}</div>
        </div>
        <div class="meta">
          Periode: <b>${periode}</b><br>
          Dicetak: ${now}<br>
          M. Hasanul Fatta, S.Pd.<br>
          Total siswa: ${siswa.length} · Total tugas: ${tugas.length}
        </div>
      </div>

      <!-- Ringkasan Kelas -->
      <div class="section">
        <div class="section-title">Ringkasan Kelas</div>
        <table>
          <tr>
            <td style="width:25%;font-weight:600">Rata-rata Nilai</td>
            <td style="font-weight:800;color:${getNilaiColor(avgNilai)};font-size:16px">${avgNilai} <span style="font-size:11px;font-weight:400">${getNilaiLabel(avgNilai)}</span></td>
            <td style="width:25%;font-weight:600">Rata-rata Poin XP</td>
            <td style="font-weight:800;color:#0d9488;font-size:16px">${avgPoin}</td>
          </tr>
          <tr>
            <td style="font-weight:600">Siswa Aktif</td>
            <td>${siswa.filter(s => (store.getStats(s.id).tugasSelesai || 0) > 0).length} dari ${siswa.length} siswa</td>
            <td style="font-weight:600">Tingkat Ketuntasan</td>
            <td style="font-weight:700;color:#059669">${siswa.length ? Math.round(siswa.filter(s => (store.getStats(s.id).nilaiRata || 0) >= 70).length / siswa.length * 100) : 0}%</td>
          </tr>
        </table>
      </div>

      <!-- Tabel Rekap -->
      <div class="section">
        <div class="section-title">Rekap Nilai Seluruh Siswa</div>
        <table>
          <thead><tr>
            <th style="text-align:center">#</th>
            <th>Nama Siswa</th>
            <th style="text-align:center">ID</th>
            <th style="text-align:center">Poin XP</th>
            <th style="text-align:center">Tugas</th>
            <th style="text-align:center">Nilai Rata</th>
            <th style="text-align:center">Level</th>
            <th style="text-align:center">Badge</th>
            <th style="text-align:center">Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <!-- TTD -->
      <div style="display:flex;justify-content:space-between;margin-top:24px;gap:20px">
        <div class="sign-box" style="flex:1">
          <div style="font-size:11px;color:#64748b">Mengetahui,</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">Kepala Sekolah</div>
          <div class="sign-line"></div>
          <div style="font-size:11px;color:#94a3b8">(................................)</div>
        </div>
        <div class="sign-box" style="flex:1">
          <div style="font-size:11px;color:#64748b">Banda Aceh, ${now}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">Guru IPA & Informatika</div>
          <div class="sign-line"></div>
          <div style="font-size:12px;font-weight:700">M. Hasanul Fatta, S.Pd.</div>
        </div>
      </div>

      <div class="footer">
        <span>Astrolab · Our Classroom — © 2026 M. Hasanul Fatta</span>
        <span>Dokumen ini digenerate otomatis oleh sistem</span>
      </div>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan ${mode === "siswa" ? "Per Siswa" : "Kelas"} ${jenjang} — Astrolab</title>
<style>${LAPORAN_CSS}</style>
</head>
<body>
  <div class="no-print" style="background:#0d6b7a;color:#fff;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100">
    <span style="font-weight:700">Astrolab · Laporan ${mode === "siswa" ? "Per Siswa" : "Kelas"} ${jenjang} — ${periode}</span>
    <button onclick="window.print()" style="background:#fff;color:#0d6b7a;border:none;padding:8px 18px;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">Cetak / Save PDF</button>
  </div>
  ${bodyContent}
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

// ─── LAPORAN MODAL ───
function LaporanModal({ store, onClose }) {
  const [jenjang, setJenjang] = useState("VII");
  const [mode, setMode] = useState("kelas");
  const [periode, setPeriode] = useState(getPeriodeAktif());

  const periodeOptions = getPeriodeOptions();

  function handleExport() {
    exportLaporan(store, jenjang, mode, periode);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3>Cetak Laporan</h3>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>Pilih format dan periode laporan.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="fg">
            <label className="lbl">Kelas</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["VII","VIII"].map(j => (
                <button key={j} className={`btn btn-sm ${jenjang === j ? "btn-primary" : "btn-outline"}`}
                  style={{ flex: 1, justifyContent: "center" }} onClick={() => setJenjang(j)}>
                  Kelas {j} ({store.getAllSiswa(j).length} siswa)
                </button>
              ))}
            </div>
          </div>

          <div className="fg">
            <label className="lbl">Format Laporan</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { value: "kelas", label: "Rekap Per Kelas", desc: "1 dokumen berisi semua siswa — cocok untuk arsip sekolah" },
                { value: "siswa", label: "Detail Per Siswa", desc: "1 halaman per siswa — cocok untuk dibagikan ke orang tua" },
              ].map(opt => (
                <div key={opt.value} onClick={() => setMode(opt.value)}
                  style={{ padding: "10px 14px", border: `1.5px solid ${mode === opt.value ? "var(--accent)" : "var(--line)"}`, borderRadius: "var(--r-sm)", cursor: "pointer", background: mode === opt.value ? "var(--accent-tint)" : "var(--surface)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: mode === opt.value ? "var(--accent-2)" : "var(--ink)" }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="fg">
            <label className="lbl">Periode</label>
            <select className="inp" value={periode} onChange={e => setPeriode(e.target.value)}>
              {periodeOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleExport}>
            <I n="chartBar" s={13} /> Buka Laporan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ACTIVITY BAR CHART (7 hari terakhir) ───
function ActivityBarChart({ subs }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    // Unique siswa aktif hari itu
    const activeSiswa = new Set(subs.filter(s => s.submittedAt?.slice(0, 10) === dateStr).map(s => s.siswaId));
    return {
      dateStr,
      dayLabel: dayNames[d.getDay()],
      dateLabel: d.getDate(),
      count: activeSiswa.size,
      isToday: i === 6,
    };
  });
  const maxCount = Math.max(...days.map(d => d.count), 1);
  const totalToday = days[6].count;
  const avgWeek = Math.round(days.reduce((a, d) => a + d.count, 0) / 7);

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-2)", fontFamily: "var(--mono)" }}>{totalToday}</div>
          <div style={{ fontSize: 10, color: "var(--ink-3)" }}>siswa aktif hari ini</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink-2)", fontFamily: "var(--mono)" }}>{avgWeek}</div>
          <div style={{ fontSize: 10, color: "var(--ink-3)" }}>rata-rata mingguan</div>
        </div>
      </div>

      {/* Bars */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
        {days.map((d, i) => {
          const heightPct = (d.count / maxCount) * 100;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div title={`${d.dateStr}: ${d.count} siswa aktif`}
                  style={{
                    width: "100%", maxWidth: 36,
                    height: `${Math.max(heightPct, d.count > 0 ? 8 : 2)}%`,
                    background: d.isToday ? "var(--accent)" : d.count > 0 ? "#7AB2B2" : "var(--surface-alt)",
                    borderRadius: "6px 6px 0 0",
                    transition: "height .4s ease",
                    position: "relative",
                    minHeight: 4,
                  }}>
                  {d.count > 0 && <div style={{ position: "absolute", top: -18, left: 0, right: 0, textAlign: "center", fontSize: 11, fontWeight: 700, color: d.isToday ? "var(--accent)" : "var(--ink-2)" }}>{d.count}</div>}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: d.isToday ? 700 : 500, color: d.isToday ? "var(--accent-2)" : "var(--ink-3)" }}>{d.dayLabel}</div>
                <div style={{ fontSize: 9, color: "var(--ink-4)" }}>{d.dateLabel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KelasView({ store, navigate }) {
  const [jenjang, setJenjang] = useState("VII");
  const lb = store.getLeaderboard(jenjang);
  const allSiswa = store.getAllSiswa();
  const allSubs = store.getSubs();
  const jenjangSubs = allSubs.filter(s => {
    const siswa = store.getAllSiswa().find(x => x.id === s.siswaId);
    return siswa?.jenjang === jenjang;
  });

  return <>
    <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Siswa</div><I n="user" s={18} /></div>
    <div className="page">
      <div className="dt"><div><h1>Siswa</h1><p>Daftar dan performa siswa</p></div></div>

      {/* Quick access */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate("badge-manager")}>
          Kelola Badge
        </button>
        <button className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate("manajemen-siswa")}>
          <I n="user" s={13} /> Akun Siswa ({allSiswa.length})
        </button>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${jenjang === "VII" ? "active" : ""}`} onClick={() => setJenjang("VII")}>Kelas VII ({store.getAllSiswa("VII").length})</button>
        <button className={`tab ${jenjang === "VIII" ? "active" : ""}`} onClick={() => setJenjang("VIII")}>Kelas VIII ({store.getAllSiswa("VIII").length})</button>
      </div>

      {/* Aktivitas bar chart 7 hari */}
      <div className="sh"><h2>Aktivitas 7 Hari Terakhir</h2></div>
      <Card style={{ marginBottom: 16 }}>
        <ActivityBarChart subs={jenjangSubs} />
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10 }}>
          Total {jenjangSubs.length} pengerjaan · {store.getAllSiswa(jenjang).length} siswa
        </div>
      </Card>

      {/* Ranking siswa */}
      <div className="sh"><h2>Ranking Kelas {jenjang}</h2></div>
      {lb.length === 0 ? <Card><div className="empty empty-box"><I n="user" s={32} /><h3>Belum ada data</h3><p>Siswa belum mengerjakan tugas apapun.</p></div></Card> :
        <Card pad="none" style={{ overflow: "hidden" }}>
          {lb.map(s => {
            const lv = getLevel(s.poin || 0);
            const bdgs = store.getBadges(s.id);
            return <div key={s.id} style={{ display: "grid", gridTemplateColumns: "32px 36px 1fr auto", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: "1px solid var(--line-soft)" }}>
              <div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : s.rank === 3 ? "top3" : ""}`}>{s.rank}</div>
              <UserAvatar userId={s.id} name={s.nama} size="sm" store={store} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nama}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: lv.color, display: "inline-flex", alignItems: "center", gap: 3 }}><TierIcon tierId={lv.tierId} size={11} color={lv.color} /> {lv.name}</span>
                  {bdgs.slice(0,3).map(id => { const b = ALL_BADGES.find(x => x.id === id); return b ? <span key={id} title={b.name} style={{ display: "inline-flex" }}><BadgeIcon type={b.icon} rim={b.rim} size={20} /></span> : null; })}
                  {bdgs.length > 3 && <span style={{ fontSize: 10, color: "var(--ink-4)" }}>+{bdgs.length-3}</span>}
                </div>
              </div>
              <div className="stat-num lb-pts">{s.poin.toLocaleString("id-ID")} pt</div>
            </div>;
          })}
        </Card>}
    </div>
  </>;
}

// ─── PROFIL GURU ───
function ProfilGuru({ user, store, navigate }) {
  const photo = store.getPhoto(user.uid || user.id); // reaktif dari Firebase
  const [editing, setEditing] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [showResetSemester, setShowResetSemester] = useState(false);

  // Load profil dari localStorage
  const defaultProfil = {
    nama: user.nama,
    mapel: user.mapel || "IPA & Informatika",
    sekolah: "SMP Negeri 15 Banda Aceh",
    nip: "199911022024211003",
    jabatan: "Guru Mapel",
    tahunMulai: "2024",
    motto: "",
  };
  const [profil, setProfil] = useState(() => {
    try { const s = localStorage.getItem(`astrolab.profil.${user.id}`); return s ? { ...defaultProfil, ...JSON.parse(s) } : defaultProfil; } catch { return defaultProfil; }
  });
  const [form, setForm] = useState(profil);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function saveProfil() {
    try { localStorage.setItem(`astrolab.profil.${user.id}`, JSON.stringify(form)); } catch {}
    setProfil(form);
    setEditing(false);
  }

  const PRESETS = ["#0d6b7a","#1e40af","#7c3aed","#b45309","#0f766e","#c2410c","#be185d","#065f46","#1e3a5f","#4a1d96"];

  function handleUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Foto maksimal 5MB"); return; }
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        await withTimeout(store.savePhoto(user.uid || user.id, ev.target.result));
        setShowPhotoPicker(false);
      } catch (err) {
        alert("Gagal menyimpan foto: " + (err?.message || "coba lagi"));
      }
    };
    reader.readAsDataURL(file);
  }

  function setPreset(color) {
    const initials = profil.nama.trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="100" fill="${color}"/><text x="100" y="130" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-weight="700" font-size="80" fill="white">${initials}</text></svg>`;
    const b64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    withTimeout(store.savePhoto(user.uid || user.id, b64)).catch(e => alert("Gagal menyimpan avatar: " + (e?.message || "coba lagi")));
    setShowPhotoPicker(false);
  }

  return <>
    {showPhotoPicker && (
      <div className="modal-overlay" onClick={() => setShowPhotoPicker(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3>Ganti Foto Profil</h3>
          <p>Pilih warna avatar atau upload foto.</p>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginTop: 14, marginBottom: 6 }}>AVATAR WARNA</div>
          <div className="avatar-grid">
            {PRESETS.map(c => {
              const initials = profil.nama.trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
              return <button key={c} className="avatar-opt" onClick={() => setPreset(c)} style={{ background: c }}><span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "var(--font)" }}>{initials}</span></button>;
            })}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginTop: 12, marginBottom: 8 }}>UPLOAD FOTO</div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1.5px dashed var(--line)", borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 13, color: "var(--ink-2)" }}>
            <I n="user" s={18} /> Pilih foto dari device (maks 2MB)
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
          </label>
          {photo && <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 10, color: "var(--bad)" }} onClick={() => { withTimeout(store.savePhoto(user.uid || user.id, null)).catch(e => alert("Gagal menghapus foto: " + (e?.message || "coba lagi"))); setShowPhotoPicker(false); }}>Hapus foto profil</button>}
        </div>
      </div>
    )}

    <div className="topbar"><button className="topbar-back" onClick={() => navigate("home-guru")}><I n="chevL" s={18} /></button><div className="topbar-title">Profil Saya</div>{!editing ? <button className="btn btn-soft btn-sm" onClick={() => setEditing(true)}>Edit</button> : <button className="btn btn-primary btn-sm" onClick={saveProfil}>Simpan</button>}</div>
    <div className="page">
      <div className="dt"><div><h1>Profil Saya</h1><p>Data diri dan informasi mengajar</p></div>{!editing ? <button className="btn btn-soft btn-sm" onClick={() => setEditing(true)}><I n="edit" s={13} /> Edit Profil</button> : <button className="btn btn-primary btn-sm" onClick={saveProfil}><I n="check" s={13} /> Simpan</button>}</div>

      {/* Hero profil */}
      <Card pad="lg" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Avatar name={profil.nama} size="xl" photo={photo} />
            <button onClick={() => setShowPhotoPicker(true)} style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", color: "#fff", border: "2px solid var(--surface)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <I n="edit" s={12} />
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? <input className="inp" value={form.nama} onChange={e => set("nama", e.target.value)} style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }} /> : <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>{profil.nama}</div>}
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: editing ? 0 : 4 }}>{profil.jabatan} · {profil.sekolah}</div>
            {profil.motto && !editing && <div style={{ fontSize: 13, color: "var(--accent-2)", fontStyle: "italic", marginTop: 8, lineHeight: 1.5 }}>"{profil.motto}"</div>}
          </div>
        </div>
      </Card>

      {/* Data diri */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Informasi Mengajar</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Mata Pelajaran", key: "mapel", icon: "book" },
            { label: "Jabatan", key: "jabatan", icon: "layers" },
            { label: "Tahun Mulai Mengajar", key: "tahunMulai", icon: "clock" },
            { label: "Nama Sekolah", key: "sekolah", icon: "home" },
          ].map(f => (
            <div key={f.key} style={{ display: "flex", alignItems: editing ? "flex-start" : "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: editing ? 0 : 0 }}>
                <I n={f.icon} s={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 3 }}>{f.label}</div>
                {editing
                  ? <input className="inp" value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={{ fontSize: 13, padding: "6px 10px" }} />
                  : <div style={{ fontSize: 14, fontWeight: 500 }}>{profil[f.key] || "—"}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* NIP + Motto */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Data Kepegawaian & Lainnya</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: editing ? "flex-start" : "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <I n="list" s={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 3 }}>NIP</div>
              {editing
                ? <input className="inp" value={form.nip} onChange={e => set("nip", e.target.value)} style={{ fontSize: 13, padding: "6px 10px", fontFamily: "var(--mono)" }} />
                : <div style={{ fontSize: 14, fontWeight: 500, fontFamily: "var(--mono)" }}>{profil.nip || "—"}</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: editing ? "flex-start" : "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <I n="zap" s={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 3 }}>Motto / Quotes</div>
              {editing
                ? <textarea className="inp" value={form.motto} onChange={e => set("motto", e.target.value)} rows={2} placeholder="Tulis kalimat favoritmu..." style={{ fontSize: 13, padding: "6px 10px" }} />
                : <div style={{ fontSize: 14, color: profil.motto ? "var(--ink)" : "var(--ink-4)", fontStyle: profil.motto ? "italic" : "normal" }}>{profil.motto || "Belum diisi"}</div>}
            </div>
          </div>
        </div>
      </Card>

      {/* Zona Berbahaya */}
      <Card pad="lg" style={{ marginTop: 16, border: "1.5px solid #fca5a5", background: "var(--bad-bg)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", color: "var(--bad)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <I n="alert" s={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--bad)", marginBottom: 4 }}>Zona Berbahaya</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 12 }}>
              Reset semester akan menghapus <b>semua submission, statistik, dan badge siswa</b>. Akun siswa, tugas, dan bank soal <b>tetap aman</b>. Aksi ini tidak bisa di-undo.
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => setShowResetSemester(true)}>
              <I n="trash" s={13} /> Reset Semester
            </button>
          </div>
        </div>
      </Card>

      {showResetSemester && <ResetSemesterModal store={store} onClose={() => setShowResetSemester(false)} />}
    </div>
  </>;
}

// ─── RESET SEMESTER MODAL ───
function ResetSemesterModal({ store, onClose }) {
  const [confirmText, setConfirmText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [backupFirst, setBackupFirst] = useState(true);

  const subs = store.getSubs();
  const siswa = store.getAllSiswa();
  const totalSubs = subs.length;
  const totalSiswa = siswa.length;

  async function handleReset() {
    if (confirmText !== "RESET") {
      setError("Ketik RESET untuk konfirmasi");
      return;
    }
    setProcessing(true);
    setError("");

    try {
      // 1. Backup dulu kalau diminta
      if (backupFirst) {
        const backupData = {
          tanggal: new Date().toISOString(),
          submissions: subs,
          stats: siswa.map(s => ({ id: s.id, nama: s.nama, ...store.getStats(s.id) })),
          badges: siswa.reduce((acc, s) => { acc[s.id] = store.getBadges(s.id); return acc; }, {}),
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `astrolab-backup-semester-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // 2. Hapus semua submissions per-child (rules baru tighten ke $subId level)
      const subsSnap = await get(ref(db, "submissions"));
      const subKeys = subsSnap.exists() ? Object.keys(subsSnap.val()) : [];
      const subResults = await Promise.allSettled(
        subKeys.map(key => remove(ref(db, `submissions/${key}`)))
      );
      const failedSubs = subResults.filter(r => r.status === "rejected").length;
      if (failedSubs > 0) {
        throw new Error(`${failedSubs} dari ${subKeys.length} submission gagal dihapus`);
      }

      // 3. Reset semua stats per-child
      const statsSnap = await get(ref(db, "stats"));
      const statKeys = statsSnap.exists() ? Object.keys(statsSnap.val()) : [];
      const statResults = await Promise.allSettled(
        statKeys.map(key => remove(ref(db, `stats/${key}`)))
      );
      const failedStats = statResults.filter(r => r.status === "rejected").length;
      if (failedStats > 0) {
        throw new Error(`${failedStats} dari ${statKeys.length} stats gagal dihapus`);
      }

      // 4. Hapus semua badges per-child
      const badgesSnap = await get(ref(db, "badges"));
      const badgeKeys = badgesSnap.exists() ? Object.keys(badgesSnap.val()) : [];
      const badgeResults = await Promise.allSettled(
        badgeKeys.map(key => remove(ref(db, `badges/${key}`)))
      );
      const failedBadges = badgeResults.filter(r => r.status === "rejected").length;
      if (failedBadges > 0) {
        throw new Error(`${failedBadges} dari ${badgeKeys.length} badges gagal dihapus`);
      }

      // 5. Hapus semua broadcasts (parent-level rule guru sudah allow remove parent)
      await remove(ref(db, "broadcasts"));

      // 6. Hapus semua messages per-thread (clean slate untuk chat)
      const msgsSnap = await get(ref(db, "messages"));
      const threadKeys = msgsSnap.exists() ? Object.keys(msgsSnap.val()) : [];
      const msgResults = await Promise.allSettled(
        threadKeys.map(tid => remove(ref(db, `messages/${tid}`)))
      );
      const failedMsgs = msgResults.filter(r => r.status === "rejected").length;
      if (failedMsgs > 0) {
        throw new Error(`${failedMsgs} dari ${threadKeys.length} thread chat gagal dihapus`);
      }

      setResult({
        submissions: totalSubs,
        siswaReset: totalSiswa,
      });
    } catch (e) {
      setError(e?.message?.includes("PERMISSION_DENIED")
        ? "Akses ditolak. Pastikan login sebagai guru."
        : "Gagal reset: " + (e?.message || "error tidak diketahui"));
      setProcessing(false);
    }
  }

  if (result) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--good-bg)", color: "var(--good)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <I n="check" s={30} />
            </div>
            <h3 style={{ margin: "0 0 8px" }}>Semester Berhasil Direset</h3>
            <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
              <b>{result.submissions}</b> submission dihapus<br />
              <b>{result.siswaReset}</b> siswa di-reset statistiknya<br />
              {backupFirst && <>Backup tersimpan di Downloads</>}
            </p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <h3>Reset Semester</h3>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14 }}>Aksi ini akan menghapus:</p>

        <div style={{ background: "var(--bad-bg)", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8 }}>
            <div>❌ <b>{totalSubs} submission</b> (jawaban siswa)</div>
            <div>❌ Statistik <b>{totalSiswa} siswa</b> (poin, level, streak)</div>
            <div>❌ Semua badge yang sudah didapat</div>
            <div>❌ Semua broadcast/pengumuman</div>
          </div>
        </div>

        <div style={{ background: "var(--good-bg)", border: "1px solid #86efac", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8 }}>
            <div>✅ Akun siswa <b>tetap ada</b></div>
            <div>✅ Tugas yang sudah dibuat <b>tetap ada</b></div>
            <div>✅ Bank Soal <b>tetap ada</b></div>
            <div>✅ Foto profil <b>tetap ada</b></div>
          </div>
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, cursor: "pointer", fontSize: 13 }}>
          <input type="checkbox" checked={backupFirst} onChange={e => setBackupFirst(e.target.checked)} />
          <span><b>Download backup</b> sebelum reset (rekomendasi)</span>
        </label>

        <div className="fg">
          <label className="lbl" style={{ fontSize: 12 }}>Ketik <b>RESET</b> untuk konfirmasi:</label>
          <input className="inp" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Ketik RESET..." style={{ fontFamily: "var(--mono)", letterSpacing: 2 }} autoFocus />
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--bad-bg)", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 12, color: "var(--bad)" }}>
            ⚠ {error}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 18 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={processing}>Batal</button>
          <button className="btn btn-danger btn-sm" onClick={handleReset} disabled={processing || confirmText !== "RESET"}>
            {processing ? "Mereset..." : <><I n="trash" s={13} /> Reset Sekarang</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MANAJEMEN SISWA (Guru) ───
function ManajemenSiswa({ store }) {
  const [jenjang, setJenjang] = useState("VII");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [pwVisible, setPwVisible] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const siswa = store.getAllSiswa(jenjang);
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await withTimeout(store.deleteSiswa(deleteTarget.id));
      const nama = deleteTarget.nama;
      setDeleteTarget(null);
      showToast(`${nama} dihapus.`);
    } catch (e) {
      showToast("Gagal menghapus siswa: " + (e?.message || "coba lagi"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleReset() {
    if (!resetTarget || !newPw.trim()) return;
    setSaving(true);
    try {
      await withTimeout(store.resetPassword(resetTarget.id, newPw.trim()));
      setResetTarget(null); setNewPw("");
      showToast("Password berhasil direset!");
    } catch (e) {
      showToast("Gagal reset password: " + (e?.message || "coba lagi"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="dt">
        <div><h1>Manajemen Siswa</h1><p>Tambah, impor, dan kelola akun siswa</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowImport(true)}><I n="chartBar" s={13} /> Import Excel</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><I n="plus" s={14} /> Tambah Siswa</button>
        </div>
      </div>
      <div className="topbar">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Akun Siswa</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><I n="plus" s={13} /></button>
      </div>

      {toast && <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 500, whiteSpace: "nowrap", boxShadow: "var(--shadow)" }}>{toast}</div>}
      {deleteTarget && <Confirm title={`Hapus ${deleteTarget.nama}?`} desc="Akun siswa akan dihapus permanen." onOk={handleDelete} onCancel={() => setDeleteTarget(null)} />}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <p style={{ marginBottom: 16 }}>Reset password untuk <b>{resetTarget.nama}</b></p>
            <div style={{ padding: "10px 14px", background: "var(--surface-alt)", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              Password saat ini: <span style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{resetTarget.password || "—"}</span>
            </div>
            <div className="fg">
              <label className="lbl">Password Baru</label>
              <input className="inp" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 6 karakter" onKeyDown={e => e.key === "Enter" && handleReset()} autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline btn-sm" onClick={() => { setResetTarget(null); setNewPw(""); }}>Batal</button>
              <button className="btn btn-primary btn-sm" onClick={handleReset} disabled={saving || newPw.trim().length < 6}>{saving ? "Menyimpan..." : "Reset Password"}</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && <TambahSiswaModal store={store} onClose={() => setShowAdd(false)} onSuccess={(id, pw) => { setShowAdd(false); showToast(`Siswa ditambahkan! ID: ${id} · Password: ${pw}`); }} />}
      {showImport && <ImportSiswaModal store={store} onClose={() => setShowImport(false)} onSuccess={(n) => { setShowImport(false); showToast(`${n} siswa berhasil diimpor!`); }} />}

      <div className="tabs" style={{ marginBottom: 16 }}>
        {["VII","VIII"].map(j => (
          <button key={j} className={`tab ${jenjang === j ? "active" : ""}`} onClick={() => setJenjang(j)}>
            Kelas {j} ({store.getAllSiswa(j).length})
          </button>
        ))}
      </div>

      {siswa.length === 0
        ? <Card><div className="empty empty-box"><I n="user" s={32} /><h3>Belum ada siswa</h3><p>Tambah siswa baru atau impor dari Excel.</p></div></Card>
        : <Card pad="none" style={{ overflow: "hidden" }}>
            {siswa.map((s, i) => {
              const st = store.getStats(s.id);
              const lv = getLevel(st.poin || 0);
              const showPw = pwVisible[s.id];
              return (
                <div key={s.id} style={{ padding: "14px 16px", borderBottom: i < siswa.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <Avatar name={s.nama} size="md" photo={store.getPhoto(s.uid || s.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{s.nama}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--accent-2)", background: "var(--accent-tint)", padding: "2px 7px", borderRadius: 5 }}>{s.id}</span>
                        <span style={{ fontSize: 10, color: lv.color, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}><TierIcon tierId={lv.tierId} size={11} color={lv.color} /> {lv.name}</span>
                        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{st.poin || 0} pt</span>
                      </div>
                      {/* Password row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Password:</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", background: "var(--surface-alt)", padding: "2px 7px", borderRadius: 4 }}>
                          {showPw ? (s.password || "—") : "••••••••"}
                        </span>
                        <button onClick={() => setPwVisible(v => ({ ...v, [s.id]: !v[s.id] }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: "2px 4px", fontSize: 11, fontFamily: "var(--font)", fontWeight: 600 }}>
                          {showPw ? "Sembunyikan" : "Lihat"}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-soft btn-sm" style={{ fontSize: 11 }} onClick={() => { setResetTarget(s); setNewPw(""); }}>
                        <I n="edit" s={12} /> Ubah PW
                      </button>
                      <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }} onClick={() => setDeleteTarget(s)}>
                        <I n="trash" s={12} /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
      }

      <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface-alt)", borderRadius: "var(--r)", fontSize: 12, color: "var(--ink-3)", display: "flex", gap: 16 }}>
        <span>Total: <b style={{ color: "var(--ink)" }}>{store.getAllSiswa().length} siswa</b></span>
        <span>Kelas VII: <b style={{ color: "var(--ink)" }}>{store.getAllSiswa("VII").length}</b></span>
        <span>Kelas VIII: <b style={{ color: "var(--ink)" }}>{store.getAllSiswa("VIII").length}</b></span>
      </div>
    </div>
  );
}
// ─── IMPORT SISWA MODAL (Excel) ───
function ImportSiswaModal({ store, onClose, onSuccess }) {
  const [rows, setRows] = useState([]);
  const [progress, setProgress] = useState(null); // { done, total }
  const [results, setResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [jenjang, setJenjang] = useState("VII");
  const [err, setErr] = useState("");

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setErr("");
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      // Skip header row, parse nama
      const parsed = data.slice(1)
        .filter(r => r[0]?.toString().trim())
        .map(r => ({
          nama: r[0]?.toString().trim(),
          jenjang,
        }));
      if (parsed.length === 0) { setErr("File kosong atau format salah."); return; }
      // Preview ID & password yang akan digenerate
      const preview = parsed.map(p => ({
        ...p,
        id: store.genSiswaId(p.nama),
        password: store.genPassword(store.genSiswaId(p.nama)),
      }));
      setRows(preview);
    } catch (e) {
      setErr("Gagal baca file. Pastikan format .xlsx atau .csv.");
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    const res = await store.importSiswaBulk(
      rows.map(r => ({ ...r, jenjang })),
      (done, total) => setProgress({ done, total })
    );
    setResults(res);
    setImporting(false);
    const ok = res.filter(r => r.status === "ok").length;
    if (ok > 0) onSuccess(ok);
  }

  return (
    <div className="modal-overlay" onClick={importing ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <h3>Import Siswa dari Excel</h3>
        <p style={{ marginBottom: 16, fontSize: 13, color: "var(--ink-3)" }}>Upload file Excel dengan kolom: <b>Nama Lengkap</b> (kolom A). ID dan password digenerate otomatis.</p>

        {/* Download template */}
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => {
          const csv = "Nama Lengkap\nM. Alif Ramadhan\nSiti Nurhaliza\nBudi Santoso";
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "template-siswa.csv"; a.click();
        }}>
          Download Template CSV
        </button>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["VII","VIII"].map(j => <button key={j} className={`btn btn-sm ${jenjang === j ? "btn-primary" : "btn-outline"}`} onClick={() => setJenjang(j)}>Kelas {j}</button>)}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1.5px dashed var(--line)", borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 13, color: "var(--ink-2)", marginBottom: 12 }}>
          <I n="chartBar" s={18} /> Upload file Excel / CSV
          <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFile} />
        </label>

        {err && <div style={{ fontSize: 12, color: "var(--bad)", marginBottom: 10 }}>{err}</div>}

        {/* Preview */}
        {rows.length > 0 && !results.length && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>{rows.length} siswa akan diimpor — Preview:</div>
            <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
              {rows.slice(0, 10).map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--line-soft)", fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{r.nama}</span>
                  <div style={{ display: "flex", gap: 8, color: "var(--ink-3)" }}>
                    <span style={{ fontFamily: "var(--mono)" }}>{r.id}</span>
                    <span style={{ fontFamily: "var(--mono)" }}>{r.password}</span>
                  </div>
                </div>
              ))}
              {rows.length > 10 && <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--ink-3)" }}>+{rows.length - 10} lagi...</div>}
            </div>
          </div>
        )}

        {/* Progress */}
        {importing && progress && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>Mengimpor {progress.done}/{progress.total} siswa...</div>
            <div style={{ height: 6, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(progress.done/progress.total)*100}%`, background: "var(--accent)", transition: "width .3s" }} />
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div style={{ marginBottom: 14, maxHeight: 160, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--line-soft)", fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{r.nama}</span>
                <span style={{ color: r.status === "ok" ? "var(--good)" : "var(--bad)", fontWeight: 600 }}>
                  {r.status === "ok" ? `✓ ${r.id}` : `✗ ${r.error?.includes("email-already") ? "ID sudah ada" : "Gagal"}`}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={importing}>Tutup</button>
          {rows.length > 0 && !results.length && (
            <button className="btn btn-primary btn-sm" onClick={handleImport} disabled={importing}>
              {importing ? "Mengimpor..." : `Import ${rows.length} Siswa`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function TambahSiswaModal({ store, onClose, onSuccess }) {
  const [form, setForm] = useState({ nama: "", jenjang: "VII", password: "", customId: "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const autoId = form.nama.trim() ? store.genSiswaId(form.nama) : "—";
  const finalId = form.customId.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || autoId;
  const autoPassword = finalId !== "—" ? store.genPassword(finalId) : "—";

  async function submit() {
    if (!form.nama.trim()) { setErr("Nama lengkap wajib diisi."); return; }
    if (finalId === "—") { setErr("ID tidak valid."); return; }
    setSaving(true); setErr("");
    try {
      const pw = form.password.trim() || autoPassword;
      const namaDisplay = form.nama.trim().split(/\s+/).find(w => {
        const lower = w.toLowerCase().replace(/\./g, "");
        return lower.length > 1 && !["muhammad","muhamad","ahmad","abdul","nur","siti","m","h","a"].includes(lower);
      }) || form.nama.trim().split(" ")[0];
      const { id, password } = await store.addSiswa({
        nama: form.nama.trim(),
        namaDisplay,
        jenjang: form.jenjang,
        kelas: `Kelas ${form.jenjang}`,
        password: pw,
        id: finalId,
      });
      onSuccess(id, password);
    } catch (e) {
      setErr(e.message?.includes("email-already") || e.message?.includes("already in use")
        ? `ID "${finalId}" sudah dipakai. Ganti ID di field bawah.`
        : `Gagal: ${e.message}`);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <h3>Tambah Siswa Baru</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="fg">
            <label className="lbl">Nama Lengkap</label>
            <input className="inp" value={form.nama} onChange={e => set("nama", e.target.value)} placeholder="Contoh: M. Alif Ramadhan" autoFocus />
          </div>
          <div className="fg">
            <label className="lbl">ID Login</label>
            <input className="inp" value={form.customId} onChange={e => set("customId", e.target.value)}
              placeholder={`Otomatis: ${autoId}`} />
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
              ID final: <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)" }}>{finalId}</span>
              {" · "}Password: <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)" }}>{autoPassword}</span>
            </div>
          </div>
          <div className="fg">
            <label className="lbl">Kelas</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["VII","VIII"].map(j => <button key={j} type="button" className={`btn btn-sm ${form.jenjang === j ? "btn-primary" : "btn-outline"}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => set("jenjang", j)}>Kelas {j}</button>)}
            </div>
          </div>
          <div className="fg">
            <label className="lbl">Password (opsional)</label>
            <input className="inp" value={form.password} onChange={e => set("password", e.target.value)} placeholder={`Default: ${autoPassword}`} />
          </div>
        </div>
        {err && <div style={{ fontSize: 12, color: "var(--bad)", marginTop: 10, padding: "8px 12px", background: "var(--bad-bg)", borderRadius: 8 }}>{err}</div>}
        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving}>
            {saving ? "Menyimpan..." : <><I n="plus" s={13} /> Tambah Siswa</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BADGE MANAGER (Guru) ───
function BadgeManager({ store }) {
  const [tab, setTab] = useState("VII");
  const siswaAll = store.getAllSiswa();
  const siswaList = siswaAll;
  const filtered = siswaList.filter(s => s.jenjang === tab);
  const [selected, setSelected] = useState("");
  useEffect(() => {
    if (!selected && filtered.length > 0) setSelected(filtered[0].id);
  }, [tab, filtered.length]);
  const activeSiswa = siswaList.find(s => s.id === selected) || filtered[0];
  const badges = store.getBadges(activeSiswa?.id || "");

  return (
    <div className="page">
      <div className="dt"><div><h1>Manajemen Badge</h1><p>Berikan badge penghargaan kepada siswa</p></div></div>
      <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Badge Siswa</div></div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["VII","VIII"].map(j => <button key={j} className={`btn btn-sm ${tab === j ? "btn-primary" : "btn-outline"}`} onClick={() => { setTab(j); setSelected(siswaList.find(s => s.jenjang === j)?.id || ""); }}>{j}</button>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {filtered.map(s => {
          const st = store.getStats(s.id);
          const lv = getLevel(st.poin || 0);
          const bdgs = store.getBadges(s.id);
          return (
            <button key={s.id} onClick={() => setSelected(s.id)}
              style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `2px solid ${selected === s.id ? "var(--accent)" : "var(--line)"}`, background: selected === s.id ? "var(--accent-soft)" : "var(--surface)", cursor: "pointer", transition: "all .15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Avatar name={s.nama} size="sm" photo={store.getPhoto(s.uid || s.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.namaDisplay}</div>
                  <div style={{ fontSize: 10, color: lv.color, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}><TierIcon tierId={lv.tierId} size={11} color={lv.color} /> {lv.name}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {bdgs.length === 0
                  ? <span style={{ fontSize: 10, color: "var(--ink-4)" }}>Belum ada badge</span>
                  : bdgs.slice(0,4).map(id => { const b = ALL_BADGES.find(x => x.id === id); return b ? <span key={id} title={b.name} style={{ display: "inline-flex" }}><BadgeIcon type={b.icon} rim={b.rim} size={22} /></span> : null; })}
                {bdgs.length > 4 && <span style={{ fontSize: 10, color: "var(--ink-3)" }}>+{bdgs.length - 4}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {activeSiswa && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{activeSiswa.nama}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 14 }}>Badge aktif: {badges.length}</div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>Auto Badge</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {AUTO_BADGES.map(b => {
              const has = badges.includes(b.id);
              return (
                <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 10px", borderRadius: 12, background: has ? b.bg : "var(--surface-alt)", border: `1.5px solid ${has ? b.color + "44" : "var(--line)"}`, minWidth: 72, textAlign: "center" }}>
                  <BadgeIcon type={b.icon} rim={b.rim} size={40} locked={!has} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: has ? b.color : "var(--ink-3)", lineHeight: 1.3 }}>{b.name}</span>
                  <span style={{ fontSize: 9, color: "var(--ink-4)" }}>{has ? "✓ Earned" : "Auto"}</span>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>Manual Badge — Berikan / Cabut</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MANUAL_BADGES.map(b => {
              const has = badges.includes(b.id);
              return (
                <button key={b.id} onClick={() => has ? store.removeBadge(activeSiswa.id, b.id) : store.awardBadge(activeSiswa.id, b.id)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 10px", borderRadius: 12, background: has ? b.bg : "var(--surface-alt)", border: `1.5px solid ${has ? b.color : "var(--line)"}`, minWidth: 76, textAlign: "center", cursor: "pointer", transition: "all .15s", fontFamily: "var(--font)" }}>
                  <BadgeIcon type={b.icon} rim={b.rim} size={44} locked={!has} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: has ? b.color : "var(--ink-3)", lineHeight: 1.3 }}>{b.name}</span>
                  <span style={{ fontSize: 9, color: has ? b.color : "var(--ink-4)", fontWeight: has ? 600 : 400 }}>{has ? "✓ Cabut" : "+ Beri"}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── NAV ───
const SNAV = [{ id: "home", l: "Beranda", ic: "home" }, { id: "leaderboard", l: "Ranking", ic: "trophy" }, { id: "tugas", l: "Tugas", ic: "book" }, { id: "chat", l: "Pesan", ic: "chat" }, { id: "profil", l: "Profil", ic: "user" }];
const GNAV = [{ id: "home-guru", l: "Dashboard", ic: "layers" }, { id: "tugas-guru", l: "Tugas", ic: "book" }, { id: "bank-soal", l: "Bank Soal", ic: "chartBar" }, { id: "leaderboard", l: "Ranking", ic: "trophy" }, { id: "chat", l: "Pesan", ic: "chat" }, { id: "kelas", l: "Siswa", ic: "user" }];

function Sidebar({ user, route, navigate, onLogout, store }) {
  const nav = user.role === "guru" ? GNAV : SNAV;
  const unread = store.getUnreadCount(user.id);
  const photo = store.getPhoto(user.uid || user.id);
  return <aside className="sidebar">
    {nav.map(item => <button key={item.id} className={`side-link ${route === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}>
      <div style={{ position: "relative" }}>
        <I n={item.ic} s={16} />
        {item.id === "chat" && unread > 0 && <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 8, fontWeight: 700, display: "grid", placeItems: "center" }}>{unread > 9 ? "9+" : unread}</div>}
      </div>
      <span>{item.l}</span>
    </button>)}
    <div className="side-foot">
      {/* Klik seluruh area profil → halaman profil */}
      <button onClick={() => navigate(user.role === "guru" ? "profil-guru" : "profil")}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderRadius: "var(--r-sm)", transition: "background .12s" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--surface-alt)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}>
        <Avatar name={user.nama} size="md" photo={photo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="side-user-name">{user.nama}</div>
          <div className="side-user-meta">{user.role === "guru" ? user.mapel + " · Guru" : user.kelas}</div>
        </div>
        <I n="chevR" s={14} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
      </button>
    </div>
  </aside>;
}
function BottomNav({ user, route, navigate, store }) {
  const nav = user.role === "guru" ? GNAV : SNAV;
  const unread = store.getUnreadCount(user.id);
  return <nav className="bnav">
    {nav.map(item => {
      const active = route === item.id || (route === "tugas-detail" && item.id === "tugas") || (route === "kerjakan" && item.id === "tugas") || (route === "buat-tugas" && item.id === "tugas-guru") || (route === "edit-tugas" && item.id === "tugas-guru");
      return <button key={item.id} className={`bn ${active ? "active" : ""}`} onClick={() => navigate(item.id)}>
        <div style={{ position: "relative" }}>
          <I n={item.ic} s={20} />
          {item.id === "chat" && unread > 0 && <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 8, fontWeight: 700, display: "grid", placeItems: "center" }}>{unread > 9 ? "9+" : unread}</div>}
        </div>
        <span>{item.l}</span>
      </button>;
    })}
  </nav>;
}

// ─── APP ───
// ─── NOTIFICATIONS HOOK ───
function useNotifications(user, store, route) {
  const [notifs, setNotifs] = useState([]);
  // Anti-spam: simpan timestamp first load, hanya notify event setelah ini
  const [bootTime] = useState(() => Date.now());
  // Track event yang sudah ditampilkan agar tidak duplikat
  const [seenIds] = useState(() => new Set());

  function pushNotif(notif) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setNotifs(n => [...n, { ...notif, id }]);
    setTimeout(() => setNotifs(n => n.filter(x => x.id !== id)), 5000);
  }

  function dismissNotif(id) {
    setNotifs(n => n.filter(x => x.id !== id));
  }

  // Listen tugas baru (untuk siswa) — skip kalau lagi di halaman tugas
  useEffect(() => {
    if (!user || user.role !== "siswa") return;
    const tugasRef = ref(db, "tugas");
    const unsub = onValue(tugasRef, snap => {
      const data = snap.val() || {};
      Object.entries(data).forEach(([id, t]) => {
        if (!t.createdAt) return;
        const createdMs = new Date(t.createdAt).getTime();
        if (createdMs < bootTime) return;
        if (t.jenjang !== user.jenjang) return;
        if (t.status !== "aktif") return;
        const eventKey = `tugas_${id}`;
        if (seenIds.has(eventKey)) return;
        seenIds.add(eventKey);
        // Skip notif kalau lagi di halaman tugas
        if (route === "tugas" || route === "tugas-detail" || route === "kerjakan") return;
        pushNotif({
          type: "tugas",
          title: "Tugas baru!",
          message: `${t.judul} · ${t.mapel}`,
        });
      });
    });
    return () => unsub();
  }, [user?.uid, user?.role, route]);

  // Listen submission baru (untuk guru) — skip kalau lagi di dashboard
  useEffect(() => {
    if (!user || user.role !== "guru") return;
    const subsRef = ref(db, "submissions");
    const unsub = onValue(subsRef, snap => {
      const data = snap.val() || {};
      Object.entries(data).forEach(([id, s]) => {
        if (!s.submittedAt) return;
        const subMs = new Date(s.submittedAt).getTime();
        if (subMs < bootTime) return;
        const eventKey = `sub_${id}`;
        if (seenIds.has(eventKey)) return;
        seenIds.add(eventKey);
        const siswaList = store.getAllSiswa();
        const siswa = siswaList.find(x => x.id === s.siswaId);
        const tugas = store.getTugas().find(x => x.id === s.tugasId);
        if (!siswa || !tugas) return;
        // Skip notif kalau guru lagi di dashboard atau analisis
        if (route === "home-guru" || route === "analisis-tugas") return;
        pushNotif({
          type: "submission",
          title: "Submission baru",
          message: `${siswa.nama} kumpul ${tugas.judul} · ${s.nilai}/100`,
        });
      });
    });
    return () => unsub();
  }, [user?.uid, user?.role, route]);

  // Listen pesan baru — skip kalau lagi di halaman chat
  useEffect(() => {
    if (!user) return;
    const msgsRef = ref(db, "messages");
    const unsub = onValue(msgsRef, snap => {
      const data = snap.val() || {};
      Object.entries(data).forEach(([tid, thread]) => {
        if (!tid.includes(user.id)) return;
        Object.entries(thread).forEach(([msgId, msg]) => {
          if (msg.ts < bootTime) return;
          if (msg.fromId === user.id) return;
          if (msg.toId !== user.id) return;
          const eventKey = `msg_${tid}_${msgId}`;
          if (seenIds.has(eventKey)) return;
          seenIds.add(eventKey);
          // Skip notif kalau lagi di halaman pesan
          if (route === "chat") return;
          const siswaList = store.getAllSiswa();
          const guru = store.fbGuru;
          const sender = siswaList.find(x => x.id === msg.fromId) || (guru?.id === msg.fromId ? guru : null);
          const senderName = sender?.namaDisplay || sender?.nama || msg.fromId;
          pushNotif({
            type: "pesan",
            title: `Pesan dari ${senderName}`,
            message: msg.text.length > 60 ? msg.text.slice(0, 60) + "..." : msg.text,
          });
        });
      });
    });
    return () => unsub();
  }, [user?.uid, route]);

  // Listen badge baru (untuk siswa)
  useEffect(() => {
    if (!user || user.role !== "siswa") return;
    const badgesRef = ref(db, `badges/${user.id}`);
    let initialLoad = true;
    const unsub = onValue(badgesRef, snap => {
      if (initialLoad) { initialLoad = false; return; }
      const data = snap.val() || {};
      Object.keys(data).forEach(bid => {
        const eventKey = `badge_${bid}`;
        if (seenIds.has(eventKey)) return;
        seenIds.add(eventKey);
        const b = ALL_BADGES?.find(x => x.id === bid) || { name: bid };
        pushNotif({
          type: "badge",
          title: "Badge baru!",
          message: `${b.name}`,
        });
      });
    });
    return () => unsub();
  }, [user?.uid, user?.role]);

  return { notifs, dismissNotif };
}

// ─── NOTIF TOAST CONTAINER ───
function NotifToastContainer({ notifs, onDismiss }) {
  if (notifs.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9999,
      display: "flex", flexDirection: "column-reverse", gap: 10,
      maxWidth: 360, pointerEvents: "none",
    }}>
      {notifs.map(n => (
        <div key={n.id} onClick={() => onDismiss(n.id)}
          style={{
            background: "#fff", border: "1px solid var(--line)",
            borderLeft: `4px solid ${n.type === "submission" ? "#059669" : n.type === "badge" ? "#d97706" : n.type === "pesan" ? "#0d9488" : "#3b82f6"}`,
            borderRadius: 10, padding: "12px 14px", boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            cursor: "pointer", pointerEvents: "auto",
            animation: "slideIn .3s ease",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{n.title}</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.4 }}>{n.message}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── ERROR BOUNDARY ───
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Silent log untuk production
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f8fafc" }}>
          <div style={{ maxWidth: 420, textAlign: "center", padding: 24, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.7L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.7a2 2 0 00-3.4 0zM12 9v4M12 17h.01" /></svg>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Oops, ada gangguan teknis</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>Aplikasi mengalami error tak terduga. Klik tombol di bawah untuk reset, jawaban yang tersimpan tidak akan hilang.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button style={{ padding: "8px 16px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13 }} onClick={() => window.location.reload()}>Reload Halaman</button>
              <button style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: "#0d6b7a", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }} onClick={() => {
                try {
                  Object.keys(localStorage).forEach(k => {
                    if (k.startsWith("astrolab.quiz.")) localStorage.removeItem(k);
                  });
                } catch {}
                window.location.reload();
              }}>Reset Quiz State</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [route, setRoute] = useState("home");
  const [params, setParams] = useState({});
  const store = useStore();
  const { notifs, dismissNotif } = useNotifications(user, store, route);
  function navigate(r, p = {}) { setRoute(r); setParams(p); window.scrollTo(0, 0); }

  // Firebase Auth — session persist otomatis
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const snap = await get(ref(db, `users/${firebaseUser.uid}`));
          if (snap.exists()) {
            const profile = snap.val();
            // Ensure namaDisplay is properly capitalized
            const namaDisplay = profile.namaDisplay
              ? profile.namaDisplay.charAt(0).toUpperCase() + profile.namaDisplay.slice(1)
              : (getFirstName(profile.nama || "") || profile.id);
            // Auto-fix di Firebase kalau masih lowercase
            if (namaDisplay !== profile.namaDisplay) {
              update(ref(db, `users/${firebaseUser.uid}`), { namaDisplay });
              const accId = profile.id;
              if (accId) update(ref(db, `accounts/${accId}`), { namaDisplay });
            }
            const u = { ...profile, uid: firebaseUser.uid, namaDisplay };
            setUser(u);
            store.setCurrentUser(u);
            setRoute(profile.role === "guru" ? "home-guru" : "home");
            setTimeout(() => setOnline(firebaseUser.uid), 500);
          } else {
            await signOut(auth);
            setUser(null); setRoute("home");
          }
        } else {
          setUser(null); setRoute("home");
        }
      } catch (e) {
        // Silently fail — fallback to login screen
        setUser(null); setRoute("home");
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  function handleLogin(u) {
    setUser(u);
    setRoute(u.role === "guru" ? "home-guru" : "home");
    setTimeout(() => setOnline(u.uid), 500);
  }

  async function handleLogout() {
    if (user) setOffline(user.uid);
    // Clear semua cache localStorage
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("astrolab."));
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
    await signOut(auth);
    setUser(null); setRoute("home"); setParams({});
  }

  // Presence
  useEffect(() => {
    if (!user) return;
    setOnline(user.uid);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") setOnline(user.uid);
      else setOffline(user.uid);
    };
    const handleBeforeUnload = () => setOffline(user.uid);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      setOffline(user.uid);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);
  if (store.loading || authLoading) return <><style>{CSS}</style><div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#1a8a9b 0%,var(--accent) 40%,var(--accent-2) 70%,#062a35 100%)", gap: 14 }}><LogoBold size={72} onDark /><div style={{ color: "#fff", fontSize: 20, fontWeight: 900, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "-.02em" }}>Astrolab</div><div style={{ color: "rgba(255,255,255,.55)", fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: ".04em" }}>Our Classroom</div></div></>;
  const hideNav = route === "kerjakan";
  let screen = null;
  if (user) {
    const isGuru = user.role === "guru";
    if (isGuru) {
      if (route === "home-guru") screen = <DashboardGuru store={store} navigate={navigate} />;
      else if (route === "tugas-guru") screen = <TugasGuru store={store} navigate={navigate} />;
      else if (route === "buat-tugas") screen = <BuatTugas store={store} navigate={navigate} />;
      else if (route === "edit-tugas") screen = <BuatTugas store={store} navigate={navigate} editId={params.tugasId} />;
      else if (route === "leaderboard") screen = <LeaderboardScreen user={user} store={store} />;
      else if (route === "chat") screen = <ChatScreen user={user} store={store} params={params} />;
      else if (route === "kelas") screen = <KelasView store={store} navigate={navigate} />;
      else if (route === "analisis-tugas") screen = <AnalisisTugasDetail store={store} tugasId={params.tugasId} navigate={navigate} onBack={() => { setRoute("home-guru"); setTimeout(() => { document.querySelector(".analisis-section")?.scrollIntoView({ behavior: "smooth" }); }, 100); }} />;
      else if (route === "badge-manager") screen = <BadgeManager store={store} />;
      else if (route === "bank-soal") screen = <BankSoal store={store} navigate={navigate} />;
      else if (route === "manajemen-siswa") screen = <ManajemenSiswa store={store} />;
      else if (route === "profil-guru") screen = <ProfilGuru user={user} store={store} navigate={navigate} />;
      else screen = <DashboardGuru store={store} navigate={navigate} />;
    } else {
      if (route === "home") screen = <DashboardSiswa user={user} store={store} navigate={navigate} />;
      else if (route === "leaderboard") screen = <LeaderboardScreen user={user} store={store} />;
      else if (route === "tugas") screen = <DaftarTugas user={user} store={store} navigate={navigate} />;
      else if (route === "tugas-detail") screen = <DetailTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "review-tugas") screen = <ReviewTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "kerjakan") screen = <KerjakanTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "profil") screen = <ProfilSiswa user={user} store={store} />;
      else if (route === "chat") screen = <ChatScreen user={user} store={store} params={params} />;
      else screen = <DashboardSiswa user={user} store={store} navigate={navigate} />;
    }
  }
  return <>
    <style>{CSS}</style>
    {!user ? <LoginScreen onLogin={handleLogin} /> :
      <div className="shell">
        <header className="hdr">
          <div className="hdr-brand">
            <div className="hdr-mark"><LogoBold size={24} onDark /></div>
            <div className="hdr-name"><b>Astrolab</b><small style={{ fontSize: 10, opacity: .65 }}>Our Classroom</small></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, opacity: .85 }}>{user.role === "guru" ? "Guru" : `Kelas ${user.jenjang}`}</span>
            <button onClick={() => navigate(user.role === "guru" ? "profil-guru" : "profil")} style={{ background: "none", border: "none", cursor: "pointer", borderRadius: "50%", padding: 0, display: "flex" }}>
              <Avatar name={user.nama} size="sm" photo={store.getPhoto(user.uid || user.id)} />
            </button>
            <button onClick={handleLogout} style={{ background: "rgba(255,255,255,.15)", color: "#fff", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid rgba(255,255,255,.2)", cursor: "pointer" }}>Keluar</button>
          </div>
        </header>
        <div className="body">
          <Sidebar user={user} route={route} navigate={navigate} onLogout={handleLogout} store={store} />
          <main className="main">{screen}</main>
        </div>
        <footer className="footer">Our Classroom · <b>© 2026 M. Hasanul Fatta</b> — All rights reserved</footer>
        {!hideNav && <BottomNav user={user} route={route} navigate={navigate} store={store} />}
      </div>}
    <NotifToastContainer notifs={notifs} onDismiss={dismissNotif} />
  </>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

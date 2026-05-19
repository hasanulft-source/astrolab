// Astrolab Classroom — Production LMS
// © 2026 M. Hasanul Fatta
// UI: Original (Plus Jakarta Sans + teal #0d6b7a)
// Engine: Firebase Realtime Database + Realtime Presence

import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, onValue, remove, update, onDisconnect, serverTimestamp } from "firebase/database";

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

// ─── FCM VAPID KEY ───
// ─── ONLINE PRESENCE ───
// Firebase node: /presence/{userId} = { online: true, lastSeen: timestamp }
async function setOnline(userId) {
  const presRef = ref(db, `presence/${userId}`);
  await set(presRef, { online: true, lastSeen: serverTimestamp() });
  onDisconnect(presRef).set({ online: false, lastSeen: serverTimestamp() });
}
async function setOffline(userId) {
  try { await set(ref(db, `presence/${userId}`), { online: false, lastSeen: serverTimestamp() }); } catch {}
}

// no-op — push notif dihapus
async function callNotifyServer() {}

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
const ACCOUNTS = [
  { id: "FATA-001", password: "MY_SCH119", role: "guru", nama: "M. Hasanul Fatta, S.Pd.", namaDisplay: "Pak Fatta", mapel: "IPA & Informatika" },
  { id: "YJS-42",   password: "yusuf2026",  role: "siswa", nama: "Yusuf Julian Saputra", namaDisplay: "Yusuf",  kelas: "VIII", jenjang: "VIII" },
  { id: "SAN-17",   password: "shelia2026", role: "siswa", nama: "Shelia Anatasha",       namaDisplay: "Shelia", kelas: "VII",  jenjang: "VII"  },
  { id: "TAZ-01",   password: "talita2026",  role: "siswa", nama: "Talita Az-Zahra",      namaDisplay: "Talita",  kelas: "VIII", jenjang: "VIII" },
  { id: "AZW-02",   password: "azwa2026",    role: "siswa", nama: "Azwa Shakila",         namaDisplay: "Azwa",    kelas: "VIII", jenjang: "VIII" },
  { id: "RSK-03",   password: "riski2026",   role: "siswa", nama: "Riski Ramadhan",       namaDisplay: "Riski",   kelas: "VIII", jenjang: "VIII" },
  { id: "ZHF-04",   password: "zahrah2026",  role: "siswa", nama: "Zahrah Felicia",       namaDisplay: "Zahrah",  kelas: "VIII", jenjang: "VIII" },
];

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
  const px = { sm: 28, md: 36, lg: 48, xl: 64 }[size] || 36;
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

// ─── XP / LEVEL / BADGE SYSTEM ───
const LEVELS = [
  { id: 1, name: "Nebula",    min: 0,    max: 99,   emoji: "🌑", color: "#6b7280", bg: "#f3f4f6", desc: "Baru memulai perjalanan" },
  { id: 2, name: "Bintang",   min: 100,  max: 299,  emoji: "⭐", color: "#d97706", bg: "#fffbeb", desc: "Mulai bersinar" },
  { id: 3, name: "Planet",    min: 300,  max: 599,  emoji: "🪐", color: "#0d6b7a", bg: "#eaf4f3", desc: "Semakin solid" },
  { id: 4, name: "Astronot",  min: 600,  max: 999,  emoji: "🚀", color: "#1d4ed8", bg: "#eff6ff", desc: "Sudah terbang tinggi" },
  { id: 5, name: "Commander", min: 1000, max: Infinity, emoji: "🌌", color: "#b45309", bg: "#fef3c7", desc: "Elite — puncak galaksi" },
];
function getLevel(poin) {
  return LEVELS.find(l => poin >= l.min && poin <= l.max) || LEVELS[0];
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

const AUTO_BADGES = [
  { id: "perfect",   emoji: "🎯", name: "Perfect Score",   desc: "Nilai 100 di satu tugas",         color: "#b45309", bg: "#fef3c7" },
  { id: "fast",      emoji: "⚡", name: "Fast Finisher",   desc: "Submit < 3 jam setelah publish",  color: "#7c3aed", bg: "#f5f3ff" },
  { id: "onfire",    emoji: "🔥", name: "On Fire",         desc: "Streak 5x berturut-turut",        color: "#dc2626", bg: "#fef2f2" },
  { id: "rajin",     emoji: "📚", name: "Rajin Belajar",   desc: "Selesaikan 10 tugas",             color: "#0d6b7a", bg: "#eaf4f3" },
  { id: "topclass",  emoji: "👑", name: "Top of Class",    desc: "Rank #1 di leaderboard",         color: "#d97706", bg: "#fffbeb" },
  { id: "firstblood",emoji: "🌟", name: "First Step",      desc: "Selesaikan tugas pertama",       color: "#16a34a", bg: "#f0fdf4" },
];
const MANUAL_BADGES = [
  { id: "guruspick",   emoji: "🏅", name: "Guru's Pick",     desc: "Pilihan khusus dari guru",        color: "#0d6b7a", bg: "#eaf4f3" },
  { id: "creative",   emoji: "💡", name: "Most Creative",   desc: "Kreativitas luar biasa",          color: "#7c3aed", bg: "#f5f3ff" },
  { id: "teamplayer", emoji: "🤝", name: "Team Player",     desc: "Kontribusi luar biasa di kelas",  color: "#1d4ed8", bg: "#eff6ff" },
  { id: "improver",   emoji: "📈", name: "Most Improved",   desc: "Peningkatan nilai terbaik",       color: "#16a34a", bg: "#f0fdf4" },
];
const ALL_BADGES = [...AUTO_BADGES, ...MANUAL_BADGES];

function checkAutoBadges(stats, submission, isTopClass = false) {
  const earned = [];
  if ((stats.tugasSelesai || 0) === 0) earned.push("firstblood");
  if (submission.nilai === 100) earned.push("perfect");
  if (submission.ontime) {
    const msPub = submission.publishedAt ? Date.now() - submission.publishedAt : Infinity;
    if (msPub < 3 * 3600000) earned.push("fast");
  }
  if ((stats.streak || 0) + 1 >= 5) earned.push("onfire");
  if ((stats.tugasSelesai || 0) + 1 >= 10) earned.push("rajin");
  if (isTopClass) earned.push("topclass");
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
      <span style={{ fontSize: 14 }}>{lv.emoji}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: lv.color }}>{lv.name}</span>
    </div>
  );
  return (
    <div style={{ background: lv.bg, border: `1.5px solid ${lv.color}33`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 28 }}>{lv.emoji}</span>
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
        {prog.next ? <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{prog.needed} lagi → {prog.next.emoji} {prog.next.name}</span>
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
    <div title={`${b.name}: ${b.desc}`} style={{ width: 32, height: 32, borderRadius: 8, background: b.bg, border: `1.5px solid ${b.color}33`, display: "grid", placeItems: "center", fontSize: 16, cursor: "default" }}>{b.emoji}</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 8px", borderRadius: 12, background: b.bg, border: `1.5px solid ${b.color}33`, minWidth: 72, textAlign: "center" }}>
      <span style={{ fontSize: 24 }}>{b.emoji}</span>
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
function useStore() {
  const [tugas, setTugas] = useState([]);
  const [subs, setSubs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Realtime listeners
  useEffect(() => {
    const tugasRef = ref(db, "tugas");
    const subsRef = ref(db, "submissions");
    const statsRef = ref(db, "stats");
    const u1 = onValue(tugasRef, snap => {
      const data = snap.val();
      setTugas(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
      setLoading(false);
    });
    const u2 = onValue(subsRef, snap => {
      const data = snap.val();
      setSubs(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
    });
    const u3 = onValue(statsRef, snap => {
      setStats(snap.val() || {});
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  // TUGAS
  const getTugas = () => tugas;
  const addTugas = async (t) => {
    const newRef = push(ref(db, "tugas"));
    await set(newRef, { ...t, createdAt: new Date().toISOString(), status: t.scheduledAt ? "scheduled" : "aktif" });
    if (!t.scheduledAt) callNotifyServer("tugas", { jenjang: t.jenjang, judul: t.judul, mapel: t.mapel });
  };
  const deleteTugas = async (id) => { await remove(ref(db, `tugas/${id}`)); };
  const updateTugas = async (id, patch) => { await update(ref(db, `tugas/${id}`), patch); };
  const duplicateTugas = async (t) => {
    const newRef = push(ref(db, "tugas"));
    const { id, createdAt, ...rest } = t;
    await set(newRef, { ...rest, judul: `${t.judul} (Salinan)`, createdAt: new Date().toISOString(), status: "aktif", scheduledAt: null });
  };

  // SUBMISSIONS
  const getSubs = () => subs;
  const addSub = async (s) => {
    const newRef = push(ref(db, "submissions"));
    await set(newRef, { ...s, submittedAt: new Date().toISOString() });
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
    await set(ref(db, `stats/${sid}`), {
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

  useEffect(() => {
    const msgsRef = ref(db, "messages");
    const u4 = onValue(msgsRef, snap => {
      setMessages(snap.val() || {});
    });
    return () => u4();
  }, []);

  // CHAT — threadId = sorted pair of IDs e.g. "FATA-001__YJS-42"
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
    // Push notif ke penerima
    const allAcc = [...ACCOUNTS, ...fbAccounts];
    const sender = allAcc.find(a => a.id === fromId);
    callNotifyServer("chat", {
      toUserId: toId,
      fromName: sender?.namaDisplay || sender?.nama || fromId,
      message: text.trim(),
    });
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
    const all = getAllAccounts();
    if (myRole === "guru") return all.filter(a => a.role === "siswa");
    return all.filter(a => a.id !== myId && (a.role === "guru" || a.jenjang === myJenjang));
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
    callNotifyServer("broadcast", { target, pesan });
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
  const getPhoto = (userId) => photos[userId] || null;
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

  // ACCOUNTS (Firebase) — siswa baru disimpan di /accounts/{id}
  const [fbAccounts, setFbAccounts] = useState([]);
  useEffect(() => {
    const accRef = ref(db, "accounts");
    const u8 = onValue(accRef, snap => {
      const data = snap.val();
      setFbAccounts(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
    });
    return () => u8();
  }, []);

  // Merge: hardcoded + Firebase (Firebase override jika id sama — untuk reset password)
  const getAllAccounts = () => {
    const fbIds = new Set(fbAccounts.map(a => a.id));
    const hardcoded = ACCOUNTS.filter(a => !fbIds.has(a.id));
    return [...hardcoded, ...fbAccounts];
  };
  const getAllSiswa = (jenjang) => {
    return getAllAccounts().filter(a => a.role === "siswa" && (!jenjang || a.jenjang === jenjang));
  };

  // Generate ID otomatis: akronim 3 huruf + counter global 9XX
  const genSiswaId = (nama) => {
    const words = nama.trim().split(/\s+/);
    let akronim = words.length >= 3
      ? words[0][0] + words[1][0] + words[2][0]
      : words.length === 2
        ? words[0][0] + words[1][0] + (words[1][1] || words[0][1] || "X")
        : (words[0].slice(0, 3));
    akronim = akronim.toUpperCase().replace(/[^A-Z]/g, "X").slice(0, 3);
    // Counter global: cari nomor 9XX tertinggi dari semua akun Firebase
    const usedNums = fbAccounts
      .map(a => parseInt(a.id.split("-")[1] || "0"))
      .filter(n => n >= 900);
    const next = usedNums.length > 0 ? Math.max(...usedNums) + 1 : 901;
    return `${akronim}-${next}`;
  };

  // CRUD akun siswa
  const addSiswa = async (data) => {
    // data: { nama, namaDisplay, kelas, jenjang, password }
    const id = genSiswaId(data.nama);
    await set(ref(db, `accounts/${id}`), {
      id, role: "siswa",
      nama: data.nama,
      namaDisplay: data.namaDisplay || data.nama.split(" ")[0],
      kelas: data.kelas || `Kelas ${data.jenjang}`,
      jenjang: data.jenjang,
      password: data.password,
      createdAt: new Date().toISOString(),
    });
    return id;
  };
  const deleteSiswa = async (id) => {
    // Hanya bisa hapus akun Firebase (bukan hardcoded)
    await remove(ref(db, `accounts/${id}`));
  };
  const resetPassword = async (id, newPassword) => {
    const existing = fbAccounts.find(a => a.id === id);
    if (existing) {
      await update(ref(db, `accounts/${id}`), { password: newPassword });
    } else {
      // Akun hardcoded — buat shadow di Firebase untuk override password
      const acc = ACCOUNTS.find(a => a.id === id);
      if (acc) await set(ref(db, `accounts/${id}`), { ...acc, password: newPassword });
    }
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
  const isOnline = (userId) => presenceData[userId]?.online === true;
  const getLastSeen = (userId) => presenceData[userId]?.lastSeen || null;
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

  return { getTugas, addTugas, deleteTugas, updateTugas, duplicateTugas, getSubs, addSub, hasSub, getSubBy, getStats, updateStats, resetStreakIfMissed, getLeaderboard, getAllSiswa, addSiswa, deleteSiswa, resetPassword, isFbAccount, getThread, sendMessage, getUnreadCount, markRead, getContacts, getLastMsg, getBroadcasts, addBroadcast, editBroadcast, deleteBroadcast, getPhoto, savePhoto, getBadges, awardBadge, removeBadge, isOnline, getLastSeen, getOnlineUsers, loading };
}

// ─── CONFIRM MODAL ───
function Confirm({ title, desc, onOk, onCancel }) {
  return <div className="modal-overlay" onClick={onCancel}><div className="modal" onClick={e => e.stopPropagation()}><h3>{title}</h3><p>{desc}</p><div className="modal-actions"><button className="btn btn-outline btn-sm" onClick={onCancel}>Batal</button><button className="btn btn-danger btn-sm" onClick={onOk}>Hapus</button></div></div></div>;
}

// ─── LOGO SVG (Bold Orbit — putih, dipakai di semua konteks teal) ───
function LogoBold({ size = 32 }) {
  const s = size, c = s / 2, r1 = s * 0.38, r2 = s * 0.22, dot = s * 0.065, center = s * 0.115;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      {/* Orbit ring utama — tebal */}
      <ellipse cx={c} cy={c} rx={r1} ry={r1 * 0.36} stroke="white" strokeWidth={s * 0.055} fill="none" strokeLinecap="round"/>
      {/* Orbit ring 2 — rotate 60° */}
      <ellipse cx={c} cy={c} rx={r1} ry={r1 * 0.36} stroke="white" strokeWidth={s * 0.04} fill="none" strokeLinecap="round" transform={`rotate(60 ${c} ${c})`} opacity=".65"/>
      {/* Orbit ring 3 — rotate -60° */}
      <ellipse cx={c} cy={c} rx={r1} ry={r1 * 0.36} stroke="white" strokeWidth={s * 0.04} fill="none" strokeLinecap="round" transform={`rotate(-60 ${c} ${c})`} opacity=".65"/>
      {/* Center planet */}
      <circle cx={c} cy={c} r={center} fill="white"/>
      <circle cx={c} cy={c} r={center * 0.55} fill="rgba(13,107,122,0.75)"/>
      {/* Orbit dots — bold */}
      <circle cx={c + r1} cy={c} r={dot} fill="white"/>
      <circle cx={c - r1} cy={c} r={dot * 0.75} fill="white" opacity=".7"/>
      <circle cx={c + r1 * 0.5} cy={c - r1 * 0.31} r={dot * 0.85} fill="white" opacity=".9"/>
      <circle cx={c - r1 * 0.5} cy={c + r1 * 0.31} r={dot * 0.7} fill="white" opacity=".6"/>
    </svg>
  );
}

// Versi teal — untuk pakai di background putih
function LogoTeal({ size = 32 }) {
  const s = size, c = s / 2, r1 = s * 0.38, r2 = s * 0.22, dot = s * 0.065, center = s * 0.115;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <ellipse cx={c} cy={c} rx={r1} ry={r1 * 0.36} stroke="#0d6b7a" strokeWidth={s * 0.055} fill="none" strokeLinecap="round"/>
      <ellipse cx={c} cy={c} rx={r1} ry={r1 * 0.36} stroke="#0d6b7a" strokeWidth={s * 0.04} fill="none" strokeLinecap="round" transform={`rotate(60 ${c} ${c})`} opacity=".5"/>
      <ellipse cx={c} cy={c} rx={r1} ry={r1 * 0.36} stroke="#0d6b7a" strokeWidth={s * 0.04} fill="none" strokeLinecap="round" transform={`rotate(-60 ${c} ${c})`} opacity=".5"/>
      <circle cx={c} cy={c} r={center} fill="#0d6b7a"/>
      <circle cx={c} cy={c} r={center * 0.55} fill="rgba(255,255,255,0.6)"/>
      <circle cx={c + r1} cy={c} r={dot} fill="#0d6b7a"/>
      <circle cx={c - r1} cy={c} r={dot * 0.75} fill="#0d6b7a" opacity=".6"/>
      <circle cx={c + r1 * 0.5} cy={c - r1 * 0.31} r={dot * 0.85} fill="#0d6b7a" opacity=".8"/>
      <circle cx={c - r1 * 0.5} cy={c + r1 * 0.31} r={dot * 0.7} fill="#0d6b7a" opacity=".55"/>
    </svg>
  );
}

// ─── LOGIN ───
function LoginScreen({ onLogin }) {
  const [id, setId] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  async function submit() {
    if (!id.trim()) { setErr("ID belum diisi."); return; }
    if (!pw.trim()) { setErr("Password belum diisi."); return; }
    setLoading(true); setErr("");
    // 1. Cek hardcoded dulu
    const hardcoded = ACCOUNTS.find(a => a.id.toLowerCase() === id.trim().toLowerCase() && a.password === pw.trim());
    if (hardcoded) { setLoading(false); onLogin(hardcoded); return; }
    // 2. Fallback ke Firebase /accounts
    try {
      const snap = await get(ref(db, `accounts/${id.trim().toUpperCase()}`));
      if (snap.exists()) {
        const acc = snap.val();
        if (acc.password === pw.trim()) { setLoading(false); onLogin(acc); return; }
      }
      // 3. Try lowercase id search
      const allSnap = await get(ref(db, "accounts"));
      if (allSnap.exists()) {
        const found = Object.values(allSnap.val()).find(a => a.id?.toLowerCase() === id.trim().toLowerCase() && a.password === pw.trim());
        if (found) { setLoading(false); onLogin(found); return; }
      }
    } catch {}
    setLoading(false); setErr("ID atau password salah.");
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
          <div className="login-logo-box"><LogoBold size={36} /></div>
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
              placeholder="Contoh: FATA-001" onKeyDown={e => e.key === "Enter" && submit()} autoCapitalize="none" />
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
  const tugas = store.getTugas().filter(t => t.jenjang === user.jenjang && t.status === "aktif");
  const lb = store.getLeaderboard(user.jenjang);
  const myRank = lb.find(s => s.id === user.id);

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
      <div className="g3" style={{ marginBottom: 16 }}>
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
      <div className="sh"><h2>Tugas aktif</h2><button className="btn btn-soft btn-sm" onClick={() => navigate("tugas")}>Semua <I n="chevR" s={12} /></button></div>
      {tugas.length === 0 ? <div className="empty">Belum ada tugas aktif dari guru.</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {tugas.slice(0, 3).map(t => { const dl = fmtDl(t.deadline); const done = store.hasSub(user.id, t.id); return <button key={t.id} onClick={() => navigate("tugas-detail", { tugasId: t.id })} style={{ textAlign: "left", display: "block", width: "100%", background: "none", border: "none" }}><Card><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", background: done ? "var(--good-bg)" : "var(--accent-soft)", display: "grid", placeItems: "center", color: done ? "var(--good)" : "var(--accent-2)", flexShrink: 0 }}><I n={done ? "check" : "book"} s={18} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{t.judul}</div><div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{t.mapel}</div></div>{done ? <span className="chip chip-good">Selesai</span> : <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}>{dl.label}</span>}</div></Card></button>; })}
        </div>}
      <div className="sh"><h2>Top 3 Kelas {user.jenjang}</h2><button className="btn btn-soft btn-sm" onClick={() => navigate("leaderboard")}>Semua <I n="chevR" s={12} /></button></div>
      <Card pad="none" style={{ overflow: "hidden" }}>
        {lb.length === 0 ? <div className="empty">Belum ada ranking. Kerjakan tugas dulu!</div> :
          lb.slice(0, 3).map(s => <div key={s.id} className="lb-row" style={{ gridTemplateColumns: "28px 34px 1fr auto" }}><div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : "top3"}`}>{s.rank}</div><UserAvatar userId={s.id} name={s.nama} size="sm" store={store} /><div><div className="lb-name">{s.nama}{s.id === user.id && <span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span>}</div><div className="lb-meta">{s.kelas}</div></div><div className="lb-pts">{s.poin.toLocaleString("id-ID")}</div></div>)}
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

  // Prestasi minggu ini
  const naik = [...lb].sort((a,b) => (b.poinHistory?.slice(-1)[0]?.poin || 0) - (a.poinHistory?.slice(-1)[0]?.poin || 0))[0];
  const konsisten = [...lb].sort((a,b) => (b.streak||0) - (a.streak||0))[0];
  const aktif = [...lb].sort((a,b) => (b.tugasSelesai||0) - (a.tugasSelesai||0))[0];

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
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingInline: 4 }}>{s.nama.split(" ")[0]}</div>
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
                  <div className="lb-name">{s.nama}{!isGuru && s.id === user.id && <span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span>}</div>
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
                <div style={{ minWidth: 0 }}><div className="lb-name">{myRow.nama}<span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span></div><div className="lb-meta">{myRow.kelas}</div></div>
                <div className="lb-pts">{myRow.poin.toLocaleString("id-ID")}</div>
              </div></>
            )}
          </Card>

          {/* Prestasi minggu ini */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Prestasi minggu ini</div>
              {[
                { label: "NAIK TERTINGGI", icon: "trending", color: "var(--accent)", bg: "var(--accent-soft)", siswa: naik, sub: `${naik?.poin?.toLocaleString("id-ID") || 0} poin total` },
                { label: "PALING KONSISTEN", icon: "flame", color: "#c2410c", bg: "#fff7ed", siswa: konsisten, sub: konsisten?.streak > 0 ? `Streak ${konsisten.streak}x` : "Belum ada streak" },
                { label: "PALING AKTIF", icon: "book", color: "var(--good)", bg: "var(--good-bg)", siswa: aktif, sub: `${aktif?.tugasSelesai || 0} tugas selesai` },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--line-soft)" : "none" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: item.bg, color: item.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <I n={item.icon} s={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-3)", letterSpacing: ".08em", textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.siswa?.nama?.split(" ")[0] || "—"}</div>
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

  // Split: aktif = deadline belum lewat ATAU sudah dikerjakan, arsip = lewat deadline & belum dikerjakan
  const aktif = semua.filter(t => {
    const dl = fmtDl(t.deadline);
    const done = store.hasSub(user.id, t.id);
    return done || dl.tone !== "bad";
  });
  const arsip = semua.filter(t => {
    const dl = fmtDl(t.deadline);
    const done = store.hasSub(user.id, t.id);
    return !done && dl.tone === "bad";
  });

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
            <div>
              <div style={{ fontWeight: 700, color: "var(--good)" }}>Sudah dikerjakan!</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>Nilai: <strong>{sub.nilai}</strong> · Poin: <strong>+{sub.poinDapat}</strong></div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{new Date(sub.submittedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
          </div>
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

// ─── QUIZ ENGINE ───
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

  if (!t || !t.soal?.length) return <div className="empty">Soal tidak tersedia.</div>;
  const soalList = shuffledSoal.length ? shuffledSoal : t.soal.map((s, i) => ({ ...s, _origIdx: i }));
  const total = soalList.length, soal = soalList[idx];

  // Auto-save setiap ada perubahan jawaban
  function answer(val) {
    if (submitted) return;
    const next = { ...answers, [idx]: val };
    setAnswers(next);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ answers: next, idx })); } catch {}
  }
  function toggleMulti(val) {
    if (submitted) return;
    const cur = answers[idx] || [];
    const next = { ...answers, [idx]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
    setAnswers(next);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ answers: next, idx })); } catch {}
  }
  function goTo(i) {
    setIdx(i);
    try { const s = localStorage.getItem(SAVE_KEY); const d = s ? JSON.parse(s) : {}; localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, idx: i })); } catch {}
  }

  function doSubmit() {
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
      if (correct) { totalPoin += poinSoal; correctCount++; }
      soalResults.push({ origIdx: s._origIdx ?? i, correct, poinSoal });
    });
    const nilai = Math.round((correctCount / total) * 100);
    const dl = fmtDl(t.deadline);
    const ontime = dl.tone !== "bad";
    const prevStats = store.getStats(user.id);
    const prevStreak = prevStats.streak || 0;
    const lb = store.getLeaderboard(user.jenjang);
    const isTopClass = lb.length > 0 && lb[0].id === user.id;
    const subForBadge = { nilai, ontime, publishedAt: t.createdAt ? new Date(t.createdAt).getTime() : 0 };
    const newBadges = checkAutoBadges(prevStats, subForBadge, isTopClass);
    setResult({ nilai, poinDapat: totalPoin, correctCount, ontime, newStreak: ontime ? prevStreak + 1 : 0, newBadges });
    store.addSub({ siswaId: user.id, tugasId: t.id, nilai, poinDapat: totalPoin, correctCount, total, ontime, soalResults });
    store.updateStats(user.id, nilai, totalPoin, ontime);
    newBadges.forEach(bid => store.awardBadge(user.id, bid));
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setSubmitted(true);
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
  const belumDijawab = t.soal.map((_, i) => i).filter(i => {
    const a = answers[i];
    return a === undefined || a === null || (Array.isArray(a) && a.length === 0);
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
          <button className="btn btn-outline btn-sm" onClick={() => setShowConfirm(false)}>Cek Lagi</button>
          <button className="btn btn-primary btn-sm" onClick={doSubmit}><I n="check" s={13} /> Kumpulkan Sekarang</button>
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
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Soal {idx + 1} dari {total} · {answered} dijawab</div>
      </div>
      {/* Auto-save indicator */}
      <div style={{ fontSize: 10, color: "var(--ink-4)", display: "flex", alignItems: "center", gap: 3 }}>
        <I n="check" s={10} /> Tersimpan
      </div>
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
      {soal.type === "pg" && soal.opsi?.map((o, i) => <button key={i} className={`quiz-opt ${answers[idx] === i ? "selected" : ""}`} onClick={() => answer(i)}><div className="quiz-letter">{String.fromCharCode(65 + i)}</div><span style={{ flex: 1 }}>{o}</span></button>)}
      {soal.type === "tf" && <div style={{ display: "flex", gap: 10 }}>{["Benar", "Salah"].map((o, i) => <button key={i} className={`quiz-opt ${answers[idx] === i ? "selected" : ""}`} style={{ flex: 1 }} onClick={() => answer(i)}><div className="quiz-letter">{i === 0 ? "B" : "S"}</div><span style={{ flex: 1 }}>{o}</span></button>)}</div>}
      {soal.type === "komplex" && <><div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Pilih semua jawaban yang benar</div>{soal.opsi?.map((o, i) => { const sel = (answers[idx] || []).includes(i); return <button key={i} className={`quiz-opt ${sel ? "selected" : ""}`} onClick={() => toggleMulti(i)}><div style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${sel ? "var(--accent)" : "var(--line)"}`, background: sel ? "var(--accent)" : "var(--surface-alt)", display: "grid", placeItems: "center", flexShrink: 0 }}>{sel && <I n="check" s={13} style={{ color: "#fff" }} />}</div><span style={{ flex: 1 }}>{String.fromCharCode(65 + i)}. {o}</span></button>; })}</>}
      {soal.type === "pasang" && <><div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Pasangkan kolom kiri dengan kolom kanan</div>{soal.kiri?.map((k, ki) => <div key={ki} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ flex: 1, padding: "8px 12px", background: "var(--accent-soft)", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, color: "var(--accent-2)" }}>{k}</div><I n="chevR" s={14} /><select className="inp" style={{ flex: 1, fontSize: 13 }} value={(answers[idx] || {})[ki] ?? ""} onChange={e => { const cur = answers[idx] || {}; answer({ ...cur, [ki]: Number(e.target.value) }); }}><option value="">Pilih...</option>{soal.kanan?.map((r, ri) => <option key={ri} value={ri}>{r}</option>)}</select></div>)}</>}
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
  const photo = store.getPhoto(user.id);

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
      await store.savePhoto(user.id, b64);
      setShowPhotoPicker(false);
    };
    reader.readAsDataURL(file);
  }

  function setPresetAvatar(color) {
    const initials = user.nama.trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="100" fill="${color}"/><text x="100" y="130" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-weight="700" font-size="80" fill="white">${initials}</text></svg>`;
    const b64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    store.savePhoto(user.id, b64);
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
            <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 10, color: "var(--bad)" }} onClick={() => { store.savePhoto(user.id, null); setShowPhotoPicker(false); }}>
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
          {[{ v: stats.poin.toLocaleString("id-ID"), l: "total poin" }, { v: String(stats.tugasSelesai), l: "tugas selesai" }, { v: stats.nilaiRata || "—", l: "nilai rata" }].map(s => <div key={s.l}><div className="stat-num" style={{ fontSize: 22, fontWeight: 700 }}>{s.v}</div><div style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.l}</div></div>)}
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
          </div>

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
const EXCEL_EXPORT_IPA_B64 = "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";
const EXCEL_EXPORT_INFO_B64 = "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";

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
  const b64 = "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";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
  const siswaList = ACCOUNTS.filter(a => a.role === "siswa" && a.jenjang === jenjang);
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
    sc(ws.getCell("A2"), `SMP Negeri 15 Banda Aceh  ·  Tahun Ajaran 2025/2026  ·  Dicetak: ${new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}`, { fill:"EAF4F3", font:"6B7280", size:9, italic:true });
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
          if (n.includes("pilihan") || n.includes("ganda") || n.includes("pg") || n.includes("biru")) tipe = "pg";
          else if (n.includes("benar") || n.includes("salah") || n.includes("tf") || n.includes("hijau")) tipe = "tf";
          else if (n.includes("cocok") || n.includes("mcc") || n.includes("oranye") || n.includes("orange")) tipe = "komplex";
          else if (n.includes("urutan") || n.includes("susun") || n.includes("ungu") || n.includes("pasang")) tipe = "pasang";
          if (!tipe) return;

          rows.forEach(row => {
            const pertanyaan = row["Pertanyaan / Instruksi"] || row["Pernyataan"] || "";
            if (!pertanyaan.toString().trim()) return;
            const poin = Number(row["Poin"]) || 10;

            if (tipe === "pg") {
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwb = (row["Jawaban (A/B/C/D)"] || row["Jawaban Benar\n(A/B/C/D)"] || "A").toString().trim().toUpperCase();
              const jwbIdx = ["A","B","C","D"].indexOf(jwb);
              soal.push({ id: uid(), type: "pg", pertanyaan: pertanyaan.toString(), opsi, jawaban: jwbIdx >= 0 ? jwbIdx : 0, poin });
            } else if (tipe === "tf") {
              const jwb = (row["Jawaban (Benar/Salah)"] || "Benar").toString().trim().toLowerCase();
              soal.push({ id: uid(), type: "tf", pertanyaan: pertanyaan.toString(), jawaban: jwb === "benar" ? 0 : 1, poin });
            } else if (tipe === "komplex") {
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwbStr = (row["Jawaban Benar (misal: A,C)"] || row["Jawaban Benar\n(misal: A,C)"] || "A").toString();
              const jwb = jwbStr.split(",").map(s => ["A","B","C","D"].indexOf(s.trim().toUpperCase())).filter(i => i >= 0);
              soal.push({ id: uid(), type: "komplex", pertanyaan: pertanyaan.toString(), opsi, jawaban: jwb, poin });
            } else if (tipe === "pasang") {
              const kiri = [row["Item Kiri 1"], row["Item Kiri 2"], row["Item Kiri 3"]].map(String).filter(v => v && v !== "undefined");
              const kanan = [row["Item Kanan 1 (pasangan Kiri 1)"], row["Item Kanan 2 (pasangan Kiri 2)"], row["Item Kanan 3 (pasangan Kiri 3)"]].map(String).filter(v => v && v !== "undefined");
              const jwb = kiri.map((_, i) => i);
              soal.push({ id: uid(), type: "pasang", pertanyaan: pertanyaan.toString(), kiri, kanan, jawaban: jwb, poin });
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
function DashboardGuru({ store, navigate }) {
  const [jenjang, setJenjang] = useState("VII");
  const tugasAll = store.getTugas().filter(t => t.jenjang === jenjang);
  const lb = store.getLeaderboard(jenjang);
  const siswa = ACCOUNTS.filter(a => a.role === "siswa" && a.jenjang === jenjang);
  const subs = store.getSubs();
  const totalSubs = subs.filter(s => { const t = store.getTugas().find(x => x.id === s.tugasId); return t && t.jenjang === jenjang; }).length;
  const tugasAktif = tugasAll.filter(t => fmtDl(t.deadline).tone !== "bad");
  const tugasLewat = tugasAll.filter(t => fmtDl(t.deadline).tone === "bad");
  const pctNgerjain = tugasAll.length === 0 ? "—"
    : `${Math.min(100, Math.round((totalSubs / (tugasAll.length * (siswa.length || 1))) * 100))}%`;

  // Rata poin kelas
  const rataPoin = lb.length ? Math.round(lb.reduce((a,s) => a + (s.poin||0), 0) / lb.length) : 0;

  // Perlu perhatian: siswa dengan tugas paling sedikit
  const perluPerhatian = [...lb].sort((a,b) => (a.tugasSelesai||0) - (b.tugasSelesai||0)).slice(0, 3).filter(s => (s.tugasSelesai||0) < tugasAktif.length);

  // Dynamic greeting
  const hour = new Date().getHours();
  const greetingGuru = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return <>
    <div className="page">
      {/* Greeting — mobile & desktop */}
      <div style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 3 }}>{greetingGuru}!</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Halo, Pak Fatta</h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>M. Hasanul Fatta, S.Pd.</p>
      </div>
      <div className="dt" style={{ paddingTop: 0, marginBottom: 8 }}>
        <div />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => backupFromStore(store)} title="Download backup data"><I n="chartBar" s={13} /> Backup</button>
          <button className="btn btn-outline btn-sm" onClick={() => exportLaporan(store, jenjang)}><I n="chartBar" s={13} /> Laporan</button>
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

      {/* Tugas berjalan */}
      <div className="sh"><h2>Tugas berjalan</h2></div>
      {tugasAktif.length === 0 ? (
        <Card><div className="empty empty-box"><I n="book" s={32} /><h3>Belum ada tugas</h3><p>Buat tugas pertama untuk Kelas {jenjang}!</p><button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate("buat-tugas")}><I n="plus" s={14} /> Buat Tugas</button></div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {tugasAktif.slice(0, 3).map(t => {
            const dl = fmtDl(t.deadline);
            const subCount = subs.filter(s => s.tugasId === t.id).length;
            const pct = siswa.length ? Math.round((subCount / siswa.length) * 100) : 0;
            return (
              <Card key={t.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".05em" }}>{t.mapel}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{t.judul}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span>
                      <span className="chip">{t.soal?.length || 0} soal</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="stat-num" style={{ fontSize: 18, fontWeight: 800 }}>{subCount}<span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 400 }}>/{siswa.length}</span></div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)" }}>pengumpulan</div>
                  </div>
                </div>
                <div className="progress"><div style={{ width: `${pct}%`, background: pct < 30 ? "var(--bad)" : pct < 70 ? "var(--warn)" : "var(--good)" }} /></div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>{siswa.length - subCount} siswa belum mengerjakan</div>
              </Card>
            );
          })}
          {tugasAktif.length > 3 && <button className="btn btn-ghost btn-sm" onClick={() => navigate("tugas-guru")} style={{ alignSelf: "center" }}>Lihat semua {tugasAktif.length} tugas <I n="chevR" s={12} /></button>}
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
                <span className="chip chip-warn" style={{ fontSize: 10 }}>Follow up</span>
              </div>
            ))}
        </Card>
      </div>

      {/* Export mobile */}
      <button className="btn btn-outline btn-full" style={{ marginBottom: 8 }} onClick={() => exportNilai(store, jenjang)}><I n="chartBar" s={14} /> Export Nilai Kelas {jenjang}</button>

      {/* Analisis Soal per Tugas */}
      {(() => {
        const allSubs = store.getSubs().filter(s => { const t = store.getTugas().find(x => x.id === s.tugasId); return t && t.jenjang === jenjang; });
        const tugasWithSoal = store.getTugas().filter(t => t.jenjang === jenjang && t.soal?.length > 0 && allSubs.some(s => s.tugasId === t.id));
        if (tugasWithSoal.length === 0) return null;
        return <>
          <div className="sh"><h2>Analisis Soal</h2></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            {tugasWithSoal.slice(0, 5).map(t => {
              const subs = allSubs.filter(s => s.tugasId === t.id);
              const avgNilai = Math.round(subs.reduce((a, s) => a + s.nilai, 0) / subs.length);
              const susah = avgNilai < 60; const medium = avgNilai >= 60 && avgNilai < 80;
              const color = avgNilai >= 80 ? "var(--good)" : avgNilai >= 60 ? "var(--warn)" : "var(--bad)";
              const label = avgNilai >= 80 ? "Mudah" : avgNilai >= 60 ? "Sedang" : "Sulit";
              return (
                <button key={t.id} onClick={() => navigate("analisis-tugas", { tugasId: t.id })}
                  style={{ textAlign: "left", background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: "var(--r)", padding: "12px 14px", cursor: "pointer", transition: "all .15s", fontFamily: "var(--font)", width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{t.judul}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.mapel} · {subs.length} siswa · {t.soal.length} soal</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color }}>{avgNilai}</div>
                      <div style={{ fontSize: 10, color, fontWeight: 600 }}>{label}</div>
                    </div>
                  </div>
                  <div style={{ height: 5, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${avgNilai}%`, background: color, borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    Lihat analisis per soal <I n="chevR" s={11} />
                  </div>
                </button>
              );
            })}
          </div>
        </>;
      })()}
    </div>
  </>;
}


// ─── ANALISIS TUGAS DETAIL ───
function AnalisisTugasDetail({ store, tugasId, navigate }) {
  const t = store.getTugas().find(x => x.id === tugasId);
  if (!t) return <div className="empty">Tugas tidak ditemukan.</div>;
  const subs = store.getSubs().filter(s => s.tugasId === t.id);
  const total = subs.length;
  if (total === 0) return <div className="empty">Belum ada siswa yang mengerjakan.</div>;

  const avgNilai = Math.round(subs.reduce((a, s) => a + s.nilai, 0) / total);
  const feedback = avgNilai >= 85
    ? "Soal tergolong mudah dikuasai siswa. Pertimbangkan meningkatkan kompleksitas soal untuk menantang siswa lebih jauh."
    : avgNilai >= 65
      ? "Tingkat kesulitan soal cukup baik. Sebagian siswa sudah memahami materi, namun masih ada ruang untuk perbaikan."
      : "Soal tergolong sulit bagi siswa. Pertimbangkan mengulang materi sebelum memberikan tugas serupa.";

  // Hitung akurasi per soal dari soalResults
  const soalStats = (t.soal || []).map((s, i) => {
    const correctCount = subs.filter(sub =>
      sub.soalResults?.find(r => r.origIdx === i && r.correct)
    ).length;
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
      <button className="topbar-back" onClick={() => navigate("home-guru")}><I n="chevL" s={18} /></button>
      <div className="topbar-title">Analisis Soal</div>
      <div style={{ width: 36 }} />
    </div>
    <div className="page">
      <div style={{ paddingTop: 8, paddingBottom: 14 }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>{t.mapel}</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>{t.judul}</h1>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{total} siswa · {t.soal?.length || 0} soal</div>
      </div>

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
function TugasGuru({ store, navigate }) {
  const [jenjang, setJenjang] = useState("VII");
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState("aktif");
  const [toast, setToast] = useState("");
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
        <button className="btn btn-primary" onClick={() => navigate("buat-tugas")}><I n="plus" s={14} /> Tugas baru</button>
      </div>

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
  const msgs = store.getThread(user.id, contact.id);

  useEffect(() => {
    store.markRead(user.id, contact.id);
  }, [msgs.length]);

  useEffect(() => {
    const el = document.getElementById("chat-msgs-end");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send() {
    if (!text.trim()) return;
    const t = text; setText("");
    await store.sendMessage(user.id, contact.id, t);
  }

  return (
    <div className="chat-thread">
      {/* Header */}
      <div className="chat-thread-hdr">
        <button className="topbar-back" onClick={onBack}><I n="chevL" s={18} /></button>
        <UserAvatar userId={contact.id} name={contact.nama} size="md" store={store} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.nama}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{contact.role === "guru" ? "Guru · IPA & Informatika" : `Kelas ${contact.jenjang}`}</div>
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
          const sender = ACCOUNTS.find(a => a.id === m.fromId);
          const prevMsg = msgs[i - 1];
          const showName = !isMe && (!prevMsg || prevMsg.fromId !== m.fromId);
          return (
            <div key={m.key || i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              {showName && <div className="msg-name" style={{ marginLeft: 4 }}>{sender?.namaDisplay || sender?.nama?.split(" ")[0]}</div>}
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
        <button onClick={send} disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: "50%", background: text.trim() ? "var(--accent)" : "var(--surface-alt)", color: text.trim() ? "#fff" : "var(--ink-4)", border: "none", cursor: text.trim() ? "pointer" : "default", display: "grid", placeItems: "center", flexShrink: 0, transition: "all .15s" }}>
          <I n="send" s={16} />
        </button>
      </div>
    </div>
  );
}

function ChatScreen({ user, store }) {
  const [activeContact, setActiveContact] = useState(null);
  const [tab, setTab] = useState("VII");
  const [showBcModal, setShowBcModal] = useState(false);
  const [editBc, setEditBc] = useState(null);
  const isGuru = user.role === "guru";
  const contacts = store.getContacts(user.id, user.jenjang, user.role);
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
            <div style={{ fontSize: 14, fontWeight: unread > 0 ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.nama}
              {c.role === "guru" && <span style={{ marginLeft: 6, fontSize: 10, background: "var(--accent-soft)", color: "var(--accent-2)", borderRadius: 99, padding: "1px 6px", fontWeight: 600 }}>Guru</span>}
            </div>
            {last && <div style={{ fontSize: 11, color: "var(--ink-4)", flexShrink: 0 }}>{fmtTime(last.ts)}</div>}
          </div>
          <div style={{ fontSize: 12, color: unread > 0 ? "var(--ink-2)" : "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2, fontWeight: unread > 0 ? 600 : 400 }}>
            {store.isOnline(c.id)
              ? <span style={{ color: "#0d9488", fontWeight: 500, fontSize: 11 }}>Online</span>
              : last ? (last.fromId === user.id ? `Kamu: ${last.text}` : last.text) : (c.role === "guru" ? "IPA & Informatika" : `Kelas ${c.jenjang}`)
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
function exportLaporan(store, jenjang) {
  const siswa = store.getAllSiswa(jenjang);
  const tugas = store.getTugas().filter(t => t.jenjang === jenjang);
  const subs = store.getSubs();
  const now = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const rows = siswa.map(s => {
    const stats = store.getStats(s.id);
    const lv = getLevel(stats.poin || 0);
    const badges = store.getBadges(s.id);
    return `
      <tr>
        <td>${s.nama}</td>
        <td>${s.id}</td>
        <td style="text-align:center;font-weight:700">${stats.poin || 0}</td>
        <td style="text-align:center">${stats.tugasSelesai || 0}/${tugas.length}</td>
        <td style="text-align:center">${stats.nilaiRata || "—"}</td>
        <td style="text-align:center">${lv.name}</td>
        <td style="text-align:center">${badges.length}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Kelas ${jenjang} — Astrolab</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 32px 40px; color: #1a2332; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #0d6b7a; }
  .title { font-size: 22px; font-weight: 800; color: #0d6b7a; letter-spacing: -.02em; }
  .subtitle { font-size: 12px; color: #7a8fa3; margin-top: 4px; }
  .meta { text-align: right; font-size: 11px; color: #7a8fa3; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #0d6b7a; color: white; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  tr:nth-child(even) td { background: #f7fafa; }
  .footer { margin-top: 24px; font-size: 11px; color: #7a8fa3; text-align: center; padding-top: 12px; border-top: 1px solid #e2e8f0; }
  @media print { body { padding: 16px 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Astrolab · Our Classroom</div>
      <div class="subtitle">Laporan Rekap Nilai — Kelas ${jenjang}</div>
    </div>
    <div class="meta">
      Dicetak: ${now}<br>
      Total siswa: ${siswa.length}<br>
      Total tugas: ${tugas.length}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nama Siswa</th>
        <th>ID</th>
        <th style="text-align:center">Total Poin</th>
        <th style="text-align:center">Tugas Selesai</th>
        <th style="text-align:center">Rata-rata Nilai</th>
        <th style="text-align:center">Level</th>
        <th style="text-align:center">Badge</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">© 2026 M. Hasanul Fatta · Astrolab Classroom</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

// ─── ACTIVITY HEATMAP ───
function ActivityHeatmap({ subs }) {
  const days = 28;
  const today = new Date(); today.setHours(0,0,0,0);
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().slice(0,10);
    const count = subs.filter(s => s.submittedAt?.slice(0,10) === dateStr).length;
    return { dateStr, count };
  });
  const maxCount = Math.max(...cells.map(c => c.count), 1);
  const getColor = (count) => {
    if (count === 0) return "var(--surface-alt)";
    const pct = count / maxCount;
    if (pct < 0.25) return "#b2dfdb";
    if (pct < 0.5) return "#4db6ac";
    if (pct < 0.75) return "#0d9488";
    return "var(--accent)";
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {cells.map((c, i) => (
          <div key={i} title={`${c.dateStr}: ${c.count} pengerjaan`}
            style={{ width: 14, height: 14, borderRadius: 3, background: getColor(c.count), cursor: "default" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, color: "var(--ink-3)" }}>4 minggu lalu</span>
        <span style={{ fontSize: 10, color: "var(--ink-3)" }}>Hari ini</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
        <span style={{ fontSize: 10, color: "var(--ink-3)" }}>Kurang</span>
        {["var(--surface-alt)", "#b2dfdb", "#4db6ac", "#0d9488", "var(--accent)"].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: "var(--ink-3)" }}>Banyak</span>
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

      {/* Heatmap aktivitas */}
      <div className="sh"><h2>Aktivitas 4 Minggu Terakhir</h2></div>
      <Card style={{ marginBottom: 16 }}>
        <ActivityHeatmap subs={jenjangSubs} />
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
                  <span style={{ fontSize: 10, fontWeight: 600, color: lv.color }}>{lv.emoji} {lv.name}</span>
                  {bdgs.slice(0,3).map(id => { const b = ALL_BADGES.find(x => x.id === id); return b ? <span key={id} title={b.name} style={{ fontSize: 11 }}>{b.emoji}</span> : null; })}
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
  const photo = store.getPhoto(user.id); // reaktif dari Firebase
  const [editing, setEditing] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

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
    reader.onload = async ev => { await store.savePhoto(user.id, ev.target.result); setShowPhotoPicker(false); };
    reader.readAsDataURL(file);
  }

  function setPreset(color) {
    const initials = profil.nama.trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="100" fill="${color}"/><text x="100" y="130" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-weight="700" font-size="80" fill="white">${initials}</text></svg>`;
    const b64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    store.savePhoto(user.id, b64); setShowPhotoPicker(false);
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
          {photo && <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 10, color: "var(--bad)" }} onClick={() => { store.savePhoto(user.id, null); setShowPhotoPicker(false); }}>Hapus foto profil</button>}
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
    </div>
  </>;
}

// ─── MANAJEMEN SISWA (Guru) ───
function ManajemenSiswa({ store }) {
  const [jenjang, setJenjang] = useState("VII");
  const [showAdd, setShowAdd] = useState(false);
  const [resetTarget, setResetTarget] = useState(null); // { id, nama }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [pwVisible, setPwVisible] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const siswa = store.getAllSiswa(jenjang);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function handleDelete() {
    if (!deleteTarget) return;
    await store.deleteSiswa(deleteTarget.id);
    setDeleteTarget(null);
    showToast(`${deleteTarget.nama} dihapus.`);
  }

  async function handleReset() {
    if (!resetTarget || !newPw.trim()) return;
    setSaving(true);
    await store.resetPassword(resetTarget.id, newPw.trim());
    setSaving(false); setResetTarget(null); setNewPw("");
    showToast("Password berhasil direset!");
  }

  return (
    <div className="page">
      <div className="dt"><div><h1>Manajemen Siswa</h1><p>Tambah, hapus, dan reset password siswa</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><I n="plus" s={14} /> Tambah Siswa</button>
      </div>
      <div className="topbar">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Siswa</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><I n="plus" s={13} /></button>
      </div>

      {/* Toast */}
      {toast && <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 500, whiteSpace: "nowrap", boxShadow: "var(--shadow)" }}>{toast}</div>}

      {/* Konfirmasi hapus */}
      {deleteTarget && <Confirm title={`Hapus ${deleteTarget.nama}?`} desc="Akun siswa akan dihapus permanen. Data poin & tugas tetap tersimpan." onOk={handleDelete} onCancel={() => setDeleteTarget(null)} />}

      {/* Modal reset password */}
      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <p style={{ marginBottom: 16 }}>Reset password untuk <b>{resetTarget.nama}</b> ({resetTarget.id})</p>
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

      {/* Modal tambah siswa */}
      {showAdd && <TambahSiswaModal store={store} onClose={() => setShowAdd(false)} onSuccess={(id) => { setShowAdd(false); showToast(`Siswa ditambahkan! ID: ${id}`); }} />}

      {/* Tab kelas */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {["VII","VIII"].map(j => (
          <button key={j} className={`tab ${jenjang === j ? "active" : ""}`} onClick={() => setJenjang(j)}>
            Kelas {j} ({store.getAllSiswa(j).length})
          </button>
        ))}
      </div>

      {/* List siswa */}
      {siswa.length === 0
        ? <Card><div className="empty empty-box"><I n="user" s={32} /><h3>Belum ada siswa</h3><p>Tambah siswa baru untuk Kelas {jenjang}.</p></div></Card>
        : <Card pad="none" style={{ overflow: "hidden" }}>
            {siswa.map((s, i) => {
              const st = store.getStats(s.id);
              const lv = getLevel(st.poin || 0);
              const isHardcoded = !store.isFbAccount(s.id);
              const showPw = pwVisible[s.id];
              return (
                <div key={s.id} style={{ padding: "14px 16px", borderBottom: i < siswa.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <Avatar name={s.nama} size="md" photo={store.getPhoto(s.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{s.nama}</span>
                        {isHardcoded && <span style={{ fontSize: 9, fontWeight: 700, background: "var(--surface-alt)", color: "var(--ink-3)", padding: "2px 6px", borderRadius: 4, letterSpacing: ".04em" }}>BUILT-IN</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600, color: "var(--accent-2)", background: "var(--accent-tint)", padding: "2px 7px", borderRadius: 5 }}>{s.id}</span>
                        <span style={{ fontSize: 11, color: lv.color, fontWeight: 600 }}>{lv.emoji} {lv.name}</span>
                        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{st.poin || 0} pt</span>
                      </div>
                      {/* Password row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Password:</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", background: "var(--surface-alt)", padding: "2px 7px", borderRadius: 4 }}>
                          {showPw ? s.password : "••••••••"}
                        </span>
                        <button onClick={() => setPwVisible(v => ({ ...v, [s.id]: !v[s.id] }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: "2px 4px", fontSize: 10 }}>
                          {showPw ? "Sembunyikan" : "Lihat"}
                        </button>
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-soft btn-sm" style={{ fontSize: 11 }} onClick={() => { setResetTarget(s); setNewPw(""); }}>
                        <I n="edit" s={12} /> Reset PW
                      </button>
                      {!isHardcoded && (
                        <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }} onClick={() => setDeleteTarget(s)}>
                          <I n="trash" s={12} /> Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
      }

      {/* Summary */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface-alt)", borderRadius: "var(--r)", fontSize: 12, color: "var(--ink-3)", display: "flex", gap: 16 }}>
        <span>Total: <b style={{ color: "var(--ink)" }}>{store.getAllSiswa().length} siswa</b></span>
        <span>Kelas VII: <b style={{ color: "var(--ink)" }}>{store.getAllSiswa("VII").length}</b></span>
        <span>Kelas VIII: <b style={{ color: "var(--ink)" }}>{store.getAllSiswa("VIII").length}</b></span>
      </div>
    </div>
  );
}

// ─── TAMBAH SISWA MODAL ───
function TambahSiswaModal({ store, onClose, onSuccess }) {
  const [form, setForm] = useState({ nama: "", namaDisplay: "", jenjang: "VII", password: "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Preview ID
  const previewId = form.nama.trim()
    ? (() => {
        const words = form.nama.trim().split(/\s+/);
        let akronim = words.length >= 3 ? words[0][0]+words[1][0]+words[2][0]
          : words.length === 2 ? words[0][0]+words[1][0]+(words[1][1]||words[0][1]||"X")
          : (words[0].slice(0,3));
        return akronim.toUpperCase().replace(/[^A-Z]/g,"X").slice(0,3) + "-9XX";
      })()
    : "—";

  async function submit() {
    if (!form.nama.trim()) { setErr("Nama lengkap wajib diisi."); return; }
    if (!form.password.trim() || form.password.length < 6) { setErr("Password minimal 6 karakter."); return; }
    setSaving(true);
    try {
      const id = await store.addSiswa({
        nama: form.nama.trim(),
        namaDisplay: form.namaDisplay.trim() || form.nama.trim().split(" ")[0],
        jenjang: form.jenjang,
        kelas: `Kelas ${form.jenjang}`,
        password: form.password.trim(),
      });
      onSuccess(id);
    } catch (e) { setErr("Gagal menambahkan siswa. Coba lagi."); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <h3>Tambah Siswa Baru</h3>
        <p style={{ marginBottom: 16 }}>ID akan digenerate otomatis dari akronim nama.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="fg">
            <label className="lbl">Nama Lengkap</label>
            <input className="inp" value={form.nama} onChange={e => set("nama", e.target.value)} placeholder="Contoh: Budi Santoso Pratama" autoFocus />
            {form.nama.trim() && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>ID akan jadi: <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)" }}>{previewId}</span></div>}
          </div>
          <div className="fg">
            <label className="lbl">Nama Panggilan</label>
            <input className="inp" value={form.namaDisplay} onChange={e => set("namaDisplay", e.target.value)} placeholder="Contoh: Budi (opsional)" />
          </div>
          <div className="fg">
            <label className="lbl">Kelas</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["VII","VIII"].map(j => <button key={j} type="button" className={`btn btn-sm ${form.jenjang === j ? "btn-primary" : "btn-outline"}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => set("jenjang", j)}>Kelas {j}</button>)}
            </div>
          </div>
          <div className="fg">
            <label className="lbl">Password</label>
            <input className="inp" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 6 karakter" />
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>Siswa pakai ini untuk login pertama kali.</div>
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
  const siswaList = ACCOUNTS.filter(a => a.role === "siswa");
  const [selected, setSelected] = useState(siswaList[0]?.id || "");
  const [tab, setTab] = useState("VII");
  const filtered = siswaList.filter(s => s.jenjang === tab);
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
                <Avatar name={s.nama} size="sm" photo={store.getPhoto(s.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.namaDisplay}</div>
                  <div style={{ fontSize: 10, color: lv.color, fontWeight: 600 }}>{lv.emoji} {lv.name}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {bdgs.length === 0
                  ? <span style={{ fontSize: 10, color: "var(--ink-4)" }}>Belum ada badge</span>
                  : bdgs.slice(0,4).map(id => { const b = ALL_BADGES.find(x => x.id === id); return b ? <span key={id} title={b.name} style={{ fontSize: 14 }}>{b.emoji}</span> : null; })}
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
                <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 10px", borderRadius: 12, background: has ? b.bg : "var(--surface-alt)", border: `1.5px solid ${has ? b.color + "44" : "var(--line)"}`, minWidth: 68, textAlign: "center", opacity: has ? 1 : 0.5 }}>
                  <span style={{ fontSize: 22 }}>{b.emoji}</span>
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
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 10px", borderRadius: 12, background: has ? b.bg : "var(--surface-alt)", border: `1.5px solid ${has ? b.color : "var(--line)"}`, minWidth: 72, textAlign: "center", cursor: "pointer", transition: "all .15s", fontFamily: "var(--font)" }}>
                  <span style={{ fontSize: 24 }}>{b.emoji}</span>
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
const GNAV = [{ id: "home-guru", l: "Dashboard", ic: "layers" }, { id: "tugas-guru", l: "Tugas", ic: "book" }, { id: "leaderboard", l: "Ranking", ic: "trophy" }, { id: "chat", l: "Pesan", ic: "chat" }, { id: "kelas", l: "Siswa", ic: "user" }];

function Sidebar({ user, route, navigate, onLogout, store }) {
  const nav = user.role === "guru" ? GNAV : SNAV;
  const unread = store.getUnreadCount(user.id);
  const photo = store.getPhoto(user.id);
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
export default function App() {
  const [user, setUser] = useState(() => {
    try { const saved = localStorage.getItem("astrolab.user"); return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [route, setRoute] = useState(() => {
    try { const saved = localStorage.getItem("astrolab.user"); const u = saved ? JSON.parse(saved) : null; return u ? (u.role === "guru" ? "home-guru" : "home") : "home"; } catch { return "home"; }
  });
  const [params, setParams] = useState({});
  const store = useStore();
  function navigate(r, p = {}) { setRoute(r); setParams(p); window.scrollTo(0, 0); }
  function handleLogin(u) {
    try { localStorage.setItem("astrolab.user", JSON.stringify(u)); } catch {}
    setUser(u); setRoute(u.role === "guru" ? "home-guru" : "home");
    setTimeout(() => setOnline(u.id), 500);
  }
  function handleLogout() {
    if (user) setOffline(user.id);
    try { localStorage.removeItem("astrolab.user"); } catch {}
    setUser(null); setRoute("home"); setParams({});
  }

  // Presence — realtime online/offline detection
  useEffect(() => {
    if (!user) return;
    setOnline(user.id);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") setOnline(user.id);
      else setOffline(user.id);
    };
    const handleBeforeUnload = () => setOffline(user.id);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      setOffline(user.id);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);
  if (store.loading) return <><style>{CSS}</style><div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#1a8a9b 0%,var(--accent) 40%,var(--accent-2) 70%,#062a35 100%)", gap: 14 }}><LogoBold size={72} /><div style={{ color: "#fff", fontSize: 20, fontWeight: 900, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "-.02em" }}>Astrolab</div><div style={{ color: "rgba(255,255,255,.55)", fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: ".04em" }}>Our Classroom</div></div></>;
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
      else if (route === "chat") screen = <ChatScreen user={user} store={store} />;
      else if (route === "kelas") screen = <KelasView store={store} navigate={navigate} />;
      else if (route === "analisis-tugas") screen = <AnalisisTugasDetail store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "badge-manager") screen = <BadgeManager store={store} />;
      else if (route === "manajemen-siswa") screen = <ManajemenSiswa store={store} />;
      else if (route === "profil-guru") screen = <ProfilGuru user={user} store={store} navigate={navigate} />;
      else screen = <DashboardGuru store={store} navigate={navigate} />;
    } else {
      if (route === "home") screen = <DashboardSiswa user={user} store={store} navigate={navigate} />;
      else if (route === "leaderboard") screen = <LeaderboardScreen user={user} store={store} />;
      else if (route === "tugas") screen = <DaftarTugas user={user} store={store} navigate={navigate} />;
      else if (route === "tugas-detail") screen = <DetailTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "kerjakan") screen = <KerjakanTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "profil") screen = <ProfilSiswa user={user} store={store} />;
      else if (route === "chat") screen = <ChatScreen user={user} store={store} />;
      else screen = <DashboardSiswa user={user} store={store} navigate={navigate} />;
    }
  }
  return <>
    <style>{CSS}</style>
    {!user ? <LoginScreen onLogin={handleLogin} /> :
      <div className="shell">
        <header className="hdr">
          <div className="hdr-brand">
            <div className="hdr-mark"><LogoBold size={24} /></div>
            <div className="hdr-name"><b>Astrolab</b><small style={{ fontSize: 10, opacity: .65 }}>Our Classroom</small></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, opacity: .85 }}>{user.role === "guru" ? "Guru" : `Kelas ${user.jenjang}`}</span>
            <button onClick={() => navigate(user.role === "guru" ? "profil-guru" : "profil")} style={{ background: "none", border: "none", cursor: "pointer", borderRadius: "50%", padding: 0, display: "flex" }}>
              <Avatar name={user.nama} size="sm" photo={store.getPhoto(user.id)} />
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
  </>;
}

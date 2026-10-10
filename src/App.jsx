// Astrolab Classroom — Production LMS
// © 2026 M. Hasanul Fatta
// UI: Original (Plus Jakarta Sans + teal #0d6b7a)
// Engine: Firebase Realtime Database + Firebase Authentication

import { useState, useEffect, useRef, Component } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, onValue, remove, update, onDisconnect, serverTimestamp } from "firebase/database";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import "./styles/main.css";
import { IC, I } from './components/icons';
import { shuffle, fmtDl, uid, getTahunAjaran, getSemesterAktif, getPeriodeAktif, getPeriodeOptions, fmtLastSeen, withTimeout, fuzzyMatchText, compressImage, SKIP_PREFIXES, genSiswaId, getFirstName, genPassword } from './utils/helpers';
import { getFlameTheme, FlameAnimated, StreakCometSVG, StreakCard, Avatar, UserAvatar, OnlineDot, Confirm, LogoBold, ConfettiRain, CelebrationAvatar, MapelIcon, Card } from './components/visual';
import { TIERS, LEVELS, getLevel, getTier, getLevelProgress, TierIcon, LevelBadge, BADGE_RIMS, BadgeGlyph, BadgeIcon, AUTO_BADGES, MANUAL_BADGES, ALL_BADGES, checkAutoBadges, LevelCard, BadgeChip, BadgesRow, PoinChart } from './components/gamification';
import { downloadTemplateSoal, exportNilai, downloadTemplateNilaiAkhir, exportRekapNilaiAkhir, backupFromStore, importSoalFromExcel, parseNilaiAkhirExcel } from './utils/excel';
import { LaporanModal } from './utils/laporan';
import { ChatScreen } from './pages/chat';
import { BankSoal, PilihDariBankSoalModal } from './pages/banksoal';
import { LatihanMandiri, MateriManager } from './pages/materi';

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

// ─── PUSH NOTIFICATIONS CONFIG ───
const VAPID_PUBLIC_KEY = "BEKTYIbd96h0tCNRDopDKXWh-ttfi65lb7bQKiVTzqww9GV4Tp2mN1udMjZHMViAGhGBcoCYgcv8HG1lo7cVlyw";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

async function callPush(action, payload) {
  try {
    const serverUrl = import.meta.env?.VITE_SERVER_URL || "https://astrolab-push-server.vercel.app";
    const secret = import.meta.env?.VITE_SERVER_SECRET || "";
    const res = await fetch(`${serverUrl}/api/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      body: JSON.stringify({ action, payload }),
    });
    return await res.json();
  } catch (e) {
    console.warn("[Push]", action, "failed:", e.message);
    return { error: e.message };
  }
}

// ─── ONLINE PRESENCE ───
async function setOnline(userId) {
  const presRef = ref(db, `presence/${userId}`);
  await set(presRef, { online: true, lastSeen: serverTimestamp() });
  onDisconnect(presRef).set({ online: false, lastSeen: serverTimestamp() });
}
async function setOffline(userId) {
  try { await set(ref(db, `presence/${userId}`), { online: false, lastSeen: serverTimestamp() }); } catch {}
}

// ─── MATERI CACHE (IndexedDB) ───
// Cache materi pages di browser supaya gak download ulang dari Firebase
const _MCDB = "astrolab_mcache";
const _MCST = "pages";
function _openMC() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(_MCDB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(_MCST)) r.result.createObjectStore(_MCST); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function getMCache(id) {
  try {
    const d = await _openMC();
    return new Promise(res => {
      const tx = d.transaction(_MCST, "readonly");
      const req = tx.objectStore(_MCST).get(id);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => res(null);
    });
  } catch { return null; }
}
async function setMCache(id, pages) {
  try {
    const d = await _openMC();
    const tx = d.transaction(_MCST, "readwrite");
    tx.objectStore(_MCST).put({ pages, t: Date.now() }, id);
  } catch {}
}
async function delMCache(id) {
  try {
    const d = await _openMC();
    const tx = d.transaction(_MCST, "readwrite");
    tx.objectStore(_MCST).delete(id);
  } catch {}
}

// ─── ACCOUNTS ───
// Hardcoded accounts removed — semua akun dikelola via Firebase Auth + /accounts/{id}
// Data siswa diambil dari fbAccounts (Firebase Realtime DB)
const ACCOUNTS = [];

// ─── STORE (Firebase) ───

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
    // Push notification ke siswa (skip jika scheduled — belum aktif)
    if (!t.scheduledAt) {
      try {
        let siswaIds;
        if (t.assignedTo && t.assignedTo.length > 0) {
          siswaIds = t.assignedTo;
        } else {
          siswaIds = getAllSiswa(t.jenjang || undefined).map(s => s.id);
        }
        if (siswaIds.length > 0) {
          const deadlineText = t.deadline ? ` (Deadline: ${t.deadline})` : "";
          callPush("sendBulk", {
            targetAccountIds: siswaIds,
            title: "Tugas Baru: " + (t.judul || "Tanpa Judul"),
            body: (t.jenjang || "") + deadlineText,
            tag: "tugas-" + newRef.key,
          });
        }
      } catch (e) { console.warn("[Push] tugas notify failed:", e.message); }
    }
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
    // Push notification to guru (fire-and-forget)
    const siswa = getAllAccounts().find(a => a.id === s.siswaId);
    const siswaName = siswa?.namaDisplay || siswa?.nama || s.siswaId;
    const t = tugas.find(x => x.id === s.tugasId);
    const tugasJudul = t?.judul || "Tugas";
    const guruId = fbGuru?.id || "fata";
    callPush("send", { targetAccountId: guruId, title: `${siswaName} mengumpulkan tugas`, body: tugasJudul, tag: `sub-${s.tugasId}` }).catch(() => {});
  };
  const hasSub = (sid, tid) => subs.some(s => s.siswaId === sid && s.tugasId === tid);
  const getSubBy = (sid, tid) => subs.find(s => s.siswaId === sid && s.tugasId === tid);

  // STATS
  const getStats = (sid) => stats[sid] || { poin: 0, poinHistory: [], tugasSelesai: 0, nilaiList: [], nilaiRata: 0, streak: 0, streakResetFor: {} };
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
  // Reset streak siswa kalau kelewat deadline (dipanggil saat siswa buka dashboard).
  //
  // PENTING: tugas yang terlewat TIDAK PERNAH hilang dari daftar "lewat deadline & belum dikerjakan".
  // Versi lama cuma cek `streak > 0` lalu reset, jadi begitu siswa melewatkan SATU tugas, kondisinya
  // permanen true — setiap kali dia buka Beranda streak-nya dibalikin ke 0 lagi, selamanya. Praktis
  // siswa itu gak akan pernah bisa bangun streak lagi seumur semester.
  //
  // Fix: catat tugas yang sudah "menghukum" siswa di stats.streakResetFor = { [tugasId]: true }.
  // Satu tugas cuma boleh reset streak SEKALI. Tugas yang sudah tercatat di-skip di kunjungan berikutnya.
  //
  // Penandaan tetap dilakukan walau streak sudah 0, supaya tugas itu gak "menabung hukuman" dan
  // baru meledak nanti pas siswa sudah membangun streak baru.
  const resetStreakIfMissed = async (sid, missedTugasIds = []) => {
    if (!missedTugasIds.length) return;
    const s = getStats(sid);
    const sudahDihitung = s.streakResetFor || {};
    const baru = missedTugasIds.filter(tid => tid && !sudahDihitung[tid]);
    if (baru.length === 0) return; // semua tugas terlewat sudah pernah diproses — jangan reset lagi

    // Multi-path update: tandai semua tugas baru sekaligus + reset streak dalam satu write.
    const patch = {};
    baru.forEach(tid => { patch[`streakResetFor/${tid}`] = true; });
    if ((s.streak || 0) > 0) patch.streak = 0;
    await update(ref(db, `stats/${sid}`), patch);
  };

  // Rebuild nilaiList & nilaiRata siswa dari SELURUH submission-nya.
  // Source of truth = submissions, bukan akumulasi incremental yang gampang melenceng.
  // `override` dipakai kalau pemanggil baru saja menulis nilai baru untuk 1 submission dan
  // state lokal `subs` belum ter-sync dari listener Firebase.
  const recomputeNilaiStats = (siswaId, override = null) => {
    const list = subs
      .filter(s => s.siswaId === siswaId)
      .map(s => (override && s.id === override.subId ? { ...s, nilai: override.nilai } : s))
      .filter(s => typeof s.nilai === "number")
      .map(s => s.nilai);
    const rata = list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
    return { nilaiList: list, nilaiRata: rata };
  };

  // ─── INTERVENSI NILAI (guru only) ───
  // Guru ubah nilai submission siswa. Auto-recompute poin di submission + stats siswa.
  // Kalau nilai baru = 0 (misal kecurangan), streak siswa auto-reset.
  // Kalau nilai naik dari failing (< 60) ke passing, streak TIDAK dipulihkan (waktu udah lewat).
  // Simpan history intervensi di submission.riwayatIntervensi[] untuk audit trail.
  const updateSubmissionNilai = async (subId, nilaiBaru, alasan) => {
    const sub = subs.find(s => s.id === subId);
    if (!sub) throw new Error("Submission tidak ditemukan");
    if (nilaiBaru < 0 || nilaiBaru > 100) throw new Error("Nilai harus 0-100");
    if (!alasan || alasan.trim().length < 10) throw new Error("Alasan minimal 10 karakter");

    const t = tugas.find(t => t.id === sub.tugasId);
    if (!t) throw new Error("Tugas tidak ditemukan");

    // Hitung poin baru proporsional: nilai baru × total poin tugas / 100
    const totalPoinTugas = (t.soal || []).reduce((sum, s) => sum + (Number(s.poin) || 10), 0);
    const nilaiLama = sub.nilai;
    const poinLama = sub.poinDapat || 0;
    let poinBaru = Math.round((nilaiBaru / 100) * totalPoinTugas);
    // Latihan Khusus (graded: false): poin 20% — konsisten dengan doSubmit & saveResultUpdate
    if (t.graded === false) {
      poinBaru = Math.round(poinBaru * 0.2);
    }
    const deltaPoin = poinBaru - poinLama;

    // Update submission — set nilai baru, poin baru, append ke riwayatIntervensi
    const now = Date.now();
    const riwayatBaru = [
      ...(sub.riwayatIntervensi || []),
      {
        nilaiSebelum: nilaiLama,
        nilaiSetelah: nilaiBaru,
        poinSebelum: poinLama,
        poinSetelah: poinBaru,
        alasan: alasan.trim(),
        updatedAt: now,
      },
    ];
    await update(ref(db, `submissions/${subId}`), {
      nilai: nilaiBaru,
      poinDapat: poinBaru,
      riwayatIntervensi: riwayatBaru,
    });

    // Update stats siswa — adjust total poin & recompute nilaiList/nilaiRata
    const st = getStats(sub.siswaId);
    const newPoin = (st.poin || 0) + deltaPoin;
    const { nilaiList: newNilaiList, nilaiRata: newNilaiRata } =
      recomputeNilaiStats(sub.siswaId, { subId, nilai: nilaiBaru });

    const statsUpdate = { poin: newPoin, nilaiList: newNilaiList, nilaiRata: newNilaiRata };
    // Kalau nilai baru = 0, reset streak (asumsi kecurangan)
    if (nilaiBaru === 0) statsUpdate.streak = 0;

    await update(ref(db, `stats/${sub.siswaId}`), statsUpdate);

    return { deltaPoin, poinBaru, nilaiLama, nilaiBaru };
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
    // Push notification to recipient (fire-and-forget)
    const sender = getAllAccounts().find(a => a.id === fromId) || (fbGuru?.id === fromId ? fbGuru : null);
    const senderName = sender?.namaDisplay || sender?.nama || fromId;
    const preview = text.trim().length > 80 ? text.trim().slice(0, 80) + "..." : text.trim();
    callPush("send", { targetAccountId: toId, title: `Pesan dari ${senderName}`, body: preview, tag: `msg-${tid}` }).catch(() => {});
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
    // Push notification ke siswa target
    try {
      const siswaIds = getAllSiswa(target === "semua" ? undefined : target).map(s => s.id);
      if (siswaIds.length > 0) {
        callPush("sendBulk", {
          targetAccountIds: siswaIds,
          title: "Pengumuman Baru",
          body: pesan.length > 100 ? pesan.slice(0, 97) + "..." : pesan,
          tag: "broadcast-" + newRef.key,
        });
      }
    } catch (e) { console.warn("[Push] broadcast notify failed:", e.message); }
  };
  const editBroadcast = async (id, pesan, target, durasiHari) => {
    const now = Date.now();
    await update(ref(db, `broadcasts/${id}`), { pesan, target, expiresAt: now + durasiHari * 86400000, durasiHari, editedAt: now });
  };
  const deleteBroadcast = async (id) => { await remove(ref(db, `broadcasts/${id}`)); };
  const getBroadcasts = (jenjang) => broadcasts.filter(b => b.target === "semua" || b.target === jenjang);
  const getAllBroadcasts = () => broadcasts;

  // ─── LAPORAN SISWA (semi-anonim, guru-only read) ───
  // Data model: { kategori, kategoriLain?, deskripsi, pelaporId, pelaporNama, jenjang, kelas, createdAt, status, catatanGuru? }
  // Rules Firebase: siswa cuma bisa CREATE (jenjang wajib "VII"), guru bisa read/write semua.
  // ASUMSI: semua siswa jenjang "VII" di sistem adalah VII-3 (kelas wali Fata).
  // TODO: refactor kalau sistem mulai support kelas granular (VII-1, VII-2, dst).
  const [reports, setReports] = useState([]);
  useEffect(() => {
    // Hanya guru yang boleh listen ke /reports (aturan Firebase Rules).
    // Siswa akan dapet PERMISSION_DENIED dan list tetap kosong — itu memang expected.
    const rRef = ref(db, "reports");
    const u7 = onValue(rRef, snap => {
      const data = snap.val();
      const list = data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : [];
      setReports(list.sort((a, b) => b.createdAt - a.createdAt));
    }, () => setReports([])); // silent fail untuk siswa
    return () => u7();
  }, []);

  const addReport = async ({ kategori, kategoriLain, deskripsi, pelaporId, pelaporNama, jenjang }) => {
    const now = Date.now();
    const newRef = push(ref(db, "reports"));
    await set(newRef, {
      kategori,
      kategoriLain: kategoriLain || "",
      deskripsi,
      pelaporId,
      pelaporNama,
      jenjang,
      createdAt: now,
      status: "baru",
    });
  };
  const updateReportStatus = async (id, status, catatanGuru) => {
    await update(ref(db, `reports/${id}`), {
      status,
      catatanGuru: catatanGuru || "",
      updatedAt: Date.now(),
    });
  };
  const deleteReport = async (id) => { await remove(ref(db, `reports/${id}`)); };
  const getReports = () => reports;
  const getUnreadReportCount = () => reports.filter(r => r.status === "baru").length;

  // ─── NILAI AKHIR (komposit multi-komponen, per siswa per mapel per periode) ───
  // Data model per record: key = `${siswaId}_${mapel}_${jenjang}_${periode}` (periode = "Semester Ganjil 2026/2027")
  // Shape: {
  //   siswaId, mapel, jenjang, periode,
  //   sumatif: { "BAB 1: Metode Ilmiah": 80, "BAB 2: ...": 75 },   // dinamis, key = nama kolom
  //   kuis: { "1 Agt": 90, "5 Agt": 85 },                            // dinamis, key = tanggal/label
  //   uts: 85, uas: 88, portofolio: 90,                              // manual, 1 angka
  //   updatedAt
  // }
  // "Tugas Astrolab" (20%) TIDAK disimpan di record ini — selalu di-derive real-time dari
  // submissions siswa yang tugas.mapel match, supaya selalu sinkron tanpa perlu manual update.
  // PENTING: filter mapel STRICT — nilai IPA dan Informatika tidak boleh tercampur.
  const [nilaiAkhirData, setNilaiAkhirData] = useState({});
  useEffect(() => {
    const naRef = ref(db, "nilaiAkhir");
    const u8 = onValue(naRef, snap => {
      setNilaiAkhirData(snap.val() || {});
    });
    return () => u8();
  }, []);

  function nilaiAkhirKey(siswaId, mapel, jenjang, periode) {
    return `${siswaId}_${mapel}_${jenjang}_${periode}`.replace(/[.#$/[\]]/g, "-");
  }

  // Ambil record mentah (atau default kosong) untuk 1 siswa
  const getNilaiAkhirRecord = (siswaId, mapel, jenjang, periode) => {
    const key = nilaiAkhirKey(siswaId, mapel, jenjang, periode);
    return nilaiAkhirData[key] || { siswaId, mapel, jenjang, periode, sumatif: {}, kuis: {}, uts: null, uas: null, portofolio: null };
  };

  // ─── AKSES REQUEST (siswa minta akses tugas yang sudah lewat deadline) ───
  // Key: `${tugasId}_${siswaId}`. Status: "pending" | "approved" | "rejected"
  const [aksesRequests, setAksesRequests] = useState({});
  useEffect(() => {
    const arRef = ref(db, "aksesRequests");
    const uAR = onValue(arRef, snap => setAksesRequests(snap.val() || {}));
    return () => uAR();
  }, []);

  const getAksesRequest = (tugasId, siswaId) => aksesRequests[`${tugasId}_${siswaId}`] || null;

  const requestAkses = async (tugasId, siswaId, siswaName, tugasJudul) => {
    const key = `${tugasId}_${siswaId}`;
    const guruId = fbGuru?.id || "fata";
    await set(ref(db, `aksesRequests/${key}`), {
      tugasId, siswaId, siswaName, tugasJudul,
      status: "pending", requestedAt: Date.now()
    });
    // Kirim system message ke guru
    const tid = getThreadId(siswaId, guruId);
    const msgRef = push(ref(db, `messages/${tid}`));
    await set(msgRef, {
      fromId: siswaId, toId: guruId,
      text: `Meminta akses susulan untuk tugas "${tugasJudul}"`,
      ts: Date.now(),
      type: "akses-request",
      meta: { tugasId, tugasJudul, siswaId, siswaName }
    });
    // Push notification ke guru
    callPush("send", {
      targetAccountId: guruId,
      title: `${siswaName} minta akses tugas`,
      body: tugasJudul,
      tag: `akses-${key}`
    }).catch(() => {});
  };

  const approveAkses = async (tugasId, siswaId, deadlineBaru, nilaiMaks = null) => {
    const key = `${tugasId}_${siswaId}`;
    const req = aksesRequests[key];
    if (!req) return;
    // Update request status
    await update(ref(db, `aksesRequests/${key}`), { status: "approved", respondedAt: Date.now() });
    // Buat susulan via existing system
    await addSusulan(tugasId, siswaId, deadlineBaru, "Permintaan akses disetujui", nilaiMaks);
    // Kirim confirmation message
    const guruId = fbGuru?.id || "fata";
    const tid = getThreadId(siswaId, guruId);
    const msgRef = push(ref(db, `messages/${tid}`));
    const capText = nilaiMaks ? ` (nilai maks: ${nilaiMaks})` : "";
    const dlText = new Date(deadlineBaru).toLocaleDateString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    await set(msgRef, {
      fromId: guruId, toId: siswaId,
      text: `Akses diizinkan untuk tugas "${req.tugasJudul}". Deadline baru: ${dlText}${capText}.`,
      ts: Date.now(),
      type: "akses-response",
      meta: { tugasId, status: "approved" }
    });
    // Push notification ke siswa
    callPush("send", {
      targetAccountId: siswaId,
      title: "Akses Tugas Diizinkan!",
      body: `"${req.tugasJudul}" — deadline baru: ${dlText}`,
      tag: `akses-${key}`
    }).catch(() => {});
  };

  const rejectAkses = async (tugasId, siswaId) => {
    const key = `${tugasId}_${siswaId}`;
    const req = aksesRequests[key];
    if (!req) return;
    await update(ref(db, `aksesRequests/${key}`), { status: "rejected", respondedAt: Date.now() });
    // Kirim rejection message
    const guruId = fbGuru?.id || "fata";
    const tid = getThreadId(siswaId, guruId);
    const msgRef = push(ref(db, `messages/${tid}`));
    await set(msgRef, {
      fromId: guruId, toId: siswaId,
      text: `Permintaan akses untuk tugas "${req.tugasJudul}" ditolak.`,
      ts: Date.now(),
      type: "akses-response",
      meta: { tugasId, status: "rejected" }
    });
    callPush("send", {
      targetAccountId: siswaId,
      title: "Permintaan Akses Ditolak",
      body: `"${req.tugasJudul}"`,
      tag: `akses-${key}`
    }).catch(() => {});
  };

  // ─── SUSULAN (akses submit personal setelah deadline utama lewat) ───
  // Beda dari "Perpanjang" (class-wide, force majeure kayak mati lampu/bencana):
  // susulan cuma buka akses untuk 1 siswa tertentu (misal sakit/izin lomba), siswa lain tetap tertutup.
  // Key: `${tugasId}_${siswaId}`. Guru WAJIB set deadlineBaru + alasan.
  const [susulanData, setSusulanData] = useState({});
  useEffect(() => {
    const suRef = ref(db, "susulan");
    const u9 = onValue(suRef, snap => setSusulanData(snap.val() || {}));
    return () => u9();
  }, []);

  const getSusulan = (tugasId, siswaId) => susulanData[`${tugasId}_${siswaId}`] || null;

  // Susulan dianggap AKTIF kalau ada record-nya DAN deadlineBaru masih di masa depan.
  // Kalau deadlineBaru juga udah lewat, susulan dianggap "sudah dipakai kesempatannya" (bukan aktif lagi).
  const isSusulanAktif = (tugasId, siswaId) => {
    const s = getSusulan(tugasId, siswaId);
    if (!s) return false;
    return new Date(s.deadlineBaru).getTime() > Date.now();
  };

  const addSusulan = async (tugasId, siswaId, deadlineBaru, alasan, nilaiMaks = null) => {
    if (!alasan || alasan.trim().length < 5) throw new Error("Alasan wajib diisi (minimal 5 karakter)");
    if (!deadlineBaru) throw new Error("Tanggal batas susulan wajib diisi");
    if (nilaiMaks !== null && (nilaiMaks < 1 || nilaiMaks > 100)) throw new Error("Nilai maksimal harus 1-100");
    const key = `${tugasId}_${siswaId}`;
    await update(ref(db, `susulan/${key}`), { tugasId, siswaId, deadlineBaru, alasan: alasan.trim(), nilaiMaks: nilaiMaks === null ? null : Number(nilaiMaks), createdAt: Date.now() });
  };
  const removeSusulan = async (tugasId, siswaId) => {
    await remove(ref(db, `susulan/${tugasId}_${siswaId}`));
  };

  // ═══ RESET SUBMISSION ═══
  // Hapus submission siswa untuk 1 tugas dan revert dampaknya di stats — supaya siswa bisa retake tugas yang sama dari nol.
  // Use case tipikal: siswa kena miskonsepsi fatal di attempt 1, guru kasih Latihan Khusus untuk address miskonsepsi,
  //   lalu buka kesempatan retake tugas asli. Nilai attempt 1 dianggap invalid (bukan cerminan pemahaman siswa).
  //
  // Yang dilakukan:
  //   1. Delete submission dari `submissions/{siswaId}_{tugasId}`
  //   2. Revert poin: kurangi stats.poin sebesar sub.poinDapat (floor 0), append entry poinHistory
  //   3. Revert nilai stats: hapus 1 occurrence sub.nilai dari nilaiList, recompute rata & tugasSelesai
  //   4. Kalau deadline utama sudah lewat: auto tambah susulan 72 jam untuk siswa ini supaya bisa retake
  //   5. Badge & streak: TIDAK di-revert (badge = milestone, streak berhubungan dgn ontime completion — bukan urusan reset)
  //
  // Non-atomic (Firebase RTDB gak support multi-path transaction gampang). Kalau salah satu step fail,
  // ada risk partial state — tapi urutan sudah diatur supaya failure paling harmless dulu (susulan gagal = paling ringan).
  const resetSubmission = async (tugasId, siswaId) => {
    // HATI-HATI: dua namespace ini pakai urutan key yang BERBEDA.
    //   submissions/{siswaId}_{tugasId}   (lihat addSub)
    //   susulan/{tugasId}_{siswaId}       (lihat getSusulan/addSusulan/removeSusulan)
    // Jangan pakai satu variabel untuk keduanya.
    const subKey = `${siswaId}_${tugasId}`;
    const susulanKey = `${tugasId}_${siswaId}`;
    const sub = subs.find(s => s.tugasId === tugasId && s.siswaId === siswaId);
    if (!sub) throw new Error("Submission tidak ditemukan.");

    const t = tugas.find(x => x.id === tugasId);
    const s = getStats(siswaId);

    // 1. Delete submission
    await remove(ref(db, `submissions/${subKey}`));

    // 2. Revert stats
    const poinDapat = Number(sub.poinDapat) || 0;
    const nilaiLama = Number(sub.nilai) || 0;
    const newPoin = Math.max(0, (s.poin || 0) - poinDapat);
    const now = Date.now();
    const newHistory = [
      ...(s.poinHistory || []),
      { minggu: (s.poinHistory || []).length + 1, poin: newPoin, ts: now, reason: "reset", tugasId },
    ];
    // Hapus 1 occurrence nilai lama dari nilaiList (first match)
    const nlIdx = (s.nilaiList || []).indexOf(nilaiLama);
    const newNilaiList = nlIdx >= 0
      ? [...(s.nilaiList || []).slice(0, nlIdx), ...(s.nilaiList || []).slice(nlIdx + 1)]
      : (s.nilaiList || []);
    const newRata = newNilaiList.length ? Math.round(newNilaiList.reduce((a, b) => a + b, 0) / newNilaiList.length) : 0;
    // STREAK: decrement 1 (min 0) — revert kontribusi attempt 1. Nanti retake akan naikin lagi via updateStats
    // kalau on-time, atau reset ke 0 kalau telat. Net effect: streak reflect "tugas ontime yang benar² terhitung".
    const newStreak = Math.max(0, (s.streak || 0) - 1);
    await update(ref(db, `stats/${siswaId}`), {
      poin: newPoin,
      poinHistory: newHistory,
      tugasSelesai: Math.max(0, (s.tugasSelesai || 0) - 1),
      nilaiList: newNilaiList,
      nilaiRata: newRata,
      streak: newStreak,
    });

    // 3. Kalau deadline utama lewat, auto-buka akses via susulan 72 jam
    let extendedSusulan = false;
    if (t) {
      const lewatUtama = fmtDl(t.deadline).tone === "bad";
      if (lewatUtama) {
        const dlBaru = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
        try {
          await update(ref(db, `susulan/${susulanKey}`), {
            tugasId, siswaId,
            deadlineBaru: dlBaru,
            alasan: "Reset tugas: buka akses retake",
            nilaiMaks: null, // tidak ada cap — retake full potential
            createdAt: Date.now(),
            fromReset: true,
          });
          extendedSusulan = true;
        } catch (e) {
          console.warn("Reset: gagal auto-buka susulan", e);
        }
      }
    }

    return { poinReverted: poinDapat, extendedSusulan };
  };

  // ═══ NILAI BOOST (Bonus Nilai Manual) ═══
  // Guru bisa nambah bonus nilai per komponen (Sumatif/Tugas Astrolab/UTS/UAS/Kuis/Portofolio)
  // Contoh use case: siswa nyelesain "Latihan Khusus" (tugas personal remedial) → guru kasih +5 di komponen tertentu.
  // Firebase struct: nilaiBoost/{siswaId_mapel_jenjang_periode}/{boostId} = { komponen, nilai, alasan, tugasRefId?, createdAt, updatedAt }
  // Cap total (base + Σboost) diterapkan saat compute nilai akhir, bukan saat store — biar historis boost tetap kesimpen walau ternyata over-cap.
  const [nilaiBoostData, setNilaiBoostData] = useState({});
  useEffect(() => {
    const nbRef = ref(db, "nilaiBoost");
    const u10 = onValue(nbRef, snap => setNilaiBoostData(snap.val() || {}));
    return () => u10();
  }, []);

  // ═══ PUBLISH GATE NILAI ═══
  // Guru harus "terbitkan" nilai per mapel+jenjang+periode sebelum siswa bisa lihat.
  // Mencegah siswa melihat nilai yang belum selesai diinput (partial data → bandingan sosial).
  const [nilaiPublishData, setNilaiPublishData] = useState({});
  useEffect(() => {
    const npRef = ref(db, "nilaiPublish");
    const u11 = onValue(npRef, snap => setNilaiPublishData(snap.val() || {}));
    return () => u11();
  }, []);

  const nilaiPublishKey = (mapel, jenjang, periode) => `${mapel}_${jenjang}_${periode}`.replace(/[.#$/[\]]/g, "-");

  const isNilaiPublished = (mapel, jenjang, periode) => {
    const key = nilaiPublishKey(mapel, jenjang, periode);
    return !!(nilaiPublishData[key]?.published);
  };

  const publishNilai = async (mapel, jenjang, periode) => {
    const key = nilaiPublishKey(mapel, jenjang, periode);
    await set(ref(db, `nilaiPublish/${key}`), { published: true, publishedAt: Date.now(), mapel, jenjang, periode });
  };

  const unpublishNilai = async (mapel, jenjang, periode) => {
    const key = nilaiPublishKey(mapel, jenjang, periode);
    await set(ref(db, `nilaiPublish/${key}`), { published: false, unpublishedAt: Date.now(), mapel, jenjang, periode });
  };

  // PENTING: `periode` selalu mengandung "/" (mis. "Semester Ganjil 2026/2027") dan di Firebase RTDB
  // "/" adalah PEMISAH PATH, bukan karakter biasa. Tanpa sanitize, key ikut bercabang jadi sub-path
  // (nilaiBoost/{...2026}/{2027}/{id}) sementara pembacaan pakai string utuh sebagai satu key —
  // hasilnya bonus tersimpan tapi tidak pernah terbaca. Sanitize sama persis dengan nilaiAkhirKey.
  const boostGroupKey = (siswaId, mapel, jenjang, periode) =>
    `${siswaId}_${mapel}_${jenjang}_${periode}`.replace(/[.#$/[\]]/g, "-");

  // Path LAMA (sebelum sanitize) — masih dibaca supaya bonus yang terlanjur diinput guru sebelum
  // fix ini tetap muncul, bisa diedit, dan bisa dihapus. Tulisan baru selalu ke path yang sudah bersih.
  const legacyBoostGroup = (siswaId, mapel, jenjang, periode) => {
    const raw = `${siswaId}_${mapel}_${jenjang}_${periode}`;
    return raw.includes("/") ? raw : null;
  };
  // Telusuri nilaiBoostData mengikuti segmen path (menangani key datar maupun yang terlanjur bercabang)
  const readBoostGroup = (path) => {
    if (!path) return {};
    let node = nilaiBoostData;
    for (const seg of path.split("/")) {
      node = node?.[seg];
      if (!node || typeof node !== "object") return {};
    }
    return node;
  };
  // Resolusi path absolut 1 boost — cek lokasi baru dulu, baru lokasi lama
  const boostPath = (siswaId, mapel, jenjang, periode, boostId) => {
    const grp = boostGroupKey(siswaId, mapel, jenjang, periode);
    if (readBoostGroup(grp)[boostId]) return `nilaiBoost/${grp}/${boostId}`;
    const legacy = legacyBoostGroup(siswaId, mapel, jenjang, periode);
    if (legacy && readBoostGroup(legacy)[boostId]) return `nilaiBoost/${legacy}/${boostId}`;
    return `nilaiBoost/${grp}/${boostId}`;
  };

  // Return array of boost untuk 1 siswa+mapel+jenjang+periode (semua komponen, atau filtered by komponen kalau dikasih)
  const getBoosts = (siswaId, mapel, jenjang, periode, komponen = null) => {
    const grp = readBoostGroup(boostGroupKey(siswaId, mapel, jenjang, periode));
    const legacy = readBoostGroup(legacyBoostGroup(siswaId, mapel, jenjang, periode));
    const arr = [
      ...Object.entries(grp).map(([id, v]) => ({ ...v, id })),
      ...Object.entries(legacy).map(([id, v]) => ({ ...v, id })),
    ];
    return komponen ? arr.filter(b => b.komponen === komponen) : arr;
  };

  // Total boost untuk 1 komponen — dipake di computeNilaiAkhir
  const getBoostTotal = (siswaId, mapel, jenjang, periode, komponen) => {
    return getBoosts(siswaId, mapel, jenjang, periode, komponen).reduce((sum, b) => sum + (Number(b.nilai) || 0), 0);
  };

  const addBoost = async (siswaId, mapel, jenjang, periode, komponen, nilai, alasan, tugasRefId = null) => {
    if (!komponen) throw new Error("Komponen wajib dipilih");
    if (typeof nilai !== "number" || nilai <= 0 || nilai > 100) throw new Error("Nilai bonus harus 1-100");
    if (!alasan || alasan.trim().length < 5) throw new Error("Alasan wajib diisi (minimal 5 karakter)");
    const grp = boostGroupKey(siswaId, mapel, jenjang, periode);
    const newRef = push(ref(db, `nilaiBoost/${grp}`));
    await set(newRef, {
      komponen, nilai: Number(nilai), alasan: alasan.trim(),
      tugasRefId: tugasRefId || null,
      siswaId, mapel, jenjang, periode,
      createdAt: Date.now(), updatedAt: Date.now(),
    });
  };

  const updateBoost = async (siswaId, mapel, jenjang, periode, boostId, patch) => {
    if (patch.nilai !== undefined && (typeof patch.nilai !== "number" || patch.nilai <= 0 || patch.nilai > 100)) throw new Error("Nilai bonus harus 1-100");
    if (patch.alasan !== undefined && (!patch.alasan || patch.alasan.trim().length < 5)) throw new Error("Alasan wajib diisi (minimal 5 karakter)");
    await update(ref(db, boostPath(siswaId, mapel, jenjang, periode, boostId)), { ...patch, updatedAt: Date.now() });
  };

  const removeBoost = async (siswaId, mapel, jenjang, periode, boostId) => {
    await remove(ref(db, boostPath(siswaId, mapel, jenjang, periode, boostId)));
  };

  // Hitung rata-rata "Tugas Astrolab" untuk siswa, STRICT filter by mapel+jenjang (tidak boleh campur IPA/Informatika).
  // Tugas yang SUDAH LEWAT DEADLINE dan belum dikerjakan dihitung sebagai 0 dalam average —
  // supaya siswa yang skip tugas gak diuntungkan (averagenya dulu cuma dari tugas yg dikerjain doang).
  // Kecuali: kalau siswa punya susulan personal AKTIF untuk tugas itu, belum dihitung dulu
  // (masih dikasih kesempatan, jangan divonis 0 sebelum window susulannya berakhir).
  // TUGAS PERSONAL (Latihan Khusus): tugas dengan `graded: false` di-exclude total dari avg.
  //   Kalau `graded: true` tapi `assignedTo` array, hanya siswa yg di-assign yang dihitung —
  //   siswa lain gak di-vonis 0 karena tugas emang bukan buat mereka.
  const getTugasAstrolabAvg = (siswaId, mapel, jenjang) => {
    const relevantTugas = tugas.filter(t => {
      if (t.mapel !== mapel || t.jenjang !== jenjang || t.status === "scheduled") return false;
      // Tugas dengan graded: false gak masuk avg (biasanya tugas personal "Latihan Khusus")
      if (t.graded === false) return false;
      // Tugas personal (assignedTo array): cuma siswa yg di-assign yang dihitung
      if (Array.isArray(t.assignedTo) && !t.assignedTo.includes(siswaId)) return false;
      return true;
    });
    const vals = [];
    relevantTugas.forEach(t => {
      const sub = subs.find(s => s.siswaId === siswaId && s.tugasId === t.id);
      if (sub && typeof sub.nilai === "number") { vals.push(sub.nilai); return; }
      // Belum submit — cek apakah tugas ini sudah lewat deadline utama
      const lewatUtama = fmtDl(t.deadline).tone === "bad";
      if (!lewatUtama) return; // tugas masih aktif untuk semua siswa, belum wajib dihitung
      // Deadline utama lewat — cek apakah siswa ini punya susulan personal yang masih aktif
      if (isSusulanAktif(t.id, siswaId)) return; // masih dalam window susulan, jangan hitung dulu
      // Beneran lewat (termasuk susulan kalau ada dan sudah habis juga) dan belum submit → 0
      vals.push(0);
    });
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  // Hitung Nilai Akhir lengkap (breakdown + total weighted) untuk 1 siswa
  const computeNilaiAkhir = (siswaId, mapel, jenjang, periode) => {
    const rec = getNilaiAkhirRecord(siswaId, mapel, jenjang, periode);
    const sumatifVals = Object.values(rec.sumatif || {}).filter(v => typeof v === "number");
    const sumatifAvg = sumatifVals.length ? sumatifVals.reduce((a, b) => a + b, 0) / sumatifVals.length : null;
    const kuisVals = Object.values(rec.kuis || {}).filter(v => typeof v === "number");
    const kuisAvg = kuisVals.length ? kuisVals.reduce((a, b) => a + b, 0) / kuisVals.length : null;
    const tugasAvg = getTugasAstrolabAvg(siswaId, mapel, jenjang);

    // Helper: apply boost ke komponen. Cap final di 100 supaya gak weird.
    // Kalau base null (belum diisi) tapi ada boost → tetep gak dihitung supaya guru harus isi base dulu.
    // Logic ini biar boost gak "ngerjain" kosongnya komponen (misal siswa sama sekali gak dapat sumatif tapi tiba² dapat bonus 50 di sumatif — nanti keliatan aneh).
    const applyBoost = (baseVal, komponenKey) => {
      const boostTotal = getBoostTotal(siswaId, mapel, jenjang, periode, komponenKey);
      if (typeof baseVal !== "number") return { finalVal: baseVal, base: baseVal, boost: boostTotal };
      const finalVal = Math.min(100, baseVal + boostTotal);
      return { finalVal, base: baseVal, boost: boostTotal };
    };

    const sBoost = applyBoost(sumatifAvg, "sumatif");
    const tBoost = applyBoost(tugasAvg, "tugasAstrolab");
    const utsBoost = applyBoost(rec.uts, "uts");
    const uasBoost = applyBoost(rec.uas, "uas");
    const kBoost = applyBoost(kuisAvg, "kuis");
    const pBoost = applyBoost(rec.portofolio, "portofolio");

    const komponen = [
      { label: "Sumatif per BAB", key: "sumatif", val: sBoost.finalVal, base: sBoost.base, boost: sBoost.boost, bobot: 0.10 },
      { label: "Tugas Astrolab", key: "tugasAstrolab", val: tBoost.finalVal, base: tBoost.base, boost: tBoost.boost, bobot: 0.20 },
      { label: "UTS", key: "uts", val: utsBoost.finalVal, base: utsBoost.base, boost: utsBoost.boost, bobot: 0.20 },
      { label: "UAS", key: "uas", val: uasBoost.finalVal, base: uasBoost.base, boost: uasBoost.boost, bobot: 0.20 },
      { label: "Kuis Harian", key: "kuis", val: kBoost.finalVal, base: kBoost.base, boost: kBoost.boost, bobot: 0.10 },
      { label: "Portofolio", key: "portofolio", val: pBoost.finalVal, base: pBoost.base, boost: pBoost.boost, bobot: 0.20 },
    ];

    // Nilai akhir = jumlah (val × bobot) untuk komponen yang punya nilai.
    // Komponen kosong (belum diisi) di-exclude dari perhitungan (bukan dianggap 0),
    // supaya nilai akhir gak anjlok cuma karena guru belum sempat input semua komponen.
    const filled = komponen.filter(k => typeof k.val === "number");
    const totalBobotTerisi = filled.reduce((sum, k) => sum + k.bobot, 0);
    const nilaiAkhir = totalBobotTerisi > 0
      ? Math.round(filled.reduce((sum, k) => sum + k.val * k.bobot, 0) / totalBobotTerisi * 100) / 100
      : null;

    return { komponen, nilaiAkhir, lengkap: filled.length === komponen.length, sumatifAvg, kuisAvg, tugasAvg, rec };
  };

  // Update 1 kolom dinamis (sumatif atau kuis) — dipanggil dari grid inline edit
  // ═══ REWARD POIN DARI NILAI MANUAL ═══
  // Setiap input nilai Kuis/Sumatif/UTS/UAS/Portofolio kasih poin ke siswa senilai 10% dari nilai
  // (reward konsistensi — asumsi semua siswa mengikuti asesmen; yg absen wajib susulan).
  // Contoh: Kuis BAB 1 = 80 → +8 poin ke stats.poin siswa.
  //   Edit jadi 90 → poin lama (8) di-revoke, poin baru (9) di-kasih → net +1.
  //   Hapus nilai → poin (8) di-revoke → net -8. Floor di 0 (gak pernah minus).
  // Poin ini SEPARATE dari poin tugas Astrolab — cuma additive di stats.poin total.
  // Rate poin per komponen nilai manual:
  //   Sumatif/UTS/UAS = 1.0 (100%) — reward effort ujian penuh (belajar semalaman, persiapan serius)
  //   Kuis/Portofolio = 0.1 (10%) — tetap kasih apresiasi tapi gak dominasi leaderboard
  const NILAI_POIN_RATE = { sumatif: 1.0, uts: 1.0, uas: 1.0, kuis: 0.1, portofolio: 0.1 };

  const applyNilaiPoinDelta = async (siswaId, nilaiLama, nilaiBaru, reasonLabel = "nilai-manual", rate = 0.1) => {
    const num = (v) => typeof v === "number" && !isNaN(v) ? v : 0;
    const poinLama = Math.round(num(nilaiLama) * rate);
    const poinBaru = Math.round(num(nilaiBaru) * rate);
    const delta = poinBaru - poinLama;
    if (delta === 0) return;
    const s = getStats(siswaId);
    const newPoin = Math.max(0, (s.poin || 0) + delta);
    const now = Date.now();
    const newHistory = [
      ...(s.poinHistory || []),
      { minggu: (s.poinHistory || []).length + 1, poin: newPoin, ts: now, reason: reasonLabel, delta },
    ];
    await update(ref(db, `stats/${siswaId}`), { poin: newPoin, poinHistory: newHistory });
  };

  const updateNilaiKolom = async (siswaId, mapel, jenjang, periode, tipe, kolomKey, nilai) => {
    const key = nilaiAkhirKey(siswaId, mapel, jenjang, periode);
    const rec = getNilaiAkhirRecord(siswaId, mapel, jenjang, periode);
    const nilaiLama = (rec[tipe] || {})[kolomKey]; // bisa "", number, undefined
    // PENTING: Firebase RTDB menganggap value `null` sebagai perintah HAPUS path itu,
    // bukan "buat kosong". Makanya pakai "" (empty string) sebagai placeholder kolom-kosong,
    // supaya kolom tetap persist/kebaca walau nilainya belum diisi guru.
    const nilaiBaru = nilai === "" || nilai === null ? "" : Number(nilai);
    const updated = { ...rec[tipe], [kolomKey]: nilaiBaru };
    await update(ref(db, `nilaiAkhir/${key}`), { siswaId, mapel, jenjang, periode, [tipe]: updated, updatedAt: Date.now() });
    // Apply poin: sumatif = 100% (reward effort ujian), kuis = 10%
    await applyNilaiPoinDelta(siswaId, typeof nilaiLama === "number" ? nilaiLama : 0, typeof nilaiBaru === "number" ? nilaiBaru : 0, "nilai-manual", NILAI_POIN_RATE[tipe] || 0.1);
  };

  // Update field manual (uts/uas/portofolio) — 1 angka langsung
  const updateNilaiManual = async (siswaId, mapel, jenjang, periode, field, nilai) => {
    const key = nilaiAkhirKey(siswaId, mapel, jenjang, periode);
    const rec = getNilaiAkhirRecord(siswaId, mapel, jenjang, periode);
    const nilaiLama = rec[field]; // bisa null, number, undefined
    const nilaiBaru = nilai === "" || nilai === null ? null : Number(nilai);
    await update(ref(db, `nilaiAkhir/${key}`), { siswaId, mapel, jenjang, periode, [field]: nilaiBaru, updatedAt: Date.now() });
    await applyNilaiPoinDelta(siswaId, typeof nilaiLama === "number" ? nilaiLama : 0, typeof nilaiBaru === "number" ? nilaiBaru : 0, "nilai-manual", NILAI_POIN_RATE[field] || 0.1);
  };

  // Tambah kolom dinamis baru (BAB atau Kuis) — apply ke SEMUA siswa di kelas+mapel+periode itu sekaligus
  // (supaya kolom muncul konsisten di grid untuk semua siswa, walau nilai masih kosong)
  const addKolomDinamis = async (siswaIds, mapel, jenjang, periode, tipe, kolomLabel) => {
    const updates = {};
    siswaIds.forEach(siswaId => {
      const key = nilaiAkhirKey(siswaId, mapel, jenjang, periode);
      const rec = getNilaiAkhirRecord(siswaId, mapel, jenjang, periode);
      if (!(kolomLabel in (rec[tipe] || {}))) {
        updates[`nilaiAkhir/${key}/siswaId`] = siswaId;
        updates[`nilaiAkhir/${key}/mapel`] = mapel;
        updates[`nilaiAkhir/${key}/jenjang`] = jenjang;
        updates[`nilaiAkhir/${key}/periode`] = periode;
        // PENTING: pakai "" bukan null — null di Firebase RTDB berarti "hapus/jangan buat apa-apa",
        // sehingga kolom TIDAK PERNAH benar-benar tercipta kalau pakai null (bug yang kejadian sebelumnya).
        updates[`nilaiAkhir/${key}/${tipe}/${kolomLabel.replace(/[.#$/[\]]/g, "-")}`] = "";
        updates[`nilaiAkhir/${key}/updatedAt`] = Date.now();
      }
    });
    if (Object.keys(updates).length > 0) await update(ref(db), updates);
  };

  // Hapus kolom dinamis dari SEMUA siswa sekaligus. Poin yang dulu diberi dari nilai di kolom ini
  // OTOMATIS di-revoke (biar siswa gak "menang gratis" poin dari kolom yang gak ada nilainya lagi).
  const hapusKolomDinamis = async (siswaIds, mapel, jenjang, periode, tipe, kolomLabel) => {
    const updates = {};
    const safeKey = kolomLabel.replace(/[.#$/[\]]/g, "-");
    const revertList = []; // { siswaId, nilaiLama } — buat revoke poin nanti
    siswaIds.forEach(siswaId => {
      const key = nilaiAkhirKey(siswaId, mapel, jenjang, periode);
      const rec = getNilaiAkhirRecord(siswaId, mapel, jenjang, periode);
      const nilaiLama = (rec[tipe] || {})[safeKey];
      if (typeof nilaiLama === "number") revertList.push({ siswaId, nilaiLama });
      updates[`nilaiAkhir/${key}/${tipe}/${safeKey}`] = null;
    });
    await update(ref(db), updates);
    // Revoke poin per siswa yg punya nilai di kolom ini (sequential biar stats gak race)
    for (const { siswaId, nilaiLama } of revertList) {
      await applyNilaiPoinDelta(siswaId, nilaiLama, 0, "hapus-kolom-nilai", NILAI_POIN_RATE[tipe] || 0.1);
    }
  };

  // Ambil daftar semua kolom dinamis (union dari semua siswa) — dipakai buat render header grid
  const getKolomDinamisList = (siswaIds, mapel, jenjang, periode, tipe) => {
    const labels = new Set();
    siswaIds.forEach(siswaId => {
      const rec = getNilaiAkhirRecord(siswaId, mapel, jenjang, periode);
      Object.keys(rec[tipe] || {}).forEach(k => labels.add(k));
    });
    return [...labels];
  };

  // Bulk import dari hasil parse Excel — merge dengan data existing (additive, gak menimpa
  // kolom lain yang gak ada di file import). Satu multi-path update untuk semua siswa sekaligus.
  // Poin per siswa DIAKUMULASI dulu di JS sebelum apply — mencegah race condition kalau
  // banyak nilai berubah untuk siswa yg sama (misal 6 kuis + 3 sumatif = 9 update stats sequential).
  const bulkImportNilaiAkhir = async (rows, mapel, jenjang, periode) => {
    const updates = {};
    const poinDeltas = {}; // siswaId -> accumulated delta poin dari semua kolom yg berubah
    // Rate beda per komponen: sumatif/uts/uas = 100%, kuis/portofolio = 10%
    const computeDelta = (lama, baru, rate = 0.1) => {
      const l = typeof lama === "number" ? lama : 0;
      const b = typeof baru === "number" ? baru : 0;
      return Math.round(b * rate) - Math.round(l * rate);
    };
    rows.forEach(r => {
      const key = nilaiAkhirKey(r.siswaId, mapel, jenjang, periode);
      const rec = getNilaiAkhirRecord(r.siswaId, mapel, jenjang, periode);
      updates[`nilaiAkhir/${key}/siswaId`] = r.siswaId;
      updates[`nilaiAkhir/${key}/mapel`] = mapel;
      updates[`nilaiAkhir/${key}/jenjang`] = jenjang;
      updates[`nilaiAkhir/${key}/periode`] = periode;
      updates[`nilaiAkhir/${key}/updatedAt`] = Date.now();
      let totalDelta = 0;
      const mergedSumatif = { ...rec.sumatif, ...r.sumatif };
      Object.entries(mergedSumatif).forEach(([k, v]) => {
        const safe = k.replace(/[.#$/[\]]/g, "-");
        updates[`nilaiAkhir/${key}/sumatif/${safe}`] = (v === null || v === undefined) ? "" : v;
        // Sumatif = 100% rate
        if (r.sumatif && k in r.sumatif) totalDelta += computeDelta((rec.sumatif || {})[safe], typeof v === "number" ? v : 0, NILAI_POIN_RATE.sumatif);
      });
      const mergedKuis = { ...rec.kuis, ...r.kuis };
      Object.entries(mergedKuis).forEach(([k, v]) => {
        const safe = k.replace(/[.#$/[\]]/g, "-");
        updates[`nilaiAkhir/${key}/kuis/${safe}`] = (v === null || v === undefined) ? "" : v;
        // Kuis = 10% rate
        if (r.kuis && k in r.kuis) totalDelta += computeDelta((rec.kuis || {})[safe], typeof v === "number" ? v : 0, NILAI_POIN_RATE.kuis);
      });
      if (r.uts !== null) {
        updates[`nilaiAkhir/${key}/uts`] = r.uts;
        totalDelta += computeDelta(rec.uts, r.uts, NILAI_POIN_RATE.uts); // UTS = 100%
      }
      if (r.uas !== null) {
        updates[`nilaiAkhir/${key}/uas`] = r.uas;
        totalDelta += computeDelta(rec.uas, r.uas, NILAI_POIN_RATE.uas); // UAS = 100%
      }
      if (r.portofolio !== null) {
        updates[`nilaiAkhir/${key}/portofolio`] = r.portofolio;
        totalDelta += computeDelta(rec.portofolio, r.portofolio, NILAI_POIN_RATE.portofolio); // Portofolio = 10%
      }
      if (totalDelta !== 0) poinDeltas[r.siswaId] = (poinDeltas[r.siswaId] || 0) + totalDelta;
    });
    if (Object.keys(updates).length > 0) await update(ref(db), updates);
    // Apply akumulasi delta per siswa (1 write per siswa, bukan 1 write per kolom → aman dari race)
    for (const [siswaId, delta] of Object.entries(poinDeltas)) {
      if (delta === 0) continue;
      const s = getStats(siswaId);
      const newPoin = Math.max(0, (s.poin || 0) + delta);
      const now = Date.now();
      const newHistory = [
        ...(s.poinHistory || []),
        { minggu: (s.poinHistory || []).length + 1, poin: newPoin, ts: now, reason: "bulk-import-nilai", delta },
      ];
      await update(ref(db, `stats/${siswaId}`), { poin: newPoin, poinHistory: newHistory });
    }
    return rows.length;
  };

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
      // Strip password/sensitive fields — accounts sekarang readable oleh semua auth user
      const list = data ? Object.entries(data).map(([id, v]) => {
        const { password, ...safe } = v;
        return { ...safe, id };
      }) : [];
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
    return getAllAccounts()
      .filter(a => a.role === "siswa" && (!jenjang || a.jenjang === jenjang))
      .sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));
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

  // ─── RANK SNAPSHOTS — untuk movement indicator ▲▼ ───
  const [rankSnapshots, setRankSnapshots] = useState({});
  useEffect(() => {
    const rsRef = ref(db, "rankSnapshots");
    const u8 = onValue(rsRef, snap => { setRankSnapshots(snap.val() || {}); });
    return () => u8();
  }, []);
  const getRankSnapshot = (jenjang) => rankSnapshots[jenjang] || {};
  const saveRankSnapshot = async (jenjang) => {
    const lb = getLeaderboard(jenjang);
    const snap = {};
    lb.forEach(s => { snap[s.id] = s.rank; });
    snap._savedAt = Date.now();
    await update(ref(db, `rankSnapshots/${jenjang}`), snap);
  };
  const getRankMovement = (jenjang, siswaId) => {
    const snap = getRankSnapshot(jenjang);
    if (!snap[siswaId]) return null; // no previous data
    const lb = getLeaderboard(jenjang);
    const current = lb.find(s => s.id === siswaId);
    if (!current) return null;
    return snap[siswaId] - current.rank; // positive = naik, negative = turun
  };

  // ─── SEMESTER SETTINGS ───
  const [semesterSettings, setSemesterSettings] = useState({});
  useEffect(() => {
    const ssRef = ref(db, "settings/semester");
    const u9 = onValue(ssRef, snap => { setSemesterSettings(snap.val() || {}); });
    return () => u9();
  }, []);
  // Return semester aktif: pakai override guru kalau ada, kalau gak auto-detect
  const getActivePeriode = () => {
    if (semesterSettings.override) return semesterSettings.override;
    return getPeriodeAktif();
  };
  const setSemesterOverride = async (periode) => {
    // periode = null untuk balik ke auto-detect
    await update(ref(db, "settings/semester"), {
      override: periode || null,
      updatedAt: Date.now()
    });
  };
  const closeSemester = async (periode) => {
    const closed = semesterSettings.closedPeriodes || [];
    if (!closed.includes(periode)) {
      await update(ref(db, "settings/semester"), {
        closedPeriodes: [...closed, periode],
        closedAt: Date.now()
      });
    }
  };
  const isSemesterClosed = (periode) => {
    return (semesterSettings.closedPeriodes || []).includes(periode);
  };
  // Kasih badge + otomatis nambah poin ke stats siswa (poin diambil dari ALL_BADGES.poin).
  // Auto badges = 50 poin (murni skill), manual badges = 15 poin (subjektif guru, porsi lebih kecil
  // biar leaderboard akademik gak terlalu goyah cuma dari badge behavioral).
  const awardBadge = async (sid, badgeId) => {
    const current = badgesData[sid] || {};
    if (current[badgeId]) return; // udah punya, jangan dobel poin
    const badgeDef = ALL_BADGES.find(b => b.id === badgeId);
    const poinBadge = badgeDef?.poin || 0;
    await update(ref(db, `badges/${sid}`), { [badgeId]: true });
    if (poinBadge > 0) {
      const s = getStats(sid);
      const newPoin = (s.poin || 0) + poinBadge;
      const newHistory = [...(s.poinHistory || []), { minggu: (s.poinHistory || []).length + 1, poin: newPoin, ts: Date.now() }];
      await update(ref(db, `stats/${sid}`), { poin: newPoin, poinHistory: newHistory });
    }
  };
  const removeBadge = async (sid, badgeId) => {
    const current = badgesData[sid] || {};
    if (!current[badgeId]) return; // gak punya badge ini, gak ada apa-apa buat direvert
    const badgeDef = ALL_BADGES.find(b => b.id === badgeId);
    const poinBadge = badgeDef?.poin || 0;
    await remove(ref(db, `badges/${sid}/${badgeId}`));
    if (poinBadge > 0) {
      const s = getStats(sid);
      const newPoin = Math.max(0, (s.poin || 0) - poinBadge); // gak boleh minus
      await update(ref(db, `stats/${sid}`), { poin: newPoin });
    }
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

  // ─── MATERI LATIHAN MANDIRI ───
  const [materiList, setMateriList] = useState([]);
  useEffect(() => {
    const mRef = ref(db, "materiLatihan");
    const unsub = onValue(mRef, snap => {
      const data = snap.val() || {};
      setMateriList(Object.entries(data).map(([id, v]) => ({ ...v, id })));
    }, () => setMateriList([]));
    return () => unsub();
  }, []);
  const getMateriList = () => materiList;
  const addMateri = async (meta, hdPages, loPages) => {
    const newRef = push(ref(db, "materiLatihan"));
    const id = newRef.key;
    await set(newRef, { ...meta, pageCount: hdPages.length, createdAt: Date.now() });
    // HD pages (7 hari pertama) — terpisah dari metadata supaya listener ringan
    await set(ref(db, `materiPages/${id}`), hdPages);
    // Compressed/arsip pages (setelah 7 hari)
    await set(ref(db, `materiPagesLo/${id}`), loPages);
    return id;
  };
  const deleteMateri = async (id) => {
    await remove(ref(db, `materiLatihan/${id}`));
    await remove(ref(db, `materiPages/${id}`));
    await remove(ref(db, `materiPagesLo/${id}`));
    delMCache(id).catch(() => {}); // hapus browser cache juga
  };
  const updateMateri = async (id, patch) => {
    await update(ref(db, `materiLatihan/${id}`), patch);
  };
  // On-demand: load pages — HD jika < 7 hari, arsip jika ≥ 7 hari
  // Browser cache (IndexedDB) → kalau udah pernah download, gak perlu ke Firebase lagi
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const loadMateriPages = async (id, createdAt) => {
    // 1. Cek browser cache dulu
    const cached = await getMCache(id);
    if (cached && cached.pages && cached.pages.length > 0) return cached.pages;
    // 2. Gak ada di cache → fetch dari Firebase
    const isHd = createdAt && (Date.now() - createdAt < SEVEN_DAYS);
    const path = isHd ? `materiPages/${id}` : `materiPagesLo/${id}`;
    const snap = await get(ref(db, path));
    let pages = snap.val();
    // Fallback: kalau arsip belum ada (materi lama sebelum fitur dual), coba HD
    if (!pages && !isHd) {
      const fallback = await get(ref(db, `materiPages/${id}`));
      pages = fallback.val() || [];
    }
    pages = pages || [];
    // 3. Simpan ke cache buat next time
    if (pages.length > 0) setMCache(id, pages).catch(() => {});
    return pages;
  };
  // Lazy archival: hapus HD pages untuk materi > 7 hari (dipanggil dari MateriManager)
  const archiveOldMateri = async () => {
    const now = Date.now();
    const toArchive = materiList.filter(m => m.createdAt && (now - m.createdAt >= SEVEN_DAYS));
    for (const m of toArchive) {
      // Cek apakah HD masih ada
      const hdSnap = await get(ref(db, `materiPages/${m.id}`));
      if (hdSnap.exists()) {
        await remove(ref(db, `materiPages/${m.id}`));
      }
    }
    return toArchive.length;
  };

  return { getTugas, addTugas, deleteTugas, updateTugas, duplicateTugas, getBankSoal, addBankSoal, updateBankSoal, deleteBankSoal, addBankSoalBulk, getSubs, addSub, hasSub, getSubBy, updateSubmissionNilai, getStats, updateStats, recomputeNilaiStats, resetStreakIfMissed, getLeaderboard, getAllSiswa, addSiswa, deleteSiswa, resetPassword, isFbAccount, importSiswaBulk, genSiswaId: (n) => genSiswaId(n, new Set(fbAccounts.map(a => a.id))), genPassword, getThread, sendMessage, getUnreadCount, markRead, getContacts, getLastMsg, getBroadcasts, getAllBroadcasts, addBroadcast, editBroadcast, deleteBroadcast, addReport, updateReportStatus, deleteReport, getReports, getUnreadReportCount, getNilaiAkhirRecord, computeNilaiAkhir, updateNilaiKolom, updateNilaiManual, addKolomDinamis, hapusKolomDinamis, getKolomDinamisList, bulkImportNilaiAkhir, getTugasAstrolabAvg, getSusulan, isSusulanAktif, addSusulan, removeSusulan, resetSubmission, getAksesRequest, requestAkses, approveAkses, rejectAkses, getBoosts, getBoostTotal, addBoost, updateBoost, removeBoost, getPhoto, savePhoto, getBadges, awardBadge, removeBadge, isNilaiPublished, publishNilai, unpublishNilai, isOnline, getLastSeen, getOnlineUsers, fbGuru, setCurrentUser, loading, getMateriList, addMateri, deleteMateri, updateMateri, loadMateriPages, archiveOldMateri, getRankSnapshot, saveRankSnapshot, getRankMovement, getActivePeriode, setSemesterOverride, closeSemester, isSemesterClosed, semesterSettings };
}

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

// ─── TUGAS HARI INI POPUP ───
// Flag session-level: popup cuma muncul 1× setelah login, bukan tiap kali DashboardSiswa re-mount
let _tugasPopupShownThisSession = false;

function TugasHariIniPopup({ pendingTugas, store, user, navigate, onClose }) {
  const [loadingAkses, setLoadingAkses] = useState({});
  const [aksesError, setAksesError] = useState({});
  if (!pendingTugas.length) return null;

  // Pisahkan: aktif dulu, overdue di bawah
  const aktifList = pendingTugas.filter(t => {
    const lewat = fmtDl(t.deadline).tone === "bad";
    return !lewat || store.isSusulanAktif(t.id, user.id);
  });
  const overdueList = pendingTugas.filter(t => {
    const lewat = fmtDl(t.deadline).tone === "bad";
    return lewat && !store.isSusulanAktif(t.id, user.id);
  });

  const handleMintaAkses = async (tugasId, tugasJudul) => {
    setLoadingAkses(prev => ({ ...prev, [tugasId]: true }));
    setAksesError(prev => ({ ...prev, [tugasId]: null }));
    try {
      await store.requestAkses(tugasId, user.id, user.namaDisplay || user.nama, tugasJudul);
    } catch (e) {
      console.error("[MintaAkses] error:", e);
      setAksesError(prev => ({ ...prev, [tugasId]: "Gagal mengirim permintaan. Coba lagi." }));
    } finally {
      setLoadingAkses(prev => ({ ...prev, [tugasId]: false }));
    }
  };

  const renderCard = (t, isOverdueCard) => {
    const dl = fmtDl(t.deadline);
    const aksReq = store.getAksesRequest(t.id, user.id);
    const soalCount = t.soal?.length || 0;
    const poinMax = t.graded === false ? Math.round((t.poinMax || 0) * 0.2) : (t.poinMax || 0);
    const allSiswa = store.getAllSiswa(t.jenjang);
    const siswaList = Array.isArray(t.assignedTo) ? allSiswa.filter(s => t.assignedTo.includes(s.id)) : allSiswa;
    const totalSiswa = siswaList.length;
    const sudahKerjakan = store.getSubs().filter(s => s.tugasId === t.id).length;
    const pctDone = totalSiswa > 0 ? Math.min(100, Math.round((sudahKerjakan / totalSiswa) * 100)) : 0;
    const barColor = pctDone >= 75 ? "var(--accent)" : "var(--bad)";
    const showMintaAkses = isOverdueCard && (!aksReq || aksReq.status === "rejected");
    const showPending = isOverdueCard && aksReq?.status === "pending";
    const isLoading = loadingAkses[t.id];
    const errMsg = aksesError[t.id];
    return (
      <div key={t.id} style={{
        border: isOverdueCard ? "1.5px solid var(--bad)" : "1.5px solid var(--line)",
        borderRadius: 14, padding: "14px 16px",
        background: "var(--surface)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: isOverdueCard ? "var(--bad)" : "var(--accent)",
            background: isOverdueCard ? "rgba(220,53,69,.08)" : "var(--accent-tint)",
            padding: "3px 8px", borderRadius: 6, letterSpacing: ".03em", textTransform: "uppercase"
          }}>{isOverdueCard ? "Terlambat" : t.mapel}</span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: dl.tone === "bad" ? "var(--bad)" : dl.tone === "warn" ? "var(--warn)" : "var(--ink-3)",
            display: "flex", alignItems: "center", gap: 4
          }}><I n="clock" s={12} />{dl.label}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 4, lineHeight: 1.4 }}>{t.judul}</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><I n="fileText" s={12} />{soalCount} soal</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><I n="target" s={12} />+{poinMax} pt</span>
        </div>
        {totalSiswa > 0 && <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Sudah mengerjakan</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{sudahKerjakan}/{totalSiswa}</span>
          </div>
          <div style={{ height: 6, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99, transition: "width .4s",
              width: `${pctDone}%`,
              background: barColor
            }} />
          </div>
        </div>}
        {/* Button */}
        {showMintaAkses ? (
          <>
            <button onClick={() => handleMintaAkses(t.id, t.judul)} disabled={isLoading} style={{
              width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
              background: isLoading ? "var(--surface-alt)" : "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)",
              color: isLoading ? "var(--ink-3)" : "#fff", fontWeight: 700, fontSize: 14,
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: isLoading ? "none" : "0 2px 8px rgba(192,57,43,.3)"
            }}>{isLoading ? "Mengirim..." : <>Minta Akses <I n="send" s={14} /></>}</button>
            {errMsg && <div style={{ fontSize: 11, color: "var(--bad)", marginTop: 6, textAlign: "center" }}>{errMsg}</div>}
          </>
        ) : showPending ? (
          <button disabled style={{
            width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
            background: "var(--surface-alt)", color: "var(--ink-3)",
            fontWeight: 700, fontSize: 14, cursor: "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6
          }}><I n="clock" s={14} /> Menunggu Persetujuan...</button>
        ) : (
          <button onClick={() => { onClose(); navigate("tugas-detail", { tugasId: t.id }); }} style={{
            width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #0d6b7a 0%, #0a8a7a 100%)",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            boxShadow: "0 2px 8px rgba(13,107,122,.3)"
          }}>Kerjakan <span style={{ fontSize: 16 }}>→</span></button>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 250 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--surface)", borderRadius: 20, width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden", maxHeight: "85vh", display: "flex", flexDirection: "column"
      }}>
        {/* Header — teal gradient, slim */}
        <div style={{
          background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
          padding: "12px 16px", position: "relative", borderRadius: "20px 20px 0 0"
        }}>
          <button onClick={onClose} style={{
            position: "absolute", top: 10, right: 12, background: "rgba(255,255,255,.18)",
            border: "none", borderRadius: 99, width: 28, height: 28, display: "grid", placeItems: "center",
            color: "#fff", cursor: "pointer", backdropFilter: "blur(4px)"
          }}><I n="x" s={14} /></button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Tugas Belum Dikerjakan</div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "#fff",
              borderRadius: 99, minWidth: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px"
            }}>{pendingTugas.length}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", marginTop: 2 }}>Ada {pendingTugas.length} tugas yang belum kamu kerjakan</div>
        </div>
        {/* Tugas list — aktif dulu, lalu overdue di bawah */}
        <div style={{ padding: "10px 14px 14px", overflowY: "auto", flex: 1 }}>
          {/* Tugas aktif (belum lewat deadline) */}
          {aktifList.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aktifList.map(t => renderCard(t, false))}
            </div>
          )}
          {/* Separator */}
          {aktifList.length > 0 && overdueList.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, margin: "16px 0 12px",
              color: "var(--ink-4)", fontSize: 11, fontWeight: 600
            }}>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              Lewat Deadline
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>
          )}
          {/* Tugas overdue */}
          {overdueList.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {overdueList.map(t => renderCard(t, true))}
            </div>
          )}
        </div>
        {/* Footer hint */}
        <div style={{ padding: "8px 14px 12px", textAlign: "center", fontSize: 11, color: "var(--ink-4)" }}>
          Kamu bisa menutup dan mengerjakan nanti
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD SISWA ───
function DashboardSiswa({ user, store, navigate }) {
  const stats = store.getStats(user.id);
  // Filter sama seperti DaftarTugas: tugas personal (assignedTo array) hanya untuk siswa yang di-assign.
  // Tanpa ini, "Latihan Khusus" milik siswa lain bocor ke Beranda semua orang — dan yang lebih parah,
  // ikut masuk hitungan tugasLewat sehingga memicu reset streak siswa yang bahkan tidak ditugasi.
  const allTugas = store.getTugas().filter(t => {
    if (t.jenjang !== user.jenjang || t.status !== "aktif") return false;
    if (Array.isArray(t.assignedTo) && !t.assignedTo.includes(user.id)) return false;
    return true;
  });
  const byNewest = (a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  };
  const tugas = allTugas.filter(t => fmtDl(t.deadline).tone !== "bad").sort(byNewest); // belum lewat deadline
  // Tugas yang benar-benar "hangus": lewat deadline, belum dikerjakan, DAN gak punya window susulan
  // personal yang masih aktif. Siswa yang masih punya jatah susulan (mis. hasil reset dari guru)
  // belum boleh divonis — konsisten dengan perlakuan di getTugasAstrolabAvg.
  const tugasLewat = allTugas.filter(t =>
    fmtDl(t.deadline).tone === "bad" &&
    !store.hasSub(user.id, t.id) &&
    !store.isSusulanAktif(t.id, user.id)
  );
  const lb = store.getLeaderboard(user.jenjang);
  const myRank = lb.find(s => s.id === user.id);

  // Reset streak kalau siswa lewatin deadline tanpa submit. Trigger sekali per mount pas data ready.
  // Dedupe per-tugas ada di store (stats.streakResetFor) — lihat resetStreakIfMissed.
  const hasCheckedStreak = useRef(false);
  const missedIds = tugasLewat.map(t => t.id).join(",");
  useEffect(() => {
    if (hasCheckedStreak.current) return;
    // Tunggu sampai data loaded (allTugas terisi atau confirmed empty)
    if (store.loading) return;
    if (!missedIds) return;
    hasCheckedStreak.current = true;
    store.resetStreakIfMissed(user.id, missedIds.split(","));
  }, [missedIds, store.loading]);

  // Dynamic greeting by waktu
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  // ── Tugas Hari Ini Popup — hanya muncul sekali per session login ──
  // Include: tugas deadline belum lewat + tugas susulan aktif + tugas perorangan (assignedTo)
  const pendingTugas = allTugas.filter(t => {
    if (store.hasSub(user.id, t.id)) return false; // sudah dikerjakan
    const lewat = fmtDl(t.deadline).tone === "bad";
    if (!lewat) return true; // belum lewat → tampil
    if (store.isSusulanAktif(t.id, user.id)) return true; // punya susulan aktif → tampil
    // Lewat deadline: tampilkan kecuali sudah ditolak aksesnya
    const aksReq = store.getAksesRequest(t.id, user.id);
    if (aksReq && aksReq.status === "rejected") return false; // ditolak → hilang dari popup
    return true; // belum minta / pending / approved → tampil
  });
  const [showTugasPopup, setShowTugasPopup] = useState(false);
  const tugasPopupTriggered = useRef(false);
  useEffect(() => {
    if (tugasPopupTriggered.current || _tugasPopupShownThisSession) return;
    if (store.loading) return; // tunggu data loaded
    if (pendingTugas.length > 0) { tugasPopupTriggered.current = true; setShowTugasPopup(true); }
  }, [store.loading, pendingTugas.length]);
  const closeTugasPopup = () => { _tugasPopupShownThisSession = true; setShowTugasPopup(false); };

  const prog = getLevelProgress(stats.poin || 0);
  const lv = getLevel(stats.poin || 0);

  return <>
    <div className="page">
      {/* Greeting */}
      <div style={{ paddingTop: 14, paddingBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 2 }}>{greeting}!</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", margin: 0, lineHeight: 1.2 }}>Halo, {user.namaDisplay}</h1>
        </div>
        <span style={{ fontSize: 10, color: "var(--accent)", background: "var(--accent-tint)", padding: "4px 10px", borderRadius: 99, fontWeight: 600, letterSpacing: ".02em", whiteSpace: "nowrap" }}>{store.getActivePeriode()}</span>
      </div>

      {/* Status Card: Ranking + Poin + Level + Streak — satu card untuk semua */}
      <div className="ds-status">
        <div className="ds-status-hdr">
          <div>
            <div className="ds-rank-num">#{myRank?.rank || "—"}</div>
            <div className="ds-rank-sub">Ranking · Kelas {user.jenjang}</div>
          </div>
          <div className="ds-poin">
            <div className="ds-poin-num">{stats.poin.toLocaleString("id-ID")}</div>
            <div className="ds-poin-label">Total Poin</div>
          </div>
        </div>
        <div className="ds-status-body">
          <div className="ds-level-row">
            <TierIcon tierId={lv.tierId} size={32} color={lv.color} />
            <div className="ds-level-info">
              <div className="ds-level-top">
                <span style={{ fontSize: 12, fontWeight: 700, color: lv.color }}>{lv.name}</span>
                {prog.next
                  ? <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{prog.needed} poin lagi → {prog.next.name}</span>
                  : <span style={{ fontSize: 10, color: lv.color, fontWeight: 700 }}>LEVEL MAKS</span>}
              </div>
              <div className="ds-level-bar">
                <div className="ds-level-fill" style={{ width: `${prog.pct}%`, background: lv.color }} />
              </div>
            </div>
            {(stats.streak || 0) > 0 && (
              <div className="ds-streak">
                <div>
                  <div className="ds-streak-num"><I n="flame" s={14} />{stats.streak}</div>
                  <div className="ds-streak-label">streak</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats — hanya data yang belum ada di status card */}
      <div className="ds-stats">
        <div className="ds-stat">
          <div className="ds-stat-icon score"><I n="chartBar" s={16} /></div>
          <div>
            <div className="ds-stat-val">{stats.nilaiRata || "—"}</div>
            <div className="ds-stat-label">Nilai rata-rata</div>
          </div>
        </div>
        <div className="ds-stat">
          <div className="ds-stat-icon tasks"><I n="checkCircle" s={16} /></div>
          <div>
            <div className="ds-stat-val">{stats.tugasSelesai}</div>
            <div className="ds-stat-label">Tugas selesai</div>
          </div>
        </div>
      </div>

      {/* Tugas Aktif */}
      <div className="sh"><h2>Tugas aktif</h2><button className="btn btn-soft btn-sm" onClick={() => navigate("tugas")}>Semua <I n="chevR" s={12} /></button></div>
      {tugas.length === 0 ? <div className="empty">Belum ada tugas aktif dari guru.</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {tugas.slice(0, 3).map(t => {
            const dl = fmtDl(t.deadline);
            const done = store.hasSub(user.id, t.id);
            const poinMax = t.graded === false ? Math.round((t.poinMax || 0) * 0.2) : (t.poinMax || 0);
            return (
              <button key={t.id} onClick={() => navigate("tugas-detail", { tugasId: t.id })} style={{ textAlign: "left", display: "block", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <Card style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "var(--r-sm)", background: done ? "var(--good-bg)" : "var(--accent-tint)", display: "grid", placeItems: "center", color: done ? "var(--good)" : "var(--accent)", flexShrink: 0 }}>
                      <I n={done ? "check" : "book"} s={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, color: done ? "var(--ink-3)" : "var(--ink)" }}>{t.judul}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{t.mapel}{!done && t.soal?.length ? ` · ${t.soal.length} soal` : ""}{!done && poinMax ? ` · +${poinMax} pt` : ""}</div>
                    </div>
                    {done ? <span className="chip chip-good">Selesai</span> : <span className={`chip ${dl.tone ? "chip-" + dl.tone : "chip-accent"}`}>{dl.label}</span>}
                  </div>
                </Card>
              </button>
            );
          })}
        </div>}

      {/* Top 3 Leaderboard */}
      <div className="sh"><h2>Top 3 Kelas {user.jenjang}</h2><button className="btn btn-soft btn-sm" onClick={() => navigate("leaderboard")}>Semua <I n="chevR" s={12} /></button></div>
      <Card pad="none" style={{ overflow: "hidden", marginBottom: 20 }}>
        {lb.length === 0 ? <div className="empty">Belum ada ranking. Kerjakan tugas dulu!</div> :
          lb.slice(0, 3).map(s => (
            <div key={s.id} className="lb-row" style={{ gridTemplateColumns: "28px 34px 1fr auto" }}>
              <div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : "top3"}`}>{s.rank}</div>
              <UserAvatar userId={s.id} name={s.nama} size="sm" store={store} />
              <div>
                <div className="lb-name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>{s.nama}{s.id === user.id && <span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span>}</span>
                  <LevelBadge poin={s.poin || 0} size="xs" showName={false} />
                </div>
                <div className="lb-meta">{s.kelas}</div>
              </div>
              <div className="lb-pts">{s.poin.toLocaleString("id-ID")}</div>
            </div>
          ))}
      </Card>
    </div>
    {/* Tugas Hari Ini Popup */}
    {showTugasPopup && pendingTugas.length > 0 && (
      <TugasHariIniPopup pendingTugas={pendingTugas} store={store} user={user} navigate={navigate} onClose={closeTugasPopup} />
    )}
  </>;
}

// ─── LEADERBOARD ───
function RankMovement({ move }) {
  if (move === null || move === undefined) return null;
  const up = move > 0;
  const same = move === 0;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)",
      color: same ? "var(--ink-3)" : up ? "var(--good)" : "var(--bad)",
      display: "inline-flex", alignItems: "center", gap: 1, marginLeft: 4
    }}>
      {same ? "=" : up ? "▲" : "▼"}{same ? "" : Math.abs(move)}
    </span>
  );
}

function LeaderboardScreen({ user, store }) {
  const isGuru = user.role === "guru";
  const [tab, setTab] = useState(isGuru ? "VII" : user.jenjang);
  const lb = store.getLeaderboard(tab);
  const myRow = lb.find(s => s.id === user.id);
  const myInTop = myRow && myRow.rank <= 10;
  const snapshot = store.getRankSnapshot(tab);
  const hasSnapshot = Object.keys(snapshot).filter(k => k !== "_savedAt").length > 0;

  // Prestasi minggu ini — 5 nominasi dengan metrik BERBEDA
  const subsAll = store.getSubs();
  const oneWeekAgo = Date.now() - 7 * 24 * 3600000;

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
      {isGuru && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button className="btn btn-soft btn-sm" onClick={async () => { await store.saveRankSnapshot(tab); }} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
          <I n="refresh" s={12} /> Simpan Snapshot Ranking
        </button>
      </div>}
      {hasSnapshot && snapshot._savedAt && <div style={{ fontSize: 10, color: "var(--ink-4)", textAlign: "right", marginBottom: 8, marginTop: -4 }}>Perubahan dari {new Date(snapshot._savedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>}

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
              const confettiIntensity = place === 1 ? "high" : place === 2 ? "medium" : "low";
              return (
                <div key={s.id} style={{ flex: 1, maxWidth: 100, textAlign: "center", minWidth: 0, position: "relative" }}>
                  <ConfettiRain intensity={confettiIntensity} />
                  <div style={{ position: "relative", zIndex: 2 }}>
                    {isFirst
                      ? <CelebrationAvatar userId={s.id} name={s.nama} size="lg" store={store} />
                      : <UserAvatar userId={s.id} name={s.nama} size="md" store={store} />
                    }
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingInline: 4 }}>{getFirstName(s.nama)}</div>
                    <div className="stat-num" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.poin.toLocaleString("id-ID")} pt{hasSnapshot && <RankMovement move={store.getRankMovement(tab, s.id)} />}</div>
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
            {lb.slice(0, 10).map(s => {
              const move = hasSnapshot ? store.getRankMovement(tab, s.id) : null;
              return (
              <div key={s.id} className={`lb-row ${!isGuru && s.id === user.id ? "me" : ""}`}>
                <div className={`lb-rank ${s.rank === 1 ? "top1" : s.rank === 2 ? "top2" : s.rank === 3 ? "top3" : ""}`}>{s.rank}</div>
                <UserAvatar userId={s.id} name={s.nama} size="md" store={store} />
                <div style={{ minWidth: 0 }}>
                  <div className="lb-name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>{s.nama}{!isGuru && s.id === user.id && <span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span>}</span>
                    <LevelBadge poin={s.poin || 0} size="xs" showName={false} />
                    <RankMovement move={move} />
                  </div>
                  <div className="lb-meta">
                    {s.kelas}
                    {(s.streak || 0) >= 3 && <span className="streak-pill" style={{ marginLeft: 4 }}><FlameAnimated size={14} streak={s.streak} /> {s.streak}x</span>}
                  </div>
                </div>
                <div className="lb-pts">{s.poin.toLocaleString("id-ID")}</div>
              </div>
              );
            })}
            {!isGuru && !myInTop && myRow && (() => {
              const myIdx = lb.findIndex(s => s.id === user.id);
              const start = Math.max(0, myIdx - 2);
              const end = Math.min(lb.length, myIdx + 3);
              const neighbours = lb.slice(start, end);
              return <>
                <div className="divider">· · ·</div>
                <div style={{ fontSize: 10, color: "var(--ink-3)", padding: "4px 14px 2px", fontWeight: 600, letterSpacing: ".03em" }}>Ranking di sekitarmu</div>
                {neighbours.map(s => {
                  const isMe = s.id === user.id;
                  const move = hasSnapshot ? store.getRankMovement(tab, s.id) : null;
                  return (
                    <div key={s.id} className={`lb-row ${isMe ? "me" : ""}`}>
                      <div className="lb-rank">{s.rank}</div>
                      <UserAvatar userId={s.id} name={s.nama} size="md" store={store} />
                      <div style={{ minWidth: 0 }}>
                        <div className="lb-name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span>{s.nama}{isMe && <span style={{ color: "var(--accent)", fontWeight: 600 }}> · kamu</span>}</span>
                          <LevelBadge poin={s.poin || 0} size="xs" showName={false} />
                          <RankMovement move={move} />
                        </div>
                        <div className="lb-meta">{s.kelas}</div>
                      </div>
                      <div className="lb-pts">{s.poin.toLocaleString("id-ID")}</div>
                    </div>
                  );
                })}
              </>;
            })()}
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

// ─── DAFTAR TUGAS (SISWA) ───
function DaftarTugas({ user, store, navigate }) {
  const isVII = user.jenjang === "VII";
  const [mapel, setMapel] = useState("IPA");
  const [showArsip, setShowArsip] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);

  // Filter: (1) mapel & jenjang match, (2) kalau tugas personal (assignedTo array), siswa harus di-assign
  const semua = store.getTugas().filter(t => {
    if (t.jenjang !== user.jenjang || t.mapel !== mapel) return false;
    if (Array.isArray(t.assignedTo) && !t.assignedTo.includes(user.id)) return false;
    return true;
  });
  // Sort by newest first (createdAt desc)
  const byNewest = (a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  };

  // Split: belum (belum dikerjakan, deadline ok), selesai, personal (latihan khusus), arsip (lewat & belum)
  const belum = semua.filter(t => {
    const dl = fmtDl(t.deadline);
    const done = store.hasSub(user.id, t.id);
    return !done && dl.tone !== "bad" && !Array.isArray(t.assignedTo);
  }).sort(byNewest);

  const selesai = semua.filter(t => store.hasSub(user.id, t.id) && !Array.isArray(t.assignedTo)).sort(byNewest);

  const personal = semua.filter(t => Array.isArray(t.assignedTo)).sort(byNewest);

  const arsip = semua.filter(t => {
    const dl = fmtDl(t.deadline);
    const done = store.hasSub(user.id, t.id);
    return !done && dl.tone === "bad";
  }).sort(byNewest);

  // Susulan tasks — belum dikerjakan, deadline lewat tapi punya susulan aktif
  const susulanList = semua.filter(t => {
    const dl = fmtDl(t.deadline);
    const done = store.hasSub(user.id, t.id);
    return !done && dl.tone === "bad" && store.isSusulanAktif(t.id, user.id) && !Array.isArray(t.assignedTo);
  }).sort(byNewest);

  // Progress stats
  const totalTugas = semua.filter(t => !Array.isArray(t.assignedTo)).length;
  const totalSelesai = selesai.length;
  const nilaiList = selesai.map(t => { const sub = store.getSubBy(user.id, t.id); return sub?.nilai || 0; });
  const nilaiRata = nilaiList.length > 0 ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) : 0;
  const circumference = 2 * Math.PI * 22; // r=22
  const progressOffset = totalTugas > 0 ? circumference - (totalSelesai / totalTugas) * circumference : circumference;

  // Active task card — for belum dikerjakan & susulan
  function ActiveCard({ t }) {
    const dl = fmtDl(t.deadline);
    const isPersonal = Array.isArray(t.assignedTo);
    const susulanAktif = store.isSusulanAktif(t.id, user.id);
    return (
      <button onClick={() => navigate("tugas-detail", { tugasId: t.id })}
        style={{ textAlign: "left", display: "block", width: "100%", background: "none", border: "none" }}>
        <Card style={{ borderLeft: isPersonal ? "3px solid var(--accent-2)" : susulanAktif ? "3px solid var(--warn)" : "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: "var(--r-sm)", flexShrink: 0, display: "grid", placeItems: "center",
              background: isPersonal ? "var(--accent-tint)" : susulanAktif ? "var(--warn-bg)" : "var(--accent-soft)",
              color: isPersonal ? "var(--accent-2)" : susulanAktif ? "var(--warn)" : "var(--accent-2)" }}>
              <I n={isPersonal ? "star" : "book"} s={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{t.judul}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {susulanAktif && <span className="chip chip-warn"><I n="refresh" s={10} /> Susulan</span>}
                {isPersonal && <span className="chip chip-accent" style={{ fontSize: 10 }}>Latihan Khusus</span>}
                <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span>
                <span className="chip">+{t.graded === false ? Math.round(t.poinMax * 0.2) : t.poinMax} pt</span>
                <span className="chip">{t.soal?.length || 0} soal</span>
              </div>
            </div>
            <I n="chevR" s={16} style={{ color: "var(--ink-3)", marginTop: 12, flexShrink: 0 }} />
          </div>
        </Card>
      </button>
    );
  }

  // Done rows visible — default 3, expandable
  const DONE_LIMIT = 3;
  const visibleDone = showAllDone ? selesai : selesai.slice(0, DONE_LIMIT);

  return <>
    <div className="page">
      <div className="dt"><div><h1>Tugas {mapel}</h1><p>Kelas {user.jenjang}</p></div></div>

      {isVII && (
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button className={`tab ${mapel === "IPA" ? "active" : ""}`} onClick={() => setMapel("IPA")}><MapelIcon mapel="IPA" size={13} /> IPA</button>
          <button className={`tab ${mapel === "Informatika" ? "active" : ""}`} onClick={() => setMapel("Informatika")}><MapelIcon mapel="Informatika" size={13} /> Informatika</button>
        </div>
      )}

      {/* Empty state */}
      {semua.length === 0
        ? <Card><div className="empty empty-box">
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center", marginBottom: 8 }}><MapelIcon mapel={mapel} size={28} /></div>
            <h3>Belum ada tugas {mapel}</h3>
            <p>Tugas akan muncul di sini setelah guru membuat tugas untuk kelasmu.</p>
          </div></Card>
        : <>
          {/* Progress Summary */}
          {totalTugas > 0 && (
            <div className="dt-progress">
              <div className="dt-ring">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="22" fill="none" stroke="var(--line)" strokeWidth="5" />
                  <circle cx="26" cy="26" r="22" fill="none" stroke={totalSelesai === totalTugas ? "var(--good)" : "var(--accent)"} strokeWidth="5"
                    strokeDasharray={circumference} strokeDashoffset={progressOffset} strokeLinecap="round" />
                </svg>
                <div className="dt-ring-text" style={`${totalSelesai}/${totalTugas}`.length > 4 ? { fontSize: 12 } : undefined}>{totalSelesai}/{totalTugas}</div>
              </div>
              <div className="dt-prog-info">
                <div className="dt-prog-title">{totalSelesai} dari {totalTugas} tugas selesai</div>
                {nilaiRata > 0 && <div className="dt-prog-sub">Nilai rata-rata: <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)" }}>{nilaiRata}</span></div>}
              </div>
            </div>
          )}

          {/* Belum dikerjakan */}
          {(belum.length > 0 || susulanList.length > 0) && (
            <div style={{ marginBottom: 16 }}>
              <div className="dt-sh">
                <span className="dt-sh-title">Belum Dikerjakan</span>
                <span className="dt-sh-count">{belum.length + susulanList.length} tugas</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {susulanList.map(t => <ActiveCard key={t.id} t={t} />)}
                {belum.map(t => <ActiveCard key={t.id} t={t} />)}
              </div>
            </div>
          )}

          {/* Latihan Khusus (personal tasks) */}
          {personal.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="dt-sh">
                <span className="dt-sh-title">Latihan Khusus</span>
                <span className="dt-sh-count">{personal.length} tugas</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {personal.map(t => {
                  const done = store.hasSub(user.id, t.id);
                  if (done) {
                    const sub = store.getSubBy(user.id, t.id);
                    return (
                      <button key={t.id} onClick={() => navigate("tugas-detail", { tugasId: t.id })}
                        style={{ textAlign: "left", display: "block", width: "100%", background: "none", border: "none" }}>
                        <div className="dt-done-list" style={{ borderLeft: "3px solid var(--accent-2)" }}>
                          <div className="dt-done-row">
                            <div className="dt-done-check"><I n="check" s={12} /></div>
                            <div className="dt-done-info">
                              <div className="dt-done-title">{t.judul}</div>
                              <div className="dt-done-sub">Latihan Khusus · {t.soal?.length || 0} soal</div>
                            </div>
                            <div className="dt-done-score">{sub?.nilai || "—"}</div>
                          </div>
                        </div>
                      </button>
                    );
                  }
                  return <ActiveCard key={t.id} t={t} />;
                })}
              </div>
            </div>
          )}

          {/* Selesai — compact rows */}
          {selesai.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="dt-sh">
                <span className="dt-sh-title">Selesai</span>
                <span className="dt-sh-count">{selesai.length} tugas</span>
              </div>
              <div className="dt-done-list">
                {visibleDone.map(t => {
                  const sub = store.getSubBy(user.id, t.id);
                  return (
                    <div key={t.id} className="dt-done-row" onClick={() => navigate("tugas-detail", { tugasId: t.id })}>
                      <div className="dt-done-check"><I n="check" s={12} /></div>
                      <div className="dt-done-info">
                        <div className="dt-done-title">{t.judul}</div>
                        <div className="dt-done-sub">{t.soal?.length || 0} soal · +{sub?.poinDapat || 0} poin</div>
                      </div>
                      <div className="dt-done-score">{sub?.nilai || "—"}</div>
                    </div>
                  );
                })}
                {selesai.length > DONE_LIMIT && !showAllDone && (
                  <div className="dt-show-more" onClick={() => setShowAllDone(true)}>
                    <I n="chevD" s={12} /> Lihat semua ({selesai.length} tugas)
                  </div>
                )}
                {showAllDone && selesai.length > DONE_LIMIT && (
                  <div className="dt-show-more" onClick={() => setShowAllDone(false)}>
                    <I n="chevU" s={12} /> Tutup
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Arsip — lewat deadline, collapsible */}
          {arsip.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setShowArsip(s => !s)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "8px 0", width: "100%", fontFamily: "var(--font)" }}>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                  <I n="clock" s={12} /> Lewat Deadline ({arsip.length})
                </span>
                <I n={showArsip ? "chevD" : "chevR"} s={12} style={{ color: "var(--ink-3)" }} />
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </button>
              {showArsip && (
                <div className="dt-done-list" style={{ opacity: 0.65 }}>
                  {arsip.map(t => (
                    <div key={t.id} className="dt-arsip-row" onClick={() => navigate("tugas-detail", { tugasId: t.id })} style={{ cursor: "pointer" }}>
                      <div className="dt-arsip-icon"><I n="x" s={10} /></div>
                      <div className="dt-done-info">
                        <div className="dt-done-title">{t.judul}</div>
                        <div className="dt-done-sub" style={{ color: "var(--bad)" }}>Deadline terlewat · {t.soal?.length || 0} soal</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      }
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
  const susulan = store.getSusulan(t.id, user.id);
  const susulanAktif = store.isSusulanAktif(t.id, user.id);
  // Cek apakah periode tugas sudah ditutup
  const periodeTutup = t.periode && store.isSemesterClosed(t.periode);
  // Bisa kerjakan kalau: normal (belum lewat), ATAU lewat tapi punya susulan personal yang masih aktif, DAN periode belum ditutup
  const bisa = !done && t.status === "aktif" && t.soal?.length > 0 && (!lewat || susulanAktif) && !periodeTutup;

  // ── Social Proof: hitung progres kelas ──
  const _spAllSiswa = store.getAllSiswa(t.jenjang);
  const _spSiswaList = Array.isArray(t.assignedTo) ? _spAllSiswa.filter(s => t.assignedTo.includes(s.id)) : _spAllSiswa;
  const _spTotal = _spSiswaList.length;
  const _spDone = _spTotal > 1 ? store.getSubs().filter(s => s.tugasId === t.id).length : 0;
  const _spPct = _spTotal > 1 ? Math.round((_spDone / _spTotal) * 100) : 0;

  return <>
    <div className="topbar"><button className="topbar-back" onClick={() => navigate("tugas")}><I n="chevL" s={18} /></button><div className="topbar-title">Detail Tugas</div><div style={{ width: 36 }} /></div>
    <div className="page">
      <div className="dt"><div><h1>{t.judul}</h1><p>{t.mapel}</p></div></div>

      {/* Banner periode ditutup */}
      {periodeTutup && !done && (
        <Card pad="md" style={{ marginBottom: 12, background: "#fef3c7", border: "1.5px solid #f59e0b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f59e0b", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><I n="lock" s={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#92400e", fontSize: 13 }}>Periode sudah ditutup</div>
              <div style={{ fontSize: 11, color: "#78350f", marginTop: 2, lineHeight: 1.5 }}>Tugas dari {t.periode} tidak bisa dikerjakan lagi karena semesternya sudah ditutup oleh guru.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Banner Latihan Khusus — cuma muncul untuk tugas personal */}
      {Array.isArray(t.assignedTo) && (
        <Card pad="md" style={{ marginBottom: 12, background: "var(--accent-tint)", border: "1.5px solid var(--accent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-2)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><I n="star" s={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "var(--accent-2)", fontSize: 13 }}>✨ Latihan Khusus untukmu</div>
              <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.5 }}>Tugas ini dibuat khusus untukmu oleh guru — tetap kerjakan dengan serius, tetap dapat poin & badge!</div>
            </div>
          </div>
        </Card>
      )}

      {/* Banner susulan aktif — cuma keliatan untuk siswa yang dikasih akses ini */}
      {!done && susulanAktif && (
        <Card pad="md" style={{ marginBottom: 12, background: "var(--accent-tint)", border: "1.5px solid var(--accent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><I n="clock" s={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "var(--accent-2)", fontSize: 13 }}>Kamu dapat kesempatan susulan!</div>
              <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 2 }}>Batas waktu baru: {new Date(susulan.deadlineBaru).toLocaleDateString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</div>
              {typeof susulan.nilaiMaks === "number" && <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 2 }}>⚠ Nilai untuk tugas ini dibatasi maksimal <b>{susulan.nilaiMaks}</b>, meski semua jawaban benar.</div>}
            </div>
          </div>
        </Card>
      )}

      <Card pad="lg" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{t.mapel}</div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>{t.judul}</div>
        {t.deskripsi && <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65, marginBottom: 14 }}>{t.deskripsi}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span>
          <span className="chip"><I n="target" s={10} />+{t.graded === false ? Math.round(t.poinMax * 0.2) : t.poinMax} pt maks</span>
          <span className="chip">{t.soal?.length || 0} soal</span>
          {lewat && !done && !susulanAktif && <span className="chip chip-bad">Ditutup</span>}
          {lewat && !done && susulanAktif && <span className="chip" style={{ background: "var(--accent-tint)", color: "var(--accent-2)" }}>Susulan Aktif</span>}
        </div>
      </Card>

      {/* Social Proof — progres kelas (hanya untuk yang belum kerjakan) */}
      {!done && _spTotal > 1 && _spPct > 0 && (
        <div style={{ marginBottom: 12, padding: "12px 16px", background: "var(--surface-alt)", borderRadius: 12, border: "1px solid var(--line-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)" }}>
              <I n="users" s={12} />
              <span>Progres Kelas</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: _spPct >= 60 ? "var(--good)" : "var(--ink-2)" }}>{_spDone}/{_spTotal}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "var(--line-soft)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: _spPct >= 80 ? "var(--good)" : _spPct >= 60 ? "#60a5fa" : "var(--accent)", width: `${Math.max(_spPct, 3)}%`, transition: "width .5s" }} />
          </div>
          {_spPct >= 80 && <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.4 }}>Hampir semua sudah menyelesaikan tugas ini</div>}
          {_spPct >= 60 && _spPct < 80 && <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.4 }}>Sebagian besar kelas sudah selesai</div>}
          {_spPct >= 30 && _spPct < 60 && <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.4 }}>Sebagian teman sekelasmu sudah mengerjakan</div>}
        </div>
      )}

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

  // Bangun map jawaban siswa — soalId (stabil) diutamakan, origIdx sebagai fallback untuk
  // submission lama yang belum punya soalId (sebelum fix ini dibuat).
  const resultByIdx = {};
  const resultById = {};
  (sub.soalResults || []).forEach(r => { resultByIdx[r.origIdx] = r; if (r.soalId) resultById[r.soalId] = r; });

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
          const r = resultById[soal.id] || resultByIdx[idx];
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
  const [showSisaTugas, setShowSisaTugas] = useState(false); // popup sisa tugas setelah submit

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
      const resultItem = { origIdx: s._origIdx ?? i, soalId: s.id, correct, poinSoal };
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
    let nilai = Math.round((correctCount / nonEssayTotal) * 100);

    // Cek apakah siswa submit lewat window susulan personal dengan nilai maksimal dibatasi.
    // Kalau ada & nilai asli melebihi cap-nya, nilai (dan poin, proporsional) diturunkan paksa —
    // meski semua jawaban benar, gak akan pernah melebihi batas yang guru set saat kasih susulan.
    const susulanInfo = store.getSusulan(t.id, user.id);
    if (susulanInfo && typeof susulanInfo.nilaiMaks === "number" && nilai > susulanInfo.nilaiMaks) {
      const rasio = nilai > 0 ? susulanInfo.nilaiMaks / nilai : 0;
      totalPoin = Math.round(totalPoin * rasio);
      nilai = susulanInfo.nilaiMaks;
    }

    // Latihan Khusus (graded: false): poin dikurangi jadi 20% — insentif belajar tanpa inflate leaderboard
    if (t.graded === false) {
      totalPoin = Math.round(totalPoin * 0.2);
    }

    const hasEssay = t.soal.some(s => s.type === "essay" || s.type === "refleksi");
    const dl = fmtDl(t.deadline);
    const ontime = dl.tone !== "bad";
    const prevStats = store.getStats(user.id);
    const prevStreak = prevStats.streak || 0;
    const lb = store.getLeaderboard(user.jenjang);
    const isTopClass = lb.length > 0 && lb[0].id === user.id;
    const isTopThree = lb.length > 0 && lb.slice(0, 3).some(s => s.id === user.id);
    const subForBadge = { nilai, ontime, poinDapat: totalPoin, publishedAt: t.createdAt ? new Date(t.createdAt).getTime() : 0 };
    const newBadges = checkAutoBadges(prevStats, subForBadge, isTopClass, isTopThree, store.getBadges(user.id));

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

  // Result screen — popup overlay on top of LeaderboardScreen
  if (submitted && result) {
    const newPoin = (store.getStats(user.id).poin || 0);
    // Sisa tugas
    const sisaTugas = store.getTugas().filter(st => {
      if (st.id === t.id) return false;
      if (st.jenjang !== user.jenjang || st.status !== "aktif") return false;
      if (Array.isArray(st.assignedTo) && !st.assignedTo.includes(user.id)) return false;
      if (store.hasSub(user.id, st.id)) return false;
      const stLewat = fmtDl(st.deadline).tone === "bad";
      if (stLewat && !store.isSusulanAktif(st.id, user.id)) return false;
      return true;
    });
    // Score color: gradient from red (0) to green (100)
    const nilaiColor = result.nilai >= 75 ? "var(--good)" : result.nilai >= 50 ? "var(--warn)" : "var(--bad)";
    return <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* LeaderboardScreen as background */}
      <LeaderboardScreen user={user} store={store} />
      {/* Popup overlay */}
      {!showSisaTugas && <div className="modal-overlay" style={{ zIndex: 250, position: "fixed" }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: "var(--surface)", borderRadius: 20, width: "100%", maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden", maxHeight: "85vh",
          display: "flex", flexDirection: "column", margin: 20
        }}>
          {/* Header — teal gradient */}
          <div style={{
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
            padding: "12px 16px", position: "relative", borderRadius: "20px 20px 0 0"
          }}>
            <button onClick={() => navigate("leaderboard")} style={{
              position: "absolute", top: 10, right: 12, background: "rgba(255,255,255,.18)",
              border: "none", borderRadius: 99, width: 28, height: 28, display: "grid", placeItems: "center",
              color: "#fff", cursor: "pointer", backdropFilter: "blur(4px)"
            }}><I n="x" s={14} /></button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{result.nilai >= 90 ? "Keren!" : result.nilai >= 70 ? "Selesai!" : "Selesai"}</div>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", marginTop: 2 }}>{t.judul}</div>
          </div>
          {/* Scrollable body */}
          <div style={{ padding: 0, overflowY: "auto", flex: 1 }}>
            {/* Score */}
            <div style={{ textAlign: "center", padding: "20px 16px 4px" }}>
              <div className="stat-num" style={{ fontSize: 52, fontWeight: 800, color: nilaiColor, letterSpacing: "-.03em", lineHeight: 1, fontFamily: "var(--mono)" }}>{result.nilai}</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>nilai · {result.correctCount}/{total} benar</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>+{result.poinDapat} poin didapat</div>
            </div>
            {/* Completion moment */}
            {(() => {
              const cmAllSiswa = store.getAllSiswa(t.jenjang);
              const cmSiswaList = Array.isArray(t.assignedTo) ? cmAllSiswa.filter(s => t.assignedTo.includes(s.id)) : cmAllSiswa;
              const cmTotal = cmSiswaList.length;
              if (cmTotal < 2) return null;
              const cmDone = store.getSubs().filter(s => s.tugasId === t.id).length;
              const cmPct = Math.round((cmDone / cmTotal) * 100);
              const showPosition = cmDone <= Math.ceil(cmTotal * 0.5);
              const isMilestone = cmPct >= 50 && cmPct < 100;
              const isComplete = cmPct >= 100;
              if (!showPosition && !isMilestone && !isComplete) return null;
              return (
                <div style={{ padding: "0 16px" }}>
                  <div style={{ padding: "10px 18px", borderRadius: 12, background: isComplete ? "#f0fdf4" : "var(--surface-alt)", border: isComplete ? "1.5px solid #86efac" : "1px solid var(--line-soft)", textAlign: "center" }}>
                    {showPosition && <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: "var(--accent)" }}>Kamu yang ke-{cmDone}</span> dari kelasmu yang menyelesaikan tugas ini</div>}
                    {!showPosition && isMilestone && <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>Kelas sudah <span style={{ fontWeight: 700, color: "var(--good)" }}>{cmPct}%</span> selesai!</div>}
                    {isComplete && <div style={{ fontSize: 13, color: "var(--good)", fontWeight: 700, lineHeight: 1.5 }}>Seluruh kelas sudah menyelesaikan tugas ini!</div>}
                  </div>
                </div>
              );
            })()}
            {/* LevelCard */}
            <div style={{ padding: "12px 16px 0" }}><LevelCard poin={newPoin} /></div>
            {/* Late indicator */}
            {!result.ontime && (
              <div style={{ textAlign: "center", padding: "10px 16px 0" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 99, background: "var(--bad-bg)", color: "var(--bad)", border: "1px solid #fca5a5", fontSize: 12, fontWeight: 600 }}>Telat — streak direset</span>
              </div>
            )}
            {/* New badges */}
            {result.newBadges?.length > 0 && (
              <div style={{ padding: "12px 16px 0" }}>
                <div style={{ padding: "14px 16px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Badge Baru Terbuka!</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {result.newBadges.map(id => <BadgeChip key={id} badgeId={id} />)}
                  </div>
                </div>
              </div>
            )}
            {/* Sisa tugas cards */}
            {sisaTugas.length > 0 && (
              <div style={{ padding: "14px 16px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, color: "var(--warn)", background: "var(--warn-bg)", border: "1px solid #fcd34d", marginBottom: 10 }}>
                  <I n="zap" s={12} /> Masih ada {sisaTugas.length} tugas lagi!
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sisaTugas.map(st => {
                    const dl = fmtDl(st.deadline);
                    const soalCount = st.soal?.length || 0;
                    const poinMax = st.graded === false ? Math.round((st.poinMax || 0) * 0.2) : (st.poinMax || 0);
                    const allSiswa = store.getAllSiswa(st.jenjang);
                    const siswaList = Array.isArray(st.assignedTo) ? allSiswa.filter(s => st.assignedTo.includes(s.id)) : allSiswa;
                    const totalSiswa = siswaList.length;
                    const sudahKerjakan = store.getSubs().filter(s => s.tugasId === st.id).length;
                    const pctDone = totalSiswa > 0 ? Math.min(100, Math.round((sudahKerjakan / totalSiswa) * 100)) : 0;
                    const barColor = pctDone >= 75 ? "var(--accent)" : "var(--bad)";
                    return (
                      <div key={st.id} style={{ border: "1.5px solid var(--line)", borderRadius: 14, padding: "14px 16px", background: "var(--surface)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accent-tint)", padding: "3px 8px", borderRadius: 6, letterSpacing: ".03em", textTransform: "uppercase" }}>{st.mapel}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: dl.tone === "bad" ? "var(--bad)" : dl.tone === "warn" ? "var(--warn)" : "var(--ink-3)", display: "flex", alignItems: "center", gap: 4 }}><I n="clock" s={12} />{dl.label}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 4, lineHeight: 1.4 }}>{st.judul}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><I n="fileText" s={12} />{soalCount} soal</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><I n="target" s={12} />+{poinMax} pt</span>
                        </div>
                        {totalSiswa > 0 && <div style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Sudah mengerjakan</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{sudahKerjakan}/{totalSiswa}</span>
                          </div>
                          <div style={{ height: 6, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 99, transition: "width .4s", width: `${pctDone}%`, background: barColor }} />
                          </div>
                        </div>}
                        <button onClick={() => navigate("tugas-detail", { tugasId: st.id })} style={{
                          width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
                          background: "linear-gradient(135deg, #0d6b7a 0%, #0a8a7a 100%)",
                          color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          boxShadow: "0 2px 8px rgba(13,107,122,.3)"
                        }}>Kerjakan Sekarang <span style={{ fontSize: 16 }}>→</span></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* All done badge */}
            {sisaTugas.length === 0 && (
              <div style={{ textAlign: "center", padding: "14px 16px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, color: "var(--good)", background: "var(--good-bg)", border: "1.5px solid #86efac" }}>
                  <I n="checkCircle" s={14} /> Semua tugas selesai!
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5 }}>Mantap! Cek posisimu di ranking kelas.</div>
              </div>
            )}
          </div>
          {/* Footer */}
          {sisaTugas.length > 0 && (
            <div style={{ padding: "8px 14px 12px", textAlign: "center", fontSize: 11, color: "var(--ink-4)" }}>Kamu bisa menutup dan mengerjakan nanti</div>
          )}
          {sisaTugas.length === 0 && (
            <div style={{ padding: "8px 16px 14px" }}>
              <button onClick={() => navigate("leaderboard")} style={{
                width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #0d6b7a 0%, #0a8a7a 100%)",
                color: "#fff", fontFamily: "var(--font)", fontWeight: 700, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: "0 2px 8px rgba(13,107,122,.3)"
              }}>Lihat Ranking <span style={{ fontSize: 16 }}>→</span></button>
            </div>
          )}
        </div>
      </div>}
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
          onPaste={e => e.preventDefault()}
        />
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
          <span>{(answers[safeIdx] || "").length} karakter · {((answers[safeIdx] || "").trim().split(/\s+/).filter(Boolean) || []).length} kata</span>
          <span>📝 Dinilai manual oleh guru</span>
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2, fontStyle: "italic" }}>✋ Tempel (paste) dinonaktifkan — ketik langsung jawabanmu</div>
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
              <textarea className="inp" rows={3} style={{ fontSize: 13, lineHeight: 1.5 }} placeholder={`Tulis ${label.toLowerCase()}...`} value={(answers[safeIdx] || {})[key] || ""} onChange={e => { const cur = answers[safeIdx] || { k1: "", k2: "", k3: "", k4: "" }; answer({ ...cur, [key]: e.target.value }); }} onPaste={e => e.preventDefault()} />
            </div>
          );
        })}
        <div style={{ fontSize: 10, color: "var(--ink-3)", fontStyle: "italic", marginBottom: 4 }}>✋ Tempel (paste) dinonaktifkan — ketik langsung jawabanmu</div>
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

// ─── PROFIL SISWA ───
// ─── LAPOR KEJADIAN MODAL (Siswa) ───
// Semi-anonim: guru bisa liat identitas pelapor, tapi UI di sisi siswa gak nyisa jejak.
// Setelah submit, session-only feedback "terkirim", refresh page hilang.
function LaporModal({ user, store, onClose }) {
  const [kategori, setKategori] = useState("");
  const [kategoriLain, setKategoriLain] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [sending, setSending] = useState(false);
  const [terkirim, setTerkirim] = useState(false);

  const KATEGORI_LIST = [
    { value: "konflik", label: "Konflik dengan teman" },
    { value: "bullying", label: "Bullying / perundungan" },
    { value: "sarpras", label: "Sarana/prasarana rusak" },
    { value: "akademik", label: "Kesulitan akademik" },
    { value: "kesehatan", label: "Kesehatan/kondisi diri" },
    { value: "lainnya", label: "Lainnya (tulis di bawah)" },
  ];

  const canSubmit = kategori && deskripsi.trim().length >= 10 && (kategori !== "lainnya" || kategoriLain.trim().length >= 3);

  async function handleSubmit() {
    if (!canSubmit || sending) return;
    setSending(true);
    try {
      await store.addReport({
        kategori,
        kategoriLain: kategori === "lainnya" ? kategoriLain.trim() : "",
        deskripsi: deskripsi.trim(),
        pelaporId: user.id,
        pelaporNama: user.nama,
        jenjang: user.jenjang,
      });
      setTerkirim(true);
    } catch (e) {
      alert("Gagal mengirim laporan. Cek koneksi internet dan coba lagi.");
      setSending(false);
    }
  }

  // Session-only feedback: laporan terkirim
  if (terkirim) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 420, textAlign: "center", padding: 28 }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>✓</div>
          <h3 style={{ marginBottom: 8 }}>Laporan Terkirim</h3>
          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 20 }}>
            Laporan kamu sudah diterima wali kelas. Terima kasih sudah percaya untuk melapor.
            <br /><br />
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
              Identitas kamu hanya diketahui wali kelas dan akan dirahasiakan saat menindaklanjuti.
            </span>
          </p>
          <button className="btn btn-primary btn-full" onClick={onClose}>Tutup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Lapor Kejadian</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--ink-3)", padding: 0, lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.55 }}>
          Ceritakan kejadian yang ingin kamu laporkan. Hanya wali kelas yang bisa membaca laporan ini.
        </p>

        <label className="lbl">Kategori</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
          {KATEGORI_LIST.map(k => (
            <label key={k.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1.5px solid ${kategori === k.value ? "var(--accent)" : "var(--line)"}`, borderRadius: 6, cursor: "pointer", background: kategori === k.value ? "var(--accent-tint)" : "var(--surface)", fontSize: 13 }}>
              <input type="radio" name="kategori" value={k.value} checked={kategori === k.value} onChange={() => setKategori(k.value)} style={{ accentColor: "var(--accent)" }} />
              <span style={{ color: kategori === k.value ? "var(--accent-2)" : "var(--ink-1)", fontWeight: kategori === k.value ? 600 : 400 }}>{k.label}</span>
            </label>
          ))}
        </div>

        {kategori === "lainnya" && (
          <div style={{ marginBottom: 14 }}>
            <label className="lbl">Kategori kamu</label>
            <input className="inp" placeholder="Contoh: masalah keluarga, tekanan..." value={kategoriLain} onChange={e => setKategoriLain(e.target.value)} maxLength={50} />
          </div>
        )}

        <label className="lbl">Ceritakan kejadiannya <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(min 10 karakter)</span></label>
        <textarea className="inp" rows={5} placeholder="Ceritakan apa yang terjadi, kapan, di mana, siapa yang terlibat..." value={deskripsi} onChange={e => setDeskripsi(e.target.value)} maxLength={1000} style={{ resize: "vertical" }} />
        <div style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "right", marginTop: 2 }}>{deskripsi.length}/1000</div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={sending}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!canSubmit || sending}>
            {sending ? "Mengirim..." : "Kirim Laporan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilSiswa({ user, store, navigate }) {
  const stats = store.getStats(user.id);
  const lb = store.getLeaderboard(user.jenjang);
  const myRank = lb.find(s => s.id === user.id);
  const subs = store.getSubs().filter(s => s.siswaId === user.id);
  const myBadges = store.getBadges(user.id);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [showLapor, setShowLapor] = useState(false);
  const photo = store.getPhoto(user.uid || user.id);

  // Feature flag fitur Lapor: aktif untuk siswa VII saja (kelas wali Fata).
  // ASUMSI: semua siswa jenjang "VII" di sistem adalah VII-3.
  const laporEnabled = user.jenjang === "VII";

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
            <I n="user" s={18} /> Pilih foto dari device (maks 5MB)
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

    <div className="page" style={{ paddingTop: 0 }}>
      {/* ─── Compact Profile Hero ─── */}
      <div className="ps-hero">
        <div style={{ position: "relative", display: "inline-block" }}>
          <Avatar name={user.nama} size="xl" photo={photo} />
          <button onClick={() => setShowPhotoPicker(true)} style={{ position: "absolute", bottom: 0, right: -2, width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", color: "#fff", border: "2px solid var(--surface)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <I n="edit" s={11} />
          </button>
        </div>
        <div className="ps-name">{user.nama}</div>
        <div className="ps-class">Kelas {user.jenjang}{user.noAbsen ? ` · No. Absen ${user.noAbsen}` : ""}</div>
      </div>

      {/* ─── Ranking + Streak Row ─── */}
      <div className="ps-lr-row">
        <div className="ps-lr-card">
          <div className="ps-lr-val" style={{ color: "var(--accent)" }}>{myRank ? `#${myRank.rank}` : "—"}</div>
          <div className="ps-lr-label">Ranking Kelas</div>
        </div>
        <div className="ps-lr-card">
          <div className="ps-lr-val" style={{ color: (stats.streak || 0) > 0 ? "var(--bad)" : "var(--ink-4)" }}>
            {(stats.streak || 0) > 0 && <I n="flame" s={16} />} {stats.streak || 0}
          </div>
          <div className="ps-lr-label">Hari Streak</div>
        </div>
      </div>

      {/* ─── Level Progress Inline ─── */}
      {(() => {
        const lv = getLevel(stats.poin);
        const prog = getLevelProgress(stats.poin);
        return (
          <div className="ps-level">
            <div className="ps-lv-icon" style={{ background: lv.bg }}>
              <TierIcon tierId={lv.tierId} size={24} color={lv.color} />
            </div>
            <div className="ps-lv-info">
              <div className="ps-lv-top">
                <span className="ps-lv-name" style={{ color: lv.color }}>{lv.name}</span>
                <span className="ps-lv-xp">{stats.poin}{prog.next ? ` / ${lv.max + 1}` : ""} poin</span>
              </div>
              <div className="ps-lv-bar">
                <div className="ps-lv-fill" style={{ width: `${prog.pct}%`, background: `linear-gradient(90deg, ${lv.color}, ${lv.accent || lv.color})` }} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Stats Grid ─── */}
      <div className="ps-stats">
        <div className="ps-stat">
          <div className="ps-stat-val" style={{ color: "var(--accent)" }}>{stats.poin.toLocaleString("id-ID")}</div>
          <div className="ps-stat-label">Total Poin</div>
        </div>
        <div className="ps-stat">
          <div className="ps-stat-val" style={{ color: "var(--good)" }}>{stats.nilaiRata || "—"}</div>
          <div className="ps-stat-label">Rata-rata</div>
        </div>
        <div className="ps-stat">
          <div className="ps-stat-val" style={{ color: "#1d4ed8" }}>{stats.tugasSelesai}</div>
          <div className="ps-stat-label">Tugas Selesai</div>
        </div>
      </div>

      {/* ═══ CTA RAPOR PERKEMBANGAN ═══ */}
      <button onClick={() => navigate("rapor")} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "0 16px", cursor: "pointer", marginBottom: 14 }}>
        <Card pad="none" style={{ overflow: "hidden", background: "linear-gradient(135deg, #0a525c 0%, #09637E 50%, #088395 100%)", color: "#fff" }}>
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <I n="award" s={20} style={{ color: "#fff" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Rapor Perkembangan</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Lihat perjalanan belajarmu</div>
            </div>
            <I n="chevR" s={16} style={{ color: "rgba(255,255,255,0.6)", flexShrink: 0 }} />
          </div>
        </Card>
      </button>

      {/* ─── Badge Koleksi — 4-column grid ─── */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Badge Koleksi</span>
          <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>{myBadges.length} dari {ALL_BADGES.length}</span>
        </div>
      </div>
      <div className="ps-badge-grid">
        {myBadges.map(id => {
          const b = ALL_BADGES.find(x => x.id === id);
          if (!b) return null;
          return (
            <div key={id} className="ps-badge-cell">
              <BadgeIcon type={b.icon} rim={b.rim} size={42} />
              <span className="ps-badge-name" style={{ color: b.color }}>{b.name}</span>
            </div>
          );
        })}
        {/* Locked slots to fill grid — show next unearned badges */}
        {ALL_BADGES.filter(b => !myBadges.includes(b.id)).slice(0, Math.max(0, (4 - (myBadges.length % 4)) % 4)).map(b => (
          <div key={b.id} className="ps-badge-cell locked">
            <BadgeIcon type={b.icon} rim={b.rim} size={42} />
            <span className="ps-badge-name" style={{ color: "var(--ink-4)" }}>{b.name}</span>
          </div>
        ))}
        {myBadges.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "12px 0", fontSize: 12, color: "var(--ink-4)", textAlign: "center" }}>
            Belum ada badge. Terus kerjakan tugas!
          </div>
        )}
      </div>

      {/* ─── Poin Chart ─── */}
      {stats.poinHistory?.length > 0 && (
        <div style={{ padding: "0 16px", marginBottom: 14 }}>
          <Card><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Perjalanan poin</div><PoinChart data={stats.poinHistory} /></Card>
        </div>
      )}

      {/* ─── Riwayat Pengerjaan ─── */}
      <div style={{ padding: "0 16px" }}>
        <div className="sh"><h2>Riwayat pengerjaan</h2></div>
        {subs.length === 0 ? <Card><div className="empty">Belum ada tugas yang dikerjakan.</div></Card> :
          <Card pad="none" style={{ overflow: "hidden" }}><div style={{ padding: "4px 16px" }}>{subs.slice().reverse().map(s => {
            const t = store.getTugas().find(x => x.id === s.tugasId);
            const intervensi = s.riwayatIntervensi || [];
            const lastIntervensi = intervensi.length > 0 ? intervensi[intervensi.length - 1] : null;
            return (
              <div key={s.id} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center", flexShrink: 0 }}><I n="check" s={16} /></div>
                  <div className="row-main">
                    <div className="row-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {t?.judul || "Tugas dihapus"}
                      {lastIntervensi && <span className="chip" style={{ fontSize: 9, background: "var(--accent-tint)", color: "var(--accent-2)", padding: "1px 6px", fontWeight: 700 }}>Diperbarui guru</span>}
                    </div>
                    <div className="row-sub">{new Date(s.submittedAt).toLocaleDateString("id-ID")} · nilai {s.nilai}</div>
                  </div>
                  <div className="stat-num" style={{ fontSize: 14, fontWeight: 600, color: "var(--good)" }}>+{s.poinDapat}</div>
                </div>
                {lastIntervensi && (
                  <div style={{ marginLeft: 48, padding: "6px 10px", background: "var(--accent-tint)", borderRadius: 6, fontSize: 11, lineHeight: 1.55 }}>
                    <div style={{ color: "var(--accent-2)", fontWeight: 600 }}>
                      Nilai diubah: {lastIntervensi.nilaiSebelum} → {lastIntervensi.nilaiSetelah}
                    </div>
                    <div style={{ color: "var(--ink-2)", marginTop: 2 }}>
                      <b>Alasan:</b> {lastIntervensi.alasan}
                    </div>
                  </div>
                )}
              </div>
            );
          })}</div></Card>}
      </div>

      {/* Fitur Lapor Kejadian — cuma untuk siswa VII (kelas wali) */}
      {laporEnabled && (
        <div style={{ padding: "0 16px", marginTop: 14 }}>
          <Card style={{ background: "linear-gradient(135deg, var(--accent-tint) 0%, var(--surface) 60%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bad-bg)", color: "var(--bad)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <I n="flag" s={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Lapor Kejadian</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1, lineHeight: 1.4 }}>Laporkan kejadian di kelas secara anonim</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowLapor(true)} style={{ flexShrink: 0 }}>Lapor</button>
            </div>
          </Card>
        </div>
      )}

      {showLapor && <LaporModal user={user} store={store} onClose={() => setShowLapor(false)} />}
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

function BuatTugas({ store, navigate, editId = null, presetAssignedTo = null, presetJenjang = null }) {
  const existing = editId ? store.getTugas().find(t => t.id === editId) : null;
  const [form, setForm] = useState({
    judul: existing?.judul || "", mapel: existing?.mapel || "IPA",
    jenjang: existing?.jenjang || presetJenjang || "VII", deadline: existing?.deadline || "",
    poinMax: existing?.poinMax || 100, deskripsi: existing?.deskripsi || "",
    materi: existing?.materi || "",
    // Tugas Personal ("Latihan Khusus"): assignedTo = array siswaId, atau null = class-wide
    // Preset dari quick action Perlu Perhatian: langsung set assignedTo & switch ke mode personal
    assignedTo: existing?.assignedTo || (Array.isArray(presetAssignedTo) && presetAssignedTo.length > 0 ? presetAssignedTo : null),
    // graded: false = tidak masuk avg Tugas Astrolab (default untuk Latihan Khusus, tapi bisa di-override)
    graded: existing?.graded !== false && !presetAssignedTo,
  });
  const [soal, setSoal] = useState(existing?.soal || []);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [showBank, setShowBank] = useState(false);
  const [siswaPicker, setSiswaPicker] = useState(""); // search filter di picker
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totalPoin = soal.reduce((s, q) => s + (q.poin || 0), 0);

  // Untuk tugas personal: kalau edit, siswa yg udah submit tidak boleh di-unassign
  // (nilai/poin/badge mereka nanti orphan kalau di-unassign)
  const existingSubs = editId ? store.getSubs().filter(s => s.tugasId === editId) : [];
  const submittedSiswaIds = new Set(existingSubs.map(s => s.siswaId));

  const semuaSiswaJenjang = store.getAllSiswa(form.jenjang);
  const isPersonal = Array.isArray(form.assignedTo);

  // Toggle personal — kalau ON, init assignedTo = [] & graded = false. Kalau OFF, null keduanya.
  function togglePersonal(on) {
    if (on) {
      setForm(f => ({ ...f, assignedTo: f.assignedTo || [], graded: false }));
    } else {
      // Kalau ada siswa yg udah submit, gak boleh matiin toggle (nilai jadi masuk avg tiba²)
      if (editId && submittedSiswaIds.size > 0) {
        setErr("Tidak bisa mematikan mode Personal: sudah ada siswa yang mengumpulkan.");
        return;
      }
      setForm(f => ({ ...f, assignedTo: null, graded: true }));
    }
  }

  function toggleSiswaAssigned(siswaId) {
    setForm(f => {
      const cur = f.assignedTo || [];
      if (cur.includes(siswaId)) {
        // Cek submit lock
        if (submittedSiswaIds.has(siswaId)) {
          setErr(`Siswa ini sudah mengumpulkan, tidak bisa dikeluarkan dari daftar.`);
          return f;
        }
        return { ...f, assignedTo: cur.filter(x => x !== siswaId) };
      }
      return { ...f, assignedTo: [...cur, siswaId] };
    });
    setErr("");
  }

  function selectAllSiswa() {
    setForm(f => ({ ...f, assignedTo: semuaSiswaJenjang.map(s => s.id) }));
  }
  function clearAllSiswa() {
    // Preserve siswa yg udah submit
    setForm(f => ({ ...f, assignedTo: (f.assignedTo || []).filter(id => submittedSiswaIds.has(id)) }));
  }

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
    // Validasi tugas personal: harus ada minimal 1 siswa di-assign
    if (isPersonal && (form.assignedTo || []).length === 0) {
      setErr("Tugas Personal harus di-assign ke minimal 1 siswa. Pilih siswa di bawah atau matikan mode Personal.");
      return;
    }
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
    const data = {
      ...form,
      soal,
      poinMax: totalPoin || Number(form.poinMax),
      // Firebase RTDB: null value = delete path. Kalau assignedTo null (class-wide), gak perlu simpan field-nya di record.
      // Kalau array (personal), simpan array-nya.
      assignedTo: isPersonal ? form.assignedTo : null,
      graded: form.graded,
      // Auto-tag periode aktif saat tugas dibuat (atau pertahankan existing kalau edit)
      periode: existing?.periode || store.getActivePeriode(),
    };
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

              {/* ═══ TUGAS PERSONAL ("Latihan Khusus") ═══ */}
              <div style={{ padding: "12px 14px", background: isPersonal ? "var(--accent-tint)" : "var(--surface-alt)", borderRadius: 8, border: `1px solid ${isPersonal ? "var(--accent)" : "var(--line)"}`, transition: "background .15s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", display: "flex", alignItems: "center", gap: 6 }}>
                      <I n="users" s={14} /> Tugas Personal (Latihan Khusus)
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.5 }}>
                      Assign hanya ke siswa tertentu (remedial atau pengayaan). Tugas tidak masuk rata-rata Tugas Astrolab. Siswa lain tidak melihat tugas ini.
                    </div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: 42, height: 24, flexShrink: 0 }}>
                    <input type="checkbox" checked={isPersonal} onChange={e => togglePersonal(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: isPersonal ? "var(--accent-2)" : "var(--line)", borderRadius: 12, transition: ".2s" }}>
                      <span style={{ position: "absolute", height: 18, width: 18, left: isPersonal ? 21 : 3, top: 3, background: "#fff", borderRadius: "50%", transition: ".2s" }} />
                    </span>
                  </label>
                </div>

                {isPersonal && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--accent)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>
                        Siswa yang di-assign: <span style={{ color: "var(--accent-2)", fontFamily: "var(--mono)" }}>{(form.assignedTo || []).length}</span> / {semuaSiswaJenjang.length}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 8px" }} onClick={selectAllSiswa}>Semua</button>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 8px" }} onClick={clearAllSiswa}>Kosongkan</button>
                      </div>
                    </div>

                    <input
                      className="inp"
                      placeholder="Cari siswa..."
                      value={siswaPicker}
                      onChange={e => setSiswaPicker(e.target.value)}
                      style={{ marginBottom: 8, fontSize: 12, padding: "6px 10px" }}
                    />

                    <div style={{ maxHeight: 220, overflowY: "auto", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--line)" }}>
                      {semuaSiswaJenjang.length === 0 ? (
                        <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>Belum ada siswa di Kelas {form.jenjang}</div>
                      ) : (
                        semuaSiswaJenjang
                          .filter(s => !siswaPicker.trim() || s.nama.toLowerCase().includes(siswaPicker.toLowerCase()))
                          .map(s => {
                            const checked = (form.assignedTo || []).includes(s.id);
                            const locked = submittedSiswaIds.has(s.id);
                            return (
                              <label
                                key={s.id}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10, padding: "6px 10px",
                                  cursor: locked ? "not-allowed" : "pointer",
                                  borderBottom: "1px solid var(--line-soft)",
                                  background: checked ? "var(--accent-tint)" : "transparent",
                                  opacity: locked ? 0.7 : 1,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={locked}
                                  onChange={() => toggleSiswaAssigned(s.id)}
                                  style={{ margin: 0, accentColor: "var(--accent-2)", width: 16, height: 16, cursor: locked ? "not-allowed" : "pointer" }}
                                />
                                <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--ink-1)" }}>{s.nama}</div>
                                {locked && <span className="chip" style={{ fontSize: 9, background: "var(--good-bg)", color: "var(--good)", padding: "1px 6px", fontWeight: 700 }}>Sudah submit</span>}
                              </label>
                            );
                          })
                      )}
                    </div>

                    {/* Toggle graded (default: false untuk Personal) — mini switch style konsisten dgn toggle parent */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12, padding: "8px 10px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--line-soft)" }}>
                      <div style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.5 }}>
                        Masukkan nilai tugas ini ke rata-rata Tugas Astrolab
                        <div style={{ color: "var(--ink-3)", fontSize: 10 }}>Default OFF untuk Latihan Khusus</div>
                      </div>
                      <label style={{ position: "relative", display: "inline-block", width: 34, height: 20, flexShrink: 0, cursor: "pointer" }}>
                        <input type="checkbox" checked={form.graded} onChange={e => set("graded", e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: form.graded ? "var(--accent-2)" : "var(--line)", borderRadius: 10, transition: ".2s" }}>
                          <span style={{ position: "absolute", height: 14, width: 14, left: form.graded ? 17 : 3, top: 3, background: "#fff", borderRadius: "50%", transition: ".2s" }} />
                        </span>
                      </label>
                    </div>

                    {editId && submittedSiswaIds.size > 0 && (
                      <div style={{ marginTop: 8, padding: "6px 10px", background: "#fef3c7", borderRadius: 6, fontSize: 10.5, color: "#92400e", lineHeight: 1.5 }}>
                        <b>ℹ️ Info:</b> {submittedSiswaIds.size} siswa sudah mengumpulkan — mereka tidak bisa dikeluarkan dari daftar. Kamu masih bisa tambah siswa baru.
                      </div>
                    )}
                  </div>
                )}
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
                } catch (err) { console.error("Import soal error:", err); alert("Gagal membaca file: " + (err?.message || "Pastikan file .xlsx sesuai format template.")); }
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
              {isPersonal ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="target-kelas-badge" style={{ background: "var(--accent-2)" }}><I n="users" s={16} style={{ color: "#fff" }} /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{(form.assignedTo || []).length} siswa terpilih</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Latihan Khusus · Kelas {form.jenjang}</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="target-kelas-badge">{form.jenjang}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Kelas {form.jenjang}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{semuaSiswaJenjang.length} siswa</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    <style>{`.dt-right{display:block !important;}@media(max-width:899px){.dt-right{display:none !important;}}`}</style>
  </>;
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
      const r = sub.soalResults?.find(x => (x.soalId && x.soalId === s.id) || (!x.soalId && x.origIdx === i));
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

// ═══ PERLU PERHATIAN — kompute list siswa yang butuh intervensi minggu ini ═══
// 4 trigger evaluated per siswa:
//   1. tren_turun: 3 nilai terakhir menurun berturut per mapel (n1 terbaru < n2 < n3)
//   2. absen_berturut: 2+ tugas dengan deadline lewat, belum submit, gak ada susulan aktif
//   3. streak_drop: dulu produktif (tugasSelesai ≥5) + sudah miss ≥3 tugas (streakResetFor) + streak sekarang 0
//   4. login_lama: lastSeen > 7 hari yang lalu
// Return sorted by severity (jumlah trigger) desc.
function computePerluPerhatian(store, jenjang) {
  const siswaList = store.getAllSiswa(jenjang);
  const subs = store.getSubs();
  const tugasKelas = store.getTugas().filter(t => t.jenjang === jenjang && t.status !== "scheduled");
  const now = Date.now();
  const results = [];

  siswaList.forEach(s => {
    const triggers = [];
    const stats = store.getStats(s.id);
    const mapels = jenjang === "VII" ? ["IPA", "Informatika"] : ["IPA"];

    // Trigger 1: Tren nilai turun 3x per mapel
    mapels.forEach(mapel => {
      const subsPerMapel = subs
        .filter(sub => sub.siswaId === s.id && typeof sub.nilai === "number")
        .map(sub => ({ ...sub, tugas: tugasKelas.find(t => t.id === sub.tugasId) }))
        .filter(sub => sub.tugas && sub.tugas.mapel === mapel && sub.tugas.graded !== false)
        .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      if (subsPerMapel.length >= 3) {
        const [n1, n2, n3] = subsPerMapel.slice(0, 3).map(x => x.nilai);
        if (n1 < n2 && n2 < n3) {
          triggers.push({ type: "tren_turun", label: `Tren turun ${mapel} (${n3}→${n2}→${n1})` });
        }
      }
    });

    // Trigger 2: Absen 2+ tugas berturut (deadline sorted desc, cek dari terbaru)
    const tugasLewat = tugasKelas
      .filter(t => fmtDl(t.deadline).tone === "bad")
      // Filter tugas personal: kalau ada assignedTo, siswa harus ter-assign
      .filter(t => !Array.isArray(t.assignedTo) || t.assignedTo.includes(s.id))
      .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
    let absenBerturut = 0;
    for (const t of tugasLewat) {
      const submitted = subs.some(sub => sub.siswaId === s.id && sub.tugasId === t.id);
      const susulanAktif = store.isSusulanAktif(t.id, s.id);
      if (submitted || susulanAktif) break;
      absenBerturut++;
      if (absenBerturut >= 3) break; // cap at 3 buat tampilan
    }
    if (absenBerturut >= 2) {
      triggers.push({ type: "absen_berturut", label: `Absen ${absenBerturut}${absenBerturut >= 3 ? "+" : ""} tugas berturut` });
    }

    // Trigger 3: Streak drop (dulu produktif, sekarang stagnan)
    const streakResetCount = Object.keys(stats.streakResetFor || {}).length;
    if ((stats.tugasSelesai || 0) >= 5 && streakResetCount >= 3 && (stats.streak || 0) === 0) {
      triggers.push({ type: "streak_drop", label: "Streak drop mendadak" });
    }

    // Trigger 4: Login lama > 7 hari
    const lastSeen = store.getLastSeen(s.id);
    if (lastSeen) {
      const daysSince = Math.floor((now - lastSeen) / (24 * 60 * 60 * 1000));
      if (daysSince > 7) {
        triggers.push({ type: "login_lama", label: `Tidak login ${daysSince} hari` });
      }
    }

    if (triggers.length > 0) {
      results.push({ siswa: s, triggers, severity: triggers.length });
    }
  });

  // Sort by severity desc, lalu nama alfabetis
  return results.sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.siswa.nama.localeCompare(b.siswa.nama);
  });
}

function DashboardGuru({ store, navigate }) {
  const [jenjang, setJenjang] = useState("VII");
  const [showLaporan, setShowLaporan] = useState(false);
  const [expandedTugas, setExpandedTugas] = useState(null);
  const [showAllPerhatian, setShowAllPerhatian] = useState(false);
  const tugasAll = store.getTugas().filter(t => t.jenjang === jenjang);
  const lb = store.getLeaderboard(jenjang);
  const siswa = store.getAllSiswa(jenjang);
  const subs = store.getSubs();
  const totalSubs = subs.filter(s => { const t = store.getTugas().find(x => x.id === s.tugasId); return t && t.jenjang === jenjang; }).length;
  const tugasAktif = tugasAll.filter(t => fmtDl(t.deadline).tone !== "bad");
  const tugasLewat = tugasAll.filter(t => fmtDl(t.deadline).tone === "bad");
  // Hitung pctNgerjain: denominator disesuaikan per tugas — tugas personal cuma dihitung berdasar siswa yg di-assign,
  // bukan total kelas. Tanpa fix ini, banyak tugas personal ke 2-3 anak bikin pct anjlok gak proporsional.
  const totalKesempatan = tugasAll.reduce((sum, t) => sum + (Array.isArray(t.assignedTo) ? t.assignedTo.length : siswa.length), 0);
  const pctNgerjain = tugasAll.length === 0 || totalKesempatan === 0 ? "—"
    : `${Math.min(100, Math.round((totalSubs / totalKesempatan) * 100))}%`;

  // 5 tugas terbaru (newest first) — sort by createdAt desc
  const tugasTerbaru = [...tugasAll].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  }).slice(0, 5);

  // Rata poin kelas
  const rataPoin = lb.length ? Math.round(lb.reduce((a,s) => a + (s.poin||0), 0) / lb.length) : 0;

  // Perlu perhatian: rich analysis via helper (4 trigger types, sorted by severity)
  const perluPerhatianList = computePerluPerhatian(store, jenjang);

  // Dynamic greeting
  const hour = new Date().getHours();
  const greetingGuru = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return <>
    {showLaporan && <LaporanModal store={store} onClose={() => setShowLaporan(false)} />}
    <div className="page">
      {/* Greeting */}
      <div style={{ paddingTop: 12, paddingBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 3 }}>{greetingGuru}!</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Halo, Pak Fatta</h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>M. Hasanul Fatta, S.Pd.</p>
        </div>
        <span style={{ fontSize: 10, color: "var(--accent)", background: "var(--accent-tint)", padding: "4px 10px", borderRadius: 99, fontWeight: 600, letterSpacing: ".02em", whiteSpace: "nowrap", marginTop: 4 }}>{store.getActivePeriode()}</span>
      </div>
      <div className="dt" style={{ paddingTop: 0, marginBottom: 8 }}>
        <div />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => backupFromStore(store)} title="Download backup data"><I n="chartBar" s={13} /> Backup</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowLaporan(true)}><I n="chartBar" s={13} /> Laporan</button>
          <button className="btn btn-outline btn-sm" onClick={() => exportNilai(store, jenjang)}><I n="chartBar" s={13} /> Export Nilai</button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("materi-manager")}><I n="fileText" s={13} /> Materi</button>
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
                      <DashboardTugasAnalisis
                        tugas={t}
                        subs={tugasSubs}
                        siswaList={Array.isArray(t.assignedTo) ? siswa.filter(s => t.assignedTo.includes(s.id)) : siswa}
                        navigate={navigate}
                      />
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ PERLU PERHATIAN (full-width, rich, actionable) ═══ */}
      <Card pad="none" style={{ marginBottom: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: perluPerhatianList.length > 0 ? "1px solid var(--line)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: perluPerhatianList.length > 0 ? "#fef3c7" : "var(--good-bg)", color: perluPerhatianList.length > 0 ? "#92400e" : "var(--good)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <I n="alert" s={17} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                Perlu Perhatian
                {perluPerhatianList.length > 0 && (
                  <span className="chip" style={{ fontSize: 10, background: "var(--bad-bg)", color: "var(--bad)", padding: "1px 7px", fontWeight: 700 }}>{perluPerhatianList.length}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                {perluPerhatianList.length === 0 ? "Semua siswa dalam kondisi baik" : "Siswa Kelas " + jenjang + " yang butuh follow-up minggu ini"}
              </div>
            </div>
          </div>
          {perluPerhatianList.length > 5 && (
            <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => setShowAllPerhatian(!showAllPerhatian)}>
              {showAllPerhatian ? "Sembunyikan" : `Lihat semua (${perluPerhatianList.length})`}
            </button>
          )}
        </div>

        {perluPerhatianList.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>
            ✨ Tidak ada siswa yang terflag. Semua siswa aktif dan on-track.
          </div>
        ) : (
          <div>
            {perluPerhatianList.slice(0, showAllPerhatian ? perluPerhatianList.length : 5).map((item, i, arr) => (
              <div key={item.siswa.id} style={{
                padding: "11px 16px",
                borderTop: i > 0 ? "1px solid var(--line-soft)" : "none",
                display: "flex", alignItems: "center", gap: 12,
                background: item.severity >= 3 ? "rgba(220, 38, 38, 0.03)" : "transparent",
              }}>
                <UserAvatar userId={item.siswa.id} name={item.siswa.nama} size="md" store={store} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.siswa.nama}</div>
                    {item.severity >= 2 && (
                      <span className="chip" style={{
                        fontSize: 9,
                        background: item.severity >= 3 ? "var(--bad)" : "var(--warn)",
                        color: "#fff",
                        padding: "1px 7px", fontWeight: 700, letterSpacing: ".02em",
                      }}>
                        {item.severity} indikator
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {item.triggers.map((t, idx) => (
                      <span key={idx} className="chip" style={{
                        fontSize: 10, background: "var(--surface-alt)", color: "var(--ink-2)",
                        padding: "2px 7px", border: "1px solid var(--line-soft)",
                      }}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" style={{ padding: "5px 8px" }} title="Kirim pesan" onClick={() => navigate("chat", { openChat: item.siswa.id })}>
                    <I n="chat" s={13} />
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ padding: "5px 8px", color: "var(--accent-2)" }} title="Buat Latihan Khusus untuk siswa ini" onClick={() => navigate("buat-tugas", { presetAssignedTo: [item.siswa.id], presetJenjang: jenjang })}>
                    <I n="star" s={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Top performer card */}
      <Card style={{ marginBottom: 20 }}>
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

  // subsWithEssay di-derive ulang tiap render dari data live: begitu essay terakhir seorang siswa
  // selesai dinilai, siswa itu KELUAR dari array — tapi activeSubIdx tidak ikut menyusut. Kalau dia
  // ada di indeks terakhir (alur normal: klik "Siswa berikutnya" sampai habis, lalu nilai yang
  // terakhir), currentSub jadi undefined dan render di bawah melempar TypeError.
  // Clamp indeksnya supaya selalu menunjuk entri yang valid.
  const safeSubIdx = Math.min(activeSubIdx, subsWithEssay.length - 1);
  const currentSub = subsWithEssay[safeSubIdx];
  const siswa = siswaList.find(s => s.id === currentSub?.siswaId);

  // Shared save logic — dipakai baik untuk soal yang masih match normal, maupun jawaban orphan
  async function saveResultUpdate(matchFn, savingKey, nilaiEssayVal, komentar) {
    setSavingFor(savingKey);
    try {
      const newResults = currentSub.soalResults.map(r => {
        if (matchFn(r) && r.statusNilai === "perlu_dinilai") {
          return { ...r, statusNilai: "dinilai", nilaiEssay: Number(nilaiEssayVal), komentarGuru: komentar || "" };
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
      let nilaiBaru = Math.round((correctCountBaru / totalSoal) * 100);

      // Cap susulan — kalau siswa ini submit lewat susulan personal dengan nilai maksimal dibatasi,
      // nilai essay yang baru dinilai gak boleh bikin nilai akhir naik ngelewatin cap itu lagi.
      const susulanInfo = store.getSusulan(tugas.id, currentSub.siswaId);
      if (susulanInfo && typeof susulanInfo.nilaiMaks === "number" && nilaiBaru > susulanInfo.nilaiMaks) {
        const rasio = nilaiBaru > 0 ? susulanInfo.nilaiMaks / nilaiBaru : 0;
        totalPoinBaru = Math.round(totalPoinBaru * rasio);
        nilaiBaru = susulanInfo.nilaiMaks;
      }

      // Latihan Khusus (graded: false): poin 20% — konsisten dengan doSubmit
      if (tugas.graded === false) {
        totalPoinBaru = Math.round(totalPoinBaru * 0.2);
      }

      await update(ref(db, `submissions/${currentSub.id}`), {
        soalResults: newResults,
        nilai: nilaiBaru,
        poinDapat: totalPoinBaru,
        correctCount: correctCountBaru,
      });

      // Update stats siswa: selisih poin + rebuild nilaiList/nilaiRata.
      // nilaiList WAJIB ikut di-rebuild — submission.nilai baru saja berubah, dan tanpa ini
      // rata-rata nilai siswa selamanya memakai nilai saat submit (sering 0 untuk tugas yang
      // isinya essay semua, karena essay belum terhitung waktu auto-grading).
      const selisihPoin = totalPoinBaru - (currentSub.poinDapat || 0);
      const stats = store.getStats(currentSub.siswaId);
      const { nilaiList, nilaiRata } = store.recomputeNilaiStats(currentSub.siswaId, {
        subId: currentSub.id,
        nilai: nilaiBaru,
      });
      const statsPatch = { nilaiList, nilaiRata };
      if (selisihPoin !== 0) statsPatch.poin = (stats.poin || 0) + selisihPoin;
      await update(ref(db, `stats/${currentSub.siswaId}`), statsPatch);
    } catch (e) {
      alert("Gagal menyimpan nilai: " + e.message);
    } finally {
      setSavingFor(null);
    }
  }

  // Nilai soal yang masih ketemu normal — cocokkan by soalId (stabil), fallback origIdx untuk data lama
  async function nilaiEssay(soal, nilaiEssayVal, komentar) {
    const matchFn = r => (r.soalId && soal.id && r.soalId === soal.id) || (!r.soalId && r.origIdx === soal.idx);
    await saveResultUpdate(matchFn, soal.idx, nilaiEssayVal, komentar);
  }

  // Nilai jawaban ORPHAN — soal aslinya sudah gak ketemu (biasanya karena soal lain dihapus
  // setelah siswa submit, bikin index bergeser). Cocokkan langsung by origIdx si jawaban itu sendiri,
  // karena origIdx dalam 1 submission itu unik walau gak nyambung lagi ke tugas.soal sekarang.
  async function nilaiOrphan(origIdx, nilaiEssayVal, komentar) {
    const matchFn = r => r.origIdx === origIdx;
    await saveResultUpdate(matchFn, `orphan-${origIdx}`, nilaiEssayVal, komentar);
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
            const isCurrent = i === safeSubIdx;
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
            const result = currentSub.soalResults?.find(r => (r.soalId && r.soalId === s.id) || (!r.soalId && r.origIdx === s.idx));
            const isDinilai = result?.statusNilai === "dinilai";
            return (
              <EssayCard key={s.idx} soal={s} result={result} isDinilai={isDinilai} saving={savingFor === s.idx} onNilai={(n, k) => nilaiEssay(s, n, k)} />
            );
          })}

          {/* Jawaban orphan — soal aslinya udah gak match (biasanya soal lain dihapus setelah siswa
              submit, index bergeser). Jawaban TETAP ADA di database, cuma gak ke-link otomatis lagi.
              Ditampilkan di sini biar gurunya tetap bisa lihat & nilai manual. */}
          {(() => {
            const orphaned = (currentSub.soalResults || []).filter(r =>
              r.statusNilai && !essaySoals.some(s => (r.soalId && s.id && r.soalId === s.id) || (!r.soalId && r.origIdx === s.idx))
            );
            if (orphaned.length === 0) return null;
            return (
              <div style={{ marginTop: 14 }}>
                <div style={{ padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: "#92400e", fontSize: 12 }}>⚠ {orphaned.length} jawaban tidak terhubung ke soal manapun</div>
                  <div style={{ fontSize: 11, color: "#78350f", marginTop: 4, lineHeight: 1.5 }}>
                    Biasanya terjadi karena ada soal lain yang dihapus/diedit setelah siswa submit, sehingga urutan soal bergeser. Jawaban di bawah ini <b>masih tersimpan utuh</b> — tidak hilang — tapi perlu dinilai manual di sini karena sistem gak bisa cocokkan otomatis ke soal yang sekarang.
                  </div>
                </div>
                {orphaned.map(r => (
                  <OrphanEssayCard key={r.origIdx} result={r} saving={savingFor === `orphan-${r.origIdx}`} onNilai={(n, k) => nilaiOrphan(r.origIdx, n, k)} />
                ))}
              </div>
            );
          })()}
        </div>

        <div className="modal-actions" style={{ marginTop: 14 }}>
          {safeSubIdx > 0 && <button className="btn btn-outline btn-sm" onClick={() => setActiveSubIdx(safeSubIdx - 1)}>← Siswa sebelumnya</button>}
          <div style={{ flex: 1 }} />
          {safeSubIdx < subsWithEssay.length - 1 && <button className="btn btn-primary btn-sm" onClick={() => setActiveSubIdx(safeSubIdx + 1)}>Siswa berikutnya →</button>}
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

// Kartu jawaban orphan — soal aslinya udah gak ke-link (biasanya soal lain dihapus setelah
// siswa submit). Gak punya akses ke object `soal` (pertanyaan, kata kunci, dll) karena mapping-nya
// putus — cuma tampilin jawaban mentah dari soalResults biar guru tetap bisa baca & nilai manual.
function OrphanEssayCard({ result, saving, onNilai }) {
  const [nilai, setNilai] = useState(result?.nilaiEssay ?? "");
  const [komentar, setKomentar] = useState(result?.komentarGuru || "");
  const isDinilai = result?.statusNilai === "dinilai";
  const isRefleksi = !!result?.jawabanRefleksi;

  return (
    <Card pad="md" style={{ marginBottom: 10, border: isDinilai ? "1.5px solid var(--good)" : "1.5px solid #f59e0b" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>SOAL KE-{(result.origIdx ?? 0) + 1} (posisi lama) · {isRefleksi ? "REFLEKSI" : "ESSAY"}</span>
        {isDinilai ? <span className="chip chip-good" style={{ fontSize: 10 }}>✓ Dinilai · {result.nilaiEssay}/100</span> : <span style={{ fontSize: 10, padding: "1px 6px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontWeight: 600 }}>Perlu dinilai</span>}
      </div>

      <div style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic", marginBottom: 8 }}>Pertanyaan asli tidak bisa ditampilkan (soal sudah berubah), tapi jawaban siswa berikut ini asli & utuh:</div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4, fontWeight: 600 }}>Jawaban Siswa:</div>
        {isRefleksi ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["k1", "k2", "k3", "k4"].map((key, i) => {
              const val = result?.jawabanRefleksi?.[key] || "";
              return (
                <div key={key} style={{ padding: "6px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {val || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>(kosong)</span>}
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

// ═══ VIEW: Render distribusi jawaban per soal (dipake di AnalisisTugasDetail expand) ═══
function SoalDistribusiView({ dist, soal }) {
  if (!dist) return <div style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>Distribusi tidak tersedia untuk tipe soal ini.</div>;

  // Helper: render 1 row opsi dengan bar horizontal
  const OpsiBar = ({ label, text, count, pct, isKunci, isDominantWrong, showKuncilabel = true }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div style={{ minWidth: 22, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: isKunci ? "var(--good)" : "var(--ink-3)" }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <div style={{ fontSize: 12, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{text || <span style={{ fontStyle: "italic", color: "var(--ink-3)" }}>(kosong)</span>}</div>
          {isKunci && showKuncilabel && <span style={{ fontSize: 9, background: "var(--good-bg)", color: "var(--good)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>✓ KUNCI</span>}
          {isDominantWrong && <span style={{ fontSize: 9, background: "var(--bad-bg)", color: "var(--bad)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>⚠ Dominan</span>}
        </div>
        <div style={{ height: 6, background: "var(--surface)", borderRadius: 99, overflow: "hidden", border: "1px solid var(--line-soft)" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: isKunci ? "var(--good)" : isDominantWrong ? "var(--bad)" : "var(--ink-3)", opacity: isKunci || isDominantWrong ? 1 : 0.4, borderRadius: 99, transition: "width .3s" }} />
        </div>
      </div>
      <div style={{ minWidth: 60, textAlign: "right", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--ink-2)" }}>{count} <span style={{ color: "var(--ink-3)" }}>({pct}%)</span></div>
    </div>
  );

  // ── PG / TF / Excel (single-choice)
  if (dist.type === "single-choice") {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Distribusi Jawaban</div>
        {dist.opsi.map(o => (
          <OpsiBar
            key={o.idx}
            label={soal.type === "tf" ? (o.idx === 0 ? "B" : "S") : String.fromCharCode(65 + o.idx)}
            text={o.text}
            count={o.count}
            pct={o.pct}
            isKunci={o.isKunci}
            isDominantWrong={o.idx === dist.dominantWrong}
          />
        ))}
        {dist.belumJawab > 0 && (
          <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6, fontStyle: "italic" }}>
            + {dist.belumJawab} siswa tidak menjawab
          </div>
        )}
        {dist.dominantWrong !== null && dist.opsi[dist.dominantWrong] && (
          <div style={{ marginTop: 10, padding: "8px 10px", background: "var(--bad-bg)", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 11, color: "var(--ink-1)", lineHeight: 1.5 }}>
            💡 <b>Insight:</b> Opsi <b>{soal.type === "tf" ? (dist.dominantWrong === 0 ? "Benar" : "Salah") : String.fromCharCode(65 + dist.dominantWrong)}</b> paling banyak dipilih siswa yang salah — kemungkinan pola miskonsepsi. Perlu ditelusuri saat pembahasan.
          </div>
        )}
      </div>
    );
  }

  // ── Kompleks (multi-choice): show per-opsi individual pick rate
  if (dist.type === "multi-choice") {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Distribusi Pilihan (per opsi)</div>
        {dist.opsi.map(o => (
          <OpsiBar
            key={o.idx}
            label={String.fromCharCode(65 + o.idx)}
            text={o.text}
            count={o.count}
            pct={o.pct}
            isKunci={o.isKunci}
          />
        ))}
        <div style={{ marginTop: 8, padding: "6px 10px", background: "var(--surface)", borderRadius: 6, fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
          <b>Cara baca:</b> Soal kompleks butuh kombinasi opsi. Opsi hijau (KUNCI) idealnya dipilih 100%, opsi lain 0%. Deviasi = petunjuk miskonsepsi.
        </div>
      </div>
    );
  }

  // ── Pasangan (matching): per-pair correctness
  if (dist.type === "matching") {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Akurasi per Pasangan</div>
        {dist.pairs.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < dist.pairs.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
            <div style={{ minWidth: 22, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--ink-3)" }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-1)", lineHeight: 1.4 }}>
                <b>{p.kiri}</b> ↔ <span style={{ color: "var(--good)" }}>{p.kunciKananText}</span>
              </div>
              <div style={{ height: 5, background: "var(--surface)", borderRadius: 99, overflow: "hidden", marginTop: 3, border: "1px solid var(--line-soft)" }}>
                <div style={{ height: "100%", width: `${p.pct}%`, background: p.pct >= 70 ? "var(--good)" : p.pct >= 40 ? "var(--warn)" : "var(--bad)", borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ minWidth: 70, textAlign: "right", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600, color: p.pct >= 70 ? "var(--good)" : p.pct >= 40 ? "var(--warn)" : "var(--bad)" }}>{p.correctCount}/{dist.total} ({p.pct}%)</div>
          </div>
        ))}
      </div>
    );
  }

  // ── Pseudocode (text answer): top 5 jawaban
  if (dist.type === "text-answer") {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Top Jawaban</div>
        <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginBottom: 8 }}>Kunci: <b style={{ color: "var(--good)", fontFamily: "var(--mono)" }}>"{dist.correct}"</b></div>
        {dist.topAnswers.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>Belum ada jawaban.</div>
        ) : dist.topAnswers.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>"{a.text}"</div>
                {a.isCorrect && <span style={{ fontSize: 9, background: "var(--good-bg)", color: "var(--good)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>✓ BENAR</span>}
              </div>
              <div style={{ height: 5, background: "var(--surface)", borderRadius: 99, overflow: "hidden", border: "1px solid var(--line-soft)" }}>
                <div style={{ height: "100%", width: `${a.pct}%`, background: a.isCorrect ? "var(--good)" : "var(--ink-3)", opacity: a.isCorrect ? 1 : 0.5, borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ minWidth: 60, textAlign: "right", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--ink-2)" }}>{a.count} <span style={{ color: "var(--ink-3)" }}>({a.pct}%)</span></div>
          </div>
        ))}
      </div>
    );
  }

  // ── Debug: top pattern
  if (dist.type === "debug") {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Top Perbaikan Debug</div>
        <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginBottom: 8 }}>
          Kunci: baris <b style={{ color: "var(--good)", fontFamily: "var(--mono)" }}>{dist.correctBaris}</b> → <b style={{ color: "var(--good)", fontFamily: "var(--mono)" }}>"{dist.correctPerbaikan}"</b>
        </div>
        {dist.topPatterns.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>Belum ada jawaban.</div>
        ) : dist.topPatterns.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <div style={{ fontSize: 11.5, fontFamily: "var(--mono)", color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  Br.{p.baris} → "{p.perbaikan}"
                </div>
                {p.isCorrect && <span style={{ fontSize: 9, background: "var(--good-bg)", color: "var(--good)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>✓ BENAR</span>}
              </div>
              <div style={{ height: 5, background: "var(--surface)", borderRadius: 99, overflow: "hidden", border: "1px solid var(--line-soft)" }}>
                <div style={{ height: "100%", width: `${p.pct}%`, background: p.isCorrect ? "var(--good)" : "var(--ink-3)", opacity: p.isCorrect ? 1 : 0.5, borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ minWidth: 60, textAlign: "right", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--ink-2)" }}>{p.count} <span style={{ color: "var(--ink-3)" }}>({p.pct}%)</span></div>
          </div>
        ))}
      </div>
    );
  }

  // ── Essay / Refleksi: gak bisa distribusi otomatis
  if (dist.type === "essay") {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Ringkasan Nilai Essay</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--line-soft)", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--good)" }}>{dist.dinilai}</div>
            <div style={{ fontSize: 10, color: "var(--ink-3)" }}>Sudah dinilai</div>
          </div>
          <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--line-soft)", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--mono)", color: dist.belumDinilai > 0 ? "var(--warn)" : "var(--ink-3)" }}>{dist.belumDinilai}</div>
            <div style={{ fontSize: 10, color: "var(--ink-3)" }}>Belum dinilai</div>
          </div>
          <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--line-soft)", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--mono)", color: dist.avgNilai !== null ? (dist.avgNilai >= 80 ? "var(--good)" : dist.avgNilai >= 60 ? "var(--warn)" : "var(--bad)") : "var(--ink-3)" }}>{dist.avgNilai !== null ? dist.avgNilai : "—"}</div>
            <div style={{ fontSize: 10, color: "var(--ink-3)" }}>Rata-rata</div>
          </div>
        </div>
        <div style={{ marginTop: 8, padding: "6px 10px", background: "var(--surface)", borderRadius: 6, fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
          <b>Catatan:</b> Distribusi otomatis tidak tersedia untuk essay/refleksi karena jawaban terbuka. Buka "Nilai Essay" untuk review jawaban per siswa.
        </div>
      </div>
    );
  }

  return <div style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>Distribusi tidak tersedia untuk tipe soal ini.</div>;
}

// ═══ HELPER: Compute distribusi jawaban per soal untuk analisis miskonsepsi ═══
// Return object dengan `type` (single-choice/multi-choice/matching/text/debug/essay) + data spesifik per tipe.
// Highlight dominant distractor (opsi salah yang paling banyak dipilih) — signal miskonsepsi.
function computeSoalDistribution(soal, soalIdx, subs) {
  // Ambil semua results untuk soal ini (via soalId dulu, origIdx fallback)
  const results = subs
    .map(sub => {
      const r = (sub.soalResults || []).find(x => (x.soalId && x.soalId === soal.id) || (!x.soalId && x.origIdx === soalIdx));
      return r ? { ...r, siswaId: sub.siswaId, subId: sub.id } : null;
    })
    .filter(Boolean);
  const total = results.length;

  // PG / Excel — distribusi opsi + highlight kunci & dominant distractor
  if (soal.type === "pg" || soal.type === "excel") {
    const counts = (soal.opsi || []).map(() => 0);
    let belumJawab = 0;
    results.forEach(r => {
      if (typeof r.pickedAnswer === "number" && counts[r.pickedAnswer] !== undefined) counts[r.pickedAnswer]++;
      else belumJawab++;
    });
    const opsi = (soal.opsi || []).map((text, idx) => ({
      idx, text, count: counts[idx],
      pct: total > 0 ? Math.round((counts[idx] / total) * 100) : 0,
      isKunci: idx === soal.jawaban,
    }));
    // Dominant wrong = opsi salah yang paling banyak dipilih (min 1 pemilih)
    const wrongOpsi = opsi.filter(o => !o.isKunci && o.count > 0);
    const dominantWrong = wrongOpsi.length > 0 ? wrongOpsi.reduce((a, b) => b.count > a.count ? b : a).idx : null;
    return { type: "single-choice", opsi, dominantWrong, belumJawab, total };
  }

  // TF (True/False) — 2 opsi
  if (soal.type === "tf") {
    const counts = [0, 0]; // [Benar, Salah]
    let belumJawab = 0;
    results.forEach(r => {
      if (r.pickedAnswer === 0 || r.pickedAnswer === 1) counts[r.pickedAnswer]++;
      else belumJawab++;
    });
    const opsi = [
      { idx: 0, text: "Benar", count: counts[0], pct: total > 0 ? Math.round((counts[0] / total) * 100) : 0, isKunci: soal.jawaban === 0 },
      { idx: 1, text: "Salah", count: counts[1], pct: total > 0 ? Math.round((counts[1] / total) * 100) : 0, isKunci: soal.jawaban === 1 },
    ];
    const wrongOpsi = opsi.filter(o => !o.isKunci && o.count > 0);
    const dominantWrong = wrongOpsi.length > 0 ? wrongOpsi.reduce((a, b) => b.count > a.count ? b : a).idx : null;
    return { type: "single-choice", opsi, dominantWrong, belumJawab, total };
  }

  // Kompleks (multi-select) — per opsi count + kunci set
  if (soal.type === "komplex") {
    const counts = (soal.opsi || []).map(() => 0);
    let belumJawab = 0;
    results.forEach(r => {
      if (Array.isArray(r.pickedMulti) && r.pickedMulti.length > 0) {
        r.pickedMulti.forEach(idx => { if (counts[idx] !== undefined) counts[idx]++; });
      } else belumJawab++;
    });
    const kunciSet = new Set(soal.jawaban || []);
    const opsi = (soal.opsi || []).map((text, idx) => ({
      idx, text, count: counts[idx],
      pct: total > 0 ? Math.round((counts[idx] / total) * 100) : 0,
      isKunci: kunciSet.has(idx),
    }));
    return { type: "multi-choice", opsi, belumJawab, total };
  }

  // Pasangan — per-pair correctness
  if (soal.type === "pasang") {
    const pairs = (soal.kiri || []).map((kiriText, ki) => {
      let correctCount = 0;
      results.forEach(r => {
        if (r.pickedPasang && r.pickedPasang[ki] === (soal.jawaban || [])[ki]) correctCount++;
      });
      return {
        kiri: kiriText,
        kunciKananIdx: (soal.jawaban || [])[ki],
        kunciKananText: (soal.kanan || [])[(soal.jawaban || [])[ki]] || "—",
        correctCount,
        pct: total > 0 ? Math.round((correctCount / total) * 100) : 0,
      };
    });
    return { type: "matching", pairs, total };
  }

  // Pseudocode — top jawaban text
  if (soal.type === "pseudocode") {
    const freq = {};
    results.forEach(r => {
      const key = (r.pickedText || "(kosong)").trim();
      freq[key] = (freq[key] || 0) + 1;
    });
    const topAnswers = Object.entries(freq)
      .map(([text, count]) => ({
        text, count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        isCorrect: text === (soal.jawabanBenar || "").trim(),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { type: "text-answer", topAnswers, correct: soal.jawabanBenar || "—", total };
  }

  // Debug — top pattern {baris, perbaikan}
  if (soal.type === "debug") {
    const freq = {};
    results.forEach(r => {
      const pd = r.pickedDebug || {};
      const key = `${pd.baris ?? "—"}::${(pd.perbaikan || "(kosong)").trim()}`;
      freq[key] = (freq[key] || 0) + 1;
    });
    const topPatterns = Object.entries(freq)
      .map(([key, count]) => {
        const [baris, perbaikan] = key.split("::");
        const isCorrect = String(baris) === String(soal.barisBug) && perbaikan === (soal.perbaikanBenar || "").trim();
        return { baris, perbaikan, count, pct: total > 0 ? Math.round((count / total) * 100) : 0, isCorrect };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { type: "debug", topPatterns, correctBaris: soal.barisBug, correctPerbaikan: soal.perbaikanBenar || "—", total };
  }

  // Essay / Refleksi — no distribution, just grading summary
  if (soal.type === "essay" || soal.type === "refleksi") {
    const dinilai = results.filter(r => r.statusNilai === "dinilai");
    const belumDinilai = results.length - dinilai.length;
    const avgNilai = dinilai.length > 0 ? Math.round(dinilai.reduce((sum, r) => sum + (r.nilaiEssay || 0), 0) / dinilai.length) : null;
    return { type: "essay", dinilai: dinilai.length, belumDinilai, avgNilai, total };
  }

  return null;
}

function AnalisisTugasDetail({ store, tugasId, navigate, onBack }) {
  const t = store.getTugas().find(x => x.id === tugasId);
  if (!t) return <div className="empty">Tugas tidak ditemukan.</div>;
  const allSubs = store.getSubs().filter(s => s.tugasId === t.id);
  const [nilaiEssayTarget, setNilaiEssayTarget] = useState(null);
  const [hanyaKKM, setHanyaKKM] = useState(false);
  const [expandedSoal, setExpandedSoal] = useState(null); // soalIdx yang lagi di-expand untuk lihat distribusi
  // Filter: kalau toggle "Hanya di bawah KKM (80)" aktif, cuma analisa submissions dengan nilai < 80
  const subs = hanyaKKM ? allSubs.filter(s => (s.nilai || 0) < 80) : allSubs;
  const total = subs.length;
  const totalAll = allSubs.length;
  const hasEssay = (t.soal || []).some(s => s.type === "essay");
  const perluDinilai = allSubs.filter(sub => (sub.soalResults || []).some(r => r.statusNilai === "perlu_dinilai")).length;

  if (totalAll === 0) return <div className="empty">Belum ada siswa yang mengerjakan.</div>;

  const avgNilai = total > 0 ? Math.round(subs.reduce((a, s) => a + s.nilai, 0) / total) : 0;
  const feedback = total === 0
    ? "Tidak ada siswa yang perlu perhatian khusus di bawah KKM. 👍"
    : avgNilai >= 85
      ? "Soal tergolong mudah dikuasai siswa. Pertimbangkan meningkatkan kompleksitas soal untuk menantang siswa lebih jauh."
      : avgNilai >= 65
        ? "Tingkat kesulitan soal cukup baik. Sebagian siswa sudah memahami materi, namun masih ada ruang untuk perbaikan."
        : "Soal tergolong sulit bagi siswa. Pertimbangkan mengulang materi sebelum memberikan tugas serupa.";

  // Hitung akurasi per soal dari soalResults
  const soalStats = (t.soal || []).map((s, i) => {
    const correctCount = subs.filter(sub => {
      const r = sub.soalResults?.find(x => (x.soalId && x.soalId === s.id) || (!x.soalId && x.origIdx === i));
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
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{totalAll} siswa submit · {t.soal?.length || 0} soal</div>
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

      {/* Per soal — sorted sulit ke mudah + filter KKM + expand distribusi jawaban */}
      <div className="sh" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2>Per Soal {hanyaKKM && <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-3)" }}>· dari {total} siswa &lt; KKM</span>}</h2>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: hanyaKKM ? "var(--accent-2)" : "var(--ink-3)", fontWeight: hanyaKKM ? 700 : 500, padding: "5px 10px", borderRadius: 6, background: hanyaKKM ? "var(--accent-tint)" : "transparent", transition: "all .15s" }}>
          <input type="checkbox" checked={hanyaKKM} onChange={e => { setHanyaKKM(e.target.checked); setExpandedSoal(null); }} style={{ margin: 0, accentColor: "var(--accent-2)" }} />
          Hanya siswa &lt; KKM (80)
        </label>
      </div>
      {total === 0 ? (
        <Card><div className="empty empty-box" style={{ padding: "24px 16px" }}><I n="check" s={28} style={{ color: "var(--good)" }} /><h3 style={{ color: "var(--good)" }}>Semua siswa di atas KKM</h3><p>Tidak ada siswa dengan nilai &lt; 80 untuk tugas ini.</p></div></Card>
      ) : (
      <Card pad="none" style={{ overflow: "hidden", marginBottom: 16 }}>
        {soalStats.map((s, idx) => {
          const isExpanded = expandedSoal === s.i;
          const dist = isExpanded ? computeSoalDistribution(s, s.i, subs) : null;
          return (
            <div key={s.i} style={{ borderBottom: idx < soalStats.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
              <button
                onClick={() => setExpandedSoal(isExpanded ? null : s.i)}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 16px", fontFamily: "var(--font)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                      Soal {s.i + 1} · {s.poin || Math.floor(t.poinMax / t.soal.length)} poin
                      <span style={{ background: "var(--surface-alt)", color: "var(--ink-2)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>{s.type.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{s.pertanyaan}</div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.color, padding: "3px 8px", background: s.bg, borderRadius: 6 }}>{s.label}</span>
                    <I n={isExpanded ? "chevD" : "chevR"} s={14} style={{ color: "var(--ink-3)" }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 5, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 99, transition: "width .5s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0, fontFamily: "var(--mono)" }}>{s.correctCount}/{total} benar ({s.pct}%)</div>
                </div>
              </button>

              {/* Expandable distribusi jawaban */}
              {isExpanded && dist && (
                <div style={{ padding: "12px 16px 16px", background: "var(--surface-alt)", borderTop: "1px solid var(--line-soft)" }}>
                  <SoalDistribusiView dist={dist} soal={s} />
                </div>
              )}
            </div>
          );
        })}
      </Card>
      )}

      {/* Distribusi nilai siswa — SELALU pake allSubs (bukan filtered), biar konsisten menampilkan semua siswa */}
      <div className="sh"><h2>Distribusi Nilai <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-3)" }}>· {totalAll} siswa</span></h2></div>
      <Card pad="none" style={{ overflow: "hidden", marginBottom: 16 }}>
        {allSubs.slice().sort((a, b) => b.nilai - a.nilai).map((s, i) => {
          const siswa = store.getAllSiswa().find(x => x.id === s.siswaId) || { nama: s.siswaId };
          return (
            <div key={s.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < allSubs.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
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

// ─── INTERVENSI NILAI MODAL (Guru) ───
// Modal 2-level: (1) list semua submission untuk 1 tugas, (2) sub-modal ubah nilai per siswa.
// Guru bisa naikkan nilai (re-assess formatif) atau turunkan (kecurangan). Alasan wajib 10+ char.
// Auto: poin siswa recompute, streak reset kalau nilai = 0.
// Ringkasan per-soal untuk 1 submission — expand inline di IntervensiNilaiModal.
// Default filter: hanya soal yang salah + belum dinilai (sesuai use case "cek soal mana yg salah").
// Toggle "Tampilkan semua" muncul kalau ada soal benar yg lagi di-hide.
function SoalBreakdown({ sub, tugas }) {
  const [showAll, setShowAll] = useState(false);

  // Lookup jawaban siswa — soalId dulu (stabil), origIdx fallback untuk submission lama
  const resultByIdx = {};
  const resultById = {};
  (sub.soalResults || []).forEach(r => { resultByIdx[r.origIdx] = r; if (r.soalId) resultById[r.soalId] = r; });

  const rows = (tugas.soal || []).map((soal, idx) => {
    const r = resultById[soal.id] || resultByIdx[idx];
    const isManual = soal.type === "essay" || soal.type === "refleksi";
    let status; // "correct" | "wrong" | "pending"
    if (isManual) {
      if (r?.statusNilai === "dinilai") status = (r.nilaiEssay || 0) >= 60 ? "correct" : "wrong";
      else status = "pending";
    } else {
      status = r?.correct === true ? "correct" : "wrong";
    }
    return { soal, r, idx, status };
  });

  if (rows.length === 0) {
    return <div style={{ padding: "8px 10px", fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>Tugas tidak punya soal.</div>;
  }

  const nCorrect = rows.filter(x => x.status === "correct").length;
  const nWrong = rows.filter(x => x.status === "wrong").length;
  const nPending = rows.filter(x => x.status === "pending").length;
  const displayRows = showAll ? rows : rows.filter(x => x.status !== "correct");

  const truncate = (s, n) => { const str = String(s || ""); return str.length > n ? str.slice(0, n) + "…" : str; };
  const typeLabel = { pg: "PG", tf: "B/S", komplex: "Kompleks", pasang: "Pasangan", excel: "Excel", essay: "Essay", pseudocode: "Pseudocode", debug: "Debug", refleksi: "Refleksi" };

  function renderAnswerLine(soal, r, status) {
    if (status === "pending") return "Belum dinilai guru";
    if (soal.type === "essay" || soal.type === "refleksi") return `Nilai: ${r?.nilaiEssay ?? 0}/100`;
    if (soal.type === "pg" || soal.type === "excel") {
      const picked = r?.pickedAnswer;
      const kunci = soal.jawaban;
      const pL = typeof picked === "number" ? String.fromCharCode(65 + picked) : "—";
      const kL = typeof kunci === "number" ? String.fromCharCode(65 + kunci) : "—";
      return status === "correct" ? `Pilih: ${pL} ✓` : `Pilih: ${pL} · Kunci: ${kL}`;
    }
    if (soal.type === "tf") {
      const lbl = i => i === 0 ? "Benar" : i === 1 ? "Salah" : "—";
      return status === "correct" ? `Pilih: ${lbl(r?.pickedAnswer)} ✓` : `Pilih: ${lbl(r?.pickedAnswer)} · Kunci: ${lbl(soal.jawaban)}`;
    }
    if (soal.type === "komplex") {
      const picked = (r?.pickedMulti || []).map(i => String.fromCharCode(65 + i)).join(",") || "—";
      const kunci = (soal.jawaban || []).map(i => String.fromCharCode(65 + i)).join(",") || "—";
      return status === "correct" ? `Pilih: ${picked} ✓` : `Pilih: ${picked} · Kunci: ${kunci}`;
    }
    if (soal.type === "pasang") {
      if (status === "correct") return "Semua pasangan benar ✓";
      // Hitung berapa pasangan yg salah biar lebih informatif
      const pp = r?.pickedPasang || {};
      const wrongCount = (soal.jawaban || []).filter((j, ki) => pp[ki] !== j).length;
      const total = (soal.jawaban || []).length;
      return `${total - wrongCount}/${total} pasangan benar`;
    }
    if (soal.type === "pseudocode") {
      const picked = r?.pickedText || "(kosong)";
      const kunci = soal.jawabanBenar || "—";
      return status === "correct" ? `Jawab: "${truncate(picked, 20)}" ✓` : `Jawab: "${truncate(picked, 20)}" · Kunci: "${truncate(kunci, 20)}"`;
    }
    if (soal.type === "debug") {
      const pd = r?.pickedDebug || {};
      const baris = pd.baris ?? "—";
      const perbaikan = pd.perbaikan || "(kosong)";
      if (status === "correct") return `Baris ${baris} ✓`;
      return `Baris ${baris}: "${truncate(perbaikan, 15)}" · Kunci br. ${soal.barisBug}: "${truncate(soal.perbaikanBenar || "", 15)}"`;
    }
    return "—";
  }

  return (
    <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--surface-alt)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
      {/* Summary + toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, fontSize: 11, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, color: "var(--ink-3)", alignItems: "center" }}>
          <span><b style={{ color: "var(--good)" }}>{nCorrect}</b> benar</span>
          <span style={{ opacity: .5 }}>·</span>
          <span><b style={{ color: "var(--bad)" }}>{nWrong}</b> salah</span>
          {nPending > 0 && <>
            <span style={{ opacity: .5 }}>·</span>
            <span><b style={{ color: "var(--warn)" }}>{nPending}</b> belum dinilai</span>
          </>}
        </div>
        {nCorrect > 0 && (
          <button onClick={() => setShowAll(!showAll)} style={{ background: "none", border: "none", color: "var(--accent-2)", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            {showAll ? "Sembunyikan yang benar" : "Tampilkan semua"}
          </button>
        )}
      </div>

      {displayRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "10px 0", fontSize: 11, color: "var(--good)", fontWeight: 600 }}>
          Semua soal auto-graded dijawab dengan benar 🎉
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {displayRows.map(({ soal, r, idx, status }) => {
            const statusIcon = status === "correct" ? "✓" : status === "wrong" ? "✗" : "…";
            const statusColor = status === "correct" ? "var(--good)" : status === "wrong" ? "var(--bad)" : "var(--warn)";
            const statusBg = status === "correct" ? "var(--good-bg)" : status === "wrong" ? "var(--bad-bg)" : "#fef3c7";
            const borderColor = status === "correct" ? "#86efac" : status === "wrong" ? "#fca5a5" : "#fde68a";
            return (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", background: "var(--surface)", borderRadius: 6, border: `1px solid ${borderColor}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, paddingTop: 1 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", minWidth: 22, textAlign: "right" }}>#{idx + 1}</span>
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: statusBg, color: statusColor, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{statusIcon}</span>
                  <span style={{ fontSize: 9, background: "var(--accent-tint)", color: "var(--accent-2)", padding: "2px 5px", borderRadius: 3, fontWeight: 700, letterSpacing: ".02em", whiteSpace: "nowrap" }}>{typeLabel[soal.type] || soal.type}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-1)", fontWeight: 500, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                    {truncate(soal.pertanyaan, 60) || <span style={{ fontStyle: "italic", color: "var(--ink-3)" }}>(tanpa teks)</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--mono)" }}>
                    {renderAnswerLine(soal, r, status)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IntervensiNilaiModal({ tugas, store, onClose }) {
  const [editTarget, setEditTarget] = useState(null); // submission yg lagi diedit
  const [susulanTarget, setSusulanTarget] = useState(null); // siswa yg lagi dikasih susulan
  const [resetTarget, setResetTarget] = useState(null); // { sub, siswa } — konfirmasi reset
  const [expandedId, setExpandedId] = useState(null); // siswa yg row-nya lagi di-expand untuk lihat breakdown per soal
  const [toast, setToast] = useState("");

  const allSubs = store.getSubs().filter(s => s.tugasId === tugas.id);
  // Untuk tugas personal (assignedTo array), siswaList cuma yg di-assign.
  // Class-wide → semua siswa jenjang tsb.
  const allSiswa = store.getAllSiswa(tugas.jenjang);
  const siswaList = Array.isArray(tugas.assignedTo)
    ? allSiswa.filter(s => tugas.assignedTo.includes(s.id))
    : allSiswa;
  const lewat = fmtDl(tugas.deadline).tone === "bad";

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <h3 style={{ margin: 0 }}>Kelola Nilai</h3>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
              {tugas.judul}
              {Array.isArray(tugas.assignedTo) && <span style={{ marginLeft: 6, background: "var(--accent-tint)", color: "var(--accent-2)", padding: "1px 6px", borderRadius: 3, fontWeight: 700, fontSize: 10 }}>✨ Latihan Khusus · {siswaList.length} siswa{tugas.graded === false ? " · tidak masuk avg" : ""}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--ink-3)", padding: 0, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "10px 12px", background: "var(--surface-alt)", borderRadius: 6, marginBottom: 12, fontSize: 11, color: "var(--ink-2)", lineHeight: 1.55 }}>
          <b>Kenapa mengubah nilai?</b> Untuk re-assess formatif atau intervensi kecurangan (alasan wajib). Siswa yang belum mengerjakan setelah deadline lewat otomatis dihitung <b>0</b> di Nilai Akhir — kasih <b>Susulan</b> kalau ada alasan personal (sakit, izin lomba, dll).
        </div>

        <div style={{ overflowY: "auto", flex: 1, marginRight: -4, paddingRight: 4 }}>
          {siswaList.length === 0 ? (
            <div className="empty" style={{ padding: "30px 20px" }}>Belum ada siswa di kelas ini.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {siswaList.map(siswa => {
                const sub = allSubs.find(s => s.siswaId === siswa.id) || null;
                const susulan = store.getSusulan(tugas.id, siswa.id);
                const susulanAktif = store.isSusulanAktif(tugas.id, siswa.id);

                // ── Kasus 1: Sudah submit — bisa diubah nilainya + expand untuk lihat breakdown per soal
                if (sub) {
                  const nilaiColor = sub.nilai >= 80 ? "var(--good)" : sub.nilai >= 60 ? "var(--warn)" : "var(--bad)";
                  const hasIntervensi = (sub.riwayatIntervensi || []).length > 0;
                  const isExpanded = expandedId === siswa.id;
                  // Preview count wrong+pending buat hint di tombol chevron (biar guru langsung tau ada yg salah tanpa expand)
                  const nWrongPending = (sub.soalResults || []).filter(r => {
                    const soal = (tugas.soal || []).find(s => s.id === r.soalId) || (tugas.soal || [])[r.origIdx];
                    if (!soal) return false;
                    const isManual = soal.type === "essay" || soal.type === "refleksi";
                    if (isManual) return r.statusNilai !== "dinilai" || (r.nilaiEssay || 0) < 60;
                    return r.correct !== true;
                  }).length;
                  return (
                    <div key={siswa.id} style={{ background: "var(--surface)", border: `1px solid ${isExpanded ? "var(--accent)" : "var(--line)"}`, borderRadius: 8, overflow: "hidden", transition: "border-color .15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : siswa.id)}
                          title={isExpanded ? "Sembunyikan detail soal" : "Lihat detail soal"}
                          style={{ background: isExpanded ? "var(--accent-tint)" : "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, display: "grid", placeItems: "center", color: isExpanded ? "var(--accent-2)" : "var(--ink-3)", flexShrink: 0, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .15s, background .15s" }}
                        >
                          <I n="chevR" s={14} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{siswa.nama}</div>
                            {hasIntervensi && <span className="chip" style={{ fontSize: 9, background: "var(--accent-tint)", color: "var(--accent-2)", padding: "1px 6px", fontWeight: 700 }}>Diintervensi ×{sub.riwayatIntervensi.length}</span>}
                            {nWrongPending > 0 && <span className="chip" style={{ fontSize: 9, background: "var(--bad-bg)", color: "var(--bad)", padding: "1px 6px", fontWeight: 700 }}>{nWrongPending} soal ✗</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>Poin: +{sub.poinDapat || 0} · Submit: {new Date(sub.submittedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</div>
                        </div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 800, color: nilaiColor, minWidth: 40, textAlign: "center" }}>{sub.nilai}</div>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditTarget(sub)}>
                          <I n="edit" s={12} /> Ubah
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--bad)", padding: "5px 8px" }}
                          title="Reset tugas — siswa dapat kesempatan mengulang"
                          onClick={() => setResetTarget({ sub, siswa })}
                        >
                          <I n="rotate" s={12} />
                        </button>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: "0 12px 10px 12px", borderTop: "1px solid var(--line-soft)" }}>
                          <SoalBreakdown sub={sub} tugas={tugas} />
                        </div>
                      )}
                    </div>
                  );
                }

                // ── Kasus 2: Belum submit, tugas masih aktif (belum lewat) — masih ada waktu, jangan divonis
                if (!lewat) {
                  return (
                    <div key={siswa.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, opacity: 0.7 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>{siswa.nama}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>Belum dikerjakan · tugas masih aktif</div>
                      </div>
                    </div>
                  );
                }

                // ── Kasus 3: Belum submit, lewat, PUNYA susulan aktif — dikasih kesempatan, belum divonis 0
                if (susulanAktif) {
                  return (
                    <div key={siswa.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--accent-tint)", border: "1px solid var(--accent)", borderRadius: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>{siswa.nama}</div>
                        <div style={{ fontSize: 11, color: "var(--accent-2)", marginTop: 2, fontWeight: 600 }}>
                          Susulan aktif sampai {new Date(susulan.deadlineBaru).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {typeof susulan.nilaiMaks === "number" && <span> · nilai maks {susulan.nilaiMaks}</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>Alasan: {susulan.alasan}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--bad)" }} onClick={async () => { await store.removeSusulan(tugas.id, siswa.id); showToast(`Susulan ${siswa.nama} dibatalkan.`); }}>
                        Batalkan
                      </button>
                    </div>
                  );
                }

                // ── Kasus 4: Belum submit, lewat, TIDAK ada susulan aktif — dihitung 0 di average
                return (
                  <div key={siswa.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>{siswa.nama}</div>
                      <div style={{ fontSize: 11, color: "var(--bad)", marginTop: 2, fontWeight: 600 }}>Tidak mengerjakan · dihitung 0</div>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 800, color: "var(--bad)", minWidth: 40, textAlign: "center" }}>0</div>
                    <button className="btn btn-outline btn-sm" onClick={() => setSusulanTarget(siswa)}>
                      Beri Susulan
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {toast && <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 999 }}>{toast}</div>}
      </div>

      {editTarget && <UbahNilaiModal sub={editTarget} tugas={tugas} store={store} siswa={siswaList.find(s => s.id === editTarget.siswaId)} onClose={() => setEditTarget(null)} onSuccess={(msg) => { setEditTarget(null); showToast(msg); }} />}
      {susulanTarget && <BeriSusulanModal siswa={susulanTarget} tugas={tugas} store={store} onClose={() => setSusulanTarget(null)} onSuccess={(msg) => { setSusulanTarget(null); showToast(msg); }} />}
      {resetTarget && <ResetSubmissionModal sub={resetTarget.sub} siswa={resetTarget.siswa} tugas={tugas} store={store} onClose={() => setResetTarget(null)} onSuccess={(msg) => { setResetTarget(null); showToast(msg); }} />}
    </div>
  );
}

// Sub-modal untuk konfirmasi reset submission.
// Reset = hapus nilai & jawaban attempt 1 supaya siswa bisa retake tugas yang sama dari nol.
// Efek: poin di-revert dari total, tugasSelesai turun 1, nilai lama dihapus dari nilaiList.
// Kalau deadline utama sudah lewat, otomatis buka susulan 72 jam supaya siswa bisa akses ulang.
function ResetSubmissionModal({ sub, siswa, tugas, store, onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState("");
  const deadlineLewat = fmtDl(tugas.deadline).tone === "bad";
  const poinDapat = Number(sub.poinDapat) || 0;

  async function handleReset() {
    setErr("");
    setProcessing(true);
    try {
      const result = await store.resetSubmission(tugas.id, siswa.id);
      let msg = `${siswa.nama}: nilai direset, ${result.poinReverted} poin dikembalikan.`;
      if (result.extendedSusulan) msg += " Susulan 72 jam dibuka.";
      onSuccess(msg);
    } catch (e) {
      setErr(e?.message || "Gagal mereset.");
      setProcessing(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }} style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--bad)" }}>Reset Tugas Siswa</h3>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{siswa.nama} · {tugas.judul}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--ink-3)", padding: 0, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "12px 14px", background: "var(--bad-bg)", borderRadius: 8, border: "1px solid #fca5a5", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--bad)", marginBottom: 8 }}>⚠ Yang akan terjadi:</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--ink-1)", lineHeight: 1.7 }}>
            <li>Nilai <b>{sub.nilai}</b> dan semua jawaban attempt 1 <b>dihapus permanen</b></li>
            <li><b>{poinDapat} poin</b> di-revert dari total poin siswa</li>
            <li>Tugas kembali ke status "belum dikerjakan" untuk siswa ini</li>
            {deadlineLewat && <li>Deadline sudah lewat → <b>susulan 72 jam</b> otomatis dibuka untuk siswa ini</li>}
            {!deadlineLewat && <li>Deadline masih aktif → siswa bisa langsung mengerjakan ulang</li>}
          </ul>
        </div>

        <div style={{ padding: "10px 12px", background: "var(--surface-alt)", borderRadius: 8, marginBottom: 12, fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
          <b>💡 Catatan:</b> Streak siswa <b>turun 1</b> (revert attempt 1). Kalau retake ontime, streak naik lagi = net 0. Badge <b>tidak</b> di-revert (milestone yang sudah tercapai).
        </div>

        {deadlineLewat && (
          <div style={{ padding: "10px 12px", background: "#fef3c7", borderRadius: 8, border: "1px solid #fde68a", marginBottom: 12, fontSize: 11.5, color: "#92400e", lineHeight: 1.5 }}>
            <b>⚠ Peringatan:</b> Kalau siswa <b>tidak</b> mengerjakan ulang dalam 72 jam, tugas ini dihitung <b>0</b> di rata-rata Tugas Astrolab (bukan {sub.nilai} seperti sebelum reset). Pastikan siswa tahu ada window ini.
          </div>
        )}

        {err && <div style={{ color: "var(--bad)", fontSize: 12, padding: "8px 12px", background: "var(--bad-bg)", borderRadius: 6, border: "1px solid #fca5a5", marginBottom: 12 }}>{err}</div>}

        <div className="modal-actions" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={processing}>Batal</button>
          <button className="btn btn-danger btn-sm" onClick={handleReset} disabled={processing}>
            {processing ? "Mereset..." : "Ya, Reset & Buka Akses"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-modal untuk ubah nilai 1 submission
function UbahNilaiModal({ sub, tugas, store, siswa, onClose, onSuccess }) {
  const [nilaiBaru, setNilaiBaru] = useState(sub.nilai);
  const [alasan, setAlasan] = useState("");
  const [saving, setSaving] = useState(false);

  const totalPoinTugas = (tugas.soal || []).reduce((sum, s) => sum + (Number(s.poin) || 10), 0);
  const poinBaru = Math.round((Number(nilaiBaru) / 100) * totalPoinTugas);
  const deltaPoin = poinBaru - (sub.poinDapat || 0);
  const deltaNilai = Number(nilaiBaru) - sub.nilai;

  const canSubmit = !saving && Number(nilaiBaru) >= 0 && Number(nilaiBaru) <= 100 && alasan.trim().length >= 10 && Number(nilaiBaru) !== sub.nilai;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await store.updateSubmissionNilai(sub.id, Number(nilaiBaru), alasan.trim());
      onSuccess(`Nilai ${siswa?.nama || sub.siswaId} diubah ke ${nilaiBaru}`);
    } catch (e) {
      alert("Gagal mengubah nilai: " + (e?.message || "coba lagi"));
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }} style={{ zIndex: 1001 }}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3>Ubah Nilai Siswa</h3>
        <div style={{ padding: "10px 12px", background: "var(--surface-alt)", borderRadius: 6, marginBottom: 14, fontSize: 12, lineHeight: 1.6 }}>
          <div><span style={{ color: "var(--ink-3)" }}>Siswa:</span> <b>{siswa?.nama || sub.siswaId}</b></div>
          <div><span style={{ color: "var(--ink-3)" }}>Tugas:</span> {tugas.judul}</div>
          <div><span style={{ color: "var(--ink-3)" }}>Nilai sekarang:</span> <b>{sub.nilai}</b> · Poin: +{sub.poinDapat || 0}</div>
        </div>

        <label className="lbl">Nilai Baru (0-100)</label>
        <input className="inp" type="number" min={0} max={100} value={nilaiBaru} onChange={e => setNilaiBaru(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700 }} />

        {/* Preview delta */}
        {Number(nilaiBaru) !== sub.nilai && Number(nilaiBaru) >= 0 && Number(nilaiBaru) <= 100 && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: deltaPoin >= 0 ? "var(--good-bg)" : "#fee2e2", borderRadius: 6, fontSize: 12, lineHeight: 1.6 }}>
            <div><b>Preview:</b></div>
            <div>Nilai: {sub.nilai} → <b>{nilaiBaru}</b> ({deltaNilai > 0 ? "+" : ""}{deltaNilai})</div>
            <div>Poin: +{sub.poinDapat || 0} → <b>+{poinBaru}</b> ({deltaPoin > 0 ? "+" : ""}{deltaPoin})</div>
            {Number(nilaiBaru) === 0 && <div style={{ color: "var(--bad)", fontWeight: 700, marginTop: 4 }}>⚠ Streak siswa akan direset ke 0</div>}
          </div>
        )}

        <label className="lbl" style={{ marginTop: 14 }}>Alasan <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(min 10 karakter, wajib)</span></label>
        <textarea className="inp" rows={3} placeholder="Contoh: 'Tes ulang formatif — siswa berhasil menjelaskan konsep dengan benar' atau 'Ditemukan nyontek dari teman'" value={alasan} onChange={e => setAlasan(e.target.value)} maxLength={300} style={{ resize: "vertical" }} />
        <div style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "right", marginTop: 2, marginBottom: 12 }}>{alasan.length}/300 · Alasan akan terlihat oleh siswa</div>

        <div className="modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BERI SUSULAN MODAL ───
// Guru kasih akses submit personal ke 1 siswa tertentu untuk tugas yang udah lewat deadline.
// Beda dari "Perpanjang" (class-wide) — ini cuma buka akses buat siswa ini doang, siswa lain tetap tertutup.
// Tanggal batas + alasan WAJIB diisi (accountability, sesuai keputusan Fata).
function BeriSusulanModal({ siswa, tugas, store, onClose, onSuccess }) {
  const [deadlineBaru, setDeadlineBaru] = useState("");
  const [alasan, setAlasan] = useState("");
  const [pakaiCap, setPakaiCap] = useState(false);
  const [nilaiMaks, setNilaiMaks] = useState("");
  const [saving, setSaving] = useState(false);

  const capValid = !pakaiCap || (nilaiMaks !== "" && Number(nilaiMaks) >= 1 && Number(nilaiMaks) <= 100);
  const canSubmit = deadlineBaru && alasan.trim().length >= 5 && capValid && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const cap = pakaiCap ? Number(nilaiMaks) : null;
      await store.addSusulan(tugas.id, siswa.id, deadlineBaru, alasan.trim(), cap);
      const capMsg = cap ? ` (nilai dibatasi maks ${cap})` : "";
      onSuccess(`Susulan untuk ${siswa.nama} diberikan sampai ${new Date(deadlineBaru).toLocaleDateString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}${capMsg}.`);
    } catch (e) {
      alert("Gagal memberi susulan: " + (e?.message || "coba lagi"));
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }} style={{ zIndex: 1001 }}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <h3>Beri Susulan</h3>
        <div style={{ padding: "10px 12px", background: "var(--surface-alt)", borderRadius: 6, marginBottom: 14, fontSize: 12, lineHeight: 1.6 }}>
          <div><span style={{ color: "var(--ink-3)" }}>Siswa:</span> <b>{siswa.nama}</b></div>
          <div><span style={{ color: "var(--ink-3)" }}>Tugas:</span> {tugas.judul}</div>
        </div>
        <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.55 }}>
          Susulan cuma buka akses submit untuk <b>{siswa.nama}</b> saja — siswa lain di kelas ini tetap tidak bisa mengerjakan tugas ini lagi. Gunakan untuk kasus personal (sakit, izin lomba, dll), bukan gangguan massal (pakai "Perpanjang" tugas untuk itu).
        </p>

        <label className="lbl">Batas Waktu Susulan <span style={{ color: "var(--bad)" }}>*wajib</span></label>
        <input className="inp" type="datetime-local" value={deadlineBaru} onChange={e => setDeadlineBaru(e.target.value)} />

        <label className="lbl" style={{ marginTop: 14 }}>Alasan <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(min 5 karakter, wajib)</span></label>
        <textarea className="inp" rows={2} placeholder="Contoh: Sakit dengan surat dokter, Izin fokus lomba OSN Kabupaten" value={alasan} onChange={e => setAlasan(e.target.value)} maxLength={200} style={{ resize: "vertical" }} />
        <div style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "right", marginTop: 2, marginBottom: 12 }}>{alasan.length}/200</div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={pakaiCap} onChange={e => setPakaiCap(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-1)" }}>Batasi nilai maksimal untuk susulan ini</span>
        </label>
        <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2, marginLeft: 24, lineHeight: 1.5 }}>
          Opsional. Kalau diaktifkan, nilai siswa untuk tugas ini gak akan pernah melebihi angka yang kamu set — meski semua jawaban benar. Cocok kalau kebijakanmu: susulan tetap ada konsekuensi, gak disamakan penuh dengan yang tepat waktu.
        </div>
        {pakaiCap && (
          <div style={{ marginTop: 8 }}>
            <input className="inp" type="number" min={1} max={100} placeholder="Contoh: 80" value={nilaiMaks} onChange={e => setNilaiMaks(e.target.value)} style={{ fontFamily: "var(--mono)", maxWidth: 120 }} />
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? "Menyimpan..." : "Beri Susulan"}
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
  const [personalOnly, setPersonalOnly] = useState(false);
  const [toast, setToast] = useState("");
  const [showMateriManager, setShowMateriManager] = useState(false);
  const [intervensiTarget, setIntervensiTarget] = useState(null);
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }
  const tugasAll = store.getTugas().filter(t => t.jenjang === jenjang);
  const siswa = store.getAllSiswa(jenjang);
  const subs = store.getSubs();

  const aktifList = tugasAll.filter(t => fmtDl(t.deadline).tone !== "bad");
  const lewatList = tugasAll.filter(t => fmtDl(t.deadline).tone === "bad");
  const personalCount = tugasAll.filter(t => Array.isArray(t.assignedTo)).length;
  let displayed = filter === "aktif" ? aktifList : filter === "lewat" ? lewatList : tugasAll;
  if (personalOnly) displayed = displayed.filter(t => Array.isArray(t.assignedTo));

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

      {/* Filter tabs + counter lewat deadline + toggle Personal saja */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="tabs">
          {[["aktif", `Aktif (${aktifList.length})`], ["lewat", `Lewat (${lewatList.length})`], ["semua", "Semua"]].map(([v, l]) =>
            <button key={v} className={`tab ${filter === v ? "active" : ""}`} onClick={() => setFilter(v)}>{l}</button>
          )}
        </div>
        {lewatList.length > 0 && filter !== "lewat" && (
          <span className="chip chip-bad" style={{ fontSize: 11 }}><I n="clock" s={10} />{lewatList.length} lewat</span>
        )}
        {personalCount > 0 && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto", cursor: "pointer", fontSize: 12, color: personalOnly ? "var(--accent-2)" : "var(--ink-3)", fontWeight: personalOnly ? 700 : 500, padding: "5px 10px", borderRadius: 6, background: personalOnly ? "var(--accent-tint)" : "transparent", transition: "all .15s" }}>
            <input type="checkbox" checked={personalOnly} onChange={e => setPersonalOnly(e.target.checked)} style={{ margin: 0, accentColor: "var(--accent-2)", cursor: "pointer" }} />
            <I n="users" s={12} /> Personal saja ({personalCount})
          </label>
        )}
      </div>

      {displayed.length === 0 ? (
        <Card><div className="empty empty-box"><I n="book" s={32} /><h3>{personalOnly ? "Tidak ada tugas personal" : filter === "lewat" ? "Tidak ada tugas lewat deadline" : "Belum ada tugas"}</h3><p>{personalOnly ? "Belum ada Tugas Personal untuk kelas ini." : filter === "lewat" ? "Semua tugas masih dalam batas waktu." : `Buat tugas pertama untuk Kelas ${jenjang}!`}</p>{!personalOnly && filter !== "lewat" && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate("buat-tugas")}><I n="plus" s={14} /> Buat Tugas Pertama</button>}</div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {displayed.map(t => {
            const dl = fmtDl(t.deadline);
            const lewat = dl.tone === "bad";
            const isPersonal = Array.isArray(t.assignedTo);
            // Untuk tugas personal, denominator adalah jumlah siswa yg di-assign, bukan total kelas
            const targetSiswa = isPersonal
              ? siswa.filter(s => t.assignedTo.includes(s.id))
              : siswa;
            const targetIds = new Set(targetSiswa.map(s => s.id));
            const subCount = subs.filter(s => s.tugasId === t.id && targetIds.has(s.siswaId)).length;
            const totalTarget = targetSiswa.length;
            const pct = totalTarget ? Math.round((subCount / totalTarget) * 100) : 0;
            const belumKerjain = totalTarget - subCount;
            // Nama-nama siswa target untuk display (personal only)
            const namaAssigned = isPersonal ? targetSiswa.map(s => s.nama.split(" ")[0]) : [];
            const namaPreview = namaAssigned.length <= 3
              ? namaAssigned.join(", ")
              : `${namaAssigned.slice(0, 3).join(", ")} +${namaAssigned.length - 3} lainnya`;
            return (
              <Card key={t.id} style={{ borderLeft: isPersonal ? "3px solid var(--accent-2)" : lewat ? "3px solid var(--bad)" : "none", opacity: lewat ? 0.85 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".05em" }}>{t.mapel}</span>
                      {isPersonal && <span className="chip" style={{ fontSize: 9, background: "var(--accent-tint)", color: "var(--accent-2)", fontWeight: 700, padding: "1px 6px" }}><I n="users" s={9} /> {targetSiswa.length} siswa · Latihan Khusus</span>}
                      {t.graded === false && !isPersonal && <span className="chip" style={{ fontSize: 9, background: "var(--surface-alt)", color: "var(--ink-3)", padding: "1px 6px" }}>Tidak dinilai</span>}
                      {lewat && <span className="chip chip-bad" style={{ fontSize: 9 }}>Ditutup</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>{t.judul}</div>
                    {isPersonal && namaAssigned.length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--accent-2)", marginTop: 4, fontWeight: 500 }}>
                        Untuk: {namaPreview}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      <span className={`chip ${dl.tone ? "chip-" + dl.tone : ""}`}><I n="clock" s={10} />{dl.label}</span>
                      <span className="chip">{t.soal?.length || 0} soal</span>
                      <span className="chip">maks +{t.graded === false ? Math.round(t.poinMax * 0.2) : t.poinMax} pt{t.graded === false ? " (20%)" : ""}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {subCount > 0 && <button className="btn btn-soft btn-sm" title="Kelola nilai siswa" onClick={() => setIntervensiTarget(t)}><I n="edit" s={13} /> Nilai</button>}
                      <button className="btn btn-soft btn-sm" title={lewat ? "Perpanjang deadline / edit tugas" : "Edit tugas"} onClick={() => navigate("edit-tugas", { tugasId: t.id })}>
                        <I n="edit" s={13} />{lewat && " Perpanjang"}
                      </button>
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
                  <div className="stat-num" style={{ fontSize: 12, fontWeight: 600 }}>{subCount}/{totalTarget}</div>
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
    {intervensiTarget && <IntervensiNilaiModal tugas={intervensiTarget} store={store} onClose={() => setIntervensiTarget(null)} />}
  </>;
}

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
// ═══ RAPOR PERKEMBANGAN SISWA ═══
// Screen dedicated untuk siswa melihat breakdown nilai semester aktif.
// Data di-fetch langsung dari Firebase (bukan dari store bulk listener yang guru-only).
// Gated: nilai cuma muncul kalau guru sudah "terbitkan" di NilaiAkhirPage (publish gate).
// Bonus Nilai ditampilkan sebagai angka tanpa alasan (alasan = catatan informal guru).
function RaporSiswa({ user, store, navigate }) {
  const [loading, setLoading] = useState(true);
  const [nilaiData, setNilaiData] = useState({});
  const [boostData, setBoostData] = useState({});
  const periode = store.getActivePeriode();
  const mapels = user.jenjang === "VII" ? ["IPA", "Informatika"] : ["IPA"];
  const sanitize = (s) => s.replace(/[.#$/[\]]/g, "-");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const nd = {};
      const bd = {};
      for (const mapel of mapels) {
        const naKey = sanitize(`${user.id}_${mapel}_${user.jenjang}_${periode}`);
        try {
          const snap = await get(ref(db, `nilaiAkhir/${naKey}`));
          nd[mapel] = snap.val();
        } catch { nd[mapel] = null; }
        // Fetch boost (try both sanitized and legacy key)
        const bKey = sanitize(`${user.id}_${mapel}_${user.jenjang}_${periode}`);
        try {
          const snap = await get(ref(db, `nilaiBoost/${bKey}`));
          bd[mapel] = snap.val() || {};
        } catch { bd[mapel] = {}; }
      }
      setNilaiData(nd);
      setBoostData(bd);
      setLoading(false);
    };
    fetchData();
  }, [user.id, user.jenjang]);

  // Compute breakdown per mapel (mirror computeNilaiAkhir tapi dari fetched data)
  function computeBreakdown(mapel) {
    const rec = nilaiData[mapel] || {};
    const boosts = boostData[mapel] || {};
    const boostArr = Object.values(boosts);
    const getBoostSum = (komponen) => boostArr.filter(b => b.komponen === komponen).reduce((sum, b) => sum + (Number(b.nilai) || 0), 0);

    const sumatifVals = Object.values(rec.sumatif || {}).filter(v => typeof v === "number");
    const sumatifAvg = sumatifVals.length ? sumatifVals.reduce((a, b) => a + b, 0) / sumatifVals.length : null;
    const kuisVals = Object.values(rec.kuis || {}).filter(v => typeof v === "number");
    const kuisAvg = kuisVals.length ? kuisVals.reduce((a, b) => a + b, 0) / kuisVals.length : null;
    const tugasAvg = store.getTugasAstrolabAvg(user.id, mapel, user.jenjang);

    const applyBoost = (base, key) => {
      const boost = getBoostSum(key);
      if (typeof base !== "number") return { val: base, base, boost };
      return { val: Math.min(100, base + boost), base, boost };
    };

    const komponen = [
      { label: "Sumatif per BAB", key: "sumatif", ...applyBoost(sumatifAvg, "sumatif"), bobot: 0.10, icon: "book" },
      { label: "Tugas Astrolab", key: "tugasAstrolab", ...applyBoost(tugasAvg, "tugasAstrolab"), bobot: 0.20, icon: "target" },
      { label: "UTS", key: "uts", ...applyBoost(rec.uts, "uts"), bobot: 0.20, icon: "edit" },
      { label: "UAS", key: "uas", ...applyBoost(rec.uas, "uas"), bobot: 0.20, icon: "edit" },
      { label: "Kuis Harian", key: "kuis", ...applyBoost(kuisAvg, "kuis"), bobot: 0.10, icon: "zap" },
      { label: "Portofolio", key: "portofolio", ...applyBoost(rec.portofolio, "portofolio"), bobot: 0.20, icon: "star" },
    ];

    const filled = komponen.filter(k => typeof k.val === "number");
    const totalBobot = filled.reduce((s, k) => s + k.bobot, 0);
    const nilaiAkhir = totalBobot > 0 ? Math.round(filled.reduce((s, k) => s + k.val * k.bobot, 0) / totalBobot * 100) / 100 : null;

    // Sumatif per BAB detail
    const sumatifDetail = Object.entries(rec.sumatif || {}).filter(([, v]) => typeof v === "number").map(([label, val]) => ({ label, val }));

    return { komponen, nilaiAkhir, filled: filled.length, total: komponen.length, sumatifDetail };
  }

  const nilaiColor = (n) => n >= 80 ? "var(--good)" : n >= 65 ? "var(--warn)" : "var(--bad)";

  if (loading) return <>
    <div className="topbar"><button className="topbar-back" onClick={() => navigate("profil")}><I n="chevL" s={18} /></button><div className="topbar-title">Rapor</div><div style={{ width: 36 }} /></div>
    <div className="page"><div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)" }}>Memuat data...</div></div>
  </>;

  return <>
    <div className="topbar"><button className="topbar-back" onClick={() => navigate("profil")}><I n="chevL" s={18} /></button><div className="topbar-title">Rapor Perkembangan</div><div style={{ width: 36 }} /></div>
    <div className="page">
      <div style={{ paddingTop: 8, paddingBottom: 6 }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{periode}</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", margin: "4px 0 0" }}>Rapor Perkembangan</h1>
      </div>

      {mapels.map(mapel => {
        const published = store.isNilaiPublished(mapel, user.jenjang, periode);
        if (!published) return (
          <Card key={mapel} style={{ marginBottom: 14, textAlign: "center", padding: "30px 20px" }}>
            <I n="clock" s={28} style={{ color: "var(--ink-3)", marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-2)" }}>Nilai {mapel} Belum Diterbitkan</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>Guru belum menerbitkan nilai untuk {mapel} semester ini. Nanti akan muncul di sini.</div>
          </Card>
        );

        const br = computeBreakdown(mapel);
        return (
          <div key={mapel} style={{ marginBottom: 20 }}>
            {/* Hero card — Nilai Akhir besar */}
            <Card pad="none" style={{ overflow: "hidden", marginBottom: 10 }}>
              <div style={{ background: "linear-gradient(135deg, #0a525c 0%, #09637E 50%, #088395 100%)", color: "#fff", padding: "22px 20px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", opacity: 0.8, fontWeight: 700 }}>{mapel} · Kelas {user.jenjang}</div>
                <div style={{ fontSize: 52, fontWeight: 900, fontFamily: "var(--mono)", lineHeight: 1.1, marginTop: 6 }}>
                  {br.nilaiAkhir !== null ? br.nilaiAkhir : "—"}
                </div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                  {br.nilaiAkhir === null ? "Belum cukup data" : br.nilaiAkhir >= 80 ? "Di atas KKM — Kerja bagus!" : br.nilaiAkhir >= 65 ? "Mendekati KKM — Terus tingkatkan!" : "Di bawah KKM — Jangan menyerah!"}
                </div>
                {br.filled < br.total && <div style={{ fontSize: 10, opacity: 0.65, marginTop: 4 }}>({br.filled}/{br.total} komponen terisi)</div>}
              </div>
            </Card>

            {/* Breakdown 6 komponen */}
            <Card pad="none" style={{ overflow: "hidden", marginBottom: 10 }}>
              <div style={{ padding: "12px 16px 8px", fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>Breakdown Komponen</div>
              {br.komponen.map((k, i) => {
                const hasVal = typeof k.val === "number";
                const hasBoost = k.boost > 0 && typeof k.base === "number";
                return (
                  <div key={k.key} style={{ padding: "10px 16px", borderTop: "1px solid var(--line-soft)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: hasVal ? "var(--accent-tint)" : "var(--surface-alt)", color: hasVal ? "var(--accent-2)" : "var(--ink-3)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <I n={k.icon} s={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-1)" }}>{k.label}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <div style={{ flex: 1, height: 5, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: hasVal ? `${k.val}%` : "0%", background: hasVal ? nilaiColor(k.val) : "var(--ink-3)", borderRadius: 99, transition: "width .5s" }} />
                        </div>
                        <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600 }}>{Math.round(k.bobot * 100)}%</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {hasVal ? (
                        <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 800, color: nilaiColor(k.val) }}>{Math.round(k.val)}</div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic" }}>—</div>
                      )}
                      {hasBoost && (
                        <div style={{ fontSize: 9, color: "var(--accent-2)", fontWeight: 700, fontFamily: "var(--mono)" }}>+{k.boost} bonus</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Sumatif per BAB — mini bar chart */}
            {br.sumatifDetail.length > 0 && (
              <Card style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 10 }}>Nilai Sumatif per BAB</div>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100 }}>
                  {br.sumatifDetail.map((d, i) => {
                    const h = Math.max(8, (d.val / 100) * 90);
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: nilaiColor(d.val) }}>{d.val}</div>
                        <div style={{ width: "100%", maxWidth: 40, height: h, background: nilaiColor(d.val), borderRadius: "4px 4px 0 0", transition: "height .5s", opacity: 0.85 }} />
                        <div style={{ fontSize: 9, color: "var(--ink-3)", fontWeight: 600, textAlign: "center", lineHeight: 1.2, maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        );
      })}
    </div>
  </>;
}

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
            <I n="user" s={18} /> Pilih foto dari device (maks 5MB)
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

      {/* Pengaturan Semester */}
      <Card style={{ marginBottom: 12, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Pengaturan Semester</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <I n="clock" s={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 3 }}>Periode Aktif</div>
              <select className="inp" value={store.getActivePeriode()} onChange={e => {
                const val = e.target.value;
                const autoDetected = getPeriodeAktif();
                store.setSemesterOverride(val === autoDetected ? null : val);
              }} style={{ fontSize: 13, padding: "6px 10px" }}>
                {getPeriodeOptions().map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
                Auto-detect: <b>{getPeriodeAktif()}</b>
                {store.semesterSettings?.override && <> · <button onClick={() => store.setSemesterOverride(null)} style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", padding: 0 }}>Reset ke auto</button></>}
              </div>
            </div>
          </div>
          {/* Tutup Semester */}
          <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>Tutup Semester</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 10 }}>
              Menandai periode sebagai selesai. Siswa tidak bisa lagi mengerjakan tugas dari periode tertutup.
            </div>
            {(() => {
              const activePeriode = store.getActivePeriode();
              const isClosed = store.isSemesterClosed(activePeriode);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                    {activePeriode}
                    {isClosed && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "var(--ink-4)", background: "var(--bg)", padding: "2px 8px", borderRadius: 99 }}>Sudah ditutup</span>}
                  </div>
                  {!isClosed ? (
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      if (confirm(`Tutup "${activePeriode}"? Siswa tidak bisa mengerjakan tugas dari periode ini setelah ditutup.`)) {
                        store.closeSemester(activePeriode);
                      }
                    }}>
                      <I n="lock" s={13} /> Tutup Periode
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--good)", fontWeight: 600 }}>✓ Tertutup</span>
                  )}
                </div>
              );
            })()}
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

      // 5b. Hapus semua susulan — record ini terikat ke submission yang barusan dihapus.
      // Kalau ditinggal, siswa masih punya "jatah susulan" untuk tugas semester lalu dan
      // isSusulanAktif bisa bikin tugas lama gak dihitung 0 di rata-rata semester baru.
      const susulanSnap = await get(ref(db, "susulan"));
      const susulanKeys = susulanSnap.exists() ? Object.keys(susulanSnap.val()) : [];
      const susulanResults = await Promise.allSettled(
        susulanKeys.map(key => remove(ref(db, `susulan/${key}`)))
      );
      const failedSusulan = susulanResults.filter(r => r.status === "rejected").length;
      if (failedSusulan > 0) {
        throw new Error(`${failedSusulan} dari ${susulanKeys.length} susulan gagal dihapus`);
      }

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
            <div>❌ Semua jatah susulan personal</div>
          </div>
        </div>

        <div style={{ background: "var(--good-bg)", border: "1px solid #86efac", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8 }}>
            <div>✅ Akun siswa <b>tetap ada</b></div>
            <div>✅ Tugas yang sudah dibuat <b>tetap ada</b></div>
            <div>✅ Bank Soal <b>tetap ada</b></div>
            <div>✅ Foto profil <b>tetap ada</b></div>
            <div>✅ Nilai Akhir & bonus nilai <b>tetap ada</b> (per periode)</div>
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

// ─── PRINT KARTU LOGIN SISWA ───
// Bikin HTML print-friendly dengan grid 3×4 kartu per halaman A4 portrait.
// Setiap kartu berisi: nama, ID (username), password, kelas, URL login.
// Batas potong (dashed) di setiap kartu supaya gampang digunting.
function printKartuLogin(siswaList, jenjang) {
  if (!siswaList || siswaList.length === 0) return;
  try {
    const now = new Date();
    const tglCetak = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    const cards = siswaList.map(s => `
    <div class="card">
      <div class="card-header">
        <div class="brand">
          <div class="brand-mark">A</div>
          <div class="brand-name">Astrolab</div>
        </div>
        <div class="kelas-badge">Kelas ${s.jenjang || jenjang}</div>
      </div>
      <div class="nama">${escapeHtml(s.nama || "-")}</div>
      <div class="credentials">
        <div class="cred-row">
          <div class="cred-label">Username</div>
          <div class="cred-value">${escapeHtml(s.id || "-")}</div>
        </div>
        <div class="cred-row">
          <div class="cred-label">Password</div>
          <div class="cred-value">${escapeHtml(s.password || "-")}</div>
        </div>
      </div>
      <div class="card-footer">astrolab-id.vercel.app</div>
    </div>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Kartu Login Siswa - Kelas ${jenjang}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Plus Jakarta Sans", -apple-system, "Segoe UI", sans-serif; background: #f5f5f5; padding: 10mm; color: #1a1a1a; }
  .header-info { max-width: 190mm; margin: 0 auto 8mm; padding-bottom: 6mm; border-bottom: 1px solid #ccc; }
  .header-info h1 { font-size: 16pt; margin-bottom: 2mm; color: #09637E; }
  .header-info .meta { font-size: 10pt; color: #666; display: flex; gap: 20px; }
  .grid { max-width: 190mm; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 60mm; gap: 4mm; }
  .card {
    border: 1.5px dashed #999;
    border-radius: 3mm;
    padding: 4mm 4mm 3mm;
    background: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-inside: avoid;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: "";
    position: absolute; top: 0; left: 0; right: 0;
    height: 3mm;
    background: linear-gradient(90deg, #09637E 0%, #088395 50%, #7AB2B2 100%);
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2mm;
    margin-bottom: 3mm;
  }
  .brand { display: flex; align-items: center; gap: 2mm; }
  .brand-mark {
    width: 6mm; height: 6mm;
    background: #09637E;
    color: white;
    border-radius: 1.5mm;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 10pt;
  }
  .brand-name { font-size: 9pt; font-weight: 700; color: #09637E; }
  .kelas-badge {
    font-size: 7.5pt;
    font-weight: 600;
    color: #666;
    background: #eef7f7;
    padding: 1mm 2.5mm;
    border-radius: 999px;
  }
  .nama {
    font-size: 12pt;
    font-weight: 700;
    line-height: 1.2;
    color: #1a1a1a;
    margin-bottom: 3mm;
    /* Truncate ke 2 baris kalau nama panjang */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .credentials {
    background: #f8fafb;
    border-radius: 2mm;
    padding: 2.5mm 3mm;
    margin-bottom: 2mm;
  }
  .cred-row { display: flex; justify-content: space-between; align-items: baseline; padding: 1mm 0; }
  .cred-row + .cred-row { border-top: 1px dashed #e0e0e0; }
  .cred-label { font-size: 7pt; color: #999; text-transform: uppercase; letter-spacing: 0.5pt; font-weight: 600; }
  .cred-value { font-family: "SFMono-Regular", Consolas, monospace; font-size: 10pt; font-weight: 700; color: #09637E; }
  .card-footer {
    font-size: 7pt;
    color: #999;
    text-align: center;
    padding-top: 1mm;
    border-top: 1px solid #eee;
  }
  .print-btn {
    position: fixed; top: 20px; right: 20px;
    padding: 10px 20px;
    background: #09637E;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  @media print {
    body { background: white; padding: 0; }
    .print-btn, .header-info { display: none; }
    .grid { max-width: none; }
  }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Cetak</button>
  <div class="header-info">
    <h1>Kartu Login Siswa · Kelas ${jenjang}</h1>
    <div class="meta">
      <span><b>${siswaList.length}</b> siswa</span>
      <span>Dicetak: ${tglCetak}</span>
      <span style="color:#999">Klik tombol Cetak untuk print</span>
    </div>
  </div>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Popup diblokir. Izinkan popup untuk cetak kartu."); return; }
  win.document.write(html);
  win.document.close();
  } catch (e) {
    console.error("Gagal generate kartu login:", e);
    alert("Gagal membuat kartu login: " + (e?.message || "terjadi kesalahan tak terduga") + "\n\nCoba lagi. Kalau masih gagal, screenshot pesan ini dan kabari developer.");
  }
}

// Helper: escape HTML untuk mencegah karakter khusus di nama merusak layout
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
          <button className="btn btn-outline btn-sm" onClick={() => printKartuLogin(store.getAllSiswa(jenjang).map(s => ({ ...s, password: s.password || "—" })), jenjang)} disabled={store.getAllSiswa(jenjang).length === 0} title="Cetak kartu login siswa untuk kelas aktif">
            <I n="download" s={13} /> Cetak Kartu
          </button>
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
      if (!window.ExcelJS) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
          s.onload = res; s.onerror = () => rej(new Error("Gagal memuat ExcelJS"));
          document.head.appendChild(s);
        });
      }
      const wbx = new window.ExcelJS.Workbook();
      await wbx.xlsx.load(await file.arrayBuffer());
      const ws = wbx.worksheets[0];
      if (!ws) throw new Error("File tidak memiliki sheet.");
      const data = [];
      ws.eachRow((row, rowNum) => {
        data.push(row.values.slice(1)); // row.values is 1-indexed, slice(1) to make 0-indexed
      });
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
const SNAV = [{ id: "home", l: "Beranda", ic: "home" }, { id: "leaderboard", l: "Ranking", ic: "trophy" }, { id: "tugas", l: "Tugas", ic: "book" }, { id: "latihan-mandiri", l: "Mandiri", ic: "layers" }, { id: "chat", l: "Pesan", ic: "chat" }, { id: "profil", l: "Profil", ic: "user" }];
const GNAV = [{ id: "home-guru", l: "Dashboard", ic: "layers" }, { id: "tugas-guru", l: "Tugas", ic: "book" }, { id: "bank-soal", l: "Bank Soal", ic: "chartBar" }, { id: "leaderboard", l: "Ranking", ic: "trophy" }, { id: "chat", l: "Pesan", ic: "chat" }, { id: "kelas", l: "Siswa", ic: "user" }, { id: "laporan-guru", l: "Laporan", ic: "flag" }, { id: "nilai-akhir", l: "Nilai Akhir", ic: "award" }];

function Sidebar({ user, route, navigate, onLogout, store }) {
  const nav = user.role === "guru" ? GNAV : SNAV;
  const unread = store.getUnreadCount(user.id);
  const photo = store.getPhoto(user.uid || user.id);
  return <aside className="sidebar">
    {nav.map(item => <button key={item.id} className={`side-link ${route === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}>
      <div style={{ position: "relative" }}>
        <I n={item.ic} s={16} />
        {item.id === "chat" && unread > 0 && <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 8, fontWeight: 700, display: "grid", placeItems: "center" }}>{unread > 9 ? "9+" : unread}</div>}
        {item.id === "laporan-guru" && user.role === "guru" && store.getUnreadReportCount() > 0 && <div style={{ position: "absolute", top: -4, right: -4, minWidth: 14, height: 14, padding: "0 3px", borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 8, fontWeight: 700, display: "grid", placeItems: "center" }}>{store.getUnreadReportCount() > 9 ? "9+" : store.getUnreadReportCount()}</div>}
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
          {item.id === "laporan-guru" && user.role === "guru" && store.getUnreadReportCount() > 0 && <div style={{ position: "absolute", top: -4, right: -4, minWidth: 14, height: 14, padding: "0 3px", borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 8, fontWeight: 700, display: "grid", placeItems: "center" }}>{store.getUnreadReportCount() > 9 ? "9+" : store.getUnreadReportCount()}</div>}
        </div>
        <span>{item.l}</span>
      </button>;
    })}
  </nav>;
}

// ─── APP ───
// ─── LAPORAN GURU (wali kelas view) ───
// Halaman list semua laporan siswa. Cuma guru yang bisa akses (Firebase Rules).
// Guru bisa lihat identitas pelapor, isi laporan, update status, kasih catatan.
// ─── NILAI AKHIR (Guru) ───
// Grid inline editing untuk komposit nilai akhir siswa: Sumatif per BAB (dinamis),
// Tugas Astrolab (auto-pull read-only, filtered strict by mapel), UTS, UAS,
// Kuis Harian (dinamis), Portofolio. Nilai Akhir dihitung otomatis (weighted average).
function NilaiAkhirPage({ store }) {
  const [mapel, setMapel] = useState("IPA");
  const [jenjang, setJenjang] = useState("VII");
  const [periode, setPeriode] = useState(store.getActivePeriode());
  const periodeOptions = getPeriodeOptions();
  const [addModal, setAddModal] = useState(null); // "sumatif" | "kuis" | null
  const [deleteTarget, setDeleteTarget] = useState(null); // { tipe, label } | null
  const [detailTarget, setDetailTarget] = useState(null); // siswa object | null
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // rows hasil parse, nunggu konfirmasi
  const [toast, setToast] = useState("");

  const siswaList = store.getAllSiswa(jenjang);
  const siswaIds = siswaList.map(s => s.id);

  const babKolom = store.getKolomDinamisList(siswaIds, mapel, jenjang, periode, "sumatif");
  const kuisKolom = store.getKolomDinamisList(siswaIds, mapel, jenjang, periode, "kuis");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  async function handleCellSave(siswaId, tipe, kolomKey, val) {
    try {
      await store.updateNilaiKolom(siswaId, mapel, jenjang, periode, tipe, kolomKey, val);
    } catch (e) {
      showToast("Gagal menyimpan nilai: " + (e?.message || "cek koneksi/izin akses"));
    }
  }
  async function handleManualSave(siswaId, field, val) {
    try {
      await store.updateNilaiManual(siswaId, mapel, jenjang, periode, field, val);
    } catch (e) {
      showToast("Gagal menyimpan nilai: " + (e?.message || "cek koneksi/izin akses"));
    }
  }
  async function handleAddKolom(tipe, label) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const existing = tipe === "sumatif" ? babKolom : kuisKolom;
    if (existing.includes(trimmed)) { showToast("Kolom dengan nama itu sudah ada."); return; }
    try {
      await store.addKolomDinamis(siswaIds, mapel, jenjang, periode, tipe, trimmed);
      setAddModal(null);
      showToast(`Kolom "${trimmed}" ditambahkan ke semua siswa.`);
    } catch (e) {
      showToast("Gagal menambah kolom: " + (e?.message || "cek koneksi/izin akses"));
    }
  }
  async function handleDeleteKolom() {
    if (!deleteTarget) return;
    try {
      await store.hapusKolomDinamis(siswaIds, mapel, jenjang, periode, deleteTarget.tipe, deleteTarget.label);
      setDeleteTarget(null);
      showToast(`Kolom "${deleteTarget.label}" dihapus.`);
    } catch (e) {
      showToast("Gagal menghapus kolom: " + (e?.message || "cek koneksi/izin akses"));
    }
  }

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      await downloadTemplateNilaiAkhir(store, mapel, jenjang, periode, siswaList, babKolom, kuisKolom);
    } catch (e) {
      showToast("Gagal membuat template: " + (e?.message || "coba lagi"));
    } finally {
      setDownloading(false);
    }
  }

  async function handleExportRekap() {
    setExporting(true);
    try {
      await exportRekapNilaiAkhir(store, mapel, jenjang, periode, siswaList, babKolom, kuisKolom);
    } catch (e) {
      showToast("Gagal export rekap: " + (e?.message || "coba lagi"));
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(file, resetInput) {
    if (!file) return;
    try {
      const rows = await parseNilaiAkhirExcel(file);
      // Cuma terima baris yang ID siswa-nya cocok dengan siswa di kelas ini (proteksi salah upload file kelas lain)
      const validRows = rows.filter(r => siswaIds.includes(r.siswaId));
      if (validRows.length === 0) {
        showToast("Tidak ada baris valid. Pastikan kolom 'ID Siswa' cocok dengan siswa kelas ini.");
        resetInput?.();
        return;
      }
      setImportPreview({ rows: validRows, skipped: rows.length - validRows.length });
    } catch (e) {
      showToast("Gagal membaca file: " + (e?.message || "format tidak dikenali"));
    }
    resetInput?.();
  }

  async function handleConfirmImport() {
    if (!importPreview) return;
    try {
      const count = await store.bulkImportNilaiAkhir(importPreview.rows, mapel, jenjang, periode);
      setImportPreview(null);
      showToast(`${count} siswa berhasil diimport.`);
    } catch (e) {
      showToast("Gagal import: " + (e?.message || "cek koneksi/izin akses"));
    }
  }

  return (
    <div className="page">
      <div className="dt">
        <div><h1>Nilai Akhir</h1><p>Komposit 6 komponen · Sumatif 10% · Tugas Astrolab 20% · UTS 20% · UAS 20% · Kuis 10% · Portofolio 20%</p><p style={{ marginTop: 4, fontSize: 11, color: "var(--accent-2)", fontWeight: 600 }}><I n="zap" s={11} /> Sumatif, UTS, UAS: <b>+100% poin</b> (reward effort ujian) · Kuis, Portofolio: +10% poin</p></div>
      </div>
      <div className="topbar">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Nilai Akhir</div>
        <div style={{ width: 36 }} />
      </div>

      {/* Filter mapel + kelas + periode */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <select className="inp" style={{ flex: "1 1 140px", maxWidth: 180 }} value={mapel} onChange={e => setMapel(e.target.value)}>
          <option value="IPA">IPA</option>
          <option value="Informatika">Informatika</option>
        </select>
        <select className="inp" style={{ flex: "1 1 100px", maxWidth: 140 }} value={jenjang} onChange={e => setJenjang(e.target.value)}>
          <option value="VII">Kelas VII</option>
          <option value="VIII">Kelas VIII</option>
        </select>
        <select className="inp" style={{ flex: "1 1 220px", maxWidth: 280 }} value={periode} onChange={e => setPeriode(e.target.value)}>
          {periodeOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {/* Publish gate toggle — siswa baru bisa lihat nilai setelah ini di-on-kan */}
        {(() => {
          const published = store.isNilaiPublished(mapel, jenjang, periode);
          return (
            <button
              className={`btn btn-sm ${published ? "btn-primary" : "btn-outline"}`}
              style={{ marginLeft: "auto", gap: 6 }}
              onClick={async () => {
                try {
                  if (published) await store.unpublishNilai(mapel, jenjang, periode);
                  else await store.publishNilai(mapel, jenjang, periode);
                } catch (e) { alert("Gagal: " + (e?.message || "error")); }
              }}
            >
              <I n={published ? "check" : "flag"} s={12} />
              {published ? "Diterbitkan ✓" : "Terbitkan ke Siswa"}
            </button>
          );
        })()}
      </div>

      {/* Toolbar tambah kolom */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <button className="btn btn-outline btn-sm" onClick={() => setAddModal("sumatif")}>
          <I n="plus" s={12} /> Tambah BAB (Sumatif)
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => setAddModal("kuis")}>
          <I n="plus" s={12} /> Tambah Kuis
        </button>
      </div>

      {/* Toolbar template & import */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button className="btn btn-soft btn-sm" onClick={handleDownloadTemplate} disabled={downloading}>
          <I n="download" s={12} /> {downloading ? "Menyiapkan..." : "Download Template"}
        </button>
        <label className="btn btn-soft btn-sm" style={{ cursor: "pointer", margin: 0 }}>
          <I n="upload" s={12} /> Import Excel
          <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => handleImportFile(e.target.files[0], () => { e.target.value = ""; })} />
        </label>
        <button className="btn btn-primary btn-sm" onClick={handleExportRekap} disabled={exporting} style={{ marginLeft: "auto" }}>
          <I n="chartBar" s={12} /> {exporting ? "Menyiapkan..." : "Export Rekap"}
        </button>
      </div>

      {siswaList.length === 0 ? (
        <Card><div className="empty">Belum ada siswa di kelas {jenjang}.</div></Card>
      ) : (
        <Card pad="none" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-alt)", borderBottom: "2px solid var(--line)" }}>
                  <th style={{ ...thStyle, position: "sticky", left: 0, background: "var(--surface-alt)", zIndex: 2, minWidth: 140, textAlign: "left" }}>Nama</th>
                  {babKolom.map(k => (
                    <th key={k} style={{ ...thStyle, minWidth: 90 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                        <span>{k}</span>
                        <button onClick={() => setDeleteTarget({ tipe: "sumatif", label: k })} title="Hapus kolom" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bad)", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 400, color: "var(--ink-3)" }}>Sumatif</div>
                    </th>
                  ))}
                  <th style={{ ...thStyle, minWidth: 80, background: "var(--accent-tint)" }}>Sumatif<br/>Avg</th>
                  <th style={{ ...thStyle, minWidth: 90, background: "var(--surface)" }}>Tugas<br/>Astrolab<div style={{ fontSize: 9, fontWeight: 400, color: "var(--ink-3)" }}>auto</div></th>
                  <th style={{ ...thStyle, minWidth: 80 }}>UTS</th>
                  <th style={{ ...thStyle, minWidth: 80 }}>UAS</th>
                  {kuisKolom.map(k => (
                    <th key={k} style={{ ...thStyle, minWidth: 90 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                        <span>{k}</span>
                        <button onClick={() => setDeleteTarget({ tipe: "kuis", label: k })} title="Hapus kolom" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bad)", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 400, color: "var(--ink-3)" }}>Kuis</div>
                    </th>
                  ))}
                  <th style={{ ...thStyle, minWidth: 80, background: "var(--accent-tint)" }}>Kuis<br/>Avg</th>
                  <th style={{ ...thStyle, minWidth: 80 }}>Portofolio</th>
                  <th style={{ ...thStyle, minWidth: 90, background: "var(--accent-2)", color: "#fff" }}>Nilai<br/>Akhir</th>
                </tr>
              </thead>
              <tbody>
                {siswaList.map(s => {
                  const result = store.computeNilaiAkhir(s.id, mapel, jenjang, periode);
                  const rec = result.rec;
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                      <td style={{ ...tdStyle, position: "sticky", left: 0, background: "var(--surface)", zIndex: 1, textAlign: "left", fontWeight: 600, cursor: "pointer", color: "var(--accent-2)" }} onClick={() => setDetailTarget(s)} title="Klik untuk lihat detail">{s.nama}</td>
                      {babKolom.map(k => (
                        <td key={k} style={tdStyle}>
                          <EditableCell value={rec.sumatif?.[k]} onSave={v => handleCellSave(s.id, "sumatif", k, v)} />
                        </td>
                      ))}
                      <td style={{ ...tdStyle, background: "var(--accent-tint)", fontWeight: 700, color: "var(--accent-2)" }}>{result.sumatifAvg !== null ? Math.round(result.sumatifAvg) : "—"}</td>
                      <td style={{ ...tdStyle, background: "var(--surface-alt)", color: "var(--ink-2)" }}>{result.tugasAvg !== null ? result.tugasAvg : "—"}</td>
                      <td style={tdStyle}><EditableCell value={rec.uts} onSave={v => handleManualSave(s.id, "uts", v)} /></td>
                      <td style={tdStyle}><EditableCell value={rec.uas} onSave={v => handleManualSave(s.id, "uas", v)} /></td>
                      {kuisKolom.map(k => (
                        <td key={k} style={tdStyle}>
                          <EditableCell value={rec.kuis?.[k]} onSave={v => handleCellSave(s.id, "kuis", k, v)} />
                        </td>
                      ))}
                      <td style={{ ...tdStyle, background: "var(--accent-tint)", fontWeight: 700, color: "var(--accent-2)" }}>{result.kuisAvg !== null ? Math.round(result.kuisAvg) : "—"}</td>
                      <td style={tdStyle}><EditableCell value={rec.portofolio} onSave={v => handleManualSave(s.id, "portofolio", v)} /></td>
                      <td style={{ ...tdStyle, background: "var(--accent-2)", color: "#fff", fontWeight: 800, fontFamily: "var(--mono)" }}>
                        {result.nilaiAkhir !== null ? result.nilaiAkhir : "—"}
                        {!result.lengkap && <div style={{ fontSize: 8, fontWeight: 400, opacity: 0.85 }}>belum lengkap</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.6 }}>
        💡 Klik sel untuk edit nilai. Nilai tersimpan otomatis saat kamu klik di luar sel (blur). Kolom "Tugas Astrolab" otomatis diambil dari rata-rata nilai tugas {mapel} siswa di Astrolab — tidak bisa diedit manual.
      </div>

      {addModal && <AddKolomModal tipe={addModal} onClose={() => setAddModal(null)} onSave={label => handleAddKolom(addModal, label)} />}
      {detailTarget && <DetailSiswaNilaiModal siswa={detailTarget} store={store} mapel={mapel} jenjang={jenjang} periode={periode} onClose={() => setDetailTarget(null)} onSaveManual={handleManualSave} onSaveKolom={handleCellSave} />}
      {importPreview && <ImportPreviewModal preview={importPreview} siswaList={siswaList} onClose={() => setImportPreview(null)} onConfirm={handleConfirmImport} />}
      {deleteTarget && <Confirm title="Hapus kolom?" desc={`Kolom "${deleteTarget.label}" akan dihapus dari SEMUA siswa. Nilai yang sudah diisi di kolom ini akan hilang permanen.`} onOk={handleDeleteKolom} onCancel={() => setDeleteTarget(null)} />}
      {toast && <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: "var(--shadow)" }}>{toast}</div>}
    </div>
  );
}

// Modal tambah kolom dinamis (BAB Sumatif / Kuis)
function AddKolomModal({ tipe, onClose, onSave }) {
  const [label, setLabel] = useState("");
  const isKuis = tipe === "kuis";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <h3>{isKuis ? "Tambah Kolom Kuis" : "Tambah Kolom Sumatif (BAB)"}</h3>
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14 }}>
          Kolom baru akan muncul untuk semua siswa di kelas & mapel ini. Nilai bisa diisi belakangan.
        </p>
        <label className="lbl">{isKuis ? "Label Kuis (misal: '5 Agustus' atau 'Kuis Bab 2')" : "Nama BAB (misal: 'BAB 1: Metode Ilmiah')"}</label>
        <input className="inp" autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder={isKuis ? "5 Agustus" : "BAB 1: Metode Ilmiah"} maxLength={40} onKeyDown={e => { if (e.key === "Enter") onSave(label); }} />
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" disabled={!label.trim()} onClick={() => onSave(label)}>Tambah</button>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL NILAI SISWA (modal) ───
// Klik nama siswa di grid → breakdown lengkap 6 komponen + semua nilai BAB/Kuis individual + Nilai Akhir.
// Semua sel tetap editable di sini juga (reuse EditableCell + handler yang sama dari grid).
function DetailSiswaNilaiModal({ siswa, store, mapel, jenjang, periode, onClose, onSaveManual, onSaveKolom }) {
  const result = store.computeNilaiAkhir(siswa.id, mapel, jenjang, periode);
  const rec = result.rec;
  const babEntries = Object.entries(rec.sumatif || {});
  const kuisEntries = Object.entries(rec.kuis || {});
  const boosts = store.getBoosts(siswa.id, mapel, jenjang, periode);
  const [boostModal, setBoostModal] = useState(null); // { mode: "add"|"edit", boost?: ... }
  const [toast, setToast] = useState("");
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const komponenLabels = { sumatif: "Sumatif per BAB", tugasAstrolab: "Tugas Astrolab", uts: "UTS", uas: "UAS", kuis: "Kuis Harian", portofolio: "Portofolio" };

  async function handleDeleteBoost(boostId) {
    if (!confirm("Hapus bonus nilai ini? Nilai akhir akan diperbarui otomatis.")) return;
    try {
      await store.removeBoost(siswa.id, mapel, jenjang, periode, boostId);
      showToast("Bonus dihapus.");
    } catch (e) { showToast("Gagal hapus: " + (e?.message || "error")); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <h3 style={{ margin: 0 }}>{siswa.nama}</h3>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{mapel} · Kelas {jenjang} · {periode}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--ink-3)", padding: 0, lineHeight: 1 }}>×</button>
        </div>

        {/* Nilai Akhir besar */}
        <div style={{ textAlign: "center", padding: "16px 0", background: "var(--accent-2)", borderRadius: 10, color: "#fff", margin: "10px 0 16px" }}>
          <div style={{ fontSize: 11, opacity: .85, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>Nilai Akhir</div>
          <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "var(--mono)", lineHeight: 1.1 }}>{result.nilaiAkhir !== null ? result.nilaiAkhir : "—"}</div>
          {!result.lengkap && <div style={{ fontSize: 11, opacity: .85, marginTop: 4 }}>⚠ Ada komponen yang belum diisi</div>}
          {boosts.length > 0 && <div style={{ fontSize: 11, opacity: .85, marginTop: 4 }}>✨ {boosts.length} bonus nilai aktif</div>}
        </div>

        <div style={{ overflowY: "auto", flex: 1, marginRight: -4, paddingRight: 4 }}>
          {/* Breakdown 6 komponen — tampilin base + boost kalau ada */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Breakdown Komponen</div>
            {result.komponen.map((k, i) => {
              const hasBoost = k.boost > 0 && typeof k.base === "number";
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 13 }}>
                  <div>{k.label} <span style={{ color: "var(--ink-3)", fontSize: 11 }}>({Math.round(k.bobot * 100)}%)</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {hasBoost && (
                      <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
                        {Math.round(k.base * 100) / 100} + <span style={{ color: "var(--accent-2)", fontWeight: 700 }}>{k.boost}</span> =
                      </span>
                    )}
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: typeof k.val === "number" ? (hasBoost ? "var(--accent-2)" : "var(--ink-1)") : "var(--ink-3)" }}>
                      {typeof k.val === "number" ? Math.round(k.val * 100) / 100 : "belum diisi"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ SECTION BONUS NILAI ═══ */}
          <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--accent-tint)", borderRadius: 10, border: "1px solid var(--accent)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-2)", display: "flex", alignItems: "center", gap: 6 }}>
                  <I n="star" s={13} /> Bonus Nilai ({boosts.length})
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 }}>
                  Intervensi manual: tambah nilai ke komponen tertentu (cap total: 100).
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setBoostModal({ mode: "add" })}>
                <I n="plus" s={12} /> Tambah
              </button>
            </div>

            {boosts.length === 0 ? (
              <div style={{ padding: "10px 0", textAlign: "center", fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>
                Belum ada bonus nilai untuk siswa ini.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {boosts.map(b => {
                  const tugasSrc = b.tugasRefId ? store.getTugas().find(t => t.id === b.tugasRefId) : null;
                  return (
                    <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--line-soft)" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 6, background: "var(--accent-tint)", color: "var(--accent-2)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                        +{b.nilai}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-1)" }}>{komponenLabels[b.komponen] || b.komponen}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.alasan}</div>
                        {tugasSrc && <div style={{ fontSize: 9.5, color: "var(--accent-2)", marginTop: 1, fontWeight: 600 }}>↳ dari: {tugasSrc.judul}</div>}
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "3px 6px", fontSize: 10 }} onClick={() => setBoostModal({ mode: "edit", boost: b })} title="Edit">
                        <I n="edit" s={11} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "3px 6px", color: "var(--bad)", fontSize: 10 }} onClick={() => handleDeleteBoost(b.id)} title="Hapus">
                        <I n="trash" s={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Sumatif per BAB */}
          {babEntries.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Sumatif per BAB</div>
              {babEntries.map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <div style={{ fontSize: 12, flex: 1, marginRight: 8 }}>{label}</div>
                  <EditableCell value={val} onSave={v => onSaveKolom(siswa.id, "sumatif", label, v)} />
                </div>
              ))}
            </div>
          )}

          {/* Detail Kuis */}
          {kuisEntries.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Kuis Harian</div>
              {kuisEntries.map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <div style={{ fontSize: 12, flex: 1, marginRight: 8 }}>{label}</div>
                  <EditableCell value={val} onSave={v => onSaveKolom(siswa.id, "kuis", label, v)} />
                </div>
              ))}
            </div>
          )}

          {/* UTS / UAS / Portofolio */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Nilai Manual</div>
            {[
              { label: "UTS", field: "uts", val: rec.uts },
              { label: "UAS", field: "uas", val: rec.uas },
              { label: "Portofolio", field: "portofolio", val: rec.portofolio },
            ].map(item => (
              <div key={item.field} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line-soft)" }}>
                <div style={{ fontSize: 12 }}>{item.label}</div>
                <EditableCell value={item.val} onSave={v => onSaveManual(siswa.id, item.field, v)} />
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>
            💡 Tugas Astrolab: <b>{result.tugasAvg !== null ? result.tugasAvg : "—"}</b> — otomatis dari rata-rata nilai tugas {mapel} siswa di Astrolab, tidak bisa diedit manual.
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={onClose}>Tutup</button>
        </div>

        {toast && <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 999 }}>{toast}</div>}
      </div>

      {boostModal && (
        <BoostModal
          mode={boostModal.mode}
          boost={boostModal.boost}
          siswa={siswa}
          mapel={mapel}
          jenjang={jenjang}
          periode={periode}
          store={store}
          onClose={() => setBoostModal(null)}
          onSuccess={(msg) => { setBoostModal(null); showToast(msg); }}
        />
      )}
    </div>
  );
}

// Modal input/edit bonus nilai
function BoostModal({ mode, boost, siswa, mapel, jenjang, periode, store, onClose, onSuccess }) {
  const [komponen, setKomponen] = useState(boost?.komponen || "");
  const [nilai, setNilai] = useState(boost?.nilai || "");
  const [alasan, setAlasan] = useState(boost?.alasan || "");
  const [tugasRefId, setTugasRefId] = useState(boost?.tugasRefId || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Ambil daftar tugas personal untuk siswa ini di mapel+jenjang tsb (bisa jadi source)
  const tugasSources = store.getTugas().filter(t =>
    t.mapel === mapel &&
    t.jenjang === jenjang &&
    Array.isArray(t.assignedTo) &&
    t.assignedTo.includes(siswa.id)
  );

  const komponenOpts = [
    { value: "sumatif", label: "Sumatif per BAB" },
    { value: "tugasAstrolab", label: "Tugas Astrolab" },
    { value: "uts", label: "UTS" },
    { value: "uas", label: "UAS" },
    { value: "kuis", label: "Kuis Harian" },
    { value: "portofolio", label: "Portofolio" },
  ];

  async function handleSave() {
    setErr("");
    const nilaiNum = Number(nilai);
    if (!komponen) { setErr("Pilih komponen dulu."); return; }
    if (!nilaiNum || nilaiNum <= 0 || nilaiNum > 100) { setErr("Nilai bonus harus 1-100."); return; }
    if (!alasan || alasan.trim().length < 5) { setErr("Alasan wajib diisi (minimal 5 karakter)."); return; }
    setSaving(true);
    try {
      if (mode === "add") {
        await store.addBoost(siswa.id, mapel, jenjang, periode, komponen, nilaiNum, alasan.trim(), tugasRefId || null);
        onSuccess(`Bonus +${nilaiNum} ditambahkan ke ${komponenOpts.find(k => k.value === komponen)?.label || komponen}.`);
      } else {
        await store.updateBoost(siswa.id, mapel, jenjang, periode, boost.id, {
          komponen, nilai: nilaiNum, alasan: alasan.trim(), tugasRefId: tugasRefId || null,
        });
        onSuccess(`Bonus diperbarui.`);
      }
    } catch (e) { setErr(e?.message || "Gagal simpan."); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }} style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>{mode === "add" ? "Tambah Bonus Nilai" : "Edit Bonus Nilai"}</h3>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{siswa.nama} · {mapel}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--ink-3)", padding: 0, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="fg">
            <label className="lbl">Komponen yang dinaikkan</label>
            <select className="inp" value={komponen} onChange={e => setKomponen(e.target.value)}>
              <option value="">— Pilih komponen —</option>
              {komponenOpts.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>

          <div className="fg">
            <label className="lbl">Jumlah bonus (1-100)</label>
            <input className="inp" type="number" min={1} max={100} value={nilai} onChange={e => setNilai(e.target.value)} placeholder="Misal: 5" />
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
              Total (base + bonus) akan di-cap maksimal 100.
            </div>
          </div>

          <div className="fg">
            <label className="lbl">Alasan (wajib, min 5 karakter)</label>
            <textarea className="inp" value={alasan} onChange={e => setAlasan(e.target.value)} rows={2} placeholder="Misal: Menyelesaikan Latihan Khusus BAB 2 dengan baik." />
          </div>

          {tugasSources.length > 0 && (
            <div className="fg">
              <label className="lbl">Kaitkan dengan tugas (opsional)</label>
              <select className="inp" value={tugasRefId} onChange={e => setTugasRefId(e.target.value)}>
                <option value="">— Tidak terkait tugas spesifik —</option>
                {tugasSources.map(t => <option key={t.id} value={t.id}>{t.judul}</option>)}
              </select>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                Hanya tugas Latihan Khusus yang bisa dipilih di sini.
              </div>
            </div>
          )}

          {err && <div style={{ color: "var(--bad)", fontSize: 12, padding: "8px 12px", background: "var(--bad-bg)", borderRadius: 6, border: "1px solid #fca5a5" }}>{err}</div>}
        </div>

        <div className="modal-actions" style={{ marginTop: 16, gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : (mode === "add" ? "Tambah Bonus" : "Simpan Perubahan")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal konfirmasi sebelum commit hasil import Excel ke database
function ImportPreviewModal({ preview, siswaList, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false);
  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm();
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <h3>Konfirmasi Import</h3>
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14 }}>
          <b>{preview.rows.length} siswa</b> siap diimport. Nilai yang sudah ada akan ditimpa dengan nilai baru dari file, kolom yang tidak ada di file tidak akan berubah.
        </p>
        {preview.skipped > 0 && (
          <div style={{ padding: "8px 12px", background: "#fef3c7", borderRadius: 6, fontSize: 12, color: "#92400e", marginBottom: 14 }}>
            ⚠ {preview.skipped} baris dilewati karena ID Siswa tidak cocok dengan kelas ini.
          </div>
        )}
        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px" }}>
          {preview.rows.slice(0, 10).map(r => {
            const s = siswaList.find(x => x.id === r.siswaId);
            return <div key={r.siswaId} style={{ fontSize: 12, padding: "3px 0", color: "var(--ink-2)" }}>{s?.nama || r.siswaId}</div>;
          })}
          {preview.rows.length > 10 && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>...dan {preview.rows.length - 10} siswa lainnya</div>}
        </div>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleConfirm} disabled={saving}>{saving ? "Mengimport..." : `Import ${preview.rows.length} Siswa`}</button>
        </div>
      </div>
    </div>
  );
}

const thStyle = { padding: "8px 6px", fontSize: 10, fontWeight: 700, color: "var(--ink-2)", textAlign: "center", whiteSpace: "nowrap" };
const tdStyle = { padding: "6px", textAlign: "center", fontFamily: "var(--mono)" };

// Sel editable — local state sync dari prop, save on blur kalau berubah
function EditableCell({ value, onSave }) {
  const [local, setLocal] = useState(value ?? "");
  const [focused, setFocused] = useState(false);

  useEffect(() => { if (!focused) setLocal(value ?? ""); }, [value, focused]);

  function handleBlur() {
    setFocused(false);
    const numVal = local === "" ? null : Number(local);
    if (numVal !== (value ?? null)) onSave(local === "" ? "" : numVal);
  }

  return (
    <input
      type="number"
      min={0}
      max={100}
      value={local}
      onFocus={() => setFocused(true)}
      onChange={e => setLocal(e.target.value)}
      onBlur={handleBlur}
      placeholder="—"
      style={{
        width: 52, padding: "4px 2px", textAlign: "center", border: "1px solid transparent",
        borderRadius: 4, fontFamily: "var(--mono)", fontSize: 12, background: "transparent",
        outline: "none",
      }}
      onMouseEnter={e => e.target.style.border = "1px solid var(--line)"}
      onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.border = "1px solid transparent"; }}
    />
  );
}

function LaporanGuru({ store }) {

  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterKategori, setFilterKategori] = useState("semua");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDelete, setShowDelete] = useState(null);

  const KATEGORI_LABEL = {
    konflik: "Konflik dengan teman",
    bullying: "Bullying / perundungan",
    sarpras: "Sarana/prasarana rusak",
    akademik: "Kesulitan akademik",
    kesehatan: "Kesehatan/kondisi diri",
    lainnya: "Lainnya",
  };
  const STATUS_LABEL = {
    baru: { label: "Baru", color: "var(--accent-2)", bg: "var(--accent-tint)", border: "var(--accent)" },
    diproses: { label: "Diproses", color: "var(--ink-2)", bg: "var(--surface-alt)", border: "var(--ink-3)" },
    selesai: { label: "Selesai", color: "var(--ink-3)", bg: "var(--surface-alt)", border: "var(--line)" },
  };

  const allReports = store.getReports();
  const filtered = allReports.filter(r => {
    if (filterStatus !== "semua" && r.status !== filterStatus) return false;
    if (filterKategori !== "semua" && r.kategori !== filterKategori) return false;
    return true;
  });

  const counts = {
    baru: allReports.filter(r => r.status === "baru").length,
    diproses: allReports.filter(r => r.status === "diproses").length,
    selesai: allReports.filter(r => r.status === "selesai").length,
  };

  function fmtWaktu(ts) {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return "baru saja";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}j lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" });
  }

  return (
    <div className="page">
      <div className="dt">
        <div><h1>Laporan Siswa</h1><p>Laporan kejadian dari siswa · rahasia, hanya wali kelas yang lihat</p></div>
      </div>
      <div className="topbar">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Laporan</div>
        <div style={{ width: 36 }} />
      </div>

      {/* Ringkasan status — neutral + accent teal untuk 'Baru' (butuh perhatian) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--accent-tint)", border: "1px solid var(--accent-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ color: "var(--accent-2)" }}><I n="flag" s={14} /></div>
            <div style={{ fontSize: 11, color: "var(--accent-2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Baru</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-2)", fontFamily: "var(--mono)", lineHeight: 1 }}>{counts.baru}</div>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--surface-alt)", border: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ color: "var(--ink-2)" }}><I n="clock" s={14} /></div>
            <div style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Diproses</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink-1)", fontFamily: "var(--mono)", lineHeight: 1 }}>{counts.diproses}</div>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--surface-alt)", border: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ color: "var(--ink-3)" }}><I n="checkCircle" s={14} /></div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Selesai</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink-2)", fontFamily: "var(--mono)", lineHeight: 1 }}>{counts.selesai}</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select className="inp" style={{ flex: "1 1 140px", maxWidth: 200 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="semua">Semua Status</option>
          <option value="baru">Baru</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
        </select>
        <select className="inp" style={{ flex: "1 1 140px", maxWidth: 200 }} value={filterKategori} onChange={e => setFilterKategori(e.target.value)}>
          <option value="semua">Semua Kategori</option>
          {Object.entries(KATEGORI_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><div className="empty">Belum ada laporan{filterStatus !== "semua" || filterKategori !== "semua" ? " yang cocok dengan filter" : ""}.</div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(r => {
            const status = STATUS_LABEL[r.status] || STATUS_LABEL.baru;
            const kategoriTxt = r.kategori === "lainnya" && r.kategoriLain ? r.kategoriLain : (KATEGORI_LABEL[r.kategori] || r.kategori);
            return (
              <Card key={r.id} pad="md" style={{ cursor: "pointer", borderLeft: `4px solid ${status.border}` }} onClick={() => setSelectedReport(r)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span className="chip" style={{ fontSize: 10, background: status.bg, color: status.color, fontWeight: 700 }}>{status.label}</span>
                      <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>{kategoriTxt}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-1)", lineHeight: 1.5, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.deskripsi}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      <b style={{ color: "var(--ink-2)" }}>{r.pelaporNama}</b> · {r.jenjang} · {fmtWaktu(r.createdAt)}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedReport && <LaporanDetailModal report={selectedReport} store={store} kategoriLabel={KATEGORI_LABEL} onClose={() => setSelectedReport(null)} onDelete={() => { setShowDelete(selectedReport); setSelectedReport(null); }} />}
      {showDelete && <Confirm title="Hapus laporan?" desc="Laporan akan dihapus permanen dan tidak bisa dikembalikan." onOk={async () => { await store.deleteReport(showDelete.id); setShowDelete(null); }} onCancel={() => setShowDelete(null)} />}
    </div>
  );
}

// Modal detail laporan — guru bisa update status + tambah catatan internal
function LaporanDetailModal({ report, store, kategoriLabel, onClose, onDelete }) {
  const [status, setStatus] = useState(report.status);
  const [catatan, setCatatan] = useState(report.catatanGuru || "");
  const [saving, setSaving] = useState(false);

  const isChanged = status !== report.status || catatan !== (report.catatanGuru || "");

  async function handleSave() {
    setSaving(true);
    try {
      await store.updateReportStatus(report.id, status, catatan);
      onClose();
    } catch (e) {
      alert("Gagal menyimpan: " + (e?.message || "coba lagi"));
      setSaving(false);
    }
  }

  const kategoriTxt = report.kategori === "lainnya" && report.kategoriLain ? report.kategoriLain : (kategoriLabel[report.kategori] || report.kategori);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Detail Laporan</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--ink-3)", padding: 0, lineHeight: 1 }}>×</button>
        </div>

        {/* Meta pelapor */}
        <div style={{ padding: "10px 12px", background: "var(--surface-alt)", borderRadius: 6, marginBottom: 14, fontSize: 12, lineHeight: 1.7 }}>
          <div><span style={{ color: "var(--ink-3)" }}>Pelapor:</span> <b>{report.pelaporNama}</b> <span style={{ color: "var(--ink-3)" }}>({report.pelaporId})</span></div>
          <div><span style={{ color: "var(--ink-3)" }}>Kelas:</span> {report.jenjang}</div>
          <div><span style={{ color: "var(--ink-3)" }}>Kategori:</span> <b>{kategoriTxt}</b></div>
          <div><span style={{ color: "var(--ink-3)" }}>Dilaporkan:</span> {new Date(report.createdAt).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        </div>

        {/* Isi laporan */}
        <label className="lbl">Isi Laporan</label>
        <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 14, maxHeight: 200, overflowY: "auto" }}>
          {report.deskripsi}
        </div>

        {/* Status */}
        <label className="lbl">Status Penanganan</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[
            { v: "baru", l: "Baru", color: "var(--accent)" },
            { v: "diproses", l: "Diproses", color: "var(--ink-2)" },
            { v: "selesai", l: "Selesai", color: "var(--ink-3)" },
          ].map(s => (
            <button key={s.v} onClick={() => setStatus(s.v)} style={{
              flex: 1, padding: "8px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1.5px solid ${status === s.v ? s.color : "var(--line)"}`,
              background: status === s.v ? s.color : "var(--surface)",
              color: status === s.v ? "#fff" : "var(--ink-2)",
            }}>{s.l}</button>
          ))}
        </div>

        {/* Catatan guru */}
        <label className="lbl">Catatan Internal (opsional)</label>
        <textarea className="inp" rows={3} placeholder="Catatan tindak lanjut, hasil pembicaraan dengan siswa, dll..." value={catatan} onChange={e => setCatatan(e.target.value)} style={{ resize: "vertical" }} maxLength={500} />
        <div style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "right", marginTop: 2, marginBottom: 14 }}>{catatan.length}/500 · Catatan hanya terlihat oleh guru</div>

        <div className="modal-actions" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-ghost btn-sm" onClick={onDelete} disabled={saving} style={{ color: "var(--bad)" }}>
            <I n="trash" s={12} /> Hapus
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Tutup</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!isChanged || saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PUSH NOTIFICATIONS HOOK ───
function usePushNotifications(user) {
  const subscriptionRef = useRef(null);
  const [pushPermission, setPushPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  // Check if browser supports push
  const pushSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  // Register SW and subscribe if already granted
  useEffect(() => {
    if (!user?.id || !pushSupported) return;
    let cancelled = false;

    async function setupPush() {
      // Register service worker
      let reg;
      try {
        reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
      } catch (e) {
        console.warn("[Push] SW registration failed:", e.message);
        return;
      }
      if (cancelled) return;

      const perm = Notification.permission;
      setPushPermission(perm);

      // If already granted, subscribe silently
      if (perm === "granted") {
        try {
          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
          }
          if (cancelled) return;
          subscriptionRef.current = sub;
          await callPush("subscribe", { accountId: user.id, subscription: sub.toJSON() });
        } catch (e) {
          console.warn("[Push] Subscribe failed:", e.message);
        }
        // Clear badge when app is opened
        if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
        return;
      }

      // If "default" (not yet decided), show our custom prompt
      if (perm === "default") {
        setShowPushPrompt(true);
      }
    }

    // Clear badge whenever app becomes visible
    const onVisible = () => { if (!document.hidden && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); };
    document.addEventListener("visibilitychange", onVisible);

    setupPush();
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisible); };
  }, [user?.id]);

  // Called when user clicks "Izinkan" in our custom popup
  const requestPushPermission = async () => {
    if (!pushSupported) return;
    const perm = await Notification.requestPermission();
    setPushPermission(perm);
    setShowPushPrompt(false);
    if (perm === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }
        subscriptionRef.current = sub;
        await callPush("subscribe", { accountId: user?.id, subscription: sub.toJSON() });
      } catch (e) {
        console.warn("[Push] Subscribe after grant failed:", e.message);
      }
    }
  };

  const dismissPushPrompt = () => setShowPushPrompt(false);

  // Unsubscribe: call on logout to remove this device's subscription
  const unsubscribePush = async () => {
    const sub = subscriptionRef.current;
    if (!sub) return;
    try {
      await sub.unsubscribe();
      subscriptionRef.current = null;
    } catch (e) {
      console.warn("[Push] Unsubscribe failed:", e.message);
    }
  };

  return { unsubscribePush, pushPermission, showPushPrompt, requestPushPermission, dismissPushPrompt };
}

// ─── NOTIFICATIONS HOOK ───
function useNotifications(user, store, route) {
  const [notifs, setNotifs] = useState([]);
  // Anti-spam: simpan timestamp first load, hanya notify event setelah ini
  const [bootTime] = useState(() => Date.now());
  // Track event yang sudah ditampilkan agar tidak duplikat
  const [seenIds] = useState(() => new Set());

  // Refs supaya onValue callback selalu baca nilai terbaru (fix stale closure)
  const storeRef = useRef(store);
  const routeRef = useRef(route);
  useEffect(() => { storeRef.current = store; });
  useEffect(() => { routeRef.current = route; });

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
        // Skip notif kalau lagi di halaman tugas — JANGAN tandai seen, biar muncul begitu pindah
        const r = routeRef.current;
        if (r === "tugas" || r === "tugas-detail" || r === "kerjakan") return;
        seenIds.add(eventKey);
        pushNotif({ type: "tugas", title: "Tugas baru!", message: `${t.judul} · ${t.mapel}` });
      });
    });
    return () => unsub();
  }, [user?.uid, user?.role]);

  // Listen submission baru (untuk guru) — skip hanya kalau lagi analisis detail tugas
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
        // Hanya suppress di halaman analisis detail tugas (bukan home dashboard)
        if (routeRef.current === "analisis-tugas") return;
        seenIds.add(eventKey);
        // Pakai storeRef untuk data terbaru, dengan fallback kalau belum load
        const st = storeRef.current;
        const siswa = st.getAllSiswa().find(x => x.id === s.siswaId);
        const tugas = st.getTugas().find(x => x.id === s.tugasId);
        const siswaName = siswa?.nama || s.siswaId;
        const tugasName = tugas?.judul || "Tugas";
        const nilaiStr = s.nilai != null ? ` · ${s.nilai}/100` : "";
        pushNotif({ type: "submission", title: "Submission baru", message: `${siswaName} kumpul ${tugasName}${nilaiStr}` });
      });
    });
    return () => unsub();
  }, [user?.uid, user?.role]);

  // Listen pesan baru — skip kalau lagi di halaman chat
  useEffect(() => {
    if (!user || !user.id) return;
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
          if (routeRef.current === "chat") return;
          seenIds.add(eventKey);
          const st = storeRef.current;
          const siswaList = st.getAllSiswa();
          const guru = st.fbGuru;
          const sender = siswaList.find(x => x.id === msg.fromId) || (guru?.id === msg.fromId ? guru : null);
          const senderName = sender?.namaDisplay || sender?.nama || msg.fromId;
          const text = msg.text || "";
          pushNotif({ type: "pesan", title: `Pesan dari ${senderName}`, message: text.length > 60 ? text.slice(0, 60) + "..." : text });
        });
      });
    });
    return () => unsub();
  }, [user?.uid, user?.id]);

  // Listen badge baru (untuk siswa)
  useEffect(() => {
    if (!user || user.role !== "siswa" || !user.id) return;
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
        pushNotif({ type: "badge", title: "Badge baru!", message: `${b.name}` });
      });
    });
    return () => unsub();
  }, [user?.uid, user?.role, user?.id]);

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
    console.error("[ErrorBoundary]", error, info);
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
  const { unsubscribePush, showPushPrompt, requestPushPermission, dismissPushPrompt } = usePushNotifications(user);
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
    // Unsubscribe push notifications for this device
    await unsubscribePush();
    // Bersihkan cache localStorage, KECUALI autosave kuis (astrolab.quiz.*).
    // Autosave itu satu-satunya salinan jawaban siswa yang belum dikumpulkan — kalau ikut dihapus,
    // siswa yang logout di tengah pengerjaan (atau login ulang karena sesi bermasalah) kehilangan
    // seluruh progresnya. Data ini sudah di-scope per siswa+tugas, jadi aman ditinggal.
    try {
      const keys = Object.keys(localStorage)
        .filter(k => k.startsWith("astrolab.") && !k.startsWith("astrolab.quiz."));
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
  if (store.loading || authLoading) return <><div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#1a8a9b 0%,var(--accent) 40%,var(--accent-2) 70%,#062a35 100%)", gap: 14 }}><LogoBold size={72} onDark /><div style={{ color: "#fff", fontSize: 20, fontWeight: 900, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "-.02em" }}>Astrolab</div><div style={{ color: "rgba(255,255,255,.55)", fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: ".04em" }}>Our Classroom</div></div></>;
  const hideNav = route === "kerjakan";
  let screen = null;
  if (user) {
    const isGuru = user.role === "guru";
    if (isGuru) {
      if (route === "home-guru") screen = <DashboardGuru store={store} navigate={navigate} />;
      else if (route === "tugas-guru") screen = <TugasGuru store={store} navigate={navigate} />;
      else if (route === "buat-tugas") screen = <BuatTugas store={store} navigate={navigate} presetAssignedTo={params.presetAssignedTo} presetJenjang={params.presetJenjang} />;
      else if (route === "edit-tugas") screen = <BuatTugas store={store} navigate={navigate} editId={params.tugasId} />;
      else if (route === "leaderboard") screen = <LeaderboardScreen user={user} store={store} />;
      else if (route === "chat") screen = <ChatScreen user={user} store={store} params={params} navigate={navigate} />;
      else if (route === "kelas") screen = <KelasView store={store} navigate={navigate} />;
      else if (route === "analisis-tugas") screen = <AnalisisTugasDetail store={store} tugasId={params.tugasId} navigate={navigate} onBack={() => { setRoute("home-guru"); setTimeout(() => { document.querySelector(".analisis-section")?.scrollIntoView({ behavior: "smooth" }); }, 100); }} />;
      else if (route === "badge-manager") screen = <BadgeManager store={store} />;
      else if (route === "bank-soal") screen = <BankSoal store={store} navigate={navigate} />;
      else if (route === "manajemen-siswa") screen = <ManajemenSiswa store={store} />;
      else if (route === "laporan-guru") screen = <LaporanGuru store={store} />;
      else if (route === "nilai-akhir") screen = <NilaiAkhirPage store={store} />;
      else if (route === "profil-guru") screen = <ProfilGuru user={user} store={store} navigate={navigate} />;
      else if (route === "materi-manager") screen = <MateriManager store={store} navigate={navigate} />;
      else screen = <DashboardGuru store={store} navigate={navigate} />;
    } else {
      if (route === "home") screen = <DashboardSiswa user={user} store={store} navigate={navigate} />;
      else if (route === "leaderboard") screen = <LeaderboardScreen user={user} store={store} />;
      else if (route === "tugas") screen = <DaftarTugas user={user} store={store} navigate={navigate} />;
      else if (route === "tugas-detail") screen = <DetailTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "review-tugas") screen = <ReviewTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "kerjakan") screen = <KerjakanTugas user={user} store={store} tugasId={params.tugasId} navigate={navigate} />;
      else if (route === "profil") screen = <ProfilSiswa user={user} store={store} navigate={navigate} />;
      else if (route === "rapor") screen = <RaporSiswa user={user} store={store} navigate={navigate} />;
      else if (route === "latihan-mandiri") screen = <LatihanMandiri user={user} store={store} navigate={navigate} />;
      else if (route === "chat") screen = <ChatScreen user={user} store={store} params={params} navigate={navigate} />;
      else screen = <DashboardSiswa user={user} store={store} navigate={navigate} />;
    }
  }
  return <>
    {!user ? <LoginScreen onLogin={handleLogin} /> :
      <div className="shell">
        <header className="hdr">
          <div className="hdr-brand">
            <div className="hdr-mark"><LogoBold size={24} onDark /></div>
            <div className="hdr-name"><b>Astrolab</b><small style={{ fontSize: 10, opacity: .65 }}>Our Classroom</small></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="hdr-role" style={{ fontSize: 12, opacity: .85 }}>{user.role === "guru" ? "Guru" : `Kelas ${user.jenjang}`}</span>
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
    {/* Push notification permission prompt — shows every login until allowed */}
    {showPushPrompt && (
      <div className="modal-overlay" onClick={dismissPushPrompt} style={{ zIndex: 9999 }}>
        <div className="modal" style={{ maxWidth: 360, textAlign: "center" }} onClick={e => e.stopPropagation()}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #0d6b7a 0%, #0a8a7a 100%)", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 28 }}>
            🔔
          </div>
          <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>Aktifkan Notifikasi</h3>
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 20 }}>
            Dapatkan pengingat deadline tugas, pesan dari {user?.role === "guru" ? "siswa" : "guru"}, dan info penting lainnya langsung di HP kamu.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={requestPushPermission} style={{
              width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #0d6b7a 0%, #0a8a7a 100%)",
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer"
            }}>Izinkan Notifikasi</button>
            <button onClick={dismissPushPrompt} style={{
              width: "100%", padding: "10px 0", borderRadius: 12, border: "none",
              background: "transparent", color: "var(--ink-3)", fontSize: 13, cursor: "pointer"
            }}>Nanti saja</button>
          </div>
        </div>
      </div>
    )}
  </>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

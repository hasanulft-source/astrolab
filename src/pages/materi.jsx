// Astrolab — Materi & Latihan Mandiri
// Extracted from App.jsx (Wave 5)

import { useState, useEffect, useRef } from "react";
import { I } from '../components/icons';
import { shuffle } from '../utils/helpers';
import { ConfettiRain } from '../components/visual';

// Key STABIL untuk progress latihan: hash teks pertanyaan.
// Soal dari tugas lama sering TIDAK punya `id` (codebase pakai origIdx sebagai fallback),
// jadi tracking by id gagal diam-diam. Hash teks selalu ada untuk soal sistem & upload.
function latihanSoalKey(pertanyaan) {
  const str = (pertanyaan || "").trim().toLowerCase().replace(/\s+/g, " ");
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return "q" + h.toString(36);
}

// Dedup soal latihan by teks pertanyaan (soal sama bisa datang dari tugas & upload guru).
function dedupSoal(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const k = (s.pertanyaan || "").trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(s);
  }
  return out;
}

// Kolam soal Latihan Mandiri untuk 1 jenjang, SAMA PERSIS yang dilihat siswa:
// gabungan soal SISTEM (PG dari tugas yang sudah lewat deadline) + soal UPLOAD guru (/latihanSoal),
// dikelompokkan { mapel: { bab: soal[] } } dan sudah dedup. Tiap soal ditandai _sumber.
function collectLatihanPool(store, jenjang) {
  const map = {}; // "mapel||bab" -> soal[]
  const now = Date.now();
  store.getTugas().forEach(t => {
    if (t.jenjang !== jenjang) return;
    if (!t.materi?.trim() || !t.soal?.length || !t.deadline) return;
    const dl = new Date(t.deadline).getTime();
    if (isNaN(dl) || dl > now) return; // hanya tugas yang sudah lewat deadline
    const pg = t.soal.filter(s => s.type === "pg" && s.pertanyaan?.trim() && s.opsi?.length >= 2 && s.jawaban !== undefined && s.jawaban !== null);
    if (!pg.length) return;
    const key = `${t.mapel || "Lainnya"}||${t.materi.trim()}`;
    (map[key] = map[key] || []).push(...pg.map(s => ({ ...s, pembahasan: s.pembahasan || "", _sumber: "sistem" })));
  });
  store.getLatihanSoal().filter(s => s.jenjang === jenjang).forEach(s => {
    const key = `${s.mapel || "Lainnya"}||${s.bab || "Umum"}`;
    (map[key] = map[key] || []).push({ ...s, pembahasan: s.pembahasan || "", _sumber: "upload" });
  });
  const grouped = {};
  Object.entries(map).forEach(([key, arr]) => {
    const [mapel, bab] = key.split("||");
    (grouped[mapel] = grouped[mapel] || {})[bab] = dedupSoal(arr);
  });
  return grouped;
}

// Ekstrak ID video YouTube dari berbagai bentuk URL (watch, youtu.be, embed, shorts, live) atau ID polos.
function parseYoutubeId(url) {
  if (!url) return null;
  const u = url.toString().trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(u)) return u;
  const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|[?&]v=)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Viewer materi tipe VIDEO — overlay full-screen dengan embed YouTube 16:9.
function YoutubeMateriViewer({ materi, onBack, store, user }) {
  const id = materi.youtubeId;
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  // Auto-selesai saat video benar-benar sampai ENDED (YouTube IFrame API). Best-effort;
  // kalau API gagal dimuat, tombol "Selesai nonton" (dwell) tetap jadi fallback.
  useEffect(() => {
    if (!id || !store || user?.role !== "siswa") return;
    let player = null, cancelled = false;
    const createPlayer = () => {
      if (cancelled || !window.YT || !window.YT.Player) return;
      try {
        player = new window.YT.Player(`ytplayer-${id}`, {
          events: { onStateChange: (e) => { if (e.data === 0) { try { store.markMateriDone(materi.id); } catch {} } } },
        });
      } catch {}
    };
    if (window.YT && window.YT.Player) createPlayer();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (typeof prev === "function") { try { prev(); } catch {} } createPlayer(); };
      if (![...document.getElementsByTagName("script")].some(s => (s.src || "").includes("youtube.com/iframe_api"))) {
        const sc = document.createElement("script"); sc.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(sc);
      }
    }
    return () => { cancelled = true; try { player && player.destroy && player.destroy(); } catch {} };
  }, [id]);
  const btn = { width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.14)", color: "#fff", border: "none", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 };
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(0,0,0,.65)" }}>
        <button onClick={onBack} style={btn} title="Kembali"><I n="chevL" s={18} /></button>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{materi.judul}</div>
        <MateriDoneControl store={store} user={user} materiId={materi.id} dark watchSeconds={materi.watchSeconds} autoDone={materi.autoDone} />
        <button onClick={onBack} style={btn} title="Tutup"><I n="x" s={16} /></button>
      </div>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 16 }}>
        {id ? (
          <div style={{ width: "100%", maxWidth: 1100, aspectRatio: "16 / 9" }}>
            <iframe
              id={`ytplayer-${id}`}
              src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`}
              title={materi.judul} style={{ width: "100%", height: "100%", border: 0, borderRadius: 12 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 14 }}>Link video tidak valid.</div>
        )}
      </div>
    </div>
  );
}

// Normalisasi URL embed web: tambahkan https:// kalau belum ada protokol.
function normalizeEmbedUrl(url) {
  if (!url) return null;
  const s = url.toString().trim();
  if (!s) return null;
  const full = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  return /^https?:\/\/[^\s.]+\.[^\s]+/i.test(full) ? full : null;
}

// Metadata tampilan per tipe materi (ikon, warna, label).
function materiKind(m) {
  const t = m.tipe || "pdf";
  if (t === "youtube") return { icon: "play", color: "var(--accent)", bg: "var(--accent-tint)", label: "Video YouTube" };
  if (t === "web") return { icon: "link2", color: "var(--ink-2)", bg: "var(--line-soft)", label: "Tautan Web" };
  return { icon: "book", color: "var(--accent-2)", bg: "var(--accent-tint)", label: null };
}

// Kontrol penyelesaian materi (misi "nonton"). Hybrid: tombol "Selesai nonton" aktif
// setelah dwell minimal (self-declare, jujur bukan verified); YouTube juga auto-selesai saat video ending.
const MATERI_DONE_DWELL = 30; // detik — default kalau guru tidak set durasi
function MateriDoneControl({ store, user, materiId, dark = false, watchSeconds, autoDone = false }) {
  const dwell = Math.max(1, Math.round(Number(watchSeconds) > 0 ? Number(watchSeconds) : MATERI_DONE_DWELL));
  const [left, setLeft] = useState(dwell);
  const isSiswa = store && user && user.role === "siswa";
  const done = isSiswa ? store.isMateriDone(materiId) : false;
  // reset timer kalau materi berganti / durasi berubah
  useEffect(() => { setLeft(dwell); }, [materiId, dwell]);
  useEffect(() => {
    if (!isSiswa || done) return;
    const t = setInterval(() => setLeft(x => (x <= 1 ? 0 : x - 1)), 1000);
    return () => clearInterval(t);
  }, [materiId, done, isSiswa]);
  // Auto-selesai: saat timer habis & guru mengaktifkan autoDone, tandai selesai tanpa klik.
  useEffect(() => {
    if (isSiswa && autoDone && !done && left <= 0) { try { store.markMateriDone(materiId); } catch {} }
  }, [left, autoDone, done, isSiswa, materiId]);
  if (!isSiswa) return null;
  if (done) return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: dark ? "#BFE0E2" : "var(--good)", padding: "6px 12px", borderRadius: 99, background: dark ? "rgba(122,178,178,.22)" : "var(--good-bg)", flexShrink: 0 }}><I n="check" s={13} /> Selesai</span>;
  const ready = left <= 0;
  // Mode auto: siswa tidak perlu klik — cukup tampilkan hitung mundur, lalu otomatis "Selesai".
  if (autoDone) return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "7px 13px", borderRadius: 99, flexShrink: 0, background: dark ? "rgba(255,255,255,.18)" : "var(--surface-alt)", color: dark ? "#fff" : "var(--ink-3)" }}><I n="clock" s={13} /> {ready ? "Menyimpan..." : `Nonton ${left}s lagi`}</span>;
  return <button onClick={() => ready && store.markMateriDone(materiId)} disabled={!ready} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "7px 13px", borderRadius: 99, border: "none", cursor: ready ? "pointer" : "default", flexShrink: 0, background: ready ? "var(--accent)" : (dark ? "rgba(255,255,255,.18)" : "var(--surface-alt)"), color: ready ? "#fff" : (dark ? "#fff" : "var(--ink-3)") }}>
    <I n="check" s={13} /> {ready ? "Selesai nonton" : `Tunggu ${left}s`}
  </button>;
}

// Modal guru: atur durasi "selesai nonton" + auto-selesai untuk video yang sudah diupload.
function WatchSettingsModal({ materi, store, onClose }) {
  const [sec, setSec] = useState(Number(materi.watchSeconds) > 0 ? Number(materi.watchSeconds) : 30);
  const [auto, setAuto] = useState(!!materi.autoDone);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await store.updateMateri(materi.id, { watchSeconds: Math.max(1, Math.round(Number(sec) || 30)), autoDone: !!auto }); onClose(); }
    catch (e) { alert("Gagal menyimpan: " + (e?.message || "coba lagi")); setSaving(false); }
  }
  return <div className="modal-overlay" style={{ zIndex: 9000 }} onClick={onClose}>
    <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Syarat Selesai Nonton</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{materi.judul}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "var(--ink-2)" }}>Durasi minimal</span>
        <input className="inp" type="number" min={1} value={sec} onChange={e => setSec(e.target.value)} style={{ width: 84, textAlign: "center" }} />
        <span style={{ fontSize: 13, color: "var(--ink-3)" }}>detik</span>
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer", marginBottom: 18 }}>
        <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: "#0d9488", flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.45 }}>Otomatis selesai saat durasi tercapai — siswa tidak perlu klik tombol.</span>
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-soft btn-full" onClick={onClose}>Batal</button>
        <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
      </div>
    </div>
  </div>;
}

// Viewer materi tipe WEB — overlay full-screen, iframe mengisi penuh (untuk animasi HTML interaktif).
function WebMateriViewer({ materi, onBack, store, user }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  const url = materi.embedUrl;
  const btn = { width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.14)", color: "#fff", border: "none", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(0,0,0,.65)", flexShrink: 0 }}>
        <button onClick={onBack} style={btn} title="Kembali"><I n="chevL" s={18} /></button>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{materi.judul}</div>
        <MateriDoneControl store={store} user={user} materiId={materi.id} dark watchSeconds={materi.watchSeconds} autoDone={materi.autoDone} />
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: "none" }} title="Buka di tab baru"><I n="maximize" s={15} /></a>
        <button onClick={onBack} style={btn} title="Tutup"><I n="x" s={16} /></button>
      </div>
      {url ? (
        <iframe src={url} title={materi.judul} style={{ flex: 1, width: "100%", border: 0, background: "#fff" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
          allowFullScreen />
      ) : (
        <div style={{ flex: 1, display: "grid", placeItems: "center", color: "rgba(255,255,255,.7)", fontSize: 14 }}>Link tidak valid.</div>
      )}
    </div>
  );
}

// Helper: convert PDF pages to compressed JPEG base64 array via pdf.js (loaded from CDN on demand)
let _pdfjsLoaded = false;
async function loadPdfJs() {
  if (_pdfjsLoaded && window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs";
    s.type = "module";
    // pdf.js ESM needs a different loading approach — use globalThis workaround
    const s2 = document.createElement("script");
    s2.type = "module";
    s2.textContent = `import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs";pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";window.pdfjsLib=pdfjsLib;window.dispatchEvent(new Event("pdfjsReady"));`;
    document.head.appendChild(s2);
    const onReady = () => { _pdfjsLoaded = true; window.removeEventListener("pdfjsReady", onReady); resolve(window.pdfjsLib); };
    window.addEventListener("pdfjsReady", onReady);
    setTimeout(() => reject(new Error("Gagal memuat PDF library")), 15000);
  });
}


// Dual quality: HD (7 hari pertama) + compressed (arsip setelahnya)
// Render PDF sekali di resolusi tinggi, lalu downscale untuk versi arsip
async function pdfToImagesDual(file, onProgress) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const hdPages = [];
  const loPages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    if (onProgress) onProgress(i, pdf.numPages);
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    // HD: render besar (max 1800px), quality 0.85
    const hdScale = Math.min(3, 1800 / vp.width);
    const hdVp = page.getViewport({ scale: hdScale });
    const hdC = document.createElement("canvas");
    hdC.width = Math.round(hdVp.width);
    hdC.height = Math.round(hdVp.height);
    await page.render({ canvasContext: hdC.getContext("2d"), viewport: hdVp }).promise;
    hdPages.push(hdC.toDataURL("image/jpeg", 0.85));
    // Arsip: downscale dari HD canvas (max 1200px, quality 0.6)
    const loW = Math.min(hdC.width, 1200);
    const loRatio = loW / hdC.width;
    const loH = Math.round(hdC.height * loRatio);
    const loC = document.createElement("canvas");
    loC.width = loW;
    loC.height = loH;
    loC.getContext("2d").drawImage(hdC, 0, 0, loW, loH);
    loPages.push(loC.toDataURL("image/jpeg", 0.6));
  }
  return { hdPages, loPages, numPages: pdf.numPages };
}

// Helper: load jspdf for PDF download from CDN
let _jspdfLoaded = false;
async function loadJsPdf() {
  if (_jspdfLoaded && window.jspdf) return window.jspdf;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";
    s.onload = () => { _jspdfLoaded = true; resolve(window.jspdf); };
    s.onerror = () => reject(new Error("Gagal memuat jspdf"));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error("Timeout memuat jspdf")), 15000);
  });
}

function MateriViewer({ materi, store, onBack, user }) {
  // ALL hooks MUST be before any early return (React Rules of Hooks)
  const [pages, setPages] = useState(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fs, setFs] = useState(false); // fullscreen mode
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dlProgress, setDlProgress] = useState(""); // download progress
  const touchRef = useRef(null);
  const pinchRef = useRef(null); // { dist, zoom, midX, midY }
  const panRef = useRef(null); // { startX, startY, panX, panY }
  const tapRef = useRef(null); // { time, x, y } for double-tap
  const imgContainerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    store.loadMateriPages(materi.id, materi.createdAt).then(p => {
      if (!cancelled) { setPages(p); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [materi.id]);

  // Reset zoom/pan when page changes or fullscreen toggles
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [idx, fs]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (fs) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [fs]);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><div className="spinner" /><p style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 12 }}>Memuat materi...</p></div>;
  if (!pages || pages.length === 0) return <div style={{ padding: 40, textAlign: "center" }}><p style={{ color: "var(--ink-3)" }}>Materi kosong</p><button className="btn btn-outline btn-sm" onClick={onBack} style={{ marginTop: 12 }}>Kembali</button></div>;

  const total = pages.length;
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(total - 1, i + 1));

  // ── Download all pages as PDF ──
  async function handleDownload() {
    try {
      setDlProgress("Memuat library...");
      const { jsPDF } = await loadJsPdf();
      setDlProgress("Menyiapkan PDF...");
      // Helper: load image and get dimensions
      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src;
      });
      const firstImg = await loadImg(pages[0]);
      const isLandscape = firstImg.width > firstImg.height;
      // Use image's own aspect ratio for page size (no forced A4)
      const baseW = isLandscape ? 297 : 210; // mm — A4 landscape or portrait
      const ratio0 = firstImg.height / firstImg.width;
      const baseH = baseW * ratio0;
      const doc = new jsPDF({ unit: "mm", format: [baseW, baseH], orientation: isLandscape ? "landscape" : "portrait" });
      for (let i = 0; i < pages.length; i++) {
        setDlProgress(`Halaman ${i + 1}/${pages.length}...`);
        if (i > 0) {
          const pImg = await loadImg(pages[i]);
          const pR = pImg.height / pImg.width;
          const pLand = pImg.width > pImg.height;
          const pW = pLand ? 297 : 210;
          const pH = pW * pR;
          doc.addPage([pW, pH], pLand ? "landscape" : "portrait");
        }
        doc.addImage(pages[i], "JPEG", 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight());
      }
      const filename = (materi.judul || "materi").replace(/[^a-zA-Z0-9_\- ]/g, "").trim() + ".pdf";
      doc.save(filename);
      setDlProgress("");
    } catch (e) {
      setDlProgress("");
      alert("Gagal download: " + (e?.message || "error"));
    }
  }

  // ── Normal view swipe ──
  const onTouchStart = e => { touchRef.current = e.touches[0].clientX; };
  const onTouchEnd = e => {
    if (touchRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchRef.current;
    if (diff > 50) prev();
    else if (diff < -50) next();
    touchRef.current = null;
  };

  // ── Fullscreen touch handlers ──
  const getDist = (t) => Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);

  const fsTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      const d = getDist(e.touches);
      pinchRef.current = { dist: d, zoom, midX: (e.touches[0].clientX + e.touches[1].clientX) / 2, midY: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      panRef.current = null;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      const t = e.touches[0];
      // Double-tap detection
      if (tapRef.current && now - tapRef.current.time < 300 && Math.abs(t.clientX - tapRef.current.x) < 30 && Math.abs(t.clientY - tapRef.current.y) < 30) {
        // Toggle zoom
        e.preventDefault();
        if (zoom > 1.1) { setZoom(1); setPan({ x: 0, y: 0 }); }
        else { setZoom(2.5); setPan({ x: 0, y: 0 }); }
        tapRef.current = null;
        return;
      }
      tapRef.current = { time: now, x: t.clientX, y: t.clientY };
      // Pan start (only when zoomed)
      if (zoom > 1.05) {
        panRef.current = { startX: t.clientX, startY: t.clientY, panX: pan.x, panY: pan.y };
      } else {
        // Swipe nav start
        touchRef.current = t.clientX;
        panRef.current = null;
      }
    }
  };

  const fsTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const d = getDist(e.touches);
      const newZoom = Math.min(5, Math.max(1, pinchRef.current.zoom * (d / pinchRef.current.dist)));
      setZoom(newZoom);
      if (newZoom <= 1.05) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && panRef.current && zoom > 1.05) {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - panRef.current.startX;
      const dy = t.clientY - panRef.current.startY;
      setPan({ x: panRef.current.panX + dx, y: panRef.current.panY + dy });
    }
  };

  const fsTouchEnd = (e) => {
    if (pinchRef.current && e.touches.length < 2) {
      pinchRef.current = null;
      if (zoom < 1.05) { setZoom(1); setPan({ x: 0, y: 0 }); }
      return;
    }
    if (panRef.current) { panRef.current = null; return; }
    // Swipe nav when not zoomed
    if (touchRef.current !== null && zoom <= 1.05) {
      const diff = e.changedTouches[0].clientX - touchRef.current;
      if (diff > 50) prev();
      else if (diff < -50) next();
      touchRef.current = null;
    }
  };

  // ── Fullscreen overlay ──
  const fsOverlay = fs ? <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column", touchAction: "none" }}>
    {/* Top bar */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(0,0,0,.7)", position: "relative", zIndex: 2 }}>
      <div style={{ color: "#fff", fontSize: 12, fontFamily: "var(--mono)", opacity: .8 }}>{idx + 1} / {total}</div>
      <div style={{ color: "#fff", fontSize: 12, opacity: .6, flex: 1, textAlign: "center", padding: "0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{materi.judul}</div>
      <button onClick={() => setFs(false)} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}><I n="x" s={16} /></button>
    </div>
    {/* Image area with pinch-zoom */}
    <div ref={imgContainerRef} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}
      onTouchStart={fsTouchStart} onTouchMove={fsTouchMove} onTouchEnd={fsTouchEnd}>
      <img src={pages[idx]} alt={`Halaman ${idx + 1}`}
        draggable={false}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: "center center", transition: pinchRef.current ? "none" : "transform .15s ease-out", userSelect: "none", WebkitUserSelect: "none" }} />
      {/* Nav arrows (only show when not zoomed) */}
      {zoom <= 1.05 && idx > 0 && <button onClick={prev} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.15)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "grid", placeItems: "center" }}><I n="chevL" s={20} /></button>}
      {zoom <= 1.05 && idx < total - 1 && <button onClick={next} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.15)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "grid", placeItems: "center" }}><I n="chevR" s={20} /></button>}
    </div>
    {/* Bottom nav */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "10px 16px", background: "rgba(0,0,0,.7)", position: "relative", zIndex: 2 }}>
      <button onClick={prev} disabled={idx === 0} style={{ background: idx === 0 ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.15)", color: idx === 0 ? "rgba(255,255,255,.3)" : "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: idx === 0 ? "default" : "pointer", fontSize: 13 }}><I n="chevL" s={14} /> Prev</button>
      <span style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontFamily: "var(--mono)", minWidth: 50, textAlign: "center" }}>Pinch / 2x tap untuk zoom</span>
      <button onClick={next} disabled={idx === total - 1} style={{ background: idx === total - 1 ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.15)", color: idx === total - 1 ? "rgba(255,255,255,.3)" : "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: idx === total - 1 ? "default" : "pointer", fontSize: 13 }}>Next <I n="chevR" s={14} /></button>
    </div>
  </div> : null;

  return <div>
    {fsOverlay}
    <div className="topbar">
      <button className="topbar-back" onClick={onBack}><I n="chevL" s={18} /></button>
      <div className="topbar-title" style={{ fontSize: 13 }}>{materi.judul}</div>
      <button onClick={handleDownload} disabled={!!dlProgress} style={{ background: "none", border: "none", color: "var(--accent-2)", cursor: dlProgress ? "default" : "pointer", padding: 4, opacity: dlProgress ? .5 : 1 }} title="Download PDF"><I n="download" s={16} /></button>
      <button onClick={() => setFs(true)} style={{ background: "none", border: "none", color: "var(--ink-2)", cursor: "pointer", padding: 4 }}><I n="maximize" s={16} /></button>
      <MateriDoneControl store={store} user={user} materiId={materi.id} watchSeconds={materi.watchSeconds} autoDone={materi.autoDone} />
      <div style={{ width: 30, textAlign: "right", fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{idx + 1}/{total}</div>
    </div>
    {dlProgress && <div style={{ padding: "6px 16px", fontSize: 12, color: "var(--accent-2)", background: "var(--accent-tint)", display: "flex", alignItems: "center", gap: 8 }}><div className="spinner" style={{ width: 14, height: 14 }} /> {dlProgress}</div>}
    <div style={{ position: "relative", background: "var(--surface-alt)", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={() => setFs(true)}>
      <img src={pages[idx]} alt={`Halaman ${idx + 1}`} style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", display: "block" }} />
      {/* Fullscreen hint overlay */}
      <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.5)", color: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, backdropFilter: "blur(4px)" }}><I n="maximize" s={12} /> Fullscreen</div>
      {/* Arrow overlays */}
      {idx > 0 && <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,.4)", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}><I n="chevL" s={18} /></button>}
      {idx < total - 1 && <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,.4)", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}><I n="chevR" s={18} /></button>}
    </div>
    {/* Page nav */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px" }}>
      <button className="btn btn-outline btn-sm" onClick={prev} disabled={idx === 0}><I n="chevL" s={14} /> Sebelumnya</button>
      <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)", minWidth: 50, textAlign: "center" }}>{idx + 1} / {total}</span>
      <button className="btn btn-primary btn-sm" onClick={next} disabled={idx === total - 1}>Selanjutnya <I n="chevR" s={14} /></button>
    </div>
  </div>;
}

function LatihanQuiz({ bab, mapel, soalPool, store, onBack }) {
  const MAX_SOAL = 10;
  const [soalList] = useState(() => {
    // Deduplicate by pertanyaan text (soal sama dari tugas/upload berbeda)
    const seen = new Set();
    const unique = [];
    for (const s of soalPool) {
      const key = s.pertanyaan.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); unique.push(s); }
    }
    // Anti-ulang: prioritaskan soal yang BELUM pernah dikerjakan siswa.
    // Kalau semua sudah pernah (progress penuh / mode review), fallback ke acak dari semua.
    const done = store.getLatihanSeen(mapel, bab);
    const unseen = unique.filter(s => !done.has(latihanSoalKey(s.pertanyaan)));
    const pick = unseen.length ? unseen : unique;
    return shuffle([...pick]).slice(0, MAX_SOAL);
  });
  const [marked, setMarked] = useState(false);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]); // array of booleans
  const [done, setDone] = useState(false);

  // Begitu ronde selesai, tandai soal-soal ronde ini sebagai "sudah dilatih" (sekali saja).
  useEffect(() => {
    if (done && !marked) {
      setMarked(true);
      store.markLatihanSeen(mapel, bab, soalList.map(s => latihanSoalKey(s.pertanyaan)));
    }
  }, [done]);

  const total = soalList.length;

  function handleSelect(optIdx) {
    if (answered) return;
    setSelected(optIdx);
    setAnswered(true);
    setResults(r => [...r, optIdx === soalList[idx].jawaban]);
  }

  function handleNext() {
    if (idx < total - 1) {
      setIdx(i => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setDone(true);
    }
  }

  function handleRetry() {
    setIdx(0);
    setSelected(null);
    setAnswered(false);
    setResults([]);
    setDone(false);
  }

  // ── Result screen ── (redesign Fase 2: kelas ui-* dari styles/ui.css, tanpa emoji; salah = amber)
  if (done) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((correct / total) * 100);
    return <div className="sw">
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}><I n="chevL" s={18} /></button>
        <div className="topbar-title" style={{ fontSize: 13 }}>Hasil Latihan</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="ui-page">
        <section className="ui-card">
          <div className="ui-label-row"><span className="ui-label">Hasil latihan</span><span className="ui-aside">{bab}</span></div>
          <div className="lm-score">{pct >= 80 && <ConfettiRain intensity={pct === 100 ? "high" : "medium"} />}<b>{correct}<span>/{total}</span></b><p className="ui-text">jawaban benar ({pct}%). Latihan tidak masuk nilai, jadi coba lagi sampai paham.</p></div>
          <div className="ui-meter"><i style={{ width: `${pct}%` }} /></div>
          <div className="lm-dots">{results.map((ok, i) => <span key={i} className={ok ? "ok" : "no"} aria-label={`Soal ${i + 1} ${ok ? "benar" : "salah"}`}>{i + 1}</span>)}</div>
          <div className="lm-act">
            <button type="button" className="ui-btn outline" onClick={onBack}><I n="chevL" s={14} /> Kembali</button>
            <button type="button" className="ui-btn" onClick={handleRetry}><I n="rotate" s={14} /> Coba lagi</button>
          </div>
        </section>
      </div>
    </div>;
  }

  // ── Quiz question screen ──
  const soal = soalList[idx];
  const isCorrect = answered && selected === soal.jawaban;
  const isWrong = answered && selected !== soal.jawaban;

  return <div>
    <div className="topbar">
      <button className="topbar-back" onClick={onBack}><I n="chevL" s={18} /></button>
      <div className="topbar-title" style={{ fontSize: 13 }}>{bab}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)", width: 50, textAlign: "right" }}>{idx + 1}/{total}</div>
    </div>
    {/* Progress dots */}
    <div style={{ display: "flex", gap: 3, padding: "8px 16px" }}>
      {soalList.map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < idx ? (results[i] ? "var(--accent-mid)" : "var(--warn-bar)") : i === idx ? "var(--accent)" : "var(--line)", transition: "background .2s" }} />
      ))}
    </div>
    <div style={{ padding: "12px 16px 24px" }}>
      {/* Question */}
      {soal.gambar && <img src={soal.gambar} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 12 }} />}
      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.55, marginBottom: 16, color: "var(--ink)" }}>{soal.pertanyaan}</div>
      {/* Options */}
      {(soal.opsi || []).map((o, i) => {
        let cls = "quiz-opt";
        if (answered) {
          if (i === soal.jawaban) cls += " correct";
          else if (i === selected && i !== soal.jawaban) cls += " wrong";
        } else if (selected === i) {
          cls += " selected";
        }
        return <button key={i} className={cls} onClick={() => handleSelect(i)} style={{ cursor: answered ? "default" : "pointer" }}>
          <div className="quiz-letter">{String.fromCharCode(65 + i)}</div>
          <span style={{ flex: 1 }}>{o}</span>
          {answered && i === soal.jawaban && <I n="check" s={16} style={{ color: "var(--good)", flexShrink: 0 }} />}
          {answered && i === selected && i !== soal.jawaban && <I n="x" s={16} style={{ color: "var(--warn)", flexShrink: 0 }} />}
        </button>;
      })}
      {/* Feedback */}
      {answered && <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: isCorrect ? "var(--accent-tint)" : "var(--warn-bg)" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: isCorrect ? "var(--accent)" : "var(--warn)", marginBottom: soal.pembahasan ? 6 : 0 }}>
          {isCorrect ? "Benar" : `Belum tepat. Jawabannya ${String.fromCharCode(65 + soal.jawaban)}.`}
        </div>
        {soal.pembahasan && soal.pembahasan.trim() && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-1)", whiteSpace: "pre-wrap" }}>{soal.pembahasan}</div>}
      </div>}
      {/* Next button */}
      {answered && <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={handleNext}>
          {idx < total - 1 ? <>Selanjutnya <I n="chevR" s={14} /></> : <>Lihat Hasil <I n="chevR" s={14} /></>}
        </button>
      </div>}
    </div>
  </div>;
}

export function LatihanMandiri({ user, store, navigate }) {
  const [tab, setTab] = useState("materi");
  const [viewMateri, setViewMateri] = useState(null);
  const [quizBab, setQuizBab] = useState(null); // { bab, soal } or null
  const materiList = store.getMateriList().filter(m => m.jenjang === user.jenjang);

  // Kolam latihan (sistem + upload), identik dengan yang dipakai guru di LatihanSoalManager.
  const latihanGrouped = collectLatihanPool(store, user.jenjang);
  const latihanMapelKeys = Object.keys(latihanGrouped).sort();

  // Early returns for sub-views (after all hooks)
  if (quizBab) return <LatihanQuiz bab={quizBab.bab} mapel={quizBab.mapel} soalPool={quizBab.soal} store={store} onBack={() => setQuizBab(null)} />;
  if (viewMateri) {
    if (viewMateri.tipe === "youtube") return <YoutubeMateriViewer materi={viewMateri} store={store} user={user} onBack={() => setViewMateri(null)} />;
    if (viewMateri.tipe === "web") return <WebMateriViewer materi={viewMateri} store={store} user={user} onBack={() => setViewMateri(null)} />;
    return <MateriViewer materi={viewMateri} store={store} user={user} onBack={() => setViewMateri(null)} />;
  }

  // Group materi by mapel → bab (for Materi tab)
  const grouped = {};
  materiList.forEach(m => {
    const key = m.mapel || "Lainnya";
    if (!grouped[key]) grouped[key] = {};
    const bab = m.bab || "Umum";
    if (!grouped[key][bab]) grouped[key][bab] = [];
    grouped[key][bab].push(m);
  });
  const mapelKeys = Object.keys(grouped).sort();

  // Redesign Fase 2: memakai kelas ui-* (styles/ui.css, dimuat global lewat App). Import file ini tetap 4.
  const tabItems = [["materi", "Materi"], ["latihan", "Latihan mandiri"]];
  return <div className="sw">
    <div className="ui-page mid">
      <header className="ui-head"><span className="ui-head-ey">Kelas {user.jenjang}</span><h1>Mandiri</h1><span className="ui-head-sub">Baca materi dan latih soal kapan saja. Tidak masuk nilai.</span></header>
      <div className="ui-tabs" role="tablist">
        {tabItems.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>)}
      </div>

      {tab === "materi" && <>
        {mapelKeys.length === 0 && <section className="ui-card center"><div className="ui-empty"><I n="book" s={28} /><div className="ui-title">Belum ada materi</div><p className="ui-text">Materi dari guru akan muncul di sini.</p></div></section>}
        {mapelKeys.map(mapel => Object.entries(grouped[mapel]).sort((a, b) => a[0].localeCompare(b[0])).map(([bab, items]) => (
          <section key={mapel + bab} className="ui-card">
            <div className="ui-label-row"><span className="ui-label">{bab}</span><span className="ui-aside">{mapel}</span></div>
            <div className="ui-items">
              {items.sort((a, b) => (a.urutan || 0) - (b.urutan || 0)).map(m => {
                const k = materiKind(m);
                const isPdf = (m.tipe || "pdf") === "pdf";
                const baru = m.createdAt && Date.now() - m.createdAt < 7 * 86400000;
                const selesai = store.isMateriDone ? store.isMateriDone(m.id) : false;
                return <button key={m.id} type="button" className="ui-item" onClick={() => setViewMateri(m)}>
                  <span className="ui-item-ic" aria-hidden="true" style={{ background: k.bg, color: k.color }}><I n={k.icon} s={17} /></span>
                  <span className="ui-item-main">
                    <span className="ui-item-title"><b>{m.judul}</b>{selesai ? <span className="ui-chip">Selesai</span> : baru ? <span className="ui-chip amber">Baru</span> : null}</span>
                    <small>{k.label || (isPdf && m.pageCount ? `PDF · ${m.pageCount} halaman` : "PDF")}</small>
                  </span>
                  <span className="ui-item-end"><I n="chevR" s={16} style={{ color: "var(--ink-4)" }} /></span>
                </button>;
              })}
            </div>
          </section>
        )))}
      </>}

      {tab === "latihan" && <>
        {latihanMapelKeys.length === 0 && <section className="ui-card center"><div className="ui-empty"><I n="edit" s={28} /><div className="ui-title">Belum ada latihan</div><p className="ui-text">Soal latihan tersedia setelah tenggat tugas yang terkait materi lewat.</p></div></section>}
        {latihanMapelKeys.map(mapel => (
          <section key={mapel} className="ui-card">
            <div className="ui-label-row"><span className="ui-label">{mapel}</span><span className="ui-aside">10 soal per ronde</span></div>
            <div className="ui-items">
              {Object.entries(latihanGrouped[mapel]).sort((a, b) => a[0].localeCompare(b[0])).map(([bab, soalRaw]) => {
                const pool = dedupSoal(soalRaw);
                const seenSet = store.getLatihanSeen(mapel, bab);
                const total = pool.length;
                const seen = pool.filter(s => seenSet.has(latihanSoalKey(s.pertanyaan))).length;
                const remaining = total - seen;
                const rondeLagi = Math.ceil(remaining / 10);
                const pct = total ? Math.round((seen / total) * 100) : 0;
                const selesai = total > 0 && remaining === 0;
                return (
                  <div key={bab} className="lm-row">
                    <div className="lm-row-top">
                      <span className="ui-item-main">
                        <span className="ui-item-title"><b>{bab}</b>{selesai && <span className="ui-chip">Semua sudah dilatih</span>}</span>
                        <small>{seen} dari {total} soal sudah dilatih{!selesai && ` · ${rondeLagi} ronde lagi`}</small>
                      </span>
                      {selesai
                        ? <span className="lm-row-act">
                            <button type="button" className="ui-btn outline sm" onClick={() => store.resetLatihanProgress(mapel, bab)}><I n="rotate" s={12} /> Ulang</button>
                            <button type="button" className="ui-btn sm" onClick={() => setQuizBab({ bab, mapel, soal: pool })}>Review</button>
                          </span>
                        : <button type="button" className="ui-btn sm" onClick={() => setQuizBab({ bab, mapel, soal: pool })}>{seen ? "Lanjut" : "Mulai"}</button>}
                    </div>
                    <div className="ui-meter"><i style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </>}
    </div>
  </div>;
}


function LatihanUploadModal({ store, defaultJenjang, onClose, onSuccess }) {
  const [mapel, setMapel] = useState("IPA");
  const [jenjang, setJenjang] = useState(defaultJenjang || "VII");
  const [bab, setBab] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!bab.trim()) { setErr("BAB wajib diisi."); return; }
    if (!file) { setErr("Pilih file Excel dulu."); return; }
    setBusy(true); setErr("");
    try {
      const { imported, skipped } = await store.importLatihanFromExcel(file, mapel, jenjang, bab.trim());
      if (imported === 0) { setErr("Tidak ada soal PG valid di file. Isi di sheet '1. Pilihan Ganda'."); setBusy(false); return; }
      onSuccess(`${imported} soal diimport${skipped ? ` (${skipped} non-PG dilewati)` : ""}.`);
    } catch (e) {
      setErr("Gagal import: " + (e?.message || "format tidak dikenali")); setBusy(false);
    }
  }

  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
      <h3>Import Soal Latihan (Excel)</h3>
      <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14 }}>Soal diambil dari sheet <b>1. Pilihan Ganda</b>. Semua soal di file ini di-assign ke Mapel/Kelas/BAB berikut.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div className="fg" style={{ flex: 1 }}><label className="lbl">Mapel</label><select className="inp" value={mapel} onChange={e => setMapel(e.target.value)}><option>IPA</option><option>Informatika</option></select></div>
        <div className="fg" style={{ flex: 1 }}><label className="lbl">Kelas</label><select className="inp" value={jenjang} onChange={e => setJenjang(e.target.value)}><option value="VII">VII</option><option value="VIII">VIII</option></select></div>
      </div>
      <div className="fg" style={{ marginBottom: 12 }}><label className="lbl">BAB</label><input className="inp" value={bab} onChange={e => setBab(e.target.value)} placeholder="Contoh: Bab 3 — Energi" /></div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "2px dashed var(--line)", borderRadius: 8, cursor: "pointer", background: file ? "var(--accent-tint)" : "var(--surface)" }}>
        <I n="upload" s={16} style={{ color: "var(--accent-2)" }} />
        <span style={{ fontSize: 13, color: file ? "var(--accent-2)" : "var(--ink-2)" }}>{file ? file.name : "Pilih file Excel (.xlsx)"}</span>
        <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }} />
      </label>
      {err && <div style={{ marginTop: 12, fontSize: 12, color: "var(--bad)", background: "var(--bad-bg)", border: "1px solid #fca5a5", borderRadius: 6, padding: "8px 10px" }}>{err}</div>}
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-outline btn-sm" onClick={onClose} disabled={busy}>Batal</button>
        <button className="btn btn-primary btn-sm" onClick={go} disabled={busy || !file}>{busy ? "Mengimport..." : "Import"}</button>
      </div>
    </div>
  </div>;
}

function LatihanManualModal({ store, defaultJenjang, onClose, onSuccess }) {
  const [mapel, setMapel] = useState("IPA");
  const [jenjang, setJenjang] = useState(defaultJenjang || "VII");
  const [bab, setBab] = useState("");
  const [pertanyaan, setPertanyaan] = useState("");
  const [opsi, setOpsi] = useState(["", "", "", ""]);
  const [jawaban, setJawaban] = useState(0);
  const [pembahasan, setPembahasan] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!bab.trim()) return setErr("BAB wajib diisi.");
    if (!pertanyaan.trim()) return setErr("Pertanyaan wajib diisi.");
    if (opsi.filter(o => o.trim()).length < 2) return setErr("Minimal 2 opsi diisi.");
    if (!opsi[jawaban]?.trim()) return setErr("Opsi jawaban benar tidak boleh kosong.");
    setBusy(true); setErr("");
    try {
      await store.addLatihanSoal({ mapel, jenjang, bab: bab.trim(), pertanyaan: pertanyaan.trim(), opsi, jawaban, pembahasan: pembahasan.trim() });
      onSuccess();
    } catch (e) { setErr("Gagal simpan: " + (e?.message || "coba lagi")); setBusy(false); }
  }

  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 480, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
      <h3>Tambah Soal Latihan (PG)</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="fg" style={{ flex: 1 }}><label className="lbl">Mapel</label><select className="inp" value={mapel} onChange={e => setMapel(e.target.value)}><option>IPA</option><option>Informatika</option></select></div>
          <div className="fg" style={{ flex: 1 }}><label className="lbl">Kelas</label><select className="inp" value={jenjang} onChange={e => setJenjang(e.target.value)}><option value="VII">VII</option><option value="VIII">VIII</option></select></div>
        </div>
        <div className="fg"><label className="lbl">BAB</label><input className="inp" value={bab} onChange={e => setBab(e.target.value)} placeholder="Contoh: Bab 3 — Energi" /></div>
        <div className="fg"><label className="lbl">Pertanyaan</label><textarea className="inp" rows={3} value={pertanyaan} onChange={e => setPertanyaan(e.target.value)} placeholder="Tulis pertanyaan..." /></div>
        <div className="fg"><label className="lbl">Opsi (pilih yang benar)</label>
          {opsi.map((o, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <input type="radio" checked={jawaban === i} onChange={() => setJawaban(i)} />
              <input className="inp" value={o} onChange={e => setOpsi(opsi.map((x, j) => j === i ? e.target.value : x))} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
            </div>
          ))}
        </div>
        <div className="fg"><label className="lbl">Pembahasan (opsional)</label><textarea className="inp" rows={2} value={pembahasan} onChange={e => setPembahasan(e.target.value)} placeholder="Penjelasan jawaban (muncul ke siswa setelah menjawab)..." /></div>
      </div>
      {err && <div style={{ marginTop: 12, fontSize: 12, color: "var(--bad)", background: "var(--bad-bg)", border: "1px solid #fca5a5", borderRadius: 6, padding: "8px 10px" }}>{err}</div>}
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-outline btn-sm" onClick={onClose} disabled={busy}>Batal</button>
        <button className="btn btn-primary btn-sm" onClick={go} disabled={busy}>{busy ? "Menyimpan..." : "Tambah"}</button>
      </div>
    </div>
  </div>;
}

// ─── GURU V2 (Fase 3, Nov 2026): Materi & Soal Latihan ─────────────────────────────
// Sengaja TIDAK menambah import (aturan 4 import di file ini). Kelas gr-* berasal dari
// styles/guru.css yang sudah dimuat global lewat pages/guru.jsx. Logika upload sama dengan
// MateriPdfManager lama; versi lama tetap ada di route materi-manager-lama sampai cleanup.
const tglPendek = ms => (ms ? new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "");
const LABEL_TIPE = { pdf: "PDF", youtube: "Video", web: "Web" };

function SyaratSelesai({ sec, setSec, auto, setAuto, web }) {
  return (
    <fieldset className="gr-mt-syarat">
      <legend>Syarat selesai</legend>
      <label className="gr-mt-durasi"><span>Durasi minimal</span><input className="inp" type="number" min={1} value={sec} onChange={e => setSec(e.target.value)} /><span>detik</span></label>
      <label className="gr-check"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Tandai selesai otomatis saat durasi tercapai</label>
      {web && <p className="gr-muted">Disarankan untuk tautan web: isi halaman dari situs lain tidak bisa dilacak.</p>}
    </fieldset>
  );
}

function TambahMateriModal({ store, jenjang, daftar, onClose, onDone }) {
  const [tipe, setTipe] = useState("pdf");
  const [form, setForm] = useState({ judul: "", mapel: "IPA", jenjang, bab: "" });
  const [pdf, setPdf] = useState(null);
  const [url, setUrl] = useState("");
  const [sec, setSec] = useState(30);
  const [auto, setAuto] = useState(tipe === "web");
  const [sibuk, setSibuk] = useState("");
  const [galat, setGalat] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const babAda = [...new Set(daftar.filter(m => m.jenjang === form.jenjang && m.mapel === form.mapel).map(m => m.bab).filter(Boolean))].sort();
  const ytId = tipe === "youtube" ? parseYoutubeId(url) : null;
  const webUrl = tipe === "web" ? normalizeEmbedUrl(url) : null;
  const siap = form.judul.trim() && form.bab.trim() && (tipe === "pdf" ? !!pdf : tipe === "youtube" ? !!ytId : !!webUrl);
  async function simpan() {
    const meta = { judul: form.judul.trim(), mapel: form.mapel, jenjang: form.jenjang, bab: form.bab.trim() };
    meta.urutan = daftar.filter(m => m.mapel === meta.mapel && m.jenjang === meta.jenjang && m.bab === meta.bab).length;
    const syarat = { watchSeconds: Math.max(1, Math.round(Number(sec) || 30)), autoDone: !!auto };
    setGalat("");
    try {
      if (tipe === "youtube") { setSibuk("Menyimpan video…"); await store.addMateriYoutube({ ...meta, ...syarat }, ytId); }
      else if (tipe === "web") { setSibuk("Menyimpan tautan…"); await store.addMateriWeb({ ...meta, ...syarat }, webUrl); }
      else {
        setSibuk("Memuat pembaca PDF…"); await loadPdfJs();
        const { hdPages, loPages, numPages } = await pdfToImagesDual(pdf, (i, n) => setSibuk(`Mengubah halaman ${i} dari ${n}…`));
        setSibuk(`Menyimpan ${numPages} halaman…`);
        await store.addMateri(meta, hdPages, loPages);
      }
      onDone(`"${meta.judul}" ditambahkan ke ${meta.bab}.`);
    } catch (e) { setGalat("Gagal menyimpan: " + (e?.message || "coba lagi")); setSibuk(""); }
  }
  const ganti = t => { setTipe(t); setUrl(""); setAuto(t === "web"); };
  return (
    <div className="modal-overlay" onClick={() => !sibuk && onClose()}>
      <div className="modal gr-mt-modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-mt-j">
        <h3 id="gr-mt-j">Tambah materi</h3>
        <div className="gr-seg gr-mt-tipe" role="tablist" aria-label="Jenis materi">
          {[["pdf", "PDF"], ["youtube", "Video YouTube"], ["web", "Tautan web"]].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tipe === k} className={tipe === k ? "on" : ""} disabled={!!sibuk} onClick={() => ganti(k)}>{l}</button>)}
        </div>
        <div className="gr-mt-form">
          <label className="lebar"><span>Judul</span><input className="inp" value={form.judul} onChange={e => set("judul", e.target.value)} placeholder="Contoh: Massa jenis benda" /></label>
          <label><span>Mapel</span><select className="inp" value={form.mapel} onChange={e => set("mapel", e.target.value)}><option>IPA</option><option>Informatika</option></select></label>
          <label><span>Kelas</span><select className="inp" value={form.jenjang} onChange={e => set("jenjang", e.target.value)}><option value="VII">Kelas VII</option><option value="VIII">Kelas VIII</option></select></label>
          <label className="lebar"><span>Bab</span><input className="inp" list="gr-mt-bab" value={form.bab} onChange={e => set("bab", e.target.value)} placeholder="Pilih bab yang ada atau ketik baru" />
            <datalist id="gr-mt-bab">{babAda.map(b => <option key={b} value={b} />)}</datalist>
            {babAda.length > 0 && !babAda.includes(form.bab.trim()) && form.bab.trim() && <small className="gr-muted">Bab baru. Pastikan penulisannya sama kalau maksudnya bab yang sudah ada.</small>}
          </label>
          {tipe === "pdf" ? (
            <label className={`lebar gr-pf-unggah ${pdf ? "ada" : ""}`}>
              <span>{pdf ? pdf.name : "Pilih file PDF"}</span><small>{pdf ? `${(pdf.size / 1048576).toFixed(1)} MB · tiap halaman diubah jadi gambar` : "Tiap halaman diubah jadi gambar supaya ringan dibuka siswa"}</small>
              <input type="file" accept=".pdf" disabled={!!sibuk} onChange={e => e.target.files[0] && setPdf(e.target.files[0])} />
            </label>
          ) : (
            <label className="lebar"><span>{tipe === "youtube" ? "Link YouTube" : "Link halaman"}</span>
              <input className="inp" value={url} onChange={e => setUrl(e.target.value)} placeholder={tipe === "youtube" ? "https://youtu.be/…" : "https://…"} />
              {url.trim() && !(ytId || webUrl) && <small className="gr-mt-err">Link belum valid.</small>}
            </label>
          )}
          {ytId && <div className="lebar gr-mt-prev"><iframe src={`https://www.youtube-nocookie.com/embed/${ytId}`} title="Pratinjau video" allowFullScreen /></div>}
          {webUrl && <div className="lebar gr-mt-prev web"><iframe src={webUrl} title="Pratinjau halaman" /></div>}
          {tipe !== "pdf" && <div className="lebar"><SyaratSelesai sec={sec} setSec={setSec} auto={auto} setAuto={setAuto} web={tipe === "web"} /></div>}
        </div>
        {sibuk && <p className="gr-mt-proses" role="status"><span className="spinner" /> {sibuk}</p>}
        {galat && <p className="gr-warn" role="alert">{galat}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline btn-sm" disabled={!!sibuk} onClick={onClose}>Batal</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!siap || !!sibuk} onClick={simpan}>{sibuk ? "Menyimpan…" : "Simpan"}</button>
        </div>
      </div>
    </div>
  );
}

function DaftarMateriV2({ store, jenjang, onTambah, onLihat, onAtur, onHapus }) {
  const semua = store.getMateriList();
  const daftar = semua.filter(m => m.jenjang === jenjang);
  const siswa = store.getAllSiswa(jenjang);
  const n = siswa.length;
  const grup = {};
  daftar.forEach(m => { const mp = m.mapel || "Lainnya", b = m.bab || "Umum"; ((grup[mp] = grup[mp] || {})[b] = grup[mp][b] || []).push(m); });
  if (!daftar.length) return (
    <div className="gr-card gr-mt-kosong">
      <b>Belum ada materi Kelas {jenjang}</b>
      <p className="gr-muted">Unggah PDF, tempel link YouTube, atau tautan simulasi web. Materi tampil di menu Materi siswa dan bisa dipakai di Misi PJJ.</p>
      <button type="button" className="gr-btn sm" onClick={onTambah}>Tambah materi</button>
    </div>
  );
  return Object.keys(grup).sort().map(mp => (
    <section key={mp} className="gr-mt-mapel">
      <div className="gr-sh"><h2>{mp}</h2><span className="gr-muted">{Object.values(grup[mp]).flat().length} materi · {Object.keys(grup[mp]).length} bab</span></div>
      <div className="gr-stack">
        {Object.entries(grup[mp]).sort((a, b) => a[0].localeCompare(b[0], "id", { numeric: true })).map(([bab, items]) => (
          <div key={bab} className="gr-card list">
            <div className="gr-arsip-head"><b>{bab}</b><span className="gr-muted">{items.length} materi</span></div>
            {items.sort((a, b) => (a.urutan || 0) - (b.urutan || 0)).map(m => {
              const t = m.tipe || "pdf";
              const selesai = n ? siswa.filter(s => store.isMateriDoneFor && store.isMateriDoneFor(s.id, m.id)).length : 0;
              const baru = m.createdAt && Date.now() - m.createdAt < 7 * 864e5;
              const meta = t === "pdf" ? `${m.pageCount || 0} halaman` : `selesai setelah ${Number(m.watchSeconds) > 0 ? m.watchSeconds : 30} dtk${m.autoDone ? ", otomatis" : ""}`;
              return (
                <div key={m.id} className="gr-mt-row">
                  <button type="button" className="gr-mt-main" onClick={() => onLihat(m)} title="Pratinjau seperti yang dilihat siswa">
                    <span className={`gr-mt-tipe-ic ${t}`}><I n={t === "youtube" ? "play" : t === "web" ? "link2" : "fileText"} s={16} /></span>
                    <span className="gr-mt-txt">
                      <b>{m.judul}</b>
                      <span>{LABEL_TIPE[t] || "PDF"} · {meta} · {tglPendek(m.createdAt)}{baru && <em> · baru</em>}</span>
                    </span>
                  </button>
                  <div className="gr-mt-prog" title={`${selesai} dari ${n} siswa sudah menandai selesai`}>
                    <span><b>{selesai}</b>/{n} selesai</span>
                    <i><i style={{ width: `${n ? Math.round(selesai / n * 100) : 0}%` }} /></i>
                  </div>
                  <div className="gr-mt-act">
                    {t !== "pdf" && <button type="button" className="gr-ib" onClick={() => onAtur(m)} aria-label={`Atur syarat selesai ${m.judul}`} title="Atur syarat selesai"><I n="clock" s={15} /></button>}
                    <button type="button" className="gr-ib" onClick={() => onHapus(m)} aria-label={`Hapus ${m.judul}`} title="Hapus"><I n="trash" s={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  ));
}

function LatihanV2({ store, jenjang, onHapus, toast }) {
  const [buka, setBuka] = useState(() => new Set());
  const grup = collectLatihanPool(store, jenjang);
  const togel = k => setBuka(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s; });
  const keys = Object.keys(grup).sort();
  if (!keys.length) return (
    <div className="gr-card gr-mt-kosong">
      <b>Belum ada soal latihan Kelas {jenjang}</b>
      <p className="gr-muted">Soal pilihan ganda dari tugas yang tenggatnya sudah lewat akan masuk otomatis. Bisa juga tambah sendiri atau impor dari Excel.</p>
    </div>
  );
  return keys.map(mp => {
    const babs = Object.entries(grup[mp]).sort((a, b) => a[0].localeCompare(b[0], "id", { numeric: true }));
    return (
      <section key={mp} className="gr-mt-mapel">
        <div className="gr-sh"><h2>{mp}</h2><span className="gr-muted">{babs.reduce((x, [, s]) => x + s.length, 0)} soal · {babs.length} bab</span></div>
        <div className="gr-card list">
          {babs.map(([bab, soal]) => {
            const k = `${mp}||${bab}`, open = buka.has(k);
            const up = soal.filter(s => s._sumber === "upload").length;
            return (
              <div key={bab} className={`gr-mt-bab ${open ? "open" : ""}`}>
                <div className="gr-mt-bab-head">
                  <button type="button" className="gr-mt-bab-btn" aria-expanded={open} onClick={() => togel(k)}>
                    <b>{bab}</b>
                    <span>{soal.length} soal · {soal.length - up} dari tugas · {up} ditambahkan</span>
                  </button>
                  <button type="button" className="gr-ib" title="Unduh Excel bab ini" aria-label={`Unduh soal ${bab}`} onClick={() => Promise.resolve().then(() => store.exportLatihanSoal(soal, { mapel: mp, bab, jenjang })).catch(e => toast("Gagal mengunduh: " + (e?.message || "coba lagi")))}><I n="download" s={15} /></button>
                </div>
                {open && (
                  <ol className="gr-mt-soal">
                    {soal.map((s, i) => (
                      <li key={s.id || i} className={s._sumber === "upload" ? "up" : ""}>
                        <div>
                          <p>{s.pertanyaan}</p>
                          <span className="kunci">Kunci {String.fromCharCode(65 + (s.jawaban || 0))}. {(s.opsi || [])[s.jawaban || 0]}</span>
                        </div>
                        {s._sumber === "upload" && s.id
                          ? <button type="button" className="gr-ib" aria-label="Hapus soal" title="Hapus soal" onClick={() => onHapus(s)}><I n="trash" s={14} /></button>
                          : <span className="gr-chip muted">dari tugas</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  });
}

export function MateriGuruV2({ store }) {
  const [tab, setTab] = useState("materi");
  const [jenjang, setJenjang] = useState("VII");
  const [tambah, setTambah] = useState(null); // "materi" | "manual" | "impor"
  const [lihat, setLihat] = useState(null);
  const [atur, setAtur] = useState(null);
  const [hapus, setHapus] = useState(null); // { jenis: "materi"|"soal", item }
  const [pesan, setPesan] = useState("");
  const toast = m => { setPesan(m); setTimeout(() => setPesan(""), 2800); };
  useEffect(() => { store.archiveOldMateri().catch(() => {}); }, []);
  const semua = store.getMateriList();
  const jumlahSoal = j => Object.values(collectLatihanPool(store, j)).reduce((n, b) => n + Object.values(b).reduce((x, a) => x + a.length, 0), 0);
  const nMateri = j => semua.filter(m => m.jenjang === j).length;
  if (lihat) {
    const back = () => setLihat(null);
    if (lihat.tipe === "youtube") return <YoutubeMateriViewer materi={lihat} store={store} user={null} onBack={back} />;
    if (lihat.tipe === "web") return <WebMateriViewer materi={lihat} store={store} user={null} onBack={back} />;
    return <MateriViewer materi={lihat} store={store} user={null} onBack={back} />;
  }
  async function konfirmasiHapus() {
    const { jenis, item } = hapus; setHapus(null);
    try {
      if (jenis === "materi") { await store.deleteMateri(item.id); toast(`"${item.judul}" dihapus.`); }
      else { await store.deleteLatihanSoal(item.id); toast("Soal dihapus."); }
    } catch (e) { toast("Gagal menghapus: " + (e?.message || "coba lagi")); }
  }
  const hitung = tab === "materi" ? nMateri : jumlahSoal;
  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">{semua.length} materi · {jumlahSoal("VII") + jumlahSoal("VIII")} soal latihan</span>
          <h1>Materi & latihan</h1>
        </div>
        <div className="gr-actions">
          {tab === "materi"
            ? <button type="button" className="gr-btn" onClick={() => setTambah("materi")}>Tambah materi</button>
            : <>
                <button type="button" className="gr-btn outline" onClick={() => store.downloadTemplateSoal()}>Template</button>
                <button type="button" className="gr-btn outline" onClick={() => setTambah("impor")}>Impor Excel</button>
                <button type="button" className="gr-btn" onClick={() => setTambah("manual")}>Tambah soal</button>
              </>}
        </div>
      </div>

      <div className="gr-bar-row">
        <div className="gr-seg" role="tablist" aria-label="Bagian">
          <button type="button" role="tab" aria-selected={tab === "materi"} className={tab === "materi" ? "on" : ""} onClick={() => setTab("materi")}>Materi</button>
          <button type="button" role="tab" aria-selected={tab === "latihan"} className={tab === "latihan" ? "on" : ""} onClick={() => setTab("latihan")}>Soal latihan</button>
        </div>
        <div className="gr-seg" role="tablist" aria-label="Pilih kelas">
          {["VII", "VIII"].map(j => <button key={j} type="button" role="tab" aria-selected={jenjang === j} className={jenjang === j ? "on" : ""} onClick={() => setJenjang(j)}>Kelas {j} · {hitung(j)}</button>)}
        </div>
      </div>

      {tab === "latihan" && <p className="gr-muted gr-mt-info">Muncul di Latihan Mandiri siswa. Isinya soal pilihan ganda dari tugas yang tenggatnya sudah lewat, ditambah soal yang Anda masukkan sendiri. Soal dari tugas yang diarsipkan tidak ikut, supaya tidak bocor kalau tugasnya diterbitkan ulang.</p>}

      {tab === "materi"
        ? <DaftarMateriV2 store={store} jenjang={jenjang} onTambah={() => setTambah("materi")} onLihat={setLihat} onAtur={setAtur} onHapus={m => setHapus({ jenis: "materi", item: m })} />
        : <LatihanV2 store={store} jenjang={jenjang} toast={toast} onHapus={s => setHapus({ jenis: "soal", item: s })} />}

      {tambah === "materi" && <TambahMateriModal store={store} jenjang={jenjang} daftar={semua} onClose={() => setTambah(null)} onDone={m => { setTambah(null); toast(m); }} />}
      {tambah === "impor" && <LatihanUploadModal store={store} defaultJenjang={jenjang} onClose={() => setTambah(null)} onSuccess={m => { setTambah(null); toast(m); }} />}
      {tambah === "manual" && <LatihanManualModal store={store} defaultJenjang={jenjang} onClose={() => setTambah(null)} onSuccess={() => { setTambah(null); toast("Soal ditambahkan."); }} />}
      {atur && <WatchSettingsModal materi={atur} store={store} onClose={() => setAtur(null)} />}
      {hapus && (
        <div className="modal-overlay" onClick={() => setHapus(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-mt-h">
            <h3 id="gr-mt-h">{hapus.jenis === "materi" ? `Hapus "${hapus.item.judul}"?` : "Hapus soal latihan ini?"}</h3>
            <p>{hapus.jenis === "materi"
              ? "Siswa tidak bisa membuka materi ini lagi, dan materi ini hilang dari Misi PJJ yang memakainya. Tidak bisa dibatalkan."
              : String(hapus.item.pertanyaan || "").slice(0, 140)}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setHapus(null)}>Batal</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={konfirmasiHapus}>Hapus</button>
            </div>
          </div>
        </div>
      )}
      {pesan && <div className="gr-toast" role="status">{pesan}</div>}
    </div>
  );
}

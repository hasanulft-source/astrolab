// Astrolab — Materi & Latihan Mandiri
// Extracted from App.jsx (Wave 5)

import { useState, useEffect, useRef } from "react";
import { I } from '../components/icons';
import { shuffle } from '../utils/helpers';
import { Confirm, Card } from '../components/visual';

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
        <MateriDoneControl store={store} user={user} materiId={materi.id} dark />
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
  if (t === "youtube") return { icon: "play", color: "#dc2626", bg: "#fde8e8", label: "Video YouTube" };
  if (t === "web") return { icon: "link2", color: "#7c3aed", bg: "#f3e8ff", label: "Tautan Web" };
  return { icon: "book", color: "var(--accent-2)", bg: "var(--accent-tint)", label: null };
}

// Kontrol penyelesaian materi (misi "nonton"). Hybrid: tombol "Selesai nonton" aktif
// setelah dwell minimal (self-declare, jujur bukan verified); YouTube juga auto-selesai saat video ending.
const MATERI_DONE_DWELL = 30; // detik
function MateriDoneControl({ store, user, materiId, dark = false }) {
  const [left, setLeft] = useState(MATERI_DONE_DWELL);
  const isSiswa = store && user && user.role === "siswa";
  const done = isSiswa ? store.isMateriDone(materiId) : false;
  useEffect(() => {
    if (!isSiswa || done) return;
    const t = setInterval(() => setLeft(x => (x <= 1 ? 0 : x - 1)), 1000);
    return () => clearInterval(t);
  }, [materiId, done]);
  if (!isSiswa) return null;
  if (done) return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: dark ? "#86efac" : "var(--good)", padding: "6px 12px", borderRadius: 99, background: dark ? "rgba(134,239,172,.15)" : "var(--good-bg)", flexShrink: 0 }}><I n="check" s={13} /> Selesai</span>;
  const ready = left <= 0;
  return <button onClick={() => ready && store.markMateriDone(materiId)} disabled={!ready} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "7px 13px", borderRadius: 99, border: "none", cursor: ready ? "pointer" : "default", flexShrink: 0, background: ready ? "var(--accent)" : (dark ? "rgba(255,255,255,.18)" : "var(--surface-alt)"), color: ready ? "#fff" : (dark ? "#fff" : "var(--ink-3)") }}>
    <I n="check" s={13} /> {ready ? "Selesai nonton" : `Tunggu ${left}s`}
  </button>;
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
        <MateriDoneControl store={store} user={user} materiId={materi.id} dark />
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

async function pdfToImages(file, maxWidth = 1200, quality = 0.65) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const scale = Math.min(1, maxWidth / vp.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    pages.push(canvas.toDataURL("image/jpeg", quality));
  }
  return pages;
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
      <MateriDoneControl store={store} user={user} materiId={materi.id} />
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

  // ── Result screen ──
  if (done) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((correct / total) * 100);
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📖";
    return <div>
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}><I n="chevL" s={18} /></button>
        <div className="topbar-title" style={{ fontSize: 13 }}>Hasil Latihan</div>
        <div style={{ width: 36 }} />
      </div>
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ink)" }}>{correct}/{total}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>jawaban benar ({pct}%)</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8, marginBottom: 20 }}>{bab}</div>
        {/* Progress bar */}
        <div style={{ height: 8, background: "var(--surface-alt)", borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "var(--good)" : pct >= 50 ? "var(--accent)" : "var(--bad)", borderRadius: 4, transition: "width .5s ease" }} />
        </div>
        {/* Per-question summary */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 24 }}>
          {results.map((ok, i) => (
            <div key={i} style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", background: ok ? "var(--good-bg)" : "var(--bad-bg)", color: ok ? "var(--good)" : "var(--bad)", border: `1.5px solid ${ok ? "var(--good)" : "var(--bad)"}` }}>{i + 1}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={onBack}><I n="chevL" s={14} /> Kembali</button>
          <button className="btn btn-primary" onClick={handleRetry}><I n="rotate" s={14} /> Coba Lagi</button>
        </div>
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
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < idx ? (results[i] ? "var(--good)" : "var(--bad)") : i === idx ? "var(--accent)" : "var(--line)", transition: "background .2s" }} />
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
          {answered && i === selected && i !== soal.jawaban && <I n="x" s={16} style={{ color: "var(--bad)", flexShrink: 0 }} />}
        </button>;
      })}
      {/* Feedback */}
      {answered && <div style={{ marginTop: 16, padding: 14, borderRadius: "var(--r)", background: isCorrect ? "var(--good-bg)" : "var(--bad-bg)", border: `1px solid ${isCorrect ? "var(--good)" : "var(--bad)"}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: isCorrect ? "var(--good)" : "var(--bad)", marginBottom: soal.pembahasan ? 8 : 0 }}>
          {isCorrect ? "Benar! ✓" : `Salah — Jawaban: ${String.fromCharCode(65 + soal.jawaban)}`}
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

  const tabStyle = (active) => ({
    flex: 1, padding: "10px 0", fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? "var(--accent)" : "var(--ink-3)",
    borderBottom: active ? "2.5px solid var(--accent)" : "2.5px solid transparent",
    background: "none", border: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
    cursor: "pointer", transition: "all .15s", letterSpacing: ".01em"
  });

  return <div>
    <div className="topbar"><div style={{ width: 36 }} /><div className="topbar-title">Mandiri</div><div style={{ width: 36 }} /></div>
    {/* Tab bar */}
    <div style={{ display: "flex", borderBottom: "1px solid var(--line-soft)", background: "var(--surface)" }}>
      <button style={tabStyle(tab === "materi")} onClick={() => setTab("materi")}><I n="book" s={13} style={{ marginRight: 5, verticalAlign: -2 }} />Materi</button>
      <button style={tabStyle(tab === "latihan")} onClick={() => setTab("latihan")}><I n="edit" s={13} style={{ marginRight: 5, verticalAlign: -2 }} />Latihan Mandiri</button>
    </div>

    {tab === "materi" && <div style={{ padding: 16 }}>
      {mapelKeys.length === 0 && <Card><div className="empty empty-box"><I n="book" s={32} /><h3>Belum ada materi</h3><p>Guru belum menambahkan materi.</p></div></Card>}
      {mapelKeys.map(mapel => (
        <div key={mapel} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>{mapel}</div>
          {Object.entries(grouped[mapel]).sort((a, b) => a[0].localeCompare(b[0])).map(([bab, items]) => (
            <div key={bab} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <I n="layers" s={14} style={{ color: "var(--accent-2)" }} /> {bab}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.sort((a, b) => (a.urutan || 0) - (b.urutan || 0)).map(m => {
                  const k = materiKind(m);
                  const isPdf = (m.tipe || "pdf") === "pdf";
                  const isHd = isPdf && m.createdAt && Date.now() - m.createdAt < 7 * 86400000;
                  return <button key={m.id} onClick={() => setViewMateri(m)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r)", cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color .15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-2)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line-soft)"}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: k.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <I n={k.icon} s={18} style={{ color: k.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>{m.judul}{isHd && <span style={{ fontSize: 9, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "1px 5px", borderRadius: 4 }}>HD</span>}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{k.label || `${m.pageCount} halaman`}</div>
                    </div>
                    <I n="chevR" s={16} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                  </button>;
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>}

    {tab === "latihan" && <div style={{ padding: 16 }}>
      {latihanMapelKeys.length === 0 && <Card><div className="empty empty-box">
        <I n="edit" s={32} />
        <h3>Belum ada latihan</h3>
        <p style={{ color: "var(--ink-3)", fontSize: 13 }}>Soal latihan akan tersedia setelah tugas yang terkait materi selesai (melewati deadline).</p>
      </div></Card>}
      {latihanMapelKeys.map(mapel => (
        <div key={mapel} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>{mapel}</div>
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
              <div key={bab} style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r)", padding: "14px 16px", marginBottom: 12, boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg, var(--accent-tint), var(--accent-soft))", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <I n="edit" s={18} style={{ color: "var(--accent)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{bab}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{total} soal · sudah dilatih {seen}/{total}</div>
                  </div>
                </div>
                <div style={{ height: 7, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: selesai ? "var(--good)" : "var(--accent)", transition: "width .4s" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selesai ? "var(--good)" : "var(--ink-2)" }}>
                    {selesai ? "Semua soal sudah dilatih 🎉" : `Kerjakan ${rondeLagi} kali lagi untuk selesaikan semua`}
                  </span>
                  {selesai
                    ? <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => store.resetLatihanProgress(mapel, bab)}><I n="rotate" s={13} /> Ulang</button>
                        <button className="btn btn-soft btn-sm" onClick={() => setQuizBab({ bab, mapel, soal: pool })}>Review</button>
                      </div>
                    : <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => setQuizBab({ bab, mapel, soal: pool })}>Mulai <I n="chevR" s={13} /></button>
                  }
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>}
  </div>;
}

function MateriPdfManager({ store }) {
  const [jenTab, setJenTab] = useState("VII");
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ judul: "", mapel: "IPA", jenjang: "VII", bab: "" });
  const [tipe, setTipe] = useState("pdf"); // "pdf" | "youtube" | "web"
  const [pdfFile, setPdfFile] = useState(null);
  const [ytUrl, setYtUrl] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const materiList = store.getMateriList();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Lazy archival: hapus HD pages untuk materi lama saat guru buka halaman ini
  useEffect(() => {
    store.archiveOldMateri().catch(() => {});
  }, []);

  // Open upload with pre-selected jenjang from active tab
  function openUpload() {
    setForm(f => ({ ...f, jenjang: jenTab }));
    setTipe("pdf"); setYtUrl(""); setWebUrl(""); setPdfFile(null);
    setShowUpload(true);
  }

  async function handleUpload() {
    if (!form.judul.trim()) return alert("Judul wajib diisi");
    if (!form.bab.trim()) return alert("BAB wajib diisi");
    // Materi VIDEO YouTube — tanpa konversi, langsung simpan.
    if (tipe === "youtube") {
      const vid = parseYoutubeId(ytUrl);
      if (!vid) return alert("Link YouTube tidak valid.\nContoh: https://youtu.be/xxxxxxxxxxx");
      try {
        await store.addMateriYoutube({
          judul: form.judul.trim(), mapel: form.mapel, jenjang: form.jenjang, bab: form.bab.trim(),
          urutan: materiList.filter(m => m.mapel === form.mapel && m.jenjang === form.jenjang && m.bab === form.bab.trim()).length,
        }, vid);
        setShowUpload(false);
        setForm({ judul: "", mapel: "IPA", jenjang: jenTab, bab: "" });
        setYtUrl(""); setTipe("pdf");
      } catch (e) { alert("Gagal simpan video: " + (e?.message || "coba lagi")); }
      return;
    }
    // Materi WEB — embed URL eksternal.
    if (tipe === "web") {
      const url = normalizeEmbedUrl(webUrl);
      if (!url) return alert("Link tidak valid. Contoh: https://astrolab-a1g.pages.dev/");
      try {
        await store.addMateriWeb({
          judul: form.judul.trim(), mapel: form.mapel, jenjang: form.jenjang, bab: form.bab.trim(),
          urutan: materiList.filter(m => m.mapel === form.mapel && m.jenjang === form.jenjang && m.bab === form.bab.trim()).length,
        }, url);
        setShowUpload(false);
        setForm({ judul: "", mapel: "IPA", jenjang: jenTab, bab: "" });
        setWebUrl(""); setTipe("pdf");
      } catch (e) { alert("Gagal simpan link: " + (e?.message || "coba lagi")); }
      return;
    }
    if (!pdfFile) return alert("Pilih file PDF");
    try {
      setConverting(true);
      setProgress("Memuat PDF library...");
      await loadPdfJs();
      setProgress("Mengkonversi halaman...");
      const { hdPages, loPages, numPages } = await pdfToImagesDual(pdfFile, (i, total) => {
        setProgress(`Halaman ${i}/${total}...`);
      });
      setProgress(`${numPages} halaman siap. Menyimpan HD + arsip...`);
      await store.addMateri({
        judul: form.judul.trim(),
        mapel: form.mapel,
        jenjang: form.jenjang,
        bab: form.bab.trim(),
        urutan: materiList.filter(m => m.mapel === form.mapel && m.jenjang === form.jenjang && m.bab === form.bab.trim()).length,
      }, hdPages, loPages);
      setShowUpload(false);
      setForm({ judul: "", mapel: "IPA", jenjang: jenTab, bab: "" });
      setPdfFile(null);
      setConverting(false);
      setProgress("");
    } catch (e) {
      setConverting(false);
      setProgress("");
      alert("Gagal upload: " + (e?.message || "unknown error"));
    }
  }

  async function doDelete(id) {
    try {
      await store.deleteMateri(id);
      setConfirmDelete(null);
    } catch (e) { alert("Gagal hapus: " + e.message); }
  }

  // Filter by active jenjang tab, then group by mapel → bab
  const filtered = materiList.filter(m => m.jenjang === jenTab);
  const grouped = {};
  filtered.forEach(m => {
    const mapel = m.mapel || "Lainnya";
    if (!grouped[mapel]) grouped[mapel] = {};
    const bab = m.bab || "Umum";
    if (!grouped[mapel][bab]) grouped[mapel][bab] = [];
    grouped[mapel][bab].push(m);
  });
  const mapelKeys = Object.keys(grouped).sort();

  // Counts per jenjang for tab badges
  const countVII = materiList.filter(m => m.jenjang === "VII").length;
  const countVIII = materiList.filter(m => m.jenjang === "VIII").length;

  const jTabStyle = (active) => ({
    flex: 1, padding: "10px 0", fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? "var(--accent)" : "var(--ink-3)",
    borderBottom: active ? "2.5px solid var(--accent)" : "2.5px solid transparent",
    background: "none", border: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
    cursor: "pointer", transition: "all .15s", letterSpacing: ".01em",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
  });
  const badgeStyle = (active) => ({
    fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)",
    background: active ? "var(--accent)" : "var(--surface-alt)",
    color: active ? "#fff" : "var(--ink-3)",
    borderRadius: 10, padding: "1px 7px", lineHeight: "16px"
  });

  return <div>
    {/* Jenjang tab bar */}
    <div style={{ display: "flex", borderBottom: "1px solid var(--line-soft)", background: "var(--surface)" }}>
      <button style={jTabStyle(jenTab === "VII")} onClick={() => setJenTab("VII")}>Kelas VII <span style={badgeStyle(jenTab === "VII")}>{countVII}</span></button>
      <button style={jTabStyle(jenTab === "VIII")} onClick={() => setJenTab("VIII")}>Kelas VIII <span style={badgeStyle(jenTab === "VIII")}>{countVIII}</span></button>
    </div>

    <div style={{ padding: 16 }}>
      {/* Upload modal */}
      {showUpload && <div className="modal-overlay" onClick={() => !converting && setShowUpload(false)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
          <h3>Tambah Materi</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <div className="tabs" style={{ width: "100%" }}>
              <button className={`tab ${tipe === "pdf" ? "active" : ""}`} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }} onClick={() => setTipe("pdf")}><I n="fileText" s={13} /> PDF</button>
              <button className={`tab ${tipe === "youtube" ? "active" : ""}`} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }} onClick={() => setTipe("youtube")}><I n="play" s={13} /> YouTube</button>
              <button className={`tab ${tipe === "web" ? "active" : ""}`} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }} onClick={() => setTipe("web")}><I n="link2" s={13} /> Web</button>
            </div>
            <input className="inp" placeholder="Judul materi" value={form.judul} onChange={e => set("judul", e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <select className="inp" value={form.mapel} onChange={e => set("mapel", e.target.value)} style={{ flex: 1 }}>
                <option value="IPA">IPA</option>
                <option value="Informatika">Informatika</option>
              </select>
              <select className="inp" value={form.jenjang} onChange={e => set("jenjang", e.target.value)} style={{ flex: 1 }}>
                <option value="VII">Kelas VII</option>
                <option value="VIII">Kelas VIII</option>
              </select>
            </div>
            <input className="inp" placeholder="BAB (contoh: Bab 1 — Sistem Komputer)" value={form.bab} onChange={e => set("bab", e.target.value)} />
            {tipe === "pdf" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "2px dashed var(--line)", borderRadius: 8, cursor: "pointer", background: pdfFile ? "var(--accent-tint)" : "var(--surface)" }}>
                <I n="upload" s={16} style={{ color: "var(--accent-2)" }} />
                <span style={{ fontSize: 13, color: pdfFile ? "var(--accent-2)" : "var(--ink-2)" }}>
                  {pdfFile ? `${pdfFile.name} (${(pdfFile.size / 1024 / 1024).toFixed(1)} MB)` : "Pilih file PDF"}
                </span>
                <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) setPdfFile(e.target.files[0]); }} />
              </label>
            ) : tipe === "youtube" ? (
              <div>
                <input className="inp" placeholder="Tempel link YouTube di sini" value={ytUrl} onChange={e => setYtUrl(e.target.value)} />
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 5 }}>Contoh: https://youtu.be/xxxxxxxxxxx atau youtube.com/watch?v=xxxxxxxxxxx</div>
                {parseYoutubeId(ytUrl) && <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)", aspectRatio: "16 / 9" }}><iframe src={`https://www.youtube-nocookie.com/embed/${parseYoutubeId(ytUrl)}?rel=0`} title="Preview" style={{ width: "100%", height: "100%", border: 0 }} allowFullScreen /></div>}
              </div>
            ) : (
              <div>
                <input className="inp" placeholder="Tempel link (mis. https://astrolab-a1g.pages.dev/)" value={webUrl} onChange={e => setWebUrl(e.target.value)} />
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 5 }}>Embed halaman web apa pun (animasi HTML, simulasi, dll). Ditampilkan full-screen ke siswa.</div>
                {normalizeEmbedUrl(webUrl) && <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)", height: 200 }}><iframe src={normalizeEmbedUrl(webUrl)} title="Preview" style={{ width: "100%", height: "100%", border: 0, background: "#fff" }} /></div>}
              </div>
            )}
            {converting && <div style={{ fontSize: 12, color: "var(--accent-2)", display: "flex", alignItems: "center", gap: 8 }}><div className="spinner" style={{ width: 16, height: 16 }} /> {progress}</div>}
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowUpload(false)} disabled={converting}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={converting || (tipe === "pdf" ? !pdfFile : tipe === "youtube" ? !ytUrl.trim() : !webUrl.trim())}>
              {converting ? "Mengkonversi..." : tipe === "youtube" ? "Simpan Video" : tipe === "web" ? "Simpan Link" : "Upload & Simpan"}
            </button>
          </div>
        </div>
      </div>}

      {/* Delete confirm */}
      {confirmDelete && <Confirm title="Hapus Materi" desc={`Hapus "${confirmDelete.judul}"? Siswa tidak bisa mengakses materi ini lagi.`} onOk={() => doDelete(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />}

      {/* Materi list — grouped by mapel → bab within active jenjang tab */}
      {filtered.length === 0 ? (
        <Card><div className="empty empty-box"><I n="book" s={32} /><h3>Belum ada materi Kelas {jenTab}</h3><p>Upload PDF atau tambahkan link video YouTube untuk materi siswa.</p><button className="btn btn-primary" style={{ marginTop: 14 }} onClick={openUpload}><I n="plus" s={14} /> Tambah Materi</button></div></Card>
      ) : (
        <>
          {mapelKeys.map(mapel => (
            <div key={mapel} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-2)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent-tint)", display: "inline-grid", placeItems: "center" }}><I n="book" s={12} style={{ color: "var(--accent-2)" }} /></span>
                {mapel}
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", fontFamily: "var(--mono)", marginLeft: 2 }}>({grouped[mapel] ? Object.values(grouped[mapel]).flat().length : 0})</span>
              </div>
              {Object.entries(grouped[mapel]).sort((a, b) => a[0].localeCompare(b[0])).map(([bab, items]) => (
                <div key={bab} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}><I n="layers" s={14} style={{ color: "var(--accent-2)", marginRight: 6 }} />{bab}</div>
                  {items.sort((a, b) => (a.urutan || 0) - (b.urutan || 0)).map(m => {
                    const k = materiKind(m);
                    const isPdf = (m.tipe || "pdf") === "pdf";
                    const tgl = new Date(m.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                    return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r)", marginBottom: 6 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: k.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <I n={k.icon} s={16} style={{ color: k.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{m.judul}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                          {isPdf
                            ? <>{m.pageCount} halaman · {tgl}{m.createdAt && Date.now() - m.createdAt < 7*86400000 ? <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "1px 5px", borderRadius: 4, letterSpacing: ".03em" }}>HD</span> : <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 600, color: "var(--ink-3)", background: "var(--surface-alt)", padding: "1px 5px", borderRadius: 4 }}>Arsip</span>}</>
                            : <>{k.label} · {tgl}</>}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", padding: "5px 8px" }} onClick={() => setConfirmDelete(m)} title="Hapus materi"><I n="trash" s={14} /></button>
                    </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
          {/* Add more button at bottom */}
          <button onClick={openUpload} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 0", border: "2px dashed var(--line)", borderRadius: "var(--r)", background: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 13, fontWeight: 600, transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink-3)"; }}>
            <I n="plus" s={16} /> Tambah Materi Kelas {jenTab}
          </button>
        </>
      )}
    </div>
  </div>;
}

// ─── WRAPPER: Materi PDF + Soal Latihan (2 tab) ───
export function MateriManager({ store, navigate }) {
  const [mgrTab, setMgrTab] = useState("materi");
  const modeTab = (active) => ({
    flex: 1, padding: "11px 0", fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? "var(--accent)" : "var(--ink-3)",
    borderBottom: active ? "2.5px solid var(--accent)" : "2.5px solid transparent",
    background: "none", border: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  });
  return <div>
    <div className="topbar">
      <button className="topbar-back" onClick={() => navigate("home-guru")}><I n="chevL" s={18} /></button>
      <div className="topbar-title">Materi & Latihan</div>
      <div style={{ width: 32 }} />
    </div>
    <div style={{ display: "flex", borderBottom: "1px solid var(--line-soft)", background: "var(--surface)" }}>
      <button style={modeTab(mgrTab === "materi")} onClick={() => setMgrTab("materi")}><I n="book" s={13} />Materi PDF</button>
      <button style={modeTab(mgrTab === "latihan")} onClick={() => setMgrTab("latihan")}><I n="edit" s={13} />Soal Latihan</button>
    </div>
    {mgrTab === "materi" ? <MateriPdfManager store={store} /> : <LatihanSoalManager store={store} />}
  </div>;
}

// ─── GURU: Kelola Soal Latihan Mandiri (node /latihanSoal) ───
function LatihanSoalManager({ store }) {
  const [jenTab, setJenTab] = useState("VII");
  const [showUpload, setShowUpload] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(() => new Set()); // babKey yang lagi dibuka
  const showT = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const toggle = (k) => setExpanded(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  // Pool lengkap (sistem + upload) — SAMA PERSIS dengan yang dilihat siswa.
  const grouped = collectLatihanPool(store, jenTab);
  const mapelKeys = Object.keys(grouped).sort();
  const poolCount = (jenjang) => {
    const g = collectLatihanPool(store, jenjang);
    return Object.values(g).reduce((n, babs) => n + Object.values(babs).reduce((x, arr) => x + arr.length, 0), 0);
  };

  async function doDelete() {
    try { await store.deleteLatihanSoal(confirmDel.id); setConfirmDel(null); showT("Soal dihapus."); }
    catch (e) { showT("Gagal hapus: " + (e?.message || "coba lagi")); }
  }
  async function downloadBab(mapel, bab, soal) {
    try { await store.exportLatihanSoal(soal, { mapel, bab, jenjang: jenTab }); }
    catch (e) { showT("Gagal download: " + (e?.message || "coba lagi")); }
  }

  return <div>
    <div style={{ padding: 16 }}>
      {toast && <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: "var(--shadow)" }}>{toast}</div>}

      {/* Toolbar: jenjang (pill, kiri) + aksi (kanan) — satu baris, ringkas */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="tabs">
          {["VII", "VIII"].map(j => {
            const active = jenTab === j;
            return <button key={j} className={`tab ${active ? "active" : ""}`} onClick={() => setJenTab(j)} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              Kelas {j}
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: active ? "var(--accent-2)" : "var(--ink-4)" }}>{poolCount(j)}</span>
            </button>;
          })}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-soft btn-sm" onClick={() => store.downloadTemplateSoal()} title="Download template Excel"><I n="download" s={13} /> Template</button>
          <button className="btn btn-soft btn-sm" onClick={() => setShowUpload(true)} title="Import dari Excel"><I n="upload" s={13} /> Import</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowManual(true)}><I n="plus" s={13} /> Tambah</button>
        </div>
      </div>
      {/* Hint tipis — tanpa box berat */}
      <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 16, lineHeight: 1.5 }}>
        Hanya Pilihan Ganda. Digabung dengan soal dari tugas yang sudah lewat deadline, muncul di <span style={{ color: "var(--ink-3)", fontWeight: 600 }}>Latihan Mandiri</span> siswa.
      </div>

      {showUpload && <LatihanUploadModal store={store} defaultJenjang={jenTab} onClose={() => setShowUpload(false)} onSuccess={(msg) => { setShowUpload(false); showT(msg); }} />}
      {showManual && <LatihanManualModal store={store} defaultJenjang={jenTab} onClose={() => setShowManual(false)} onSuccess={() => { setShowManual(false); showT("Soal ditambahkan."); }} />}
      {confirmDel && <Confirm title="Hapus soal latihan?" desc={(confirmDel.pertanyaan || "").slice(0, 80)} onOk={doDelete} onCancel={() => setConfirmDel(null)} />}

      {mapelKeys.length === 0
        ? <Card><div className="empty empty-box"><I n="edit" s={32} /><h3>Belum ada soal latihan Kelas {jenTab}</h3><p>Upload soal lewat tombol di atas, atau soal akan muncul otomatis dari tugas yang sudah lewat deadline.</p></div></Card>
        : mapelKeys.map(m => {
          const babEntries = Object.entries(grouped[m]).sort((a, b) => a[0].localeCompare(b[0]));
          return (
          <div key={m} style={{ marginBottom: 22 }}>
            {/* Header mapel */}
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}><I n={m === "Informatika" ? "code" : "atom"} s={15} style={{ color: "#fff" }} /></span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", letterSpacing: "-.01em" }}>{m}</span>
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-4)" }}>{babEntries.length} bab</span>
            </div>

            {babEntries.map(([bab, soal], bi) => {
              const key = `${m}||${bab}`;
              const open = expanded.has(key);
              const nUpload = soal.filter(s => s._sumber === "upload").length;
              const nSistem = soal.length - nUpload;
              return (
                <div key={bab} style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r)", boxShadow: "var(--shadow-sm)", marginBottom: 10, overflow: "hidden" }}>
                  {/* Header BAB — klik buat buka/tutup */}
                  <div onClick={() => toggle(key)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer", background: open ? "var(--accent-tint)" : "transparent", transition: "background .15s" }}>
                    <span style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{bi + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bab}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--mono)" }}>{nSistem} sistem · {nUpload} upload</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--accent-2)", background: "var(--accent-soft)", borderRadius: 99, padding: "3px 11px", flexShrink: 0 }}>{soal.length}</span>
                    <button onClick={(e) => { e.stopPropagation(); downloadBab(m, bab, soal); }} title="Unduh Excel BAB ini" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-2)", flexShrink: 0 }}><I n="download" s={14} /></button>
                    <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: open ? "var(--accent-2)" : "var(--ink-3)", flexShrink: 0 }}><I n={open ? "minimize" : "maximize"} s={15} /></span>
                  </div>

                  {/* Isi soal — cuma dirender kalau dibuka; scroll di dalam, bukan di halaman */}
                  {open && (
                    <div style={{ borderTop: "1px solid var(--line-soft)", maxHeight: 440, overflowY: "auto" }}>
                      {soal.map((s, si) => {
                        const isUpload = s._sumber === "upload";
                        return (
                          <div key={s.id || si} style={{ display: "flex", gap: 10, padding: "11px 14px 11px 11px", borderBottom: "1px solid var(--line-soft)", borderLeft: `3px solid ${isUpload ? "var(--accent)" : "var(--line)"}` }}>
                            <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-4)", flexShrink: 0, width: 22, textAlign: "right", paddingTop: 1 }}>{si + 1}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: "var(--ink)" }}>{s.pertanyaan}</div>
                              <div style={{ fontSize: 11, color: "var(--good)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}><I n="check" s={11} /> {String.fromCharCode(65 + (s.jawaban || 0))}. {(s.opsi || [])[s.jawaban || 0]}</div>
                            </div>
                            {isUpload && s.id
                              ? <button onClick={() => setConfirmDel(s)} title="Hapus soal upload" style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "var(--bad-bg)", color: "var(--bad)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, alignSelf: "flex-start" }}><I n="trash" s={12} /></button>
                              : <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--ink-4)", flexShrink: 0, alignSelf: "flex-start", paddingTop: 2 }}>tugas</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })
      }
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

// Astrolab — Materi & Latihan Mandiri
// Extracted from App.jsx (Wave 5)

import { useState, useEffect, useRef } from "react";
import { I } from '../components/icons';
import { shuffle } from '../utils/helpers';
import { Confirm, Card } from '../components/visual';

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

function MateriViewer({ materi, store, onBack }) {
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

function LatihanQuiz({ bab, soalPool, onBack }) {
  const MAX_SOAL = 10;
  const [soalList] = useState(() => {
    // Deduplicate by pertanyaan text (same question from different tugas)
    const seen = new Set();
    const unique = [];
    for (const s of soalPool) {
      const key = s.pertanyaan.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); unique.push(s); }
    }
    return shuffle([...unique]).slice(0, MAX_SOAL);
  });
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]); // array of booleans
  const [done, setDone] = useState(false);

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

  // ── Collect PG questions from completed tugas, grouped by mapel → bab ──
  const allTugas = store.getTugas();
  const now = Date.now();
  const latihanMap = {}; // { "mapel||bab": [...pgSoal] }
  allTugas.forEach(t => {
    if (t.jenjang !== user.jenjang) return;
    if (!t.materi?.trim()) return;
    if (!t.soal?.length) return;
    // Only include tugas past deadline (prevent answer leaking)
    if (!t.deadline) return;
    const dl = new Date(t.deadline).getTime();
    if (isNaN(dl) || dl > now) return;
    const pgSoal = t.soal.filter(s => s.type === "pg" && s.pertanyaan?.trim() && s.opsi?.length >= 2 && s.jawaban !== undefined && s.jawaban !== null);
    if (!pgSoal.length) return;
    const key = `${t.mapel || "Lainnya"}||${t.materi.trim()}`;
    if (!latihanMap[key]) latihanMap[key] = [];
    latihanMap[key].push(...pgSoal.map(s => ({ ...s, pembahasan: s.pembahasan || "" })));
  });

  // Group for display: { mapel: { bab: [...soal] } }
  const latihanGrouped = {};
  Object.entries(latihanMap).forEach(([key, soal]) => {
    const [mapel, bab] = key.split("||");
    if (!latihanGrouped[mapel]) latihanGrouped[mapel] = {};
    latihanGrouped[mapel][bab] = soal;
  });
  const latihanMapelKeys = Object.keys(latihanGrouped).sort();

  // Early returns for sub-views (after all hooks)
  if (quizBab) return <LatihanQuiz bab={quizBab.bab} soalPool={quizBab.soal} onBack={() => setQuizBab(null)} />;
  if (viewMateri) return <MateriViewer materi={viewMateri} store={store} onBack={() => setViewMateri(null)} />;

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
    <div style={{ display: "flex", borderBottom: "1px solid var(--line-soft)", background: "var(--card)" }}>
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
                  const isHd = m.createdAt && Date.now() - m.createdAt < 7 * 86400000;
                  return <button key={m.id} onClick={() => setViewMateri(m)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--card)", border: "1px solid var(--line-soft)", borderRadius: "var(--r)", cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color .15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-2)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line-soft)"}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--accent-tint)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <I n="book" s={18} style={{ color: "var(--accent-2)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>{m.judul}{isHd && <span style={{ fontSize: 9, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "1px 5px", borderRadius: 4 }}>HD</span>}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{m.pageCount} halaman</div>
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
          {Object.entries(latihanGrouped[mapel]).sort((a, b) => a[0].localeCompare(b[0])).map(([bab, soal]) => (
            <button key={bab} onClick={() => setQuizBab({ bab, soal })}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px", background: "var(--card)", border: "1px solid var(--line-soft)", borderRadius: "var(--r)", cursor: "pointer", textAlign: "left", width: "100%", marginBottom: 8, transition: "border-color .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line-soft)"}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg, var(--accent-tint), var(--accent-soft))", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <I n="edit" s={18} style={{ color: "var(--accent)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{bab}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{soal.length} soal tersedia</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "var(--accent-tint)", padding: "4px 10px", borderRadius: 12, flexShrink: 0 }}>Mulai</span>
            </button>
          ))}
        </div>
      ))}
    </div>}
  </div>;
}

export function MateriManager({ store, navigate }) {
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ judul: "", mapel: "IPA", jenjang: "VII", bab: "" });
  const [pdfFile, setPdfFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const materiList = store.getMateriList();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Lazy archival: hapus HD pages untuk materi lama saat guru buka halaman ini
  useEffect(() => {
    store.archiveOldMateri().catch(() => {});
  }, []);

  async function handleUpload() {
    if (!form.judul.trim()) return alert("Judul wajib diisi");
    if (!form.bab.trim()) return alert("BAB wajib diisi");
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
      setForm({ judul: "", mapel: "IPA", jenjang: "VII", bab: "" });
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

  // Group by mapel → jenjang → bab
  const grouped = {};
  materiList.forEach(m => {
    const mk = `${m.mapel} ${m.jenjang}`;
    if (!grouped[mk]) grouped[mk] = {};
    const bab = m.bab || "Umum";
    if (!grouped[mk][bab]) grouped[mk][bab] = [];
    grouped[mk][bab].push(m);
  });

  return <div>
    <div className="topbar">
      <button className="topbar-back" onClick={() => navigate("home-guru")}><I n="chevL" s={18} /></button>
      <div className="topbar-title">Materi Latihan Mandiri</div>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-2)" }} onClick={() => setShowUpload(true)}><I n="plus" s={22} /></button>
    </div>
    <div style={{ padding: 16 }}>
      {/* Upload modal */}
      {showUpload && <div className="modal-overlay" onClick={() => !converting && setShowUpload(false)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
          <h3>Upload Materi PDF</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
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
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "2px dashed var(--line)", borderRadius: 8, cursor: "pointer", background: pdfFile ? "var(--accent-tint)" : "var(--surface)" }}>
              <I n="upload" s={16} style={{ color: "var(--accent-2)" }} />
              <span style={{ fontSize: 13, color: pdfFile ? "var(--accent-2)" : "var(--ink-2)" }}>
                {pdfFile ? `${pdfFile.name} (${(pdfFile.size / 1024 / 1024).toFixed(1)} MB)` : "Pilih file PDF"}
              </span>
              <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) setPdfFile(e.target.files[0]); }} />
            </label>
            {converting && <div style={{ fontSize: 12, color: "var(--accent-2)", display: "flex", alignItems: "center", gap: 8 }}><div className="spinner" style={{ width: 16, height: 16 }} /> {progress}</div>}
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowUpload(false)} disabled={converting}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={converting || !pdfFile}>
              {converting ? "Mengkonversi..." : "Upload & Simpan"}
            </button>
          </div>
        </div>
      </div>}

      {/* Delete confirm */}
      {confirmDelete && <Confirm title="Hapus Materi" desc={`Hapus "${confirmDelete.judul}"? Siswa tidak bisa mengakses materi ini lagi.`} onOk={() => doDelete(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />}

      {/* Materi list */}
      {materiList.length === 0 ? (
        <Card><div className="empty empty-box"><I n="book" s={32} /><h3>Belum ada materi</h3><p>Upload PDF untuk materi latihan mandiri siswa.</p><button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowUpload(true)}><I n="upload" s={14} /> Upload PDF</button></div></Card>
      ) : (
        Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([mk, babs]) => (
          <div key={mk} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>{mk}</div>
            {Object.entries(babs).sort((a, b) => a[0].localeCompare(b[0])).map(([bab, items]) => (
              <div key={bab} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}><I n="layers" s={14} style={{ color: "var(--accent-2)", marginRight: 6 }} />{bab}</div>
                {items.sort((a, b) => (a.urutan || 0) - (b.urutan || 0)).map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--card)", border: "1px solid var(--line-soft)", borderRadius: "var(--r)", marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-tint)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <I n="book" s={16} style={{ color: "var(--accent-2)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.judul}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{m.pageCount} halaman · {new Date(m.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}{m.createdAt && Date.now() - m.createdAt < 7*86400000 ? <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "1px 5px", borderRadius: 4, letterSpacing: ".03em" }}>HD</span> : <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 600, color: "var(--ink-3)", background: "var(--surface-alt)", padding: "1px 5px", borderRadius: 4 }}>Arsip</span>}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", padding: "5px 8px" }} onClick={() => setConfirmDelete(m)} title="Hapus materi"><I n="trash" s={14} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  </div>;
}

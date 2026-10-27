// Astrolab — Welcome (pre-login profile film + login panel)
// Wraps the existing <LoginScreen>. The three.js scene is loaded on demand from
// components/welcomeScene.js, so it never weighs on the main bundle.
// Falls back to the plain login when WebGL is missing, Save-Data is on, or the scene fails to load.
// Desktop devices that logged in before open with the login card already showing.
import { useEffect, useRef, useState } from "react";
import "../styles/welcome.css";

const SEEN_KEY = "astrolab-intro-seen";
const NARROW_MQ = "(max-width: 899px), (max-aspect-ratio: 1/1)";

function readSeen() { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; } }
function writeSeen() { try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ } }
function isNarrow() { return typeof window !== "undefined" && window.matchMedia(NARROW_MQ).matches; }
function canUse3D() {
  if (typeof window === "undefined") return false;
  if (navigator.connection && navigator.connection.saveData) return false;
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

function Mark({ size = 24 }) {
  // Same shapes as LogoBold (components/visual.jsx)
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g transform="translate(16, 17)">
        <polygon points="0,-11 5.5,-3.5 0,1 -5.5,-3.5" fill="#09637E" />
        <polygon points="-5.5,-3.5 -2,3.5 -8,9 -11.5,2" fill="#088395" />
        <polygon points="5.5,-3.5 11.5,2 8,9 2,3.5" fill="#088395" />
        <rect x="-3.5" y="1" width="7" height="2.2" rx="0.5" fill="#7AB2B2" />
      </g>
    </svg>
  );
}
const Arrow = () => <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Play = () => <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>;
const Pause = () => <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></g></svg>;

const CHAPTERS = ["Sekolah", "Tugas", "Kuis", "Lab", "Level", "Laporan", "Ringkas"];

function Panels({ setRef, onLogin }) {
  return (
    <>
      <article className="wl-panel" data-step="0" ref={setRef(0)}>
        <p className="wl-eyebrow">Astrolab Classroom · IPA &amp; Informatika SMP</p>
        <h1 className="wl-h">Kelas IPA,<span>Satu Alur Belajar.</span></h1>
        <p className="wl-lede">Tugas, kuis, simulasi, dan nilai akhir ada di satu aplikasi. Siswa tahu apa yang harus dikerjakan hari ini, guru tahu siapa yang perlu dibantu.</p>
        <dl className="wl-stats">
          <div><dt>20</dt><dd>level XP, Nebula sampai Commander</dd></div>
          <div><dt>78</dt><dd>simulasi interaktif AstroLab X</dd></div>
          <div><dt>6</dt><dd>komponen nilai akhir per mapel</dd></div>
        </dl>
        <button className="wl-cta" onClick={onLogin}>Masuk sekarang <Arrow /></button>
      </article>

      <article className="wl-panel" data-step="1" ref={setRef(1)}>
        <p className="wl-eyebrow">Langkah 1 · Tugas</p>
        <h2 className="wl-h">Buka Ponsel,<span>Tugas Sudah Menunggu.</span></h2>
        <p className="wl-lede">Guru membagikan tugas per materi lengkap dengan tenggat. Siswa langsung melihat apa yang harus selesai hari ini.</p>
        <div className="wl-ui">
          <div className="wl-ui-head"><div><div className="wl-ui-title">Tugas minggu ini</div><div className="wl-ui-sub">IPA · Kelas VII</div></div></div>
          <div className="wl-row"><span>Pengukuran Panjang · Kuis</span><span className="wl-chip warn">Hari ini</span></div>
          <div className="wl-row"><span>Besaran &amp; Satuan · LKPD 2</span><span className="wl-chip">2 hari lagi</span></div>
          <div className="wl-row"><span>Massa Jenis · Praktikum</span><span className="wl-chip">5 hari lagi</span></div>
        </div>
      </article>

      <article className="wl-panel" data-step="2" ref={setRef(2)}>
        <p className="wl-eyebrow">Langkah 2 · Kuis</p>
        <h2 className="wl-h">Kirim Jawaban,<span>Nilai Langsung Keluar.</span></h2>
        <p className="wl-lede">Pilihan ganda, benar-salah, menjodohkan, sampai soal pseudocode dinilai otomatis begitu jawaban dikirim.</p>
        <div className="wl-ui">
          <div className="wl-ui-head"><div><div className="wl-ui-title">Kuis Pengukuran</div><div className="wl-ui-sub">dinilai otomatis</div></div></div>
          <div className="wl-big"><b>90</b><em>18 dari 20 benar</em></div>
          <div className="wl-row"><span>Pilihan ganda</span><span>9/10</span></div>
          <div className="wl-row"><span>Benar-salah</span><span>5/5</span></div>
          <div className="wl-row"><span>Menjodohkan</span><span>2/3</span></div>
          <div className="wl-row"><span>PG kompleks</span><span>2/2</span></div>
        </div>
      </article>

      <article className="wl-panel" data-step="3" ref={setRef(3)}>
        <p className="wl-eyebrow">Langkah 3 · Lab virtual</p>
        <h2 className="wl-h">Fenomena Diukur,<span>Jadi Angka.</span></h2>
        <p className="wl-lede">Simulasi AstroLab X mengajak siswa mengukur, mencatat data, lalu membaca polanya di grafik.</p>
        <div className="wl-ui">
          <div className="wl-ui-head"><div><div className="wl-ui-title">Simulasi bandul sederhana</div><div className="wl-ui-sub">g = 9,8 m/s²</div></div></div>
          <div className="wl-row wl-th"><span>Panjang tali L</span><span>Periode T</span></div>
          <div className="wl-row"><span>25 cm</span><span>1,00 s</span></div>
          <div className="wl-row"><span>50 cm</span><span>1,42 s</span></div>
          <div className="wl-row"><span>75 cm</span><span>1,74 s</span></div>
          <div className="wl-row"><span>100 cm</span><span>2,01 s</span></div>
        </div>
      </article>

      <article className="wl-panel" data-step="4" ref={setRef(4)}>
        <p className="wl-eyebrow">Langkah 4 · Level</p>
        <h2 className="wl-h">Rajin Mengerjakan,<span>Naik Level.</span></h2>
        <p className="wl-lede">Setiap tugas yang selesai menambah XP. Lima tingkat dari Nebula sampai Commander, masing-masing punya empat sub-level.</p>
        <div className="wl-ui">
          <div className="wl-ui-head"><div><div className="wl-ui-title">Planet II</div><div className="wl-ui-sub">streak 6 hari</div></div></div>
          <div className="wl-big"><b>1.520</b><em>XP</em></div>
          <div className="wl-bar" role="img" aria-label="34 persen menuju Planet III"><i style={{ width: "34%" }} /></div>
          <div className="wl-row wl-norule"><span>Menuju Planet III</span><span>230 XP lagi</span></div>
        </div>
      </article>

      <article className="wl-panel" data-step="5" ref={setRef(5)}>
        <p className="wl-eyebrow">Langkah 5 · Laporan</p>
        <h2 className="wl-h">Guru Memantau,<span>Laporan Siap Cetak.</span></h2>
        <p className="wl-lede">Nilai akhir dihitung per mapel dari sumatif, tugas, kuis, portofolio, STS, dan SAS, lalu disusun jadi laporan untuk orang tua.</p>
        <div className="wl-ui">
          <div className="wl-ui-head"><div><div className="wl-ui-title">Rekap kelas VII</div><div className="wl-ui-sub">Semester Ganjil 2026/2027</div></div></div>
          <div className="wl-row"><span>Rata-rata kelas</span><span>81,4</span></div>
          <div className="wl-row"><span>Tuntas (nilai ≥ 70)</span><span>27 dari 31 siswa</span></div>
        </div>
      </article>

      <article className="wl-panel" data-step="6" ref={setRef(6)}>
        <p className="wl-eyebrow">Satu kelas · satu alur</p>
        <h2 className="wl-h">Semua Jejak Belajar,<span>Tersimpan Rapi.</span></h2>
        <p className="wl-lede">Dari tugas pertama sampai laporan semester, datanya mengalir ke tempat yang sama. Guru tidak perlu menyalin nilai dari banyak buku.</p>
        <button className="wl-cta" onClick={onLogin}>Masuk sekarang <Arrow /></button>
      </article>
    </>
  );
}

export function Welcome({ children }) {
  const [mode] = useState(() => canUse3D() ? "film" : "plain");
  const [narrow, setNarrow] = useState(isNarrow);
  const [open, setOpen] = useState(() => !isNarrow() && readSeen());
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(true);
  const canvasRef = useRef(null), paneRef = useRef(null), tcRef = useRef(null), ctrlRef = useRef(null), loginRef = useRef(null);
  const panelEls = useRef([]), navEls = useRef([]), fillEls = useRef([]);
  const setPanel = i => el => { panelEls.current[i] = el; };
  const stateRef = useRef({ open, narrow });
  stateRef.current = { open, narrow };

  useEffect(() => {
    const mq = window.matchMedia(NARROW_MQ);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (mode !== "film") return;
    let dead = false, ctrl = null;
    import("../components/welcomeScene.js")
      .then(m => m.createWelcomeScene({
        canvas: canvasRef.current, pane: paneRef.current, lowPower: isNarrow(),
        ui: { panels: panelEls.current, navItems: navEls.current, fills: fillEls.current, tc: tcRef.current },
      }))
      .then(c => {
        if (dead) { c.dispose(); return; }
        ctrl = c; ctrlRef.current = c;
        if (c.reducedMotion) setPlaying(false);
        setLayoutFor(c);
      })
      .catch(e => { console.error("[Welcome] scene gagal dimuat:", e); if (!dead) setFailed(true); });
    return () => { dead = true; ctrlRef.current = null; if (ctrl) ctrl.dispose(); };
  }, [mode]);

  function setLayoutFor(c) {
    if (!c) return;
    const { open: o, narrow: n } = stateRef.current;
    c.setLayout(n ? "portrait" : o ? "login" : "copy");
  }
  useEffect(() => { setLayoutFor(ctrlRef.current); }, [open, narrow]);
  useEffect(() => { if (ctrlRef.current) ctrlRef.current.setPlaying(playing); }, [playing]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => { const inp = loginRef.current?.querySelector("input"); if (inp && !narrow) inp.focus({ preventScroll: true }); }, 450);
      return () => clearTimeout(t);
    }
  }, [open, narrow]);

  useEffect(() => {
    if (mode !== "film") return;
    const onKey = ev => {
      const tag = ev.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || ev.target?.isContentEditable) return;
      if (ev.key === "Escape" && open) { setOpen(false); return; }
      if (open && narrow) return;
      if (ev.code === "Space") { ev.preventDefault(); setPlaying(p => !p); }
      else if (ev.key === "ArrowRight") ctrlRef.current?.step(1);
      else if (ev.key === "ArrowLeft") ctrlRef.current?.step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, open, narrow]);

  const openLogin = () => { writeSeen(); setOpen(true); };

  if (mode === "plain" || failed) {
    return children;
  }

  return (
    <div className={`wl${open ? " is-open" : ""}${narrow ? " is-narrow" : ""}`}>
      <section className="wl-film" ref={paneRef} aria-label="Profil Astrolab Classroom">
        <canvas ref={canvasRef} className="wl-canvas" aria-hidden="true" />
        <div className="wl-veil" />
        <header className="wl-top">
          <div className="wl-brand"><Mark size={26} /><span>astrolab</span><small>classroom</small></div>
          <button className="wl-cta wl-cta-top" onClick={openLogin} tabIndex={open ? -1 : 0}>Masuk sekarang <Arrow /></button>
        </header>
        <div className="wl-copy" aria-hidden={open ? "true" : undefined}>
          <Panels setRef={setPanel} onLogin={openLogin} />
        </div>
        <nav className="wl-steps" aria-label="Kontrol pemutaran dan bagian cerita">
          <button className="wl-pbtn" onClick={() => setPlaying(p => !p)} aria-label={playing ? "Jeda" : "Putar"}>{playing ? <Pause /> : <Play />}</button>
          <span className="wl-tc" ref={tcRef}>0:00 / 0:42</span>
          <ol>
            {CHAPTERS.map((c, i) => (
              <li key={c} ref={el => { navEls.current[i] = el; }}>
                <button onClick={() => ctrlRef.current?.seek(i)}>
                  <span className="wl-lbl"><b>{String(i).padStart(2, "0")}</b>{c}</span>
                  <span className="wl-trk"><i ref={el => { fillEls.current[i] = el; }} /></span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      <aside className="wl-login" ref={loginRef} aria-label="Masuk" aria-hidden={open ? undefined : "true"} inert={!open}>
        <div className="wl-login-in">
          <button className="wl-back" onClick={() => setOpen(false)}>Tutup</button>
          {children}
        </div>
      </aside>
    </div>
  );
}

// Astrolab — Mode Ujian (Nov 2026)
// Ujian terawas di kelas: soal tampil di HP/PC siswa, kunci jawaban tetap di perangkat guru.
// Lapisan pengawasan: layar penuh + deteksi keluar aplikasi + detak (heartbeat) + alarm ke guru.
// Di lab komputer, buka lewat Safe Exam Browser (SEB) supaya siswa benar-benar tidak bisa pindah aplikasi.
// Data & aturan Firebase: lihat utils/ujian-store.js dan database.rules.json.
import { useState, useEffect, useRef, useMemo } from "react";
import { I } from "../components/icons";
import { withTimeout } from "../utils/helpers";
import { importSoalFromExcel, downloadTemplateSoal } from "../utils/excel";
import {
  KKTP, LABEL_TIPE, HURUF, saringSoalUjian, gabungKunci, susunUntukSiswa, terjawab, hitungLaporanUjian,
  nilaiUjian, labelJawaban, LABEL_STATUS, fmtDurasi, fmtJam,
} from "../utils/ujian-nilai";
import "../styles/guru.css";
import "../styles/ujian.css";

// ─── util kecil ───
const fmtSisa = ms => {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), d = s % 60;
  const p = n => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(d)}` : `${p(m)}:${p(d)}`;
};
const tglJam = ms => (ms ? new Date(ms).toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "—");
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Jam server yang berdetak tiap detik (pakai ref supaya selisih jam server terbaru yang dipakai)
function useDetik(store, jalan = true) {
  const sRef = useRef(store);
  sRef.current = store;
  const [now, setNow] = useState(() => store.waktuServer());
  useEffect(() => {
    if (!jalan) return;
    setNow(sRef.current.waktuServer());
    const t = setInterval(() => setNow(sRef.current.waktuServer()), 1000);
    return () => clearInterval(t);
  }, [jalan]);
  return now;
}

const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const fsBisa = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
async function masukFs() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    return true;
  } catch { return false; }
}
function keluarFs() {
  try { if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch {}
}

// Gambar soal → JPEG maks. 1000 px, latar putih (PNG transparan tidak jadi hitam)
function kompresGambar(file, maxW = 1000, q = 0.8) {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onerror = gagal;
    r.onload = e => {
      const img = new Image();
      img.onerror = () => gagal(new Error("File bukan gambar"));
      img.onload = () => {
        const k = Math.min(1, maxW / img.width), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL("image/jpeg", q));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}
const ukuranMB = soal => Math.round((soal || []).reduce((n, s) => n + (s.gambar ? s.gambar.length * 0.75 : 0), 0) / 1e5) / 10;

// Bunyi alarm tanpa file audio (WebAudio). Butuh satu klik guru dulu supaya browser mengizinkan suara.
let audioCtx = null;
function siapkanSuara() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {}
}
function bunyiAlarm() {
  try {
    siapkanSuara();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    [0, 0.28, 0.56].forEach((dt, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "square"; o.frequency.value = i % 2 ? 660 : 990;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.24);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + dt); o.stop(t0 + dt + 0.26);
    });
  } catch {}
}

// ═══════════════════════════════════════════
// GURU
// ═══════════════════════════════════════════

export function UjianGuru({ store }) {
  const [buka, setBuka] = useState(null); // null | "baru" | id ujian
  const [edit, setEdit] = useState(null); // id ujian draf yang diedit
  useEffect(() => {
    store.pantauUjian(buka && buka !== "baru" ? buka : null);
    return () => store.pantauUjian(null);
  }, [buka]);
  if (buka === "baru" || edit) return <FormUjian store={store} editId={edit} onBatal={() => { setEdit(null); if (buka === "baru") setBuka(null); }} onSimpan={id => { setEdit(null); setBuka(id); }} />;
  if (buka) return <DetailUjian store={store} id={buka} onKembali={() => setBuka(null)} onEdit={() => setEdit(buka)} />;
  return <DaftarUjian store={store} onBuka={setBuka} />;
}

function chipStatus(u) {
  if (u.status === "aktif") return <span className="gr-chip teal">Berjalan</span>;
  if (u.status === "selesai") return <span className="gr-chip muted">Selesai{u.hasilTerbit ? " · hasil terbit" : ""}</span>;
  return <span className="gr-chip amber">Draf</span>;
}

function DaftarUjian({ store, onBuka }) {
  const list = store.getUjianList();
  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">Ujian terawas · kunci jawaban aman di perangkat guru</span>
          <h1>Mode Ujian</h1>
        </div>
        <button type="button" className="gr-btn" onClick={() => onBuka("baru")}><I n="plus" s={15} /> Buat ujian</button>
      </div>
      {list.length === 0 ? (
        <div className="gr-card gr-mt-kosong" style={{ padding: 20 }}>
          <b>Belum ada ujian</b>
          <p className="gr-muted">Buat ujian dari file Excel soal (format sama dengan template Bank Soal). Tipe yang dipakai: pilihan ganda, benar/salah, dan PG kompleks.</p>
        </div>
      ) : (
        <div className="gr-card list">
          {list.map(u => (
            <button key={u.id} type="button" className="uj-row" onClick={() => onBuka(u.id)}>
              <span className="uj-row-main">
                <b>{u.judul || "(tanpa judul)"}</b>
                <small>Kelas {u.jenjang} · {u.mapel} · {(u.soal || []).length} soal · {u.durasi} menit{u.mulaiAt ? ` · ${tglJam(u.mulaiAt)}` : ""}</small>
              </span>
              {chipStatus(u)}
              <I n="chevR" s={16} style={{ color: "var(--ink-4)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FormUjian({ store, editId, onBatal, onSimpan }) {
  const lama = editId ? store.getUjian(editId) : null;
  const [f, setF] = useState(() => ({
    judul: lama?.judul || "", jenjang: lama?.jenjang || "VII", mapel: lama?.mapel || "IPA",
    durasi: lama?.durasi || 90, acakSoal: lama ? !!lama.acakSoal : true, acakOpsi: lama ? !!lama.acakOpsi : false,
  }));
  const [soal, setSoal] = useState(() => (lama ? gabungKunci(lama.soal, store.getKunciUjian(editId)) : []));
  const [soalBaru, setSoalBaru] = useState(false);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [lihat, setLihat] = useState(false);
  const fileRef = useRef(null);
  const ubah = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function impor(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(""); setInfo("Membaca file…");
    try {
      const { ok, dilewati } = saringSoalUjian(await importSoalFromExcel(file));
      if (!ok.length) { setInfo(""); setErr("Tidak ada soal PG / Benar-Salah / PG kompleks yang terbaca. Pastikan memakai template soal Astrolab."); return; }
      const gbrLama = new Map(soal.filter(s => s.gambar).map(s => [String(s.pertanyaan).trim(), s.gambar]));
      let dipertahankan = 0;
      const baru = ok.map(s => { const g = gbrLama.get(String(s.pertanyaan).trim()); if (g) { dipertahankan++; return { ...s, gambar: g }; } return s; });
      setSoal(baru); setSoalBaru(true); setLihat(true);
      const per = Object.entries(ok.reduce((m, s) => ({ ...m, [s.type]: (m[s.type] || 0) + 1 }), {})).map(([t, n]) => `${LABEL_TIPE[t]} ${n}`).join(", ");
      const lewat = Object.entries(dilewati).map(([t, n]) => `${t} ${n}`).join(", ");
      setInfo(`${ok.length} soal terbaca (${per}).${lewat ? ` Dilewati karena tidak bisa dinilai otomatis / datanya tidak lengkap: ${lewat}.` : ""}${dipertahankan ? ` ${dipertahankan} gambar lama dipasang lagi ke soal yang teksnya sama.` : ""} Gambar bisa ditambahkan per soal di daftar di bawah.`);
    } catch (x) { setInfo(""); setErr("Gagal membaca file: " + (x?.message || "coba lagi")); }
  }

  async function pasangGambar(i, file) {
    if (!file) return;
    setErr("");
    try {
      const g = await kompresGambar(file);
      setSoal(p => p.map((s, k) => (k === i ? { ...s, gambar: g } : s)));
      setSoalBaru(true);
    } catch (x) { setErr("Gagal memproses gambar: " + (x?.message || "coba file lain")); }
  }
  const hapusGambar = i => { setSoal(p => p.map((s, k) => (k === i ? { ...s, gambar: null } : s))); setSoalBaru(true); };
  const mb = ukuranMB(soal);

  async function simpan() {
    setErr("");
    if (!f.judul.trim()) return setErr("Judul ujian wajib diisi.");
    if (!soal.length) return setErr("Impor soal dari Excel dulu.");
    const durasi = Math.round(Number(f.durasi));
    if (!(durasi >= 5 && durasi <= 300)) return setErr("Durasi 5–300 menit.");
    setSibuk(true);
    try {
      const data = { judul: f.judul.trim(), jenjang: f.jenjang, mapel: f.mapel, durasi, acakSoal: !!f.acakSoal, acakOpsi: !!f.acakOpsi };
      let id = editId;
      if (editId) await withTimeout(store.ubahUjian(editId, data, soalBaru ? soal : null));
      else id = await withTimeout(store.buatUjian(data, soal));
      onSimpan(id);
    } catch (x) { setErr("Gagal menyimpan: " + (x?.message || "coba lagi")); }
    setSibuk(false);
  }

  return (
    <div className="page gr">
      <button type="button" className="gr-link back" onClick={onBatal}><I n="chevL" s={14} /> Mode Ujian</button>
      <div className="gr-head"><div><span className="gr-mono">{editId ? "Ubah draf" : "Ujian baru"}</span><h1>{editId ? "Ubah ujian" : "Buat ujian"}</h1></div></div>

      <section className="gr-card uj-form">
        <label><span>Judul</span><input className="inp" value={f.judul} onChange={e => ubah("judul", e.target.value)} placeholder="Contoh: SAS Ganjil IPA Kelas VII" /></label>
        <div className="uj-form-row">
          <label><span>Kelas</span>
            <div className="gr-seg">{["VII", "VIII"].map(j => <button key={j} type="button" className={f.jenjang === j ? "on" : ""} onClick={() => ubah("jenjang", j)}>Kelas {j}</button>)}</div>
          </label>
          <label><span>Mapel</span>
            <div className="gr-seg">{["IPA", "Informatika"].map(m => <button key={m} type="button" className={f.mapel === m ? "on" : ""} onClick={() => ubah("mapel", m)}>{m}</button>)}</div>
          </label>
          <label><span>Durasi (menit)</span><input className="inp" type="number" min={5} max={300} value={f.durasi} onChange={e => ubah("durasi", e.target.value)} style={{ maxWidth: 120 }} /></label>
        </div>
        <label className="uj-cek"><input type="checkbox" checked={f.acakSoal} onChange={e => ubah("acakSoal", e.target.checked)} /><span><b>Acak urutan soal</b> per siswa (tetap sama kalau siswa me-refresh)</span></label>
        <label className="uj-cek"><input type="checkbox" checked={f.acakOpsi} onChange={e => ubah("acakOpsi", e.target.checked)} /><span><b>Acak urutan pilihan jawaban</b> — matikan kalau ada pilihan seperti "semua benar" atau "A dan B benar"</span></label>
      </section>

      <section className="gr-card uj-form">
        <div className="uj-soal-head">
          <b>Soal · {soal.length}</b>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="gr-btn sm outline" onClick={() => downloadTemplateSoal()}><I n="download" s={14} /> Template</button>
            <button type="button" className="gr-btn sm" onClick={() => fileRef.current?.click()}><I n="upload" s={14} /> {soal.length ? "Ganti dari Excel" : "Impor dari Excel"}</button>
            <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={impor} />
          </span>
        </div>
        {info && <p className="uj-info">{info}</p>}
        {soal.length > 0 && <button type="button" className="gr-link" onClick={() => setLihat(v => !v)}>{lihat ? "Sembunyikan soal" : "Periksa soal, kunci & gambar"}</button>}
        {mb > 0 && <p className={`uj-info ${mb > 4 ? "amber" : ""}`}>Total gambar {mb} MB{mb > 4 ? " — cukup berat untuk wifi lab (tiap siswa mengunduh semuanya saat mulai). Kurangi gambar atau pakai gambar yang lebih sederhana." : "."}</p>}
        {lihat && <DaftarSoalKunci soal={soal} kunci={null} onGambar={pasangGambar} onHapusGambar={hapusGambar} />}
      </section>

      {err && <p className="uj-err" role="alert">{err}</p>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" className="gr-btn outline" onClick={onBatal} disabled={sibuk}>Batal</button>
        <button type="button" className="gr-btn" onClick={simpan} disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan draf"}</button>
      </div>
    </div>
  );
}

// soal: soal lengkap (dengan .jawaban) ATAU soal publik + kunci terpisah
function DaftarSoalKunci({ soal, kunci, onGambar, onHapusGambar }) {
  const fileRef = useRef(null);
  const [target, setTarget] = useState(null);
  return (
    <>
    {onGambar && <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (target != null) onGambar(target, f); }} />}
    <ol className="uj-soal-list">
      {soal.map((s, i) => {
        const jw = kunci ? kunci[s.id]?.jawaban : s.jawaban;
        return (
          <li key={s.id || i}>
            <div className="uj-soal-q"><span className="uj-tipe">{LABEL_TIPE[s.type]}</span>{s.pertanyaan}</div>
            {s.gambar && <img src={s.gambar} alt="" className="uj-soal-img sm" />}
            {onGambar && (
              <div className="uj-gbr-aksi">
                <button type="button" className="gr-link" onClick={() => { setTarget(i); fileRef.current?.click(); }}><I n="image" s={14} /> {s.gambar ? "Ganti gambar" : "Tambah gambar"}</button>
                {s.gambar && <button type="button" className="gr-link" style={{ color: "var(--bad)" }} onClick={() => onHapusGambar(i)}>Hapus gambar</button>}
              </div>
            )}
            {s.type === "tf" ? (
              <div className="uj-soal-opsi"><span className={Number(jw) === 0 ? "kunci" : ""}>Benar</span><span className={Number(jw) === 1 ? "kunci" : ""}>Salah</span></div>
            ) : (
              <div className="uj-soal-opsi">
                {(s.opsi || []).map((o, k) => {
                  const benar = s.type === "komplex" ? (Array.isArray(jw) ? jw : Object.values(jw || {})).map(Number).includes(k) : Number(jw) === k;
                  return <span key={k} className={benar ? "kunci" : ""}><b>{HURUF[k]}.</b> {o}</span>;
                })}
              </div>
            )}
          </li>
        );
      })}
    </ol>
    </>
  );
}

function DetailUjian({ store, id, onKembali, onEdit }) {
  const u = store.getUjian(id);
  const kunci = store.getKunciUjian(id);
  const { jawaban, log } = store.getPantauUjian();
  const now = useDetik(store, u?.status === "aktif");
  const [tab, setTab] = useState("pantau");
  const [tanya, setTanya] = useState(null); // "mulai" | "akhiri" | "hapus"
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const [suara, setSuara] = useState(true);
  const [alarm, setAlarm] = useState([]); // peringatan baru (nama siswa) untuk ditampilkan
  const toast = m => { setPesan(m); setTimeout(() => setPesan(""), 3200); };
  const siswaList = u ? store.getAllSiswa(u.jenjang) : [];
  const namaDari = sid => siswaList.find(s => s.id === sid)?.nama || jawaban[sid]?.nama || sid;

  // ─── Alarm: bunyi saat ada log "keluar" baru (setelah data awal termuat) ───
  const sudahLihat = useRef(null);
  useEffect(() => {
    const semua = [];
    Object.entries(log || {}).forEach(([sid, l]) => Object.entries(l || {}).forEach(([k, x]) => { if (x?.jenis === "keluar") semua.push({ k, sid }); }));
    if (sudahLihat.current === null) { sudahLihat.current = new Set(semua.map(x => x.k)); return; }
    const baru = semua.filter(x => !sudahLihat.current.has(x.k));
    if (!baru.length) return;
    baru.forEach(x => sudahLihat.current.add(x.k));
    if (u?.status !== "aktif") return;
    if (suara) bunyiAlarm();
    setAlarm(a => [...new Set([...baru.map(x => namaDari(x.sid)), ...a])].slice(0, 4));
  }, [log]);
  useEffect(() => { if (!alarm.length) return; const t = setTimeout(() => setAlarm([]), 12000); return () => clearTimeout(t); }, [alarm]);

  if (!u) return <div className="page gr"><button type="button" className="gr-link back" onClick={onKembali}><I n="chevL" s={14} /> Mode Ujian</button><div className="gr-card" style={{ padding: 20 }}>Ujian tidak ditemukan.</div></div>;

  const lap = hitungLaporanUjian({ ujian: u, kunci, jawabanAll: jawaban, logAll: log, siswaList, now: store.waktuServer() });
  const r = lap.ringkasan;
  const tampilDiSiswa = store.getUjianAktifId(u.jenjang) === id;
  const sisa = u.berakhirAt ? u.berakhirAt - now : null;

  async function jalankan(fn, sukses) {
    setSibuk(true);
    try { await withTimeout(fn()); if (sukses) toast(sukses); } catch (e) { toast("Gagal: " + (e?.message || "coba lagi")); }
    setSibuk(false); setTanya(null);
  }

  return (
    <div className="page gr">
      <button type="button" className="gr-link back" onClick={onKembali}><I n="chevL" s={14} /> Mode Ujian</button>
      <div className="gr-head">
        <div>
          <span className="gr-mono">Kelas {u.jenjang} · {u.mapel} · {(u.soal || []).length} soal · {u.durasi} menit</span>
          <h1>{u.judul}</h1>
        </div>
        {chipStatus(u)}
      </div>

      {alarm.length > 0 && (
        <div className="uj-alarm" role="alert">
          <I n="alert" s={18} />
          <span><b>{alarm.join(", ")}</b> keluar dari layar ujian.</span>
          <button type="button" className="gr-link" onClick={() => setAlarm([])}>Tutup</button>
        </div>
      )}

      <section className={`gr-mi-status uj-status ${u.status === "aktif" ? "on" : ""}`}>
        <div className="gr-mi-st-txt">
          {u.status === "draf" && <><span className="gr-mi-st-lbl">Belum dimulai</span><b>Draf ujian</b><span>Saat dimulai, soal langsung tampil di perangkat siswa Kelas {u.jenjang} dan waktu {u.durasi} menit mulai berjalan.</span></>}
          {u.status === "aktif" && <><span className="gr-mi-st-lbl">Sisa waktu</span><b className={`uj-sisa ${sisa < 300000 ? "amber" : ""}`}>{sisa > 0 ? fmtSisa(sisa) : "Waktu habis"}</b><span>Mulai {fmtJam(u.mulaiAt)} · berakhir {fmtJam(u.berakhirAt)} · {r.mengerjakan} mengerjakan, {r.selesai} selesai, {r.belum} belum mulai</span></>}
          {u.status === "selesai" && <><span className="gr-mi-st-lbl">Selesai</span><b>Ujian ditutup {fmtJam(u.selesaiAt || u.berakhirAt)}</b><span>{r.ikut} dari {r.n} siswa ikut · {tampilDiSiswa ? "masih tampil di layar siswa" : "tidak tampil lagi di layar siswa"} · hasil {u.hasilTerbit ? "sudah" : "belum"} terbit</span></>}
        </div>
        <div className="uj-aksi">
          {u.status === "draf" && <>
            <button type="button" className="gr-btn outline" disabled={sibuk} onClick={onEdit}>Ubah</button>
            <button type="button" className="gr-btn" disabled={sibuk} onClick={() => { siapkanSuara(); setTanya("mulai"); }}>Mulai ujian</button>
          </>}
          {u.status === "aktif" && <>
            <button type="button" className="gr-btn outline" disabled={sibuk} onClick={() => jalankan(() => store.perpanjangUjian(id, 5), "Waktu ditambah 5 menit.")}>+5 menit</button>
            <button type="button" className="gr-btn" disabled={sibuk} onClick={() => setTanya("akhiri")}>Akhiri ujian</button>
          </>}
          {u.status === "selesai" && <>
            {tampilDiSiswa
              ? <button type="button" className="gr-btn outline" disabled={sibuk} onClick={() => jalankan(() => store.tutupUjianDariSiswa(id), "Ujian disembunyikan dari layar siswa.")}>Sembunyikan dari siswa</button>
              : <button type="button" className="gr-btn outline" disabled={sibuk} onClick={() => jalankan(() => store.tampilkanUjianKeSiswa(id), "Ujian tampil lagi di layar siswa.")}>Tampilkan ke siswa</button>}
            <button type="button" className="gr-btn outline" disabled={sibuk} onClick={() => jalankan(() => store.perpanjangUjian(id, 10), "Ujian dibuka lagi 10 menit.")}>Buka lagi 10 menit</button>
          </>}
          {u.status !== "aktif" && <button type="button" className="gr-ib" aria-label="Hapus ujian" title="Hapus ujian" disabled={sibuk} onClick={() => setTanya("hapus")}><I n="trash" s={16} /></button>}
        </div>
      </section>

      <div className="uj-bar">
        <div className="gr-seg" role="tablist" aria-label="Bagian">
          {[["pantau", `Pantau${u.status === "aktif" ? ` · ${r.mengerjakan + r.selesai}/${r.n}` : ""}`], ["hasil", "Hasil & laporan"], ["soal", "Soal & kunci"]].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <button type="button" className={`uj-suara ${suara ? "on" : ""}`} aria-pressed={suara} onClick={() => { siapkanSuara(); setSuara(v => !v); if (!suara) bunyiAlarm(); }}>
          Alarm suara: {suara ? "nyala" : "mati"}
        </button>
      </div>

      {tab === "pantau" && <PantauUjian u={u} lap={lap} store={store} id={id} log={log} namaDari={namaDari} toast={toast} />}
      {tab === "hasil" && <HasilUjian u={u} lap={lap} store={store} id={id} toast={toast} />}
      {tab === "soal" && <section className="gr-card uj-form">{u.status === "draf" && <p className="gr-muted">Soal masih bisa diubah lewat tombol Ubah selama ujian belum dimulai.</p>}<DaftarSoalKunci soal={u.soal || []} kunci={kunci} /></section>}

      {pesan && <div className="uj-toast" role="status">{pesan}</div>}

      {tanya && (
        <div className="modal-overlay" onClick={() => !sibuk && setTanya(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog">
            {tanya === "mulai" && <>
              <h3>Mulai ujian sekarang?</h3>
              <p>Soal langsung tampil di perangkat siswa Kelas {u.jenjang}. Waktu {u.durasi} menit berjalan untuk semua siswa sejak sekarang (siswa yang terlambat masuk mendapat sisa waktu). Soal tidak bisa diubah lagi.</p>
              <div className="modal-actions"><button className="btn btn-outline btn-sm" onClick={() => setTanya(null)} disabled={sibuk}>Batal</button><button className="btn btn-primary btn-sm" disabled={sibuk} onClick={() => jalankan(() => store.mulaiUjian(id), "Ujian dimulai.")}>{sibuk ? "Memulai…" : "Mulai"}</button></div>
            </>}
            {tanya === "akhiri" && <>
              <h3>Akhiri ujian sekarang?</h3>
              <p>{r.mengerjakan} siswa masih mengerjakan. Jawaban yang sudah tersimpan otomatis tetap dinilai. Kamu masih bisa membukanya lagi dari tombol "Buka lagi 10 menit".</p>
              <div className="modal-actions"><button className="btn btn-outline btn-sm" onClick={() => setTanya(null)} disabled={sibuk}>Batal</button><button className="btn btn-primary btn-sm" disabled={sibuk} onClick={() => jalankan(() => store.akhiriUjian(id), "Ujian diakhiri.")}>Akhiri</button></div>
            </>}
            {tanya === "hapus" && <>
              <h3>Hapus ujian ini?</h3>
              <p>Soal, kunci, semua jawaban siswa, catatan pengawasan, dan nilai ujian ini ikut terhapus. Tidak bisa dibatalkan.</p>
              <div className="modal-actions"><button className="btn btn-outline btn-sm" onClick={() => setTanya(null)} disabled={sibuk}>Batal</button><button className="btn btn-primary btn-sm" style={{ background: "var(--bad)" }} disabled={sibuk} onClick={() => jalankan(() => store.hapusUjian(id)).then(onKembali)}>Hapus</button></div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

function PantauUjian({ u, lap, store, id, log, namaDari, toast }) {
  const [filter, setFilter] = useState("semua");
  const [sibukId, setSibukId] = useState(null);
  const r = lap.ringkasan, total = (u.soal || []).length;
  const urut = { mengerjakan: 0, belum: 1, dikunci: 2, selesai: 3 };
  const baris = [...lap.baris]
    .filter(b => filter === "semua" || (filter === "keluar" ? b.keluar > 0 || b.hbBasi : b.status === filter))
    .sort((a, b) => (b.hbBasi - a.hbBasi) || (b.keluar - a.keluar) || (urut[a.status] - urut[b.status]) || String(a.siswa.nama).localeCompare(String(b.siswa.nama), "id"));
  const feed = [];
  Object.entries(log || {}).forEach(([sid, l]) => Object.values(l || {}).forEach(x => { if (x && x.jenis !== "kembali") feed.push({ ...x, sid }); }));
  feed.sort((a, b) => (b.t || 0) - (a.t || 0));

  async function aksi(fn, sid, msg) {
    setSibukId(sid);
    try { await withTimeout(fn()); toast(msg); } catch (e) { toast("Gagal: " + (e?.message || "coba lagi")); }
    setSibukId(null);
  }

  return (
    <>
      <div className="gr-tiles">
        <div><span>Mengerjakan</span><b>{r.mengerjakan}</b><small>dari {r.n} siswa</small></div>
        <div><span>Sudah selesai</span><b>{r.selesai}</b><small>{r.belum} belum mulai</small></div>
        <div><span>Keluar layar</span><b>{r.keluarTotal}<small> kali</small></b><small className={r.siswaKeluar ? "amber" : ""}>{r.siswaKeluar ? `${r.siswaKeluar} siswa` : "Belum ada"}</small></div>
        <div><span>Tidak merespons</span><b>{lap.baris.filter(b => b.hbBasi).length}</b><small>tidak ada sinyal &gt; 1 menit</small></div>
      </div>

      {feed.length > 0 && (
        <section className="gr-card uj-feed">
          <h2 className="gr-h2">Catatan pengawasan terbaru</h2>
          {feed.slice(0, 8).map((x, i) => (
            <div key={i}><span className="uj-feed-jam">{fmtJam(x.t)}</span><b>{namaDari(x.sid)}</b><span>{x.jenis === "keluar" ? `keluar dari layar ujian${x.sebab ? ` (${x.sebab})` : ""}` : "keluar dari layar penuh"}</span></div>
          ))}
        </section>
      )}

      <div className="gr-seg scroll" role="tablist" aria-label="Saring siswa" style={{ alignSelf: "flex-start" }}>
        {[["semua", "Semua", r.n], ["mengerjakan", "Mengerjakan", r.mengerjakan], ["belum", "Belum mulai", r.belum], ["selesai", "Selesai", lap.baris.filter(b => b.status === "selesai").length], ["keluar", "Perlu dicek", lap.baris.filter(b => b.keluar > 0 || b.hbBasi).length]].map(([k, l, n]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l} · {n}</button>
        ))}
      </div>

      <div className="gr-card list">
        {baris.length === 0 ? <p className="gr-muted" style={{ padding: 16 }}>Tidak ada siswa di kelompok ini.</p> : baris.map(b => (
          <div key={b.siswa.id} className={`uj-siswa ${b.keluar >= 3 || b.hbBasi ? "waspada" : ""}`}>
            <span className="uj-siswa-nama"><b>{b.siswa.nama}</b><small>{b.mulaiAt ? `Mulai ${fmtJam(b.mulaiAt)}${b.selesaiAt ? ` · selesai ${fmtJam(b.selesaiAt)}` : ""}` : "Belum masuk"}</small></span>
            <span className="uj-siswa-prog" aria-label={`${b.dijawab} dari ${total} soal dijawab`}><i><i style={{ width: `${total ? b.dijawab / total * 100 : 0}%` }} /></i><small>{b.dijawab}/{total}</small></span>
            <span className="uj-siswa-chip">
              {b.hbBasi && <span className="gr-chip amber">Tidak merespons</span>}
              {b.keluar > 0 && <span className={`gr-chip ${b.keluar >= 3 ? "merah" : "amber"}`}>Keluar {b.keluar}×</span>}
              <span className={`gr-chip ${b.status === "mengerjakan" ? "teal" : b.status === "belum" ? "muted" : b.status === "dikunci" ? "amber" : "muted"}`}>{LABEL_STATUS[b.status]}</span>
            </span>
            <span className="uj-siswa-aksi">
              {u.status === "aktif" && b.status === "mengerjakan" && <button type="button" className="gr-btn sm outline" disabled={sibukId === b.siswa.id} onClick={() => aksi(() => store.kunciSiswaUjian(id, b.siswa.id), b.siswa.id, `Pengerjaan ${b.siswa.nama} dikunci.`)}>Kunci</button>}
              {u.status === "aktif" && b.j?.submittedAt && <button type="button" className="gr-btn sm outline" disabled={sibukId === b.siswa.id} onClick={() => aksi(() => store.bukaKunciSiswaUjian(id, b.siswa.id), b.siswa.id, `${b.siswa.nama} bisa melanjutkan.`)}>Buka kunci</button>}
            </span>
          </div>
        ))}
      </div>
      <p className="gr-muted">"Keluar" dicatat kalau siswa meninggalkan layar ujian lebih dari 2 detik (pindah aplikasi/tab/jendela). Ini tanda untuk dicek, bukan bukti curang. "Kunci" menghentikan pengerjaan siswa itu; jawaban yang sudah tersimpan tetap dinilai.</p>
    </>
  );
}

function HasilUjian({ u, lap, store, id, toast }) {
  const [sibuk, setSibuk] = useState(false);
  const [urutNilai, setUrutNilai] = useState(false);
  const r = lap.ringkasan, total = (u.soal || []).length;
  const tersimpan = store.getPantauUjian().hasil || {};
  const ikut = lap.baris.filter(b => b.ikut);
  const beda = ikut.some(b => tersimpan[b.siswa.id]?.nilai !== b.nilai) || Object.keys(tersimpan).length !== ikut.length;
  const baris = [...lap.baris].sort((a, b) => urutNilai ? ((b.nilai ?? -1) - (a.nilai ?? -1)) : String(a.siswa.nama).localeCompare(String(b.siswa.nama), "id"));
  const butir = [...lap.butir].sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
  const maxSebaran = Math.max(1, ...r.sebaran.map(s => s.n));

  async function simpan(terbit) {
    setSibuk(true);
    try {
      const hasil = {};
      ikut.forEach(b => { hasil[b.siswa.id] = { nilai: b.nilai, benar: b.benar, total, dijawab: b.dijawab, nama: b.siswa.nama }; });
      await withTimeout(store.simpanHasilUjian(id, hasil));
      if (terbit !== undefined) await withTimeout(store.terbitkanHasilUjian(id, terbit));
      toast(terbit === true ? "Nilai disimpan & diterbitkan ke siswa." : terbit === false ? "Hasil ditarik dari siswa." : "Nilai disimpan.");
    } catch (e) { toast("Gagal: " + (e?.message || "coba lagi")); }
    setSibuk(false);
  }
  function salin() {
    const teks = ikut.sort((a, b) => String(a.siswa.nama).localeCompare(String(b.siswa.nama), "id")).map(b => `${b.siswa.nama}\t${b.nilai}`).join("\n");
    navigator.clipboard?.writeText(teks).then(() => toast(`${ikut.length} nama + nilai disalin. Tempel di Nilai Akhir → Tempel Nilai.`), () => toast("Tidak bisa menyalin di browser ini."));
  }
  function cetak() { cetakLaporanUjian(u, lap, store); }

  return (
    <>
      {u.status === "aktif" && <div className="uj-info amber">Ujian masih berjalan — angka di bawah ini nilai sementara dan terus berubah.</div>}
      <div className="gr-tiles">
        <div><span>Rata-rata</span><b>{r.rata ?? "—"}</b><small>median {r.median ?? "—"}</small></div>
        <div><span>Tertinggi · terendah</span><b>{r.max ?? "—"}<small> · {r.min ?? "—"}</small></b><small>{r.ikut} siswa ikut dari {r.n}</small></div>
        <div><span>Tuntas (KKTP {KKTP})</span><b>{r.tuntas}<small>/{r.ikut}</small></b><small className={r.ikut - r.tuntas ? "amber" : ""}>{r.ikut ? `${r.ikut - r.tuntas} belum tuntas` : "—"}</small></div>
        <div><span>Keluar layar</span><b>{r.keluarTotal}<small> kali</small></b><small>{r.siswaKeluar} siswa</small></div>
      </div>

      <section className="gr-card uj-aksi-hasil">
        <div>
          <b>{u.hasilTerbit ? "Hasil sudah terbit di layar siswa" : "Hasil belum terbit"}</b>
          <span className="gr-muted">{beda ? "Ada nilai yang belum disimpan. Simpan dulu sebelum diterbitkan." : u.dinilaiAt ? `Nilai tersimpan ${tglJam(u.dinilaiAt)}.` : ""} Siswa hanya melihat nilai & jumlah benar, tanpa kunci jawaban.</span>
        </div>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="gr-btn sm outline" disabled={sibuk || !ikut.length} onClick={salin}>Salin nama + nilai</button>
          <button type="button" className="gr-btn sm outline" disabled={!ikut.length} onClick={cetak}>Cetak laporan</button>
          <button type="button" className="gr-btn sm outline" disabled={sibuk || !ikut.length} onClick={() => simpan()}>Simpan nilai</button>
          {u.hasilTerbit
            ? <button type="button" className="gr-btn sm outline" disabled={sibuk} onClick={() => simpan(false)}>Tarik hasil</button>
            : <button type="button" className="gr-btn sm" disabled={sibuk || !ikut.length || u.status === "aktif"} title={u.status === "aktif" ? "Akhiri ujian dulu" : undefined} onClick={() => simpan(true)}>Simpan & terbitkan</button>}
        </span>
      </section>

      {r.ikut > 0 && (
        <section className="gr-card uj-sebaran">
          <h2 className="gr-h2">Sebaran nilai</h2>
          {r.sebaran.map(s => (
            <div key={s.label}><span>{s.label}</span><i><i className={s.label.startsWith("0") || s.label.startsWith("50") ? "bawah" : ""} style={{ width: `${s.n / maxSebaran * 100}%` }} /></i><b>{s.n}</b></div>
          ))}
        </section>
      )}

      <section className="gr-card list">
        <div className="uj-tabel-head"><h2 className="gr-h2">Nilai per siswa</h2><button type="button" className="gr-link" onClick={() => setUrutNilai(v => !v)}>Urutkan: {urutNilai ? "nilai" : "nama"}</button></div>
        <div className="uj-tabel-wrap">
          <table className="uj-tabel">
            <thead><tr><th>Nama</th><th>Nilai</th><th>Benar</th><th>Mulai–selesai</th><th>Durasi</th><th>Keluar</th><th>Status</th></tr></thead>
            <tbody>
              {baris.map(b => (
                <tr key={b.siswa.id} className={!b.ikut ? "dim" : ""}>
                  <td>{b.siswa.nama}</td>
                  <td className={`num ${b.nilai != null && b.nilai < KKTP ? "bawah" : ""}`}>{b.nilai ?? "—"}</td>
                  <td className="num">{b.ikut ? `${b.benar}/${total}` : "—"}</td>
                  <td className="num">{b.ikut ? `${fmtJam(b.mulaiAt)}–${fmtJam(b.selesaiAt)}` : "—"}</td>
                  <td className="num">{fmtDurasi(b.durasi)}</td>
                  <td className={`num ${b.keluar ? "bawah" : ""}`}>{b.keluar || "—"}</td>
                  <td>{!b.ikut ? "Tidak ikut" : b.cara === "dikunci guru" ? "Dikunci guru" : b.cara === "waktu habis" ? "Waktu habis" : b.status === "mengerjakan" ? "Mengerjakan" : "Dikumpulkan"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {r.ikut > 0 && (
        <section className="gr-card list">
          <div className="uj-tabel-head"><h2 className="gr-h2">Analisis butir soal</h2><span className="gr-muted">dari yang paling banyak salah</span></div>
          {butir.map(x => {
            const top = Object.entries(x.pilihan).sort((a, b) => b[1] - a[1])[0];
            const pengecoh = top && Number(top[0]) !== Number(x.kunci) ? `${labelJawaban(x.soal, Number(top[0]))} paling banyak dipilih (${top[1]} siswa)` : null;
            return (
              <div key={x.soal.id} className="uj-butir">
                <span className="uj-butir-no">{x.no}</span>
                <span className="uj-butir-txt"><b>{String(x.soal.pertanyaan || "").slice(0, 140)}{String(x.soal.pertanyaan || "").length > 140 ? "…" : ""}</b><small>Kunci {labelJawaban(x.soal, x.kunci)}{pengecoh ? ` · ${pengecoh}` : ""}</small></span>
                <span className="uj-butir-pct"><i><i className={x.pct < 50 ? "bawah" : ""} style={{ width: `${x.pct || 0}%` }} /></i><b>{x.pct ?? "—"}%</b></span>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

function cetakLaporanUjian(u, lap, store) {
  const r = lap.ringkasan, total = (u.soal || []).length;
  const guru = store.fbGuru?.nama || "";
  const baris = [...lap.baris].sort((a, b) => String(a.siswa.nama).localeCompare(String(b.siswa.nama), "id"));
  const butir = [...lap.butir].sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan ${esc(u.judul)}</title>
<style>
body{font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0E2A33;margin:28px;font-size:12px}
h1{font-size:18px;margin:0 0 2px}h2{font-size:13px;margin:22px 0 8px;color:#0d6b7a;text-transform:uppercase;letter-spacing:.04em}
.meta{color:#58707A;margin-bottom:14px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.grid div{border:1px solid #DCE6E9;border-radius:8px;padding:8px 10px}.grid b{display:block;font-size:18px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #DCE6E9;padding:5px 7px;text-align:left}th{background:#EBF4F6;font-size:11px}
td.n{text-align:center;font-variant-numeric:tabular-nums}.b{color:#B45309;font-weight:700}
.ttd{margin-top:36px;display:flex;justify-content:flex-end}.ttd div{text-align:center;min-width:220px}
@media print{body{margin:14mm}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body>
<h1>Laporan Hasil Ujian — ${esc(u.judul)}</h1>
<div class="meta">Kelas ${esc(u.jenjang)} · ${esc(u.mapel)} · ${total} soal · ${esc(u.durasi)} menit · ${esc(tglJam(u.mulaiAt))}</div>
<div class="grid">
<div>Rata-rata<b>${r.rata ?? "—"}</b></div><div>Tertinggi / terendah<b>${r.max ?? "—"} / ${r.min ?? "—"}</b></div>
<div>Tuntas (KKTP ${KKTP})<b>${r.tuntas} / ${r.ikut}</b></div><div>Ikut ujian<b>${r.ikut} / ${r.n}</b></div>
</div>
<h2>Nilai per siswa</h2>
<table><thead><tr><th>No</th><th>Nama</th><th>Nilai</th><th>Benar</th><th>Mulai–selesai</th><th>Durasi</th><th>Keluar layar</th><th>Keterangan</th></tr></thead><tbody>
${baris.map((b, i) => `<tr><td class="n">${i + 1}</td><td>${esc(b.siswa.nama)}</td><td class="n ${b.nilai != null && b.nilai < KKTP ? "b" : ""}">${b.nilai ?? "—"}</td><td class="n">${b.ikut ? `${b.benar}/${total}` : "—"}</td><td class="n">${b.ikut ? `${fmtJam(b.mulaiAt)}–${fmtJam(b.selesaiAt)}` : "—"}</td><td class="n">${fmtDurasi(b.durasi)}</td><td class="n ${b.keluar ? "b" : ""}">${b.keluar || "—"}</td><td>${!b.ikut ? "Tidak ikut" : esc(b.cara === "dikunci guru" ? "Dikunci guru" : b.cara === "waktu habis" ? "Waktu habis" : "Dikumpulkan")}</td></tr>`).join("")}
</tbody></table>
<h2>Analisis butir soal (urut dari persentase benar terendah)</h2>
<table><thead><tr><th>No</th><th>Soal</th><th>Kunci</th><th>% benar</th></tr></thead><tbody>
${butir.map(x => `<tr><td class="n">${x.no}</td><td>${esc(String(x.soal.pertanyaan || "").slice(0, 160))}</td><td class="n">${esc(labelJawaban(x.soal, x.kunci))}</td><td class="n ${x.pct != null && x.pct < 50 ? "b" : ""}">${x.pct ?? "—"}%</td></tr>`).join("")}
</tbody></table>
<div class="ttd"><div>Guru Mata Pelajaran<br><br><br><br><b>${esc(guru)}</b></div></div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

// ═══════════════════════════════════════════
// SISWA
// ═══════════════════════════════════════════

// Pita di atas layar siswa saat ada ujian berjalan untuk kelasnya
export function BannerUjianSiswa({ store, route, navigate }) {
  const u = store.getUjianSaya();
  const j = store.getJawabanUjianSaya();
  const now = useDetik(store, !!u && u.status === "aktif");
  if (!u || route === "ujian" || u.status !== "aktif" || j?.submittedAt) return null;
  const sisa = (u.berakhirAt || 0) - now;
  if (sisa <= 0) return null;
  return (
    <div className="uj-banner" role="status">
      <I n="clock" s={18} />
      <span><b>{u.judul}</b> sedang berlangsung · sisa {fmtSisa(sisa)}</span>
      <button type="button" onClick={() => navigate("ujian")}>{j?.mulaiAt ? "Lanjutkan ujian" : "Masuk ruang ujian"}</button>
    </div>
  );
}

export function UjianSiswa({ user, store, navigate }) {
  const u = store.getUjianSaya();
  const j = store.getJawabanUjianSaya();
  const hasil = store.getHasilUjianSaya();
  const now = useDetik(store, !!u);
  const st = useRef(store);
  st.current = store;

  const mulai = !!j?.mulaiAt;
  const kumpul = !!j?.submittedAt;
  const habis = !!u && (u.status === "selesai" || (u.berakhirAt && now >= u.berakhirAt));
  const mengerjakan = !!u && mulai && !kumpul && !habis;

  // Waktu habis / guru mengakhiri → kumpulkan otomatis sekali
  const otoRef = useRef(false);
  useEffect(() => {
    if (!u || !mulai || kumpul || !habis || otoRef.current) return;
    otoRef.current = true;
    st.current.kumpulkanUjian("waktu habis").catch(() => {});
  }, [u?.id, mulai, kumpul, habis]);
  useEffect(() => { if (!mengerjakan) keluarFs(); }, [mengerjakan]);

  if (!u) {
    return (
      <div className="uj-siswa-page"><div className="uj-kartu">
        <h2>Tidak ada ujian</h2><p>Belum ada ujian yang berjalan untuk kelasmu.</p>
        <button type="button" className="uj-btn" onClick={() => navigate("home")}>Kembali ke Beranda</button>
      </div></div>
    );
  }
  if (j === null) return <div className="uj-siswa-page"><div className="uj-kartu"><p>Memuat…</p></div></div>;

  if (kumpul || (mulai && habis)) return <SelesaiUjian u={u} j={j} hasil={hasil} navigate={navigate} habis={!kumpul} />;
  if (!mulai && habis) {
    return (
      <div className="uj-siswa-page"><div className="uj-kartu">
        <h2>{u.judul}</h2><p>Ujian ini sudah ditutup dan kamu belum sempat mengerjakannya. Hubungi gurumu.</p>
        <button type="button" className="uj-btn" onClick={() => navigate("home")}>Kembali ke Beranda</button>
      </div></div>
    );
  }
  if (!mulai) return <LobiUjian u={u} store={store} now={now} navigate={navigate} />;
  return <LayarUjian key={u.id} u={u} j={j} user={user} store={store} now={now} />;
}

function LobiUjian({ u, store, now, navigate }) {
  const [sibuk, setSibuk] = useState(false);
  const [err, setErr] = useState("");
  async function mulai() {
    setSibuk(true); setErr("");
    await masukFs(); // harus di dalam klik (aturan browser)
    try { await withTimeout(store.mulaiKerjakanUjian()); }
    catch (e) { keluarFs(); setErr(e?.message || "Gagal memulai. Coba lagi."); }
    setSibuk(false);
  }
  return (
    <div className="uj-siswa-page">
      <div className="uj-kartu">
        <span className="uj-ey">Ujian · Kelas {u.jenjang} · {u.mapel}</span>
        <h2>{u.judul}</h2>
        <div className="uj-fakta">
          <div><b>{(u.soal || []).length}</b><span>soal</span></div>
          <div><b>{fmtSisa((u.berakhirAt || 0) - now)}</b><span>sisa waktu</span></div>
        </div>
        <ul className="uj-aturan">
          <li>Layar akan masuk mode <b>layar penuh</b>. Jangan keluar dari layar ujian.</li>
          <li>Setiap kali kamu pindah aplikasi, tab, atau jendela, <b>tercatat otomatis dan gurumu langsung diberi tahu</b>.</li>
          <li>Jawaban tersimpan otomatis setiap kali kamu memilih. Kalau internet putus, jangan tutup aplikasi — jawaban akan terkirim saat tersambung lagi.</li>
          <li>Kalau waktu habis, jawaban yang sudah tersimpan langsung dikumpulkan.</li>
        </ul>
        {err && <p className="uj-err" role="alert">{err}</p>}
        <button type="button" className="uj-btn besar" disabled={sibuk} onClick={mulai}>{sibuk ? "Menyiapkan…" : "Mulai mengerjakan"}</button>
        <button type="button" className="uj-link" onClick={() => navigate("home")}>Kembali ke Beranda</button>
      </div>
    </div>
  );
}

function LayarUjian({ u, j, user, store, now }) {
  const st = useRef(store);
  st.current = store;
  const susunan = useMemo(() => susunUntukSiswa(u, user.id), [u.id, user.id, (u.soal || []).length, u.acakSoal, u.acakOpsi]);
  const total = susunan.length;
  const LS = `astrolab.ujian.${u.id}.${user.id}`;

  // ─── Jawaban: cermin lokal (cepat + cadangan kalau internet putus) ───
  const [jawab, setJawab] = useState({});
  const [ragu, setRagu] = useState({});
  const [idx, setIdx] = useState(0);
  const [simpan, setSimpan] = useState("ok"); // ok | proses | lambat | gagal
  const [konfirm, setKonfirm] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [nav, setNav] = useState(false);
  const [diFs, setDiFs] = useState(!!fsEl());
  const pernahFs = useRef(!!fsEl());
  const [sudahFs, setSudahFs] = useState(!!fsEl()); // salinan state dari pernahFs untuk render
  const siap = useRef(false);

  const tulisLokal = (a, r, i) => { try { localStorage.setItem(LS, JSON.stringify({ answers: a, ragu: r, idx: i, t: st.current.waktuServer() })); } catch {} };
  useEffect(() => {
    if (siap.current) return;
    siap.current = true;
    let lokal = {};
    try { lokal = JSON.parse(localStorage.getItem(LS) || "{}"); } catch {}
    const server = j.answers || {};
    const lokalLebihBaru = lokal.t && (!j.hb || lokal.t > j.hb);
    const gabung = lokalLebihBaru ? { ...server, ...(lokal.answers || {}) } : { ...(lokal.answers || {}), ...server };
    setJawab(gabung);
    setRagu(lokal.ragu || {});
    if (Number.isInteger(lokal.idx) && lokal.idx >= 0 && lokal.idx < total) setIdx(lokal.idx);
    // Kirim ulang jawaban yang hanya ada di perangkat ini (mis. tersimpan saat offline lalu halaman dimuat ulang)
    if (lokalLebihBaru) Object.entries(lokal.answers || {}).forEach(([k, v]) => { if (JSON.stringify(server[k]) !== JSON.stringify(v)) kirim(k, v); });
  }, []);

  function kirim(soalId, val) {
    setSimpan("proses");
    let beres = false;
    const t = setTimeout(() => { if (!beres) setSimpan("lambat"); }, 4000);
    st.current.simpanJawabanUjian(soalId, val).then(
      () => { beres = true; clearTimeout(t); setSimpan("ok"); },
      () => { beres = true; clearTimeout(t); setSimpan("gagal"); }
    );
  }
  function pilih(soalId, val) {
    setJawab(p => { const n = { ...p, [soalId]: val }; tulisLokal(n, ragu, idx); return n; });
    kirim(soalId, val);
  }
  function pindah(i) {
    const n = Math.max(0, Math.min(total - 1, i));
    setIdx(n); setNav(false); tulisLokal(jawab, ragu, n);
    window.scrollTo(0, 0);
  }
  function tandaiRagu(id) {
    setRagu(p => { const n = { ...p, [id]: !p[id] }; tulisLokal(jawab, n, idx); return n; });
  }

  // ─── Pengawasan: keluar layar, layar penuh, detak ───
  const [peringatan, setPeringatan] = useState(0);
  useEffect(() => {
    let pergiAt = null, tercatat = false, timer = null;
    const pergi = sebab => {
      if (pergiAt) return;
      pergiAt = Date.now(); tercatat = false;
      timer = setTimeout(() => { tercatat = true; st.current.catatLogUjian("keluar", { sebab }); setPeringatan(p => p + 1); }, 2000);
    };
    const kembali = () => {
      if (!pergiAt) return;
      clearTimeout(timer);
      if (tercatat) st.current.catatLogUjian("kembali", { durasi: Date.now() - pergiAt });
      pergiAt = null;
    };
    const onVis = () => (document.visibilityState === "hidden" ? pergi("pindah aplikasi/tab") : kembali());
    const onBlur = () => pergi("jendela lain");
    const onFocus = () => { if (document.visibilityState === "visible") kembali(); };
    const onFs = () => {
      const di = !!fsEl();
      setDiFs(di);
      if (di) { pernahFs.current = true; setSudahFs(true); }
      else if (pernahFs.current) st.current.catatLogUjian("layar_penuh");
    };
    const blokir = e => e.preventDefault();
    const tahan = e => { e.preventDefault(); e.returnValue = ""; };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    ["contextmenu", "copy", "cut", "paste", "dragstart"].forEach(ev => document.addEventListener(ev, blokir));
    window.addEventListener("beforeunload", tahan);
    const hb = setInterval(() => { if (document.visibilityState === "visible") st.current.detakUjian().catch(() => {}); }, 20000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
      ["contextmenu", "copy", "cut", "paste", "dragstart"].forEach(ev => document.removeEventListener(ev, blokir));
      window.removeEventListener("beforeunload", tahan);
      clearInterval(hb); clearTimeout(timer);
    };
  }, []);

  async function kumpulkan() {
    setMengirim(true);
    try { await withTimeout(st.current.kumpulkanUjian("siswa")); try { localStorage.removeItem(LS); } catch {} }
    catch (e) { alert("Gagal mengumpulkan: " + (e?.message || "periksa internet lalu coba lagi.")); }
    setMengirim(false); setKonfirm(false);
  }

  const { soal: s, urutOpsi } = susunan[idx] || {};
  if (!s) return null;
  const dijawab = susunan.filter(x => terjawab(jawab[x.soal.id])).length;
  const belum = susunan.map((x, i) => (terjawab(jawab[x.soal.id]) ? null : i)).filter(i => i !== null);
  const nRagu = susunan.filter(x => ragu[x.soal.id]).length;
  const sisa = (u.berakhirAt || 0) - now;
  const val = jawab[s.id];
  const blokirFs = fsBisa() && sudahFs && !diFs;
  const pilihanKomplex = Array.isArray(val) ? val.map(Number) : [];

  return (
    <div className="uj-layar" onCopy={e => e.preventDefault()}>
      <header className="uj-head">
        <div className="uj-head-txt"><b>{u.judul}</b><small>Soal {idx + 1} dari {total} · {dijawab} dijawab</small></div>
        <span className={`uj-simpan ${simpan}`}>{simpan === "proses" ? "Menyimpan…" : simpan === "lambat" ? "Internet lambat — jangan tutup" : simpan === "gagal" ? "Belum tersimpan di server" : "Tersimpan"}</span>
        <span className={`uj-timer ${sisa < 300000 ? "amber" : ""}`} aria-label="Sisa waktu"><I n="clock" s={15} />{fmtSisa(sisa)}</span>
        <button type="button" className="uj-navbtn" aria-expanded={nav} onClick={() => setNav(v => !v)}><I n="list" s={16} /> Nomor</button>
      </header>
      <div className="uj-prog"><i style={{ width: `${total ? dijawab / total * 100 : 0}%` }} /></div>

      {nav && (
        <div className="uj-grid" role="navigation" aria-label="Nomor soal">
          {susunan.map((x, i) => (
            <button key={x.soal.id} type="button" className={`${i === idx ? "kini" : ""} ${ragu[x.soal.id] ? "ragu" : terjawab(jawab[x.soal.id]) ? "isi" : ""}`} onClick={() => pindah(i)}>{i + 1}</button>
          ))}
          <p><i className="isi" /> dijawab <i className="ragu" /> ragu-ragu <i /> belum</p>
        </div>
      )}

      {peringatan > 0 && <div className="uj-warn" role="alert"><I n="alert" s={16} /> Kamu tercatat keluar dari layar ujian {peringatan}× di perangkat ini. Gurumu sudah diberi tahu.</div>}

      <main className="uj-soal">
        <div className="uj-soal-no">SOAL {idx + 1}{s.type === "komplex" ? " · pilih SEMUA jawaban yang benar" : ""}</div>
        <div className="uj-soal-tanya">{s.pertanyaan}</div>
        {s.gambar && <img src={s.gambar} alt="" className="uj-soal-img" draggable={false} />}
        <div className="uj-opsi">
          {s.type === "tf" && [0, 1].map(v => (
            <button key={v} type="button" className={Number(val) === v && terjawab(val) ? "on" : ""} aria-pressed={Number(val) === v && terjawab(val)} onClick={() => pilih(s.id, v)}>
              <span className="uj-huruf">{v === 0 ? "B" : "S"}</span><span>{v === 0 ? "Benar" : "Salah"}</span>
            </button>
          ))}
          {s.type === "pg" && (urutOpsi || []).map((asli, pos) => (
            <button key={asli} type="button" className={terjawab(val) && Number(val) === asli ? "on" : ""} aria-pressed={terjawab(val) && Number(val) === asli} onClick={() => pilih(s.id, asli)}>
              <span className="uj-huruf">{HURUF[pos]}</span><span>{s.opsi[asli]}</span>
            </button>
          ))}
          {s.type === "komplex" && (urutOpsi || []).map((asli, pos) => {
            const on = pilihanKomplex.includes(asli);
            return (
              <button key={asli} type="button" className={`kotak ${on ? "on" : ""}`} aria-pressed={on} onClick={() => pilih(s.id, on ? pilihanKomplex.filter(x => x !== asli) : [...pilihanKomplex, asli].sort())}>
                <span className="uj-huruf">{on ? <I n="check" s={14} /> : HURUF[pos]}</span><span>{s.opsi[asli]}</span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="uj-foot">
        <button type="button" className="uj-btn garis" disabled={idx === 0} onClick={() => pindah(idx - 1)}><I n="chevL" s={16} /> Sebelumnya</button>
        <button type="button" className={`uj-btn ragu ${ragu[s.id] ? "on" : ""}`} aria-pressed={!!ragu[s.id]} onClick={() => tandaiRagu(s.id)}>Ragu-ragu</button>
        {idx < total - 1
          ? <button type="button" className="uj-btn" onClick={() => pindah(idx + 1)}>Berikutnya <I n="chevR" s={16} /></button>
          : <button type="button" className="uj-btn" onClick={() => setKonfirm(true)}><I n="check" s={16} /> Kumpulkan</button>}
      </footer>

      {blokirFs && (
        <div className="uj-blokir" role="dialog" aria-modal="true">
          <div className="uj-kartu">
            <h2>Kamu keluar dari layar penuh</h2>
            <p>Ini tercatat. Kembali ke layar penuh untuk melanjutkan ujian.</p>
            <button type="button" className="uj-btn besar" onClick={() => masukFs()}>Kembali ke layar ujian</button>
          </div>
        </div>
      )}

      {konfirm && (
        <div className="modal-overlay" onClick={() => !mengirim && setKonfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog">
            <h3>Kumpulkan jawaban?</h3>
            {belum.length > 0
              ? <><p>Masih ada <b>{belum.length} soal</b> yang belum dijawab:</p>
                <div className="uj-belum">{belum.map(i => <button key={i} type="button" onClick={() => { setKonfirm(false); pindah(i); }}>{i + 1}</button>)}</div></>
              : <p>Semua {total} soal sudah dijawab.</p>}
            {nRagu > 0 && <p>{nRagu} soal masih kamu tandai ragu-ragu.</p>}
            <p>Setelah dikumpulkan, jawaban tidak bisa diubah lagi.</p>
            <div className="modal-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setKonfirm(false)} disabled={mengirim}>Cek lagi</button>
              <button className="btn btn-primary btn-sm" onClick={kumpulkan} disabled={mengirim}>{mengirim ? "Mengirim…" : "Kumpulkan sekarang"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelesaiUjian({ u, j, hasil, navigate, habis }) {
  const total = (u.soal || []).length;
  const dijawab = Object.values(j.answers || {}).filter(terjawab).length;
  const dikunci = j.cara === "dikunci guru";
  return (
    <div className="uj-siswa-page">
      <div className="uj-kartu">
        <span className="uj-centang"><I n={dikunci ? "alert" : "checkCircle"} s={30} /></span>
        <h2>{dikunci ? "Pengerjaan dihentikan guru" : habis || j.cara === "waktu habis" ? "Waktu habis — jawaban terkumpul" : "Jawabanmu sudah terkumpul"}</h2>
        <p>{u.judul} · {dijawab} dari {total} soal dijawab{j.submittedAt ? ` · ${fmtJam(j.submittedAt)}` : ""}</p>
        {dikunci && <p>Jawaban yang sudah tersimpan tetap dinilai. Kalau ini keliru, sampaikan ke gurumu.</p>}
        {u.hasilTerbit && hasil ? (
          <div className="uj-nilai">
            <span>Nilaimu</span>
            <b className={hasil.nilai < KKTP ? "bawah" : ""}>{hasil.nilai}</b>
            <small>{hasil.benar} dari {hasil.total} soal benar</small>
          </div>
        ) : <p className="uj-muted">Nilai akan muncul di sini setelah gurumu menerbitkannya.</p>}
        <button type="button" className="uj-btn" onClick={() => navigate("home")}>Kembali ke Beranda</button>
      </div>
    </div>
  );
}

// (dipakai untuk uji cepat tanpa UI)
export { nilaiUjian };

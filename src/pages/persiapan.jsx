// Astrolab — Persiapan SAS (Latihan Mandiri, Nov 2026)
// Bank soal KEMBARAN per sub-materi (indikator sama dengan SAS, angka & konteks berbeda) + ringkasan + pembahasan.
// Data: src/data/persiapan-sas.js (statis, ikut deploy). Gambar: public/persiapan/.
// Progres & skor disimpan di latihanProgress/{siswaId}/{paketId||subId} (pakai fungsi latihan yang sudah ada).
import { useState } from "react";
import { I } from "../components/icons";
import { shuffle } from "../utils/helpers";
import { LatihanQuiz } from "./materi";
import { PAKET_PERSIAPAN } from "../data/persiapan-sas";
import "../styles/persiapan.css";

const HARI = 864e5;
const akhirHari = tgl => new Date(`${tgl}T23:59:59+07:00`).getTime();
// Paket tampil sampai tanggal "sampai" (hari setelah ujian) berakhir
export const paketUntuk = jenjang => PAKET_PERSIAPAN.filter(p => p.jenjang === jenjang && Date.now() <= akhirHari(p.sampai));

function hMinus(p) {
  const hariIni = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // tanggal WIB
  const d = Math.round((Date.parse(p.tgl) - Date.parse(hariIni)) / HARI);
  return d > 1 ? `H-${d}` : d === 1 ? "Besok" : d === 0 ? "Hari ini" : "Selesai";
}

function progresSub(store, p, s) {
  const seen = store.getLatihanSeen(p.id, s.id);
  const total = s.soal.length;
  const dilatih = s.soal.filter(q => seen.has(kunciSoal(q.pertanyaan))).length;
  const skor = store.getSkorLatihan ? store.getSkorLatihan(p.id, s.id) : null;
  return { total, dilatih, skor };
}
// HARUS sama dengan latihanSoalKey di materi.jsx (dipakai LatihanQuiz untuk menandai soal sudah dilatih)
function kunciSoal(pertanyaan) {
  const str = (pertanyaan || "").trim().toLowerCase().replace(/\s+/g, " ");
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return "q" + h.toString(36);
}

// ─── Kartu di halaman Mandiri ───
export function PersiapanKartu({ user, store, navigate }) {
  const list = paketUntuk(user.jenjang);
  if (!list.length) return null;
  return list.map(p => {
    const semua = p.sub.reduce((a, s) => { const x = progresSub(store, p, s); return { t: a.t + x.total, d: a.d + x.dilatih }; }, { t: 0, d: 0 });
    const pct = semua.t ? Math.round(semua.d / semua.t * 100) : 0;
    return (
      <button key={p.id} type="button" className="ps-kartu" onClick={() => navigate("persiapan", { paketId: p.id })}>
        <span className="ps-kartu-ic" aria-hidden="true"><I n="target" s={22} /></span>
        <span className="ps-kartu-main">
          <span className="ps-kartu-ey">Persiapan SAS · {p.mapel} Kelas {p.jenjang}</span>
          <b>{p.tanggal}</b>
          <small>{p.sub.length} sub-materi · {semua.t} soal latihan + pembahasan · {pct}% sudah dilatih</small>
          <span className="ps-meter"><i style={{ width: `${pct}%` }} /></span>
        </span>
        <span className="ps-hmin">{hMinus(p)}</span>
      </button>
    );
  });
}

// ─── Halaman (rute "persiapan") ───
export function PersiapanSAS({ user, store, navigate, paketId }) {
  const p = PAKET_PERSIAPAN.find(x => x.id === paketId && x.jenjang === user.jenjang) || paketUntuk(user.jenjang)[0];
  const [subId, setSubId] = useState(null);
  const [kuis, setKuis] = useState(null); // { mode: "sub" | "simulasi", sub?, pilihan? }
  if (!p) {
    return <div className="sw"><div className="ui-page"><section className="ui-card center"><div className="ui-empty"><I n="target" s={28} /><div className="ui-title">Belum ada persiapan ujian</div><p className="ui-text">Persiapan ujian untuk kelasmu belum tersedia.</p></div><button type="button" className="ui-btn" onClick={() => navigate("latihan-mandiri")}>Kembali</button></section></div></div>;
  }

  if (kuis) {
    const selesai = (benar, total) => {
      if (store.simpanSkorLatihan) store.simpanSkorLatihan(p.id, kuis.mode === "simulasi" ? "simulasi" : kuis.sub.id, benar, total).catch?.(() => {});
    };
    if (kuis.mode === "simulasi") return <LatihanQuiz key="sim" mapel={p.id} bab="simulasi" judul="Simulasi SAS" soalPool={kuis.pilihan} pilihan={kuis.pilihan} store={store} onHasil={selesai} onBack={() => setKuis(null)} />;
    return <LatihanQuiz key={kuis.sub.id + kuis.n} mapel={p.id} bab={kuis.sub.id} judul={kuis.sub.nama} soalPool={kuis.sub.soal} store={store} onHasil={selesai} onBack={() => setKuis(null)} />;
  }

  const s = subId ? p.sub.find(x => x.id === subId) : null;
  if (s) return <SubMateri p={p} s={s} store={store} onBack={() => setSubId(null)} onMulai={n => setKuis({ mode: "sub", sub: s, n })} />;

  function mulaiSimulasi() {
    // Ambil soal acak per sub-materi sebanyak jumlah soal di SAS (proporsional kisi-kisi), urut per sub-materi
    const pilihan = p.sub.flatMap(x => shuffle([...x.soal]).slice(0, x.jumlahSAS));
    setKuis({ mode: "simulasi", pilihan });
  }
  const skorSim = store.getSkorLatihan ? store.getSkorLatihan(p.id, "simulasi") : null;

  return (
    <div className="sw">
      <div className="topbar">
        <button className="topbar-back" onClick={() => navigate("latihan-mandiri")} aria-label="Kembali"><I n="chevL" s={18} /></button>
        <div className="topbar-title" style={{ fontSize: 13 }}>Persiapan SAS</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="ui-page mid">
        <header className="ui-head">
          <span className="ui-head-ey">{p.mapel} Kelas {p.jenjang} · {p.tanggal}</span>
          <h1>Persiapan SAS <span className="ps-hmin inline">{hMinus(p)}</span></h1>
          <span className="ui-head-sub">{p.bentuk}. Soal di sini dibuat mirip soal SAS supaya kamu punya gambaran, tetapi bukan soal yang sama.</span>
        </header>

        <section className="ui-card ps-sim">
          <div>
            <b>Simulasi lengkap</b>
            <p className="ui-text">{p.jumlahSAS} soal acak dengan komposisi seperti SAS. Pembahasan muncul setelah tiap jawaban.</p>
            {skorSim && <span className="ui-chip">Terakhir {skorSim.benar}/{skorSim.total} · terbaik {skorSim.terbaik}/{skorSim.total}</span>}
          </div>
          <button type="button" className="ui-btn" onClick={mulaiSimulasi}><I n="play" s={14} /> Mulai simulasi</button>
        </section>

        <section className="ui-card">
          <div className="ui-label-row"><span className="ui-label">Per sub-materi</span><span className="ui-aside">ringkasan + latihan</span></div>
          <div className="ps-daftar">
            {p.sub.map((x, i) => {
              const g = progresSub(store, p, x);
              const pct = g.total ? Math.round(g.dilatih / g.total * 100) : 0;
              return (
                <button key={x.id} type="button" className="ps-sub" onClick={() => setSubId(x.id)}>
                  <span className="ps-no">{i + 1}</span>
                  <span className="ps-sub-main">
                    <span className="ps-sub-title"><b>{x.nama}</b>{g.skor && <span className={`ui-chip ${g.skor.benar / g.skor.total < 0.7 ? "amber" : ""}`}>{g.skor.benar}/{g.skor.total}</span>}</span>
                    <small>{x.jumlahSAS} soal di SAS · {g.dilatih}/{g.total} soal latihan sudah dicoba</small>
                    <span className="ps-meter"><i style={{ width: `${pct}%` }} /></span>
                  </span>
                  <I n="chevR" s={16} style={{ color: "var(--ink-4)" }} />
                </button>
              );
            })}
          </div>
        </section>
        <p className="ps-catatan">Latihan tidak masuk nilai. Skor berwarna oranye artinya di bawah 70%: baca ringkasannya lagi, lalu ulangi.</p>
      </div>
    </div>
  );
}

function SubMateri({ p, s, store, onBack, onMulai }) {
  const [n, setN] = useState(0);
  const g = progresSub(store, p, s);
  const r = s.ringkasan || {};
  const habis = g.dilatih >= g.total;
  return (
    <div className="sw">
      <div className="topbar">
        <button className="topbar-back" onClick={onBack} aria-label="Kembali"><I n="chevL" s={18} /></button>
        <div className="topbar-title" style={{ fontSize: 13 }}>{s.nama}</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="ui-page mid">
        <header className="ui-head">
          <span className="ui-head-ey">Persiapan SAS · {p.mapel} Kelas {p.jenjang}</span>
          <h1>{s.nama}</h1>
          <span className="ui-head-sub">{s.jumlahSAS} soal di SAS{r.pola ? ` · ${r.pola}` : ""}</span>
        </header>

        <section className="ui-card ps-ring">
          <div className="ui-label-row"><span className="ui-label">Ringkasan</span></div>
          {r.rumus && <div className="ps-rumus">{r.rumus.map(x => <code key={x}>{x}</code>)}</div>}
          {r.langkah && <ol className="ps-langkah">{r.langkah.map(x => <li key={x}>{x}</li>)}</ol>}
          {r.poin && <ul className="ps-poin">{r.poin.map(x => <li key={x}>{x}</li>)}</ul>}
          {r.wajib && <div className="ps-note wajib"><span>Wajib hafal</span><p>{r.wajib}</p></div>}
          {r.jebakan && <div className="ps-note jebakan"><span>Jebakan</span><p>{r.jebakan}</p></div>}
          {r.trik && <div className="ps-note trik"><span>Trik</span><p>{r.trik}</p></div>}
        </section>

        <section className="ui-card ps-mulai">
          <div>
            <b>Latihan {Math.min(10, g.total)} soal</b>
            <p className="ui-text">{habis ? "Semua soal sudah kamu coba. Ulangi untuk mengecek pemahaman." : `${g.total - g.dilatih} soal belum pernah kamu coba. Soal yang belum dicoba didahulukan.`}</p>
            {g.skor && <span className={`ui-chip ${g.skor.benar / g.skor.total < 0.7 ? "amber" : ""}`}>Terakhir {g.skor.benar}/{g.skor.total} · terbaik {g.skor.terbaik}/{g.skor.total}</span>}
          </div>
          <span className="ps-mulai-act">
            {g.dilatih > 0 && <button type="button" className="ui-btn outline sm" onClick={() => { store.resetLatihanProgress(p.id, s.id); setN(x => x + 1); }}><I n="rotate" s={12} /> Ulang dari awal</button>}
            <button type="button" className="ui-btn" onClick={() => onMulai(n)}>{g.dilatih ? "Lanjut latihan" : "Mulai latihan"}</button>
          </span>
        </section>
      </div>
    </div>
  );
}

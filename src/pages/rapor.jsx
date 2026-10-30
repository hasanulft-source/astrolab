// Astrolab — Rapor Perkembangan (siswa), redesign Okt 2026
// Siswa membaca nilaiAkhir & nilaiBoost per kunci lewat get() (bukan listener), sama seperti versi lama,
// jadi tidak butuh perubahan Firebase Rules. Firebase app sudah di-init di App.jsx; getDatabase() tanpa
// argumen mengembalikan instance default yang sama.
// Struktur: RaporSiswaV2 (ambil data) → buildRapor (hitung, murni) → RaporView (tampilan, murni).
import { useEffect, useState } from "react";
import { getDatabase, ref, get } from "firebase/database";
import { fmtDl } from "../utils/helpers";
import "../styles/rapor.css";

export const KKTP = 70;
const MIN_TERISI = 3; // nilai sementara baru tampil setelah minimal 3 komponen terisi
const sanitize = s => s.replace(/[.#$/[\]]/g, "-");

// ─── Hitung (murni, bisa dites tanpa Firebase) ───
export function buildRapor({ rec = {}, boosts = {}, tugas = [], subs = [], siswaId, mapel, jenjang, isSusulanAktif = () => false, tugasAvg = null }) {
  const boostArr = Object.values(boosts || {});
  const boostOf = key => boostArr.filter(b => b.komponen === key).reduce((a, b) => a + (Number(b.nilai) || 0), 0);
  const nums = o => Object.values(o || {}).filter(v => typeof v === "number");
  const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

  // Tugas Astrolab — filter sama dengan getTugasAstrolabAvg di App.jsx
  const relevan = tugas.filter(t => t.mapel === mapel && t.jenjang === jenjang && t.status !== "scheduled" && t.graded !== false
    && (!Array.isArray(t.assignedTo) || t.assignedTo.includes(siswaId)));
  const subOf = id => subs.find(s => s.siswaId === siswaId && s.tugasId === id);
  const dikerjakan = relevan.filter(t => subOf(t.id)).length;
  const terlewatList = relevan.filter(t => !subOf(t.id) && fmtDl(t.deadline).tone === "bad" && !isSusulanAktif(t.id, siswaId));

  const sumatifVals = nums(rec.sumatif), kuisVals = nums(rec.kuis);
  const withBoost = (base, key) => {
    const boost = boostOf(key);
    if (typeof base !== "number") return { val: null, boost: 0 };
    return { val: Math.min(100, base + boost), boost };
  };
  const det = {
    sumatif: sumatifVals.length ? `${sumatifVals.length} BAB dinilai` : "Belum dinilai",
    tugasAstrolab: relevan.length ? `${dikerjakan} dikerjakan${terlewatList.length ? ` · ${terlewatList.length} terlewat` : ""}` : "Belum ada tugas",
    uts: "", uas: "Belum dilaksanakan", kuis: kuisVals.length ? `${kuisVals.length} kuis` : "Belum dinilai", portofolio: "Belum dinilai",
  };
  const komponen = [
    { key: "sumatif", label: "Sumatif per BAB", bobot: 10, ...withBoost(avg(sumatifVals), "sumatif") },
    { key: "tugasAstrolab", label: "Tugas Astrolab", bobot: 20, ...withBoost(tugasAvg, "tugasAstrolab") },
    { key: "uts", label: "STS", bobot: 20, ...withBoost(rec.uts, "uts") },
    { key: "uas", label: "SAS", bobot: 20, ...withBoost(rec.uas, "uas") },
    { key: "kuis", label: "Kuis Harian", bobot: 10, ...withBoost(avg(kuisVals), "kuis") },
    { key: "portofolio", label: "Portofolio", bobot: 20, ...withBoost(rec.portofolio, "portofolio") },
  ].map(k => ({ ...k, det: typeof k.val === "number" ? (k.key === "uts" || k.key === "uas" || k.key === "portofolio" ? "" : det[k.key]) : (det[k.key] || "Belum dinilai") }));
  // Tugas Astrolab yang 0 karena semua terlewat tetap ditampilkan, detailnya menjelaskan kenapa.
  const terisi = komponen.filter(k => typeof k.val === "number");
  const tb = terisi.reduce((a, k) => a + k.bobot, 0);
  const nilai = tb ? terisi.reduce((a, k) => a + k.val * k.bobot, 0) / tb : null;
  const sts = typeof rec.uts === "number" ? rec.uts : null;
  const lanjutan = typeof rec.asesmenLanjutan === "number" ? rec.asesmenLanjutan : null;
  return { mapel, komponen, terisi: terisi.length, nilai, sts, lanjutan, terlewat: terlewatList.length };
}

// ─── Tampilan (murni) ───
const f1 = v => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");

function Track({ pre, post }) {
  const W = 360, X = v => 12 + v / 100 * (W - 24);
  return (
    <svg viewBox={`0 0 ${W} 56`} role="img" aria-label={`STS ${pre}, Asesmen Lanjutan ${post}, KKTP ${KKTP}, skala 0 sampai 100`} className="rp-track">
      <rect x={X(0)} y="22" width={X(100) - X(0)} height="8" rx="4" fill="#EEF3F5" />
      {[0, 50, 100].map(v => <text key={v} x={X(v)} y="52" textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="11" fill="#7D959D">{v}</text>)}
      <line x1={X(KKTP)} y1="13" x2={X(KKTP)} y2="39" stroke="#0E2A33" strokeOpacity=".5" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x={X(KKTP)} y="9" textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="10.5" fill="#43606A">KKTP</text>
      <line x1={X(pre)} y1="26" x2={X(post)} y2="26" stroke={post >= pre ? "#088395" : "#B45309"} strokeWidth="5" strokeLinecap="round" />
      <circle cx={X(pre)} cy="26" r="7" fill="#fff" stroke="#8A9BA2" strokeWidth="2.5" />
      <circle cx={X(post)} cy="26" r="8" fill={post >= pre ? "#088395" : "#B45309"} stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

function MapelRapor({ r, onLihatTugas }) {
  const dots = r.komponen.map(k => <i key={k.key} className={typeof k.val === "number" ? "on" : ""} />);
  const d = r.sts != null && r.lanjutan != null ? r.lanjutan - r.sts : null;
  const stsBonus = (r.komponen.find(k => k.key === "uts") || {}).boost > 0;
  return (
    <>
      <section className="rp-card" aria-label={`Nilai semester ${r.mapel}`}>
        <span className="rp-k">Nilai semester {r.mapel}</span>
        {r.terisi >= MIN_TERISI ? (
          <div className="rp-status">
            <div className="rp-big">{f1(r.nilai)}</div>
            <div><p><b>Nilai sementara</b>, dari {r.terisi} dari 6 komponen yang sudah dinilai. Akan berubah sampai semua komponen terisi.</p><div className="rp-dots" aria-hidden="true">{dots}</div></div>
          </div>
        ) : (
          <div>
            <div className="rp-wait">Belum ada nilai sementara</div>
            <p className="rp-p">Baru {r.terisi} dari 6 komponen yang dinilai. Nilai sementara muncul setelah minimal {MIN_TERISI} komponen terisi.</p>
            <div className="rp-dots" aria-hidden="true">{dots}</div>
          </div>
        )}
      </section>

      <section className="rp-card" aria-label="Perkembangan">
        <div className="rp-krow"><span className="rp-k">Perkembangan</span><span>STS → Asesmen Lanjutan</span></div>
        {d == null ? (
          <p className="rp-p">{r.sts == null ? "Nilai STS belum dimasukkan." : `Asesmen Lanjutan ${r.mapel} belum dinilai. Perkembangan dari STS akan tampil di sini.`}</p>
        ) : (
          <>
            <div className="rp-scores">
              <div className="rp-sc pre"><span>STS{stsBonus ? " (tanpa bonus)" : ""}</span><b>{r.sts}</b></div>
              <svg className="rp-arr" width="26" height="18" viewBox="0 0 28 20" aria-hidden="true"><path d="M2 10h22M17 3l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div className="rp-sc post"><span>Asesmen Lanjutan</span><b>{r.lanjutan}</b></div>
            </div>
            <span className={`rp-badge ${d < 0 ? "down" : ""}`}>{d > 0 ? "+" : d < 0 ? "−" : "±"}{Math.abs(d)} poin</span>
            <Track pre={r.sts} post={r.lanjutan} />
            <p className="rp-p">{d > 0 ? <>Kamu naik <b>{d} poin</b> dari STS.</> : d < 0 ? <>Kali ini <b>{Math.abs(d)} poin</b> di bawah STS. Ceritakan ke guru bagian mana yang terasa sulit.</> : <>Nilaimu sama dengan STS.</>} Asesmen Lanjutan tidak mengubah nilai STS maupun nilai rapormu.</p>
          </>
        )}
      </section>

      <section className="rp-card" aria-label="Komponen nilai">
        <div className="rp-krow"><span className="rp-k">Komponen nilai</span><span className="rp-legend"><i />KKTP {KKTP}</span></div>
        <div className="rp-komp">
          {r.komponen.map(k => {
            const has = typeof k.val === "number", below = has && k.val < KKTP;
            return (
              <div className="rp-kr" key={k.key}>
                <div className="rp-nm">{k.label}<small>{k.bobot}%</small></div>
                <div className={`rp-val ${has ? (below ? "below" : "") : "none"}`}>{has ? Math.round(k.val) : "Belum"}</div>
                <div>
                  {has && <div className="rp-bar"><i className={below ? "below" : ""} style={{ width: `${k.val}%` }} /></div>}
                  {(k.det || k.boost > 0) && <div className="rp-det" style={{ marginTop: has ? 5 : 0 }}>{k.det}{k.boost > 0 ? `${k.det ? " · " : ""}termasuk bonus +${k.boost}` : ""}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {r.terlewat > 0 && onLihatTugas && (
        <section className="rp-card" aria-label="Yang bisa kamu lakukan">
          <span className="rp-k">Yang bisa kamu lakukan</span>
          <div className="rp-act"><p>{r.terlewat} tugas lewat tenggat<span>Dihitung 0 sampai dikerjakan. Minta akses susulan ke guru.</span></p><button type="button" onClick={onLihatTugas}>Lihat tugas</button></div>
        </section>
      )}
    </>
  );
}

export function RaporView({ nama, kelas, periode, mapels, rapor, published, onLihatTugas, onBack }) {
  const [tab, setTab] = useState(mapels[0]);
  const active = mapels.includes(tab) ? tab : mapels[0];
  const r = rapor[active];
  return (
    <div className="rp">
      <div className="topbar"><button className="topbar-back" onClick={onBack} aria-label="Kembali"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button><div className="topbar-title">Rapor Perkembangan</div><div style={{ width: 36 }} /></div>
      <div className="rp-wrap">
        <header className="rp-head"><span className="rp-ey">{periode}</span><h1>Rapor Perkembangan</h1><span className="rp-who">{nama} · {kelas}</span></header>
        {mapels.length > 1 && (
          <div className="rp-tabs" role="tablist">
            {mapels.map(m => <button key={m} role="tab" aria-selected={m === active} onClick={() => setTab(m)}>{m}</button>)}
          </div>
        )}
        {!published[active] ? (
          <section className="rp-card rp-center">
            <div className="rp-wait">Nilai {active} belum diterbitkan</div>
            <p className="rp-p">Guru belum menerbitkan nilai {active} semester ini. Nanti akan muncul di sini.</p>
          </section>
        ) : r ? <MapelRapor r={r} onLihatTugas={onLihatTugas} /> : null}
      </div>
    </div>
  );
}

// ─── Kontainer: ambil data siswa yang login ───
export function RaporSiswaV2({ user, store, navigate }) {
  const periode = store.getActivePeriode();
  const mapels = user.jenjang === "VII" ? ["IPA", "Informatika"] : ["IPA"];
  const [loaded, setLoaded] = useState(null); // { [mapel]: { rec, boosts } }

  useEffect(() => {
    let alive = true;
    (async () => {
      const db = getDatabase();
      const out = {};
      for (const mapel of mapels) {
        const key = sanitize(`${user.id}_${mapel}_${user.jenjang}_${periode}`);
        let rec = null, boosts = {};
        try { rec = (await get(ref(db, `nilaiAkhir/${key}`))).val(); } catch { rec = null; }
        try { boosts = (await get(ref(db, `nilaiBoost/${key}`))).val() || {}; } catch { boosts = {}; }
        out[mapel] = { rec: rec || {}, boosts };
      }
      if (alive) setLoaded(out);
    })();
    return () => { alive = false; };
  }, [user.id, user.jenjang, periode]);

  const back = () => navigate("profil");
  if (!loaded) return (
    <div className="rp">
      <div className="topbar"><button className="topbar-back" onClick={back} aria-label="Kembali"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button><div className="topbar-title">Rapor Perkembangan</div><div style={{ width: 36 }} /></div>
      <div className="rp-wrap"><p className="rp-p" style={{ textAlign: "center", padding: "48px 0" }}>Memuat rapor...</p></div>
    </div>
  );

  const tugas = store.getTugas(), subs = store.getSubs();
  const rapor = {}, published = {};
  mapels.forEach(m => {
    published[m] = store.isNilaiPublished(m, user.jenjang, periode);
    rapor[m] = buildRapor({
      rec: loaded[m].rec, boosts: loaded[m].boosts, tugas, subs, siswaId: user.id, mapel: m, jenjang: user.jenjang,
      isSusulanAktif: store.isSusulanAktif, tugasAvg: store.getTugasAstrolabAvg(user.id, m, user.jenjang),
    });
  });
  return <RaporView nama={user.nama} kelas={user.kelas || `Kelas ${user.jenjang}`} periode={periode} mapels={mapels} rapor={rapor} published={published}
    onLihatTugas={() => navigate("tugas")} onBack={back} />;
}

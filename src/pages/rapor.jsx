// Astrolab — Rapor Perkembangan (siswa), redesign Okt 2026
// Siswa membaca nilaiAkhir & nilaiBoost per kunci lewat get() (bukan listener), sama seperti versi lama,
// jadi tidak butuh perubahan Firebase Rules. Firebase app sudah di-init di App.jsx; getDatabase() tanpa
// argumen mengembalikan instance default yang sama.
// Struktur: RaporSiswaV2 (ambil data) → buildRapor (hitung, murni) → RaporView (tampilan, murni).
import { useEffect, useState } from "react";
import { getDatabase, ref, get } from "firebase/database";
import { fmtDl } from "../utils/helpers";
import { KKTP, Page, TopBar, PageHeader, Card, Tabs, Dots, StatBlock, KktpLegend, ScoreRow, ScoreRows, DeltaBadge, ActionCallout, EmptyState, MoveTrack } from "../components/ui";
import "../styles/rapor.css";

export { KKTP }; // sumber: components/ui.jsx
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

// ─── Tampilan (murni) — memakai komponen dasar di components/ui.jsx ───
const f1 = v => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
const Arrow = () => <svg className="rp-arr" width="26" height="18" viewBox="0 0 28 20" aria-hidden="true"><path d="M2 10h22M17 3l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function MapelRapor({ r, onLihatTugas }) {
  const dots = r.komponen.map(k => typeof k.val === "number");
  const d = r.sts != null && r.lanjutan != null ? r.lanjutan - r.sts : null;
  const stsBonus = (r.komponen.find(k => k.key === "uts") || {}).boost > 0;
  return (
    <>
      <Card label={`Nilai semester ${r.mapel}`}>
        {r.terisi >= MIN_TERISI ? (
          <StatBlock value={f1(r.nilai)} dots={dots}>
            <p><b>Nilai sementara</b>, dari {r.terisi} dari 6 komponen yang sudah dinilai. Akan berubah sampai semua komponen terisi.</p>
          </StatBlock>
        ) : (
          <div>
            <div className="ui-title" style={{ marginBottom: 6 }}>Belum ada nilai sementara</div>
            <p className="ui-text">Baru {r.terisi} dari 6 komponen yang dinilai. Nilai sementara muncul setelah minimal {MIN_TERISI} komponen terisi.</p>
            <Dots filled={dots} />
          </div>
        )}
      </Card>

      <Card label="Perkembangan" aside="STS → Asesmen Lanjutan">
        {d == null ? (
          <p className="ui-text">{r.sts == null ? "Nilai STS belum dimasukkan." : `Asesmen Lanjutan ${r.mapel} belum dinilai. Perkembangan dari STS akan tampil di sini.`}</p>
        ) : (
          <>
            <div className="rp-scores">
              <div className="rp-sc pre"><span>STS{stsBonus ? " (tanpa bonus)" : ""}</span><b>{r.sts}</b></div>
              <Arrow />
              <div className="rp-sc post"><span>Asesmen Lanjutan</span><b>{r.lanjutan}</b></div>
            </div>
            <DeltaBadge delta={d} />
            <MoveTrack from={r.sts} to={r.lanjutan} labelFrom="STS" labelTo="Asesmen Lanjutan" />
            <p className="ui-text">{d > 0 ? <>Kamu naik <b>{d} poin</b> dari STS.</> : d < 0 ? <>Kali ini <b>{Math.abs(d)} poin</b> di bawah STS. Ceritakan ke guru bagian mana yang terasa sulit.</> : <>Nilaimu sama dengan STS.</>} Asesmen Lanjutan tidak mengubah nilai STS maupun nilai rapormu.</p>
          </>
        )}
      </Card>

      <Card label="Komponen nilai" aside={<KktpLegend />}>
        <ScoreRows>
          {r.komponen.map(k => (
            <ScoreRow key={k.key} label={k.label} weight={k.bobot} value={k.val}
              detail={(k.det || k.boost > 0) ? `${k.det}${k.boost > 0 ? `${k.det ? " · " : ""}termasuk bonus +${k.boost}` : ""}` : null} />
          ))}
        </ScoreRows>
      </Card>

      {r.terlewat > 0 && onLihatTugas && (
        <Card label="Yang bisa kamu lakukan">
          <ActionCallout title={`${r.terlewat} tugas lewat tenggat`} note="Dihitung 0 sampai dikerjakan. Minta akses susulan ke guru." actionLabel="Lihat tugas" onAction={onLihatTugas} />
        </Card>
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
      <TopBar title="Rapor Perkembangan" onBack={onBack} />
      <Page>
        <PageHeader eyebrow={periode} title="Rapor Perkembangan" subtitle={`${nama} · ${kelas}`} />
        {mapels.length > 1 && <Tabs items={mapels} value={active} onChange={setTab} />}
        {!published[active] ? (
          <Card center ariaLabel={`Nilai ${active} belum diterbitkan`}>
            <EmptyState title={`Nilai ${active} belum diterbitkan`}>Guru belum menerbitkan nilai {active} semester ini. Nanti akan muncul di sini.</EmptyState>
          </Card>
        ) : r ? <MapelRapor r={r} onLihatTugas={onLihatTugas} /> : null}
      </Page>
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
      <TopBar title="Rapor Perkembangan" onBack={back} />
      <Page><p className="ui-text" style={{ textAlign: "center", padding: "48px 0" }}>Memuat rapor...</p></Page>
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

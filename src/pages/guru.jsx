// Astrolab — layar guru Fase 3 (Nov 2026): Dashboard Guru & Analisis Tugas.
// Struktur: hitung* (murni, bisa dites tanpa Firebase) → komponen tampilan.
// Hanya MEMBACA data lewat store; tidak ada tulisan baru ke Firebase dari file ini.
// Komponen yang masih tinggal di App.jsx (NilaiEssayModal, IntervensiNilaiModal, computePerluPerhatian)
// dikirim lewat props supaya file ini tidak meng-import App.jsx.
import { useState } from "react";
import { verifikasiSandbox, normal } from "../utils/rumus";
import { exportNilai, backupFromStore } from "../utils/excel";
import { LaporanModal } from "../utils/laporan";
import { deadlineEnd } from "./siswa";
import { uid } from "../utils/helpers";
import { Confirm, Avatar } from "../components/visual";
import { getLevel, TierIcon } from "../components/gamification";
import "../styles/guru.css";

export const KKTP = 70;
const HARI = 864e5;
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const bulat = v => (v == null ? null : Math.round(v));
const tglPanjang = ms => new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "long" });
const namaPendek = n => { const p = String(n || "").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0] || "Siswa"; };
const inisial = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();
const WARNA_AVATAR = ["#0d6b7a", "#6D52D9", "#B0612C", "#0B8AC9", "#0a525c"];
// "Tren turun Informatika (100→88→75)" → ["Tren turun Informatika", "100 → 88 → 75"]
const pecahAlasan = label => { const m = String(label).match(/^(.*?)\s*\((.+)\)$/); return m ? [m[1], m[2].replace(/\s*→\s*/g, " → ")] : [label, null]; };

// Penerima tugas: tugas personal hanya siswa yang di-assign
export const penerimaTugas = (t, siswa) => (Array.isArray(t.assignedTo) ? siswa.filter(s => t.assignedTo.includes(s.id)) : siswa);
const perluDinilai = sub => (sub.soalResults || []).filter(r => r.statusNilai === "perlu_dinilai").length;

// Sisa waktu tugas dalam kata
export function labelTenggat(t, now) {
  if (!t.deadline) return { label: "Tanpa tenggat", segera: false, lewat: false };
  const end = deadlineEnd(t.deadline);
  if (end < now) return { label: "Lewat tenggat", segera: false, lewat: true };
  const a = new Date(now); a.setHours(0, 0, 0, 0);
  const b = new Date(end); b.setHours(0, 0, 0, 0);
  const hari = Math.round((b - a) / HARI);
  if (hari === 0) return { label: "Berakhir hari ini", segera: true, lewat: false };
  if (hari === 1) return { label: "Berakhir besok", segera: true, lewat: false };
  return { label: `${hari} hari lagi`, segera: false, lewat: false };
}

// ─── Dashboard (murni) ───
export function hitungDashboard(store, jenjang, now = Date.now()) {
  const siswa = store.getAllSiswa(jenjang);
  const subsAll = store.getSubs();
  const tugas = store.getTugas().filter(t => t.jenjang === jenjang && t.status !== "scheduled");
  const subsOf = id => subsAll.filter(s => s.tugasId === id);
  const idTugas = new Set(tugas.map(t => t.id));
  const subsKelas = subsAll.filter(s => idTugas.has(s.tugasId));

  const aktif = tugas.filter(t => !labelTenggat(t, now).lewat)
    .sort((a, b) => (a.deadline ? deadlineEnd(a.deadline) : Infinity) - (b.deadline ? deadlineEnd(b.deadline) : Infinity));
  const segera = aktif.filter(t => labelTenggat(t, now).segera).length;

  const kesempatan = tugas.reduce((n, t) => n + penerimaTugas(t, siswa).length, 0);
  const terkumpul = tugas.reduce((n, t) => {
    const ids = new Set(penerimaTugas(t, siswa).map(s => s.id));
    return n + subsOf(t.id).filter(s => ids.has(s.siswaId)).length;
  }, 0);

  const dinilai = subsKelas.filter(s => typeof s.nilai === "number" && tugas.find(t => t.id === s.tugasId)?.graded !== false);
  const rataKelas = bulat(avg(dinilai.map(s => s.nilai)));
  const rataSiswa = siswa.map(s => avg(dinilai.filter(x => x.siswaId === s.id).map(x => x.nilai))).filter(v => v != null);
  const bawahKKTP = rataSiswa.filter(v => v < KKTP).length;

  // Perlu ditindaklanjuti
  const todo = [];
  const esaiPerTugas = tugas.map(t => ({ t, n: subsOf(t.id).reduce((a, s) => a + perluDinilai(s), 0) })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
  if (esaiPerTugas.length) {
    const total = esaiPerTugas.reduce((a, x) => a + x.n, 0);
    todo.push({ key: "esai", tone: "amber", icon: "esai", title: `${total} jawaban esai belum dinilai`,
      meta: esaiPerTugas[0].t.judul + (esaiPerTugas.length > 1 ? ` dan ${esaiPerTugas.length - 1} tugas lain` : ""),
      action: "Nilai sekarang", tugas: esaiPerTugas[0].t });
  }
  const akses = (store.getAksesPending ? store.getAksesPending() : []).filter(r => idTugas.has(r.tugasId) || tugas.length === 0);
  if (akses.length) {
    todo.push({ key: "akses", tone: "amber", icon: "akses", title: `${akses.length} permintaan akses tugas`,
      meta: akses.slice(0, 2).map(r => `${namaPendek(r.siswaName)} · ${r.tugasJudul}`).join(" — ") + (akses.length > 2 ? ` dan ${akses.length - 2} lainnya` : ""),
      action: "Tinjau di Pesan" });
  }
  const lapor = store.getUnreadReportCount ? store.getUnreadReportCount() : 0;
  if (lapor > 0) todo.push({ key: "lapor", tone: "teal", icon: "lapor", title: `${lapor} laporan siswa baru`, meta: "Belum dibaca", action: "Lihat" });
  const sas = store.getTanggalSAS ? store.getTanggalSAS() : null;
  if (sas) {
    const sasMs = new Date(`${sas}T00:00:00`).getTime();
    const a = new Date(now); a.setHours(0, 0, 0, 0);
    const hari = Math.round((sasMs - a.getTime()) / HARI);
    if (hari > 0 && hari <= 30) {
      todo.push({ key: "sas", tone: "teal", icon: "sas", title: `SAS ${tglPanjang(sasMs)} · ${hari} hari lagi`, meta: "Nilai SAS diinput di Nilai Akhir", action: "Nilai Akhir" });
    } else if (hari <= 0 && store.getNilaiAkhirRecord && store.getActivePeriode) {
      const periode = store.getActivePeriode();
      const mapels = jenjang === "VII" ? ["IPA", "Informatika"] : ["IPA"];
      const kosong = mapels.map(m => ({ m, n: siswa.filter(s => typeof store.getNilaiAkhirRecord(s.id, m, jenjang, periode).uas !== "number").length })).filter(x => x.n > 0);
      if (kosong.length) todo.push({ key: "sas", tone: "amber", icon: "sas", title: "Nilai SAS belum lengkap",
        meta: kosong.map(x => `${x.m}: ${x.n} siswa`).join(" · "), action: "Nilai Akhir" });
    }
  }

  const berjalan = aktif.map(t => {
    const penerima = penerimaTugas(t, siswa);
    const ids = new Set(penerima.map(s => s.id));
    const ss = subsOf(t.id).filter(s => ids.has(s.siswaId));
    const nilai = ss.filter(s => typeof s.nilai === "number").map(s => s.nilai);
    const rata = bulat(avg(nilai));
    const esai = ss.reduce((a, s) => a + perluDinilai(s), 0);
    const bawah = nilai.filter(v => v < KKTP).length;
    const sandbox = (t.soal || []).filter(s => s.type === "sandbox").length;
    const tg = labelTenggat(t, now);
    let catatan, catatanTone;
    if (esai) { catatan = `${esai} esai belum dinilai`; catatanTone = "amber"; }
    else if (!ss.length) { catatan = "Belum ada yang mengumpulkan"; catatanTone = "muted"; }
    else if (bawah) { catatan = `${bawah} siswa di bawah KKTP`; catatanTone = "amber"; }
    else { catatan = "Semua yang mengumpulkan mencapai KKTP"; catatanTone = "teal"; }
    return {
      t, tenggat: tg.label, segera: tg.segera, kumpul: ss.length, penerima: penerima.length,
      kumpulPct: penerima.length ? Math.round(ss.length / penerima.length * 100) : 0, rata, catatan, catatanTone,
      meta: [t.mapel, `${(t.soal || []).length} soal`, sandbox ? `${sandbox} sandbox` : null,
        Array.isArray(t.assignedTo) ? `tugas personal · ${penerima.length} siswa` : null, t.graded === false ? "latihan khusus" : null].filter(Boolean).join(" · "),
    };
  });

  const top = store.getLeaderboard(jenjang).slice(0, 3).map((s, i) => ({ id: s.id, nama: s.namaDisplay || s.nama, poin: s.poin || 0, rank: i + 1 }));

  return {
    siswa: siswa.length, aktif: aktif.length, segera, kesempatan, terkumpul,
    pctKumpul: kesempatan ? Math.round(terkumpul / kesempatan * 100) : null,
    rataKelas, bawahKKTP, todo, berjalan, top,
  };
}

// ─── Analisis tugas (murni) ───
const cariHasil = (sub, s, i) => (sub.soalResults || []).find(x => (x.soalId && x.soalId === s.id) || (!x.soalId && x.origIdx === i));
const tingkat = p => (p == null ? "Belum ada data" : p >= 80 ? "Mudah" : p >= 50 ? "Sedang" : "Sulit");
const LABEL_TIPE = { pg: "Pilihan ganda", tf: "Benar/salah", komplex: "PG kompleks", pasang: "Menjodohkan", excel: "Tabel", pseudocode: "Pseudocode", debug: "Debug kode", essay: "Esai", refleksi: "Refleksi", sandbox: "Sandbox Terverifikasi" };

// Sebaran pilihan jawaban (pg/tf/excel: pickedAnswer; komplex: pickedMulti)
function sebaranOpsi(s, hasil) {
  const opsi = s.type === "tf" ? ["Benar", "Salah"] : (s.opsi || []);
  if (!opsi.length || !["pg", "tf", "excel", "komplex"].includes(s.type)) return null;
  const kunci = s.type === "komplex" ? new Set(s.jawaban || []) : new Set([s.jawaban]);
  const n = opsi.map((_, k) => hasil.filter(r => (s.type === "komplex" ? (r.pickedMulti || []).includes(k) : r.pickedAnswer === k)).length);
  const kosong = s.type === "komplex" ? 0 : hasil.filter(r => r.pickedAnswer === null || r.pickedAnswer === undefined).length;
  return { opsi: opsi.map((teks, k) => ({ k: String.fromCharCode(65 + k), teks, n: n[k], kunci: kunci.has(k) })), kosong, total: hasil.length };
}

function analisisSandbox(s, i, subs) {
  const hasil = subs.map(sub => ({ sub, r: cariHasil(sub, s, i) })).filter(x => x.r);
  const lolos = hasil.filter(x => x.r.correct === true);
  const dilewati = hasil.filter(x => x.r.status === "dilewati");
  const percobaan = avg(lolos.map(x => (Number(x.r.percobaan) || 0) + 1));
  const sel = (s.jawaban || []).map(j => {
    let ok = 0, dicek = 0;
    const salah = {};
    hasil.forEach(({ r }) => {
      if (!r.rumus) return;
      dicek++;
      const v = verifikasiSandbox(s, r.rumus).sel[j.sel];
      if (v?.ok) { ok++; return; }
      const f = normal(r.rumus[j.sel]) || "(kosong)";
      salah[f] = salah[f] || { rumus: f, alasan: v?.alasan || "", n: 0 };
      salah[f].n++;
    });
    return { sel: j.sel, fungsi: (j.fungsi || []).join(", "), kunci: j.rumusKunci || "", ok, dicek,
      pct: dicek ? Math.round(ok / dicek * 100) : null, salah: Object.values(salah).sort((a, b) => b.n - a.n).slice(0, 2), sempurna: dicek > 0 && ok === dicek };
  }).sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
  const lanjutan = (s.lanjutan || []).map((q, k) => {
    const rs = subs.map(sub => (sub.soalResults || []).find(x => x.soalId === `${s.id}#${k}`)).filter(Boolean);
    const benar = rs.filter(r => r.correct === true).length;
    const pct = rs.length ? Math.round(benar / rs.length * 100) : null;
    const dist = sebaranOpsi({ type: "pg", opsi: q.opsi, jawaban: q.jawaban }, rs);
    const salahTerbanyak = dist ? dist.opsi.filter(o => !o.kunci).sort((a, b) => b.n - a.n)[0] : null;
    const catatan = salahTerbanyak && rs.length && salahTerbanyak.n / rs.length >= 0.25
      ? `Pilihan "${salahTerbanyak.teks}" dipilih ${salahTerbanyak.n} siswa.` : null;
    const dariDilewati = dilewati.length ? dilewati.filter(({ sub }) => (sub.soalResults || []).some(x => x.soalId === `${s.id}#${k}` && x.correct === true)).length : null;
    return { k, tanya: q.pertanyaan, pct, catatan, dariDilewati };
  });
  const tersulit = lanjutan.filter(l => l.pct != null).sort((a, b) => a.pct - b.pct)[0];
  return {
    i, soal: s, total: hasil.length, lolos: lolos.length, dilewati: dilewati.length,
    belum: hasil.length - lolos.length - dilewati.length,
    pctLolos: hasil.length ? Math.round(lolos.length / hasil.length * 100) : null,
    percobaan: percobaan == null ? null : Math.round(percobaan * 10) / 10,
    sel, lanjutan,
    wawasan: tersulit && dilewati.length
      ? `Dari ${dilewati.length} siswa yang melewati sandbox, ${tersulit.dariDilewati} menjawab lanjutan ${tersulit.k + 1} dengan benar.` : null,
  };
}

export function hitungAnalisis(t, subsAll, siswaKelas, { hanyaBawah = false } = {}) {
  const penerima = penerimaTugas(t, siswaKelas);
  const idPenerima = new Set(penerima.map(s => s.id));
  const subsTugas = subsAll.filter(s => s.tugasId === t.id);
  const nilai = subsTugas.filter(s => typeof s.nilai === "number").map(s => s.nilai);
  const rata = bulat(avg(nilai));
  const tercapai = nilai.filter(v => v >= KKTP).length;
  const subs = hanyaBawah ? subsTugas.filter(s => (s.nilai || 0) < KKTP) : subsTugas;

  const BIN = [["< 50", 0, 49], ["50–59", 50, 59], ["60–69", 60, 69], ["70–79", 70, 79], ["80–89", 80, 89], ["90–100", 90, 100]];
  const bins = BIN.map(([label, lo, hi]) => ({ label, n: nilai.filter(v => v >= lo && v <= hi + 0.999).length, bawah: hi < KKTP }));

  const sandbox = [], soalLain = [];
  (t.soal || []).forEach((s, i) => {
    if (s.type === "sandbox") { sandbox.push(analisisSandbox(s, i, subs)); return; }
    const hasil = subs.map(sub => cariHasil(sub, s, i)).filter(Boolean);
    let benar, dihitung, manual = false;
    if (s.type === "essay") {
      manual = true;
      const dn = hasil.filter(r => r.statusNilai === "dinilai");
      dihitung = dn.length; benar = dn.filter(r => (r.nilaiEssay || 0) >= 60).length;
    } else if (s.type === "refleksi") {
      manual = true; dihitung = 0; benar = 0;
    } else { dihitung = hasil.length; benar = hasil.filter(r => r.correct === true).length; }
    const pct = dihitung ? Math.round(benar / dihitung * 100) : null;
    soalLain.push({ i, soal: s, no: i + 1, tipe: LABEL_TIPE[s.type] || s.type, pct, label: s.type === "refleksi" ? "Tidak dinilai benar/salah" : tingkat(pct),
      manual, belumDinilai: hasil.filter(r => r.statusNilai === "perlu_dinilai").length, sebaran: sebaranOpsi(s, hasil) });
  });
  soalLain.sort((a, b) => (a.pct == null) - (b.pct == null) || (a.pct ?? 0) - (b.pct ?? 0));

  const adaSandbox = sandbox.length > 0;
  const sandboxSoal = (t.soal || []).map((s, i) => ({ s, i })).filter(x => x.s.type === "sandbox");
  const daftar = subsTugas.slice().sort((a, b) => (b.nilai ?? -1) - (a.nilai ?? -1)).map(sub => {
    const sb = sandboxSoal.map(({ s, i }) => cariHasil(sub, s, i)).filter(Boolean);
    const esai = perluDinilai(sub);
    return {
      id: sub.id, siswaId: sub.siswaId, nilai: sub.nilai,
      sandbox: !sb.length ? null : sb.every(r => r.correct === true)
        ? `Lolos · ${Math.max(...sb.map(r => (Number(r.percobaan) || 0) + 1))} kali` : sb.some(r => r.status === "dilewati") ? "Dilewati" : "Belum lolos",
      status: esai ? "Esai belum dinilai" : sub.ontime === false ? "Terlambat" : "Tepat waktu",
      statusTone: esai || sub.ontime === false ? "amber" : "teal",
    };
  });
  const sudah = new Set(subsTugas.map(s => s.siswaId));
  const belum = penerima.filter(s => !sudah.has(s.id));

  return {
    penerima: penerima.length, kumpul: subsTugas.filter(s => idPenerima.has(s.siswaId)).length, totalSub: subsTugas.length,
    rata, tercapai, bawah: nilai.length - tercapai, terlambat: subsTugas.filter(s => s.ontime === false).length,
    esaiBelum: subsTugas.reduce((a, s) => a + perluDinilai(s), 0),
    bins, maxBin: Math.max(1, ...bins.map(b => b.n)), sandbox, soalLain, adaSandbox, daftar, belum, dianalisis: subs.length,
  };
}

// ─── Potongan tampilan ───
const Ikon = ({ d, s = 17, w = 2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const IKON = {
  esai: "M4 20h16M6 16l9.5-9.5a2.1 2.1 0 0 1 3 3L9 19H6v-3z",
  akses: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  lapor: "M5 21V4h11l-1.5 4L16 12H5",
  sas: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  plus: "M12 5v14M5 12h14",
  pesan: "M20 12a8 8 0 0 1-11.6 7.1L4 20l1.2-4.1A8 8 0 1 1 20 12z",
  latihan: "M9 3h6v3H9zM7 4.5H5.5V21h13V4.5H17M12 10v7M8.5 13.5h7",
  centang: "M5 12.5l4.5 4.5L19 7.5",
  balik: "M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  kanan: "M9 6l6 6-6 6",
  kiri: "M15 6l-6 6 6 6",
};
const Bar = ({ v, tone = "teal", kktp = false, tebal }) => (
  <div className={`gr-bar${tebal ? " lg" : ""}`}>
    <i className={tone} style={{ width: `${Math.max(0, Math.min(100, v || 0))}%` }} />
    {kktp && <b style={{ left: `${KKTP}%` }} aria-hidden="true" />}
  </div>
);
const Kepala = ({ judul, kanan }) => (
  <div className="gr-sh"><h2>{judul}</h2>{kanan}</div>
);

// ─── Dashboard Guru ───
export function DashboardGuruV2({ store, navigate, hitungPerhatian, NilaiEssayModal, onTampilanLama }) {
  const [jenjang, setJenjang] = useState("VII");
  const [laporan, setLaporan] = useState(false);
  const [esaiTugas, setEsaiTugas] = useState(null);
  const [semuaPerhatian, setSemuaPerhatian] = useState(false);
  const [lihatSelesai, setLihatSelesai] = useState(false);
  const [sibukTL, setSibukTL] = useState(null);
  const [urung, setUrung] = useState(null); // { p } — notifikasi "Urungkan" setelah ditandai selesai
  const d = hitungDashboard(store, jenjang);
  const tl = store.getTindakLanjut ? store.getTindakLanjut() : {};
  // Siswa disembunyikan kalau semua pemicunya sudah pernah ditandai selesai; pemicu baru memunculkannya lagi
  const sudahTL = p => { const r = tl[p.siswa.id]; return !!r && p.triggers.every(tr => (r.tipe || []).includes(tr.type)); };
  const semuaP = hitungPerhatian ? hitungPerhatian(store, jenjang) : [];
  const perhatian = semuaP.filter(p => !sudahTL(p));
  const selesaiTL = semuaP.filter(sudahTL);
  const tandai = async (p, selesai) => {
    setSibukTL(p.siswa.id);
    try {
      if (selesai) {
        await store.setTindakLanjut(p.siswa.id, p.triggers.map(tr => tr.type));
        setUrung({ p });
        clearTimeout(window.__grUrung);
        window.__grUrung = setTimeout(() => setUrung(null), 6000);
      } else { await store.hapusTindakLanjut(p.siswa.id); setUrung(null); }
    }
    catch (e) { alert("Gagal menyimpan tindak lanjut: " + (e?.message || "coba lagi")); }
    finally { setSibukTL(null); }
  };
  const now = new Date();
  const sapa = now.getHours() < 11 ? "Selamat pagi" : now.getHours() < 15 ? "Selamat siang" : now.getHours() < 18 ? "Selamat sore" : "Selamat malam";
  const jumlah = j => store.getAllSiswa(j).length;

  const aksi = item => {
    if (item.key === "esai" && NilaiEssayModal) setEsaiTugas(item.tugas);
    else if (item.key === "esai") navigate("analisis-tugas", { tugasId: item.tugas.id });
    else if (item.key === "akses") navigate("chat");
    else if (item.key === "lapor") navigate("laporan-guru");
    else if (item.key === "sas") navigate("nilai-akhir");
  };

  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} · {store.getActivePeriode()}</span>
          <h1>{sapa}, Pak Fatta</h1>
        </div>
        <div className="gr-actions">
          <button type="button" className="gr-btn outline" onClick={() => setLaporan(true)}>Laporan</button>
          <button type="button" className="gr-btn" onClick={() => navigate("buat-tugas")}><Ikon d={IKON.plus} s={15} w={2.4} /> Tugas baru</button>
        </div>
      </div>

      <div className="gr-bar-row">
        <div className="gr-seg" role="tablist" aria-label="Pilih kelas">
          {["VII", "VIII"].map(j => (
            <button key={j} type="button" role="tab" aria-selected={jenjang === j} className={jenjang === j ? "on" : ""} onClick={() => setJenjang(j)}>Kelas {j} · {jumlah(j)}</button>
          ))}
        </div>
        <div className="gr-links">
          <button type="button" onClick={() => exportNilai(store, jenjang)}>Export nilai</button>
          <button type="button" onClick={() => navigate("materi-manager")}>Materi</button>
          <button type="button" onClick={() => navigate("mission-guru")}>Misi PJJ{store.isMissionActive && store.isMissionActive(jenjang) ? " · aktif" : ""}</button>
          <button type="button" onClick={() => backupFromStore(store)}>Backup</button>
        </div>
      </div>

      <div className="gr-tiles">
        <div><span>Tugas aktif</span><b>{d.aktif}</b><small className={d.segera ? "amber" : ""}>{d.segera ? `${d.segera} berakhir hari ini/besok` : d.aktif ? "Tidak ada yang mendesak" : "Belum ada tugas berjalan"}</small></div>
        <div><span>Pengumpulan</span><b>{d.pctKumpul == null ? "Belum ada" : `${d.pctKumpul}%`}</b><small>{d.kesempatan ? `${d.terkumpul} dari ${d.kesempatan} kesempatan` : "Belum ada tugas"}</small></div>
        <div><span>Rata-rata nilai tugas</span><b>{d.rataKelas ?? "Belum ada"}</b>{d.rataKelas != null && <Bar v={d.rataKelas} kktp tone={d.rataKelas < KKTP ? "amber" : "teal"} />}<small>garis tipis = KKTP {KKTP}</small></div>
        <div><span>Di bawah KKTP</span><b>{d.bawahKKTP} siswa</b><small>rata-rata tugas &lt; {KKTP}</small></div>
      </div>

      <div className="gr-cols">
        <div className="gr-main">
          <section>
            <Kepala judul="Perlu ditindaklanjuti" kanan={<span className="gr-mono">{d.todo.length ? `${d.todo.length} hal` : ""}</span>} />
            <div className="gr-card list">
              {d.todo.length === 0 && <p className="gr-empty">Tidak ada yang perlu ditindaklanjuti. Semua esai sudah dinilai dan tidak ada permintaan akses.</p>}
              {d.todo.map(item => (
                <div key={item.key} className="gr-todo">
                  <div className={`gr-ic ${item.tone}`}><Ikon d={IKON[item.icon]} /></div>
                  <div className="gr-todo-txt"><b>{item.title}</b><span>{item.meta}</span></div>
                  <button type="button" className="gr-btn outline sm" onClick={() => aksi(item)}>{item.action}</button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <Kepala judul="Tugas berjalan" kanan={<button type="button" className="gr-link" onClick={() => navigate("tugas-guru")}>Semua tugas</button>} />
            {d.berjalan.length === 0 ? (
              <div className="gr-card"><p className="gr-empty">Tidak ada tugas yang sedang berjalan untuk Kelas {jenjang}.</p></div>
            ) : (
              <div className="gr-stack">
                {d.berjalan.slice(0, 4).map(x => (
                  <div key={x.t.id} className="gr-card gr-tugas">
                    <div className="gr-tugas-top">
                      <b>{x.t.judul}</b>
                      <span className={`gr-chip ${x.segera ? "amber" : "teal"}`}>{x.tenggat}</span>
                    </div>
                    <span className="gr-mono">{x.meta}</span>
                    <div className="gr-meters">
                      <div><div className="gr-meter-lbl"><span>Mengumpulkan</span><b>{x.kumpul}/{x.penerima}</b></div><Bar v={x.kumpulPct} tone="solid" /></div>
                      <div><div className="gr-meter-lbl"><span>Rata-rata</span><b className={x.rata != null && x.rata < KKTP ? "amber" : ""}>{x.rata ?? "Belum ada"}</b></div><Bar v={x.rata || 0} kktp tone={x.rata != null && x.rata < KKTP ? "amber" : "teal"} /></div>
                    </div>
                    <div className="gr-tugas-foot">
                      <span className={x.catatanTone}>{x.catatan}</span>
                      <button type="button" className="gr-link" onClick={() => navigate("analisis-tugas", { tugasId: x.t.id })}>Lihat analisis <Ikon d={IKON.kanan} s={14} w={2.4} /></button>
                    </div>
                  </div>
                ))}
                {d.berjalan.length > 4 && <button type="button" className="gr-link" onClick={() => navigate("tugas-guru")}>{d.berjalan.length - 4} tugas berjalan lainnya</button>}
              </div>
            )}
          </section>
        </div>

        <div className="gr-side">
          <section>
            <Kepala judul="Siswa perlu perhatian" kanan={<span className="gr-mono">{perhatian.length ? `${perhatian.length} siswa` : ""}</span>} />
            <div className="gr-card list">
              {perhatian.length === 0 && <p className="gr-empty">Tidak ada siswa yang menunjukkan tanda perlu perhatian.</p>}
              {perhatian.slice(0, semuaPerhatian ? perhatian.length : 4).map((p, i) => {
                const nama = p.siswa.namaDisplay || p.siswa.nama;
                return (
                  <div key={p.siswa.id} className="gr-siswa grid">
                    <div className="gr-ava" style={{ background: WARNA_AVATAR[i % WARNA_AVATAR.length] }}>{inisial(p.siswa.nama)}</div>
                    <b className="gr-siswa-nama">{nama}</b>
                    <ul className="gr-alasan">
                      {p.triggers.map(tr => { const [teks, angka] = pecahAlasan(tr.label); return <li key={tr.type}><span>{teks}</span>{angka && <code>{angka}</code>}</li>; })}
                    </ul>
                    <div className="gr-siswa-act">
                      <button type="button" className="gr-ib" title="Kirim pesan" aria-label={`Kirim pesan ke ${nama}`} onClick={() => navigate("chat", { openChat: p.siswa.id })}><Ikon d={IKON.pesan} s={16} /></button>
                      <button type="button" className="gr-ib" title="Beri latihan khusus" aria-label={`Beri latihan khusus untuk ${nama}`} onClick={() => navigate("buat-tugas", { presetAssignedTo: [p.siswa.id], presetJenjang: jenjang })}><Ikon d={IKON.latihan} s={16} /></button>
                      {store.setTindakLanjut && <button type="button" className="gr-ib ok" title="Selesai ditindaklanjuti" aria-label={`Tandai ${nama} selesai ditindaklanjuti`} disabled={sibukTL === p.siswa.id} onClick={() => tandai(p, true)}><Ikon d={IKON.centang} s={16} w={2.4} /></button>}
                    </div>
                  </div>
                );
              })}
              {perhatian.length > 4 && (
                <button type="button" className="gr-more" onClick={() => setSemuaPerhatian(v => !v)}>{semuaPerhatian ? "Ringkas" : `Tampilkan ${perhatian.length - 4} siswa lainnya`}</button>
              )}
              {selesaiTL.length > 0 && (
                <button type="button" className="gr-more muted" onClick={() => setLihatSelesai(v => !v)}>{lihatSelesai ? "Sembunyikan" : `${selesaiTL.length} siswa sudah ditindaklanjuti`}</button>
              )}
              {lihatSelesai && selesaiTL.map(p => (
                <div key={p.siswa.id} className="gr-siswa done">
                  <div className="gr-ava sm" aria-hidden="true"><Ikon d={IKON.centang} s={14} w={2.6} /></div>
                  <div className="gr-siswa-txt">
                    <b>{p.siswa.namaDisplay || p.siswa.nama}</b>
                    <span className="gr-muted">Selesai {new Date(tl[p.siswa.id].ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · {p.triggers.map(tr => pecahAlasan(tr.label)[0]).join(", ")}</span>
                  </div>
                  <div className="gr-siswa-act">
                    <button type="button" className="gr-ib" title="Kembalikan ke daftar" aria-label={`Kembalikan ${p.siswa.namaDisplay || p.siswa.nama} ke daftar perhatian`} disabled={sibukTL === p.siswa.id} onClick={() => tandai(p, false)}><Ikon d={IKON.balik} s={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <Kepala judul="Tiga teratas" kanan={<button type="button" className="gr-link" onClick={() => navigate("leaderboard")}>Ranking</button>} />
            <div className="gr-card gr-top">
              {d.top.length === 0 && <p className="gr-empty">Belum ada poin di kelas ini.</p>}
              {d.top.map(r => (
                <div key={r.id}>
                  <span className={`gr-medal m${r.rank}`}>{r.rank}</span>
                  <span className="nm">{r.nama}</span>
                  <b className={`m${r.rank}`}>{r.poin.toLocaleString("id-ID")}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {onTampilanLama && <button type="button" className="gr-old" onClick={onTampilanLama}>Buka tampilan lama</button>}
      {urung && (
        <div className="gr-toast act" role="status">
          <span>{urung.p.siswa.namaDisplay || urung.p.siswa.nama} ditandai selesai ditindaklanjuti</span>
          <button type="button" onClick={() => tandai(urung.p, false)}>Urungkan</button>
        </div>
      )}
      {laporan && <LaporanModal store={store} onClose={() => setLaporan(false)} />}
      {esaiTugas && NilaiEssayModal && <NilaiEssayModal tugas={esaiTugas} store={store} onClose={() => setEsaiTugas(null)} />}
    </div>
  );
}

// ─── Analisis Tugas ───
function Sebaran({ sebaran }) {
  if (!sebaran) return <p className="gr-muted">Sebaran jawaban tidak tersedia untuk tipe soal ini. Jawaban per siswa bisa dilihat di Ubah nilai.</p>;
  const max = Math.max(1, sebaran.total);
  return (
    <div className="gr-opsi">
      {sebaran.opsi.map(o => (
        <div key={o.k} className="gr-opsi-row">
          <span className={`gr-key${o.kunci ? " on" : ""}`}>{o.k}</span>
          <div className="gr-opsi-mid">
            <span>{o.teks}{o.kunci ? " · kunci" : ""}</span>
            <Bar v={o.n / max * 100} tone={o.kunci ? "teal" : o.n / max >= 0.25 ? "amber" : "soft"} />
          </div>
          <span className="gr-opsi-n">{o.n} siswa</span>
        </div>
      ))}
      {sebaran.kosong > 0 && <p className="gr-muted">{sebaran.kosong} siswa tidak menjawab.</p>}
    </div>
  );
}

function KartuSandbox({ a }) {
  return (
    <section className="gr-card gr-sbx">
      <div className="gr-sbx-head">
        <span className="gr-mono">Soal {a.i + 1}</span>
        <b>{a.soal.pertanyaan || "Sandbox"}</b>
        <span className="gr-chip teal">Sandbox Terverifikasi · {1 + (a.soal.lanjutan || []).length} butir</span>
      </div>
      {a.total === 0 ? <p className="gr-empty pad">Belum ada jawaban untuk soal ini.</p> : (<>
        <div className="gr-sbx-nums">
          <div><span>Lolos verifikasi</span><b>{a.lolos} <small>dari {a.total} · {a.pctLolos}%</small></b></div>
          <div><span>Dilewati setelah 3 kali gagal</span><b className={a.dilewati ? "amber" : ""}>{a.dilewati} siswa</b></div>
          <div><span>Rata-rata percobaan sampai lolos</span><b>{a.percobaan == null ? "Belum ada" : `${String(a.percobaan).replace(".", ",")} kali`}</b></div>
        </div>
        <div className="gr-sbx-part">
          <span className="gr-sub">Per sel jawaban</span>
          <div className="gr-scroll">
            <div className="gr-grid sel head"><span>Sel</span><span>Diminta</span><span>Benar</span><span>Kesalahan terbanyak</span></div>
            {a.sel.filter(c => !c.sempurna).map(c => (
              <div key={c.sel} className="gr-grid sel">
                <span className="mono c-sel">{c.sel}</span>
                <span className="c-minta">{c.fungsi ? `Fungsi ${c.fungsi}` : "Nilai yang tepat"}{c.kunci ? <> · <code className="kunci">{c.kunci}</code></> : null}</span>
                <span className={`num c-num ${c.pct != null && c.pct < KKTP ? "amber" : "teal"}`}>{c.dicek ? `${c.ok}/${c.dicek} · ${c.pct}%` : "Belum ada"}</span>
                <div className="gr-salah c-salah">
                  {c.salah.map(e => <div key={e.rumus}><code>{e.rumus}</code><span>{e.alasan} · {e.n} siswa</span></div>)}
                </div>
              </div>
            ))}
            {a.sel.some(c => c.sempurna) && (
              <div className="gr-sel-ok">Semua siswa benar di {a.sel.filter(c => c.sempurna).map(c => c.sel).join(", ")}.</div>
            )}
          </div>
        </div>
        {a.lanjutan.length > 0 && (
          <div className="gr-sbx-part">
            <span className="gr-sub">Pilihan ganda lanjutan</span>
            {a.lanjutan.map(l => (
              <div key={l.k} className="gr-lanjut">
                <div className="gr-lanjut-top"><span>Lanjutan {l.k + 1} · {l.tanya}</span><b className={l.pct != null && l.pct < 50 ? "amber" : ""}>{l.pct == null ? "Belum ada" : `${l.pct}% benar · ${tingkat(l.pct)}`}</b></div>
                <Bar v={l.pct || 0} tone={l.pct != null && l.pct < 50 ? "amber" : l.pct >= 80 ? "teal" : "soft"} />
                {l.catatan && <span className="gr-muted">{l.catatan}</span>}
              </div>
            ))}
            {a.wawasan && <p className="gr-note">{a.wawasan}</p>}
          </div>
        )}
      </>)}
    </section>
  );
}

export function AnalisisTugasV2({ store, tugasId, navigate, NilaiEssayModal, IntervensiNilaiModal, onTampilanLama }) {
  const [hanyaBawah, setHanyaBawah] = useState(false);
  const [buka, setBuka] = useState(null);
  const [semua, setSemua] = useState(false);
  const [esai, setEsai] = useState(false);
  const [ubah, setUbah] = useState(false);
  const t = (store.getTugasSemua || store.getTugas)().find(x => x.id === tugasId);
  if (!t) return <div className="page gr"><p className="gr-empty">Tugas tidak ditemukan.</p></div>;
  const a = hitungAnalisis(t, store.getSubs(), store.getAllSiswa(t.jenjang), { hanyaBawah });
  const namaSiswa = id => { const s = store.getAllSiswa().find(x => x.id === id); return s ? (s.namaDisplay || s.nama) : id; };
  const tg = labelTenggat(t, Date.now());
  const pertama = a.soalLain.find(x => x.sebaran && x.pct != null);
  const terbuka = buka ?? pertama?.i ?? null;

  return (
    <div className="page gr">
      <button type="button" className="gr-link back" onClick={() => navigate("home-guru")}><Ikon d={IKON.kiri} s={15} w={2.4} /> Dashboard</button>
      <div className="gr-head">
        <div>
          <span className="gr-mono">{t.mapel} · Kelas {t.jenjang} · {tg.label}{Array.isArray(t.assignedTo) ? " · tugas personal" : ""}</span>
          <h1>{t.judul}</h1>
        </div>
        <div className="gr-actions">
          {a.esaiBelum > 0 && NilaiEssayModal && <button type="button" className="gr-btn" onClick={() => setEsai(true)}>Nilai esai · {a.esaiBelum}</button>}
          {IntervensiNilaiModal && a.totalSub > 0 && <button type="button" className="gr-btn outline" onClick={() => setUbah(true)}>Ubah nilai</button>}
          <button type="button" className="gr-btn outline" onClick={() => navigate("edit-tugas", { tugasId: t.id })}>Edit tugas</button>
        </div>
      </div>

      {a.totalSub === 0 ? (
        <div className="gr-card"><p className="gr-empty">Belum ada siswa yang mengumpulkan. {a.penerima} siswa menerima tugas ini.</p></div>
      ) : (<>
        <div className="gr-two">
          <section className="gr-card gr-hasil">
            <span className="gr-sub up">Hasil kelas</span>
            <div className="gr-big"><b>{a.rata}</b><span>rata-rata dari {a.totalSub} siswa</span></div>
            <Bar v={a.rata} kktp tebal tone={a.rata < KKTP ? "amber" : "teal"} />
            <p><b>{a.tercapai} dari {a.totalSub} siswa</b> mencapai KKTP {KKTP}.{a.bawah > 0 && <span className="amber"> {a.bawah} siswa di bawahnya.</span>}</p>
            <p className="gr-muted">{a.kumpul} dari {a.penerima} mengumpulkan · {a.belum.length} belum{a.terlambat ? ` · ${a.terlambat} terlambat` : ""}</p>
          </section>
          <section className="gr-card gr-hist">
            <div className="gr-sh"><span className="gr-sub up">Sebaran nilai</span><span className="gr-muted">amber = di bawah KKTP</span></div>
            <div className="gr-hist-bars" role="img" aria-label={`Sebaran nilai: ${a.bins.map(b => `${b.label} ${b.n} siswa`).join(", ")}`}>
              {a.bins.map(b => (
                <div key={b.label}><b>{b.n}</b><i className={b.bawah ? "amber" : "teal"} style={{ height: `${Math.round(b.n / a.maxBin * 112) + 4}px` }} /></div>
              ))}
            </div>
            <div className="gr-hist-lbl">{a.bins.map(b => <span key={b.label}>{b.label}</span>)}</div>
          </section>
        </div>

        <div className="gr-bar-row">
          <h2 className="gr-h2">Per soal, dari yang paling sulit</h2>
          <div className="gr-seg" role="tablist" aria-label="Siswa yang dianalisis">
            <button type="button" role="tab" aria-selected={!hanyaBawah} className={!hanyaBawah ? "on" : ""} onClick={() => setHanyaBawah(false)}>Semua siswa · {a.totalSub}</button>
            <button type="button" role="tab" aria-selected={hanyaBawah} className={hanyaBawah ? "on" : ""} onClick={() => setHanyaBawah(true)}>Di bawah KKTP · {a.bawah}</button>
          </div>
        </div>
        {hanyaBawah && a.dianalisis === 0 ? (
          <div className="gr-card"><p className="gr-empty">Semua siswa yang mengumpulkan sudah mencapai KKTP {KKTP}.</p></div>
        ) : (<>
          {a.sandbox.map(sb => <KartuSandbox key={sb.i} a={sb} />)}
          {a.soalLain.length > 0 && (
            <section className="gr-card list">
              {a.soalLain.map(x => {
                const open = terbuka === x.i;
                const tone = x.pct == null ? "soft" : x.pct >= 80 ? "teal" : x.pct >= 50 ? "soft" : "amber";
                return (
                  <div key={x.i} className={`gr-soal${open ? " open" : ""}`}>
                    <button type="button" className="gr-soal-row" aria-expanded={open} onClick={() => setBuka(open ? -1 : x.i)}>
                      <span className="gr-mono no">Soal {x.no}</span>
                      <span className="tx"><span className="tipe">{x.tipe}</span>{x.soal.pertanyaan}</span>
                      <span className="bar"><Bar v={x.pct || 0} tone={tone} /></span>
                      <b className={`pct ${tone === "amber" ? "amber" : ""}`}>{x.pct == null ? x.label : `${x.pct}% · ${x.label}`}</b>
                    </button>
                    {open && (
                      <div className="gr-soal-body">
                        {x.manual ? <p className="gr-muted">{x.belumDinilai ? `${x.belumDinilai} jawaban belum dinilai. ` : ""}{x.soal.type === "essay" ? "Persentase dihitung dari esai yang sudah dinilai (nilai 60 ke atas dianggap benar)." : "Refleksi dibaca guru, tidak dihitung benar atau salah."}</p> : <Sebaran sebaran={x.sebaran} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </>)}

        <div className="gr-cols">
          <section className="gr-main">
            <Kepala judul="Nilai per siswa" kanan={a.daftar.length > 8 ? <button type="button" className="gr-link" onClick={() => setSemua(v => !v)}>{semua ? "Ringkas" : `Semua ${a.daftar.length} siswa`}</button> : null} />
            <div className="gr-card gr-scroll">
              <div className={`gr-grid nilai head${a.adaSandbox ? "" : " nosbx"}`}><span>Siswa</span><span className="r">Nilai</span>{a.adaSandbox && <span>Sandbox</span>}<span>Status</span></div>
              {a.daftar.slice(0, semua ? a.daftar.length : 8).map(r => (
                <div key={r.id} className={`gr-grid nilai${a.adaSandbox ? "" : " nosbx"}`}>
                  <span className="nm c-nm">{namaSiswa(r.siswaId)}</span>
                  <span className={`r num c-num ${r.nilai < KKTP ? "amber" : ""}`}>{r.nilai ?? "Belum dinilai"}</span>
                  {a.adaSandbox && <span className="gr-muted c-sbx">{r.sandbox ? `Sandbox: ${r.sandbox}` : "Sandbox: tidak ada"}</span>}
                  <span className="c-st"><span className={`gr-chip ${r.statusTone}`}>{r.status}</span></span>
                </div>
              ))}
            </div>
          </section>
          <section className="gr-side">
            <Kepala judul="Belum mengumpulkan" kanan={<span className="gr-mono">{a.belum.length} siswa</span>} />
            <div className="gr-card list">
              {a.belum.length === 0 && <p className="gr-empty">Semua penerima sudah mengumpulkan.</p>}
              {a.belum.map(s => (
                <div key={s.id} className="gr-belum">
                  <span>{s.namaDisplay || s.nama}</span>
                  <button type="button" className="gr-link" onClick={() => navigate("chat", { openChat: s.id })}>Ingatkan</button>
                </div>
              ))}
            </div>
            {a.belum.length > 0 && <p className="gr-muted">"Ingatkan" membuka percakapan dengan siswa itu di Pesan.</p>}
          </section>
        </div>
      </>)}

      {onTampilanLama && <button type="button" className="gr-old" onClick={onTampilanLama}>Buka tampilan lama</button>}
      {esai && NilaiEssayModal && <NilaiEssayModal tugas={t} store={store} onClose={() => setEsai(false)} />}
      {ubah && IntervensiNilaiModal && <IntervensiNilaiModal tugas={t} store={store} onClose={() => setUbah(false)} />}
    </div>
  );
}

// ─── Daftar Tugas (guru) ───
export function hitungDaftarTugas(store, jenjang, { tab = "berjalan", personalSaja = false, cari = "" } = {}, now = Date.now()) {
  const siswa = store.getAllSiswa(jenjang);
  const subs = store.getSubs();
  const semua = store.getTugas().filter(t => t.jenjang === jenjang);
  const kelompok = t => (t.status === "scheduled" ? "terjadwal" : labelTenggat(t, now).lewat ? "selesai" : "berjalan");
  const hitung = { berjalan: 0, terjadwal: 0, selesai: 0, semua: semua.length };
  semua.forEach(t => { hitung[kelompok(t)]++; });
  const personal = semua.filter(t => Array.isArray(t.assignedTo)).length;
  const q = cari.trim().toLowerCase();
  const tampil = semua
    .filter(t => tab === "semua" || kelompok(t) === tab)
    .filter(t => !personalSaja || Array.isArray(t.assignedTo))
    .filter(t => !q || `${t.judul} ${t.materi || ""}`.toLowerCase().includes(q))
    .map(t => {
      const penerima = penerimaTugas(t, siswa);
      const ids = new Set(penerima.map(s => s.id));
      const ss = subs.filter(s => s.tugasId === t.id && ids.has(s.siswaId));
      const nilai = ss.filter(s => typeof s.nilai === "number").map(s => s.nilai);
      const tg = labelTenggat(t, now);
      const grup = kelompok(t);
      const belum = penerima.length - ss.length;
      return {
        t, grup, penerima: penerima.length, kumpul: ss.length, belum,
        kumpulPct: penerima.length ? Math.round(ss.length / penerima.length * 100) : 0,
        rata: bulat(avg(nilai)), esai: ss.reduce((a, s) => a + perluDinilai(s), 0),
        tenggat: grup === "terjadwal" ? `Terbit ${t.scheduledAt ? new Date(t.scheduledAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "terjadwal"}` : grup === "selesai" ? `Ditutup ${t.deadline ? tglPanjang(deadlineEnd(t.deadline)) : ""}` : tg.label,
        tenggatTone: grup === "terjadwal" ? "soft" : grup === "selesai" ? "muted" : tg.segera ? "amber" : "teal",
        untuk: Array.isArray(t.assignedTo) ? penerima.map(s => (s.namaDisplay || s.nama || "").split(" ")[0]) : null,
        sandbox: (t.soal || []).filter(s => s.type === "sandbox").length,
        urut: grup === "terjadwal" ? new Date(t.scheduledAt || 0).getTime() : t.deadline ? deadlineEnd(t.deadline) : Infinity,
      };
    })
    .sort((a, b) => (tab === "selesai" || (tab === "semua" && a.grup === "selesai" && b.grup === "selesai") ? b.urut - a.urut : a.urut - b.urut));
  return { hitung, personal, tampil };
}

export function TugasGuruV2({ store, navigate, IntervensiNilaiModal, MateriManagerModal, onTampilanLama }) {
  const [jenjang, setJenjang] = useState("VII");
  const [tab, setTab] = useState("berjalan");
  const [personalSaja, setPersonalSaja] = useState(false);
  const [cari, setCari] = useState("");
  const [hapus, setHapus] = useState(null);
  const [nilaiT, setNilaiT] = useState(null);
  const [materi, setMateri] = useState(false);
  const [arsipT, setArsipT] = useState(null);
  const [toast, setToast] = useState("");
  const kabar = m => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const d = hitungDaftarTugas(store, jenjang, { tab, personalSaja, cari });
  const TAB = [["berjalan", "Berjalan"], ["terjadwal", "Terjadwal"], ["selesai", "Selesai"], ["semua", "Semua"]];
  // (tugas yang diarsipkan tidak muncul di sini; lihat menu Arsip)
  const kosong = cari ? `Tidak ada tugas yang cocok dengan "${cari}".` : personalSaja ? "Belum ada tugas personal di kelompok ini."
    : tab === "berjalan" ? "Tidak ada tugas yang sedang berjalan." : tab === "terjadwal" ? "Tidak ada tugas terjadwal." : tab === "selesai" ? "Belum ada tugas yang ditutup." : "Belum ada tugas.";

  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">{d.hitung.semua} tugas · Kelas {jenjang}</span>
          <h1>Tugas</h1>
        </div>
        <div className="gr-actions">
          {MateriManagerModal && <button type="button" className="gr-btn outline" onClick={() => setMateri(true)}>Atur materi</button>}
          <button type="button" className="gr-btn" onClick={() => navigate("buat-tugas")}><Ikon d={IKON.plus} s={15} w={2.4} /> Tugas baru</button>
        </div>
      </div>

      <div className="gr-bar-row">
        <div className="gr-seg" role="tablist" aria-label="Pilih kelas">
          {["VII", "VIII"].map(j => <button key={j} type="button" role="tab" aria-selected={jenjang === j} className={jenjang === j ? "on" : ""} onClick={() => setJenjang(j)}>Kelas {j}</button>)}
        </div>
        <label className="gr-cari">
          <span className="sr">Cari tugas</span>
          <input type="search" value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari judul atau materi" />
        </label>
      </div>

      <div className="gr-bar-row">
        <div className="gr-seg scroll" role="tablist" aria-label="Kelompok tugas">
          {TAB.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l} · {d.hitung[k]}</button>)}
        </div>
        {d.personal > 0 && (
          <label className="gr-check"><input type="checkbox" checked={personalSaja} onChange={e => setPersonalSaja(e.target.checked)} /> Tugas personal saja · {d.personal}</label>
        )}
      </div>

      {d.tampil.length === 0 ? <div className="gr-card"><p className="gr-empty">{kosong}</p></div> : (
        <div className="gr-stack">
          {d.tampil.map(x => {
            const t = x.t;
            return (
              <div key={t.id} className={`gr-card gr-tugas${x.grup === "selesai" ? " done" : ""}`}>
                <div className="gr-tugas-top">
                  <b>{t.judul}</b>
                  <span className={`gr-chip ${x.tenggatTone}`}>{x.tenggat}</span>
                </div>
                <span className="gr-mono">
                  {[t.mapel, t.materi || null, `${(t.soal || []).length} soal`, x.sandbox ? `${x.sandbox} sandbox` : null,
                    t.graded === false ? `latihan khusus · poin 20%` : `maks ${t.poinMax || 0} poin`].filter(Boolean).join(" · ")}
                </span>
                {x.untuk && <span className="gr-untuk">Tugas personal untuk {x.untuk.length <= 4 ? x.untuk.join(", ") : `${x.untuk.slice(0, 4).join(", ")} dan ${x.untuk.length - 4} lainnya`}</span>}
                {x.grup !== "terjadwal" && (
                  <div className="gr-meters">
                    <div><div className="gr-meter-lbl"><span>Mengumpulkan</span><b>{x.kumpul}/{x.penerima}</b></div><Bar v={x.kumpulPct} tone="solid" /></div>
                    <div><div className="gr-meter-lbl"><span>Rata-rata</span><b className={x.rata != null && x.rata < KKTP ? "amber" : ""}>{x.rata ?? "Belum ada"}</b></div><Bar v={x.rata || 0} kktp tone={x.rata != null && x.rata < KKTP ? "amber" : "teal"} /></div>
                  </div>
                )}
                <div className="gr-tugas-foot">
                  <span className={x.esai || (x.grup === "selesai" && x.belum) ? "amber" : "muted"}>
                    {x.grup === "terjadwal" ? "Belum terlihat oleh siswa" : x.esai ? `${x.esai} esai belum dinilai` : x.belum === 0 ? "Semua penerima sudah mengumpulkan" : x.grup === "selesai" ? `${x.belum} siswa tidak mengumpulkan` : `${x.belum} siswa belum mengumpulkan`}
                  </span>
                  <div className="gr-tugas-act">
                    {x.kumpul > 0 && <button type="button" className="gr-link" onClick={() => navigate("analisis-tugas", { tugasId: t.id })}>Analisis</button>}
                    {x.kumpul > 0 && IntervensiNilaiModal && <button type="button" className="gr-link" onClick={() => setNilaiT(t)}>Nilai</button>}
                    <button type="button" className="gr-link" onClick={() => navigate("edit-tugas", { tugasId: t.id })}>{x.grup === "selesai" ? "Perpanjang" : "Edit"}</button>
                    <button type="button" className="gr-link" onClick={async () => { try { await store.duplicateTugas(t); kabar("Tugas diduplikat dan langsung aktif. Edit judul atau jadwalnya bila perlu."); } catch (e) { kabar("Gagal menduplikat: " + (e?.message || "coba lagi")); } }}>Duplikat</button>
                    {x.grup === "selesai" && store.arsipkanTugas && <button type="button" className="gr-link" onClick={() => setArsipT(t)}>Arsipkan</button>}
                    <button type="button" className="gr-link danger" onClick={() => setHapus(t)}>Hapus</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onTampilanLama && <button type="button" className="gr-old" onClick={onTampilanLama}>Buka tampilan lama</button>}
      {toast && <div className="gr-toast" role="status">{toast}</div>}
      {hapus && <Confirm title={`Hapus "${hapus.judul}"?`} desc="Tugas dihapus permanen. Poin siswa yang sudah mengerjakan tidak berubah." onOk={() => { store.deleteTugas(hapus.id); setHapus(null); kabar("Tugas dihapus."); }} onCancel={() => setHapus(null)} />}
      {nilaiT && IntervensiNilaiModal && <IntervensiNilaiModal tugas={nilaiT} store={store} onClose={() => setNilaiT(null)} />}
      {arsipT && <KonfirmasiArsip store={store} daftar={[arsipT]} onClose={() => setArsipT(null)} onDone={n => { setArsipT(null); kabar(`${n} tugas diarsipkan. Lihat di menu Arsip.`); }} />}
      {materi && MateriManagerModal && <MateriManagerModal store={store} jenjang={jenjang} onClose={() => setMateri(false)} onSuccess={msg => { setMateri(false); kabar(msg); }} />}
    </div>
  );
}

// ─── Laporan siswa (guru) ───
const KATEGORI_LAPOR = { konflik: "Konflik dengan teman", bullying: "Bullying / perundungan", sarpras: "Sarana/prasarana rusak", akademik: "Kesulitan akademik", kesehatan: "Kesehatan/kondisi diri", lainnya: "Lainnya" };
const STATUS_LAPOR = { baru: "Baru", diproses: "Diproses", selesai: "Selesai" };
function waktuLalu(ts, now = Date.now()) {
  const d = now - ts;
  if (d < 6e4) return "baru saja";
  if (d < 36e5) return `${Math.floor(d / 6e4)} menit lalu`;
  if (d < HARI) return `${Math.floor(d / 36e5)} jam lalu`;
  if (d < 7 * HARI) return `${Math.floor(d / HARI)} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function LaporanGuruV2({ store, LaporanDetailModal, onTampilanLama }) {
  const [status, setStatus] = useState("baru");
  const [kategori, setKategori] = useState("semua");
  const [pilih, setPilih] = useState(null);
  const [hapus, setHapus] = useState(null);
  const now = Date.now();
  const semua = store.getReports();
  const jumlah = { baru: 0, diproses: 0, selesai: 0, semua: semua.length };
  semua.forEach(r => { jumlah[r.status] = (jumlah[r.status] || 0) + 1; });
  const urut = { baru: 0, diproses: 1, selesai: 2 };
  const tampil = semua
    .filter(r => status === "semua" || r.status === status)
    .filter(r => kategori === "semua" || r.kategori === kategori)
    // Laporan baru: yang paling lama menunggu di atas. Lainnya: terbaru di atas.
    .sort((a, b) => (urut[a.status] ?? 3) - (urut[b.status] ?? 3) || (a.status === "baru" ? (a.createdAt || 0) - (b.createdAt || 0) : (b.createdAt || 0) - (a.createdAt || 0)));
  const labelKat = r => (r.kategori === "lainnya" && r.kategoriLain ? r.kategoriLain : KATEGORI_LAPOR[r.kategori] || r.kategori);

  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">Rahasia · hanya wali kelas yang bisa melihat</span>
          <h1>Laporan siswa</h1>
        </div>
      </div>

      <div className="gr-bar-row">
        <div className="gr-seg scroll" role="tablist" aria-label="Status laporan">
          {[["baru", "Baru"], ["diproses", "Diproses"], ["selesai", "Selesai"], ["semua", "Semua"]].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={status === k} className={status === k ? "on" : ""} onClick={() => setStatus(k)}>{l} · {jumlah[k] || 0}</button>
          ))}
        </div>
        <label className="gr-select">
          <span className="sr">Kategori</span>
          <select value={kategori} onChange={e => setKategori(e.target.value)}>
            <option value="semua">Semua kategori</option>
            {Object.entries(KATEGORI_LAPOR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      {tampil.length === 0 ? (
        <div className="gr-card"><p className="gr-empty">{status === "baru" && kategori === "semua" ? "Tidak ada laporan baru. Semua laporan sudah ditanggapi." : "Tidak ada laporan yang cocok dengan pilihan ini."}</p></div>
      ) : (
        <div className="gr-card list">
          {tampil.map(r => {
            const lama = r.status === "baru" && now - (r.createdAt || now) > 2 * HARI;
            return (
              <button key={r.id} type="button" className="gr-lapor" onClick={() => setPilih(r)}>
                <div className="gr-lapor-top">
                  <span className={`gr-chip ${r.status === "baru" ? "amber" : r.status === "diproses" ? "teal" : "muted"}`}>{STATUS_LAPOR[r.status] || r.status}</span>
                  <b>{labelKat(r)}</b>
                  {lama && <span className="gr-lapor-lama">Belum ditanggapi {Math.floor((now - r.createdAt) / HARI)} hari</span>}
                </div>
                <p>{r.deskripsi}</p>
                <span className="gr-muted">{r.pelaporNama} · Kelas {r.jenjang} · {waktuLalu(r.createdAt, now)}{r.catatanGuru ? " · ada catatan guru" : ""}</span>
              </button>
            );
          })}
        </div>
      )}

      {onTampilanLama && <button type="button" className="gr-old" onClick={onTampilanLama}>Buka tampilan lama</button>}
      {pilih && LaporanDetailModal && <LaporanDetailModal report={pilih} store={store} kategoriLabel={KATEGORI_LAPOR} onClose={() => setPilih(null)} onDelete={() => { setHapus(pilih); setPilih(null); }} />}
      {hapus && <Confirm title="Hapus laporan?" desc="Laporan dihapus permanen dan tidak bisa dikembalikan." onOk={async () => { await store.deleteReport(hapus.id); setHapus(null); }} onCancel={() => setHapus(null)} />}
    </div>
  );
}

// ─── Manajemen siswa (guru) ───
export function ManajemenSiswaV2({ store, TambahSiswaModal, ImportSiswaModal, AuditPoinGanda, cetakKartu, withTimeout, onTampilanLama }) {
  const [jenjang, setJenjang] = useState("VII");
  const [cari, setCari] = useState("");
  const [tambah, setTambah] = useState(false);
  const [impor, setImpor] = useState(false);
  const [reset, setReset] = useState(null);
  const [pw, setPw] = useState("");
  const [hapus, setHapus] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [toast, setToast] = useState("");
  const kabar = m => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const tunggu = p => (withTimeout ? withTimeout(p) : p);
  const siswa = store.getAllSiswa(jenjang);
  const q = cari.trim().toLowerCase();
  const tampil = siswa.filter(s => !q || `${s.nama} ${s.id}`.toLowerCase().includes(q));

  async function simpanPw() {
    if (!reset || pw.trim().length < 6) return;
    setSibuk(true);
    try { await tunggu(store.resetPassword(reset.id, pw.trim())); kabar(`Password ${reset.nama} diganti.`); setReset(null); setPw(""); }
    catch (e) { kabar("Gagal mengganti password: " + (e?.message || "coba lagi")); }
    finally { setSibuk(false); }
  }
  async function hapusSiswa() {
    if (!hapus) return;
    setSibuk(true);
    try { await tunggu(store.deleteSiswa(hapus.id)); kabar(`${hapus.nama} dihapus.`); setHapus(null); }
    catch (e) { kabar("Gagal menghapus: " + (e?.message || "coba lagi")); }
    finally { setSibuk(false); }
  }

  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">{store.getAllSiswa().length} siswa · VII {store.getAllSiswa("VII").length} · VIII {store.getAllSiswa("VIII").length}</span>
          <h1>Siswa</h1>
        </div>
        <div className="gr-actions">
          {cetakKartu && <button type="button" className="gr-btn outline" disabled={!siswa.length} onClick={() => cetakKartu(siswa, jenjang)}>Cetak kartu</button>}
          {ImportSiswaModal && <button type="button" className="gr-btn outline" onClick={() => setImpor(true)}>Import Excel</button>}
          {TambahSiswaModal && <button type="button" className="gr-btn" onClick={() => setTambah(true)}><Ikon d={IKON.plus} s={15} w={2.4} /> Tambah siswa</button>}
        </div>
      </div>

      <div className="gr-bar-row">
        <div className="gr-seg" role="tablist" aria-label="Pilih kelas">
          {["VII", "VIII"].map(j => <button key={j} type="button" role="tab" aria-selected={jenjang === j} className={jenjang === j ? "on" : ""} onClick={() => setJenjang(j)}>Kelas {j} · {store.getAllSiswa(j).length}</button>)}
        </div>
        <label className="gr-cari"><span className="sr">Cari siswa</span><input type="search" value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama atau ID" /></label>
      </div>

      {siswa.length === 0 ? (
        <div className="gr-card"><p className="gr-empty">Belum ada siswa di Kelas {jenjang}. Tambah satu per satu atau import dari Excel.</p></div>
      ) : tampil.length === 0 ? (
        <div className="gr-card"><p className="gr-empty">Tidak ada siswa yang cocok dengan "{cari}".</p></div>
      ) : (
        <div className="gr-card list">
          {tampil.map(s => {
            const st = store.getStats(s.id);
            const lv = getLevel(st.poin || 0);
            return (
              <div key={s.id} className="gr-akun">
                <Avatar name={s.nama} size="md" photo={store.getPhoto ? store.getPhoto(s.uid || s.id) : null} />
                <div className="gr-akun-txt">
                  <b>{s.nama}</b>
                  <span><code>{s.id}</code><span className="lv" style={{ color: lv.color }}><TierIcon tierId={lv.tierId} size={12} color={lv.color} /> {lv.name}</span><span className="gr-muted">{(st.poin || 0).toLocaleString("id-ID")} poin</span></span>
                </div>
                <div className="gr-akun-act">
                  <button type="button" className="gr-link" onClick={() => { setReset(s); setPw(""); }}>Ganti password</button>
                  <button type="button" className="gr-link danger" onClick={() => setHapus(s)}>Hapus</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {AuditPoinGanda && (
        <section>
          <Kepala judul="Alat data" />
          <AuditPoinGanda store={store} />
        </section>
      )}

      {onTampilanLama && <button type="button" className="gr-old" onClick={onTampilanLama}>Buka tampilan lama</button>}
      {toast && <div className="gr-toast" role="status">{toast}</div>}
      {reset && (
        <div className="modal-overlay" onClick={() => setReset(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-pw-judul">
            <h3 id="gr-pw-judul">Ganti password</h3>
            <p style={{ marginBottom: 14 }}>Password baru untuk <b>{reset.nama}</b> ({reset.id}). Sampaikan ke siswa secara langsung.</p>
            <div className="fg">
              <label className="lbl" htmlFor="gr-pw">Password baru</label>
              <input id="gr-pw" className="inp" value={pw} onChange={e => setPw(e.target.value)} placeholder="Minimal 6 karakter" onKeyDown={e => e.key === "Enter" && simpanPw()} autoFocus />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setReset(null)}>Batal</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={sibuk || pw.trim().length < 6} onClick={simpanPw}>{sibuk ? "Menyimpan…" : "Simpan password"}</button>
            </div>
          </div>
        </div>
      )}
      {hapus && <Confirm title={`Hapus ${hapus.nama}?`} desc="Akun siswa dan percakapannya di Pesan dihapus permanen." onOk={hapusSiswa} onCancel={() => setHapus(null)} />}
      {tambah && TambahSiswaModal && <TambahSiswaModal store={store} onClose={() => setTambah(false)} onSuccess={(id, p) => { setTambah(false); kabar(`Siswa ditambahkan. ID: ${id} · Password: ${p}`); }} />}
      {impor && ImportSiswaModal && <ImportSiswaModal store={store} onClose={() => setImpor(false)} onSuccess={n => { setImpor(false); kabar(`${n} siswa berhasil diimpor.`); }} />}
    </div>
  );
}

// ─── Arsip tugas per materi (pengganti Bank Soal, Nov 2026) ───
const kunciMateri = t => (t.materi && t.materi.trim()) || "Tanpa materi";
const periodeAktif = store => (store.getActivePeriode ? store.getActivePeriode() : "");

export function KonfirmasiArsip({ store, daftar, onClose, onDone }) {
  const [sibuk, setSibuk] = useState(false);
  const sekarang = periodeAktif(store);
  const periodeIni = daftar.filter(t => !t.periode || t.periode === sekarang).length;
  const tutup = periodeIni && store.isSemesterClosed && store.isSemesterClosed(sekarang);
  async function ok() {
    setSibuk(true);
    try { await store.arsipkanTugas(daftar.map(t => t.id), true); onDone(daftar.length); }
    catch (e) { alert("Gagal mengarsipkan: " + (e?.message || "coba lagi")); setSibuk(false); }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-arsip-j">
        <h3 id="gr-arsip-j">Arsipkan {daftar.length === 1 ? `"${daftar[0].judul}"` : `${daftar.length} tugas`}?</h3>
        <p style={{ marginBottom: 10 }}>Tugas yang diarsipkan disimpan sebagai templat untuk diterbitkan ulang nanti. Siswa tidak lagi melihatnya, dan tugas ini tidak lagi dihitung di nilai Tugas Astrolab maupun streak.</p>
        {periodeIni > 0 && !tutup && (
          <p className="gr-warn">{periodeIni === daftar.length ? "Tugas ini" : `${periodeIni} di antaranya`} berasal dari periode {sekarang} yang masih berjalan. Kalau diarsipkan sekarang, nilai Tugas Astrolab siswa di rapor periode ini ikut berubah. Sebaiknya arsipkan setelah rapor terkirim.</p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={sibuk} onClick={ok}>{sibuk ? "Mengarsipkan…" : "Arsipkan"}</button>
        </div>
      </div>
    </div>
  );
}

function TerbitUlangModal({ store, t, onClose, onDone }) {
  const [judul, setJudul] = useState(t.judul);
  const [jenjang, setJenjang] = useState(t.jenjang || "VII");
  const [deadline, setDeadline] = useState("");
  const [jadwal, setJadwal] = useState("");
  const [err, setErr] = useState("");
  const [sibuk, setSibuk] = useState(false);
  async function ok() {
    if (!judul.trim()) { setErr("Judul wajib diisi."); return; }
    if (!deadline) { setErr("Deadline wajib diisi."); return; }
    if (deadlineEnd(deadline) < Date.now()) { setErr("Deadline sudah lewat. Pilih tanggal yang akan datang."); return; }
    if (jadwal && new Date(jadwal).getTime() > deadlineEnd(deadline)) { setErr("Jadwal terbit jatuh setelah deadline."); return; }
    setSibuk(true);
    try { await store.terbitkanUlang(t, { judul: judul.trim(), jenjang, deadline, scheduledAt: jadwal ? new Date(jadwal).toISOString() : null }); onDone(jadwal); }
    catch (e) { setErr("Gagal menerbitkan: " + (e?.message || "coba lagi")); setSibuk(false); }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-tu-j">
        <h3 id="gr-tu-j">Terbitkan ulang</h3>
        <p style={{ marginBottom: 14 }}>Membuat tugas baru dari arsip dengan {(t.soal || []).length} soal yang sama, untuk periode {periodeAktif(store)}. Arsipnya tetap tersimpan.</p>
        <div className="fg"><label className="lbl" htmlFor="gr-tu-judul">Judul</label><input id="gr-tu-judul" className="inp" value={judul} onChange={e => setJudul(e.target.value)} /></div>
        <div className="fg"><span className="lbl">Untuk kelas</span>
          <div className="gr-seg" role="radiogroup" aria-label="Kelas">{["VII", "VIII"].map(j => <button key={j} type="button" role="radio" aria-checked={jenjang === j} className={jenjang === j ? "on" : ""} onClick={() => setJenjang(j)}>Kelas {j}</button>)}</div>
        </div>
        <div className="fg"><label className="lbl" htmlFor="gr-tu-dl">Deadline</label><input id="gr-tu-dl" type="date" className="inp" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
        <div className="fg"><label className="lbl" htmlFor="gr-tu-jd">Jadwal terbit (opsional)</label><input id="gr-tu-jd" type="datetime-local" className="inp" value={jadwal} onChange={e => setJadwal(e.target.value)} /><span className="gr-muted">Kosongkan untuk langsung terbit.</span></div>
        {err && <p className="gr-warn">{err}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={sibuk} onClick={ok}>{sibuk ? "Menerbitkan…" : jadwal ? "Jadwalkan" : "Terbitkan"}</button>
        </div>
      </div>
    </div>
  );
}

export function ArsipTugas({ store, navigate }) {
  const [jenjang, setJenjang] = useState("semua");
  const [mapel, setMapel] = useState("semua");
  const [cari, setCari] = useState("");
  const [buka, setBuka] = useState(null);
  const [terbit, setTerbit] = useState(null);
  const [arsipkan, setArsipkan] = useState(null);
  const [kembali, setKembali] = useState(null);
  const [hapus, setHapus] = useState(null);
  const [toast, setToast] = useState("");
  const kabar = m => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const now = Date.now();
  const cocok = t => (jenjang === "semua" || t.jenjang === jenjang) && (mapel === "semua" || t.mapel === mapel)
    && (!cari.trim() || `${t.judul} ${t.materi || ""}`.toLowerCase().includes(cari.trim().toLowerCase()));
  const arsip = (store.getTugasArsip ? store.getTugasArsip() : []).filter(cocok);
  const siap = store.getTugas().filter(t => t.status !== "scheduled" && labelTenggat(t, now).lewat).filter(cocok);
  const kelompok = list => {
    const g = {};
    list.forEach(t => { const k = `${t.mapel}|${kunciMateri(t)}`; (g[k] = g[k] || []).push(t); });
    return Object.entries(g).map(([k, ts]) => { const [mp, mt] = k.split("|"); return { k, mapel: mp, materi: mt, tugas: ts.sort((a, b) => (a.judul || "").localeCompare(b.judul || "", "id")) }; })
      .sort((a, b) => a.mapel.localeCompare(b.mapel) || a.materi.localeCompare(b.materi, "id"));
  };
  const gArsip = kelompok(arsip);
  const gSiap = kelompok(siap);
  const mapels = [...new Set([...(store.getTugasSemua ? store.getTugasSemua() : store.getTugas()).map(t => t.mapel).filter(Boolean)])];

  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">{arsip.length} tugas tersimpan · dikelompokkan per materi</span>
          <h1>Arsip tugas</h1>
        </div>
      </div>
      <p className="gr-muted" style={{ marginTop: -10 }}>Tugas yang sudah selesai bisa diarsipkan per materi, lalu diterbitkan ulang tahun depan tanpa import soal lagi. Arsip tidak terlihat siswa dan tidak dihitung di nilai.</p>

      <div className="gr-bar-row">
        <div className="gr-seg" role="tablist" aria-label="Kelas">
          {[["semua", "Semua kelas"], ["VII", "VII"], ["VIII", "VIII"]].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={jenjang === k} className={jenjang === k ? "on" : ""} onClick={() => setJenjang(k)}>{l}</button>)}
        </div>
        <div className="gr-filter">
          <label className="gr-select"><span className="sr">Mapel</span>
            <select value={mapel} onChange={e => setMapel(e.target.value)}><option value="semua">Semua mapel</option>{mapels.map(m => <option key={m} value={m}>{m}</option>)}</select>
          </label>
          <label className="gr-cari"><span className="sr">Cari</span><input type="search" value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari judul atau materi" /></label>
        </div>
      </div>

      {gSiap.length > 0 && (
        <section>
          <Kepala judul="Siap diarsipkan" kanan={<span className="gr-mono">{siap.length} tugas selesai</span>} />
          <div className="gr-card list">
            {gSiap.map(g => (
              <div key={g.k} className="gr-siap">
                <div><b>{g.materi}</b><span className="gr-muted">{g.mapel} · {g.tugas.length} tugas selesai · {g.tugas.map(t => t.judul).slice(0, 2).join(", ")}{g.tugas.length > 2 ? ", …" : ""}</span></div>
                <button type="button" className="gr-btn outline sm" onClick={() => setArsipkan(g.tugas)}>Arsipkan {g.tugas.length} tugas</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <Kepala judul="Tersimpan di arsip" />
        {gArsip.length === 0 ? (
          <div className="gr-card"><p className="gr-empty">{arsip.length === 0 && !cari && jenjang === "semua" && mapel === "semua" ? "Arsip masih kosong. Tugas yang sudah selesai bisa diarsipkan dari daftar di atas atau dari menu Tugas." : "Tidak ada arsip yang cocok dengan pilihan ini."}</p></div>
        ) : (
          <div className="gr-stack">
            {gArsip.map(g => (
              <div key={g.k} className="gr-card gr-arsip">
                <div className="gr-arsip-head"><b>{g.materi}</b><span className="gr-mono">{g.mapel} · {g.tugas.length} tugas</span></div>
                {g.tugas.map(t => {
                  const open = buka === t.id;
                  const sbx = (t.soal || []).filter(s => s.type === "sandbox").length;
                  return (
                    <div key={t.id} className="gr-arsip-row">
                      <div className="gr-arsip-main">
                        <div className="gr-arsip-txt">
                          <b>{t.judul}</b>
                          <span className="gr-muted">Kelas {t.jenjang} · {(t.soal || []).length} soal{sbx ? ` · ${sbx} sandbox` : ""}{t.periode ? ` · dari ${t.periode}` : ""}</span>
                        </div>
                        <div className="gr-tugas-act">
                          <button type="button" className="gr-link" aria-expanded={open} onClick={() => setBuka(open ? null : t.id)}>{open ? "Tutup soal" : "Lihat soal"}</button>
                          <button type="button" className="gr-link" onClick={() => navigate("analisis-tugas", { tugasId: t.id })}>Analisis</button>
                          <button type="button" className="gr-link" onClick={() => setKembali(t)}>Kembalikan</button>
                          <button type="button" className="gr-link danger" onClick={() => setHapus(t)}>Hapus</button>
                          <button type="button" className="gr-btn sm" onClick={() => setTerbit(t)}>Terbitkan ulang</button>
                        </div>
                      </div>
                      {open && (
                        <ol className="gr-soal-list">
                          {(t.soal || []).map((s, i) => <li key={s.id || i}><span className="tipe">{LABEL_TIPE[s.type] || s.type}</span> {s.pertanyaan || "(tanpa teks)"}</li>)}
                        </ol>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>

      {toast && <div className="gr-toast" role="status">{toast}</div>}
      {terbit && <TerbitUlangModal store={store} t={terbit} onClose={() => setTerbit(null)} onDone={jd => { setTerbit(null); kabar(jd ? "Tugas dijadwalkan. Lihat di Tugas → Terjadwal." : "Tugas diterbitkan dan sudah terlihat siswa."); }} />}
      {arsipkan && <KonfirmasiArsip store={store} daftar={arsipkan} onClose={() => setArsipkan(null)} onDone={n => { setArsipkan(null); kabar(`${n} tugas diarsipkan.`); }} />}
      {kembali && (
        <div className="modal-overlay" onClick={() => setKembali(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Kembalikan "{kembali.judul}"?</h3>
            <p>Tugas aslinya kembali ke daftar Tugas, terlihat lagi oleh siswa Kelas {kembali.jenjang}, dan dihitung lagi di nilai. Untuk memakai soalnya di tahun ajaran baru, pakai "Terbitkan ulang" saja.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setKembali(null)}>Batal</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={async () => { await store.arsipkanTugas([kembali.id], false); setKembali(null); kabar("Tugas dikembalikan ke daftar Tugas."); }}>Kembalikan</button>
            </div>
          </div>
        </div>
      )}
      {hapus && <Confirm title={`Hapus "${hapus.judul}" dari arsip?`} desc="Tugas dan soalnya dihapus permanen, tidak bisa diterbitkan ulang lagi." onOk={async () => { await store.deleteTugas(hapus.id); setHapus(null); kabar("Arsip dihapus."); }} onCancel={() => setHapus(null)} />}
    </div>
  );
}

// Ambil soal dari tugas yang diarsipkan (dipakai di editor tugas, menggantikan "Bank Soal")
export function PilihDariArsipModal({ store, mapel, jenjang, onClose, onSelect }) {
  const [hanyaMapel, setHanyaMapel] = useState(true);
  const [cari, setCari] = useState("");
  const [buka, setBuka] = useState(null);
  const [pilih, setPilih] = useState({}); // { "tugasId|idx": soal }
  const q = cari.trim().toLowerCase();
  const daftar = (store.getTugasArsip ? store.getTugasArsip() : [])
    .filter(t => !hanyaMapel || t.mapel === mapel)
    .filter(t => !q || `${t.judul} ${t.materi || ""} ${(t.soal || []).map(s => s.pertanyaan).join(" ")}`.toLowerCase().includes(q))
    .sort((a, b) => (a.jenjang === jenjang ? -1 : 0) - (b.jenjang === jenjang ? -1 : 0) || kunciMateri(a).localeCompare(kunciMateri(b), "id"));
  const n = Object.keys(pilih).length;
  const toggle = (k, s) => setPilih(p => { const x = { ...p }; if (x[k]) delete x[k]; else x[k] = s; return x; });
  const semuaDari = t => setPilih(p => { const x = { ...p }; (t.soal || []).forEach((s, i) => { x[`${t.id}|${i}`] = s; }); return x; });
  const tambah = () => onSelect(Object.values(pilih).map(s => JSON.parse(JSON.stringify({ ...s, id: uid() }))));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal gr-pick" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-pick-j">
        <h3 id="gr-pick-j">Ambil soal dari arsip</h3>
        <div className="gr-bar-row">
          <label className="gr-cari"><span className="sr">Cari soal</span><input type="search" value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari judul, materi, atau isi soal" /></label>
          <label className="gr-check"><input type="checkbox" checked={hanyaMapel} onChange={e => setHanyaMapel(e.target.checked)} /> Hanya {mapel}</label>
        </div>
        <div className="gr-pick-list">
          {daftar.length === 0 && <p className="gr-empty">{(store.getTugasArsip ? store.getTugasArsip() : []).length ? "Tidak ada arsip yang cocok." : "Arsip masih kosong. Arsipkan tugas yang sudah selesai lewat menu Arsip atau Tugas."}</p>}
          {daftar.map(t => (
            <div key={t.id} className="gr-pick-t">
              <div className="gr-pick-head">
                <button type="button" className="gr-link" aria-expanded={buka === t.id} onClick={() => setBuka(buka === t.id ? null : t.id)}>{t.judul}</button>
                <span className="gr-muted">{kunciMateri(t)} · Kelas {t.jenjang} · {(t.soal || []).length} soal</span>
                <button type="button" className="gr-link" onClick={() => semuaDari(t)}>Pilih semua</button>
              </div>
              {buka === t.id && (t.soal || []).map((s, i) => {
                const k = `${t.id}|${i}`;
                return (
                  <label key={k} className="gr-pick-s">
                    <input type="checkbox" checked={!!pilih[k]} onChange={() => toggle(k, s)} />
                    <span><span className="tipe">{LABEL_TIPE[s.type] || s.type}</span> {s.pertanyaan || "(tanpa teks)"}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!n} onClick={tambah}>Tambahkan {n} soal</button>
        </div>
      </div>
    </div>
  );
}

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
import { uid, fmtLastSeen, withTimeout, getPeriodeAktif, getPeriodeOptions } from "../utils/helpers";
import { Confirm, Avatar } from "../components/visual";
import { getLevel, TierIcon, BadgeIcon, AUTO_BADGES, MANUAL_BADGES } from "../components/gamification";
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
    if (item.key === "esai") navigate("nilai-esai", { tugasId: item.tugas.id });
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
          {a.esaiBelum > 0 && <button type="button" className="gr-btn" onClick={() => navigate("nilai-esai", { tugasId: t.id })}>Nilai esai · {a.esaiBelum}</button>}
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
        draf: grup === "terjadwal" && !t.scheduledAt,
        tenggat: grup === "terjadwal" && !t.scheduledAt ? "Draf" : grup === "terjadwal" ? `Terbit ${t.scheduledAt ? new Date(t.scheduledAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "terjadwal"}` : grup === "selesai" ? `Ditutup ${t.deadline ? tglPanjang(deadlineEnd(t.deadline)) : ""}` : tg.label,
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
  const kabar = m => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const d = hitungDaftarTugas(store, jenjang, { tab, personalSaja, cari });
  // Draf hasil duplikat: terbitkan langsung kalau tenggatnya masih berlaku, kalau tidak buka editor dulu
  async function terbitkanDraf(t) {
    if (!t.deadline || deadlineEnd(t.deadline) < Date.now()) { kabar("Tenggat draf ini sudah lewat. Atur tenggat baru, lalu simpan."); navigate("edit-tugas", { tugasId: t.id }); return; }
    try { await store.updateTugas(t.id, { status: "aktif", scheduledAt: null, draf: null }); kabar("Tugas diterbitkan dan sudah terlihat siswa."); }
    catch (e) { kabar("Gagal menerbitkan: " + (e?.message || "coba lagi")); }
  }
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
                    {x.draf ? "Draf, belum terlihat siswa" : x.grup === "terjadwal" ? "Belum terlihat oleh siswa" : x.esai ? `${x.esai} esai belum dinilai` : x.belum === 0 ? "Semua penerima sudah mengumpulkan" : x.grup === "selesai" ? `${x.belum} siswa tidak mengumpulkan` : `${x.belum} siswa belum mengumpulkan`}
                  </span>
                  <div className="gr-tugas-act">
                    {x.draf && <button type="button" className="gr-link" onClick={() => terbitkanDraf(t)}>Terbitkan</button>}
                    {x.kumpul > 0 && <button type="button" className="gr-link" onClick={() => navigate("analisis-tugas", { tugasId: t.id })}>Analisis</button>}
                    {x.kumpul > 0 && IntervensiNilaiModal && <button type="button" className="gr-link" onClick={() => setNilaiT(t)}>Nilai</button>}
                    <button type="button" className="gr-link" onClick={() => navigate("edit-tugas", { tugasId: t.id })}>{x.grup === "selesai" ? "Perpanjang" : "Edit"}</button>
                    <button type="button" className="gr-link" onClick={async () => { try { await store.duplicateTugas(t); { kabar("Salinan dibuat sebagai draf di tab Terjadwal. Siswa belum melihatnya."); setTab("terjadwal"); } } catch (e) { kabar("Gagal menduplikat: " + (e?.message || "coba lagi")); } }}>Duplikat</button>
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
  const [kartu, setKartu] = useState(false);
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
          {cetakKartu && <button type="button" className="gr-btn outline" disabled={!siswa.length} onClick={() => setKartu(true)}>Cetak kartu login</button>}
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
      {kartu && cetakKartu && <KartuLoginModal store={store} siswa={siswa} jenjang={jenjang} cetakKartu={cetakKartu} tunggu={tunggu} onClose={() => setKartu(false)} />}
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

// ─── Penilaian esai per soal (Nov 2026) ───
// Satu soal, semua jawaban siswa berderet. Jawaban yang sama persis (setelah huruf kecil & tanda baca dibuang)
// dikelompokkan dan bisa dinilai sekaligus. Setiap klik nilai langsung tersimpan (store.nilaiJawabanManual, atomik).
const NILAI_CEPAT = [0, 50, 70, 85, 100];
const normalJawaban = x => String(x || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const LABEL_REFLEKSI = ["Prediksi saya", "Yang saya observasi", "Yang salah/bug", "Pelajaran yang saya ambil"];

function IsiJawaban({ soal, r }) {
  if (soal.type === "refleksi") {
    return (
      <div className="gr-refleksi">
        {["k1", "k2", "k3", "k4"].map((k, i) => (
          <div key={k}><span>{soal[`labelKolom${i + 1}`] || LABEL_REFLEKSI[i]}</span><p>{r.jawabanRefleksi?.[k] || <i>kosong</i>}</p></div>
        ))}
      </div>
    );
  }
  const teks = r.jawabanEssay || "";
  return teks.trim() ? <p className="gr-esai-teks">{teks}</p> : <p className="gr-esai-teks kosong">Tidak menjawab</p>;
}

export function NilaiEsaiCepat({ store, tugasId, navigate, NilaiEssayModal }) {
  const [pilihSoal, setPilihSoal] = useState(null);
  const [tampil, setTampil] = useState("belum");
  const [sesi, setSesi] = useState({});
  const [sibuk, setSibuk] = useState(null);
  const [lain, setLain] = useState({});
  const [komen, setKomen] = useState({});
  const [modeLama, setModeLama] = useState(false);
  const [err, setErr] = useState("");
  const t = (store.getTugasSemua || store.getTugas)().find(x => x.id === tugasId);
  if (!t) return <div className="page gr"><p className="gr-empty">Tugas tidak ditemukan.</p></div>;

  const siswaAll = store.getAllSiswa();
  const namaOf = id => { const x = siswaAll.find(a => a.id === id); return x ? (x.namaDisplay || x.nama) : id; };
  const subs = store.getSubs().filter(x => x.tugasId === t.id);
  const manual = (t.soal || []).map((s, i) => ({ s, i })).filter(x => x.s.type === "essay" || x.s.type === "refleksi");
  const jawabanOf = ({ s, i }) => subs.map(sub => {
    const r = (sub.soalResults || []).find(x => (x.soalId && x.soalId === s.id) || (!x.soalId && x.origIdx === i));
    if (!r || !r.statusNilai) return null;
    const teks = s.type === "refleksi" ? ["k1", "k2", "k3", "k4"].map(k => r.jawabanRefleksi?.[k] || "").join(" | ") : (r.jawabanEssay || "");
    return { key: `${sub.id}|${s.id || i}`, sub, r, nama: namaOf(sub.siswaId), teks, belum: r.statusNilai === "perlu_dinilai" };
  }).filter(Boolean).sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  const perSoal = manual.map(m => { const js = jawabanOf(m); return { ...m, js, belum: js.filter(j => j.belum).length }; });
  const total = perSoal.reduce((n, x) => n + x.js.length, 0);
  const belumTotal = perSoal.reduce((n, x) => n + x.belum, 0);
  const aktif = perSoal.find(x => x.i === pilihSoal) || perSoal.find(x => x.belum > 0) || perSoal[0];

  if (!aktif) return (
    <div className="page gr">
      <button type="button" className="gr-link back" onClick={() => navigate("analisis-tugas", { tugasId: t.id })}><Ikon d={IKON.kiri} s={15} w={2.4} /> Analisis</button>
      <div className="gr-card"><p className="gr-empty">Tugas ini tidak punya soal esai atau refleksi.</p></div>
    </div>
  );

  const terlihat = aktif.js.filter(j => tampil === "semua" || j.belum || sesi[j.key]);
  // Kelompok jawaban identik (hanya yang belum dinilai, minimal 2 siswa)
  const grup = {};
  if (tampil === "belum") terlihat.filter(j => j.belum).forEach(j => { const k = normalJawaban(j.teks) || "__kosong__"; (grup[k] = grup[k] || []).push(j); });
  const kelompok = Object.entries(grup).filter(([, js]) => js.length > 1).map(([k, js]) => ({ k, js })).sort((a, b) => b.js.length - a.js.length);
  const dalamKelompok = new Set(kelompok.flatMap(g => g.js.map(j => j.key)));
  const tunggal = terlihat.filter(j => !dalamKelompok.has(j.key));

  async function beriNilai(js, v, idFokus) {
    const kom = js.length === 1 ? (komen[js[0].key] ?? js[0].r.komentarGuru ?? "") : "";
    setErr(""); setSibuk(idFokus);
    try {
      await store.nilaiJawabanManual(js.map(j => ({ subId: j.sub.id, soalId: j.r.soalId || null, origIdx: j.r.origIdx })), v, kom);
      setSesi(x => { const y = { ...x }; js.forEach(j => { y[j.key] = true; }); return y; });
      // Lompat ke jawaban berikutnya yang belum dinilai
      requestAnimationFrame(() => {
        const semua = [...document.querySelectorAll(".gr-esai[data-belum='1']")];
        const sekarang = document.getElementById(idFokus);
        const next = semua.find(el => el !== sekarang && sekarang && (sekarang.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) || semua.find(el => el !== sekarang);
        if (next) { next.scrollIntoView({ behavior: "smooth", block: "center" }); next.focus({ preventScroll: true }); }
      });
    } catch (e) { setErr("Gagal menyimpan nilai: " + (e?.message || "coba lagi")); }
    finally { setSibuk(null); }
  }

  // Fungsi biasa (bukan komponen) supaya input "Lain" tidak kehilangan fokus saat mengetik
  const tombolNilai = (js, idFokus, nilaiSekarang) => {
    const key = js.length === 1 ? js[0].key : idFokus;
    const vLain = lain[key] ?? "";
    const okLain = vLain !== "" && Number(vLain) >= 0 && Number(vLain) <= 100;
    return (
      <div className="gr-nilai-row">
        {NILAI_CEPAT.map(v => (
          <button key={v} type="button" className={`gr-nb${nilaiSekarang === v ? " on" : ""}`} disabled={sibuk === idFokus} onClick={() => beriNilai(js, v, idFokus)} aria-label={`Beri nilai ${v}${js.length > 1 ? ` untuk ${js.length} siswa` : ""}`}>{v}</button>
        ))}
        <label className="gr-nb-lain"><span className="sr">Nilai lain</span>
          <input type="number" min="0" max="100" inputMode="numeric" placeholder="Lain" value={vLain}
            onChange={e => setLain(x => ({ ...x, [key]: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter" && okLain) beriNilai(js, Number(vLain), idFokus); }} />
        </label>
        {vLain !== "" && <button type="button" className="gr-btn sm" disabled={!okLain || sibuk === idFokus} onClick={() => beriNilai(js, Number(vLain), idFokus)}>Simpan</button>}
      </div>
    );
  };

  const pct = total ? Math.round((total - belumTotal) / total * 100) : 100;
  return (
    <div className="page gr">
      <button type="button" className="gr-link back" onClick={() => navigate("analisis-tugas", { tugasId: t.id })}><Ikon d={IKON.kiri} s={15} w={2.4} /> Analisis</button>
      <div className="gr-head">
        <div>
          <span className="gr-mono">Nilai esai · {t.mapel} · Kelas {t.jenjang}</span>
          <h1>{t.judul}</h1>
        </div>
        {NilaiEssayModal && <div className="gr-actions"><button type="button" className="gr-btn outline" onClick={() => setModeLama(true)}>Mode per siswa</button></div>}
      </div>

      <div className="gr-card gr-progres">
        <div><b>{total - belumTotal} dari {total} jawaban dinilai</b><span className="gr-muted">{belumTotal ? `${belumTotal} lagi` : "Semua sudah dinilai"}</span></div>
        <Bar v={pct} tone="solid" />
      </div>

      {perSoal.length > 1 && (
        <div className="gr-seg scroll" role="tablist" aria-label="Pilih soal">
          {perSoal.map(x => (
            <button key={x.i} type="button" role="tab" aria-selected={aktif.i === x.i} className={aktif.i === x.i ? "on" : ""} onClick={() => setPilihSoal(x.i)}>Soal {x.i + 1}{x.belum ? ` · ${x.belum}` : " · selesai"}</button>
          ))}
        </div>
      )}

      <section className="gr-card gr-esai-soal">
        <span className="gr-mono">Soal {aktif.i + 1} · {LABEL_TIPE[aktif.s.type]}</span>
        <p>{aktif.s.pertanyaan}</p>
        {aktif.s.kataKunci && <div className="gr-pedoman"><b>Kata kunci</b><span>{aktif.s.kataKunci}</span></div>}
        {aktif.s.panduanNilai && <div className="gr-pedoman"><b>Panduan</b><span>{aktif.s.panduanNilai}</span></div>}
        <span className="gr-muted">Nilai 60 ke atas dihitung benar. Setiap klik langsung tersimpan.</span>
      </section>

      <div className="gr-bar-row">
        <div className="gr-seg" role="tablist" aria-label="Jawaban yang ditampilkan">
          <button type="button" role="tab" aria-selected={tampil === "belum"} className={tampil === "belum" ? "on" : ""} onClick={() => { setTampil("belum"); setSesi({}); }}>Belum dinilai · {aktif.belum}</button>
          <button type="button" role="tab" aria-selected={tampil === "semua"} className={tampil === "semua" ? "on" : ""} onClick={() => setTampil("semua")}>Semua · {aktif.js.length}</button>
        </div>
        {err && <span className="gr-warn inline">{err}</span>}
      </div>

      {terlihat.length === 0 ? (
        <div className="gr-card"><p className="gr-empty">Semua jawaban soal ini sudah dinilai.{perSoal.some(x => x.belum) ? " Pilih soal lain di atas." : ""}</p></div>
      ) : (
        <div className="gr-stack">
          {kelompok.map(g => {
            const id = `esai-g-${aktif.i}-${g.k.slice(0, 24)}`;
            return (
              <article key={g.k} id={id} className="gr-card gr-esai grup" data-belum={g.js.some(j => j.belum) ? "1" : "0"} tabIndex={-1}>
                <header><b>{g.js.length} siswa menjawab sama</b><span className="gr-muted">{g.js.map(j => j.nama.split(" ")[0]).join(", ")}</span></header>
                <IsiJawaban soal={aktif.s} r={g.js[0].r} />
                {tombolNilai(g.js, id)}
              </article>
            );
          })}
          {tunggal.map(j => {
            const id = `esai-${j.key.replace(/[^\w-]/g, "_")}`;
            const dinilai = !j.belum;
            const kOpen = komen[j.key] !== undefined;
            return (
              <article key={j.key} id={id} className={`gr-card gr-esai${dinilai ? " done" : ""}`} data-belum={j.belum ? "1" : "0"} tabIndex={-1}>
                <header>
                  <b>{j.nama}</b>
                  {dinilai ? <span className={`gr-chip ${j.r.nilaiEssay >= 60 ? "teal" : "amber"}`}>Dinilai {j.r.nilaiEssay}</span> : <span className="gr-chip soft">Belum dinilai</span>}
                </header>
                <IsiJawaban soal={aktif.s} r={j.r} />
                {tombolNilai([j], id, dinilai ? j.r.nilaiEssay : undefined)}
                {kOpen ? (
                  <div className="gr-komen">
                    <label className="sr" htmlFor={`${id}-k`}>Komentar untuk {j.nama}</label>
                    <input id={`${id}-k`} className="inp" value={komen[j.key]} onChange={e => setKomen(x => ({ ...x, [j.key]: e.target.value }))} placeholder="Komentar untuk siswa (terlihat di review tugas)" />
                    {dinilai && <button type="button" className="gr-btn sm outline" disabled={sibuk === id} onClick={() => beriNilai([j], j.r.nilaiEssay, id)}>Simpan komentar</button>}
                  </div>
                ) : (
                  <button type="button" className="gr-link" onClick={() => setKomen(x => ({ ...x, [j.key]: j.r.komentarGuru || "" }))}>{j.r.komentarGuru ? `Komentar: "${j.r.komentarGuru}"` : "Tambah komentar"}</button>
                )}
              </article>
            );
          })}
        </div>
      )}
      {modeLama && NilaiEssayModal && <NilaiEssayModal tugas={t} store={store} onClose={() => setModeLama(false)} />}
    </div>
  );
}

// ─── Kartu login: password baru massal ───
// Password akun tidak bisa dibaca dari app (sengaja, demi keamanan), jadi kartu yang berisi password
// hanya bisa dicetak tepat setelah password dibuat ulang. Password baru: 6 karakter acak tanpa huruf/angka
// yang mudah tertukar (bukan "ID + 3 angka" yang mudah ditebak teman sekelas).
const HURUF_PW = "abcdefghjkmnpqrstuvwxyz23456789";
export function buatPasswordAcak(n = 6) {
  const a = new Uint32Array(n);
  (globalThis.crypto || window.crypto).getRandomValues(a);
  return Array.from(a, x => HURUF_PW[x % HURUF_PW.length]).join("");
}

function KartuLoginModal({ store, siswa, jenjang, cetakKartu, tunggu, onClose }) {
  const [pilih, setPilih] = useState(() => new Set(siswa.map(s => s.id)));
  const [jalan, setJalan] = useState(null); // { selesai, total, gagal: [] }
  const [yakin, setYakin] = useState(false);
  const daftar = siswa.filter(s => pilih.has(s.id));
  const toggle = id => setPilih(p => { const x = new Set(p); x.has(id) ? x.delete(id) : x.add(id); return x; });
  async function mulai() {
    // Buka jendela cetak SEKARANG (masih di dalam klik). Kalau diblokir, batalkan sebelum ada password berubah.
    const win = window.open("", "_blank");
    if (!win) { alert("Jendela cetak diblokir browser. Izinkan pop-up untuk Astrolab, lalu coba lagi. Belum ada password yang diubah."); return; }
    try { win.document.write("<p style=\"font-family:sans-serif;padding:24px\">Menyiapkan kartu login… jangan tutup jendela ini.</p>"); } catch { /* abaikan */ }
    const hasil = [], gagal = [];
    setJalan({ selesai: 0, total: daftar.length, gagal });
    for (const s of daftar) {
      const pw = buatPasswordAcak();
      try { await tunggu(store.resetPassword(s.id, pw)); hasil.push({ ...s, password: pw }); }
      catch (e) { gagal.push(`${s.nama} (${e?.message || "gagal"})`); }
      setJalan({ selesai: hasil.length + gagal.length, total: daftar.length, gagal: [...gagal] });
    }
    if (hasil.length) cetakKartu(hasil, jenjang, win); else { try { win.close(); } catch { /* abaikan */ } }
    setJalan(j => ({ ...j, beres: true, berhasil: hasil.length, hasil }));
  }
  return (
    <div className="modal-overlay" onClick={jalan && !jalan.beres ? undefined : onClose}>
      <div className="modal gr-pick" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-kartu-j">
        <h3 id="gr-kartu-j">Cetak kartu login · Kelas {jenjang}</h3>
        {!jalan ? (<>
          <p>Password siswa tidak tersimpan dalam bentuk yang bisa dibaca, jadi kartu hanya bisa berisi password kalau passwordnya <b>dibuat ulang sekarang</b>. Password lama siswa yang dipilih langsung tidak berlaku untuk login berikutnya.</p>
          <div className="gr-bar-row">
            <span className="gr-muted">{daftar.length} dari {siswa.length} siswa dipilih</span>
            <div className="gr-tugas-act">
              <button type="button" className="gr-link" onClick={() => setPilih(new Set(siswa.map(s => s.id)))}>Pilih semua</button>
              <button type="button" className="gr-link" onClick={() => setPilih(new Set())}>Kosongkan</button>
            </div>
          </div>
          <div className="gr-pick-list">
            {siswa.map(s => (
              <label key={s.id} className="gr-pick-s"><input type="checkbox" checked={pilih.has(s.id)} onChange={() => toggle(s.id)} /><span>{s.nama} <code className="gr-mono">{s.id}</code></span></label>
            ))}
          </div>
          <label className="gr-check"><input type="checkbox" checked={yakin} onChange={e => setYakin(e.target.checked)} /> Saya akan membagikan kartu baru ke siswa yang dipilih</label>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { cetakKartu(siswa.map(s => ({ ...s, password: "—" })), jenjang); onClose(); }}>Cetak tanpa password</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!daftar.length || !yakin} onClick={mulai}>Buat password baru & cetak · {daftar.length}</button>
          </div>
        </>) : (<>
          <p>{jalan.beres ? `Selesai. ${jalan.berhasil} kartu siap dicetak di jendela baru.` : `Membuat password baru… ${jalan.selesai} dari ${jalan.total}`}</p>
          <Bar v={jalan.total ? jalan.selesai / jalan.total * 100 : 0} tone="solid" />
          {jalan.gagal.length > 0 && <p className="gr-warn">Gagal untuk {jalan.gagal.length} siswa: {jalan.gagal.join(", ")}. Password mereka tidak berubah dan tidak ikut dicetak.</p>}
          {jalan.beres && jalan.hasil?.length > 0 && (<>
            <p className="gr-muted">Cadangan: catat atau salin daftar ini sebelum menutup. Password ini tidak bisa dilihat lagi setelah modal ditutup.</p>
            <div className="gr-pick-list gr-pwlist">
              {jalan.hasil.map(s => <div key={s.id}><span>{s.nama}</span><code>{s.id}</code><code className="pw">{s.password}</code></div>)}
            </div>
            <button type="button" className="gr-link" onClick={() => { try { navigator.clipboard.writeText(jalan.hasil.map(s => `${s.nama}\t${s.id}\t${s.password}`).join("\n")); } catch { /* abaikan */ } }}>Salin daftar (bisa ditempel ke Excel)</button>
          </>)}
          <div className="modal-actions"><button type="button" className="btn btn-primary btn-sm" disabled={!jalan.beres} onClick={onClose}>Tutup</button></div>
        </>)}
      </div>
    </div>
  );
}

// ─── Siswa (ringkasan kelas) — menu "Siswa" ───
export function hitungKelas(store, jenjang, now = Date.now()) {
  const siswa = store.getAllSiswa(jenjang);
  const subs = store.getSubs();
  const tugas = store.getTugas().filter(t => t.jenjang === jenjang && t.status !== "scheduled");
  const baris = siswa.map(s => {
    const milik = tugas.filter(t => !Array.isArray(t.assignedTo) || t.assignedTo.includes(s.id));
    const ss = subs.filter(x => x.siswaId === s.id && milik.some(t => t.id === x.tugasId));
    const dinilai = ss.filter(x => typeof x.nilai === "number" && milik.find(t => t.id === x.tugasId)?.graded !== false).map(x => x.nilai);
    // Pembanding pengumpulan: tugas yang tenggatnya sudah lewat + tugas berjalan yang sudah dikumpulkan
    // (tugas berjalan yang belum dikumpulkan tidak dihitung kurang — masih ada waktu)
    const wajib = milik.filter(t => labelTenggat(t, now).lewat || ss.some(x => x.tugasId === t.id)).length;
    const st = store.getStats(s.id);
    const lv = getLevel(st.poin || 0);
    const online = store.isOnline ? store.isOnline(s.uid || s.id) || store.isOnline(s.id) : false;
    const last = store.getLastSeen ? store.getLastSeen(s.uid || s.id) || store.getLastSeen(s.id) : null;
    return {
      s, lv, poin: st.poin || 0, streak: st.streak || 0, badge: (store.getBadges ? store.getBadges(s.id) : []).length,
      kumpul: ss.length, wajib, pctKumpul: wajib ? Math.round(ss.length / wajib * 100) : null,
      rata: bulat(avg(dinilai)), online, last: last || null,
    };
  });
  // Aktivitas 7 hari: siswa unik yang mengumpulkan tiap hari
  const ids = new Set(siswa.map(s => s.id));
  const hariIni = new Date(now); hariIni.setHours(0, 0, 0, 0);
  const HARI_NM = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const aktivitas = Array.from({ length: 7 }, (_, i) => {
    const a = new Date(hariIni.getTime() - (6 - i) * HARI), b = a.getTime() + HARI;
    const di = subs.filter(x => ids.has(x.siswaId) && x.submittedAt && new Date(x.submittedAt).getTime() >= a.getTime() && new Date(x.submittedAt).getTime() < b);
    return { label: i === 6 ? "Hari ini" : HARI_NM[a.getDay()], siswa: new Set(di.map(x => x.siswaId)).size, kumpul: di.length };
  });
  return { baris, aktivitas, total: siswa.length };
}

export function KelasV2({ store, navigate, onTampilanLama }) {
  const [jenjang, setJenjang] = useState("VII");
  const [urut, setUrut] = useState("nama");
  const [cari, setCari] = useState("");
  const d = hitungKelas(store, jenjang);
  const q = cari.trim().toLowerCase();
  const URUT = { nama: "Nama", rata: "Rata-rata terendah", kumpul: "Pengumpulan terendah", poin: "Poin tertinggi", aktif: "Terakhir aktif" };
  const sorter = {
    nama: (a, b) => (a.s.nama || "").localeCompare(b.s.nama || "", "id"),
    rata: (a, b) => (a.rata ?? 999) - (b.rata ?? 999),
    kumpul: (a, b) => (a.pctKumpul ?? 999) - (b.pctKumpul ?? 999),
    poin: (a, b) => b.poin - a.poin,
    aktif: (a, b) => (b.online - a.online) || ((b.last || 0) - (a.last || 0)),
  }[urut];
  const baris = d.baris.filter(r => !q || `${r.s.nama} ${r.s.id}`.toLowerCase().includes(q)).sort(sorter);
  const maxA = Math.max(1, ...d.aktivitas.map(x => x.siswa));
  const rataKelas = bulat(avg(d.baris.map(r => r.rata).filter(v => v != null)));
  const bawah = d.baris.filter(r => r.rata != null && r.rata < KKTP).length;
  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">{d.total} siswa · rata-rata tugas {rataKelas ?? "belum ada"} · {bawah} di bawah KKTP</span>
          <h1>Siswa</h1>
        </div>
        <div className="gr-actions">
          <button type="button" className="gr-btn outline" onClick={() => navigate("badge-manager")}>Kelola badge</button>
          <button type="button" className="gr-btn outline" onClick={() => navigate("manajemen-siswa")}>Kelola akun</button>
        </div>
      </div>

      <div className="gr-bar-row">
        <div className="gr-seg" role="tablist" aria-label="Pilih kelas">
          {["VII", "VIII"].map(j => <button key={j} type="button" role="tab" aria-selected={jenjang === j} className={jenjang === j ? "on" : ""} onClick={() => setJenjang(j)}>Kelas {j} · {store.getAllSiswa(j).length}</button>)}
        </div>
      </div>

      <section className="gr-card gr-akt">
        <div className="gr-sh"><span className="gr-sub up">Siswa yang mengumpulkan, 7 hari terakhir</span><span className="gr-muted">dari {d.total} siswa</span></div>
        <div className="gr-akt-bars" role="img" aria-label={d.aktivitas.map(a => `${a.label} ${a.siswa} siswa`).join(", ")}>
          {d.aktivitas.map((a, i) => (
            <div key={i}><b>{a.siswa || ""}</b><i className={i === 6 ? "solid" : ""} style={{ height: `${Math.round(a.siswa / maxA * 84) + 3}px` }} /><span>{a.label}</span></div>
          ))}
        </div>
      </section>

      <div className="gr-bar-row">
        <label className="gr-cari"><span className="sr">Cari siswa</span><input type="search" value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama atau ID" /></label>
        <label className="gr-select"><span className="sr">Urutkan</span>
          <select value={urut} onChange={e => setUrut(e.target.value)}>{Object.entries(URUT).map(([k, l]) => <option key={k} value={k}>Urut: {l}</option>)}</select>
        </label>
      </div>

      {baris.length === 0 ? <div className="gr-card"><p className="gr-empty">{d.total ? `Tidak ada siswa yang cocok dengan "${cari}".` : `Belum ada siswa di Kelas ${jenjang}.`}</p></div> : (
        <div className="gr-card gr-scroll">
          <div className="gr-grid kelas head"><span>Siswa</span><span className="r">Rata-rata</span><span className="r">Pengumpulan</span><span className="r">Poin</span><span>Terakhir aktif</span></div>
          {baris.map(r => (
            <div key={r.s.id} className="gr-grid kelas">
              <div className="c-nm">
                <span className="gr-ava xs" style={{ background: r.lv.color || "#0d6b7a" }}>{inisial(r.s.nama)}</span>
                <span className="nm-txt"><b>{r.s.namaDisplay || r.s.nama}</b><span style={{ color: r.lv.color }}><TierIcon tierId={r.lv.tierId} size={11} color={r.lv.color} /> {r.lv.name}{r.streak >= 3 ? ` · streak ${r.streak}` : ""}{r.badge ? ` · ${r.badge} badge` : ""}</span></span>
              </div>
              <span data-l="Rata-rata" className={`r num c-rata ${r.rata != null && r.rata < KKTP ? "amber" : ""}`}>{r.rata ?? <span className="gr-muted">Belum ada</span>}</span>
              <span data-l="Kumpul" className={`r num c-kumpul ${r.pctKumpul != null && r.pctKumpul < 70 ? "amber" : ""}`}>{r.wajib ? `${r.kumpul}/${r.wajib}` : <span className="gr-muted">Belum ada</span>}</span>
              <span className="r num c-poin">{r.poin.toLocaleString("id-ID")}</span>
              <span className="c-akt">{r.online ? <span className="gr-online">Sedang online</span> : <span className="gr-muted">{r.last ? fmtLastSeen(r.last) : "Belum tercatat"}</span>}</span>
            </div>
          ))}
        </div>
      )}
      <p className="gr-muted">Rata-rata = nilai tugas Astrolab yang dinilai. Pengumpulan = tugas yang dikumpulkan dibanding tugas yang tenggatnya sudah lewat (tugas berjalan yang belum dikumpulkan tidak dihitung). Amber = di bawah KKTP {KKTP} atau pengumpulan di bawah 70%.</p>
      {onTampilanLama && <button type="button" className="gr-old" onClick={onTampilanLama}>Buka tampilan lama</button>}
    </div>
  );
}

// ─── Badge (guru): beri satu badge ke banyak siswa sekaligus, atau kelola per siswa ───
export function BadgeGuruV2({ store, onTampilanLama }) {
  const [mode, setMode] = useState("beri");
  const [jenjang, setJenjang] = useState("VII");
  const [badge, setBadge] = useState(null);
  const [pilih, setPilih] = useState(new Set());
  const [cari, setCari] = useState("");
  const [siswaId, setSiswaId] = useState(null);
  const [cabut, setCabut] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [toast, setToast] = useState("");
  const kabar = m => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const siswa = store.getAllSiswa(jenjang);
  const q = cari.trim().toLowerCase();
  const terlihat = siswa.filter(x => !q || `${x.nama} ${x.id}`.toLowerCase().includes(q));
  const punya = id => store.getBadges(id);
  const kategori = [...new Set(MANUAL_BADGES.map(b => b.category || "Lainnya"))];
  const b = MANUAL_BADGES.find(x => x.id === badge);
  const bisa = terlihat.filter(x => !(b && punya(x.id).includes(b.id)));
  const aktif = siswa.find(x => x.id === siswaId) || siswa[0];

  async function beri() {
    if (!b || !pilih.size) return;
    setSibuk(true);
    let ok = 0; const gagal = [];
    for (const id of pilih) {
      try { await store.awardBadge(id, b.id); ok++; } catch { gagal.push(siswa.find(x => x.id === id)?.nama || id); }
    }
    setSibuk(false); setPilih(new Set());
    kabar(gagal.length ? `${ok} siswa menerima ${b.name}. Gagal: ${gagal.join(", ")}.` : `${ok} siswa menerima ${b.name} (+${b.poin || 0} poin masing-masing).`);
  }
  const toggle = id => setPilih(p => { const x = new Set(p); x.has(id) ? x.delete(id) : x.add(id); return x; });
  const kartuBadge = (bd, opt = {}) => (
    <button key={bd.id} type="button" className={`gr-bdg${opt.on ? " on" : ""}${opt.punya === false ? " off" : ""}`} onClick={opt.onClick} disabled={opt.disabled} aria-pressed={opt.on}>
      <BadgeIcon type={bd.icon} rim={bd.rim} size={opt.size || 40} locked={opt.punya === false} />
      <b>{bd.name}</b>
      <span>{opt.ket ?? bd.desc}</span>
    </button>
  );

  return (
    <div className="page gr">
      <div className="gr-head">
        <div><span className="gr-mono">Badge manual memberi poin ke siswa · badge otomatis diberikan sistem</span><h1>Badge</h1></div>
      </div>
      <div className="gr-bar-row">
        <div className="gr-seg" role="tablist" aria-label="Mode">
          <button type="button" role="tab" aria-selected={mode === "beri"} className={mode === "beri" ? "on" : ""} onClick={() => setMode("beri")}>Beri badge</button>
          <button type="button" role="tab" aria-selected={mode === "siswa"} className={mode === "siswa" ? "on" : ""} onClick={() => setMode("siswa")}>Per siswa</button>
        </div>
        <div className="gr-seg" role="tablist" aria-label="Kelas">
          {["VII", "VIII"].map(j => <button key={j} type="button" role="tab" aria-selected={jenjang === j} className={jenjang === j ? "on" : ""} onClick={() => { setJenjang(j); setPilih(new Set()); setSiswaId(null); }}>Kelas {j}</button>)}
        </div>
      </div>

      {mode === "beri" ? (<>
        <section>
          <Kepala judul="1. Pilih badge" />
          {kategori.map(k => (
            <div key={k} className="gr-bdg-grup">
              <span className="gr-sub">{k}</span>
              <div className="gr-bdg-grid">
                {MANUAL_BADGES.filter(x => (x.category || "Lainnya") === k).map(bd => kartuBadge(bd, { on: badge === bd.id, onClick: () => { setBadge(bd.id); setPilih(new Set()); }, ket: `${bd.desc} · +${bd.poin || 0} poin` }))}
              </div>
            </div>
          ))}
        </section>
        <section>
          <Kepala judul={b ? `2. Pilih siswa untuk ${b.name}` : "2. Pilih siswa"} kanan={b && <span className="gr-mono">{pilih.size} dipilih</span>} />
          {!b ? <div className="gr-card"><p className="gr-empty">Pilih badge dulu di atas.</p></div> : (
            <div className="gr-card list">
              <div className="gr-bdg-tool">
                <label className="gr-cari"><span className="sr">Cari siswa</span><input type="search" value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama" /></label>
                <button type="button" className="gr-link" onClick={() => setPilih(new Set(bisa.map(x => x.id)))}>Pilih semua yang belum punya</button>
                {pilih.size > 0 && <button type="button" className="gr-link" onClick={() => setPilih(new Set())}>Kosongkan</button>}
              </div>
              {terlihat.map(x => {
                const sudah = punya(x.id).includes(b.id);
                return (
                  <label key={x.id} className={`gr-bdg-siswa${sudah ? " sudah" : ""}`}>
                    <input type="checkbox" disabled={sudah} checked={sudah || pilih.has(x.id)} onChange={() => toggle(x.id)} />
                    <span className="nm">{x.namaDisplay || x.nama}</span>
                    <span className="gr-muted">{sudah ? "Sudah punya" : `${punya(x.id).length} badge`}</span>
                  </label>
                );
              })}
            </div>
          )}
        </section>
        {b && (
          <div className="gr-sticky">
            <span>{pilih.size ? `${b.name} untuk ${pilih.size} siswa · total +${(b.poin || 0) * pilih.size} poin` : "Centang siswa yang menerima badge"}</span>
            <button type="button" className="gr-btn" disabled={!pilih.size || sibuk} onClick={beri}>{sibuk ? "Memberikan…" : `Beri badge · ${pilih.size}`}</button>
          </div>
        )}
      </>) : (
        <div className="gr-cols">
          <section className="gr-side">
            <label className="gr-cari"><span className="sr">Cari siswa</span><input type="search" value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama" /></label>
            <div className="gr-card list gr-bdg-daftar">
              {terlihat.map(x => (
                <button key={x.id} type="button" className={`gr-bdg-pilih${aktif?.id === x.id ? " on" : ""}`} onClick={() => setSiswaId(x.id)}>
                  <span className="nm">{x.namaDisplay || x.nama}</span><span className="gr-mono">{punya(x.id).length}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="gr-main">
            {!aktif ? <div className="gr-card"><p className="gr-empty">Belum ada siswa di kelas ini.</p></div> : (
              <div className="gr-card gr-bdg-detail">
                <div className="gr-sh"><h2 style={{ textTransform: "none", letterSpacing: 0, fontSize: 16, color: "var(--ink)" }}>{aktif.nama}</h2><span className="gr-mono">{punya(aktif.id).length} badge</span></div>
                <span className="gr-sub">Badge manual · klik untuk memberi atau mencabut</span>
                <div className="gr-bdg-grid">
                  {MANUAL_BADGES.map(bd => { const ada = punya(aktif.id).includes(bd.id); return kartuBadge(bd, { size: 36, punya: ada, on: ada, ket: ada ? `Dimiliki · cabut −${bd.poin || 0} poin` : `Beri · +${bd.poin || 0} poin`, onClick: async () => { if (ada) setCabut(bd); else { try { await store.awardBadge(aktif.id, bd.id); kabar(`${bd.name} diberikan ke ${aktif.nama}.`); } catch (e) { kabar("Gagal: " + (e?.message || "coba lagi")); } } } }); })}
                </div>
                <span className="gr-sub">Badge otomatis · diberikan sistem</span>
                <div className="gr-bdg-grid">
                  {AUTO_BADGES.map(bd => { const ada = punya(aktif.id).includes(bd.id); return kartuBadge(bd, { size: 36, punya: ada, disabled: true, ket: ada ? "Sudah didapat" : bd.desc }); })}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {onTampilanLama && <button type="button" className="gr-old" onClick={onTampilanLama}>Buka tampilan lama</button>}
      {toast && <div className="gr-toast" role="status">{toast}</div>}
      {cabut && aktif && (
        <div className="modal-overlay" onClick={() => setCabut(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Cabut {cabut.name} dari {aktif.nama}?</h3>
            <p>Poin siswa berkurang {cabut.poin || 0}.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setCabut(null)}>Batal</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={async () => { try { await store.removeBadge(aktif.id, cabut.id); kabar(`${cabut.name} dicabut.`); } catch (e) { kabar("Gagal: " + (e?.message || "coba lagi")); } setCabut(null); }}>Cabut badge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROFIL GURU ─────────────────────────────────────────────────────────────
// Data diri tetap di localStorage (sama seperti versi lama, kunci astrolab.profil.<id>).
// Pengaturan semester menulis ke settings/semester lewat store. ResetSemesterModal masih di App → props.
const WARNA_FOTO = ["#0d6b7a", "#1e40af", "#7c3aed", "#b45309", "#0f766e", "#c2410c", "#be185d", "#065f46", "#1e3a5f", "#4a1d96"];
const FIELD_PROFIL = [
  { k: "mapel", l: "Mata pelajaran" },
  { k: "jabatan", l: "Jabatan" },
  { k: "sekolah", l: "Sekolah", lebar: true },
  { k: "tahunMulai", l: "Mulai mengajar", ket: v => { const n = new Date().getFullYear() - Number(v); return Number(v) > 1900 && n > 0 ? `${n} tahun` : null; } },
  { k: "nip", l: "NIP", mono: true },
];
// Selisih hari kalender (zona lokal) dari hari ini ke "YYYY-MM-DD"
export function hariMenuju(tgl, kini = new Date()) {
  if (!tgl || !/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return null;
  const [y, m, d] = tgl.split("-").map(Number);
  const a = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
  return Math.round((new Date(y, m - 1, d) - a) / HARI);
}
const tglLengkap = tgl => { const [y, m, d] = tgl.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };

function FotoProfilModal({ store, user, nama, adaFoto, onClose }) {
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");
  const id = user.uid || user.id;
  async function simpan(data) {
    setSibuk(true); setGalat("");
    try { await withTimeout(store.savePhoto(id, data)); onClose(); }
    catch (e) { setGalat("Gagal menyimpan foto: " + (e?.message || "coba lagi")); setSibuk(false); }
  }
  function pilihWarna(warna) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="100" fill="${warna}"/><text x="100" y="130" text-anchor="middle" font-family="system-ui,sans-serif" font-size="80" font-weight="700" fill="#fff">${inisial(nama)}</text></svg>`;
    simpan("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg))));
  }
  function unggah(e) {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setGalat("Ukuran foto maksimal 5 MB."); return; }
    const r = new FileReader();
    r.onload = ev => simpan(ev.target.result);
    r.readAsDataURL(f);
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-foto-j">
        <h3 id="gr-foto-j">Ganti foto profil</h3>
        <p className="gr-muted" style={{ marginBottom: 12 }}>Pilih avatar berwarna dengan inisial, atau unggah foto.</p>
        <div className="gr-pf-warna" role="group" aria-label="Avatar berwarna">
          {WARNA_FOTO.map(w => <button key={w} type="button" disabled={sibuk} style={{ background: w }} onClick={() => pilihWarna(w)} aria-label={`Avatar warna ${w}`}>{inisial(nama)}</button>)}
        </div>
        <label className="gr-pf-unggah">
          <span>{sibuk ? "Menyimpan…" : "Unggah foto dari perangkat"}</span><small>JPG atau PNG, maks 5 MB</small>
          <input type="file" accept="image/*" disabled={sibuk} onChange={unggah} />
        </label>
        {galat && <p className="gr-warn" style={{ marginTop: 10 }}>{galat}</p>}
        <div className="modal-actions">
          {adaFoto && <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--bad)", marginRight: "auto" }} disabled={sibuk} onClick={() => simpan(null)}>Hapus foto</button>}
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

export function ProfilGuruV2({ user, store, navigate, ResetModal, onTampilanLama }) {
  const photo = store.getPhoto(user.uid || user.id);
  const kunci = `astrolab.profil.${user.id}`;
  const bawaan = { nama: user.nama, mapel: user.mapel || "IPA & Informatika", sekolah: "SMP Negeri 15 Banda Aceh", nip: "199911022024211003", jabatan: "Guru Mapel", tahunMulai: "2024", motto: "" };
  const [profil, setProfil] = useState(() => { try { const s = localStorage.getItem(kunci); return s ? { ...bawaan, ...JSON.parse(s) } : bawaan; } catch { return bawaan; } });
  const [form, setForm] = useState(null); // null = tidak sedang mengedit
  const [foto, setFoto] = useState(false);
  const [reset, setReset] = useState(false);
  const [tanya, setTanya] = useState(null); // "tutup" | "buka"
  const [sibuk, setSibuk] = useState("");
  const [galat, setGalat] = useState("");

  const periode = store.getActivePeriode();
  const otomatis = getPeriodeAktif();
  const ditimpa = !!store.semesterSettings?.override;
  const tertutup = store.isSemesterClosed(periode);
  const sas = store.getTanggalSAS();
  const sisa = hariMenuju(sas);

  const ubah = (k, v) => setForm(f => ({ ...f, [k]: v }));
  function simpanProfil() {
    const data = { ...form, nama: form.nama.trim() || profil.nama };
    try { localStorage.setItem(kunci, JSON.stringify(data)); } catch { /* mode privat: tetap tampil sesi ini */ }
    setProfil(data); setForm(null);
  }
  async function jalankan(label, fn) {
    setSibuk(label); setGalat("");
    try { await withTimeout(fn()); }
    catch (e) { setGalat(e?.message?.includes("PERMISSION_DENIED") ? "Akses ditolak. Cek Rules Firebase untuk settings/semester." : "Gagal menyimpan: " + (e?.message || "coba lagi")); }
    setSibuk("");
  }

  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">Periode aktif · {periode}</span>
          <h1>Profil & semester</h1>
        </div>
        {onTampilanLama && <button type="button" className="gr-old" onClick={onTampilanLama}>Tampilan lama</button>}
      </div>

      <div className="gr-cols">
        <div className="gr-main">
          <section className="gr-card gr-pf-id">
            <button type="button" className="gr-pf-foto" onClick={() => setFoto(true)} aria-label="Ganti foto profil">
              {photo ? <img src={photo} alt="" /> : <span>{inisial(profil.nama)}</span>}
              <i aria-hidden="true">Ganti</i>
            </button>
            <div className="gr-pf-nama">
              <b>{profil.nama}</b>
              <span>{[profil.jabatan, profil.sekolah].filter(Boolean).join(" · ")}</span>
              {profil.motto && <q>{profil.motto}</q>}
            </div>
          </section>

          <section className="gr-card gr-pf-data">
            <div className="gr-sh">
              <h2>Data diri</h2>
              {!form && <button type="button" className="gr-link" onClick={() => setForm(profil)}>Ubah</button>}
            </div>
            {form ? (
              <form className="gr-pf-form" onSubmit={e => { e.preventDefault(); simpanProfil(); }}>
                <label className="lebar"><span>Nama</span><input className="inp" value={form.nama} onChange={e => ubah("nama", e.target.value)} required /></label>
                {FIELD_PROFIL.map(f => (
                  <label key={f.k} className={f.lebar ? "lebar" : ""}><span>{f.l}</span>
                    <input className="inp" value={form[f.k] || ""} inputMode={f.k === "nip" || f.k === "tahunMulai" ? "numeric" : undefined} style={f.mono ? { fontFamily: "var(--mono)" } : undefined} onChange={e => ubah(f.k, e.target.value)} />
                  </label>
                ))}
                <label className="lebar"><span>Motto</span><textarea className="inp" rows={2} value={form.motto || ""} placeholder="Kalimat favorit (opsional)" onChange={e => ubah("motto", e.target.value)} /></label>
                <div className="lebar gr-pf-aksi">
                  <button type="button" className="gr-btn outline sm" onClick={() => setForm(null)}>Batal</button>
                  <button type="submit" className="gr-btn sm">Simpan</button>
                </div>
              </form>
            ) : (
              <dl className="gr-pf-dl">
                {FIELD_PROFIL.map(f => {
                  const v = profil[f.k]; const ket = v && f.ket ? f.ket(v) : null;
                  return <div key={f.k} className={f.lebar ? "lebar" : ""}><dt>{f.l}</dt><dd className={f.mono ? "mono" : ""}>{v || <span className="kosong">Belum diisi</span>}{ket && <small> · {ket}</small>}</dd></div>;
                })}
              </dl>
            )}
            <p className="gr-muted gr-pf-cat">Data diri hanya tersimpan di browser perangkat ini. Di perangkat lain, isian kembali ke bawaan.</p>
          </section>
        </div>

        <div className="gr-side">
          <section className="gr-card gr-pf-sem" aria-busy={!!sibuk}>
            <div className="gr-sh"><h2>Semester</h2>{sibuk && <span className="gr-muted">{sibuk}…</span>}</div>

            <div className="gr-pf-blok">
              <label htmlFor="gr-periode" className="gr-sub">Periode aktif</label>
              <label className="gr-select"><select id="gr-periode" value={periode} disabled={!!sibuk} onChange={e => { const v = e.target.value; jalankan("Menyimpan periode", () => store.setSemesterOverride(v === otomatis ? null : v)); }}>
                {getPeriodeOptions().map(p => <option key={p} value={p}>{p}</option>)}
              </select></label>
              <p className="gr-muted">{ditimpa
                ? <>Diatur manual. Menurut kalender seharusnya <b>{otomatis}</b>. <button type="button" className="gr-link" disabled={!!sibuk} onClick={() => jalankan("Menyimpan periode", () => store.setSemesterOverride(null))}>Kembali ke otomatis</button></>
                : <>Mengikuti kalender sekolah, berganti otomatis tiap semester.</>}</p>
            </div>

            <div className="gr-pf-blok">
              <label htmlFor="gr-sas" className="gr-sub">Tanggal SAS</label>
              <input id="gr-sas" type="date" className="inp gr-pf-tgl" value={sas || ""} disabled={!!sibuk} onChange={e => { const v = e.target.value; jalankan("Menyimpan tanggal SAS", () => store.setTanggalSAS(periode, v)); }} />
              {sas ? (
                <div className={`gr-pf-sas ${sisa != null && sisa < 0 ? "lewat" : sisa != null && sisa <= 7 ? "dekat" : ""}`}>
                  <b>{sisa > 0 ? `${sisa} hari lagi` : sisa === 0 ? "Hari ini" : "Sudah lewat"}</b>
                  <span>{tglLengkap(sas)}</span>
                </div>
              ) : <p className="gr-warn inline">Belum diatur. Laporan akan dianggap laporan akhir semester.</p>}
              <p className="gr-muted">Sebelum tanggal ini, laporan dibuat sebagai laporan tengah semester dan rapor siswa menampilkan jadwal SAS.</p>
            </div>

            <div className="gr-pf-blok">
              <span className="gr-sub">Status periode</span>
              <div className="gr-pf-status">
                <span className={`gr-chip ${tertutup ? "muted" : "teal"}`}>{tertutup ? "Ditutup" : "Berjalan"}</span>
                {tertutup
                  ? <button type="button" className="gr-btn outline sm" disabled={!!sibuk} onClick={() => setTanya("buka")}>Buka kembali</button>
                  : <button type="button" className="gr-btn outline sm" disabled={!!sibuk} onClick={() => setTanya("tutup")}>Tutup periode</button>}
              </div>
              <p className="gr-muted">{tertutup ? "Siswa tidak bisa mengerjakan tugas dari periode ini." : "Tutup setelah nilai akhir dan rapor selesai. Siswa tidak bisa lagi mengerjakan tugas periode ini."}</p>
            </div>
            {galat && <p className="gr-warn" role="alert">{galat}</p>}
          </section>

          <section className="gr-card gr-pf-bahaya">
            <h2 className="gr-h2">Reset semester</h2>
            <p>Menghapus semua jawaban, poin, streak, badge, pengumuman, jatah susulan, dan chat. Akun siswa, tugas, arsip, dan nilai akhir tetap ada. Tidak bisa dibatalkan.</p>
            <button type="button" className="gr-btn sm gr-pf-merah" onClick={() => setReset(true)}>Reset semester…</button>
          </section>
        </div>
      </div>

      {foto && <FotoProfilModal store={store} user={user} nama={profil.nama} adaFoto={!!photo} onClose={() => setFoto(false)} />}
      {reset && ResetModal && <ResetModal store={store} onClose={() => setReset(false)} />}
      {tanya && (
        <div className="modal-overlay" onClick={() => setTanya(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-per-j">
            <h3 id="gr-per-j">{tanya === "tutup" ? `Tutup ${periode}?` : `Buka kembali ${periode}?`}</h3>
            <p>{tanya === "tutup"
              ? "Siswa tidak bisa lagi mengerjakan atau mengumpulkan tugas dari periode ini. Nilai yang sudah masuk tidak berubah. Periode bisa dibuka kembali dari halaman ini."
              : "Siswa bisa kembali mengerjakan tugas periode ini yang tenggatnya belum lewat."}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setTanya(null)}>Batal</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { const t = tanya; setTanya(null); jalankan(t === "tutup" ? "Menutup periode" : "Membuka periode", () => t === "tutup" ? store.closeSemester(periode) : store.bukaSemester(periode)); }}>
                {tanya === "tutup" ? "Tutup periode" : "Buka kembali"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MISI PJJ (Mission Mode) ─────────────────────────────────────────────────
// Config: missionMode/{jenjang} lewat store.saveMissionConfig (sama dengan versi lama).
// Kehadiran: missionAttendance/{jenjang}/{sessionId}/{siswaId}. sessionId = waktu sesi diaktifkan.
const IKM = { atas: "M6 15l6-6 6 6", bawah: "M6 9l6 6 6-6", hapus: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13", tugas: "M6 3h9l3 3v15H6zM9 11h6M9 15h6", materi: "M4 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" };
const jamTgl = ms => new Date(ms).toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const jam = ms => new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

function infoMisi(m, store) {
  if (m.tipe === "tugas") {
    const t = (store.getTugasSemua ? store.getTugasSemua() : store.getTugas()).find(x => x.id === m.refId);
    if (!t) return { judul: "(tugas sudah dihapus)", meta: "Tugas", hilang: true };
    return { judul: t.judul, meta: `Tugas · ${(t.soal || []).length} soal${t.arsip ? " · diarsipkan" : ""}`, hilang: !!t.arsip };
  }
  const x = store.getMateriList().find(y => y.id === m.refId);
  if (!x) return { judul: "(materi sudah dihapus)", meta: "Materi", hilang: true };
  return { judul: x.judul, meta: `Materi · ${x.tipe === "youtube" ? "Video" : x.tipe === "web" ? "Web" : "PDF"}${x.bab ? " · " + x.bab : ""}` };
}

export function hitungPantauMisi(store, jenjang) {
  const misi = store.getMission(jenjang) || {};
  const daftar = misi.misi || [];
  const wajib = daftar.filter(m => m.wajib);
  const siswa = store.getAllSiswa(jenjang);
  const att = misi.sessionId ? store.getAttendance(jenjang, misi.sessionId) : {};
  const baris = siswa.map(s => {
    const status = wajib.map(m => store.isMisiSelesai(m, s.id));
    const selesai = status.filter(Boolean).length;
    const hadir = att[s.id] || null;
    const lengkap = !!hadir && selesai === wajib.length;
    return { siswa: s, status, selesai, hadir, lengkap, grup: !hadir ? "absen" : lengkap ? "lengkap" : "proses" };
  });
  const urut = { absen: 0, proses: 1, lengkap: 2 };
  baris.sort((a, b) => urut[a.grup] - urut[b.grup] || a.selesai - b.selesai || String(a.siswa.nama).localeCompare(String(b.siswa.nama), "id"));
  const perMisi = daftar.map(m => ({ m, n: siswa.filter(s => store.isMisiSelesai(m, s.id)).length }));
  return {
    misi, wajib, n: siswa.length, baris, perMisi,
    hadir: baris.filter(b => b.hadir).length, lengkap: baris.filter(b => b.lengkap).length, absen: baris.filter(b => !b.hadir).length,
  };
}

function PilihMisiModal({ store, jenjang, sudah, onTambah, onClose }) {
  const [tipe, setTipe] = useState("tugas");
  const [cari, setCari] = useState("");
  const q = cari.trim().toLowerCase();
  const tugas = store.getTugas().filter(t => t.jenjang === jenjang && t.status !== "scheduled").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const materi = store.getMateriList().filter(m => m.jenjang === jenjang);
  const list = (tipe === "tugas" ? tugas : materi).filter(x => !q || `${x.judul} ${x.materi || x.bab || ""}`.toLowerCase().includes(q));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal gr-mi-pilih" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-mi-pj">
        <h3 id="gr-mi-pj">Tambah misi · Kelas {jenjang}</h3>
        <div className="gr-seg gr-mt-tipe" role="tablist">
          <button type="button" role="tab" aria-selected={tipe === "tugas"} className={tipe === "tugas" ? "on" : ""} onClick={() => setTipe("tugas")}>Tugas · {tugas.length}</button>
          <button type="button" role="tab" aria-selected={tipe === "materi"} className={tipe === "materi" ? "on" : ""} onClick={() => setTipe("materi")}>Materi · {materi.length}</button>
        </div>
        <input className="inp" value={cari} onChange={e => setCari(e.target.value)} placeholder={`Cari ${tipe}…`} aria-label={`Cari ${tipe}`} />
        <div className="gr-mi-opsi">
          {list.length === 0 ? <p className="gr-muted" style={{ padding: 16, textAlign: "center" }}>{q ? "Tidak ada yang cocok." : `Belum ada ${tipe} untuk Kelas ${jenjang}.`}</p>
            : list.map(x => {
              const ada = sudah.has(`${tipe}_${x.id}`);
              const meta = tipe === "tugas" ? [x.mapel, `${(x.soal || []).length} soal`, x.materi].filter(Boolean).join(" · ") : [x.tipe === "youtube" ? "Video" : x.tipe === "web" ? "Web" : "PDF", x.bab].filter(Boolean).join(" · ");
              return (
                <button key={x.id} type="button" disabled={ada} className={ada ? "ada" : ""} onClick={() => onTambah({ tipe, refId: x.id })}>
                  <span><b>{x.judul}</b><small>{meta}</small></span>
                  <i>{ada ? "Sudah" : "Tambah"}</i>
                </button>
              );
            })}
        </div>
        <div className="modal-actions"><button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Selesai</button></div>
      </div>
    </div>
  );
}

function RiwayatMisi({ store, jenjang, sesiAktif }) {
  const riwayat = store.getRiwayatMisi ? store.getRiwayatMisi(jenjang) : {};
  const n = store.getAllSiswa(jenjang).length;
  const sesi = Object.entries(riwayat).map(([id, rec]) => {
    const r = Object.values(rec || {});
    return { id, mulai: Number(id) || 0, hadir: r.length, lengkap: r.filter(x => x.lengkap).length, akhir: Math.max(0, ...r.map(x => x.waktu || 0)) };
  }).sort((a, b) => b.mulai - a.mulai);
  if (!sesi.length) return <div className="gr-card gr-mt-kosong"><b>Belum ada riwayat sesi</b><p className="gr-muted">Setiap kali Mission Mode diaktifkan, kehadiran siswa tercatat sebagai satu sesi.</p></div>;
  return (
    <div className="gr-card list">
      {sesi.map(s => (
        <div key={s.id} className="gr-mi-sesi">
          <div><b>{s.mulai ? jamTgl(s.mulai) : `Sesi ${s.id}`}</b>{s.id === sesiAktif && <span className="gr-chip teal">berjalan</span>}</div>
          <span><b>{s.hadir}</b>/{n} hadir</span>
          <span><b>{s.lengkap}</b> lengkap saat konfirmasi</span>
        </div>
      ))}
    </div>
  );
}

export function MisiGuruV2({ store, onTampilanLama }) {
  const [jenjang, setJenjang] = useState("VII");
  const [tab, setTab] = useState("atur");
  const [draf, setDraf] = useState(null); // null = belum diubah, ikut data tersimpan
  const [pilih, setPilih] = useState(false);
  const [tanya, setTanya] = useState(null); // "akhiri" | { pindah: j }
  const [filter, setFilter] = useState("semua");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const toast = m => { setPesan(m); setTimeout(() => setPesan(""), 2800); };

  const tersimpan = store.getMission(jenjang) || {};
  const aktif = !!tersimpan.active;
  const isi = draf || { judul: tersimpan.judul || "", instruksi: tersimpan.instruksi || "", misi: tersimpan.misi || [] };
  const ubah = fn => setDraf(fn(isi));
  const p = hitungPantauMisi(store, jenjang);
  const selesaiPer = Object.fromEntries(p.perMisi.map(x => [x.m.key, x.n]));

  function gantiKelas(j) { if (j === jenjang) return; if (draf) { setTanya({ pindah: j }); return; } setJenjang(j); setFilter("semua"); }
  async function simpan(ekstra = {}) {
    setSibuk(true);
    try {
      await withTimeout(store.saveMissionConfig(jenjang, { judul: isi.judul.trim(), instruksi: isi.instruksi.trim(), misi: isi.misi.map((m, i) => ({ ...m, urutan: i })), ...ekstra }));
      setDraf(null);
      toast(ekstra.active === true ? `Sesi PJJ Kelas ${jenjang} dimulai.` : ekstra.active === false ? "Sesi diakhiri." : "Pengaturan disimpan.");
    } catch (e) { toast("Gagal menyimpan: " + (e?.message || "coba lagi")); }
    setSibuk(false);
  }
  const tambah = ({ tipe, refId }) => ubah(d => d.misi.some(m => m.tipe === tipe && m.refId === refId) ? d : { ...d, misi: [...d.misi, { key: `${tipe}_${refId}`, tipe, refId, wajib: true, urutan: d.misi.length }] });
  const geser = (i, arah) => ubah(d => { const a = [...d.misi], j = i + arah; if (j < 0 || j >= a.length) return d; [a[i], a[j]] = [a[j], a[i]]; return { ...d, misi: a }; });
  function salinAbsen() {
    const nama = p.baris.filter(b => !b.hadir).map((b, i) => `${i + 1}. ${b.siswa.nama}`).join("\n");
    const teks = `Belum konfirmasi hadir PJJ Kelas ${jenjang}${tersimpan.judul ? ` (${tersimpan.judul})` : ""}:\n${nama}`;
    navigator.clipboard?.writeText(teks).then(() => toast(`${p.absen} nama disalin.`), () => toast("Tidak bisa menyalin di browser ini."));
  }
  const tampil = p.baris.filter(b => filter === "semua" || b.grup === filter);

  return (
    <div className="page gr">
      <div className="gr-head">
        <div>
          <span className="gr-mono">Mission Mode · pembelajaran jarak jauh</span>
          <h1>Misi PJJ</h1>
        </div>
        {onTampilanLama && <button type="button" className="gr-old" onClick={onTampilanLama}>Tampilan lama</button>}
      </div>

      <div className="gr-seg" role="tablist" aria-label="Pilih kelas" style={{ alignSelf: "flex-start" }}>
        {["VII", "VIII"].map(j => <button key={j} type="button" role="tab" aria-selected={jenjang === j} className={jenjang === j ? "on" : ""} onClick={() => gantiKelas(j)}>Kelas {j}{store.isMissionActive(j) && <span className="gr-mi-dot" aria-label="aktif" />}</button>)}
      </div>

      <section className={`gr-mi-status ${aktif ? "on" : ""}`}>
        <div className="gr-mi-st-txt">
          <span className="gr-mi-st-lbl">{aktif ? "Sesi berjalan" : "Tidak ada sesi"}</span>
          <b>{aktif ? (tersimpan.judul || `PJJ Kelas ${jenjang}`) : `Mission Mode Kelas ${jenjang} mati`}</b>
          <span>{aktif
            ? `Dimulai ${tersimpan.sessionId ? jamTgl(Number(tersimpan.sessionId)) : ""} · ${p.hadir}/${p.n} hadir · ${p.lengkap} lengkap`
            : "Saat aktif, siswa kelas ini langsung melihat daftar misi ketika membuka aplikasi."}</span>
        </div>
        {aktif
          ? <button type="button" className="gr-btn outline" disabled={sibuk} onClick={() => setTanya("akhiri")}>Akhiri sesi</button>
          : <button type="button" className="gr-btn" disabled={sibuk || !isi.misi.length} title={!isi.misi.length ? "Tambah minimal satu misi dulu" : undefined} onClick={() => simpan({ active: true })}>{draf ? "Simpan & mulai sesi" : "Mulai sesi"}</button>}
      </section>

      <div className="gr-seg" role="tablist" aria-label="Bagian" style={{ alignSelf: "flex-start" }}>
        {[["atur", `Atur misi${draf ? " •" : ""}`], ["pantau", `Pantau siswa${aktif ? ` · ${p.hadir}/${p.n}` : ""}`], ["riwayat", "Riwayat"]].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "atur" && (
        <div className="gr-mi-atur">
          <section className="gr-card gr-mi-form">
            <label><span>Judul kegiatan</span><input className="inp" value={isi.judul} onChange={e => ubah(d => ({ ...d, judul: e.target.value }))} placeholder="Contoh: PJJ Senin — Massa jenis" /></label>
            <label><span>Petunjuk untuk siswa</span><textarea className="inp" rows={3} value={isi.instruksi} onChange={e => ubah(d => ({ ...d, instruksi: e.target.value }))} placeholder="Contoh: Tonton videonya dulu, lalu kerjakan kuis. Konfirmasi hadir setelah semua misi wajib selesai." /></label>
          </section>
          <section className="gr-card list">
            <div className="gr-arsip-head"><b>Daftar misi · {isi.misi.length}</b><button type="button" className="gr-btn sm outline" onClick={() => setPilih(true)}>Tambah misi</button></div>
            {isi.misi.length === 0 ? <p className="gr-muted" style={{ padding: "18px 16px" }}>Belum ada misi. Tambahkan tugas yang sudah terbit atau materi yang sudah diunggah.</p>
              : isi.misi.map((m, i) => {
                const f = infoMisi(m, store), n = selesaiPer[m.key];
                return (
                  <div key={m.key} className={`gr-mi-row ${f.hilang ? "hilang" : ""}`}>
                    <span className="gr-mi-no">{i + 1}</span>
                    <span className={`gr-mt-tipe-ic ${m.tipe === "tugas" ? "" : "web"}`}><Ikon d={m.tipe === "tugas" ? IKM.tugas : IKM.materi} s={16} /></span>
                    <span className="gr-mt-txt"><b>{f.judul}</b><span>{f.meta}{n != null && p.n ? ` · ${n}/${p.n} siswa selesai` : ""}</span></span>
                    <button type="button" className={`gr-mi-wajib ${m.wajib ? "on" : ""}`} aria-pressed={m.wajib} onClick={() => ubah(d => ({ ...d, misi: d.misi.map(x => x.key === m.key ? { ...x, wajib: !x.wajib } : x) }))} title="Klik untuk mengganti">{m.wajib ? "Wajib" : "Opsional"}</button>
                    <span className="gr-mi-gerak">
                      <button type="button" className="gr-ib" disabled={i === 0} aria-label="Naikkan" onClick={() => geser(i, -1)}><Ikon d={IKM.atas} s={15} /></button>
                      <button type="button" className="gr-ib" disabled={i === isi.misi.length - 1} aria-label="Turunkan" onClick={() => geser(i, 1)}><Ikon d={IKM.bawah} s={15} /></button>
                      <button type="button" className="gr-ib" aria-label={`Hapus ${f.judul} dari misi`} onClick={() => ubah(d => ({ ...d, misi: d.misi.filter(x => x.key !== m.key) }))}><Ikon d={IKM.hapus} s={15} /></button>
                    </span>
                  </div>
                );
              })}
          </section>
          <div className={`gr-mi-simpan ${draf ? "kotor" : ""}`}>
            <span>{draf ? (aktif ? "Perubahan belum disimpan. Siswa masih melihat versi sebelumnya." : "Perubahan belum disimpan.") : "Semua perubahan tersimpan."}</span>
            {draf && <button type="button" className="gr-btn outline sm" disabled={sibuk} onClick={() => setDraf(null)}>Batalkan</button>}
            {draf && <button type="button" className="gr-btn sm" disabled={sibuk} onClick={() => simpan()}>{sibuk ? "Menyimpan…" : "Simpan"}</button>}
          </div>
        </div>
      )}

      {tab === "pantau" && (!tersimpan.sessionId || !aktif ? (
        <div className="gr-card gr-mt-kosong"><b>Sesi belum berjalan</b><p className="gr-muted">Mulai sesi untuk memantau kehadiran. Sesi sebelumnya bisa dilihat di tab Riwayat.</p></div>
      ) : (
        <>
          <div className="gr-tiles">
            <div><span>Sudah konfirmasi hadir</span><b>{p.hadir}<small>/{p.n}</small></b><small>{p.n ? Math.round(p.hadir / p.n * 100) : 0}% kelas</small></div>
            <div><span>Misi wajib lengkap</span><b>{p.lengkap}</b><small>{p.wajib.length} misi wajib</small></div>
            <div><span>Belum hadir</span><b>{p.absen}</b>{p.absen > 0 ? <button type="button" className="gr-link" onClick={salinAbsen}>Salin nama untuk WA</button> : <small>Semua sudah hadir</small>}</div>
          </div>
          {p.perMisi.length > 0 && (
            <section className="gr-card gr-mi-permisi">
              <h2 className="gr-h2">Penyelesaian per misi</h2>
              {p.perMisi.map(({ m, n }) => (
                <div key={m.key}><span>{infoMisi(m, store).judul}{!m.wajib && <em> · opsional</em>}</span><i><i style={{ width: `${p.n ? n / p.n * 100 : 0}%` }} /></i><b>{n}/{p.n}</b></div>
              ))}
            </section>
          )}
          <div className="gr-seg gr-mi-filter" role="tablist" aria-label="Saring siswa" style={{ alignSelf: "flex-start" }}>
            {[["semua", "Semua", p.n], ["absen", "Belum hadir", p.absen], ["proses", "Belum lengkap", p.hadir - p.lengkap], ["lengkap", "Lengkap", p.lengkap]].map(([k, l, n]) => <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l} · {n}</button>)}
          </div>
          <div className="gr-card list">
            {tampil.length === 0 ? <p className="gr-muted" style={{ padding: 16 }}>Tidak ada siswa di kelompok ini.</p> : tampil.map(b => (
              <div key={b.siswa.id} className="gr-mi-siswa">
                <span className="gr-mi-nama"><b>{b.siswa.nama}</b><small>{b.hadir ? `Hadir ${jam(b.hadir.waktu)}` : "Belum konfirmasi hadir"}</small></span>
                <span className="gr-mi-titik" aria-label={`${b.selesai} dari ${p.wajib.length} misi wajib selesai`}>{b.status.map((ok, i) => <i key={i} className={ok ? "ok" : ""} />)}<small>{b.selesai}/{p.wajib.length}</small></span>
                <span className={`gr-chip ${b.grup === "lengkap" ? "teal" : b.grup === "proses" ? "amber" : "muted"}`}>{b.grup === "lengkap" ? "Lengkap" : b.grup === "proses" ? "Belum lengkap" : "Belum hadir"}</span>
              </div>
            ))}
          </div>
        </>
      ))}

      {tab === "riwayat" && <RiwayatMisi store={store} jenjang={jenjang} sesiAktif={aktif ? tersimpan.sessionId : null} />}

      {pilih && <PilihMisiModal store={store} jenjang={jenjang} sudah={new Set(isi.misi.map(m => m.key))} onTambah={tambah} onClose={() => setPilih(false)} />}
      {tanya && (
        <div className="modal-overlay" onClick={() => setTanya(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-mi-t">
            <h3 id="gr-mi-t">{tanya === "akhiri" ? "Akhiri sesi PJJ?" : "Tinggalkan perubahan?"}</h3>
            <p>{tanya === "akhiri"
              ? `Siswa Kelas ${jenjang} tidak lagi melihat Mission Mode. Kehadiran sesi ini (${p.hadir} siswa) tetap tersimpan di Riwayat. Kalau diaktifkan lagi, sesi baru dimulai dan siswa perlu konfirmasi hadir ulang.`
              : `Perubahan misi Kelas ${jenjang} belum disimpan dan akan hilang kalau pindah ke Kelas ${tanya.pindah}.`}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setTanya(null)}>Batal</button>
              {tanya === "akhiri"
                ? <button type="button" className="btn btn-primary btn-sm" onClick={() => { setTanya(null); simpan({ active: false }); }}>Akhiri sesi</button>
                : <button type="button" className="btn btn-primary btn-sm" onClick={() => { const j = tanya.pindah; setTanya(null); setDraf(null); setJenjang(j); setFilter("semua"); }}>Buang & pindah</button>}
            </div>
          </div>
        </div>
      )}
      {pesan && <div className="gr-toast" role="status">{pesan}</div>}
    </div>
  );
}

// ─── TEMPEL NILAI (SAS dari CBT, dll.) ───────────────────────────────────────
// Guru copy 2+ kolom (nama … nilai) dari file apa pun lalu tempel. Tidak bergantung format ekspor CBT.
// Penyimpanan lewat store.bulkImportNilaiAkhir yang sudah ada (atomik, poin ikut aturan nilai manual).
const SINGKATAN = { m: "muhammad", muh: "muhammad", moh: "muhammad", muhd: "muhammad", mhd: "muhammad", mohd: "muhammad", moch: "muhammad", mochammad: "muhammad", mohammad: "muhammad", muhamad: "muhammad", muhammmad: "muhammad", nur: "nur", siti: "siti", st: "siti" };
export function normNama(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s.]/g, " ").replace(/\./g, " ").split(/\s+/).filter(Boolean)
    .map(t => SINGKATAN[t] || t).join(" ");
}
const bigram = s => { const a = new Map(), t = ` ${s} `; for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); a.set(g, (a.get(g) || 0) + 1); } return a; };
function dice(a, b) {
  if (!a || !b) return 0; if (a === b) return 1;
  const A = bigram(a), B = bigram(b); let sama = 0, n = 0;
  A.forEach((v, g) => { sama += Math.min(v, B.get(g) || 0); n += v; }); B.forEach(v => { n += v; });
  return (2 * sama) / n;
}
// Skor kemiripan 0–1. Token persis + bigram, plus pengecekan "semua token pendek ada di yang panjang"
// (CBT sering memotong nama: "Naila Fatin" vs "Naila Fatin Zahira").
export function skorNama(a, b) {
  const x = normNama(a), y = normNama(b);
  if (!x || !y) return 0; if (x === y) return 1;
  const tx = x.split(" "), ty = y.split(" ");
  const [pendek, panjang] = tx.length <= ty.length ? [tx, ty] : [ty, tx];
  const subset = pendek.every(t => panjang.some(u => u === t || (t.length === 1 && u[0] === t)));
  return Math.max(dice(x, y), subset && pendek.length >= 2 ? 0.9 : subset ? 0.7 : 0);
}
const angkaSel = c => { const v = String(c || "").trim().replace(",", "."); return /^\d{1,3}(\.\d+)?$/.test(v) ? Number(v) : null; };
const hurufSel = c => String(c || "").replace(/[^a-z]/gi, "").length;
const bukanNama = c => /^(vii|viii|ix|kelas|l|p)\b/i.test(String(c).trim()) || /^[\d\s./-]+$/.test(String(c).trim());
// Dua mode: (1) tabel dari Excel (ada tab) → kolom nilai & nama ditentukan per KOLOM, bukan per baris,
// supaya sel nilai yang kosong tidak diam-diam mengambil angka dari kolom lain (mis. "Benar");
// (2) teks bebas "Nama 85" / "Nama; 85" per baris.
export function parseTempelNilai(teks) {
  const lines = String(teks || "").split(/\r?\n/).map((l, i) => ({ l, i })).filter(x => x.l.trim());
  if (!lines.length) return [];
  if (lines.some(x => x.l.includes("\t"))) {
    const rows = lines.map(x => ({ no: x.i + 1, c: x.l.split("\t").map(v => v.trim()) }));
    const lebar = Math.max(...rows.map(r => r.c.length));
    const head = rows.findIndex(r => r.c.some(c => /^(nama|nilai|skor|score|total|nilai akhir)/i.test(c)) && !r.c.some(c => angkaSel(c) != null));
    const data = head >= 0 ? rows.slice(head + 1) : rows.filter(r => r.c.some(c => angkaSel(c) != null) || r.c.length > 1);
    let kN = -1, kA = -1;
    if (head >= 0) {
      const h = rows[head].c;
      h.forEach((c, k) => { if (/(nilai|skor|score|total)/i.test(c)) kN = k; });
      kA = h.findIndex(c => /nama/i.test(c));
    }
    if (kN < 0) { // kolom paling kanan yang angkanya muncul di ≥60% baris
      for (let k = lebar - 1; k >= 0; k--) { const n = data.filter(r => angkaSel(r.c[k]) != null).length; if (n >= Math.max(1, data.length * 0.6)) { kN = k; break; } }
    }
    if (kA < 0) { let best = -1; for (let k = 0; k < lebar; k++) { if (k === kN) continue; const h = data.reduce((a, r) => a + (bukanNama(r.c[k] || "1") ? 0 : hurufSel(r.c[k])), 0); if (h > best) { best = h; kA = k; } } }
    return data.map(r => {
      const nama = (r.c[kA] || "").trim(); if (!nama || !/[a-z]{2,}/i.test(nama)) return null;
      const mentah = r.c[kN] ?? "", nilai = angkaSel(mentah);
      if (nilai == null) return { baris: r.no, nama, nilai: null, galat: mentah ? "Nilai tidak terbaca" : "Nilai kosong" };
      return { baris: r.no, nama, nilai, galat: nilai > 100 ? "Nilai di luar 0–100" : null };
    }).filter(Boolean);
  }
  const hasil = [];
  lines.forEach(({ l, i }) => {
    const t = l.trim();
    const m = t.match(/^(?:\d+[.)]?\s+)?(.*?[a-zA-Z].*?)\s*(?:[;,]|\s)\s*(\d{1,3}(?:[.,]\d+)?)$/);
    if (!m) { if (hasil.length && /[a-z]{2,}/i.test(t)) hasil.push({ baris: i + 1, nama: t.replace(/^\d+[.)]?\s+/, ""), nilai: null, galat: "Nilai kosong" }); return; }
    const nilai = Number(m[2].replace(",", "."));
    hasil.push({ baris: i + 1, nama: m[1].replace(/[;,]$/, "").trim(), nilai, galat: nilai > 100 ? "Nilai di luar 0–100" : null });
  });
  return hasil;
}
export function cocokkanTempel(baris, siswaList) {
  return baris.map(b => {
    const kandidat = siswaList.map(s => ({ s, skor: skorNama(b.nama, s.nama) })).sort((p, q) => q.skor - p.skor);
    const [k1, k2] = kandidat;
    const yakin = k1 && k1.skor >= 0.86 && (!k2 || k1.skor - k2.skor >= 0.08);
    const mungkin = k1 && k1.skor >= 0.6;
    return { ...b, siswaId: yakin || mungkin ? k1.s.id : "", status: yakin ? (k1.skor === 1 ? "pas" : "mirip") : mungkin ? "cek" : "tidak" };
  });
}

export function TempelNilaiModal({ store, mapel, jenjang, periode, siswaList, kolomSumatif = [], kolomKuis = [], onClose, onSelesai }) {
  const [target, setTarget] = useState("uas");
  const [teks, setTeks] = useState("");
  const [baris, setBaris] = useState(null); // hasil pencocokan, bisa diedit
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");
  const pilihan = [["uas", "SAS"], ["uts", "STS"], ["asesmenLanjutan", "Asesmen Lanjutan"], ["portofolio", "Portofolio"],
    ...kolomSumatif.map(k => [`sumatif:${k}`, `Sumatif · ${k}`]), ...kolomKuis.map(k => [`kuis:${k}`, `Kuis · ${k}`])];
  const labelTarget = (pilihan.find(p => p[0] === target) || [])[1];
  const nilaiLama = id => {
    const r = store.getNilaiAkhirRecord(id, mapel, jenjang, periode);
    if (target.startsWith("sumatif:")) return (r.sumatif || {})[target.slice(8)];
    if (target.startsWith("kuis:")) return (r.kuis || {})[target.slice(5)];
    return r[target];
  };
  function periksa() {
    const p = parseTempelNilai(teks);
    if (!p.length) { setGalat("Tidak ada baris yang terbaca. Pastikan tiap baris berisi nama dan nilai."); return; }
    setGalat(""); setBaris(cocokkanTempel(p, siswaList));
  }
  const nama = Object.fromEntries(siswaList.map(s => [s.id, s.nama]));
  const hitungId = {}; (baris || []).forEach(b => { if (b.siswaId && !b.galat) hitungId[b.siswaId] = (hitungId[b.siswaId] || 0) + 1; });
  const siap = (baris || []).filter(b => b.siswaId && !b.galat && hitungId[b.siswaId] === 1);
  const ganda = (baris || []).filter(b => b.siswaId && hitungId[b.siswaId] > 1).length;
  const tanpa = (baris || []).filter(b => !b.siswaId && !b.galat).length;
  const belum = siswaList.filter(s => !hitungId[s.id]);
  const rendah = baris && baris.length >= 5 && baris.filter(b => b.status === "pas" || b.status === "mirip").length / baris.length < 0.5;
  const gantiSiswa = (i, id) => setBaris(bs => bs.map((b, k) => k === i ? { ...b, siswaId: id, status: id ? "manual" : "tidak" } : b));

  async function simpan() {
    setSibuk(true); setGalat("");
    const rows = siap.map(b => {
      const r = { siswaId: b.siswaId, uts: null, uas: null, portofolio: null, sumatif: {}, kuis: {} };
      if (target.startsWith("sumatif:")) r.sumatif = { [target.slice(8)]: b.nilai };
      else if (target.startsWith("kuis:")) r.kuis = { [target.slice(5)]: b.nilai };
      else r[target] = b.nilai;
      return r;
    });
    try { const n = await withTimeout(store.bulkImportNilaiAkhir(rows, mapel, jenjang, periode)); onSelesai(`${n} nilai ${labelTarget} tersimpan.`); }
    catch (e) { setGalat("Gagal menyimpan: " + (e?.message || "cek koneksi")); setSibuk(false); }
  }

  const STATUS = { pas: ["Cocok", "teal"], mirip: ["Mirip", "teal"], cek: ["Cek lagi", "amber"], manual: ["Dipilih", "soft"], tidak: ["Tidak cocok", "muted"] };
  return (
    <div className="modal-overlay" onClick={() => !sibuk && onClose()}>
      <div className="modal gr-tn" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="gr-tn-j">
        <h3 id="gr-tn-j">Tempel nilai</h3>
        <p className="gr-tn-konteks"><b>{mapel} · Kelas {jenjang}</b> · {periode}</p>
        <label className="gr-tn-target"><span>Masukkan ke</span>
          <select className="inp" value={target} disabled={sibuk} onChange={e => setTarget(e.target.value)}>{pilihan.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        {!baris ? (
          <>
            <textarea className="inp gr-tn-teks" rows={9} value={teks} onChange={e => setTeks(e.target.value)} autoFocus
              placeholder={"Copy kolom nama sampai kolom nilai dari Excel hasil CBT, lalu tempel di sini.\n\nContoh:\n1\tAldi Firmansyah\tVII-3\t82\n2\tDara Puspita\tVII-3\t90,5"} />
            <p className="gr-muted gr-tn-ket">Boleh ikut kolom nomor, NIS, kelas, atau jumlah benar. Ikutkan baris judul kolom supaya kolom Nilai dan Nama terdeteksi pasti; tanpa judul, kolom nilai diambil dari kolom angka paling kanan.</p>
            {galat && <p className="gr-warn" role="alert">{galat}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!teks.trim()} onClick={periksa}>Periksa</button>
            </div>
          </>
        ) : (
          <>
            <div className="gr-tn-ring">
              <span><b>{siap.length}</b> siap disimpan</span>
              {siap.some(b => b.status === "cek") && <span className="w"><b>{siap.filter(b => b.status === "cek").length}</b> perlu dicek namanya</span>}
              {tanpa > 0 && <span className="w"><b>{tanpa}</b> belum dipasangkan</span>}
              {ganda > 0 && <span className="w"><b>{ganda}</b> baris ganda</span>}
              {belum.length > 0 && <span><b>{belum.length}</b> siswa tanpa nilai</span>}
            </div>
            {rendah && <p className="gr-warn">Sebagian besar nama tidak cocok. Pastikan data yang ditempel memang Kelas {jenjang}.</p>}
            <div className="gr-tn-list">
              {baris.map((b, i) => {
                const lama = b.siswaId ? nilaiLama(b.siswaId) : null;
                const dobel = b.siswaId && hitungId[b.siswaId] > 1;
                const [lbl, tone] = b.galat ? [b.galat, "amber"] : dobel ? ["Ganda", "amber"] : STATUS[b.status];
                return (
                  <div key={i} className={`gr-tn-row ${b.galat || dobel || !b.siswaId ? "bermasalah" : ""}`}>
                    <span className="gr-tn-asal" title={`Baris ${b.baris}`}>{b.nama}</span>
                    <select className="inp" value={b.siswaId} onChange={e => gantiSiswa(i, e.target.value)} aria-label={`Pasangkan ${b.nama}`}>
                      <option value="">— pilih siswa —</option>
                      {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                    </select>
                    <span className="gr-tn-nilai">{typeof lama === "number" && lama !== b.nilai && <s>{lama}</s>}<b>{b.nilai ?? "–"}</b></span>
                    <span className={`gr-chip ${tone}`}>{lbl}</span>
                  </div>
                );
              })}
            </div>
            {belum.length > 0 && <details className="gr-tn-belum"><summary>{belum.length} siswa Kelas {jenjang} tidak ada di data yang ditempel</summary><p>{belum.map(s => s.nama).join(", ")}</p></details>}
            <p className="gr-muted gr-tn-ket">Nilai yang dicoret adalah nilai lama yang akan diganti. Baris ganda, belum dipasangkan, atau bermasalah tidak ikut disimpan. Poin siswa ikut aturan nilai manual.</p>
            {galat && <p className="gr-warn" role="alert">{galat}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" disabled={sibuk} onClick={() => setBaris(null)}>Ubah teks</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!siap.length || sibuk} onClick={simpan}>{sibuk ? "Menyimpan…" : `Simpan ${siap.length} nilai ${labelTarget}`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

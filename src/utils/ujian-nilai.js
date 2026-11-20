// Astrolab — Mode Ujian: fungsi murni (tanpa Firebase, bisa dites terpisah).
//
// Prinsip keamanan: kunci jawaban TIDAK PERNAH dikirim ke perangkat siswa.
//   ujian/{id}.soal        → soal + pilihan saja (dibaca siswa saat ujian berjalan)
//   ujianKunci/{id}        → { [soalId]: { jawaban, pembahasan } } (hanya guru)
//   ujianJawaban/{id}/{sid}→ jawaban mentah siswa (indeks pilihan ASLI, bukan posisi tampil)
// Penilaian dilakukan di perangkat guru (yang memegang kunci), lalu ditulis ke ujianHasil.

export const KKTP = 70;
export const TIPE_UJIAN = ["pg", "tf", "komplex"];
export const LABEL_TIPE = { pg: "Pilihan ganda", tf: "Benar/Salah", komplex: "PG kompleks" };

// Field yang membocorkan jawaban — dibuang dari salinan soal untuk siswa.
const FIELD_RAHASIA = ["jawaban", "pembahasan", "jawabanBenar", "perbaikanBenar", "barisBug", "kataKunci", "panduanNilai", "tags"];

export function pisahKunci(soalLengkap) {
  const soal = [], kunci = {};
  (soalLengkap || []).forEach((s, i) => {
    const id = String(s.id || `s${i}`).replace(/[.#$/[\]]/g, "_");
    const pub = { ...s, id };
    FIELD_RAHASIA.forEach(k => delete pub[k]);
    Object.keys(pub).forEach(k => pub[k] === undefined && delete pub[k]);
    soal.push(pub);
    kunci[id] = { jawaban: s.jawaban ?? null, pembahasan: s.pembahasan || "" };
  });
  return { soal, kunci };
}

// Gabungkan kembali (dipakai layar guru untuk pratinjau soal + kunci)
export function gabungKunci(soal, kunci) {
  return (soal || []).map(s => ({ ...s, jawaban: kunci?.[s.id]?.jawaban ?? null, pembahasan: kunci?.[s.id]?.pembahasan || "" }));
}

// Saring hasil import Excel: hanya tipe yang bisa dinilai otomatis & datanya utuh
export function saringSoalUjian(list) {
  const ok = [], dilewati = {};
  (list || []).forEach(s => {
    const lewati = () => { dilewati[s.type] = (dilewati[s.type] || 0) + 1; };
    if (!TIPE_UJIAN.includes(s.type) || !String(s.pertanyaan || "").trim()) return lewati();
    if ((s.type === "pg" || s.type === "komplex") && !(Array.isArray(s.opsi) && s.opsi.filter(o => String(o ?? "").trim() && String(o) !== "undefined").length >= 2)) return lewati();
    if (s.type === "komplex" && !(Array.isArray(s.jawaban) && s.jawaban.length)) return lewati();
    ok.push(s);
  });
  return { ok, dilewati };
}

export const terjawab = a => (Array.isArray(a) ? a.length > 0 : a !== undefined && a !== null && a !== "");

export function cekBenar(s, k, a) {
  if (!k || !terjawab(a)) return false;
  if (s.type === "pg" || s.type === "tf") return Number(a) === Number(k.jawaban);
  if (s.type === "komplex") {
    const x = (Array.isArray(a) ? a : Object.values(a || {})).map(Number).sort().join(",");
    const y = (Array.isArray(k.jawaban) ? k.jawaban : Object.values(k.jawaban || {})).map(Number).sort().join(",");
    return x === y;
  }
  return false;
}

// Bobot sama tiap soal (sama dengan konvensi tugas Astrolab: benar/total × 100)
export function nilaiUjian(soal, kunci, answers) {
  let benar = 0, dijawab = 0;
  const perSoal = {};
  (soal || []).forEach(s => {
    const a = answers ? answers[s.id] : undefined;
    if (terjawab(a)) dijawab++;
    const ok = cekBenar(s, kunci?.[s.id], a);
    if (ok) benar++;
    perSoal[s.id] = ok ? 1 : 0;
  });
  const total = (soal || []).length;
  return { benar, dijawab, total, nilai: total ? Math.round((benar / total) * 100) : 0, perSoal };
}

// ─── Urutan acak yang STABIL per siswa (refresh tidak mengacak ulang) ───
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function acak(arr, seedStr) {
  const r = rng(hash(seedStr)), a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// → [{ soal, urutOpsi: [indeks asli sesuai urutan tampil] | null }]
export function susunUntukSiswa(ujian, siswaId) {
  const soal = ujian?.soal || [];
  const idx = soal.map((_, i) => i);
  const urut = ujian?.acakSoal ? acak(idx, `${ujian.id}|${siswaId}`) : idx;
  return urut.map(i => {
    const s = soal[i];
    const n = Array.isArray(s.opsi) ? s.opsi.length : 0;
    const urutOpsi = n ? (ujian?.acakOpsi ? acak([...Array(n).keys()], `${ujian.id}|${siswaId}|${s.id}`) : [...Array(n).keys()]) : null;
    return { soal: s, urutOpsi };
  });
}

// ─── Status & laporan ───
export const HB_BASI = 60000; // detak terakhir > 60 dtk lalu = tidak merespons

export function statusSiswa(j, ujian, now) {
  if (!j || !j.mulaiAt) return "belum";
  if (j.submittedAt) return j.cara === "dikunci guru" ? "dikunci" : "selesai";
  if (ujian?.berakhirAt && now > ujian.berakhirAt + 60000) return "selesai"; // waktu habis, jawaban tersimpan dipakai
  return "mengerjakan";
}
export const LABEL_STATUS = { belum: "Belum mulai", mengerjakan: "Mengerjakan", selesai: "Selesai", dikunci: "Dikunci guru" };

const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export function hitungLaporanUjian({ ujian, kunci, jawabanAll = {}, logAll = {}, siswaList = [], now = Date.now() }) {
  const soal = ujian?.soal || [];
  const baris = siswaList.map(s => {
    const j = jawabanAll[s.id] || null;
    const st = statusSiswa(j, ujian, now);
    const h = j ? nilaiUjian(soal, kunci, j.answers || {}) : null;
    const log = Object.values(logAll[s.id] || {});
    const keluar = log.filter(x => x.jenis === "keluar").length;
    const layarPenuh = log.filter(x => x.jenis === "layar_penuh").length;
    const lamaKeluar = log.filter(x => x.jenis === "kembali").reduce((n, x) => n + (Number(x.durasi) || 0), 0);
    const selesaiAt = j?.submittedAt || (st === "selesai" ? ujian?.berakhirAt : null);
    return {
      siswa: s, status: st, j,
      ikut: !!j?.mulaiAt,
      nilai: j?.mulaiAt ? h.nilai : null, benar: h?.benar ?? 0, dijawab: h?.dijawab ?? 0, perSoal: h?.perSoal || {},
      mulaiAt: j?.mulaiAt || null, selesaiAt, durasi: j?.mulaiAt && selesaiAt ? selesaiAt - j.mulaiAt : null,
      cara: j?.cara || (st === "selesai" && !j?.submittedAt ? "waktu habis" : null),
      keluar, layarPenuh, lamaKeluar,
      hbBasi: st === "mengerjakan" && (!j?.hb || now - j.hb > HB_BASI),
    };
  });
  const ikut = baris.filter(b => b.ikut);
  const nilai = ikut.map(b => b.nilai);
  const ringkasan = {
    n: siswaList.length, ikut: ikut.length,
    mengerjakan: baris.filter(b => b.status === "mengerjakan").length,
    selesai: baris.filter(b => b.status === "selesai" || b.status === "dikunci").length,
    belum: baris.filter(b => b.status === "belum").length,
    rata: nilai.length ? Math.round(nilai.reduce((a, b) => a + b, 0) / nilai.length * 10) / 10 : null,
    max: nilai.length ? Math.max(...nilai) : null, min: nilai.length ? Math.min(...nilai) : null,
    median: median(nilai),
    tuntas: nilai.filter(v => v >= KKTP).length,
    keluarTotal: baris.reduce((n, b) => n + b.keluar, 0),
    siswaKeluar: baris.filter(b => b.keluar > 0).length,
    sebaran: [["0–49", 0, 49], ["50–69", 50, 69], ["70–84", 70, 84], ["85–100", 85, 100]].map(([l, a, b]) => ({ label: l, n: nilai.filter(v => v >= a && v <= b).length })),
  };
  const butir = soal.map((s, i) => {
    const nBenar = ikut.filter(b => b.perSoal[s.id]).length;
    const pilihan = {};
    if (s.type === "pg" || s.type === "tf") ikut.forEach(b => { const a = b.j?.answers?.[s.id]; if (terjawab(a)) pilihan[a] = (pilihan[a] || 0) + 1; });
    return { no: i + 1, soal: s, kunci: kunci?.[s.id]?.jawaban, nBenar, n: ikut.length, pct: ikut.length ? Math.round(nBenar / ikut.length * 100) : null, pilihan };
  });
  return { baris, ringkasan, butir };
}

export const HURUF = ["A", "B", "C", "D", "E", "F"];
export function labelJawaban(s, v) {
  if (v === null || v === undefined) return "—";
  if (s.type === "tf") return Number(v) === 0 ? "Benar" : "Salah";
  if (s.type === "komplex") return (Array.isArray(v) ? v : Object.values(v || {})).map(x => HURUF[x] || "?").sort().join(", ");
  return HURUF[v] || "?";
}
export const fmtDurasi = ms => { if (ms == null) return "—"; const m = Math.round(ms / 60000); return m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} j ${m % 60} mnt`; };
export const fmtJam = ms => (ms ? new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—");

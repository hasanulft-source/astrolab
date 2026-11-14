// ─── Rekap Semester: penghitung (pure, tanpa Firebase) ──────────────────────
// Dipanggil guru saat "Terbitkan" per kelas. Hasilnya snapshot yang dibekukan di
// rekap/{siswaId}/{kunciPeriode}, jadi siswa tidak menghitung apa pun di HP-nya.
// Aturan positif: kartu yang angkanya kurang bagus tidak dibuat (lihat flag `tampil`),
// atribut dinilai relatif terhadap teman sekelas tapi lantai 20, setiap siswa dapat gelar.

export const REKAP_VERSI = 1;
const MENIT = 60000;

export const kunciPeriode = p => String(p || "").replace(/[.#$[\]/]/g, "-").replace(/\s+/g, "_");

// Awal periode (ms) dari label "Ganjil 2026/2027" / "Genap 2026/2027".
// Ganjil mulai 1 Juli tahun pertama, Genap mulai 1 Januari tahun kedua.
export function mulaiPeriode(periode) {
  const m = String(periode || "").match(/(Ganjil|Genap)\D*(\d{4})\s*\/\s*(\d{4})/i);
  if (!m) return 0;
  return /ganjil/i.test(m[1]) ? new Date(+m[2], 6, 1).getTime() : new Date(+m[3], 0, 1).getTime();
}

const JENDELA = [[5, 8], [8, 11], [11, 14], [14, 17], [17, 20], [20, 23], [23, 5]];
const jendelaDari = h => JENDELA.findIndex(([a, b]) => a < b ? h >= a && h < b : h >= a || h < b);
export function julukanJam([a]) {
  if (a >= 5 && a < 11) return "Si Pagi";
  if (a >= 11 && a < 15) return "Pejuang Siang";
  if (a >= 15 && a < 18) return "Penjaga Senja";
  return "Pejuang Malam";
}

const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export const ATRIBUT = ["Konsisten", "Bertumbuh", "Teliti", "Rajin", "Cepat", "Penjelajah"]; // urutan = pemecah seri
export const GELAR = {
  Konsisten: ["Si Konsisten", r => `${r.streak} tugas beruntun dikumpulkan tepat waktu.`],
  Bertumbuh: ["Si Pendaki", r => r.delta ? `Nilai ${r.delta.mapel} naik ${r.delta.sas - r.delta.sts} angka dari STS ke SAS.` : "Nilaimu terus naik sepanjang semester."],
  Teliti: ["Si Teliti", r => r.perfect > 0 ? `${r.perfect} kali nilai sempurna semester ini.` : `Rata-rata nilaimu ${r.rata} di semua tugas.`],
  Rajin: ["Si Rajin", r => `${r.tugas} tugas kamu tuntaskan semester ini.`],
  Cepat: ["Si Kilat", r => r.kilat != null ? `Pengumpulan tercepatmu ${r.kilat} menit setelah tugas terbit.` : "Kamu selalu mengerjakan tugas lebih awal."],
  Penjelajah: ["Si Penjelajah", r => `${r.materi} materi kamu buka sampai selesai.`],
};

/**
 * @param {object} p
 * @param {string} p.periode               label periode aktif
 * @param {Array}  p.siswa                 [{id,nama,kelas,jenjang}]
 * @param {Array}  p.tugas                 semua tugas (termasuk arsip) [{id,judul,periode,createdAt,scheduledAt}]
 * @param {Array}  p.subs                  submissions [{siswaId,tugasId,nilai,ontime,submittedAt,total}]
 * @param {object} p.stats                 {siswaId:{poin,poinHistory:[{poin,ts}]}}
 * @param {object} p.badges                {siswaId:{badgeId:true}}
 * @param {(id)=>string} p.namaBadge
 * @param {(sid)=>Array<{mapel,sts,sas}>} p.nilaiAkhir   STS (uts) & SAS (uas) per mapel
 * @param {(sid)=>number} p.materiSelesai
 * @param {(poin)=>{nama,sub,tier}} p.level
 * @param {number} [p.sekarang]
 * @returns {{hasil:Object<string,object>, kosong:Array<{id,nama}>}}
 */
export function hitungRekapKelas(p) {
  const awal = mulaiPeriode(p.periode);
  const tugasMap = Object.fromEntries((p.tugas || []).map(t => [t.id, t]));
  const milikPeriode = t => t && (t.periode ? t.periode === p.periode : true);
  const baris = [];
  const kosong = [];

  for (const s of p.siswa) {
    const subs = (p.subs || [])
      .filter(x => x.siswaId === s.id && x.submittedAt && milikPeriode(tugasMap[x.tugasId]))
      .filter(x => tugasMap[x.tugasId]?.periode || new Date(x.submittedAt).getTime() >= awal)
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    if (!subs.length) { kosong.push({ id: s.id, nama: s.nama }); continue; }

    // jam
    const hit = JENDELA.map(() => 0);
    subs.forEach(x => { const i = jendelaDari(new Date(x.submittedAt).getHours()); if (i >= 0) hit[i]++; });
    const ji = hit.indexOf(Math.max(...hit));
    // streak terpanjang (ontime beruntun, urut waktu kumpul)
    let streak = 0, run = 0;
    subs.forEach(x => { run = x.ontime ? run + 1 : 0; streak = Math.max(streak, run); });
    // nilai
    const nilai = subs.filter(x => typeof x.nilai === "number");
    const perfect = nilai.filter(x => x.nilai === 100).length;
    const terbaik = nilai.reduce((a, b) => (b.nilai > (a?.nilai ?? -1) ? b : a), null);
    const rata = nilai.length ? Math.round(nilai.reduce((a, b) => a + b.nilai, 0) / nilai.length) : null;
    // kecepatan
    const durasi = subs.map(x => {
      const t = tugasMap[x.tugasId]; const terbit = t?.scheduledAt || t?.createdAt;
      if (!terbit) return null;
      const d = (new Date(x.submittedAt).getTime() - new Date(terbit).getTime()) / MENIT;
      return d >= 0 ? d : null;
    }).filter(v => v != null);
    const kilat = durasi.length ? Math.max(1, Math.round(Math.min(...durasi))) : null;
    // poin & level
    const st = p.stats?.[s.id] || {};
    const poin = st.poin || 0;
    const hist = (st.poinHistory || []).filter(h => h && typeof h.poin === "number" && h.ts && h.ts < awal);
    const poinAwal = hist.length ? hist[hist.length - 1].poin : 0;
    const poinSemester = Math.max(0, poin - poinAwal);
    // badge (badge tidak punya tanggal, jadi yang ditampilkan koleksi saat ini)
    const badge = Object.keys(p.badges?.[s.id] || {}).filter(k => p.badges[s.id][k]).map(k => p.namaBadge(k)).filter(Boolean);
    // STS → SAS: ambil mapel dengan kenaikan terbesar
    const na = (p.nilaiAkhir?.(s.id) || []).filter(r => typeof r.sts === "number" && typeof r.sas === "number");
    const naik = na.map(r => ({ ...r, d: r.sas - r.sts })).sort((a, b) => b.d - a.d)[0] || null;
    const delta = naik ? { mapel: naik.mapel, sts: naik.sts, sas: naik.sas } : null;
    const materi = p.materiSelesai?.(s.id) || 0;

    baris.push({
      id: s.id, nama: s.nama, kelas: s.kelas || s.jenjang, jenjang: s.jenjang,
      tugas: subs.length, soal: subs.reduce((a, x) => a + (Number(x.total) || 0), 0),
      jam: JENDELA[ji], jamN: hit[ji],
      streak, perfect, rata,
      terbaik: terbaik ? { judul: tugasMap[terbaik.tugasId]?.judul || "tugas", nilai: terbaik.nilai } : null,
      kilat, poin, poinSemester, lvAwal: p.level(poinAwal), lvAkhir: p.level(poin),
      badge, delta, materi,
      _raw: {
        Konsisten: streak, Rajin: subs.length, Teliti: rata,
        Cepat: durasi.length ? -median(durasi) : null,
        Bertumbuh: naik ? naik.d : null, Penjelajah: materi,
      },
    });
  }

  // atribut: persentil di antara teman sekelas, lantai 20
  const atr = {};
  for (const a of ATRIBUT) {
    const vals = baris.map(b => b._raw[a]).filter(v => v != null);
    for (const b of baris) {
      const v = b._raw[a];
      let skor = 20;
      if (v != null && vals.length > 1) {
        const lebihKecil = vals.filter(x => x < v).length, sama = vals.filter(x => x === v).length - 1;
        skor = Math.round(20 + 80 * (lebihKecil + sama / 2) / (vals.length - 1));
      } else if (v != null) skor = 80;
      (atr[b.id] = atr[b.id] || {})[a] = skor;
    }
  }
  // peringkat poin kelas (hanya disimpan kalau 3 besar)
  const urut = [...baris].sort((a, b) => b.poin - a.poin);
  const sekarang = p.sekarang || Date.now();
  const hasil = {};
  for (const b of baris) {
    const at = atr[b.id];
    const kuat = ATRIBUT.reduce((x, y) => (at[y] > at[x] ? y : x));
    const peringkat = urut.findIndex(x => x.id === b.id) + 1;
    const { _raw, ...bersih } = b;
    hasil[b.id] = {
      ...bersih,
      versi: REKAP_VERSI, periode: p.periode, dibuatAt: sekarang,
      atribut: at, kuat,
      gelar: { nama: GELAR[kuat][0], alasan: GELAR[kuat][1](b) },
      peringkat: peringkat <= 3 ? peringkat : null,
      tampil: {
        streak: b.streak >= 3,
        kilat: b.kilat != null && b.kilat < 60,
        badge: b.badge.length > 0,
        delta: !!(b.delta && b.delta.sas > b.delta.sts),
      },
    };
  }
  return { hasil, kosong };
}

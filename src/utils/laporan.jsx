// Astrolab — Laporan (Print Report Generation)
// Extracted from App.jsx (Wave 4)

import { useState } from "react";
import { getLevel } from '../components/gamification';
import { getPeriodeAktif, getPeriodeOptions } from './helpers';
import { I } from '../components/icons';

function tierIconSvg(tierId, color = "#1e3a5f", size = 12) {
  // Unique gradient ID per tier (size in case multiple sizes used)
  const gid = `gtier-${tierId}-${size}-${Math.floor(Math.random() * 9999)}`;
  const paths = {
    nebula: `
      <defs><radialGradient id="${gid}" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#f0abfc"/><stop offset="60%" stop-color="#a855f7"/><stop offset="100%" stop-color="#581c87"/>
      </radialGradient></defs>
      <circle cx="50" cy="50" r="42" fill="url(#${gid})"/>
      <circle cx="38" cy="38" r="14" fill="#fff" opacity="0.35"/>
      <circle cx="50" cy="50" r="8" fill="#fef3c7" opacity="0.9"/>
      <circle cx="22" cy="28" r="2.5" fill="#fff"/><circle cx="78" cy="38" r="2" fill="#fff"/><circle cx="72" cy="72" r="1.8" fill="#fff" opacity="0.8"/><circle cx="26" cy="68" r="2.2" fill="#fff"/>`,
    bintang: `
      <defs><radialGradient id="${gid}" cx="40%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#fef3c7"/><stop offset="50%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#d97706"/>
      </radialGradient></defs>
      <polygon points="50,8 60,38 92,38 66,58 76,90 50,71 24,90 34,58 8,38 40,38" fill="url(#${gid})" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/>
      <polygon points="50,22 55,38 70,38 58,49 62,65 50,55 38,65 42,49 30,38 45,38" fill="#fef3c7" opacity="0.55"/>
      <circle cx="42" cy="35" r="3" fill="#fff" opacity="0.9"/>`,
    planet: `
      <defs><radialGradient id="${gid}" cx="30%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#a7f3d0"/><stop offset="50%" stop-color="#14b8a6"/><stop offset="100%" stop-color="#064e3b"/>
      </radialGradient></defs>
      <ellipse cx="50" cy="58" rx="46" ry="9" transform="rotate(-15 50 58)" fill="#0e7490" opacity="0.5"/>
      <ellipse cx="50" cy="58" rx="44" ry="8" transform="rotate(-15 50 58)" fill="none" stroke="#fef3c7" stroke-width="3"/>
      <circle cx="50" cy="50" r="30" fill="url(#${gid})" stroke="#064e3b" stroke-width="2"/>
      <ellipse cx="38" cy="38" rx="12" ry="9" fill="#fff" opacity="0.5"/>
      <ellipse cx="50" cy="58" rx="44" ry="8" transform="rotate(-15 50 58)" fill="none" stroke="#fef3c7" stroke-width="3" stroke-dasharray="0,250,80,300"/>`,
    astronot: `
      <defs><radialGradient id="${gid}" cx="30%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#bfdbfe"/><stop offset="60%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1e3a8a"/>
      </radialGradient></defs>
      <ellipse cx="50" cy="92" rx="22" ry="5" fill="#1e3a8a" opacity="0.2"/>
      <path d="M44 22 Q28 38 28 60 L72 60 Q72 38 56 22 Q52 18 48 18 Q46 18 44 22 Z" fill="url(#${gid})" stroke="#1e3a8a" stroke-width="2"/>
      <ellipse cx="50" cy="40" rx="12" ry="10" fill="#fef3c7" stroke="#1e3a8a" stroke-width="2"/>
      <ellipse cx="46" cy="37" rx="4" ry="3" fill="#fff" opacity="0.85"/>
      <path d="M28 60 L18 72 L22 82 L34 76 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>
      <path d="M72 60 L82 72 L78 82 L66 76 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>`,
    commander: `
      <defs><radialGradient id="${gid}" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#fef08a"/><stop offset="40%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#7c2d12"/>
      </radialGradient></defs>
      <circle cx="50" cy="50" r="42" fill="url(#${gid})"/>
      <path d="M50 18 Q72 28 80 50 Q72 60 50 56 Q38 50 36 38 Q42 22 50 18 Z" fill="#fef08a" opacity="0.7"/>
      <path d="M50 82 Q28 72 20 50 Q28 40 50 44 Q62 50 64 62 Q58 78 50 82 Z" fill="#fef08a" opacity="0.7"/>
      <circle cx="50" cy="50" r="9" fill="#fff"/>
      <circle cx="50" cy="50" r="4.5" fill="#fef08a"/>`,
  };
  const body = paths[tierId] || `<circle cx="50" cy="50" r="40" fill="${color}" opacity="0.3"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="vertical-align:-2px;display:inline-block">${body}</svg>`;
}

// badgeIconSvg removed — badge section dihapus dari laporan

function generateBarSVG(nilai, max = 100, color = "#2563eb") {
  const w = Math.round((nilai / max) * 120);
  return `<svg width="120" height="10" style="vertical-align:middle"><rect width="120" height="10" rx="5" fill="#e2e8f0"/><rect width="${w}" height="10" rx="5" fill="${color}"/></svg>`;
}

function getNilaiColor(n) {
  if (n >= 85) return "#1d4ed8";
  if (n >= 70) return "#4f46e5";
  if (n >= 55) return "#d97706";
  return "#dc2626";
}

function getNilaiLabel(n) {
  if (n >= 85) return "Sangat Baik";
  if (n >= 70) return "Baik";
  if (n >= 55) return "Cukup";
  return "Perlu Perhatian";
}

// CSS bersama untuk semua laporan
const LAPORAN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Plus Jakarta Sans',system-ui,sans-serif; color:#1a2332; font-size:12px; background:#fff; }
  .page { padding:32px 36px; max-width:800px; margin:0 auto; page-break-inside:avoid; break-inside:avoid; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:16px; border-bottom:3px solid #1e3a5f; margin-bottom:24px; }
  .logo { font-size:18px; font-weight:800; color:#1e3a5f; letter-spacing:-.02em; }
  .logo small { display:block; font-size:11px; font-weight:400; color:#7a8fa3; margin-top:2px; }
  .meta { text-align:right; font-size:11px; color:#7a8fa3; line-height:1.7; }
  .section { margin-bottom:20px; page-break-inside:avoid; break-inside:avoid; }
  .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#2563eb; margin-bottom:10px; padding-bottom:4px; border-bottom:1px solid #e2e8f0; }
  table { width:100%; border-collapse:collapse; }
  tr { page-break-inside:avoid; break-inside:avoid; }
  th { background:#eff6ff; color:#1e3a5f; padding:9px 10px; text-align:left; font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; border-bottom:2px solid #2563eb; }
  td { padding:9px 10px; border-bottom:1px solid #f1f5f9; font-size:11px; vertical-align:middle; }
  tr:last-child td { border-bottom:none; }
  .badge-pill { display:inline-block; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:600; margin:1px; }
  .chip-blue { background:#dbeafe; color:#1e40af; }
  .chip-indigo { background:#e0e7ff; color:#3730a3; }
  .chip-yellow { background:#fef9c3; color:#713f12; }
  .chip-red { background:#fee2e2; color:#991b1b; }
  .chip-gray { background:#f1f5f9; color:#475569; }
  .footer { margin-top:24px; padding-top:12px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; }
  .sign-box { text-align:center; }
  .sign-line { width:140px; border-bottom:1px solid #1a2332; margin:40px auto 4px; }
  .page-break { page-break-after:always; break-after:page; height:0; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none; }
  }
`;

// Helper: render 1 tabel gabungan Nilai Akhir — kolom per mapel berdampingan (hemat kertas A4).
// mapelResults = [{ label: "IPA", result }, { label: "Informatika", result }] — adaptif,
// kalau cuma 1 mapel (misal kelas VIII gak ada Informatika), tabel otomatis cuma 1 kolom nilai.
// Label mapping: singkatan di App.jsx → nama lengkap di laporan
const LAPORAN_LABEL = { "STS": "Sumatif Tengah Semester", "SAS": "Sumatif Akhir Semester" };

function renderNilaiAkhirGabungan(mapelResults, jenisLaporan = "semester") {
  if (mapelResults.length === 0) return "";
  // Semua mapel pakai struktur komponen yang sama (Sumatif, Tugas Astrolab, STS, SAS, Kuis, Portofolio)
  // Track origLabel agar bisa filter SAS di mode tengahSemester
  let komponenLabels = mapelResults[0].result.komponen.map(k => ({
    label: LAPORAN_LABEL[k.label] || k.label,
    origLabel: k.label,
    bobot: k.bobot
  }));

  // Tengah Semester: buang SAS, normalisasi bobot sisanya
  if (jenisLaporan === "tengahSemester") {
    komponenLabels = komponenLabels.filter(k => k.origLabel !== "SAS");
    const totalBobot = komponenLabels.reduce((a, k) => a + k.bobot, 0);
    komponenLabels = komponenLabels.map(k => ({ ...k, bobot: k.bobot / totalBobot }));
  }

  const rows = komponenLabels.map((k) => {
    // Cari index komponen asli berdasar origLabel
    const origIdx = mapelResults[0].result.komponen.findIndex(c => c.label === k.origLabel);
    return `
    <tr>
      <td style="font-weight:600">${k.label}</td>
      <td style="text-align:center;color:#64748b">${Math.round(k.bobot * 100)}%</td>
      ${mapelResults.map(m => {
        const val = m.result.komponen[origIdx]?.val;
        const color = typeof val === "number" ? getNilaiColor(val) : "#94a3b8";
        return `<td style="text-align:center;font-weight:700;color:${color}">${typeof val === "number" ? Math.round(val * 100) / 100 : "Belum diisi"}</td>`;
      }).join("")}
    </tr>
  `}).join("");

  const finalRow = jenisLaporan === "tengahSemester"
    ? (() => {
        // Hitung nilai akhir dari komponen yang TERISI saja (tanpa SAS), re-normalize bobot
        return `<tr style="background:#eff6ff">
          <td style="font-weight:800" colspan="2">NILAI AKHIR</td>
          ${mapelResults.map(m => {
            const komps = m.result.komponen.filter(c => c.label !== "SAS");
            const filled = komps.filter(c => typeof c.val === "number");
            const allFilled = filled.length === komps.length;
            if (filled.length === 0) {
              return `<td style="text-align:center;font-weight:800;font-size:14px;color:#94a3b8">—</td>`;
            }
            const filledBobot = filled.reduce((a, c) => a + c.bobot, 0);
            const na = Math.round(filled.reduce((a, c) => a + (c.val * (c.bobot / filledBobot)), 0) * 100) / 100;
            return `<td style="text-align:center;font-weight:800;font-size:14px;color:#1e3a5f">
              ${na}
              ${!allFilled ? '<div style="font-size:9px;font-weight:400;color:#94a3b8">*proyeksi</div>' : ""}
            </td>`;
          }).join("")}
        </tr>`;
      })()
    : `<tr style="background:#eff6ff">
      <td style="font-weight:800" colspan="2">NILAI AKHIR</td>
      ${mapelResults.map(m => `
        <td style="text-align:center;font-weight:800;font-size:14px;color:#1e3a5f">
          ${m.result.nilaiAkhir !== null ? m.result.nilaiAkhir : "—"}
          ${!m.result.lengkap ? '<div style="font-size:9px;font-weight:400;color:#94a3b8">belum lengkap</div>' : ""}
        </td>
      `).join("")}
    </tr>`;

  const sectionTitle = jenisLaporan === "tengahSemester" ? "Nilai Akhir Komposit (Tengah Semester)" : "Nilai Akhir Komposit";

  return `
    <div class="section">
      <div class="section-title">${sectionTitle}</div>
      <table>
        <thead><tr>
          <th>Komponen</th>
          <th style="text-align:center">Bobot</th>
          ${mapelResults.map(m => `<th style="text-align:center">${m.label}</th>`).join("")}
        </tr></thead>
        <tbody>${rows}${finalRow}</tbody>
      </table>
    </div>
  `;
}

function generateLaporanSiswa(s, store, jenjang, periode, jenisLaporan = "semester") {
  const stats = store.getStats(s.id);
  const lv = getLevel(stats.poin || 0);
  const allTugas = store.getTugas().filter(t => t.jenjang === jenjang);
  const subs = store.getSubs().filter(sub => sub.siswaId === s.id);
  const now = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
  const nilaiRata = stats.nilaiRata || (subs.length ? Math.round(subs.reduce((a,b) => a+b.nilai,0)/subs.length) : 0);

  // Nilai Akhir komposit — dihitung terpisah per mapel (IPA dan Informatika TIDAK dicampur)
  // Nilai Akhir komposit — dihitung terpisah per mapel (IPA dan Informatika TIDAK dicampur).
  // PENTING: Informatika cuma diajarkan di kelas VII — kelas VIII gak ada mapel ini,
  // jadi section-nya jangan dipaksa muncul untuk semua jenjang.
  const naIPA = store.computeNilaiAkhir(s.id, "IPA", jenjang, periode);
  const naInformatika = jenjang === "VII" ? store.computeNilaiAkhir(s.id, "Informatika", jenjang, periode) : null;
  const mapelResults = [{ label: "IPA", result: naIPA }];
  if (naInformatika) mapelResults.push({ label: "Informatika", result: naInformatika });

  // Kelompokkan tugas per materi → hitung rata-rata, jumlah, range nilai
  const materiMap = {};
  allTugas.forEach(t => {
    const key = (t.materi && t.materi.trim()) || "Tanpa Materi";
    if (!materiMap[key]) materiMap[key] = [];
    const sub = subs.find(x => x.tugasId === t.id);
    materiMap[key].push({ tugas: t, nilai: sub ? sub.nilai : null });
  });

  const materiRows = Object.entries(materiMap).map(([materi, items]) => {
    const dikerjakan = items.filter(x => x.nilai !== null);
    const totalTugas = items.length;
    const sudah = dikerjakan.length;
    const nilaiList = dikerjakan.map(x => x.nilai);
    const rata = nilaiList.length ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) : null;
    const min = nilaiList.length ? Math.min(...nilaiList) : null;
    const max = nilaiList.length ? Math.max(...nilaiList) : null;
    const color = rata !== null ? getNilaiColor(rata) : "#94a3b8";
    const label = rata !== null ? getNilaiLabel(rata) : "Belum";
    const range = nilaiList.length > 1 ? `${min}–${max}` : nilaiList.length === 1 ? `${nilaiList[0]}` : "—";
    return `<tr>
      <td style="font-weight:600">${materi}</td>
      <td style="text-align:center;color:#64748b">${sudah}/${totalTugas}</td>
      <td style="text-align:center">
        ${rata !== null ? `<span style="font-weight:700;color:${color}">${rata}</span>` : `<span style="color:#94a3b8">—</span>`}
      </td>
      <td style="text-align:center;color:#64748b;font-family:monospace;font-size:11px">${range}</td>
      <td style="text-align:center">
        <span class="badge-pill ${rata >= 85 ? 'chip-blue' : rata >= 70 ? 'chip-indigo' : rata >= 55 ? 'chip-yellow' : rata !== null ? 'chip-red' : 'chip-gray'}">${label}</span>
      </td>
      <td>${generateBarSVG(rata || 0, 100, color)}</td>
    </tr>`;
  }).join("");

  return `
  <div class="page">
    <div class="header">
      <div>
        <div class="logo">Astrolab · Our Classroom<small>Laporan Hasil Belajar Siswa${jenisLaporan === "tengahSemester" ? " (Tengah Semester)" : ""}</small></div>
        <div style="margin-top:8px;font-size:13px;font-weight:700">${s.nama}</div>
        <div style="font-size:11px;color:#64748b">Kelas ${jenjang} · ID: ${s.id}</div>
      </div>
      <div class="meta">
        Periode: <b>${periode}</b><br>
        Dicetak: ${now}<br>
        M. Hasanul Fatta, S.Pd.
      </div>
    </div>

    <!-- Ringkasan -->
    <div class="section">
      <div class="section-title">Ringkasan Capaian</div>
      <table>
        <tr>
          <td style="width:25%;font-weight:600">Total Poin XP</td>
          <td style="font-weight:800;color:#2563eb;font-size:16px">${stats.poin || 0}</td>
          <td style="width:25%;font-weight:600">Level</td>
          <td><span class="badge-pill chip-indigo">${tierIconSvg(lv.tierId, lv.color, 16)} ${lv.name}</span></td>
        </tr>
        <tr>
          <td style="font-weight:600">Tugas Selesai</td>
          <td><b>${stats.tugasSelesai || 0}</b> dari ${allTugas.length} tugas</td>
          <td style="font-weight:600">Nilai Rata-rata</td>
          <td style="font-weight:800;color:${getNilaiColor(nilaiRata)};font-size:16px">
            ${nilaiRata || "—"}
            ${nilaiRata ? `<span style="font-size:11px;font-weight:400;margin-left:6px">${getNilaiLabel(nilaiRata)}</span>` : ""}
          </td>
        </tr>
        <tr>
          <td style="font-weight:600">Streak Belajar</td>
          <td colspan="3">${stats.streak || 0} hari berturut-turut</td>
        </tr>
      </table>
    </div>

    <!-- Detail Nilai per Materi -->
    <div class="section">
      <div class="section-title">Detail Nilai per Materi</div>
      ${allTugas.length === 0
        ? '<p style="color:#94a3b8">Belum ada tugas.</p>'
        : `<table>
          <thead><tr>
            <th>Materi</th>
            <th style="text-align:center">Tugas</th>
            <th style="text-align:center">Rata-rata</th>
            <th style="text-align:center">Rentang</th>
            <th style="text-align:center">Keterangan</th>
            <th>Grafik</th>
          </tr></thead>
          <tbody>${materiRows}</tbody>
        </table>`}
    </div>

    <!-- Nilai Akhir Komposit — 1 tabel gabungan, kolom per mapel berdampingan (hemat kertas A4) -->
    ${renderNilaiAkhirGabungan(mapelResults, jenisLaporan)}

    <!-- Catatan Guru -->
    <div class="section">
      <div class="section-title">Catatan Guru</div>
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;min-height:60px;color:#94a3b8;font-size:11px">
        ${nilaiRata >= 85
          ? `${s.namaDisplay} menunjukkan capaian yang sangat baik. Pertahankan konsistensi belajar dan terus tingkatkan kemampuan analitis.`
          : nilaiRata >= 70
            ? `${s.namaDisplay} menunjukkan capaian yang baik. Perlu sedikit peningkatan pada beberapa kompetensi.`
            : nilaiRata >= 55
              ? `${s.namaDisplay} cukup dalam mengikuti pembelajaran. Disarankan untuk lebih aktif berlatih soal dan berkonsultasi.`
              : `${s.namaDisplay} perlu pendampingan lebih intensif. Harap segera berkomunikasi dengan guru untuk remedial.`}
      </div>
    </div>

    <!-- TTD -->
    <div style="display:flex;justify-content:space-between;margin-top:28px;gap:20px">
      <div class="sign-box" style="flex:1">
        <div style="font-size:11px;color:#64748b">Mengetahui,</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Orang Tua / Wali Murid</div>
        <div class="sign-line"></div>
        <div style="font-size:11px;color:#94a3b8">(................................)</div>
      </div>
      <div class="sign-box" style="flex:1">
        <div style="font-size:11px;color:#64748b">Banda Aceh, ${now}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Guru IPA & Informatika</div>
        <div class="sign-line"></div>
        <div style="font-size:12px;font-weight:700">M. Hasanul Fatta, S.Pd.</div>
      </div>
    </div>

    <div class="footer">
      <span>Astrolab · Our Classroom — © 2026 M. Hasanul Fatta</span>
      <span>Dokumen ini digenerate otomatis oleh sistem</span>
    </div>
  </div>`;
}

function exportLaporan(store, jenjang, mode = "kelas", periode = getPeriodeAktif(), jenisLaporan = "semester") {
  try {
    const siswa = store.getAllSiswa(jenjang);
    const tugas = store.getTugas().filter(t => t.jenjang === jenjang);
    const subs = store.getSubs();
    const now = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });

    let bodyContent = "";

  if (mode === "siswa") {
    // Per siswa — 1 halaman per siswa
    bodyContent = siswa.map((s, i) =>
      `${generateLaporanSiswa(s, store, jenjang, periode, jenisLaporan)}${i < siswa.length - 1 ? '<div class="page-break"></div>' : ''}`
    ).join("");
  } else {
    // Per kelas — rekap semua siswa
    const rows = siswa.map((s, i) => {
      const stats = store.getStats(s.id);
      const lv = getLevel(stats.poin || 0);
      const nilaiRata = stats.nilaiRata || 0;
      const rank = i + 1;
      return `<tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${rank}</td>
        <td style="font-weight:600">${s.nama}</td>
        <td style="text-align:center;font-family:monospace">${s.id}</td>
        <td style="text-align:center;font-weight:700;color:#2563eb">${stats.poin || 0}</td>
        <td style="text-align:center">${stats.tugasSelesai || 0}/${tugas.length}</td>
        <td style="text-align:center;font-weight:700;color:${getNilaiColor(nilaiRata)}">${nilaiRata || "—"}</td>
        <td style="text-align:center"><span class="badge-pill chip-indigo" style="font-size:10px">${tierIconSvg(lv.tierId, lv.color, 14)} ${lv.name}</span></td>
        <td style="text-align:center">
          <span class="badge-pill ${nilaiRata >= 85 ? 'chip-blue' : nilaiRata >= 70 ? 'chip-indigo' : nilaiRata >= 55 ? 'chip-yellow' : nilaiRata > 0 ? 'chip-red' : 'chip-gray'}" style="font-size:10px">
            ${getNilaiLabel(nilaiRata)}
          </span>
        </td>
      </tr>`;
    }).join("");

    const avgNilai = siswa.length ? Math.round(siswa.reduce((a, s) => a + (store.getStats(s.id).nilaiRata || 0), 0) / siswa.length) : 0;
    const avgPoin = siswa.length ? Math.round(siswa.reduce((a, s) => a + (store.getStats(s.id).poin || 0), 0) / siswa.length) : 0;

    bodyContent = `
    <div class="page">
      <div class="header">
        <div>
          <div class="logo">Astrolab · Our Classroom<small>Laporan Rekap Hasil Belajar Kelas</small></div>
          <div style="margin-top:6px;font-size:13px;font-weight:700">Kelas ${jenjang}</div>
        </div>
        <div class="meta">
          Periode: <b>${periode}</b><br>
          Dicetak: ${now}<br>
          M. Hasanul Fatta, S.Pd.<br>
          Total siswa: ${siswa.length} · Total tugas: ${tugas.length}
        </div>
      </div>

      <!-- Ringkasan Kelas -->
      <div class="section">
        <div class="section-title">Ringkasan Kelas</div>
        <table>
          <tr>
            <td style="width:25%;font-weight:600">Rata-rata Nilai</td>
            <td style="font-weight:800;color:${getNilaiColor(avgNilai)};font-size:16px">${avgNilai} <span style="font-size:11px;font-weight:400">${getNilaiLabel(avgNilai)}</span></td>
            <td style="width:25%;font-weight:600">Rata-rata Poin XP</td>
            <td style="font-weight:800;color:#2563eb;font-size:16px">${avgPoin}</td>
          </tr>
          <tr>
            <td style="font-weight:600">Siswa Aktif</td>
            <td>${siswa.filter(s => (store.getStats(s.id).tugasSelesai || 0) > 0).length} dari ${siswa.length} siswa</td>
            <td style="font-weight:600">Tingkat Ketuntasan</td>
            <td style="font-weight:700;color:#1d4ed8">${siswa.length ? Math.round(siswa.filter(s => (store.getStats(s.id).nilaiRata || 0) >= 70).length / siswa.length * 100) : 0}%</td>
          </tr>
        </table>
      </div>

      <!-- Tabel Rekap -->
      <div class="section">
        <div class="section-title">Rekap Nilai Seluruh Siswa</div>
        <table>
          <thead><tr>
            <th style="text-align:center">#</th>
            <th>Nama Siswa</th>
            <th style="text-align:center">ID</th>
            <th style="text-align:center">Poin XP</th>
            <th style="text-align:center">Tugas</th>
            <th style="text-align:center">Nilai Rata</th>
            <th style="text-align:center">Level</th>
            <th style="text-align:center">Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <!-- TTD -->
      <div style="display:flex;justify-content:space-between;margin-top:24px;gap:20px">
        <div class="sign-box" style="flex:1">
          <div style="font-size:11px;color:#64748b">Mengetahui,</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">Kepala Sekolah</div>
          <div class="sign-line"></div>
          <div style="font-size:11px;color:#94a3b8">(................................)</div>
        </div>
        <div class="sign-box" style="flex:1">
          <div style="font-size:11px;color:#64748b">Banda Aceh, ${now}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">Guru IPA & Informatika</div>
          <div class="sign-line"></div>
          <div style="font-size:12px;font-weight:700">M. Hasanul Fatta, S.Pd.</div>
        </div>
      </div>

      <div class="footer">
        <span>Astrolab · Our Classroom — © 2026 M. Hasanul Fatta</span>
        <span>Dokumen ini digenerate otomatis oleh sistem</span>
      </div>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan ${mode === "siswa" ? "Per Siswa" : "Kelas"} ${jenjang}${jenisLaporan === "tengahSemester" ? " (Tengah Semester)" : ""} — Astrolab</title>
<style>${LAPORAN_CSS}</style>
</head>
<body>
  <div class="no-print" style="background:#1e3a5f;color:#fff;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100">
    <span style="font-weight:700">Astrolab · Laporan ${mode === "siswa" ? "Per Siswa" : "Kelas"} ${jenjang}${jenisLaporan === "tengahSemester" ? " (Tengah Semester)" : ""} — ${periode}</span>
    <button onclick="window.print()" style="background:#fff;color:#1e3a5f;border:none;padding:8px 18px;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">Cetak / Save PDF</button>
  </div>
  ${bodyContent}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup diblokir browser. Izinkan popup untuk situs ini (biasanya ada ikon di address bar), lalu coba cetak lagi.");
    return;
  }
  win.document.write(html);
  win.document.close();
  } catch (e) {
    console.error("Gagal generate laporan:", e);
    alert("Gagal membuat laporan: " + (e?.message || "terjadi kesalahan tak terduga") + "\n\nCoba lagi. Kalau masih gagal, screenshot pesan ini dan kabari developer.");
  }
}

export function LaporanModal({ store, onClose }) {
  const [jenjang, setJenjang] = useState("VII");
  const [mode, setMode] = useState("kelas");
  const [periode, setPeriode] = useState(getPeriodeAktif());
  const [jenisLaporan, setJenisLaporan] = useState("semester");

  const periodeOptions = getPeriodeOptions();

  function handleExport() {
    exportLaporan(store, jenjang, mode, periode, jenisLaporan);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3>Cetak Laporan</h3>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>Pilih format dan periode laporan.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="fg">
            <label className="lbl">Kelas</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["VII","VIII"].map(j => (
                <button key={j} className={`btn btn-sm ${jenjang === j ? "btn-primary" : "btn-outline"}`}
                  style={{ flex: 1, justifyContent: "center" }} onClick={() => setJenjang(j)}>
                  Kelas {j} ({store.getAllSiswa(j).length} siswa)
                </button>
              ))}
            </div>
          </div>

          <div className="fg">
            <label className="lbl">Jenis Laporan</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { value: "semester", label: "Semester", desc: "Lengkap — semua komponen termasuk SAS" },
                { value: "tengahSemester", label: "Tengah Semester", desc: "Hanya sampai STS — tanpa SAS" },
              ].map(opt => (
                <div key={opt.value} onClick={() => setJenisLaporan(opt.value)}
                  style={{ padding: "10px 14px", border: `1.5px solid ${jenisLaporan === opt.value ? "var(--accent)" : "var(--line)"}`, borderRadius: "var(--r-sm)", cursor: "pointer", background: jenisLaporan === opt.value ? "var(--accent-tint)" : "var(--surface)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: jenisLaporan === opt.value ? "var(--accent-2)" : "var(--ink)" }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="fg">
            <label className="lbl">Format Laporan</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { value: "kelas", label: "Rekap Per Kelas", desc: "1 dokumen berisi semua siswa — cocok untuk arsip sekolah" },
                { value: "siswa", label: "Detail Per Siswa", desc: "1 halaman per siswa — cocok untuk dibagikan ke orang tua" },
              ].map(opt => (
                <div key={opt.value} onClick={() => setMode(opt.value)}
                  style={{ padding: "10px 14px", border: `1.5px solid ${mode === opt.value ? "var(--accent)" : "var(--line)"}`, borderRadius: "var(--r-sm)", cursor: "pointer", background: mode === opt.value ? "var(--accent-tint)" : "var(--surface)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: mode === opt.value ? "var(--accent-2)" : "var(--ink)" }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="fg">
            <label className="lbl">Periode</label>
            <select className="inp" value={periode} onChange={e => setPeriode(e.target.value)}>
              {periodeOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleExport}>
            <I n="chartBar" s={13} /> Buka Laporan
          </button>
        </div>
      </div>
    </div>
  );
}

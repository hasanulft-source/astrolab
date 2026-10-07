// Astrolab — Laporan (Print Report Generation)
// Extracted from App.jsx (Wave 4)

import { useState } from "react";
import { getLevel, ALL_BADGES } from '../components/gamification';
import { getPeriodeAktif, getPeriodeOptions } from './helpers';
import { I } from '../components/icons';

function tierIconSvg(tierId, color = "#0d6b7a", size = 12) {
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

// Badge inline SVG untuk laporan HTML print (simplified dimensional)
function badgeIconSvg(iconType, rim = "teal", size = 16) {
  const gid = `gbdg-${iconType}-${Math.floor(Math.random() * 99999)}`;
  const rims = {
    amber:  { a: "#f0b429", b: "#b45309", inA: "#fff8e6", inB: "#fde9b8", g: "#b45309" },
    teal:   { a: "#0c7a91", b: "#063f4d", inA: "#eafafb", inB: "#c9eef0", g: "#0c7a91" },
    red:    { a: "#ef5350", b: "#b91c1c", inA: "#fff0ef", inB: "#fbd5d3", g: "#c0392b" },
    violet: { a: "#a78bfa", b: "#6d28d9", inA: "#f4f0ff", inB: "#e0d4fb", g: "#6d28d9" },
    blue:   { a: "#60a5fa", b: "#1d4ed8", inA: "#eef5ff", inB: "#d3e4fb", g: "#1d4ed8" },
    green:  { a: "#4ade80", b: "#15803d", inA: "#effdf4", inB: "#c8f2d6", g: "#15803d" },
    rose:   { a: "#fb7185", b: "#be123c", inA: "#fff1f3", inB: "#fbd0d8", g: "#be123c" },
  };
  const c = rims[rim] || rims.teal;
  const C = c.g;
  // glyph dalam koordinat lokal center (0,0), -18..18
  const glyphs = {
    bullseye: `<g stroke="${C}" stroke-width="2.2" fill="none"><circle r="14"/><circle r="8.5"/><circle r="3" fill="${C}" stroke="none"/></g>`,
    rosette: `<g><circle r="9" stroke="${C}" stroke-width="2.2" fill="none"/><circle r="5" fill="#fff"/><circle r="2.5" fill="${C}"/></g>`,
    crown: `<g fill="${C}"><path d="M-14 7 L-14 -7 L-7 0 L0 -10 L7 0 L14 -7 L14 7 Z"/><rect x="-14" y="7" width="28" height="4" rx="1"/></g>`,
    flame1: `<g><path d="M0 -16 Q-10 -4 -10 6 Q-10 14 0 16 Q10 14 10 4 Q10 -6 0 -16 Z" fill="${C}"/><path d="M0 -3 Q-5 3 -4 9 Q-1 13 2 10 Q5 5 0 -3 Z" fill="#fff" opacity="0.55"/></g>`,
    flame2: `<g><path d="M-2 -16 Q-12 -4 -12 6 Q-12 14 -2 16 Q6 14 6 5 Q6 -5 -2 -16 Z" fill="${C}"/><path d="M7 -8 Q1 0 1 8 Q1 14 8 15 Q14 13 14 6 Q14 -2 7 -8 Z" fill="${C}" opacity="0.7"/></g>`,
    sun: `<g stroke="${C}" stroke-width="2.2"><circle r="8" fill="${C}"/><line x1="0" y1="-12" x2="0" y2="-16"/><line x1="0" y1="12" x2="0" y2="16"/><line x1="-12" y1="0" x2="-16" y2="0"/><line x1="12" y1="0" x2="16" y2="0"/><line x1="-9" y1="-9" x2="-12" y2="-12"/><line x1="9" y1="9" x2="12" y2="12"/><line x1="-9" y1="9" x2="-12" y2="12"/><line x1="9" y1="-9" x2="12" y2="-12"/></g>`,
    footprint: `<g fill="${C}"><ellipse cx="0" cy="2" rx="7" ry="11"/><circle cx="-6" cy="-12" r="2.5"/><circle cx="-1" cy="-14" r="2.5"/><circle cx="4" cy="-13" r="2.3"/><circle cx="8" cy="-9" r="2"/></g>`,
    book: `<g><path d="M-14 -10 Q0 -14 14 -10 L14 12 Q0 8 -14 12 Z" fill="${C}"/><path d="M0 -11 L0 10" stroke="#fff" stroke-width="1.6"/></g>`,
    gradcap: `<g><polygon points="0,-12 16,-5 0,2 -16,-5" fill="${C}"/><path d="M-9 -2 L-9 7 Q0 13 9 7 L9 -2" stroke="${C}" stroke-width="2.2" fill="none"/><line x1="16" y1="-5" x2="16" y2="7" stroke="${C}" stroke-width="2.2"/></g>`,
    shield: `<g><path d="M0 -15 L13 -10 L13 4 Q13 13 0 16 Q-13 13 -13 4 L-13 -10 Z" fill="${C}"/><path d="M-6 0 L-2 5 L7 -6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    stopwatch: `<g stroke="${C}" stroke-width="2.2" fill="none"><circle cx="0" cy="2" r="12"/><line x1="0" y1="-10" x2="0" y2="-14"/><line x1="-4" y1="-14" x2="4" y2="-14"/><line x1="0" y1="2" x2="0" y2="-4"/><line x1="0" y1="2" x2="5" y2="4"/></g>`,
    bolt: `<polygon points="4,-16 -10,4 -1,4 -4,16 11,-4 2,-4" fill="${C}" stroke="${C}" stroke-width="1" stroke-linejoin="round"/>`,
    trophy: `<g><path d="M-9 -12 L9 -12 L8 1 Q8 7 0 8 Q-8 7 -8 1 Z" fill="${C}"/><path d="M-9 -10 Q-15 -10 -15 -4 Q-15 2 -9 2" stroke="${C}" stroke-width="2.2" fill="none"/><path d="M9 -10 Q15 -10 15 -4 Q15 2 9 2" stroke="${C}" stroke-width="2.2" fill="none"/><rect x="-2" y="8" width="4" height="5" fill="${C}"/><rect x="-7" y="13" width="14" height="3" rx="1" fill="${C}"/></g>`,
    podium: `<g fill="${C}"><rect x="-15" y="0" width="9" height="12" rx="1" opacity="0.7"/><rect x="-4.5" y="-8" width="9" height="20" rx="1"/><rect x="6" y="4" width="9" height="8" rx="1" opacity="0.5"/></g>`,
    star1: `<polygon points="0,-15 4,-4 16,-4 6,3 10,14 0,7 -10,14 -6,3 -16,-4 -4,-4" fill="${C}"/>`,
    star2: `<g><polygon points="0,-15 3,-5 14,-5 5,2 8,13 0,6 -8,13 -5,2 -14,-5 -3,-5" fill="${C}"/><polygon points="0,-7 1.5,-2 6,-2 2.5,1 4,6 0,3 -4,6 -2.5,1 -6,-2 -1.5,-2" fill="#fff" opacity="0.6"/></g>`,
    constellation: `<g><g fill="${C}"><circle cx="-11" cy="-8" r="2.5"/><circle cx="2" cy="-12" r="2"/><circle cx="10" cy="-2" r="2.8"/><circle cx="-3" cy="6" r="2"/><circle cx="6" cy="12" r="2.3"/></g><path d="M-11 -8 L2 -12 L10 -2 L-3 6 L6 12" stroke="${C}" stroke-width="1.3" fill="none" opacity="0.7"/></g>`,
    starcrown: `<g><polygon points="0,-15 3.5,-5 14,-5 5.5,2 9,13 0,6 -9,13 -5.5,2 -14,-5 -3.5,-5" fill="${C}"/><path d="M-9 -9 L-4 -6 L0 -11 L4 -6 L9 -9 L8 -3 L-8 -3 Z" fill="#fff" opacity="0.5"/></g>`,
    gem1: `<g><polygon points="0,14 -10,-2 -5,-10 5,-10 10,-2" fill="${C}"/><polygon points="0,14 -10,-2 10,-2" fill="#fff" opacity="0.25"/></g>`,
    gem2: `<g><polygon points="0,15 -12,-1 -6,-11 6,-11 12,-1" fill="${C}"/><polygon points="-6,-11 6,-11 6,-1 -6,-1" fill="#fff" opacity="0.3"/></g>`,
    diamond: `<g><polygon points="0,16 -13,-2 -7,-12 7,-12 13,-2" fill="${C}"/><polygon points="-7,-12 7,-12 13,-2 -13,-2" fill="#fff" opacity="0.35"/></g>`,
    ribbon: `<g><circle cx="0" cy="-4" r="11" fill="${C}"/><circle cx="0" cy="-4" r="6" fill="#fff" opacity="0.5"/><path d="M-7 5 L-10 17 L0 12 L10 17 L7 5" fill="${C}"/></g>`,
    bulb: `<g><path d="M-9 4 Q-13 -1 -13 -6 Q-13 -15 0 -15 Q13 -15 13 -6 Q13 -1 9 4 L9 9 L-9 9 Z" fill="${C}"/><rect x="-7" y="9" width="14" height="3" rx="1" fill="${C}"/></g>`,
    handshake: `<g stroke="${C}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M-14 -2 L-6 -2 L0 2 L8 -4 L14 0"/><path d="M-6 -2 L-2 6 M2 0 L6 7"/></g>`,
    arrowup: `<polygon points="0,-15 11,-2 4,-2 4,14 -4,14 -4,-2 -11,-2" fill="${C}"/>`,
    flag: `<g><line x1="-11" y1="-15" x2="-11" y2="16" stroke="${C}" stroke-width="2.2"/><path d="M-11 -14 L13 -14 L8 -7 L13 0 L-11 0 Z" fill="${C}"/></g>`,
    heart: `<path d="M0 14 Q-14 4 -14 -5 Q-14 -13 -7 -13 Q-2 -13 0 -7 Q2 -13 7 -13 Q14 -13 14 -5 Q14 4 0 14 Z" fill="${C}"/>`,
  };
  const glyph = glyphs[iconType] || `<circle r="10" fill="${C}"/>`;
  return `<svg width="${size}" height="${Math.round(size * 80 / 72)}" viewBox="0 0 72 80" style="vertical-align:-3px;display:inline-block">
    <defs>
      <linearGradient id="${gid}-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c.a}"/><stop offset="100%" stop-color="${c.b}"/></linearGradient>
      <radialGradient id="${gid}-i" cx="50%" cy="36%" r="65%"><stop offset="0%" stop-color="${c.inA}"/><stop offset="100%" stop-color="${c.inB}"/></radialGradient>
    </defs>
    <path d="M36 3 L67 13 L67 42 Q67 67 36 78 Q5 67 5 42 L5 13 Z" fill="url(#${gid}-r)"/>
    <path d="M36 12 L59 20 L59 42 Q59 60 36 70 Q13 60 13 42 L13 20 Z" fill="url(#${gid}-i)"/>
    <g transform="translate(36,40)">${glyph}</g>
  </svg>`;
}

function generateBarSVG(nilai, max = 100, color = "#0d9488") {
  const w = Math.round((nilai / max) * 120);
  return `<svg width="120" height="10" style="vertical-align:middle"><rect width="120" height="10" rx="5" fill="#e2e8f0"/><rect width="${w}" height="10" rx="5" fill="${color}"/></svg>`;
}

function getNilaiColor(n) {
  if (n >= 85) return "#059669";
  if (n >= 70) return "#0d9488";
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
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:16px; border-bottom:3px solid #0d6b7a; margin-bottom:24px; }
  .logo { font-size:18px; font-weight:800; color:#0d6b7a; letter-spacing:-.02em; }
  .logo small { display:block; font-size:11px; font-weight:400; color:#7a8fa3; margin-top:2px; }
  .meta { text-align:right; font-size:11px; color:#7a8fa3; line-height:1.7; }
  .section { margin-bottom:20px; page-break-inside:avoid; break-inside:avoid; }
  .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#0d9488; margin-bottom:10px; padding-bottom:4px; border-bottom:1px solid #e2e8f0; }
  table { width:100%; border-collapse:collapse; }
  tr { page-break-inside:avoid; break-inside:avoid; }
  th { background:#f0fdfa; color:#0d6b7a; padding:9px 10px; text-align:left; font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; border-bottom:2px solid #0d9488; }
  td { padding:9px 10px; border-bottom:1px solid #f1f5f9; font-size:11px; vertical-align:middle; }
  tr:last-child td { border-bottom:none; }
  .badge-pill { display:inline-block; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:600; margin:1px; }
  .chip-green { background:#d1fae5; color:#065f46; }
  .chip-teal { background:#ccfbf1; color:#0f766e; }
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
function renderNilaiAkhirGabungan(mapelResults) {
  if (mapelResults.length === 0) return "";
  // Semua mapel pakai struktur komponen yang sama (Sumatif, Tugas Astrolab, UTS, UAS, Kuis, Portofolio)
  const komponenLabels = mapelResults[0].result.komponen.map(k => ({ label: k.label, bobot: k.bobot }));

  const rows = komponenLabels.map((k, i) => `
    <tr>
      <td style="font-weight:600">${k.label}</td>
      <td style="text-align:center;color:#64748b">${Math.round(k.bobot * 100)}%</td>
      ${mapelResults.map(m => {
        const val = m.result.komponen[i].val;
        const color = typeof val === "number" ? getNilaiColor(val) : "#94a3b8";
        return `<td style="text-align:center;font-weight:700;color:${color}">${typeof val === "number" ? Math.round(val * 100) / 100 : "Belum diisi"}</td>`;
      }).join("")}
    </tr>
  `).join("");

  const finalRow = `
    <tr style="background:#f0fdfa">
      <td style="font-weight:800" colspan="2">NILAI AKHIR</td>
      ${mapelResults.map(m => `
        <td style="text-align:center;font-weight:800;font-size:14px;color:#0d6b7a">
          ${m.result.nilaiAkhir !== null ? m.result.nilaiAkhir : "—"}
          ${!m.result.lengkap ? '<div style="font-size:9px;font-weight:400;color:#94a3b8">belum lengkap</div>' : ""}
        </td>
      `).join("")}
    </tr>
  `;

  return `
    <div class="section">
      <div class="section-title">Nilai Akhir Komposit</div>
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

function generateLaporanSiswa(s, store, jenjang, periode) {
  const stats = store.getStats(s.id);
  const lv = getLevel(stats.poin || 0);
  const badges = store.getBadges(s.id);
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
        <span class="badge-pill ${rata >= 85 ? 'chip-green' : rata >= 70 ? 'chip-teal' : rata >= 55 ? 'chip-yellow' : rata !== null ? 'chip-red' : 'chip-gray'}">${label}</span>
      </td>
      <td>${generateBarSVG(rata || 0, 100, color)}</td>
    </tr>`;
  }).join("");

  const badgeHtml = badges.length
    ? badges.map(bid => {
        const b = ALL_BADGES?.find(x => x.id === bid) || { name: bid, icon: "medal", color: "#0d6b7a" };
        return `<span class="badge-pill chip-teal">${badgeIconSvg(b.icon, b.rim || "teal", 18)} ${b.name}</span>`;
      }).join("")
    : '<span style="color:#94a3b8;font-size:11px">Belum ada badge</span>';

  return `
  <div class="page">
    <div class="header">
      <div>
        <div class="logo">Astrolab · Our Classroom<small>Laporan Hasil Belajar Siswa</small></div>
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
          <td style="font-weight:800;color:#0d9488;font-size:16px">${stats.poin || 0}</td>
          <td style="width:25%;font-weight:600">Level</td>
          <td><span class="badge-pill chip-teal">${tierIconSvg(lv.tierId, lv.color, 16)} ${lv.name}</span></td>
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
          <td>${stats.streak || 0} hari berturut-turut</td>
          <td style="font-weight:600">Badge Diraih</td>
          <td>${badges.length} badge</td>
        </tr>
      </table>
    </div>

    <!-- Badge -->
    <div class="section">
      <div class="section-title">Badge & Penghargaan</div>
      <div style="padding:8px 0">${badgeHtml}</div>
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
    ${renderNilaiAkhirGabungan(mapelResults)}

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

function exportLaporan(store, jenjang, mode = "kelas", periode = getPeriodeAktif()) {
  try {
    const siswa = store.getAllSiswa(jenjang);
    const tugas = store.getTugas().filter(t => t.jenjang === jenjang);
    const subs = store.getSubs();
    const now = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });

    let bodyContent = "";

  if (mode === "siswa") {
    // Per siswa — 1 halaman per siswa
    bodyContent = siswa.map((s, i) =>
      `${generateLaporanSiswa(s, store, jenjang, periode)}${i < siswa.length - 1 ? '<div class="page-break"></div>' : ''}`
    ).join("");
  } else {
    // Per kelas — rekap semua siswa
    const rows = siswa.map((s, i) => {
      const stats = store.getStats(s.id);
      const lv = getLevel(stats.poin || 0);
      const badges = store.getBadges(s.id);
      const nilaiRata = stats.nilaiRata || 0;
      const rank = i + 1;
      return `<tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${rank}</td>
        <td style="font-weight:600">${s.nama}</td>
        <td style="text-align:center;font-family:monospace">${s.id}</td>
        <td style="text-align:center;font-weight:700;color:#0d9488">${stats.poin || 0}</td>
        <td style="text-align:center">${stats.tugasSelesai || 0}/${tugas.length}</td>
        <td style="text-align:center;font-weight:700;color:${getNilaiColor(nilaiRata)}">${nilaiRata || "—"}</td>
        <td style="text-align:center"><span class="badge-pill chip-teal" style="font-size:10px">${tierIconSvg(lv.tierId, lv.color, 14)} ${lv.name}</span></td>
        <td style="text-align:center">${badges.length}</td>
        <td style="text-align:center">
          <span class="badge-pill ${nilaiRata >= 85 ? 'chip-green' : nilaiRata >= 70 ? 'chip-teal' : nilaiRata >= 55 ? 'chip-yellow' : nilaiRata > 0 ? 'chip-red' : 'chip-gray'}" style="font-size:10px">
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
            <td style="font-weight:800;color:#0d9488;font-size:16px">${avgPoin}</td>
          </tr>
          <tr>
            <td style="font-weight:600">Siswa Aktif</td>
            <td>${siswa.filter(s => (store.getStats(s.id).tugasSelesai || 0) > 0).length} dari ${siswa.length} siswa</td>
            <td style="font-weight:600">Tingkat Ketuntasan</td>
            <td style="font-weight:700;color:#059669">${siswa.length ? Math.round(siswa.filter(s => (store.getStats(s.id).nilaiRata || 0) >= 70).length / siswa.length * 100) : 0}%</td>
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
            <th style="text-align:center">Badge</th>
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
<title>Laporan ${mode === "siswa" ? "Per Siswa" : "Kelas"} ${jenjang} — Astrolab</title>
<style>${LAPORAN_CSS}</style>
</head>
<body>
  <div class="no-print" style="background:#0d6b7a;color:#fff;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100">
    <span style="font-weight:700">Astrolab · Laporan ${mode === "siswa" ? "Per Siswa" : "Kelas"} ${jenjang} — ${periode}</span>
    <button onclick="window.print()" style="background:#fff;color:#0d6b7a;border:none;padding:8px 18px;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">Cetak / Save PDF</button>
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

  const periodeOptions = getPeriodeOptions();

  function handleExport() {
    exportLaporan(store, jenjang, mode, periode);
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

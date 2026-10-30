// Astrolab — Laporan (Print Report Generation)
// Extracted from App.jsx (Wave 4)

import { useState } from "react";
import { getLevel } from '../components/gamification';
import { getPeriodeAktif, getPeriodeOptions, fmtDl } from './helpers';
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

// badgeIconSvg removed — badge section dihapus dari laporan

function getNilaiColor(n) {
  if (n >= 85) return "#0d6b7a";
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
    .no-print { display:none !important; } /* toolbar punya inline display:flex, jadi wajib !important */
  }
`;

// ─── Identitas dokumen (dipakai laporan per siswa & rekap kelas) ───
const SEKOLAH = { nama: "SMP Negeri 15 Banda Aceh", alamat: "Jl. Utama No. 28, Banda Aceh 23235" };
const GURU = { nama: "M. Hasanul Fatta, S.Psi.", nip: "19991102 202421 1 003", jabatan: "Guru IPA & Informatika" };
const KKTP = 70;
const MIN_TERISI = 3; // nilai sementara baru dicetak setelah minimal 3 komponen terisi

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
const LOGO_SVG = `<svg width="40" height="40" viewBox="0 0 32 32" aria-hidden="true"><g transform="translate(16 17)"><polygon points="0,-11 5.5,-3.5 0,1 -5.5,-3.5" fill="#09637E"/><polygon points="-5.5,-3.5 -2,3.5 -8,9 -11.5,2" fill="#088395"/><polygon points="5.5,-3.5 11.5,2 8,9 2,3.5" fill="#088395"/><rect x="-3.5" y="1" width="7" height="2.2" rx=".5" fill="#7AB2B2"/></g></svg>`;

// CSS khusus laporan per siswa — satu lembar A4 per siswa. Prefix ls- supaya tidak bentrok dengan LAPORAN_CSS.
const LAPORAN_SISWA_CSS = `
  @page { size: A4; margin: 0; }
  body.ls-body { background:#E4EAEC; }
  .ls-sheet { width:210mm; min-height:297mm; margin:16px auto; background:#fff; box-shadow:0 10px 30px rgba(14,42,51,.14);
    padding:8mm 10.5mm 6mm; display:flex; flex-direction:column; gap:10px; font-size:11px; line-height:1.45; color:#0E2A33;
    break-after:page; page-break-after:always; }
  .ls-sheet:last-child { break-after:auto; page-break-after:auto; }
  .ls-sheet > * { flex-shrink:0; }
  @media print { body.ls-body { background:#fff; } .ls-sheet { margin:0; box-shadow:none; min-height:296mm; } }
  .ls-hd { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; padding-bottom:12px; border-bottom:2px solid #09637E; }
  .ls-brand { display:flex; gap:10px; align-items:center; }
  .ls-brand h1 { margin:0; font-size:19px; font-weight:800; letter-spacing:-.03em; line-height:1.1; }
  .ls-brand p { margin:2px 0 0; font-size:11px; color:#43606A; }
  .ls-school { text-align:right; font-size:10px; color:#43606A; line-height:1.5; }
  .ls-school b { color:#0E2A33; font-size:11px; }
  .ls-id { display:grid; grid-template-columns:1.6fr 1fr 1.4fr 1fr; border:1px solid #D6E2E6; border-radius:8px; overflow:hidden; }
  .ls-id div { padding:7px 10px; border-left:1px solid #D6E2E6; }
  .ls-id div:first-child { border-left:0; }
  .ls-id span { display:block; font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#7D959D; }
  .ls-id b { font-size:12px; font-weight:700; }
  .ls-sec { display:flex; flex-direction:column; gap:7px; break-inside:avoid; page-break-inside:avoid; }
  .ls-st { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
  .ls-st h2 { margin:0; font-size:10.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#09637E; }
  .ls-st span { font-size:9.5px; color:#7D959D; }
  .ls-legend { display:inline-flex; align-items:center; gap:5px; }
  .ls-legend i { display:inline-block; width:1.5px; height:10px; background:#0E2A33; opacity:.4; }
  .ls-sheet table { width:100%; border-collapse:collapse; }
  .ls-sheet th { font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#7D959D; text-align:left; padding:5px 8px;
    border-bottom:1px solid #D6E2E6; background:#EBF4F6; }
  .ls-sheet td { padding:5px 8px; border-bottom:1px solid #EDF2F4; vertical-align:middle; font-size:11px; font-variant-numeric:tabular-nums; }
  .ls-c { text-align:center; } .ls-w { color:#7D959D; font-family:'DM Mono',ui-monospace,monospace; font-size:10px; }
  .ls-cell { display:grid; grid-template-columns:28px 1fr; gap:8px; align-items:center; }
  .ls-cell b { font-size:12.5px; text-align:right; }
  .ls-cell b.below { color:#B45309; }
  .ls-none { color:#7D959D; font-size:10px; font-style:italic; }
  .ls-bar { position:relative; height:5px; border-radius:9px; background:#EDF2F4; }
  .ls-bar i { position:absolute; left:0; top:0; bottom:0; border-radius:9px; background:#088395; }
  .ls-bar i.below { background:#D9A26B; }
  .ls-bar::after { content:""; position:absolute; left:70%; top:-3px; bottom:-3px; width:1.5px; background:#0E2A33; opacity:.4; }
  .ls-bonus { font-size:9px; color:#09637E; font-weight:700; margin-left:4px; }
  tr.ls-total td { background:#EBF4F6; border-bottom:0; padding-block:8px; }
  .ls-total .lbl { font-weight:800; font-size:11.5px; }
  .ls-total .lbl small { display:block; font-weight:500; font-size:9.5px; color:#43606A; }
  .ls-big { font-size:17px; font-weight:800; letter-spacing:-.02em; }
  .ls-big small { display:block; font-size:9px; font-weight:600; color:#43606A; letter-spacing:0; }
  .ls-perk { display:grid; grid-template-columns:repeat(auto-fit, minmax(0,1fr)); gap:10px; }
  .ls-pk { border:1px solid #D6E2E6; border-radius:8px; padding:9px 11px; display:flex; flex-direction:column; gap:4px; }
  .ls-pk .top { display:flex; justify-content:space-between; align-items:baseline; }
  .ls-pk .top b { font-size:11.5px; }
  .ls-pk .nums { display:flex; align-items:baseline; gap:8px; font-variant-numeric:tabular-nums; }
  .ls-pk .a { font-size:17px; font-weight:800; color:#8A9BA2; }
  .ls-pk .b { font-size:17px; font-weight:800; }
  .ls-pk .d { margin-left:auto; font-weight:800; font-size:11px; padding:2px 8px; border-radius:99px; background:#EBF4F6; color:#09637E; }
  .ls-pk .d.down { background:#FDF1E3; color:#B45309; }
  .ls-pk svg { display:block; width:100%; height:auto; }
  .ls-pk.empty { justify-content:center; color:#7D959D; font-size:10px; }
  .ls-mat td:first-child { font-weight:600; }
  .ls-mat .ls-cell { grid-template-columns:24px 1fr; }
  .ls-ok { font-size:9.5px; font-weight:700; color:#09637E; }
  .ls-no { font-size:9.5px; font-weight:700; color:#B45309; }
  .ls-na { font-size:9.5px; font-weight:600; color:#7D959D; }
  .ls-act { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid #D6E2E6; border-radius:8px; }
  .ls-act div { padding:7px 10px; border-left:1px solid #D6E2E6; }
  .ls-act div:first-child { border-left:0; }
  .ls-act span { display:block; font-size:9px; color:#7D959D; font-weight:600; }
  .ls-act b { font-size:12.5px; }
  .ls-note { border:1px solid #D6E2E6; border-radius:8px; padding:9px 11px; font-size:10.5px; min-height:54px; line-height:1.55; }
  .ls-note .lines { margin-top:8px; border-top:1px dashed #D6E2E6; height:18px; }
  .ls-sign { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-top:auto; text-align:center; font-size:10.5px; color:#43606A; break-inside:avoid; page-break-inside:avoid; }
  .ls-sign .sp { height:42px; }
  .ls-sign b { color:#0E2A33; font-size:11px; display:block; }
  .ls-ft { display:flex; justify-content:space-between; font-size:9px; color:#7D959D; border-top:1px solid #D6E2E6; padding-top:6px; }
`;

function lsCell(v, bonus = 0) {
  if (typeof v !== "number") return '<span class="ls-none">Belum dinilai</span>';
  const below = v < KKTP ? "below" : "";
  return `<div class="ls-cell"><b class="${below}">${Math.round(v)}</b><div class="ls-bar"><i class="${below}" style="width:${Math.max(0, Math.min(100, v))}%"></i></div></div>${bonus > 0 ? `<span class="ls-bonus">termasuk bonus +${bonus}</span>` : ""}`;
}

function lsTrack(pre, post) {
  const W = 300, X = v => 6 + v / 100 * (W - 12), col = post >= pre ? "#088395" : "#B45309";
  return `<svg viewBox="0 0 ${W} 30" aria-hidden="true"><rect x="${X(0)}" y="11" width="${X(100) - X(0)}" height="5" rx="2.5" fill="#EDF2F4"/>
    <line x1="${X(KKTP)}" y1="5" x2="${X(KKTP)}" y2="22" stroke="#0E2A33" stroke-opacity=".45" stroke-dasharray="2 2"/>
    <line x1="${X(pre)}" y1="13.5" x2="${X(post)}" y2="13.5" stroke="${col}" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="${X(pre)}" cy="13.5" r="4.5" fill="#fff" stroke="#8A9BA2" stroke-width="1.8"/><circle cx="${X(post)}" cy="13.5" r="5" fill="${col}"/>
    <text x="${X(0)}" y="29" font-family="DM Mono, monospace" font-size="8" fill="#7D959D">0</text><text x="${X(100)}" y="29" text-anchor="end" font-family="DM Mono, monospace" font-size="8" fill="#7D959D">100</text></svg>`;
}

// Nilai per mapel untuk laporan. Tengah semester: SAS dibuang, bobot sisanya dinormalisasi ulang.
function lsNilaiMapel(result, jenisLaporan) {
  const komps = result.komponen.filter(k => jenisLaporan !== "tengahSemester" || k.key !== "uas");
  const terisi = komps.filter(k => typeof k.val === "number");
  const tb = terisi.reduce((a, k) => a + k.bobot, 0);
  const nilai = tb ? terisi.reduce((a, k) => a + k.val * k.bobot, 0) / tb : null;
  return { komps, terisi: terisi.length, total: komps.length, nilai };
}

function generateLaporanSiswa(s, store, jenjang, periode, jenisLaporan = "semester") {
  const tengah = jenisLaporan === "tengahSemester";
  const stats = store.getStats(s.id);
  const lv = getLevel(stats.poin || 0);
  const now = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const mapels = jenjang === "VII" ? ["IPA", "Informatika"] : ["IPA"];
  const namaPanggil = s.namaDisplay || (s.nama || "").split(" ")[0] || "Siswa";

  // Nilai per mapel (IPA dan Informatika tidak pernah dicampur)
  const hasil = mapels.map(m => {
    const result = store.computeNilaiAkhir(s.id, m, jenjang, periode);
    const rec = store.getNilaiAkhirRecord(s.id, m, jenjang, periode) || {};
    return { mapel: m, result, ...lsNilaiMapel(result, jenisLaporan), sts: typeof rec.uts === "number" ? rec.uts : null,
      lanjutan: typeof rec.asesmenLanjutan === "number" ? rec.asesmenLanjutan : null };
  });
  const komponenList = hasil[0].komps;
  const komponenRows = komponenList.map((k, i) => `<tr><td>${esc(k.label)}</td><td class="ls-c ls-w">${Math.round(k.bobot * 100)}%</td>
    ${hasil.map(h => { const kk = h.komps[i]; return `<td>${lsCell(kk.val, kk.boost)}</td>`; }).join("")}</tr>`).join("");
  const totalCell = h => {
    if (h.terisi < MIN_TERISI) return `<span class="ls-none">Belum cukup data (${h.terisi}/${h.total} komponen)</span>`;
    const lengkap = h.terisi === h.total;
    return `<span class="ls-big">${fmt1(h.nilai)}<small>${lengkap ? "semua komponen terisi" : `nilai sementara · ${h.terisi}/${h.total} komponen`}</small></span>`;
  };
  const totalLabel = tengah ? "Nilai tengah semester" : "Nilai akhir semester";

  // Perkembangan STS → Asesmen Lanjutan
  const perk = hasil.map(h => {
    if (h.sts == null || h.lanjutan == null) {
      return `<div class="ls-pk empty"><b style="color:#0E2A33;font-size:11.5px">${h.mapel}</b>${h.sts == null ? "Nilai STS belum dimasukkan." : "Asesmen Lanjutan belum dilaksanakan."}</div>`;
    }
    const d = h.lanjutan - h.sts;
    return `<div class="ls-pk"><div class="top"><b>${h.mapel}</b><span class="ls-w">STS → Lanjutan</span></div>
      <div class="nums"><span class="a">${h.sts}</span><span class="ls-w">→</span><span class="b">${h.lanjutan}</span><span class="d ${d < 0 ? "down" : ""}">${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d)} poin</span></div>${lsTrack(h.sts, h.lanjutan)}</div>`;
  }).join("");

  // Tugas Astrolab yang memang berlaku untuk siswa ini (sama dengan filter getTugasAstrolabAvg)
  const subs = store.getSubs().filter(x => x.siswaId === s.id);
  const subOf = id => subs.find(x => x.tugasId === id);
  const relevan = store.getTugas().filter(t => t.jenjang === jenjang && mapels.includes(t.mapel) && t.status !== "scheduled" && t.graded !== false
    && (!Array.isArray(t.assignedTo) || t.assignedTo.includes(s.id)));
  const materiMap = {};
  relevan.forEach(t => {
    const key = `${t.mapel}|${(t.materi && t.materi.trim()) || "Tanpa materi"}`;
    (materiMap[key] = materiMap[key] || []).push(subOf(t.id));
  });
  const materi = Object.entries(materiMap).map(([key, list]) => {
    const [mapel, nama] = key.split("|");
    const vals = list.filter(x => x && typeof x.nilai === "number").map(x => x.nilai);
    return { mapel, nama, sudah: vals.length, total: list.length, rata: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
  }).sort((a, b) => mapels.indexOf(a.mapel) - mapels.indexOf(b.mapel) || a.nama.localeCompare(b.nama, "id"));
  const materiRows = materi.length ? materi.map(m => `<tr><td>${esc(m.nama)}</td>${mapels.length > 1 ? `<td class="ls-w">${m.mapel}</td>` : ""}<td class="ls-c ls-w">${m.sudah}/${m.total}</td>
      <td>${m.rata == null ? '<span class="ls-none">Belum dikerjakan</span>' : lsCell(m.rata)}</td>
      <td>${m.rata == null ? '<span class="ls-na">—</span>' : m.rata >= KKTP ? '<span class="ls-ok">Tercapai</span>' : '<span class="ls-no">Belum tercapai</span>'}</td></tr>`).join("")
    : `<tr><td colspan="${mapels.length > 1 ? 5 : 4}" class="ls-none">Belum ada tugas Astrolab pada periode ini.</td></tr>`;

  // Keaktifan
  const selesai = relevan.filter(t => subOf(t.id)).length;
  const tepat = relevan.filter(t => { const x = subOf(t.id); return x && x.ontime !== false; }).length;
  const terlewat = relevan.filter(t => !subOf(t.id) && fmtDl(t.deadline).tone === "bad" && !(store.isSusulanAktif && store.isSusulanAktif(t.id, s.id))).length;

  // Draf catatan guru dari data: materi terkuat & terlemah, perkembangan, tugas terlewat
  const adaNilai = materi.filter(m => m.rata != null).sort((a, b) => b.rata - a.rata);
  const kalimat = [];
  if (adaNilai.length >= 2) kalimat.push(`${esc(namaPanggil)} paling kuat di <b>${esc(adaNilai[0].nama)}</b> (${adaNilai[0].rata}) dan masih perlu latihan di <b>${esc(adaNilai[adaNilai.length - 1].nama)}</b> (${adaNilai[adaNilai.length - 1].rata}).`);
  else if (adaNilai.length === 1) kalimat.push(`${esc(namaPanggil)} sudah mengerjakan tugas <b>${esc(adaNilai[0].nama)}</b> dengan rata-rata ${adaNilai[0].rata}.`);
  else kalimat.push(`${esc(namaPanggil)} belum mengerjakan tugas Astrolab pada periode ini.`);
  hasil.filter(h => h.sts != null && h.lanjutan != null).forEach(h => {
    const d = h.lanjutan - h.sts;
    kalimat.push(d > 0 ? `Dari STS ke Asesmen Lanjutan ${h.mapel}, nilainya naik <b>${d} poin</b>.` : d < 0 ? `Asesmen Lanjutan ${h.mapel} ${Math.abs(d)} poin di bawah STS; perlu dibicarakan bersama.` : `Asesmen Lanjutan ${h.mapel} sama dengan STS.`);
  });
  if (terlewat > 0) kalimat.push(`${terlewat} tugas belum dikerjakan; ${esc(namaPanggil)} masih bisa meminta akses susulan.`);

  return `
  <article class="ls-sheet">
    <header class="ls-hd">
      <div class="ls-brand">${LOGO_SVG}<div><h1>Laporan Hasil Belajar</h1><p>${mapels.join(" &amp; ")} · ${tengah ? "Tengah " : ""}${esc(periode)}</p></div></div>
      <div class="ls-school"><b>${SEKOLAH.nama}</b><br>${SEKOLAH.alamat}<br>Dicetak ${now} · Astrolab</div>
    </header>
    <div class="ls-id">
      <div><span>Nama siswa</span><b>${esc(s.nama)}</b></div>
      <div><span>Kelas</span><b>${esc(s.kelas || `Kelas ${jenjang}`).replace(/^Kelas\s+/, "")}</b></div>
      <div><span>Periode</span><b>${esc(periode)}</b></div>
      <div><span>Jenis laporan</span><b>${tengah ? "Tengah semester" : "Semester"}</b></div>
    </div>
    <section class="ls-sec">
      <div class="ls-st"><h2>Nilai semester</h2><span class="ls-legend"><i></i>garis tipis = KKTP ${KKTP}</span></div>
      <table><thead><tr><th>Komponen</th><th class="ls-c">Bobot</th>${hasil.map(h => `<th style="width:${mapels.length > 1 ? 30 : 50}%">${h.mapel}</th>`).join("")}</tr></thead>
        <tbody>${komponenRows}<tr class="ls-total"><td class="lbl" colspan="2">${totalLabel}<small>dari komponen yang sudah dinilai</small></td>${hasil.map(h => `<td>${totalCell(h)}</td>`).join("")}</tr></tbody></table>
    </section>
    <section class="ls-sec">
      <div class="ls-st"><h2>Perkembangan</h2><span>STS → Asesmen Lanjutan · materi dan tingkat yang sama · tidak mengubah nilai</span></div>
      <div class="ls-perk">${perk}</div>
    </section>
    <section class="ls-sec">
      <div class="ls-st"><h2>Capaian per materi · tugas Astrolab</h2><span>Tercapai bila rata-rata ≥ KKTP ${KKTP}</span></div>
      <table class="ls-mat"><thead><tr><th>Materi</th>${mapels.length > 1 ? "<th>Mapel</th>" : ""}<th class="ls-c">Dikerjakan</th><th style="width:30%">Rata-rata</th><th>Status</th></tr></thead><tbody>${materiRows}</tbody></table>
    </section>
    <section class="ls-sec">
      <div class="ls-st"><h2>Keaktifan di Astrolab</h2></div>
      <div class="ls-act">
        <div><span>Tugas selesai</span><b>${selesai} dari ${relevan.length}</b></div>
        <div><span>Tepat waktu</span><b>${tepat} tugas</b></div>
        <div><span>Streak saat ini</span><b>${stats.streak || 0} hari</b></div>
        <div><span>Level</span><b>${esc(lv.name)}</b></div>
      </div>
    </section>
    <section class="ls-sec">
      <div class="ls-st"><h2>Catatan guru</h2></div>
      <div class="ls-note">${kalimat.join(" ")}<div class="lines"></div></div>
    </section>
    <div class="ls-sign">
      <div>Mengetahui,<br>Orang tua / wali<div class="sp"></div><b>( ............................................ )</b></div>
      <div>Banda Aceh, ${now}<br>${GURU.jabatan}<div class="sp"></div><b>${GURU.nama}</b>NIP ${GURU.nip}</div>
    </div>
    <div class="ls-ft"><span>Astrolab · Our Classroom</span><span>${tengah ? "Nilai tengah semester belum termasuk SAS, bobot komponen lain disesuaikan." : "Dokumen ini dibuat otomatis dari data Astrolab."}</span></div>
  </article>`;
}

export function buildLaporanHtml(store, jenjang, mode = "kelas", periode = getPeriodeAktif(), jenisLaporan = "semester") {
  {
    const siswa = store.getAllSiswa(jenjang);
    const tugas = store.getTugas().filter(t => t.jenjang === jenjang);
    const subs = store.getSubs();
    const now = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });

    let bodyContent = "";

  if (mode === "siswa") {
    // Per siswa — 1 halaman per siswa
    bodyContent = siswa.map(s => generateLaporanSiswa(s, store, jenjang, periode, jenisLaporan)).join("");
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
        <td style="text-align:center;font-weight:700;color:#0d9488">${stats.poin || 0}</td>
        <td style="text-align:center">${stats.tugasSelesai || 0}/${tugas.length}</td>
        <td style="text-align:center;font-weight:700;color:${getNilaiColor(nilaiRata)}">${nilaiRata || "—"}</td>
        <td style="text-align:center"><span class="badge-pill chip-teal" style="font-size:10px">${tierIconSvg(lv.tierId, lv.color, 14)} ${lv.name}</span></td>
        <td style="text-align:center">
          <span class="badge-pill ${nilaiRata >= KKTP ? 'chip-teal' : nilaiRata > 0 ? 'chip-yellow' : 'chip-gray'}" style="font-size:10px">
            ${nilaiRata >= KKTP ? "Tercapai" : nilaiRata > 0 ? "Belum tercapai" : "Belum ada nilai"}
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
          <div class="logo">Astrolab · Our Classroom<small>Laporan Rekap Hasil Belajar Kelas · ${SEKOLAH.nama}</small></div>
          <div style="margin-top:6px;font-size:13px;font-weight:700">Kelas ${jenjang}</div>
        </div>
        <div class="meta">
          Periode: <b>${periode}</b><br>
          Dicetak: ${now}<br>
          ${GURU.nama}<br>
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
            <td style="font-weight:700;color:#0d6b7a">${siswa.length ? Math.round(siswa.filter(s => (store.getStats(s.id).nilaiRata || 0) >= 70).length / siswa.length * 100) : 0}%</td>
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
          <div style="font-size:12px;font-weight:700">${GURU.nama}</div><div style="font-size:10px;color:#64748b">NIP ${GURU.nip}</div>
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
<style>${LAPORAN_CSS}${mode === "siswa" ? LAPORAN_SISWA_CSS : ""}</style>
</head>
<body${mode === "siswa" ? ' class="ls-body"' : ""}>
  <div class="no-print" style="background:#0d6b7a;color:#fff;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100">
    <span style="font-weight:700">Astrolab · Laporan ${mode === "siswa" ? "Per Siswa" : "Kelas"} ${jenjang}${jenisLaporan === "tengahSemester" ? " (Tengah Semester)" : ""} — ${periode}</span>
    <button onclick="window.print()" style="background:#fff;color:#0d6b7a;border:none;padding:8px 18px;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">Cetak / Save PDF</button>
  </div>
  ${bodyContent}
</body>
</html>`;

  return html;
  }
}

function exportLaporan(store, jenjang, mode = "kelas", periode = getPeriodeAktif(), jenisLaporan = "semester") {
  try {
  const html = buildLaporanHtml(store, jenjang, mode, periode, jenisLaporan);
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

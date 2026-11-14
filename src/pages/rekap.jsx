// ─── Rekap Semester (story ala season recap) ────────────────────────────────
// Data datang dari snapshot rekap/{siswaId}/{kunciPeriode} (dibuat guru saat Terbitkan,
// lihat utils/rekap-hitung.js). Mesin story ditulis vanilla di dalam useEffect supaya
// animasi canvas & gestur tahan-untuk-membuka tidak memicu render React tiap frame.
import { useEffect, useRef, useState } from "react";
import { julukanJam } from "../utils/rekap-hitung";
import "../styles/rekap.css";

const TIER_WARNA = ["#7FB6BD", "#F5B544", "#14A3B8", "#3B82F6", "#FF8A65"]; // Nebula, Bintang, Planet, Astronot, Commander
const WB = ["#F5B544", "#FF8A65", "#14A3B8", "#3B82F6", "#8FD1CF"];
const API = n => n >= 50 ? ["#22d3ee", "#8b5cf6", "#7c3aed", "#db2777"] : n >= 40 ? ["#f9a8d4", "#ec4899", "#be185d", "#831843"] : n >= 30 ? ["#c4b5fd", "#8b5cf6", "#6d28d9", "#4c1d95"] : n >= 20 ? ["#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"] : n >= 10 ? ["#67e8f9", "#06b6d4", "#0891b2", "#155e75"] : ["#bae6fd", "#7dd3fc", "#38bdf8", "#0369a1"];
const NAMA_API = n => n >= 50 ? "Kosmik" : n >= 40 ? "Magenta" : n >= 30 ? "Ungu" : n >= 20 ? "Biru listrik" : n >= 10 ? "Cyan" : "Biru muda";
const pad = n => String(n).padStart(2, "0");
const rb = n => Number(n || 0).toLocaleString("id-ID");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const inisial = n => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();

// ---------- gambar SVG ----------
let uid = 0;
const logo = (s, cls = "") => `<svg class="${cls}" width="${s}" height="${s}" viewBox="-14 -14 28 28" aria-hidden="true"><polygon class="p1" points="0,-11 5.5,-3.5 0,1 -5.5,-3.5" fill="#fff"/><polygon class="p2" points="-5.5,-3.5 -2,3.5 -8,9 -11.5,2" fill="#8FD1CF"/><polygon class="p3" points="5.5,-3.5 11.5,2 8,9 2,3.5" fill="#8FD1CF"/><rect class="p4" x="-3.5" y="1" width="7" height="2.2" rx=".5" fill="#5BA9AD"/></svg>`;
const api = (n, s) => { const [a, b, c, d] = API(n), id = "rpa" + (uid++); return `<svg width="${s}" height="${Math.round(s * 1.17)}" viewBox="0 -4 48 56" aria-hidden="true"><defs><linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient></defs><path d="M24 2L13 17L8 30L14 42L24 47L24 23Z" fill="url(#${id}l)"/><path d="M24 2L35 17L40 30L34 42L24 47L24 23Z" fill="url(#${id}r)"/><path d="M24 2L13 17L24 23Z" fill="#fff" opacity=".45"/><path d="M24 23L30 32L24 43L18 32Z" fill="#fff" opacity=".9"/></svg>`; };
function emblem(lv, s) {
  const ti = Math.max(0, Math.min(4, lv?.tier || 0)), w = TIER_WARNA[ti], id = "rpe" + (uid++);
  const hex = r => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 3 * i - Math.PI / 2; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(" ");
  const sayap = ti >= 1 ? `<path d="M-30 -2 L-46 -12 L-40 4 L-50 8 L-34 12 Z M30 -2 L46 -12 L40 4 L50 8 L34 12 Z" fill="${w}" opacity=".75"/>` : "";
  const mahkota = ti >= 3 ? `<path d="M-12 -38 L-6 -30 L0 -40 L6 -30 L12 -38 L10 -28 L-10 -28 Z" fill="#F5B544"/>` : "";
  return `<svg width="${s}" height="${s}" viewBox="-55 -55 110 110" style="overflow:visible" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${w}"/><stop offset="1" stop-color="#0B2F36"/></linearGradient><radialGradient id="${id}g"><stop offset="0" stop-color="${w}" stop-opacity=".55"/><stop offset="1" stop-color="${w}" stop-opacity="0"/></radialGradient></defs><circle r="54" fill="url(#${id}g)"/>${sayap}<polygon points="${hex(30)}" fill="url(#${id})" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/><polygon points="${hex(21)}" fill="#0B2F36" opacity=".55"/>${mahkota}<text y="7" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-weight="800" font-size="20" fill="#fff">${esc(lv?.sub || "")}</text></svg>`;
}
const perisai = (w, s) => { const id = "rpp" + (uid++); return `<svg width="${s}" height="${s}" viewBox="-22 -24 44 48" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".3" stop-color="${w}"/><stop offset="1" stop-color="${w}" stop-opacity=".7"/></linearGradient></defs><path d="M0 -21 L17 -14 L17 3 C17 13 8 19 0 22 C-8 19 -17 13 -17 3 L-17 -14 Z" fill="url(#${id})" stroke="#fff" stroke-opacity=".5"/><path d="M0 -8 L2.6 -2 L9 -1.4 L4.2 2.8 L5.6 9 L0 5.8 L-5.6 9 L-4.2 2.8 L-9 -1.4 L-2.6 -2 Z" fill="#fff"/></svg>`; };
function radar(atr, kuat, s) {
  const k = Object.keys(atr || {}), n = k.length, R = 62;
  if (n < 3) return "";
  const pt = (i, r) => { const a = Math.PI * 2 * i / n - Math.PI / 2; return [Math.cos(a) * r, Math.sin(a) * r]; };
  const grid = [.25, .5, .75, 1].map(f => `<polygon points="${k.map((_, i) => pt(i, R * f).join(",")).join(" ")}" fill="none" stroke="rgba(255,255,255,.15)"/>`).join("");
  const sumbu = k.map((_, i) => `<line x1="0" y1="0" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="rgba(255,255,255,.12)"/>`).join("");
  const v = x => R * Math.max(.15, (atr[x] || 0) / 100);
  const bentuk = k.map((x, i) => pt(i, v(x)).join(",")).join(" ");
  const lbl = k.map((x, i) => { const [a, b] = pt(i, R + 16); return `<text x="${a}" y="${b + 3}" text-anchor="middle" class="${x === kuat ? "kuat" : ""}">${x.toUpperCase()}</text>`; }).join("");
  const titik = k.map((x, i) => { const [a, b] = pt(i, v(x)); return `<circle cx="${a}" cy="${b}" r="${x === kuat ? 4 : 2.5}" fill="${x === kuat ? "#F5B544" : "#fff"}"/>`; }).join("");
  return `<svg class="rp-radar" width="${s}" height="${s}" viewBox="-95 -95 190 190" role="img" aria-label="Atribut pemain, terkuat ${esc(kuat)}">${grid}${sumbu}<g class="bentuk"><polygon points="${bentuk}" fill="rgba(20,163,184,.35)" stroke="#8FD1CF" stroke-width="2"/>${titik}</g>${lbl}</svg>`;
}

// ---------- kartu dari snapshot ----------
function susunKartu(r) {
  const K = [];
  const depan = esc(String(r.nama || "").split(" ")[0]);
  const periode = esc(String(r.periode || "").replace(/^Semester\s+/, ""));
  K.push({ warna: "#14A3B8", aksen: "#8FD1CF", intro: true, h: `
    ${logo(96, "rp-logo-intro m z")}
    <span class="rp-season m" style="--d:.5s">Season ${periode}</span>
    <div class="rp-judul m slam" style="--d:.8s">Rekap<em>Semester</em></div>
    <p class="m" style="--d:1.1s;text-align:center">${depan}, satu semester perjalananmu di Astrolab sudah tercatat.</p>
    <span class="rp-mulai m" style="--d:1.3s">Tap untuk mulai</span>` });
  K.push({ warna: "#0d6b7a", aksen: "#8FD1CF", h: `
    <span class="rp-lbl m" style="--d:.1s">Misi diselesaikan</span>
    <div class="rp-angka m slam" style="--d:.25s" data-hitung="${r.tugas}">0</div>
    <h2 class="m" style="--d:.5s">tugas kamu tuntaskan semester ini.</h2>
    ${r.soal ? `<span class="rp-chip m" style="--d:.75s">${rb(r.soal)} soal dijawab</span>` : ""}` });
  if (r.jam) {
    const jul = julukanJam(r.jam), jw = { "Si Pagi": "#F5B544", "Pejuang Siang": "#14A3B8", "Penjaga Senja": "#FF8A65" }[jul] || "#8FD1CF";
    const lebar = ((r.jam[1] - r.jam[0] + 24) % 24) || 24, pj = 2 * Math.PI * 42, pjg = pj * lebar / 24, sudut = r.jam[0] / 24 * 360 - 90;
    K.push({ warna: jw, aksen: jw, h: `
      <span class="rp-lbl m" style="--d:.1s">Jam terbangmu</span>
      <svg class="rp-jam m z" style="--d:.15s" viewBox="-55 -55 110 110" aria-hidden="true">
        <circle r="42" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="8"/>
        ${Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2 - Math.PI / 2; return `<line x1="${Math.cos(a) * 50}" y1="${Math.sin(a) * 50}" x2="${Math.cos(a) * (i % 6 ? 52 : 54)}" y2="${Math.sin(a) * (i % 6 ? 52 : 54)}" stroke="rgba(255,255,255,.5)" stroke-width="${i % 6 ? 1 : 2}"/>`; }).join("")}
        <circle class="busur" r="42" fill="none" stroke="${jw}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${pjg} ${pj}" style="--pj:${pjg}" transform="rotate(${sudut})"/>
        <text y="-2" text-anchor="middle" fill="#fff" font-size="17" font-weight="800" font-family="Plus Jakarta Sans,sans-serif">${pad(r.jam[0])}–${pad(r.jam[1])}</text>
        <text y="13" text-anchor="middle" fill="rgba(255,255,255,.6)" font-size="7.5" font-family="DM Mono,monospace" letter-spacing="1.5">WIB</text></svg>
      <h2 class="m slam" style="--d:.7s;font-size:40px;text-align:center">${jul}</h2>
      <p class="m" style="--d:.9s;text-align:center">${r.jamN} tugas kamu kumpulkan di jam ini. Ini jam paling produktifmu.</p>` });
  }
  if (r.tampil?.streak) { const c = API(r.streak); K.push({ warna: c[1], aksen: c[0], partikel: c[1], h: `
    <span class="rp-lbl m" style="--d:.1s;text-align:center">Streak terpanjang</span>
    <div class="rp-api m z" style="--d:.2s">${api(r.streak, 130)}</div>
    <div class="rp-angka m slam" style="--d:.6s;text-align:center" data-hitung="${r.streak}">0</div>
    <p class="m" style="--d:.8s;text-align:center">tugas beruntun tepat waktu.<br>Apimu mencapai tingkat <b>${NAMA_API(r.streak)}</b>.</p>` }); }
  if (r.perfect > 0) K.push({ warna: "#D9822B", aksen: "#F5B544", h: `
    <span class="rp-lbl m" style="--d:.1s">Nilai sempurna</span>
    <div class="rp-angka m slam" style="--d:.2s">${r.perfect}<small>× nilai 100</small></div>
    ${r.terbaik ? `<p class="m" style="--d:.5s">Salah satunya di <b>${esc(r.terbaik.judul)}</b>.</p>` : ""}` });
  else if (r.terbaik) K.push({ warna: "#D9822B", aksen: "#F5B544", h: `
    <span class="rp-lbl m" style="--d:.1s">Nilai terbaikmu</span>
    <div class="rp-angka m slam" style="--d:.2s" data-hitung="${r.terbaik.nilai}">0</div>
    <p class="m" style="--d:.5s">di <b>${esc(r.terbaik.judul)}</b>. Ini bukti kamu bisa.</p>` });
  if (r.tampil?.kilat) K.push({ warna: "#FF8A65", aksen: "#FFC2A8", warp: true, h: `
    <span class="rp-lbl m" style="--d:.1s">Pengumpulan tercepat</span>
    <div class="rp-angka m slam" style="--d:.2s">${r.kilat}<small>menit</small></div>
    <h2 class="m" style="--d:.45s">setelah tugas terbit, kamu sudah selesai.</h2>` });
  if (r.lvAkhir) {
    const naikTier = r.lvAwal && r.lvAwal.nama !== r.lvAkhir.nama, sama = r.lvAwal && r.lvAwal.nama === r.lvAkhir.nama && r.lvAwal.sub === r.lvAkhir.sub;
    const w = TIER_WARNA[r.lvAkhir.tier || 0];
    K.push({ warna: w, aksen: w, rankup: sama ? null : w, h: sama ? `
      <span class="rp-lbl m" style="--d:.1s;text-align:center">Levelmu</span>
      <div class="m z" style="--d:.2s;align-self:center">${emblem(r.lvAkhir, 150)}</div>
      <h2 class="m" style="--d:.5s;text-align:center">${esc(r.lvAkhir.nama)} ${esc(r.lvAkhir.sub)}</h2>
      <span class="rp-naik m" style="--d:.7s">+${rb(r.poinSemester)} poin semester ini</span>` : `
      <span class="rp-lbl m" style="--d:.1s;text-align:center">${naikTier ? "Rank up" : "Level up"}</span>
      <div class="rp-emblem">
        <div class="lama">${emblem(r.lvAwal, 120)}<b>${esc(r.lvAwal.nama)} ${esc(r.lvAwal.sub)}</b></div>
        <div class="baru">${emblem(r.lvAkhir, 150)}<b>${esc(r.lvAkhir.nama)} ${esc(r.lvAkhir.sub)}</b></div>
      </div>
      <span class="rp-naik m" style="--d:2.6s">+${rb(r.poinSemester)} poin semester ini</span>` });
  }
  if (r.tampil?.badge) { const tampil = r.badge.slice(0, 6), sisa = r.badge.length - tampil.length; K.push({ warna: "#0B4F6C", aksen: "#F5B544", h: `
    <span class="rp-lbl m" style="--d:.1s">Koleksi badge</span>
    <h2 class="m" style="--d:.2s">${r.badge.length} badge sudah kamu kumpulkan.</h2>
    <div class="rp-badge">${tampil.map((b, i) => `<div class="m z" style="--d:${.4 + i * .15}s">${perisai(WB[i % 5], 62)}<span>${esc(b)}</span></div>`).join("")}</div>
    ${sisa > 0 ? `<span class="rp-chip m" style="--d:1.4s">+${sisa} badge lainnya</span>` : ""}` }); }
  if (r.tampil?.delta) { const d = r.delta, mx = Math.max(d.sts, d.sas) || 1; K.push({ warna: "#14A3B8", aksen: "#8FD1CF", h: `
    <span class="rp-lbl m" style="--d:.1s">${esc(d.mapel)} · dari STS ke SAS</span>
    <h2 class="m slam" style="--d:.2s;font-size:46px">Naik ${d.sas - d.sts}</h2>
    <div class="rp-delta m" style="--d:.3s"><div><b>${d.sts}</b><i style="--h:${d.sts / mx * 100}%;--d:.5s"></i><span>STS</span></div><div><b>${d.sas}</b><i style="--h:${d.sas / mx * 100}%;--d:.8s"></i><span>SAS</span></div></div>
    <p class="m" style="--d:1s">Kamu lebih paham sekarang dibanding pertengahan semester.</p>` }); }
  if (r.atribut) K.push({ warna: "#0B2447", aksen: "#F5B544", h: `
    <span class="rp-lbl m" style="--d:.1s;text-align:center">Atribut pemain</span>
    <div class="m z" style="--d:.15s;align-self:center">${radar(r.atribut, r.kuat, 230)}</div>
    <h2 class="m" style="--d:.9s;text-align:center">Atribut terkuat:<br><span style="color:#F5B544">${esc(r.kuat)}</span></h2>` });
  K.push({ warna: "#D9822B", aksen: "#F5B544", gelar: true, h: `
    <span class="rp-lbl m" style="--d:.1s;text-align:center">Gelar semester ini</span>
    <div class="rp-peti m z" style="--d:.2s" data-peti>
      <svg class="cincin" viewBox="-110 -110 220 220" aria-hidden="true"><circle r="96" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="6"/><circle class="isi" r="96" fill="none" stroke="#F5B544" stroke-width="6" stroke-linecap="round" stroke-dasharray="603" stroke-dashoffset="603" transform="rotate(-90)"/></svg>
      <div class="segel">${perisai("#F5B544", 130)}</div>
    </div>
    <span class="rp-tahan m" style="--d:.5s" data-tahan>Tahan untuk membuka</span>
    <div data-hasil hidden class="rp-hasil">
      <div class="rp-gelar">${esc(r.gelar?.nama)}</div>
      <p style="text-align:center">${esc(r.gelar?.alasan)}</p>
    </div>` });
  const statKe5 = r.tampil?.delta ? [`+${r.delta.sas - r.delta.sts}`, "naik STS→SAS"] : [String(r.badge?.length || 0), "badge"];
  K.push({ warna: "#0d6b7a", aksen: "#8FD1CF", pemain: true, h: `
    <span class="rp-lbl m" style="--d:.05s;text-align:center">Kartu pemain</span>
    <div class="rp-pemain-wrap m z" style="--d:.15s"><div class="rp-pemain" data-pemain><span class="holo"></span>
      <div class="atas"><span class="av">${esc(inisial(r.nama))}</span><div><b>${esc(r.nama)}</b><span>${esc(r.kelas || "")} · ${periode}</span></div><span class="emb">${r.lvAkhir ? emblem(r.lvAkhir, 54) : ""}</span></div>
      <div class="gelar-bar">${esc(r.gelar?.nama)}<small>GELAR</small></div>
      <div class="stat">
        <div><b>${r.tugas}</b><span>tugas</span></div>
        <div><b>${r.streak}</b><span>streak terbaik</span></div>
        <div><b>${r.perfect > 0 ? r.perfect + "×" : (r.terbaik?.nilai ?? "–")}</b><span>${r.perfect > 0 ? "nilai 100" : "nilai terbaik"}</span></div>
        <div><b>+${rb(r.poinSemester)}</b><span>poin</span></div>
        <div><b>${statKe5[0]}</b><span>${statKe5[1]}</span></div>
        <div><b style="font-size:${String(r.kuat || "").length > 7 ? 14 : 19}px">${esc(r.kuat || "")}</b><span>atribut terkuat</span></div>
      </div>
      <div class="kaki">${logo(14)}<span>astrolab classroom</span>${r.peringkat ? `<span style="color:#F5B544">#${r.peringkat} kelas</span>` : "<span></span>"}</div>
    </div></div>
    <div class="rp-aksi-akhir m" style="--d:.5s"><button type="button" class="rp-btn" data-simpan>Simpan kartu</button><button type="button" class="rp-btn utama" data-selesai>Selesai</button></div>` });
  return K;
}

// ---------- kartu pemain sebagai gambar (canvas 2D, tanpa library) ----------
async function gambarKartu(r) {
  const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  try { await document.fonts?.ready; } catch { /* abaikan */ }
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#0F4F5A"); bg.addColorStop(.7, "#08272E"); bg.addColorStop(1, "#061F24");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .6})`; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, Math.random() * 2.2, 0, 7); g.fill(); }
  const F = (w, s) => `${w} ${s}px "Plus Jakarta Sans", system-ui, sans-serif`;
  g.fillStyle = "#8FD1CF"; g.font = `500 30px "DM Mono", monospace`; g.fillText(`REKAP SEMESTER · ${String(r.periode || "").replace(/^Semester\s+/, "").toUpperCase()}`, 80, 120);
  g.fillStyle = "#fff"; g.font = F(800, 84); g.fillText(String(r.nama || ""), 80, 230, W - 160);
  g.fillStyle = "rgba(255,255,255,.7)"; g.font = F(600, 36); g.fillText(`${r.kelas || ""}  ·  ${r.lvAkhir ? `${r.lvAkhir.nama} ${r.lvAkhir.sub}` : ""}`, 80, 290);
  const gl = g.createLinearGradient(80, 0, W - 80, 0); gl.addColorStop(0, "#F5B544"); gl.addColorStop(1, "#D9822B");
  g.fillStyle = gl; g.beginPath(); g.roundRect ? g.roundRect(80, 340, W - 160, 150, 28) : g.rect(80, 340, W - 160, 150); g.fill();
  g.fillStyle = "#2B1A05"; g.font = F(800, 72); g.fillText(r.gelar?.nama || "", 120, 440, W - 360);
  g.font = `500 26px "DM Mono", monospace`; g.textAlign = "right"; g.fillText("GELAR", W - 120, 430); g.textAlign = "left";
  const stat = [[r.tugas, "tugas"], [r.streak, "streak terbaik"], [r.perfect > 0 ? r.perfect + "×" : (r.terbaik?.nilai ?? "–"), r.perfect > 0 ? "nilai 100" : "nilai terbaik"], ["+" + rb(r.poinSemester), "poin"], [r.tampil?.delta ? "+" + (r.delta.sas - r.delta.sts) : (r.badge?.length || 0), r.tampil?.delta ? "naik STS→SAS" : "badge"], [r.kuat, "atribut terkuat"]];
  stat.forEach(([v, l], i) => {
    const x = 80 + (i % 3) * ((W - 160 - 40) / 3 + 20), y = 540 + Math.floor(i / 3) * 250, w = (W - 160 - 40) / 3;
    g.fillStyle = "rgba(255,255,255,.08)"; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, 220, 24) : g.rect(x, y, w, 220); g.fill();
    g.fillStyle = "#fff"; g.font = F(800, String(v).length > 6 ? 46 : 72); g.textAlign = "center"; g.fillText(String(v), x + w / 2, y + 125, w - 30);
    g.fillStyle = "rgba(255,255,255,.7)"; g.font = F(600, 28); g.fillText(l, x + w / 2, y + 180, w - 20); g.textAlign = "left";
  });
  g.fillStyle = "rgba(255,255,255,.55)"; g.font = `500 28px "DM Mono", monospace`; g.fillText("ASTROLAB CLASSROOM", 80, H - 80);
  if (r.peringkat) { g.fillStyle = "#F5B544"; g.textAlign = "right"; g.fillText(`#${r.peringkat} KELAS`, W - 80, H - 80); g.textAlign = "left"; }
  return new Promise(res => c.toBlob(res, "image/png"));
}
async function simpanKartu(r) {
  const blob = await gambarKartu(r); if (!blob) return "Gagal membuat gambar.";
  const nama = `Rekap_${String(r.nama || "siswa").replace(/\s+/g, "_")}.png`;
  const file = new File([blob], nama, { type: "image/png" });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Rekap Semester Astrolab" }); return "Kartu dibagikan."; } } catch { /* batal / tidak didukung */ }
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "Kartu tersimpan.";
}

// ---------- mesin story ----------
function pasang(akar, data, cb) {
  const kurangGerak = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const kanvas = akar.querySelector("canvas"), cx = kanvas.getContext("2d");
  const tint = akar.querySelector(".rp-tint"), isi = akar.querySelector(".rp-isi");
  const K = susunKartu(data);
  let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), mati = false;
  const ukur = () => { const r = kanvas.getBoundingClientRect(); W = r.width; H = r.height; kanvas.width = W * dpr; kanvas.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const ro = new ResizeObserver(ukur); ro.observe(kanvas); ukur();
  const BINTANG = Array.from({ length: 160 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
  let laju = .0012, lajuT = .0012; const percik = [];
  const ledak = (x, y, warna, n = 90) => { if (kurangGerak) return; for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = 2 + Math.random() * 6; percik.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 1 + Math.random() * 2.6, hidup: 1 + Math.random() * .6, w: warna[i % warna.length] }); } };
  const hujan = w => { if (kurangGerak) return; for (let i = 0; i < 40; i++) percik.push({ x: W / 2 + (Math.random() - .5) * 120, y: H * .45 + (Math.random() - .5) * 60, vx: (Math.random() - .5) * 1.5, vy: -1 - Math.random() * 3, r: 1 + Math.random() * 2, hidup: 1 + Math.random(), w }); };

  let idx = 0, t = 0, tahan = false, akhir = performance.now(), terbuka = false, isian = 0, mengisi = false, tekan = 0;
  const DUR = 6;
  const timers = new Set(); const later = (f, ms) => { const id = setTimeout(() => { timers.delete(id); f(); }, ms); timers.add(id); };

  function render() {
    const k = K[idx];
    tint.style.background = `radial-gradient(120% 80% at 50% 25%,${k.warna}88 0%,${k.warna}33 45%,rgba(2,20,26,.55) 100%)`;
    isi.innerHTML = `<div class="rp-bar">${K.map((_, i) => `<i><b style="width:${i < idx ? 100 : 0}%"></b></i>`).join("")}</div>
      <div class="rp-kepala">${logo(14)} Rekap Semester <span>${pad(idx + 1)} / ${pad(K.length)}</span><button type="button" class="rp-tutup" data-tutup aria-label="Tutup rekap">✕</button></div>
      <section class="rp-kartu" style="--aksen:${k.aksen}">${k.h}</section>
      ${idx > 0 && idx < K.length - 1 && !k.gelar ? '<div class="rp-tap">tap untuk lanjut</div>' : ""}`;
    const sec = isi.querySelector(".rp-kartu"); void sec.offsetWidth; sec.classList.add("on");
    sec.querySelectorAll("[data-hitung]").forEach(el => { const n = +el.dataset.hitung, t0 = performance.now(); if (kurangGerak) { el.textContent = n; return; } const f = now => { if (mati) return; const p = Math.min(1, Math.max(0, (now - t0 - 300) / 1000)); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    lajuT = .03; later(() => { lajuT = k.warp ? .012 : .0012; }, 450);
    if (k.partikel) later(() => hujan(k.partikel), 700);
    if (k.rankup) later(() => { if (K[idx] === k) ledak(W / 2, H * .42, [k.rankup, "#fff", "#F5B544"], 110); }, 2000);
    if (k.gelar) { terbuka = false; isian = 0; }
    if (k.pemain) {
      const pm = sec.querySelector("[data-pemain]"), wrap = pm.parentElement, holo = pm.querySelector(".holo");
      wrap.addEventListener("pointermove", e => { const b = pm.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height; pm.style.setProperty("--ry", `${(x - .5) * 18}deg`); pm.style.setProperty("--rx", `${(.5 - y) * 14}deg`); holo.style.setProperty("--hx", `${x * 100}%`); holo.style.setProperty("--hy", `${y * 100}%`); });
      wrap.addEventListener("pointerleave", () => { pm.style.setProperty("--rx", "0deg"); pm.style.setProperty("--ry", "0deg"); });
      later(() => ledak(W / 2, H * .42, ["#F5B544", "#8FD1CF", "#FF8A65", "#fff"], 60), 500);
    }
  }
  const ke = i => { idx = Math.max(0, Math.min(K.length - 1, i)); t = 0; render(); };
  function buka() {
    const peti = isi.querySelector("[data-peti]"); if (!peti) return;
    terbuka = true; mengisi = false; peti.classList.remove("mengisi"); peti.classList.add("terbuka");
    isi.querySelector("[data-tahan]").hidden = true; isi.querySelector("[data-hasil]").hidden = false;
    peti.querySelector(".isi").style.strokeDashoffset = 0;
    const r = peti.getBoundingClientRect(), l = akar.getBoundingClientRect();
    ledak(r.left - l.left + r.width / 2, r.top - l.top + r.height / 2, ["#F5B544", "#FFF6DF", "#FF8A65", "#8FD1CF"], 140);
    lajuT = .04; later(() => { lajuT = .0012; }, 600); t = 0;
  }
  function frame(now) {
    if (mati) return;
    const dt = Math.min(.1, (now - akhir) / 1000); akhir = now; const k = K[idx];
    // langit
    cx.fillStyle = "rgba(2,20,26,.35)"; cx.fillRect(0, 0, W, H); laju += (lajuT - laju) * .06;
    for (const b of BINTANG) {
      const pz = b.z; b.z -= kurangGerak ? 0 : laju; if (b.z <= .01) { b.z = 1; b.x = Math.random() * 2 - 1; b.y = Math.random() * 2 - 1; continue; }
      const sx = W / 2 + b.x / b.z * W * .5, sy = H / 2 + b.y / b.z * H * .5, px = W / 2 + b.x / pz * W * .5, py = H / 2 + b.y / pz * H * .5;
      cx.strokeStyle = `rgba(255,255,255,${Math.min(1, (1 - b.z) * 1.4)})`; cx.lineWidth = Math.max(.6, (1 - b.z) * 2.2);
      cx.beginPath(); cx.moveTo(px, py); cx.lineTo(sx, sy); cx.stroke();
    }
    for (let i = percik.length - 1; i >= 0; i--) { const p = percik[i]; p.x += p.vx; p.y += p.vy; p.vy += .06; p.hidup -= .016; if (p.hidup <= 0) { percik.splice(i, 1); continue; } cx.fillStyle = p.w; cx.globalAlpha = Math.max(0, p.hidup); cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill(); cx.globalAlpha = 1; }
    // waktu kartu
    if (k.gelar && !terbuka) {
      if (mengisi) { isian = Math.min(1, isian + dt / 1.3); if (isian >= 1) buka(); } else isian = Math.max(0, isian - dt * 1.5);
      const c = isi.querySelector("[data-peti] .isi"); if (c && !terbuka) c.style.strokeDashoffset = 603 * (1 - isian);
      lajuT = .0012 + isian * .03;
    } else if (!tahan && !k.intro && idx < K.length - 1) { t += dt; if (t >= DUR) ke(idx + 1); }
    const b = isi.querySelectorAll(".rp-bar b")[idx]; if (b) b.style.width = (k.intro || (k.gelar && !terbuka) ? 0 : idx === K.length - 1 ? 100 : Math.min(100, t / DUR * 100)) + "%";
    requestAnimationFrame(frame);
  }
  // input
  const onDown = e => { if (e.target.closest("button")) return; tekan = performance.now(); tahan = true; const k = K[idx]; if (k.gelar && !terbuka) { mengisi = true; isi.querySelector("[data-peti]")?.classList.add("mengisi"); } };
  const lepas = () => { tahan = false; if (mengisi) { mengisi = false; isi.querySelector("[data-peti]")?.classList.remove("mengisi"); } };
  const onUp = e => {
    const tombol = e.target.closest("button");
    if (tombol) {
      if (tombol.hasAttribute("data-tutup")) cb.tutup();
      else if (tombol.hasAttribute("data-selesai")) cb.selesai();
      else if (tombol.hasAttribute("data-simpan")) { tombol.disabled = true; tombol.textContent = "Menyiapkan…"; simpanKartu(data).then(m => { tombol.textContent = m; tombol.disabled = false; }).catch(() => { tombol.textContent = "Gagal, coba lagi"; tombol.disabled = false; }); }
      return;
    }
    const k = K[idx], lama = performance.now() - tekan; lepas();
    if (k.gelar && !terbuka) return; if (lama > 350) return;
    if (k.pemain && e.target.closest("[data-pemain]")) return;
    const r = akar.getBoundingClientRect();
    if (idx === 0) { ke(1); return; }
    ke(e.clientX - r.left < r.width * .33 ? idx - 1 : idx + 1);
  };
  const onKey = e => {
    const k = K[idx];
    if (e.key === "Escape") { cb.tutup(); return; }
    if (k.gelar && !terbuka && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); buka(); return; }
    if (e.target.closest?.("button") && (e.key === "Enter" || e.key === " ")) return;
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); ke(idx + 1); } else if (e.key === "ArrowLeft") ke(idx - 1);
  };
  akar.addEventListener("pointerdown", onDown); akar.addEventListener("pointerup", onUp);
  akar.addEventListener("pointerleave", lepas); akar.addEventListener("pointercancel", lepas);
  window.addEventListener("keydown", onKey);
  ke(0); requestAnimationFrame(frame);
  return () => { mati = true; ro.disconnect(); timers.forEach(clearTimeout); window.removeEventListener("keydown", onKey); };
}

/** Story layar penuh. `data` = snapshot rekap satu siswa. */
export function RekapStory({ data, onTutup, onSelesai }) {
  const ref = useRef(null);
  const cbRef = useRef({});
  cbRef.current = { tutup: () => onTutup?.(), selesai: () => (onSelesai || onTutup)?.() };
  useEffect(() => {
    if (!ref.current || !data) return;
    const lepas = pasang(ref.current, data, { tutup: () => cbRef.current.tutup(), selesai: () => cbRef.current.selesai() });
    const lama = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { lepas(); document.body.style.overflow = lama; };
  }, [data]);
  if (!data) return null;
  return (
    <div className="rp-overlay" role="dialog" aria-modal="true" aria-label={`Rekap semester ${data.periode || ""}`}>
      <div className="rp-layar" ref={ref}>
        <canvas className="rp-langit" />
        <div className="rp-tint" />
        <div className="rp-isi" />
      </div>
    </div>
  );
}

/** Siswa: daftar rekap miliknya, terbaru dulu. `semua` = {kunciPeriode: snapshot}. */
export function daftarRekap(semua) {
  return Object.entries(semua || {})
    .filter(([, r]) => r && r.terbitAt)
    .map(([kunci, r]) => ({ kunci, periode: String(r.periode || kunci).replace(/^Semester\s+/, ""), gelar: r.gelar?.nama, dilihatAt: r.dilihatAt || null, terbitAt: r.terbitAt, data: r }))
    .sort((a, b) => b.terbitAt - a.terbitAt);
}

/** Popup otomatis sekali: rekap terbaru yang belum pernah dilihat. Ditahan saat siswa sedang mengerjakan tugas. */
export function RekapOtomatis({ store, tahan }) {
  const [tutup, setTutup] = useState(() => new Set());
  const baru = daftarRekap(store.getRekapSaya?.()).find(r => !r.dilihatAt && !tutup.has(r.kunci));
  if (!baru || tahan) return null;
  const selesai = () => { setTutup(s => new Set(s).add(baru.kunci)); store.tandaiRekapDilihat?.(baru.kunci).catch(() => {}); };
  return <RekapStory data={baru.data} onTutup={selesai} onSelesai={selesai} />;
}

/** Daftar rekap per season di Profil siswa. `daftar` = [{kunci, periode, gelar, dilihatAt}] urut terbaru. */
export function RiwayatRekap({ daftar, onBuka }) {
  if (!daftar?.length) return null;
  return (
    <section className="rp-riwayat" aria-label="Riwayat rekap semester">
      <div className="rp-riwayat-head"><b>Rekap Semester</b><span>{daftar.length} season</span></div>
      {daftar.map(r => (
        <button key={r.kunci} type="button" className="rp-riwayat-row" onClick={() => onBuka(r.kunci)}>
          <span className="rp-riwayat-ikon" dangerouslySetInnerHTML={{ __html: logo(20) }} />
          <span className="rp-riwayat-teks"><b>{r.periode}</b><small>{r.gelar ? `Gelar: ${r.gelar}` : "Rekap perjalananmu"}</small></span>
          {!r.dilihatAt && <span className="rp-baru">Baru</span>}
          <span className="rp-putar">Putar</span>
        </button>
      ))}
    </section>
  );
}

/**
 * Kartu di layar guru (Nilai Akhir). Semua aksi Firebase lewat props dari store App.
 * kelas: [{jenjang, label, jumlah, sasLengkap, sasKurang:[nama], terbitAt|null, kosong:[nama]}]
 */
export function RekapGuruPanel({ periode, kelas, onPratinjau, onTerbitkan, onTarik }) {
  const [sibuk, setSibuk] = useState("");
  const [tanya, setTanya] = useState(null); // {jenis:"terbit"|"tarik"|"ulang", k}
  const [galat, setGalat] = useState("");
  const [lihat, setLihat] = useState(null);
  async function jalankan(fn, label) {
    setSibuk(label); setGalat("");
    try { await fn(); } catch (e) { setGalat(e?.message?.includes("PERMISSION_DENIED") ? "Akses ditolak. Publish dulu rules untuk node rekap." : "Gagal: " + (e?.message || "coba lagi")); }
    setSibuk("");
  }
  return (
    <section className="rp-guru" aria-busy={!!sibuk}>
      <header><div><b>Rekap Semester</b><span>{periode}</span></div>{sibuk && <small>{sibuk}…</small>}</header>
      {kelas.map(k => (
        <div key={k.jenjang} className="rp-guru-row">
          <b className="kls">{k.label}</b>
          <div className="info">
            <span className={k.sasKurang.length ? "kurang" : "ok"}>SAS {k.sasLengkap}/{k.jumlah}{k.sasKurang.length ? ` · ${k.sasKurang.length} belum ada nilai` : " lengkap"}</span>
            <small>{k.terbitAt ? `Terbit ${new Date(k.terbitAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · ${k.dilihat ?? 0}/${k.jumlahRekap ?? k.jumlah} sudah melihat` : "Belum diterbitkan"}</small>
            {k.sasKurang.length > 0 && <button type="button" className="rp-link" onClick={() => setLihat(lihat === k.jenjang ? null : k.jenjang)}>{lihat === k.jenjang ? "Sembunyikan" : "Lihat siapa"}</button>}
            {lihat === k.jenjang && <small className="daftar">{k.sasKurang.join(", ")}. Kartu "STS ke SAS" mereka dilewati.</small>}
          </div>
          <div className="aksi">
            <button type="button" className="rp-gbtn" disabled={!!sibuk} onClick={() => jalankan(() => onPratinjau(k.jenjang), "Menyiapkan pratinjau")}>Pratinjau</button>
            {k.terbitAt
              ? <><button type="button" className="rp-gbtn" disabled={!!sibuk} onClick={() => setTanya({ jenis: "ulang", k })}>Hitung ulang</button><button type="button" className="rp-gbtn" disabled={!!sibuk} onClick={() => setTanya({ jenis: "tarik", k })}>Tarik</button></>
              : <button type="button" className="rp-gbtn utama" disabled={!!sibuk} onClick={() => setTanya({ jenis: "terbit", k })}>Terbitkan</button>}
          </div>
        </div>
      ))}
      <p className="catat">Setelah terbit, angka rekap dibekukan. Siswa melihatnya otomatis sekali saat membuka aplikasi, lalu bisa memutar ulang dari Profil. Siswa tanpa tugas yang dikumpulkan semester ini tidak mendapat rekap.</p>
      {galat && <p className="rp-galat" role="alert">{galat}</p>}
      {tanya && (
        <div className="modal-overlay" onClick={() => setTanya(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="rp-tanya-j">
            <h3 id="rp-tanya-j">{tanya.jenis === "terbit" ? `Terbitkan rekap ${tanya.k.label}?` : tanya.jenis === "ulang" ? `Hitung ulang rekap ${tanya.k.label}?` : `Tarik rekap ${tanya.k.label}?`}</h3>
            <p>{tanya.jenis === "terbit"
              ? `Rekap ${tanya.k.jumlah - (tanya.k.kosong?.length || 0)} siswa dibuat dari data sekarang dan langsung muncul saat mereka membuka aplikasi.${tanya.k.sasKurang.length ? ` ${tanya.k.sasKurang.length} siswa belum punya nilai SAS.` : ""}${tanya.k.kosong?.length ? ` ${tanya.k.kosong.length} siswa tanpa aktivitas tidak mendapat rekap.` : ""}`
              : tanya.jenis === "ulang"
                ? "Angka dihitung ulang dari data terbaru, misalnya setelah nilai dikoreksi. Siswa yang sudah melihat tidak akan dimunculkan popup lagi."
                : "Rekap kelas ini dihapus dari aplikasi siswa. Bisa diterbitkan lagi kapan saja."}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setTanya(null)}>Batal</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { const { jenis, k } = tanya; setTanya(null); jalankan(() => jenis === "tarik" ? onTarik(k.jenjang) : onTerbitkan(k.jenjang, jenis === "ulang"), jenis === "tarik" ? "Menarik" : "Menerbitkan"); }}>
                {tanya.jenis === "terbit" ? "Terbitkan" : tanya.jenis === "ulang" ? "Hitung ulang" : "Tarik"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

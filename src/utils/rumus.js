// Astrolab — mesin rumus spreadsheet untuk soal Sandbox Terverifikasi (dipakai komponen & import Excel).
// Murni: tidak membaca DOM, store, atau Firebase.
export const SANDBOX_MAX_GAGAL = 3;

// ───────────────────────── Mesin rumus ─────────────────────────
export const colIdx = s => s.split("").reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
export const colName = i => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
export const addr = (r, c) => colName(c) + (r + 1);
export const parseAddr = a => { const m = String(a).toUpperCase().match(/^([A-Z]+)(\d+)$/); return m ? { r: +m[2] - 1, c: colIdx(m[1]) } : null; };

function tokenize(src) {
  const semi = src.includes(";"); // gaya Excel Indonesia: ; pemisah argumen, , desimal
  const t = []; let i = 0;
  while (i < src.length) {
    const ch = src[i], rest = src.slice(i);
    if (/\s/.test(ch)) { i++; continue; }
    const num = rest.match(semi ? /^\d+(?:[.,]\d+)?/ : /^\d+(?:\.\d+)?/);
    if (num) { t.push({ k: "num", v: parseFloat(num[0].replace(",", ".")) }); i += num[0].length; continue; }
    const fn = rest.match(/^([A-Za-z]+)\s*\(/);
    if (fn && !/^\$?[A-Za-z]{1,2}\$?\d/.test(rest)) { t.push({ k: "fn", v: fn[1].toUpperCase() }); i += fn[0].length; continue; }
    const ref = rest.match(/^\$?([A-Za-z]{1,2})\$?(\d+)(?::\$?([A-Za-z]{1,2})\$?(\d+))?/);
    if (ref) {
      const a = { r: +ref[2] - 1, c: colIdx(ref[1].toUpperCase()) };
      if (ref[3]) t.push({ k: "range", a, b: { r: +ref[4] - 1, c: colIdx(ref[3].toUpperCase()) } });
      else t.push({ k: "ref", a });
      i += ref[0].length; continue;
    }
    if ("+-*/^()".includes(ch)) { t.push({ k: "op", v: ch }); i++; continue; }
    if (ch === "," || ch === ";") { t.push({ k: "sep" }); i++; continue; }
    throw new Error(`karakter "${ch}" tidak dikenal`);
  }
  return t;
}

export const FUNGSI_DIDUKUNG = {
  SUM: v => v.reduce((a, b) => a + b, 0),
  AVERAGE: v => { if (!v.length) throw new Error("AVERAGE tanpa angka"); return v.reduce((a, b) => a + b, 0) / v.length; },
  COUNT: v => v.length,
  MAX: v => (v.length ? Math.max(...v) : 0),
  MIN: v => (v.length ? Math.min(...v) : 0),
  ROUND: v => { const d = v[1] || 0; return Math.round(v[0] * 10 ** d) / 10 ** d; },
  ABS: v => Math.abs(v[0]),
  SQRT: v => { if (v[0] < 0) throw new Error("akar bilangan negatif"); return Math.sqrt(v[0]); },
};

// get(r, c) → angka, atau null untuk sel kosong/teks. info mencatat rujukan & fungsi yang dipakai.
function evaluate(src, get, info) {
  const t = tokenize(src); let p = 0;
  const peek = () => t[p], next = () => t[p++];
  const expect = v => { const x = next(); if (!x || x.k !== "op" || x.v !== v) throw new Error("rumus belum lengkap"); };
  function primary() {
    const x = next();
    if (!x) throw new Error("rumus belum lengkap");
    if (x.k === "num") return x.v;
    if (x.k === "op" && x.v === "-") return -primary();
    if (x.k === "op" && x.v === "+") return primary();
    if (x.k === "op" && x.v === "(") { const v = expr(); expect(")"); return v; }
    if (x.k === "ref") { info.refs++; const v = get(x.a.r, x.a.c); if (v === null) throw new Error(`${addr(x.a.r, x.a.c)} bukan angka`); return v; }
    if (x.k === "range") throw new Error("rentang (A1:B3) hanya bisa dipakai di dalam fungsi");
    if (x.k === "fn") {
      if (!FUNGSI_DIDUKUNG[x.v]) throw new Error(`fungsi ${x.v} belum didukung`);
      info.fns.add(x.v);
      const vals = [];
      if (!(peek() && peek().k === "op" && peek().v === ")")) {
        do {
          const a = peek();
          if (a && a.k === "range") {
            next(); info.refs++;
            for (let r = Math.min(a.a.r, a.b.r); r <= Math.max(a.a.r, a.b.r); r++)
              for (let c = Math.min(a.a.c, a.b.c); c <= Math.max(a.a.c, a.b.c); c++) { const v = get(r, c); if (v !== null) vals.push(v); }
          } else vals.push(expr());
        } while (peek() && peek().k === "sep" && next());
      }
      expect(")");
      return FUNGSI_DIDUKUNG[x.v](vals);
    }
    throw new Error("rumus belum lengkap");
  }
  function power() { let v = primary(); while (peek() && peek().k === "op" && peek().v === "^") { next(); v = v ** primary(); } return v; }
  function term() { let v = power(); while (peek() && peek().k === "op" && "*/".includes(peek().v)) { const o = next().v; const r = power(); if (o === "/" && r === 0) throw new Error("pembagian dengan 0"); v = o === "*" ? v * r : v / r; } return v; }
  function expr() { let v = term(); while (peek() && peek().k === "op" && "+-".includes(peek().v)) { const o = next().v; const r = term(); v = o === "+" ? v + r : v - r; } return v; }
  const v = expr();
  if (p < t.length) throw new Error("ada bagian rumus yang tidak terbaca");
  if (!Number.isFinite(v)) throw new Error("hasil bukan angka");
  return v;
}

// Hitung semua sel jawaban. formulas: { D2: "=B2/C2", ... }. Hasil: { D2: { v, info } | { err, info } }
export function hitungSemua(tabel, jawabanSel, formulas) {
  const ans = new Set(jawabanSel);
  const out = {}, stack = new Set();
  const raw = (r, c) => { const a = addr(r, c); return ans.has(a) ? (formulas[a] ?? "") : (tabel[r]?.[c] ?? ""); };
  const get = (r, c) => {
    const a = addr(r, c);
    if (a in out) return out[a].err ? null : out[a].v;
    const v = raw(r, c);
    if (typeof v === "string" && v.trim().startsWith("=")) {
      if (stack.has(a)) throw new Error("rumus saling merujuk (lingkaran)");
      stack.add(a);
      const info = { refs: 0, fns: new Set() };
      try { out[a] = { v: evaluate(v.trim().slice(1), get, info), info }; }
      catch (e) { out[a] = { err: e.message, info }; }
      stack.delete(a);
      return out[a].err ? null : out[a].v;
    }
    if (v === "" || v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? null : n;
  };
  jawabanSel.forEach(a => { const p = parseAddr(a); if (p) { try { get(p.r, p.c); } catch (e) { out[a] = { err: e.message, info: { refs: 0, fns: new Set() } }; } } });
  return out;
}

// Verifikasi tiga syarat per sel: nilai cocok (toleransi), fungsi wajib dipakai, merujuk sel.
export function verifikasiSandbox(soal, formulas = {}) {
  const jw = soal.jawaban || [];
  const out = hitungSemua(soal.tabel || [], jw.map(j => j.sel), formulas);
  const sel = {};
  let semua = true;
  jw.forEach(j => {
    const f = String(formulas[j.sel] || "").trim(), o = out[j.sel];
    let alasan = null;
    if (!f) alasan = "Belum diisi.";
    else if (!f.startsWith("=")) alasan = "Tulis sebagai rumus, diawali tanda =.";
    else if (!o || o.err) alasan = `Rumus error: ${o?.err || "tidak terbaca"}.`;
    else if (j.harusRujuk !== false && !o.info.refs) alasan = "Gunakan alamat sel, bukan angka yang diketik langsung.";
    else if ((j.fungsi || []).some(fn => !o.info.fns.has(fn))) alasan = `Gunakan fungsi ${(j.fungsi || []).join(", ")}.`;
    else if (Math.abs(o.v - Number(j.nilai)) > (Number(j.toleransi) || 0.01)) alasan = "Hasilnya belum tepat. Cek sel yang kamu rujuk.";
    sel[j.sel] = { ok: !alasan, alasan };
    if (alasan) semua = false;
  });
  return { semua, sel, out };
}

// Geser rujukan relatif sebanyak dr baris (untuk "Isi ke bawah"). Nama fungsi tidak ikut tergeser.
export const geserRumus = (f, dr) => String(f).replace(/(\$?)([A-Za-z]{1,2})(\$?)(\d+)/g, (m, d1, col, d2, row, off, s) => {
  if (/[A-Za-z]/.test(s[off - 1] || "")) return m; // bagian dari nama fungsi, mis. LOG10
  return d2 ? m : `${d1}${col}${d2}${+row + dr}`;
});
export const normal = f => String(f || "").replace(/\s+/g, "").toUpperCase();

// Jumlah butir penilaian satu soal (sandbox + tiap PG lanjutan)
export const jumlahButir = s => (s?.type === "sandbox" ? 1 + (s.lanjutan || []).length : 1);
export const sandboxSelesai = (s, a) => !!a && (a.status === "terverifikasi" || a.status === "dilewati") && (s.lanjutan || []).every((_, k) => a.pg?.[k] !== undefined && a.pg?.[k] !== null);

// Nilai satu soal sandbox → entri soalResults. Verifikasi diulang dari rumus (tidak percaya status saja).
export function nilaiSandbox(soal, ans = {}, origIdx) {
  const formulas = ans.formulas || {};
  const lolos = ans.status !== "dilewati" && verifikasiSandbox(soal, formulas).semua;
  const items = [{
    origIdx, soalId: soal.id, bagian: "sandbox", correct: lolos, poinSoal: Number(soal.poinSandbox) || 0,
    status: lolos ? "terverifikasi" : ans.status === "dilewati" ? "dilewati" : "belum", percobaan: ans.gagal || 0, rumus: formulas,
  }];
  (soal.lanjutan || []).forEach((q, k) => {
    const pick = ans.pg?.[k];
    items.push({ origIdx, soalId: `${soal.id}#${k}`, bagian: k, correct: pick === q.jawaban, pickedAnswer: pick ?? null, poinSoal: Number(q.poin) || 0 });
  });
  return items;
}


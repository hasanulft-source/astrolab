// Astrolab — tipe soal "Sandbox Terverifikasi" (Okt 2026)
// Satu soal = tabel spreadsheet dengan sel jawaban yang harus diisi RUMUS, lalu beberapa pilihan ganda lanjutan.
// Sandbox harus terverifikasi (nilai cocok + fungsi wajib dipakai + merujuk sel) sebelum PG terbuka;
// setelah 3 kali gagal siswa boleh melewati sandbox (poin sandbox 0, PG tetap terbuka).
// Penilaian: sandbox = 1 butir, tiap PG = 1 butir. Hasilnya disimpan sebagai beberapa entri soalResults
// (soalId, soalId#0, soalId#1, ...) supaya rumus nilai & penilaian ulang esai yang lama tetap berlaku.
//
// Bentuk soal di tugas.soal:
// { id, type: "sandbox", pertanyaan, tugas, poin (total), poinSandbox,
//   tabel: [[...baris...]],                         // sel jawaban berisi "" di tabel
//   jawaban: [{ sel: "D2", nilai, toleransi, harusRujuk, fungsi: ["AVERAGE"], rumusKunci: "=B2/C2" }],
//   lanjutan: [{ pertanyaan, opsi: [..], jawaban: 1, poin, pembahasan }] }
import { useState, useRef } from "react";
import { I } from "./icons";
import "../styles/seru.css";
import "../styles/sandbox.css";

import { SANDBOX_MAX_GAGAL, colName, addr, parseAddr, hitungSemua, verifikasiSandbox, geserRumus, normal, jumlahButir } from "../utils/rumus";
export { SANDBOX_MAX_GAGAL, verifikasiSandbox, nilaiSandbox, jumlahButir, sandboxSelesai } from "../utils/rumus";

const fmt = v => (typeof v === "number" ? v.toLocaleString("id-ID", { maximumFractionDigits: 3 }) : v);
const isAnsCell = (soal, a) => (soal.jawaban || []).some(j => j.sel === a);

// ───────────────────────── Tabel (dipakai pemain, review, editor) ─────────────────────────
function Lembar({ soal, formulas = {}, hasil = {}, sel, onCellDown, onCellClick, sorot = new Set(), kunci = false }) {
  const tabel = soal.tabel || [];
  const cols = Math.max(0, ...tabel.map(r => r.length));
  const jwSel = (soal.jawaban || []).map(j => j.sel);
  const isi = kunci ? Object.fromEntries((soal.jawaban || []).map(j => [j.sel, j.rumusKunci || ""])) : formulas;
  const out = hitungSemua(tabel, jwSel, isi);
  return (
    <div className="sbx-wrap">
      <table className="sbx-sheet">
        <thead><tr><th className="rh" />{Array.from({ length: cols }, (_, c) => <th key={c}>{colName(c)}</th>)}</tr></thead>
        <tbody>
          {tabel.map((row, r) => (
            <tr key={r}>
              <th className="rh">{r + 1}</th>
              {Array.from({ length: cols }, (_, c) => {
                const a = addr(r, c), ans = jwSel.includes(a), raw = row[c] ?? "";
                const cls = [];
                let val;
                if (ans) {
                  cls.push("ans", "num");
                  const o = out[a];
                  val = o ? (o.err ? <span className="sbx-err">#ERR</span> : fmt(o.v)) : (isi[a] ? fmt(isi[a]) : "");
                  if (hasil[a]) cls.push(hasil[a].ok ? "ok" : "no");
                } else {
                  val = fmt(raw);
                  if (typeof raw === "number") cls.push("num");
                  else if (r === 0 && raw !== "") cls.push("head");
                }
                if (sel === a) cls.push("sel");
                if (sorot.has(a) && sel !== a) cls.push("hl");
                return (
                  <td key={c} className={cls.join(" ")} data-a={a}
                    onPointerDown={onCellDown ? e => onCellDown(a, e) : undefined}
                    onClick={onCellClick ? () => onCellClick(a) : undefined}>
                    <span className="v">{val}{ans && hasil[a] && <i className="mk">{hasil[a].ok ? "✓" : "!"}</i>}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const rentangDiRumus = f => {
  const s = new Set();
  (String(f).match(/\$?[A-Z]{1,2}\$?\d+(?::\$?[A-Z]{1,2}\$?\d+)?/gi) || []).forEach(rg => {
    const [a, b] = rg.replace(/\$/g, "").toUpperCase().split(":"); const pa = parseAddr(a), pb = parseAddr(b || a);
    if (!pa || !pb) return;
    for (let r = Math.min(pa.r, pb.r); r <= Math.max(pa.r, pb.r); r++) for (let c = Math.min(pa.c, pb.c); c <= Math.max(pa.c, pb.c); c++) s.add(addr(r, c));
  });
  return s;
};

const huruf = i => String.fromCharCode(65 + i);

// ───────────────────────── Pemain (Kerjakan Tugas) ─────────────────────────
// value: { formulas, status: "kerja"|"terverifikasi"|"dilewati", gagal, pg: { 0: 1, ... } }
export function SandboxPlayer({ soal, value, onChange }) {
  const v = { formulas: {}, status: "kerja", gagal: 0, pg: {}, ...(value || {}) };
  const jw = soal.jawaban || [];
  const [sel, setSel] = useState(jw[0]?.sel || null);
  const [cek, setCek] = useState(null); // hasil verifikasi terakhir (untuk umpan balik)
  const inputRef = useRef(null);
  const sisipBaru = useRef(false);
  const kerja = v.status === "kerja";
  const isAns = sel && isAnsCell(soal, sel);
  const rumus = isAns ? (v.formulas[sel] || "") : "";

  const simpan = patch => onChange({ ...v, ...patch });
  const setRumus = (a, f) => { simpan({ formulas: { ...v.formulas, [a]: f } }); setCek(c => (c ? { ...c, sel: { ...c.sel, [a]: undefined } } : c)); };

  const modeTunjuk = () => {
    const el = inputRef.current;
    if (!el || !kerja || !isAns) return false;
    const val = el.value, pos = el.selectionStart ?? val.length;
    return val.startsWith("=") && /[=(+\-*/^:,;]\s*$/.test(val.slice(0, pos));
  };
  const sisip = teks => {
    const el = inputRef.current; if (!el || !kerja || !isAns) return;
    let val = el.value, s = el.selectionStart ?? val.length, e = el.selectionEnd ?? val.length;
    if (!val) { val = "="; s = e = 1; }
    const baru = val.slice(0, s) + teks + val.slice(e);
    setRumus(sel, baru);
    requestAnimationFrame(() => { el.focus(); const c = s + teks.length; el.setSelectionRange(c, c); });
  };

  function onCellDown(a, e) {
    sisipBaru.current = false;
    if (modeTunjuk() && a !== sel) { e.preventDefault(); sisipBaru.current = true; sisip(a); }
  }
  function onCellClick(a) {
    if (sisipBaru.current) { sisipBaru.current = false; return; }
    setSel(a);
    if (kerja && isAnsCell(soal, a)) requestAnimationFrame(() => inputRef.current?.focus());
  }
  function isiKeBawah() {
    if (!isAns || !rumus) return;
    const src = jw.find(j => j.sel === sel), ps = parseAddr(sel);
    const f = { ...v.formulas };
    // isi sel jawaban di bawahnya (kolom sama, berurutan) yang pola kuncinya sama dengan sel ini
    for (let r = ps.r + 1; ; r++) {
      const a = addr(r, ps.c), j = jw.find(x => x.sel === a);
      if (!j) break;
      if (src?.rumusKunci && j.rumusKunci && normal(geserRumus(src.rumusKunci, r - ps.r)) !== normal(j.rumusKunci)) break;
      f[a] = geserRumus(rumus, r - ps.r);
    }
    simpan({ formulas: f });
    setCek(null);
  }
  function periksa() {
    const h = verifikasiSandbox(soal, v.formulas);
    setCek(h);
    if (h.semua) simpan({ status: "terverifikasi" });
    else simpan({ gagal: (v.gagal || 0) + 1 });
  }
  const lewati = () => { simpan({ status: "dilewati" }); setCek(null); };
  const pilih = (k, o) => { if (!kerja) simpan({ pg: { ...v.pg, [k]: o } }); };

  const hasil = kerja ? Object.fromEntries(Object.entries(cek?.sel || {}).filter(([, x]) => x)) : v.status === "terverifikasi" ? Object.fromEntries(jw.map(j => [j.sel, { ok: true }])) : {};
  const salah = cek ? jw.filter(j => cek.sel[j.sel] && !cek.sel[j.sel].ok) : [];
  const fungsiAlat = [...new Set(jw.flatMap(j => j.fungsi || []))];

  return (
    <div className="sbx">
      <div className="sbx-head">
        <span className="sbx-tag">Sandbox</span>
        {v.status === "terverifikasi" ? <span className="sbx-chip gold">Terverifikasi · +{soal.poinSandbox} poin</span>
          : v.status === "dilewati" ? <span className="sbx-chip amber">Dilewati · 0 poin</span>
          : <span className="sbx-chip muted">{soal.poinSandbox} poin</span>}
      </div>
      {soal.tugas && <p className="sbx-task">{soal.tugas}</p>}

      <div className={`sbx-fbar${kerja && isAns ? " on" : ""}`}>
        <span className="ref">{sel || "–"}</span><span className="fx">fx</span>
        <input ref={inputRef} value={isAns ? rumus : ""} disabled={!kerja || !isAns} autoComplete="off" autoCapitalize="off" spellCheck={false}
          placeholder={kerja ? "Pilih sel berwarna, lalu tulis rumus" : ""} aria-label={`Rumus sel ${sel || ""}`}
          onChange={e => setRumus(sel, e.target.value)}
          onKeyDown={e => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const i = jw.findIndex(j => j.sel === sel);
            if (i >= 0 && i < jw.length - 1) setSel(jw[i + 1].sel);
          }} />
      </div>
      {kerja && (
        <div className="sbx-tools" onPointerDown={e => e.target.closest("button") && e.preventDefault()}>
          {fungsiAlat.map(fn => <button key={fn} type="button" onClick={() => sisip(`${fn}(`)}>{fn}(</button>)}
          {["/", "*", "(", ")"].map(op => <button key={op} type="button" onClick={() => sisip(op)}>{op}</button>)}
          <button type="button" className="txt" onClick={isiKeBawah} disabled={!rumus}>Isi ke bawah ↓</button>
          <button type="button" className="txt" onClick={() => isAns && setRumus(sel, "")}>Hapus</button>
        </div>
      )}
      {kerja && <p className="sbx-hint">Saat rumus berakhir dengan <code>=</code>, <code>(</code>, operator, atau <code>:</code>, ketuk sel lain untuk memasukkan alamatnya. Pemisah boleh <code>,</code> atau <code>;</code>.</p>}

      <Lembar soal={soal} formulas={v.formulas} hasil={hasil} sel={sel} onCellDown={onCellDown} onCellClick={onCellClick} sorot={kerja ? rentangDiRumus(rumus) : new Set()} />

      {kerja && salah.length > 0 && (
        <ul className="sbx-fb">
          {salah.map(j => <li key={j.sel}><b>{j.sel}</b><span>{cek.sel[j.sel].alasan}</span></li>)}
          {salah.length < jw.length && <li className="ok"><b>✓</b><span>{jw.length - salah.length} sel lain sudah benar.</span></li>}
        </ul>
      )}
      {v.status === "terverifikasi" && <div className="sbx-banner"><b>Sandbox terverifikasi</b><span>Semua {jw.length} sel benar. Soal analisis di bawah sudah terbuka.</span></div>}
      {v.status === "dilewati" && <div className="sbx-banner amber"><b>Sandbox dilewati</b><span>Poin sandbox 0. Soal analisis di bawah tetap bisa dijawab.</span></div>}
      {kerja && (
        <div className="sbx-actions">
          <button type="button" className="sbx-btn" onClick={periksa}>Periksa sandbox</button>
          {v.gagal > 0 && <span className="sbx-tries">{Array.from({ length: SANDBOX_MAX_GAGAL }, (_, i) => <i key={i} className={i < Math.min(v.gagal, SANDBOX_MAX_GAGAL) ? "on" : ""} />)} {v.gagal} kali belum tepat</span>}
          {v.gagal >= SANDBOX_MAX_GAGAL && <button type="button" className="sbx-btn amber sm" onClick={lewati}>Lewati sandbox</button>}
        </div>
      )}

      {(soal.lanjutan || []).length > 0 && (
        <div className={`sbx-pg${kerja ? " locked" : ""}`}>
          <div className="sbx-head"><span className="sbx-tag">Analisis</span><span className="sbx-aside">{soal.lanjutan.length} soal</span></div>
          {kerja && <div className="sbx-lock"><span><I n="alert" s={14} /> Terbuka setelah sandbox terverifikasi</span></div>}
          <div className="sbx-pg-items">
            {soal.lanjutan.map((q, k) => (
              <div key={k} className="sbx-pq">
                <span className="sbx-no">Analisis {k + 1} · {q.poin} poin</span>
                <p className="sbx-q">{q.pertanyaan}</p>
                {(q.opsi || []).map((o, oi) => (
                  <button key={oi} type="button" className={`quiz-opt${v.pg?.[k] === oi ? " selected" : ""}`} tabIndex={kerja ? -1 : 0} onClick={() => pilih(k, oi)}>
                    <div className="quiz-letter">{huruf(oi)}</div><span style={{ flex: 1 }}>{o}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Review (siswa, setelah tenggat) ─────────────────────────
// results: entri soalResults milik soal ini (bagian "sandbox" + bagian 0..n)
export function SandboxReview({ soal, results = [] }) {
  const sb = results.find(r => r.bagian === "sandbox") || {};
  const formulas = sb.rumus || {};
  const cek = verifikasiSandbox(soal, formulas);
  const [lihatKunci, setLihatKunci] = useState(false);
  return (
    <div className="sbx">
      <div className="sbx-head">
        <span className="sbx-tag">Sandbox</span>
        {sb.correct ? <span className="sbx-chip gold">Terverifikasi · +{soal.poinSandbox} poin</span> : <span className="sbx-chip amber">{sb.status === "dilewati" ? "Dilewati" : "Belum terverifikasi"} · 0 poin</span>}
      </div>
      {soal.tugas && <p className="sbx-task">{soal.tugas}</p>}
      <div className="sbx-tools">
        <button type="button" className={`txt${!lihatKunci ? " on" : ""}`} onClick={() => setLihatKunci(false)}>Rumusmu</button>
        <button type="button" className={`txt${lihatKunci ? " on" : ""}`} onClick={() => setLihatKunci(true)}>Rumus kunci</button>
      </div>
      <Lembar soal={soal} formulas={formulas} hasil={lihatKunci ? {} : cek.sel} kunci={lihatKunci} />
      <ul className="sbx-rumus">
        {(soal.jawaban || []).map(j => (
          <li key={j.sel}><b>{j.sel}</b><code>{lihatKunci ? j.rumusKunci || "–" : formulas[j.sel] || "(kosong)"}</code>{!lihatKunci && <span className={cek.sel[j.sel]?.ok ? "ok" : "no"}>{cek.sel[j.sel]?.ok ? "benar" : cek.sel[j.sel]?.alasan}</span>}</li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── Editor guru (Buat Tugas) ─────────────────────────
// Sumber utama: file Excel (sel yang berisi RUMUS = sel jawaban). Teks & PG lanjutan bisa diedit di sini.
export function SandboxEditor({ q, upQ, importExcel, downloadTemplate }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const lanjutan = q.lanjutan || [];
  const total = s => (Number(s.poinSandbox) || 0) + (s.lanjutan || []).reduce((a, x) => a + (Number(x.poin) || 0), 0);
  const set = patch => { const n = { ...q, ...patch }; upQ(q.id, { ...patch, poin: total(n) }); };
  const setL = (k, patch) => set({ lanjutan: lanjutan.map((x, i) => (i === k ? { ...x, ...patch } : x)) });
  const setJ = (sel, patch) => set({ jawaban: (q.jawaban || []).map(j => (j.sel === sel ? { ...j, ...patch } : j)) });

  async function onFile(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const r = await importExcel(file);
      set({ pertanyaan: r.pertanyaan || q.pertanyaan, tugas: r.tugas || q.tugas || "", poinSandbox: r.poinSandbox ?? q.poinSandbox ?? 20, tabel: r.tabel, jawaban: r.jawaban, lanjutan: r.lanjutan?.length ? r.lanjutan : lanjutan });
      setMsg({ ok: true, text: `Terbaca: ${r.jawaban.length} sel jawaban, ${r.lanjutan?.length || 0} soal analisis.${r.peringatan?.length ? " " + r.peringatan.join(" ") : ""}` });
    } catch (err) { setMsg({ ok: false, text: err.message || "File tidak bisa dibaca." }); }
    finally { setBusy(false); }
  }

  return (
    <div className="sbx-ed">
      <div className="sbx-ed-row">
        <label className="sbx-btn sm">
          {busy ? "Membaca..." : <><I n="upload" s={13} /> {q.tabel?.length ? "Ganti dari Excel" : "Import tabel dari Excel"}</>}
          <input type="file" accept=".xlsx" hidden onChange={onFile} disabled={busy} />
        </label>
        <button type="button" className="sbx-btn outline sm" onClick={downloadTemplate}><I n="download" s={13} /> Template</button>
      </div>
      <p className="sbx-hint">Buat tabel di Excel. Sel yang kamu isi <b>rumus</b> (mis. <code>=B2/C2</code>) otomatis jadi sel jawaban siswa; hasil rumusmu jadi kuncinya. Sheet "Lanjutan" berisi soal analisis.</p>
      {msg && <p className={`sbx-msg${msg.ok ? "" : " bad"}`}>{msg.text}</p>}

      {q.tabel?.length > 0 && <>
        <label className="lbl" style={{ fontSize: 11 }}>Instruksi untuk siswa</label>
        <textarea className="inp" rows={2} value={q.tugas || ""} onChange={e => set({ tugas: e.target.value })} placeholder="mis. Isi D2:D6 dengan rumus massa ÷ volume, lalu D7 dengan AVERAGE." />
        <div className="sbx-ed-row">
          <label className="lbl" style={{ fontSize: 11, margin: 0 }}>Poin sandbox</label>
          <input className="inp" type="number" min={0} style={{ width: 80 }} value={q.poinSandbox ?? 20} onChange={e => set({ poinSandbox: Number(e.target.value) })} />
          <span className="sbx-aside">Total soal ini: {total(q)} poin ({jumlahButir(q)} butir)</span>
        </div>
        <Lembar soal={q} kunci />
        <div className="sbx-keys">
          {(q.jawaban || []).map(j => (
            <div key={j.sel} className="sbx-key">
              <b>{j.sel}</b><code>{j.rumusKunci}</code><span>= {fmt(j.nilai)}</span>
              <span className="sbx-key-fn">
                {[...new Set([...(j.fungsiAsal || []), ...(j.fungsi || [])])].map(fn => (
                  <label key={fn}><input type="checkbox" checked={(j.fungsi || []).includes(fn)} onChange={e => setJ(j.sel, { fungsi: e.target.checked ? [...new Set([...(j.fungsi || []), fn])] : (j.fungsi || []).filter(x => x !== fn) })} /> wajib {fn}</label>
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="sbx-head" style={{ marginTop: 6 }}><span className="sbx-tag">Analisis lanjutan</span><button type="button" className="sbx-btn outline sm" onClick={() => set({ lanjutan: [...lanjutan, { pertanyaan: "", opsi: ["", "", "", ""], jawaban: 0, poin: 10, pembahasan: "" }] })}><I n="plus" s={12} /> Tambah</button></div>
        {lanjutan.length === 0 && <p className="sbx-hint">Belum ada soal analisis. Tambah di sini atau lewat sheet "Lanjutan" di Excel.</p>}
        {lanjutan.map((x, k) => (
          <div key={k} className="sbx-ed-pg">
            <div className="sbx-ed-row">
              <b className="sbx-no">Analisis {k + 1}</b>
              <input className="inp" type="number" min={0} style={{ width: 70 }} value={x.poin} onChange={e => setL(k, { poin: Number(e.target.value) })} title="Poin" /><span className="sbx-aside">poin</span>
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--bad)", marginLeft: "auto" }} onClick={() => set({ lanjutan: lanjutan.filter((_, i) => i !== k) })}>Hapus</button>
            </div>
            <textarea className="inp" rows={2} value={x.pertanyaan} onChange={e => setL(k, { pertanyaan: e.target.value })} placeholder="Pertanyaan analisis..." />
            {x.opsi.map((o, oi) => (
              <div key={oi} className="sbx-ed-row">
                <button type="button" className={`sbx-radio${x.jawaban === oi ? " on" : ""}`} onClick={() => setL(k, { jawaban: oi })} aria-label={`Jadikan ${huruf(oi)} kunci`}>{huruf(oi)}</button>
                <input className="inp" value={o} onChange={e => setL(k, { opsi: x.opsi.map((y, yi) => (yi === oi ? e.target.value : y)) })} placeholder={`Pilihan ${huruf(oi)}`} />
              </div>
            ))}
            <input className="inp" value={x.pembahasan || ""} onChange={e => setL(k, { pembahasan: e.target.value })} placeholder="Pembahasan (opsional)" />
          </div>
        ))}
      </>}
    </div>
  );
}

// Validasi sebelum tugas disimpan. Mengembalikan pesan error atau null.
export function validasiSandbox(q) {
  if (!q.tabel?.length) return "import tabel sandbox dari Excel dulu.";
  if (!q.jawaban?.length) return "tabel belum punya sel jawaban (sel yang berisi rumus).";
  for (const [k, x] of (q.lanjutan || []).entries()) {
    if (!x.pertanyaan?.trim()) return `analisis ${k + 1}: pertanyaan belum diisi.`;
    if ((x.opsi || []).some(o => !String(o).trim())) return `analisis ${k + 1}: ada pilihan yang kosong.`;
  }
  return null;
}

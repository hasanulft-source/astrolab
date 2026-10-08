// Astrolab — Bank Soal (Question Bank)
// Extracted from App.jsx (Wave 5)

import { useState } from "react";
import { I } from '../components/icons';
import { Confirm, Card } from '../components/visual';
import { downloadTemplateSoal, importSoalFromExcel } from '../utils/excel';
import { compressImage } from '../utils/helpers';


// Muncul setelah file Excel di-parse, sebelum soal commit ke Bank Soal.
// Guru pilih Mapel/Kelas/Level yang berlaku untuk SEMUA soal dalam batch ini
// (karena template Excel tidak punya kolom mapel/jenjang per-baris).
function ImportConfirmModal({ soal, store, onClose, onSuccess }) {
  const [mapel, setMapel] = useState("IPA");
  const [jenjang, setJenjang] = useState("VII");
  const [level, setLevel] = useState("sedang");
  const [saving, setSaving] = useState(false);

  // Preview: hitung breakdown tipe soal untuk ditampilkan ke guru
  const tipeCount = {};
  soal.forEach(s => { tipeCount[s.type] = (tipeCount[s.type] || 0) + 1; });
  const tipeLabel = { pg: "Pilihan Ganda", tf: "Benar/Salah", komplex: "PG Kompleks", pasang: "Pasangkan", excel: "Excel Sandbox", essay: "Essay", pseudocode: "Pseudocode Trace", debug: "Debug Challenge", refleksi: "Refleksi" };

  async function handleConfirm() {
    setSaving(true);
    try {
      const bankSoalList = soal.map(s => {
        const base = { mapel, jenjang, level, type: s.type === "komplex" ? "kompleks" : s.type === "pasang" ? "pasangkan" : s.type, pertanyaan: s.pertanyaan, gambar: null, tags: (s.tags && s.tags.length) ? s.tags : ["import"], pembahasan: s.pembahasan || "" };
        if (s.type === "pg") return { ...base, opsi: s.opsi, jawaban: s.jawaban };
        if (s.type === "tf") return { ...base, jawaban: s.jawaban };
        if (s.type === "komplex") {
          const benarOpsi = (s.opsi || []).map((_, i) => (s.jawaban || []).includes(i));
          return { ...base, opsi: s.opsi, benarOpsi };
        }
        if (s.type === "pasang") {
          const pasangan = (s.kiri || []).map((k, i) => [k, (s.kanan || [])[i] || ""]);
          return { ...base, pasangan };
        }
        if (s.type === "excel") return { ...base, headers: s.headers, table: s.table, opsi: s.opsi, jawaban: s.jawaban };
        if (s.type === "essay") return { ...base, kataKunci: s.kataKunci || "", panduanNilai: s.panduanNilai || "" };
        if (s.type === "pseudocode") return { ...base, kode: s.kode, jawabanBenar: s.jawabanBenar };
        if (s.type === "debug") return { ...base, kodeBuggy: s.kodeBuggy, barisBug: s.barisBug, perbaikanBenar: s.perbaikanBenar };
        if (s.type === "refleksi") return { ...base, labelKolom1: s.labelKolom1, labelKolom2: s.labelKolom2, labelKolom3: s.labelKolom3, labelKolom4: s.labelKolom4, panduanNilai: s.panduanNilai || "" };
        return base;
      });
      await store.addBankSoalBulk(bankSoalList);
      onSuccess(bankSoalList.length);
    } catch (err) {
      alert("Gagal import: " + (err?.message || "coba lagi"));
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3>Konfirmasi Import</h3>
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14 }}>
          <b>{soal.length} soal</b> siap diimport ke Bank Soal. Pilih Mapel, Kelas, dan Level yang berlaku untuk semua soal ini.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, padding: "10px 12px", background: "var(--surface-alt)", borderRadius: 8, fontSize: 12 }}>
          {Object.entries(tipeCount).map(([t, n]) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--ink-2)" }}>{tipeLabel[t] || t}</span>
              <span style={{ fontWeight: 700, fontFamily: "var(--mono)" }}>{n}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label className="lbl">Mapel</label>
            <select className="inp" value={mapel} onChange={e => setMapel(e.target.value)}>
              <option value="IPA">IPA</option>
              <option value="Informatika">Informatika</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl">Kelas</label>
            <select className="inp" value={jenjang} onChange={e => setJenjang(e.target.value)}>
              <option value="VII">VII</option>
              <option value="VIII">VIII</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl">Level</label>
            <select className="inp" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="mudah">Mudah</option>
              <option value="sedang">Sedang</option>
              <option value="sulit">Sulit</option>
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleConfirm} disabled={saving}>
            {saving ? "Mengimport..." : `Import ${soal.length} Soal`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BankSoal({ store, navigate }) {
  const [filterMapel, setFilterMapel] = useState("semua");
  const [filterJenjang, setFilterJenjang] = useState("semua");
  const [filterLevel, setFilterLevel] = useState("semua");
  const [filterTag, setFilterTag] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState("");
  const [pendingImport, setPendingImport] = useState(null); // { soal: [...] } — nunggu konfirmasi mapel/jenjang/level

  const soalList = store.getBankSoal();

  // Filter & search
  const filtered = soalList.filter(s => {
    if (filterMapel !== "semua" && s.mapel !== filterMapel) return false;
    if (filterJenjang !== "semua" && s.jenjang !== filterJenjang) return false;
    if (filterLevel !== "semua" && s.level !== filterLevel) return false;
    if (filterTag && !(s.tags || []).some(t => t.toLowerCase().includes(filterTag.toLowerCase()))) return false;
    if (search && !s.pertanyaan.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Collect all tags
  const allTags = [...new Set(soalList.flatMap(s => s.tags || []))];

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  // Handler shared untuk kedua tombol Import (desktop & mobile topbar) — parse file lalu
  // buka modal konfirmasi mapel/jenjang/level, gak langsung commit ke Bank Soal.
  async function handleImportFile(file, resetInput) {
    if (!file) return;
    try {
      const imported = await importSoalFromExcel(file);
      if (!imported.length) { showToast("Tidak ada soal yang valid di file."); resetInput?.(); return; }
      setPendingImport({ soal: imported });
    } catch (err) {
      showToast("Gagal membaca file: " + (err?.message || "format tidak dikenali"));
    }
    resetInput?.();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await store.deleteBankSoal(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Soal dihapus.");
    } catch (e) {
      showToast("Gagal menghapus soal: " + (e?.message || "coba lagi"));
    }
  }

  return (
    <div className="page">
      <div className="dt">
        <div>
          <h1>Bank Soal</h1>
          <p>Kelola koleksi soal untuk dipakai ulang di tugas</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplateSoal} title="Download template Excel">
            <I n="chartBar" s={13} /> Template
          </button>
          <label className="btn btn-outline btn-sm" style={{ cursor: "pointer", margin: 0 }} title="Import dari Excel">
            <I n="upload" s={13} /> Import
            <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => handleImportFile(e.target.files[0], () => { e.target.value = ""; })} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditTarget(null); setShowForm(true); }}>
            <I n="plus" s={13} /> Tambah
          </button>
        </div>
      </div>

      <div className="topbar">
        <div style={{ width: 36 }} />
        <div className="topbar-title">Bank Soal</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplateSoal} title="Template"><I n="chartBar" s={13} /></button>
          <label className="btn btn-outline btn-sm" style={{ cursor: "pointer", margin: 0, padding: "6px 10px" }} title="Import">
            <I n="upload" s={13} />
            <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => handleImportFile(e.target.files[0], () => { e.target.value = ""; })} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditTarget(null); setShowForm(true); }}><I n="plus" s={13} /></button>
        </div>
      </div>

      {toast && <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: "var(--shadow)" }}>{toast}</div>}
      {deleteTarget && <Confirm title="Hapus soal?" desc={deleteTarget.pertanyaan.slice(0, 80) + "..."} onOk={handleDelete} onCancel={() => setDeleteTarget(null)} />}
      {showForm && <BankSoalForm store={store} editTarget={editTarget} onClose={() => { setShowForm(false); setEditTarget(null); }} onSuccess={() => { setShowForm(false); setEditTarget(null); showToast(editTarget ? "Soal diupdate." : "Soal ditambahkan."); }} />}
      {pendingImport && <ImportConfirmModal soal={pendingImport.soal} store={store} onClose={() => setPendingImport(null)} onSuccess={(count) => { setPendingImport(null); showToast(`${count} soal berhasil diimport!`); }} />}

      {/* Filter bar */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="inp" placeholder="🔍 Cari pertanyaan..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <select className="inp" style={{ flex: "1 1 110px", maxWidth: 180 }} value={filterMapel} onChange={e => setFilterMapel(e.target.value)}>
              <option value="semua">Semua Mapel</option>
              <option value="IPA">IPA</option>
              <option value="Informatika">Informatika</option>
            </select>
            <select className="inp" style={{ flex: "1 1 110px", maxWidth: 180 }} value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)}>
              <option value="semua">Semua Kelas</option>
              <option value="VII">Kelas VII</option>
              <option value="VIII">Kelas VIII</option>
            </select>
            <select className="inp" style={{ flex: "1 1 110px", maxWidth: 180 }} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
              <option value="semua">Semua Level</option>
              <option value="mudah">Mudah</option>
              <option value="sedang">Sedang</option>
              <option value="sulit">Sulit</option>
            </select>
            <input className="inp" style={{ flex: "1 1 110px", maxWidth: 180 }} placeholder="Filter tag..." value={filterTag} onChange={e => setFilterTag(e.target.value)} />
          </div>
          {allTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allTags.slice(0, 15).map(t => (
                <button key={t} onClick={() => setFilterTag(t)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 99, border: "1px solid var(--line)", background: filterTag === t ? "var(--accent-tint)" : "var(--surface)", color: filterTag === t ? "var(--accent-2)" : "var(--ink-2)", fontWeight: 600, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
        {filtered.length} dari {soalList.length} soal
      </div>

      {filtered.length === 0
        ? <Card><div className="empty empty-box"><I n="book" s={32} /><h3>Belum ada soal</h3><p>Tambah soal pertama atau ubah filter.</p></div></Card>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(s => (
              <Card key={s.id} pad="sm">
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                      <span className="chip chip-info" style={{ fontSize: 10 }}>{s.mapel}</span>
                      <span className="chip" style={{ fontSize: 10, background: "var(--accent-tint)", color: "var(--accent-2)" }}>Kelas {s.jenjang}</span>
                      <span className="chip" style={{ fontSize: 10, background: s.level === "mudah" ? "#d1fae5" : s.level === "sedang" ? "#fef3c7" : "#fee2e2", color: s.level === "mudah" ? "#065f46" : s.level === "sedang" ? "#713f12" : "#991b1b" }}>{s.level}</span>
                      <span className="chip" style={{ fontSize: 10, background: "var(--surface-alt)" }}>{s.type === "pg" ? "Pilihan Ganda" : s.type === "tf" ? "Benar/Salah" : s.type === "kompleks" ? "PG Kompleks" : s.type === "excel" ? "Excel Sandbox" : s.type === "essay" ? "Essay" : s.type === "pseudocode" ? "Pseudocode Trace" : s.type === "debug" ? "Debug Challenge" : s.type === "refleksi" ? "Refleksi" : "Pasangkan"}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.pertanyaan}</div>
                    {(s.tags || []).length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                        {s.tags.map(t => <span key={t} style={{ fontSize: 10, color: "var(--ink-3)" }}>#{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-soft btn-sm" style={{ fontSize: 11 }} onClick={() => { setEditTarget(s); setShowForm(true); }}><I n="edit" s={12} /></button>
                    <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }} onClick={() => setDeleteTarget(s)}><I n="trash" s={12} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
      }
    </div>
  );
}

function BankSoalForm({ store, editTarget, onClose, onSuccess }) {
  const init = editTarget || {
    mapel: "IPA", jenjang: "VII", level: "sedang", type: "pg",
    pertanyaan: "", gambar: null, opsi: ["", "", "", ""], jawaban: 0,
    benarOpsi: [false, false, false, false], // untuk kompleks
    pasangan: [["", ""], ["", ""], ["", ""], ["", ""]], // untuk pasangkan
    headers: ["Nama", "Nilai"], table: [["Budi", "85"], ["Sari", "92"], ["Andi", "78"]], // untuk excel
    kataKunci: "", panduanNilai: "", // untuk essay
    pembahasan: "", tags: [],
  };
  const [form, setForm] = useState(init);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addTag() {
    if (!tagInput.trim()) return;
    const newTag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if ((form.tags || []).includes(newTag)) return;
    set("tags", [...(form.tags || []), newTag]);
    setTagInput("");
  }

  function removeTag(t) { set("tags", (form.tags || []).filter(x => x !== t)); }

  async function submit() {
    if (!form.pertanyaan.trim()) return;
    setSaving(true);
    setSubmitErr("");
    try {
      const data = {
        mapel: form.mapel, jenjang: form.jenjang, level: form.level, type: form.type,
        pertanyaan: form.pertanyaan.trim(),
        gambar: form.gambar || null,
        tags: form.tags || [],
        pembahasan: form.pembahasan.trim(),
      };
      if (form.type === "pg") { data.opsi = form.opsi; data.jawaban = form.jawaban; }
      else if (form.type === "tf") { data.jawaban = form.jawaban; }
      else if (form.type === "kompleks") { data.opsi = form.opsi; data.benarOpsi = form.benarOpsi; }
      else if (form.type === "pasangkan") { data.pasangan = form.pasangan; }
      else if (form.type === "excel") { data.headers = form.headers; data.table = form.table; data.opsi = form.opsi; data.jawaban = form.jawaban; }
      else if (form.type === "essay") { data.kataKunci = form.kataKunci || ""; data.panduanNilai = form.panduanNilai || ""; }
      if (editTarget) await store.updateBankSoal(editTarget.id, data);
      else await store.addBankSoal(data);
      onSuccess();
    } catch (e) {
      setSubmitErr(e?.message?.includes("PERMISSION_DENIED")
        ? "Akses ditolak. Firebase Rules belum diupdate untuk Bank Soal."
        : "Gagal menyimpan: " + (e?.message || "error tidak diketahui"));
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <h3>{editTarget ? "Edit Soal" : "Tambah Soal Baru"}</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="fg" style={{ flex: 1 }}>
              <label className="lbl">Mapel</label>
              <select className="inp" value={form.mapel} onChange={e => set("mapel", e.target.value)}>
                <option value="IPA">IPA</option>
                <option value="Informatika">Informatika</option>
              </select>
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label className="lbl">Kelas</label>
              <select className="inp" value={form.jenjang} onChange={e => set("jenjang", e.target.value)}>
                <option value="VII">VII</option>
                <option value="VIII">VIII</option>
              </select>
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label className="lbl">Level</label>
              <select className="inp" value={form.level} onChange={e => set("level", e.target.value)}>
                <option value="mudah">Mudah</option>
                <option value="sedang">Sedang</option>
                <option value="sulit">Sulit</option>
              </select>
            </div>
          </div>

          <div className="fg">
            <label className="lbl">Tipe Soal</label>
            <select className="inp" value={form.type} onChange={e => set("type", e.target.value)}>
              <option value="pg">Pilihan Ganda</option>
              <option value="tf">Benar / Salah</option>
              <option value="kompleks">PG Kompleks (multi jawab)</option>
              <option value="pasangkan">Pasangkan</option>
              <option value="excel">Excel Sandbox (Informatika)</option>
              <option value="essay">Essay (jawaban panjang)</option>
            </select>
          </div>

          <div className="fg">
            <label className="lbl">Pertanyaan</label>
            <textarea className="inp" rows={3} value={form.pertanyaan} onChange={e => set("pertanyaan", e.target.value)} placeholder="Tulis pertanyaan..." />
          </div>

          {/* Gambar (opsional) */}
          <div className="fg">
            <label className="lbl">Gambar (opsional)</label>
            {form.gambar ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={form.gambar} alt="" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, border: "1px solid var(--line)" }} />
                <button type="button" onClick={() => set("gambar", null)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>×</button>
              </div>
            ) : (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1.5px dashed var(--line)", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "var(--ink-2)" }}>
                <I n="plus" s={12} /> Tambah Gambar
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                  const file = e.target.files[0]; if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { alert("Gambar maksimal 5MB"); return; }
                  const compressed = await compressImage(file, 800, 0.7);
                  set("gambar", compressed);
                }} />
              </label>
            )}
          </div>

          {/* PG */}
          {form.type === "pg" && (
            <div className="fg">
              <label className="lbl">Opsi (centang yang benar)</label>
              {form.opsi.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <input type="radio" checked={form.jawaban === i} onChange={() => set("jawaban", i)} />
                  <input className="inp" value={opt} onChange={e => set("opsi", form.opsi.map((o, j) => j === i ? e.target.value : o))} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
          )}

          {/* TF */}
          {form.type === "tf" && (
            <div className="fg">
              <label className="lbl">Jawaban</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className={`btn btn-sm ${form.jawaban === 1 ? "btn-primary" : "btn-outline"}`} style={{ flex: 1 }} onClick={() => set("jawaban", 1)}>Benar</button>
                <button type="button" className={`btn btn-sm ${form.jawaban === 0 ? "btn-primary" : "btn-outline"}`} style={{ flex: 1 }} onClick={() => set("jawaban", 0)}>Salah</button>
              </div>
            </div>
          )}

          {/* Kompleks */}
          {form.type === "kompleks" && (
            <div className="fg">
              <label className="lbl">Opsi (centang semua yang benar)</label>
              {form.opsi.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={form.benarOpsi[i]} onChange={() => set("benarOpsi", form.benarOpsi.map((b, j) => j === i ? !b : b))} />
                  <input className="inp" value={opt} onChange={e => set("opsi", form.opsi.map((o, j) => j === i ? e.target.value : o))} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
          )}

          {/* Pasangkan */}
          {form.type === "pasangkan" && (
            <div className="fg">
              <label className="lbl">Pasangan</label>
              {form.pasangan.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input className="inp" value={p[0]} onChange={e => set("pasangan", form.pasangan.map((x, j) => j === i ? [e.target.value, x[1]] : x))} placeholder="Kiri" />
                  <span style={{ alignSelf: "center", color: "var(--ink-3)" }}>↔</span>
                  <input className="inp" value={p[1]} onChange={e => set("pasangan", form.pasangan.map((x, j) => j === i ? [x[0], e.target.value] : x))} placeholder="Kanan" />
                </div>
              ))}
            </div>
          )}

          {/* Excel Sandbox */}
          {form.type === "excel" && (
            <div className="fg">
              <label className="lbl">Tabel Data + Opsi PG</label>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>Siswa akan menggunakan rumus pada tabel ini, lalu pilih jawaban PG.</div>

              {/* Headers */}
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600 }}>Header Kolom:</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {(form.headers || []).map((h, hi) => (
                  <div key={hi} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{String.fromCharCode(65 + hi)}</span>
                    <input className="inp" style={{ fontSize: 12, padding: "5px 8px", width: 100 }} value={h} placeholder={`Kolom ${hi + 1}`} onChange={e => { const h2 = [...form.headers]; h2[hi] = e.target.value; set("headers", h2); }} />
                    {form.headers.length > 1 && <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "2px 6px" }} onClick={() => {
                      set("headers", form.headers.filter((_, i) => i !== hi));
                      set("table", form.table.map(row => row.filter((_, i) => i !== hi)));
                    }}><I n="x" s={11} /></button>}
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => {
                  set("headers", [...form.headers, `Kolom ${form.headers.length + 1}`]);
                  set("table", form.table.map(row => [...row, ""]));
                }}><I n="plus" s={11} /> Kolom</button>
              </div>

              {/* Table data */}
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600 }}>Data:</div>
              <div style={{ overflowX: "auto", marginBottom: 10, border: "1px solid var(--line)", borderRadius: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-alt)" }}>
                      <th style={{ padding: "4px 8px", fontSize: 10, color: "var(--ink-3)", borderRight: "1px solid var(--line)", width: 30 }}>#</th>
                      {(form.headers || []).map((h, hi) => <th key={hi} style={{ padding: "4px 8px", fontSize: 10, fontWeight: 700, borderRight: "1px solid var(--line)" }}>{String.fromCharCode(65 + hi)} · {h}</th>)}
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.table || []).map((row, ri) => (
                      <tr key={ri}>
                        <td style={{ padding: "4px 8px", textAlign: "center", color: "var(--ink-3)", borderRight: "1px solid var(--line)", borderTop: "1px solid var(--line)", fontFamily: "var(--mono)" }}>{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ borderRight: "1px solid var(--line)", borderTop: "1px solid var(--line)" }}>
                            <input style={{ width: "100%", border: "none", padding: "5px 8px", fontSize: 12, background: "transparent", outline: "none" }} value={cell} onChange={e => {
                              const t2 = form.table.map((r, i) => i === ri ? r.map((c, j) => j === ci ? e.target.value : c) : r);
                              set("table", t2);
                            }} />
                          </td>
                        ))}
                        <td style={{ borderTop: "1px solid var(--line)", textAlign: "center" }}>
                          {form.table.length > 1 && <button type="button" onClick={() => set("table", form.table.filter((_, i) => i !== ri))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 12 }}>×</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, marginBottom: 12 }} onClick={() => set("table", [...form.table, new Array(form.headers.length).fill("")])}><I n="plus" s={11} /> Tambah Baris</button>

              {/* Opsi PG */}
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600 }}>Opsi Jawaban PG (centang yang benar):</div>
              {form.opsi.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <input type="radio" checked={form.jawaban === i} onChange={() => set("jawaban", i)} />
                  <input className="inp" value={opt} onChange={e => set("opsi", form.opsi.map((o, j) => j === i ? e.target.value : o))} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
          )}

          {/* Essay */}
          {form.type === "essay" && (
            <div className="fg">
              <label className="lbl">Essay (dinilai manual)</label>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>Jawaban siswa akan dinilai manual oleh guru.</div>
              <input className="inp" style={{ marginBottom: 8 }} value={form.kataKunci || ""} onChange={e => set("kataKunci", e.target.value)} placeholder="Kata kunci jawaban (pisah dengan koma)" />
              <textarea className="inp" rows={2} value={form.panduanNilai || ""} onChange={e => set("panduanNilai", e.target.value)} placeholder="Panduan penilaian (mis: 100 jika lengkap, 70 jika hanya konsep dasar)" />
            </div>
          )}

          <div className="fg">
            <label className="lbl">Pembahasan (opsional)</label>
            <textarea className="inp" rows={2} value={form.pembahasan} onChange={e => set("pembahasan", e.target.value)} placeholder="Penjelasan jawaban..." />
          </div>

          <div className="fg">
            <label className="lbl">Tags (mis: bab-3, UTS, energi)</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input className="inp" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Ketik tag, tekan Enter" />
              <button type="button" className="btn btn-outline btn-sm" onClick={addTag}>+ Tag</button>
            </div>
            {(form.tags || []).length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {form.tags.map(t => (
                  <span key={t} style={{ fontSize: 11, padding: "3px 8px", background: "var(--accent-tint)", color: "var(--accent-2)", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    #{t} <button type="button" onClick={() => removeTag(t)} style={{ background: "none", border: "none", color: "var(--accent-2)", cursor: "pointer", padding: 0, fontSize: 12 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {submitErr && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--bad-bg)", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 12, color: "var(--bad)" }}>
            ⚠ {submitErr}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving || !form.pertanyaan.trim()}>
            {saving ? "Menyimpan..." : editTarget ? "Update" : "Tambah"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PilihDariBankSoalModal({ store, defaultMapel, defaultJenjang, onClose, onSelect }) {
  const [filterMapel, setFilterMapel] = useState(defaultMapel || "semua");
  const [filterJenjang, setFilterJenjang] = useState(defaultJenjang || "semua");
  const [filterLevel, setFilterLevel] = useState("semua");
  const [filterTag, setFilterTag] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());

  const soalList = store.getBankSoal();
  const filtered = soalList.filter(s => {
    if (filterMapel !== "semua" && s.mapel !== filterMapel) return false;
    if (filterJenjang !== "semua" && s.jenjang !== filterJenjang) return false;
    if (filterLevel !== "semua" && s.level !== filterLevel) return false;
    if (filterTag && !(s.tags || []).some(t => t.toLowerCase().includes(filterTag.toLowerCase()))) return false;
    if (search && !s.pertanyaan.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const allTags = [...new Set(soalList.flatMap(s => s.tags || []))];

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function selectAll() { setSelected(new Set(filtered.map(s => s.id))); }
  function clearAll() { setSelected(new Set()); }

  function handleSelect() {
    const picked = soalList.filter(s => selected.has(s.id));
    onSelect(picked);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <h3>Pilih Soal dari Bank</h3>
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>Centang soal yang ingin dipakai di tugas ini</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          <input className="inp" placeholder="🔍 Cari pertanyaan..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: "flex", gap: 6 }}>
            <select className="inp" style={{ flex: 1 }} value={filterMapel} onChange={e => setFilterMapel(e.target.value)}>
              <option value="semua">Semua Mapel</option>
              <option value="IPA">IPA</option>
              <option value="Informatika">Informatika</option>
            </select>
            <select className="inp" style={{ flex: 1 }} value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)}>
              <option value="semua">Semua Kelas</option>
              <option value="VII">VII</option>
              <option value="VIII">VIII</option>
            </select>
            <select className="inp" style={{ flex: 1 }} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
              <option value="semua">Semua Level</option>
              <option value="mudah">Mudah</option>
              <option value="sedang">Sedang</option>
              <option value="sulit">Sulit</option>
            </select>
          </div>
          <input className="inp" placeholder="🏷️ Filter tag..." value={filterTag} onChange={e => setFilterTag(e.target.value)} />
          {allTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allTags.slice(0, 15).map(t => (
                <button key={t} onClick={() => setFilterTag(filterTag === t ? "" : t)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 99, border: "1px solid var(--line)", background: filterTag === t ? "var(--accent-tint)" : "var(--surface)", color: filterTag === t ? "var(--accent-2)" : "var(--ink-2)", fontWeight: 600, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "var(--ink-3)" }}>
            <span>{selected.size} dipilih dari {filtered.length} soal</span>
            <button onClick={selectAll} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>Pilih semua</button>
            {selected.size > 0 && <button onClick={clearAll} style={{ background: "none", border: "none", color: "var(--bad)", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>Clear</button>}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
          {filtered.length === 0
            ? <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>Tidak ada soal yang cocok dengan filter.</div>
            : filtered.map(s => (
              <div key={s.id} onClick={() => toggle(s.id)} style={{ padding: "10px 12px", borderBottom: "1px solid var(--line-soft)", cursor: "pointer", background: selected.has(s.id) ? "var(--accent-tint)" : "transparent", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} onClick={e => e.stopPropagation()} style={{ marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, padding: "1px 6px", background: "var(--surface-alt)", color: "var(--ink-2)", borderRadius: 4 }}>{s.type === "pg" ? "PG" : s.type === "tf" ? "TF" : s.type === "kompleks" ? "Kompleks" : s.type === "excel" ? "Excel" : s.type === "essay" ? "Essay" : "Pasangkan"}</span>
                    <span style={{ fontSize: 10, padding: "1px 6px", background: s.level === "mudah" ? "#d1fae5" : s.level === "sedang" ? "#fef3c7" : "#fee2e2", color: s.level === "mudah" ? "#065f46" : s.level === "sedang" ? "#713f12" : "#991b1b", borderRadius: 4 }}>{s.level}</span>
                    <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{s.mapel} · {s.jenjang}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>{s.pertanyaan}</div>
                </div>
              </div>
            ))
          }
        </div>

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={handleSelect} disabled={selected.size === 0}>
            Tambah {selected.size} Soal ke Tugas
          </button>
        </div>
      </div>
    </div>
  );
}

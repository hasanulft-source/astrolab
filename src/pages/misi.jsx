// Astrolab — Mission Mode (siswa), redesign Fase 2 (Okt 2026)
// Halaman (rute "mission") dan modal (dari Beranda). Logika kehadiran & isi pesan ke guru SAMA dengan versi lama
// di App.jsx — termasuk perbedaan format pesan antara halaman (teks) dan modal (kartu "mission-attendance").
// Yang berubah: tampilan memakai teal Astrolab, tidak lagi palet khusus Mission.
import { useState } from "react";
import { I } from "../components/icons";
import { withTimeout, getFirstName } from "../utils/helpers";
import { ConfettiRain } from "../components/visual";
import { Page, TopBar, PageHeader, Card, Items, Item, Button, Meter, StatusChip } from "../components/ui";
import "../styles/siswa.css";

export function labelMisi(misi, store) {
  if (misi.tipe === "tugas") { const t = store.getTugas().find(x => x.id === misi.refId); return t ? t.judul : "(tugas terhapus)"; }
  const m = store.getMateriList().find(x => x.id === misi.refId); return m ? m.judul : "(materi terhapus)";
}

function useMisi(user, store) {
  const mission = store.getMission(user.jenjang);
  const misi = [...(mission?.misi || [])].sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
  const wajib = misi.filter(m => m.wajib);
  const wajibSelesai = wajib.filter(m => store.isMisiSelesai(m, user.id)).length;
  const sessionId = mission?.sessionId;
  const sudahHadir = mission ? store.hasAttended(user.jenjang, sessionId, user.id) : false;
  return { mission, misi, wajib, wajibSelesai, sessionId, sudahHadir };
}

const tglJam = () => {
  const now = new Date();
  return { tgl: now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), jam: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) };
};

function DaftarMisi({ misi, store, user, onOpen }) {
  return (
    <Items>
      {misi.map(m => {
        const selesai = store.isMisiSelesai(m, user.id);
        return (
          <Item key={m.key} icon={<I n={selesai ? "check" : m.tipe === "tugas" ? "fileText" : "book"} s={16} />} tone={selesai ? "muted" : "teal"} dim={selesai}
            title={labelMisi(m, store)} badge={selesai ? <StatusChip>Selesai</StatusChip> : null}
            meta={`${m.tipe === "tugas" ? "Tugas" : "Materi"} · ${m.wajib ? "Wajib" : "Opsional"}`}
            end={<I n="chevR" s={16} style={{ color: "var(--ink-4)" }} />} onClick={() => onOpen(m)} />
        );
      })}
    </Items>
  );
}

// ─── Halaman (rute "mission") ───
export function MisiSiswa({ user, store, navigate }) {
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const { mission, misi, wajib, wajibSelesai, sessionId, sudahHadir } = useMisi(user, store);
  if (!mission || !mission.active) {
    return (
      <div className="sw"><Page>
        <Card center><div className="ui-empty"><I n="target" s={28} /><div className="ui-title">Mission Mode tidak aktif</div><p className="ui-text">Belum ada misi untuk kelasmu saat ini.</p><Button onClick={() => navigate("home")}>Kembali ke Beranda</Button></div></Card>
      </Page></div>
    );
  }
  const open = m => (m.tipe === "tugas" ? navigate("tugas-detail", { tugasId: m.refId }) : navigate("latihan-mandiri"));
  async function hadir() {
    if (sending || sudahHadir) return;
    setSending(true); setErr("");
    const lengkap = wajib.length > 0 && wajibSelesai === wajib.length;
    try {
      const res = await store.markAttendance(user.jenjang, sessionId, { nama: user.nama, kelas: user.kelas || `Kelas ${user.jenjang}`, selesaiWajib: wajibSelesai, totalWajib: wajib.length, lengkap });
      if (!res.already) {
        const { tgl, jam } = tglJam();
        const guruId = store.fbGuru?.id || "fata";
        const text = `📍 KONFIRMASI KEHADIRAN — MISSION MODE\n\nNama: ${user.nama}\nKelas: ${user.kelas || `Kelas ${user.jenjang}`}\nTanggal: ${tgl}\nMisi wajib selesai: ${wajibSelesai}/${wajib.length}\nStatus misi: ${lengkap ? "selesai" : "belum selesai"}\nWaktu konfirmasi: ${jam}`;
        try { await withTimeout(store.sendMessage(user.id, guruId, text)); }
        catch { setErr("Kehadiran tercatat, tapi notifikasi chat ke guru gagal terkirim."); }
      }
    } catch (e) { setErr("Gagal mengirim kehadiran: " + (e?.message || "coba lagi")); }
    finally { setSending(false); }
  }

  return (
    <div className="sw">
      <TopBar title="Mission Mode" onBack={() => navigate("home")} />
      <Page>
        <PageHeader eyebrow="Mission Mode aktif" title={mission.judul || "Misi hari ini"} subtitle="Selesaikan misi wajib untuk memenuhi pembelajaran hari ini." />
        {mission.instruksi && <Card label="Petunjuk"><p className="ui-text sw-desc">{mission.instruksi}</p></Card>}
        <Card label="Misi wajib" aside={`${wajibSelesai}/${wajib.length} selesai`}>
          <Meter value={wajibSelesai} max={wajib.length || 1} label={`${wajibSelesai} dari ${wajib.length} misi wajib selesai`} />
          <DaftarMisi misi={misi} store={store} user={user} onOpen={open} />
        </Card>
        {err && <p className="ui-text" style={{ color: "var(--bad)" }}>{err}</p>}
        {sudahHadir
          ? <p className="sw-wait"><I n="checkCircle" s={15} /> Kehadiran sudah dikonfirmasi ke guru.</p>
          : <Button full disabled={sending} onClick={hadir}>{sending ? "Mengirim..." : <><I n="flag" s={15} /> Konfirmasi hadir</>}</Button>}
        {!sudahHadir && wajib.length > 0 && wajibSelesai < wajib.length && <p className="rk-note">Kamu tetap bisa konfirmasi hadir meski misi wajib belum selesai. Statusnya tercatat.</p>}
      </Page>
    </div>
  );
}

// ─── Modal (dibuka dari Beranda) ───
export function MisiModal({ user, store, navigate, onClose }) {
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const { mission, misi, wajib, wajibSelesai, sessionId, sudahHadir } = useMisi(user, store);
  if (!mission || !mission.active) return null;
  // Kehadiran = misi wajib pertama
  const total = wajib.length + 1;
  const done = (sudahHadir ? 1 : 0) + wajibSelesai;
  const allDone = sudahHadir && wajibSelesai === wajib.length;
  const open = m => { onClose(); m.tipe === "tugas" ? navigate("tugas-detail", { tugasId: m.refId }) : navigate("latihan-mandiri"); };
  async function hadir() {
    if (sending || sudahHadir) return;
    setSending(true); setErr("");
    try {
      const kelas = user.kelas || `Kelas ${user.jenjang}`;
      const res = await store.markAttendance(user.jenjang, sessionId, { nama: user.nama, kelas });
      if (!res.already) {
        const { tgl, jam } = tglJam();
        const guruId = store.fbGuru?.id || "fata";
        const text = `📍 Konfirmasi kehadiran Mission Mode — ${user.nama} (${kelas}), ${tgl} ${jam}.`;
        try { await withTimeout(store.sendMessage(user.id, guruId, text, { type: "mission-attendance", meta: { nama: user.nama, kelas, tgl, jam } })); }
        catch { setErr("Kehadiran tercatat, tapi notifikasi chat ke guru gagal terkirim."); }
      }
    } catch (e) { setErr("Gagal mengirim kehadiran: " + (e?.message || "coba lagi")); }
    finally { setSending(false); }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9998 }} onClick={onClose}>
      <div className="sw-pop" role="dialog" aria-modal="true" aria-labelledby="ms-h" onClick={e => e.stopPropagation()}>
        <div className="sw-pop-head">
          <div><span className="sw-pop-k">Mission Mode</span><h2 id="ms-h">{allDone ? "Semua misi selesai" : mission.judul || "Misi hari ini"}</h2></div>
          <button type="button" className="sw-x" onClick={onClose} aria-label="Tutup"><I n="x" s={16} /></button>
        </div>
        <div className="sw-pop-body">
          {allDone ? (
            <div className="ms-done">
              <ConfettiRain intensity="high" />
              <span className="ms-done-ic"><I n="checkCircle" s={30} /></span>
              <b>Keren, {user.namaDisplay || getFirstName(user.nama || "")}!</b>
              <p className="ui-text">Kamu sudah menyelesaikan {total} dari {total} misi hari ini. Terus jaga ritme belajarmu.</p>
              <Button full onClick={onClose}>Selesai</Button>
            </div>
          ) : (
            <>
              {mission.instruksi && <p className="ui-text sw-desc">{mission.instruksi}</p>}
              <div className="ms-prog">
                <div className="ui-label-row"><span className="ui-label">Misi wajib</span><span className="ui-aside">{done}/{total}</span></div>
                <Meter value={done} max={total} label={`${done} dari ${total} misi wajib selesai`} />
              </div>
              <div className={`ms-hadir${sudahHadir ? " done" : ""}`}>
                <Item icon={<I n={sudahHadir ? "checkCircle" : "mapPin"} s={16} />} tone={sudahHadir ? "muted" : "teal"}
                  title="Konfirmasi kehadiran" meta={sudahHadir ? "Sudah dikonfirmasi ke guru" : "Misi pertama · Wajib"}
                  action={sudahHadir ? null : <Button size="sm" disabled={sending} onClick={hadir}>{sending ? "Mengirim..." : "Hadir"}</Button>} />
              </div>
              {err && <p className="ui-text" style={{ color: "var(--bad)" }}>{err}</p>}
              <DaftarMisi misi={misi} store={store} user={user} onOpen={open} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

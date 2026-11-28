// Astrolab — Profil siswa, redesign Fase 2 (Okt 2026)
// Logika sama dengan ProfilSiswa lama (foto/avatar, badge, riwayat, lapor kejadian VII). LaporModal masih di App.jsx
// dan dikirim lewat props supaya tidak ada perubahan pada alur laporan.
import { useState } from "react";
import { I } from "../components/icons";
import { Avatar, infoTingkatApi, MapelIcon } from "../components/visual";
import { BadgeIcon, ALL_BADGES, PoinChart, TierIcon, getLevel, getLevelProgress, LEVELS } from "../components/gamification";
import { ApiKristal } from "./siswa";
import { withTimeout } from "../utils/helpers";
import { KKTP, Page, Card, Items, Item, Button, StatusChip } from "../components/ui";
import { Medal, LevelStrip, StreakValue } from "../components/seru";
import { RiwayatRekap, RekapStory, daftarRekap } from "./rekap";
import "../styles/siswa.css";

const PRESETS = ["#0d6b7a", "#1e40af", "#7c3aed", "#b45309", "#0f766e", "#c2410c", "#be185d", "#065f46", "#1e3a5f", "#4a1d96"];
const inisial = nama => nama.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const fmt = n => (n || 0).toLocaleString("id-ID");
const RIWAYAT_LIMIT = 5;
const BADGE_LIMIT = 8;

export function ProfilSiswaV2({ user, store, navigate, LaporModal }) {
  const stats = store.getStats(user.id);
  const rekapList = daftarRekap(store.getRekapSaya?.());
  const [putarRekap, setPutarRekap] = useState(null);
  const lb = store.getLeaderboard(user.jenjang);
  const myRank = lb.find(s => s.id === user.id);
  const subs = store.getSubs().filter(s => s.siswaId === user.id);
  const myBadges = store.getBadges(user.id);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [showLapor, setShowLapor] = useState(false);
  const [allRiwayat, setAllRiwayat] = useState(false);
  const [allBadge, setAllBadge] = useState(false);
  const photo = store.getPhoto(user.uid || user.id);
  // Fitur Lapor: hanya siswa VII (kelas wali). Asumsi lama: semua siswa jenjang VII adalah VII-3.
  const laporEnabled = user.jenjang === "VII";
  const poin = stats.poin || 0;
  const xp = (stats.xpBawaan || 0) + poin;
  const season = store.getSeason ? store.getSeason().nomor : 1;
  const lv = getLevel(xp), prog = getLevelProgress(xp);

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Foto maksimal 5MB"); return; }
    const reader = new FileReader();
    reader.onload = async ev => {
      try { await withTimeout(store.savePhoto(user.uid || user.id, ev.target.result)); setShowPhotoPicker(false); }
      catch (err) { alert("Gagal menyimpan foto: " + (err?.message || "coba lagi")); }
    };
    reader.readAsDataURL(file);
  }
  function setPresetAvatar(color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="100" fill="${color}"/><text x="100" y="130" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-weight="700" font-size="80" fill="white">${inisial(user.nama)}</text></svg>`;
    const b64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    withTimeout(store.savePhoto(user.uid || user.id, b64)).catch(err => alert("Gagal menyimpan avatar: " + (err?.message || "coba lagi")));
    setShowPhotoPicker(false);
  }

  const riwayat = subs.slice().reverse();
  const badgeEarned = myBadges.map(id => ALL_BADGES.find(x => x.id === id)).filter(Boolean);
  const badgeLocked = ALL_BADGES.filter(b => !myBadges.includes(b.id));
  const badgeShow = allBadge ? [...badgeEarned, ...badgeLocked] : [...badgeEarned, ...badgeLocked].slice(0, BADGE_LIMIT);

  return (
    <div className="sw">
      {showPhotoPicker && (
        <div className="modal-overlay" onClick={() => setShowPhotoPicker(false)}>
          <div className="sw-pop" role="dialog" aria-modal="true" aria-labelledby="pf-foto-h" onClick={e => e.stopPropagation()}>
            <div className="sw-pop-head">
              <div><h2 id="pf-foto-h">Ganti foto profil</h2><p>Pilih avatar warna atau unggah foto.</p></div>
              <button type="button" className="sw-x" onClick={() => setShowPhotoPicker(false)} aria-label="Tutup"><I n="x" s={16} /></button>
            </div>
            <div className="sw-pop-body">
              <span className="ui-label">Avatar warna</span>
              <div className="pf-presets">
                {PRESETS.map(c => <button key={c} type="button" onClick={() => setPresetAvatar(c)} style={{ background: c }} aria-label={`Avatar warna ${c}`}>{inisial(user.nama)}</button>)}
              </div>
              <span className="ui-label">Unggah foto</span>
              <label className="pf-upload"><I n="camera" s={18} /> Pilih foto dari perangkat (maks 5 MB)<input type="file" accept="image/*" onChange={handleUpload} /></label>
              {photo && (
                <button type="button" className="ui-link" style={{ color: "var(--bad)", alignSelf: "center" }}
                  onClick={() => { withTimeout(store.savePhoto(user.uid || user.id, null)).catch(err => alert("Gagal menghapus foto: " + (err?.message || "coba lagi"))); setShowPhotoPicker(false); }}>
                  Hapus foto profil
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Page size="mid">
        {/* Identitas + level — redesign "E · halus" (mockup SiswaProfil) */}
        <section className="pf2-id">
          <div className="pf2-id-top">
            <div className="pf2-av">
              <Avatar name={user.nama} size="xl" photo={photo} />
              <button type="button" onClick={() => setShowPhotoPicker(true)} aria-label="Ganti foto profil"><I n="edit" s={14} /></button>
            </div>
            <div className="pf2-id-main">
              <h1>{user.namaDisplay || user.nama}</h1>
              <span>{user.kelas || `Kelas ${user.jenjang}`}{user.noAbsen ? ` · No. absen ${user.noAbsen}` : ""}</span>
            </div>
          </div>
          <div className="pf2-lv">
            <div className="pf2-lv-top">
              <span className="pf2-lv-ic"><TierIcon tierId={lv.tierId} size={30} color={lv.color} /></span>
              <div className="pf2-lv-main">
                <div className="pf2-lv-row"><b>{lv.name}</b><span>LV {lv.id} / {LEVELS.length}</span></div>
                <div className="sw-xp pf2-xp"><i style={{ width: `${prog.next ? prog.pct : 100}%` }} /></div>
              </div>
            </div>
            <div className="pf2-lv-foot"><span>{fmt(xp)}{prog.next ? ` / ${fmt(prog.next.min)}` : ""} EXP</span><span>{prog.next ? `${fmt(prog.needed)} lagi ke ${prog.next.name}` : "Level tertinggi"}</span></div>
          </div>
        </section>

        <div className="pf2-tiles">
          <div><span>Ranking kelas</span><b>{myRank ? <>#{myRank.rank}<small> / {lb.length}</small></> : "–"}</b></div>
          <div><span>{season > 1 ? `Poin Season ${season}` : "Poin season ini"}</span><b>{fmt(poin)}</b></div>
          <div><span>Rata-rata nilai</span><b className={stats.nilaiRata && stats.nilaiRata < KKTP ? "below" : ""}>{stats.nilaiRata || "–"}</b></div>
          <div className="api"><span>Api Kristal</span><b><ApiKristal s={20} />{stats.streak || 0}</b><small>{(() => {
            const a = infoTingkatApi(stats.streak || 0);
            if (!stats.streak) return "Kumpulkan tugas tepat waktu untuk menyalakan api";
            return a.berikut ? `${a.sisa} tugas tepat waktu lagi ke api ${a.berikut.nama}` : `Api ${a.kini.nama}, tingkat tertinggi`;
          })()}</small></div>
        </div>

        <RiwayatRekap daftar={rekapList} onBuka={k => setPutarRekap(rekapList.find(r => r.kunci === k) || null)} />
        {putarRekap && <RekapStory data={putarRekap.data} foto={store.getPhoto(user.uid || user.id)} onTutup={() => { if (!putarRekap.dilihatAt) store.tandaiRekapDilihat?.(putarRekap.kunci).catch(() => {}); setPutarRekap(null); }} />}

        <button type="button" className="pf2-link" onClick={() => navigate("rapor")}>
          <span className="pf2-ib"><I n="award" s={20} /></span>
          <span className="pf2-link-t"><b>Rapor Perkembangan</b><small>Nilai semester dan perkembanganmu sejak STS</small></span>
          <I n="chevR" s={16} />
        </button>

        <section className="pf2-kartu">
          <div className="pf2-head"><h2>Badge</h2><span>{myBadges.length} / {ALL_BADGES.length}</span></div>
          {myBadges.length === 0 && <p className="ui-text">Belum ada badge. Badge terbuka dari tugas yang kamu kerjakan.</p>}
          <div className="pf2-badges">
            {badgeShow.map(b => {
              const punya = myBadges.includes(b.id);
              return (
                <div key={b.id} className={`pf2-badge${punya ? "" : " locked"}`} title={b.desc}>
                  <BadgeIcon type={b.icon} rim={b.rim} size={38} locked={!punya} />
                  <span style={punya ? { color: b.color } : undefined}>{b.name}</span>
                </div>
              );
            })}
          </div>
          {ALL_BADGES.length > BADGE_LIMIT && (
            <button type="button" className="pf2-more" onClick={() => setAllBadge(v => !v)}>{allBadge ? "Tampilkan lebih sedikit" : "Lihat semua badge"}</button>
          )}
        </section>

        {stats.poinHistory?.length > 1 && (
          <section className="pf2-kartu"><div className="pf2-head"><h2>Perjalanan poin</h2></div><PoinChart data={stats.poinHistory} /></section>
        )}

        <section className="pf2-kartu list">
          <div className="pf2-head"><h2>Riwayat pengerjaan</h2><span>{subs.length} tugas</span></div>
          {riwayat.length === 0 ? <p className="ui-text">Belum ada tugas yang dikerjakan.</p> : (
            (allRiwayat ? riwayat : riwayat.slice(0, RIWAYAT_LIMIT)).map(s => {
              const t = store.getTugas().find(x => x.id === s.tugasId);
              const iv = s.riwayatIntervensi || [];
              const last = iv.length ? iv[iv.length - 1] : null;
              const tgl = new Date(s.submittedAt).toLocaleDateString("id-ID", { weekday: "long" });
              return (
                <div key={s.id || s.tugasId} className="pf2-riw">
                  <button type="button" className="pf2-row" disabled={!t} onClick={t ? () => navigate("tugas-detail", { tugasId: t.id }) : undefined}>
                    <span className="pf2-ib sm">{t ? <MapelIcon mapel={t.mapel} size={17} /> : <I n="check" s={16} />}</span>
                    <span className="pf2-row-t"><b>{t?.judul || "Tugas dihapus"}</b><small>{tgl} · {s.ontime === false ? "lewat tenggat" : "tepat waktu"} · +{s.poinDapat || 0} poin{last ? " · diperbarui guru" : ""}</small></span>
                    <span className={`pf2-nilai${s.nilai < KKTP ? " below" : ""}`}>{s.nilai}</span>
                  </button>
                  {last && <div className="pf-iv">Nilai diubah {last.nilaiSebelum} → {last.nilaiSetelah}. Alasan: {last.alasan}</div>}
                </div>
              );
            })
          )}
          {riwayat.length > RIWAYAT_LIMIT && (
            <button type="button" className="pf2-more" onClick={() => setAllRiwayat(v => !v)}>{allRiwayat ? "Tampilkan lebih sedikit" : `Lihat semua (${riwayat.length})`}</button>
          )}
        </section>

        {laporEnabled && (
          <button type="button" className="pf2-lapor" onClick={() => setShowLapor(true)}><I n="flag" s={16} /> Lapor kejadian ke wali kelas</button>
        )}
      </Page>

      {showLapor && LaporModal && <LaporModal user={user} store={store} onClose={() => setShowLapor(false)} />}
    </div>
  );
}

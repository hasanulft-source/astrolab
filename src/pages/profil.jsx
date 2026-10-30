// Astrolab — Profil siswa, redesign Fase 2 (Okt 2026)
// Logika sama dengan ProfilSiswa lama (foto/avatar, badge, riwayat, lapor kejadian VII). LaporModal masih di App.jsx
// dan dikirim lewat props supaya tidak ada perubahan pada alur laporan.
import { useState } from "react";
import { I } from "../components/icons";
import { Avatar } from "../components/visual";
import { BadgeIcon, ALL_BADGES, PoinChart } from "../components/gamification";
import { withTimeout } from "../utils/helpers";
import { KKTP, Page, Card, Items, Item, Button, StatusChip } from "../components/ui";
import { Medal, LevelStrip, StreakValue } from "../components/seru";
import "../styles/siswa.css";

const PRESETS = ["#0d6b7a", "#1e40af", "#7c3aed", "#b45309", "#0f766e", "#c2410c", "#be185d", "#065f46", "#1e3a5f", "#4a1d96"];
const inisial = nama => nama.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const fmt = n => (n || 0).toLocaleString("id-ID");
const RIWAYAT_LIMIT = 5;
const BADGE_LIMIT = 8;

export function ProfilSiswaV2({ user, store, navigate, LaporModal }) {
  const stats = store.getStats(user.id);
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
        {/* Identitas + level */}
        <section className="pf-id">
          <div className="pf-av">
            <Avatar name={user.nama} size="xl" photo={photo} />
            <button type="button" onClick={() => setShowPhotoPicker(true)} aria-label="Ganti foto profil"><I n="edit" s={12} /></button>
          </div>
          <div className="pf-id-main">
            <h1>{user.nama}</h1>
            <span>{user.kelas || `Kelas ${user.jenjang}`}{user.noAbsen ? ` · No. absen ${user.noAbsen}` : ""}</span>
            <div className="pf-lv"><LevelStrip poin={poin} /></div>
          </div>
        </section>

        <div className="sw-tiles four">
          <div><span>Ranking kelas</span><b className={myRank ? "pf-rank" : "none"}>{myRank ? <>{myRank.rank <= 3 && <Medal rank={myRank.rank} size="sm" />}#{myRank.rank}</> : "Belum ada"}</b></div>
          <div><span>Total poin</span><b>{fmt(poin)}</b></div>
          <div><span>Rata-rata nilai</span><b className={!stats.nilaiRata ? "none" : stats.nilaiRata < KKTP ? "below" : ""}>{stats.nilaiRata || "Belum ada"}</b></div>
          <div className="streak"><span>Streak</span><b><StreakValue streak={stats.streak || 0} /></b></div>
        </div>

        <button type="button" className="pf-rapor" onClick={() => navigate("rapor")}>
          <span className="pf-rapor-ic"><I n="award" s={20} /></span>
          <span><b>Rapor Perkembangan</b><small>Nilai semester dan perkembanganmu sejak STS</small></span>
          <I n="chevR" s={16} />
        </button>

        <Card label="Badge" aside={`${myBadges.length} dari ${ALL_BADGES.length}`}>
          {myBadges.length === 0 && <p className="ui-text">Belum ada badge. Badge terbuka dari tugas yang kamu kerjakan.</p>}
          <div className="pf-badges">
            {badgeShow.map(b => {
              const punya = myBadges.includes(b.id);
              return (
                <div key={b.id} className={`pf-badge${punya ? "" : " locked"}`} title={b.desc}>
                  <BadgeIcon type={b.icon} rim={b.rim} size={40} />
                  <span style={punya ? { color: b.color } : undefined}>{b.name}</span>
                </div>
              );
            })}
          </div>
          {ALL_BADGES.length > BADGE_LIMIT && (
            <button type="button" className="ui-link" onClick={() => setAllBadge(v => !v)}>
              <I n={allBadge ? "chevU" : "chevD"} s={12} /> {allBadge ? "Tampilkan lebih sedikit" : "Lihat semua badge"}
            </button>
          )}
        </Card>

        {stats.poinHistory?.length > 0 && (
          <Card label="Perjalanan poin"><PoinChart data={stats.poinHistory} /></Card>
        )}

        <Card label="Riwayat pengerjaan" aside={`${subs.length} tugas`}>
          {riwayat.length === 0 ? <p className="ui-text">Belum ada tugas yang dikerjakan.</p> : (
            <Items>
              {(allRiwayat ? riwayat : riwayat.slice(0, RIWAYAT_LIMIT)).map(s => {
                const t = store.getTugas().find(x => x.id === s.tugasId);
                const iv = s.riwayatIntervensi || [];
                const last = iv.length ? iv[iv.length - 1] : null;
                return (
                  <div key={s.id || s.tugasId} className="pf-riw">
                    <Item icon={<I n="check" s={16} />} tone="muted" title={t?.judul || "Tugas dihapus"}
                      badge={last ? <StatusChip>Diperbarui guru</StatusChip> : null}
                      meta={`${new Date(s.submittedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · +${s.poinDapat || 0} poin`}
                      end={<span className={`ui-num${s.nilai < KKTP ? " below" : ""}`}>{s.nilai}</span>}
                      onClick={t ? () => navigate("tugas-detail", { tugasId: t.id }) : undefined} />
                    {last && <div className="pf-iv">Nilai diubah {last.nilaiSebelum} → {last.nilaiSetelah}. Alasan: {last.alasan}</div>}
                  </div>
                );
              })}
            </Items>
          )}
          {riwayat.length > RIWAYAT_LIMIT && (
            <button type="button" className="ui-link" onClick={() => setAllRiwayat(v => !v)}>
              <I n={allRiwayat ? "chevU" : "chevD"} s={12} /> {allRiwayat ? "Tampilkan lebih sedikit" : `Lihat semua (${riwayat.length})`}
            </button>
          )}
        </Card>

        {laporEnabled && (
          <Card>
            <Item icon={<I n="flag" s={16} />} tone="muted" title="Lapor kejadian" meta="Hanya wali kelas yang bisa membaca laporanmu."
              action={<Button variant="outline" size="sm" onClick={() => setShowLapor(true)}>Lapor</Button>} />
          </Card>
        )}
      </Page>

      {showLapor && LaporModal && <LaporModal user={user} store={store} onClose={() => setShowLapor(false)} />}
    </div>
  );
}

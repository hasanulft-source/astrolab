// Astrolab — Ranking (siswa & guru), redesign Fase 2 (Okt 2026)
// Aturan data sama dengan LeaderboardScreen lama di App.jsx: getLeaderboard, snapshot & pergerakan, 5 sorotan.
// Yang berubah: tampilan, label sorotan dibuat sesuai cara hitungnya, dan kartu "posisimu" untuk siswa.
import { useState } from "react";
import { I } from "../components/icons";
import { UserAvatar, ConfettiRain, CelebrationAvatar, FlameAnimated } from "../components/visual";
import { LevelBadge } from "../components/gamification";
import { getFirstName } from "../utils/helpers";
import { Page, PageHeader, Card, Tabs, StatusChip, Button } from "../components/ui";
import { Medal, GameIcon, Orbit } from "../components/seru";
import "../styles/siswa.css";

const fmt = n => (n || 0).toLocaleString("id-ID");

// Pergerakan sejak snapshot terakhir: naik teal, turun amber, tetap abu
function Gerak({ move }) {
  if (move === null || move === undefined) return null;
  if (move === 0) return <span className="rk-mv same" aria-label="Posisi tetap">=</span>;
  const up = move > 0;
  return <span className={`rk-mv ${up ? "up" : "down"}`} aria-label={`${up ? "Naik" : "Turun"} ${Math.abs(move)} posisi`}>{up ? "▲" : "▼"}{Math.abs(move)}</span>;
}

// Sorotan kelas — metrik SAMA dengan versi lama, label disesuaikan dengan apa yang benar-benar dihitung
export function hitungSorotan(lb, subsAll) {
  const urut = id => subsAll.filter(x => x.siswaId === id && x.submittedAt).sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const top = [...lb].sort((a, b) => (b.poin || 0) - (a.poin || 0))[0];
  let lonjak = null, maxJump = 0, sempurna = null, maxPerfect = 0, tepat = null, maxOntime = 0, naik = null, maxImprove = 0;
  lb.forEach(s => {
    const sSubs = urut(s.id);
    if (sSubs.length >= 2) {
      const jump = sSubs[sSubs.length - 1].nilai - sSubs[sSubs.length - 2].nilai;
      if (jump > maxJump) { maxJump = jump; lonjak = { ...s, jump }; }
    }
    const perfect = subsAll.filter(x => x.siswaId === s.id && x.nilai === 100).length;
    if (perfect > maxPerfect) { maxPerfect = perfect; sempurna = { ...s, perfect }; }
    const ontime = subsAll.filter(x => x.siswaId === s.id && x.submittedAt && x.ontime).length;
    if (ontime >= 2 && ontime > maxOntime) { maxOntime = ontime; tepat = { ...s, ontime }; }
    if (sSubs.length >= 4) {
      const half = Math.floor(sSubs.length / 2);
      const a = sSubs.slice(0, half).reduce((x, y) => x + y.nilai, 0) / half;
      const b = sSubs.slice(half).reduce((x, y) => x + y.nilai, 0) / (sSubs.length - half);
      const imp = Math.round(b - a);
      if (imp > maxImprove) { maxImprove = imp; naik = { ...s, imp }; }
    }
  });
  return [
    top && { key: "top", label: "Poin tertinggi", icon: "trophy", tone: "gold", siswa: top, sub: `${fmt(top.poin)} poin` },
    lonjak && { key: "lonjak", label: "Lonjakan nilai", icon: "flame", tone: "flame", siswa: lonjak, sub: `Tugas terakhir naik ${lonjak.jump} poin` },
    sempurna && { key: "sempurna", label: "Paling sering 100", icon: "target", tone: "violet", siswa: sempurna, sub: `${sempurna.perfect} kali nilai 100` },
    tepat && { key: "tepat", label: "Paling sering tepat waktu", icon: "zap", tone: "sky", siswa: tepat, sub: `${tepat.ontime} tugas tepat waktu` },
    naik && { key: "naik", label: "Rata-rata paling naik", icon: "trending", tone: "teal", siswa: naik, sub: `Rata-rata naik ${naik.imp} poin` },
  ].filter(Boolean);
}

function Baris({ s, me, move, store }) {
  return (
    <div className={`rk-row${me ? " me" : ""}`}>
      <span className="rk-rank"><Medal rank={s.rank} size="sm" /></span>
      <UserAvatar userId={s.id} name={s.nama} size="sm" store={store} />
      <span className="rk-name">
        <span className="rk-name-top"><b>{s.nama}</b>{me && <em>kamu</em>}<LevelBadge poin={s.poin || 0} size="xs" showName={false} /><Gerak move={move} /></span>
        {(s.streak || 0) >= 3 && <small className="rk-streak"><FlameAnimated size={13} streak={s.streak} /> streak {s.streak} hari</small>}
      </span>
      <span className="rk-pts">{fmt(s.poin)}</span>
    </div>
  );
}

export function RankingScreen({ user, store }) {
  const isGuru = user.role === "guru";
  const [tab, setTab] = useState(isGuru ? "VII" : user.jenjang);
  const [saving, setSaving] = useState(false);
  const lb = store.getLeaderboard(tab);
  const snapshot = store.getRankSnapshot(tab) || {};
  const hasSnapshot = Object.keys(snapshot).filter(k => k !== "_savedAt").length > 0;
  const move = id => (hasSnapshot ? store.getRankMovement(tab, id) : null);
  const meId = !isGuru ? user.id : null;
  const myIdx = meId ? lb.findIndex(s => s.id === meId) : -1;
  const my = myIdx >= 0 ? lb[myIdx] : null;
  const above = myIdx > 0 ? lb[myIdx - 1] : null;
  const sorotan = hitungSorotan(lb, store.getSubs());

  const simpan = async () => { setSaving(true); try { await store.saveRankSnapshot(tab); } finally { setSaving(false); } };

  return (
    <div className="sw">
      <Page size="wide">
        <PageHeader eyebrow={store.getActivePeriode ? store.getActivePeriode() : "Semester ini"} title="Ranking" subtitle="Poin yang terkumpul selama semester ini" />
        <div className="rk-bar">
          <Tabs items={[{ value: "VII", label: "Kelas VII" }, { value: "VIII", label: "Kelas VIII" }]} value={tab} onChange={setTab} />
          {isGuru && <Button variant="outline" size="sm" disabled={saving} onClick={simpan}><I n="refresh" s={12} /> {saving ? "Menyimpan..." : "Simpan snapshot"}</Button>}
        </div>
        {hasSnapshot && snapshot._savedAt && <p className="rk-note">Tanda ▲▼ = perubahan posisi sejak {new Date(snapshot._savedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>}

        {lb.length === 0 ? (
          <Card center><div className="ui-empty"><I n="trophy" s={28} /><div className="ui-title">Belum ada ranking</div><p className="ui-text">Ranking muncul setelah siswa menyelesaikan tugas pertama.</p></div></Card>
        ) : (
          <div className="rk-grid">
            <div className="rk-main">
              {/* Posisi siswa sendiri: angka + jarak ke posisi di atasnya */}
              {my && (
                <section className="rk-me" aria-label="Posisimu">
                  <Orbit />
                  <div><span>Posisimu</span><b>{my.rank <= 3 && <Medal rank={my.rank} size="lg" />}#{my.rank}</b></div>
                  <div><span>Poin</span><b>{fmt(my.poin)}</b></div>
                  {above && <div className="rk-me-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(6, ((my.poin || 0) - (lb[myIdx + 1]?.poin ?? 0)) / Math.max(1, (above.poin || 0) - (lb[myIdx + 1]?.poin ?? 0)) * 100))}%` }} /></div>}
                  <p>{above ? <>Kurang <b>{fmt(Math.max(1, (above.poin || 0) - (my.poin || 0) + 1))} poin</b> untuk menyalip {getFirstName(above.nama)} di #{above.rank}.</> : "Kamu di posisi teratas. Pertahankan!"}</p>
                </section>
              )}

              {lb.length >= 3 && (
                <Card label="Tiga teratas">
                  <div className="rk-podium">
                    {[lb[1], lb[0], lb[2]].map((s, i) => {
                      const place = [2, 1, 3][i];
                      return (
                        <div key={s.id} className={`rk-pod p${place}`}>
                          <ConfettiRain intensity={place === 1 ? "high" : place === 2 ? "medium" : "low"} />
                          {place === 1 ? <CelebrationAvatar userId={s.id} name={s.nama} size="lg" store={store} /> : <UserAvatar userId={s.id} name={s.nama} size="md" store={store} />}
                          <b>{getFirstName(s.nama)}</b>
                          <small>{fmt(s.poin)} poin <Gerak move={move(s.id)} /></small>
                          <span className={`rk-pod-block${place === 1 ? " podium-1" : ""}`}>{place}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              <Card label={`Top 10 · Kelas ${tab}`} aside={`${lb.length} siswa`}>
                <div className="rk-list">
                  {lb.slice(0, 10).map(s => <Baris key={s.id} s={s} me={s.id === meId} move={move(s.id)} store={store} />)}
                  {my && my.rank > 10 && (
                    <>
                      <div className="rk-gap">Di sekitarmu</div>
                      {lb.slice(Math.max(0, myIdx - 2), Math.min(lb.length, myIdx + 3)).map(s => <Baris key={s.id} s={s} me={s.id === meId} move={move(s.id)} store={store} />)}
                    </>
                  )}
                </div>
              </Card>
            </div>

            <div className="rk-side">
              <Card label="Sorotan kelas" aside="semester ini">
                {sorotan.length === 0 ? <p className="ui-text">Sorotan muncul setelah siswa mengerjakan beberapa tugas.</p> : (
                  <div className="rk-list">
                    {sorotan.map(n => (
                      <div key={n.key} className="rk-hl">
                        <GameIcon tone={n.tone}><I n={n.icon} s={16} /></GameIcon>
                        <span className={`rk-hl-main ${n.tone}`}><small>{n.label}</small><b>{getFirstName(n.siswa.nama || "")}{n.siswa.id === meId ? " (kamu)" : ""}</b><em>{n.sub}</em></span>
                        <UserAvatar userId={n.siswa.id} name={n.siswa.nama} size="sm" store={store} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              {!isGuru && <p className="rk-note left">Poin bertambah dari tugas yang dikerjakan. Tepat waktu menjaga streak.</p>}
            </div>
          </div>
        )}
      </Page>
    </div>
  );
}

// Astrolab — layar harian siswa, redesign Fase 1 (Okt 2026)
// Beranda, Daftar Tugas, Detail Tugas, Review Jawaban, dan layar hasil setelah mengumpulkan.
// Semua aturan data SAMA dengan versi lama di App.jsx (filter tugas, susulan, reset streak, popup sekali per sesi);
// yang berubah hanya tampilan. Data dibaca lewat `store` yang sama, tidak ada perubahan Firebase atau Rules.
// Komponen App.jsx yang belum dipindah (MissionSiswaModal, LeaderboardScreen) dikirim lewat props.
import { useEffect, useRef, useState } from "react";
import { fmtDl } from "../utils/helpers";
import { I } from "../components/icons";
import { MapelIcon, UserAvatar } from "../components/visual";
import { getLevel, getLevelProgress, TierIcon, LevelBadge, LevelCard, BadgeChip } from "../components/gamification";
import { KKTP, Page, TopBar, PageHeader, Card, Tabs, StatusChip, ActionCallout, ScoreBar, Button, Items, Item, Facts, Meter } from "../components/ui";
import "../styles/siswa.css";

// ─── Aturan bersama (murni) ───
export const poinTugas = t => (t.graded === false ? Math.round((t.poinMax || 0) * 0.2) : (t.poinMax || 0));
const ts = v => (v ? new Date(v).getTime() : 0);
const byNewest = (a, b) => ts(b.createdAt) - ts(a.createdAt);
const isLewat = t => fmtDl(t.deadline).tone === "bad"; // aturan lama: lewat = sudah lewat hari tenggat
const untukSaya = (t, uid) => !Array.isArray(t.assignedTo) || t.assignedTo.includes(uid);
const nSoal = t => t.soal?.length || 0;
const tglPendek = v => new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const fmtTgl = (v, jam = false) => new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", ...(jam ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }) });

// Tenggat tanpa jam = akhir hari itu (23.59 lokal), sama seperti deadlineEnd di App.jsx
export function deadlineEnd(dl) {
  if (!dl) return 0;
  if (typeof dl === "string" && !dl.includes("T")) {
    const [y, m, d] = dl.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  }
  return new Date(dl).getTime();
}

const durasi = ms => {
  const hari = Math.floor(ms / 86400000), jam = Math.floor((ms % 86400000) / 3600000), mnt = Math.floor((ms % 3600000) / 60000);
  if (hari >= 1) return `${hari} hari`;
  if (jam >= 1) return `${jam} jam`; // label singkat supaya muat di samping judul; jam pasti ada di detail
  return mnt >= 1 ? `${mnt} mnt` : "kurang dari 1 mnt";
};

// Status tenggat dalam kata. Amber = perlu perhatian (≤ 3 hari atau sudah lewat).
export function tenggat(deadline, now) {
  if (!deadline) return { label: "Tanpa tenggat", tone: "muted" };
  const sisa = deadlineEnd(deadline) - now;
  if (sisa <= 0) return { label: "Lewat tenggat", tone: "amber" };
  const hari = Math.floor(sisa / 86400000);
  if (hari >= 1) return { label: `${hari} hari lagi`, tone: hari <= 3 ? "amber" : "muted" };
  return { label: `${durasi(sisa)} lagi`, tone: "amber" };
}

function useNow(ms) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(iv); }, [ms]);
  return now;
}

const Num = ({ v }) => <span className={`ui-num${typeof v === "number" && v < KKTP ? " below" : ""}`}>{typeof v === "number" ? v : "–"}</span>;

// Satu baris tugas — dipakai Beranda, Daftar Tugas, popup, dan layar hasil
// action=true → tombol "Kerjakan" di kanan (langsung ke soal kalau bisa; susulan/khusus lewat detail dulu).
// direct=false dipakai di layar hasil: rute "kerjakan" → "kerjakan" tidak me-mount ulang KerjakanTugas, jadi lewat detail.
function TugasItem({ t, user, store, now, navigate, showMapel = false, action = true, direct = true }) {
  const done = store.hasSub(user.id, t.id);
  const sub = done ? store.getSubBy(user.id, t.id) : null;
  const lewat = isLewat(t);
  const susulan = !done && lewat && store.isSusulanAktif(t.id, user.id);
  const meta = [showMapel && t.mapel, `${nSoal(t)} soal`, done ? `+${sub?.poinDapat || 0} poin` : `+${poinTugas(t)} poin`].filter(Boolean).join(" · ");
  const detail = () => navigate("tugas-detail", { tugasId: t.id });
  let badge = null;
  if (susulan) badge = <StatusChip>Susulan</StatusChip>;
  else if (!done) { const tg = tenggat(t.deadline, now); badge = <StatusChip tone={tg.tone}>{tg.label}</StatusChip>; }
  const periodeTutup = t.periode && store.isSemesterClosed?.(t.periode);
  const bisa = !done && t.status === "aktif" && nSoal(t) > 0 && (!lewat || susulan) && !periodeTutup;
  // Susulan (bisa ada batas nilai) dan latihan khusus perlu dibaca dulu di detail
  const langsung = direct && bisa && !susulan && !Array.isArray(t.assignedTo);
  return (
    <Item icon={done ? <I n="check" s={18} /> : Array.isArray(t.assignedTo) ? <I n="star" s={18} /> : <MapelIcon mapel={t.mapel} size={18} />}
      tone={done ? "muted" : susulan ? "amber" : "teal"} dim={done}
      title={t.judul} badge={badge} meta={meta} onClick={detail}
      end={done ? <Num v={sub?.nilai} /> : null}
      action={action && bisa ? <Button size="sm" onClick={langsung ? () => navigate("kerjakan", { tugasId: t.id }) : detail}>Kerjakan</Button> : null} />
  );
}

function JadwalItem({ t, now }) {
  const sisa = new Date(t.scheduledAt).getTime() - now;
  return (
    <Item icon={<I n="clock" s={18} />} tone="muted" title={t.judul}
      meta={`${t.mapel} · ${nSoal(t)} soal · dibuka ${fmtTgl(t.scheduledAt, true)}`}
      badge={<StatusChip tone="muted">{sisa > 0 ? `${durasi(sisa)} lagi` : "Segera dibuka"}</StatusChip>} />
  );
}

// Status permintaan akses susulan untuk tugas yang lewat tenggat:
// "minta" (belum pernah / ditolak / susulan lama sudah habis) | "menunggu"
export function statusAkses(store, t, uid) {
  const req = store.getAksesRequest(t.id, uid);
  if (req?.status === "pending") return { kode: "menunggu", req };
  return { kode: "minta", req, catatan: req?.status === "rejected" ? "Permintaan sebelumnya ditolak." : req?.status === "approved" ? "Kesempatan susulan sebelumnya sudah lewat." : null };
}

function useMintaAkses(store, user) {
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});
  const kirim = async t => {
    setLoading(p => ({ ...p, [t.id]: true }));
    setError(p => ({ ...p, [t.id]: null }));
    try { await store.requestAkses(t.id, user.id, user.namaDisplay || user.nama, t.judul); }
    catch (e) { console.error("[MintaAkses] error:", e); setError(p => ({ ...p, [t.id]: "Gagal mengirim. Coba lagi." })); }
    finally { setLoading(p => ({ ...p, [t.id]: false })); }
  };
  return { loading, error, kirim };
}

function LewatItem({ t, user, store, navigate, akses }) {
  const st = statusAkses(store, t, user.id);
  const meta = akses.error[t.id] || `${nSoal(t)} soal · ${t.graded === false ? "tidak dinilai" : "dihitung 0"}`;
  return (
    <Item icon={<MapelIcon mapel={t.mapel} size={18} />} tone="amber" title={t.judul} meta={meta}
      onClick={() => navigate("tugas-detail", { tugasId: t.id })}
      action={st.kode === "menunggu"
        ? <StatusChip tone="muted">Menunggu</StatusChip>
        : <Button variant="amber" size="sm" disabled={akses.loading[t.id]} onClick={() => akses.kirim(t)}>{akses.loading[t.id] ? "Mengirim..." : "Minta akses"}</Button>} />
  );
}

// ═══════════════════════════ BERANDA ═══════════════════════════
let _bukaArsip = null; // Beranda → Daftar Tugas: mapel yang dibuka + bagian "Lewat tenggat" langsung terbuka

export function BerandaSiswa({ user, store, navigate, MissionModal }) {
  const now = useNow(30000);
  const [showMission, setShowMission] = useState(false);
  const stats = store.getStats(user.id);
  const allTugas = store.getTugas().filter(t => t.jenjang === user.jenjang && t.status === "aktif" && untukSaya(t, user.id));
  const akanDatang = store.getTugas()
    .filter(t => t.jenjang === user.jenjang && t.status === "scheduled" && t.scheduledAt && untukSaya(t, user.id))
    .sort((a, b) => ts(a.scheduledAt) - ts(b.scheduledAt));
  // "Hangus": lewat tenggat, belum dikerjakan, tanpa susulan aktif
  const tugasLewat = allTugas.filter(t => isLewat(t) && !store.hasSub(user.id, t.id) && !store.isSusulanAktif(t.id, user.id));
  const lb = store.getLeaderboard(user.jenjang);
  const myRank = lb.find(s => s.id === user.id);

  // Reset streak kalau ada tugas terlewat — sekali per mount, dedupe per tugas ada di store
  const checkedStreak = useRef(false);
  const missedIds = tugasLewat.map(t => t.id).join(",");
  useEffect(() => {
    if (checkedStreak.current || store.loading || !missedIds) return;
    checkedStreak.current = true;
    store.resetStreakIfMissed(user.id, missedIds.split(","));
  }, [missedIds, store.loading]);

  // Pengganti popup login: semua yang masih bisa dikerjakan, batas waktu terdekat di atas (susulan pakai tenggat barunya)
  const batasKerja = t => {
    if (isLewat(t)) { const sus = store.getSusulan(t.id, user.id); return sus?.deadlineBaru ? ts(sus.deadlineBaru) : Infinity; }
    return deadlineEnd(t.deadline) || Infinity;
  };
  const perlu = allTugas
    .filter(t => !store.hasSub(user.id, t.id) && (!isLewat(t) || store.isSusulanAktif(t.id, user.id)))
    .sort((a, b) => batasKerja(a) - batasKerja(b));
  const LIMIT = 4;

  const hour = new Date(now).getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  const poin = stats.poin || 0;
  const lv = getLevel(poin), prog = getLevelProgress(poin);

  return (
    <div className="sw">
      <Page size="wide">
        <div className="sw-greet">
          <div><span>{greeting}</span><h1>Halo, {user.namaDisplay || user.nama}</h1></div>
          <StatusChip>{store.getActivePeriode()}</StatusChip>
        </div>

        <div className="sw-home">
          {/* Status: ranking, poin, level, streak */}
          <div className="sw-a">
          <section className="sw-hero" aria-label="Status kamu">
            <div className="sw-hero-top">
              <div>
                <span className="sw-hero-k">Ranking kelas {user.jenjang}</span>
                {myRank ? <b className="sw-hero-n">#{myRank.rank}</b> : <b className="sw-hero-n sm">Belum masuk</b>}
              </div>
              <div className="r">
                <span className="sw-hero-k">Total poin</span>
                <b className="sw-hero-n">{poin.toLocaleString("id-ID")}</b>
              </div>
            </div>
            <div className="sw-hero-lv">
              <TierIcon tierId={lv.tierId} size={26} color="#fff" />
              <div className="sw-hero-lv-main">
                <div className="sw-hero-lv-row"><b>{lv.name}</b><span>{prog.next ? `${prog.needed} poin lagi ke ${prog.next.name}` : "Level tertinggi"}</span></div>
                <div className="sw-hero-bar"><i style={{ width: `${prog.next ? prog.pct : 100}%` }} /></div>
              </div>
            </div>
          </section>
            <div className="sw-tiles">
              <div><span>Rata-rata nilai</span><b className={!stats.nilaiRata ? "none" : stats.nilaiRata < KKTP ? "below" : ""}>{stats.nilaiRata || "Belum ada"}</b></div>
              <div><span>Tugas selesai</span><b>{stats.tugasSelesai || 0}</b></div>
              <div><span>Streak</span><b>{stats.streak || 0} <small>hari</small></b></div>
            </div>
          </div>

          <div className="sw-b">
            {store.isMissionActive(user.jenjang) && (
              <button type="button" className="sw-mission" onClick={() => setShowMission(true)}>
                <span className="sw-mission-ic"><I n="rocket" s={20} /></span>
                <span><b>Mission Mode aktif</b><small>Ketuk untuk membuka misi hari ini</small></span>
                <I n="chevR" s={16} />
              </button>
            )}

            <Card label="Perlu dikerjakan" aside={<button type="button" className="ui-link" onClick={() => navigate("tugas")}>Semua tugas <I n="chevR" s={12} /></button>}>
              {perlu.length > 0 ? (
                <Items>{perlu.slice(0, LIMIT).map(t => <TugasItem key={t.id} t={t} user={user} store={store} now={now} navigate={navigate} showMapel />)}</Items>
              ) : (
                <p className="ui-text">{allTugas.length === 0 ? "Belum ada tugas aktif dari guru." : tugasLewat.length ? "Tidak ada tugas yang masih terbuka." : "Semua tugas sudah kamu kerjakan. Cek posisimu di ranking kelas."}</p>
              )}
              {perlu.length > LIMIT && <button type="button" className="ui-link" onClick={() => navigate("tugas")}>{perlu.length - LIMIT} tugas lainnya <I n="chevR" s={12} /></button>}
            </Card>

            {tugasLewat.length > 0 && (
              <button type="button" className="sw-overdue" onClick={() => { _bukaArsip = tugasLewat.some(t => t.mapel === "IPA") ? "IPA" : tugasLewat[0].mapel; navigate("tugas"); }}>
                <b>{tugasLewat.length}</b>
                <span><strong>tugas lewat tenggat</strong><small>Dihitung 0 · ketuk untuk minta akses susulan</small></span>
                <I n="chevR" s={16} />
              </button>
            )}

            {akanDatang.length > 0 && (
              <Card label="Akan dibuka" aside={`${akanDatang.length} tugas`}>
                <Items>{akanDatang.slice(0, 2).map(t => <JadwalItem key={t.id} t={t} now={now} />)}</Items>
              </Card>
            )}
          </div>

          <div className="sw-c">

            <Card label={`Top 3 kelas ${user.jenjang}`} aside={<button type="button" className="ui-link" onClick={() => navigate("leaderboard")}>Ranking <I n="chevR" s={12} /></button>}>
              {lb.length === 0 ? <p className="ui-text">Belum ada ranking. Kerjakan tugas untuk mulai mengumpulkan poin.</p> : (
                <div className="sw-top">
                  {lb.slice(0, 3).map(s => (
                    <div key={s.id} className={`sw-top-row${s.id === user.id ? " me" : ""}`}>
                      <span className="sw-top-rank">{s.rank}</span>
                      <UserAvatar userId={s.id} name={s.nama} size="sm" store={store} />
                      <span className="sw-top-name"><b>{s.nama}{s.id === user.id && <em> · kamu</em>}</b><LevelBadge poin={s.poin || 0} size="xs" showName={false} /></span>
                      <span className="sw-top-pts">{(s.poin || 0).toLocaleString("id-ID")}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </Page>

      {showMission && MissionModal && <MissionModal user={user} store={store} navigate={navigate} onClose={() => setShowMission(false)} />}
    </div>
  );
}

// ═══════════════════════════ DAFTAR TUGAS ═══════════════════════════
export function DaftarTugasSiswa({ user, store, navigate }) {
  const now = useNow(30000);
  const isVII = user.jenjang === "VII";
  const [buka] = useState(() => { const v = _bukaArsip; _bukaArsip = null; return v; });
  const [mapel, setMapel] = useState(buka && (isVII || buka === "IPA") ? buka : "IPA");
  const [showArsip, setShowArsip] = useState(!!buka);
  const akses = useMintaAkses(store, user);
  const [showAllDone, setShowAllDone] = useState(false);

  const semuaRaw = store.getTugas().filter(t => t.jenjang === user.jenjang && t.mapel === mapel && untukSaya(t, user.id));
  const semua = semuaRaw.filter(t => t.status !== "scheduled");
  const akanDatang = semuaRaw.filter(t => t.status === "scheduled" && t.scheduledAt).sort((a, b) => ts(a.scheduledAt) - ts(b.scheduledAt));
  const done = t => store.hasSub(user.id, t.id);
  const personalT = t => Array.isArray(t.assignedTo);

  const belum = semua.filter(t => !done(t) && !isLewat(t) && !personalT(t)).sort(byNewest);
  const susulan = semua.filter(t => !done(t) && isLewat(t) && store.isSusulanAktif(t.id, user.id) && !personalT(t)).sort(byNewest);
  const selesai = semua.filter(t => done(t) && !personalT(t)).sort(byNewest);
  const personal = semua.filter(personalT).sort(byNewest);
  // Lewat tenggat & belum dikerjakan. Yang punya susulan aktif sudah tampil di "Belum dikerjakan", jadi tidak diulang di sini.
  const arsip = semua.filter(t => !done(t) && isLewat(t) && !store.isSusulanAktif(t.id, user.id)).sort(byNewest);

  const totalTugas = semua.filter(t => !personalT(t)).length;
  const nilaiList = selesai.map(t => store.getSubBy(user.id, t.id)?.nilai || 0);
  const rata = nilaiList.length ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) : null;
  const DONE_LIMIT = 3;
  const item = t => <TugasItem key={t.id} t={t} user={user} store={store} now={now} navigate={navigate} />;

  return (
    <div className="sw">
      <Page size="mid">
        <PageHeader eyebrow={`Kelas ${user.jenjang}`} title={`Tugas ${mapel}`} subtitle={store.getActivePeriode()} />
        {isVII && <Tabs items={["IPA", "Informatika"]} value={mapel} onChange={m => { setMapel(m); setShowAllDone(false); setShowArsip(false); }} />}

        {semua.length === 0 && akanDatang.length === 0 ? (
          <Card center>
            <div className="ui-empty">
              <span className="ui-item-ic" style={{ width: 48, height: 48, borderRadius: 14 }}><MapelIcon mapel={mapel} size={24} /></span>
              <div className="ui-title">Belum ada tugas {mapel}</div>
              <p className="ui-text">Tugas akan muncul di sini setelah guru membuat tugas untuk kelasmu.</p>
            </div>
          </Card>
        ) : (
          <>
            {totalTugas > 0 && (
              <Card label="Progres" aside={mapel}>
                <div className="sw-prog">
                  <div className="sw-prog-n"><b>{selesai.length}</b><span>/{totalTugas}</span></div>
                  <div className="sw-prog-main">
                    <p className="ui-text">{selesai.length === totalTugas ? "Semua tugas sudah kamu kerjakan." : `${totalTugas - selesai.length} tugas belum dikerjakan.`}{rata != null && <> Rata-rata nilaimu <b>{rata}</b>.</>}</p>
                    <Meter value={selesai.length} max={totalTugas} label={`${selesai.length} dari ${totalTugas} tugas selesai`} />
                  </div>
                </div>
              </Card>
            )}

            {(susulan.length > 0 || belum.length > 0) && (
              <Card label="Belum dikerjakan" aside={`${susulan.length + belum.length} tugas`}>
                <Items>{susulan.map(item)}{belum.map(item)}</Items>
              </Card>
            )}

            {akanDatang.length > 0 && (
              <Card label="Akan dibuka" aside={`${akanDatang.length} tugas`}>
                <Items>{akanDatang.map(t => <JadwalItem key={t.id} t={t} now={now} />)}</Items>
              </Card>
            )}

            {personal.length > 0 && (
              <Card label="Latihan khusus" aside={`${personal.length} tugas`}>
                <Items>{personal.map(item)}</Items>
              </Card>
            )}

            {selesai.length > 0 && (
              <Card label="Sudah dikerjakan" aside={`${selesai.length} tugas`}>
                <Items>{(showAllDone ? selesai : selesai.slice(0, DONE_LIMIT)).map(item)}</Items>
                {selesai.length > DONE_LIMIT && (
                  <button type="button" className="ui-link" onClick={() => setShowAllDone(s => !s)}>
                    <I n={showAllDone ? "chevU" : "chevD"} s={12} /> {showAllDone ? "Tampilkan lebih sedikit" : `Lihat semua (${selesai.length})`}
                  </button>
                )}
              </Card>
            )}

            {arsip.length > 0 && (
              <Card>
                <button type="button" className="sw-fold" aria-expanded={showArsip} onClick={() => setShowArsip(s => !s)}>
                  <span className="ui-label">Lewat tenggat</span>
                  <span className="ui-aside">{arsip.length} tugas</span>
                  <I n={showArsip ? "chevU" : "chevD"} s={14} />
                </button>
                {showArsip && (
                  <>
                    <Items>{arsip.map(t => <LewatItem key={t.id} t={t} user={user} store={store} navigate={navigate} akses={akses} />)}</Items>
                  </>
                )}
              </Card>
            )}
          </>
        )}
      </Page>
    </div>
  );
}

// ═══════════════════════════ DETAIL TUGAS ═══════════════════════════
export function DetailTugasSiswa({ user, store, tugasId, navigate }) {
  const now = useNow(30000);
  const [akses, setAkses] = useState({ loading: false, error: null });
  const t = store.getTugas().find(x => x.id === tugasId);
  if (!t) return <div className="sw"><TopBar title="Detail Tugas" onBack={() => navigate("tugas")} /><Page><Card center><p className="ui-text">Tugas tidak ditemukan.</p></Card></Page></div>;

  const done = store.hasSub(user.id, t.id);
  const sub = store.getSubBy(user.id, t.id);
  const lewat = isLewat(t);
  const susulan = store.getSusulan(t.id, user.id);
  const susulanAktif = store.isSusulanAktif(t.id, user.id);
  const periodeTutup = t.periode && store.isSemesterClosed(t.periode);
  const bisa = !done && t.status === "aktif" && nSoal(t) > 0 && (!lewat || susulanAktif) && !periodeTutup;
  const personal = Array.isArray(t.assignedTo);
  const tg = tenggat(t.deadline, now);

  // Progres kelas (social proof) — hanya kalau tugas untuk lebih dari 1 siswa
  const siswa = personal ? store.getAllSiswa(t.jenjang).filter(s => t.assignedTo.includes(s.id)) : store.getAllSiswa(t.jenjang);
  const kelasTotal = siswa.length;
  const kelasDone = kelasTotal > 1 ? store.getSubs().filter(s => s.tugasId === t.id).length : 0;
  const kelasPct = kelasTotal > 1 ? Math.round(kelasDone / kelasTotal * 100) : 0;

  const mintaAkses = async () => {
    setAkses({ loading: true, error: null });
    try { await store.requestAkses(t.id, user.id, user.namaDisplay || user.nama, t.judul); setAkses({ loading: false, error: null }); }
    catch (e) { console.error("[MintaAkses] error:", e); setAkses({ loading: false, error: "Gagal mengirim permintaan. Coba lagi." }); }
  };

  return (
    <div className="sw">
      <TopBar title="Detail Tugas" onBack={() => navigate("tugas")} />
      <Page>
        <button type="button" className="ui-link sw-back-desk" onClick={() => navigate("tugas")}><I n="chevL" s={12} /> Daftar tugas</button>
        <PageHeader eyebrow={`${t.mapel}${personal ? " · Latihan khusus" : ""}`} title={t.judul} subtitle={`Kelas ${t.jenjang}`} />

        {periodeTutup && !done && (
          <ActionCallout title="Periode sudah ditutup" note={`Tugas dari ${t.periode} tidak bisa dikerjakan lagi karena semesternya sudah ditutup guru.`} />
        )}
        {personal && (
          <ActionCallout tone="teal" title="Latihan khusus untukmu"
            note={t.graded === false ? "Dibuat guru khusus untukmu. Poinnya 20% dari tugas biasa dan tidak dihitung ke nilai rapor." : "Dibuat guru khusus untukmu. Kerjakan dengan serius, poin dan badge tetap kamu dapat."} />
        )}
        {!done && susulanAktif && susulan && (
          <ActionCallout tone="teal" title="Kamu dapat kesempatan susulan"
            note={`Tenggat baru ${fmtTgl(susulan.deadlineBaru, true)}.${typeof susulan.nilaiMaks === "number" ? ` Nilai maksimal tugas ini ${susulan.nilaiMaks}, meskipun semua jawaban benar.` : ""}`} />
        )}

        <Card label="Tentang tugas">
          {t.deskripsi && <p className="ui-text sw-desc">{t.deskripsi}</p>}
          <Facts items={[
            { label: "Tenggat", value: done ? (t.deadline ? tglPendek(deadlineEnd(t.deadline)) : "Tanpa tenggat") : susulanAktif && lewat ? (susulan?.deadlineBaru ? tglPendek(susulan.deadlineBaru) : "Susulan") : tg.label },
            { label: "Soal", value: nSoal(t) },
            { label: "Poin maks", value: `+${poinTugas(t)}` },
          ]} />
          {bisa && <Button full onClick={() => navigate("kerjakan", { tugasId: t.id })}><I n="book" s={16} /> Mulai kerjakan</Button>}
          {!bisa && !done && !lewat && !periodeTutup && <p className="ui-text">{nSoal(t) === 0 ? "Soal belum tersedia. Tunggu guru menambahkan soal." : "Tugas ini sedang tidak aktif."}</p>}
        </Card>

        {done && sub && (
          <Card label="Hasilmu" aside={sub.submittedAt ? `dikumpulkan ${fmtTgl(sub.submittedAt)}` : undefined}>
            <div className="ui-stat">
              <div className={`ui-stat-num${sub.nilai < KKTP ? " sw-below" : ""}`}>{sub.nilai}</div>
              <div style={{ flex: 1 }}>
                <p>+{sub.poinDapat || 0} poin{typeof sub.correctCount === "number" && sub.total ? ` · ${sub.correctCount} dari ${sub.total} benar` : ""}</p>
                <div style={{ marginTop: 8 }}><ScoreBar value={sub.nilai} /></div>
              </div>
            </div>
            {lewat
              ? <Button variant="outline" full onClick={() => navigate("review-tugas", { tugasId: t.id })}><I n="book" s={15} /> Lihat jawaban & pembahasan</Button>
              : <p className="ui-text">Jawaban dan pembahasan bisa dilihat setelah tenggat berakhir{t.deadline ? ` (${fmtTgl(deadlineEnd(t.deadline))})` : ""}.</p>}
          </Card>
        )}

        {!bisa && !done && lewat && !periodeTutup && (
          <Card label="Tugas sudah ditutup">
            <p className="ui-text">Tenggatnya sudah lewat, jadi tugas ini dihitung 0 sampai kamu mengerjakannya lewat susulan.</p>
            {statusAkses(store, t, user.id).kode === "menunggu" ? (
              <p className="sw-wait"><I n="clock" s={14} /> Permintaan akses terkirim, menunggu persetujuan guru.</p>
            ) : (
              <>
                {statusAkses(store, t, user.id).catatan && !akses.error && <p className="ui-text">{statusAkses(store, t, user.id).catatan} Kamu bisa minta lagi.</p>}
                <div><Button variant="amber" disabled={akses.loading} onClick={mintaAkses}>{akses.loading ? "Mengirim..." : <><I n="send" s={14} /> Minta akses susulan</>}</Button></div>
                {akses.error && <p className="ui-text" style={{ color: "var(--bad)" }}>{akses.error}</p>}
              </>
            )}
          </Card>
        )}

        {!done && kelasTotal > 1 && kelasPct > 0 && (
          <Card label="Progres kelas" aside={`${kelasDone}/${kelasTotal}`}>
            <Meter value={kelasDone} max={kelasTotal} label={`${kelasDone} dari ${kelasTotal} teman sudah mengerjakan`} />
            <p className="ui-text">{kelasPct >= 80 ? "Hampir semua temanmu sudah mengerjakan tugas ini." : kelasPct >= 50 ? "Sebagian besar kelas sudah selesai." : `${kelasDone} temanmu sudah mengerjakan tugas ini.`}</p>
          </Card>
        )}
      </Page>
    </div>
  );
}

// ═══════════════════════════ REVIEW JAWABAN ═══════════════════════════
const huruf = (soal, i) => (soal.type === "tf" ? (i === 0 ? "B" : "S") : String.fromCharCode(65 + i));

function Opsi({ soal, keyIdx, picked }) {
  const opsi = soal.type === "tf" ? ["Benar", "Salah"] : soal.opsi || [];
  const isKey = i => (Array.isArray(keyIdx) ? keyIdx.includes(i) : keyIdx === i);
  const isPicked = i => (Array.isArray(picked) ? picked.includes(i) : picked === i);
  return (
    <div className="sw-opts">
      {opsi.map((o, i) => {
        const k = isKey(i), p = isPicked(i);
        return (
          <div key={i} className={`sw-opt${k ? " key" : p ? " wrong" : ""}`}>
            <span className="sw-opt-l">{huruf(soal, i)}</span>
            <span className="sw-opt-t">{o}</span>
            {(k || p) && <span className="sw-opt-tag">{k && p ? "Jawabanmu · benar" : k ? "Kunci" : "Jawabanmu"}</span>}
          </div>
        );
      })}
    </div>
  );
}

const Jawab = ({ label = "Jawabanmu", children, mono = false, tone = "" }) => (
  <div className="sw-ans">
    <span className="sw-ans-k">{label}</span>
    <div className={`sw-ans-v${mono ? " mono" : ""}${tone ? " " + tone : ""}`}>{children}</div>
  </div>
);
const Kosong = () => <em className="sw-empty">(tidak dijawab)</em>;

export function ReviewTugasSiswa({ user, store, tugasId, navigate }) {
  const t = store.getTugas().find(x => x.id === tugasId);
  const back = () => navigate("tugas-detail", { tugasId });
  const shell = msg => <div className="sw"><TopBar title="Review Jawaban" onBack={back} /><Page><Card center><p className="ui-text">{msg}</p></Card></Page></div>;
  if (!t) return shell("Tugas tidak ditemukan.");
  const sub = store.getSubBy(user.id, t.id);
  if (!sub) return shell("Kamu belum mengerjakan tugas ini.");

  // soalId (stabil) diutamakan, origIdx sebagai cadangan untuk submission lama
  const byIdx = {}, byId = {};
  (sub.soalResults || []).forEach(r => { byIdx[r.origIdx] = r; if (r.soalId) byId[r.soalId] = r; });
  const soalList = t.soal || [];
  const res = soalList.map((soal, idx) => {
    const r = byId[soal.id] || byIdx[idx];
    const manual = soal.type === "essay" || soal.type === "refleksi";
    const dinilai = manual && r?.statusNilai === "dinilai";
    const benar = manual ? dinilai && (r?.nilaiEssay || 0) >= 60 : r?.correct === true;
    return { soal, idx, r, manual, dinilai, benar };
  });
  const nBenar = res.filter(x => !x.manual && x.benar).length;
  const nSalah = res.filter(x => !x.manual && !x.benar).length;
  const nTunggu = res.filter(x => x.manual && !x.dinilai).length;

  return (
    <div className="sw">
      <TopBar title="Review Jawaban" onBack={back} />
      <Page size="mid">
        <button type="button" className="ui-link sw-back-desk" onClick={back}><I n="chevL" s={12} /> Detail tugas</button>
        <PageHeader eyebrow={`${t.mapel} · Review jawaban`} title={t.judul} />

        <Card label="Hasilmu">
          <div className="ui-stat">
            <div className={`ui-stat-num${sub.nilai < KKTP ? " sw-below" : ""}`}>{sub.nilai}</div>
            <div style={{ flex: 1 }}>
              <p>{sub.correctCount} dari {sub.total} soal benar · +{sub.poinDapat || 0} poin</p>
              <div style={{ marginTop: 8 }}><ScoreBar value={sub.nilai} /></div>
            </div>
          </div>
          <div className="sw-tally">
            <StatusChip>{nBenar} benar</StatusChip>
            {nSalah > 0 && <StatusChip tone="amber">{nSalah} salah</StatusChip>}
            {nTunggu > 0 && <StatusChip tone="muted">{nTunggu} menunggu dinilai guru</StatusChip>}
          </div>
        </Card>

        {res.map(({ soal, idx, r, manual, dinilai, benar }) => (
          <Card key={idx} label={`Soal ${idx + 1}`}
            aside={manual
              ? (dinilai ? <StatusChip tone={benar ? "teal" : "amber"}>{soal.type === "refleksi" ? "Refleksi" : "Esai"} · {r.nilaiEssay}/100</StatusChip> : <StatusChip tone="muted">Belum dinilai</StatusChip>)
              : <StatusChip tone={benar ? "teal" : "amber"}>{benar ? "Benar" : "Salah"}</StatusChip>}>
            <div className="sw-q">{soal.pertanyaan}</div>
            {soal.gambar && <img className="sw-q-img" src={soal.gambar} alt="" />}

            {(soal.type === "pg" || soal.type === "tf" || soal.type === "excel") && <Opsi soal={soal} keyIdx={soal.jawaban} picked={r?.pickedAnswer} />}
            {soal.type === "komplex" && <Opsi soal={soal} keyIdx={soal.jawaban || []} picked={r?.pickedMulti || []} />}

            {soal.type === "pasang" && (
              <div className="sw-pairs">
                {(soal.kiri || []).map((k, ki) => {
                  const kunci = (soal.jawaban || [])[ki];
                  const pilih = (r?.pickedPasang || {})[ki];
                  const ok = pilih === kunci;
                  return (
                    <div key={ki} className="sw-pair">
                      <span className="sw-pair-l">{k}</span>
                      <span className="sw-pair-r">
                        <b>{soal.kanan?.[kunci] ?? "–"}</b>
                        {r?.pickedPasang && !ok && <small>Jawabanmu: {pilih != null ? soal.kanan?.[pilih] : "tidak dijawab"}</small>}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {soal.type === "essay" && (
              <>
                <Jawab>{r?.jawabanEssay || <Kosong />}</Jawab>
                {r?.komentarGuru && <div className="sw-note"><b>Komentar guru</b>{r.komentarGuru}</div>}
              </>
            )}

            {soal.type === "pseudocode" && (
              <>
                <pre className="sw-code">{soal.kode}</pre>
                <Jawab mono tone={benar ? "ok" : "no"}>{r?.pickedText || <Kosong />}</Jawab>
                <Jawab label="Output benar" mono>{soal.jawabanBenar}</Jawab>
              </>
            )}

            {soal.type === "debug" && (
              <>
                <div className="sw-code lines">
                  {(soal.kodeBuggy || "").split("\n").map((line, i) => (
                    <div key={i} className={i + 1 === soal.barisBug ? "bug" : ""}><span>{i + 1}</span><code>{line || " "}</code></div>
                  ))}
                </div>
                <Jawab tone={benar ? "ok" : "no"}>Baris <b>{r?.pickedDebug?.baris ?? "–"}</b> · <span className="mono">{r?.pickedDebug?.perbaikan || "(kosong)"}</span></Jawab>
                <Jawab label="Kunci">Baris <b>{soal.barisBug}</b> · <span className="mono">{soal.perbaikanBenar}</span></Jawab>
              </>
            )}

            {soal.type === "refleksi" && (
              <>
                {["k1", "k2", "k3", "k4"].map((key, i) => (
                  <Jawab key={key} label={`${i + 1}. ${soal[`labelKolom${i + 1}`] || ["Prediksi saya", "Yang saya observasi", "Yang salah/bug", "Pelajaran yang saya ambil"][i]}`}>
                    {r?.jawabanRefleksi?.[key] || <Kosong />}
                  </Jawab>
                ))}
                {r?.komentarGuru && <div className="sw-note"><b>Komentar guru</b>{r.komentarGuru}</div>}
              </>
            )}

            {soal.pembahasan && soal.pembahasan.trim() && <div className="sw-note"><b>Pembahasan</b>{soal.pembahasan}</div>}
          </Card>
        ))}
      </Page>
    </div>
  );
}

// ═══════════════════════════ HASIL SETELAH MENGUMPULKAN ═══════════════════════════
// Dipanggil dari KerjakanTugas (App.jsx) setelah submit berhasil. Hanya tampilan; nilai & poin sudah dihitung di sana.
export function HasilTugas({ t, user, store, navigate, result, total, background }) {
  const now = useNow(30000);
  const newPoin = store.getStats(user.id).poin || 0;
  const sisa = store.getTugas().filter(st => {
    if (st.id === t.id || st.jenjang !== user.jenjang || st.status !== "aktif") return false;
    if (!untukSaya(st, user.id) || store.hasSub(user.id, st.id)) return false;
    return !isLewat(st) || store.isSusulanAktif(st.id, user.id);
  });
  const adaEsai = (t.soal || []).some(s => s.type === "essay" || s.type === "refleksi");

  // Momen kelas: urutan menyelesaikan, atau persentase kelas
  const siswa = Array.isArray(t.assignedTo) ? store.getAllSiswa(t.jenjang).filter(s => t.assignedTo.includes(s.id)) : store.getAllSiswa(t.jenjang);
  const kTotal = siswa.length;
  const kDone = store.getSubs().filter(s => s.tugasId === t.id).length;
  const kPct = kTotal ? Math.round(kDone / kTotal * 100) : 0;
  let momen = null;
  if (kTotal >= 2) {
    if (kPct >= 100) momen = "Seluruh kelas sudah menyelesaikan tugas ini.";
    else if (kDone <= Math.ceil(kTotal * 0.5)) momen = `Kamu yang ke-${kDone} di kelasmu yang menyelesaikan tugas ini.`;
    else if (kPct >= 50) momen = `Kelas sudah ${kPct}% selesai.`;
  }
  const tutup = () => navigate("leaderboard");

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {background}
      <div className="modal-overlay" style={{ zIndex: 250, position: "fixed" }}>
        <div className="sw-pop" role="dialog" aria-modal="true" aria-labelledby="sw-hasil-h">
          <div className="sw-pop-head">
            <div><span className="sw-pop-k">Tugas terkumpul</span><h2 id="sw-hasil-h">{t.judul}</h2></div>
            <button type="button" className="sw-x" onClick={tutup} aria-label="Tutup"><I n="x" s={16} /></button>
          </div>
          <div className="sw-pop-body">
            <div className="sw-score">
              <b className={result.nilai < KKTP ? "sw-below" : ""}>{result.nilai}</b>
              <span>{result.correctCount} dari {total} soal benar · +{result.poinDapat} poin</span>
              {adaEsai && <small>Soal esai dan refleksi dinilai guru menyusul, jadi nilai ini bisa berubah.</small>}
            </div>
            {momen && <div className="sw-momen">{momen}</div>}
            {!result.ontime && <ActionCallout title="Dikumpulkan lewat tenggat" note="Streak kamu kembali ke 0. Kerjakan tugas berikutnya tepat waktu untuk memulai lagi." />}
            <LevelCard poin={newPoin} />
            {result.newBadges?.length > 0 && (
              <div className="sw-badges">
                <span className="ui-label">Badge baru</span>
                <div>{result.newBadges.map(id => <BadgeChip key={id} badgeId={id} />)}</div>
              </div>
            )}
            {sisa.length > 0 ? (
              <div>
                <div className="ui-label-row" style={{ marginBottom: 4 }}><span className="ui-label">Masih ada {sisa.length} tugas</span></div>
                <Items>{sisa.map(st => <TugasItem key={st.id} t={st} user={user} store={store} now={now} navigate={navigate} showMapel direct={false} />)}</Items>
              </div>
            ) : (
              <p className="ui-text" style={{ textAlign: "center" }}>Semua tugas sudah kamu kerjakan.</p>
            )}
          </div>
          <div className="sw-pop-foot">
            <Button full variant={sisa.length ? "outline" : "primary"} onClick={tutup}>Lihat ranking <I n="chevR" s={14} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

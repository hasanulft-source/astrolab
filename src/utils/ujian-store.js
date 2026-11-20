// Astrolab — Mode Ujian: bagian store (dipanggil dari useStore di App.jsx).
// Firebase dikirim lewat parameter `fb` supaya file ini tidak meng-import App.jsx (hindari import melingkar).
//
// Node Firebase (rules lihat database.rules.json):
//   ujian/{id}                 meta + soal TANPA kunci. Guru: semua. Siswa: hanya ujian kelasnya yang bukan draf.
//   ujianAktif/{jenjang}       id ujian yang sedang tampil di layar siswa kelas itu
//   ujianKunci/{id}            kunci jawaban — hanya guru
//   ujianJawaban/{id}/{sid}    { mulaiAt, answers:{soalId:val}, hb, submittedAt, cara, nama }
//   ujianLog/{id}/{sid}/{push} { jenis: keluar|kembali|layar_penuh, t, durasi?, sebab? }
//   ujianHasil/{id}/{sid}      ditulis guru; siswa baca miliknya setelah hasilTerbit
import { useState, useEffect, useRef } from "react";
import { pisahKunci } from "./ujian-nilai";

export function useUjianStore(fb, currentUser, ext = {}) {
  const { db, ref, onValue, update, push, serverTimestamp } = fb;
  const isGuru = currentUser?.role === "guru";
  const myId = currentUser?.id || null;
  const myJenjang = currentUser?.jenjang || null;

  // Selisih jam perangkat vs jam server Firebase (timer ujian pakai jam server)
  const [offset, setOffset] = useState(0);
  useEffect(() => onValue(ref(db, ".info/serverTimeOffset"), s => setOffset(Number(s.val()) || 0)), []);
  const waktuServer = () => Date.now() + offset;

  const [aktifMap, setAktifMap] = useState({});
  useEffect(() => {
    if (!myId) { setAktifMap({}); return; }
    return onValue(ref(db, "ujianAktif"), s => setAktifMap(s.val() || {}), () => setAktifMap({}));
  }, [myId]);

  // ─── GURU ───
  const [semua, setSemua] = useState({});
  const [kunciSemua, setKunciSemua] = useState({});
  useEffect(() => {
    if (!isGuru) { setSemua({}); setKunciSemua({}); return; }
    const u1 = onValue(ref(db, "ujian"), s => setSemua(s.val() || {}), () => setSemua({}));
    const u2 = onValue(ref(db, "ujianKunci"), s => setKunciSemua(s.val() || {}), () => setKunciSemua({}));
    return () => { u1(); u2(); };
  }, [isGuru]);

  // Data langsung satu ujian yang sedang dibuka guru (hemat kuota: hanya satu ujian di-listen)
  const [pantauId, setPantauId] = useState(null);
  const [pantau, setPantau] = useState({ jawaban: {}, log: {}, hasil: {} });
  useEffect(() => {
    setPantau({ jawaban: {}, log: {}, hasil: {} });
    if (!isGuru || !pantauId) return;
    const set = k => s => setPantau(p => ({ ...p, [k]: s.val() || {} }));
    const u = [
      onValue(ref(db, `ujianJawaban/${pantauId}`), set("jawaban"), () => {}),
      onValue(ref(db, `ujianLog/${pantauId}`), set("log"), () => {}),
      onValue(ref(db, `ujianHasil/${pantauId}`), set("hasil"), () => {}),
    ];
    return () => u.forEach(f => f());
  }, [isGuru, pantauId]);

  const getUjianList = () => Object.entries(semua).map(([id, u]) => ({ id, ...u })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const getUjian = id => (semua[id] ? { id, ...semua[id] } : null);
  const getKunciUjian = id => kunciSemua[id] || {};
  const getUjianAktifId = jenjang => aktifMap[jenjang] || null;

  async function buatUjian(data, soalLengkap) {
    const id = push(ref(db, "ujian")).key;
    const { soal, kunci } = pisahKunci(soalLengkap);
    await update(ref(db), {
      [`ujian/${id}`]: JSON.parse(JSON.stringify({ ...data, soal, status: "draf", createdAt: Date.now() })),
      [`ujianKunci/${id}`]: JSON.parse(JSON.stringify(kunci)),
    });
    return id;
  }
  async function ubahUjian(id, data, soalLengkap = null) {
    const patch = {};
    Object.entries(data).forEach(([k, v]) => { patch[`ujian/${id}/${k}`] = v ?? null; });
    if (soalLengkap) {
      const { soal, kunci } = pisahKunci(soalLengkap);
      patch[`ujian/${id}/soal`] = JSON.parse(JSON.stringify(soal));
      patch[`ujianKunci/${id}`] = JSON.parse(JSON.stringify(kunci));
    }
    await update(ref(db), patch);
  }
  async function mulaiUjian(id) {
    const u = getUjian(id);
    if (!u) throw new Error("Ujian tidak ditemukan");
    const lain = aktifMap[u.jenjang];
    if (lain && lain !== id && semua[lain]?.status === "aktif") throw new Error(`Masih ada ujian lain yang berjalan di Kelas ${u.jenjang}. Akhiri dulu.`);
    const mulaiAt = waktuServer();
    await update(ref(db), {
      [`ujian/${id}/status`]: "aktif",
      [`ujian/${id}/mulaiAt`]: mulaiAt,
      [`ujian/${id}/berakhirAt`]: mulaiAt + (Number(u.durasi) || 60) * 60000,
      [`ujianAktif/${u.jenjang}`]: id,
    });
  }
  async function perpanjangUjian(id, menit) {
    const u = getUjian(id);
    const dasar = Math.max(u?.berakhirAt || 0, waktuServer());
    await update(ref(db, `ujian/${id}`), { berakhirAt: dasar + menit * 60000, status: "aktif" });
  }
  // Waktu ditutup sekarang. Siswa masih punya 60 dtk (sesuai rules) untuk kirim jawaban terakhir otomatis.
  async function akhiriUjian(id) {
    const t = waktuServer();
    await update(ref(db, `ujian/${id}`), { status: "selesai", berakhirAt: t, selesaiAt: t });
  }
  async function kunciSiswaUjian(id, sid) {
    await update(ref(db, `ujianJawaban/${id}/${sid}`), { submittedAt: waktuServer(), cara: "dikunci guru" });
  }
  async function bukaKunciSiswaUjian(id, sid) {
    await update(ref(db, `ujianJawaban/${id}/${sid}`), { submittedAt: null, cara: null });
  }
  async function simpanHasilUjian(id, hasil) {
    await update(ref(db), { [`ujianHasil/${id}`]: JSON.parse(JSON.stringify(hasil)), [`ujian/${id}/dinilaiAt`]: Date.now() });
  }
  async function terbitkanHasilUjian(id, terbit) {
    await update(ref(db, `ujian/${id}`), { hasilTerbit: !!terbit });
  }
  async function tutupUjianDariSiswa(id) {
    const u = getUjian(id);
    if (u && aktifMap[u.jenjang] === id) await update(ref(db), { [`ujianAktif/${u.jenjang}`]: null });
  }
  async function tampilkanUjianKeSiswa(id) {
    const u = getUjian(id);
    if (u) await update(ref(db), { [`ujianAktif/${u.jenjang}`]: id });
  }
  async function hapusUjian(id) {
    const u = getUjian(id);
    const patch = { [`ujian/${id}`]: null, [`ujianKunci/${id}`]: null, [`ujianJawaban/${id}`]: null, [`ujianLog/${id}`]: null, [`ujianHasil/${id}`]: null };
    if (u && aktifMap[u.jenjang] === id) patch[`ujianAktif/${u.jenjang}`] = null;
    await update(ref(db), patch);
  }

  // ─── SISWA ───
  const idSaya = !isGuru && myJenjang ? aktifMap[myJenjang] || null : null;
  const [ujianSaya, setUjianSaya] = useState(null);
  useEffect(() => {
    setUjianSaya(null);
    if (!idSaya) return;
    return onValue(ref(db, `ujian/${idSaya}`), s => setUjianSaya(s.exists() ? { id: idSaya, ...s.val() } : null), () => setUjianSaya(null));
  }, [idSaya]);
  const [jawabanSaya, setJawabanSaya] = useState(null);
  useEffect(() => {
    setJawabanSaya(null);
    if (!idSaya || !myId) return;
    return onValue(ref(db, `ujianJawaban/${idSaya}/${myId}`), s => setJawabanSaya(s.val() || {}), () => setJawabanSaya({}));
  }, [idSaya, myId]);
  const terbit = !!ujianSaya?.hasilTerbit;
  const [hasilSaya, setHasilSaya] = useState(null);
  useEffect(() => {
    setHasilSaya(null);
    if (!idSaya || !myId || !terbit) return;
    return onValue(ref(db, `ujianHasil/${idSaya}/${myId}`), s => setHasilSaya(s.val()), () => setHasilSaya(null));
  }, [idSaya, myId, terbit]);

  const jRef = () => ref(db, `ujianJawaban/${idSaya}/${myId}`);
  async function mulaiKerjakanUjian() {
    if (!idSaya || !myId || jawabanSaya?.mulaiAt) return;
    await update(jRef(), { mulaiAt: serverTimestamp(), hb: serverTimestamp(), nama: currentUser?.nama || myId });
  }
  async function simpanJawabanUjian(soalId, val) {
    if (!idSaya || !myId) return;
    await update(jRef(), { [`answers/${soalId}`]: val ?? null, hb: serverTimestamp() });
  }
  async function detakUjian() {
    if (!idSaya || !myId) return;
    await update(jRef(), { hb: serverTimestamp() });
  }
  async function kumpulkanUjian(cara = "siswa") {
    if (!idSaya || !myId) return;
    await update(jRef(), { submittedAt: serverTimestamp(), cara });
  }
  // Catat pelanggaran + kabari guru lewat push (maks. 1 push / 20 dtk per siswa)
  const pushTerakhir = useRef(0);
  async function catatLogUjian(jenis, ekstra = {}) {
    if (!idSaya || !myId) return;
    try { await push(ref(db, `ujianLog/${idSaya}/${myId}`), { jenis, t: serverTimestamp(), ...ekstra }); } catch {}
    if (jenis === "keluar" && ext.callPush && Date.now() - pushTerakhir.current > 20000) {
      pushTerakhir.current = Date.now();
      const nama = currentUser?.namaDisplay || currentUser?.nama || myId;
      ext.callPush("send", {
        targetAccountId: ext.guruId ? ext.guruId() : "fata",
        title: `${nama} keluar dari layar ujian`,
        body: `${ujianSaya?.judul || "Ujian"} · Kelas ${myJenjang} · ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`,
        tag: `ujian-${myId}`,
      }).catch?.(() => {});
    }
  }

  return {
    waktuServer, getUjianList, getUjian, getKunciUjian, getUjianAktifId,
    pantauUjian: setPantauId, getPantauUjian: () => pantau,
    buatUjian, ubahUjian, mulaiUjian, perpanjangUjian, akhiriUjian, kunciSiswaUjian, bukaKunciSiswaUjian,
    simpanHasilUjian, terbitkanHasilUjian, tutupUjianDariSiswa, tampilkanUjianKeSiswa, hapusUjian,
    getUjianSaya: () => ujianSaya, getJawabanUjianSaya: () => jawabanSaya, getHasilUjianSaya: () => hasilSaya,
    mulaiKerjakanUjian, simpanJawabanUjian, detakUjian, kumpulkanUjian, catatLogUjian,
  };
}

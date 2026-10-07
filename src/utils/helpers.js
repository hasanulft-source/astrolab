// Astrolab — Pure utility helpers
// Extracted from App.jsx (Wave 1 Step 3)

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fmtDl(dl) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dl); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - now) / 86400000);
  if (diff < 0) return { label: "Lewat deadline", tone: "bad" };
  if (diff === 0) return { label: "Hari ini!", tone: "warn" };
  if (diff <= 3) return { label: `${diff} hari lagi`, tone: "warn" };
  return { label: `${diff} hari lagi`, tone: "" };
}
export function uid() { return Math.random().toString(36).slice(2, 10); }

// Tahun ajaran di Indonesia dimulai Juli, berakhir Juni tahun depan.
// Semester Ganjil: Juli–Desember. Semester Genap: Januari–Juni.
export function getTahunAjaran(date = new Date()) {
  const month = date.getMonth(); // 0 = Januari
  const year = date.getFullYear();
  // Juli (6) ke depan = mulai tahun ajaran baru
  if (month >= 6) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}
export function getSemesterAktif(date = new Date()) {
  const month = date.getMonth();
  // Juli–Desember = Ganjil; Januari–Juni = Genap
  return (month >= 6 && month <= 11) ? "Ganjil" : "Genap";
}
export function getPeriodeAktif(date = new Date()) {
  return `Semester ${getSemesterAktif(date)} ${getTahunAjaran(date)}`;
}
// Generate opsi dropdown periode: 4 jenis × 3 tahun (lalu, sekarang, depan)
export function getPeriodeOptions(date = new Date()) {
  const ta = getTahunAjaran(date);
  const [yStart] = ta.split("/").map(Number);
  const tahunList = [
    `${yStart - 1}/${yStart}`,
    `${yStart}/${yStart + 1}`,
    `${yStart + 1}/${yStart + 2}`,
  ];
  const jenis = ["Semester Ganjil", "Semester Genap", "Tengah Semester Ganjil", "Tengah Semester Genap"];
  // Default tahun aktif duluan, lalu jenis lain di tahun aktif, lalu tahun lain
  const tahunAktif = ta;
  const result = [];
  // Tahun aktif: semua 4 jenis
  jenis.forEach(j => result.push(`${j} ${tahunAktif}`));
  // Tahun lain: semua 4 jenis
  tahunList.filter(y => y !== tahunAktif).forEach(y => {
    jenis.forEach(j => result.push(`${j} ${y}`));
  });
  return result;
}

// Format last seen timestamp jadi teks relatif
export function fmtLastSeen(ts) {
  if (!ts) return null;
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "kemarin";
  if (days < 7) return `${days} hari lalu`;
  const d = new Date(ts);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// Firebase Realtime DB tidak fail-fast saat offline — promise menggantung sampai network balik.
// Helper ini membungkus promise dengan timeout 10 detik supaya user dapat feedback jelas
// kalau koneksi lambat/terputus, bukannya nunggu UI freeze tanpa kepastian.
export function withTimeout(promise, ms = 10000, errMsg = "Koneksi lambat atau terputus. Cek internet kamu lalu coba lagi.") {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errMsg)), ms)),
  ]);
}

// Dipakai untuk grading tipe soal Pseudocode Trace (output) dan Debug Challenge (perbaikan).
// Strategy: normalisasi (lowercase + collapse whitespace + trim) lalu exact match.
// Toleran typo spasi/case, tapi strict soal typo huruf. Cocok untuk output pendek & syntax code.
export function fuzzyMatchText(input, expected) {
  const norm = s => (s == null ? "" : s.toString()).toLowerCase().replace(/\s+/g, " ").trim();
  const a = norm(input), b = norm(expected);
  return a.length > 0 && a === b;
}

export async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL("image/jpeg", quality);
        resolve(b64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const SKIP_PREFIXES = new Set([
  "muhammad","muhamad","ahmad","ahmed","abdul","abdu","abd",
  "nur","noor","siti","sitti","st","hj","h","dra","dr","ir",
  "m","a","r","s","n","d","f","z","e","y","k","l","t","w","b","c","g","j","o","p","q","u","v","x"
]);

export function genSiswaId(nama, usedIds = new Set()) {
  const words = nama.trim().toLowerCase().split(/\s+/).map(w => w.replace(/\./g, ""));
  const meaningful = words.find(w => w.length > 1 && !SKIP_PREFIXES.has(w)) || words[words.length - 1];
  let baseId = meaningful.replace(/[^a-z]/g, "");
  let finalId = baseId;
  let counter = 2;
  while (usedIds.has(finalId)) { finalId = `${baseId}${counter}`; counter++; }
  return finalId;
}

// Get meaningful first name (skip "M.", "Muh.", "Abd.", "Siti", dll)
export function getFirstName(nama) {
  if (!nama) return "";
  const words = nama.trim().split(/\s+/);
  // Cari kata pertama yang meaningful (skip prefix religius/initials)
  const meaningful = words.find(w => {
    const clean = w.toLowerCase().replace(/\./g, "");
    return clean.length > 1 && !SKIP_PREFIXES.has(clean);
  });
  return meaningful || words[0] || "";
}

export function genPassword(id) {
  const num = Math.floor(Math.random() * 900) + 100;
  return `${id}${num}`;
}

// Astrolab — Excel & Export Utilities
// Extracted from App.jsx (Wave 3)

import { uid, getTahunAjaran } from './helpers.js';
import { hitungSemua, addr as alamatSel, colIdx, colName } from './rumus.js';

// Centralized ExcelJS loader — used for ALL Excel read/write operations.
// SheetJS removed from public CDNs (403), ExcelJS 4.4.0 on cdnjs is the replacement.
async function loadExcelJS() {
  if (window.ExcelJS) return window.ExcelJS;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    s.onload = res;
    s.onerror = () => rej(new Error("Gagal memuat library ExcelJS dari CDN."));
    document.head.appendChild(s);
  });
  return window.ExcelJS;
}

// Convert ExcelJS worksheet → array of objects (mimics SheetJS sheet_to_json).
// Each object uses the header row values as keys.
// Uses ws.eachRow() instead of ws.rowCount (which can be 0 after wb.xlsx.load).
function excelSheetToJson(ws, { defval = undefined } = {}) {
  if (!ws) return [];
  // Collect all rows via eachRow — reliable even when rowCount is wrong
  const allRows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    allRows.push(row);
  });
  if (allRows.length < 2) return []; // need header + at least 1 data row

  // Row 0 in allRows = header row
  const headers = [];
  allRows[0].eachCell({ includeEmpty: true }, (cell, col) => {
    let v = cell.value;
    if (v && typeof v === "object" && v.richText) v = v.richText.map(p => p.text).join("");
    headers[col] = (v ?? "").toString().trim();
  });

  // Remaining rows = data
  const rows = [];
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    let empty = true;
    const obj = {};
    headers.forEach((h, col) => {
      if (!h) return;
      let v = row.getCell(col).value;
      if (v && typeof v === "object" && v.richText) {
        v = v.richText.map(p => p.text).join("");
      }
      if (v === null || v === undefined) {
        obj[h] = defval !== undefined ? defval : undefined;
      } else {
        obj[h] = v;
        empty = false;
      }
    });
    if (!empty) rows.push(obj);
  }
  return rows;
}



export async function downloadTemplateSoal() {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Astrolab · Our Classroom";

  const headerStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6B7A" } }, font: { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } };
  const exampleStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF4F3" } }, font: { name: "Arial", italic: true, color: { argb: "FF6B7280" }, size: 10 }, alignment: { vertical: "top", wrapText: true } };

  // Sheet 1: Pilihan Ganda
  const ws1 = wb.addWorksheet("1. Pilihan Ganda", { properties: { tabColor: { argb: "FF3B82F6" } } });
  ws1.columns = [
    { header: "Pertanyaan", width: 50 },
    { header: "Pilihan A", width: 20 },
    { header: "Pilihan B", width: 20 },
    { header: "Pilihan C", width: 20 },
    { header: "Pilihan D", width: 20 },
    { header: "Jawaban (A/B/C/D)", width: 18 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws1.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws1.getRow(1).height = 35;
  ws1.addRow(["Apa ibukota Indonesia?", "Surabaya", "Jakarta", "Bandung", "Medan", "B", 10, "Jakarta adalah ibukota Indonesia sejak 1945.", "geografi, indonesia"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 2: Benar/Salah
  const ws2 = wb.addWorksheet("2. Benar Salah", { properties: { tabColor: { argb: "FF10B981" } } });
  ws2.columns = [
    { header: "Pernyataan", width: 60 },
    { header: "Jawaban (Benar/Salah)", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws2.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws2.getRow(1).height = 35;
  ws2.addRow(["Matahari adalah bintang terdekat dengan bumi.", "Benar", 10, "Matahari ±150 juta km dari Bumi (1 AU), bintang terdekat.", "astronomi, bintang"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 3: PG Kompleks
  const ws3 = wb.addWorksheet("3. PG Kompleks", { properties: { tabColor: { argb: "FFF97316" } } });
  ws3.columns = [
    { header: "Pertanyaan", width: 50 },
    { header: "Pilihan A", width: 20 },
    { header: "Pilihan B", width: 20 },
    { header: "Pilihan C", width: 20 },
    { header: "Pilihan D", width: 20 },
    { header: "Jawaban Benar (A,B,C,D)", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws3.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws3.getRow(1).height = 35;
  ws3.addRow(["Manakah yang termasuk planet di tata surya?", "Bumi", "Mars", "Bulan", "Venus", "A,B,D", 15, "Bumi, Mars, Venus = planet. Bulan = satelit alami Bumi.", "astronomi, tata-surya"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 4: Pasangkan
  const ws4 = wb.addWorksheet("4. Pasangkan", { properties: { tabColor: { argb: "FF8B5CF6" } } });
  ws4.columns = [
    { header: "Pertanyaan / Instruksi", width: 40 },
    { header: "Item Kiri 1", width: 18 }, { header: "Pasangan Kanan 1", width: 22 },
    { header: "Item Kiri 2", width: 18 }, { header: "Pasangan Kanan 2", width: 22 },
    { header: "Item Kiri 3", width: 18 }, { header: "Pasangan Kanan 3", width: 22 },
    { header: "Item Kiri 4", width: 18 }, { header: "Pasangan Kanan 4", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws4.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws4.getRow(1).height = 35;
  ws4.addRow(["Pasangkan negara dengan ibukotanya", "Indonesia", "Jakarta", "Malaysia", "Kuala Lumpur", "Thailand", "Bangkok", "Singapura", "Singapura", 10, "Ibukota negara ASEAN. Singapura adalah negara-kota.", "geografi, asean"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 5: Excel Sandbox
  const ws5 = wb.addWorksheet("5. Excel Sandbox", { properties: { tabColor: { argb: "FFEAB308" } } });
  ws5.columns = [
    { header: "Pertanyaan", width: 40 },
    { header: "Header Kolom (pisah |)", width: 25 },
    { header: "Data Tabel (baris pisah ;, kolom pisah |)", width: 40 },
    { header: "Pilihan A", width: 15 },
    { header: "Pilihan B", width: 15 },
    { header: "Pilihan C", width: 15 },
    { header: "Pilihan D", width: 15 },
    { header: "Jawaban (A/B/C/D)", width: 18 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws5.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws5.getRow(1).height = 35;
  ws5.addRow([
    "Hitung rata-rata nilai siswa di tabel berikut",
    "Nama|Nilai",
    "Budi|85;Sari|92;Andi|78",
    "75", "85", "92", "78", "B", 15,
    "Rata-rata = (85+92+78)/3 = 85. Pakai =AVERAGE(B2:B4).",
    "informatika, excel"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 6: Essay
  const ws6 = wb.addWorksheet("6. Essay", { properties: { tabColor: { argb: "FFEC4899" } } });
  ws6.columns = [
    { header: "Pertanyaan", width: 50 },
    { header: "Kata Kunci (pisah koma)", width: 35 },
    { header: "Panduan Penilaian", width: 40 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws6.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws6.getRow(1).height = 35;
  ws6.addRow([
    "Jelaskan proses fotosintesis pada tumbuhan!",
    "klorofil, cahaya matahari, karbondioksida, glukosa, oksigen",
    "Nilai 100 jika menjelaskan 5 elemen lengkap, 70 jika 3 elemen, 40 jika hanya menyebut",
    20,
    "6CO2 + 6H2O + cahaya → C6H12O6 + 6O2. Terjadi di kloroplas dengan klorofil.",
    "biologi, tumbuhan"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 7: Pseudocode Trace (khusus Informatika)
  const ws7p = wb.addWorksheet("7. Pseudocode Trace", { properties: { tabColor: { argb: "FF06B6D4" } } });
  ws7p.columns = [
    { header: "Pertanyaan", width: 40 },
    { header: "Kode Pseudocode", width: 45 },
    { header: "Jawaban Output", width: 25 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws7p.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws7p.getRow(1).height = 35;
  ws7p.addRow([
    "Trace output dari pseudocode berikut:",
    "x = 5\ny = 3\nz = x + y\nprint(z)\nprint(x * y)",
    "8\n15",
    10,
    "Baris 3: z = 5+3 = 8. Baris 4 cetak z. Baris 5 cetak 5*3 = 15.",
    "informatika, pseudocode, trace"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 8: Debug Challenge (khusus Informatika)
  const ws8d = wb.addWorksheet("8. Debug Challenge", { properties: { tabColor: { argb: "FFDC2626" } } });
  ws8d.columns = [
    { header: "Pertanyaan", width: 40 },
    { header: "Kode Buggy", width: 45 },
    { header: "Nomor Baris Bug", width: 15 },
    { header: "Perbaikan yang Benar", width: 30 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws8d.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws8d.getRow(1).height = 35;
  ws8d.addRow([
    "Ada bug pada kode berikut. Cari baris yang salah dan tulis perbaikannya:",
    "total = 0\nfor i = 1 to 5\n  total = total + i\nprint(total * 2)",
    4,
    "print(total)",
    15,
    "Baris 4 seharusnya cetak total saja, bukan total*2 (yang tidak sesuai instruksi).",
    "informatika, debug"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 9: Refleksi Terstruktur (4 kolom wajib)
  const ws9r = wb.addWorksheet("9. Refleksi", { properties: { tabColor: { argb: "FF7C3AED" } } });
  ws9r.columns = [
    { header: "Prompt Utama", width: 45 },
    { header: "Label Kolom 1", width: 22 },
    { header: "Label Kolom 2", width: 22 },
    { header: "Label Kolom 3", width: 22 },
    { header: "Label Kolom 4", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Panduan Penilaian", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws9r.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws9r.getRow(1).height = 35;
  ws9r.addRow([
    "Refleksikan proses debugging kamu tadi.",
    "Prediksi saya",
    "Yang saya observasi",
    "Yang salah/bug",
    "Pelajaran yang saya ambil",
    20,
    "Nilai 100 kalau semua 4 kolom terisi dengan reflektif dan spesifik. Turun proporsional untuk yang generik atau kosong.",
    "informatika, refleksi, metakognisi"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet PETUNJUK
  const ws7 = wb.addWorksheet("PETUNJUK", { properties: { tabColor: { argb: "FFDC2626" } } });
  ws7.columns = [{ width: 90 }];
  const petunjuk = [
    "PETUNJUK PENGISIAN TEMPLATE SOAL ASTROLAB",
    "",
    "1. Isi soal di sheet sesuai TIPE soal yang diinginkan (tab di bawah).",
    "2. Setiap baris = 1 soal. Hapus contoh sebelum import (atau biarkan, akan ikut terimport).",
    "3. Kolom POIN: nilai per soal (default 10).",
    "",
    "=== KOLOM BARU ===",
    "",
    "Pembahasan (opsional): penjelasan jawaban yang ditampilkan ke siswa",
    "   setelah deadline. Kosongkan kalau tidak perlu.",
    "",
    "Tags (opsional): label untuk filter di Bank Soal. Pisah dengan koma.",
    "   Contoh: 'bab-3, STS, energi' atau 'astronomi, tata-surya'.",
    "   Tips: gunakan tag konsisten supaya gampang dicari.",
    "",
    "=== TIPE SOAL ===",
    "",
    "Pilihan Ganda: 4 opsi, 1 jawaban. Tulis huruf A/B/C/D di kolom Jawaban.",
    "",
    "Benar/Salah: ketik 'Benar' atau 'Salah' di kolom Jawaban.",
    "",
    "PG Kompleks: Multi jawaban. Pisah dengan koma. Contoh: 'A,B,D'.",
    "",
    "Pasangkan: Isi pasangan kiri-kanan berurutan. Bisa 2-4 pasangan.",
    "",
    "Excel Sandbox (khusus Informatika):",
    "   - Header Kolom: pisah dengan tanda | (pipe). Contoh: 'Nama|Nilai|Kelas'",
    "   - Data Tabel: baris pisah ; (semicolon), kolom pisah | (pipe).",
    "     Contoh: 'Budi|85|VII;Sari|92|VII;Andi|78|VIII'",
    "   - Siswa akan mencoba rumus Excel (SUM, AVERAGE, dll) lalu pilih PG.",
    "",
    "Essay: Jawaban panjang, dinilai manual oleh guru.",
    "   - Kata Kunci: pisah dengan koma. Akan ditampilkan ke guru saat menilai.",
    "   - Panduan Penilaian: rubrik untuk guru, opsional.",
    "",
    "Pseudocode Trace (khusus Informatika): Siswa trace output pseudocode.",
    "   - Kode Pseudocode: tulis dengan baris terpisah pakai Enter (Alt+Enter di Excel).",
    "   - Jawaban Output: hasil output persis (auto-check exact match, toleran spasi/case).",
    "",
    "Debug Challenge (khusus Informatika): Siswa cari bug & tulis perbaikan.",
    "   - Kode Buggy: tulis dengan baris terpisah pakai Enter (Alt+Enter di Excel).",
    "   - Nomor Baris Bug: angka (dihitung dari 1 di atas).",
    "   - Perbaikan yang Benar: kode/teks pengganti baris yang salah (auto-check).",
    "",
    "Refleksi Terstruktur: 4 kolom wajib, dinilai manual oleh guru.",
    "   - Prompt Utama: pertanyaan/instruksi refleksi.",
    "   - Label Kolom 1-4: nama kolom yang siswa isi (contoh default: Prediksi saya,",
    "     Yang saya observasi, Yang salah/bug, Pelajaran yang saya ambil).",
    "   - Semua 4 kolom wajib diisi siswa sebelum bisa submit.",
    "",
    "=== TIPS ===",
    "",
    "- Boleh kosongkan sheet yang tidak dipakai (akan diskip).",
    "- Soal dengan pertanyaan kosong akan diskip otomatis.",
    "- Setelah edit, simpan & upload via tombol 'Import Excel'.",
    "",
    "Astrolab · Our Classroom · © 2026 M. Hasanul Fatta",
  ];
  petunjuk.forEach((line, i) => {
    const row = ws7.addRow([line]);
    if (i === 0) {
      row.font = { name: "Arial", bold: true, size: 14, color: { argb: "FF0D6B7A" } };
      row.height = 26;
    } else if (line.startsWith("===")) {
      row.font = { name: "Arial", bold: true, size: 11, color: { argb: "FFDC2626" } };
    } else if (line.match(/^[A-Z][a-z]+ (Ganda|Salah|Kompleks|Sandbox)/) || line === "Essay: Jawaban panjang, dinilai manual oleh guru." || line === "Pasangkan: Isi pasangan kiri-kanan berurutan. Bisa 2-4 pasangan.") {
      row.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF1A1C1E" } };
    } else {
      row.font = { name: "Arial", size: 10, color: { argb: "FF374151" } };
    }
    row.alignment = { wrapText: true, vertical: "top" };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "Template_Soal_Astrolab.xlsx";
  a.click(); URL.revokeObjectURL(url);
}

export async function exportNilai(store, jenjang) {
  const ExcelJS = await loadExcelJS();
  const siswaList = store.getAllSiswa(jenjang);
  const tugasList = store.getTugas().filter(t => t.jenjang === jenjang);
  const subs = store.getSubs();
  const mapelGroups = jenjang === "VII" ? ["IPA", "Informatika"] : [null];

  for (const mapel of mapelGroups) {
    const tugasMapel = mapel ? tugasList.filter(t => t.mapel === mapel) : tugasList;
    if (tugasMapel.length === 0) continue;
    const mapelLabel = mapel || "IPA";
    const nTugas = tugasMapel.length;

    const siswaData = siswaList.map(s => {
      const st = store.getStats(s.id);
      const nilaiArr = tugasMapel.map(t => {
        const sub = subs.find(sb => sb.siswaId === s.id && sb.tugasId === t.id);
        return sub ? sub.nilai : null;
      });
      const angka = nilaiArr.filter(v => v !== null);
      const rata = angka.length ? Math.round(angka.reduce((a,b)=>a+b,0)/angka.length) : null;
      return { siswa: s, stats: st, nilaiArr, rata };
    }).sort((a,b) => (b.rata||0) - (a.rata||0));

    const gradeStyle = (n) => {
      if (n === null) return { label:"—", fill:"F3F4F6", font:"6B7280", bold:false };
      if (n >= 85) return { label:"Sangat Baik",      fill:"FFFFF8E1", font:"B45309", bold:true };
      if (n >= 70) return { label:"Baik",             fill:"F0FDF4",   font:"15803D", bold:true };
      if (n >= 55) return { label:"Cukup",            fill:"EFF6FF",   font:"1D4ED8", bold:true };
      return              { label:"Perlu Bimbingan",  fill:"FEF2F2",   font:"DC2626", bold:true };
    };
    const valStyle = (n) => {
      if (n === null) return { fill:"F3F4F6", font:"9CA3AF", bold:false };
      if (n >= 85) return { fill:"FFFFF8E1", font:"B45309", bold:true };
      if (n >= 70) return { fill:"F0FDF4",   font:"15803D", bold:true };
      if (n >= 55) return { fill:"EFF6FF",   font:"1D4ED8", bold:true };
      return              { fill:"FEF2F2",   font:"DC2626", bold:true };
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = "Astrolab · Our Classroom";
    const ws = wb.addWorksheet(`Nilai ${mapelLabel}`, { pageSetup:{ orientation:"landscape", fitToPage:true, fitToWidth:1 } });
    const totalCols = 6 + nTugas;
    ws.columns = [
      { width:5 }, { width:32 }, { width:10 },
      ...tugasMapel.map(() => ({ width:20 })),
      { width:13 }, { width:13 }, { width:20 }
    ];
    const lastColLetter = ws.getColumn(totalCols).letter;

    const sc = (cell, val, opts={}) => {
      cell.value = val;
      if (opts.fill) cell.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF"+opts.fill } };
      cell.font = { name:"Arial", size:opts.size||10, bold:opts.bold||false, color:{ argb:"FF"+(opts.font||"1A1C1E") }, italic:opts.italic||false };
      cell.alignment = { horizontal:opts.halign||"center", vertical:"middle", wrapText:true };
      if (opts.border) { const bs={ style:"thin", color:{ argb:"FF"+(opts.borderColor||"E2E6EA") } }; cell.border={ top:bs,bottom:bs,left:bs,right:bs }; }
    };

    ws.mergeCells(`A1:${lastColLetter}1`);
    sc(ws.getCell("A1"), `ASTROLAB · OUR CLASSROOM  —  Rekap Nilai Kelas ${jenjang} · ${mapelLabel}`, { fill:"0D6B7A", font:"FFFFFF", size:13, bold:true });
    ws.getRow(1).height = 36;

    ws.mergeCells(`A2:${lastColLetter}2`);
    sc(ws.getCell("A2"), `SMP Negeri 15 Banda Aceh  ·  Tahun Ajaran ${getTahunAjaran()}  ·  Dicetak: ${new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}`, { fill:"EAF4F3", font:"6B7280", size:9, italic:true });
    ws.getRow(2).height = 18;
    ws.getRow(3).height = 8;

    ws.mergeCells(`A4:${lastColLetter}4`);
    sc(ws.getCell("A4"), "  LEGENDA:   Sangat Baik ≥85   |   Baik 70–84   |   Cukup 55–69   |   Perlu Bimbingan <55", { fill:"F2F4F6", font:"1A1C1E", size:9, bold:true, halign:"left" });
    ws.getRow(4).height = 22;
    ws.getRow(5).height = 8;

    const headers = ["No","Nama Siswa","Kelas",...tugasMapel.map(t=>t.judul),"Rata-rata","Total Poin","Predikat"];
    const headerRow = ws.getRow(6);
    headerRow.height = 30;
    headers.forEach((h,ci) => sc(headerRow.getCell(ci+1), h, { fill:"0D6B7A", font:"FFFFFF", size:9, bold:true, border:true, borderColor:"FFFFFF" }));

    siswaData.forEach((d,ri) => {
      const row = ws.getRow(7+ri); row.height = 24;
      const gs = gradeStyle(d.rata);
      sc(row.getCell(1), ri+1, { fill:gs.fill, font:gs.font, bold:true, border:true });
      sc(row.getCell(2), d.siswa.nama, { fill:gs.fill, font:"1A1C1E", bold:true, halign:"left", border:true });
      sc(row.getCell(3), d.siswa.kelas, { fill:gs.fill, font:"1A1C1E", border:true });
      d.nilaiArr.forEach((n,ti) => { const vs=valStyle(n); sc(row.getCell(4+ti), n!==null?n:"—", { fill:vs.fill, font:vs.font, bold:vs.bold, border:true }); });
      sc(row.getCell(4+nTugas), d.rata!==null?d.rata:"—", { fill:gs.fill, font:gs.font, size:11, bold:true, border:true, borderColor:gs.font });
      sc(row.getCell(5+nTugas), d.stats.poin, { fill:"EAF4F3", font:"0A525C", bold:true, border:true });
      sc(row.getCell(6+nTugas), gs.label, { fill:gs.fill, font:gs.font, size:9, bold:true, border:true, borderColor:gs.font });
    });

    const sumRowIdx = 7+siswaData.length;
    const sumRow = ws.getRow(sumRowIdx); sumRow.height = 28;
    ws.mergeCells(`A${sumRowIdx}:C${sumRowIdx}`);
    sc(sumRow.getCell(1), "RATA-RATA KELAS", { fill:"0D6B7A", font:"FFFFFF", size:9, bold:true, border:true, borderColor:"FFFFFF" });
    tugasMapel.forEach((_,ti) => {
      const vals=siswaData.map(d=>d.nilaiArr[ti]).filter(v=>v!==null);
      sc(sumRow.getCell(4+ti), vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):"—", { fill:"0D6B7A", font:"FFFFFF", bold:true, border:true, borderColor:"FFFFFF" });
    });
    const allRata=siswaData.map(d=>d.rata).filter(v=>v!==null);
    sc(sumRow.getCell(4+nTugas), allRata.length?Math.round(allRata.reduce((a,b)=>a+b,0)/allRata.length):"—", { fill:"0D6B7A", font:"FFFFFF", size:11, bold:true, border:true, borderColor:"FFFFFF" });
    sc(sumRow.getCell(5+nTugas), "—", { fill:"0D6B7A", font:"FFFFFF", bold:true, border:true, borderColor:"FFFFFF" });
    sc(sumRow.getCell(6+nTugas), "—", { fill:"0D6B7A", font:"FFFFFF", bold:true, border:true, borderColor:"FFFFFF" });

    const footIdx = sumRowIdx+2; ws.getRow(footIdx).height=16;
    ws.mergeCells(`A${footIdx}:${lastColLetter}${footIdx}`);
    sc(ws.getCell(`A${footIdx}`), "Astrolab · Our Classroom  ·  © 2026 M. Hasanul Fatta  ·  Data bersifat rahasia", { font:"6B7280", size:8, italic:true });

    ws.views = [{ state:"frozen", xSplit:3, ySplit:6 }];
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url;
    a.download = `Nilai_Kelas${jenjang}${mapel?"_"+mapel:""}_Astrolab.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  }
}
export async function importSoalFromExcel(file) {
  const ExcelJS = await loadExcelJS();
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const soal = [];

  wb.eachSheet((ws, sheetId) => {
    try {
      const name = ws.name;
      const rows = excelSheetToJson(ws, { defval: "" });
          if (!rows.length) return;

          // Deteksi tipe dari nama sheet
          const n = name.toLowerCase();
          let tipe = null;
          if (n.includes("pilihan ganda") || n.includes("1.") || n.includes("biru")) tipe = "pg";
          else if (n.includes("benar") || n.includes("salah") || n.includes("2.") || n.includes("hijau")) tipe = "tf";
          else if (n.includes("kompleks") || n.includes("cocok") || n.includes("3.") || n.includes("oranye") || n.includes("orange")) tipe = "komplex";
          else if (n.includes("pasangkan") || n.includes("urutan") || n.includes("susun") || n.includes("4.") || n.includes("ungu") || n.includes("pasang")) tipe = "pasang";
          else if (n.includes("excel") || n.includes("sandbox") || n.includes("5.") || n.includes("kuning")) tipe = "excel";
          else if (n.includes("essay") || n.includes("6.") || n.includes("pink") || n.includes("magenta")) tipe = "essay";
          else if (n.includes("pseudocode") || n.includes("trace") || n.includes("7.")) tipe = "pseudocode";
          else if (n.includes("debug") || n.includes("challenge") || n.includes("8.")) tipe = "debug";
          else if (n.includes("refleksi") || n.includes("terstruktur") || n.includes("9.")) tipe = "refleksi";
          if (!tipe) return;

          rows.forEach(row => {
            const pertanyaan = row["Pertanyaan"] || row["Pertanyaan / Instruksi"] || row["Pernyataan"] || row["Prompt Utama"] || "";
            if (!pertanyaan.toString().trim()) return;
            const poin = Number(row["Poin"]) || 10;
            // Pembahasan & Tags (optional, common untuk semua tipe)
            const pembahasan = (row["Pembahasan"] || "").toString().trim();
            const tagsRaw = (row["Tags"] || "").toString().trim();
            const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

            if (tipe === "pg") {
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwb = (row["Jawaban (A/B/C/D)"] || row["Jawaban Benar\n(A/B/C/D)"] || "A").toString().trim().toUpperCase();
              const jwbIdx = ["A","B","C","D"].indexOf(jwb);
              soal.push({ id: uid(), type: "pg", pertanyaan: pertanyaan.toString(), opsi, jawaban: jwbIdx >= 0 ? jwbIdx : 0, poin, pembahasan, tags });
            } else if (tipe === "tf") {
              const jwb = (row["Jawaban (Benar/Salah)"] || "Benar").toString().trim().toLowerCase();
              soal.push({ id: uid(), type: "tf", pertanyaan: pertanyaan.toString(), jawaban: jwb === "benar" ? 0 : 1, poin, pembahasan, tags });
            } else if (tipe === "komplex") {
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwbStr = (row["Jawaban Benar (A,B,C,D)"] || row["Jawaban Benar (misal: A,C)"] || row["Jawaban Benar\n(misal: A,C)"] || "A").toString();
              const jwb = jwbStr.split(",").map(s => ["A","B","C","D"].indexOf(s.trim().toUpperCase())).filter(i => i >= 0);
              soal.push({ id: uid(), type: "komplex", pertanyaan: pertanyaan.toString(), opsi, jawaban: jwb, poin, pembahasan, tags });
            } else if (tipe === "pasang") {
              const kiri = [], kanan = [];
              for (let i = 1; i <= 4; i++) {
                const k = row[`Item Kiri ${i}`] || row[`Item Kiri ${i} (pasangan Kiri ${i})`];
                const kn = row[`Pasangan Kanan ${i}`] || row[`Item Kanan ${i} (pasangan Kiri ${i})`];
                if (k && k.toString().trim()) kiri.push(k.toString());
                if (kn && kn.toString().trim()) kanan.push(kn.toString());
              }
              if (kiri.length === 0) return;
              const jwb = kiri.map((_, i) => i);
              soal.push({ id: uid(), type: "pasang", pertanyaan: pertanyaan.toString(), kiri, kanan, jawaban: jwb, poin, pembahasan, tags });
            } else if (tipe === "excel") {
              const headersStr = (row["Header Kolom (pisah |)"] || "").toString();
              const dataStr = (row["Data Tabel (baris pisah ;, kolom pisah |)"] || "").toString();
              if (!headersStr || !dataStr) return;
              const headers = headersStr.split("|").map(h => h.trim());
              const table = dataStr.split(";").map(rowStr => rowStr.split("|").map(c => c.trim()));
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwb = (row["Jawaban (A/B/C/D)"] || "A").toString().trim().toUpperCase();
              const jwbIdx = ["A","B","C","D"].indexOf(jwb);
              soal.push({ id: uid(), type: "excel", pertanyaan: pertanyaan.toString(), headers, table, opsi, jawaban: jwbIdx >= 0 ? jwbIdx : 0, poin, pembahasan, tags });
            } else if (tipe === "essay") {
              const kataKunci = (row["Kata Kunci (pisah koma)"] || "").toString();
              const panduanNilai = (row["Panduan Penilaian"] || "").toString();
              soal.push({ id: uid(), type: "essay", pertanyaan: pertanyaan.toString(), kataKunci, panduanNilai, poin, pembahasan, tags });
            } else if (tipe === "pseudocode") {
              const kode = (row["Kode Pseudocode"] || row["Kode"] || "").toString();
              const jawabanBenar = (row["Jawaban Output"] || row["Output"] || "").toString();
              if (!kode.trim() || !jawabanBenar.trim()) return;
              soal.push({ id: uid(), type: "pseudocode", pertanyaan: pertanyaan.toString(), kode, jawabanBenar, poin, pembahasan, tags });
            } else if (tipe === "debug") {
              const kodeBuggy = (row["Kode Buggy"] || row["Kode"] || "").toString();
              const barisBug = Number(row["Nomor Baris Bug"] || row["Baris Bug"] || 0);
              const perbaikanBenar = (row["Perbaikan yang Benar"] || row["Perbaikan"] || "").toString();
              if (!kodeBuggy.trim() || !barisBug || !perbaikanBenar.trim()) return;
              soal.push({ id: uid(), type: "debug", pertanyaan: pertanyaan.toString(), kodeBuggy, barisBug, perbaikanBenar, poin, pembahasan, tags });
            } else if (tipe === "refleksi") {
              const labelKolom1 = (row["Label Kolom 1"] || "Prediksi saya").toString();
              const labelKolom2 = (row["Label Kolom 2"] || "Yang saya observasi").toString();
              const labelKolom3 = (row["Label Kolom 3"] || "Yang salah/bug").toString();
              const labelKolom4 = (row["Label Kolom 4"] || "Pelajaran yang saya ambil").toString();
              const panduanNilai = (row["Panduan Penilaian"] || "").toString();
              soal.push({ id: uid(), type: "refleksi", pertanyaan: pertanyaan.toString(), labelKolom1, labelKolom2, labelKolom3, labelKolom4, panduanNilai, poin, pembahasan, tags });
            }
          });

    } catch (sheetErr) {
      console.error(`[importSoal] Error parsing sheet "${ws.name}":`, sheetErr);
    }
  });

  return soal;
}

// Template dinamis: kolom sesuai struktur BAB/Kuis yang AKTIF saat ini (bukan fixed),
// pre-filled dengan nilai yang sudah ada, supaya guru tinggal edit di Excel lalu upload balik.
export async function downloadTemplateNilaiAkhir(store, mapel, jenjang, periode, siswaList, babKolom, kuisKolom) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Astrolab · Our Classroom";

  const headerStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6B7A" } }, font: { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } };

  const ws = wb.addWorksheet("Nilai Akhir", { properties: { tabColor: { argb: "FF0D6B7A" } } });
  const columns = [
    { header: "ID Siswa", key: "id", width: 14 },
    { header: "Nama", key: "nama", width: 24 },
    ...babKolom.map((k, i) => ({ header: `[Sumatif] ${k}`, key: `bab_${i}`, width: 18 })),
    { header: "STS", key: "uts", width: 10 },
    { header: "SAS", key: "uas", width: 10 },
    ...kuisKolom.map((k, i) => ({ header: `[Kuis] ${k}`, key: `kuis_${i}`, width: 18 })),
    { header: "Portofolio", key: "portofolio", width: 12 },
  ];
  ws.columns = columns;
  ws.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws.getRow(1).height = 32;

  siswaList.forEach(s => {
    const rec = store.getNilaiAkhirRecord(s.id, mapel, jenjang, periode);
    const row = { id: s.id, nama: s.nama, uts: rec.uts ?? "", uas: rec.uas ?? "", portofolio: rec.portofolio ?? "" };
    babKolom.forEach((k, i) => { row[`bab_${i}`] = rec.sumatif?.[k] ?? ""; });
    kuisKolom.forEach((k, i) => { row[`kuis_${i}`] = rec.kuis?.[k] ?? ""; });
    ws.addRow(row);
  });
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }];
  ws.getColumn(1).font = { color: { argb: "FF888888" }, size: 9 }; // ID kolom kecil, cuma buat matching pas import

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Nilai_Akhir_${mapel}_${jenjang}_${periode.replace(/\s+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// Parse file Excel hasil edit guru — cocokkan kolom by header name (bukan posisi),
// supaya tetap jalan walau guru re-order kolom di Excel.
export async function parseNilaiAkhirExcel(file) {
  const ExcelJS = await loadExcelJS();
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("File tidak memiliki sheet.");
  const rows = excelSheetToJson(ws, { defval: "" });
  const result = rows.map(row => {
    const siswaId = (row["ID Siswa"] || "").toString().trim();
    if (!siswaId) return null;
    const sumatif = {}, kuis = {};
    let uts = null, uas = null, portofolio = null;
    Object.keys(row).forEach(colName => {
      const raw = row[colName];
      if (raw === "" || raw === undefined || raw === null) return;
      const num = Number(raw);
      if (isNaN(num)) return;
      if (colName.startsWith("[Sumatif] ")) sumatif[colName.replace("[Sumatif] ", "")] = num;
      else if (colName.startsWith("[Kuis] ")) kuis[colName.replace("[Kuis] ", "")] = num;
      else if (colName === "STS" || colName === "UTS") uts = num;
      else if (colName === "SAS" || colName === "UAS") uas = num;
      else if (colName === "Portofolio") portofolio = num;
    });
    return { siswaId, sumatif, kuis, uts, uas, portofolio };
  }).filter(Boolean);
  return result;
}

// 2 sheet: (1) Rekap ringkas — semua siswa, kolom avg per komponen + nilai akhir, siap cetak.
// (2) Detail — breakdown lengkap tiap BAB/Kuis individual per siswa, untuk arsip guru.
export async function exportRekapNilaiAkhir(store, mapel, jenjang, periode, siswaList, babKolom, kuisKolom) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Astrolab · Our Classroom";

  const headerStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6B7A" } }, font: { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } };
  const finalColStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF4F3" } }, font: { name: "Arial", bold: true, color: { argb: "FF0D6B7A" }, size: 11 } };

  // ── Sheet 1: Rekap ringkas ──
  const ws1 = wb.addWorksheet("Rekap Nilai Akhir", { properties: { tabColor: { argb: "FF0D6B7A" } } });
  ws1.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Nama", key: "nama", width: 26 },
    { header: "Sumatif (10%)", key: "sumatif", width: 14 },
    { header: "Tugas Astrolab (20%)", key: "tugas", width: 18 },
    { header: "STS (20%)", key: "uts", width: 12 },
    { header: "SAS (20%)", key: "uas", width: 12 },
    { header: "Kuis (10%)", key: "kuis", width: 12 },
    { header: "Portofolio (20%)", key: "portofolio", width: 14 },
    { header: "NILAI AKHIR", key: "final", width: 14 },
    { header: "Status", key: "status", width: 14 },
  ];
  ws1.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws1.getRow(1).height = 34;

  siswaList.forEach((s, i) => {
    const result = store.computeNilaiAkhir(s.id, mapel, jenjang, periode);
    const row = ws1.addRow({
      no: i + 1,
      nama: s.nama,
      sumatif: result.sumatifAvg !== null ? Math.round(result.sumatifAvg) : "—",
      tugas: result.tugasAvg !== null ? result.tugasAvg : "—",
      uts: result.rec.uts ?? "—",
      uas: result.rec.uas ?? "—",
      kuis: result.kuisAvg !== null ? Math.round(result.kuisAvg) : "—",
      portofolio: result.rec.portofolio ?? "—",
      final: result.nilaiAkhir !== null ? result.nilaiAkhir : "—",
      status: result.lengkap ? "Lengkap" : "Belum lengkap",
    });
    row.getCell("final").style = finalColStyle;
  });
  ws1.views = [{ state: "frozen", ySplit: 1 }];

  // ── Sheet 2: Detail breakdown per BAB/Kuis ──
  const ws2 = wb.addWorksheet("Detail Sumatif & Kuis", { properties: { tabColor: { argb: "FF088395" } } });
  const detailColumns = [
    { header: "Nama", key: "nama", width: 26 },
    ...babKolom.map((k, i) => ({ header: `[Sumatif] ${k}`, key: `bab_${i}`, width: 18 })),
    ...kuisKolom.map((k, i) => ({ header: `[Kuis] ${k}`, key: `kuis_${i}`, width: 18 })),
  ];
  ws2.columns = detailColumns;
  ws2.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws2.getRow(1).height = 32;
  siswaList.forEach(s => {
    const rec = store.getNilaiAkhirRecord(s.id, mapel, jenjang, periode);
    const row = { nama: s.nama };
    babKolom.forEach((k, i) => { row[`bab_${i}`] = rec.sumatif?.[k] ?? "—"; });
    kuisKolom.forEach((k, i) => { row[`kuis_${i}`] = rec.kuis?.[k] ?? "—"; });
    ws2.addRow(row);
  });
  ws2.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rekap_Nilai_Akhir_${mapel}_${jenjang}_${periode.replace(/\s+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}



// Versi yang pakai data dari store (tidak perlu re-fetch)
export function backupFromStore(store) {
  const tugas = store.getTugas();
  const subs = store.getSubs();
  const data = {
    exported_at: new Date().toISOString(),
    app: "Astrolab · Our Classroom",
    tugas,
    submissions: subs,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `astrolab-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export daftar soal latihan (per BAB) ke Excel — untuk review/evaluasi guru.
export async function exportLatihanSoal(soalList, meta = {}) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Astrolab · Our Classroom";
  const ws = wb.addWorksheet("Soal Latihan", { properties: { tabColor: { argb: "FF0D6B7A" } } });
  const headerStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6B7A" } }, font: { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } };

  ws.columns = [
    { width: 5 }, { width: 55 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 10 }, { width: 40 }, { width: 10 },
  ];
  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = `Soal Latihan Mandiri — ${meta.mapel || ""} · ${meta.bab || ""} · Kelas ${meta.jenjang || ""}`;
  ws.getCell("A1").font = { name: "Arial", bold: true, size: 13, color: { argb: "FF0D6B7A" } };
  ws.getCell("A1").alignment = { vertical: "middle" };
  ws.getRow(1).height = 26;

  const hdr = ws.getRow(2);
  hdr.values = ["No", "Pertanyaan", "Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D", "Jawaban", "Pembahasan", "Sumber"];
  hdr.eachCell(c => Object.assign(c, headerStyle));
  hdr.height = 24;

  (soalList || []).forEach((s, i) => {
    const o = s.opsi || [];
    const jwb = typeof s.jawaban === "number" ? String.fromCharCode(65 + s.jawaban) : "";
    const row = ws.addRow([i + 1, s.pertanyaan || "", o[0] || "", o[1] || "", o[2] || "", o[3] || "", jwb, s.pembahasan || "", s._sumber === "upload" ? "Upload" : "Sistem"]);
    row.alignment = { vertical: "top", wrapText: true };
    row.getCell(7).font = { name: "Arial", bold: true, color: { argb: "FF15803D" } };
    row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
  });
  ws.views = [{ state: "frozen", ySplit: 2 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const safe = (x) => (x || "").toString().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  const a = document.createElement("a");
  a.href = url;
  a.download = `Latihan_${safe(meta.jenjang)}_${safe(meta.mapel)}_${safe(meta.bab)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════ Soal Sandbox Terverifikasi (Okt 2026) ═══════════════
// Satu file = satu soal. Sheet "Tabel": sel yang berisi RUMUS = sel jawaban siswa (rumus guru = kunci).
// Sheet "Soal": pertanyaan, instruksi, poin sandbox, toleransi. Sheet "Lanjutan": PG analisis.

export async function downloadTemplateSandbox() {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Astrolab · Our Classroom";
  const head = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6B7A" } }, font: { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }, alignment: { vertical: "middle", wrapText: true } };
  const ans = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2F4" } }, font: { name: "Arial", bold: true, color: { argb: "FF0D6B7A" } } };

  const s1 = wb.addWorksheet("Soal", { properties: { tabColor: { argb: "FF0D6B7A" } } });
  s1.columns = [{ header: "Isian", width: 22 }, { header: "Nilai", width: 80 }];
  s1.getRow(1).eachCell(c => Object.assign(c, head));
  s1.addRows([
    ["Pertanyaan", "Hitung massa jenis tiap benda dari hasil pengukuran berikut."],
    ["Instruksi", "Isi kolom D2:D6 dengan rumus massa ÷ volume memakai alamat sel. Lalu isi D7 dengan rata-rata memakai AVERAGE."],
    ["Poin sandbox", 20],
    ["Toleransi", 0.01],
    ["Catatan", "Jangan ubah nama sheet. Di sheet Tabel, sel yang kamu isi RUMUS otomatis menjadi sel jawaban siswa, dan hasil rumusmu menjadi kuncinya. Fungsi yang kamu pakai (mis. AVERAGE) otomatis wajib dipakai siswa; bisa dimatikan di Astrolab. Fungsi yang didukung: SUM, AVERAGE, COUNT, MAX, MIN, ROUND, ABS, SQRT."],
  ]);
  s1.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  const s2 = wb.addWorksheet("Tabel", { properties: { tabColor: { argb: "FF088395" } } });
  const rows = [
    ["Benda", "Massa (g)", "Volume (cm³)", "Massa jenis (g/cm³)"],
    ["Kayu jati", 36, 50, { formula: "B2/C2" }],
    ["Batu kali", 130, 50, { formula: "B3/C3" }],
    ["Besi", 157.4, 20, { formula: "B4/C4" }],
    ["Plastik PVC", 70, 50, { formula: "B5/C5" }],
    ["Aluminium", 54, 20, { formula: "B6/C6" }],
    ["Rata-rata", "", "", { formula: "AVERAGE(D2:D6)" }],
  ];
  rows.forEach(r => s2.addRow(r));
  s2.columns.forEach((c, i) => { c.width = i === 0 ? 16 : 20; });
  s2.getRow(1).eachCell(c => Object.assign(c, head));
  for (let r = 2; r <= 7; r++) Object.assign(s2.getCell(`D${r}`), ans);

  const s3 = wb.addWorksheet("Lanjutan", { properties: { tabColor: { argb: "FFC98A12" } } });
  s3.columns = [{ header: "Pertanyaan", width: 55 }, { header: "Pilihan A", width: 22 }, { header: "Pilihan B", width: 22 }, { header: "Pilihan C", width: 22 }, { header: "Pilihan D", width: 22 }, { header: "Jawaban (A/B/C/D)", width: 16 }, { header: "Poin", width: 8 }, { header: "Pembahasan", width: 45 }];
  s3.getRow(1).eachCell(c => Object.assign(c, head));
  s3.addRows([
    ["Air punya massa jenis 1 g/cm³. Benda mana yang terapung di air?", "Batu kali", "Kayu jati", "Plastik PVC", "Aluminium", "B", 10, "Hanya kayu jati yang massa jenisnya di bawah 1 g/cm³."],
    ["Kalau batu kali dipotong jadi dua sama besar, massa jenis tiap potongan menjadi …", "1,3 g/cm³", "2,6 g/cm³", "5,2 g/cm³", "Tidak bisa dihitung", "B", 10, "Massa dan volume sama-sama jadi setengah, jadi massa jenis tetap."],
  ]);
  s3.eachRow((row, i) => { if (i > 1) row.alignment = { wrapText: true, vertical: "top" }; });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "Template_Soal_Sandbox_Astrolab.xlsx";
  a.click(); URL.revokeObjectURL(url);
}

// Geser rujukan relatif sebanyak dr baris & dc kolom (untuk menerjemahkan rumus bersama Excel)
const geserRumus2D = (f, dr, dc) => String(f).replace(/(\$?)([A-Za-z]{1,2})(\$?)(\d+)/g, (m, d1, col, d2, row, off, str) => {
  if (/[A-Za-z]/.test(str[off - 1] || "")) return m;
  const kol = d1 ? col : colName(colIdx(col.toUpperCase()) + dc);
  const bar = d2 ? row : +row + dr;
  return `${d1}${kol}${d2}${bar}`;
});

const teksSel = v => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (v.richText) return v.richText.map(x => x.text).join("");
    if (v.text !== undefined) return String(v.text);
    if (v instanceof Date) return v.toLocaleDateString("id-ID");
  }
  return v;
};

export async function importSandboxFromExcel(file) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const cari = nama => wb.worksheets.find(w => w.name.trim().toLowerCase() === nama);
  const wsTabel = cari("tabel") || wb.worksheets.find(w => /tabel/i.test(w.name));
  if (!wsTabel) throw new Error('Sheet "Tabel" tidak ditemukan. Pakai template sandbox.');

  // Info soal
  const info = {};
  const wsSoal = cari("soal");
  if (wsSoal) wsSoal.eachRow((row, i) => { if (i > 1) info[String(teksSel(row.getCell(1).value)).trim().toLowerCase()] = teksSel(row.getCell(2).value); });
  const toleransi = Number(String(info["toleransi"] ?? "0.01").replace(",", ".")) || 0.01;

  // Tabel + rumus guru
  let maxR = 0, maxC = 0;
  wsTabel.eachRow({ includeEmpty: false }, (row, r) => row.eachCell({ includeEmpty: false }, (cell, c) => { if (teksSel(cell.value) !== "") { maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); } }));
  if (!maxR) throw new Error('Sheet "Tabel" masih kosong.');
  if (maxR > 40 || maxC > 12) throw new Error("Tabel terlalu besar untuk layar HP. Maksimal 40 baris × 12 kolom.");
  const tabel = [], kunci = {}, cache = {};
  for (let r = 1; r <= maxR; r++) {
    const row = [];
    for (let c = 1; c <= maxC; c++) {
      const v = wsTabel.getRow(r).getCell(c).value;
      const a = alamatSel(r - 1, c - 1);
      if (v && typeof v === "object" && (v.formula || v.sharedFormula)) {
        // Rumus hasil "seret/isi ke bawah" di Excel disimpan sebagai rumus bersama: terjemahkan dari sel induknya.
        let f = v.formula;
        if (!f && v.sharedFormula) {
          const induk = wsTabel.getCell(v.sharedFormula).value;
          const m = String(v.sharedFormula).match(/^([A-Z]+)(\d+)$/);
          if (induk && induk.formula && m) f = geserRumus2D(induk.formula, r - +m[2], (c - 1) - colIdx(m[1]));
        }
        if (!f) throw new Error(`Rumus di sel ${a} tidak terbaca. Ketik ulang rumusnya langsung di sel itu.`);
        kunci[a] = "=" + String(f).replace(/^=/, "");
        if (typeof v.result === "number") cache[a] = v.result;
        row.push("");
      } else {
        const t = teksSel(v);
        row.push(typeof t === "number" ? t : String(t ?? ""));
      }
    }
    tabel.push(row);
  }
  const selJawab = Object.keys(kunci);
  if (!selJawab.length) throw new Error('Belum ada sel berisi rumus di sheet "Tabel". Isi sel jawaban dengan rumus kunci, mis. =B2/C2.');

  const out = hitungSemua(tabel, selJawab, kunci);
  const peringatan = [];
  const jawaban = selJawab.map(sel => {
    const o = out[sel];
    if (!o || o.err) throw new Error(`Rumus kunci di ${sel} (${kunci[sel]}) tidak bisa dihitung Astrolab: ${o?.err || "tidak terbaca"}.`);
    if (typeof cache[sel] === "number" && Math.abs(cache[sel] - o.v) > toleransi) peringatan.push(`Hasil ${sel} di Excel (${cache[sel]}) beda dengan hitungan Astrolab (${o.v}); Astrolab yang dipakai.`);
    const fungsi = [...o.info.fns];
    return { sel, nilai: Math.round(o.v * 1e6) / 1e6, toleransi, harusRujuk: o.info.refs > 0, fungsi, fungsiAsal: fungsi, rumusKunci: kunci[sel] };
  });

  // PG lanjutan
  const lanjutan = [];
  const wsL = cari("lanjutan");
  if (wsL) {
    excelSheetToJson(wsL, { defval: "" }).forEach((r, i) => {
      const tanya = String(teksSel(r["Pertanyaan"]) || "").trim();
      if (!tanya) return;
      const opsi = ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"].map(k => String(teksSel(r[k]) ?? "").trim()).filter(Boolean);
      const kunciHuruf = String(teksSel(r["Jawaban (A/B/C/D)"] ?? r["Jawaban"]) || "").trim().toUpperCase();
      const idx = "ABCD".indexOf(kunciHuruf);
      if (opsi.length < 2) throw new Error(`Lanjutan baris ${i + 2}: minimal 2 pilihan.`);
      if (idx < 0 || idx >= opsi.length) throw new Error(`Lanjutan baris ${i + 2}: jawaban harus A/B/C/D dan pilihannya terisi.`);
      lanjutan.push({ pertanyaan: tanya, opsi, jawaban: idx, poin: Number(r["Poin"]) || 10, pembahasan: String(teksSel(r["Pembahasan"]) || "") });
    });
  }

  return {
    pertanyaan: String(info["pertanyaan"] || "").trim(),
    tugas: String(info["instruksi"] || "").trim(),
    poinSandbox: Number(info["poin sandbox"]) || 20,
    tabel, jawaban, lanjutan, peringatan,
  };
}

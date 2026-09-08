// Import cable schedule dari file Excel / CSV yang di-upload user.
//
// Template panel schedule tiap konsultan berbeda-beda: header bisa dua baris ter-merge,
// urutan kolom bebas, judul panel berada di baris judul di atas tabel, dan sering ada
// puluhan kolom fixture di tengah. Yang selalu ada hanyalah kolom TYPE (deskripsi kabel)
// dan OD (diameter luar). Parser ini karena itu bekerja dua lapis:
//
//   1) cocokkan nama header - beberapa baris header digabung jadi satu label per kolom;
//   2) kalau nama header tidak ketemu, tebak dari ISI kolom - kolom yang isinya berpola
//      kabel ("NYY 3C x 2.5mm2") jadi TYPE, kolom angka yang nilainya jatuh pada OD
//      katalog jadi OD.
//
// Excel dan CSV sama-sama diubah dulu jadi grid teks, lalu melewati parser yang sama.

import type { CableRun } from '../core/types';
import { ALL_ENTRIES, findEntry } from '../core/catalog';

export interface DetectedColumns {
  sheet: string;
  headerRow: number;
  panel: string;
  typeColumn: string;
  odColumn: string;
}

/** Satu baris hasil import beserta jejak bagaimana tipe kabelnya ditentukan. */
export interface ImportedRow {
  run: CableRun;
  quality: MatchQuality;
  /** OD sebagaimana tertulis di file, kalau filenya memang punya kolom OD. */
  fileOdMm?: number;
  /** Selisih OD katalog terhadap OD di file, untuk pencocokan berbasis OD. */
  odDeltaMm?: number;
  /** Teks mentah yang dicoba dicocokkan - ditampilkan saat user harus memilih manual. */
  sourceText: string;
}

/**
 * Peringatan dikembalikan sebagai kode + jumlah, bukan kalimat jadi, supaya parser tetap
 * murni dan teksnya bisa mengikuti bahasa yang sedang dipilih di UI.
 */
export type ImportWarningCode =
  | 'skippedImplausible'
  | 'odMismatch'
  | 'odFallback'
  | 'odApprox'
  | 'unresolved';

export interface ImportWarning {
  code: ImportWarningCode;
  count: number;
  /** Ambang yang disebut pada pesan skippedImplausible. */
  max?: number;
}

export interface ImportResult {
  rows: ImportedRow[];
  /** Ringkasan CableRun saja - urutannya sama dengan rows. */
  runs: CableRun[];
  warnings: ImportWarning[];
  detected: DetectedColumns;
  /** Baris yang dilewati karena jumlah run-nya mustahil untuk sebuah kabel. */
  skippedImplausible: number;
}

/** Di atas ini jumlah run bukan lagi kabel - biasanya tabel konfigurasi/lebar tray. */
const MAX_PLAUSIBLE_RUNS = 50;

/** Grid teks hasil normalisasi file (baris x kolom), index 0-based. */
type Grid = string[][];

/* ------------------------------------------------------------------ utils */

/** Normalisasi angka lokal: "1,35" (ID) dan "1.35" (EN) keduanya 1.35. */
export function parseNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  // Satuan yang biasa menempel pada angka boleh, sisanya bukan angka. Ketat di sini penting:
  // baris catatan di kaki tabel sering ter-merge selebar tabel dan mengandung angka
  // ("IEC 60502-1"), dan pernah terbaca sebagai OD ketika parser hanya menyapu digit.
  const s = String(v).trim().replace(/\s/g, '').replace(/(mm2|mm²|mm|kw|watt|va|amp|a|w|%)$/i, '');
  if (!/^-?\d+(?:[.,]\d+)?$/.test(s)) return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
const lower = (s: string): string => norm(s).toLowerCase();

/** Nama kolom gaya spreadsheet: 0 -> A, 26 -> AA. */
export function columnLetter(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Baris rekap / catatan di kaki tabel - bukan data kabel. */
const NON_DATA_ROW =
  /^(total|sub ?total|grand ?total|jumlah|catatan|note|notes|keterangan|rumus|remark|legend|connected|watt\s*\/\s*unit)/i;

/* ------------------------------------------------- pencocokan ke katalog */

const FAMILY_TOKENS = ['NYFGBY', 'N2XSEYBY', 'N2XY', 'NYY', 'NYM', 'NYA', 'FRC'];

/** Baris yang isinya kelihatan seperti spesifikasi kabel. */
function looksLikeCable(text: string): boolean {
  const u = text.toUpperCase();
  if (FAMILY_TOKENS.some((f) => u.includes(f))) return true;
  if (/\b\d+\s*C(?:ORE)?S?\b/.test(u)) return true;
  if (/\bMM2|MM²|SQMM\b/.test(u)) return true;
  return false;
}

/** Ambil (cores, size) dari teks bebas; menangani "3C x 2.5mm2", "1x3C-4", "4C25", "4x25". */
export function parseCoresAndSize(text: string): { cores: number; size: number } | undefined {
  // Buang pengali di depan ("1x3C-4mm2" -> "3C-4mm2") supaya tidak terbaca sebagai cores.
  const t = norm(text).replace(/^\s*\d+\s*[x×*]\s*(?=\d+\s*[cC])/, '');

  // "3C x 2.5", "3C-4", "4C25", "5Cx6", "3 core 2.5"
  const withC = t.match(/(\d+)\s*(?:cores?|c)\.?\s*[x×*\-–/ ]*\s*(\d+(?:[.,]\d+)?)/i);
  if (withC) {
    const cores = Number(withC[1]);
    const size = parseNumber(withC[2]);
    if (cores > 0 && size) return { cores, size };
  }

  // Tanpa huruf C: "4x25", "5 x 6 mm2"
  const plain = t.match(/(\d+)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/);
  if (plain) {
    const cores = Number(plain[1]);
    const size = parseNumber(plain[2]);
    if (cores > 0 && cores <= 61 && size) return { cores, size };
  }
  return undefined;
}

function familyOf(text: string): string | undefined {
  const u = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return FAMILY_TOKENS.find((f) => u.includes(f));
}

export type MatchQuality =
  /** Teks tipe terbaca dan cocok dengan satu entri katalog. */
  | 'exact'
  /** Teks tipe tidak terbaca; dicocokkan lewat OD katalog terdekat, masih dalam toleransi. */
  | 'odFallback'
  /** Sama seperti odFallback tetapi di luar toleransi - diameter tetap dari katalog kita. */
  | 'odApprox'
  /** Tipe cocok, tetapi OD di file berbeda dari OD katalog. */
  | 'odMismatch'
  /** Tidak ada sinyal sama sekali - user harus memilih tipenya sendiri. */
  | 'unresolved';

/** Kualitas yang menuntut user memeriksa/memilih sebelum hasilnya dipakai menghitung. */
export const NEEDS_REVIEW: readonly MatchQuality[] = ['odApprox', 'odMismatch', 'unresolved'];

export interface CatalogMatch {
  typeCode: string;
  quality: MatchQuality;
  fileOdMm?: number;
  odDeltaMm?: number;
}

/**
 * Cocokkan teks bebas + OD dari file ke satu entri katalog.
 *
 * Urutan: cores+size (plus family kalau disebut) -> verifikasi silang dengan OD ->
 * OD terdekat -> default.
 */
export function matchCatalog(text: string, odHint?: number): CatalogMatch {
  const t = norm(text);

  // 1) Id katalog ditulis apa adanya ("NYY-3C-4", "3C-4").
  const direct = ALL_ENTRIES.find((e) => t.toLowerCase().includes(e.id.toLowerCase()));
  if (direct) return { typeCode: direct.id, quality: 'exact' };

  // 2) Urai jumlah core dan luas penampang, saring dengan family bila disebut.
  const parsed = parseCoresAndSize(t);
  if (parsed) {
    const fam = familyOf(t);
    const bySize = ALL_ENTRIES.filter((e) => e.cores === parsed.cores && e.sizeMm2 === parsed.size);
    const pool = fam
      ? (bySize.filter((e) => e.family.toUpperCase().replace(/[^A-Z0-9]/g, '') === fam) ?? [])
      : [];
    const candidates = pool.length > 0 ? pool : bySize;

    if (candidates.length > 0) {
      if (odHint && odHint > 0) {
        // OD di file adalah pemutus kalau satu ukuran dimiliki beberapa family.
        const byOd = candidates.find((e) => Math.abs(e.odMm - odHint) <= 0.6);
        if (byOd) return { typeCode: byOd.id, quality: 'exact', fileOdMm: odHint };
        return {
          typeCode: candidates[0].id,
          quality: 'odMismatch',
          fileOdMm: odHint,
          odDeltaMm: Math.abs(candidates[0].odMm - odHint),
        };
      }
      return { typeCode: candidates[0].id, quality: 'exact' };
    }
  }

  // 3) Teks tidak terbaca - jatuhkan ke OD katalog TERDEKAT, apa pun selisihnya.
  //
  // Sebelumnya langkah ini dipagari toleransi ketat dan begitu lewat, baris langsung
  // dipaksa ke tipe default 3C-4 - artinya diameter yang dipakai menghitung adalah angka
  // karangan yang tidak ada hubungannya dengan data user. Sekarang diameter SELALU diambil
  // dari katalog: kalau di luar toleransi hasilnya tetap dipakai tetapi ditandai 'odApprox'
  // berikut selisihnya, sehingga user melihat persis seberapa jauh penyesuaiannya.
  if (odHint && odHint > 0) {
    let best = ALL_ENTRIES[0];
    let bestDiff = Infinity;
    for (const e of ALL_ENTRIES) {
      const diff = Math.abs(e.odMm - odHint);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = e;
      }
    }
    const within = bestDiff <= Math.max(1.5, odHint * 0.15);
    return {
      typeCode: best.id,
      quality: within ? 'odFallback' : 'odApprox',
      fileOdMm: odHint,
      odDeltaMm: bestDiff,
    };
  }

  // 4) Benar-benar tidak ada sinyal. Baris tetap masuk supaya tidak ada data yang hilang,
  //    tetapi ditandai unresolved - user memilih tipenya di pratinjau, dan sampai itu
  //    dilakukan tidak ada diameter yang boleh dianggap benar.
  return { typeCode: findEntry('3C-4')?.id ?? ALL_ENTRIES[0]?.id ?? '3C-4', quality: 'unresolved' };
}

/** Semua OD katalog, dipakai untuk mengenali kolom OD dari isinya. */
const CATALOG_ODS = Array.from(new Set(ALL_ENTRIES.map((e) => e.odMm))).sort((a, b) => a - b);
const nearCatalogOd = (v: number): boolean => CATALOG_ODS.some((od) => Math.abs(od - v) <= 0.35);

/* ------------------------------------------------------ deteksi header */

const HEADER_WORDS =
  /panel|board|circuit|sirkuit|ckt|function|fungsi|cable|kabel|type|tipe|desc|spec|load|beban|watt|ampere|amp|breaker|run|qty|jumlah|od|diameter|remark|keterangan|no\./i;

interface HeaderBand {
  /** Index baris pertama & terakhir header (0-based, inklusif). */
  start: number;
  end: number;
  /** Label gabungan per kolom, sudah lowercase. */
  labels: string[];
}

/**
 * Cari baris header, lalu rentangkan ke baris tetangga yang juga berisi label.
 * Header dua baris ter-merge (mis. "DEMAND LOAD (WATT)" di atas "R / S / T") jadi satu
 * label per kolom sehingga pencocokan nama tidak bergantung baris mana yang menang.
 */
function findHeaderBand(grid: Grid): HeaderBand {
  const limit = Math.min(grid.length, 25);
  const scoreOf = (row: string[]): number => {
    // Sel ter-merge mengembalikan nilai yang sama berkali-kali (judul yang dibentang selebar
    // tabel bisa muncul 40x), jadi tiap label hanya dihitung sekali.
    const seen = new Set<string>();
    let score = 0;
    for (const cell of row) {
      const v = lower(cell);
      if (!v || seen.has(v)) continue;
      seen.add(v);
      if (HEADER_WORDS.test(v)) score += 2;
      if (v.length <= 28 && !/^\d+([.,]\d+)?$/.test(v)) score += 0.25;
    }
    return score;
  };

  const scores = grid.slice(0, limit).map(scoreOf);
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;

  // Baris tetangga ikut dianggap header selama masih punya beberapa label kata kunci DAN
  // tidak berisi angka telanjang.
  //
  // Skor saja tidak cukup: kata seperti "panel", "kabel", "cable" dan "ckt" wajar muncul di
  // dalam data ("CKT-1", "Feeder ke panel utility"), sehingga baris data pertama sering
  // ikut tertarik menjadi header dan kabelnya hilang tanpa jejak. Angka telanjang adalah
  // pembeda yang bersih: baris header berisi label, bukan 27.5 atau 150. Header dua baris
  // ter-merge ("DEMAND LOAD (WATT)" di atas "R / S / T") juga tidak punya angka telanjang,
  // jadi kasus itu tetap tergabung seperti sebelumnya.
  const hasBareNumber = (row: string[]): boolean =>
    row.some((cell) => /^\d+([.,]\d+)?$/.test(lower(cell)));

  let start = best;
  let end = best;
  const threshold = Math.max(4, scores[best] * 0.35);
  while (start - 1 >= 0 && scores[start - 1] >= threshold && !hasBareNumber(grid[start - 1] ?? [])) start--;
  while (end + 1 < limit && scores[end + 1] >= threshold && !hasBareNumber(grid[end + 1] ?? [])) end++;

  const width = grid.slice(start, end + 1).reduce((w, r) => Math.max(w, r.length), 0);
  const labels: string[] = [];
  for (let c = 0; c < width; c++) {
    const parts: string[] = [];
    for (let r = start; r <= end; r++) {
      const v = norm(grid[r]?.[c] ?? '');
      if (v && !parts.includes(v)) parts.push(v);
    }
    labels[c] = lower(parts.join(' '));
  }
  return { start, end, labels };
}

/* -------------------------------------------------- pemetaan kolom */

interface ColMap {
  panel: number;
  circuit: number;
  no: number;
  category: number;
  desc: number;
  type: number;
  runs: number;
  od: number;
  /** Bisa lebih dari satu (R / S / T) - nilainya dijumlahkan. */
  loadCols: number[];
  loadInWatt: boolean;
}

const byHeader = (labels: string[], re: RegExp, reject?: RegExp): number =>
  labels.findIndex((h) => h.length > 0 && re.test(h) && !(reject && reject.test(h)));

/** Kolom TYPE dari isi: proporsi baris data yang isinya berpola kabel. */
function detectTypeByContent(grid: Grid, from: number): number {
  const width = grid.reduce((w, r) => Math.max(w, r.length), 0);
  let bestCol = -1;
  let bestRatio = 0;
  for (let c = 0; c < width; c++) {
    let filled = 0;
    let hits = 0;
    for (let r = from; r < grid.length; r++) {
      const v = norm(grid[r]?.[c] ?? '');
      if (!v || NON_DATA_ROW.test(v)) continue;
      filled++;
      if (looksLikeCable(v)) hits++;
    }
    if (filled < 3) continue;
    const ratio = hits / filled;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestCol = c;
    }
  }
  return bestRatio >= 0.5 ? bestCol : -1;
}

/**
 * Kolom OD dari isi: kolom angka yang terisi di sebagian besar baris data DAN
 * nilainya jatuh pada OD katalog. Syarat "terisi" membuang kolom jumlah fixture yang
 * kebetulan berisi angka mirip OD tapi hanya terisi di segelintir baris.
 */
function detectOdByContent(grid: Grid, from: number, labels: string[]): number {
  const width = grid.reduce((w, r) => Math.max(w, r.length), 0);
  const dataRows = grid.slice(from).filter((r) => r.some((v) => norm(v) && !NON_DATA_ROW.test(v)));
  if (dataRows.length === 0) return -1;

  let bestCol = -1;
  let bestScore = 0;
  for (let c = 0; c < width; c++) {
    // Kolom yang jelas-jelas bukan diameter tidak usah diperiksa.
    if (/watt|\bva\b|ampere|\bamp\b|\bkw\b|load|beban|breaker|qty|jumlah|no\./.test(labels[c] ?? '')) continue;
    let filled = 0;
    let hits = 0;
    for (const row of dataRows) {
      const n = parseNumber(row[c] ?? '');
      if (n === undefined || n <= 0) continue;
      filled++;
      if (n >= 2 && n <= 200 && nearCatalogOd(n)) hits++;
    }
    const fillRatio = filled / dataRows.length;
    const hitRatio = filled > 0 ? hits / filled : 0;
    if (fillRatio < 0.6 || hitRatio < 0.8) continue;
    const score = hitRatio * fillRatio;
    if (score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
  }
  return bestCol;
}

/** Jalankan strategi pencarian kolom berurutan, ambil yang pertama berhasil. */
function firstOf(...strategies: (() => number)[]): number {
  for (const strategy of strategies) {
    const found = strategy();
    if (found !== -1) return found;
  }
  return -1;
}

function mapColumns(grid: Grid, band: HeaderBand): ColMap {
  const labels = band.labels;
  const from = band.end + 1;

  // Kolom yang benar-benar berjudul TYPE / TIPE harus menang atas yang sekadar mengandung
  // kata "cable": pada template dengan CABLE DESCRIPTION di kiri dan TYPE di kanan, pola
  // longgar akan berhenti di kolom deskripsi dan spesifikasi kabel yang sesungguhnya
  // terlewat. Karena itu pola kuat dicoba lebih dulu, longgar hanya sebagai cadangan.
  const EXCLUDE_TYPE = /breaker|panel|tray/;
  const type = firstOf(
    () => byHeader(labels, /\btype\b|\btipe\b|cable size|ukuran kabel/, EXCLUDE_TYPE),
    () => byHeader(labels, /kabel|cable/, EXCLUDE_TYPE),
    () => detectTypeByContent(grid, from),
  );

  let od = byHeader(labels, /\bod\b|o\.d\.|diameter|dia\b|Ø/, /watt|ampere/);
  if (od === -1) od = detectOdByContent(grid, from, labels);

  // Kolom beban: semua kolom yang labelnya menyebut load/watt/kw, kecuali kolom total.
  const loadCols: number[] = [];
  labels.forEach((h, i) => {
    if (!h || /total/.test(h)) return;
    // "DEMAND LOAD (WATT)" ya; "ACT_E_HIGHBAY_150 WATT HIGHBAY 150W NRML" (kolom jumlah
    // fixture) tidak - karena itu kata WATT sendirian hanya dipercaya pada label pendek.
    const named = /\bload\b|beban/.test(h);
    const unitOnly = h.length <= 24 && /\bkw\b|\bwatt\b|\(w\)|\bva\b/.test(h);
    if (named || unitOnly) loadCols.push(i);
  });
  const loadInWatt =
    loadCols.length > 0 && loadCols.some((i) => /watt|\(w\)/.test(labels[i])) && !loadCols.some((i) => /\bkw\b/.test(labels[i]));

  return {
    panel: byHeader(labels, /\bpanel\b|\bboard\b|\bdb\b/),
    circuit: byHeader(labels, /circuit|sirkuit|\bckt\b|\bway\b|function|fungsi|load name|nama beban/),
    no: byHeader(labels, /^no\.?$|^no\b|^nomor|^item/),
    category: byHeader(labels, /category|kategori|incoming|outgoing/),
    desc: byHeader(labels, /desc|deskripsi|spec|spesifikasi|remark|keterangan/),
    type,
    runs: byHeader(labels, /\brun\b|\bruns\b|\bqty\b|\bjml\b|jumlah|\bset\b/, /watt|ampere/),
    od,
    loadCols,
    loadInWatt,
  };
}

/**
 * Nama panel dari baris judul di atas tabel: token pendek bergaya kode panel
 * (huruf besar, ada tanda hubung, tanpa spasi) yang paling dekat dengan header.
 */
function detectPanelTitle(grid: Grid, headerStart: number): string {
  for (let r = headerStart - 1; r >= 0; r--) {
    for (const cell of grid[r] ?? []) {
      const v = norm(cell);
      if (!v || v.length > 40 || /\s/.test(v)) continue;
      if (/^[A-Z0-9][A-Z0-9._/]*-[A-Z0-9._/-]+$/.test(v)) return v;
    }
  }
  return '';
}

/** Normalisasi kategori bebas menjadi salah satu dari tiga nilai aplikasi. */
function normCategory(raw: string): string {
  const u = raw.toUpperCase();
  if (/\bIN(COMING)?\b/.test(u)) return 'INCOMING';
  if (/SPARE|SPR/.test(u)) return 'SPARE';
  return 'OUTGOING';
}

/* ------------------------------------------------------------ parser inti */

function parseGrid(grid: Grid, sheetName: string): ImportResult {
  const band = findHeaderBand(grid);
  const col = mapColumns(grid, band);

  if (col.type === -1 && col.od === -1) {
    throw new Error(
      'Kolom kabel tidak ditemukan. File harus punya kolom TYPE (deskripsi kabel) atau OD (diameter).',
    );
  }

  const panelFromTitle = detectPanelTitle(grid, band.start);
  const stamp = Date.now().toString(36);
  const rows: ImportedRow[] = [];
  const warnings: ImportWarning[] = [];
  const quality: Record<MatchQuality, number> = {
    exact: 0,
    odFallback: 0,
    odApprox: 0,
    odMismatch: 0,
    unresolved: 0,
  };
  let seq = 0;
  let skippedImplausible = 0;

  for (let r = band.end + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const cell = (i: number): string => (i >= 0 ? norm(row[i] ?? '') : '');

    const firstText = norm(row.find((v) => norm(v)) ?? '');
    if (NON_DATA_ROW.test(firstText)) continue;

    // Baris catatan di kaki tabel biasanya satu teks yang di-merge selebar tabel, jadi
    // setiap kolom mengembalikan teks yang sama - termasuk kolom TYPE.
    const filled = row.filter((v) => norm(v));
    if (filled.length >= 5 && new Set(filled.map(norm)).size === 1) continue;

    const typeText = cell(col.type);
    const odNum = parseNumber(cell(col.od));

    // Sebuah baris "jelas sirkuit" kalau punya nomor sirkuit DAN deskripsi yang berbeda satu
    // sama lain. Baris catatan di kaki tabel biasanya satu teks ter-merge, sehingga kedua
    // kolom mengembalikan teks yang sama - syarat berbeda itulah yang menyaringnya.
    const circuitText = cell(col.circuit);
    const descText = cell(col.desc);
    const hasIdentity = Boolean(circuitText && descText && circuitText !== descText);

    // Tanpa tipe dan tanpa OD, baris hanya diterima kalau identitasnya jelas. Kalau tidak,
    // kabel yang kolom TYPE dan OD-nya kebetulan kosong akan hilang tanpa jejak.
    if (!typeText && odNum === undefined && !hasIdentity) continue;
    if (typeText.length > 80 && !odNum) continue;

    const sourceText = typeText || cell(col.desc);
    const match = matchCatalog(sourceText, odNum);

    // Kalau file punya kolom OD, angka OD adalah penyaring paling tegas terhadap baris
    // rekap dan catatan - tapi tidak boleh mutlak. Workbook yang ditulis program lain
    // (termasuk hasil export aplikasi ini) menyimpan kolom OD sebagai formula tanpa nilai
    // ter-cache, sehingga selnya terbaca kosong dan seluruh baris kabel ikut terbuang.
    // Baris tanpa OD karena itu tetap diterima kalau teks TYPE-nya sendiri cocok persis
    // dengan katalog: diameternya diambil dari katalog, persis seperti perilaku yang
    // diinginkan saat OD tidak terbaca.
    // Baris tanpa OD yang tipenya tidak cocok tetap masuk selama identitasnya jelas -
    // ditandai unresolved supaya user memilih tipenya, dan diameternya ikut katalog.
    if (col.od >= 0 && !(odNum && odNum > 0) && match.quality !== 'exact' && !hasIdentity) continue;

    // Jumlah run yang mustahil menandakan kolomnya bukan jumlah run: tabel konfigurasi
    // lebar tray (100, 150, 200 ... 1000) terbaca persis seperti ini dan menghasilkan
    // baris-baris kabel palsu. Lebih baik dibuang dan dilaporkan daripada ikut dihitung.
    const runCount = Math.max(1, Math.round(parseNumber(cell(col.runs)) ?? 1));
    if (runCount > MAX_PLAUSIBLE_RUNS) {
      skippedImplausible++;
      continue;
    }

    quality[match.quality]++;

    const watt = col.loadCols.reduce((sum, i) => sum + (parseNumber(cell(i)) ?? 0), 0);
    const loadKw = watt > 0 ? (col.loadInWatt ? watt / 1000 : watt) : undefined;

    seq++;
    const circuit = circuitText || (cell(col.no) ? `CKT-${cell(col.no)}` : `IMP-${seq}`);
    rows.push({
      run: {
        id: `IMP-${stamp}-${seq}`,
        panel: cell(col.panel) || panelFromTitle || 'IMPORT',
        circuit,
        category: normCategory(cell(col.category)),
        loadKw,
        description: descText || typeText || '(imported)',
        typeCode: match.typeCode,
        runs: runCount,
      },
      quality: match.quality,
      fileOdMm: match.fileOdMm,
      odDeltaMm: match.odDeltaMm,
      sourceText,
    });
  }

  if (rows.length === 0) {
    throw new Error(
      skippedImplausible > 0
        ? `Tidak ada baris kabel valid: ${skippedImplausible} baris dibuang karena jumlah run-nya di atas ${MAX_PLAUSIBLE_RUNS}, jadi tabel yang terbaca (sheet "${sheetName}", header baris ${band.start + 1}) kemungkinan tabel konfigurasi, bukan daftar kabel.`
        : `Tidak ada baris kabel valid ditemukan di sheet "${sheetName}" (header baris ${band.start + 1}).`,
    );
  }

  if (skippedImplausible > 0) {
    warnings.push({ code: 'skippedImplausible', count: skippedImplausible, max: MAX_PLAUSIBLE_RUNS });
  }
  if (quality.odMismatch > 0) warnings.push({ code: 'odMismatch', count: quality.odMismatch });
  if (quality.odFallback > 0) warnings.push({ code: 'odFallback', count: quality.odFallback });
  if (quality.odApprox > 0) warnings.push({ code: 'odApprox', count: quality.odApprox });
  if (quality.unresolved > 0) warnings.push({ code: 'unresolved', count: quality.unresolved });

  return {
    rows,
    runs: rows.map((r) => r.run),
    warnings,
    skippedImplausible,
    detected: {
      sheet: sheetName,
      headerRow: band.start + 1,
      panel: panelFromTitle,
      typeColumn: col.type >= 0 ? `${columnLetter(col.type)} (${band.labels[col.type] || '?'})` : '-',
      odColumn: col.od >= 0 ? `${columnLetter(col.od)} (${band.labels[col.od] || '?'})` : '-',
    },
  };
}

/* ------------------------------------------------------------- entry points */

export async function importScheduleFromExcel(file: File): Promise<ImportResult> {
  // ExcelJS ~250 kB - hanya dimuat kalau user benar-benar mengimpor file.
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  // Schedule biasanya di sheet dengan baris terbanyak.
  let sheet = wb.worksheets[0];
  for (const ws of wb.worksheets) if (ws.rowCount > (sheet?.rowCount ?? 0)) sheet = ws;
  if (!sheet) throw new Error('Tidak ada sheet di file Excel ini.');

  const grid: Grid = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      cells[c - 1] = String(row.getCell(c).text ?? '');
    }
    grid[r - 1] = cells;
  }

  return parseGrid(grid, sheet.name);
}

/** CSV: satu baris = satu record; pemisah koma atau titik-koma; dukung kutip. */
export async function importScheduleFromCsv(file: File): Promise<ImportResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('CSV terlalu pendek.');

  const splitCsv = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if ((ch === ',' || ch === ';') && !inQ) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  return parseGrid(lines.map(splitCsv), file.name);
}

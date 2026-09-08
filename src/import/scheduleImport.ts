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

export interface ImportResult {
  runs: CableRun[];
  warnings: string[];
  detected: DetectedColumns;
}

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

export type MatchQuality = 'exact' | 'odFallback' | 'odMismatch' | 'guess';

export interface CatalogMatch {
  typeCode: string;
  quality: MatchQuality;
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
        if (byOd) return { typeCode: byOd.id, quality: 'exact' };
        return { typeCode: candidates[0].id, quality: 'odMismatch' };
      }
      return { typeCode: candidates[0].id, quality: 'exact' };
    }
  }

  // 3) Tidak terbaca dari teks - pakai OD terdekat.
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
    if (bestDiff <= Math.max(1.5, odHint * 0.15)) return { typeCode: best.id, quality: 'odFallback' };
  }

  return { typeCode: findEntry('3C-4')?.id ?? ALL_ENTRIES[0]?.id ?? '3C-4', quality: 'guess' };
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

  // Baris tetangga ikut dianggap header selama masih punya beberapa label kata kunci.
  let start = best;
  let end = best;
  const threshold = Math.max(4, scores[best] * 0.35);
  while (start - 1 >= 0 && scores[start - 1] >= threshold) start--;
  while (end + 1 < limit && scores[end + 1] >= threshold) end++;

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

function mapColumns(grid: Grid, band: HeaderBand): ColMap {
  const labels = band.labels;
  const from = band.end + 1;

  const type =
    byHeader(labels, /\btype\b|\btipe\b|cable size|ukuran kabel|kabel|cable/, /breaker|panel|tray/) !== -1
      ? byHeader(labels, /\btype\b|\btipe\b|cable size|ukuran kabel|kabel|cable/, /breaker|panel|tray/)
      : detectTypeByContent(grid, from);

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
  const runs: CableRun[] = [];
  const warnings: string[] = [];
  const quality: Record<MatchQuality, number> = { exact: 0, odFallback: 0, odMismatch: 0, guess: 0 };
  let seq = 0;

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
    // Kalau file punya kolom OD, baris data wajib punya angka OD - penyaring paling tegas
    // terhadap baris rekap dan catatan.
    if (col.od >= 0 && !(odNum && odNum > 0)) continue;
    if (!typeText && odNum === undefined) continue;
    if (typeText.length > 80 && !odNum) continue;

    const match = matchCatalog(typeText || cell(col.desc), odNum);
    quality[match.quality]++;

    const watt = col.loadCols.reduce((sum, i) => sum + (parseNumber(cell(i)) ?? 0), 0);
    const loadKw = watt > 0 ? (col.loadInWatt ? watt / 1000 : watt) : undefined;

    seq++;
    const circuit = cell(col.circuit) || (cell(col.no) ? `CKT-${cell(col.no)}` : `IMP-${seq}`);
    runs.push({
      id: `IMP-${stamp}-${seq}`,
      panel: cell(col.panel) || panelFromTitle || 'IMPORT',
      circuit,
      category: normCategory(cell(col.category)),
      loadKw,
      description: cell(col.desc) || typeText || '(imported)',
      typeCode: match.typeCode,
      runs: Math.max(1, Math.round(parseNumber(cell(col.runs)) ?? 1)),
    });
  }

  if (runs.length === 0) throw new Error('Tidak ada baris kabel valid ditemukan di file ini.');

  if (quality.odMismatch > 0) {
    warnings.push(
      `${quality.odMismatch} baris: OD di file berbeda dari OD katalog untuk tipe yang tertulis. Perhitungan memakai OD katalog - periksa kolom OD.`,
    );
  }
  if (quality.odFallback > 0) {
    warnings.push(
      `${quality.odFallback} baris: tipe kabel tidak terbaca dari teks, dicocokkan lewat OD terdekat.`,
    );
  }
  if (quality.guess > 0) {
    warnings.push(
      `${quality.guess} baris: tipe maupun OD tidak dikenali, dipakai tipe default 3C-4. Periksa sebelum menghitung.`,
    );
  }

  return {
    runs,
    warnings,
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

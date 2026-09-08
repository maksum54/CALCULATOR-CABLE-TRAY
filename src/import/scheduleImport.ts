// Import cable schedule dari file Excel / CSV yang di-upload user, supaya
// tidak perlu mengetik 125 baris satu per satu. Parser mencari kolom berdasar
// nama header (fleksibel terhadap urutan & bahasa), lalu mencocokkan deskripsi
// kabel ke katalog via fuzzy match.

import ExcelJS from 'exceljs';
import type { CableRun } from '../core/types';
import { ALL_ENTRIES, findEntry } from '../core/catalog';

export interface ImportResult {
  runs: CableRun[];
  warnings: string[];
}

/** Pemetaan kolom hasil pencarian header. -1 = kolom tidak ada. */
interface ColMap {
  panel: number;
  circuit: number;
  category: number;
  load: number;
  desc: number;
  type: number;
  runs: number;
  od: number;
}

const COL_CANDIDATES: { [K in keyof ColMap]: string[] } = {
  panel: ['panel', 'board'],
  circuit: ['circuit', 'sirkuit'],
  category: ['category', 'kategori'],
  load: ['load', 'beban', 'kw'],
  desc: ['desc', 'cable', 'kabel', 'spec'],
  type: ['type', 'tipe'],
  runs: ['run', 'qty'],
  od: ['od', 'diameter', 'dia'],
};

/** Cari index kolom dari daftar kandidat nama (contains, case-insensitive). */
function findCol(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h.length > 0 && h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

function mapCols(headers: string[]): ColMap {
  const map = {} as ColMap;
  (Object.keys(COL_CANDIDATES) as (keyof ColMap)[]).forEach((k) => {
    map[k] = findCol(headers, COL_CANDIDATES[k]);
  });
  return map;
}

/** Normalisasi angka lokal: "1,35" (ID) dan "1.35" (EN) keduanya 1.35. */
function parseNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const s = String(v).trim().replace(/\s/g, '');
  const norm =
    s.includes(',') && s.includes('.')
      ? s.replace(/\./g, '').replace(',', '.') // gaya ID: titik = ribuan
      : s.replace(',', '.');
  const n = Number(norm);
  return Number.isFinite(n) && n !== 0 ? n : undefined;
}

/** Normalisasi kategori bebas menjadi salah satu dari tiga nilai aplikasi. */
function normCategory(raw: string): string {
  const u = raw.toUpperCase();
  if (/IN/.test(u)) return 'INCOMING';
  if (/OUT/.test(u)) return 'OUTGOING';
  if (/SPARE|SPR/.test(u)) return 'SPARE';
  return 'OUTGOING';
}

/**
 * Cocokkan teks bebas ("1x3C-4mm2 Cu/XLPE/PVC", "3C-4", "4C25") ke id katalog.
 * Urutannya: id persis -> pattern cores+size -> terakhir OD terdekat.
 */
export function matchCatalog(text: string, odHint?: number): string {
  const t = text.trim();

  // 1) Id katalog persis muncul di teks.
  const direct = ALL_ENTRIES.find((e) => t.toLowerCase().includes(e.id.toLowerCase()));
  if (direct) return direct.id;

  // 2) Pattern umum: "1x3C-4", "3C-4", "4C25", "3C 4".
  const m =
    t.match(/(\d+)\s*[xX]\s*(\d+)\s*[- ]?[cC]\s*[- ]?\s*(\d+(?:\.\d+)?)/) ??
    t.match(/(\d+)\s*[- ]?[cC]\s*[- ]?\s*(\d+(?:\.\d+)?)/);
  if (m) {
    const cores = m.length === 4 ? Number(m[2]) : Number(m[1]);
    const size = Number(m[m.length - 1]);
    const candidate = ALL_ENTRIES.find((e) => e.cores === cores && e.sizeMm2 === size);
    if (candidate) return candidate.id;
    // Coba balik: kadang ditulis "4x25" tanpa huruf C pada sel type.
    const candidate2 = ALL_ENTRIES.find(
      (e) => e.cores === Number(m[1]) && e.sizeMm2 === Number(m[m.length - 1]),
    );
    if (candidate2) return candidate2.id;
  }

  // 3) Tebakan OD terdekat (dipakai kalau sel type cuma berisi diameter).
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
    if (bestDiff <= Math.max(1.5, odHint * 0.15)) return best.id;
  }

  return findEntry('3C-4')?.id ?? ALL_ENTRIES[0]?.id ?? '3C-4';
}

function buildRun(
  seq: number,
  stamp: string,
  cells: { panel: string; circuit: string; category: string; load: string; desc: string; type: string; runs: string; od: string },
): CableRun | null {
  const { panel, circuit, category, load, desc, type, runs, od } = cells;
  if (!panel && !circuit && !desc && !type) return null; // baris kosong
  const odNum = parseNumber(od);
  const typeCode = matchCatalog(type || desc, odNum);
  return {
    id: `IMP-${stamp}-${seq}`,
    panel: panel || 'IMPORT',
    circuit: circuit || `IMP-${seq}`,
    category: normCategory(category),
    loadKw: parseNumber(load),
    description: desc || type || '(imported)',
    typeCode,
    runs: Math.max(1, Math.round(parseNumber(runs) ?? 1)),
  };
}

/** Heuristik: baris header = baris dengan sel tebal + kata kunci terbanyak. */
function detectHeaderRow(sheet: ExcelJS.Worksheet): number {
  let bestRow = 1;
  let bestScore = -1;
  sheet.eachRow((row, rowNum) => {
    if (rowNum > 15) return; // header pasti di 15 baris pertama
    let score = 0;
    row.eachCell((cell) => {
      if (cell.font?.bold) score++;
      const v = String(cell.text ?? '').toLowerCase();
      if (/panel|circuit|sirkuit|cable|kabel|type|tipe|load|beban|run|od|desc|kategori|category/.test(v)) score += 2;
    });
    if (score > bestScore) {
      bestScore = score;
      bestRow = rowNum;
    }
  });
  return bestRow;
}

export async function importScheduleFromExcel(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  // Schedule biasanya di sheet dengan baris terbanyak.
  let sheet = wb.worksheets[0];
  let maxRows = 0;
  for (const ws of wb.worksheets) {
    if (ws.rowCount > maxRows) {
      maxRows = ws.rowCount;
      sheet = ws;
    }
  }
  if (!sheet) throw new Error('Tidak ada sheet di file Excel ini.');

  const headerRowNum = detectHeaderRow(sheet);
  const headerRow = sheet.getRow(headerRowNum);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.text ?? '').trim().toLowerCase();
  });
  for (let i = 0; i < headers.length; i++) if (!headers[i]) headers[i] = '';

  const col = mapCols(headers);
  if (col.desc === -1 && col.type === -1 && col.od === -1) {
    throw new Error(
      'Kolom kabel tidak ditemukan. Pastikan file punya kolom "Description", "Type", atau "OD".',
    );
  }

  const warnings: string[] = [];
  const runs: CableRun[] = [];
  const stamp = Date.now().toString(36);
  let seq = 0;

  sheet.eachRow((row, rowNum) => {
    if (rowNum <= headerRowNum) return;
    const get = (idx: number): string => {
      if (idx < 0) return '';
      return String(row.getCell(idx + 1)?.text ?? '').trim();
    };
    const run = buildRun(++seq, stamp, {
      panel: get(col.panel),
      circuit: get(col.circuit),
      category: get(col.category),
      load: get(col.load),
      desc: get(col.desc),
      type: get(col.type),
      runs: get(col.runs),
      od: get(col.od),
    });
    if (run) runs.push(run);
  });

  if (runs.length === 0) throw new Error('Tidak ada baris kabel valid ditemukan di file ini.');

  // Baris yang tak punya jejak teks maupun OD -> kemungkinan besar tebakan.
  const guessed = runs.filter((r) => {
    const e = findEntry(r.typeCode);
    if (!e) return true;
    const text = r.description.toLowerCase();
    return !text.includes(e.id.toLowerCase()) && !/\d/.test(text);
  });
  if (guessed.length > 0) {
    warnings.push(
      `${guessed.length} baris tipe kabelnya ditebak (deskripsi tidak mengandung ukuran yang dikenali). Periksa kolom Type sebelum menghitung.`,
    );
  }

  return { runs, warnings };
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

  const headers = splitCsv(lines[0]).map((h) => h.trim().toLowerCase());
  const col = mapCols(headers);
  if (col.desc === -1 && col.type === -1 && col.od === -1) {
    throw new Error('Kolom kabel tidak ditemukan di header CSV.');
  }

  const warnings: string[] = [];
  const runs: CableRun[] = [];
  const stamp = Date.now().toString(36);

  lines.slice(1).forEach((line, i) => {
    const cells = splitCsv(line);
    const get = (idx: number) => (idx >= 0 ? (cells[idx] ?? '').trim() : '');
    const run = buildRun(i + 1, stamp, {
      panel: get(col.panel),
      circuit: get(col.circuit),
      category: get(col.category),
      load: get(col.load),
      desc: get(col.desc),
      type: get(col.type),
      runs: get(col.runs),
      od: get(col.od),
    });
    if (run) runs.push(run);
  });

  if (runs.length === 0) throw new Error('Tidak ada baris kabel valid ditemukan di CSV ini.');

  return { runs, warnings };
}

// Blank cable schedule template - the workbook a user fills in and feeds back to "Import
// Excel/CSV".
//
// Why this exists. The export in export/excel.ts writes a calculation that is already
// finished; it answers "what did the app work out?". This file answers the question before
// that one: "what shape must my file have for the app to read it?". Offices that keep their
// cable list in Excel need somewhere to start, and a schedule typed into this template is
// guaranteed to import, because the sheet names, the header row and the TYPE / OD columns are
// exactly the ones import/scheduleImport.ts looks for - a round-trip test in
// export/__tests__/scheduleTemplate.test.ts holds that promise in place.
//
// The layout follows CABLE-TRAY-CALCULATION_FGW.xlsx (four sheets: CABLE DATA (OD), CABLE
// SCHEDULE, SUMMARY BY TYPE, TRAY CALCULATION), the format engineers here already hand around.
// Every derived cell is a formula: type a cable code in the TIPE column and its diameter, total
// width, area, the per-type and per-panel summaries and the tray sizing all follow, in Excel,
// with no app involved.

import ExcelJS from 'exceljs';
import type { CableRun, TrayParams } from '../core/types';
import { findEntry, entryLabel, isVerified, PROJECT_CATALOG } from '../core/catalog';
import { STANDARD_WIDTHS_MM } from '../core/trayStandards';
import type { Lang } from '../i18n';
import type { ProjectInfo } from '../store/useAppStore';
import {
  box,
  fill,
  headerRow,
  INPUT_FILL,
  paramRow,
  sectionHeading,
  titleRow,
  TOTAL_FILL,
  WARN_FILL,
} from './xlsxStyle';

export interface TemplateInput {
  lang: Lang;
  project: ProjectInfo;
  params: TrayParams;
  /** Rows already in the app, written into the template as a worked example. May be empty. */
  schedule: CableRun[];
}

/** Blank input rows added below whatever the schedule already holds. */
const BLANK_ROWS = 60;
/** Panel rows offered on the summary and per-panel tables when the schedule is empty. */
const BLANK_PANELS = 8;

const CATEGORIES = ['INCOMING', 'FEEDER', 'OUTGOING', 'KONTROL', 'SPARE'];

/**
 * Header captions follow the app language. Both sets are ones the importer resolves by name -
 * TYPE / TIPE, OD, QTY OF RUNS / JML RUN - which the round-trip test checks in both languages.
 */
const TEXT = {
  id: {
    odTitle: 'DATA DIAMETER LUAR KABEL (OD)',
    odSub: 'Sel kuning = input, boleh diubah. Seluruh sheet lain mengambil OD dari tabel ini.',
    odHead: ['NO', 'KODE TIPE', 'KONFIGURASI KABEL', 'OD (mm)', 'LUAS 1 KABEL (mm2)', 'CATATAN'],
    odNote1: 'Tambahkan baris di bawah bila ada tipe kabel lain - kolom KODE TIPE adalah kunci yang dipakai sheet CABLE SCHEDULE.',
    odNote2: 'OD WAJIB diverifikasi ke katalog pabrikan yang benar-benar dipakai sebelum perhitungan diterbitkan.',
    schTitle: 'CABLE SCHEDULE - DAFTAR SELURUH KABEL',
    schSub: 'Isi kolom kuning saja. Kolom OD, LEBAR TOTAL dan LUAS TOTAL terisi sendiri dari KODE TIPE.',
    schHead: ['NO', 'PANEL', 'CIRCUIT No.', 'KATEGORI', 'DAYA (kW)', 'DESKRIPSI KABEL', 'TIPE', 'JML RUN', 'OD (mm)', 'LEBAR TOTAL (mm)', 'LUAS TOTAL (mm2)'],
    total: 'TOTAL',
    sumTitle: 'REKAPITULASI KABEL',
    sumA: 'A. REKAP PER TIPE KABEL',
    sumAHead: ['NO', 'TIPE KABEL', 'JML RUN', 'OD (mm)', 'LEBAR TOTAL (mm)', 'LUAS TOTAL (mm2)', '% THD LEBAR'],
    sumB: 'B. REKAP PER PANEL',
    sumBHead: ['NO', 'PANEL', 'JML RUN', 'DAYA (kW)', 'LEBAR TOTAL (mm)', 'LUAS TOTAL (mm2)', '% THD LEBAR'],
    sumBNote: 'Catatan: kolom DAYA bersifat informatif - kabel feeder antar panel dan beban outgoing panel tujuan tercatat ganda.',
    sumC: 'C. REKAP PER KATEGORI',
    sumCHead: ['NO', 'KATEGORI', 'JML RUN', 'LEBAR TOTAL (mm)', 'LUAS TOTAL (mm2)'],
    calcTitle: 'PERHITUNGAN UKURAN & JUMLAH JALUR CABLE TRAY',
    calcA: 'A. PARAMETER PERHITUNGAN (sel kuning = input)',
    calcB: 'B. REKAP DATA KABEL (link dari CABLE SCHEDULE)',
    calcC: 'C. METODE 1 - PENJUMLAHAN DIAMETER (SOD)',
    calcD: 'D. METODE 2 - FILL RATIO / LUAS',
    calcE: 'E. HASIL PERHITUNGAN',
    calcF: 'F. ALTERNATIF LEBAR TRAY STANDAR',
    calcG: 'G. PERHITUNGAN PER PANEL (bila rute tray dipisah per panel)',
    calcH: 'H. CATATAN, ASUMSI & BATASAN',
    paramHead: ['NO', 'PARAMETER', 'NILAI', 'SATUAN', 'KETERANGAN'],
    valueHead: ['NO', 'URAIAN', 'NILAI', 'SATUAN', 'RUMUS / KETERANGAN'],
    altHead: ['LEBAR TRAY (mm)', 'LAYER 1 - JALUR', 'LAYER 1 - FILL', 'LAYER 2 - JALUR', 'LAYER 2 - FILL', 'LAYER 3 - JALUR', 'LAYER 3 - FILL'],
    panelHead: ['PANEL', 'JML RUN', 'SOD (mm)', 'SA (mm2)', 'LEBAR DIBUTUHKAN (mm)', 'JALUR @ LEBAR DIPILIH', 'FILL AKTUAL', 'CEK'],
    params: [
      'Faktor spare / cadangan pengembangan',
      'Faktor jarak antar kabel (1.00 = bersentuhan)',
      'Tinggi cable tray',
      'Maksimum fill ratio (luas)',
      'Jumlah layer / susunan kabel',
      'Lebar tray standar yang dipilih',
    ],
    paramRemarks: [
      'Praktik umum 20 - 30 %',
      '1.10 = jarak antar kabel 10 % dari OD',
      'Tinggi sisi tray yang terpakai',
      'Batas pengisian terhadap luas penampang tray',
      'Lebih dari 1 layer wajib dikoreksi faktor grouping',
      'Dipakai menghitung jumlah jalur tray',
    ],
    dataRows: [
      ['Jumlah run kabel total', 'run', 'Termasuk incoming, pembumian dan kabel FRC'],
      ['Jumlah OD seluruh kabel (SOD)', 'mm', 'S (OD x jumlah run)'],
      ['Jumlah luas penampang kabel (SA)', 'mm2', 'S (pi/4 x OD^2 x jumlah run)'],
    ],
    m1: ['W1 = SOD x faktor jarak x (1 + spare) / layer', 'Lebar dibutuhkan metode 1'],
    m2: ['W2 = SA x (1 + spare) / fill ratio / tinggi tray / layer', 'Lebar dibutuhkan metode 2'],
    result: [
      'LEBAR TRAY DIBUTUHKAN = MAX(W1 ; W2)',
      'Metode yang menentukan',
      'Lebar tray standar dipilih',
      'JUMLAH JALUR TRAY DIBUTUHKAN',
      'Luas tray tersedia total',
      'FILL RATIO AKTUAL',
      'CEK TERHADAP MAKS. FILL RATIO',
      'Ukuran tray tertulis',
    ],
    m1Name: 'METODE 1 (SOD)',
    m2Name: 'METODE 2 (FILL)',
    notOk: 'NOT OK - perbesar tray',
    jalur: ' jalur ',
    notes: [
      'Isi sheet CABLE SCHEDULE saja. Kolom TIPE harus memakai KODE TIPE yang ada di sheet CABLE DATA (OD) - gunakan dropdown-nya.',
      'Baris kosong boleh dibiarkan; importer melewatinya. Tambah baris bila kurang, lalu perluas rentang pada baris TOTAL.',
      'Sirkuit SPARE / FUTURE yang belum ada kabelnya diisi JML RUN = 0 supaya tidak menambah lebar tray, tetapi tetap tercatat.',
      'Nilai OD pada sheet CABLE DATA (OD) masih nilai TIPIKAL dan WAJIB diverifikasi ke katalog pabrikan yang dipakai.',
      'Kabel feeder antar panel cukup dihitung SATU KALI, dicatat pada panel sumbernya dengan kategori FEEDER, supaya tidak terhitung dua kali sebagai incoming panel tujuan.',
      'Perhitungan utama mengasumsikan SELURUH kabel berada pada satu rute tray = kondisi paling berat. Bila rute dipisah, pakai tabel G.',
      'Kabel FRC untuk fan emergency dan kontrol fire alarm harus dipisah tray atau diberi sekat dari kabel daya normal.',
      'Pada susunan 1 layer, Metode 1 (penjumlahan OD) hampir selalu yang menentukan, sehingga fill ratio aktual keluar rendah. Itu benar: metode OD menjamin kabel tersusun sejajar satu lapis sehingga kemampuan hantar arusnya tidak turun.',
      'Susunan lebih dari 1 layer wajib dikoreksi faktor grouping sesuai PUIL 2011 / IEC 60364-5-52.',
      'PANJANG RUTE TIDAK DIHITUNG di sini. Hasil perhitungan ini adalah LEBAR dan JUMLAH JALUR tray, bukan volume material.',
    ],
  },
  en: {
    odTitle: 'CABLE OUTER DIAMETER (OD) DATA',
    odSub: 'Yellow cells are input. Every other sheet takes its diameters from this table.',
    odHead: ['NO', 'TYPE CODE', 'CABLE CONSTRUCTION', 'OD (mm)', 'AREA OF ONE CABLE (mm2)', 'REMARKS'],
    odNote1: 'Add rows below for any other cable type - the TYPE CODE column is the key the CABLE SCHEDULE sheet looks up.',
    odNote2: 'Diameters MUST be verified against the catalogue of the manufacturer actually used before the calculation is issued.',
    schTitle: 'CABLE SCHEDULE - COMBINED CABLE LIST',
    schSub: 'Fill in the yellow columns only. OD, TOTAL WIDTH and TOTAL AREA follow from the TYPE CODE.',
    schHead: ['NO', 'PANEL', 'CIRCUIT No.', 'CATEGORY', 'LOAD (kW)', 'CABLE DESCRIPTION', 'TYPE', 'QTY OF RUNS', 'OD (mm)', 'TOTAL WIDTH (mm)', 'TOTAL AREA (mm2)'],
    total: 'TOTAL',
    sumTitle: 'CABLE QUANTITY SUMMARY',
    sumA: 'A. SUMMARY BY CABLE TYPE',
    sumAHead: ['NO', 'CABLE TYPE', 'QTY OF RUNS', 'OD (mm)', 'TOTAL WIDTH (mm)', 'TOTAL AREA (mm2)', '% OF TOTAL WIDTH'],
    sumB: 'B. SUMMARY BY PANEL',
    sumBHead: ['NO', 'PANEL', 'QTY OF RUNS', 'LOAD (kW)', 'TOTAL WIDTH (mm)', 'TOTAL AREA (mm2)', '% OF TOTAL WIDTH'],
    sumBNote: 'Note: the load column is informative only - a feeder between panels and the outgoing loads of the panel it feeds are both counted.',
    sumC: 'C. SUMMARY BY CATEGORY',
    sumCHead: ['NO', 'CATEGORY', 'QTY OF RUNS', 'TOTAL WIDTH (mm)', 'TOTAL AREA (mm2)'],
    calcTitle: 'CABLE TRAY WIDTH & NUMBER OF RUNS CALCULATION',
    calcA: 'A. DESIGN PARAMETERS (yellow cells = input)',
    calcB: 'B. CABLE DATA SUMMARY (linked to the CABLE SCHEDULE sheet)',
    calcC: 'C. METHOD 1 - SUM OF CABLE DIAMETERS (SOD)',
    calcD: 'D. METHOD 2 - FILL RATIO BY AREA',
    calcE: 'E. RESULT',
    calcF: 'F. ALTERNATIVE STANDARD TRAY WIDTHS',
    calcG: 'G. CALCULATION PER PANEL (if the tray route is split per panel)',
    calcH: 'H. NOTES, ASSUMPTIONS & LIMITATIONS',
    paramHead: ['NO', 'PARAMETER', 'VALUE', 'UNIT', 'REMARKS'],
    valueHead: ['NO', 'DESCRIPTION', 'VALUE', 'UNIT', 'FORMULA / REMARKS'],
    altHead: ['TRAY WIDTH (mm)', 'LAYER 1 - RUNS', 'LAYER 1 - FILL', 'LAYER 2 - RUNS', 'LAYER 2 - FILL', 'LAYER 3 - RUNS', 'LAYER 3 - FILL'],
    panelHead: ['PANEL', 'QTY OF RUNS', 'SOD (mm)', 'SA (mm2)', 'REQUIRED WIDTH (mm)', 'RUNS @ SELECTED WIDTH', 'ACTUAL FILL', 'CHECK'],
    params: [
      'Spare / future expansion factor',
      'Cable spacing factor (1.00 = touching)',
      'Cable tray height',
      'Maximum fill ratio (area)',
      'Number of cable layers',
      'Selected standard tray width',
    ],
    paramRemarks: [
      'Common practice 20 - 30 %',
      '1.10 = 10 % of OD clearance between cables',
      'Usable tray side height',
      'Fill limit against the tray cross-section area',
      'More than one layer requires a grouping correction',
      'Used to calculate the number of tray runs',
    ],
    dataRows: [
      ['Total number of cable runs', 'runs', 'Includes incoming, earthing and FRC cables'],
      ['Sum of cable diameters (SOD)', 'mm', 'S (OD x qty of runs)'],
      ['Sum of cable outer areas (SA)', 'mm2', 'S (pi/4 x OD^2 x qty)'],
    ],
    m1: ['W1 = SOD x spacing factor x (1 + spare) / layers', 'Required width, method 1'],
    m2: ['W2 = SA x (1 + spare) / fill ratio / tray height / layers', 'Required width, method 2'],
    result: [
      'REQUIRED TRAY WIDTH = MAX(W1 ; W2)',
      'Governing method',
      'Selected standard tray width',
      'NUMBER OF TRAY RUNS REQUIRED',
      'Total tray area available',
      'ACTUAL FILL RATIO',
      'CHECK AGAINST THE MAXIMUM FILL RATIO',
      'Tray size as written',
    ],
    m1Name: 'METHOD 1 (SOD)',
    m2Name: 'METHOD 2 (FILL)',
    notOk: 'NOT OK - increase the tray size',
    jalur: ' runs of ',
    notes: [
      'Fill in the CABLE SCHEDULE sheet only. The TYPE column must use a TYPE CODE from the CABLE DATA (OD) sheet - use its dropdown.',
      'Blank rows may be left as they are; the importer skips them. Add rows if you need more, then extend the range on the TOTAL row.',
      'SPARE / FUTURE circuits with no cable yet take QTY OF RUNS = 0, so they are recorded without adding to the tray width.',
      'The diameters on the CABLE DATA (OD) sheet are TYPICAL values and MUST be verified against the manufacturer catalogue actually used.',
      'A feeder between panels is counted ONCE, on the panel it leaves, under the FEEDER category, so it is not counted again as the incoming of the panel it feeds.',
      'The main calculation assumes EVERY cable shares one tray route - the worst case. Use table G where the route is split.',
      'FRC cable for emergency fans and fire alarm control must be routed in a separate tray or behind a divider from the normal power cables.',
      'On a single layer, method 1 (sum of diameters) almost always governs, so the actual fill ratio comes out low. That is correct: the diameter method keeps the cables side by side in one layer, so their current-carrying capacity does not drop.',
      'More than one layer requires a grouping correction per PUIL 2011 / IEC 60364-5-52.',
      'ROUTE LENGTH IS NOT CALCULATED here. The result is the tray WIDTH and the NUMBER OF RUNS, not a material take-off.',
    ],
  },
} as const;

/** Cable types offered in the template: the project types, plus anything the schedule uses. */
function templateEntries(schedule: CableRun[]) {
  const ids = [...new Set([...PROJECT_CATALOG.map((e) => e.id), ...schedule.map((r) => r.typeCode)])];
  return ids.map((id) => findEntry(id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
}

export async function buildScheduleTemplate(input: TemplateInput): Promise<Blob> {
  const { lang, project, params, schedule } = input;
  const T = TEXT[lang];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Cable Tray Calculator';
  wb.created = new Date();

  const docRef = [project.company, project.name].filter(Boolean).join(' - ') || T.schTitle;

  // ---------------------------------------------------------------- CABLE DATA (OD)
  const data = wb.addWorksheet('CABLE DATA (OD)', { views: [{ state: 'frozen', ySplit: 4 }] });
  data.columns = [{ width: 6 }, { width: 20 }, { width: 34 }, { width: 12 }, { width: 20 }, { width: 58 }];
  titleRow(data, 1, T.odTitle, 6, `${docRef}. ${T.odSub}`);
  headerRow(data, 4, [...T.odHead]);

  const entries = templateEntries(schedule);
  const odFirst = 5;
  entries.forEach((e, i) => {
    const r = odFirst + i;
    data.getCell(r, 1).value = i + 1;
    data.getCell(r, 2).value = e.id;
    data.getCell(r, 3).value = `${e.construction} ${e.cores}x${e.sizeMm2}mm2`;
    const od = data.getCell(r, 4);
    od.value = e.odMm;
    od.numFmt = '0.0';
    fill(od, INPUT_FILL);
    const area = data.getCell(r, 5);
    area.value = { formula: `PI()/4*D${r}^2` };
    area.numFmt = '#,##0.00';
    const remark = data.getCell(r, 6);
    remark.value = isVerified(e) ? `${entryLabel(e)} - KMI ${e.datasheet}` : `${entryLabel(e)} - UNVERIFIED, check the manufacturer catalogue`;
    if (!isVerified(e)) fill(remark, WARN_FILL);
    for (let c = 1; c <= 6; c += 1) data.getCell(r, c).border = box();
  });
  const odLast = odFirst + entries.length - 1;
  wb.definedNames.add(`'CABLE DATA (OD)'!$B$${odFirst}:$B$${odLast}`, 'TIPE_KODE');
  wb.definedNames.add(`'CABLE DATA (OD)'!$D$${odFirst}:$D$${odLast}`, 'OD_LIST');

  [T.odNote1, T.odNote2].forEach((n, i) => {
    const cell = data.getCell(odLast + 2 + i, 1);
    cell.value = n;
    cell.font = { italic: true, size: 9, color: { argb: 'FFC00000' } };
  });

  // ---------------------------------------------------------------- CABLE SCHEDULE
  const sch = wb.addWorksheet('CABLE SCHEDULE', { views: [{ state: 'frozen', ySplit: 4 }] });
  sch.columns = [
    { width: 6 }, { width: 22 }, { width: 28 }, { width: 13 }, { width: 11 },
    { width: 42 }, { width: 16 }, { width: 10 }, { width: 11 }, { width: 16 }, { width: 17 },
  ];
  titleRow(sch, 1, T.schTitle, 11, `${docRef}. ${T.schSub}`);
  headerRow(sch, 4, [...T.schHead]);

  const schFirst = 5;
  const schLast = schFirst + schedule.length + BLANK_ROWS - 1;
  for (let r = schFirst; r <= schLast; r += 1) {
    const run = schedule[r - schFirst];
    // NO is a formula so that a row typed into the blank area numbers itself.
    sch.getCell(r, 1).value = { formula: `IF(COUNTA(B${r}:H${r})=0,"",ROW()-${schFirst - 1})` };
    sch.getCell(r, 2).value = run?.panel ?? null;
    sch.getCell(r, 3).value = run?.circuit ?? null;
    sch.getCell(r, 4).value = run?.category ?? null;
    sch.getCell(r, 5).value = run?.loadKw ?? null;
    sch.getCell(r, 5).numFmt = '#,##0.000';
    sch.getCell(r, 6).value = run?.description ?? null;
    sch.getCell(r, 7).value = run?.typeCode ?? null;
    sch.getCell(r, 8).value = run?.runs ?? null;
    // The whole input band stays yellow, filled rows included - every one of them is editable.
    for (let c = 2; c <= 8; c += 1) fill(sch.getCell(r, c), INPUT_FILL);
    // Only codes from the OD table, so no row can arrive with a diameter the workbook cannot
    // look up - and so the importer resolves every row against the catalogue.
    sch.getCell(r, 7).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['TIPE_KODE'],
      showErrorMessage: true,
      error: T.odNote1,
    };
    sch.getCell(r, 9).value = { formula: `IF($G${r}="","",INDEX(OD_LIST,MATCH($G${r},TIPE_KODE,0)))` };
    sch.getCell(r, 9).numFmt = '0.0';
    sch.getCell(r, 10).value = { formula: `IF($I${r}="","",$H${r}*$I${r})` };
    sch.getCell(r, 10).numFmt = '#,##0.0';
    sch.getCell(r, 11).value = { formula: `IF($I${r}="","",$H${r}*PI()/4*$I${r}^2)` };
    sch.getCell(r, 11).numFmt = '#,##0.0';
    for (let c = 1; c <= 11; c += 1) sch.getCell(r, c).border = box();
  }

  const schTotal = schLast + 1;
  sch.getCell(schTotal, 1).value = T.total;
  sch.getCell(schTotal, 1).font = { bold: true };
  for (const col of [8, 10, 11]) {
    const letter = sch.getColumn(col).letter;
    const c = sch.getCell(schTotal, col);
    c.value = { formula: `SUM(${letter}${schFirst}:${letter}${schLast})` };
    c.font = { bold: true };
    c.numFmt = '#,##0.0';
    fill(c, TOTAL_FILL);
  }
  for (let c = 1; c <= 11; c += 1) sch.getCell(schTotal, c).border = box();

  const schRange = (col: string) => `'CABLE SCHEDULE'!$${col}$${schFirst}:$${col}$${schLast}`;

  // ---------------------------------------------------------------- SUMMARY BY TYPE
  const sum = wb.addWorksheet('SUMMARY BY TYPE');
  sum.columns = [{ width: 6 }, { width: 24 }, { width: 12 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 16 }];
  titleRow(sum, 1, T.sumTitle, 7, docRef);

  sectionHeading(sum, 3, T.sumA);
  headerRow(sum, 4, [...T.sumAHead]);
  const typeFirst = 5;
  const typeLast = typeFirst + entries.length - 1;
  const typeTotal = typeLast + 1;
  entries.forEach((e, i) => {
    const r = typeFirst + i;
    sum.getCell(r, 1).value = i + 1;
    sum.getCell(r, 2).value = e.id;
    sum.getCell(r, 3).value = { formula: `SUMIF(${schRange('G')},B${r},${schRange('H')})` };
    sum.getCell(r, 4).value = { formula: `INDEX(OD_LIST,MATCH(B${r},TIPE_KODE,0))` };
    sum.getCell(r, 5).value = { formula: `SUMIF(${schRange('G')},B${r},${schRange('J')})` };
    sum.getCell(r, 6).value = { formula: `SUMIF(${schRange('G')},B${r},${schRange('K')})` };
    sum.getCell(r, 7).value = { formula: `IF($E$${typeTotal}=0,0,E${r}/$E$${typeTotal})` };
    sum.getCell(r, 7).numFmt = '0.0%';
    for (const c of [4, 5, 6]) sum.getCell(r, c).numFmt = '#,##0.00';
    for (let c = 1; c <= 7; c += 1) sum.getCell(r, c).border = box();
  });
  totalRow(sum, typeTotal, T.total, [3, 5, 6, 7], typeFirst, typeLast, 7);

  // Per panel. Panel names are input cells: type one and its figures appear, so the table
  // works just as well on a template nobody has filled in yet.
  const panels = [...new Set(schedule.map((r) => r.panel))];
  const panelCount = Math.max(panels.length, BLANK_PANELS);
  const panelHead = typeTotal + 2;
  sectionHeading(sum, panelHead, T.sumB);
  headerRow(sum, panelHead + 1, [...T.sumBHead]);
  const panelFirst = panelHead + 2;
  const panelLast = panelFirst + panelCount - 1;
  const panelTotal = panelLast + 1;
  for (let r = panelFirst; r <= panelLast; r += 1) {
    const name = panels[r - panelFirst];
    sum.getCell(r, 1).value = { formula: `IF(B${r}="","",ROW()-${panelFirst - 1})` };
    sum.getCell(r, 2).value = name ?? null;
    fill(sum.getCell(r, 2), INPUT_FILL);
    sum.getCell(r, 3).value = { formula: `SUMIF(${schRange('B')},B${r},${schRange('H')})` };
    sum.getCell(r, 4).value = { formula: `SUMIF(${schRange('B')},B${r},${schRange('E')})` };
    sum.getCell(r, 5).value = { formula: `SUMIF(${schRange('B')},B${r},${schRange('J')})` };
    sum.getCell(r, 6).value = { formula: `SUMIF(${schRange('B')},B${r},${schRange('K')})` };
    sum.getCell(r, 7).value = { formula: `IF($E$${panelTotal}=0,0,E${r}/$E$${panelTotal})` };
    sum.getCell(r, 7).numFmt = '0.0%';
    for (const c of [4, 5, 6]) sum.getCell(r, c).numFmt = '#,##0.00';
    for (let c = 1; c <= 7; c += 1) sum.getCell(r, c).border = box();
  }
  totalRow(sum, panelTotal, T.total, [3, 4, 5, 6, 7], panelFirst, panelLast, 7);
  const panelNote = sum.getCell(panelTotal + 1, 1);
  panelNote.value = T.sumBNote;
  panelNote.font = { italic: true, size: 9, color: { argb: 'FF7F7F7F' } };

  const catHead = panelTotal + 3;
  sectionHeading(sum, catHead, T.sumC);
  headerRow(sum, catHead + 1, [...T.sumCHead]);
  CATEGORIES.forEach((cat, i) => {
    const r = catHead + 2 + i;
    sum.getCell(r, 1).value = i + 1;
    sum.getCell(r, 2).value = cat;
    sum.getCell(r, 3).value = { formula: `SUMIF(${schRange('D')},B${r},${schRange('H')})` };
    sum.getCell(r, 4).value = { formula: `SUMIF(${schRange('D')},B${r},${schRange('J')})` };
    sum.getCell(r, 5).value = { formula: `SUMIF(${schRange('D')},B${r},${schRange('K')})` };
    for (const c of [4, 5]) sum.getCell(r, c).numFmt = '#,##0.00';
    for (let c = 1; c <= 5; c += 1) sum.getCell(r, c).border = box();
  });

  // ---------------------------------------------------------------- TRAY CALCULATION
  const calc = wb.addWorksheet('TRAY CALCULATION');
  calc.columns = [{ width: 6 }, { width: 46 }, { width: 16 }, { width: 12 }, { width: 58 }];
  titleRow(calc, 1, T.calcTitle, 5, `${docRef} - ${project.drawingNo} ${project.revision} ${project.date}`);

  // Cell addresses the rest of the sheet leans on, written absolute so a user copying a
  // formula down or across keeps pointing at the parameter block - the same convention as the
  // workbook this template is modelled on.
  const C = {
    spare: '$C$6',
    spacing: '$C$7',
    height: '$C$8',
    fill: '$C$9',
    layers: '$C$10',
    width: '$C$11',
    runs: '$C$15',
    sod: '$C$16',
    sa: '$C$17',
    w1: '$C$21',
    w2: '$C$25',
    required: '$C$29',
    trayRuns: '$C$32',
    trayArea: '$C$33',
    actualFill: '$C$34',
  };
  sectionHeading(calc, 4, T.calcA);
  headerRow(calc, 5, [...T.paramHead]);
  const paramValues = [
    params.spareFactor,
    params.spacingFactor,
    params.trayHeightMm,
    params.maxFillRatio,
    params.layers,
    params.selectedTrayWidthMm,
  ];
  const paramFormats = ['0.00', '0.00', '#,##0', '0.00', '#,##0', '#,##0'];
  const paramUnits = ['-', '-', 'mm', '-', 'layer', 'mm'];
  T.params.forEach((label, i) => {
    paramRow(calc, 6 + i, i + 1, label, paramValues[i], paramUnits[i], T.paramRemarks[i], {
      input: true,
      numFmt: paramFormats[i],
    });
  });

  sectionHeading(calc, 13, T.calcB);
  headerRow(calc, 14, [...T.valueHead]);
  const dataFormulas = [`'CABLE SCHEDULE'!H${schTotal}`, `'CABLE SCHEDULE'!J${schTotal}`, `'CABLE SCHEDULE'!K${schTotal}`];
  T.dataRows.forEach(([label, unit, remark], i) => {
    paramRow(calc, 15 + i, i + 1, label, { formula: dataFormulas[i] }, unit, remark, {
      numFmt: i === 0 ? '#,##0' : '#,##0.00',
    });
  });
  sectionHeading(calc, 19, T.calcC);
  headerRow(calc, 20, [...T.valueHead]);
  const w1 = `${C.sod}*${C.spacing}*(1+${C.spare})/${C.layers}`;
  paramRow(calc, 21, 1, T.m1[1], { formula: w1 }, 'mm', T.m1[0], {});

  sectionHeading(calc, 23, T.calcD);
  headerRow(calc, 24, [...T.valueHead]);
  const w2 = `${C.sa}*(1+${C.spare})/${C.fill}/${C.height}/${C.layers}`;
  paramRow(calc, 25, 1, T.m2[1], { formula: w2 }, 'mm', T.m2[0], {});

  sectionHeading(calc, 27, T.calcE);
  headerRow(calc, 28, [...T.valueHead]);
  paramRow(calc, 29, 1, T.result[0], { formula: `MAX(${C.w1},${C.w2})` }, 'mm', 'MAX(W1;W2)', { result: true });
  paramRow(calc, 30, 2, T.result[1], { formula: `IF(${C.w1}>=${C.w2},"${T.m1Name}","${T.m2Name}")` }, '-', '', { numFmt: '@' });
  paramRow(calc, 31, 3, T.result[2], { formula: C.width }, 'mm', '', { numFmt: '#,##0' });
  // MAX(1, ...) keeps an empty sheet reading "1 tray run", the same floor core/traySizing.ts
  // applies, so the workbook and the app never disagree on a schedule nobody has filled in yet.
  paramRow(calc, 32, 4, T.result[3], { formula: `MAX(1,ROUNDUP(${C.required}/${C.width},0))` }, '-', 'ROUNDUP(W/Wtray)', { result: true, numFmt: '#,##0' });
  paramRow(calc, 33, 5, T.result[4], { formula: `${C.trayRuns}*${C.width}*${C.height}*${C.layers}` }, 'mm2', '', {});
  paramRow(calc, 34, 6, T.result[5], { formula: `IF(${C.trayArea}=0,0,${C.sa}/${C.trayArea})` }, '-', '', { numFmt: '0.00%' });
  paramRow(calc, 35, 7, T.result[6], { formula: `IF(${C.actualFill}<=${C.fill},"OK","${T.notOk}")` }, '-', '', { result: true, numFmt: '@' });
  paramRow(calc, 36, 8, T.result[7], { formula: `${C.trayRuns}&"${T.jalur}"&${C.width}&" x "&${C.height}&" mm"` }, '-', '', { numFmt: '@' });

  const altHead = 38;
  sectionHeading(calc, altHead, T.calcF);
  headerRow(calc, altHead + 1, [...T.altHead]);
  STANDARD_WIDTHS_MM.forEach((w, i) => {
    const r = altHead + 2 + i;
    calc.getCell(r, 1).value = w;
    for (let layer = 1; layer <= 3; layer += 1) {
      const runsCol = layer * 2;
      const fillCol = runsCol + 1;
      const runsLetter = calc.getColumn(runsCol).letter;
      calc.getCell(r, runsCol).value = {
        formula: `ROUNDUP(MAX(${C.sod}*${C.spacing}*(1+${C.spare})/${layer},${C.sa}*(1+${C.spare})/${C.fill}/${C.height}/${layer})/$A${r},0)`,
      };
      calc.getCell(r, fillCol).value = {
        formula: `IF(${runsLetter}${r}=0,0,${C.sa}/($A${r}*${C.height}*${layer}*${runsLetter}${r}))`,
      };
      calc.getCell(r, fillCol).numFmt = '0.00%';
    }
    for (let c = 1; c <= 7; c += 1) calc.getCell(r, c).border = box();
  });
  const altLast = altHead + 1 + STANDARD_WIDTHS_MM.length;

  const perPanelHead = altLast + 2;
  sectionHeading(calc, perPanelHead, T.calcG);
  headerRow(calc, perPanelHead + 1, [...T.panelHead]);
  const ppFirst = perPanelHead + 2;
  for (let i = 0; i < panelCount; i += 1) {
    const r = ppFirst + i;
    // Names come from the summary sheet, so a panel is typed once and both tables follow.
    calc.getCell(r, 1).value = { formula: `'SUMMARY BY TYPE'!B${panelFirst + i}` };
    calc.getCell(r, 2).value = { formula: `SUMIF(${schRange('B')},$A${r},${schRange('H')})` };
    calc.getCell(r, 3).value = { formula: `SUMIF(${schRange('B')},$A${r},${schRange('J')})` };
    calc.getCell(r, 4).value = { formula: `SUMIF(${schRange('B')},$A${r},${schRange('K')})` };
    calc.getCell(r, 5).value = {
      formula: `MAX($C${r}*${C.spacing}*(1+${C.spare})/${C.layers},$D${r}*(1+${C.spare})/${C.fill}/${C.height}/${C.layers})`,
    };
    calc.getCell(r, 6).value = { formula: `ROUNDUP($E${r}/${C.width},0)` };
    calc.getCell(r, 7).value = { formula: `IF($F${r}=0,0,$D${r}/($F${r}*${C.width}*${C.height}*${C.layers}))` };
    calc.getCell(r, 7).numFmt = '0.00%';
    calc.getCell(r, 8).value = { formula: `IF($F${r}=0,"-",IF($G${r}<=${C.fill},"OK","${T.notOk}"))` };
    for (const c of [3, 4, 5]) calc.getCell(r, c).numFmt = '#,##0.00';
    calc.getCell(r, 2).numFmt = '#,##0';
    calc.getCell(r, 6).numFmt = '#,##0';
    for (let c = 1; c <= 8; c += 1) calc.getCell(r, c).border = box();
  }

  const noteHead = ppFirst + panelCount + 1;
  sectionHeading(calc, noteHead, T.calcH);
  T.notes.forEach((n, i) => {
    const r = noteHead + 1 + i;
    calc.getCell(r, 1).value = i + 1;
    calc.mergeCells(r, 2, r, 5);
    const cell = calc.getCell(r, 2);
    cell.value = n;
    cell.alignment = { wrapText: true, vertical: 'top' };
    calc.getRow(r).height = 26;
    calc.getCell(r, 1).border = box();
    cell.border = box();
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Bold, green-filled SUM row closing a summary table. */
function totalRow(
  ws: ExcelJS.Worksheet,
  row: number,
  label: string,
  cols: number[],
  first: number,
  last: number,
  span: number,
): void {
  ws.getCell(row, 2).value = label;
  ws.getCell(row, 2).font = { bold: true };
  for (const col of cols) {
    const letter = ws.getColumn(col).letter;
    const c = ws.getCell(row, col);
    c.value = { formula: `SUM(${letter}${first}:${letter}${last})` };
    c.font = { bold: true };
    c.numFmt = col === span ? '0.0%' : '#,##0.00';
    fill(c, TOTAL_FILL);
  }
  for (let c = 1; c <= span; c += 1) ws.getCell(row, c).border = box();
}

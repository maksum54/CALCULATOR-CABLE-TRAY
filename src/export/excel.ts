// Excel export - a live, formula-driven workbook rather than a dump of computed numbers.
//
// The sheet layout deliberately mirrors CABLETRAYCALCULATION_RMW_1.xlsx so the file is familiar
// to anyone who has used that workbook, and so the two can be compared cell for cell. Every
// result is written as a formula (INDEX/MATCH, SUMIF, MAX, ROUNDUP, IF), so an engineer can
// change an OD or a design parameter in Excel and watch the whole calculation follow.

import ExcelJS from 'exceljs';
import type { CableRun, SizingResult, SupportResult, TrayParams, WeightResult } from '../core/types';
import type { DeratingResult } from '../core/types';
import { findEntry, isVerified } from '../core/catalog';
import { STANDARD_WIDTHS_MM } from '../core/trayStandards';
import type { ProjectInfo } from '../store/useAppStore';

export interface ExcelInput {
  project: ProjectInfo;
  params: TrayParams;
  schedule: CableRun[];
  sizing: SizingResult;
  weight: WeightResult;
  support: SupportResult;
  derating: DeratingResult;
}

const HEADER_FILL = 'FF1F3864';
const INPUT_FILL = 'FFFFF2CC';
const RESULT_FILL = 'FFDDEBF7';
const TOTAL_FILL = 'FFE2EFDA';
const WARN_FILL = 'FFFCE4D6';

type Ws = ExcelJS.Worksheet;

/**
 * Ukuran piksel PNG dibaca langsung dari header IHDR-nya (8 byte signature, 4 byte panjang
 * chunk, 4 byte "IHDR", lalu width dan height masing-masing 4 byte big-endian). Dipakai
 * untuk menjaga proporsi logo tanpa perlu decoder gambar.
 */
function pngSize(dataUrl: string): { width: number; height: number } | undefined {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return undefined;
  try {
    const head = atob(dataUrl.slice(comma + 1, comma + 64));
    if (head.length < 24 || head.slice(12, 16) !== 'IHDR') return undefined;
    const be = (at: number) =>
      ((head.charCodeAt(at) << 24) | (head.charCodeAt(at + 1) << 16) | (head.charCodeAt(at + 2) << 8) | head.charCodeAt(at + 3)) >>> 0;
    const width = be(16);
    const height = be(20);
    return width > 0 && height > 0 ? { width, height } : undefined;
  } catch {
    return undefined;
  }
}

/** Tempel logo perusahaan di sebelah kanan kolom terpakai, jadi tidak menutupi data. */
function placeLogo(ws: Ws, imageId: number | undefined, size: { width: number; height: number } | undefined, span: number): void {
  if (imageId === undefined || !size) return;
  const scale = Math.min(150 / size.width, 56 / size.height);
  ws.addImage(imageId, {
    tl: { col: span + 0.3, row: 0.2 },
    ext: { width: size.width * scale, height: size.height * scale },
  });
}


function titleRow(ws: Ws, row: number, text: string, span: number, sub?: string): void {
  ws.mergeCells(row, 1, row, span);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { bold: true, size: 13, color: { argb: 'FF1F3864' } };
  if (sub) {
    ws.mergeCells(row + 1, 1, row + 1, span);
    const s = ws.getCell(row + 1, 1);
    s.value = sub;
    s.font = { italic: true, size: 9, color: { argb: 'FF7F7F7F' } };
  }
}

function headerRow(ws: Ws, row: number, headers: string[]): void {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = box();
  });
  ws.getRow(row).height = 28;
}

const box = (): Partial<ExcelJS.Borders> => {
  const thin = { style: 'thin' as const, color: { argb: 'FFB4C6E7' } };
  return { top: thin, left: thin, bottom: thin, right: thin };
};

function fill(cell: ExcelJS.Cell, argb: string): void {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

/** "Parameter / value / unit / remark" row used across the calculation sheet. */
function paramRow(
  ws: Ws,
  row: number,
  no: number | string,
  label: string,
  value: number | string | { formula: string },
  unit: string,
  remark: string,
  opts: { input?: boolean; result?: boolean; numFmt?: string } = {},
): void {
  ws.getCell(row, 1).value = no;
  ws.getCell(row, 2).value = label;
  const v = ws.getCell(row, 3);
  v.value = value as ExcelJS.CellValue;
  v.numFmt = opts.numFmt ?? '#,##0.00';
  if (opts.input) fill(v, INPUT_FILL);
  if (opts.result) {
    fill(v, RESULT_FILL);
    v.font = { bold: true };
  }
  ws.getCell(row, 4).value = unit;
  ws.getCell(row, 5).value = remark;
  ws.getCell(row, 5).font = { size: 9, color: { argb: 'FF7F7F7F' } };
  for (let c = 1; c <= 5; c += 1) ws.getCell(row, c).border = box();
}

export async function buildWorkbook(input: ExcelInput): Promise<Blob> {
  const { project, params, schedule, sizing, weight, support, derating } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Cable Tray Calculator';
  wb.created = new Date();

  // Kop: nama perusahaan mendahului nama proyek di setiap sheet, logo ditempel sekali dan
  // dipakai ulang di sheet-sheet utama.
  const docRef = [project.company, project.name].filter(Boolean).join(' - ');
  const logoSize = project.logo ? pngSize(project.logo) : undefined;
  const logoId =
    project.logo && logoSize
      ? wb.addImage({ base64: project.logo.slice(project.logo.indexOf(',') + 1), extension: 'png' })
      : undefined;

  // Cable types actually used, in schedule order.
  const usedCodes = [...new Set(schedule.map((r) => r.typeCode))];
  const entries = usedCodes.map((c) => findEntry(c)).filter((e): e is NonNullable<typeof e> => Boolean(e));

  // ---------------------------------------------------------------- CABLE DATA (OD)
  const data = wb.addWorksheet('CABLE DATA (OD)', { views: [{ state: 'frozen', ySplit: 4 }] });
  data.columns = [
    { width: 6 }, { width: 26 }, { width: 26 }, { width: 12 },
    { width: 22 }, { width: 52 }, { width: 14 }, { width: 14 }, { width: 16 },
  ];
  titleRow(data, 1, 'CABLE OUTER DIAMETER TABLE - INPUT DATA', 9,
    `${docRef} - ${project.drawingNo} ${project.revision}. Yellow cells are input. KMI rows are transcribed from the manufacturer datasheet; rows marked UNVERIFIED come from project data and must be checked against the catalogue actually used.`);
  placeLogo(data, logoId, logoSize, 9);
  headerRow(data, 4, ['NO', 'CABLE TYPE', 'INSULATION', 'OD (mm)', 'OUTER AREA (mm2)', 'REMARKS', 'CODE', 'WEIGHT (kg/km)', 'DATA SOURCE']);

  const dataFirst = 5;
  entries.forEach((e, i) => {
    const r = dataFirst + i;
    data.getCell(r, 1).value = i + 1;
    data.getCell(r, 2).value = `${e.cores}C x ${e.sizeMm2} mm2`;
    data.getCell(r, 3).value = e.construction;
    const od = data.getCell(r, 4);
    od.value = e.odMm;
    od.numFmt = '0.0';
    fill(od, INPUT_FILL);
    const area = data.getCell(r, 5);
    area.value = { formula: `PI()/4*D${r}^2` };
    area.numFmt = '#,##0.00';
    data.getCell(r, 6).value = e.note ?? `${e.family} ${e.voltage} ${e.standard}`;
    data.getCell(r, 7).value = e.id;
    const w = data.getCell(r, 8);
    w.value = e.weightKgKm;
    w.numFmt = '#,##0';
    const src = data.getCell(r, 9);
    src.value = isVerified(e) ? `KMI ${e.datasheet}` : 'UNVERIFIED - project data';
    if (!isVerified(e)) fill(src, WARN_FILL);
    for (let c = 1; c <= 9; c += 1) data.getCell(r, c).border = box();
  });
  const dataLast = dataFirst + entries.length - 1;
  wb.definedNames.add(`'CABLE DATA (OD)'!$G$${dataFirst}:$G$${dataLast}`, 'CABLECODE');

  // ---------------------------------------------------------------- CABLE SCHEDULE
  const sch = wb.addWorksheet('CABLE SCHEDULE', { views: [{ state: 'frozen', ySplit: 4 }] });
  sch.columns = [
    { width: 6 }, { width: 22 }, { width: 30 }, { width: 12 }, { width: 10 },
    { width: 38 }, { width: 12 }, { width: 10 }, { width: 11 }, { width: 15 }, { width: 16 },
  ];
  titleRow(sch, 1, 'COMBINED CABLE SCHEDULE', 11,
    `${docRef} - ${project.drawingNo} ${project.revision}. OD is looked up from the CABLE DATA (OD) sheet, so editing an OD there updates every row here.`);
  placeLogo(sch, logoId, logoSize, 11);
  headerRow(sch, 4, ['NO', 'PANEL', 'CIRCUIT No.', 'CATEGORY', 'LOAD (kW)', 'CABLE DESCRIPTION', 'TYPE', 'QTY OF RUNS', 'OD (mm)', 'TOTAL WIDTH (mm)', 'TOTAL AREA (mm2)']);

  const schFirst = 5;
  schedule.forEach((run, i) => {
    const r = schFirst + i;
    sch.getCell(r, 1).value = i + 1;
    sch.getCell(r, 2).value = run.panel;
    sch.getCell(r, 3).value = run.circuit;
    sch.getCell(r, 4).value = run.category;
    sch.getCell(r, 5).value = run.loadKw ?? '-';
    sch.getCell(r, 6).value = run.description;
    sch.getCell(r, 7).value = run.typeCode;
    sch.getCell(r, 8).value = run.runs;
    sch.getCell(r, 9).value = {
      formula: `INDEX('CABLE DATA (OD)'!$D$${dataFirst}:$D$${dataLast},MATCH(G${r},CABLECODE,0))`,
    };
    sch.getCell(r, 9).numFmt = '0.0';
    sch.getCell(r, 10).value = { formula: `H${r}*I${r}` };
    sch.getCell(r, 10).numFmt = '#,##0.0';
    sch.getCell(r, 11).value = { formula: `H${r}*PI()/4*I${r}^2` };
    sch.getCell(r, 11).numFmt = '#,##0.0';
    for (let c = 1; c <= 11; c += 1) sch.getCell(r, c).border = box();
  });
  const schLast = schFirst + schedule.length - 1;
  const totalRow = schLast + 1;
  sch.getCell(totalRow, 1).value = 'TOTAL';
  sch.getCell(totalRow, 1).font = { bold: true };
  for (const col of [8, 10, 11]) {
    const c = sch.getCell(totalRow, col);
    c.value = { formula: `SUM(${sch.getColumn(col).letter}${schFirst}:${sch.getColumn(col).letter}${schLast})` };
    c.font = { bold: true };
    c.numFmt = '#,##0.0';
    fill(c, TOTAL_FILL);
  }
  for (let c = 1; c <= 11; c += 1) sch.getCell(totalRow, c).border = box();

  // ---------------------------------------------------------------- SUMMARY BY TYPE
  const sum = wb.addWorksheet('SUMMARY BY TYPE');
  sum.columns = [{ width: 6 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 16 }];
  titleRow(sum, 1, 'CABLE QUANTITY SUMMARY', 8, `${docRef} - ${project.drawingNo} ${project.revision}`);
  placeLogo(sum, logoId, logoSize, 8);
  headerRow(sum, 3, ['NO', 'CABLE TYPE', 'OD (mm)', 'QTY OF RUNS', 'TOTAL WIDTH (mm)', 'TOTAL AREA (mm2)', 'WEIGHT (kg/m)', '% OF TOTAL WIDTH']);

  const sumFirst = 4;
  entries.forEach((e, i) => {
    const r = sumFirst + i;
    sum.getCell(r, 1).value = i + 1;
    sum.getCell(r, 2).value = e.id;
    sum.getCell(r, 3).value = { formula: `INDEX('CABLE DATA (OD)'!$D$${dataFirst}:$D$${dataLast},MATCH(B${r},CABLECODE,0))` };
    sum.getCell(r, 4).value = { formula: `SUMIF('CABLE SCHEDULE'!$G$${schFirst}:$G$${schLast},B${r},'CABLE SCHEDULE'!$H$${schFirst}:$H$${schLast})` };
    sum.getCell(r, 5).value = { formula: `D${r}*C${r}` };
    sum.getCell(r, 6).value = { formula: `D${r}*PI()/4*C${r}^2` };
    sum.getCell(r, 7).value = { formula: `D${r}*INDEX('CABLE DATA (OD)'!$H$${dataFirst}:$H$${dataLast},MATCH(B${r},CABLECODE,0))/1000` };
    sum.getCell(r, 8).value = { formula: `IF($E$${sumFirst + entries.length}=0,0,E${r}/$E$${sumFirst + entries.length})` };
    sum.getCell(r, 8).numFmt = '0.0%';
    for (const c of [3, 5, 6, 7]) sum.getCell(r, c).numFmt = '#,##0.00';
    for (let c = 1; c <= 8; c += 1) sum.getCell(r, c).border = box();
  });
  const sumTotal = sumFirst + entries.length;
  sum.getCell(sumTotal, 1).value = 'TOTAL';
  sum.getCell(sumTotal, 1).font = { bold: true };
  for (const col of [4, 5, 6, 7]) {
    const letter = sum.getColumn(col).letter;
    const c = sum.getCell(sumTotal, col);
    c.value = { formula: `SUM(${letter}${sumFirst}:${letter}${sumFirst + entries.length - 1})` };
    c.font = { bold: true };
    c.numFmt = '#,##0.00';
    fill(c, TOTAL_FILL);
  }
  for (let c = 1; c <= 8; c += 1) sum.getCell(sumTotal, c).border = box();

  // Per-panel block
  const panels = [...new Set(schedule.map((r) => r.panel))];
  const panelHead = sumTotal + 2;
  sum.getCell(panelHead, 1).value = 'SUMMARY BY PANEL';
  sum.getCell(panelHead, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  headerRow(sum, panelHead + 1, ['PANEL', 'QTY OF RUNS', 'TOTAL WIDTH (mm)', 'TOTAL AREA (mm2)', '', '', '', '']);
  panels.forEach((p, i) => {
    const r = panelHead + 2 + i;
    sum.getCell(r, 1).value = p;
    sum.getCell(r, 2).value = { formula: `SUMIF('CABLE SCHEDULE'!$B$${schFirst}:$B$${schLast},A${r},'CABLE SCHEDULE'!$H$${schFirst}:$H$${schLast})` };
    sum.getCell(r, 3).value = { formula: `SUMIF('CABLE SCHEDULE'!$B$${schFirst}:$B$${schLast},A${r},'CABLE SCHEDULE'!$J$${schFirst}:$J$${schLast})` };
    sum.getCell(r, 4).value = { formula: `SUMIF('CABLE SCHEDULE'!$B$${schFirst}:$B$${schLast},A${r},'CABLE SCHEDULE'!$K$${schFirst}:$K$${schLast})` };
    for (const c of [3, 4]) sum.getCell(r, c).numFmt = '#,##0.00';
    for (let c = 1; c <= 4; c += 1) sum.getCell(r, c).border = box();
  });

  // ---------------------------------------------------------------- TRAY CALCULATION
  const calc = wb.addWorksheet('TRAY CALCULATION');
  calc.columns = [{ width: 6 }, { width: 42 }, { width: 16 }, { width: 12 }, { width: 62 }];
  titleRow(calc, 1, 'CABLE TRAY SIZING CALCULATION', 5, `${docRef} - ${project.drawingNo} ${project.revision} - ${project.date}`);
  placeLogo(calc, logoId, logoSize, 5);

  calc.getCell(4, 1).value = 'A. DESIGN PARAMETERS (yellow cells = input)';
  calc.getCell(4, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  headerRow(calc, 5, ['NO', 'PARAMETER', 'VALUE', 'UNIT', 'REMARKS']);
  paramRow(calc, 6, 1, 'Spare / future expansion factor', params.spareFactor, '-', 'Common practice 20 - 30 %', { input: true });
  paramRow(calc, 7, 2, 'Cable spacing factor', params.spacingFactor, '-', '1.00 = touching; 1.10 = 10 % of OD clearance', { input: true });
  paramRow(calc, 8, 3, 'Cable tray height', params.trayHeightMm, 'mm', 'Usable tray side height', { input: true, numFmt: '#,##0' });
  paramRow(calc, 9, 4, 'Maximum fill ratio', params.maxFillRatio, '-', 'Fill limit against tray cross-section area', { input: true });
  paramRow(calc, 10, 5, 'Number of cable layers', params.layers, 'layer', '>1 layer requires an ampacity correction', { input: true, numFmt: '#,##0' });
  paramRow(calc, 11, 6, 'Selected standard tray width', params.selectedTrayWidthMm, 'mm', 'Used to calculate the number of tray runs', { input: true, numFmt: '#,##0' });
  paramRow(calc, 12, 7, 'Fill standard applied', sizing.fillDetail.labelEn, '-', 'practice40 reproduces the reference workbook', {});
  paramRow(calc, 13, 8, 'Cable arrangement', params.arrangement, '-', 'flat touching / flat spaced 1 x d / trefoil', {});

  calc.getCell(15, 1).value = 'B. CABLE DATA SUMMARY (linked to the CABLE SCHEDULE sheet)';
  calc.getCell(15, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  headerRow(calc, 16, ['NO', 'DESCRIPTION', 'VALUE', 'UNIT', 'REMARKS']);
  paramRow(calc, 17, 1, 'Total number of cable runs', { formula: `'CABLE SCHEDULE'!H${totalRow}` }, 'runs', 'Includes incoming, earthing and FRC cables', { numFmt: '#,##0' });
  paramRow(calc, 18, 2, 'Sum of cable widths (sigma OD)', { formula: `'CABLE SCHEDULE'!J${totalRow}` }, 'mm', 'sigma (OD x qty of runs)', {});
  paramRow(calc, 19, 3, 'Sum of cable outer areas (sigma A)', { formula: `'CABLE SCHEDULE'!K${totalRow}` }, 'mm2', 'sigma (pi/4 x OD^2 x qty)', {});

  calc.getCell(21, 1).value = 'C. METHOD 1 - WIDTH FROM THE SUM OF CABLE DIAMETERS';
  calc.getCell(21, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  headerRow(calc, 22, ['NO', 'DESCRIPTION', 'VALUE', 'UNIT', 'FORMULA']);
  paramRow(calc, 23, 1, 'Installed cable width', { formula: 'C18*$C$7' }, 'mm', 'sigma OD x spacing factor', {});
  paramRow(calc, 24, 2, 'Width including spare', { formula: 'C23*(1+$C$6)' }, 'mm', 'x (1 + spare factor)', {});
  paramRow(calc, 25, 3, 'Required width per layer', { formula: 'C24/$C$10' }, 'mm', '/ number of layers', {});

  calc.getCell(27, 1).value = 'D. METHOD 2 - WIDTH FROM THE FILL RATIO (AREA)';
  calc.getCell(27, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  headerRow(calc, 28, ['NO', 'DESCRIPTION', 'VALUE', 'UNIT', 'FORMULA']);
  paramRow(calc, 29, 1, 'Cable area including spare', { formula: 'C19*(1+$C$6)' }, 'mm2', 'sigma A x (1 + spare factor)', {});
  paramRow(calc, 30, 2, 'Required tray cross-section area', { formula: 'C29/$C$9' }, 'mm2', '/ maximum fill ratio', {});
  paramRow(calc, 31, 3, 'Required width', { formula: 'C30/$C$8' }, 'mm', 'required area / tray height', {});

  calc.getCell(33, 1).value = 'E. RESULT - GOVERNING WIDTH & TRAY CONFIGURATION';
  calc.getCell(33, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  headerRow(calc, 34, ['NO', 'DESCRIPTION', 'VALUE', 'UNIT', 'REMARKS']);
  paramRow(calc, 35, 1, 'REQUIRED TRAY WIDTH (governing)', { formula: 'MAX(C25,C31)' }, 'mm', 'The greater of method 1 and method 2', { result: true });
  paramRow(calc, 36, 2, 'Selected standard tray width', { formula: '$C$11' }, 'mm', 'See parameter A-6', {});
  paramRow(calc, 37, 3, 'NUMBER OF CABLE TRAY RUNS REQUIRED', { formula: 'ROUNDUP(C35/$C$11,0)' }, 'runs', 'Required width / selected width, rounded up', { result: true, numFmt: '#,##0' });
  paramRow(calc, 38, 4, 'Total installed tray width', { formula: 'C37*$C$11' }, 'mm', 'Number of runs x tray width', {});
  paramRow(calc, 39, 5, 'Actual installed fill ratio', { formula: 'C19/(C38*$C$8*$C$10)' }, '-', 'Must be <= the maximum fill ratio', { numFmt: '0.00%' });
  paramRow(calc, 40, 6, 'CHECK', { formula: 'IF(C39<=$C$9,"OK","NOT OK - increase tray size")' }, '-', 'Automatic verification', { result: true, numFmt: '@' });

  calc.getCell(42, 1).value = 'F. WEIGHT, SUPPORT & DEFLECTION';
  calc.getCell(42, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  headerRow(calc, 43, ['NO', 'DESCRIPTION', 'VALUE', 'UNIT', 'REMARKS']);
  paramRow(calc, 44, 1, 'Cable weight', weight.cableKgPerM, 'kg/m', 'sigma (qty x kg/km) / 1000', {});
  paramRow(calc, 45, 2, 'Tray self-weight', weight.trayKgPerM, 'kg/m', 'Indicative - replace with the manufacturer value', {});
  paramRow(calc, 46, 3, 'Total load', { formula: 'C44+C45' }, 'kg/m', '', { result: true });
  paramRow(calc, 47, 4, 'Support span', params.supportSpanM, 'm', '', { input: true });
  paramRow(calc, 48, 5, 'Load per support point', { formula: 'C46*C47' }, 'kg', '', {});
  paramRow(calc, 49, 6, 'Deflection', support.deflectionMm, 'mm', 'Continuous span, w L^4 / (145 E I)', {});
  paramRow(calc, 50, 7, 'Allowable deflection', { formula: 'C47*1000/180' }, 'mm', 'NEMA VE 1 / VE 2, span / 180', {});
  paramRow(calc, 51, 8, 'CHECK', { formula: 'IF(C49<=C50,"OK","NOT OK - reduce the support span")' }, '-', '', { result: true, numFmt: '@' });
  paramRow(calc, 52, 9, 'NEMA VE 1 class', support.nemaClass.toUpperCase(), '-', `Working load ${support.nemaWorkingLoadKgPerM.toFixed(1)} kg/m`, { numFmt: '@' });
  paramRow(calc, 53, 10, 'Rod hanger size', support.rodSize, '-', `Capacity ${support.rodCapacityKg} kg, load ${support.loadPerHangerKg.toFixed(0)} kg`, { numFmt: '@' });

  calc.getCell(55, 1).value = 'G. DERATING (IEC 60364-5-52)';
  calc.getCell(55, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  headerRow(calc, 56, ['NO', 'DESCRIPTION', 'VALUE', 'UNIT', 'REMARKS']);
  paramRow(calc, 57, 1, 'Number of circuits', derating.circuits, '-', '', { numFmt: '#,##0' });
  paramRow(calc, 58, 2, 'Grouping correction factor', derating.groupingFactor, '-', 'Table B.52.17, perforated tray, horizontal', { numFmt: '0.000' });
  paramRow(calc, 59, 3, 'Temperature derating factor', derating.temperatureFactor, '-', `Table B.52.14 at ${params.ambientTempC} degC`, { numFmt: '0.000' });
  paramRow(calc, 60, 4, 'Combined correction factor', { formula: 'C58*C59' }, '-', '', { result: true, numFmt: '0.000' });

  // Alternative configurations
  const altHead = 62;
  calc.getCell(altHead, 1).value = 'H. ALTERNATIVE CONFIGURATIONS';
  calc.getCell(altHead, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  headerRow(calc, altHead + 1, ['TRAY WIDTH (mm)', 'RUNS @ 1 LAYER', 'RUNS @ 2 LAYERS', 'RUNS @ 3 LAYERS', 'REMARKS']);
  STANDARD_WIDTHS_MM.forEach((w, i) => {
    const r = altHead + 2 + i;
    calc.getCell(r, 1).value = w;
    for (let layer = 1; layer <= 3; layer += 1) {
      calc.getCell(r, layer + 1).value = { formula: `ROUNDUP($C$35/${w}/${layer},0)` };
    }
    calc.getCell(r, 5).value = w === params.selectedTrayWidthMm ? 'selected' : '';
    for (let c = 1; c <= 5; c += 1) calc.getCell(r, c).border = box();
  });

  // ---------------------------------------------------------------- BOQ
  const boq = wb.addWorksheet('BOQ');
  boq.columns = [{ width: 6 }, { width: 46 }, { width: 14 }, { width: 12 }, { width: 46 }];
  placeLogo(boq, logoId, logoSize, 5);
  titleRow(boq, 1, 'BILL OF QUANTITIES', 5, `${docRef}. Route length ${params.routeLengthM} m, ${sizing.trayRunsRequired} tray run(s) of ${params.selectedTrayWidthMm} x ${params.trayHeightMm} mm`);
  headerRow(boq, 3, ['NO', 'DESCRIPTION', 'QUANTITY', 'UNIT', 'REMARKS']);

  let br = 4;
  const boqRow = (label: string, qty: number | { formula: string }, unit: string, remark: string, fmt = '#,##0.00') => {
    boq.getCell(br, 1).value = br - 3;
    boq.getCell(br, 2).value = label;
    const q = boq.getCell(br, 3);
    q.value = qty as ExcelJS.CellValue;
    q.numFmt = fmt;
    boq.getCell(br, 4).value = unit;
    boq.getCell(br, 5).value = remark;
    boq.getCell(br, 5).font = { size: 9, color: { argb: 'FF7F7F7F' } };
    for (let c = 1; c <= 5; c += 1) boq.getCell(br, c).border = box();
    br += 1;
  };

  boqRow(`Cable tray ${params.trayType} ${params.selectedTrayWidthMm} x ${params.trayHeightMm} mm`, params.routeLengthM * sizing.trayRunsRequired, 'm', `${sizing.trayRunsRequired} run(s) x ${params.routeLengthM} m`);
  if (params.coverInstalled) boqRow(`Tray cover ${params.selectedTrayWidthMm} mm`, params.routeLengthM * sizing.trayRunsRequired, 'm', '');
  boqRow('Support / hanger point (trapeze)', support.supportsRequired, 'set', `Span ${params.supportSpanM} m`, '#,##0');
  boqRow(`Threaded rod ${support.rodSize}`, support.supportsRequired * 2, 'pc', '2 rods per support point', '#,##0');
  boqRow('Tray connector plate', Math.max(0, Math.ceil((params.routeLengthM * sizing.trayRunsRequired) / 3) - sizing.trayRunsRequired), 'set', 'One per 3 m tray length', '#,##0');
  boqRow('Total cable weight on the route', weight.cableKgPerM * params.routeLengthM, 'kg', '');
  boqRow('Total tray weight on the route', weight.trayKgPerM * params.routeLengthM, 'kg', '');

  br += 1;
  boq.getCell(br, 1).value = 'CABLE QUANTITIES BY TYPE';
  boq.getCell(br, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
  br += 1;
  headerRow(boq, br, ['NO', 'CABLE TYPE', 'QTY OF RUNS', 'UNIT', 'ESTIMATED LENGTH (m)']);
  br += 1;
  entries.forEach((e, i) => {
    const runs = schedule.filter((r) => r.typeCode === e.id).reduce((s, r) => s + r.runs, 0);
    boq.getCell(br, 1).value = i + 1;
    boq.getCell(br, 2).value = `${e.family} ${e.cores}C x ${e.sizeMm2} mm2 (${e.id})`;
    boq.getCell(br, 3).value = runs;
    boq.getCell(br, 4).value = 'run';
    boq.getCell(br, 5).value = runs * params.routeLengthM;
    boq.getCell(br, 5).numFmt = '#,##0';
    for (let c = 1; c <= 5; c += 1) boq.getCell(br, c).border = box();
    br += 1;
  });
  boq.getCell(br, 2).value = 'Cable lengths are the tray route length only - add drops, terminations and slack.';
  boq.getCell(br, 2).font = { italic: true, size: 9, color: { argb: 'FFC00000' } };

  // ---------------------------------------------------------------- NOTES
  const notes = wb.addWorksheet('NOTES & DATA SOURCE');
  notes.columns = [{ width: 6 }, { width: 130 }];
  titleRow(notes, 1, 'NOTES, ASSUMPTIONS & DATA PROVENANCE', 2, `${docRef} - ${project.drawingNo} ${project.revision}`);

  const noteList: string[] = [
    `Calculation standard applied: ${sizing.fillDetail.labelEn}. The practice40 rule reproduces CABLETRAYCALCULATION_RMW_1.xlsx exactly.`,
    'Cable outer diameters drive the whole calculation. Rows flagged UNVERIFIED on the CABLE DATA (OD) sheet come from project data, not from a manufacturer catalogue, and must be confirmed before the calculation is issued.',
    'KMI rows are transcribed from the PT KMI Wire and Cable Tbk datasheets: NYA 12104-01, NYY 14233-xx and NYFGbY 16233-xx, Rev. 2.0 / 2009.',
    'Weight and ampacity for the unverified project types are borrowed from the closest KMI size. For XLPE (N2XY) cables this is conservative, since XLPE runs at 90 degC against PVC 70 degC.',
    'Tray self-weight and the section property used for the deflection check are indicative estimates for hot-dip galvanised steel trays. Replace them with the tray manufacturer values for a formal submission.',
    'Deflection limit is span / 180 per NEMA VE 1 / VE 2. NEMA class load / span figures and threaded rod capacities are nominal published values - confirm against the product certificate.',
    'Grouping and ambient corrections follow IEC 60364-5-52 Tables B.52.17 and B.52.14. This is an installation-design check, not an IEC 60287 thermal analysis; the cross-section colour gradient is an indicative thermal ranking only.',
    'Minimum bending radii use typical IEC 60502-1 installation factors (12 x OD multicore, 15 x OD single core). Confirm against the cable manufacturer instruction and the project specification.',
    'Where cables are installed in more than one layer the ampacity must be re-checked and the cable sizes confirmed against PUIL 2011 / IEC 60364-5-52.',
    'FRC fire alarm cable should be routed in a dedicated tray or segregated by a divider from the power cables, per the fire protection requirements.',
    'Cable lengths in the BOQ are the tray route length only; drops, terminations and slack are not included.',
  ];
  noteList.forEach((n, i) => {
    const r = 3 + i;
    notes.getCell(r, 1).value = i + 1;
    notes.getCell(r, 2).value = n;
    notes.getCell(r, 2).alignment = { wrapText: true, vertical: 'top' };
    notes.getRow(r).height = 30;
    for (let c = 1; c <= 2; c += 1) notes.getCell(r, c).border = box();
  });

  const stampRow = 3 + noteList.length + 2;
  if (project.company) {
    notes.getCell(stampRow - 1, 1).value = 'COMPANY';
    notes.getCell(stampRow - 1, 2).value = project.company;
    notes.getCell(stampRow - 1, 1).font = { bold: true, color: { argb: 'FF1F3864' } };
    notes.getCell(stampRow - 1, 2).font = { bold: true };
  }
  notes.getCell(stampRow, 1).value = 'PREPARED BY';
  notes.getCell(stampRow, 2).value = project.preparedBy || '..............................';
  notes.getCell(stampRow + 1, 1).value = 'CHECKED BY';
  notes.getCell(stampRow + 1, 2).value = project.checkedBy || '..............................';
  notes.getCell(stampRow + 2, 1).value = 'DATE';
  notes.getCell(stampRow + 2, 2).value = project.date;
  for (let r = stampRow; r <= stampRow + 2; r += 1) {
    notes.getCell(r, 1).font = { bold: true };
    for (let c = 1; c <= 2; c += 1) notes.getCell(r, c).border = box();
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

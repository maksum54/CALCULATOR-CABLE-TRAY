// Shared cell styling for the two workbooks this app writes: the calculation export
// (export/excel.ts) and the blank schedule template (export/scheduleTemplate.ts). Both are
// meant to look like the same family of documents, so the palette and the row helpers live
// in one place rather than being copied.

import type ExcelJS from 'exceljs';

export const HEADER_FILL = 'FF1F3864';
export const INPUT_FILL = 'FFFFF2CC';
export const RESULT_FILL = 'FFDDEBF7';
export const TOTAL_FILL = 'FFE2EFDA';
export const WARN_FILL = 'FFFCE4D6';

export const NAVY = 'FF1F3864';

type Ws = ExcelJS.Worksheet;

export const box = (): Partial<ExcelJS.Borders> => {
  const thin = { style: 'thin' as const, color: { argb: 'FFB4C6E7' } };
  return { top: thin, left: thin, bottom: thin, right: thin };
};

export function fill(cell: ExcelJS.Cell, argb: string): void {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

export function titleRow(ws: Ws, row: number, text: string, span: number, sub?: string): void {
  ws.mergeCells(row, 1, row, span);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { bold: true, size: 13, color: { argb: NAVY } };
  if (sub) {
    ws.mergeCells(row + 1, 1, row + 1, span);
    const s = ws.getCell(row + 1, 1);
    s.value = sub;
    s.font = { italic: true, size: 9, color: { argb: 'FF7F7F7F' } };
  }
}

export function headerRow(ws: Ws, row: number, headers: string[]): void {
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

/** Heading that opens a lettered section ("A. PARAMETER ..."). */
export function sectionHeading(ws: Ws, row: number, text: string): void {
  ws.getCell(row, 1).value = text;
  ws.getCell(row, 1).font = { bold: true, color: { argb: NAVY } };
}

/** "Parameter / value / unit / remark" row used across the calculation sheets. */
export function paramRow(
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

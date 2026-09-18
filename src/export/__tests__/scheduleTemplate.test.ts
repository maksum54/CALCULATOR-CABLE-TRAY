// The template's whole promise is that a schedule typed into it imports again without the
// user having to think about sheet names or column order. These tests hold that promise by
// sending the generated workbook straight back through the real importer, in both languages,
// and by checking the cross-sheet formulas still point where they claim to.
//
// LibreOffice is not available here, so the workbook's formulas are not recalculated; what is
// checked is that they are the expressions core/traySizing.ts uses and that every reference
// resolves to a cell that exists.

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildScheduleTemplate } from '../scheduleTemplate';
import { importScheduleFromExcel } from '../../import/scheduleImport';
import { SAMPLE_SCHEDULE } from '../../data/sampleSchedule';
import { DEFAULT_PARAMS } from '../../core/defaults';
import { calculateSizing } from '../../core/traySizing';
import type { Lang } from '../../i18n';
import type { ProjectInfo } from '../../store/useAppStore';

const project: ProjectInfo = {
  company: 'PT Contoh Rekayasa',
  name: 'Finish Good Warehouse',
  drawingNo: 'ME-D-LV-6000',
  revision: 'R0',
  date: '2026-09-18',
  preparedBy: '',
  checkedBy: '',
  logo: '',
};

async function build(lang: Lang, schedule = SAMPLE_SCHEDULE): Promise<Blob> {
  return buildScheduleTemplate({ lang, project, params: DEFAULT_PARAMS, schedule });
}

/** The importer takes a File; in Node a Blob with a name is all it actually reads. */
const asFile = (blob: Blob, name = 'template.xlsx'): File =>
  ({ name, arrayBuffer: () => blob.arrayBuffer() }) as unknown as File;

async function reopen(blob: Blob): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await blob.arrayBuffer());
  return wb;
}

const formulaOf = (ws: ExcelJS.Worksheet, address: string): string => {
  const value = ws.getCell(address).value as { formula?: string } | null;
  return value?.formula ?? '';
};

describe('schedule template - shape', () => {
  it('writes the four sheets of the cable tray calculation workbook', async () => {
    const wb = await reopen(await build('id'));
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'CABLE DATA (OD)',
      'CABLE SCHEDULE',
      'SUMMARY BY TYPE',
      'TRAY CALCULATION',
    ]);
  });

  it('puts the schedule header on row 4 with TYPE and OD where the importer expects them', async () => {
    const wb = await reopen(await build('id'));
    const sch = wb.getWorksheet('CABLE SCHEDULE')!;
    expect(sch.getCell('A4').text).toBe('NO');
    expect(sch.getCell('G4').text).toBe('TIPE');
    expect(sch.getCell('H4').text).toBe('JML RUN');
    expect(sch.getCell('I4').text).toBe('OD (mm)');
  });

  it('offers only catalogue codes in the TYPE column, so no lookup can fail', async () => {
    const wb = await reopen(await build('id'));
    const data = wb.getWorksheet('CABLE DATA (OD)')!;
    const sch = wb.getWorksheet('CABLE SCHEDULE')!;

    const codes = new Set<string>();
    for (let r = 5; r <= data.rowCount; r += 1) {
      const code = data.getCell(r, 2).text.trim();
      if (code) codes.add(code);
    }
    expect(codes.size).toBeGreaterThan(0);

    for (let i = 0; i < SAMPLE_SCHEDULE.length; i += 1) {
      const cell = sch.getCell(5 + i, 7);
      expect(codes.has(cell.text.trim())).toBe(true);
      // Every row carries the dropdown, so a hand-typed code cannot drift from the table.
      expect(cell.dataValidation?.formulae).toEqual(['TIPE_KODE']);
    }
  });

  it('leaves blank input rows below the data for the user to fill in', async () => {
    const wb = await reopen(await build('id'));
    const sch = wb.getWorksheet('CABLE SCHEDULE')!;
    const firstBlank = 5 + SAMPLE_SCHEDULE.length;
    expect(sch.getCell(firstBlank, 2).text).toBe('');
    // ... and the blank row is already wired up: its OD column is the same lookup formula.
    expect(formulaOf(sch, `I${firstBlank}`)).toContain('INDEX(OD_LIST,MATCH($G');
    // The TOTAL row sits below the last blank row, not directly under the data.
    const totalRow = firstBlank + 60;
    expect(sch.getCell(totalRow, 1).text).toBe('TOTAL');
  });
});

describe('schedule template - formulas', () => {
  it('links the calculation sheet to the schedule TOTAL row', async () => {
    const wb = await reopen(await build('id'));
    const sch = wb.getWorksheet('CABLE SCHEDULE')!;
    const calc = wb.getWorksheet('TRAY CALCULATION')!;

    const totalRow = 5 + SAMPLE_SCHEDULE.length + 60;
    expect(sch.getCell(totalRow, 1).text).toBe('TOTAL');
    expect(formulaOf(calc, 'C15')).toBe(`'CABLE SCHEDULE'!H${totalRow}`);
    expect(formulaOf(calc, 'C16')).toBe(`'CABLE SCHEDULE'!J${totalRow}`);
    expect(formulaOf(calc, 'C17')).toBe(`'CABLE SCHEDULE'!K${totalRow}`);
  });

  it('states method 1, method 2 and the result exactly as the engine computes them', async () => {
    const wb = await reopen(await build('id'));
    const calc = wb.getWorksheet('TRAY CALCULATION')!;
    // C6 spare, C7 spacing, C8 height, C9 fill, C10 layers, C11 selected width.
    expect(formulaOf(calc, 'C21')).toBe('$C$16*$C$7*(1+$C$6)/$C$10');
    expect(formulaOf(calc, 'C25')).toBe('$C$17*(1+$C$6)/$C$9/$C$8/$C$10');
    expect(formulaOf(calc, 'C29')).toBe('MAX($C$21,$C$25)');
    expect(formulaOf(calc, 'C32')).toBe('MAX(1,ROUNDUP($C$29/$C$11,0))');
    expect(formulaOf(calc, 'C33')).toBe('$C$32*$C$11*$C$8*$C$10');
    expect(formulaOf(calc, 'C34')).toBe('IF($C$33=0,0,$C$17/$C$33)');
  });

  it('seeds the parameter cells from the design parameters in the app', async () => {
    const wb = await reopen(await build('id'));
    const calc = wb.getWorksheet('TRAY CALCULATION')!;
    expect(calc.getCell('C6').value).toBe(DEFAULT_PARAMS.spareFactor);
    expect(calc.getCell('C7').value).toBe(DEFAULT_PARAMS.spacingFactor);
    expect(calc.getCell('C8').value).toBe(DEFAULT_PARAMS.trayHeightMm);
    expect(calc.getCell('C9').value).toBe(DEFAULT_PARAMS.maxFillRatio);
    expect(calc.getCell('C10').value).toBe(DEFAULT_PARAMS.layers);
    expect(calc.getCell('C11').value).toBe(DEFAULT_PARAMS.selectedTrayWidthMm);
  });
});

describe.each(['id', 'en'] as const)('schedule template - round trip (%s)', (lang) => {
  it('imports back every row, with the same types and run counts', async () => {
    const { rows, runs, warnings, detected } = await importScheduleFromExcel(asFile(await build(lang)));

    expect(detected.sheet).toBe('CABLE SCHEDULE');
    expect(detected.headerRow).toBe(4);
    expect(detected.typeColumn.startsWith('G ')).toBe(true);
    expect(detected.odColumn.startsWith('I ')).toBe(true);

    expect(runs).toHaveLength(SAMPLE_SCHEDULE.length);
    expect(runs.map((r) => r.circuit)).toEqual(SAMPLE_SCHEDULE.map((r) => r.circuit));
    expect(runs.map((r) => r.panel)).toEqual(SAMPLE_SCHEDULE.map((r) => r.panel));
    expect(runs.map((r) => r.typeCode)).toEqual(SAMPLE_SCHEDULE.map((r) => r.typeCode));
    expect(runs.map((r) => r.runs)).toEqual(SAMPLE_SCHEDULE.map((r) => r.runs));

    // Nothing to review: the OD column is a formula with no cached value, so the diameter has
    // to come from the workbook's own OD table - which is exactly what makes this a template.
    expect(rows.every((r) => r.quality === 'exact')).toBe(true);
    expect(warnings).toEqual([]);
  });

  it('reproduces the sizing of the schedule it was built from', async () => {
    const { runs } = await importScheduleFromExcel(asFile(await build(lang)));
    const before = calculateSizing(SAMPLE_SCHEDULE, DEFAULT_PARAMS);
    const after = calculateSizing(runs, DEFAULT_PARAMS);

    expect(after.totalRuns).toBe(before.totalRuns);
    expect(after.sumOdMm).toBeCloseTo(before.sumOdMm, 9);
    expect(after.sumAreaMm2).toBeCloseTo(before.sumAreaMm2, 9);
    expect(after.governingWidthMm).toBeCloseTo(before.governingWidthMm, 9);
    expect(after.trayRunsRequired).toBe(before.trayRunsRequired);
  });
});

describe('schedule template - empty', () => {
  it('still ships the OD table, the blank rows and the calculation', async () => {
    const wb = await reopen(await build('id', []));
    const data = wb.getWorksheet('CABLE DATA (OD)')!;
    const sch = wb.getWorksheet('CABLE SCHEDULE')!;

    expect(data.getCell('B5').text).not.toBe('');
    expect(sch.getCell('B5').text).toBe('');
    expect(formulaOf(sch, 'I5')).toContain('INDEX(OD_LIST,MATCH($G5,TIPE_KODE,0))');
    expect(sch.getCell(5 + 60, 1).text).toBe('TOTAL');
  });

  it('is reported as having no cables rather than importing phantom rows', async () => {
    await expect(importScheduleFromExcel(asFile(await build('id', [])))).rejects.toThrow(
      /baris kabel valid/i,
    );
  });
});

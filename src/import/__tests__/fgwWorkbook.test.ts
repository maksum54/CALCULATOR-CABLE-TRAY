// Regresi terhadap CABLE-TRAY-CALCULATION_FGW.xlsx - workbook perhitungan cable tray untuk
// Finish Good Warehouse (MDB-FGW-L0, DB-FGW-L0-LP, CP-FGW-L0-MVAC, CP-FGW-L1-MVAC).
//
// User melaporkan file ini "tidak bisa masuk" ke aplikasi. Test ini memakai file aslinya dan
// mengunci bahwa parser memang membacanya: 166 baris, 187 run, empat panel, dan angka SOD yang
// sama dengan baris TOTAL di dalam workbook itu sendiri. Bentuknya berbeda dari fixture
// DB-UTILITY - TIPE di kolom G dan OD di kolom I, bukan I dan K - jadi keduanya bersama-sama
// menjaga agar deteksi kolom tidak mengeras pada satu tata letak.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importScheduleFromExcel } from '../scheduleImport';
import { calculateSizing } from '../../core/traySizing';
import { DEFAULT_PARAMS } from '../../core/defaults';

const fixture = join(__dirname, 'fixtures', 'cable-tray-calculation-FGW.xlsx');

function asFile(): File {
  const buf = readFileSync(fixture);
  return {
    name: 'CABLE-TRAY-CALCULATION_FGW.xlsx',
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  } as unknown as File;
}

describe('FGW cable tray calculation workbook', () => {
  it('reads the CABLE SCHEDULE sheet with TYPE in G and OD in I', async () => {
    const { detected } = await importScheduleFromExcel(asFile());
    expect(detected.sheet).toBe('CABLE SCHEDULE');
    expect(detected.headerRow).toBe(4);
    expect(detected.typeColumn.startsWith('G ')).toBe(true);
    expect(detected.odColumn.startsWith('I ')).toBe(true);
  });

  it('imports every circuit in the schedule', async () => {
    const { rows } = await importScheduleFromExcel(asFile());
    // Baris 5-170 di sheet CABLE SCHEDULE; baris TOTAL dan catatan kaki tidak ikut.
    expect(rows).toHaveLength(166);
    expect(rows.some((r) => /^total$/i.test(r.run.circuit))).toBe(false);
    expect(rows.reduce((s, r) => s + r.run.runs, 0)).toBe(187);
  });

  it('keeps all four panels apart', async () => {
    const { rows } = await importScheduleFromExcel(asFile());
    expect([...new Set(rows.map((r) => r.run.panel))]).toEqual([
      'MDB-FGW-L0',
      'DB-FGW-L0-LP',
      'CP-FGW-L0-MVAC',
      'CP-FGW-L1-MVAC',
    ]);
    expect(rows[0].run.circuit).toBe('INCOMING MDB');
    expect(rows[0].run.loadKw).toBeCloseTo(225.32, 6);
  });

  it('takes the incoming run count from the 4x(4x1C-240) notation', async () => {
    const { rows } = await importScheduleFromExcel(asFile());
    const incoming = rows.find((r) => r.run.circuit === 'INCOMING MDB')!;
    // 4 kabel x 4 inti single core = 16 run daya, sebagaimana tertulis di kolom JML RUN.
    expect(incoming.run.runs).toBe(16);
    expect(incoming.fileOdMm).toBe(24.5);
  });

  it('flags only the FRC and single-core types our catalogue does not carry', async () => {
    const { rows, warnings } = await importScheduleFromExcel(asFile());
    // 1C-240, 1C-120, 3C-2.5 (FRC) dan 4C-240 (FRC) tidak ada di katalog; diameternya diambil
    // dari entri terdekat dan ditandai supaya user memeriksanya, bukan diam-diam dipakai.
    expect(warnings).toEqual([{ code: 'odMismatch', count: 11 }]);
    expect(rows.filter((r) => r.quality === 'exact')).toHaveLength(155);
    expect(rows.every((r) => r.quality !== 'unresolved')).toBe(true);
  });

  it('reproduces the workbook\'s own total cable width', async () => {
    const { runs } = await importScheduleFromExcel(asFile());
    const sizing = calculateSizing(runs, DEFAULT_PARAMS);
    expect(sizing.totalRuns).toBe(187);
    // Baris TOTAL sheet CABLE SCHEDULE: SOD = 3379 mm. Selisihnya hanya dari 11 baris yang
    // tipenya tidak ada di katalog dan karena itu sudah ditandai untuk diperiksa.
    expect(sizing.sumOdMm).toBeCloseTo(3379.2, 1);
  });
});

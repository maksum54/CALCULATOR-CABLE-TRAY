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

  it('takes the cable family from the construction, not from the diameter', async () => {
    const { rows } = await importScheduleFromExcel(asFile());

    // "2x4C-120mm2 Cu/XLPE/PVC" adalah kabel XLPE tanpa armour = N2XY. Sebelum perbaikan
    // baris ini jatuh ke NYFGbY 4C x 120 (PVC BERARMOUR) semata karena OD 50 di file lebih
    // dekat ke 50.5 miliknya daripada ke 45.5 milik N2XY - salah KHA, salah tabel suhu.
    const feeder = rows.find((r) => r.run.circuit === 'FEEDER DB-FGW-L0-LP')!;
    expect(feeder.run.typeCode).toBe('N2XY-4C-120');

    // Baris incoming yang sama ukurannya dipisahkan oleh konstruksinya: inti daya XLPE ke
    // N2XY, penghantar pembumian "Cu/PVC" inti tunggal ke NYA.
    expect(rows.find((r) => r.run.circuit === 'INCOMING MDB')!.run.typeCode).toBe('N2XY-1C-240');
    expect(rows.find((r) => r.run.circuit === 'INCOMING MDB (E)')!.run.typeCode).toBe('NYA-1C-240');
    expect(rows.find((r) => r.run.circuit === 'FEEDER DB-FGW-L0-LP (E)')!.run.typeCode).toBe('NYA-1C-120');
  });

  it('flags every row whose diameter disagrees with the type the file describes', async () => {
    const { rows, warnings } = await importScheduleFromExcel(asFile());
    // Konstruksi menentukan tipenya; OD di file adalah nilai tipikal, jadi selisihnya
    // dilaporkan untuk diperiksa, bukan dipakai diam-diam untuk memindahkan family.
    expect(warnings).toEqual([{ code: 'odMismatch', count: 13 }]);
    expect(rows.filter((r) => r.quality === 'exact')).toHaveLength(153);
    expect(rows.every((r) => r.quality !== 'unresolved')).toBe(true);
  });

  it('stays within a fraction of a percent of the workbook\'s own total cable width', async () => {
    const { runs } = await importScheduleFromExcel(asFile());
    const sizing = calculateSizing(runs, DEFAULT_PARAMS);
    expect(sizing.totalRuns).toBe(187);
    // Baris TOTAL sheet CABLE SCHEDULE: SOD = 3379 mm. Selisihnya berasal dari 13 baris yang
    // OD katalognya berbeda dari nilai tipikal di file - semuanya sudah ditandai.
    expect(sizing.sumOdMm).toBeCloseTo(3360.4, 1);
    expect(Math.abs(sizing.sumOdMm - 3379) / 3379).toBeLessThan(0.01);
  });
});

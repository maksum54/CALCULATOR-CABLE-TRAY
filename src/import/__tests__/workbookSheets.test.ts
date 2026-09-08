// Regresi terhadap workbook perhitungan cable tray milik user (DB-UTILITY & DB-HVAC UTILITY).
//
// Laporan dari lapangan: file ini terbaca sebagai 11 baris omong kosong. Penyebabnya sheet
// dipilih dari jumlah baris terbanyak, sehingga TRAY CALCULATION (81 baris berisi parameter,
// catatan formula, dan tabel lebar tray) menang atas CABLE SCHEDULE (73 baris) - dan yang
// terimpor justru teks penjelasan formula.
//
// Bentuk file ini juga menguji dua hal lain sekaligus: kolom OD-nya adalah formula lintas-sheet
// ke tabel "CABLE DATA (OD)" sehingga terbaca kosong, dan ada 12 sirkuit FUTURE/SPARE dengan
// jumlah run 0 yang tidak boleh ikut menambah lebar tray.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importScheduleFromExcel } from '../scheduleImport';

const fixture = join(__dirname, 'fixtures', 'cable-tray-calculation-DB-UTILITY.xlsx');

function asFile(): File {
  const buf = readFileSync(fixture);
  return {
    name: 'cable-tray-calculation.xlsx',
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  } as unknown as File;
}

describe('cable tray calculation workbook', () => {
  it('reads the CABLE SCHEDULE sheet, not the longer TRAY CALCULATION sheet', async () => {
    const { detected } = await importScheduleFromExcel(asFile());
    expect(detected.sheet).toBe('CABLE SCHEDULE');
    expect(detected.headerRow).toBe(5);
    expect(detected.typeColumn).toContain('I');
    expect(detected.odColumn).toContain('K');
  });

  it('imports every real cable and skips the FUTURE / SPARE circuits', async () => {
    const { rows, warnings } = await importScheduleFromExcel(asFile());
    // Baris data 6-72 = 67 sirkuit, 12 di antaranya FUTURE/SPARE dengan jumlah run 0.
    expect(rows).toHaveLength(55);
    expect(warnings.find((w) => w.code === 'skippedSpare')?.count).toBe(12);
    // Baris TOTAL di kaki tabel tidak boleh ikut terbaca sebagai kabel.
    expect(rows.some((r) => /^total$/i.test(r.run.circuit))).toBe(false);
  });

  it('carries the panel names through from the schedule', async () => {
    const { rows } = await importScheduleFromExcel(asFile());
    expect(new Set(rows.map((r) => r.run.panel))).toEqual(
      new Set(['DB-UTILITY', 'DB-UTILITY (DEG)', 'DB-HVAC UTILITY', 'DB-HVAC UTILITY EMERGENCY']),
    );
    expect(rows[0].run.circuit).toBe('FA-INTERLOCK');
  });

  it('resolves the OD through the workbook\'s own OD table when the cell is a formula', async () => {
    const { rows } = await importScheduleFromExcel(asFile());
    // Kolom OD berisi INDEX/MATCH tanpa nilai ter-cache, jadi tanpa pembacaan tabel OD
    // baris ini tidak akan punya OD sama sekali.
    const incoming = rows.find((r) => r.run.circuit === 'INCOMING')!;
    expect(incoming.fileOdMm).toBe(34);
    // 4C-70 tidak ada di katalog kita; OD katalog terdekat dipakai dan selisihnya ditandai.
    expect(incoming.quality).toBe('odMismatch');
  });

  it('flags exactly the types absent from our catalogue', async () => {
    const { rows, warnings } = await importScheduleFromExcel(asFile());
    // 4C-70, 1C-35, 4C-6 dan 1C-6 tidak ada di katalog; sisanya cocok persis.
    expect(warnings.find((w) => w.code === 'odMismatch')?.count).toBe(4);
    expect(rows.filter((r) => r.quality === 'exact')).toHaveLength(51);
    expect(warnings.find((w) => w.code === 'unresolved')).toBeUndefined();
  });
});

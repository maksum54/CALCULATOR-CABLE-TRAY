// Perilaku saat kolom TYPE atau OD tidak terbaca.
//
// Laporan dari lapangan: sebuah file menghasilkan "11 baris: tipe maupun OD tidak dikenali,
// dipakai tipe default 3C-4". Artinya diameter yang dipakai menghitung adalah 13.5 mm - angka
// yang tidak ada hubungannya dengan data user. Aturannya sekarang: diameter SELALU berasal
// dari katalog, barisnya tetap masuk, dan yang tidak bisa dipastikan ditandai untuk dipilih
// sendiri oleh user - bukan diam-diam diberi tipe default.

import { describe, expect, it } from 'vitest';
import { importScheduleFromCsv, NEEDS_REVIEW } from '../scheduleImport';
import { findEntry } from '../../core/catalog';

const CSV = [
  'PANEL,CIRCUIT NO.,CATEGORY,CABLE DESCRIPTION,TYPE,OD (MM),QTY OF RUNS',
  'DB-TEST,CKT-1,OUTGOING,Feeder ke panel utility,NYY 4C x 25mm2,27.5,1',
  'DB-TEST,CKT-2,OUTGOING,Kabel outgoing pompa,,20.5,1',
  'DB-TEST,CKT-3,OUTGOING,Feeder besar,,150,1',
  'DB-TEST,CKT-4,OUTGOING,Sambungan lama,,,1',
  'DB-TEST,CKT-5,OUTGOING,Kabel tanpa keterangan,-,,2',
  'DB-TEST,CKT-6,OUTGOING,Feeder NYY 3C x 2.5,NYY 3C x 2.5mm2,22,1',
].join('\n');

const csvFile = (text = CSV): File =>
  ({ name: 'unknown.csv', text: async () => text }) as unknown as File;

describe('import when TYPE or OD cannot be read', () => {
  it('keeps every circuit - none is dropped silently', async () => {
    const { rows } = await importScheduleFromCsv(csvFile());
    expect(rows.map((r) => r.run.circuit)).toEqual([
      'CKT-1', 'CKT-2', 'CKT-3', 'CKT-4', 'CKT-5', 'CKT-6',
    ]);
  });

  it('prefers a column headed TYPE over one headed CABLE DESCRIPTION', async () => {
    const { detected, rows } = await importScheduleFromCsv(csvFile());
    expect(detected.typeColumn).toContain('E');
    // Terbaca dari kolom TYPE, bukan ditebak lewat OD.
    expect(rows[0].quality).toBe('exact');
    expect(rows[0].run.typeCode).toBe('NYY-4C-25');
  });

  it('does not swallow data rows into the header band', async () => {
    const { detected } = await importScheduleFromCsv(csvFile());
    expect(detected.headerRow).toBe(1);
    // Label kolom harus label, bukan isi baris data yang ikut tertarik.
    expect(detected.typeColumn).not.toMatch(/nyy/i);
    expect(detected.odColumn).not.toMatch(/27\.5/);
  });

  it('takes the diameter from the catalogue when the text carries no size', async () => {
    const { rows } = await importScheduleFromCsv(csvFile());
    const ckt2 = rows.find((r) => r.run.circuit === 'CKT-2')!;
    expect(ckt2.quality).toBe('odFallback');
    expect(findEntry(ckt2.run.typeCode)?.odMm).toBeCloseTo(20.5, 1);
  });

  it('flags rather than invents when nothing resolves', async () => {
    const { rows, warnings } = await importScheduleFromCsv(csvFile());
    const unresolved = rows.filter((r) => r.quality === 'unresolved');
    expect(unresolved.map((r) => r.run.circuit)).toEqual(['CKT-4', 'CKT-5']);
    for (const r of unresolved) expect(NEEDS_REVIEW).toContain(r.quality);
    expect(warnings.find((w) => w.code === 'unresolved')?.count).toBe(2);
  });

  it('reports an OD that disagrees with the catalogue instead of using it', async () => {
    const { rows } = await importScheduleFromCsv(csvFile());
    const ckt6 = rows.find((r) => r.run.circuit === 'CKT-6')!;
    expect(ckt6.quality).toBe('odMismatch');
    expect(ckt6.fileOdMm).toBe(22);
    expect(findEntry(ckt6.run.typeCode)?.odMm).toBe(14); // katalog yang menang
  });

  it('skips a tray-width configuration table instead of importing it as cables', async () => {
    // Bentuk persis tabel "ALTERNATIVE CONFIGURATIONS": lebar tray terbaca sebagai jumlah run.
    const widths = [100, 150, 200, 300, 400, 500, 600, 750, 800, 900, 1000];
    const table = [
      'PANEL,CIRCUIT NO.,CATEGORY,CABLE DESCRIPTION,TYPE,OD (MM),QTY OF RUNS',
      ...widths.map((w) => `IMPORT,${w},OUTGOING,${w},,${w},${w}`),
    ].join('\n');
    await expect(importScheduleFromCsv(csvFile(table))).rejects.toThrow(/tabel konfigurasi/i);
  });
});

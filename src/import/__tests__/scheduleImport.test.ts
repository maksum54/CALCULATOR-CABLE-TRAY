// Regresi importer terhadap panel schedule asli DB-RMW-L0-LP, template yang sama sekali
// berbeda dari cable schedule di workbook referensi: header dua baris ter-merge di R9-R10,
// TYPE di kolom D, OD di kolom AO (paling kanan), 30+ kolom fixture di antaranya, nama panel
// hanya ada di baris judul, dan ada baris TOTAL / catatan rumus di kaki tabel.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importScheduleFromExcel, matchCatalog, parseCoresAndSize } from '../scheduleImport';
import { findEntry } from '../../core/catalog';

const fixture = join(__dirname, 'fixtures', 'panel-schedule-DB-RMW-L0-LP.xlsx');
const asFile = (): File =>
  new File([new Uint8Array(readFileSync(fixture))], 'panel-schedule-DB-RMW-L0-LP.xlsx');

describe('parseCoresAndSize', () => {
  it('reads the core x size forms found in real schedules', () => {
    expect(parseCoresAndSize('NYY 3C x 2.5mm2')).toEqual({ cores: 3, size: 2.5 });
    expect(parseCoresAndSize('NYY 5C x 6mm2')).toEqual({ cores: 5, size: 6 });
    expect(parseCoresAndSize('1x4C-10mm2 Cu/XLPE/PVC')).toEqual({ cores: 4, size: 10 });
    expect(parseCoresAndSize('4C25')).toEqual({ cores: 4, size: 25 });
    expect(parseCoresAndSize('4 x 25 mm2')).toEqual({ cores: 4, size: 25 });
    expect(parseCoresAndSize('3 core 2,5')).toEqual({ cores: 3, size: 2.5 });
  });
});

describe('matchCatalog', () => {
  it('resolves "NYY 3C x 2.5mm2" to the KMI entry, not an OD guess', () => {
    const m = matchCatalog('NYY 3C x 2.5mm2', 14);
    expect(m).toEqual({ typeCode: 'NYY-3C-2.5', quality: 'exact' });
  });

  it('flags a row whose OD disagrees with the catalogue', () => {
    expect(matchCatalog('NYY 3C x 2.5mm2', 22).quality).toBe('odMismatch');
  });

  it('falls back to the nearest OD when the text carries no size', () => {
    expect(matchCatalog('kabel outgoing', 20.5).quality).toBe('odFallback');
  });
});

describe('importScheduleFromExcel - panel schedule template', () => {
  it('finds the TYPE and OD columns and reads every circuit', async () => {
    const { runs, warnings, detected } = await importScheduleFromExcel(asFile());

    expect(detected.headerRow).toBe(9);
    expect(detected.typeColumn.startsWith('D ')).toBe(true);
    expect(detected.odColumn.startsWith('AO ')).toBe(true);
    expect(detected.panel).toBe('DB-RMW-L0-LP');

    // R12..R92 = 81 circuits; the TOTAL / SUB TOTAL / formula-note rows are dropped.
    expect(runs.length).toBe(81);
    expect(runs.every((r) => r.panel === 'DB-RMW-L0-LP')).toBe(true);
    expect(warnings).toEqual([]);
  });

  it('maps all four cable types to verified catalogue entries', async () => {
    const { runs } = await importScheduleFromExcel(asFile());
    const tally = new Map<string, number>();
    for (const r of runs) tally.set(r.typeCode, (tally.get(r.typeCode) ?? 0) + 1);

    expect(Object.fromEntries(tally)).toEqual({
      'NYY-3C-2.5': 33,
      'NYY-3C-4': 37,
      'NYY-5C-4': 9,
      'NYY-5C-6': 2,
    });

    // Sum of OD reproduces the file's own OD column: 33*14 + 37*16.1 + 9*18.7 + 2*20.5.
    const sumOd = runs.reduce((s, r) => s + (findEntry(r.typeCode)?.odMm ?? 0) * r.runs, 0);
    expect(sumOd).toBeCloseTo(1267.0, 4);
  });

  it('reads the circuit name and converts the WATT demand columns to kW', async () => {
    const { runs } = await importScheduleFromExcel(asFile());
    expect(runs[0].circuit).toBe('LIGHTING (E)/1');
    // Single-phase circuit: only the R column carries the 1350 W demand load.
    expect(runs[0].loadKw).toBeCloseTo(1.35, 6);
    // Three-phase circuit (RECEPTACLE (E)/74,75,76): the schedule repeats 7333.3 W on R, S
    // and T, so the circuit load is their sum. The fixture-count columns whose captions also
    // read "... 22000 WATT" must stay out of that sum.
    expect(runs[55].circuit).toBe('RECEPTACLE (E)/74,75,76');
    expect(runs[55].loadKw).toBeCloseTo(21.9999, 4);
  });
});

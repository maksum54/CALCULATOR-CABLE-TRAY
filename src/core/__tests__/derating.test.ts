// Regresi untuk laporan: feeder 340 kW dengan 4 run NYY 4C x 120 terbaca 293 % (merah), padahal
// arusnya terbagi ke empat kabel. Penyebabnya arus TOTAL sirkuit dibandingkan dengan KHA SATU
// kabel. Yang benar: tiap run memikul arus total dibagi jumlah run.

import { describe, expect, it } from 'vitest';
import { calculateDerating, designCurrent, groupingFactor, temperatureFactor, thermalIndexOf } from '../derating';
import { DEFAULT_PARAMS } from '../defaults';
import { arrangeCables, DEFAULT_ARRANGE_OPTIONS } from '../arranger';
import { findEntry } from '../catalog';
import type { CableRun } from '../types';

const feeder: CableRun = {
  id: 'F1',
  panel: 'DB-TEST',
  circuit: 'FEEDER 340 kW',
  category: 'INCOMING',
  loadKw: 340,
  description: '4x(4C x 120mm2)',
  typeCode: 'NYY-4C-120',
  runs: 4,
};

const place = (runs: CableRun[]) =>
  arrangeCables(runs, {
    ...DEFAULT_ARRANGE_OPTIONS,
    trayWidthMm: 600,
    trayHeightMm: 100,
    trayRuns: 1,
    maxLayers: 3,
    arrangement: 'flatTouching',
  }).flatMap((t) => t.cables);

describe('design current', () => {
  it('uses the configured system voltage and power factor', () => {
    // 340 kW three-phase at 380 V, cos phi 0.85.
    expect(designCurrent(340, 4, 380, 0.85)).toBeCloseTo(340_000 / (Math.sqrt(3) * 380 * 0.85), 6);
    // The figure an engineer gets by hand at cos phi 0.8 - the 645 A in the report.
    expect(designCurrent(340, 4, 380, 0.8)).toBeCloseTo(645.7, 1);
  });

  it('takes single-phase circuits at the phase voltage', () => {
    expect(designCurrent(10, 3, 380, 0.85)).toBeCloseTo(10_000 / ((380 / Math.sqrt(3)) * 0.85), 6);
  });
});

describe('parallel runs share the load', () => {
  const runs = [feeder];
  const result = calculateDerating(runs, place(runs), DEFAULT_PARAMS, 1);
  const entry = findEntry('NYY-4C-120')!;

  it('divides the circuit current between the runs', () => {
    const total = designCurrent(340, 4, DEFAULT_PARAMS.systemVoltageV, DEFAULT_PARAMS.powerFactor);
    for (const c of result.perCable) {
      expect(c.designCurrentA).toBeCloseTo(total, 6);
      expect(c.currentPerRunA).toBeCloseTo(total / 4, 6);
      expect(c.runs).toBe(4);
    }
  });

  it('compares one run against one cable ampacity, not the whole circuit', () => {
    const gf = groupingFactor(4, 1, false);
    const tf = temperatureFactor(DEFAULT_PARAMS.ambientTempC, false);
    const derated = entry.ampAir! * gf * tf;
    const perRun = designCurrent(340, 4, DEFAULT_PARAMS.systemVoltageV, DEFAULT_PARAMS.powerFactor) / 4;
    expect(result.perCable[0].deratedAmpacity).toBeCloseTo(derated, 6);
    expect(result.perCable[0].utilisation).toBeCloseTo(perRun / derated, 6);
  });

  it('does not flag a correctly sized four-run feeder as overloaded', () => {
    // Sebelum perbaikan angkanya 293 %; sekarang harus jauh di bawah 100 %.
    expect(result.worstUtilisation).toBeLessThan(1);
    for (const c of result.perCable) expect(c.utilisation).toBeLessThan(1);
  });

  it('still flags a single-run circuit that genuinely exceeds its ampacity', () => {
    const single: CableRun[] = [{ ...feeder, id: 'F2', runs: 1 }];
    const r = calculateDerating(single, place(single), DEFAULT_PARAMS, 1);
    expect(r.worstUtilisation).toBeGreaterThan(1);
  });
});

// Laporan kedua: seluruh kolom THERMAL HEAT MAP merah penuh padahal tidak ada satu kabel pun
// yang melewati KHA terkoreksi - kabel 5C-10 (71 A) dengan beban 34 A tampil hampir merah
// penuh di sebelah angka utilisasinya sendiri yang hijau 76 %.
//
// Penyebabnya index termal mengalikan utilisasi dengan (1 + 0.2 x enclosure) lalu di-clamp ke
// 1. Legend di panel yang sama berskala 0 / 50 / 100 %, jadi batangnya dibaca sebagai persen
// terhadap batas - padahal SEMUA yang di atas ~83 % menghasilkan batang yang sama persis.
// Kabel patuh 89 % dan kabel berbahaya 200 % jadi tidak bisa dibedakan, justru perbedaan yang
// menjadi alasan kolom itu ada.

describe('thermal index vs the utilisation next to it', () => {
  const enclosed = 1;
  const edge = 0;

  it('keeps full scale for a cable that really is at or above its limit', () => {
    expect(thermalIndexOf(1, edge, true)).toBe(1);
    expect(thermalIndexOf(1.5, edge, true)).toBe(1);
    expect(thermalIndexOf(2, enclosed, true)).toBe(1);
  });

  it('never lets a compliant cable reach full scale, however buried it is', () => {
    for (const util of [0.5, 0.74, 0.83, 0.886, 0.95, 0.99]) {
      expect(thermalIndexOf(util, enclosed, true)).toBeLessThan(1);
    }
  });

  it('separates a compliant 89 % from an overloaded 200 %', () => {
    // Keduanya dulu bernilai 1.00 - batang yang sama, warna yang sama.
    expect(thermalIndexOf(0.886, enclosed, true)).toBeLessThan(thermalIndexOf(2, enclosed, true));
  });

  it('tracks the utilisation it sits beside instead of overstating it', () => {
    // 74 % dulu menggambar batang 89 %. Sekarang selisihnya tinggal nudge enclosure.
    expect(thermalIndexOf(0.739, enclosed, true)).toBeCloseTo(0.739 + 0.15 * (1 - 0.739), 6);
    expect(thermalIndexOf(0.739, edge, true)).toBeCloseTo(0.739, 6);
  });

  it('lets enclosure push up, never down, and never past the next band', () => {
    for (const util of [0.2, 0.5, 0.9]) {
      expect(thermalIndexOf(util, enclosed, true)).toBeGreaterThan(thermalIndexOf(util, edge, true));
      expect(thermalIndexOf(util, edge, true)).toBeCloseTo(util, 6);
    }
    // Monotonic in loading: a hotter cable can never rank below a cooler one.
    expect(thermalIndexOf(0.6, enclosed, true)).toBeLessThan(thermalIndexOf(0.9, edge, true));
  });

  it('falls back to a muted position-only reading with no load figure', () => {
    expect(thermalIndexOf(0, enclosed, false)).toBeCloseTo(0.35, 6);
    expect(thermalIndexOf(0, edge, false)).toBe(0);
  });
});

describe('the single temperature factor on the panel', () => {
  const mixed: CableRun[] = [
    // NYY = PVC (0.94 at 35 degC), the project 5C-10 = XLPE (0.96). Resolved in this order, so
    // the old "keep the last one" behaviour reported the XLPE 0.96 for the whole schedule.
    { ...feeder, id: 'P1', runs: 1, typeCode: 'NYY-4C-120', loadKw: 50 },
    { ...feeder, id: 'X1', runs: 1, typeCode: '5C-10', loadKw: 10, circuit: 'XLPE' },
  ];

  it('reports the more severe of the insulations present, not whichever came last', () => {
    const r = calculateDerating(mixed, place(mixed), DEFAULT_PARAMS, 1);
    const pvc = temperatureFactor(DEFAULT_PARAMS.ambientTempC, false);
    const xlpe = temperatureFactor(DEFAULT_PARAMS.ambientTempC, true);
    expect(pvc).toBeLessThan(xlpe);
    expect(r.temperatureFactor).toBeCloseTo(pvc, 6);
    expect(r.combinedFactor).toBeCloseTo(r.groupingFactor * pvc, 6);
  });

  it('says so, so the one number on screen is not read as applying to every cable', () => {
    const r = calculateDerating(mixed, place(mixed), DEFAULT_PARAMS, 1);
    expect(r.messages.some((m) => /mixes PVC and XLPE/i.test(m))).toBe(true);
  });

  it('stays silent when every cable shares one insulation', () => {
    const only: CableRun[] = [{ ...feeder, id: 'S1', runs: 1, loadKw: 50 }];
    const r = calculateDerating(only, place(only), DEFAULT_PARAMS, 1);
    expect(r.messages.some((m) => /mixes PVC and XLPE/i.test(m))).toBe(false);
    expect(r.temperatureFactor).toBeCloseTo(temperatureFactor(DEFAULT_PARAMS.ambientTempC, false), 6);
  });
});

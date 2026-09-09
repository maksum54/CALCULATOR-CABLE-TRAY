// Regresi untuk laporan: feeder 340 kW dengan 4 run NYY 4C x 120 terbaca 293 % (merah), padahal
// arusnya terbagi ke empat kabel. Penyebabnya arus TOTAL sirkuit dibandingkan dengan KHA SATU
// kabel. Yang benar: tiap run memikul arus total dibagi jumlah run.

import { describe, expect, it } from 'vitest';
import { calculateDerating, designCurrent, groupingFactor, temperatureFactor } from '../derating';
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

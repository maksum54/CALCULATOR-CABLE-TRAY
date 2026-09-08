// Regression test against CABLETRAYCALCULATION_RMW_1.xlsx. The expected values were computed
// straight from that workbook's cells; if this test drifts, the app and the workbook disagree.

import { describe, expect, it } from 'vitest';
import { calculateSizing, alternativeConfigurations } from '../traySizing';
import { arrangeCables, DEFAULT_ARRANGE_OPTIONS } from '../arranger';
import { calculateSupport, calculateWeight } from '../support';
import { DEFAULT_PARAMS } from '../defaults';
import { SAMPLE_SCHEDULE } from '../../data/sampleSchedule';

describe('tray sizing matches the reference workbook', () => {
  const result = calculateSizing(SAMPLE_SCHEDULE, DEFAULT_PARAMS);

  it('totals the schedule the same way', () => {
    expect(result.totalRuns).toBe(126);
    expect(result.sumOdMm).toBeCloseTo(1982.5, 3);
    expect(result.sumAreaMm2).toBeCloseTo(29453.4129, 3);
  });

  it('reproduces both sizing methods', () => {
    expect(result.method1.perLayerMm).toBeCloseTo(944.9917, 3);
    expect(result.method2.requiredWidthMm).toBeCloseTo(957.2359, 3);
    expect(result.governingWidthMm).toBeCloseTo(957.2359, 3);
    expect(result.governingMethod).toBe('method2');
  });

  it('reproduces the tray configuration and fill check', () => {
    expect(result.trayRunsRequired).toBe(2);
    expect(result.totalInstalledWidthMm).toBe(1200);
    expect(result.actualFillRatio).toBeCloseTo(0.081815, 6);
    expect(result.fillCheckPass).toBe(true);
  });

  it('reproduces the alternative configuration table', () => {
    const rows = alternativeConfigurations(result.governingWidthMm);
    expect(rows.find((r) => r.widthMm === 600)?.runsByLayer).toEqual([2, 1, 1]);
    expect(rows.find((r) => r.widthMm === 300)?.runsByLayer).toEqual([4, 2, 2]);
  });
});

describe('arrangement geometry', () => {
  const opts = {
    ...DEFAULT_ARRANGE_OPTIONS,
    trayWidthMm: 600,
    trayHeightMm: 100,
    trayRuns: 2,
    maxLayers: 3,
    arrangement: 'flatTouching' as const,
  };

  it('keeps every cable inside the tray envelope', () => {
    const trays = arrangeCables(SAMPLE_SCHEDULE, opts);
    for (const tray of trays) {
      for (const c of tray.cables) {
        expect(c.x - c.r).toBeGreaterThanOrEqual(0);
        expect(c.x + c.r).toBeLessThanOrEqual(600);
        expect(c.y - c.r).toBeGreaterThanOrEqual(-1e-9);
        expect(c.y + c.r).toBeLessThanOrEqual(100 + 1e-9);
      }
    }
  });

  it('spaces cables by one diameter in flatSpaced mode', () => {
    const flat = arrangeCables(SAMPLE_SCHEDULE, { ...opts, arrangement: 'flatTouching', autoArrange: false });
    const spaced = arrangeCables(SAMPLE_SCHEDULE, { ...opts, arrangement: 'flatSpaced', autoArrange: false });
    expect(spaced[0].cables.length).toBeLessThan(flat[0].cables.length);
  });

  it('builds trefoil groups of three', () => {
    const trefoil = arrangeCables(SAMPLE_SCHEDULE, { ...opts, arrangement: 'trefoil' });
    const groups = new Map<number, number>();
    for (const tray of trefoil) {
      for (const c of tray.cables) {
        if (c.group === undefined) continue;
        const key = tray.trayIndex * 1000 + c.group;
        groups.set(key, (groups.get(key) ?? 0) + 1);
      }
    }
    for (const count of groups.values()) expect(count).toBe(3);
  });
});

describe('weight and support', () => {
  it('produces a load and a deflection verdict', () => {
    const weight = calculateWeight(SAMPLE_SCHEDULE, DEFAULT_PARAMS, 2);
    expect(weight.cableKgPerM).toBeGreaterThan(0);
    const support = calculateSupport(weight, DEFAULT_PARAMS, 2);
    expect(support.allowableDeflectionMm).toBeCloseTo(1500 / 180, 6);
    expect(typeof support.deflectionPass).toBe('boolean');
  });
});

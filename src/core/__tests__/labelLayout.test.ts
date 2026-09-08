import { describe, expect, it } from 'vitest';
import { layoutLabelAnchors } from '../labelLayout';

const opts = { pitchMm: 6, minX: 0, maxX: 600 };

describe('layoutLabelAnchors', () => {
  it('separates tags of cables stacked at the same x', () => {
    // Dua lapis kabel pada x yang sama - kasus yang dulu membuat tag tercetak bertindihan.
    const out = layoutLabelAnchors([100, 100, 100], opts);
    expect(out[1] - out[0]).toBeCloseTo(6, 6);
    expect(out[2] - out[1]).toBeCloseTo(6, 6);
  });

  it('leaves tags that are already far apart where they are', () => {
    expect(layoutLabelAnchors([50, 200, 400], opts)).toEqual([50, 200, 400]);
  });

  it('keeps every anchor inside the drawing and in ascending order', () => {
    const xs = Array.from({ length: 90 }, (_, i) => 300 + (i % 3)); // semua berdesakan di tengah
    const out = layoutLabelAnchors(xs, opts);
    const sorted = [...out].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(5.999);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...out)).toBeLessThanOrEqual(600);
  });

  it('preserves the left-to-right order of the cables', () => {
    const xs = [10, 12, 11, 400];
    const out = layoutLabelAnchors(xs, opts);
    expect(out[0]).toBeLessThan(out[2]); // x 10 tetap di kiri x 11
    expect(out[2]).toBeLessThan(out[1]); // x 11 tetap di kiri x 12
    expect(out[3]).toBe(400);
  });

  it('packs evenly when the tags cannot all fit at full pitch', () => {
    const xs = Array.from({ length: 11 }, () => 50);
    const out = layoutLabelAnchors(xs, { pitchMm: 6, minX: 0, maxX: 20 });
    expect(Math.min(...out)).toBeCloseTo(0, 6);
    expect(Math.max(...out)).toBeCloseTo(20, 6);
  });
});

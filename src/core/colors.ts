// Shared colour language for the 2D section, the 3D scene, the legend and the exports, so a
// cable type is the same colour everywhere it appears.

/** Distinguishable, print-safe hues assigned to cable types in first-seen order. */
const PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#d946ef',
  '#0ea5e9', '#dc2626', '#059669', '#ca8a04', '#7c3aed', '#be185d',
];

/**
 * Colours must be stable for a given cable type across renders, sessions and exports, so they
 * are derived from a hash of the type code rather than from the order types happen to appear in.
 */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const assigned = new Map<string, string>();

/**
 * Seed the map from the project catalogue in catalogue order, so the dozen types actually used
 * on a drawing get the first, most widely separated palette hues instead of whatever the hash
 * happens to land on. Anything outside the catalogue still falls back to the hash below.
 */
export function seedColors(typeCodes: string[]): void {
  for (const code of typeCodes) {
    if (assigned.has(code)) continue;
    assigned.set(code, PALETTE[assigned.size % PALETTE.length]);
  }
}

export function typeColor(typeCode: string): string {
  const existing = assigned.get(typeCode);
  if (existing) return existing;

  // Spread collisions: take the hashed slot, then the next free one.
  const start = hash(typeCode) % PALETTE.length;
  const taken = new Set(assigned.values());
  let color = PALETTE[start];
  for (let i = 0; i < PALETTE.length && taken.has(color); i += 1) {
    color = PALETTE[(start + i + 1) % PALETTE.length];
  }
  assigned.set(typeCode, color);
  return color;
}

/** Stable ordering of colours for a given set of type codes (used by legends). */
export function assignColors(typeCodes: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const code of typeCodes) map.set(code, typeColor(code));
  return map;
}

const HEAT_STOPS: [number, [number, number, number]][] = [
  [0.0, [37, 99, 235]],    // cool blue
  [0.25, [6, 182, 212]],   // cyan
  [0.5, [250, 204, 21]],   // yellow
  [0.75, [249, 115, 22]],  // orange
  [1.0, [220, 38, 38]],    // hot red
];

/** Blue -> cyan -> yellow -> orange -> red for the indicative thermal ranking. */
export function heatColor(t: number): string {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < HEAT_STOPS.length; i += 1) {
    const [p0, c0] = HEAT_STOPS[i - 1];
    const [p1, c1] = HEAT_STOPS[i];
    if (x <= p1) {
      const k = (x - p0) / (p1 - p0);
      const rgb = c0.map((c, j) => Math.round(c + (c1[j] - c) * k));
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }
  return 'rgb(220, 38, 38)';
}

/** Darken a hex colour by `amount` (0..1) - used for cable outlines and 3D shading. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

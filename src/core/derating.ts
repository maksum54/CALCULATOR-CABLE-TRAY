// Ampacity derating and the cross-section thermal indicator.
//
// SCOPE - read before using the heat map in a submission:
// This module applies the grouping factors of IEC 60364-5-52 Table B.52.17 and the ambient
// temperature correction of Table B.52.14 to the catalogue ampacity at 30 degC. That is the
// standard installation-design check, and it is what the numbers on screen are.
//
// It is NOT a full IEC 60287 thermal analysis. IEC 60287 needs soil/air thermal resistivity,
// the real load factor of every circuit and the actual conductor temperature - none of which
// exist in a panel schedule. The colour gradient on the cross-section is therefore an
// INDICATIVE thermal ranking: it combines each cable's derated loading with how enclosed it
// is by its neighbours, so the cables in the middle of a stack read hot. It shows where to
// look, not what the conductor temperature is.

import type { CableRun, DeratedCable, DeratingResult, PlacedCable, TrayParams } from './types';
import { ampacityOf, findEntry } from './catalog';
import { resolveRuns } from './traySizing';

/** IEC 60364-5-52 Table B.52.17 - perforated tray, horizontal, cables touching. */
const GROUPING_TOUCHING: Record<number, Record<number, number>> = {
  1: { 1: 1.0, 2: 0.88, 3: 0.82, 4: 0.79, 6: 0.76, 9: 0.73 },
  2: { 1: 1.0, 2: 0.87, 3: 0.8, 4: 0.77, 6: 0.73, 9: 0.68 },
  3: { 1: 1.0, 2: 0.86, 3: 0.79, 4: 0.76, 6: 0.71, 9: 0.66 },
  6: { 1: 1.0, 2: 0.84, 3: 0.77, 4: 0.73, 6: 0.68, 9: 0.64 },
};

/** Same table, cables spaced by at least one diameter. */
const GROUPING_SPACED: Record<number, Record<number, number>> = {
  1: { 1: 1.0, 2: 1.0, 3: 0.98, 4: 0.95, 6: 0.91, 9: 0.89 },
  2: { 1: 1.0, 2: 0.99, 3: 0.96, 4: 0.92, 6: 0.87, 9: 0.84 },
  3: { 1: 1.0, 2: 0.98, 3: 0.95, 4: 0.91, 6: 0.85, 9: 0.82 },
  6: { 1: 1.0, 2: 0.97, 3: 0.94, 4: 0.9, 6: 0.84, 9: 0.81 },
};

/** IEC 60364-5-52 Table B.52.14 - ambient air correction, 70 degC PVC and 90 degC XLPE. */
const TEMP_PVC: [number, number][] = [
  [10, 1.22], [15, 1.17], [20, 1.12], [25, 1.06], [30, 1.0],
  [35, 0.94], [40, 0.87], [45, 0.79], [50, 0.71], [55, 0.61], [60, 0.5],
];
const TEMP_XLPE: [number, number][] = [
  [10, 1.15], [15, 1.12], [20, 1.08], [25, 1.04], [30, 1.0], [35, 0.96],
  [40, 0.91], [45, 0.87], [50, 0.82], [55, 0.76], [60, 0.71], [65, 0.65],
  [70, 0.58], [75, 0.5], [80, 0.41],
];

function interpolate(table: [number, number][], t: number): number {
  if (t <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < table.length; i += 1) {
    const [t0, f0] = table[i - 1];
    const [t1, f1] = table[i];
    if (t <= t1) return f0 + ((f1 - f0) * (t - t0)) / (t1 - t0);
  }
  return last[1];
}

function nearestKey(table: Record<number, number>, n: number): number {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  let chosen = keys[0];
  for (const k of keys) if (k <= n) chosen = k;
  return table[chosen];
}

export function temperatureFactor(ambientC: number, isXlpe: boolean): number {
  return interpolate(isXlpe ? TEMP_XLPE : TEMP_PVC, ambientC);
}

export function groupingFactor(circuits: number, layers: number, spaced: boolean): number {
  const table = spaced ? GROUPING_SPACED : GROUPING_TOUCHING;
  const layerKeys = [1, 2, 3, 6];
  let layerKey = layerKeys[0];
  for (const k of layerKeys) if (k <= layers) layerKey = k;
  return nearestKey(table[layerKey], Math.max(1, circuits));
}

/** Design current from the connected load; cores >= 4 is treated as a three-phase circuit. */
export function designCurrent(loadKw: number | undefined, cores: number, powerFactor = 0.85): number {
  if (!loadKw || loadKw <= 0) return 0;
  return cores >= 4
    ? (loadKw * 1000) / (Math.sqrt(3) * 400 * powerFactor)
    : (loadKw * 1000) / (230 * powerFactor);
}

/**
 * How enclosed a cable is by its neighbours, 0 (open edge) .. 1 (buried in the middle of a
 * stack). Neighbours are weighted by centre distance relative to the two cable radii.
 */
function enclosure(cable: PlacedCable, all: PlacedCable[]): number {
  let score = 0;
  for (const other of all) {
    if (other === cable) continue;
    const dx = other.x - cable.x;
    const dy = other.y - cable.y;
    const dist = Math.hypot(dx, dy);
    const contact = cable.r + other.r;
    if (dist > contact * 3) continue;
    score += contact / Math.max(dist, contact);
  }
  // Six touching neighbours is the densest practical packing.
  return Math.min(score / 6, 1);
}

export function calculateDerating(
  runs: CableRun[],
  placed: PlacedCable[],
  params: TrayParams,
  layersUsed: number,
): DeratingResult {
  const resolved = resolveRuns(runs);
  const circuits = resolved.reduce((s, { run }) => s + run.runs, 0);
  const spaced = params.arrangement === 'flatSpaced';
  const gf = groupingFactor(circuits, Math.max(1, layersUsed), spaced);

  const messages: string[] = [
    'Grouping factor per IEC 60364-5-52 Table B.52.17 (perforated tray, horizontal); temperature correction per Table B.52.14.',
    'The colour gradient is an indicative thermal ranking, not an IEC 60287 conductor temperature.',
  ];
  if (params.coverInstalled) {
    messages.push('A fitted tray cover restricts convection; IEC 60364-5-52 requires the covered-tray column - reduce the grouping factor accordingly.');
  }
  if (layersUsed > 1) {
    messages.push(`${layersUsed} cable layers in use - ampacity must be re-checked and the cable sizes confirmed against PUIL 2011 / IEC 60364-5-52.`);
  }

  const byPosition = new Map<string, PlacedCable[]>();
  for (const c of placed) {
    const key = `${c.runId}#${c.runIndex}`;
    byPosition.set(key, [...(byPosition.get(key) ?? []), c]);
  }

  let avgTemp = 1;
  const perCable: DeratedCable[] = [];
  for (const { run, entry } of resolved) {
    const isXlpe = /XLPE/i.test(entry.construction);
    const tf = temperatureFactor(params.ambientTempC, isXlpe);
    avgTemp = tf;
    const base = ampacityOf(entry) ?? 0;
    const derated = base * gf * tf;
    const design = designCurrent(run.loadKw, entry.cores);
    for (let i = 1; i <= run.runs; i += 1) {
      const spot = byPosition.get(`${run.id}#${i}`)?.[0];
      const enc = spot ? enclosure(spot, placed) : 0.5;
      const util = derated > 0 ? design / derated : 0;
      perCable.push({
        runId: run.id,
        label: run.runs > 1 ? `${run.circuit} (${i}/${run.runs})` : run.circuit,
        typeCode: run.typeCode,
        baseAmpacity: base,
        deratedAmpacity: derated,
        designCurrentA: design,
        utilisation: util,
        thermalIndex: Math.min(1, 0.55 * enc + 0.45 * Math.min(util, 1)),
      });
    }
  }

  const worst = perCable.reduce((m, c) => Math.max(m, c.utilisation), 0);
  if (worst > 1) {
    messages.push('At least one circuit exceeds its derated ampacity - increase the cable size, space the cables out, or split the tray.');
  }

  return {
    groupingFactor: gf,
    temperatureFactor: avgTemp,
    combinedFactor: gf * avgTemp,
    circuits,
    layersUsed,
    perCable,
    worstUtilisation: worst,
    messages,
  };
}

/** Catalogue ampacity of a cable type, used by the schedule table. */
export const catalogAmpacity = (typeCode: string): number | undefined => {
  const e = findEntry(typeCode);
  return e ? ampacityOf(e) : undefined;
};

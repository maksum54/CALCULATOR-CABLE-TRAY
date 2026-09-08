// Cable arrangement engine - turns the schedule into cable centre coordinates inside the tray.
//
// This is the single source of geometry for the whole app: the 2D cross-section, the 3D scene,
// the DXF export and the thermal heat map all consume the PlacedCable list produced here, so
// the drawing can never disagree with the numbers.
//
// Origin is the inside bottom-left corner of the tray, x to the right, y upwards, all in mm.
//
//   flatTouching  cables laid side by side, centres one OD apart
//   flatSpaced    one cable diameter of clear space between cables (spacing 1 x d)
//   trefoil       single-core cables bundled in threes: two touching on the bottom, one on top,
//                 unit width 2 x OD, unit height OD x (1 + sqrt(3)/2)
//
// Smart auto-arranger: the largest and heaviest cables are pushed out to both tray edges where
// they are easiest to lay and clamp, sizes decreasing towards the centre; fire-resistant (FRC)
// cables are segregated behind a divider at the right-hand end.

import type { ArrangementMode, ArrangementResult, CableRun, PlacedCable } from './types';
import { resolveRuns, type ResolvedRun } from './traySizing';

export interface ArrangeOptions {
  trayWidthMm: number;
  trayHeightMm: number;
  /** Number of parallel tray runs the schedule is spread over. */
  trayRuns: number;
  maxLayers: number;
  arrangement: ArrangementMode;
  /** Push the biggest cables to the edges instead of keeping schedule order. */
  autoArrange: boolean;
  /** Keep FRC cables behind a divider. */
  segregateFrc: boolean;
  /** Clear space kept at each tray side (mm). */
  edgeClearanceMm: number;
  /** Vertical clear space between layers (mm). */
  layerGapMm: number;
  /** Clear space reserved for the FRC divider (mm). */
  dividerGapMm: number;
}

export const DEFAULT_ARRANGE_OPTIONS: Omit<
  ArrangeOptions,
  'trayWidthMm' | 'trayHeightMm' | 'trayRuns' | 'maxLayers' | 'arrangement'
> = {
  autoArrange: true,
  segregateFrc: true,
  edgeClearanceMm: 10,
  layerGapMm: 2,
  dividerGapMm: 25,
};

interface CableSeed {
  runId: string;
  runIndex: number;
  label: string;
  typeCode: string;
  odMm: number;
  weightKgKm: number;
  cores: number;
  isFrc: boolean;
}

/** One placeable object: a lone cable, or three single-core cables locked in trefoil. */
interface Unit {
  widthMm: number;
  heightMm: number;
  members: { seed: CableSeed; dx: number; dy: number }[];
  /** Sort key - the biggest / heaviest unit wins the tray edge. */
  weight: number;
  maxOd: number;
  isFrc: boolean;
}

const isFrcEntry = (family: string, construction: string): boolean =>
  family === 'FRC' || /FRC|MGT/i.test(construction);

function seedsFrom(resolved: ResolvedRun[]): CableSeed[] {
  const seeds: CableSeed[] = [];
  for (const { run, entry } of resolved) {
    for (let i = 1; i <= run.runs; i += 1) {
      seeds.push({
        runId: run.id,
        runIndex: i,
        label: run.runs > 1 ? `${run.circuit} (${i}/${run.runs})` : run.circuit,
        typeCode: run.typeCode,
        odMm: entry.odMm,
        weightKgKm: entry.weightKgKm,
        cores: entry.cores,
        isFrc: isFrcEntry(entry.family, entry.construction),
      });
    }
  }
  return seeds;
}

function singleUnit(seed: CableSeed, pitchFactor: number): Unit {
  const r = seed.odMm / 2;
  return {
    widthMm: seed.odMm * pitchFactor,
    heightMm: seed.odMm,
    members: [{ seed, dx: (seed.odMm * pitchFactor) / 2, dy: r }],
    weight: seed.weightKgKm,
    maxOd: seed.odMm,
    isFrc: seed.isFrc,
  };
}

function trefoilUnit(three: CableSeed[]): Unit {
  const d = three[0].odMm;
  const r = d / 2;
  return {
    widthMm: 2 * d,
    heightMm: d * (1 + Math.sqrt(3) / 2),
    members: [
      { seed: three[0], dx: r, dy: r },
      { seed: three[1], dx: 3 * r, dy: r },
      { seed: three[2], dx: 2 * r, dy: r + r * Math.sqrt(3) },
    ],
    weight: three.reduce((s, c) => s + c.weightKgKm, 0),
    maxOd: d,
    isFrc: three.some((c) => c.isFrc),
  };
}

function buildUnits(seeds: CableSeed[], arrangement: ArrangementMode): Unit[] {
  const pitch = arrangement === 'flatSpaced' ? 2 : 1;
  if (arrangement !== 'trefoil') return seeds.map((s) => singleUnit(s, pitch));

  // Trefoil only applies to single-core cables, grouped three at a time by cable type.
  const units: Unit[] = [];
  const byType = new Map<string, CableSeed[]>();
  for (const seed of seeds) {
    if (seed.cores !== 1) {
      units.push(singleUnit(seed, 1));
      continue;
    }
    const list = byType.get(seed.typeCode) ?? [];
    list.push(seed);
    byType.set(seed.typeCode, list);
  }
  for (const list of byType.values()) {
    let i = 0;
    for (; i + 3 <= list.length; i += 3) units.push(trefoilUnit(list.slice(i, i + 3)));
    for (; i < list.length; i += 1) units.push(singleUnit(list[i], 1)); // remainder laid flat
  }
  return units;
}

/** Largest at both edges, decreasing towards the centre. */
function edgeWeighted(units: Unit[]): Unit[] {
  const sorted = [...units].sort((a, b) => b.maxOd - a.maxOd || b.weight - a.weight);
  const left: Unit[] = [];
  const right: Unit[] = [];
  sorted.forEach((u, i) => (i % 2 === 0 ? left : right).push(u));
  return [...left, ...right.reverse()];
}

export interface TrayArrangement extends ArrangementResult {
  trayIndex: number;
  /** x position of the FRC divider, when one is placed (mm). */
  dividerXMm?: number;
}

/**
 * Fill `trayRuns` trays in sequence: layer by layer inside a tray, then on to the next tray.
 * Returns one arrangement per tray run.
 */
export function arrangeCables(runs: CableRun[], opts: ArrangeOptions): TrayArrangement[] {
  const seeds = seedsFrom(resolveRuns(runs));
  let units = buildUnits(seeds, opts.arrangement);

  let frcUnits: Unit[] = [];
  if (opts.segregateFrc) {
    frcUnits = units.filter((u) => u.isFrc);
    units = units.filter((u) => !u.isFrc);
  }
  if (opts.autoArrange) units = edgeWeighted(units);

  const usableWidth = Math.max(opts.trayWidthMm - 2 * opts.edgeClearanceMm, 0);
  const trays: TrayArrangement[] = [];
  const queue = [...units, ...frcUnits];
  const frcStartIndex = units.length;

  let placedCount = 0;
  for (let trayIndex = 0; trayIndex < opts.trayRuns; trayIndex += 1) {
    const cables: PlacedCable[] = [];
    let cursorX = opts.edgeClearanceMm;
    let baseY = 0;
    let layer = 1;
    let layerHeight = 0;
    let occupiedWidth = 0;
    let dividerXMm: number | undefined;
    let groupCounter = 0;

    while (placedCount < queue.length) {
      const unit = queue[placedCount];

      // Insert the divider gap the first time an FRC unit is placed in this tray.
      if (opts.segregateFrc && placedCount === frcStartIndex && frcUnits.length > 0) {
        dividerXMm = cursorX + opts.dividerGapMm / 2;
        cursorX += opts.dividerGapMm;
      }

      if (cursorX + unit.widthMm > opts.edgeClearanceMm + usableWidth) {
        // Cable does not fit on this layer - start a new one if the tray still has height.
        const nextBaseY = baseY + layerHeight + opts.layerGapMm;
        if (layer >= opts.maxLayers || nextBaseY + unit.heightMm > opts.trayHeightMm) break;
        layer += 1;
        baseY = nextBaseY;
        layerHeight = 0;
        cursorX = opts.edgeClearanceMm;
      }

      const groupId = unit.members.length > 1 ? ++groupCounter : undefined;
      for (const m of unit.members) {
        cables.push({
          runId: m.seed.runId,
          runIndex: m.seed.runIndex,
          label: m.seed.label,
          typeCode: m.seed.typeCode,
          x: cursorX + m.dx,
          y: baseY + m.dy,
          r: m.seed.odMm / 2,
          layer,
          group: groupId,
        });
      }
      cursorX += unit.widthMm;
      occupiedWidth = Math.max(occupiedWidth, cursorX);
      layerHeight = Math.max(layerHeight, unit.heightMm);
      placedCount += 1;
    }

    trays.push({
      trayIndex,
      cables,
      occupiedWidthMm: occupiedWidth,
      occupiedHeightMm: baseY + layerHeight,
      layersUsed: cables.length > 0 ? layer : 0,
      overflow: 0,
      dividerXMm,
    });

    if (placedCount >= queue.length) break;
  }

  const leftover = queue.slice(placedCount).reduce((s, u) => s + u.members.length, 0);
  if (trays.length > 0) trays[trays.length - 1].overflow = leftover;
  return trays;
}

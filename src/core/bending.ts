// Minimum bending radius at tray fittings, and a first-pass cable pulling estimate.
//
// Bending radius factors follow the usual IEC 60502-1 / manufacturer installation guidance:
//   multicore, non-armoured, up to 0.6/1 kV .......... 12 x OD
//   multicore, armoured .............................. 12 x OD
//   single core, non-armoured ........................ 15 x OD
//   single core, armoured ............................ 15 x OD
// They are exposed as editable inputs - always confirm against the cable manufacturer's own
// installation instruction and the project specification, which sometimes demand more.
//
// The pulling estimate is the standard straight-plus-bend model:
//   straight run   T = mu x w x L
//   through a bend T = T_in x e^(mu x theta)
//   sidewall load  SWBP = T_out / R
// It is a planning aid for choosing fitting radii, not a substitute for a pulling calculation
// with the real route profile.

import type { BendingResult, BendingType, CableRun, FittingCheck } from './types';
import { resolveRuns } from './traySizing';
import { FITTING_RADII_MM } from './trayStandards';

export interface BendingOptions {
  multicoreFactor: number;
  singleCoreFactor: number;
  /** Coefficient of friction, cable against tray. */
  friction: number;
  /** Bend angle used for the pulling estimate (degrees). */
  bendAngleDeg: number;
  /** Allowable sidewall bearing pressure (N/m of bend radius). */
  allowableSidewallNPerM: number;
}

export const DEFAULT_BENDING_OPTIONS: BendingOptions = {
  multicoreFactor: 12,
  singleCoreFactor: 15,
  friction: 0.5,
  bendAngleDeg: 90,
  allowableSidewallNPerM: 7500,
};

export function calculateBending(
  runs: CableRun[],
  routeLengthM: number,
  cableKgPerM: number,
  opts: BendingOptions = DEFAULT_BENDING_OPTIONS,
): BendingResult {
  const resolved = resolveRuns(runs);

  const seen = new Map<string, BendingType>();
  for (const { run, entry } of resolved) {
    if (seen.has(run.typeCode)) continue;
    const factor = entry.cores === 1 ? opts.singleCoreFactor : opts.multicoreFactor;
    seen.set(run.typeCode, {
      typeCode: run.typeCode,
      label: `${entry.family} ${entry.cores}C x ${entry.sizeMm2} mm2`,
      odMm: entry.odMm,
      factor,
      minRadiusMm: factor * entry.odMm,
    });
  }
  const perType = [...seen.values()].sort((a, b) => b.minRadiusMm - a.minRadiusMm);
  const governing = perType[0]?.minRadiusMm ?? 0;

  const fittings: FittingCheck[] = ['Elbow 90 deg', 'Tee', 'Reducer', 'Riser'].map((fitting) => {
    const standard = FITTING_RADII_MM.find((r) => r >= governing) ?? FITTING_RADII_MM[FITTING_RADII_MM.length - 1];
    return {
      fitting,
      standardRadiusMm: standard,
      requiredRadiusMm: governing,
      pass: standard >= governing,
    };
  });

  const g = 9.81;
  const wNPerM = cableKgPerM * g;
  const straight = opts.friction * wNPerM * routeLengthM;
  const theta = (opts.bendAngleDeg * Math.PI) / 180;
  const bend = straight * Math.exp(opts.friction * theta);
  const radiusM = Math.max(governing, 1) / 1000;
  const swbp = bend / radiusM;

  const messages: string[] = [
    'Bending radius factors are typical IEC 60502-1 installation values - confirm against the cable manufacturer instruction and the project specification.',
    'The pulling tension is a straight-plus-bend estimate; run a full pulling calculation once the route profile is fixed.',
  ];
  if (!fittings.every((f) => f.pass)) {
    messages.push('No standard fitting radius satisfies the largest cable - specify a custom radius fitting or a pull box at the change of direction.');
  }

  return {
    perType,
    governingRadiusMm: governing,
    fittings,
    pullingTension: {
      straightTensionN: straight,
      bendTensionN: bend,
      sidewallPressureNPerM: swbp,
      allowableSidewallNPerM: opts.allowableSidewallNPerM,
      pass: swbp <= opts.allowableSidewallNPerM,
    },
    messages,
  };
}

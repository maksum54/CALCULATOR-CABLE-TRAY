// Cable + tray weight, support span, deflection and hanger capacity.
//
// Deflection uses the classic uniformly loaded beam formulae, taking the tray as a beam
// spanning between hangers:
//   simple span (1 span)     delta = 5 w L^4 / (384 E I)
//   continuous (3+ spans)    delta = w L^4 / (145 E I)
// The NEMA VE 1 / VE 2 serviceability limit is span / 180 at working load.
//
// E and I come from the tray section. The default I is computed from a plain C-channel model
// of the two side rails and is INDICATIVE - substitute the manufacturer's published section
// property for a formal calculation. The NEMA class check compares the actual load per metre
// against the published working load of the class whose span covers the chosen hanger spacing.

import type { CableRun, SupportResult, TrayParams, WeightResult } from './types';
import { resolveRuns } from './traySizing';
import {
  NEMA_CLASSES,
  NEMA_DEFLECTION_DIVISOR,
  ROD_SIZES,
  STEEL_SECTION,
  traySectionInertiaMm4,
  trayWeightKgPerM,
  type TraySection,
} from './trayStandards';

const G = 9.81;

export function calculateWeight(
  runs: CableRun[],
  params: TrayParams,
  trayRuns: number,
): WeightResult {
  const resolved = resolveRuns(runs);
  const cableKgPerM = resolved.reduce(
    (s, { run, entry }) => s + (run.runs * entry.weightKgKm) / 1000,
    0,
  );
  const trayKgPerM =
    trayRuns * trayWeightKgPerM(params.selectedTrayWidthMm, params.trayHeightMm, params.trayType);
  const totalKgPerM = cableKgPerM + trayKgPerM;
  return {
    cableKgPerM,
    trayKgPerM,
    totalKgPerM,
    loadPerSupportKg: totalKgPerM * params.supportSpanM,
    totalRouteWeightKg: totalKgPerM * params.routeLengthM,
  };
}

export interface SupportOptions {
  section?: TraySection;
  /** Override the computed second moment of area (mm4). */
  inertiaMm4?: number;
  /** 1 = simple span, 3 = three or more continuous spans. */
  spanCount?: number;
  rodSizeId?: string;
  /** Hangers per support point (2 for a trapeze). */
  rodsPerSupport?: number;
}

export function calculateSupport(
  weight: WeightResult,
  params: TrayParams,
  trayRuns: number,
  opts: SupportOptions = {},
): SupportResult {
  const section = opts.section ?? STEEL_SECTION;
  const inertia =
    opts.inertiaMm4 ?? trayRuns * traySectionInertiaMm4(params.trayHeightMm, section);
  const E = section.elasticModulusMpa;
  const L = params.supportSpanM * 1000; // mm
  const spanCount = opts.spanCount ?? 3;

  const udlKgPerM = weight.totalKgPerM;
  const udlNPerMm = (udlKgPerM * G) / 1000; // N/mm

  const deflection =
    spanCount >= 3
      ? (udlNPerMm * L ** 4) / (145 * E * inertia)
      : (5 * udlNPerMm * L ** 4) / (384 * E * inertia);
  const allowable = L / NEMA_DEFLECTION_DIVISOR;

  // Cheapest NEMA class whose span covers the chosen spacing and whose load rating is met.
  const candidates = NEMA_CLASSES.filter(
    (c) => c.spanM >= params.supportSpanM && c.loadKgPerM >= udlKgPerM,
  );
  const nema = candidates[0];

  const rodsPerSupport = opts.rodsPerSupport ?? 2;
  const loadPerHanger = (udlKgPerM * params.supportSpanM) / rodsPerSupport;
  const rod =
    ROD_SIZES.find((r) => r.id === opts.rodSizeId) ??
    ROD_SIZES.find((r) => r.capacityKg >= loadPerHanger) ??
    ROD_SIZES[ROD_SIZES.length - 1];

  const messages: string[] = [
    'Deflection limit span / 180 per NEMA VE 1 / VE 2. Section property is an indicative C-channel model of the tray side rails - replace it with the manufacturer value before issuing.',
  ];
  if (deflection > allowable) {
    messages.push(
      `Deflection ${deflection.toFixed(1)} mm exceeds the ${allowable.toFixed(1)} mm limit - reduce the hanger spacing or use a deeper tray.`,
    );
  }
  if (!nema) {
    messages.push(
      `No NEMA VE 1 class covers ${udlKgPerM.toFixed(1)} kg/m at a ${params.supportSpanM} m span - reduce the span or split the load over more trays.`,
    );
  }
  if (loadPerHanger > rod.capacityKg) {
    messages.push(`Hanger load ${loadPerHanger.toFixed(0)} kg exceeds the ${rod.id} rod capacity.`);
  }

  return {
    spanM: params.supportSpanM,
    udlKgPerM,
    udlNPerM: udlKgPerM * G,
    inertiaMm4: inertia,
    elasticModulusMpa: E,
    deflectionMm: deflection,
    allowableDeflectionMm: allowable,
    deflectionPass: deflection <= allowable,
    nemaClass: nema?.id ?? 'none',
    nemaWorkingLoadKgPerM: nema?.loadKgPerM ?? 0,
    nemaPass: Boolean(nema),
    supportsRequired: Math.max(2, Math.ceil(params.routeLengthM / params.supportSpanM) + 1),
    loadPerHangerKg: loadPerHanger,
    rodSize: rod.id,
    rodCapacityKg: rod.capacityKg,
    rodPass: loadPerHanger <= rod.capacityKg,
    messages,
  };
}

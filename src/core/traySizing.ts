// Cable tray sizing engine.
//
// The practice40 path is a direct port of CABLETRAYCALCULATION_RMW_1.xlsx, sheet
// "TRAY CALCULATION", so the app and that workbook agree cell for cell:
//
//   Method 1  installed width = SUM(OD x runs) x spacing factor
//             with spare      = x (1 + spare factor)
//             per layer       = / layers
//   Method 2  area with spare = SUM(pi/4 x OD^2 x runs) x (1 + spare factor)
//             required area   = / max fill ratio
//             required width  = / tray height
//   Result    governing width = MAX(method 1, method 2)
//             tray runs       = ROUNDUP(governing width / selected width)
//             actual fill     = SUM area / (total installed width x height x layers)
//
// nec392 and iec60364 replace only the area check in Method 2 and the fill verdict; the
// diameter-based Method 1 is common to all three.

import type {
  CableRun,
  CatalogEntry,
  FillDetail,
  FillStandard,
  SizingResult,
  TrayParams,
} from './types';
import { findEntry } from './catalog';
import {
  NEC_AREA_PER_MM,
  NEC_LARGE_CABLE_MM2,
  NEC_MIXED_DIAMETER_FACTOR,
  STANDARD_WIDTHS_MM,
} from './trayStandards';

export interface ResolvedRun {
  run: CableRun;
  entry: CatalogEntry;
}

/** Pair every schedule row with its catalogue entry, dropping rows whose type is unknown. */
export function resolveRuns(runs: CableRun[]): ResolvedRun[] {
  const out: ResolvedRun[] = [];
  for (const run of runs) {
    const entry = findEntry(run.typeCode);
    if (entry) out.push({ run, entry });
  }
  return out;
}

export const cableArea = (odMm: number): number => (Math.PI / 4) * odMm ** 2;

export function sumOd(resolved: ResolvedRun[]): number {
  return resolved.reduce((s, { run, entry }) => s + run.runs * entry.odMm, 0);
}

export function sumArea(resolved: ResolvedRun[]): number {
  return resolved.reduce((s, { run, entry }) => s + run.runs * cableArea(entry.odMm), 0);
}

export function totalRuns(resolved: ResolvedRun[]): number {
  return resolved.reduce((s, { run }) => s + run.runs, 0);
}

/**
 * Allowable cable area inside one tray of the given width, under the selected standard.
 * practice40  : width x height x layers x max fill ratio (the workbook's rule)
 * nec392      : NEC 392.22(A) - a linear allowance per mm of width, reduced by any cables
 *               at or above 4/0 (107.2 mm2), which must additionally sit in a single layer
 * iec60364    : IEC 60364-5-52 does not impose an area fill limit; the geometric width from
 *               Method 1 governs and the grouping factor carries the thermal restriction
 */
function fillCheck(
  resolved: ResolvedRun[],
  params: TrayParams,
  trayWidthMm: number,
  trayRuns: number,
): FillDetail {
  const actualArea = sumArea(resolved);
  const totalWidth = trayWidthMm * trayRuns;
  const messages: string[] = [];

  if (params.fillStandard === 'nec392') {
    const perMm = NEC_AREA_PER_MM[params.trayType];
    const large = resolved.filter(({ entry }) => entry.sizeMm2 >= NEC_LARGE_CABLE_MM2);
    const small = resolved.filter(({ entry }) => entry.sizeMm2 < NEC_LARGE_CABLE_MM2);
    const sumLargeDia = sumOd(large);
    const smallArea = sumArea(small);
    const allowable = Math.max(perMm * totalWidth - NEC_MIXED_DIAMETER_FACTOR * sumLargeDia, 0);

    if (large.length > 0) {
      messages.push(
        `NEC 392.22(A)(1): ${totalRuns(large)} cable(s) at or above 4/0 (107.2 mm2) must be laid in a single layer; ` +
          `their diameters total ${sumLargeDia.toFixed(0)} mm against ${totalWidth.toFixed(0)} mm of tray width.`,
      );
      if (sumLargeDia > totalWidth) {
        messages.push('NEC 392.22(A)(1) FAIL: large cables alone exceed the available tray width.');
      }
    }
    if (params.layers > 1) {
      messages.push('NEC 392.22(A) assumes a single layer for the area allowance; multi-layer stacking is outside the rule.');
    }
    messages.push('Verify the allowance against NEC Table 392.22(A) in the code book before issuing.');

    return {
      standard: 'nec392',
      labelId: 'NEC 392.22(A)',
      labelEn: 'NEC 392.22(A)',
      allowableAreaMm2: allowable,
      actualAreaMm2: smallArea,
      utilisation: allowable > 0 ? smallArea / allowable : Infinity,
      pass: smallArea <= allowable && sumLargeDia <= totalWidth,
      messages,
    };
  }

  if (params.fillStandard === 'iec60364') {
    const geometric = sumOd(resolved) * params.spacingFactor;
    const available = totalWidth * params.layers;
    messages.push('IEC 60364-5-52 sets no area fill limit; the diameter width and the grouping factor govern.');
    messages.push('Check the grouping derating on the Thermal tab - it replaces the fill percentage.');
    return {
      standard: 'iec60364',
      labelId: 'IEC 60364-5-52',
      labelEn: 'IEC 60364-5-52',
      allowableAreaMm2: available * params.trayHeightMm,
      actualAreaMm2: actualArea,
      utilisation: available > 0 ? geometric / available : Infinity,
      pass: geometric <= available,
      messages,
    };
  }

  const allowable = totalWidth * params.trayHeightMm * params.layers * params.maxFillRatio;
  return {
    standard: 'practice40',
    labelId: `Praktik umum ${(params.maxFillRatio * 100).toFixed(0)} %`,
    labelEn: `Common practice ${(params.maxFillRatio * 100).toFixed(0)} %`,
    allowableAreaMm2: allowable,
    actualAreaMm2: actualArea,
    utilisation: allowable > 0 ? actualArea / allowable : Infinity,
    pass: actualArea <= allowable,
    messages: [
      'Matches CABLETRAYCALCULATION_RMW_1.xlsx. The fill ratio is taken against width x height x layers.',
    ],
  };
}

/** Required width from the area rule, per the selected standard. */
function requiredWidthFromArea(
  resolved: ResolvedRun[],
  params: TrayParams,
  areaWithSpare: number,
): { requiredTrayAreaMm2: number; requiredWidthMm: number } {
  if (params.fillStandard === 'nec392') {
    const perMm = NEC_AREA_PER_MM[params.trayType];
    const large = resolved.filter(({ entry }) => entry.sizeMm2 >= NEC_LARGE_CABLE_MM2);
    const small = resolved.filter(({ entry }) => entry.sizeMm2 < NEC_LARGE_CABLE_MM2);
    const smallAreaWithSpare = sumArea(small) * (1 + params.spareFactor);
    const width = (smallAreaWithSpare + NEC_MIXED_DIAMETER_FACTOR * sumOd(large)) / perMm;
    return { requiredTrayAreaMm2: smallAreaWithSpare, requiredWidthMm: width };
  }
  if (params.fillStandard === 'iec60364') {
    return { requiredTrayAreaMm2: areaWithSpare, requiredWidthMm: 0 };
  }
  const requiredTrayArea = areaWithSpare / params.maxFillRatio;
  return { requiredTrayAreaMm2: requiredTrayArea, requiredWidthMm: requiredTrayArea / params.trayHeightMm };
}

export function calculateSizing(runs: CableRun[], params: TrayParams): SizingResult {
  const resolved = resolveRuns(runs);
  const odTotal = sumOd(resolved);
  const areaTotal = sumArea(resolved);

  const installedWidth = odTotal * params.spacingFactor;
  const withSpare = installedWidth * (1 + params.spareFactor);
  const perLayer = withSpare / params.layers;

  const areaWithSpare = areaTotal * (1 + params.spareFactor);
  const { requiredTrayAreaMm2, requiredWidthMm } = requiredWidthFromArea(resolved, params, areaWithSpare);

  const governing = Math.max(perLayer, requiredWidthMm);
  const trayRunsRequired = Math.max(1, Math.ceil(governing / params.selectedTrayWidthMm));
  const totalInstalledWidth = trayRunsRequired * params.selectedTrayWidthMm;

  // Kept identical to the workbook: area over (width x height x layers).
  const actualFillRatio =
    areaTotal / (totalInstalledWidth * params.trayHeightMm * params.layers);

  const detail = fillCheck(resolved, params, params.selectedTrayWidthMm, trayRunsRequired);
  const recommended = STANDARD_WIDTHS_MM.find((w) => w >= governing) ?? null;

  return {
    totalRuns: totalRuns(resolved),
    sumOdMm: odTotal,
    sumAreaMm2: areaTotal,
    method1: { installedWidthMm: installedWidth, withSpareMm: withSpare, perLayerMm: perLayer },
    method2: {
      areaWithSpareMm2: areaWithSpare,
      requiredTrayAreaMm2,
      requiredWidthMm,
    },
    governingWidthMm: governing,
    governingMethod: perLayer >= requiredWidthMm ? 'method1' : 'method2',
    selectedTrayWidthMm: params.selectedTrayWidthMm,
    trayRunsRequired,
    totalInstalledWidthMm: totalInstalledWidth,
    actualFillRatio,
    fillCheckPass: detail.pass && actualFillRatio <= params.maxFillRatio,
    recommendedSingleTrayWidthMm: recommended,
    fillDetail: detail,
  };
}

/** Runs needed at every standard width, for 1..maxLayers layers - the workbook's table F. */
export function alternativeConfigurations(
  governingWidthMm: number,
  layersToShow = 3,
): { widthMm: number; runsByLayer: number[] }[] {
  return STANDARD_WIDTHS_MM.map((widthMm) => ({
    widthMm,
    runsByLayer: Array.from({ length: layersToShow }, (_, i) =>
      Math.max(1, Math.ceil(governingWidthMm / widthMm / (i + 1))),
    ),
  }));
}

/** Per-panel breakdown - the workbook's table G. */
export function perPanelSizing(runs: CableRun[], params: TrayParams) {
  const panels = [...new Set(runs.map((r) => r.panel))];
  return panels.map((panel) => {
    const subset = runs.filter((r) => r.panel === panel);
    const result = calculateSizing(subset, params);
    return { panel, ...result };
  });
}

export const FILL_STANDARDS: { id: FillStandard; labelId: string; labelEn: string }[] = [
  { id: 'practice40', labelId: 'Praktik umum 40 % (sesuai Excel)', labelEn: 'Common practice 40 % (matches Excel)' },
  { id: 'nec392', labelId: 'NEC 392.22(A)', labelEn: 'NEC 392.22(A)' },
  { id: 'iec60364', labelId: 'IEC 60364-5-52', labelEn: 'IEC 60364-5-52' },
];

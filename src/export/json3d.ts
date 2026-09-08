// Generic 3D / parameter export for BIM tooling.
//
// Deliberately plain JSON rather than IFC: writing valid IFC from scratch is a large job and the
// output is frequently rejected by Revit, whereas this structure is trivial for a Revit add-in,
// a Dynamo graph or any other BIM tool to read. Everything is in millimetres, with the tray
// origin at the inside bottom-left of tray run 0, x across, y up, z along the route.

import type { TrayArrangement } from '../core/arranger';
import type { CableRun, SizingResult, SupportResult, TrayParams, WeightResult } from '../core/types';
import { findEntry } from '../core/catalog';
import type { ProjectInfo } from '../store/useAppStore';

export interface Bim3dExportInput {
  project: ProjectInfo;
  params: TrayParams;
  sizing: SizingResult;
  weight: WeightResult;
  support: SupportResult;
  trays: TrayArrangement[];
  schedule: CableRun[];
  trayGapMm?: number;
}

export function buildBimJson(input: Bim3dExportInput): string {
  const { params, sizing, trays } = input;
  const gap = input.trayGapMm ?? 150;
  const pitch = params.selectedTrayWidthMm + gap;

  const doc = {
    schema: 'cable-tray-calculator/3d-export',
    schemaVersion: '1.0',
    units: { length: 'mm', weight: 'kg', current: 'A', temperature: 'degC' },
    coordinateSystem: {
      origin: 'inside bottom-left corner of tray run 0',
      x: 'across the tray width',
      y: 'up',
      z: 'along the cable route',
    },
    generatedAt: new Date().toISOString(),
    project: input.project,
    parameters: params,
    result: {
      totalCableRuns: sizing.totalRuns,
      sumOdMm: sizing.sumOdMm,
      sumAreaMm2: sizing.sumAreaMm2,
      governingWidthMm: sizing.governingWidthMm,
      governingMethod: sizing.governingMethod,
      trayRunsRequired: sizing.trayRunsRequired,
      totalInstalledWidthMm: sizing.totalInstalledWidthMm,
      actualFillRatio: sizing.actualFillRatio,
      fillStandard: sizing.fillDetail.standard,
      fillCheckPass: sizing.fillCheckPass,
      cableKgPerM: input.weight.cableKgPerM,
      trayKgPerM: input.weight.trayKgPerM,
      totalKgPerM: input.weight.totalKgPerM,
      supportSpanM: input.support.spanM,
      deflectionMm: input.support.deflectionMm,
      allowableDeflectionMm: input.support.allowableDeflectionMm,
      nemaClass: input.support.nemaClass,
      rodSize: input.support.rodSize,
    },
    trayRuns: trays.map((tray, i) => ({
      index: i,
      originMm: { x: i * pitch, y: 0, z: 0 },
      widthMm: params.selectedTrayWidthMm,
      heightMm: params.trayHeightMm,
      type: params.trayType,
      lengthM: params.routeLengthM,
      layersUsed: tray.layersUsed,
      frcDividerXMm: tray.dividerXMm ?? null,
      cables: tray.cables.map((c) => {
        const entry = findEntry(c.typeCode);
        const run = input.schedule.find((r) => r.id === c.runId);
        return {
          runId: c.runId,
          runIndex: c.runIndex,
          circuit: run?.circuit ?? c.label,
          panel: run?.panel ?? null,
          typeCode: c.typeCode,
          family: entry?.family ?? null,
          cores: entry?.cores ?? null,
          sizeMm2: entry?.sizeMm2 ?? null,
          odMm: c.r * 2,
          weightKgKm: entry?.weightKgKm ?? null,
          verified: entry?.verified !== false,
          centreMm: { x: c.x, y: c.y },
          layer: c.layer,
          trefoilGroup: c.group ?? null,
        };
      }),
    })),
    notes: [
      'Cable centres are the calculated arrangement, not an as-built survey.',
      'Entries with verified=false use project data that has not been checked against a manufacturer catalogue.',
      'Extrude each cable as a circle of the given radius along +z to rebuild the 3D model.',
    ],
  };

  return JSON.stringify(doc, null, 2);
}

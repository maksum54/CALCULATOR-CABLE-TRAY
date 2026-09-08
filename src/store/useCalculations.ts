import { useMemo } from 'react';
import { calculateSizing, alternativeConfigurations, perPanelSizing } from '../core/traySizing';
import { arrangeCables } from '../core/arranger';
import { calculateDerating } from '../core/derating';
import { calculateSupport, calculateWeight } from '../core/support';
import { calculateBending } from '../core/bending';
import { filteredSchedule, useAppStore } from './useAppStore';

/**
 * Every derived number in the app comes from here, so the tables, the 2D section, the 3D
 * scene and the exports can never drift apart.
 */
export function useCalculations() {
  const schedule = useAppStore((s) => s.schedule);
  const params = useAppStore((s) => s.params);
  const layout = useAppStore((s) => s.layout);
  const bendingOpts = useAppStore((s) => s.bending);
  const panelFilter = useAppStore((s) => s.panelFilter);

  return useMemo(() => {
    const runs = filteredSchedule(schedule, panelFilter);
    const sizing = calculateSizing(runs, params);

    const trays = arrangeCables(runs, {
      ...layout,
      trayWidthMm: params.selectedTrayWidthMm,
      trayHeightMm: params.trayHeightMm,
      trayRuns: sizing.trayRunsRequired,
      maxLayers: params.layers,
      arrangement: params.arrangement,
    });

    const placed = trays.flatMap((t) => t.cables);
    const layersUsed = trays.reduce((m, t) => Math.max(m, t.layersUsed), 0);
    const derating = calculateDerating(runs, placed, params, Math.max(1, layersUsed));
    const weight = calculateWeight(runs, params, sizing.trayRunsRequired);
    const support = calculateSupport(weight, params, sizing.trayRunsRequired);
    const bending = calculateBending(runs, params.routeLengthM, weight.cableKgPerM, bendingOpts);
    const alternatives = alternativeConfigurations(sizing.governingWidthMm);
    const panels = perPanelSizing(schedule, params);
    const overflow = trays.reduce((s, t) => s + t.overflow, 0);

    return { runs, sizing, trays, placed, derating, weight, support, bending, alternatives, panels, overflow, layersUsed };
  }, [schedule, params, layout, bendingOpts, panelFilter]);
}

export type Calculations = ReturnType<typeof useCalculations>;

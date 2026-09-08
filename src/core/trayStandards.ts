// Standard cable tray sizes and the reference data used by the sizing, support and fill checks.
//
// IMPORTANT - what is and is not authoritative here:
//   * Standard widths / heights: manufacturer-independent, universally offered sizes.
//   * NEC fill constants: the structure of NEC 392.22(A) reproduced as a linear allowance per
//     mm of tray width. Check the figures against the code book before issuing a calculation.
//   * Tray self-weight and section properties: INDICATIVE estimates from typical hot-dip
//     galvanised steel trays. They are exposed as editable inputs in the UI - replace them with
//     the values from the tray manufacturer's catalogue for a formal submission.
//   * NEMA VE 1 load/span classes and threaded rod capacities: nominal published values,
//     likewise to be confirmed against the product certificate.

import type { TrayType } from './types';

export const STANDARD_WIDTHS_MM = [100, 150, 200, 300, 400, 500, 600, 750, 800, 900, 1000];
export const STANDARD_HEIGHTS_MM = [50, 100, 150, 200];
export const STANDARD_SPANS_M = [1.2, 1.5, 2.0, 2.4, 3.0, 3.6, 4.5, 6.0];

/** NEC 392.22(A) allowable cable area per mm of tray width (mm2/mm), cables smaller than 4/0. */
export const NEC_AREA_PER_MM: Record<TrayType, number> = {
  ladder: 30.0,
  perforated: 30.0,
  solid: 23.3,
};

/** Cross-section above which NEC 392.22(A)(1) requires a single layer (107.2 mm2 = 4/0 AWG). */
export const NEC_LARGE_CABLE_MM2 = 107.2;

/** Reduction applied to the small-cable allowance for every mm of large-cable diameter. */
export const NEC_MIXED_DIAMETER_FACTOR = 1.2;

export interface TraySection {
  /** Rail flange width (mm). */
  flangeMm: number;
  /** Rail material thickness (mm). */
  thicknessMm: number;
  /** Young's modulus (MPa). */
  elasticModulusMpa: number;
  /** Material density (kg/m3). */
  densityKgM3: number;
}

export const STEEL_SECTION: TraySection = {
  flangeMm: 25,
  thicknessMm: 2.0,
  elasticModulusMpa: 200_000,
  densityKgM3: 7850,
};

export const ALUMINIUM_SECTION: TraySection = {
  flangeMm: 25,
  thicknessMm: 2.5,
  elasticModulusMpa: 69_000,
  densityKgM3: 2700,
};

/**
 * Second moment of area of the two tray side rails about the horizontal bending axis (mm4),
 * modelling each rail as a plain C-channel of the given height, flange and thickness.
 */
export function traySectionInertiaMm4(heightMm: number, section: TraySection): number {
  const b = section.flangeMm;
  const h = heightMm;
  const t = section.thicknessMm;
  const inner = Math.max(h - 2 * t, 0);
  const oneRail = (b * h ** 3 - (b - t) * inner ** 3) / 12;
  return 2 * oneRail;
}

/** Indicative tray self-weight (kg/m). Editable in the UI. */
export function trayWeightKgPerM(widthMm: number, heightMm: number, type: TrayType): number {
  const rails = 2 * (heightMm / 100) * 1.6;
  const bottomPerMm = type === 'ladder' ? 0.0045 : type === 'perforated' ? 0.0075 : 0.0095;
  return rails + bottomPerMm * widthMm;
}

export interface NemaClass {
  id: string;
  /** Design span (m). */
  spanM: number;
  /** Working load (kg/m). */
  loadKgPerM: number;
}

/** NEMA VE 1 load/span designations. Span 8/12/16/20 ft, load A/B/C = 50/75/100 lb/ft. */
export const NEMA_CLASSES: NemaClass[] = [
  { id: '8A', spanM: 2.4, loadKgPerM: 74.4 },
  { id: '8B', spanM: 2.4, loadKgPerM: 111.6 },
  { id: '8C', spanM: 2.4, loadKgPerM: 148.8 },
  { id: '12A', spanM: 3.7, loadKgPerM: 74.4 },
  { id: '12B', spanM: 3.7, loadKgPerM: 111.6 },
  { id: '12C', spanM: 3.7, loadKgPerM: 148.8 },
  { id: '16A', spanM: 4.9, loadKgPerM: 74.4 },
  { id: '16B', spanM: 4.9, loadKgPerM: 111.6 },
  { id: '16C', spanM: 4.9, loadKgPerM: 148.8 },
  { id: '20A', spanM: 6.1, loadKgPerM: 74.4 },
  { id: '20B', spanM: 6.1, loadKgPerM: 111.6 },
  { id: '20C', spanM: 6.1, loadKgPerM: 148.8 },
];

/** NEMA VE 1 deflection limit: span / 180 at working load. */
export const NEMA_DEFLECTION_DIVISOR = 180;

export interface RodSize {
  id: string;
  /** Safe working load in tension, per rod (kg). */
  capacityKg: number;
}

/** Threaded rod safe working loads, grade 4.6 mild steel at a 5:1 factor. */
export const ROD_SIZES: RodSize[] = [
  { id: 'M8', capacityKg: 210 },
  { id: 'M10', capacityKg: 340 },
  { id: 'M12', capacityKg: 500 },
  { id: 'M16', capacityKg: 950 },
  { id: 'M20', capacityKg: 1480 },
];

/** Standard tray fitting radii offered by most manufacturers (mm). */
export const FITTING_RADII_MM = [150, 300, 600, 900];

/** Shared domain types for the cable tray calculator. */

export interface CatalogEntry {
  /** Stable key referenced by CableRun.typeCode, e.g. "NYY-4C-185" or "4C-185". */
  id: string;
  family: string;
  cores: number;
  sizeMm2: number;
  /** Nominal overall diameter (mm). */
  odMm: number;
  /** Approximate cable weight (kg/km). */
  weightKgKm: number;
  voltage: string;
  construction: string;
  standard: string;
  armoured: boolean;
  datasheet: string;
  rdc20?: number;
  rac70?: number;
  inductance?: number;
  inductanceFlat?: number;
  /** Catalogue ampacity at 30 degC ambient (A). */
  ampAir?: number;
  ampGround?: number;
  ampPipe?: number;
  ampAirFlat?: number;
  ampGroundFlat?: number;
  scCurrentKa?: number;
  /** Absent or true = transcribed from a manufacturer datasheet. */
  verified?: boolean;
  note?: string;
}

export type CableCategory = 'INCOMING' | 'OUTGOING' | string;

export interface CableRun {
  id: string;
  panel: string;
  circuit: string;
  category: CableCategory;
  loadKw?: number;
  description: string;
  /** Catalogue entry id. */
  typeCode: string;
  /** Number of parallel runs of this cable on the tray. */
  runs: number;
}

/** Which fill rule governs the area check. */
export type FillStandard = 'practice40' | 'nec392' | 'iec60364';

/** How cables are laid out across the tray width. */
export type ArrangementMode = 'flatTouching' | 'flatSpaced' | 'trefoil';

export type TrayType = 'ladder' | 'perforated' | 'solid';

export interface TrayParams {
  /** Spare / future expansion allowance, e.g. 0.30 = 30 %. */
  spareFactor: number;
  /** 1.00 = cables touching, 1.10 = 10 % of OD clearance between cables. */
  spacingFactor: number;
  /** Usable tray side height (mm). */
  trayHeightMm: number;
  /** Maximum fill ratio for the practice40 rule, e.g. 0.40. */
  maxFillRatio: number;
  /** Number of cable layers. */
  layers: number;
  /** Standard tray width selected for the run (mm). */
  selectedTrayWidthMm: number;
  fillStandard: FillStandard;
  arrangement: ArrangementMode;
  trayType: TrayType;
  /** Distance between support hangers (m). */
  supportSpanM: number;
  /** Site ambient temperature (degC) for the derating check. */
  ambientTempC: number;
  /** Nominal line-to-line system voltage (V) used to turn kW into a design current. */
  systemVoltageV: number;
  /** Power factor used for the same conversion. */
  powerFactor: number;
  /** Cable tray route length (m), used for BOQ and pulling tension. */
  routeLengthM: number;
  coverInstalled: boolean;
}

/** A single cable circle placed in the tray cross-section. */
export interface PlacedCable {
  runId: string;
  /** Sequence number of this run within its CableRun (1..runs). */
  runIndex: number;
  label: string;
  typeCode: string;
  /** Centre coordinates in mm, origin at the inside bottom-left corner of the tray. */
  x: number;
  y: number;
  /** Cable radius (mm). */
  r: number;
  layer: number;
  /** Index of the trefoil group this cable belongs to, when applicable. */
  group?: number;
}

export interface ArrangementResult {
  cables: PlacedCable[];
  /** Width actually occupied by the arrangement (mm). */
  occupiedWidthMm: number;
  /** Height actually occupied by the arrangement (mm). */
  occupiedHeightMm: number;
  layersUsed: number;
  /** Cables that did not fit inside the tray envelope. */
  overflow: number;
}

export interface SizingResult {
  totalRuns: number;
  /** Sum of (OD x runs) over every cable (mm). */
  sumOdMm: number;
  /** Sum of (pi/4 x OD^2 x runs) over every cable (mm2). */
  sumAreaMm2: number;
  /** Method 1 - width from the sum of cable diameters. */
  method1: { installedWidthMm: number; withSpareMm: number; perLayerMm: number };
  /** Method 2 - width from the area fill limit. */
  method2: { areaWithSpareMm2: number; requiredTrayAreaMm2: number; requiredWidthMm: number };
  /** The greater of method 1 and method 2 (mm). */
  governingWidthMm: number;
  governingMethod: 'method1' | 'method2';
  selectedTrayWidthMm: number;
  /** Number of parallel tray runs needed at the selected width. */
  trayRunsRequired: number;
  totalInstalledWidthMm: number;
  actualFillRatio: number;
  fillCheckPass: boolean;
  /** Nearest standard width that carries the whole load in a single tray run. */
  recommendedSingleTrayWidthMm: number | null;
  /** Detail of whichever fill standard was applied. */
  fillDetail: FillDetail;
}

export interface FillDetail {
  standard: FillStandard;
  labelId: string;
  labelEn: string;
  /** Allowable cable area for the selected tray (mm2). */
  allowableAreaMm2: number;
  /** Actual cable area placed in the selected tray (mm2). */
  actualAreaMm2: number;
  utilisation: number;
  pass: boolean;
  messages: string[];
}

export interface WeightResult {
  cableKgPerM: number;
  trayKgPerM: number;
  totalKgPerM: number;
  loadPerSupportKg: number;
  totalRouteWeightKg: number;
}

export interface DeratingResult {
  /** Grouping factor from IEC 60364-5-52 Table B.52.17. */
  groupingFactor: number;
  /** Ambient temperature correction factor. */
  temperatureFactor: number;
  combinedFactor: number;
  circuits: number;
  layersUsed: number;
  perCable: DeratedCable[];
  worstUtilisation: number;
  messages: string[];
}

export interface DeratedCable {
  runId: string;
  label: string;
  typeCode: string;
  baseAmpacity: number;
  deratedAmpacity: number;
  /** Total design current of the circuit (A), before it splits between parallel runs. */
  designCurrentA: number;
  /** Design current carried by THIS run (A) = total / number of parallel runs. */
  currentPerRunA: number;
  /** Parallel runs the circuit is split over. */
  runs: number;
  utilisation: number;
  /** False when the circuit carries no load figure, so utilisation cannot be judged. */
  loadKnown: boolean;
  /** 0 (cool) .. 1 (hot) - drives the cross-section heat map. */
  thermalIndex: number;
}

export interface SupportResult {
  spanM: number;
  udlKgPerM: number;
  udlNPerM: number;
  /** Second moment of area of the tray (mm4) used for the deflection check. */
  inertiaMm4: number;
  elasticModulusMpa: number;
  deflectionMm: number;
  allowableDeflectionMm: number;
  deflectionPass: boolean;
  nemaClass: string;
  nemaWorkingLoadKgPerM: number;
  nemaPass: boolean;
  supportsRequired: number;
  loadPerHangerKg: number;
  rodSize: string;
  rodCapacityKg: number;
  rodPass: boolean;
  messages: string[];
}

export interface BendingResult {
  perType: BendingType[];
  governingRadiusMm: number;
  fittings: FittingCheck[];
  pullingTension: PullingTension;
  messages: string[];
}

export interface BendingType {
  typeCode: string;
  label: string;
  odMm: number;
  factor: number;
  minRadiusMm: number;
}

export interface FittingCheck {
  fitting: string;
  standardRadiusMm: number;
  requiredRadiusMm: number;
  pass: boolean;
}

export interface PullingTension {
  straightTensionN: number;
  bendTensionN: number;
  sidewallPressureNPerM: number;
  allowableSidewallNPerM: number;
  pass: boolean;
}

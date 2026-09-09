import type { TrayParams } from './types';

/** Defaults mirror section A of the reference workbook so a fresh session reproduces it. */
export const DEFAULT_PARAMS: TrayParams = {
  spareFactor: 0.3,
  spacingFactor: 1.1,
  trayHeightMm: 100,
  maxFillRatio: 0.4,
  layers: 3,
  selectedTrayWidthMm: 600,
  fillStandard: 'practice40',
  arrangement: 'flatTouching',
  trayType: 'ladder',
  supportSpanM: 1.5,
  ambientTempC: 35,
  // 380 V / 0.85 is the usual Indonesian LV convention (PUIL); both are editable.
  systemVoltageV: 380,
  powerFactor: 0.85,
  routeLengthM: 100,
  coverInstalled: false,
};

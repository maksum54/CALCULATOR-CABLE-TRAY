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
  routeLengthM: 100,
  coverInstalled: false,
};

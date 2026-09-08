// Project catalogue for the Raw Material Warehouse calculation. These twelve entries are the
// cable types used in CABLETRAYCALCULATION_RMW_1.xlsx, sheet "CABLE DATA (OD)". The outer
// diameters are the ones the original workbook was built on, so loading this catalogue
// reproduces that workbook's numbers exactly.
//
// The workbook itself flags these ODs as typical values that "MUST be verified against the
// manufacturer catalogue actually used", so every entry here is marked verified: false. The
// weights are borrowed from the nearest KMI NYY / NYA size because the XLPE (N2XY) and FRC
// datasheets for this project were not supplied - they are indicative, not catalogue figures.
// Switch a cable to a KMI-* entry to work from fully verified data.

import type { CatalogEntry } from '../types';

interface Borrowed {
  weightKgKm: number;
  ampAir: number;
  ampGround: number;
  rdc20: number;
  scCurrentKa: number;
}

const unverified = (
  id: string,
  cores: number,
  sizeMm2: number,
  odMm: number,
  borrowed: Borrowed,
  construction: string,
  family: string,
  note: string,
): CatalogEntry => ({
  id,
  family,
  cores,
  sizeMm2,
  odMm,
  ...borrowed,
  voltage: family === 'NYA' ? '450/750 V' : '0.6/1 kV',
  construction,
  standard: family === 'NYA' ? 'IEC 60227-1' : 'IEC 60502-1',
  armoured: false,
  datasheet: 'CABLETRAYCALCULATION_RMW_1.xlsx',
  verified: false,
  note,
});

const W = 'weight, ampacity and resistance taken from the equivalent KMI size';

export const PROJECT_CATALOG: CatalogEntry[] = [
  unverified('4C-185', 4, 185, 61.0, { weightKgKm: 8392, ampAir: 405, ampGround: 366, rdc20: 0.0991, scCurrentKa: 21.28 }, 'Cu/XLPE/PVC', 'N2XY', `Incoming DB-RMW-L0-LP from MDB. ${W} (NYY 4C x 185).`),
  unverified('4C-150', 4, 150, 56.0, { weightKgKm: 6787, ampAir: 357, ampGround: 327, rdc20: 0.124, scCurrentKa: 17.25 }, 'Cu/XLPE/PVC', 'N2XY', `Incoming CP-RMW-L1-MVAC from DEG. ${W} (NYY 4C x 150).`),
  unverified('4C-25', 4, 25, 27.5, { weightKgKm: 1558, ampAir: 121, ampGround: 128, rdc20: 0.727, scCurrentKa: 2.88 }, 'Cu/XLPE/PVC', 'N2XY', `Incoming CP-RMW-L0-MVAC. ${W} (NYY 4C x 25).`),
  unverified('5C-16', 5, 16, 26.0, { weightKgKm: 1309, ampAir: 94, ampGround: 101, rdc20: 1.15, scCurrentKa: 1.84 }, 'Cu/XLPE/PVC', 'N2XY', `MVAC outdoor unit. ${W} (NYY 5C x 16).`),
  unverified('5C-10', 5, 10, 21.5, { weightKgKm: 954, ampAir: 71, ampGround: 78, rdc20: 1.83, scCurrentKa: 1.15 }, 'Cu/XLPE/PVC', 'N2XY', `Motor / machine 22 kW. ${W} (NYY 5C x 10).`),
  unverified('4C-10', 4, 10, 20.0, { weightKgKm: 794, ampAir: 68, ampGround: 77, rdc20: 1.83, scCurrentKa: 1.15 }, 'Cu/XLPE/PVC', 'N2XY', `Incoming DB-RMW-L0-LP from DEG. ${W} (NYY 4C x 10).`),
  unverified('5C-6', 5, 6, 18.0, { weightKgKm: 677, ampAir: 52, ampGround: 59, rdc20: 3.08, scCurrentKa: 0.69 }, 'Cu/XLPE/PVC', 'N2XY', `Outdoor unit / motor 11 kW. ${W} (NYY 5C x 6).`),
  unverified('1C-95', 1, 95, 16.5, { weightKgKm: 958, ampAir: 290, ampGround: 207, rdc20: 0.193, scCurrentKa: 10.93 }, 'Cu/PVC G/Y', 'NYA', `Earthing conductor. ${W} (NYA 95).`),
  unverified('5C-4', 5, 4, 16.0, { weightKgKm: 541, ampAir: 41, ampGround: 47, rdc20: 4.61, scCurrentKa: 0.46 }, 'Cu/XLPE/PVC', 'N2XY', `Motor 3 kW. ${W} (NYY 5C x 4).`),
  unverified('3C-4', 3, 4, 13.5, { weightKgKm: 383, ampAir: 34, ampGround: 40, rdc20: 4.61, scCurrentKa: 0.46 }, 'Cu/XLPE/PVC', 'N2XY', `Lighting / socket outlet / indoor unit / exhaust fan. ${W} (NYY 3C x 4).`),
  unverified('2C-2.5', 2, 2.5, 11.0, { weightKgKm: 242, ampAir: 30, ampGround: 36, rdc20: 7.41, scCurrentKa: 0.29 }, 'Cu/MGT/XLPE/LSZH (FRC)', 'FRC', `Fire alarm interlock. ${W} (NYY 2C x 2.5); route in a dedicated tray or behind a divider.`),
  unverified('1C-16', 1, 16, 8.0, { weightKgKm: 173, ampAir: 98, ampGround: 61, rdc20: 1.15, scCurrentKa: 1.84 }, 'Cu/PVC G/Y', 'NYA', `Earthing conductor. ${W} (NYA 16).`),
];

// Cable schedule transcribed from CABLETRAYCALCULATION_RMW_1.xlsx (sheet "CABLE SCHEDULE"),
// the reference calculation for the Raw Material Warehouse: 125 rows / 126 runs across three
// panels. This is the fixture the engine is verified against in
// src/core/__tests__/traySizing.test.ts - the figures in the README's Verification table come
// from it, so do not edit it to try out a change. The schedule the app loads behind
// "Load sample data" is src/data/sampleSchedule.ts.

import type { CableRun } from '../core/types';

export const REFERENCE_SCHEDULE: CableRun[] = [
  {
    "id": "C001",
    "panel": "DB-RMW-L0-LP",
    "circuit": "FIRE ALARM INTERLOCK (FRC)",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "1x2C-2.5mm2 Cu/MGT/XLPE/LSZH (FRC)",
    "typeCode": "2C-2.5",
    "runs": 1
  },
  {
    "id": "C002",
    "panel": "DB-RMW-L0-LP",
    "circuit": "INCOMING from DEG",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "1x4C-10mm2 Cu/XLPE/PVC",
    "typeCode": "4C-10",
    "runs": 1
  },
  {
    "id": "C003",
    "panel": "DB-RMW-L0-LP",
    "circuit": "INCOMING from DEG (E)",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "1x1C-16mm2 Cu/PVC G/Y",
    "typeCode": "1C-16",
    "runs": 1
  },
  {
    "id": "C004",
    "panel": "DB-RMW-L0-LP",
    "circuit": "INCOMING from MDB-RMW-L0",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "1x4C-185mm2 Cu/XLPE/PVC",
    "typeCode": "4C-185",
    "runs": 1
  },
  {
    "id": "C005",
    "panel": "DB-RMW-L0-LP",
    "circuit": "INCOMING from MDB-RMW-L0 (E)",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "1x1C-95mm2 Cu/PVC G/Y",
    "typeCode": "1C-95",
    "runs": 1
  },
  {
    "id": "C006",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L1",
    "category": "OUTGOING",
    "loadKw": 1.35,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C007",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L10",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C008",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L11",
    "category": "OUTGOING",
    "loadKw": 1.05,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C009",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L12",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C010",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L13",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C011",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L14",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C012",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L15",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C013",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L16",
    "category": "OUTGOING",
    "loadKw": 1.5,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C014",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L17",
    "category": "OUTGOING",
    "loadKw": 0.83,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C015",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L18",
    "category": "OUTGOING",
    "loadKw": 0.9,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C016",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L19",
    "category": "OUTGOING",
    "loadKw": 0.9,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C017",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L2",
    "category": "OUTGOING",
    "loadKw": 1.5,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C018",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L20",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C019",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L21",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C020",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L22",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C021",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L23",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C022",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L24",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C023",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L25",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C024",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L26",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C025",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L27",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C026",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L3",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C027",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L4",
    "category": "OUTGOING",
    "loadKw": 1.5,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C028",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L5",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C029",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L6",
    "category": "OUTGOING",
    "loadKw": 1.35,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C030",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L7",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C031",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L8",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C032",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-L9",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C033",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S01",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C034",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S02",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C035",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S03",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C036",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S04",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C037",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S05",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C038",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S06",
    "category": "OUTGOING",
    "loadKw": 2.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C039",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S07",
    "category": "OUTGOING",
    "loadKw": 2.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C040",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S08",
    "category": "OUTGOING",
    "loadKw": 2.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C041",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S09",
    "category": "OUTGOING",
    "loadKw": 2.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C042",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S10",
    "category": "OUTGOING",
    "loadKw": 2.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C043",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S11",
    "category": "OUTGOING",
    "loadKw": 2.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C044",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S12",
    "category": "OUTGOING",
    "loadKw": 2.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C045",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S13",
    "category": "OUTGOING",
    "loadKw": 2.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C046",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S14",
    "category": "OUTGOING",
    "loadKw": 9.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C047",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S15",
    "category": "OUTGOING",
    "loadKw": 3.0,
    "description": "1x5C-4mm2 Cu/XLPE/PVC",
    "typeCode": "5C-4",
    "runs": 1
  },
  {
    "id": "C048",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S16",
    "category": "OUTGOING",
    "loadKw": 3.0,
    "description": "1x5C-4mm2 Cu/XLPE/PVC",
    "typeCode": "5C-4",
    "runs": 1
  },
  {
    "id": "C049",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S17",
    "category": "OUTGOING",
    "loadKw": 3.0,
    "description": "1x5C-4mm2 Cu/XLPE/PVC",
    "typeCode": "5C-4",
    "runs": 1
  },
  {
    "id": "C050",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S18",
    "category": "OUTGOING",
    "loadKw": 3.0,
    "description": "1x5C-4mm2 Cu/XLPE/PVC",
    "typeCode": "5C-4",
    "runs": 1
  },
  {
    "id": "C051",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S19",
    "category": "OUTGOING",
    "loadKw": 3.0,
    "description": "1x5C-4mm2 Cu/XLPE/PVC",
    "typeCode": "5C-4",
    "runs": 1
  },
  {
    "id": "C052",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S20",
    "category": "OUTGOING",
    "loadKw": 3.0,
    "description": "1x5C-4mm2 Cu/XLPE/PVC",
    "typeCode": "5C-4",
    "runs": 1
  },
  {
    "id": "C053",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S21",
    "category": "OUTGOING",
    "loadKw": 3.0,
    "description": "1x5C-4mm2 Cu/XLPE/PVC",
    "typeCode": "5C-4",
    "runs": 1
  },
  {
    "id": "C054",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S22",
    "category": "OUTGOING",
    "loadKw": 3.0,
    "description": "1x5C-4mm2 Cu/XLPE/PVC",
    "typeCode": "5C-4",
    "runs": 1
  },
  {
    "id": "C055",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S23",
    "category": "OUTGOING",
    "loadKw": 22.0,
    "description": "1x5C-10mm2 Cu/XLPE/PVC",
    "typeCode": "5C-10",
    "runs": 1
  },
  {
    "id": "C056",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S24",
    "category": "OUTGOING",
    "loadKw": 22.0,
    "description": "1x5C-10mm2 Cu/XLPE/PVC",
    "typeCode": "5C-10",
    "runs": 1
  },
  {
    "id": "C057",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S25",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C058",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S26",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C059",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S27",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C060",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S28",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C061",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S29",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C062",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S30",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C063",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S31",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C064",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S32",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C065",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S33",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C066",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S34",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C067",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S35",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C068",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S36",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C069",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S37",
    "category": "OUTGOING",
    "loadKw": 2.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C070",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S38",
    "category": "OUTGOING",
    "loadKw": 2.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C071",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S39",
    "category": "OUTGOING",
    "loadKw": 2.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C072",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S40",
    "category": "OUTGOING",
    "loadKw": 0.8,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C073",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S41",
    "category": "OUTGOING",
    "loadKw": 1.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C074",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S42",
    "category": "OUTGOING",
    "loadKw": 0.6,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C075",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S43",
    "category": "OUTGOING",
    "loadKw": 1.2,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C076",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S44",
    "category": "OUTGOING",
    "loadKw": 0.6,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C077",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S45",
    "category": "OUTGOING",
    "loadKw": 2.0,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C078",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S46",
    "category": "OUTGOING",
    "loadKw": 0.6,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C079",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S47",
    "category": "OUTGOING",
    "loadKw": 0.6,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C080",
    "panel": "DB-RMW-L0-LP",
    "circuit": "DB-RMW-L0-LP-S48",
    "category": "OUTGOING",
    "loadKw": 0.6,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C081",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "INCOMING from MDB-RMW-L0-LP",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "1x4C-25mm2 Cu/XLPE/PVC",
    "typeCode": "4C-25",
    "runs": 1
  },
  {
    "id": "C082",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "INCOMING from MDB-RMW-L0-LP (E)",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "1x1C-16mm2 Cu/PVC G/Y",
    "typeCode": "1C-16",
    "runs": 1
  },
  {
    "id": "C083",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-01",
    "category": "OUTGOING",
    "loadKw": 0.185,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C084",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-02",
    "category": "OUTGOING",
    "loadKw": 0.01,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C085",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-03",
    "category": "OUTGOING",
    "loadKw": 0.01,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C086",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-04",
    "category": "OUTGOING",
    "loadKw": 0.168,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C087",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-05",
    "category": "OUTGOING",
    "loadKw": 0.115,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C088",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-06",
    "category": "OUTGOING",
    "loadKw": 0.135,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C089",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-07",
    "category": "OUTGOING",
    "loadKw": 0.02,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C090",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-08",
    "category": "OUTGOING",
    "loadKw": 0.01,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C091",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-09",
    "category": "OUTGOING",
    "loadKw": 0.115,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C092",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-10",
    "category": "OUTGOING",
    "loadKw": 0.01,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C093",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-11",
    "category": "OUTGOING",
    "loadKw": 0.02,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C094",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-12",
    "category": "OUTGOING",
    "loadKw": 0.02,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C095",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-13",
    "category": "OUTGOING",
    "loadKw": 22.2,
    "description": "1x5C-16mm2 Cu/XLPE/PVC",
    "typeCode": "5C-16",
    "runs": 1
  },
  {
    "id": "C096",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-14",
    "category": "OUTGOING",
    "loadKw": undefined,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C097",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-15",
    "category": "OUTGOING",
    "loadKw": undefined,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C098",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-15",
    "category": "OUTGOING",
    "loadKw": undefined,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C099",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-15",
    "category": "OUTGOING",
    "loadKw": undefined,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C100",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-16",
    "category": "OUTGOING",
    "loadKw": undefined,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C101",
    "panel": "CP-RMW-L0-MVAC",
    "circuit": "CP-RMW-L0-MVAC-17",
    "category": "OUTGOING",
    "loadKw": undefined,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C102",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "FIRE ALARM INTERLOCK (FRC)",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "1x2C-2.5mm2 Cu/MGT/XLPE/LSZH (FRC)",
    "typeCode": "2C-2.5",
    "runs": 1
  },
  {
    "id": "C103",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "INCOMING from DEG",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "2x4C-150mm2 Cu/XLPE/PVC",
    "typeCode": "4C-150",
    "runs": 2
  },
  {
    "id": "C104",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "INCOMING from DEG (E)",
    "category": "INCOMING",
    "loadKw": undefined,
    "description": "1x1C-95mm2 Cu/PVC G/Y",
    "typeCode": "1C-95",
    "runs": 1
  },
  {
    "id": "C105",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-01",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C106",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-02",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C107",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-03",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C108",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-04",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C109",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-05",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C110",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-06",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C111",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-07",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C112",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-08",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C113",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-09",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C114",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-10",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C115",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-11",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C116",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-12",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C117",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-13",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C118",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-14",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C119",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-15",
    "category": "OUTGOING",
    "loadKw": 11.0,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C120",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-16",
    "category": "OUTGOING",
    "loadKw": 0.284,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C121",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-17",
    "category": "OUTGOING",
    "loadKw": 0.284,
    "description": "1x3C-4mm2 Cu/XLPE/PVC",
    "typeCode": "3C-4",
    "runs": 1
  },
  {
    "id": "C122",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-18",
    "category": "OUTGOING",
    "loadKw": 18.1,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C123",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-19",
    "category": "OUTGOING",
    "loadKw": 18.1,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C124",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-20",
    "category": "OUTGOING",
    "loadKw": 14.7,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  },
  {
    "id": "C125",
    "panel": "CP-RMW-L1-MVAC",
    "circuit": "CP-RMW-L1-MVAC-21",
    "category": "OUTGOING",
    "loadKw": 14.7,
    "description": "1x5C-6mm2 Cu/XLPE/PVC",
    "typeCode": "5C-6",
    "runs": 1
  }
];

# Cable Tray Calculator & Visualizer

Cable tray sizing, cable arrangement and engineering checks, with a live 2D cross-section, a
3D visualiser, and Excel / PDF / DXF / BIM export. Indonesian and English, dark and light.

Built on the calculation in `CABLETRAYCALCULATION_RMW_1.xlsx` and the PT KMI Wire and Cable
datasheets supplied with the project.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # regression test against the reference workbook
npm run build
```

## What it does

| Area | Detail |
|---|---|
| Sizing | Method 1 (sum of cable diameters) and Method 2 (fill ratio by area), governing width, tray runs, fill verdict, alternative configurations, per-panel breakdown |
| Fill standards | `practice40` (the reference workbook's 40 % rule, default), NEC 392.22(A), IEC 60364-5-52 |
| Arrangement | Flat touching, flat spaced 1 × d, trefoil; multi-layer packing; smart auto-arranger; FRC divider segregation |
| 2D | SVG cross-section drawn in real millimetres with W/H dimensions, clearance and free-height callouts, per-cable tags, zoom and pan |
| 3D | Instanced cable bundles, tray shell and hangers, 360° orbit, exploded view slider, fly-through |
| Thermal | IEC 60364-5-52 grouping (Table B.52.17) and ambient correction (Table B.52.14), per-circuit utilisation, indicative heat map |
| Support | Deflection against the NEMA VE 1 span/180 limit, NEMA load class, hanger count, rod size, span sweep |
| Bending | Minimum radius per cable type, fitting check, straight-plus-bend pulling tension estimate |
| Export | Live-formula Excel workbook, formal PDF report with 2D/3D snapshots and a calculation stamp, DXF at 1:1 in mm, generic BIM JSON, standalone SVG |

## Architecture

```
src/core/        calculation engine - plain TypeScript, no React, unit tested
  catalog/       KMI datasheet data (generated) + project cable types
  traySizing.ts  port of the reference workbook's TRAY CALCULATION sheet
  arranger.ts    cable coordinates - the single geometry source for 2D, 3D and DXF
  derating.ts    grouping + ambient correction and the thermal ranking
  support.ts     weight, span, deflection, hanger capacity
  bending.ts     minimum radius and pulling tension
src/store/       zustand state + the one hook every view derives its numbers from
src/components/  UI, 2D section, 3D scene, engineering tabs
src/export/      xlsx, pdf, dxf, BIM json, standalone svg
```

The rule the codebase follows: **one calculation, many views.** `useCalculations` produces every
derived number once, and the tables, the cross-section, the 3D scene and all five exports read
from it. A drawing can never disagree with the numbers next to it.

## Verification

`npm run test` checks the engine against `CABLETRAYCALCULATION_RMW_1.xlsx` cell for cell:

| Quantity | Expected |
|---|---|
| Total cable runs | 126 |
| Σ OD | 1 982.5 mm |
| Σ A | 29 453.4129 mm² |
| Method 1, per layer | 944.9917 mm |
| Method 2, required width | 957.2359 mm |
| Governing width | 957.2359 mm |
| Tray runs @ 600 mm | 2 |
| Actual fill | 8.1815 % |

The exported workbook was independently recalculated from its own formulas and reproduces the
same figures, so the Excel file is a live calculation, not a snapshot of numbers.

## Data provenance - read before issuing a calculation

**Verified.** The 153 catalogue entries under `src/core/catalog/kmi.ts` are transcribed from the
PT KMI Wire and Cable Tbk datasheets supplied with this project: NYA 450/750 V (12104-01),
NYY 1–5 core and NYFGbY 2–5 core 0.6/1 kV (14233-xx, 16233-xx), Rev. 2.0 / 2009. Outer diameter,
weight, DC/AC resistance, inductance, ampacity and short-circuit current all come from those
sheets.

**Not verified.** The twelve entries in `src/core/catalog/project.ts` are the cable types the
reference workbook was built on. That workbook states its own ODs "MUST be verified against the
manufacturer catalogue actually used", so every entry is flagged `verified: false` and shown with
an amber marker in the UI and an `UNVERIFIED` tag in the exports. Their weight, ampacity and
resistance are borrowed from the closest KMI size, because the XLPE (N2XY) and FRC datasheets
were not supplied — conservative for XLPE, which runs at 90 °C against PVC's 70 °C.

**Indicative, replace before a formal submission.** Tray self-weight and the section property
behind the deflection check are modelled from a plain C-channel; substitute the tray
manufacturer's published values. NEMA VE 1 class load/span figures, threaded-rod capacities and
the NEC 392.22(A) fill allowance are nominal published values — confirm against the code book and
the product certificate.

**Scope limit on the heat map.** The thermal colour gradient combines each cable's derated
loading with how enclosed it is by its neighbours. It is an indicative ranking that shows where
to look, not an IEC 60287 conductor temperature — IEC 60287 needs soil/air thermal resistivity,
per-circuit load factors and actual conductor temperatures, none of which a panel schedule
contains.

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
| Input | Sample panel schedule on first run, manual entry, or import from any Excel / CSV schedule - the TYPE and OD columns are located by header name or, failing that, by content |
| Title block | Company name and logo, project name, drawing number, revision and date - printed on the PDF title block and footer, the Excel title rows and the section drawing caption |
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
  labelLayout.ts tag anchor spreading - shared by the 2D view, the SVG/PDF section and DXF
src/import/      Excel / CSV schedule reader - header band detection + catalogue matching
src/data/        sampleSchedule.ts   (what "Load sample data" loads: DB-RMW-L0-LP, 81 circuits)
                 referenceSchedule.ts (the workbook fixture the engine is verified against)
src/store/       zustand state + the one hook every view derives its numbers from
src/components/  UI, 2D section, 3D scene, engineering tabs
src/export/      xlsx, pdf, dxf, BIM json, standalone svg
```

The rule the codebase follows: **one calculation, many views.** `useCalculations` produces every
derived number once, and the tables, the cross-section, the 3D scene and all five exports read
from it. A drawing can never disagree with the numbers next to it.

Company name and logo live in the project block on the Export tab. The logo is downscaled to
320 px on upload before it reaches the store, so persisting it in localStorage stays cheap
(~4 kB), and it is drawn on the PDF title block over a white plate - a dark transparent logo
would otherwise vanish into the navy band.

The three heavy dependencies are loaded on demand, not at start-up: Three.js when the 3D tab is
first opened, jsPDF/ExcelJS on the export button that needs them, and ExcelJS again on the schedule
import. The initial bundle is ~347 kB (95 kB gzipped); the lazy vendor chunks are larger than
Vite's 500 kB warning threshold by design, which is why the build prints that warning.

## Verification

`npm run test` checks the engine against `CABLETRAYCALCULATION_RMW_1.xlsx` cell for cell, using
`src/data/referenceSchedule.ts` as the fixture (that file exists for this test - the sample data
the UI loads is a different schedule and must not be substituted for it):

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

## Importing a schedule

`Import Excel/CSV` on the Schedule tab reads the file entirely in the browser. Panel schedule
templates differ from office to office, so the parser does not assume a fixed layout:

1. **Header band.** The header row is scored on keywords, then extended into the rows next to it,
   so a two-row merged header (`DEMAND LOAD (WATT)` above `R / S / T`) becomes one label per
   column. A value repeated across a merged range is scored once, otherwise a title banner
   stretched over the table outscores the real header.
2. **TYPE column** - by header name (`TYPE`, `TIPE`, `CABLE`, `DESCRIPTION`, ...), or, if no header
   matches, by content: the column whose cells read like cable specifications.
3. **OD column** - by header name (`OD`, `DIAMETER`, `Ø`), or by content: a numeric column filled
   on most data rows whose values land on catalogue ODs. Columns captioned watt, ampere, kW, load
   or qty are never considered, which keeps fixture-count columns out.
4. **Catalogue match** - `NYY 3C x 2.5mm2`, `1x4C-10mm2 Cu/XLPE/PVC`, `4C25` and `4 x 25` all
   resolve to cores + size; the family prefix narrows it, and the file's own OD breaks the tie and
   is cross-checked. A row whose OD disagrees with the catalogue entry is reported as a warning
   rather than silently accepted.
5. Panel name is taken from a `PANEL` column, else from the title block above the table. Rows
   captioned TOTAL / SUB TOTAL / notes, and note rows merged across the full table width, are
   dropped.

The preview dialog states which sheet, header row and TYPE / OD columns were used, so the
mapping can be checked before the rows are applied. `src/import/__tests__/` holds a real panel
schedule (`DB-RMW-L0-LP`, TYPE in column D, OD in column AO, 30+ fixture columns in between) as a
regression fixture; the sample data shipped in the app is generated from it through this same
importer.

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

**Sample data.** `src/data/sampleSchedule.ts` is the DB-RMW-L0-LP panel schedule of the Hanuman
Brewery Expansion Phase 3 Raw Material project (Rev. 3), 81 circuits. All four cable types it uses
(NYY 3C x 2.5 / 3C x 4 / 5C x 4 / 5C x 6 mm2) carry the same ODs as the KMI datasheets, so every
row matches a verified catalogue entry.

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

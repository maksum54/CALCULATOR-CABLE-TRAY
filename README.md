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
| Input | Sample panel schedule on first run, manual entry, a blank Excel template to fill in, or import from any Excel / CSV schedule - the TYPE and OD columns are located by header name or, failing that, by content |
| Title block | Company name and logo, project name, drawing number, revision and date - printed on the PDF title block and footer, the Excel title rows and the section drawing caption |
| Sizing | Method 1 (sum of cable diameters) and Method 2 (fill ratio by area), governing width, tray runs, fill verdict, alternative configurations, per-panel breakdown |
| Fill standards | `practice40` (the reference workbook's 40 % rule, default), NEC 392.22(A), IEC 60364-5-52 |
| Arrangement | Flat touching, flat spaced 1 × d, trefoil; multi-layer packing; smart auto-arranger; FRC divider segregation |
| 2D | SVG cross-section drawn in real millimetres with W/H dimensions, clearance and free-height callouts, per-cable tags, zoom and pan |
| 3D | Instanced cable bundles, tray shell and hangers, 360° orbit, exploded view slider, fly-through |
| Thermal | IEC 60364-5-52 grouping (Table B.52.17) and ambient correction (Table B.52.14), per-circuit utilisation, indicative heat map |
| Support | Deflection against the NEMA VE 1 span/180 limit, NEMA load class, hanger count, rod size, span sweep |
| Bending | Minimum radius per cable type, fitting check, straight-plus-bend pulling tension estimate |
| Export | Live-formula Excel workbook, blank Excel schedule template, formal PDF report with 2D/3D snapshots and a calculation stamp, DXF at 1:1 in mm, generic BIM JSON, standalone SVG |

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
   resolve to cores + size. The family is then taken from the trade name if the file states one,
   otherwise from the **construction string**, which is what schedules here normally write:
   `Cu/XLPE/PVC` is N2XY, `Cu/PVC/PVC` is NYY, a single-core `Cu/PVC` is NYA, `SFWA` / `FGb` is
   armoured NYFGbY, and `LSZH` / `MGT` is FRC. Only then does the file's OD break the tie, and
   only between entries of the family already chosen - a diameter can never move a cable to a
   different family, because the ODs in a schedule are typical values while the construction is
   a statement of what the cable is. A row whose OD disagrees with the catalogue entry is
   reported as a warning rather than silently accepted.
5. Panel name is taken from a `PANEL` column, else from the title block above the table. Rows
   captioned TOTAL / SUB TOTAL / notes, and note rows merged across the full table width, are
   dropped.

The preview dialog states which sheet, header row and TYPE / OD columns were used, so the
mapping can be checked before the rows are applied. Applying a schedule reopens the panel
filter, and the store keeps that filter consistent with the schedule under it on every edit:
a filter naming a panel that no longer exists would otherwise hide every row in the app, while
the dropdown - a `<select>` whose value matches none of its options - falls back to displaying
"All panels", so the screen would read "all panels, zero cables". `src/import/__tests__/` holds three real
workbooks as regression fixtures, deliberately different from one another: a panel schedule
(`DB-RMW-L0-LP`, TYPE in column D, OD in column AO, 30+ fixture columns in between), and two
cable tray calculation workbooks whose schedules sit in different columns
(`DB-UTILITY`, TYPE in I and OD in K; `FGW`, TYPE in G and OD in I, 166 circuits over four
panels). The sample data shipped in the app is generated from the first one through this same
importer.

Where a cable tray calculation workbook carries its own `CABLE DATA (OD)` sheet, the diameters
are read from it: the OD column on the schedule sheet is usually an `INDEX`/`MATCH` formula, and
a file written by a program has no cached result for it, so the cell reads as empty. The type
code is looked up in that sheet instead, which is how the app arrives at the same diameters the
workbook itself would display.

## The Excel template

`Template Excel`, next to the import button, downloads a blank workbook in the same four-sheet
shape - `CABLE DATA (OD)`, `CABLE SCHEDULE`, `SUMMARY BY TYPE`, `TRAY CALCULATION` - with the
header captions in whichever language the app is set to. Only the yellow cells are typed in;
OD, total width, total area, the per-type / per-panel / per-category summaries and the whole
tray sizing are live formulas, so the workbook calculates on its own in Excel with no app
involved. The TYPE column is a dropdown restricted to the codes on the OD sheet, which is what
guarantees the file imports again: `src/export/__tests__/scheduleTemplate.test.ts` sends the
generated workbook straight back through the real importer, in both languages, and checks the
schedule comes out with the same rows, types and sizing it went in with.

Rows already in the app are written into the template as a worked example, followed by 60 blank
input rows. An empty schedule still produces a usable template - the OD table, the formulas and
the blank rows are all there. Note that the workbook's formulas are not recalculated by the test
suite (no spreadsheet engine is available in CI); what is checked is that they are the same
expressions `src/core/traySizing.ts` evaluates and that every reference resolves.

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
contains. Loading sets the level and enclosure can only nudge it upwards within the headroom a
compliant cable still has, so the bar tracks the utilisation printed beside it and the end of
the scale is reserved for a cable at or above its derated ampacity.

**Utilisation is measured against the derated ampacity, not the catalogue figure.** A 71 A
cable on a tray shared with 9+ others in two layers at 35 °C carries 71 × 0.68 × 0.96 = 46.3 A,
so a 34 A load reads 74 %, not 48 %. The grouping factor comes from the number of cables and
the number of layers, and the ambient correction from the site temperature — all three are
editable design parameters. Note that Table B.52.17's rows are *trays*, and the app feeds them
the number of cable **layers**: a conservative reading, since IEC 60364-5-52 requires a further
reduction for cables stacked in more than one layer but does not tabulate one. Setting the
layer count to 1 (more tray runs, none stacked) moves the factor from 0.68 to 0.73.

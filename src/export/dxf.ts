// DXF R12 (ASCII) writer for the tray cross-section.
//
// R12 is the most widely readable DXF flavour - AutoCAD, BricsCAD, DraftSight, LibreCAD and
// every viewer open it without complaint. Geometry is written 1:1 in millimetres, taken
// directly from the arranger, so the CAD file measures exactly what the calculation says.
//
// Layers: TRAY, CABLE, CABLE-CORE, DIM, TEXT, CLEARANCE, DIVIDER.

import type { TrayArrangement } from '../core/arranger';
import type { TrayType } from '../core/types';
import { LABEL_PITCH_MM, layoutLabelAnchors } from '../core/labelLayout';

const RAIL = 6;

/** AutoCAD Color Index per layer. */
const LAYERS: [string, number][] = [
  ['TRAY', 8],
  ['CABLE', 5],
  ['CABLE-CORE', 251],
  ['DIM', 3],
  ['TEXT', 7],
  ['CLEARANCE', 4],
  ['DIVIDER', 2],
];

class DxfBuilder {
  private out: string[] = [];

  private code(code: number, value: string | number): void {
    this.out.push(String(code), String(value));
  }

  line(layer: string, x1: number, y1: number, x2: number, y2: number): void {
    this.code(0, 'LINE');
    this.code(8, layer);
    this.code(10, x1.toFixed(4));
    this.code(20, y1.toFixed(4));
    this.code(30, 0);
    this.code(11, x2.toFixed(4));
    this.code(21, y2.toFixed(4));
    this.code(31, 0);
  }

  circle(layer: string, x: number, y: number, r: number): void {
    this.code(0, 'CIRCLE');
    this.code(8, layer);
    this.code(10, x.toFixed(4));
    this.code(20, y.toFixed(4));
    this.code(30, 0);
    this.code(40, r.toFixed(4));
  }

  rect(layer: string, x: number, y: number, w: number, h: number): void {
    this.line(layer, x, y, x + w, y);
    this.line(layer, x + w, y, x + w, y + h);
    this.line(layer, x + w, y + h, x, y + h);
    this.line(layer, x, y + h, x, y);
  }

  text(layer: string, x: number, y: number, height: number, value: string, rotation = 0): void {
    this.code(0, 'TEXT');
    this.code(8, layer);
    this.code(10, x.toFixed(4));
    this.code(20, y.toFixed(4));
    this.code(30, 0);
    this.code(40, height.toFixed(3));
    this.code(1, value.replace(/\n/g, ' '));
    if (rotation) this.code(50, rotation);
  }

  build(): string {
    const head: string[] = [];
    const put = (c: number, v: string | number) => head.push(String(c), String(v));

    put(0, 'SECTION');
    put(2, 'HEADER');
    put(9, '$ACADVER');
    put(1, 'AC1009');
    put(9, '$INSUNITS');
    put(70, 4); // millimetres
    put(0, 'ENDSEC');

    put(0, 'SECTION');
    put(2, 'TABLES');
    put(0, 'TABLE');
    put(2, 'LAYER');
    put(70, LAYERS.length);
    for (const [name, color] of LAYERS) {
      put(0, 'LAYER');
      put(2, name);
      put(70, 0);
      put(62, color);
      put(6, 'CONTINUOUS');
    }
    put(0, 'ENDTAB');
    put(0, 'ENDSEC');

    put(0, 'SECTION');
    put(2, 'ENTITIES');

    return [...head, ...this.out, '0', 'ENDSEC', '0', 'EOF', ''].join('\r\n');
  }
}

export interface DxfOptions {
  tray: TrayArrangement;
  trayWidthMm: number;
  trayHeightMm: number;
  trayType: TrayType;
  edgeClearanceMm: number;
  title: string;
  subtitle: string;
  showLabels: boolean;
}

export function buildSectionDxf(o: DxfOptions): string {
  const d = new DxfBuilder();
  const { tray, trayWidthMm: W, trayHeightMm: H } = o;

  // Tray shell
  d.rect('TRAY', -RAIL, -RAIL, RAIL, H + RAIL);
  d.rect('TRAY', W, -RAIL, RAIL, H + RAIL);
  d.rect('TRAY', -RAIL, -RAIL, W + 2 * RAIL, RAIL);
  if (o.trayType === 'ladder') {
    for (let x = 40; x < W; x += 80) d.rect('TRAY', x - 12, -RAIL + 1, 24, RAIL - 2);
  }

  // Clearance zones
  if (o.edgeClearanceMm > 0) {
    d.rect('CLEARANCE', 0, 0, o.edgeClearanceMm, H);
    d.rect('CLEARANCE', W - o.edgeClearanceMm, 0, o.edgeClearanceMm, H);
  }

  if (tray.dividerXMm !== undefined) {
    d.rect('DIVIDER', tray.dividerXMm - 1.5, 0, 3, H);
    d.text('TEXT', tray.dividerXMm + 5, H - 12, 5, 'FRC DIVIDER');
  }

  // Cables - outer sheath plus a core marker, so the drawing reads as cable, not as a dot
  for (const c of tray.cables) {
    d.circle('CABLE', c.x, c.y, c.r);
    d.circle('CABLE-CORE', c.x, c.y, c.r * 0.42);
  }

  // Cable tags in a band above the tray, matching the on-screen drawing - same anchor
  // spreading, so the DXF and the PDF section carry identical tag positions.
  if (o.showLabels) {
    const anchors = layoutLabelAnchors(tray.cables.map((c) => c.x), {
      pitchMm: LABEL_PITCH_MM,
      minX: 0,
      maxX: W,
    });
    tray.cables.forEach((c, i) => {
      const top = c.y + c.r + 1;
      const kink = top + (H + 6 - top) * 0.45;
      d.line('DIM', c.x, top, c.x, kink);
      d.line('DIM', c.x, kink, anchors[i], H + 7);
      d.text('TEXT', anchors[i] - 1.8, H + 9, 4.5, c.label, 90);
    });
  }

  // Dimensions
  d.line('DIM', 0, -24, W, -24);
  d.line('DIM', 0, -RAIL - 2, 0, -28);
  d.line('DIM', W, -RAIL - 2, W, -28);
  d.text('DIM', W / 2 - 30, -38, 9, `W = ${W} mm`);

  d.line('DIM', -26, 0, -26, H);
  d.line('DIM', -RAIL - 2, 0, -30, 0);
  d.line('DIM', -RAIL - 2, H, -30, H);
  d.text('DIM', -40, H / 2 - 25, 9, `H = ${H} mm`, 90);

  if (o.edgeClearanceMm > 0) {
    d.line('DIM', 0, -12, o.edgeClearanceMm, -12);
    d.text('DIM', o.edgeClearanceMm + 4, -15, 6, `CLEARANCE ${o.edgeClearanceMm} mm`);
  }

  const topOfCables = tray.cables.reduce((m, c) => Math.max(m, c.y + c.r), 0);
  if (H - topOfCables > 4) {
    d.line('DIM', W + 18, topOfCables, W + 18, H);
    d.text('DIM', W + 24, (topOfCables + H) / 2 - 3, 6, `FREE ${(H - topOfCables).toFixed(0)} mm`);
  }

  // Title block
  d.text('TEXT', 0, H + 115, 12, o.title);
  d.text('TEXT', 0, H + 100, 7, o.subtitle);

  return d.build();
}

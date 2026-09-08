// Self-contained cross-section SVG for the exports.
//
// The on-screen component paints with CSS custom properties, which do not survive being pulled
// out of the document. This builds the same drawing with literal colours so it can be rasterised
// for the PDF, saved as a standalone .svg, or handed to any other consumer unchanged.

import type { TrayArrangement } from '../core/arranger';
import type { TrayType } from '../core/types';
import { heatColor, typeColor } from '../core/colors';

export interface SectionSvgOptions {
  tray: TrayArrangement;
  trayWidthMm: number;
  trayHeightMm: number;
  trayType: TrayType;
  edgeClearanceMm: number;
  showLabels: boolean;
  showHeatmap: boolean;
  heatByRun?: Map<string, number>;
  title: string;
  subtitle: string;
  /** Light background for print, dark for the on-screen look. */
  dark?: boolean;
}

const RAIL = 6;
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildSectionSvg(o: SectionSvgOptions): string {
  const { tray, trayWidthMm: W, trayHeightMm: H, trayType, edgeClearanceMm } = o;
  const ink = o.dark ? '#e8eef8' : '#0f172a';
  const soft = o.dark ? '#9aa8bd' : '#5b6779';
  const metal = o.dark ? '#7c8ba1' : '#94a3b8';
  const metalDark = o.dark ? '#4a5768' : '#64748b';
  const bg = o.dark ? '#0b1220' : '#ffffff';

  const labelBand = o.showLabels ? 95 : 0;
  const mLeft = 70;
  const mRight = 130;
  const mBottom = 70;
  const mTop = 40 + labelBand;
  const vbW = W + mLeft + mRight;
  const vbH = H + mTop + mBottom;

  const parts: string[] = [];
  const push = (s: string) => parts.push(s);

  // Everything below is drawn in tray space; the wrapping <g> flips y to engineering sense.
  push(`<rect x="${-mLeft}" y="${-mBottom}" width="${vbW}" height="${vbH}" fill="${bg}"/>`);

  // Tray shell
  push(`<rect x="${-RAIL}" y="${-RAIL}" width="${RAIL}" height="${H + RAIL}" fill="${metal}"/>`);
  push(`<rect x="${W}" y="${-RAIL}" width="${RAIL}" height="${H + RAIL}" fill="${metal}"/>`);
  push(`<rect x="${-RAIL}" y="${-RAIL}" width="${W + 2 * RAIL}" height="${RAIL}" fill="${metal}"/>`);
  if (trayType === 'ladder') {
    for (let x = 40; x < W; x += 80) {
      push(`<rect x="${x - 12}" y="${-RAIL + 1}" width="24" height="${RAIL - 2}" fill="${metalDark}"/>`);
    }
  }

  // Edge clearance zones
  if (edgeClearanceMm > 0) {
    push(`<rect x="0" y="0" width="${edgeClearanceMm}" height="${H}" fill="#2563eb" opacity="0.08"/>`);
    push(`<rect x="${W - edgeClearanceMm}" y="0" width="${edgeClearanceMm}" height="${H}" fill="#2563eb" opacity="0.08"/>`);
  }

  // FRC divider
  if (tray.dividerXMm !== undefined) {
    push(`<rect x="${tray.dividerXMm - 1.5}" y="0" width="3" height="${H}" fill="#b45309"/>`);
  }

  // Cables
  for (const c of tray.cables) {
    const key = `${c.runId}#${c.runIndex}`;
    const fill = o.showHeatmap ? heatColor(o.heatByRun?.get(key) ?? 0) : typeColor(c.typeCode);
    push(
      `<circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="${c.r.toFixed(2)}" fill="${fill}" stroke="rgba(0,0,0,0.45)" stroke-width="${Math.max(0.35, c.r * 0.06).toFixed(2)}"/>`,
    );
    push(`<circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="${(c.r * 0.42).toFixed(2)}" fill="rgba(0,0,0,0.16)"/>`);
  }

  // Cable tags in a band above the tray, with leader lines
  if (o.showLabels) {
    for (const c of tray.cables) {
      const top = c.y + c.r;
      push(`<line x1="${c.x.toFixed(2)}" y1="${(top + 1).toFixed(2)}" x2="${c.x.toFixed(2)}" y2="${H + 7}" stroke="${typeColor(c.typeCode)}" stroke-width="0.4" opacity="0.6"/>`);
      const label = c.label.length > 26 ? `${c.label.slice(0, 25)}...` : c.label;
      push(
        `<g transform="translate(${c.x.toFixed(2)}, ${H + 8}) scale(1,-1) rotate(-90)"><text x="0" y="0" font-size="5.2" font-family="Helvetica, Arial, sans-serif" font-weight="600" fill="${ink}" dominant-baseline="central">${esc(label)}</text></g>`,
      );
    }
  }

  // Dimensions
  const dim = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${soft}" stroke-width="0.7" marker-start="url(#as)" marker-end="url(#ae)"/>`;
  push(dim(0, -24, W, -24));
  push(`<line x1="0" y1="${-RAIL - 2}" x2="0" y2="-28" stroke="${soft}" stroke-width="0.5" stroke-dasharray="3 2"/>`);
  push(`<line x1="${W}" y1="${-RAIL - 2}" x2="${W}" y2="-28" stroke="${soft}" stroke-width="0.5" stroke-dasharray="3 2"/>`);
  push(`<g transform="translate(${W / 2}, -32) scale(1,-1)"><text text-anchor="middle" font-size="11" font-family="Helvetica, Arial, sans-serif" font-weight="700" fill="${ink}">W = ${W} mm</text></g>`);

  push(dim(-26, 0, -26, H));
  push(`<g transform="translate(-34, ${H / 2}) scale(1,-1) rotate(-90)"><text text-anchor="middle" font-size="11" font-family="Helvetica, Arial, sans-serif" font-weight="700" fill="${ink}">H = ${H} mm</text></g>`);

  if (edgeClearanceMm > 0) {
    push(dim(0, -12, edgeClearanceMm, -12));
    push(`<g transform="translate(${edgeClearanceMm + 4}, -14) scale(1,-1)"><text font-size="7.5" font-family="Helvetica, Arial, sans-serif" fill="${soft}">Clearance ${edgeClearanceMm} mm</text></g>`);
  }

  const topOfCables = tray.cables.reduce((m, c) => Math.max(m, c.y + c.r), 0);
  if (H - topOfCables > 4) {
    push(dim(W + 18, topOfCables, W + 18, H));
    push(`<g transform="translate(${W + 24}, ${(topOfCables + H) / 2}) scale(1,-1)"><text font-size="8" font-family="Helvetica, Arial, sans-serif" fill="${soft}">free ${(H - topOfCables).toFixed(0)} mm</text></g>`);
  }

  const marker = (id: string, d: string) =>
    `<marker id="${id}" markerWidth="8" markerHeight="8" refX="${id === 'as' ? 7 : 1}" refY="4" orient="auto"><path d="${d}" fill="none" stroke="${soft}" stroke-width="1"/></marker>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-mLeft} ${-mTop} ${vbW} ${vbH}" width="${vbW * 2}" height="${vbH * 2}">`,
    `<defs>${marker('as', 'M8,1 L1,4 L8,7')}${marker('ae', 'M1,1 L8,4 L1,7')}</defs>`,
    `<rect x="${-mLeft}" y="${-mTop}" width="${vbW}" height="${vbH}" fill="${bg}"/>`,
    `<g transform="translate(0, ${H}) scale(1, -1)">${parts.join('')}</g>`,
    `<text x="${-mLeft + 12}" y="${-mTop + 18}" font-size="13" font-family="Helvetica, Arial, sans-serif" font-weight="700" fill="${ink}">${esc(o.title)}</text>`,
    `<text x="${-mLeft + 12}" y="${-mTop + 33}" font-size="9.5" font-family="Helvetica, Arial, sans-serif" fill="${soft}">${esc(o.subtitle)}</text>`,
    '</svg>',
  ].join('');
}

/** Rasterise an SVG string to a PNG data URL, for embedding in the PDF. */
export function svgToPng(svg: string, pixelWidth = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const ratio = img.height / img.width || 0.4;
      const canvas = document.createElement('canvas');
      canvas.width = pixelWidth;
      canvas.height = Math.round(pixelWidth * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('2D canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('could not rasterise the cross-section'));
    };
    img.src = url;
  });
}

/** Grab the live WebGL canvas, when the 3D tab has been opened at least once. */
export function capture3D(): string | null {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-engine]');
  if (!canvas) return null;
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

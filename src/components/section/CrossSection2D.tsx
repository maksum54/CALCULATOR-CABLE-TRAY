// High-precision 2D cross-section of the tray, drawn as SVG in real millimetres.
//
// The whole drawing lives in a viewBox expressed in mm with y flipped, so a circle plotted at
// (x, y, r) from the arranger lands exactly where the calculation says it does - no scaling
// fudge anywhere. That also makes the DXF export a direct transcription of these coordinates.

import { useCallback, useMemo, useRef, useState } from 'react';
import type { PlacedCable, TrayType } from '../../core/types';
import type { TrayArrangement } from '../../core/arranger';
import { heatColor, shade, typeColor } from '../../core/colors';
import { findEntry } from '../../core/catalog';

export interface CrossSectionProps {
  tray: TrayArrangement;
  trayWidthMm: number;
  trayHeightMm: number;
  trayType: TrayType;
  showLabels: boolean;
  showDimensions: boolean;
  showHeatmap: boolean;
  showGrid: boolean;
  showCover: boolean;
  edgeClearanceMm: number;
  /** runId -> 0..1 thermal ranking from the derating engine. */
  heatByRun: Map<string, number>;
  selectedRunId: string | null;
  onSelect?: (runId: string | null) => void;
  labelClearance: string;
  labelDivider: string;
  labelFree: string;
  /** Rendered into the SVG so exported snapshots carry their own caption. */
  caption?: string;
}

const RAIL = 6; // side rail thickness, mm
/** Above this many cables in one tray the tags stop being readable, so they are suppressed. */
const LABEL_LIMIT = 90;
/** Height of the tag band above the tray (mm), enough for a 26-character rotated label. */
const LABEL_BAND_MM = 95;

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}...`;

export function CrossSection2D(props: CrossSectionProps) {
  const {
    tray, trayWidthMm, trayHeightMm, trayType, showLabels, showDimensions, showHeatmap,
    showGrid, showCover, edgeClearanceMm, heatByRun, selectedRunId, onSelect,
    labelClearance, labelDivider, labelFree, caption,
  } = props;

  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<PlacedCable | null>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Margins around the tray, sized for the dimension lines, the right-hand callouts and the
  // label band that carries the rotated cable tags above the tray.
  const margin = Math.max(70, trayWidthMm * 0.11);
  const labelBand = showLabels && tray.cables.length <= LABEL_LIMIT ? LABEL_BAND_MM : 0;
  const marginRight = margin + 60;
  const marginTop = margin + labelBand;
  const viewW = trayWidthMm + margin + marginRight;
  const viewH = trayHeightMm + margin + marginTop;

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(8, Math.max(0.5, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mmPerPx = viewW / zoom / rect.width;
    setPan({
      x: drag.current.panX - (e.clientX - drag.current.x) * mmPerPx,
      y: drag.current.panY + (e.clientY - drag.current.y) * mmPerPx,
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const viewBox = useMemo(() => {
    const w = viewW / zoom;
    const h = viewH / zoom;
    const cx = trayWidthMm / 2 + (marginRight - margin) / 2 + pan.x;
    const cy = trayHeightMm / 2 + (marginTop - margin) / 2 + pan.y;
    // y is flipped by the outer <g transform="scale(1,-1)">, so the box is built in tray space.
    return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
  }, [viewW, viewH, zoom, pan, trayWidthMm, trayHeightMm, margin, marginRight, marginTop]);

  const gridStep = trayWidthMm > 600 ? 100 : 50;
  const gridLines: number[] = [];
  for (let x = 0; x <= trayWidthMm; x += gridStep) gridLines.push(x);

  const cableFill = (c: PlacedCable): string =>
    showHeatmap ? heatColor(heatByRun.get(`${c.runId}#${c.runIndex}`) ?? 0) : typeColor(c.typeCode);

  const topOfCables = tray.cables.reduce((m, c) => Math.max(m, c.y + c.r), 0);
  const freeHeight = trayHeightMm - topOfCables;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab active:cursor-grabbing touch-none select-none"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        data-cross-section
      >
        <defs>
          <linearGradient id="railGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--tray-metal)" />
            <stop offset="100%" stopColor="var(--tray-metal-dark)" />
          </linearGradient>
          <radialGradient id="cableShine" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
          </radialGradient>
          <marker id="arrowStart" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M8,1 L1,4 L8,7" fill="none" stroke="var(--dim-line)" strokeWidth="1" />
          </marker>
          <marker id="arrowEnd" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
            <path d="M1,1 L8,4 L1,7" fill="none" stroke="var(--dim-line)" strokeWidth="1" />
          </marker>
        </defs>

        {/* Flip y so the drawing is in engineering orientation, origin bottom-left. */}
        <g transform={`translate(0, ${trayHeightMm}) scale(1, -1)`}>
          {showGrid && (
            <g opacity="0.9">
              {gridLines.map((x) => (
                <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={trayHeightMm} stroke="var(--grid-line)" strokeWidth="0.6" />
              ))}
              {Array.from({ length: Math.floor(trayHeightMm / 25) + 1 }, (_, i) => i * 25).map((y) => (
                <line key={`gy${y}`} x1={0} y1={y} x2={trayWidthMm} y2={y} stroke="var(--grid-line)" strokeWidth="0.6" />
              ))}
            </g>
          )}

          {/* Tray body */}
          <g>
            <rect x={-RAIL} y={-RAIL} width={RAIL} height={trayHeightMm + RAIL} fill="url(#railGrad)" rx="1.5" />
            <rect x={trayWidthMm} y={-RAIL} width={RAIL} height={trayHeightMm + RAIL} fill="url(#railGrad)" rx="1.5" />
            <rect x={-RAIL} y={-RAIL} width={trayWidthMm + 2 * RAIL} height={RAIL} fill="url(#railGrad)" rx="1.5" />
            {trayType === 'ladder' &&
              Array.from({ length: Math.floor(trayWidthMm / 80) }, (_, i) => (i + 0.5) * 80).map((x) => (
                <rect key={`rung${x}`} x={x - 12} y={-RAIL + 1} width={24} height={RAIL - 2} fill="var(--tray-metal-dark)" opacity="0.75" rx="1" />
              ))}
            {trayType === 'perforated' &&
              Array.from({ length: Math.floor(trayWidthMm / 30) }, (_, i) => (i + 0.5) * 30).map((x) => (
                <rect key={`perf${x}`} x={x - 6} y={-RAIL + 1.5} width={12} height={RAIL - 3} fill="var(--bg-base)" opacity="0.5" rx="1" />
              ))}
            {showCover && (
              <rect x={-RAIL} y={trayHeightMm} width={trayWidthMm + 2 * RAIL} height={RAIL} fill="url(#railGrad)" rx="1.5" opacity="0.92" />
            )}
          </g>

          {/* Edge clearance hatching */}
          {edgeClearanceMm > 0 && (
            <g opacity="0.5">
              <rect x={0} y={0} width={edgeClearanceMm} height={trayHeightMm} fill="var(--accent)" opacity="0.07" />
              <rect x={trayWidthMm - edgeClearanceMm} y={0} width={edgeClearanceMm} height={trayHeightMm} fill="var(--accent)" opacity="0.07" />
            </g>
          )}

          {/* FRC divider */}
          {tray.dividerXMm !== undefined && (
            <g>
              <rect x={tray.dividerXMm - 1.5} y={0} width={3} height={trayHeightMm} fill="var(--warn)" opacity="0.85" rx="1" />
              <g transform={`translate(${tray.dividerXMm + 5}, ${trayHeightMm - 6}) scale(1,-1)`}>
                <text fontSize="7" fill="var(--warn)" fontWeight="600">{labelDivider}</text>
              </g>
            </g>
          )}

          {/* Cables */}
          {tray.cables.map((c) => {
            const key = `${c.runId}#${c.runIndex}`;
            const base = cableFill(c);
            const selected = selectedRunId === c.runId;
            const hovered = hover?.runId === c.runId && hover?.runIndex === c.runIndex;
            return (
              <g key={key} onPointerEnter={() => setHover(c)} onPointerLeave={() => setHover(null)} onClick={() => onSelect?.(selected ? null : c.runId)} style={{ cursor: 'pointer' }}>
                <circle cx={c.x} cy={c.y} r={c.r} fill={base} stroke={shade(showHeatmap ? '#333333' : typeColor(c.typeCode), 0.45)} strokeWidth={Math.max(0.4, c.r * 0.06)} />
                <circle cx={c.x} cy={c.y} r={c.r} fill="url(#cableShine)" />
                {/* Conductor cores hinted at, so the drawing reads as a cable and not a dot. */}
                <circle cx={c.x} cy={c.y} r={c.r * 0.42} fill="rgba(0,0,0,0.18)" />
                {(selected || hovered) && (
                  <circle cx={c.x} cy={c.y} r={c.r + 1.6} fill="none" stroke="var(--accent)" strokeWidth="1.4" />
                )}
              </g>
            );
          })}

          {/* Cable tags in a band above the tray, with leader lines - drawing-office style */}
          {showLabels && tray.cables.length <= LABEL_LIMIT && (
            <g>
              {tray.cables.map((c) => {
                const top = c.y + c.r;
                const bandBase = trayHeightMm + 8;
                return (
                  <g key={`lb${c.runId}#${c.runIndex}`}>
                    <line x1={c.x} y1={top + 1} x2={c.x} y2={bandBase - 1} stroke={typeColor(c.typeCode)} strokeWidth="0.4" opacity="0.55" />
                    <g transform={`translate(${c.x}, ${bandBase}) scale(1,-1) rotate(-90)`}>
                      <text
                        textAnchor="start"
                        dominantBaseline="central"
                        fontSize="5.2"
                        fill="var(--text-primary)"
                        fontWeight="600"
                      >
                        {truncate(c.label, 26)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {showDimensions && (
            <g stroke="var(--dim-line)" strokeWidth="0.7" fill="none">
              {/* Overall width W, below the tray */}
              <line x1={0} y1={-24} x2={trayWidthMm} y2={-24} markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
              <line x1={0} y1={-RAIL - 2} x2={0} y2={-28} strokeDasharray="3 2" />
              <line x1={trayWidthMm} y1={-RAIL - 2} x2={trayWidthMm} y2={-28} strokeDasharray="3 2" />
              <g transform={`translate(${trayWidthMm / 2}, -30) scale(1,-1)`}>
                <text textAnchor="middle" fontSize="11" fill="var(--text-primary)" stroke="none" fontWeight="700">
                  W = {trayWidthMm} mm
                </text>
              </g>

              {/* Overall height H, to the left */}
              <line x1={-26} y1={0} x2={-26} y2={trayHeightMm} markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
              <line x1={-RAIL - 2} y1={0} x2={-30} y2={0} strokeDasharray="3 2" />
              <line x1={-RAIL - 2} y1={trayHeightMm} x2={-30} y2={trayHeightMm} strokeDasharray="3 2" />
              <g transform={`translate(-34, ${trayHeightMm / 2}) scale(1,-1) rotate(-90)`}>
                <text textAnchor="middle" fontSize="11" fill="var(--text-primary)" stroke="none" fontWeight="700">
                  H = {trayHeightMm} mm
                </text>
              </g>

              {/* Edge clearance callouts */}
              {edgeClearanceMm > 0 && (
                <>
                  <line x1={0} y1={-12} x2={edgeClearanceMm} y2={-12} markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                  <g transform={`translate(${edgeClearanceMm + 4}, ${-14}) scale(1,-1)`}>
                    <text fontSize="7.5" fill="var(--text-secondary)" stroke="none">
                      {labelClearance} {edgeClearanceMm} mm
                    </text>
                  </g>
                </>
              )}

              {/* Remaining free height above the top cable layer */}
              {freeHeight > 4 && (
                <>
                  <line x1={trayWidthMm + 18} y1={topOfCables} x2={trayWidthMm + 18} y2={trayHeightMm} markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                  <line x1={trayWidthMm + 2} y1={topOfCables} x2={trayWidthMm + 22} y2={topOfCables} strokeDasharray="3 2" />
                  <g transform={`translate(${trayWidthMm + 24}, ${(topOfCables + trayHeightMm) / 2}) scale(1,-1)`}>
                    <text fontSize="8" fill="var(--text-secondary)" stroke="none">
                      {labelFree} {freeHeight.toFixed(0)} mm
                    </text>
                  </g>
                </>
              )}
            </g>
          )}
        </g>

        {caption && (
          <text x={trayWidthMm / 2} y={trayHeightMm + margin * 0.72} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
            {caption}
          </text>
        )}
      </svg>

      {hover && <CableTooltip cable={hover} heat={heatByRun.get(`${hover.runId}#${hover.runIndex}`)} />}

      <div className="pointer-events-none absolute right-3 bottom-3 rounded-lg px-2 py-1 text-[11px] tabular"
        style={{ background: 'var(--glass-bg-strong)', color: 'var(--text-muted)', backdropFilter: 'blur(10px)' }}>
        {(zoom * 100).toFixed(0)} % &middot; scroll = zoom, drag = pan
      </div>
    </div>
  );
}

function CableTooltip({ cable, heat }: { cable: PlacedCable; heat?: number }) {
  const entry = findEntry(cable.typeCode);
  return (
    <div
      className="pointer-events-none absolute top-3 left-3 max-w-[280px] rounded-xl px-3 py-2 text-[11.5px]"
      style={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(14px)' }}
    >
      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{cable.label}</div>
      <div className="tabular" style={{ color: 'var(--text-secondary)' }}>
        {entry ? `${entry.family} ${entry.cores}C x ${entry.sizeMm2} mm2` : cable.typeCode}
      </div>
      <div className="tabular" style={{ color: 'var(--text-muted)' }}>
        OD {(cable.r * 2).toFixed(1)} mm &middot; x {cable.x.toFixed(1)} &middot; y {cable.y.toFixed(1)} &middot; layer {cable.layer}
        {heat !== undefined && ` · heat ${(heat * 100).toFixed(0)} %`}
      </div>
    </div>
  );
}

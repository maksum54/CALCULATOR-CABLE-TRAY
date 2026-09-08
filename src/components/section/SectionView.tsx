import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCalculations } from '../../store/useCalculations';
import { findEntry } from '../../core/catalog';
import { heatColor, typeColor } from '../../core/colors';
import { Badge, Button, GlassCard, SectionTitle, Toggle, fmt, useT } from '../ui';
import { CrossSection2D } from './CrossSection2D';

/** The 2D tab: drawing on the left, view controls and legend on the right. */
export function SectionView() {
  const t = useT();
  const params = useAppStore((s) => s.params);
  const layout = useAppStore((s) => s.layout);
  const selectedTrayIndex = useAppStore((s) => s.selectedTrayIndex);
  const setSelectedTray = useAppStore((s) => s.setSelectedTray);
  const selectedRunId = useAppStore((s) => s.selectedRunId);
  const setSelectedRun = useAppStore((s) => s.setSelectedRun);
  const { trays, derating, sizing } = useCalculations();

  const [showLabels, setShowLabels] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCover, setShowCover] = useState(false);

  const tray = trays[Math.min(selectedTrayIndex, trays.length - 1)] ?? trays[0];

  const heatByRun = useMemo(() => {
    const m = new Map<string, number>();
    const counters = new Map<string, number>();
    for (const c of derating.perCable) {
      const n = (counters.get(c.runId) ?? 0) + 1;
      counters.set(c.runId, n);
      m.set(`${c.runId}#${n}`, c.thermalIndex);
    }
    return m;
  }, [derating]);

  const legend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of tray?.cables ?? []) counts.set(c.typeCode, (counts.get(c.typeCode) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [tray]);

  if (!tray) return null;

  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[1fr_300px]">
      <GlassCard className="flex min-h-0 flex-col overflow-hidden">
        <SectionTitle
          right={
            <div className="flex items-center gap-1.5">
              {trays.map((_, i) => (
                <Button key={i} active={i === selectedTrayIndex} onClick={() => setSelectedTray(i)}>
                  {t('trayNo')} {i + 1}
                </Button>
              ))}
            </div>
          }
        >
          {t('sectionTitle')} &middot; {params.selectedTrayWidthMm} x {params.trayHeightMm} mm &middot; {tray.cables.length} {t('cables')} &middot; {tray.layersUsed} {t('layer')}
        </SectionTitle>
        <div className="min-h-0 flex-1 px-2 pb-2">
          <CrossSection2D
            tray={tray}
            trayWidthMm={params.selectedTrayWidthMm}
            trayHeightMm={params.trayHeightMm}
            trayType={params.trayType}
            showLabels={showLabels}
            showDimensions={showDimensions}
            showHeatmap={showHeatmap}
            showGrid={showGrid}
            showCover={showCover || params.coverInstalled}
            edgeClearanceMm={layout.edgeClearanceMm}
            heatByRun={heatByRun}
            selectedRunId={selectedRunId}
            onSelect={setSelectedRun}
            labelClearance={t('clearance')}
            labelDivider={t('divider')}
            labelFree={t('freeSpace')}
          />
        </div>
      </GlassCard>

      <div className="scroll-thin space-y-3 overflow-auto">
        <GlassCard>
          <SectionTitle>{t('sectionTitle')}</SectionTitle>
          <div className="px-4 pb-3">
            <Toggle checked={showLabels} onChange={setShowLabels} label={t('showLabels')} />
            {showLabels && tray.cables.length > 90 && (
              <p className="mt-1 mb-1 text-[11px] leading-snug" style={{ color: 'var(--warn)' }}>
                {t('labelsHidden', { n: tray.cables.length })}
              </p>
            )}
            <Toggle checked={showDimensions} onChange={setShowDimensions} label={t('showDimensions')} />
            <Toggle checked={showHeatmap} onChange={setShowHeatmap} label={t('showHeatmap')} />
            <Toggle checked={showGrid} onChange={setShowGrid} label={t('showGrid')} />
            <Toggle checked={showCover} onChange={setShowCover} label={t('showCover')} />
          </div>
        </GlassCard>

        {showHeatmap && (
          <GlassCard>
            <SectionTitle>{t('heatmap')}</SectionTitle>
            <div className="px-4 pb-3">
              <div className="h-3 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${heatColor(0)}, ${heatColor(0.25)}, ${heatColor(0.5)}, ${heatColor(0.75)}, ${heatColor(1)})` }} />
              <div className="mt-1 flex justify-between text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                <span>0 %</span>
                <span>100 %</span>
              </div>
              <p className="mt-2 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{t('heatmapNote')}</p>
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <SectionTitle right={<Badge tone={sizing.fillCheckPass ? 'ok' : 'danger'}>{sizing.fillCheckPass ? t('ok') : t('notOk')}</Badge>}>
            {t('legendTitle')}
          </SectionTitle>
          <div className="px-4 pb-3">
            {legend.map(([code, count]) => {
              const e = findEntry(code);
              return (
                <div key={code} className="flex items-center justify-between gap-2 border-b py-1.5 text-[12px] last:border-b-0" style={{ borderColor: 'var(--glass-border-soft)' }}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: typeColor(code) }} />
                    <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{code}</span>
                  </div>
                  <span className="tabular shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {e ? `OD ${fmt(e.odMm, 1)}` : ''} &middot; {count}x
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

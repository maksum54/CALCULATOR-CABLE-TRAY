import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { useCalculations } from '../../store/useCalculations';
import { heatColor } from '../../core/colors';
import { Button, GlassCard, SectionTitle, Toggle, useT } from '../ui';
import { FlyThrough, SceneSnapshot, TrayScene } from './TrayScene';

/** The 3D tab: canvas plus the view controls that drive the animations. */
export function View3D() {
  const t = useT();
  const params = useAppStore((s) => s.params);
  const selectedRunId = useAppStore((s) => s.selectedRunId);
  const setScenePng = useAppStore((s) => s.setScenePng);
  const { trays, derating } = useCalculations();

  const [explode, setExplode] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [flying, setFlying] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const lengthM = Math.min(Math.max(params.supportSpanM * 4, 4), 12);
  // Frame the whole run: back off along the diagonal in proportion to the tray length.
  const camera = useMemo(
    () => ({ position: [lengthM * 0.62, lengthM * 0.42, lengthM * 0.86] as [number, number, number], fov: 40, near: 0.01, far: 200 }),
    [lengthM],
  );

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

  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[1fr_280px]">
      <GlassCard className="flex min-h-0 flex-col overflow-hidden">
        <SectionTitle
          right={
            <div className="flex items-center gap-1.5">
              <Button active={flying} onClick={() => setFlying((f) => !f)}>{t('flythrough')}</Button>
              <Button active={autoRotate && !flying} onClick={() => setAutoRotate((r) => !r)}>{t('autoRotate')}</Button>
              <Button onClick={() => { setFlying(false); setExplode(0); setResetKey((k) => k + 1); }}>{t('resetView')}</Button>
            </div>
          }
        >
          {t('view3dTitle')} &middot; {trays.length} {t('run')} &middot; {lengthM.toFixed(1)} m
        </SectionTitle>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl px-2 pb-2">
          <Canvas
            key={resetKey}
            shadows
            dpr={[1, 2]}
            camera={camera}
            gl={{ antialias: true, preserveDrawingBuffer: true }}
            style={{ borderRadius: '0.9rem' }}
          >
            <color attach="background" args={['#0a0f1a']} />
            <fog attach="fog" args={['#0a0f1a', lengthM * 1.6, lengthM * 6]} />
            <Suspense fallback={null}>
              <TrayScene
                trays={trays}
                trayWidthMm={params.selectedTrayWidthMm}
                trayHeightMm={params.trayHeightMm}
                trayType={params.trayType}
                lengthM={lengthM}
                explode={explode}
                showCover={showCover}
                showHeatmap={showHeatmap}
                heatByRun={heatByRun}
                selectedRunId={selectedRunId}
              />
              <FlyThrough active={flying} lengthM={lengthM} onDone={() => setFlying(false)} />
              <SceneSnapshot deps={[trays, explode, showCover, showHeatmap, lengthM, flying]} onCapture={setScenePng} />
            </Suspense>
            {!flying && (
              <OrbitControls
                makeDefault
                autoRotate={autoRotate}
                autoRotateSpeed={0.7}
                enableDamping
                dampingFactor={0.08}
                minDistance={0.3}
                maxDistance={lengthM * 6}
                target={[0, 0.05, 0]}
              />
            )}
          </Canvas>
        </div>
      </GlassCard>

      <div className="scroll-thin space-y-3 overflow-auto">
        <GlassCard>
          <SectionTitle>{t('view3dTitle')}</SectionTitle>
          <div className="px-4 pb-3">
            <label className="block py-1.5">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{t('exploded')}</span>
                <span className="tabular text-[11px]" style={{ color: 'var(--text-muted)' }}>{(explode * 100).toFixed(0)} %</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                onChange={(e) => setExplode(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </label>
            <Toggle checked={showCover} onChange={setShowCover} label={t('showCover')} />
            <Toggle checked={showHeatmap} onChange={setShowHeatmap} label={t('showHeatmap')} />
          </div>
        </GlassCard>

        {showHeatmap && (
          <GlassCard>
            <SectionTitle>{t('heatmap')}</SectionTitle>
            <div className="px-4 pb-3">
              <div className="h-3 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${heatColor(0)}, ${heatColor(0.5)}, ${heatColor(1)})` }} />
              <p className="mt-2 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{t('heatmapNote')}</p>
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <div className="px-4 py-3 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('orbit')}: drag &middot; zoom: scroll &middot; pan: right-drag
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

import { useAppStore } from '../../store/useAppStore';
import { useCalculations } from '../../store/useCalculations';
import { Badge, GlassCard, NoteList, SectionTitle, StatRow, fmt, pct, useT } from '../ui';

/** Sections B..H of the reference workbook, rendered live. */
export function ResultsPanel() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const params = useAppStore((s) => s.params);
  const { sizing, alternatives, panels, weight, overflow } = useCalculations();
  const detail = sizing.fillDetail;

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <GlassCard>
        <SectionTitle right={<Badge tone="accent">{lang === 'id' ? detail.labelId : detail.labelEn}</Badge>}>
          {t('resultsTitle')}
        </SectionTitle>
        <div className="px-4 pb-4">
          <StatRow label={t('totalRuns')} value={sizing.totalRuns} unit={t('run')} />
          <StatRow label={t('sumOd')} value={fmt(sizing.sumOdMm, 2)} unit="mm" />
          <StatRow label={t('sumArea')} value={fmt(sizing.sumAreaMm2, 2)} unit="mm2" />

          <div className="mt-4 mb-1 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
            {t('method1')}
          </div>
          <StatRow label={t('installedWidth')} value={fmt(sizing.method1.installedWidthMm, 2)} unit="mm" remark="sigma OD x spacing" />
          <StatRow label={t('widthWithSpare')} value={fmt(sizing.method1.withSpareMm, 2)} unit="mm" remark="x (1 + spare)" />
          <StatRow label={t('widthPerLayer')} value={fmt(sizing.method1.perLayerMm, 2)} unit="mm" remark={`/ ${params.layers}`} emphasis={sizing.governingMethod === 'method1'} />

          <div className="mt-4 mb-1 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
            {t('method2')}
          </div>
          <StatRow label={t('areaWithSpare')} value={fmt(sizing.method2.areaWithSpareMm2, 2)} unit="mm2" remark="sigma A x (1 + spare)" />
          <StatRow label={t('requiredTrayArea')} value={fmt(sizing.method2.requiredTrayAreaMm2, 2)} unit="mm2" />
          <StatRow label={t('requiredWidth')} value={fmt(sizing.method2.requiredWidthMm, 2)} unit="mm" emphasis={sizing.governingMethod === 'method2'} />

          <div className="mt-4 mb-1 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
            {t('check')}
          </div>
          <StatRow label={t('governingWidth')} value={fmt(sizing.governingWidthMm, 2)} unit="mm" emphasis />
          <StatRow label={t('trayWidth')} value={sizing.selectedTrayWidthMm} unit="mm" />
          <StatRow label={t('trayRunsRequired')} value={sizing.trayRunsRequired} unit={t('run')} emphasis />
          <StatRow label={t('totalInstalledWidth')} value={sizing.totalInstalledWidthMm} unit="mm" />
          <StatRow label={t('actualFill')} value={pct(sizing.actualFillRatio)} tone={sizing.fillCheckPass ? 'ok' : 'danger'} remark={`max ${pct(params.maxFillRatio, 0)}`} />
          <StatRow
            label={t('check')}
            value={sizing.fillCheckPass ? t('ok') : t('notOk')}
            tone={sizing.fillCheckPass ? 'ok' : 'danger'}
            emphasis
          />
          {sizing.recommendedSingleTrayWidthMm && (
            <StatRow label={t('recommendedWidth')} value={sizing.recommendedSingleTrayWidthMm} unit="mm" />
          )}
          {overflow > 0 && (
            <div className="mt-3 rounded-xl px-3 py-2 text-[11.5px]" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
              {t('overflowWarning', { n: overflow })}
            </div>
          )}
          <div className="mt-3">
            <NoteList items={detail.messages} />
          </div>
        </div>
      </GlassCard>

      <div className="space-y-3">
        <GlassCard>
          <SectionTitle>{t('weightTitle')}</SectionTitle>
          <div className="px-4 pb-4">
            <StatRow label={t('cableWeight')} value={fmt(weight.cableKgPerM, 2)} unit="kg/m" />
            <StatRow label={t('trayWeightLabel')} value={fmt(weight.trayKgPerM, 2)} unit="kg/m" remark={lang === 'id' ? 'estimasi indikatif - ganti dengan data pabrikan' : 'indicative estimate - replace with manufacturer data'} />
            <StatRow label={t('totalWeight')} value={fmt(weight.totalKgPerM, 2)} unit="kg/m" emphasis />
            <StatRow label={t('loadPerSupport')} value={fmt(weight.loadPerSupportKg, 1)} unit="kg" remark={`span ${params.supportSpanM} m`} />
            <StatRow label={t('routeWeight')} value={fmt(weight.totalRouteWeightKg, 0)} unit="kg" remark={`${params.routeLengthM} m`} />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>{t('altConfig')}</SectionTitle>
          <div className="scroll-thin max-h-72 overflow-auto px-2 pb-3">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase">{t('trayWidth')} (mm)</th>
                  {[1, 2, 3].map((n) => (
                    <th key={n} className="px-2 py-1.5 text-right text-[11px] font-semibold uppercase">{t('runsAtLayers', { n })}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alternatives.map((row) => (
                  <tr key={row.widthMm} style={{ background: row.widthMm === params.selectedTrayWidthMm ? 'var(--accent-soft)' : 'transparent' }}>
                    <td className="tabular border-t px-2 py-1 font-medium" style={{ borderColor: 'var(--glass-border-soft)' }}>{row.widthMm}</td>
                    {row.runsByLayer.map((n, i) => (
                      <td key={i} className="tabular border-t px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{n}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>{t('perPanel')}</SectionTitle>
          <div className="scroll-thin overflow-auto px-2 pb-3">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  {[t('panel'), t('qtyRuns'), 'sigma OD (mm)', `${t('requiredWidth')} (mm)`, t('trayRunsRequired'), t('actualFill')].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {panels.map((p) => (
                  <tr key={p.panel}>
                    <td className="border-t px-2 py-1 font-medium whitespace-nowrap" style={{ borderColor: 'var(--glass-border-soft)' }}>{p.panel}</td>
                    <td className="tabular border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{p.totalRuns}</td>
                    <td className="tabular border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(p.sumOdMm, 1)}</td>
                    <td className="tabular border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(p.governingWidthMm, 1)}</td>
                    <td className="tabular border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{p.trayRunsRequired} x {p.selectedTrayWidthMm}</td>
                    <td className="tabular border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)', color: p.fillCheckPass ? 'var(--ok)' : 'var(--danger)' }}>{pct(p.actualFillRatio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

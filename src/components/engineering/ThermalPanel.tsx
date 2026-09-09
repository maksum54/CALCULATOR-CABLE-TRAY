import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCalculations } from '../../store/useCalculations';
import { heatColor } from '../../core/colors';
import { Badge, GlassCard, NoteList, SectionTitle, StatRow } from '../ui';
import { useT } from '../ui/useT';
import { fmt, pct } from '../ui/format';

/** Grouping + ambient derating, and the per-circuit loading table behind the heat map. */
export function ThermalPanel() {
  const t = useT();
  const params = useAppStore((s) => s.params);
  const { derating } = useCalculations();
  const [onlyLoaded, setOnlyLoaded] = useState(true);

  const rows = useMemo(() => {
    const list = onlyLoaded ? derating.perCable.filter((c) => c.designCurrentA > 0) : derating.perCable;
    return [...list].sort((a, b) => b.utilisation - a.utilisation);
  }, [derating, onlyLoaded]);

  return (
    <div className="grid gap-3 xl:grid-cols-[380px_1fr]">
      <div className="space-y-3">
        <GlassCard>
          <SectionTitle right={<Badge tone={derating.worstUtilisation <= 1 ? 'ok' : 'danger'}>{derating.worstUtilisation <= 1 ? t('ok') : t('notOk')}</Badge>}>
            {t('thermalTitle')}
          </SectionTitle>
          <div className="px-4 pb-4">
            <StatRow label={t('circuits')} value={derating.circuits} />
            <StatRow label={t('layers')} value={derating.layersUsed} unit={t('layer')} />
            <StatRow label={t('ambientTemp')} value={params.ambientTempC} unit="deg C" />
            <StatRow label={t('groupingFactor')} value={fmt(derating.groupingFactor, 3)} remark="IEC 60364-5-52 Table B.52.17" />
            <StatRow label={t('temperatureFactor')} value={fmt(derating.temperatureFactor, 3)} remark="IEC 60364-5-52 Table B.52.14" />
            <StatRow label={t('combinedFactor')} value={fmt(derating.combinedFactor, 3)} emphasis />
            <StatRow
              label={t('worstUtilisation')}
              value={pct(derating.worstUtilisation, 1)}
              tone={derating.worstUtilisation <= 1 ? 'ok' : 'danger'}
              emphasis
            />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>{t('heatmap')}</SectionTitle>
          <div className="px-4 pb-4">
            <div className="h-3.5 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${heatColor(0)}, ${heatColor(0.25)}, ${heatColor(0.5)}, ${heatColor(0.75)}, ${heatColor(1)})` }} />
            <div className="mt-1 flex justify-between text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
              <span>0 %</span><span>50 %</span><span>100 %</span>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{t('heatmapNote')}</p>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>{t('notes')}</SectionTitle>
          <div className="px-4 pb-4"><NoteList items={derating.messages} /></div>
        </GlassCard>
      </div>

      <GlassCard className="flex min-h-0 flex-col overflow-hidden">
        <SectionTitle
          right={
            <button className="press rounded-lg px-2 py-1 text-[11.5px]" style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }} onClick={() => setOnlyLoaded((v) => !v)}>
              {onlyLoaded ? '✓' : ''} {t('load')} &gt; 0
            </button>
          }
        >
          {t('deratedAmpacity')} &middot; {rows.length} {t('cables')}
        </SectionTitle>
        <div className="scroll-thin min-h-0 flex-1 overflow-auto px-2 pb-2">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(14px)' }}>
                {[t('circuit'), t('type'), `${t('baseAmpacity')} (A)`, `${t('deratedAmpacity')} (A)`, `${t('designCurrent')} (A)`, t('utilisation'), t('heatmap')].map((h) => (
                  <th key={h} className="border-b px-2 py-2 text-left text-[11px] font-semibold uppercase whitespace-nowrap" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={`${c.runId}-${i}`}>
                  <td className="border-b px-2 py-1 whitespace-nowrap" style={{ borderColor: 'var(--glass-border-soft)' }}>{c.label}</td>
                  <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)', color: 'var(--text-muted)' }}>{c.typeCode}</td>
                  <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{c.baseAmpacity ? fmt(c.baseAmpacity, 0) : '-'}</td>
                  <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{c.deratedAmpacity ? fmt(c.deratedAmpacity, 1) : '-'}</td>
                  <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{c.designCurrentA ? fmt(c.designCurrentA, 1) : '-'}</td>
                  <td
                    className="tabular border-b px-2 py-1 text-right font-semibold"
                    style={{
                      borderColor: 'var(--glass-border-soft)',
                      color: !c.loadKnown ? 'var(--text-muted)' : c.utilisation > 1 ? 'var(--danger)' : c.utilisation > 0.8 ? 'var(--warn)' : 'var(--ok)',
                    }}
                  >
                    {c.loadKnown && c.deratedAmpacity ? pct(c.utilisation, 0) : '-'}
                  </td>
                  <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    {/* Tanpa data beban tidak ada yang bisa diperingkat secara termal - batangnya
                        dibiarkan kosong daripada menampilkan nilai yang terlihat aman. */}
                    <div
                      className="h-2.5 w-16 rounded-full"
                      style={{ background: 'var(--glass-border)' }}
                      title={c.loadKnown ? undefined : t('noLoadData')}
                    >
                      {c.loadKnown && (
                        <div className="h-full rounded-full" style={{ width: `${c.thermalIndex * 100}%`, background: heatColor(c.thermalIndex) }} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

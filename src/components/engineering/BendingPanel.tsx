import { useAppStore } from '../../store/useAppStore';
import { useCalculations } from '../../store/useCalculations';
import { Badge, GlassCard, NoteList, NumberField, SectionTitle, StatRow } from '../ui';
import { useT } from '../ui/useT';
import { fmt } from '../ui/format';

/** Minimum bending radius per cable type, fitting check and the pulling estimate. */
export function BendingPanel() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const params = useAppStore((s) => s.params);
  const opts = useAppStore((s) => s.bending);
  const setBending = useAppStore((s) => s.setBending);
  const { bending } = useCalculations();
  const pull = bending.pullingTension;

  return (
    <div className="grid gap-3 xl:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <GlassCard>
          <SectionTitle>{t('parameter')}</SectionTitle>
          <div className="px-4 pb-3">
            <NumberField label={lang === 'id' ? 'Faktor kabel multicore' : 'Multicore factor'} value={opts.multicoreFactor} onChange={(v) => setBending('multicoreFactor', v)} step={1} min={4} max={30} unit="x OD" />
            <NumberField label={lang === 'id' ? 'Faktor kabel single core' : 'Single core factor'} value={opts.singleCoreFactor} onChange={(v) => setBending('singleCoreFactor', v)} step={1} min={4} max={30} unit="x OD" />
            <NumberField label={lang === 'id' ? 'Koefisien gesek' : 'Coefficient of friction'} value={opts.friction} onChange={(v) => setBending('friction', v)} step={0.05} min={0.1} max={1} unit="-" />
            <NumberField label={lang === 'id' ? 'Sudut belokan' : 'Bend angle'} value={opts.bendAngleDeg} onChange={(v) => setBending('bendAngleDeg', v)} step={15} min={15} max={180} unit="deg" />
            <NumberField label={t('sidewallPressure')} value={opts.allowableSidewallNPerM} onChange={(v) => setBending('allowableSidewallNPerM', v)} step={500} min={500} unit="N/m" />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle right={<Badge tone={pull.pass ? 'ok' : 'danger'}>{pull.pass ? t('ok') : t('notOk')}</Badge>}>
            {t('pullingTension')}
          </SectionTitle>
          <div className="px-4 pb-4">
            <StatRow label={t('routeLength')} value={params.routeLengthM} unit="m" />
            <StatRow label={t('straightTension')} value={fmt(pull.straightTensionN, 0)} unit="N" remark="T = mu x w x L" />
            <StatRow label={t('bendTension')} value={fmt(pull.bendTensionN, 0)} unit="N" remark="T x e^(mu x theta)" emphasis />
            <StatRow label={t('sidewallPressure')} value={fmt(pull.sidewallPressureNPerM, 0)} unit="N/m" tone={pull.pass ? 'ok' : 'danger'} remark={`max ${fmt(pull.allowableSidewallNPerM, 0)} N/m`} />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>{t('notes')}</SectionTitle>
          <div className="px-4 pb-4"><NoteList items={bending.messages} /></div>
        </GlassCard>
      </div>

      <div className="space-y-3">
        <GlassCard>
          <SectionTitle right={<Badge tone="accent">{fmt(bending.governingRadiusMm, 0)} mm</Badge>}>
            {t('bendingTitle')}
          </SectionTitle>
          <div className="scroll-thin overflow-auto px-2 pb-3">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  {[t('type'), `${t('od')} (mm)`, t('formula'), `${t('minRadius')} (mm)`].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bending.perType.map((b) => (
                  <tr key={b.typeCode}>
                    <td className="border-t px-2 py-1 whitespace-nowrap" style={{ borderColor: 'var(--glass-border-soft)' }}>{b.label}</td>
                    <td className="tabular border-t px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(b.odMm, 1)}</td>
                    <td className="tabular border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)', color: 'var(--text-muted)' }}>{b.factor} x OD</td>
                    <td className="tabular border-t px-2 py-1 text-right font-semibold" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(b.minRadiusMm, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>{t('fitting')}</SectionTitle>
          <div className="scroll-thin overflow-auto px-2 pb-3">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  {[t('fitting'), `${t('standardRadius')} (mm)`, `${t('minRadius')} (mm)`, t('check')].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bending.fittings.map((f) => (
                  <tr key={f.fitting}>
                    <td className="border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{f.fitting}</td>
                    <td className="tabular border-t px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{f.standardRadiusMm}</td>
                    <td className="tabular border-t px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(f.requiredRadiusMm, 0)}</td>
                    <td className="border-t px-2 py-1 font-semibold" style={{ borderColor: 'var(--glass-border-soft)', color: f.pass ? 'var(--ok)' : 'var(--danger)' }}>{f.pass ? t('ok') : t('notOk')}</td>
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

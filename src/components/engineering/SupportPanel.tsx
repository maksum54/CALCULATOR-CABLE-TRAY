import { useAppStore } from '../../store/useAppStore';
import { useCalculations } from '../../store/useCalculations';
import { NEMA_CLASSES, ROD_SIZES, STANDARD_SPANS_M } from '../../core/trayStandards';
import { calculateSupport } from '../../core/support';
import { Badge, GlassCard, NoteList, SectionTitle, StatRow } from '../ui';
import { useT } from '../ui/useT';
import { fmt } from '../ui/format';

/** Span, deflection, NEMA class and hanger capacity, plus a what-if sweep over the spans. */
export function SupportPanel() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const params = useAppStore((s) => s.params);
  const setParam = useAppStore((s) => s.setParam);
  const { support, weight, sizing } = useCalculations();

  const sweep = STANDARD_SPANS_M.map((spanM) =>
    calculateSupport(weight, { ...params, supportSpanM: spanM }, sizing.trayRunsRequired),
  );

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <div className="space-y-3">
        <GlassCard>
          <SectionTitle right={<Badge tone={support.deflectionPass && support.rodPass && support.nemaPass ? 'ok' : 'danger'}>{support.deflectionPass && support.rodPass && support.nemaPass ? t('ok') : t('notOk')}</Badge>}>
            {t('supportTitle')}
          </SectionTitle>
          <div className="px-4 pb-4">
            <StatRow label={t('supportSpan')} value={fmt(support.spanM, 2)} unit="m" />
            <StatRow label={t('udl')} value={fmt(support.udlKgPerM, 2)} unit="kg/m" remark={`${fmt(support.udlNPerM, 1)} N/m`} />
            <StatRow label="I" value={fmt(support.inertiaMm4 / 1e4, 1)} unit="cm4" remark={lang === 'id' ? 'model C-channel indikatif - ganti dengan data pabrikan' : 'indicative C-channel model - replace with manufacturer data'} />
            <StatRow label="E" value={fmt(support.elasticModulusMpa / 1000, 0)} unit="GPa" />
            <StatRow label={t('deflection')} value={fmt(support.deflectionMm, 2)} unit="mm" tone={support.deflectionPass ? 'ok' : 'danger'} emphasis />
            <StatRow label={t('allowableDeflection')} value={fmt(support.allowableDeflectionMm, 2)} unit="mm" remark="NEMA VE 1 / VE 2" />
            <StatRow label={t('nemaClass')} value={support.nemaClass.toUpperCase()} tone={support.nemaPass ? 'ok' : 'danger'} remark={support.nemaPass ? `${fmt(support.nemaWorkingLoadKgPerM, 1)} kg/m` : undefined} />
            <StatRow label={t('supportsRequired')} value={support.supportsRequired} remark={`${params.routeLengthM} m`} />
            <StatRow label={t('loadPerHanger')} value={fmt(support.loadPerHangerKg, 1)} unit="kg" remark={lang === 'id' ? '2 rod per titik (trapeze)' : '2 rods per point (trapeze)'} />
            <StatRow label={t('rodSize')} value={support.rodSize} tone={support.rodPass ? 'ok' : 'danger'} remark={`${t('rodCapacity')} ${fmt(support.rodCapacityKg, 0)} kg`} />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>{t('notes')}</SectionTitle>
          <div className="px-4 pb-4"><NoteList items={support.messages} /></div>
        </GlassCard>
      </div>

      <div className="space-y-3">
        <GlassCard>
          <SectionTitle>{t('supportSpan')}</SectionTitle>
          <div className="scroll-thin overflow-auto px-2 pb-3">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  {[`${t('supportSpan')} (m)`, `${t('deflection')} (mm)`, `${t('allowableDeflection')} (mm)`, t('nemaClass'), `${t('loadPerHanger')} (kg)`, t('rodSize'), t('check')].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sweep.map((r, i) => {
                  const pass = r.deflectionPass && r.rodPass && r.nemaPass;
                  const active = STANDARD_SPANS_M[i] === params.supportSpanM;
                  return (
                    <tr
                      key={STANDARD_SPANS_M[i]}
                      onClick={() => setParam('supportSpanM', STANDARD_SPANS_M[i])}
                      className="press cursor-pointer"
                      style={{ background: active ? 'var(--accent-soft)' : 'transparent' }}
                    >
                      <td className="tabular border-t px-2 py-1 font-medium" style={{ borderColor: 'var(--glass-border-soft)' }}>{STANDARD_SPANS_M[i].toFixed(1)}</td>
                      <td className="tabular border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(r.deflectionMm, 2)}</td>
                      <td className="tabular border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(r.allowableDeflectionMm, 2)}</td>
                      <td className="border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{r.nemaClass.toUpperCase()}</td>
                      <td className="tabular border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(r.loadPerHangerKg, 0)}</td>
                      <td className="border-t px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{r.rodSize}</td>
                      <td className="border-t px-2 py-1 font-semibold" style={{ borderColor: 'var(--glass-border-soft)', color: pass ? 'var(--ok)' : 'var(--danger)' }}>{pass ? t('ok') : t('notOk')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>NEMA VE 1</SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 px-4 pb-4 sm:grid-cols-3">
            {NEMA_CLASSES.map((c) => (
              <div key={c.id} className="flex items-baseline justify-between border-b py-1 text-[11.5px]" style={{ borderColor: 'var(--glass-border-soft)', color: c.id === support.nemaClass ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <span className="font-semibold">{c.id}</span>
                <span className="tabular">{c.spanM} m &middot; {c.loadKgPerM.toFixed(0)} kg/m</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>{t('rodSize')}</SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 px-4 pb-4 sm:grid-cols-3">
            {ROD_SIZES.map((r) => (
              <div key={r.id} className="flex items-baseline justify-between border-b py-1 text-[11.5px]" style={{ borderColor: 'var(--glass-border-soft)', color: r.id === support.rodSize ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <span className="font-semibold">{r.id}</span>
                <span className="tabular">{r.capacityKg} kg</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

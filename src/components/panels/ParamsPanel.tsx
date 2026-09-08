import { useAppStore } from '../../store/useAppStore';
import { FILL_STANDARDS } from '../../core/traySizing';
import { STANDARD_HEIGHTS_MM, STANDARD_SPANS_M, STANDARD_WIDTHS_MM } from '../../core/trayStandards';
import type { ArrangementMode, FillStandard, TrayType } from '../../core/types';
import { GlassCard, NumberField, SectionTitle, SelectField, Toggle, useT } from '../ui';

/** Design parameters - section A of the reference workbook, made live. */
export function ParamsPanel() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const params = useAppStore((s) => s.params);
  const layout = useAppStore((s) => s.layout);
  const setParam = useAppStore((s) => s.setParam);
  const setLayout = useAppStore((s) => s.setLayout);

  return (
    <div className="space-y-3">
      <GlassCard>
        <SectionTitle>{t('paramsTitle')}</SectionTitle>
        <div className="px-4 pb-3">
          <NumberField
            label={t('spareFactor')}
            value={params.spareFactor}
            onChange={(v) => setParam('spareFactor', v)}
            step={0.05}
            min={0}
            max={1}
            unit="0 - 1"
            hint={lang === 'id' ? 'Praktik umum 20 - 30 %' : 'Common practice 20 - 30 %'}
          />
          <NumberField
            label={t('spacingFactor')}
            value={params.spacingFactor}
            onChange={(v) => setParam('spacingFactor', v)}
            step={0.05}
            min={1}
            max={2}
            unit="-"
            hint={lang === 'id' ? '1,00 = bersinggungan; 1,10 = clearance 10 % OD' : '1.00 = touching; 1.10 = 10 % of OD clearance'}
          />
          <SelectField
            label={t('trayHeight')}
            value={params.trayHeightMm}
            onChange={(v) => setParam('trayHeightMm', v)}
            options={STANDARD_HEIGHTS_MM.map((h) => ({ value: h, label: `${h}` }))}
            unit="mm"
          />
          <NumberField
            label={t('maxFillRatio')}
            value={params.maxFillRatio}
            onChange={(v) => setParam('maxFillRatio', v)}
            step={0.05}
            min={0.1}
            max={1}
            unit="0 - 1"
          />
          <NumberField label={t('layers')} value={params.layers} onChange={(v) => setParam('layers', Math.max(1, Math.round(v)))} step={1} min={1} max={6} unit={t('layer')} />
          <SelectField
            label={t('trayWidth')}
            value={params.selectedTrayWidthMm}
            onChange={(v) => setParam('selectedTrayWidthMm', v)}
            options={STANDARD_WIDTHS_MM.map((w) => ({ value: w, label: `${w}` }))}
            unit="mm"
          />
          <SelectField
            label={t('fillStandard')}
            value={params.fillStandard}
            onChange={(v) => setParam('fillStandard', v as FillStandard)}
            options={FILL_STANDARDS.map((s) => ({ value: s.id, label: lang === 'id' ? s.labelId : s.labelEn }))}
          />
          <SelectField
            label={t('arrangement')}
            value={params.arrangement}
            onChange={(v) => setParam('arrangement', v as ArrangementMode)}
            options={[
              { value: 'flatTouching', label: t('flatTouching') },
              { value: 'flatSpaced', label: t('flatSpaced') },
              { value: 'trefoil', label: t('trefoil') },
            ]}
          />
          <SelectField
            label={t('trayType')}
            value={params.trayType}
            onChange={(v) => setParam('trayType', v as TrayType)}
            options={[
              { value: 'ladder', label: t('ladder') },
              { value: 'perforated', label: t('perforated') },
              { value: 'solid', label: t('solid') },
            ]}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle>{t('tabSupport')}</SectionTitle>
        <div className="px-4 pb-3">
          <SelectField
            label={t('supportSpan')}
            value={params.supportSpanM}
            onChange={(v) => setParam('supportSpanM', v)}
            options={STANDARD_SPANS_M.map((s) => ({ value: s, label: `${s.toFixed(1)}` }))}
            unit="m"
          />
          <NumberField label={t('routeLength')} value={params.routeLengthM} onChange={(v) => setParam('routeLengthM', v)} step={5} min={1} unit="m" />
          <NumberField label={t('ambientTemp')} value={params.ambientTempC} onChange={(v) => setParam('ambientTempC', v)} step={1} min={10} max={80} unit="deg C" />
          <Toggle checked={params.coverInstalled} onChange={(v) => setParam('coverInstalled', v)} label={t('coverInstalled')} />
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle>{t('arrangement')}</SectionTitle>
        <div className="px-4 pb-3">
          <Toggle checked={layout.autoArrange} onChange={(v) => setLayout('autoArrange', v)} label={t('autoArrange')} />
          <Toggle checked={layout.segregateFrc} onChange={(v) => setLayout('segregateFrc', v)} label={t('segregateFrc')} />
          <NumberField label={t('edgeClearance')} value={layout.edgeClearanceMm} onChange={(v) => setLayout('edgeClearanceMm', v)} step={5} min={0} max={100} unit="mm" />
          <NumberField label={t('layerGap')} value={layout.layerGapMm} onChange={(v) => setLayout('layerGapMm', v)} step={1} min={0} max={50} unit="mm" />
        </div>
      </GlassCard>
    </div>
  );
}

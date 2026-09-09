import { useMemo, useState } from 'react';
import { ALL_ENTRIES, findEntry, isVerified } from '../../core/catalog';
import { cableArea } from '../../core/traySizing';
import { typeColor } from '../../core/colors';
import { useAppStore } from '../../store/useAppStore';
import { useCalculations } from '../../store/useCalculations';
import { Badge, Button, GlassCard, SectionTitle } from '../ui';
import { useT } from '../ui/useT';
import { fmt } from '../ui/format';
import { ImportScheduleButton } from './ImportScheduleButton';
import type { CableRun } from '../../core/types';

/** Editable combined cable schedule - the app's input table. */
export function ScheduleTable() {
  const t = useT();
  const schedule = useAppStore((s) => s.schedule);
  const panelFilter = useAppStore((s) => s.panelFilter);
  const selectedRunId = useAppStore((s) => s.selectedRunId);
  const setPanelFilter = useAppStore((s) => s.setPanelFilter);
  const setSelectedRun = useAppStore((s) => s.setSelectedRun);
  const updateRun = useAppStore((s) => s.updateRun);
  const removeRun = useAppStore((s) => s.removeRun);
  const addRun = useAppStore((s) => s.addRun);
  const loadSample = useAppStore((s) => s.loadSample);
  const clearSchedule = useAppStore((s) => s.clearSchedule);

  const [query, setQuery] = useState('');
  const { derating } = useCalculations();

  /**
   * Utilisasi tertinggi per baris schedule. Satu baris bisa berisi beberapa run paralel dan
   * tiap run diperiksa sendiri, jadi yang dipakai menandai baris adalah yang terburuk.
   */
  const worstUtilByRun = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of derating.perCable) {
      if (!c.loadKnown) continue;
      m.set(c.runId, Math.max(m.get(c.runId) ?? 0, c.utilisation));
    }
    return m;
  }, [derating]);

  const panels = useMemo(() => [...new Set(schedule.map((r) => r.panel))], [schedule]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schedule.filter(
      (r) =>
        (panelFilter === 'ALL' || r.panel === panelFilter) &&
        (q === '' ||
          r.circuit.toLowerCase().includes(q) ||
          r.panel.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)),
    );
  }, [schedule, panelFilter, query]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          const e = findEntry(r.typeCode);
          if (!e) return acc;
          acc.runs += r.runs;
          acc.width += r.runs * e.odMm;
          acc.area += r.runs * cableArea(e.odMm);
          return acc;
        },
        { runs: 0, width: 0, area: 0 },
      ),
    [rows],
  );

  const handleAdd = () => {
    const n = schedule.length + 1;
    const run: CableRun = {
      id: `C${String(n).padStart(3, '0')}-${Date.now().toString(36)}`,
      panel: panelFilter === 'ALL' ? (panels[0] ?? 'PANEL-1') : panelFilter,
      circuit: `NEW-${n}`,
      category: 'OUTGOING',
      loadKw: undefined,
      description: '1x3C-4mm2 Cu/XLPE/PVC',
      typeCode: '3C-4',
      runs: 1,
    };
    addRun(run);
    setSelectedRun(run.id);
  };

  return (
    <GlassCard className="flex h-full flex-col overflow-hidden">
      <SectionTitle
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="field w-44"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="field w-44" value={panelFilter} onChange={(e) => setPanelFilter(e.target.value)}>
              <option value="ALL">{t('allPanels')}</option>
              {panels.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Button onClick={handleAdd} tone="accent" active>+ {t('addCable')}</Button>
            <ImportScheduleButton />
            <Button onClick={loadSample}>{t('loadSample')}</Button>
            <Button onClick={clearSchedule} tone="danger">{t('clearAll')}</Button>
          </div>
        }
      >
        {t('scheduleTitle')} &middot; {rows.length} {t('cables')}
      </SectionTitle>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto px-2 pb-2">
        <table className="w-full border-separate border-spacing-0 text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(14px)' }}>
              {[t('no'), t('panel'), t('circuit'), t('category'), `${t('load')} (kW)`, t('cableDescription'), t('type'), t('qtyRuns'), `${t('od')} (mm)`, `${t('totalWidthCol')} (mm)`, `${t('totalAreaCol')} (mm2)`, t('utilisation'), ''].map((h, i) => (
                <th
                  key={i}
                  className="border-b px-2 py-2 text-left text-[11px] font-semibold whitespace-nowrap uppercase"
                  style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const e = findEntry(r.typeCode);
              const selected = selectedRunId === r.id;
              const util = worstUtilByRun.get(r.id);
              return (
                <tr
                  key={r.id}
                  onClick={() => setSelectedRun(selected ? null : r.id)}
                  className="press cursor-pointer"
                  style={{ background: rowBackground(selected, worstUtilByRun.get(r.id)) }}
                  title={overloadTitle(worstUtilByRun.get(r.id))}
                >
                  <td className="tabular border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)', color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    <input className="field" value={r.panel} onChange={(ev) => updateRun(r.id, { panel: ev.target.value })} onClick={(ev) => ev.stopPropagation()} />
                  </td>
                  <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    <input className="field min-w-[150px]" value={r.circuit} onChange={(ev) => updateRun(r.id, { circuit: ev.target.value })} onClick={(ev) => ev.stopPropagation()} />
                  </td>
                  <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    <select className="field" value={r.category} onChange={(ev) => updateRun(r.id, { category: ev.target.value })} onClick={(ev) => ev.stopPropagation()}>
                      <option value="INCOMING">INCOMING</option>
                      <option value="OUTGOING">OUTGOING</option>
                      <option value="SPARE">SPARE</option>
                    </select>
                  </td>
                  <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    <input
                      className="field tabular w-20"
                      type="number"
                      step={0.1}
                      value={r.loadKw ?? ''}
                      onChange={(ev) => updateRun(r.id, { loadKw: ev.target.value === '' ? undefined : Number(ev.target.value) })}
                      onClick={(ev) => ev.stopPropagation()}
                    />
                  </td>
                  <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    <input className="field min-w-[220px]" value={r.description} onChange={(ev) => updateRun(r.id, { description: ev.target.value })} onClick={(ev) => ev.stopPropagation()} />
                  </td>
                  <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: typeColor(r.typeCode) }} />
                      <select className="field min-w-[170px]" value={r.typeCode} onChange={(ev) => updateRun(r.id, { typeCode: ev.target.value })} onClick={(ev) => ev.stopPropagation()}>
                        {ALL_ENTRIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id} - {c.family} {c.cores}C x {c.sizeMm2} ({c.odMm} mm){isVerified(c) ? '' : ' *'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    <input className="field tabular w-16" type="number" min={1} value={r.runs} onChange={(ev) => updateRun(r.id, { runs: Math.max(1, Number(ev.target.value)) })} onClick={(ev) => ev.stopPropagation()} />
                  </td>
                  <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    {e ? fmt(e.odMm, 1) : '-'}
                    {e && !isVerified(e) && <span style={{ color: 'var(--warn)' }} title={e.note}> *</span>}
                  </td>
                  <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{e ? fmt(r.runs * e.odMm, 1) : '-'}</td>
                  <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{e ? fmt(r.runs * cableArea(e.odMm), 1) : '-'}</td>
                  <td className="tabular border-b px-2 py-1 text-right font-semibold" style={{ borderColor: 'var(--glass-border-soft)', color: utilColor(util) }}>
                    {util === undefined ? '-' : `${(util * 100).toFixed(0)} %`}
                  </td>
                  <td className="border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>
                    <button
                      className="press rounded-lg px-2 py-1 text-[11px]"
                      style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}
                      onClick={(ev) => { ev.stopPropagation(); removeRun(r.id); }}
                    >
                      {t('deleteCable')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--glass-bg-strong)' }}>
              <td colSpan={7} className="px-2 py-2 text-right text-[12px] font-bold">{t('total')}</td>
              <td className="tabular px-2 py-2 text-right text-[12px] font-bold">{totals.runs}</td>
              <td />
              <td className="tabular px-2 py-2 text-right text-[12px] font-bold">{fmt(totals.width, 1)}</td>
              <td className="tabular px-2 py-2 text-right text-[12px] font-bold">{fmt(totals.area, 1)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 text-[11px]" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border-soft)' }}>
        <Badge tone="warn">*</Badge>
        {t('dataSourceNote')}
        <span className="mx-1">&middot;</span>
        <span style={{ color: 'var(--danger)' }}>&#9632;</span> {t('rowOverload')}
        <span className="mx-1">&middot;</span>
        <span style={{ color: 'var(--warn)' }}>&#9632;</span> {t('rowNearLimit')}
      </div>
    </GlassCard>
  );
}

function utilColor(utilisation: number | undefined): string {
  if (utilisation === undefined) return 'var(--text-muted)';
  if (utilisation > OVERLOAD) return 'var(--danger)';
  if (utilisation >= NEAR_LIMIT) return 'var(--warn)';
  return 'var(--ok)';
}

/** Ambang penandaan: di atas 100 % kabel melebihi KHA terkoreksi, 80 - 100 % sudah mepet. */
const OVERLOAD = 1;
const NEAR_LIMIT = 0.8;

/**
 * Warna latar baris. Baris yang melebihi KHA terkoreksi diberi latar merah supaya terlihat
 * langsung dari daftar tanpa harus membuka tab Termal; yang mendekati batas diberi kuning.
 * Baris terpilih tetap menang agar pilihan user tidak hilang.
 */
function rowBackground(selected: boolean, utilisation: number | undefined): string {
  if (selected) return 'var(--accent-soft)';
  if (utilisation === undefined) return 'transparent';
  if (utilisation > OVERLOAD) return 'var(--row-danger)';
  if (utilisation >= NEAR_LIMIT) return 'var(--row-warn)';
  return 'transparent';
}

function overloadTitle(utilisation: number | undefined): string | undefined {
  if (utilisation === undefined || utilisation < NEAR_LIMIT) return undefined;
  const pctText = `${(utilisation * 100).toFixed(0)} %`;
  return utilisation > OVERLOAD
    ? `Arus desain ${pctText} dari KHA terkoreksi - melebihi batas. Perbesar ukuran kabel, renggangkan penataan, atau pecah tray.`
    : `Arus desain ${pctText} dari KHA terkoreksi - mendekati batas.`;
}

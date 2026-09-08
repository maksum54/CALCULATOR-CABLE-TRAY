import { useMemo, useState } from 'react';
import { ALL_ENTRIES, FAMILIES, isVerified } from '../../core/catalog';
import { typeColor } from '../../core/colors';
import { useAppStore } from '../../store/useAppStore';
import { Badge, Button, GlassCard, SectionTitle, fmt, useT } from '../ui';

/** Browsable cable catalogue: verified KMI datasheet data plus the project's own entries. */
export function CatalogPanel() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const [family, setFamily] = useState<string>('ALL');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_ENTRIES.filter(
      (e) =>
        (family === 'ALL' || e.family === family) &&
        (q === '' || e.id.toLowerCase().includes(q) || e.construction.toLowerCase().includes(q)),
    );
  }, [family, query]);

  const verifiedCount = rows.filter(isVerified).length;

  return (
    <GlassCard className="flex h-full flex-col overflow-hidden">
      <SectionTitle
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            <input className="field w-40" placeholder={t('searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button active={family === 'ALL'} onClick={() => setFamily('ALL')}>All</Button>
            {FAMILIES.map((f) => (
              <Button key={f} active={family === f} onClick={() => setFamily(f)}>{f}</Button>
            ))}
          </div>
        }
      >
        {t('catalogTitle')} &middot; {rows.length} &middot;{' '}
        <span style={{ color: 'var(--ok)' }}>{verifiedCount} {t('verified').toLowerCase()}</span>
      </SectionTitle>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto px-2 pb-2">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(14px)' }}>
              {['', t('type'), t('family'), t('cores'), `${t('size')} (mm2)`, `${t('od')} (mm)`, `${t('weightKgKm')} (kg/km)`, `${t('ampacityAir')} (A)`, `${t('ampacityGround')} (A)`, 'R DC 20 (ohm/km)', 'Isc 1s (kA)', t('datasheet')].map((h) => (
                <th key={h} className="border-b px-2 py-2 text-left text-[11px] font-semibold uppercase whitespace-nowrap" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} title={e.note}>
                <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: typeColor(e.id) }} />
                </td>
                <td className="border-b px-2 py-1 font-medium whitespace-nowrap" style={{ borderColor: 'var(--glass-border-soft)' }}>
                  {e.id}{' '}
                  {isVerified(e) ? null : <Badge tone="warn">*</Badge>}
                </td>
                <td className="border-b px-2 py-1 whitespace-nowrap" style={{ borderColor: 'var(--glass-border-soft)', color: 'var(--text-secondary)' }}>{e.family} &middot; {e.construction}</td>
                <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{e.cores}</td>
                <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{e.sizeMm2}</td>
                <td className="tabular border-b px-2 py-1 text-right font-semibold" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(e.odMm, 1)}</td>
                <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{fmt(e.weightKgKm, 0)}</td>
                <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{e.ampAir ?? e.ampPipe ?? '-'}</td>
                <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)' }}>{e.ampGround ?? '-'}</td>
                <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)', color: 'var(--text-muted)' }}>{e.rdc20 ?? '-'}</td>
                <td className="tabular border-b px-2 py-1 text-right" style={{ borderColor: 'var(--glass-border-soft)', color: 'var(--text-muted)' }}>{e.scCurrentKa ?? '-'}</td>
                <td className="border-b px-2 py-1 text-[10.5px] whitespace-nowrap" style={{ borderColor: 'var(--glass-border-soft)', color: 'var(--text-muted)' }}>{e.datasheet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border-soft)' }}>
        {lang === 'id'
          ? 'Data KMI ditranskrip langsung dari datasheet PT KMI Wire and Cable Tbk (NYA 12104-01, NYY 14233-xx, NYFGbY 16233-xx Rev. 2.0 / 2009). Baris bertanda * berasal dari data proyek dan belum diverifikasi ke katalog pabrikan.'
          : 'The KMI rows are transcribed directly from the PT KMI Wire and Cable Tbk datasheets (NYA 12104-01, NYY 14233-xx, NYFGbY 16233-xx Rev. 2.0 / 2009). Rows marked * come from project data and have not been verified against a manufacturer catalogue.'}
      </div>
    </GlassCard>
  );
}

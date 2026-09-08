import { useRef, useState } from 'react';
import { importScheduleFromCsv, importScheduleFromExcel, type ImportResult } from '../../import/scheduleImport';
import { findEntry } from '../../core/catalog';
import { useAppStore } from '../../store/useAppStore';
import { Badge, Button, useT } from '../ui';

/**
 * Tombol "Import Excel/CSV" + modal pratinjau. File dibaca sepenuhnya di
 * browser (tanpa server). User dapat melihat hasil parsing dulu, lalu
 * memilih menambahkan ke schedule yang ada atau menggantinya.
 */
export function ImportScheduleButton() {
  const t = useT();
  const replaceSchedule = useAppStore((s) => s.replaceSchedule);
  const addRun = useAppStore((s) => s.addRun);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(ImportResult & { fileName: string }) | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const name = file.name.toLowerCase();
      const parsed = name.endsWith('.csv')
        ? await importScheduleFromCsv(file)
        : await importScheduleFromExcel(file);
      setResult({ ...parsed, fileName: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const apply = (mode: 'replace' | 'append') => {
    if (!result) return;
    if (mode === 'replace') replaceSchedule(result.runs);
    else result.runs.forEach(addRun);
    setResult(null);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? '...' : t('importSchedule')}
      </Button>

      {error && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setError(null)}
        >
          <div className="glass-strong max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--danger)' }}>
              {t('importFailed')}
            </h4>
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <div className="mt-4 text-right">
              <Button onClick={() => setError(null)}>{t('close')}</Button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div className="glass-strong flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
              <div>
                <h4 className="text-[14px] font-semibold">{t('importPreviewTitle')}</h4>
                <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  {result.fileName} &middot; {result.runs.length} {t('cables')}
                </p>
              </div>
              <Badge tone="accent">{t('importBadge')}</Badge>
            </div>

            {result.warnings.length > 0 && (
              <div className="mx-5 mb-2 rounded-lg px-3 py-2 text-[11.5px]" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
                {result.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}

            <div className="scroll-thin min-h-0 flex-1 overflow-auto px-5">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0" style={{ background: 'var(--glass-bg-strong)' }}>
                  <tr>
                    {[t('panel'), t('circuit'), t('category'), t('cableDescription'), t('type'), t('qtyRuns')].map((h) => (
                      <th key={h} className="border-b px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.runs.slice(0, 100).map((r) => {
                    const e = findEntry(r.typeCode);
                    return (
                      <tr key={r.id}>
                        <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{r.panel}</td>
                        <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{r.circuit}</td>
                        <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{r.category}</td>
                        <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{r.description}</td>
                        <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                          {r.typeCode} ({e ? `${e.cores}C x ${e.sizeMm2}, OD ${e.odMm}mm` : '?'})
                        </td>
                        <td className="tabular border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{r.runs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {result.runs.length > 100 && (
                <p className="py-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  +{result.runs.length - 100} {t('importMoreRows')}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--glass-border-soft)' }}>
              <Button onClick={() => setResult(null)}>{t('cancel')}</Button>
              <Button onClick={() => apply('append')}>{t('importAppend')}</Button>
              <Button tone="accent" active onClick={() => apply('replace')}>{t('importReplace')}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

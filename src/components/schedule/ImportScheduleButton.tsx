import { useMemo, useRef, useState } from 'react';
import {
  importScheduleFromCsv,
  importScheduleFromExcel,
  NEEDS_REVIEW,
  type ImportResult,
  type ImportWarning,
  type MatchQuality,
} from '../../import/scheduleImport';
import { ALL_ENTRIES, findEntry } from '../../core/catalog';
import { useAppStore } from '../../store/useAppStore';
import { Badge, Button } from '../ui';
import { useT } from '../ui/useT';

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
  /** Tipe yang dipilih ulang user di pratinjau, per id baris. */
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [onlyReview, setOnlyReview] = useState(false);

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
      setOverrides({});
      // Kalau ada yang butuh perhatian, langsung saring supaya user tidak perlu mencarinya.
      setOnlyReview(parsed.rows.some((r) => NEEDS_REVIEW.includes(r.quality)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  /** Kualitas efektif: baris yang tipenya sudah dikoreksi user tidak lagi perlu diperiksa. */
  const effectiveQuality = (id: string, q: MatchQuality): MatchQuality =>
    overrides[id] ? 'exact' : q;

  const reviewCount = useMemo(
    () =>
      result?.rows.filter((r) => NEEDS_REVIEW.includes(effectiveQuality(r.run.id, r.quality)))
        .length ?? 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, overrides],
  );

  const visibleRows = useMemo(() => {
    const all = result?.rows ?? [];
    return onlyReview
      ? all.filter((r) => NEEDS_REVIEW.includes(effectiveQuality(r.run.id, r.quality)))
      : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, onlyReview, overrides]);

  const apply = (mode: 'replace' | 'append') => {
    if (!result) return;
    // Tipe yang dikoreksi user menang atas tebakan parser.
    const runs = result.rows.map((r) =>
      overrides[r.run.id] ? { ...r.run, typeCode: overrides[r.run.id] } : r.run,
    );
    if (mode === 'replace') replaceSchedule(runs);
    else runs.forEach(addRun);
    setResult(null);
    setOverrides({});
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
          className="modal-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setError(null)}
        >
          <div className="modal-surface max-w-md p-5" onClick={(e) => e.stopPropagation()}>
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
          className="modal-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="modal-surface flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
              <div>
                <h4 className="text-[14px] font-semibold">{t('importPreviewTitle')}</h4>
                <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  {result.fileName} &middot; {result.runs.length} {t('cables')}
                </p>
              </div>
              <Badge tone="accent">{t('importBadge')}</Badge>
            </div>

            {/* Kolom yang dipakai parser ditampilkan supaya user bisa memverifikasi bahwa
                TYPE dan OD memang diambil dari kolom yang benar sebelum menerapkan. */}
            <div
              className="mx-5 mb-2 rounded-lg px-3 py-2 text-[11px]"
              style={{ background: 'var(--glass-bg)', color: 'var(--text-muted)' }}
            >
              <span className="font-semibold">{t('importDetected')}:</span>{' '}
              <span className="tabular">
                {result.detected.sheet} &middot; {t('importDetectedHeader')} {result.detected.headerRow} &middot;{' '}
                {t('importDetectedType')} {result.detected.typeColumn} &middot; {t('importDetectedOd')}{' '}
                {result.detected.odColumn}
                {result.detected.panel ? ` \u00b7 ${result.detected.panel}` : ''}
              </span>
            </div>

            {result.warnings.length > 0 && (
              <div className="mx-5 mb-2 space-y-1 rounded-lg px-3 py-2 text-[11.5px]" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
                {result.warnings.map((w) => (
                  <p key={w.code}>{warningText(t, w)}</p>
                ))}
              </div>
            )}

            {/* Sisa baris yang belum beres selalu terlihat, dan bisa disaring supaya user
                tidak perlu menelusuri ratusan baris untuk menemukannya. */}
            <div className="mx-5 mb-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
              <span style={{ color: reviewCount > 0 ? 'var(--warn)' : 'var(--ok)' }}>
                {reviewCount > 0 ? t('importNeedsReview', { n: reviewCount }) : t('importAllResolved')}
              </span>
              {result.rows.some((r) => NEEDS_REVIEW.includes(r.quality)) && (
                <label className="flex cursor-pointer items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <input type="checkbox" checked={onlyReview} onChange={(e) => setOnlyReview(e.target.checked)} />
                  {t('importOnlyReview')}
                </label>
              )}
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-auto px-5">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0" style={{ background: 'var(--glass-bg-strong)' }}>
                  <tr>
                    {[t('panel'), t('circuit'), t('cableDescription'), t('type'), t('od'), t('qtyRuns')].map((h) => (
                      <th key={h} className="border-b px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.slice(0, 100).map((row) => {
                    const id = row.run.id;
                    const typeCode = overrides[id] ?? row.run.typeCode;
                    const entry = findEntry(typeCode);
                    const q = effectiveQuality(id, row.quality);
                    const needs = NEEDS_REVIEW.includes(q);
                    return (
                      <tr key={id} style={{ background: needs ? 'var(--warn-soft)' : undefined }}>
                        <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{row.run.panel}</td>
                        <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{row.run.circuit}</td>
                        <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{row.run.description}</td>
                        <td className="border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>
                          {/* Tipe bisa dikoreksi di sini; diameternya selalu ikut katalog. */}
                          <div className="flex items-center gap-1.5">
                            <select
                              className="field min-w-[190px]"
                              value={typeCode}
                              onChange={(e) => setOverrides((o) => ({ ...o, [id]: e.target.value }))}
                            >
                              {ALL_ENTRIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.id} - {c.family} {c.cores}C x {c.sizeMm2} ({c.odMm} mm)
                                </option>
                              ))}
                            </select>
                            <Badge tone={qualityTone(q)}>{t(QUALITY_KEY[q])}</Badge>
                          </div>
                        </td>
                        <td className="tabular border-b px-2 py-1 whitespace-nowrap" style={{ borderColor: 'var(--glass-border-soft)' }}>
                          {entry ? `${entry.odMm} mm` : '?'}
                          {/* OD asli dari file ditampilkan hanya kalau berbeda, supaya jelas
                              angka mana yang dipakai menghitung dan seberapa jauh gesernya. */}
                          {row.fileOdMm !== undefined && entry && Math.abs(row.fileOdMm - entry.odMm) > 0.05 && (
                            <span className="ml-1" style={{ color: 'var(--warn)' }}>
                              ({t('importFileOd')} {row.fileOdMm})
                            </span>
                          )}
                        </td>
                        <td className="tabular border-b px-2 py-1" style={{ borderColor: 'var(--glass-border-soft)' }}>{row.run.runs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleRows.length > 100 && (
                <p className="py-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  +{visibleRows.length - 100} {t('importMoreRows')}
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

const QUALITY_KEY = {
  exact: 'importQualityExact',
  odFallback: 'importQualityOdFallback',
  odApprox: 'importQualityOdApprox',
  odMismatch: 'importQualityOdMismatch',
  unresolved: 'importQualityUnresolved',
} as const;

function qualityTone(q: MatchQuality): 'ok' | 'accent' | 'warn' | 'danger' {
  if (q === 'exact') return 'ok';
  if (q === 'odFallback') return 'accent';
  if (q === 'unresolved') return 'danger';
  return 'warn';
}

/** Peringatan parser datang sebagai kode + jumlah, teksnya dirakit di sini. */
function warningText(t: ReturnType<typeof useT>, w: ImportWarning): string {
  switch (w.code) {
    case 'skippedImplausible':
      return t('importWarnSkipped', { n: w.count, max: w.max ?? 0 });
    case 'skippedSpare':
      return t('importWarnSpare', { n: w.count });
    case 'odMismatch':
      return t('importWarnOdMismatch', { n: w.count });
    case 'odFallback':
      return t('importWarnOdFallback', { n: w.count });
    case 'odApprox':
      return t('importWarnOdApprox', { n: w.count });
    case 'unresolved':
      return t('importWarnUnresolved', { n: w.count });
  }
}

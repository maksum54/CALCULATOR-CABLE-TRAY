import { useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import { useAppStore } from '../../store/useAppStore';
import { useCalculations } from '../../store/useCalculations';
import { buildWorkbook } from '../../export/excel';
import { buildReport } from '../../export/pdf';
import { buildSectionDxf } from '../../export/dxf';
import { buildBimJson } from '../../export/json3d';
import { buildSectionSvg, capture3D, svgToPng } from '../../export/sectionSvg';
import { Badge, Button, GlassCard, SectionTitle, TextField, useT } from '../ui';
import type { DictKey } from '../../i18n';

type Job = 'excel' | 'pdf' | 'dxf' | 'json' | 'svg';

/** Export tab: project title block plus the five output formats. */
export function ExportPanel() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const params = useAppStore((s) => s.params);
  const layout = useAppStore((s) => s.layout);
  const schedule = useAppStore((s) => s.schedule);
  const project = useAppStore((s) => s.project);
  const setProject = useAppStore((s) => s.setProject);
  const selectedTrayIndex = useAppStore((s) => s.selectedTrayIndex);
  const scenePngCached = useAppStore((s) => s.scenePng);
  const calc = useCalculations();

  const [busy, setBusy] = useState<Job | null>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'warn' | 'danger'; text: string } | null>(null);

  const slug = useMemo(
    () => `${project.drawingNo || 'cable-tray'}-${project.revision || 'R0'}`.replace(/[^\w.-]+/g, '_'),
    [project],
  );

  const tray = calc.trays[Math.min(selectedTrayIndex, calc.trays.length - 1)] ?? calc.trays[0];

  const heatByRun = useMemo(() => {
    const m = new Map<string, number>();
    const counters = new Map<string, number>();
    for (const c of calc.derating.perCable) {
      const idx = (counters.get(c.runId) ?? 0) + 1;
      counters.set(c.runId, idx);
      m.set(`${c.runId}#${idx}`, c.thermalIndex);
    }
    return m;
  }, [calc.derating]);

  const sectionTitle = `${project.name} - ${t('sectionTitle')}`;
  const sectionSubtitle = `${project.drawingNo} ${project.revision} | tray ${(tray?.trayIndex ?? 0) + 1}/${calc.sizing.trayRunsRequired} | ${params.selectedTrayWidthMm} x ${params.trayHeightMm} mm | ${tray?.cables.length ?? 0} cables | fill ${(calc.sizing.actualFillRatio * 100).toFixed(2)} %`;

  const run = async (job: Job, fn: () => Promise<void> | void) => {
    setBusy(job);
    setStatus(null);
    try {
      await fn();
      setStatus((s) => s ?? { tone: 'ok', text: lang === 'id' ? 'Berkas berhasil dibuat.' : 'File generated.' });
    } catch (err) {
      setStatus({ tone: 'danger', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  };

  const exportExcel = () =>
    run('excel', async () => {
      const blob = await buildWorkbook({
        project, params, schedule,
        sizing: calc.sizing, weight: calc.weight, support: calc.support, derating: calc.derating,
      });
      saveAs(blob, `${slug}-cable-tray-calculation.xlsx`);
    });

  const sectionSvgString = (dark: boolean, showHeatmap = false) =>
    buildSectionSvg({
      tray, trayWidthMm: params.selectedTrayWidthMm, trayHeightMm: params.trayHeightMm,
      trayType: params.trayType, edgeClearanceMm: layout.edgeClearanceMm,
      showLabels: tray.cables.length <= 90, showHeatmap, heatByRun,
      title: sectionTitle, subtitle: sectionSubtitle, dark,
    });

  const exportPdf = () =>
    run('pdf', async () => {
      const sectionPng = await svgToPng(sectionSvgString(false), 1800);
      // Live canvas first; otherwise the frame the 3D tab cached before it unmounted.
      const scenePng = capture3D() ?? scenePngCached ?? undefined;
      const blob = buildReport({
        project, params, schedule,
        sizing: calc.sizing, weight: calc.weight, support: calc.support,
        derating: calc.derating, bending: calc.bending,
        sectionPng, scenePng, lang,
      });
      saveAs(blob, `${slug}-cable-tray-report.pdf`);
      if (!scenePng) {
        setStatus({
          tone: 'warn',
          text: lang === 'id'
            ? 'PDF dibuat, tetapi snapshot 3D dilewati - buka tab Visualizer 3D sekali lalu export ulang untuk menyertakannya.'
            : 'PDF generated, but the 3D snapshot was skipped - open the 3D Visualizer tab once and export again to include it.',
        });
      }
    });

  const exportDxf = () =>
    run('dxf', () => {
      const dxf = buildSectionDxf({
        tray, trayWidthMm: params.selectedTrayWidthMm, trayHeightMm: params.trayHeightMm,
        trayType: params.trayType, edgeClearanceMm: layout.edgeClearanceMm,
        title: sectionTitle, subtitle: sectionSubtitle, showLabels: tray.cables.length <= 90,
      });
      saveAs(new Blob([dxf], { type: 'application/dxf' }), `${slug}-cross-section.dxf`);
    });

  const exportJson = () =>
    run('json', () => {
      const json = buildBimJson({
        project, params, sizing: calc.sizing, weight: calc.weight,
        support: calc.support, trays: calc.trays, schedule,
      });
      saveAs(new Blob([json], { type: 'application/json' }), `${slug}-3d.json`);
    });

  const exportSvg = () =>
    run('svg', () => {
      saveAs(new Blob([sectionSvgString(false)], { type: 'image/svg+xml' }), `${slug}-cross-section.svg`);
    });

  const cards: { job: Job; title: DictKey; desc: DictKey; onClick: () => void }[] = [
    { job: 'excel', title: 'exportExcel', desc: 'exportExcelDesc', onClick: exportExcel },
    { job: 'pdf', title: 'exportPdf', desc: 'exportPdfDesc', onClick: exportPdf },
    { job: 'dxf', title: 'exportDxf', desc: 'exportDxfDesc', onClick: exportDxf },
    { job: 'json', title: 'exportJson', desc: 'exportJsonDesc', onClick: exportJson },
  ];

  return (
    <div className="grid gap-3 xl:grid-cols-[340px_1fr]">
      <GlassCard>
        <SectionTitle>{t('projectInfo')}</SectionTitle>
        <div className="px-4 pb-4">
          <TextField label={t('projectName')} value={project.name} onChange={(v) => setProject('name', v)} />
          <TextField label={t('drawingNo')} value={project.drawingNo} onChange={(v) => setProject('drawingNo', v)} />
          <TextField label={t('revision')} value={project.revision} onChange={(v) => setProject('revision', v)} />
          <TextField label={t('date')} value={project.date} onChange={(v) => setProject('date', v)} />
          <TextField label={t('preparedBy')} value={project.preparedBy} onChange={(v) => setProject('preparedBy', v)} placeholder="..." />
          <TextField label={t('checkedBy')} value={project.checkedBy} onChange={(v) => setProject('checkedBy', v)} placeholder="..." />
        </div>
      </GlassCard>

      <div className="space-y-3">
        <GlassCard>
          <SectionTitle right={status ? <Badge tone={status.tone}>{status.text}</Badge> : undefined}>
            {t('exportTitle')}
          </SectionTitle>
          <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
            {cards.map((c) => (
              <div
                key={c.job}
                className="glass-sheen rounded-2xl p-3.5"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border-soft)' }}
              >
                <div className="mb-1 text-[13px] font-semibold">{t(c.title)}</div>
                <p className="mb-3 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {t(c.desc)}
                </p>
                <Button onClick={c.onClick} tone="accent" active disabled={busy !== null}>
                  {busy === c.job ? '...' : t(c.title)}
                </Button>
              </div>
            ))}
          </div>
          <div className="px-4 pb-4">
            <Button onClick={exportSvg} disabled={busy !== null}>
              {busy === 'svg' ? '...' : 'Export SVG (vector)'}
            </Button>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>{t('notes')}</SectionTitle>
          <div className="px-4 pb-4 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {lang === 'id' ? (
              <ul className="space-y-1.5">
                <li>Excel diekspor sebagai workbook berformula hidup (INDEX/MATCH, SUMIF, MAX, ROUNDUP, IF) dengan tata letak mengikuti CABLETRAYCALCULATION_RMW_1.xlsx, sehingga bisa dibandingkan sel per sel.</li>
                <li>DXF ditulis 1:1 dalam milimeter dengan layer TRAY, CABLE, DIM, TEXT, CLEARANCE, dan DIVIDER.</li>
                <li>Snapshot 3D diambil dari canvas WebGL - buka tab Visualizer 3D minimal sekali sebelum export PDF.</li>
                <li>Penampang yang diekspor adalah tray yang sedang dipilih pada tab Penampang 2D ({(tray?.trayIndex ?? 0) + 1} dari {calc.sizing.trayRunsRequired}).</li>
              </ul>
            ) : (
              <ul className="space-y-1.5">
                <li>Excel is exported as a live formula workbook (INDEX/MATCH, SUMIF, MAX, ROUNDUP, IF) laid out like CABLETRAYCALCULATION_RMW_1.xlsx, so the two compare cell for cell.</li>
                <li>DXF is written 1:1 in millimetres on the TRAY, CABLE, DIM, TEXT, CLEARANCE and DIVIDER layers.</li>
                <li>The 3D snapshot is read from the WebGL canvas - open the 3D Visualizer tab at least once before exporting the PDF.</li>
                <li>The exported section is the tray currently selected on the 2D tab ({(tray?.trayIndex ?? 0) + 1} of {calc.sizing.trayRunsRequired}).</li>
              </ul>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

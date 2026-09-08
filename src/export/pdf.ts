// Formal engineering calculation report.
//
// A4 portrait, drawing-office layout: title block, the calculation worked through step by step
// with the formula shown next to every result, the 2D cross-section and the 3D view, the
// engineering checks with their verdicts, the assumptions, and a signature/stamp block. Page
// numbers and the document reference repeat in the footer so a printed copy stays traceable.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  BendingResult,
  CableRun,
  DeratingResult,
  SizingResult,
  SupportResult,
  TrayParams,
  WeightResult,
} from '../core/types';
import { findEntry, isVerified } from '../core/catalog';
import type { ProjectInfo } from '../store/useAppStore';

export interface PdfInput {
  project: ProjectInfo;
  params: TrayParams;
  schedule: CableRun[];
  sizing: SizingResult;
  weight: WeightResult;
  support: SupportResult;
  derating: DeratingResult;
  bending: BendingResult;
  sectionPng?: string;
  scenePng?: string;
  lang: 'id' | 'en';
}

const NAVY: [number, number, number] = [31, 56, 100];
const GREY: [number, number, number] = [110, 120, 135];
const OK: [number, number, number] = [5, 120, 85];
const BAD: [number, number, number] = [200, 30, 30];

const M = 14; // page margin, mm
const n = (v: number, d = 2) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const T = {
  id: {
    report: 'LAPORAN PERHITUNGAN CABLE TRAY',
    params: 'A. PARAMETER DESAIN',
    summary: 'B. REKAP DATA KABEL',
    method1: 'C. METODE 1 - LEBAR BERDASARKAN JUMLAH DIAMETER',
    method2: 'D. METODE 2 - LEBAR BERDASARKAN RASIO PENGISIAN',
    result: 'E. HASIL - LEBAR PENENTU & KONFIGURASI TRAY',
    section: 'F. PENAMPANG MELINTANG TRAY',
    view3d: 'G. VISUALISASI 3D',
    weight: 'H. BEBAN, SUPPORT & LENDUTAN',
    thermal: 'I. FAKTOR KOREKSI & DERATING',
    bending: 'J. RADIUS LENGKUNG MINIMUM',
    notes: 'K. CATATAN & ASUMSI',
    stamp: 'STEMPEL PERHITUNGAN TEKNIS',
    prepared: 'Disiapkan oleh',
    checked: 'Diperiksa oleh',
    approved: 'Disetujui oleh',
    date: 'Tanggal',
    desc: 'Uraian',
    value: 'Nilai',
    unit: 'Satuan',
    formula: 'Formula / Keterangan',
    page: 'Halaman',
    ok: 'MEMENUHI',
    bad: 'TIDAK MEMENUHI',
  },
  en: {
    report: 'CABLE TRAY CALCULATION REPORT',
    params: 'A. DESIGN PARAMETERS',
    summary: 'B. CABLE DATA SUMMARY',
    method1: 'C. METHOD 1 - WIDTH FROM THE SUM OF CABLE DIAMETERS',
    method2: 'D. METHOD 2 - WIDTH FROM THE FILL RATIO',
    result: 'E. RESULT - GOVERNING WIDTH & TRAY CONFIGURATION',
    section: 'F. TRAY CROSS-SECTION',
    view3d: 'G. 3D VISUALISATION',
    weight: 'H. WEIGHT, SUPPORT & DEFLECTION',
    thermal: 'I. CORRECTION FACTORS & DERATING',
    bending: 'J. MINIMUM BENDING RADIUS',
    notes: 'K. NOTES & ASSUMPTIONS',
    stamp: 'ENGINEERING CALCULATION STAMP',
    prepared: 'Prepared by',
    checked: 'Checked by',
    approved: 'Approved by',
    date: 'Date',
    desc: 'Description',
    value: 'Value',
    unit: 'Unit',
    formula: 'Formula / Remarks',
    page: 'Page',
    ok: 'PASS',
    bad: 'FAIL',
  },
};

export function buildReport(input: PdfInput): Blob {
  const { project, params, sizing, weight, support, derating, bending, schedule } = input;
  const t = T[input.lang];
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = M;

  // ------------------------------------------------------------------ title block
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold').setFontSize(14);
  doc.text(t.report, M, 12);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text(`${project.name}`, M, 19);
  doc.text(`${project.drawingNo}  ${project.revision}  ${project.date}`, pageW - M, 19, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y = 34;

  const section = (label: string) => {
    if (y > 250) {
      doc.addPage();
      y = M + 6;
    }
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...NAVY);
    doc.text(label, M, y);
    doc.setTextColor(0, 0, 0);
    y += 2;
  };

  type ColStyles = Parameters<typeof autoTable>[1]['columnStyles'];
  const table = (head: string[], body: (string | number)[][], widths?: ColStyles) => {
    autoTable(doc, {
      startY: y + 2,
      head: [head],
      body,
      margin: { left: M, right: M },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [180, 198, 231], lineWidth: 0.1 },
      headStyles: { fillColor: NAVY, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      columnStyles: widths,
      didDrawPage: () => {},
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  };

  const calcCols = { 0: { cellWidth: 62 }, 1: { cellWidth: 26, halign: 'right' as const }, 2: { cellWidth: 16 } };

  // ------------------------------------------------------------------ A. parameters
  section(t.params);
  table(
    [t.desc, t.value, t.unit, t.formula],
    [
      [input.lang === 'id' ? 'Faktor cadangan' : 'Spare factor', n(params.spareFactor * 100, 0) + ' %', '-', input.lang === 'id' ? 'Praktik umum 20 - 30 %' : 'Common practice 20 - 30 %'],
      [input.lang === 'id' ? 'Faktor jarak antar kabel' : 'Cable spacing factor', n(params.spacingFactor), '-', '1.00 = touching'],
      [input.lang === 'id' ? 'Tinggi tray' : 'Tray height', n(params.trayHeightMm, 0), 'mm', ''],
      [input.lang === 'id' ? 'Rasio pengisian maksimum' : 'Maximum fill ratio', n(params.maxFillRatio * 100, 0) + ' %', '-', sizing.fillDetail.labelEn],
      [input.lang === 'id' ? 'Jumlah lapis' : 'Number of layers', String(params.layers), 'layer', ''],
      [input.lang === 'id' ? 'Lebar tray terpilih' : 'Selected tray width', n(params.selectedTrayWidthMm, 0), 'mm', ''],
      [input.lang === 'id' ? 'Tipe tray' : 'Tray type', params.trayType, '-', ''],
      [input.lang === 'id' ? 'Konfigurasi penataan' : 'Cable arrangement', params.arrangement, '-', ''],
      [input.lang === 'id' ? 'Suhu ambien' : 'Ambient temperature', n(params.ambientTempC, 0), 'degC', ''],
      [input.lang === 'id' ? 'Jarak antar support' : 'Support span', n(params.supportSpanM), 'm', ''],
      [input.lang === 'id' ? 'Panjang jalur' : 'Route length', n(params.routeLengthM, 0), 'm', ''],
    ],
    calcCols,
  );

  // ------------------------------------------------------------------ B. cable summary
  section(t.summary);
  const codes = [...new Set(schedule.map((r) => r.typeCode))];
  table(
    [input.lang === 'id' ? 'Tipe kabel' : 'Cable type', 'OD (mm)', input.lang === 'id' ? 'Jumlah run' : 'Qty of runs', input.lang === 'id' ? 'Total lebar (mm)' : 'Total width (mm)', input.lang === 'id' ? 'Total luas (mm2)' : 'Total area (mm2)', input.lang === 'id' ? 'Sumber data' : 'Data source'],
    codes.map((code) => {
      const e = findEntry(code);
      const runs = schedule.filter((r) => r.typeCode === code).reduce((s, r) => s + r.runs, 0);
      const od = e?.odMm ?? 0;
      return [
        e ? `${e.family} ${e.cores}C x ${e.sizeMm2} (${code})` : code,
        n(od, 1),
        String(runs),
        n(runs * od, 1),
        n((runs * Math.PI * od ** 2) / 4, 1),
        e && isVerified(e) ? 'KMI datasheet' : 'UNVERIFIED',
      ];
    }).concat([[
      'TOTAL', '', String(sizing.totalRuns), n(sizing.sumOdMm, 1), n(sizing.sumAreaMm2, 1), '',
    ]]),
  );

  // ------------------------------------------------------------------ C / D / E
  section(t.method1);
  table([t.desc, t.value, t.unit, t.formula], [
    [input.lang === 'id' ? 'Lebar kabel terpasang' : 'Installed cable width', n(sizing.method1.installedWidthMm), 'mm', 'sigma OD x spacing'],
    [input.lang === 'id' ? 'Lebar termasuk cadangan' : 'Width including spare', n(sizing.method1.withSpareMm), 'mm', 'x (1 + spare)'],
    [input.lang === 'id' ? 'Lebar per lapis' : 'Width per layer', n(sizing.method1.perLayerMm), 'mm', `/ ${params.layers}`],
  ], calcCols);

  section(t.method2);
  table([t.desc, t.value, t.unit, t.formula], [
    [input.lang === 'id' ? 'Luas termasuk cadangan' : 'Area including spare', n(sizing.method2.areaWithSpareMm2), 'mm2', 'sigma A x (1 + spare)'],
    [input.lang === 'id' ? 'Luas tray dibutuhkan' : 'Required tray area', n(sizing.method2.requiredTrayAreaMm2), 'mm2', `/ ${n(params.maxFillRatio, 2)}`],
    [input.lang === 'id' ? 'Lebar dibutuhkan' : 'Required width', n(sizing.method2.requiredWidthMm), 'mm', `/ ${params.trayHeightMm} mm`],
  ], calcCols);

  section(t.result);
  table([t.desc, t.value, t.unit, t.formula], [
    [input.lang === 'id' ? 'LEBAR TRAY DIBUTUHKAN (penentu)' : 'REQUIRED TRAY WIDTH (governing)', n(sizing.governingWidthMm), 'mm', `MAX(${sizing.governingMethod})`],
    [input.lang === 'id' ? 'Lebar tray standar terpilih' : 'Selected standard tray width', n(sizing.selectedTrayWidthMm, 0), 'mm', ''],
    [input.lang === 'id' ? 'JUMLAH JALUR TRAY' : 'NUMBER OF TRAY RUNS', String(sizing.trayRunsRequired), 'run', 'ROUNDUP'],
    [input.lang === 'id' ? 'Total lebar terpasang' : 'Total installed width', n(sizing.totalInstalledWidthMm, 0), 'mm', ''],
    [input.lang === 'id' ? 'Rasio pengisian aktual' : 'Actual fill ratio', n(sizing.actualFillRatio * 100) + ' %', '-', `max ${n(params.maxFillRatio * 100, 0)} %`],
    [input.lang === 'id' ? 'PEMERIKSAAN' : 'CHECK', sizing.fillCheckPass ? t.ok : t.bad, '-', sizing.fillDetail.labelEn],
  ], calcCols);

  // ------------------------------------------------------------------ F. cross-section
  if (input.sectionPng) {
    doc.addPage();
    y = M + 6;
    section(t.section);
    const w = pageW - 2 * M;
    const props = doc.getImageProperties(input.sectionPng);
    const h = (props.height / props.width) * w;
    doc.addImage(input.sectionPng, 'PNG', M, y + 2, w, h);
    y += h + 8;
    doc.setFontSize(7.5).setTextColor(...GREY);
    doc.text(
      input.lang === 'id'
        ? `Penampang tray 1 dari ${sizing.trayRunsRequired}. Skala gambar mengikuti lebar halaman; seluruh koordinat kabel adalah hasil perhitungan dalam mm.`
        : `Cross-section of tray 1 of ${sizing.trayRunsRequired}. Drawn to fit the page width; every cable coordinate is the calculated value in mm.`,
      M, y,
    );
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  if (input.scenePng) {
    section(t.view3d);
    const w = pageW - 2 * M;
    const props = doc.getImageProperties(input.scenePng);
    const h = Math.min((props.height / props.width) * w, 95);
    doc.addImage(input.scenePng, 'PNG', M, y + 2, w, h);
    y += h + 8;
  }

  // ------------------------------------------------------------------ H. weight & support
  doc.addPage();
  y = M + 6;
  section(t.weight);
  table([t.desc, t.value, t.unit, t.formula], [
    [input.lang === 'id' ? 'Berat kabel' : 'Cable weight', n(weight.cableKgPerM), 'kg/m', 'sigma (qty x kg/km) / 1000'],
    [input.lang === 'id' ? 'Berat tray' : 'Tray self-weight', n(weight.trayKgPerM), 'kg/m', input.lang === 'id' ? 'estimasi indikatif' : 'indicative estimate'],
    [input.lang === 'id' ? 'Total beban' : 'Total load', n(weight.totalKgPerM), 'kg/m', ''],
    [input.lang === 'id' ? 'Beban per titik support' : 'Load per support point', n(weight.loadPerSupportKg, 1), 'kg', `span ${n(params.supportSpanM)} m`],
    [input.lang === 'id' ? 'Lendutan' : 'Deflection', n(support.deflectionMm), 'mm', 'w L^4 / (145 E I)'],
    [input.lang === 'id' ? 'Lendutan izin' : 'Allowable deflection', n(support.allowableDeflectionMm), 'mm', 'NEMA VE 1, span / 180'],
    [input.lang === 'id' ? 'PEMERIKSAAN LENDUTAN' : 'DEFLECTION CHECK', support.deflectionPass ? t.ok : t.bad, '-', ''],
    [input.lang === 'id' ? 'Kelas NEMA VE 1' : 'NEMA VE 1 class', support.nemaClass.toUpperCase(), '-', `${n(support.nemaWorkingLoadKgPerM, 1)} kg/m`],
    [input.lang === 'id' ? 'Jumlah titik support' : 'Number of support points', String(support.supportsRequired), 'set', ''],
    [input.lang === 'id' ? 'Beban per rod' : 'Load per rod hanger', n(support.loadPerHangerKg, 1), 'kg', '2 rod / support'],
    [input.lang === 'id' ? 'Ukuran rod' : 'Rod size', `${support.rodSize} (${support.rodCapacityKg} kg)`, '-', support.rodPass ? t.ok : t.bad],
  ], calcCols);

  // ------------------------------------------------------------------ I. derating
  section(t.thermal);
  table([t.desc, t.value, t.unit, t.formula], [
    [input.lang === 'id' ? 'Jumlah sirkuit' : 'Number of circuits', String(derating.circuits), '-', ''],
    [input.lang === 'id' ? 'Jumlah lapis terpakai' : 'Layers in use', String(derating.layersUsed), 'layer', ''],
    [input.lang === 'id' ? 'Faktor koreksi pengelompokan' : 'Grouping correction factor', n(derating.groupingFactor, 3), '-', 'IEC 60364-5-52 B.52.17'],
    [input.lang === 'id' ? 'Faktor koreksi suhu' : 'Temperature derating factor', n(derating.temperatureFactor, 3), '-', `IEC 60364-5-52 B.52.14 @ ${params.ambientTempC} degC`],
    [input.lang === 'id' ? 'Faktor koreksi gabungan' : 'Combined correction factor', n(derating.combinedFactor, 3), '-', ''],
    [input.lang === 'id' ? 'Utilisasi tertinggi' : 'Highest utilisation', n(derating.worstUtilisation * 100, 1) + ' %', '-', derating.worstUtilisation <= 1 ? t.ok : t.bad],
  ], calcCols);

  // ------------------------------------------------------------------ J. bending
  section(t.bending);
  table(
    [input.lang === 'id' ? 'Tipe kabel' : 'Cable type', 'OD (mm)', input.lang === 'id' ? 'Faktor' : 'Factor', input.lang === 'id' ? 'Radius min (mm)' : 'Min radius (mm)'],
    bending.perType.map((b) => [b.label, n(b.odMm, 1), `${b.factor} x OD`, n(b.minRadiusMm, 0)]),
  );
  doc.setFontSize(8);
  doc.text(
    input.lang === 'id'
      ? `Radius penentu ${n(bending.governingRadiusMm, 0)} mm. Estimasi tarikan ${n(bending.pullingTension.bendTensionN, 0)} N, tekanan dinding samping ${n(bending.pullingTension.sidewallPressureNPerM, 0)} N/m (${bending.pullingTension.pass ? t.ok : t.bad}).`
      : `Governing radius ${n(bending.governingRadiusMm, 0)} mm. Estimated pulling tension ${n(bending.pullingTension.bendTensionN, 0)} N, sidewall pressure ${n(bending.pullingTension.sidewallPressureNPerM, 0)} N/m (${bending.pullingTension.pass ? t.ok : t.bad}).`,
    M, y,
  );
  y += 8;

  // ------------------------------------------------------------------ K. notes
  doc.addPage();
  y = M + 6;
  section(t.notes);
  const notes = [
    ...sizing.fillDetail.messages,
    ...derating.messages,
    ...support.messages,
    ...bending.messages,
    input.lang === 'id'
      ? 'Data KMI ditranskrip dari datasheet PT KMI Wire and Cable Tbk (NYA 12104-01, NYY 14233-xx, NYFGbY 16233-xx Rev. 2.0 / 2009).'
      : 'KMI data is transcribed from the PT KMI Wire and Cable Tbk datasheets (NYA 12104-01, NYY 14233-xx, NYFGbY 16233-xx Rev. 2.0 / 2009).',
    input.lang === 'id'
      ? 'Baris bertanda UNVERIFIED memakai data proyek yang belum diverifikasi ke katalog pabrikan dan harus dikonfirmasi sebelum perhitungan diterbitkan.'
      : 'Rows marked UNVERIFIED use project data that has not been checked against a manufacturer catalogue and must be confirmed before the calculation is issued.',
  ];
  table(['No', t.desc], notes.map((note, i) => [String(i + 1), note]), { 0: { cellWidth: 10 } });

  // ------------------------------------------------------------------ stamp
  if (y > 210) {
    doc.addPage();
    y = M + 6;
  }
  const stampY = y + 4;
  const boxW = (pageW - 2 * M) / 3;
  doc.setDrawColor(...NAVY).setLineWidth(0.4);
  doc.rect(M, stampY, pageW - 2 * M, 46);
  doc.setFillColor(...NAVY);
  doc.rect(M, stampY, pageW - 2 * M, 7, 'F');
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(8.5);
  doc.text(t.stamp, M + 3, stampY + 5);
  doc.setTextColor(0, 0, 0).setFont('helvetica', 'normal').setFontSize(8);

  const overall = sizing.fillCheckPass && support.deflectionPass && support.rodPass && derating.worstUtilisation <= 1;
  const cells: [string, string][] = [
    [t.prepared, project.preparedBy || ''],
    [t.checked, project.checkedBy || ''],
    [t.approved, ''],
  ];
  cells.forEach(([label, name], i) => {
    const x = M + i * boxW;
    if (i > 0) doc.line(x, stampY + 7, x, stampY + 46);
    doc.setFontSize(7).setTextColor(...GREY);
    doc.text(label, x + 3, stampY + 13);
    doc.setFontSize(8.5).setTextColor(0, 0, 0);
    doc.text(name || '..........................', x + 3, stampY + 34);
    doc.setDrawColor(...GREY).setLineWidth(0.2);
    doc.line(x + 3, stampY + 36, x + boxW - 6, stampY + 36);
    doc.setFontSize(7).setTextColor(...GREY);
    doc.text(`${t.date}: ${project.date}`, x + 3, stampY + 41);
  });

  doc.setDrawColor(...NAVY).setLineWidth(0.4);
  doc.setFontSize(9).setFont('helvetica', 'bold');
  doc.setTextColor(...(overall ? OK : BAD));
  doc.text(
    `${input.lang === 'id' ? 'HASIL KESELURUHAN' : 'OVERALL RESULT'}: ${overall ? t.ok : t.bad}`,
    pageW - M - 3,
    stampY + 13,
    { align: 'right' },
  );
  doc.setTextColor(0, 0, 0).setFont('helvetica', 'normal');

  // ------------------------------------------------------------------ footers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...NAVY).setLineWidth(0.3);
    doc.line(M, h - 12, pageW - M, h - 12);
    doc.setFontSize(7).setTextColor(...GREY);
    doc.text(`${project.name} - ${project.drawingNo} ${project.revision}`, M, h - 8);
    doc.text(`${t.page} ${p} / ${pages}`, pageW - M, h - 8, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  return doc.output('blob');
}

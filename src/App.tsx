import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { useCalculations } from './store/useCalculations';
import { Button, GlassCard, useT } from './components/ui';
import { ParamsPanel } from './components/panels/ParamsPanel';
import { ScheduleTable } from './components/schedule/ScheduleTable';
import { SectionView } from './components/section/SectionView';
import { ResultsPanel } from './components/results/ResultsPanel';
import { View3D } from './components/view3d/View3D';
import { ThermalPanel } from './components/engineering/ThermalPanel';
import { SupportPanel } from './components/engineering/SupportPanel';
import { BendingPanel } from './components/engineering/BendingPanel';
import { CatalogPanel } from './components/engineering/CatalogPanel';
import type { DictKey } from './i18n';

const TABS: { id: string; key: DictKey }[] = [
  { id: 'schedule', key: 'tabSchedule' },
  { id: 'section', key: 'tabSection' },
  { id: 'view3d', key: 'tabView3d' },
  { id: 'results', key: 'tabResults' },
  { id: 'thermal', key: 'tabThermal' },
  { id: 'support', key: 'tabSupport' },
  { id: 'bending', key: 'tabBending' },
  { id: 'catalog', key: 'tabCatalog' },
  { id: 'export', key: 'tabExport' },
];

export default function App() {
  const t = useT();
  const theme = useAppStore((s) => s.theme);
  const lang = useAppStore((s) => s.lang);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const setLang = useAppStore((s) => s.setLang);
  const [tab, setTab] = useState('section');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="relative h-full">
      <div className="aurora"><span /></div>

      <div className="relative z-10 flex h-full flex-col gap-3 p-3">
        <Header
          theme={theme}
          lang={lang}
          onToggleTheme={toggleTheme}
          onSetLang={setLang}
        />

        <nav className="flex flex-wrap gap-1.5">
          {TABS.map((item) => (
            <Button key={item.id} active={tab === item.id} onClick={() => setTab(item.id)}>
              {t(item.key)}
            </Button>
          ))}
        </nav>

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[290px_1fr]">
          <aside className="scroll-thin hidden overflow-auto xl:block">
            <ParamsPanel />
          </aside>
          <main className="tab-enter min-h-0 overflow-auto scroll-thin" key={tab}>
            {tab === 'schedule' && <ScheduleTable />}
            {tab === 'section' && <SectionView />}
            {tab === 'view3d' && <View3D />}
            {tab === 'results' && <ResultsPanel />}
            {tab === 'thermal' && <ThermalPanel />}
            {tab === 'support' && <SupportPanel />}
            {tab === 'bending' && <BendingPanel />}
            {tab === 'catalog' && <CatalogPanel />}
            {!['schedule', 'section', 'view3d', 'results', 'thermal', 'support', 'bending', 'catalog'].includes(tab) && (
              <GlassCard className="p-8 text-center text-[13px]" >
                <span style={{ color: 'var(--text-muted)' }}>{t(TABS.find((x) => x.id === tab)!.key)}</span>
              </GlassCard>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Header({
  theme,
  lang,
  onToggleTheme,
  onSetLang,
}: {
  theme: string;
  lang: string;
  onToggleTheme: () => void;
  onSetLang: (l: 'id' | 'en') => void;
}) {
  const t = useT();
  const { sizing, overflow } = useCalculations();
  return (
    <GlassCard strong className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <h1 className="text-[15px] leading-tight font-semibold tracking-tight">{t('appTitle')}</h1>
        <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{t('appSubtitle')}</p>
      </div>

      <div className="flex items-center gap-4 text-[12px]">
        <HeaderStat label={t('governingWidth')} value={`${sizing.governingWidthMm.toFixed(0)} mm`} />
        <HeaderStat label={t('trayRunsRequired')} value={`${sizing.trayRunsRequired} x ${sizing.selectedTrayWidthMm}`} />
        <HeaderStat
          label={t('actualFill')}
          value={`${(sizing.actualFillRatio * 100).toFixed(1)} %`}
          tone={sizing.fillCheckPass && overflow === 0 ? 'ok' : 'danger'}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex overflow-hidden rounded-xl" style={{ border: '1px solid var(--glass-border-soft)' }}>
          {(['id', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => onSetLang(l)}
              className="press px-2.5 py-1.5 text-[12px] font-semibold uppercase"
              style={{
                background: lang === l ? 'var(--accent-soft)' : 'transparent',
                color: lang === l ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <Button onClick={onToggleTheme} title={t('theme')}>{theme === 'dark' ? 'Light' : 'Dark'}</Button>
      </div>
    </GlassCard>
  );
}

function HeaderStat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'danger' }) {
  return (
    <div className="hidden text-right md:block">
      <div className="text-[10px] tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="tabular text-[13px] font-bold" style={{ color: tone ? `var(--${tone})` : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

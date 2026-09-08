import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CableRun, TrayParams } from '../core/types';
import { DEFAULT_PARAMS } from '../core/defaults';
import { DEFAULT_ARRANGE_OPTIONS } from '../core/arranger';
import { DEFAULT_BENDING_OPTIONS, type BendingOptions } from '../core/bending';
import { SAMPLE_SCHEDULE } from '../data/sampleSchedule';
import type { Lang } from '../i18n';

export type Theme = 'light' | 'dark';

export interface ProjectInfo {
  name: string;
  drawingNo: string;
  preparedBy: string;
  checkedBy: string;
  revision: string;
  date: string;
}

export interface LayoutOptions {
  autoArrange: boolean;
  segregateFrc: boolean;
  edgeClearanceMm: number;
  layerGapMm: number;
  dividerGapMm: number;
}

interface AppState {
  lang: Lang;
  theme: Theme;
  schedule: CableRun[];
  params: TrayParams;
  layout: LayoutOptions;
  bending: BendingOptions;
  project: ProjectInfo;
  panelFilter: string;
  selectedTrayIndex: number;
  selectedRunId: string | null;
  /**
   * Last frame captured from the 3D canvas. The canvas unmounts when the user leaves the 3D
   * tab, so the report would otherwise never get its 3D view - the scene caches it here while
   * it is on screen. Kept out of persistence: it is a large data URL and always re-capturable.
   */
  scenePng: string | null;

  setLang: (lang: Lang) => void;
  toggleTheme: () => void;
  setParam: <K extends keyof TrayParams>(key: K, value: TrayParams[K]) => void;
  setLayout: <K extends keyof LayoutOptions>(key: K, value: LayoutOptions[K]) => void;
  setBending: <K extends keyof BendingOptions>(key: K, value: BendingOptions[K]) => void;
  setProject: <K extends keyof ProjectInfo>(key: K, value: ProjectInfo[K]) => void;
  setPanelFilter: (panel: string) => void;
  setSelectedTray: (index: number) => void;
  setSelectedRun: (id: string | null) => void;
  setScenePng: (png: string | null) => void;

  addRun: (run: CableRun) => void;
  updateRun: (id: string, patch: Partial<CableRun>) => void;
  removeRun: (id: string) => void;
  replaceSchedule: (runs: CableRun[]) => void;
  loadSample: () => void;
  clearSchedule: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'id',
      theme: 'dark',
      schedule: SAMPLE_SCHEDULE,
      params: DEFAULT_PARAMS,
      layout: { ...DEFAULT_ARRANGE_OPTIONS },
      bending: { ...DEFAULT_BENDING_OPTIONS },
      project: {
        name: 'Raw Material Warehouse',
        drawingNo: 'MEELV-CT-001',
        preparedBy: '',
        checkedBy: '',
        revision: 'R0',
        date: today(),
      },
      panelFilter: 'ALL',
      selectedTrayIndex: 0,
      selectedRunId: null,
      scenePng: null,

      setLang: (lang) => set({ lang }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setParam: (key, value) => set((s) => ({ params: { ...s.params, [key]: value } })),
      setLayout: (key, value) => set((s) => ({ layout: { ...s.layout, [key]: value } })),
      setBending: (key, value) => set((s) => ({ bending: { ...s.bending, [key]: value } })),
      setProject: (key, value) => set((s) => ({ project: { ...s.project, [key]: value } })),
      setPanelFilter: (panelFilter) => set({ panelFilter, selectedTrayIndex: 0 }),
      setSelectedTray: (selectedTrayIndex) => set({ selectedTrayIndex }),
      setSelectedRun: (selectedRunId) => set({ selectedRunId }),
      setScenePng: (scenePng) => set({ scenePng }),

      addRun: (run) => set((s) => ({ schedule: [...s.schedule, run] })),
      updateRun: (id, patch) =>
        set((s) => ({ schedule: s.schedule.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      removeRun: (id) => set((s) => ({ schedule: s.schedule.filter((r) => r.id !== id) })),
      replaceSchedule: (schedule) => set({ schedule, selectedTrayIndex: 0 }),
      loadSample: () => set({ schedule: SAMPLE_SCHEDULE, panelFilter: 'ALL', selectedTrayIndex: 0 }),
      clearSchedule: () => set({ schedule: [], selectedTrayIndex: 0 }),
    }),
    {
      name: 'cable-tray-calculator',
      // scenePng is a multi-megabyte data URL; never write it to localStorage.
      partialize: ({ scenePng: _scenePng, ...rest }) => rest,
    },
  ),
);

/** Schedule rows after the active panel filter. */
export const filteredSchedule = (schedule: CableRun[], panelFilter: string): CableRun[] =>
  panelFilter === 'ALL' ? schedule : schedule.filter((r) => r.panel === panelFilter);

// Regresi terhadap laporan "166 kabel terbaca di pratinjau, tapi setelah Ganti schedule
// jadi 0 CABLES".
//
// Datanya tidak pernah hilang: yang tertinggal adalah filter panel. Filter menunjuk ke panel
// dari schedule LAMA, panel itu tidak ada lagi di schedule baru, dan karena setiap tampilan
// serta export membaca lewat filteredSchedule, seluruh aplikasi membaca nol kabel.
//
// Yang membuatnya nyaris tidak bisa ditebak dari layar: <select> yang value-nya tidak ada di
// antara option-nya membuat browser menampilkan option PERTAMA - "Semua panel" - sehingga
// layarnya berbunyi "semua panel, nol kabel". Test ini mengunci agar pasangan schedule dan
// filter tidak pernah lagi bisa saling bertentangan.

import { beforeEach, describe, expect, it } from 'vitest';
import { filteredSchedule, useAppStore } from '../useAppStore';
import type { CableRun } from '../../core/types';

const run = (id: string, panel: string): CableRun => ({
  id,
  panel,
  circuit: `CKT-${id}`,
  category: 'OUTGOING',
  description: '1x3C-4mm2 Cu/XLPE/PVC',
  typeCode: '3C-4',
  runs: 1,
});

const OLD = [run('a', 'DB-RMW-L0-LP'), run('b', 'DB-RMW-L0-LP')];
const IMPORTED = [run('x', 'MDB-FGW-L0'), run('y', 'DB-FGW-L0-LP'), run('z', 'DB-FGW-L0-LP')];

/** Apa yang benar-benar dilihat user: schedule setelah filter yang sedang aktif. */
const visible = (): CableRun[] => {
  const { schedule, panelFilter } = useAppStore.getState();
  return filteredSchedule(schedule, panelFilter);
};

beforeEach(() => {
  useAppStore.setState({ schedule: OLD, panelFilter: 'ALL', selectedTrayIndex: 0 });
});

describe('panel filter vs the schedule under it', () => {
  it('shows every imported cable after Replace schedule, even when a panel was filtered', () => {
    useAppStore.getState().setPanelFilter('DB-RMW-L0-LP');
    expect(visible()).toHaveLength(2);

    useAppStore.getState().replaceSchedule(IMPORTED);

    expect(useAppStore.getState().schedule).toHaveLength(3);
    expect(useAppStore.getState().panelFilter).toBe('ALL');
    expect(visible()).toHaveLength(3);
  });

  it('opens the filter on Replace even when the old panel name still exists', () => {
    useAppStore.getState().setPanelFilter('DB-RMW-L0-LP');
    useAppStore.getState().replaceSchedule([...IMPORTED, run('w', 'DB-RMW-L0-LP')]);
    // Schedule baru = data baru; user harus melihat seluruhnya, bukan sisa filter lama.
    expect(useAppStore.getState().panelFilter).toBe('ALL');
    expect(visible()).toHaveLength(4);
  });

  it('keeps a filter that is still meaningful when a row is appended', () => {
    useAppStore.getState().setPanelFilter('DB-RMW-L0-LP');
    useAppStore.getState().addRun(run('c', 'DB-RMW-L0-LP'));
    expect(useAppStore.getState().panelFilter).toBe('DB-RMW-L0-LP');
    expect(visible()).toHaveLength(3);
  });

  it('reopens the filter when the last cable of the filtered panel is deleted', () => {
    useAppStore.setState({ schedule: [...OLD, run('c', 'CP-FGW-L0-MVAC')] });
    useAppStore.getState().setPanelFilter('CP-FGW-L0-MVAC');
    expect(visible()).toHaveLength(1);

    useAppStore.getState().removeRun('c');

    expect(useAppStore.getState().panelFilter).toBe('ALL');
    expect(visible()).toHaveLength(2);
  });

  it('reopens the filter when the filtered panel is renamed away', () => {
    useAppStore.setState({ schedule: [run('a', 'DB-OLD')] });
    useAppStore.getState().setPanelFilter('DB-OLD');
    useAppStore.getState().updateRun('a', { panel: 'DB-NEW' });

    expect(useAppStore.getState().panelFilter).toBe('ALL');
    expect(visible()).toHaveLength(1);
  });

  it('leaves the filter alone when a rename does not empty it', () => {
    useAppStore.setState({ schedule: [run('a', 'DB-KEEP'), run('b', 'DB-KEEP')] });
    useAppStore.getState().setPanelFilter('DB-KEEP');
    useAppStore.getState().updateRun('a', { panel: 'DB-MOVED' });

    expect(useAppStore.getState().panelFilter).toBe('DB-KEEP');
    expect(visible()).toHaveLength(1);
  });

  it('reopens the filter on Clear all, so the next import is not hidden', () => {
    useAppStore.getState().setPanelFilter('DB-RMW-L0-LP');
    useAppStore.getState().clearSchedule();
    expect(useAppStore.getState().panelFilter).toBe('ALL');

    useAppStore.getState().addRun(run('x', 'MDB-FGW-L0'));
    expect(visible()).toHaveLength(1);
  });
});

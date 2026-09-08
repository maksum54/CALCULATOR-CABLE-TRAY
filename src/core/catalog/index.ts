import type { CatalogEntry } from '../types';
import { seedColors } from '../colors';
import { KMI_CATALOG } from './kmi';
import { PROJECT_CATALOG } from './project';

// Give the project's own cable types the clearest, best separated colours.
seedColors(PROJECT_CATALOG.map((e) => e.id));

export { KMI_CATALOG, PROJECT_CATALOG };

/** Every catalogue entry the app knows about; project entries first so they win on lookup. */
export const ALL_ENTRIES: CatalogEntry[] = [...PROJECT_CATALOG, ...KMI_CATALOG];

const BY_ID = new Map(ALL_ENTRIES.map((e) => [e.id, e]));

export const findEntry = (id: string): CatalogEntry | undefined => BY_ID.get(id);

export const isVerified = (e: CatalogEntry): boolean => e.verified !== false;

/** Catalogue ampacity for the given installation method, falling back to whatever is on file. */
export const ampacityOf = (e: CatalogEntry): number | undefined =>
  e.ampAir ?? e.ampGround ?? e.ampPipe;

export const entryLabel = (e: CatalogEntry): string =>
  `${e.family} ${e.cores}C x ${e.sizeMm2} mm2`;

/** Families present in the catalogue, in display order. */
export const FAMILIES = ['N2XY', 'FRC', 'NYA', 'NYY', 'NYFGbY'] as const;

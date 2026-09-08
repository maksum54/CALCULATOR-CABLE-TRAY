// Translation hook - every label in the UI goes through this. Lives in its own module so
// index.tsx stays a components-only file (React Fast Refresh requirement).

import { useAppStore } from '../../store/useAppStore';
import { translate, type DictKey } from '../../i18n';

export function useT() {
  const lang = useAppStore((s) => s.lang);
  return (key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

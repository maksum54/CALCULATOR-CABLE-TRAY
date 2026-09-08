import { DICT, type DictKey, type Lang } from './dictionary';

export type { DictKey, Lang };
export { DICT };

/** Translate a key, substituting {name} placeholders from `vars`. */
export function translate(lang: Lang, key: DictKey, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let text: string = entry ? entry[lang] : key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

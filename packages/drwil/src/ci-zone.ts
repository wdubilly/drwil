// Zone du projet du fichier de CI (QUA-283) : deux paires de marqueurs en commentaire, l'une dans les étapes du job
// `checks`, l'autre parmi les jobs. `init` réécrit tout ce qui est hors zone et reprend la zone du projet telle quelle.
import { CI_FILES } from "./config.js";
import { texts } from "./cli-texts.js";
import { fill, projectLang } from "./i18n.js";

export const ZONES = ["steps", "jobs"] as const;
const marker = (kind: "begin" | "end", zone: string) => new RegExp(`^\\s*# drwil-project-${kind} ${zone}\\s*$`);
export const isCiFile = (rel: string): boolean => Object.values(CI_FILES).some((f) => f.includes(rel));
const lines = (text: string): string[] => text.split(/\r?\n/);

/** Lines inside each zone, or null when a zone is missing or its markers are not in order. */
export function zonesOf(text: string): Record<string, string[]> | null {
  const all = lines(text);
  const out: Record<string, string[]> = {};
  for (const zone of ZONES) {
    const from = all.findIndex((l) => marker("begin", zone).test(l));
    const to = all.findIndex((l) => marker("end", zone).test(l));
    if (from < 0 || to < from) return null;
    out[zone] = all.slice(from + 1, to);
  }
  return out;
}

/** The template with the project's zones, as found in `existing`, in place of its own. */
export function mergeZones(template: string, existing: string): string {
  const kept = zonesOf(existing);
  if (!kept) return template;
  let result = lines(template);
  for (const zone of ZONES) {
    const from = result.findIndex((l) => marker("begin", zone).test(l));
    const to = result.findIndex((l) => marker("end", zone).test(l));
    result = [...result.slice(0, from + 1), ...kept[zone], ...result.slice(to)];
  }
  return result.join(/\r\n/.test(existing) ? "\r\n" : "\n");
}

/** Lines of `existing` that `incoming` does not have (a multiset: a line repeated once more counts). */
export function removedLines(incoming: string, existing: string): string[] {
  const left = new Map<string, number>();
  for (const l of lines(incoming)) left.set(l.trimEnd(), (left.get(l.trimEnd()) ?? 0) + 1);
  return lines(existing).filter((l) => {
    const n = left.get(l.trimEnd()) ?? 0;
    if (n > 0) left.set(l.trimEnd(), n - 1);
    return n === 0 && l.trim() !== "";
  });
}

/** What the removed lines name: jobs, steps, then the number of other lines. */
export function namesOf(removed: string[]): string[] {
  const named = removed
    .map((l) => /^( {2})([\w.-]+):\s*$/.exec(l)?.[2] ?? /^\s*-\s+name:\s*(.+?)\s*$/.exec(l)?.[1] ?? /^([\w.-]+):\s*$/.exec(l)?.[1])
    .filter((n): n is string => !!n);
  const others = removed.length - named.length;
  return others > 0 ? [...named, `${others}`] : named;
}

/** The human's answer on an unmarked CI file: the names that would disappear and the removed lines, shown as a diff. */
export type ConfirmCi = (rel: string, names: string[], removed: string[]) => Promise<boolean>;

const TEXTS = {
  fr: {
    outside:
      "⚠ {0} : réécrit hors de la zone du projet, {1} ligne(s) modifiée(s) à la main perdues ({2}) ; la branche de mise à jour garde l'ancienne version.",
    unmarked:
      "⚠ {0} n'a pas de zone du projet (marqueurs « drwil-project-begin/end ») : le mettre à jour supprimerait {1}. Rien n'a été changé ; relancer `npx drwil init` dans un terminal pour confirmer.",
    others: "{0} autre(s) ligne(s)",
  },
  en: {
    outside: "⚠ {0}: rewritten outside the project zone, {1} line(s) edited by hand lost ({2}); the update branch keeps the old version.",
    unmarked:
      '⚠ {0} has no project zone ("drwil-project-begin/end" markers): updating it would remove {1}. Nothing was changed; run `npx drwil init` again in a terminal to confirm.',
    others: "{0} other line(s)",
  },
};

export const describe = (names: string[], lang: "fr" | "en") =>
  names.map((n, i) => (i === names.length - 1 && /^\d+$/.test(n) ? fill(TEXTS[lang].others, n) : n)).join(", ");

/** Warns about what a rewrite outside the zone removed from a marked file. */
export function warnOutside(dir: string, rel: string, removed: string[]): void {
  if (removed.length)
    console.warn(fill(TEXTS[projectLang(dir)].outside, rel, removed.length, describe(namesOf(removed), projectLang(dir))));
}

/**
 * What `init` writes over an existing CI file, or null to keep it (undefined: not a CI file). Marked file: the kit's new content around the
 * project's zones. Unmarked: the kit's content when the file is the one installed (`pristine`, nothing of the project
 * in it) or when nothing would disappear; otherwise only on the human's confirmation, the names that would disappear
 * always said. `quiet`: a preview, nothing is asked or said.
 */
export async function ciContent(
  dir: string,
  rel: string,
  incoming: string,
  existing: string,
  pristine: boolean,
  w: { confirmCi?: ConfirmCi; simulation?: unknown },
): Promise<string | null | undefined> {
  if (!isCiFile(rel)) return undefined;
  const o = { pristine, confirm: w.confirmCi, quiet: !!w.simulation };
  if (zonesOf(existing)) {
    const merged = mergeZones(incoming, existing);
    if (!o.quiet) warnOutside(dir, rel, removedLines(merged, existing));
    return merged;
  }
  const removed = removedLines(incoming, existing);
  if (o.pristine || !removed.length) return incoming;
  const names = namesOf(removed);
  if (!o.quiet && o.confirm && (await o.confirm(rel, names, removed))) return incoming;
  if (!o.quiet && !o.confirm) console.warn(fill(TEXTS[projectLang(dir)].unmarked, rel, describe(names, projectLang(dir))));
  return null;
}

/** The terminal's confirmation: the removed lines as a diff, then the human's yes (`ask` reads one answer). */
export const confirmCiWith =
  (ask: (question: string) => Promise<string>): ConfirmCi =>
  async (rel, names, removed) => {
    const shown = removed.slice(0, 40).map((l) => `- ${l}`);
    if (removed.length > 40) shown.push(`… (${removed.length - 40})`);
    const answer = await ask(fill(texts().ciQuestion, rel, describe(names, projectLang(process.cwd())), shown.join("\n")));
    return /^(y|yes|o|oui)$/i.test(answer.trim());
  };

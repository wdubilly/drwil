// Zones du projet du fichier de CI (QUA-283) : paires de marqueurs en commentaire (étapes du job `checks`, jobs, stages
// GitLab). `init` réécrit tout ce qui est hors zone, reprend les zones telles quelles et y replace ce qui n'est pas du kit
// (ci-zone-move.ts) ; ici, ce qu'il en dit.
import { CI_FILES } from "./config.js";
import { type Forge, placeProject, zonesOf } from "./ci-zone-move.js";
import { fill, projectLang, type MessageLang } from "./i18n.js";

export const isCiFile = (rel: string): boolean => Object.values(CI_FILES).some((f) => f.includes(rel));
const lines = (text: string): string[] => text.split(/\r?\n/);

/**
 * Prints (`shippedPrints`) of the keys of every shipped CI template without zones — v0.1.0, v0.4.0, v0.6.0 and v0.8.0
 * (to v0.11.0), the later ones are marked: in an old unmarked file, what is the kit's (D-c extended).
 */
export const SHIPPED_CI: Record<Forge, string[]> = {
  github: [
    "name f1076d28db32",
    "on 89183e1e047b",
    "checks 936a0876d146 6a4e22587a1c 9c5c10f32765 f048ad594b2e",
    "checks 936a0876d146 6a4e22587a1c 9c5c10f32765 d2dde8912b70 f048ad594b2e",
    "checks 936a0876d146 6a4e22587a1c 9c5c10f32765 d2dde8912b70 f048ad594b2e 2c12b2efe755",
    "alerter-si-ci-cassee 6113ef86a4bf b7faceb66831",
    "alert-if-ci-broken 56db01ed5abe 7931ce399d57",
  ],
  gitlab: [
    "stage test",
    "stage alerte",
    "stage alert",
    "checks 69bb16e21458 b7cfbb7273e9",
    "checks 69bb16e21458 1f6df855c2f3 1c6160f423ef 0ee1cd49af34 b7cfbb7273e9",
    "checks 1b5cac5de937 1f6df855c2f3 1c6160f423ef 0ee1cd49af34 b7cfbb7273e9 1867193f04f8",
    "alerter-si-ci-cassee 2a5f2af734c7 ecdf3c606e60 641835cf3c7d",
    "alert-if-ci-broken a951286d8659 ecdf3c606e60 e7b3a5356fad",
  ],
};

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

const TEXTS = {
  fr: {
    outside: "⚠ {0} : réécrit hors de la zone du projet d'après le gabarit du kit, {1} ligne(s) qui en différaient remplacée(s) ({2}){3}.",
    kept: " ; la branche « {0} » garde l'ancienne version",
    moved: "{0} : replacé(s) dans la zone du projet : {1}.",
    conflict:
      "⚠ {0} : clé(s) {1} définie(s) par le projet et par le kit avec un contenu différent, ou sans place dans une zone du projet. Rien n'a été changé : ramener ces clés à la version du kit (gabarit) et porter le réglage du projet dans ses propres jobs ou dans la zone du projet, puis relancer `npx drwil init`.",
    others: "{0} autre(s) ligne(s)",
  },
  en: {
    outside: "⚠ {0}: rewritten outside the project zone from the kit's template, {1} line(s) that differed from it replaced ({2}){3}.",
    kept: '; branch "{0}" keeps the old version',
    moved: "{0}: moved into the project zone: {1}.",
    conflict:
      "⚠ {0}: key(s) {1} defined by the project and by the kit with different content, or with no place in a project zone. Nothing was changed: bring these keys back to the kit's version (template) and carry the project's setting into its own jobs or into the project zone, then run `npx drwil init` again.",
    others: "{0} other line(s)",
  },
};

export const describe = (names: string[], lang: "fr" | "en") =>
  names.map((n, i) => (i === names.length - 1 && /^\d+$/.test(n) ? fill(TEXTS[lang].others, n) : n)).join(", ");

/** The messages' language, and the branch of the commit `init` makes (absent: none), whose main branch keeps the old version. */
export type CiContext = { lang: MessageLang; commit?: { branch: string; main: string } };

/**
 * What `init` writes over an existing CI file, or null to keep it (undefined: not a CI file). The kit's part from the
 * template, the project's zones kept and what is not the kit's moved into them, said; a conflicting key keeps the file,
 * named. An unmarked file as installed (`pristine`) is the template. A preview (`simulation`) says nothing.
 */
export async function ciContent(
  dir: string,
  rel: string,
  incoming: string,
  existing: string,
  pristine: boolean,
  w: { ci?: CiContext; simulation?: unknown },
): Promise<string | null | undefined> {
  if (!isCiFile(rel)) return undefined;
  if (pristine && !zonesOf(existing)) return incoming;
  const forge = rel.endsWith(".gitlab-ci.yml") ? "gitlab" : "github";
  const placed = placeProject(forge, incoming, existing, SHIPPED_CI[forge]);
  if (w.simulation) return placed.content;
  const lang = w.ci?.lang ?? projectLang(dir);
  const T = TEXTS[lang];
  if (placed.content === null) {
    console.warn(fill(T.conflict, rel, placed.conflicts.join(", ")));
    return null;
  }
  if (placed.moved.length) console.log(fill(T.moved, rel, placed.moved.join(", ")));
  const removed = removedLines(placed.content, existing);
  const kept = w.ci?.commit ? fill(T.kept, w.ci.commit.main) : "";
  if (removed.length) console.warn(fill(T.outside, rel, removed.length, describe(namesOf(removed), lang), kept));
  return placed.content;
}

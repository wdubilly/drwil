// Report of the gaps `init` finds in the project's own files, split from essentials.ts (QUA-001).
import type { Gap } from "./essentials.js";
import { fill, type MessageLang } from "./i18n.js";

const TEXTS = {
  fr: {
    title: "⚠ drwil a besoin de contenu absent de fichiers gardés tels quels :",
    lines: "lignes manquantes",
    instructions: "aucune consigne drwil (état de gouvernance, contrats, commandes) : les agents ignorent la gouvernance",
    pointer: "ne renvoie pas à AGENTS.md : l'outil ne lit pas les consignes",
    settings: "hooks et permissions drwil manquants",
    gitleaks: "liste blanche du manifeste du kit manquante (faux positifs de SEC-007)",
    ci: "job `checks` absent : les contrôles ne tournent jamais en CI (QUA-013)",
    hooksPath: "gardé tel quel : hooks drwil inactifs tant qu'ils n'y sont pas appelés ({0})",
    unreadable: "illisible : {0}",
    fix: "    correctif :",
  },
  en: {
    title: "⚠ drwil needs content missing from files kept as they are:",
    lines: "missing lines",
    instructions: "no drwil instructions (governance state, contracts, commands): agents ignore the governance",
    pointer: "does not point to AGENTS.md: the tool does not read the instructions",
    settings: "missing drwil hooks and permissions",
    gitleaks: "missing allowlist of the kit manifest (SEC-007 false positives)",
    ci: "no `checks` job: the checks never run in CI (QUA-013)",
    hooksPath: "kept as it is: drwil hooks inactive until called from there ({0})",
    unreadable: "unreadable: {0}",
    fix: "    fix:",
  },
};

/** What is missing, in one sentence. */
export function describeGap(g: Gap, lang: MessageLang): string {
  const T = TEXTS[lang];
  if (g.kind === "hooksPath") return fill(T.hooksPath, g.missing.join(", "));
  if (g.kind === "unreadable") return fill(T.unreadable, g.missing[0]);
  return T[g.kind];
}

/** Human-readable report of the gaps, empty if there is none. */
export function formatGaps(gaps: Gap[], lang: MessageLang): string[] {
  if (!gaps.length) return [];
  const T = TEXTS[lang];
  const out = [T.title];
  for (const g of gaps) {
    out.push(`  - ${g.file}: ${describeGap(g, lang)}`);
    if (g.kind === "lines" || g.kind === "settings") out.push(...g.missing.map((m) => `      ${m}`));
    if (g.fix.length) out.push(T.fix, ...g.fix.map((f) => `      ${f}`));
  }
  return out;
}

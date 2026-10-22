// Briefs written by `drwil guarantees` (QUA-088, QUA-089, QUA-093, QUA-094, QUA-097): a blocking
// [P0] brief per unresolved guarantee, a non-blocking [P1] climb brief for a project in debt. The
// header line `**Guarantee**: blocking` is what `/drwil-start` reads to offer only them.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { MessageLang } from "./i18n.js";

export type BriefKind = "coverage" | "e2e" | "versioning" | "presentation" | "climb";

export interface GuaranteeBrief {
  kind: BriefKind;
  /** Path relative to the root (`docs/projects/<slug>.md`). */
  path: string;
  title: string;
  /** Why the guarantee is not held: one line per missing element. */
  reasons: string[];
  blocking: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

const TEXTS = {
  fr: {
    titles: {
      coverage: "Garantie : couverture de test de la couche `{0}`",
      climb: "Montée de couverture de la couche `{0}` vers 100 %",
      e2e: "Garantie : test de bout en bout des chemins critiques",
      versioning: "Garantie : dépôt, forge, CI et protection de la branche principale",
      presentation: "Garantie : présentation du projet (README, 5 lignes, fonctionnalités)",
    },
    status: (blocking: boolean) =>
      `**Statut** : ouvert le ${today()} — ${blocking ? "garantie bloquante" : "montée non bloquante"}, écrite par \`drwil guarantees\`.`,
    risk: "**Risque** : HIGH",
    maturity: "**Maturité** : à affiner",
    marker: "**Garantie** : bloquante",
    need: "## 1. Besoin",
    needText: {
      coverage:
        "drwil garantit une couverture de test à 100 % (lignes, branches, fonctions, instructions selon ce que l'outil mesure) sur chaque couche. Cette couche n'a pas encore son contrôle :",
      climb:
        "Projet existant en dette : le seuil est posé au niveau mesuré (cliquet, jamais en baisse) et le code nouveau ou modifié est exigé à 100 %. Cette fiche monte la couverture vers 100 % ; elle ne bloque rien.",
      e2e: "drwil exige un test de bout en bout (e2e) des chemins critiques, rejoué par un contrôle (`catalog:QUA-020`). Il manque :",
      versioning:
        "Un projet gouverné a un dépôt Git, une forge (GitHub ou GitLab), une CI qui rejoue les contrôles du hook et une branche principale protégée (fusion par PR/MR, contrôles requis, sans contournement même pour les administrateurs). Il manque :",
      presentation:
        "Le README, la ligne « Le projet en 5 lignes » d'`AGENTS.md` et `docs/features.md` présentent le produit de l'utilisateur. Ces fichiers gardent le texte du squelette :",
    },
    criteria: "## Critères d'acceptation",
    criterion: {
      coverage: "Le contrôle de couverture de la couche est déclaré, cité par le contrat de couverture du projet et vert — contrat à créer",
      climb: "La couverture de la couche atteint 100 % sur les quatre métriques mesurées par l'outil — contrat à créer",
      e2e: "Les chemins critiques nommés par le demandeur sont couverts par un test e2e rejoué par le contrôle `e2e` — contrat à créer",
      versioning: "`drwil guarantees` ne signale plus rien sur le dépôt, la forge, la CI ni la protection de branche — contrat à créer",
      presentation: "Plus aucun texte de squelette dans le README, les 5 lignes d'`AGENTS.md` et `docs/features.md` — contrat à créer",
    },
    decisions: "## 4. Décisions",
    noDecision:
      "- Garantie obligatoire, sans dérogation : un contrôle non exécuté n'est jamais passé (`QUA-013`), aucun contrôle n'est contourné (`QUA-019`).",
    toDecide: "## Points à trancher",
    question: {
      coverage: "- [décision] Quel outil de couverture pour cette pile, et quelles exclusions déclarer (avec leur raison) ?",
      climb: "- [décision] Dans quel ordre monter les fichiers les moins couverts ?",
      e2e: "- [décision] Quels sont les chemins critiques, et avec quel outil e2e de la pile les tester ?",
      versioning: "- [décision] Accord pour poser la protection de la branche principale (`drwil guarantees --protect`) ?",
      presentation: "- [décision] Que fait l'application, pour qui, et comment la lancer ?",
    },
    lots: "## 5. Lots",
    lot: "- **Lot 1 — résoudre la garantie** : voir le besoin ci-dessus, puis relancer `npx drwil guarantees`.",
    resume: "## 6. Reprise",
    resumeText:
      "- **Dernier état** : écrite par `drwil guarantees` ; tant qu'elle n'est pas résolue, `drwil verify` est en FAIL et `/drwil-start` ne propose qu'elle.",
    index: (title: string, path: string, blocking: boolean) => `- [ ] [humain] [P${blocking ? 0 : 1}] ${title} — \`${path}\``,
  },
  en: {
    titles: {
      coverage: "Guarantee: test coverage of layer `{0}`",
      climb: "Coverage climb of layer `{0}` to 100 %",
      e2e: "Guarantee: end-to-end test of the critical paths",
      versioning: "Guarantee: repository, forge, CI and protection of the main branch",
      presentation: "Guarantee: project presentation (README, 5 lines, features)",
    },
    status: (blocking: boolean) =>
      `**Status**: opened on ${today()} — ${blocking ? "blocking guarantee" : "non-blocking climb"}, written by \`drwil guarantees\`.`,
    risk: "**Risk**: HIGH",
    maturity: "**Maturity**: to refine",
    marker: "**Guarantee**: blocking",
    need: "## 1. Need",
    needText: {
      coverage:
        "drwil guarantees 100 % test coverage (lines, branches, functions, statements, as far as the tool measures them) on every layer. This layer has no check yet:",
      climb:
        "Existing project in debt: the threshold is set at the measured level (ratchet, never lowered) and new or modified code must be 100 % covered. This brief climbs the coverage to 100 %; it blocks nothing.",
      e2e: "drwil requires an end-to-end (e2e) test of the critical paths, replayed by a check (`catalog:QUA-020`). Missing:",
      versioning:
        "A governed project has a Git repository, a forge (GitHub or GitLab), a CI replaying the hook's checks and a protected main branch (merge through PR/MR, required checks, no bypass even for administrators). Missing:",
      presentation:
        "The README, the « project in 5 lines » of `AGENTS.md` and `docs/features.md` present the user's product. These files still carry skeleton text:",
    },
    criteria: "## Acceptance criteria",
    criterion: {
      coverage: "The layer's coverage check is declared, cited by the project's coverage contract and green — contract to create",
      climb: "The layer's coverage reaches 100 % on the four metrics the tool measures — contract to create",
      e2e: "The critical paths named by the requester are covered by an e2e test replayed by the `e2e` check — contract to create",
      versioning:
        "`drwil guarantees` reports nothing left on the repository, the forge, the CI or the branch protection — contract to create",
      presentation: "No skeleton text left in the README, the 5 lines of `AGENTS.md` and `docs/features.md` — contract to create",
    },
    decisions: "## 4. Decisions",
    noDecision: "- Mandatory guarantee, no waiver: a check that did not run has not passed (`QUA-013`), no check is bypassed (`QUA-019`).",
    toDecide: "## Points to decide",
    question: {
      coverage: "- [decision] Which coverage tool for this stack, and which exclusions to declare (with their reason)?",
      climb: "- [decision] In which order to climb the least covered files?",
      e2e: "- [decision] Which are the critical paths, and which e2e tool of the stack tests them?",
      versioning: "- [decision] Agreement to set the protection of the main branch (`drwil guarantees --protect`)?",
      presentation: "- [decision] What does the application do, for whom, and how is it run?",
    },
    lots: "## 5. Increments",
    lot: "- **Increment 1 — resolve the guarantee**: see the need above, then run `npx drwil guarantees` again.",
    resume: "## 6. Hand-off",
    resumeText:
      "- **Last state**: written by `drwil guarantees`; as long as it is not resolved, `drwil verify` is FAIL and `/drwil-start` offers only it.",
    index: (title: string, path: string, blocking: boolean) => `- [ ] [human] [P${blocking ? 0 : 1}] ${title} — \`${path}\``,
  },
};

export function briefTitle(kind: BriefKind, layer: string, lang: MessageLang): string {
  return TEXTS[lang].titles[kind].replace("{0}", layer);
}

/** Text of a guarantee brief, in the project's language. */
export function renderBrief(b: GuaranteeBrief, lang: MessageLang): string {
  const T = TEXTS[lang];
  const header = [`# ${b.title}`, "", T.status(b.blocking), T.risk, T.maturity];
  if (b.blocking) header.push(T.marker);
  return [
    ...header,
    "",
    "<!-- scope",
    "files:",
    "  - .drwil/ia-first.json",
    "-->",
    "",
    T.need,
    "",
    T.needText[b.kind],
    "",
    ...b.reasons.map((r) => `- ${r}`),
    "",
    T.criteria,
    "",
    `- ${T.criterion[b.kind]}`,
    "",
    T.decisions,
    "",
    T.noDecision,
    "",
    T.toDecide,
    "",
    T.question[b.kind],
    "",
    T.lots,
    "",
    T.lot,
    "",
    T.resume,
    "",
    T.resumeText,
    "",
  ].join("\n");
}

/**
 * Writes the briefs that do not exist yet and lists them in the index: an existing brief is never
 * rewritten (the human may have started it). Returns the paths written.
 */
export function writeBriefs(root: string, briefs: GuaranteeBrief[], index: string, lang: MessageLang): string[] {
  const written: string[] = [];
  for (const b of briefs) {
    const abs = join(root, b.path);
    if (existsSync(abs)) continue;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, renderBrief(b, lang));
    written.push(b.path);
  }
  if (!written.length) return written;
  const indexPath = join(root, index);
  const before = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
  const lines = briefs
    .filter((b) => written.includes(b.path) && !before.includes(`\`${b.path}\``))
    .map((b) => TEXTS[lang].index(b.title, b.path, b.blocking));
  if (lines.length) {
    mkdirSync(dirname(indexPath), { recursive: true });
    writeFileSync(indexPath, `${before.replace(/\s*$/, "")}${before ? "\n\n" : ""}${lines.join("\n")}\n`);
  }
  return written;
}

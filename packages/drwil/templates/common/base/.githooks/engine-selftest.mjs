// Contrôle `checks-self-test` du moteur (engine.mjs) : les tests des hooks, propres au dépôt drwil (non livrés).
// QUA-141 : il déclare ses `paths`, donc son verdict « ok » est repris tant qu'aucun fichier qu'il lit n'a changé. Les tests des hooks
// lisent le dépôt entier hors `docs/projects/` et `docs/intentions/` (gabarit et paquet, consignes, `.claude/`, workflow de CI, registre
// des contrats) : tout fichier lu hors de cette liste s'y ajoute, jamais l'inverse (QUA-013).
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const SELF_TEST_PATHS = [
  ".githooks/**",
  "outils/**",
  "package.json",
  "package-lock.json",
  ".drwil/ia-first.json",
  "packages/**",
  ".claude/**",
  ".github/**",
  "AGENTS.md",
  "docs/contracts.md",
  "docs/contracts-catalog.md",
  "docs/ia-first/**",
  "docs/recipes/**",
];

/** Ce que le moteur ajoute à l'entrée de la liste : `paths` et déclaration (l'empreinte propre du contrôle, QUA-141). */
export const SELF_TEST_ENTRY = {
  paths: SELF_TEST_PATHS,
  declaration: JSON.stringify(["checks-self-test", SELF_TEST_PATHS]),
};

/** Le lancement des tests des hooks : { args } à lancer par node, ou le verdict { status, detail } quand il n'y a rien à jouer. */
export function selfTestPlan(root, { full, docsOnly, T }) {
  if (!full) return { status: "not-applicable", detail: T.minimalMode };
  const dir = join(root, ".githooks");
  const tests = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".test.mjs")) : [];
  // Ces tests éprouvent le code de drwil : un projet équipé ne les reçoit pas.
  if (!tests.length) return { status: "not-applicable", detail: T.noTests };
  if (docsOnly) return { status: "not-run", detail: T.docsOnly };
  const files = tests.map((f) => join(".githooks", f));
  const shared = join("outils", "tests-par-fichier.mjs"); // dépôt drwil : un lancement par fichier et par passe, partagé avec les contrôles de contrats (QUA-033)
  return {
    args: existsSync(join(root, shared)) ? [shared, "--tous", ...files] : ["--test", ...files],
  };
}

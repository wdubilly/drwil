import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { StackEntry } from "./stack.js";
import { readConfig, resolve, type InitOptions } from "./config.js";
import { scaffold } from "./rendu.js";

/** Applique le kit à un projet existant sans écraser aucun fichier. */
export interface AuditApply {
  stack: StackEntry[];
  /** Fichiers d'entrée d'outils IA déjà présents avant installation. */
  outilsPresents: string[];
  /** Protections déjà en place (tests, lint, hooks, secrets, CI), détectées sans rien exécuter. */
  protections: string[];
  /** Fichiers qu'`apply` créerait. */
  crees: string[];
  /** Fichiers déjà présents, laissés tels quels (jamais écrasés). */
  conserves: string[];
  /** Parmi les conservés, ceux qui ont dérivé du modèle du kit (à comparer à la main). */
  derives: string[];
}

function protectionsExistantes(dir: string): string[] {
  const p: string[] = [];
  const present = (f: string) => existsSync(join(dir, f));
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    for (const s of ["test", "lint", "typecheck"]) if (pkg.scripts?.[s]) p.push(`script npm « ${s} »`);
  } catch {}
  if (["eslint.config.js", "eslint.config.mjs", ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.cjs"].some(present))
    p.push("eslint");
  if (present("pyproject.toml") || present("ruff.toml")) p.push("configuration Python (pyproject/ruff)");
  if (present(".husky")) p.push("hooks husky");
  if (present(".pre-commit-config.yaml")) p.push("pre-commit");
  if (present(".gitleaks.toml") || present(".gitleaksignore")) p.push("gitleaks");
  if (present(".github/workflows")) p.push("GitHub Actions");
  if (present(".gitlab-ci.yml")) p.push("GitLab CI");
  try {
    const hooks = execFileSync("git", ["config", "core.hooksPath"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (hooks) p.push(`hooks git (core.hooksPath = ${hooks})`);
  } catch {}
  return p;
}

/** Aperçu d'`apply` (DRWIL-011) : audit du dépôt et liste exacte de ce qui serait créé, sans rien écrire. */
export async function auditerApply(opts: InitOptions): Promise<AuditApply> {
  const r = resolve(opts, (stack) => stack.map((s) => s.path).filter((p) => p !== "."));
  const outilsPresents = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".cursor", ".github/copilot-instructions.md"].filter((f) =>
    existsSync(join(opts.targetDir, f)),
  );
  const protections = protectionsExistantes(opts.targetDir);
  const derives: string[] = [];
  const simulation = { crees: [] as string[], conserves: [] as string[], remplaces: [] as string[] };
  await scaffold(r, { shouldOverwrite: () => false, derives, simulation });
  const crees = [...simulation.crees];
  if (!readConfig(opts.targetDir)) crees.push(".drwil/ia-first.json");
  return { stack: r.stack, outilsPresents, protections, crees, conserves: simulation.conserves, derives };
}

export function formaterAudit(a: AuditApply): string {
  const l = ["Analyse du dépôt…", ""];
  l.push("Détecté :");
  l.push(a.stack.length ? `  stack : ${a.stack.map((s) => `${s.path} → ${s.technos.join(", ")}`).join(" ; ")}` : "  stack : non détectée");
  l.push(`  outils IA déjà présents : ${a.outilsPresents.length ? a.outilsPresents.join(", ") : "aucun"}`);
  l.push("", "Protections existantes :", ...(a.protections.length ? a.protections.map((p) => `  ✓ ${p}`) : ["  aucune détectée"]));
  l.push("", `Serait ajouté (${a.crees.length} fichier(s)) :`, ...a.crees.map((f) => `  + ${f}`));
  if (a.conserves.length)
    l.push(
      "",
      `Déjà présents, laissés tels quels (${a.conserves.length}) :`,
      ...a.conserves.map((f) => `  = ${f}${a.derives.includes(f) ? " (diffère du modèle du kit)" : ""}`),
    );
  l.push("", "Rien ne sera écrasé.");
  return l.join("\n");
}

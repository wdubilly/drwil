// `drwil doctor` (DRWIL-010) et `drwil contracts` (DRWIL-021) : diagnostic rapide d'une
// installation, sans exécuter aucun contrôle (c'est le rôle de `drwil verify`).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chargerProjet } from "./verify.js";

export type EtatPoint = "ok" | "avertissement" | "probleme";

export interface PointDiagnostic {
  id: string;
  libelle: string;
  etat: EtatPoint;
  detail: string;
}

export interface Diagnostic {
  /** 0 : sain (avertissements tolérés) ; 1 : au moins un problème ; 2 : pas un projet drwil exploitable. */
  code: 0 | 1 | 2;
  points: PointDiagnostic[];
  erreur?: string;
}

// Fichier d'entrée propre à chaque outil IA (AGENTS.md vaut pour tous).
const FICHIERS_OUTILS: Record<string, string> = {
  claude: "CLAUDE.md",
  codex: "AGENTS.md",
  cursor: ".cursor/rules/ia-first.mdc",
  gemini: "GEMINI.md",
  copilot: ".github/copilot-instructions.md",
};

function outilPresent(cmd: string, args: string[]): boolean {
  return !spawnSync(cmd, args, { stdio: "ignore" }).error;
}

export async function doctor(opts: { targetDir: string }): Promise<Diagnostic> {
  const root = opts.targetDir;
  const projet = await chargerProjet(root);
  if (typeof projet === "string") return { code: 2, points: [], erreur: projet };
  const { cfg, registre, lecteur } = projet;
  const points: PointDiagnostic[] = [];
  const point = (id: string, libelle: string, etat: EtatPoint, detail: string) => points.push({ id, libelle, etat, detail });

  point("installation", "Installation", "ok", ".drwil/ia-first.json");
  const manifeste = existsSync(join(root, ".drwil", "fichiers-installes.json"));
  point("manifeste", "Manifeste", manifeste ? "ok" : "avertissement", manifeste ? ".drwil/fichiers-installes.json" : "absent : relancer `drwil apply` (uninstall et dérive en dépendent)");
  const agents = existsSync(join(root, "AGENTS.md"));
  point("agents", "AGENTS.md", agents ? "ok" : "probleme", agents ? "présent" : "absent : point d'entrée unique des agents");

  const outils: string[] = Array.isArray(cfg.tools) ? cfg.tools : [];
  const manquants = outils.filter((t) => FICHIERS_OUTILS[t] && !existsSync(join(root, FICHIERS_OUTILS[t])));
  point("integrations", "Intégrations IA", manquants.length ? "probleme" : "ok", `${outils.length - manquants.length}/${outils.length}${manquants.length ? ` (manquant : ${manquants.map((t) => FICHIERS_OUTILS[t]).join(", ")})` : ""}`);

  const contrats: any[] = lecteur.lireContrats(readFileSync(join(root, registre), "utf8"));
  const erreurs: { message: string }[] = lecteur.validerContrats(contrats, lecteur.controlesConnus(cfg), cfg.lang);
  point("contrats", "Contrats", erreurs.length || !contrats.length ? "probleme" : "ok",
    erreurs.length ? `${erreurs.length} erreur(s) : ${erreurs.map((e) => e.message).join(" ; ")}` : `${contrats.length} contrat(s) valide(s) (${registre})`);
  const prouvables = contrats.filter((k) => k.controles?.length).length;
  const sansControle = contrats.filter((k) => !k.controles?.length).map((k) => k.id);
  point("preuves", "Preuves automatisées", sansControle.length ? "avertissement" : "ok",
    `${prouvables}/${contrats.length}${sansControle.length ? ` (sans Contrôle, toujours MANUAL : ${sansControle.join(", ")})` : ""}`);

  const hooksPath = spawnSync("git", ["config", "core.hooksPath"], { cwd: root, encoding: "utf8" });
  const hooksActifs = hooksPath.status === 0 && hooksPath.stdout.trim() === ".githooks";
  point("hooks", "Hooks git", hooksActifs ? "ok" : "probleme", hooksActifs ? "core.hooksPath = .githooks" : "inactifs : lancer `git config core.hooksPath .githooks`");

  const ciFiles: string[] = Array.isArray(cfg.ciFiles) ? cfg.ciFiles : [];
  const ciAbsents = ciFiles.filter((f) => !existsSync(join(root, f)));
  point("ci", "CI", !ciFiles.length ? "avertissement" : ciAbsents.length ? "probleme" : "ok",
    !ciFiles.length ? "aucune CI configurée : pas de filet pour les contrôles dégradables (QUA-013)" : ciAbsents.length ? `fichier absent : ${ciAbsents.join(", ")}` : ciFiles.join(", "));

  const git = outilPresent("git", ["--version"]);
  const gitleaks = outilPresent("gitleaks", ["version"]) || outilPresent(join(process.env.HOME ?? "", ".local", "bin", "gitleaks"), ["version"]);
  const full = (cfg.mode ?? "full") === "full";
  point("outils", "Outils requis", !git ? "probleme" : full && !gitleaks ? "avertissement" : "ok",
    `node ${process.version}, git ${git ? "présent" : "absent"}${full ? `, gitleaks ${gitleaks ? "présent" : "absent (secrets non contrôlés localement)"}` : ""}`);

  return { code: points.some((p) => p.etat === "probleme") ? 1 : 0, points };
}

const SYMBOLES: Record<EtatPoint, string> = { ok: "✓", avertissement: "⚠", probleme: "✗" };

export function formaterDiagnostic(d: Diagnostic): string {
  if (d.erreur) return `drwil doctor\n\n✗ ${d.erreur}`;
  const lignes = ["drwil doctor", ""];
  for (const p of d.points) lignes.push(`${SYMBOLES[p.etat]} ${p.libelle.padEnd(22)} ${p.detail}`);
  lignes.push("", d.code === 0 ? "Installation saine." : "Problème(s) à corriger ci-dessus.");
  return lignes.join("\n");
}

/** Format machine stable de `drwil doctor --json`, version 1. */
export function diagnosticJson(d: Diagnostic) {
  return {
    version: 1,
    status: d.code === 0 ? "healthy" : d.code === 1 ? "problems" : "error",
    exitCode: d.code,
    ...(d.erreur ? { error: d.erreur } : {}),
    checks: d.points.map((p) => ({ id: p.id, label: p.libelle, state: { ok: "ok", avertissement: "warning", probleme: "problem" }[p.etat], detail: p.detail })),
  };
}

/** `drwil contracts` : registre lu et validé, sans exécution. Code 0 si valide, 2 sinon. */
export async function listerContrats(opts: { targetDir: string }) {
  const projet = await chargerProjet(opts.targetDir);
  if (typeof projet === "string") return { version: 1, exitCode: 2 as const, error: projet, contracts: [], errors: [] as string[] };
  const { cfg, registre, lecteur } = projet;
  const contrats: any[] = lecteur.lireContrats(readFileSync(join(opts.targetDir, registre), "utf8"));
  const erreurs: { message: string }[] = lecteur.validerContrats(contrats, lecteur.controlesConnus(cfg), cfg.lang);
  return {
    version: 1,
    exitCode: (erreurs.length ? 2 : 0) as 0 | 2,
    registry: registre,
    contracts: contrats.map((k) => ({ id: k.id, title: k.titre, form: k.forme === "section" ? "section" : "table", rule: k.regle, checks: k.controles ?? [], manual: k.manuel })),
    errors: erreurs.map((e) => e.message),
  };
}

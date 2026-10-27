// Lancement non interactif des outils du banc d'essai des agents (QUA-060) : commande de chaque outil,
// sondes à poser sur ses hooks et confiance à accorder au dossier d'essai. Séparé de outils/banc-agents.mjs
// (QUA-001, fichier de code plafonné), qui le réexporte. Propre à ce dépôt (QUA-018).
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Copilot CLI ne charge les hooks d'un dépôt que dans un dossier de confiance. Un COPILOT_HOME temporaire,
 * copie de la configuration du poste où seul le projet d'essai est ajouté, évite de toucher à celle de l'utilisateur.
 */
export function confianceCopilot(dossier, { maison = join(homedir(), ".copilot"), base = tmpdir() } = {}) {
  const home = mkdtempSync(join(base, "drwil-banc-copilot-"));
  for (const nom of ["config.json", "settings.json"]) if (existsSync(join(maison, nom))) copyFileSync(join(maison, nom), join(home, nom));
  const fichier = join(home, "config.json");
  let config = {};
  try {
    config = JSON.parse(readFileSync(fichier, "utf8"));
  } catch {}
  config.trustedFolders = [dossier, ...(Array.isArray(config.trustedFolders) ? config.trustedFolders : [])];
  writeFileSync(fichier, JSON.stringify(config));
  return { env: { COPILOT_HOME: home }, nettoyer: () => rmSync(home, { recursive: true, force: true }) };
}

/**
 * Gemini CLI ne lance les hooks d'un dépôt que dans un dossier de confiance (`--skip-trust` seul ne les charge pas) ;
 * la variable ne vaut que pour l'essai, la configuration de l'utilisateur reste intacte.
 */
export function confianceGemini() {
  return { env: { GEMINI_CLI_TRUST_WORKSPACE: "true" }, nettoyer: () => {} };
}

/** Outils dont le lancement non interactif est connu et vérifié sur le poste ; l'écriture n'y est jamais bloquée par l'outil. */
export const OUTILS = {
  claude: { binaire: "claude", args: (p) => ["-p", p, "--permission-mode", "acceptEdits"], sondes: [".claude/hooks"] },
  copilot: {
    binaire: "copilot",
    args: (p) => ["-p", p, "--allow-all-tools", "--no-ask-user", "--no-auto-update"],
    sondes: [".github/hooks", ".claude/hooks"],
    confiance: confianceCopilot,
  },
  gemini: {
    binaire: "gemini",
    args: (p) => ["-p", p, "--approval-mode", "yolo"],
    sondes: [".claude/hooks"],
    confiance: confianceGemini,
  },
};
/** Outils annoncés par la matrice (docs/ia-first.md) dont le lancement non interactif reste à définir, par une sonde sur le poste. */
export const A_DEFINIR = ["codex", "cursor"];

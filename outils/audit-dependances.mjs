#!/usr/bin/env node
// Audit des dépendances, preuve de SEC-006 (pas de dépendance vulnérable connue). Propre à ce dépôt.
// `npm audit` rend le même code de sortie pour une faille trouvée et pour un registre injoignable :
// on lit sa sortie JSON pour ne jamais confondre « vulnérable » et « non vérifié » (QUA-013).
// Une faille high ou critical bloque ; moderate et low sont affichées sans bloquer. Toutes les
// dépendances sont auditées, production et développement (défaut de `npm audit`).
// Usage : node outils/audit-dependances.mjs
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const GRAVITES = ["info", "low", "moderate", "high", "critical"];
const SEUIL = "high";

/**
 * Lit la sortie JSON de `npm audit`. Rend { statut: "ok" | "echec" | "non-execute", message }.
 * « non-execute » : aucun résultat d'audit (registre injoignable, sortie illisible) — jamais un succès.
 */
export function analyser(sortie) {
  let j;
  try {
    j = JSON.parse(sortie);
  } catch {
    return { statut: "non-execute", message: "audit non exécuté : sortie de npm audit illisible" };
  }
  const comptes = j?.metadata?.vulnerabilities;
  if (j?.error || !comptes) {
    return {
      statut: "non-execute",
      message: `audit non exécuté : registre injoignable (${j?.message ?? j?.error?.summary ?? "pas de résultat d'audit"})`,
    };
  }
  const resume = [...GRAVITES]
    .reverse()
    .filter((g) => g !== "info")
    .map((g) => `${comptes[g] ?? 0} ${g}`)
    .join(", ");
  const seuil = GRAVITES.indexOf(SEUIL);
  const bloquants = Object.entries(j.vulnerabilities ?? {})
    .filter(([, v]) => GRAVITES.indexOf(v.severity) >= seuil)
    .map(([nom, v]) => `${nom} (${v.severity})`)
    .sort();
  if (bloquants.length)
    return {
      statut: "echec",
      message: `audit des dépendances : ${bloquants.length} faille(s) high ou critical — ${bloquants.join(", ")} (${resume})`,
    };
  return { statut: "ok", message: `audit des dépendances : aucune faille high ou critical (${resume})` };
}

const npmAudit = () =>
  // Sous Windows, npm est un script .cmd : il ne se lance que par le shell.
  spawnSync("npm", ["audit", "--json"], { encoding: "utf8", shell: process.platform === "win32" });

/** Lance l'audit (injectable pour les tests), affiche le résultat ; rend le code de sortie. */
export function principal(lancer = npmAudit) {
  const r = lancer();
  const { statut, message } = r.error
    ? { statut: "non-execute", message: `audit non exécuté : npm introuvable (${r.error.message})` }
    : analyser(r.stdout ?? "");
  if (statut === "ok") {
    console.log(message);
    return 0;
  }
  console.error(`✗ ${message}`);
  return 1;
}

// Chemins réels comparés : un dossier en lien symbolique ne doit pas faire passer le contrôle à vide.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal();
}

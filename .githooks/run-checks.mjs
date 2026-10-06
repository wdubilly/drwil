#!/usr/bin/env node
// Adaptateur git du moteur de contrôles (.githooks/moteur.mjs), lancé au commit
// (pre-commit), au push (pre-push) et en CI. Il n'implémente aucun contrôle :
// il les exécute via le moteur partagé avec `drwil verify` (ADR-003) et met en
// forme la sortie pour un humain qui committe.
// QUA-013 : un contrôle qui n'a pas tourné n'est pas un contrôle passé.
// Chaque contrôle finit donc « échec », « OK » ou « non exécuté », jamais masqué.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { controles } from "./moteur.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

let cfg = {};
try {
  cfg = JSON.parse(readFileSync(".drwil/ia-first.json", "utf8"));
} catch {}
const lang = cfg.lang === "en" ? "en" : "fr";
const T = {
  fr: {
    projet: "contrôles du projet (lint, tests…)",
    aucunCheck: "aucun déclaré dans .drwil/ia-first.json → checks",
    nonExecute: "non exécuté :",
    echec: "échec :",
    ok: (n) => `contrôles exécutés : OK (${n} non exécuté(s), voir ci-dessus)`,
    auditPerime: (f, n) => `audit périmé (${f}, vieux de ${n} jours) : à relancer`,
  },
  en: {
    projet: "project checks (lint, tests…)",
    aucunCheck: "none declared in .drwil/ia-first.json → checks",
    nonExecute: "not run:",
    echec: "failed:",
    ok: (n) => `checks run: OK (${n} not run, see above)`,
    auditPerime: (f, n) => `stale audit (${f}, ${n} days old): time to re-run`,
  },
}[lang];

// Au pre-commit seulement (DRWIL_HOOK=pre-commit, posé par .githooks/pre-commit), le moteur reporte
// un contrôle du projet hors de ses `chemins`. Si git ne répond pas, tout tourne (jamais de report par défaut).
function fichiersIndexes() {
  if (process.env.DRWIL_HOOK !== "pre-commit") return null;
  const r = spawnSync("git", ["diff", "--cached", "--name-only", "--no-renames", "-z"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split("\0").filter(Boolean) : null;
}

const echecs = [];
const nonExecutes = [];
const annoncer = (nom) => console.log(`[ia-first] ${nom}…`);
// « non-applicable » (exclu par conception : mode minimal, QUA-017 en CI…) n'est pas affiché, comme avant.
for (const c of controles(root, { cfg, indexes: fichiersIndexes() })) {
  const r = c.executer({ avantLancement: annoncer });
  if (r.statut === "echec") echecs.push(r.message ?? c.nom);
  else if (r.statut === "non-execute") nonExecutes.push(`${c.nom} (${r.detail})`);
}
if (!Array.isArray(cfg.checks) || !cfg.checks.length) nonExecutes.push(`${T.projet} (${T.aucunCheck})`);

// Rappel non bloquant (confort, pas un contrat) : un audit (opportunité, risques/dette) dont le
// « Dernier scan »/« Last scan » date de plus de 30 jours gagnerait à être relancé.
const SEUIL_PEREMPTION_JOURS = 30;
for (const fichier of [
  { fr: "docs/audit-risques.md", en: "docs/audit-risks.md" }[lang],
  { fr: "docs/decouverte-valeur.md", en: "docs/value-discovery.md" }[lang],
]) {
  if (!existsSync(fichier)) continue;
  const bloc = readFileSync(fichier, "utf8").split(/\r?\n/).find((l) => /^>\s*(dernier scan|last scan)/i.test(l));
  const m = bloc?.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) continue;
  const jours = Math.floor((Date.now() - new Date(m[0]).getTime()) / 86400000);
  if (jours >= SEUIL_PEREMPTION_JOURS) nonExecutes.push(T.auditPerime(fichier, jours));
}

for (const c of nonExecutes) console.log(`[ia-first] ⚠ ${T.nonExecute} ${c}`);
if (echecs.length) {
  for (const c of echecs) console.log(`[ia-first] ✗ ${T.echec} ${c}`);
  process.exit(1);
}
console.log(`[ia-first] ${T.ok(nonExecutes.length)}`);

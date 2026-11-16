import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { config } from "./briefs.mjs";
import { journalTwice } from "./close-checks.mjs";
import { texts } from "./close-texts.mjs";
import { proofPath } from "./closure-proof.mjs";
import { derivation, revisionContext } from "./scope-derived.mjs";
import { OUT_OF_SCOPE, outsideBriefFiles } from "./scope-gate.mjs";
import { git, reference } from "./scope-gate-merge.mjs";
import { TRAILER } from "./scope-gate-texts.mjs";
import { fnmatch } from "./scope.mjs";

const CLOSED_BY = /^\s*-\s*\*\*(?:Clôturé par|Closed by)\*\*/i;
const ADMITTED = /^- \*\*(?:Admis d'office|Admitted as derived)\*\*.*\n?/m;

/**
 * QUA-313 : fichiers de la branche admis d'office pour `brief`, `Map fichier -> { kind, from }`, rejoués comme la
 * barrière (chaque commit au trailer de la fiche, fiche et registre lus dans son parent) ; null sans branche principale.
 */
export function branchAdmissions(root, brief, { env = process.env } = {}) {
  const cfg = config(root);
  const base = reference(root, env);
  const commits = base && git(root, ["rev-list", "--no-merges", "--reverse", `${base}..HEAD`]);
  if (typeof commits !== "string") return null;
  const outOfScope = Array.isArray(cfg.outOfScope) ? cfg.outOfScope : OUT_OF_SCOPE;
  const found = new Map();
  for (const c of commits.split("\n").filter(Boolean)) {
    // Sans repli : un commit que rev-list vient de lister se lit ; un échec de git lève, et journalPlan refuse la
    // clôture plutôt que d'écrire un compte faux (QUA-013), comme le rejeu de la barrière.
    const named = git(root, ["log", "-1", `--format=%(trailers:key=${TRAILER},valueonly)`, c])
      .split("\n")
      .map((v) => v.trim());
    if (named.filter(Boolean).at(-1) !== brief) continue;
    const files = git(root, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--no-renames", c]).split("\n").filter(Boolean);
    const ctx = revisionContext(root, { rev: c, briefRev: `${c}^`, brief, cfg, base });
    for (const f of outsideBriefFiles(files, outOfScope)) {
      if (found.has(f) || ctx.patterns.some((p) => fnmatch(f, p))) continue;
      const d = derivation(f, ctx);
      if (d) found.set(f, d);
    }
  }
  return found;
}

// QUA-228 : préparer le renvoi sans inventer ni déplacer les décisions du journal.
export function journalPlan(root, brief, text, { env } = {}) {
  const file = `${config(root).dirs?.projects ?? "docs/projects"}/journal.md`;
  const T = texts(root);
  try {
    const duplicate = journalTwice(root, brief)[0];
    if (duplicate) return { problem: duplicate };
    const before = existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8") : "# Journal\n";
    const proof = proofPath(root, brief);
    const name = posix.basename(brief, ".md");
    const title = /^#\s+(?:(?:Projet|Project)\s*:\s*)?(.+)$/m.exec(text)?.[1].trim().toLowerCase();
    const parts = before.split(/(?=^## )/m);
    const branch = `\`workstream/${name}\``;
    const strong = [];
    const weak = [];
    parts.forEach((entry, i) => {
      if (!entry.startsWith("## ")) return;
      const heading = entry
        .split("\n")[0]
        .replace(/^## (?:\d{4}-\d\d-\d\d\s*[—–-]\s*)?/, "")
        .trim()
        .toLowerCase();
      // QUA-228 : l'entrée d'un autre chantier peut citer la branche ; seule sa ligne de clôture la désigne.
      const closedBy = entry.split("\n").some((l) => CLOSED_BY.test(l) && l.includes(branch));
      if (entry.includes(`\`${proof}\``) || closedBy || heading === name.toLowerCase() || heading === title) strong.push(i);
      else if (entry.includes(branch)) weak.push(i);
    });
    const matches = strong.length ? strong : weak;
    if (matches.length > 1) return { problem: T.journalAmbiguous(file, proof, matches.length) };
    const line = T.journalProof(proof);
    // QUA-313 : la ligne des admissions suit la preuve, réécrite à chaque clôture (rouverte comprise), absente sans admission.
    const admitted = branchAdmissions(root, brief, { env });
    const extra = admitted?.size ? `${T.journalAdmitted([...admitted])}\n` : "";
    if (!matches.length) return { file, text: `${before.trimEnd()}\n\n## ${name}\n\n${line}\n${extra}`, admitted };
    const at = matches[0];
    const entry = parts[at].replace(ADMITTED, "");
    if (entry === parts[at] && !extra && entry.includes(`\`${proof}\``)) return { file, text: before, admitted };
    const body = entry.includes(`\`${proof}\``) ? entry.trimEnd() : `${entry.trimEnd()}\n\n${line}`;
    parts[at] = `${body}\n${extra}${at < parts.length - 1 ? "\n" : ""}`;
    return { file, text: parts.join(""), admitted };
  } catch (e) {
    return { problem: T.journalRefused(`${file} : ${e.message}`) };
  }
}

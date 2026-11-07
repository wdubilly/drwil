import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { config } from "./briefs.mjs";
import { journalTwice } from "./close-checks.mjs";
import { texts } from "./close-texts.mjs";
import { proofPath } from "./closure-proof.mjs";

const CLOSED_BY = /^\s*-\s*\*\*(?:Clôturé par|Closed by)\*\*/i;

// QUA-228 : préparer le renvoi sans inventer ni déplacer les décisions du journal.
export function journalPlan(root, brief, text) {
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
    if (!matches.length) return { file, text: `${before.trimEnd()}\n\n## ${name}\n\n${line}\n` };
    const at = matches[0];
    if (parts[at].includes(`\`${proof}\``)) return { file, text: before };
    parts[at] = `${parts[at].trimEnd()}\n\n${line}\n${at < parts.length - 1 ? "\n" : ""}`;
    return { file, text: parts.join("") };
  } catch (e) {
    return { problem: T.journalRefused(`${file} : ${e.message}`) };
  }
}

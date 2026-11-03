import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { config } from "./briefs.mjs";
import { journalTwice } from "./close-checks.mjs";
import { texts } from "./close-texts.mjs";
import { proofPath } from "./closure-proof.mjs";

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
    const matches = [];
    parts.forEach((entry, i) => {
      if (!entry.startsWith("## ")) return;
      const heading = entry
        .split("\n")[0]
        .replace(/^## (?:\d{4}-\d\d-\d\d\s*[—–-]\s*)?/, "")
        .trim()
        .toLowerCase();
      if (entry.includes(`\`${proof}\``) || entry.includes(`\`workstream/${name}\``) || heading === name.toLowerCase() || heading === title)
        matches.push(i);
    });
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

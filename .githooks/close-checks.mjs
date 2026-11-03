// Checks of the closing that read the repository (split from close.mjs).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { acceptanceCriteria, config } from "./briefs.mjs";
import { changedFiles } from "./check-code-rules.mjs";
import { mainBranch } from "./close-branches.mjs";
import { texts } from "./close-texts.mjs";
import { proofPath } from "./closure-proof.mjs";
import { definedIds } from "./contracts.mjs";
import { outsideBriefFiles } from "./scope-gate.mjs";
import { fnmatch, readBlock, withMirrors } from "./scope.mjs";

export const git = (root, ...args) => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
};

/** Contract IDs the project defines in `text`, per its prefixes. */
export function contractIds(root, text) {
  const prefixes = config(root).contractPrefixes ?? ["SEC", "QUA"];
  return definedIds(text, `(?:${prefixes.join("|")})-\\d{3}\\b`).defined;
}

/** Criteria still « contract to create », with the ID to write: the contracts created on the branch the brief does not cite yet. */
export function criteriaToCreate(root, brief, text) {
  const T = texts(root);
  const open = acceptanceCriteria(text).filter((c) => !c.link && /contrat à créer|contract to create/i.test(c.text));
  if (!open.length) return [];
  const registry = config(root).dirs?.contracts ?? "docs/contracts.md";
  const now = existsSync(join(root, registry)) ? readFileSync(join(root, registry), "utf8") : "";
  const main = mainBranch(root);
  const base = main ? git(root, "merge-base", "HEAD", main) : null;
  const before = contractIds(root, (base && git(root, "show", `${base}:${registry}`)) ?? "");
  const ids = [...contractIds(root, now)].filter((id) => !before.has(id) && !text.includes(id));
  // One contract per criterion, created in the same order: the pairing is given; otherwise the candidates.
  const short = (t) => {
    const label = t.replace(/\s*[—–-]\s*(contrat à créer|contract to create)\s*$/i, "");
    return label.length > 70 ? `${label.slice(0, 69)}…` : label;
  };
  return open.map((c, i) => T.toCreate(short(c.text), brief, ids.length === open.length ? `\`${ids[i]}\`` : T.candidates(ids)));
}

/** A single journal entry per workstream (QUA-118): its proof cited by two `## ` entries is an entry doubled. */
export function journalTwice(root, brief) {
  const journal = `${config(root).dirs?.projects ?? "docs/projects"}/journal.md`;
  if (!existsSync(join(root, journal))) return [];
  const proof = proofPath(root, brief);
  const n = readFileSync(join(root, journal), "utf8")
    .split(/^## /m)
    .slice(1)
    .filter((entry) => entry.includes(proof)).length;
  return n > 1 ? [texts(root).twice(journal, proof, n)] : [];
}

/** Places (file:line) of the non-Markdown files citing the brief (the Markdown ones are corrected by `deadCitations`). */
export function deadReferences(root, brief) {
  const T = texts(root);
  const out = git(root, "grep", "-n", "-I", "--untracked", "-F", brief) ?? "";
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => /^(.+?):(\d+):/.exec(l))
    .filter(([, f]) => f !== brief && !f.endsWith(".md"))
    .map(([, f, n]) => T.dead(`${f}:${n}`, brief));
}

/** QUA-230 : anticiper la barrière, qui lit le périmètre commité, pas l'extension en cours. */
export function referenceScope(root, brief) {
  const cfg = config(root);
  const patterns = withMirrors(readBlock(git(root, "show", `HEAD:${brief}`) ?? "").patterns, cfg);
  const out = git(root, "grep", "-n", "-I", "--untracked", "--exclude-standard", "-F", "-e", brief) ?? "";
  const places = new Map();
  for (const line of out.split("\n")) {
    const match = /^(.+?):(\d+):/.exec(line);
    if (match && match[1] !== brief && !places.has(match[1])) places.set(match[1], `${match[1]}:${match[2]}`);
  }
  const exclusions = Array.isArray(cfg.outOfScope) ? cfg.outOfScope : undefined;
  const files = outsideBriefFiles([...places.keys()], exclusions).filter((f) => !patterns.some((p) => fnmatch(f, p)));
  if (!files.length) return [];
  const T = texts(root);
  return [...files.map((f) => T.scopeReference(places.get(f), brief)), T.scopeExtension(brief, files)];
}

const NAME = /`([^`\s/<>{}*?|=:@$]+\.(?:md|mdc|mjs|cjs|js|ts|tsx|jsx|py|sh|json|ya?ml|toml|txt))`(?!\s*\((?:à créer|to create)\))/g;

/** Backticked file names without a path, in the Markdown files changed, that check-docs would not find. */
export function bareNames(root) {
  const T = texts(root);
  const found = [];
  for (const file of changedFiles(root).filter((f) => f.endsWith(".md") && existsSync(join(root, f)))) {
    const lines = readFileSync(join(root, file), "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/si présent|if present/i.test(line + (lines[i + 1] ?? ""))) return;
      for (const [, name] of line.matchAll(NAME)) {
        if (!name.startsWith("-") && !existsSync(join(root, name)) && !existsSync(join(root, dirname(file), name)))
          found.push(T.bare(`${file}:${i + 1}`, name));
      }
    });
  }
  return found;
}

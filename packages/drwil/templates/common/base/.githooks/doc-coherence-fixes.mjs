// The line rewrites of the closing and their writing (split from doc-coherence.mjs, which re-exports them).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The line rewrites behind the findings, merged per line: `[{ file, line, from, to }]` — what the
 * closing proposes (a diff) and what `--fix` writes.
 */
export function proposals(root, findings) {
  const edits = new Map();
  for (const f of findings) {
    const edit = f.edit ?? (f.fixTo ? (s) => s.replace(/\[( |x|X)\]/, `[${f.fixTo}]`) : null);
    if (edit) edits.set(`${f.file}\0${f.line}`, [...(edits.get(`${f.file}\0${f.line}`) ?? []), { file: f.file, line: f.line, edit }]);
  }
  const out = [];
  for (const list of edits.values()) {
    const lines = readFileSync(join(root, list[0].file), "utf8").split(/\r?\n/);
    const from = lines[list[0].line - 1];
    const to = list.reduce((s, e) => e.edit(s), from);
    if (to !== from) out.push({ file: list[0].file, line: list[0].line, from, to });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/** Writes the proposals; a line that changed since they were computed is left alone. Returns how many were applied. */
export function applyProposals(root, list) {
  let applied = 0;
  for (const file of new Set(list.map((p) => p.file))) {
    const raw = readFileSync(join(root, file), "utf8");
    const lines = raw.split("\n");
    for (const p of list.filter((x) => x.file === file)) {
      const cr = lines[p.line - 1].endsWith("\r") ? "\r" : "";
      if (lines[p.line - 1].replace(/\r$/, "") !== p.from) continue;
      lines[p.line - 1] = p.to + cr;
      applied++;
    }
    writeFileSync(join(root, file), lines.join("\n"));
  }
  return applied;
}

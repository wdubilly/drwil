// Adds to the project's own files what drwil needs, without overwriting anything: a delimited block
// in text files, missing entries merged into JSON and TOML. Never a CI file nor core.hooksPath:
// those stay reported (essentials.ts).
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Resolved } from "./config.js";
import {
  AUTO_KINDS,
  DEDICATED_AGENTS,
  MARKERS,
  findGaps,
  gitleaksBlock,
  hasInstructions,
  kitSettings,
  missingSettings,
  pointerLine,
  templateFile,
  type Gap,
  type Settings,
} from "./essentials.js";
import { sha256 } from "./manifest.js";
import { render } from "./render.js";

/** Marks a single line drwil inserted inside a TOML table (a block cannot be delimited there). */
export const LINE_MARK = "# drwil";

/** What `init` adds to a file of the project. */
export interface Addition {
  file: string;
  items: string[];
}

export interface Completion {
  added: Addition[];
  /** What drwil still needs and leaves to the human (CI file, core.hooksPath…). */
  gaps: Gap[];
}

const eol = (s: string) => (s.includes("\r\n") ? "\r\n" : "\n");

/** Adds the lines inside the file's drwil block, created at the end if there is none yet. */
export function addToBlock(content: string, lines: string[], markers: { begin: string; end: string }): string {
  const nl = eol(content);
  const all = content.split(/\r?\n/);
  const end = all.findIndex((l, i) => l.startsWith(markers.end) && all.slice(0, i).some((b) => b.startsWith(markers.begin)));
  if (end >= 0) return [...all.slice(0, end), ...lines, ...all.slice(end)].join(nl);
  const body = content.replace(/\s*$/, "");
  return `${body}${body ? nl + nl : ""}${[markers.begin, ...lines, markers.end].join(nl)}${nl}`;
}

const scopeLines = (text: string) =>
  (/<!-- scope\r?\n([\s\S]*?)-->/.exec(text)?.[1] ?? "").split(/\r?\n/).filter((l) => /^ {2}- \S/.test(l));

/** The `files:` lines of the kit's scope block that the project's block lacks. */
export function missingScopeLines(own: string, kit: string): string[] {
  const have = new Set(scopeLines(own));
  return scopeLines(kit).filter((l) => !have.has(l));
}

/** Adds lines at the end of the scope block, the project's own lines untouched. */
export function addToScope(content: string, lines: string[]): string {
  const all = content.split(/\r?\n/);
  const end = all.findIndex((l) => l.trimEnd() === "-->");
  return end < 0 ? content : [...all.slice(0, end), ...lines, ...all.slice(end)].join(eol(content));
}

/** Adds the kit's missing hooks and permissions, never changing nor removing the project's. */
export function mergeSettings(own: Settings, kit: Settings): Settings {
  const out: Settings = structuredClone(own);
  out.hooks = out.hooks ?? {};
  const hooks = out.hooks;
  for (const [event, entries] of Object.entries(kit.hooks ?? {}))
    for (const e of entries)
      for (const h of e.hooks) {
        hooks[event] = hooks[event] ?? [];
        const list = hooks[event];
        const same = list.find((x) => x.matcher === e.matcher);
        if (same?.hooks?.some((x) => x.command === h.command)) continue;
        if (same) same.hooks = [...(same.hooks ?? []), h];
        else list.push({ ...(e.matcher === undefined ? {} : { matcher: e.matcher }), hooks: [h] });
      }
  out.permissions = out.permissions ?? {};
  const permissions = out.permissions;
  for (const kind of ["allow", "ask", "deny"]) {
    const kitList = (kit.permissions?.[kind] as string[] | undefined) ?? [];
    const list = Array.isArray(permissions[kind]) ? (permissions[kind] as string[]) : [];
    const missing = kitList.filter((p) => !list.includes(p));
    if (missing.length) permissions[kind] = [...list, ...missing];
  }
  return out;
}

/** Adds the kit manifest to the allowlist of an existing .gitleaks.toml (both table forms). */
export function mergeGitleaks(content: string): string {
  const nl = eol(content);
  const block = gitleaksBlock();
  const pattern = (block.find((l) => l.includes("installed-files")) ?? "").trim().replace(/,$/, "");
  const lines = content.split(/\r?\n/);
  const header = lines.findIndex((l) => l.trim() === "[allowlist]");
  if (header < 0) {
    // Newer configs only have [[allowlists]]: a single [allowlist] table next to them is refused.
    const table = lines.some((l) => l.trim() === "[[allowlists]]") ? "[[allowlists]]" : "[allowlist]";
    return addToBlock(content, [table, ...block.slice(1)], MARKERS.hash);
  }
  let end = lines.findIndex((l, i) => i > header && /^\s*\[/.test(l));
  if (end < 0) end = lines.length;
  const paths = lines.findIndex((l, i) => i > header && i < end && /^\s*paths\s*=\s*\[/.test(l));
  const entry = `  ${pattern}, ${LINE_MARK}`;
  if (paths < 0) lines.splice(header + 1, 0, `paths = [${pattern}] ${LINE_MARK}`);
  else if (/\[\s*$/.test(lines[paths])) lines.splice(paths + 1, 0, entry);
  else {
    // One-line array: opened so that the drwil entry stays a line of its own (uninstall gives it
    // back equivalent, on two lines).
    const [head, rest] = [lines[paths].slice(0, lines[paths].indexOf("[") + 1), lines[paths].slice(lines[paths].indexOf("[") + 1)];
    lines.splice(paths, 1, head, entry, `  ${rest.trim()}`);
  }
  return lines.join(nl);
}

/** Line by which the project's AGENTS.md points to the drwil instructions written aside. */
export function agentsPointer(): string {
  return `Read and apply \`${DEDICATED_AGENTS}\` too: the drwil instructions (governance state, contracts, commands).`;
}

/**
 * Completes the project's files (dry run: lists only). The drwil instructions go to a file aside
 * when the project already has its own AGENTS.md, recorded in `manifest` like any kit file.
 */
export async function complete(r: Resolved, opts: { dryRun?: boolean; manifest?: Record<string, string> } = {}): Promise<Completion> {
  const dir = r.opts.targetDir;
  const added: Addition[] = [];
  const write = async (rel: string, content: string) => {
    if (opts.dryRun) return;
    await mkdir(dirname(join(dir, rel)), { recursive: true });
    await writeFile(join(dir, rel), content);
    // A file this same install created, then completed: still the kit's, removed whole by uninstall.
    if (opts.manifest && rel in opts.manifest) opts.manifest[rel] = sha256(content);
  };
  const read = (rel: string) => readFileSync(join(dir, rel), "utf8");

  if (existsSync(join(dir, "AGENTS.md")) && !hasInstructions(read("AGENTS.md"))) {
    const instructions = render(templateFile("base/AGENTS.md"), r);
    if (!existsSync(join(dir, DEDICATED_AGENTS))) {
      if (opts.manifest) opts.manifest[DEDICATED_AGENTS] = sha256(instructions);
      await write(DEDICATED_AGENTS, instructions);
      added.push({ file: DEDICATED_AGENTS, items: [] });
    }
    await write("AGENTS.md", addToBlock(read("AGENTS.md"), [agentsPointer()], MARKERS.html));
    added.push({ file: "AGENTS.md", items: [agentsPointer()] });
  }

  // The mechanics brief is generated once and never rewritten: a mechanics file a later version
  // adds would stay in no brief (the scoping check would fail), so its scope block is completed.
  const mechanics = "docs/projects/kit-mechanics.md";
  if (existsSync(join(dir, mechanics))) {
    const missing = missingScopeLines(read(mechanics), render(templateFile(`base/${mechanics}`), r));
    if (missing.length) {
      await write(mechanics, addToScope(read(mechanics), missing));
      added.push({ file: mechanics, items: missing.map((l) => l.trim().slice(2)) });
    }
  }

  // Read again: the instructions written aside add an import to CLAUDE.md and GEMINI.md.
  const gaps = findGaps(r);
  for (const g of gaps.filter((x) => AUTO_KINDS.has(x.kind) && x.kind !== "instructions")) {
    if (g.kind === "lines") {
      const markers = g.file.endsWith(".md") ? MARKERS.html : MARKERS.hash;
      await write(g.file, addToBlock(read(g.file), g.missing, markers));
      added.push({ file: g.file, items: g.missing });
    } else if (g.kind === "pointer") {
      await write(g.file, addToBlock(read(g.file), [pointerLine()], MARKERS.html));
      added.push({ file: g.file, items: [pointerLine()] });
    } else if (g.kind === "settings") {
      const own: Settings = JSON.parse(read(g.file));
      const kit = kitSettings(r);
      await write(g.file, `${JSON.stringify(mergeSettings(own, kit), null, 2)}\n`);
      // Hooks one by one; permissions counted per kind (dozens of rules would drown the report).
      const missing = missingSettings(own, kit, ["allow", "ask", "deny"]);
      const counts = ["allow", "ask", "deny"].map((k) => [k, missing.filter((m) => m.startsWith(`${k}: `)).length] as const);
      const hooks = missing.filter((m) => !counts.some(([k]) => m.startsWith(`${k}: `)));
      added.push({ file: g.file, items: [...hooks, ...counts.filter(([, n]) => n).map(([k, n]) => `${k}: +${n}`)] });
    } else if (g.kind === "gitleaks") {
      await write(g.file, mergeGitleaks(read(g.file)));
      added.push({ file: g.file, items: ["paths: .drwil/installed-files.json"] });
    }
  }
  return { added, gaps: gaps.filter((g) => !AUTO_KINDS.has(g.kind)) };
}

/** Removes what drwil added to a text file (its blocks and marked lines); `null` if there is none. */
export function stripAdditions(content: string): string | null {
  const nl = eol(content);
  const out: string[] = [];
  let inside: string | null = null;
  let changed = false;
  for (const l of content.split(/\r?\n/)) {
    const block = Object.values(MARKERS).find((m) => l.startsWith(m.begin));
    if (!inside && block) {
      inside = block.end;
      changed = true;
      // The blank line addToBlock put before the block goes with it.
      while (out.length && !out[out.length - 1].trim()) out.pop();
      continue;
    }
    if (inside) {
      if (l.startsWith(inside)) inside = null;
      continue;
    }
    if (l.trimEnd().endsWith(` ${LINE_MARK}`)) {
      changed = true;
      continue;
    }
    out.push(l);
  }
  if (!changed) return null;
  const body = out.join(nl).replace(/\s*$/, "");
  return body ? body + nl : "";
}

/**
 * Removes the kit's hooks from the project's Claude Code settings (`null` if there is none): once
 * uninstalled, their scripts are gone and every session would fail on them. The merged permissions
 * stay: harmless, and they may have been the project's own before the merge.
 */
export function withoutKitHooks(content: string): string | null {
  const kit: Settings = JSON.parse(templateFile("tools/claude/.claude/settings.json").replace("{{stackAllowJson}}", ""));
  const commands = new Set(Object.values(kit.hooks ?? {}).flatMap((entries) => entries.flatMap((e) => e.hooks.map((h) => h.command))));
  const own: Settings = JSON.parse(content);
  let changed = false;
  for (const [event, entries] of Object.entries(own.hooks ?? {})) {
    const kept = entries
      .map((e) => ({ ...e, hooks: (e.hooks ?? []).filter((h) => !commands.has(h.command)) }))
      .filter((e) => e.hooks.length);
    if (kept.length !== entries.length || kept.some((e, i) => e.hooks.length !== entries[i].hooks.length)) changed = true;
    if (kept.length) (own.hooks as Record<string, unknown>)[event] = kept;
    else delete own.hooks?.[event];
  }
  if (own.hooks && !Object.keys(own.hooks).length) delete own.hooks;
  return changed ? `${JSON.stringify(own, null, 2)}\n` : null;
}

// What `uninstall` removes of drwil's additions, split from complete.ts (QUA-001).
import { LINE_MARK, eol } from "./complete.js";
import { MARKERS, templateFile, type Settings } from "./essentials.js";

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

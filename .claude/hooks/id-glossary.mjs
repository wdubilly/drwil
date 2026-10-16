#!/usr/bin/env node
// Glossary of the identifiers, agent side (PostToolUse on the tools that bring text in — shell, reads,
// searches; not the agent's own edits, which would echo what it just wrote): when a tool's output cites
// identifiers the project knows (contract IDs, catalog lines, lots and points of the active brief),
// their labels are slipped into the agent's context, with the rule « always the ID followed by what it
// designates ». The labels come from .githooks/glossary.mjs, the single source, also used by the checks'
// outputs and by any agent through its command. Never blocking: an error leaves the session untouched.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const TEXTS = {
  fr: (list) => `[drwil] Identifiants cités ci-dessus : ${list}. À l'humain, toujours l'ID suivi de ce qu'il désigne.`,
  en: (list) => `[drwil] Identifiers cited above: ${list}. To the human, always the ID followed by what it designates.`,
};

/** The context to inject for this tool output, or null when it cites nothing known. */
export async function contextFor(input, root) {
  const { cited, glossary } = await import(pathToFileURL(join(root, ".githooks", "glossary.mjs")).href);
  const output = typeof input?.tool_response === "string" ? input.tool_response : JSON.stringify(input?.tool_response ?? "");
  const found = cited(output, glossary(root));
  if (!found.length) return null;
  let lang = "fr";
  try {
    lang = JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr";
  } catch {}
  return TEXTS[lang](found.map((f) => `${f.id} — ${f.label}`).join(" ; "));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const text = await contextFor(JSON.parse(readFileSync(0, "utf8")), process.cwd());
    if (text) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: text } }));
  } catch {}
}

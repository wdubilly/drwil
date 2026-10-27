// Texts of the governance state and their layout for the agent (split from state.mjs, which
// re-exports them): full context and short reminder, built from the state already read and the disk.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readBlock } from "./scope.mjs";
import { config } from "./briefs.mjs";
import { worktreeLines } from "./worktree.mjs";
import { TEXTS } from "./state-context-texts.mjs";

import { fill, STATE_MESSAGES } from "./state-messages.mjs";

export { fill, STATE_MESSAGES };

const language = (root) => (config(root).lang === "en" ? "en" : "fr");

/** Language of what a visitor reads (map, README, changelog): `docLang`, else the project's (QUA-040). */
export const docLanguage = (root) => config(root).docLang ?? config(root).lang ?? "fr";

/** `scopeGate: off` switches off all governance (gate, trailer, context): withdrawal without deleting anything. */
export const governanceDisabled = (root) => config(root).scopeGate === "off";

/** Readable context to reinject to the agent, built from the disk only. */
export function context(read, root) {
  const T = TEXTS[language(root)];
  if (governanceDisabled(root)) return T.disabled;
  const { state, source, problems } = read;
  const lines = [T.header];
  if (source === "missing") lines.push(T.missing);
  if (problems.length) lines.push(T.invalid, ...problems.map((p) => `  - ${p}`));
  lines.push(T.activity(state.activity));
  let brief = state.active_brief;
  let patterns = null;
  if (brief && !existsSync(join(root, brief))) {
    brief = `${brief} — ${T.briefDeleted}`;
  } else if (brief) {
    try {
      const text = readFileSync(join(root, brief), "utf8");
      const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim();
      if (title) brief = `${brief} — ${title}`;
      patterns = readBlock(text).patterns;
    } catch {
      patterns = [];
    }
  }
  lines.push(T.brief(brief), T.request(state.active_request));
  if (state.auto_merge === true) lines.push(T.autoMerge);
  if (state.queue?.length) lines.push(fill(T.queue, state.queue.join(", "), state.queue_merge ? T.queueMerge : ""));
  if (state.parallel?.length) lines.push(fill(T.parallel, state.parallel.join(", ")));
  if (state.queue?.length && state.activity === "SCOPING") lines.push(fill(T.queueResume, state.queue[0]));
  if (state.detour) lines.push(fill(T.detour, state.detour.origin_brief, state.detour.origin_branch, state.detour.branch));
  if (state.reopened) lines.push(fill(T.reopened, state.reopened.pr));
  if (patterns) lines.push(T.scope, ...(patterns.length ? patterns.map((p) => `  - ${p}`) : [T.noScope]));
  lines.push(T.rule(T.rules[state.activity]));
  if (state.activity === "CLOSING") lines.push(T.docLanguage(docLanguage(root)));
  if (state.activity === "CLOSING" && !state.queue?.length) lines.push(T.closingNoQueue);
  // Back in SCOPING by a move (`since` set; a missing state has none), outside a queue: one session per workstream (QUA-131).
  if (state.activity === "SCOPING" && state.since && !state.queue?.length) lines.push(T.nextSession);
  lines.push(...worktreeLines(root));
  lines.push(T.footer);
  return lines.join("\n");
}

/** Short reminder (two lines) of the state, to inject with each message; null if governance is disabled. */
export function shortReminder(read, root) {
  const T = TEXTS[language(root)];
  if (governanceDisabled(root)) return null;
  const { state, problems } = read;
  const head = problems.length
    ? T.invalidReminder
    : (() => {
        let n = null;
        if (state.active_brief && !existsSync(join(root, state.active_brief))) {
          return T.reminder(state.activity, `${state.active_brief} (${T.briefDeleted})`, null);
        }
        if (state.active_brief) {
          try {
            n = readBlock(readFileSync(join(root, state.active_brief), "utf8")).patterns.length;
          } catch {
            n = 0;
          }
        }
        return T.reminder(state.activity, state.active_brief, n);
      })();
  return `${head}\n${T.rule(T.rules[state.activity])}`;
}

// Commands of `node .githooks/state.mjs` split from state-cli.mjs (200-line ceiling): the scoped briefs
// and the resume of a workstream on another clone (QUA-245).
import { scopedBriefs } from "./briefs.mjs";
import { resume } from "./state-resume.mjs";
import { context } from "./state-texts.mjs";
import { readState, texts } from "./state-validate.mjs";

/** `briefs [--json]`: the scoped briefs. */
export function briefsCommand(args, root) {
  const briefs = scopedBriefs(root);
  if (args.includes("--json")) console.log(JSON.stringify(briefs, null, 2));
  else console.log(briefs.length ? briefs.map((b, i) => `${i + 1}. ${b.path} — ${b.title}`).join("\n") : texts(root).noBriefs);
  return 0;
}

/** `resume`: the state rebuilt from the branch's history, then the new context; returns the exit code. */
export function resumeCommand(root, opts) {
  const r = resume(root, opts);
  if (r.code === 0) console.log(`✓ ${r.message}\n\n${context(readState(root), root)}`);
  else console.error(`✗ ${r.message}`);
  return r.code;
}

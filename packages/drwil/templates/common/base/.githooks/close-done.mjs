// What the closing already knows before acting (QUA-048): a closing already done, recognised on its three
// traces, and criteria changed since their acceptance (QUA-174), reported by `--check` with the refusal's text.
// A module of its own so that close.mjs stays under its cap (QUA-001).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./briefs.mjs";
import { proofPath, proofText } from "./closure-proof.mjs";
import { acceptanceCheck } from "./state-acceptance.mjs";

/**
 * The closing of `brief` already done: `{ proof, index }`, only on its three traces — brief absent from the
 * working copy, proof written, no index line citing it (QUA-013: one trace missing, nothing is assumed).
 */
export function closingDone(root, brief) {
  if (existsSync(join(root, brief))) return null;
  const proof = proofPath(root, brief);
  if (!existsSync(join(root, proof))) return null;
  const index = config(root).dirs?.index ?? "docs/projects/pending.md";
  if (existsSync(join(root, index)) && readFileSync(join(root, index), "utf8").includes(brief)) return null;
  return { proof, index };
}

/** The criteria of `brief` (its `text`) changed since their acceptance, as the closing's refusal says it; none once the brief is gone. */
export function acceptanceProblems(root, brief, text) {
  if (!existsSync(join(root, brief))) return [];
  const acceptance = acceptanceCheck(root, brief, text);
  return acceptance.kind === "changed" ? [proofText(root, "proofChanged", acceptance.record.fingerprint, acceptance.current ?? "—")] : [];
}

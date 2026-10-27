// Criteria that survive their workstream's closing (QUA-084, QUA-085, QUA-086): the closing writes a
// versioned proof file per workstream (docs/preuves/<workstream>.md); verify replays its criteria
// afterwards, and names any whose proof has disappeared. Judged without local state: the brief comes
// from .drwil/state.json when it exists, from the branch's Drwil-Brief trailer otherwise (CI).
// Split from verify.ts (QUA-001: files under 200 lines).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  type ActiveBrief,
  contractChanges,
  type Criterion,
  criteriaVerdict,
  type CriterionResult,
  judgeBrief,
  mergeBase,
  readBrief,
  stateBrief,
} from "./criteria.js";
import { CODES, type ContractResult, type Verdict, worst } from "./verify.js";

/** The only setting this module reads: where the closing proofs live. */
export interface ProofsConfig {
  dirs?: { proofs?: string };
}

/** Default folder of the closing proofs; a project may move it (`dirs.proofs`). */
export const PROOFS_DIR = "docs/preuves";

/** Same trailer as the hooks' scope gate (scope-gate.mjs): the branch says which brief it serves. */
const TRAILER = "Drwil-Brief";

export interface ClosureProof {
  /** Path of the proof file, relative to the project root. */
  file: string;
  workstream: string;
  /** Commit the closing verified, for the reader; null when the file does not say. */
  commit: string | null;
  criteria: Criterion[];
}

/** A criterion of a closed workstream, judged again today against the registry. */
export interface ProofResult extends CriterionResult {
  file: string;
  workstream: string;
}

export function proofsDir(cfg: ProofsConfig | undefined): string {
  const dir = cfg?.dirs?.proofs;
  return typeof dir === "string" && dir ? dir : PROOFS_DIR;
}

const cells = (row: string): string[] =>
  row
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|").replace(/\\\\/g, "\\"));

/** The criteria table of a proof file: one row per criterion, « criterion | contract | check | coverage ». */
export function parseProof(file: string, text: string): ClosureProof {
  const lines = text.split("\n");
  const criteria: Criterion[] = [];
  let inTable = false;
  for (const line of lines) {
    if (/^\s*\|\s*-{2,}/.test(line)) {
      inTable = true;
      continue;
    }
    if (!/^\s*\|/.test(line)) {
      inTable = false;
      continue;
    }
    if (!inTable) continue;
    const row = cells(line);
    const human = /\[(?:humain|human)\]/i.test(row[0] ?? "");
    const label = (row[0] ?? "").replace(/\[(?:humain|human)\]/gi, "").trim();
    const link = /`([^`]+)`/.exec(row[1] ?? "")?.[1] ?? null;
    if (label) criteria.push({ text: label, link, human });
  }
  return {
    file,
    workstream: basename(file).replace(/\.md$/, ""),
    commit: /^\*\*(?:Commit vérifié|Verified commit)\*\* ?:? ?`?([0-9a-f]{7,40})/m.exec(text)?.[1] ?? null,
    criteria,
  };
}

/** Closing proofs of the project, oldest file name first; an unreadable file is skipped. */
export function readProofs(root: string, dir: string = PROOFS_DIR): ClosureProof[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  const proofs: ClosureProof[] = [];
  for (const name of readdirSync(abs).sort()) {
    if (!name.endsWith(".md") || name === "README.md") continue;
    try {
      proofs.push(parseProof(`${dir}/${name}`, readFileSync(join(abs, name), "utf8")));
    } catch {
      // Unreadable file: nothing to replay, the other proofs still are.
    }
  }
  return proofs;
}

/**
 * Criteria of the closed workstreams whose proof has disappeared (QUA-085): a contract left the
 * registry (unknown-proof), lost the check that made it durable (not-durable) or no longer passes
 * (not-pass). A contract awaiting its attestation is not a disappearance: the verdict already says
 * MANUAL, and what is missing is the human's judgement, not the proof.
 */
export function judgeProofs(proofs: ClosureProof[], contracts: ContractResult[]): ProofResult[] {
  const broken: ProofResult[] = [];
  for (const proof of proofs) {
    for (const c of proof.criteria) {
      const contract = c.link ? contracts.find((k) => k.id === c.link) : null;
      const status = !c.link
        ? "no-proof"
        : !contract
          ? "unknown-proof"
          : contract.status === "FAIL" || contract.status === "ERROR"
            ? "not-pass"
            : !c.human && contract.checks.length === 0
              ? "not-durable"
              : "pass";
      if (status === "pass") continue;
      broken.push({
        ...c,
        status,
        proof: contract ? contract.status.toLowerCase() : null,
        change: null,
        file: proof.file,
        workstream: proof.workstream,
      });
    }
  }
  return broken;
}

function git(root: string, args: string[]): string | null {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout : null;
}

/** Brief the branch says it serves, through the Drwil-Brief trailer of its commits (most recent first). */
export function trailerBrief(root: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const base = mergeBase(root, env);
  if (!base) return null;
  const out = git(root, ["log", `--format=%(trailers:key=${TRAILER},valueonly)`, `${base}..HEAD`]);
  const path = (out ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return path && existsSync(join(root, path)) ? path : null;
}

/** The brief to judge: the local state's, or — without a state, as in CI — the branch's trailer. */
export async function briefToJudge(root: string, env: NodeJS.ProcessEnv = process.env): Promise<ActiveBrief | null> {
  return (await readBrief(root, stateBrief(root))) ?? (await readBrief(root, trailerBrief(root, env)));
}

export interface DurableContext {
  root: string;
  registry: string;
  cfg: ProofsConfig | undefined;
  contracts: { id: string; text?: string }[];
  read: (text: string) => { id: string; text?: string }[];
}

/**
 * What the active brief's criteria and the closed workstreams' proofs do to the verdict (QUA-034,
 * QUA-085): an unproven criterion is a FAIL, before the closing as after it.
 */
export async function judgeDurable(v: Verdict, ctx: DurableContext): Promise<void> {
  const brief = await briefToJudge(ctx.root);
  if (brief) {
    const changes = contractChanges(ctx.root, ctx.registry, ctx.contracts, ctx.read);
    Object.assign(v, judgeBrief(brief, v.contracts, changes, ctx.contracts));
    const fromCriteria = criteriaVerdict(v.criteria ?? []);
    if (fromCriteria) v.status = worst([v.status, fromCriteria]);
  }
  v.proofs = judgeProofs(readProofs(ctx.root, proofsDir(ctx.cfg)), v.contracts);
  if (v.proofs.length) v.status = worst([v.status, "FAIL"]);
  v.code = CODES[v.status];
}

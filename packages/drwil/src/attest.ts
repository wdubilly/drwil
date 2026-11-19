// `drwil attest <ID>` (DRWIL-013, continued): explicit and traceable human proof of a MANUAL contract.
// It is not "the user typed y": the attestation is bound by fingerprint to the contract's text and to
// the effect of its proof and to the content of the files it covers; if one changes, it becomes obsolete and the contract is MANUAL again.
// It is recorded in .drwil/evidence/attestations/ (versioned, reviewed in PRs).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { ATTESTATIONS_DIR, redact, verify, type Attestation, type ContractResult } from "./verify.js";
import { TEXTS } from "./attest-texts.js";

export interface AttestOptions {
  targetDir: string;
  id: string;
  note?: string;
  /** Renew an attestation that is still valid (QUA-083): the confirmation stays the same. */
  renew?: boolean;
  /** QUA-235 : provenance du geste lu par le hook, jamais une identité authentifiée. */
  origin?: Attestation["origin"];
  /**
   * Human confirmation: receives the summary shown, returns true only if the human confirms.
   * The CLI requires an interactive terminal and typing the contract's identifier; no flag allows
   * doing without (an agent or a script cannot attest in a human's place).
   */
  confirm: (summary: string, snapshot: string, title: string) => Promise<boolean>;
  /** Progress lines while the cited checks are re-run (they can take minutes): QUA-032. */
  log?: (line: string) => void;
  now?: Date;
}

export interface AttestResult {
  /** 0: recorded; 1: refused (not eligible or not confirmed); 2: unknown contract or invalid configuration. */
  code: 0 | 1 | 2;
  message: string;
  file?: string;
}

const NOTE_MAX = 500;

export function contractSummary(k: ContractResult, lang: MessageLang = "en"): string {
  const T = TEXTS[lang];
  const l = [`${k.id} — ${k.title}`, fill(T.rule, k.rule ?? "—")];
  if (k.checks.length) l.push(T.automated, ...k.checks.map((c) => `  ✓ ${c.id} : ${c.status}`));
  else l.push(T.noAutomated);
  l.push(fill(T.human, k.manual ?? T.legacy));
  if (k.covers)
    l.push(
      fill(T.covered, `${Object.keys(k.coverage).length} (${k.covers.join(", ")})`),
      ...Object.keys(k.coverage)
        .sort()
        .map((p) => `  ${p}`),
    );
  return l.join("\n");
}

export async function attest(o: AttestOptions): Promise<AttestResult> {
  // verify gives the language only at the end: the project's, read the same way.
  const L = TEXTS[projectLang(o.targetDir)];
  const onCheck = (id: string, status?: string) => o.log?.(status ? fill(L.checkDone, id, status) : fill(L.checkRun, id));
  const v = await verify({ targetDir: o.targetDir, only: [o.id], onCheck });
  const T = TEXTS[v.lang];
  if (v.errors.length && !v.contracts.length) return { code: 2, message: v.errors.join(" ; ") };
  const k = v.contracts.find((c) => c.id === o.id);
  if (!k) return { code: 2, message: fill(T.unknown, o.id) };
  if (k.status === "PASS") return { code: 1, message: fill(T.alreadyPass, o.id) };
  if (o.renew && !k.renewable) return { code: 1, message: fill(T.renewUseless, o.id) };
  if (k.status === "ATTESTED" && !o.renew) return { code: 1, message: fill(T.alreadyAttested, o.id, k.attestation?.attestedAt) };
  if (!k.attestable && !k.renewable) return { code: 1, message: fill(T.notAttestable, o.id, k.status, k.reasons.join(" ; ")) };
  const renewing = k.renewable && k.attestation ? `${fill(T.renewing, k.attestation.attestedAt)}\n` : "";
  const summary = renewing + contractSummary(k, v.lang);
  const snapshot = JSON.stringify([summary, k.fingerprint, k.proof, k.covers, k.coverage]);
  if (!(await o.confirm(summary, snapshot, k.title))) return { code: 1, message: T.refused };

  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: o.targetDir, encoding: "utf8" });
    return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
  };
  const name = git("config", "user.name");
  const now = o.now ?? new Date();
  const attestation: Attestation = {
    version: 4,
    contract: k.id,
    status: "ATTESTED",
    attestedAt: now.toISOString(),
    // Declarative identity (no account, no signature); never the e-mail: useless and personal.
    actor: name ? { name, source: T.declarative } : null,
    note: o.note ? redact(o.note.trim()).slice(0, NOTE_MAX) || null : null,
    fingerprint: k.fingerprint,
    proof: k.proof,
    covers: k.covers,
    coverage: k.coverage,
    commit: git("rev-parse", "HEAD"),
    automated: k.checks.map((c) => ({ id: c.id, status: c.status })),
    ...(o.origin ? { origin: o.origin } : {}),
  };
  const dir = join(o.targetDir, ...ATTESTATIONS_DIR);
  mkdirSync(dir, { recursive: true });
  const file = `${k.id}-${attestation.attestedAt.replace(/[:.]/g, "-")}.json`;
  writeFileSync(join(dir, file), JSON.stringify(attestation, null, 2) + "\n");
  return { code: 0, message: fill(T.done, k.id), file: [...ATTESTATIONS_DIR, file].join("/") };
}

export interface AttestationPollOptions extends Omit<AttestOptions, "confirm" | "origin" | "id"> {
  tried: string;
  id?: string;
  /** QUA-235 : plusieurs contrats en un seul sondage à choix multiple, chacun attesté à part. */
  ids?: string[];
}

export interface AttestationQuestion {
  header: string;
  question: string;
  multiSelect: boolean;
  options: { label: string; description: string }[];
}

export interface PreparedAttestationPoll {
  code: 0;
  message: string;
  poll: { questions: AttestationQuestion[] };
  /** Empreinte comparée à la confirmation ; par lot, celle de chaque contrat dans `snapshots`. */
  snapshot: string;
  snapshots: Record<string, string>;
}

/** Claude Code n'offre que 4 options par question : au-delà, plusieurs sondages. */
export const POLL_MAX_IDS = 4;

/** QUA-235 : préparer le jugement ne confirme jamais rien et n'écrit aucune attestation. */
export async function prepareAttestationPoll(o: AttestationPollOptions): Promise<AttestResult | PreparedAttestationPoll> {
  const L = TEXTS[projectLang(o.targetDir)];
  const raw = o.tried.trim();
  if (!raw || raw.length > NOTE_MAX) return { code: 2, message: L.tried };
  const ids = [...new Set(o.ids ?? (o.id ? [o.id] : []))];
  if (!ids.length || ids.length > POLL_MAX_IDS) return { code: 2, message: fill(L.pollIds, POLL_MAX_IDS) };
  const tried = redact(raw);
  const judged: { id: string; title: string; summary: string; snapshot: string }[] = [];
  for (const id of ids) {
    let seen: (typeof judged)[number] | undefined;
    const result = await attest({
      ...o,
      id,
      confirm: async (summary, snapshot, title) => {
        seen = { id, title, summary, snapshot };
        return false;
      },
    });
    // Un contrat non attestable fait échouer toute la préparation : le sondage posé doit être celui du moteur.
    if (!seen) return ids.length > 1 ? { ...result, message: `${id} : ${result.message}` } : result;
    judged.push(seen);
  }
  const batch = judged.length > 1;
  const summaries = judged.map((j) => j.summary).join("\n\n") + (batch ? `\n\n${L.batch}` : "");
  const question = `drwil-attest ${ids.join(" ")}${o.renew ? " --renew" : ""}\n${summaries}\n\n${L.trial}:\n${tried}`;
  // Une copie des options : un appelant qui modifie le sondage ne doit jamais toucher les textes partagés.
  const options = batch
    ? judged.map((j) => ({ label: j.id, description: `${j.title} — ${L.trial} : ${tried}` }))
    : L.single.map((x) => ({ ...x }));
  const poll = { questions: [{ header: "drwil-attest", question, multiSelect: batch, options }] };
  const snapshots = Object.fromEntries(judged.map((j) => [j.id, j.snapshot]));
  return { code: 0, message: "", poll, snapshot: batch ? JSON.stringify(snapshots) : judged[0].snapshot, snapshots };
}

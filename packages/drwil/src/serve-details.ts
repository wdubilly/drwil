// Détail d'un événement, chargé à la demande (commit, PR ou MR, exécution, attestation) et d'un chantier.
// Chaque paramètre est validé avant d'atteindre une commande (QUA-280) ; rien de nominatif n'est lu (QUA-271).
import { forgeOf } from "./guarantees-forge.js";
import type { ForgeReader } from "./serve-forge.js";
import type { JournalEvent } from "./serve-journal.js";
import type { Reader } from "./serve-read.js";

const MAX_BRANCHES = 8;
const DECISIONS = ["decision", "reouverture", "lot", "activite"];

/** Adresse de la PR ou MR, déduite d'`origin` seul : aucun identifiant d'adresse ni host d'alias SSH (QUA-271). */
export function forgeLink(remote: string, number: number): string | null {
  const url = remote.trim();
  const web = /^(https?):\/\/(?:[^@/]*@)?([\w.-]+(?::\d{1,5})?)\/(.+)$/i.exec(url);
  const ssh = /^(?:(?:git\+)?ssh:\/\/(?:[^@/]*@)?([\w.-]+)(?::\d{1,5})?\/|[\w.-]+@([\w.-]+):)(.+)$/i.exec(url);
  const scheme = web ? web[1].toLowerCase() : "https";
  // Le port d'une adresse SSH n'est pas celui du site web ; un hôte sans point y serait un alias de ~/.ssh/config.
  const host = web ? web[2] : (ssh?.[1] ?? ssh?.[2]);
  if (!host || (!web && !host.includes("."))) return null;
  const path = (web ? web[3] : (ssh as RegExpExecArray)[3]).replace(/\/+$/, "").replace(/\.git$/, "");
  const parts = path.split("/");
  if (parts.length < 2 || !parts.every((p) => /^[\w.-]+$/.test(p) && !/^\.+$/.test(p))) return null;
  const forge = forgeOf(host.split(":")[0]);
  if (!forge) return null;
  return `${scheme}://${host}/${path}/${forge === "github" ? "pull" : "-/merge_requests"}/${number}`;
}

export function createDetails(reader: Reader, forge: ForgeReader) {
  const { dirs } = reader;

  async function commit(sha: string) {
    const [meta, stat, branches] = await Promise.all([
      reader.git("show", "-s", "--format=%aI%x1f%B", sha),
      reader.git("show", "--stat=120", "--format=", sha),
      // Pas `--all` : le nom d'un dépôt distant ajouté à la main est souvent celui d'une personne.
      reader.git("for-each-ref", `--contains=${sha}`, "--format=%(refname:short)", "refs/heads", "refs/remotes/origin"),
    ]);
    if (!meta) return { error: "not found" };
    const [date, body = ""] = meta.split("\x1f");
    const lines = stat.trimEnd().split("\n").filter(Boolean);
    return {
      type: "commit",
      date,
      message: body.trim(),
      files: lines.slice(0, -1).map((l) => l.trim()),
      summary: lines.at(-1)?.trim() ?? "",
      branches: branches.split("\n").filter(Boolean).slice(0, MAX_BRANCHES),
    };
  }

  async function pr(number: number) {
    const detail = await forge.pr(number);
    return detail ? { type: "pr", ...detail } : { error: "forge unavailable" };
  }

  async function run(id: string) {
    const { targets } = await forge.ci();
    const known = targets.flatMap((t) => t.workflows).find((w) => w.id === id);
    return known ? { type: "ci", jobs: known.jobs } : { error: "run not found" };
  }

  async function attestation(file: string) {
    const a = reader.json(`.drwil/evidence/attestations/${file}`);
    if (!a) return { error: "attestation not found" };
    const { contracts } = await reader.contracts();
    return {
      type: "attestation",
      contract: a.contract,
      title: contracts.find((c) => c.id === a.contract)?.title ?? "",
      status: a.status,
      source: (a.actor as { source?: unknown } | undefined)?.source ?? null,
      note: a.note ?? "",
      commit: typeof a.commit === "string" ? a.commit.slice(0, 7) : null,
      covers: a.covers ?? [],
    };
  }

  function detail(key: string) {
    const c = /^c-([0-9a-f]{7,40})$/.exec(key);
    if (c) return commit(c[1]);
    const p = /^pr-(\d{1,9})-/.exec(key);
    if (p) return pr(Number(p[1]));
    const r = /^ci-(\d{1,20})-/.exec(key);
    if (r) return run(r[1]);
    const a = /^att-([\w.-]+\.json)$/.exec(key);
    if (a) return attestation(a[1]);
    return { error: "key refused" };
  }

  /** Un chantier : ses commits par lot (trailers Drwil-Brief et Drwil-Lot), ses décisions et son entrée du journal. */
  async function workstream(name: string, events: JournalEvent[]) {
    if (!/^[\w.-]+$/.test(name)) return { error: "name refused" };
    const brief = `${dirs.projects}/${name}.md`;
    const format = "--format=%x1e%h%x1f%cI%x1f%s%x1f%(trailers:key=Drwil-Brief,valueonly)%x1f%(trailers:key=Drwil-Lot,valueonly)";
    const out = await reader.git("log", "--all", format);
    const commits = out
      .split("\x1e")
      .map((rec) => rec.split("\x1f"))
      .filter(([sha, , , b]) => sha && (b ?? "").trim() === brief)
      .map(([sha, at, subject, , lot]) => ({ sha, at, subject, lot: (lot ?? "").trim() || null }))
      .sort((x, y) => x.at.localeCompare(y.at));
    const lots: Record<string, typeof commits> = {};
    for (const c of commits) {
      lots[c.lot ?? ""] ??= [];
      lots[c.lot ?? ""].push(c);
    }
    const sections = reader.text(`${dirs.projects}/journal.md`).split(/^(?=## )/m);
    const mark = `workstream/${name}`;
    const entry =
      sections.find((s) => s.split("\n").some((l) => /Clôturé par|Closed by/.test(l) && l.includes(mark))) ??
      sections.find((s) => s.includes(mark)) ??
      "";
    const decisions = events.filter((e) => e.brief === brief && DECISIONS.includes(e.kind));
    return { brief, lots, commits: commits.length, entry: entry.trim(), decisions };
  }

  const prLink = async (number: number) => forgeLink(await reader.git("remote", "get-url", "origin"), number);

  return { detail, workstream, prLink };
}

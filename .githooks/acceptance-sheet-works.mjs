// Sources of the acceptance sheet (QUA-051, QUA-052): the workstreams of a range (commits and their
// `Drwil-Brief` trailer, briefs as they were before their deletion, journal entries added in the
// range) and the points to validate drawn from them. Imported by acceptance-sheet.mjs, which
// re-exports them.
import { acceptanceCriteria, BRIEF_DIRS } from "./briefs.mjs";
import { fill } from "./acceptance-sheet-texts.mjs";

const SEP = "\x1f";
const REC = "\x1e";
const TRAILER = "%(trailers:key=Drwil-Brief,valueonly,separator=%x2C)";
const JOURNAL = `${BRIEF_DIRS[0]}journal.md`;
const undated = (heading) => heading.replace(/^\d{4}-\d{2}-\d{2}\s+—\s+/, "");
const list = (s) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

/** https://github.com/<owner>/<repo> of the `origin` remote, or null (not GitHub, no remote). */
export function repoUrl(run) {
  const url = (run("git", ["remote", "get-url", "origin"]) ?? "").trim();
  const m = /github\.com[:/]([^/]+)\/(.+?)(\.git)?$/.exec(url);
  return m ? `https://github.com/${m[1]}/${m[2]}` : null;
}

/** Sections `## heading` of a journal: [{ heading, body }]. */
export function sections(text) {
  return text
    .split(/^## /m)
    .slice(1)
    .map((s) => {
      const [heading, ...rest] = s.split("\n");
      return { heading: heading.trim(), body: rest.join("\n") };
    });
}

/**
 * Text of the brief as it was last in the range, or null: at `to` if it still exists, otherwise just
 * before the commit that deleted it. A merge commit is never the reference: the brief scoped on the
 * main branch makes the merge of its PR differ from its first parent, which holds the scoping version.
 */
function briefText(run, to, brief) {
  const now = run("git", ["show", `${to}:${brief}`]);
  if (now !== null) return now;
  const del = (run("git", ["log", "-1", "--full-history", "--no-merges", "--diff-filter=D", "--format=%H", to, "--", brief]) ?? "").trim();
  return del ? run("git", ["show", `${del}^:${brief}`]) : null;
}

const REAL_RE = /(en réel|essai réel|essayée? en réel|in real (use|life|conditions)|for real|real[- ]world)/i;
const LIMITS_RE = /^\s*-\s+\*\*(Limites connues|Known limits)\*\*\s*:\s*/i;

/** The bullets of a Markdown text, each one whole (a bullet wrapped over several lines). */
function bullets(text) {
  const items = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*-\s+/.test(line)) items.push(line);
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1] += ` ${line.trim()}`;
    else if (!line.trim()) items.push("");
  }
  return items.filter(Boolean);
}

/** Sentences of a text that speak of a trial for real (« éprouvé en réel », « essai réel »). Only a known limit is read: a sentence of need or decision is not a trial still to make. */
export function realTrials(text) {
  const flat = text.replace(/`/g, "").replace(/\s+/g, " ");
  return flat
    .split(/(?<=[.;])\s+/)
    .map((s) => s.replace(/^[-#*\s]+/, "").trim())
    .filter((s) => REAL_RE.test(s));
}

/** Known limits of a journal entry, one per « ; »-separated part; « aucune » / « none » dropped. */
export function knownLimits(body) {
  const bullet = bullets(body).find((b) => LIMITS_RE.test(b));
  if (!bullet) return [];
  return bullet
    .replace(LIMITS_RE, "")
    .split(/\s+;\s+/)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter((s) => s && !/^(aucune|none)\b/i.test(s));
}

/**
 * The workstreams of the range `from..to`, in order: [{ brief, title, pr, text, entry }]. A brief is
 * found by the `Drwil-Brief` trailer of its commits; its PR by the merge (or squash) commit that
 * brought them; its journal entry by the PR or branch it cites. An added journal entry without a
 * brief is a workstream of its own.
 */
export function workstreams(run, from, to) {
  const range = from ? `${from}..${to}` : to;
  const log = run("git", ["log", "--reverse", `--format=%H${SEP}%P${SEP}%s${SEP}${TRAILER}${REC}`, range]) ?? "";
  const order = [];
  const prOf = new Map();
  for (const rec of log.split(REC)) {
    if (!rec.trim()) continue;
    const [, parents, subject, briefs] = rec.trim().split(SEP);
    for (const b of list(briefs)) if (!order.includes(b)) order.push(b);
    const merge = /^Merge pull request #(\d+)/.exec(subject);
    const squash = /\(#(\d+)\)$/.exec(subject);
    const [p1, p2] = parents.split(" ");
    const carried = merge && p2 ? list(run("git", ["log", `--format=${TRAILER}`, `${p1}..${p2}`]) ?? "") : squash ? list(briefs) : [];
    for (const b of carried) prOf.set(b, (merge ?? squash)[1]);
  }
  const before = new Set(sections((from && run("git", ["show", `${from}:${JOURNAL}`])) || "").map((s) => s.heading));
  const added = sections(run("git", ["show", `${to}:${JOURNAL}`]) ?? "").filter((s) => !before.has(s.heading));
  const result = order.map((brief) => {
    const text = briefText(run, to, brief) ?? "";
    const pr = prOf.get(brief) ?? null;
    const name = brief.split("/").pop().replace(/\.md$/, "");
    const cites = (e) => (pr && new RegExp(`#${pr}(?!\\d)`).test(e.body)) || new RegExp(`/${name}\\b`).test(e.body);
    const entry = added.find(cites) ?? null;
    if (entry) added.splice(added.indexOf(entry), 1);
    const title = /^#\s+(?:(?:Projet|Project)\s*:\s*)?(.+)$/m.exec(text)?.[1].trim() ?? undated(entry?.heading ?? brief);
    return { brief, title, pr, text, entry };
  });
  for (const entry of added)
    result.push({ brief: null, title: undated(entry.heading), pr: /PR #(\d+)/.exec(entry.body)?.[1] ?? null, text: "", entry });
  return result;
}

/** Points to validate, numbered `<version>-P<n>`: per workstream, then the attestations to redo. */
export function points(version, works, verdict, T) {
  const out = [];
  const add = (kind, what, work = null, how = T.hows[kind]) => out.push({ id: `${version}-P${out.length + 1}`, kind, what, how, work });
  for (const w of works) {
    for (const c of acceptanceCriteria(w.text).filter((c) => c.human)) add("human", c.text, w);
    for (const l of w.entry ? knownLimits(w.entry.body) : []) add(realTrials(l).length ? "real" : "limit", l, w);
  }
  for (const k of verdict?.results ?? [])
    if (k.status === "manual" && k.attestable) add("attest", `${k.id} — ${k.title}`, null, fill(T.hows.attest, k.manual, k.id));
  return out;
}

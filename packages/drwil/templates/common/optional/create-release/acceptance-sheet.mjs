// Acceptance sheet of a candidate release (QUA-051, QUA-052): generated, never written by hand, from
// existing sources only — the commits of the range and their `Drwil-Brief` trailer, the briefs as
// they were before their deletion, the journal entries added in the range, `drwil verify --json`,
// the contract registry, the CI runs of the commit and the tarballs. On top, what the acceptance
// team has to validate (each point with a stable ID and its workstream's PR); below, what the
// automated non-regression already proved.
// Imported by create-release.mjs (`--candidate`); release-verdict.mjs and promote-release.mjs read
// the points and fingerprints back from the sheet attached to the pre-release.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { acceptanceCriteria, BRIEF_DIRS, config } from "./briefs.mjs";
import { readContracts } from "./contracts.mjs";

const TEXTS = {
  fr: {
    title: "Fiche de recette — {0}",
    intro: "Version candidate {0} (commit `{1}`), du dernier tag définitif {2} à la candidate. Générée, jamais écrite à la main.",
    fromStart: "le début du dépôt",
    verdictHow:
      "Verdict (geste humain) : `node .githooks/release-verdict.mjs {0} --approve`, ou `--reserve <point>` / `--refuse <point>` pour chaque point concerné.",
    toValidate: "## À valider",
    nothing: "Aucun point à valider à la main dans cette version.",
    what: "Quoi",
    how: "Comment",
    kinds: { human: "critère humain", real: "pas encore essayé en réel", limit: "limite connue", attest: "attestation à refaire" },
    hows: {
      human: "L'essayer avec le tarball de la candidate et juger si le critère est tenu : seul un humain en juge.",
      real: "L'essayer en conditions réelles avec le tarball de la candidate.",
      limit: "Juger si cette limite est acceptable pour la version ; sinon, la refuser.",
      attest: "Relire la partie humaine du contrat ({0}) ; la confirmer reste un geste humain (`drwil attest {1}`).",
    },
    noPr: "PR non retrouvée",
    nonRegression: "## Non-régression (déjà prouvée : inutile de la retester)",
    verdict: "Verdict de `drwil verify` : {0}",
    unavailable: "non disponible (verify non exécuté : ce n'est pas un succès)",
    proven: "Contrats prouvés par un test : {0}",
    os: "OS testés par la CI (jobs réussis sur ce commit) : {0}",
    noOs: "aucun job réussi trouvé (CI en cours, absente ou gh indisponible)",
    prints: "Empreinte du tarball :",
    noPrint: "calculée à la création du tarball (rien de construit en --dry-run)",
    noTarball: "aucun paquet npm publiable : pas de tarball",
  },
  en: {
    title: "Acceptance sheet — {0}",
    intro: "Candidate version {0} (commit `{1}`), from the latest final tag {2} to the candidate. Generated, never written by hand.",
    fromStart: "the start of the repository",
    verdictHow:
      "Verdict (human gesture): `node .githooks/release-verdict.mjs {0} --approve`, or `--reserve <point>` / `--refuse <point>` for each point concerned.",
    toValidate: "## To validate",
    nothing: "No point to validate by hand in this version.",
    what: "What",
    how: "How",
    kinds: { human: "human criterion", real: "not tried for real yet", limit: "known limit", attest: "attestation to redo" },
    hows: {
      human: "Try it with the candidate's tarball and judge whether the criterion holds: only a human judges it.",
      real: "Try it for real with the candidate's tarball.",
      limit: "Judge whether this limit is acceptable for the version; otherwise, refuse it.",
      attest: "Reread the human part of the contract ({0}); confirming it stays a human gesture (`drwil attest {1}`).",
    },
    noPr: "PR not found",
    nonRegression: "## Non-regression (already proven: no need to test it again)",
    verdict: "`drwil verify` verdict: {0}",
    unavailable: "unavailable (verify not run: that is not a success)",
    proven: "Contracts proven by a test: {0}",
    os: "OS tested by the CI (successful jobs on this commit): {0}",
    noOs: "no successful job found (CI running, absent or gh unavailable)",
    prints: "Tarball fingerprint:",
    noPrint: "computed when the tarball is built (nothing built in --dry-run)",
    noTarball: "no publishable npm package: no tarball",
  },
};

export const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

/** Messages in the project's language (French by default). */
export function sheetTexts(root) {
  return TEXTS[config(root).lang === "en" ? "en" : "fr"];
}

/**
 * Command runner of the module: stdout, or null when the command fails or is missing (`any`: stdout
 * whatever the exit code, for `drwil verify`, which exits 1 on FAIL). Injected by the tests.
 */
export function runner(root) {
  return (cmd, args, { any = false } = {}) => {
    const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return r.status === 0 || (any && typeof r.stdout === "string" && r.stdout) ? r.stdout : null;
  };
}

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

/** Text of the brief as it was last in the range (before its deletion at closing), or null. */
function briefText(run, to, brief) {
  const last = (run("git", ["log", "-1", "--full-history", "--format=%H", to, "--", brief]) ?? "").trim();
  if (!last) return null;
  return run("git", ["show", `${last}:${brief}`]) ?? run("git", ["show", `${last}^:${brief}`]);
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

/** Sentences of a text that speak of a trial for real (« éprouvé en réel », « essai réel »). */
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
    const body = w.entry
      ? bullets(w.entry.body)
          .filter((b) => !LIMITS_RE.test(b))
          .join("\n")
      : "";
    for (const s of new Set([...realTrials(w.text), ...realTrials(body)])) add("real", s, w);
    for (const l of w.entry ? knownLimits(w.entry.body) : []) add("limit", l, w);
  }
  for (const k of verdict?.results ?? [])
    if (k.status === "manual" && k.attestable) add("attest", `${k.id} — ${k.title}`, null, fill(T.hows.attest, k.manual, k.id));
  return out;
}

/** `drwil verify --json` of the project (local package only, never fetched), or null. */
export function verifyJson(root, run) {
  const bin = join(root, "node_modules", "drwil", "bin", "drwil.js");
  if (!existsSync(bin)) return null;
  try {
    return JSON.parse(run(process.execPath, [bin, "verify", "--json"], { any: true }) ?? "");
  } catch {
    return null;
  }
}

/** Contracts that pass and cite a test in the registry: [{ id, title }]. */
export function provenByTest(root, verdict) {
  const registry = join(root, config(root).dirs?.contracts ?? "docs/contracts.md");
  const tested = new Set(
    existsSync(registry)
      ? readContracts(readFileSync(registry, "utf8"))
          .filter((k) => k.tests?.length)
          .map((k) => k.id)
      : [],
  );
  return (verdict?.results ?? []).filter((k) => k.status === "pass" && tested.has(k.id)).map(({ id, title }) => ({ id, title }));
}

const parse = (text, fallback) => {
  try {
    return JSON.parse(text ?? "");
  } catch {
    return fallback;
  }
};

/** Runner labels of the CI jobs that succeeded on `sha` (gh), sorted; empty when none is found. */
export function ciOs(run, sha) {
  const runs = parse(run("gh", ["run", "list", "--commit", sha, "--json", "databaseId", "--limit", "50"]), []);
  const os = new Set();
  for (const { databaseId } of Array.isArray(runs) ? runs : []) {
    const jobs = parse(run("gh", ["api", `repos/{owner}/{repo}/actions/runs/${databaseId}/jobs`]), {}).jobs ?? [];
    for (const j of jobs) if (j.conclusion === "success") for (const l of j.labels ?? []) os.add(l);
  }
  return [...os].sort();
}

/** sha256 of a file, hexadecimal. */
export const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/**
 * The sheet in Markdown. `data`: { tag, version, commit, from, repo, points, verdict, proven, os,
 * tarballs: null (not built) | [{ name, sha256 }] , packages }.
 */
export function renderSheet(data, T) {
  const lines = [`# ${fill(T.title, data.tag)}`, "", fill(T.intro, data.tag, data.commit.slice(0, 7), data.from ?? T.fromStart), ""];
  lines.push(fill(T.verdictHow, data.tag), "", T.toValidate, "");
  if (!data.points.length) lines.push(T.nothing, "");
  for (const p of data.points) {
    const pr = p.work?.pr ? (data.repo ? `[PR #${p.work.pr}](${data.repo}/pull/${p.work.pr})` : `PR #${p.work.pr}`) : T.noPr;
    lines.push(`- **${p.id}** — ${T.kinds[p.kind]}${p.work ? ` — ${p.work.title} (${pr})` : ""}`);
    lines.push(`  - ${T.what} : ${p.what}`, `  - ${T.how} : ${p.how}`);
  }
  if (data.points.length) lines.push("");
  lines.push(T.nonRegression, "", `- ${fill(T.verdict, data.verdict ? data.verdict.status.toUpperCase() : T.unavailable)}`);
  if (data.verdict) {
    lines.push(`- ${fill(T.proven, data.proven.length)}`);
    for (const k of data.proven) lines.push(`  - ${k.id} — ${k.title}`);
  }
  lines.push(`- ${fill(T.os, data.os.length ? data.os.join(", ") : T.noOs)}`);
  if (!data.packages) lines.push(`- ${T.prints} ${T.noTarball}`);
  else if (!data.tarballs) lines.push(`- ${T.prints} ${T.noPrint}`);
  else {
    lines.push(`- ${T.prints}`);
    for (const t of data.tarballs) lines.push(`  - \`${t.name}\` — sha256 \`${t.sha256}\``);
  }
  return `${lines.join("\n")}\n`;
}

/** Points of a sheet read back: [{ id, kind, what }] (verdict and issues cite them). */
export function readPoints(sheet) {
  const out = [];
  for (const m of sheet.matchAll(/^- \*\*(v?[\w.]+-P\d+)\*\* — (.+)\n {2}- [^:\n]+ : (.+)$/gm))
    out.push({ id: m[1], head: m[2], what: m[3] });
  return out;
}

/** Tarball fingerprints of a sheet read back: { name: sha256 }. */
export function readFingerprints(sheet) {
  return Object.fromEntries([...sheet.matchAll(/^ {2}- `([^`]+)` — sha256 `([0-9a-f]{64})`$/gm)].map((m) => [m[1], m[2]]));
}

/** Gathers the sources and renders the sheet of `tag` (candidate) for the range `from..HEAD`. */
export function buildSheet(root, { tag, version, from, tarballs, packages }, run = runner(root)) {
  const T = sheetTexts(root);
  const commit = (run("git", ["rev-parse", "HEAD"]) ?? "").trim();
  const verdict = verifyJson(root, run);
  const works = workstreams(run, from, "HEAD");
  const data = {
    tag,
    version,
    commit,
    from,
    repo: repoUrl(run),
    points: points(version, works, verdict, T),
    verdict,
    proven: provenByTest(root, verdict),
    os: ciOs(run, commit),
    tarballs: tarballs ? tarballs.map((f) => ({ name: f.split(/[\\/]/).pop(), sha256: sha256(f) })) : null,
    packages,
  };
  return renderSheet(data, T);
}

// Couche forge de `drwil serve` : forge détectée d'après `origin`, réponses de même forme sur GitHub et GitLab
// (QUA-273), vue vide qui dit ce qui manque si la forge est absente ou injoignable (QUA-275).
import { forgeOf, type Forge } from "./guarantees-forge.js";
import { githubAdapter } from "./serve-github.js";
import { gitlabAdapter } from "./serve-gitlab.js";

export type Sh = (cmd: string, args: string[]) => Promise<string>;
/** Une commande de lecture et sa réponse JSON ; null si elle échoue ou répond autre chose. */
export type ReadJson = <T>(cmd: string, args: string[]) => Promise<T | null>;
export type PrState = "open" | "merged" | "closed";
export type Missing = "forgeNone" | "forgeNoCli" | "forgeUnreachable";
export interface Pr {
  number: number;
  title: string;
  state: PrState;
  branch: string;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  paths: string[];
}
export interface CiStep {
  name: string;
  status: string;
  conclusion: string | null;
  started: string | null;
  completed: string | null;
}
export type CiJob = CiStep & { steps: CiStep[] };
export interface CiRun {
  id: string;
  name: string;
  event: string;
  status: string;
  conclusion: string | null;
  created: string;
  sha: string;
}
export interface Release {
  tag: string;
  latest: boolean;
  prerelease: boolean;
  publishedAt: string | null;
}
export interface PrDetail {
  number: number;
  title: string;
  body: string;
  state: PrState;
  branch: string;
  base: string;
  additions: number | null;
  deletions: number | null;
  changedFiles: number | null;
  commits: number;
}
export interface Adapter {
  cli: "gh" | "glab";
  prs(): Promise<Pr[] | null | undefined>;
  runs(branch: string): Promise<CiRun[] | null | undefined>;
  jobs(id: string): Promise<CiJob[] | null | undefined>;
  releases(): Promise<Release[] | null | undefined>;
  pr(number: number): Promise<PrDetail | null>;
}
export interface Availability {
  forge: Forge | null;
  cli: string | null;
  missing: Missing | null;
}
export type CiTarget = { kind: "pr" | "main"; number: number | null; title: string | null; branch: string; sha: string | null };
export type CiWorkflow = CiRun & { jobs: CiJob[] };

const PR_TTL_MS = 30000;
const CI_TTL_MS = 10000;
const REMOTE_TTL_MS = 60000;
const MAX_CI_TARGETS = 10;
const BODY_MAX = 4000;
const KEPT_JOBS = 200;

/** Évite qu'une vue ouverte sur plusieurs téléphones multiplie les appels à la forge ; l'appel en cours est partagé. */
function memo<T>(ttl: number, fn: () => Promise<T>): () => Promise<T> {
  let at = 0;
  let value: Promise<T> | null = null;
  return () => {
    if (!value || Date.now() - at >= ttl) {
      at = Date.now();
      value = fn();
    }
    return value;
  };
}

/** L'hôte seul : un dépôt nommé `github-mirror` sur gitlab.com reste du GitLab ; les identifiants d'une adresse ne sortent pas d'ici. */
export function hostOf(url: string): string {
  return url
    .trim()
    .replace(/^[a-z+]+:\/\//i, "")
    .replace(/^[^@/]*@/, "")
    .split(/[:/]/)[0];
}

/** Documentation seule ou code : la nature d'une PR (Markdown, `docs/`, preuves et consommation sous `.drwil/`). */
export function natureOf(paths: readonly string[]): "doc" | "code" {
  const isDoc = (f: string) => /\.md$/i.test(f) || f.startsWith("docs/") || f.startsWith(".drwil/evidence/") || f === ".drwil/usage.jsonl";
  return paths.length && paths.every(isDoc) ? "doc" : "code";
}

/** Une panne ou une réponse inattendue de la forge vaut « injoignable », jamais une erreur de la vue. */
const safe = <T>(call: () => Promise<T | null | undefined>): Promise<T | null | undefined> => call().catch(() => null);

export function createForge(sh: Sh, git: (...args: string[]) => Promise<string>) {
  const read: ReadJson = async <T>(cmd: string, args: string[]) => {
    try {
      return JSON.parse(await sh(cmd, args)) as T;
    } catch {
      return null;
    }
  };
  const detect = memo(REMOTE_TTL_MS, async (): Promise<Availability & { adapter: Adapter | null }> => {
    const forge = forgeOf(hostOf(await git("remote", "get-url", "origin")));
    if (!forge) return { forge: null, cli: null, missing: "forgeNone", adapter: null };
    const adapter = forge === "github" ? githubAdapter(read) : gitlabAdapter(read);
    if (!(await sh(adapter.cli, ["--version"])).trim()) return { forge, cli: adapter.cli, missing: "forgeNoCli", adapter: null };
    return { forge, cli: adapter.cli, missing: null, adapter };
  });

  const availability = async (): Promise<Availability> => {
    const { forge, cli, missing } = await detect();
    return { forge, cli, missing };
  };

  const prs = memo(PR_TTL_MS, async () => {
    const d = await detect();
    const rows = d.adapter && (await safe(d.adapter.prs));
    return rows
      ? { forge: d.forge, cli: d.cli, missing: null as Missing | null, prs: rows }
      : { forge: d.forge, cli: d.cli, missing: d.missing ?? ("forgeUnreachable" as Missing), prs: [] as Pr[] };
  });

  async function mainBranch(): Promise<string | null> {
    const head = (await git("symbolic-ref", "--short", "refs/remotes/origin/HEAD")).trim().replace(/^origin\//, "");
    if (head) return head;
    for (const name of ["main", "master"])
      if ((await git("rev-parse", "--verify", "--quiet", `refs/remotes/origin/${name}`)).trim()) return name;
    return null;
  }

  // Une exécution terminée ne change plus : ses jobs ne sont demandés qu'une fois.
  const finished = new Map<string, CiJob[]>();
  async function jobsOf(adapter: Adapter, run: CiRun): Promise<CiJob[]> {
    const known = finished.get(run.id);
    if (known) return known;
    const jobs = (await safe(() => adapter.jobs(run.id))) ?? [];
    if (run.status === "completed" && jobs.length) {
      if (finished.size >= KEPT_JOBS) finished.clear();
      finished.set(run.id, jobs);
    }
    return jobs;
  }

  const ci = memo(CI_TTL_MS, async () => {
    const list = await prs();
    const adapter = (await detect()).adapter;
    const empty = { forge: list.forge, cli: list.cli, missing: list.missing, targets: [] as (CiTarget & { workflows: CiWorkflow[] })[] };
    if (list.missing || !adapter) return empty;
    const main = await mainBranch();
    const opened = list.prs.filter((p) => p.state === "open").slice(0, MAX_CI_TARGETS);
    const wanted: CiTarget[] = [
      ...opened.map((p) => ({ kind: "pr" as const, number: p.number, title: p.title, branch: p.branch, sha: null })),
      ...(main ? [{ kind: "main" as const, number: null, title: null, branch: main, sha: null }] : []),
    ];
    for (const target of wanted) {
      const runs = (await safe(() => adapter.runs(target.branch))) ?? [];
      const latest = runs[0]?.sha ?? null;
      const workflows: CiWorkflow[] = [];
      for (const run of runs.filter((r) => r.sha === latest))
        workflows.push({ ...run, sha: run.sha.slice(0, 7), jobs: await jobsOf(adapter, run) });
      empty.targets.push({ ...target, sha: latest?.slice(0, 7) ?? null, workflows });
    }
    return empty;
  });

  async function releases(): Promise<Release[]> {
    const adapter = (await detect()).adapter;
    return (adapter && (await safe(adapter.releases))) ?? [];
  }

  async function pr(number: number): Promise<PrDetail | null> {
    const adapter = (await detect()).adapter;
    const detail = adapter && (await safe(() => adapter.pr(number)));
    return detail ? { ...detail, body: detail.body.slice(0, BODY_MAX) } : null;
  }

  return { availability, prs, ci, releases, pr };
}

export type ForgeReader = ReturnType<typeof createForge>;

// Adapteur GitHub (`gh`) de `drwil serve`, même forme de réponse que GitLab (QUA-273). Rien que des lectures, et
// seuls les champs nommés ici sortent : ni auteur, ni adresse, qui portent un login (QUA-271).
import type { Adapter, CiStep, PrState, ReadJson } from "./serve-forge.js";

const MAX_PR = 300;
const RUNS = 5;
const PAGE = 100;

type GhStep = { name: string; status: string; conclusion: string | null; started_at: string | null; completed_at: string | null };
type GhJob = GhStep & { steps?: GhStep[] };
const ghStep = (s: GhStep): CiStep => ({
  name: s.name,
  status: s.status,
  conclusion: s.conclusion || null,
  started: s.started_at,
  completed: s.completed_at,
});

export function githubAdapter(read: ReadJson): Adapter {
  const gh = <T>(...args: string[]) => read<T>("gh", args);
  return {
    cli: "gh",
    async prs() {
      type Row = {
        number: number;
        title: string;
        state: string;
        headRefName: string;
        createdAt: string;
        mergedAt: string | null;
        closedAt: string | null;
        files: { path: string }[] | null;
      };
      const fields = "number,title,state,headRefName,createdAt,mergedAt,closedAt,files";
      const rows = await gh<Row[]>("pr", "list", "--state", "all", "--limit", String(MAX_PR), "--json", fields);
      return rows?.map((p) => ({
        number: p.number,
        title: p.title,
        state: p.state.toLowerCase() as PrState,
        branch: p.headRefName,
        createdAt: p.createdAt,
        mergedAt: p.mergedAt ?? null,
        closedAt: p.closedAt ?? null,
        paths: (p.files ?? []).map((f) => f.path),
      }));
    },
    async runs(branch) {
      type Row = {
        databaseId: number;
        name: string;
        status: string;
        conclusion: string;
        event: string;
        createdAt: string;
        headSha: string;
      };
      // `--branch=` : un nom de branche venu de la forge ne peut pas devenir une option.
      const fields = "databaseId,name,status,conclusion,event,createdAt,headSha";
      const rows = await gh<Row[]>("run", "list", `--branch=${branch}`, "--limit", String(RUNS), "--json", fields);
      return rows?.map((r) => ({
        id: String(r.databaseId),
        name: r.name,
        event: r.event,
        status: r.status,
        conclusion: r.conclusion || null,
        created: r.createdAt,
        sha: r.headSha,
      }));
    },
    async jobs(id) {
      // `gh run view --json jobs` ne donne pas la durée des étapes.
      const data = await gh<{ jobs: GhJob[] }>("api", `repos/{owner}/{repo}/actions/runs/${id}/jobs?per_page=${PAGE}`);
      return data?.jobs.map((j) => ({ ...ghStep(j), steps: (j.steps ?? []).filter((s) => s.started_at).map(ghStep) }));
    },
    async releases() {
      type Row = { tagName: string; isLatest: boolean; isPrerelease: boolean; publishedAt: string | null };
      const rows = await gh<Row[]>("release", "list", "--limit", "50", "--json", "tagName,isLatest,isPrerelease,publishedAt");
      return rows?.map((r) => ({ tag: r.tagName, latest: r.isLatest, prerelease: r.isPrerelease, publishedAt: r.publishedAt }));
    },
    async pr(number) {
      type Row = {
        number: number;
        title: string;
        body: string;
        state: string;
        headRefName: string;
        baseRefName: string;
        additions: number;
        deletions: number;
        changedFiles: number;
        commits: unknown[];
      };
      const fields = "number,title,body,state,headRefName,baseRefName,additions,deletions,changedFiles,commits";
      const p = await gh<Row>("pr", "view", String(number), "--json", fields);
      return (
        p && {
          number: p.number,
          title: p.title,
          body: p.body ?? "",
          state: p.state.toLowerCase() as PrState,
          branch: p.headRefName,
          base: p.baseRefName,
          additions: p.additions,
          deletions: p.deletions,
          changedFiles: p.changedFiles,
          commits: p.commits?.length ?? 0,
        }
      );
    },
  };
}

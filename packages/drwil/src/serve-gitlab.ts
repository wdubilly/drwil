// Adapteur GitLab (`glab`) de `drwil serve`, même forme de réponse que GitHub (QUA-273). Rien que des lectures, et
// seuls les champs nommés ici sortent : ni auteur, ni adresse, qui portent un login (QUA-271).
import type { Adapter, PrState, ReadJson } from "./serve-forge.js";

const MAX_PR = 300;
const RUNS = 5;
const PAGE = 100;
// Les fichiers d'une MR coûtent un appel : les plus récentes seulement, et une seule fois par version de la MR.
const MR_WITH_FILES = 30;
const DONE: Record<string, string> = { success: "success", failed: "failure", canceled: "cancelled", skipped: "skipped" };

function glabStatus(status: string): { status: string; conclusion: string | null } {
  if (status in DONE) return { status: "completed", conclusion: DONE[status] };
  return { status: status === "running" ? "in_progress" : "queued", conclusion: null };
}

const glabState = (state: string): PrState => (state === "opened" ? "open" : state === "merged" ? "merged" : "closed");
const count = (diffs: GlDiff[] | null, sign: string): number | null =>
  diffs?.reduce((n, d) => n + (d.diff ?? "").split("\n").filter((l) => l.startsWith(sign)).length, 0) ?? null;

type GlDiff = { new_path: string; diff?: string };
type GlMr = {
  iid: number;
  sha: string;
  title: string;
  description: string | null;
  state: string;
  source_branch: string;
  target_branch: string;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
};

export function gitlabAdapter(read: ReadJson): Adapter {
  // Toujours `glab api <chemin>`, sans `-X` ni `-f` : un GET, jamais autre chose.
  const api = <T>(path: string) => read<T>("glab", ["api", `projects/:id/${path}`]);
  const diffs = (iid: number) => api<GlDiff[]>(`merge_requests/${iid}/diffs?per_page=${PAGE}`);
  const paths = new Map<string, string[]>();
  return {
    cli: "glab",
    async prs() {
      const rows: GlMr[] = [];
      for (let page = 1; rows.length < MAX_PR; page++) {
        const part = await api<GlMr[]>(`merge_requests?state=all&order_by=created_at&per_page=${PAGE}&page=${page}`);
        if (!part) return page === 1 ? null : rows.map(toPr);
        rows.push(...part);
        if (part.length < PAGE) break;
      }
      for (const m of rows.slice(0, MR_WITH_FILES)) {
        if (paths.has(`${m.iid}:${m.sha}`)) continue;
        const d = await diffs(m.iid);
        if (d)
          paths.set(
            `${m.iid}:${m.sha}`,
            d.map((f) => f.new_path),
          );
      }
      return rows.map(toPr);
      function toPr(m: GlMr) {
        return {
          number: m.iid,
          title: m.title,
          state: glabState(m.state),
          branch: m.source_branch,
          createdAt: m.created_at,
          mergedAt: m.merged_at ?? null,
          closedAt: m.state === "closed" ? (m.closed_at ?? null) : null,
          paths: paths.get(`${m.iid}:${m.sha}`) ?? [],
        };
      }
    },
    async runs(branch) {
      type Row = { id: number; sha: string; status: string; source: string; created_at: string };
      const rows = await api<Row[]>(`pipelines?ref=${encodeURIComponent(branch)}&per_page=${RUNS}`);
      return rows?.map((r) => ({
        id: String(r.id),
        name: `Pipeline ${r.id}`,
        event: r.source,
        created: r.created_at,
        sha: r.sha,
        ...glabStatus(r.status),
      }));
    },
    async jobs(id) {
      type Row = { name: string; status: string; started_at: string | null; finished_at: string | null };
      const rows = await api<Row[]>(`pipelines/${id}/jobs?per_page=${PAGE}`);
      return rows?.map((j) => ({ name: j.name, ...glabStatus(j.status), started: j.started_at, completed: j.finished_at, steps: [] }));
    },
    async releases() {
      type Row = { tag_name: string; released_at: string | null; upcoming_release?: boolean };
      const rows = await api<Row[]>("releases?per_page=50");
      return rows?.map((r, i) => ({
        tag: r.tag_name,
        latest: i === 0,
        prerelease: r.upcoming_release === true,
        publishedAt: r.released_at,
      }));
    },
    async pr(number) {
      const [m, d, commits] = await Promise.all([
        api<GlMr>(`merge_requests/${number}`),
        diffs(number),
        api<unknown[]>(`merge_requests/${number}/commits?per_page=${PAGE}`),
      ]);
      return (
        m && {
          number: m.iid,
          title: m.title,
          body: m.description ?? "",
          state: glabState(m.state),
          branch: m.source_branch,
          base: m.target_branch,
          additions: count(d, "+"),
          deletions: count(d, "-"),
          changedFiles: d?.length ?? null,
          commits: commits?.length ?? 0,
        }
      );
    },
  };
}

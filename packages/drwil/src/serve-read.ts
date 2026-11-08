// Lectures du projet pour `drwil serve`, génériques (`dirs` de la configuration) et tolérantes : une
// source absente donne une vue vide. Aucune écriture, aucun shell, que des commandes de lecture (QUA-269).
import { execFile } from "node:child_process";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import { summarizeUsage } from "./serve-journal.js";
import { parseContracts } from "./serve-views.js";

const run = promisify(execFile);
const MAX_SIZE = 4 * 1024 * 1024;
const MARKS = /\[(décision|decision|humain|human|IA|AI|P\d)\]/g;
const FILE_NAME = /^[\w.-]+\.md$/;
type Json = Record<string, unknown>;
type Tag = { marks: string[]; theme: string; done: boolean };

export function createReader(root: string, signal?: AbortSignal) {
  // QUA-269 : un lien symbolique du dépôt ne fait pas sortir la lecture du projet.
  const safe = (rel: string): boolean => {
    const parts = rel.split("/");
    if (isAbsolute(rel) || parts.some((p) => p === ".." || p === "")) return false;
    try {
      return parts.every((_, i) => !lstatSync(join(root, ...parts.slice(0, i + 1))).isSymbolicLink());
    } catch {
      return false;
    }
  };
  const text = (rel: string): string => {
    if (!safe(rel)) return "";
    const stat = lstatSync(join(root, rel));
    return stat.isFile() && stat.size <= MAX_SIZE ? readFileSync(join(root, rel), "utf8") : "";
  };
  const json = (rel: string): Json | null => {
    try {
      return JSON.parse(text(rel));
    } catch {
      return null;
    }
  };
  const list = (rel: string): string[] => (safe(rel) && lstatSync(join(root, rel)).isDirectory() ? readdirSync(join(root, rel)) : []);
  const sh = async (cmd: string, args: string[]): Promise<string> => {
    try {
      const env = { ...process.env, GIT_OPTIONAL_LOCKS: "0", GH_PROMPT_DISABLED: "1", NO_COLOR: "1" };
      return (await run(cmd, args, { cwd: root, timeout: 15000, maxBuffer: 2e7, windowsHide: true, env, signal })).stdout;
    } catch {
      return "";
    }
  };
  const git = (...args: string[]) => sh("git", args);

  const config = json(".drwil/ia-first.json") ?? {};
  const dirs: Record<string, string> = {
    projects: "docs/projects",
    intentions: "docs/intentions",
    contracts: "docs/contracts.md",
    index: "docs/projects/pending.md",
    catalog: "docs/contracts-catalog.md",
    ...(config.dirs as Record<string, string> | undefined),
  };

  async function state() {
    const st = json(".drwil/state.json");
    const lot = json(".drwil/lot.json");
    const brief = st?.active_brief ?? null;
    return {
      activity: st?.activity ?? null,
      brief,
      lot: lot && brief && lot.brief === brief ? { current: lot.current, done: lot.done } : null,
      branch: (await git("branch", "--show-current")).trim(),
    };
  }

  async function briefs(): Promise<Json[]> {
    try {
      const all: Json[] = JSON.parse(await sh(process.execPath, [".githooks/state.mjs", "briefs", "--json"]));
      return all.map(({ path, title, priority, decisions, ready, maturity }) => ({ path, title, priority, decisions, ready, maturity }));
    } catch {
      return [];
    }
  }

  function indexTags(): Record<string, Tag> {
    const tags: Record<string, Tag> = {};
    let theme = "";
    let bullet: (Tag & { text: string }) | null = null;
    const flush = () => {
      const { marks = [], theme: section = "", done = false, text: line = "" } = bullet ?? {};
      for (const m of line.matchAll(/[\w./-]*\/([\w.-]+\.md)/g)) tags[m[1]] ??= { marks, theme: section, done };
      bullet = null;
    };
    for (const line of text(dirs.index).split("\n")) {
      if (/^#{2,3} /.test(line)) {
        flush();
        theme = line.replace(/^#+ /, "");
      } else if (/^- \[[ x]\]/.test(line)) {
        flush();
        bullet = { text: line, theme, done: line.startsWith("- [x]"), marks: [...line.matchAll(MARKS)].map((m) => m[1]) };
      } else if (bullet && /^\s+\S/.test(line)) bullet.text += ` ${line.trim()}`;
      else flush();
    }
    flush();
    return tags;
  }

  function intentions(): Json[] {
    const tags = indexTags();
    return list(dirs.intentions)
      .filter((f) => FILE_NAME.test(f) && !["README.md", "notes.md"].includes(f))
      .map((file) => {
        const body = text(`${dirs.intentions}/${file}`);
        const title = (/^# (.*)$/m.exec(body)?.[1] ?? file).replace(/^(?:Intention|Intent)\s*:\s*/, "");
        const status = /^\*\*(?:Statut|Status)\*\*\s*:\s*(.*)$/m.exec(body)?.[1] ?? "";
        const section = body.split(/^## (?:Questions à trancher|Open questions)\s*$/m)[1] ?? "";
        const questions = (section.split(/^## /m)[0].match(/^- .*(?:\n {2}.*)*/gm) ?? []).map((q) =>
          q.replace(/^- /, "").replace(/\n\s+/g, " "),
        );
        return { file, title, status, questions, ...(tags[file] ?? { marks: [], theme: "", done: false }) };
      })
      .sort((a, b) => a.theme.localeCompare(b.theme) || a.title.localeCompare(b.title));
  }

  const notes = (): string[] =>
    (text(`${dirs.intentions}/notes.md`).match(/^- .*(?:\n(?!- ).+)*/gm) ?? []).map((n) => n.replace(/^- /, ""));

  function lastVerify(): Json | null {
    const files = list(".drwil/evidence")
      .filter((f) => /^verify-.*\.json$/.test(f))
      .sort();
    return files.length ? json(`.drwil/evidence/${files.at(-1)}`) : null;
  }

  async function contracts() {
    const contractsList = parseContracts(text(dirs.contracts));
    const main = (await git("symbolic-ref", "--short", "refs/remotes/origin/HEAD")).trim();
    const base = new Map(parseContracts(main ? await git("show", `${main}:${dirs.contracts}`) : "").map((c) => [c.id, c.raw.trim()]));
    const verify = lastVerify();
    const results = new Map(((verify?.results ?? []) as Json[]).map((r) => [r.id, r]));
    return {
      verify: verify && {
        at: verify.verifiedAt,
        commit: typeof verify.commit === "string" ? verify.commit.slice(0, 7) : null,
        label: verify.label,
        totals: verify.contracts,
        dirty: verify.dirtyWorktree,
      },
      contracts: contractsList.map((c) => {
        const r = results.get(c.id);
        const change = !base.size ? "" : !base.has(c.id) ? "new" : base.get(c.id) !== c.raw.trim() ? "changed" : "";
        return {
          id: c.id,
          title: c.title,
          fields: c.fields,
          change,
          status: r?.status ?? null,
          severity: r?.severity ?? null,
          reasons: r?.reasons ?? [],
        };
      }),
    };
  }

  const usage = async () =>
    summarizeUsage(
      text(".drwil/usage.jsonl"),
      await git("tag", "--list", "v*", "--sort=creatordate", "--format=%(refname:short)%1f%(creatordate:short)"),
    );

  /** Une fiche ou une intention, et rien d'autre : la liste fermée des dossiers vaut validation du paramètre. */
  function file(path: string) {
    const name = path.split("/").pop() ?? "";
    const allowed = [dirs.projects, dirs.intentions].some((d) => path === `${d}/${name}`);
    return allowed && FILE_NAME.test(name) ? { path, text: text(path) } : { error: "path refused" };
  }

  return { config, dirs, state, briefs, intentions, notes, contracts, usage, file, git, sh, text, json, list };
}

export type Reader = ReturnType<typeof createReader>;

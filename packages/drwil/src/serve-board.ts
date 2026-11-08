// Tableau du cycle et releases de `drwil serve`, déduits des fichiers, de l'état, de Git et de la forge : aucune
// carte ne se déplace à la main. Colonnes : notes, intentions, fiches, chantier, PR ou MR ouvertes, fusionnées, publiées.
import type { ForgeReader, Pr } from "./serve-forge.js";
import { natureOf } from "./serve-forge.js";
import type { Reader } from "./serve-read.js";
import { tags } from "./serve-releases.js";

const VERSION = /\((\d+\.\d+\.\d+)(?:,\s*(\d+))?\)/;
const MARK = /\[(décision|decision|humain|human|IA|AI|P\d)\]/g;
const PUBLISHED_SHOWN = 4;

function bullets(text: string, dirs: readonly string[]) {
  type Bullet = { done: boolean; text: string };
  const out: Bullet[] = [];
  let cur: Bullet | null = null;
  for (const line of text.split("\n")) {
    const b = /^-[ ]\[([ x])\] (.*)$/.exec(line);
    if (b) {
      cur = { done: b[1] === "x", text: b[2] };
      out.push(cur);
    } else if (cur && /^\s+\S/.test(line)) cur.text += ` ${line.trim()}`;
    else cur = null;
  }
  return out.map((x) => {
    const v = VERSION.exec(x.text);
    return {
      done: x.done,
      version: v?.[1] ?? null,
      order: v?.[2] ? Number(v[2]) : null,
      paths: [...x.text.matchAll(/[\w./-]+\.md/g)].map((m) => m[0]).filter((p) => dirs.some((d) => p.startsWith(`${d}/`))),
      title: x.text
        .replace(MARK, "")
        .replace(VERSION, "")
        .replace(/\s*—\s*`[^`]+`\.?\s*$/, "")
        .trim(),
    };
  });
}

const short = (date: string) => date.slice(0, 10);
const asCard = (p: Pr, date: string) => ({
  id: `pr-${p.number}`,
  number: p.number,
  title: p.title,
  nature: natureOf(p.paths),
  date: short(date),
  files: p.paths.length,
});

export function createBoard(reader: Reader, forge: ForgeReader) {
  const { dirs } = reader;
  const docDirs = [dirs.projects, dirs.intentions];
  const journalPath = `${dirs.projects}/journal.md`;
  const stem = (p: string) => (p.split("/").pop() as string).replace(/\.md$/, "");
  const branchOf = (p: string) => `workstream/${stem(p)}`;

  /** Repères de version retirés de l'index depuis la dernière release : les éléments faits ou abandonnés. */
  async function pastTargets(version: string, since: string) {
    const pattern = `-G\\(${version.replace(/[\\.]/g, "\\$&")}`;
    const out = await reader.git("log", "-p", "--format=", `--since=${since}`, pattern, "--", dirs.index);
    const removed = out
      .split("\n")
      .filter((l) => /^-(- \[[ x]\] |\s+\S)/.test(l))
      .map((l) => l.slice(1))
      .join("\n");
    return bullets(removed, docDirs).filter((b) => b.version === version);
  }

  async function board() {
    const idx = bullets(reader.text(dirs.index), docDirs);
    const st = reader.json(".drwil/state.json");
    const active = st && st.activity !== "SCOPING" ? ((st.active_brief as string | undefined) ?? null) : null;
    const lot = reader.json(".drwil/lot.json");
    const fiches = await reader.briefs();
    const versionOf = (path: string) => idx.find((b) => b.paths.includes(path));
    const intentOf = (path: string) => /^\*\*(?:Intention|Intent)\*\*\s*:\s*`([^`]+)`/m.exec(reader.text(path))?.[1];
    const covered = new Set(fiches.map((f) => intentOf(f.path as string)));
    if (active) covered.add(intentOf(active));
    const { prs, forge: name, missing, cli } = await forge.prs();
    const tg = await tags(reader);
    const last = tg[0];
    const journal = reader.text(journalPath);
    const mainJournal = await reader.git("show", `origin/HEAD:${journalPath}`);
    const prOf = (path: string) => prs.find((p) => p.branch === branchOf(path));
    const intentPath = (file: string) => `${dirs.intentions}/${file}`;

    const cols = {
      notes: reader
        .notes()
        .map((n, i) => ({
          id: `note-${i}`,
          title: n.replace(/^\d{4}-\d{2}-\d{2} — /, ""),
          date: /^(\d{4}-\d{2}-\d{2})/.exec(n)?.[1] ?? null,
        }))
        .reverse(),
      intentions: reader
        .intentions()
        .filter((i) => !i.done && !covered.has(intentPath(i.file as string)))
        .map((i) => {
          const b = versionOf(intentPath(i.file as string));
          const questions = (i.questions as string[]).length;
          return {
            id: intentPath(i.file as string),
            title: i.title,
            marks: i.marks,
            theme: i.theme,
            version: b?.version ?? null,
            order: b?.order ?? null,
            questions,
          };
        }),
      fiches: fiches
        .filter((f) => f.path !== active)
        .map((f) => {
          const b = versionOf(f.path as string);
          return {
            id: f.path,
            title: f.title,
            priority: f.priority,
            ready: f.ready,
            maturity: f.maturity,
            decisions: f.decisions,
            version: b?.version ?? null,
            order: b?.order ?? null,
          };
        }),
      chantier: active
        ? [
            {
              id: active,
              title: (/^# (.*)$/m.exec(reader.text(active))?.[1] ?? active).replace(/^(?:Projet|Project)\s*:\s*/, ""),
              activity: st?.activity,
              lot: lot && lot.brief === active ? { current: lot.current, done: lot.done } : null,
              reopened: (st?.reopened as { pr?: unknown } | undefined)?.pr ?? null,
              autoMerge: st?.auto_merge === true,
              number: prOf(active)?.number ?? null,
              version: versionOf(active)?.version ?? null,
            },
          ]
        : [],
      prs: prs
        .filter((p) => p.state === "open" && !(active && p.branch === branchOf(active)))
        .map((p) => ({ ...asCard(p, p.createdAt), branch: p.branch })),
      fusionnees: prs
        .filter((p): p is Pr & { mergedAt: string } => !!p.mergedAt && (!last || p.mergedAt > last.date))
        .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
        .map((p) => asCard(p, p.mergedAt)),
      publiees: tg.slice(0, PUBLISHED_SHOWN).map((t, i) => {
        const inRelease = prs.filter((p) => p.mergedAt && p.mergedAt <= t.date && (!tg[i + 1] || p.mergedAt > tg[i + 1].date));
        const code = inRelease.filter((p) => natureOf(p.paths) === "code").length;
        return { id: t.tag, title: t.tag, date: short(t.date), code, doc: inRelease.length - code };
      }),
    };

    type Item = { path: string; title: string; order: number | null; removed: boolean };
    const versions = new Map<string, Map<string, Item>>();
    const item = (version: string) => {
      if (!versions.has(version)) versions.set(version, new Map());
      return versions.get(version) as Map<string, Item>;
    };
    for (const b of idx)
      if (b.version && !b.done)
        for (const path of b.paths.slice(0, 1)) item(b.version).set(path, { path, title: b.title, order: b.order, removed: false });
    for (const [version, items] of versions)
      for (const b of await pastTargets(version, last?.date ?? "1970-01-01"))
        for (const path of b.paths.slice(0, 1))
          if (!items.has(path)) items.set(path, { path, title: b.title, order: b.order, removed: true });

    function stage(path: string): { stage: string; number: number | null } {
      if (path === active) return { stage: "chantier", number: prOf(path)?.number ?? null };
      const pr = path.startsWith(`${dirs.projects}/`) ? prOf(path) : undefined;
      const mark = `workstream/${stem(path)}`;
      if (pr?.mergedAt) return { stage: "fusionnee", number: pr.number };
      if (mainJournal.includes(mark)) return { stage: "fusionnee", number: null };
      if (pr?.state === "open") return { stage: "pr", number: pr.number };
      if (journal.includes(mark)) return { stage: "pr", number: null };
      if (fiches.some((f) => f.path === path)) return { stage: "fiche", number: null };
      return { stage: path.startsWith(`${dirs.intentions}/`) && reader.text(path) ? "intention" : "autre", number: null };
    }
    const targets = [...versions.entries()]
      .map(([version, m]) => {
        // Un document de référence encore présent n'est pas un élément de version.
        const items = [...m.values()]
          .map((it) => ({ ...it, ...stage(it.path) }))
          .filter((it) => !(it.stage === "autre" && reader.text(it.path)))
          .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        return { version, items, done: items.filter((i) => i.stage === "fusionnee").length, total: items.length };
      })
      .sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
    return { forge: name, cli, missing, cols, targets, lastRelease: last?.tag ?? null };
  }

  return board;
}

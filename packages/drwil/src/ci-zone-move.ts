// Zones du projet du fichier de CI et placement de ce qui n'est pas du kit (QUA-283). `init` réécrit la partie du kit,
// balisée ou non, et replace dans la zone `jobs` (et `stages` sur GitLab, clé unique) chaque job et stage qui n'est pas
// du gabarit : rien du projet n'est perdu. Une clé que le projet et le gabarit définissent tous deux avec un contenu
// différent, ou une clé du projet sans place dans une zone, laisse le fichier tel quel (D-f) : fusionner deux YAML
// pourrait affaiblir une garde du kit sans que rien ne le dise. Sans balises, un job du kit qui diffère du gabarit est du
// kit s'il est identique à celui d'une version livrée (empreintes ci-dessous) aux étapes près que le projet y a ajoutées,
// replacées dans la zone `steps` ; une étape qu'on ne peut établir laisse le fichier tel quel, nommée (D-c étendue).
import { createHash } from "node:crypto";

export type Forge = "github" | "gitlab";

/** Zones: `steps` (end of the kit's `checks` job), `jobs` (among the jobs), `stages` (GitLab only, optional: older kits had none). */
const ZONES = ["steps", "jobs", "stages"] as const;
const REQUIRED = ["steps", "jobs"];
const marker = (kind: "begin" | "end", zone: string) => new RegExp(`^\\s*# drwil-project-${kind} ${zone}\\s*$`);
const ANY_MARKER = /^\s*# drwil-project-(begin|end) \w+\s*$/;
const lines = (text: string): string[] => text.split(/\r?\n/);

/** Lines inside each zone, or null when a required zone is missing or its markers are not in order. */
export function zonesOf(text: string): Record<string, string[]> | null {
  const all = lines(text);
  const out: Record<string, string[]> = {};
  for (const zone of ZONES) {
    const from = all.findIndex((l) => marker("begin", zone).test(l));
    const to = all.findIndex((l) => marker("end", zone).test(l));
    if (from >= 0 && to > from) out[zone] = all.slice(from + 1, to);
    else if (REQUIRED.includes(zone)) return null;
  }
  return out;
}

/** The file without its zones (markers and content): what is the kit's, or the project's left outside. */
function outsideOf(text: string): string[] {
  const [out, marked] = [[] as string[], zonesOf(text) !== null];
  let inZone = false;
  for (const l of lines(text)) {
    if (ANY_MARKER.test(l)) inZone = marked && /begin/.test(l);
    else if (!inZone) out.push(l);
  }
  return out;
}

interface Block {
  key: string;
  lines: string[];
}
const isComment = (l: string) => /^\s*#/.test(l);
const keyAt = (indent: number) => new RegExp(`^ {${indent}}([^\\s#-][^:]*?):(?:\\s|$)`);

/** Blocks keyed at `indent`: a key, its comments just above and its lines up to the next key. */
function blocksAt(all: string[], indent: number): Block[] {
  const head: string[] = [];
  const out: Block[] = [];
  for (const l of all) {
    const key = keyAt(indent).exec(l)?.[1];
    const prev = out.at(-1)?.lines ?? head;
    if (key === undefined) {
      prev.push(l);
      continue;
    }
    let n = prev.length;
    while (n > 0 && isComment(prev[n - 1])) n--;
    out.push({ key: key.trim(), lines: [...prev.splice(n), l] });
  }
  return out;
}

/** GitLab: every top-level key is movable (jobs, hidden jobs, global keys the kit has not). GitHub: the jobs; its other keys are not. */
function unitsOf(forge: Forge, all: string[]): { movable: Block[]; fixed: Block[] } {
  const top = blocksAt(all, 0);
  if (forge === "gitlab") return { movable: top, fixed: [] };
  const jobs = top.find((b) => b.key === "jobs");
  const body = jobs ? jobs.lines.slice(jobs.lines.findIndex((l) => keyAt(0).test(l)) + 1) : [];
  return { movable: blocksAt(body, 2), fixed: top.filter((b) => b.key !== "jobs") };
}

const meaning = (b: Block | undefined) =>
  (b?.lines ?? [])
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() && !isComment(l))
    .join("\n");
const trimBlank = (ls: string[]) => {
  let [a, b] = [0, ls.length];
  while (a < b && !ls[a].trim()) a++;
  while (b > a && !ls[b - 1].trim()) b--;
  return ls.slice(a, b);
};
const stagesOf = (b: Block | undefined): string[] => {
  const text = (b?.lines ?? []).filter((l) => !isComment(l)).join("\n");
  const flow = /^stages:\s*\[([^\]]*)\]/m.exec(text)?.[1];
  const items = flow !== undefined ? flow.split(",") : [...text.matchAll(/^\s+-\s*(.+?)\s*$/gm)].map((m) => m[1]);
  return items.map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
};

/** A job's own lines and the items of its `steps` (GitHub) or `script` (GitLab) list, each with the comments just above it. */
function itemsOf(forge: Forge, b: Block): { rest: string[]; items: string[][] } {
  const at = forge === "github" ? 6 : 4;
  const head = new RegExp(`^ {${at - 2}}${forge === "github" ? "steps" : "script"}:\\s*$`);
  const [rest, items, pending] = [[] as string[], [] as string[][], [] as string[]];
  let inList = false;
  for (const l of b.lines) {
    const indent = l.search(/\S/);
    if (!inList) inList = !!rest.push(l) && head.test(l);
    else if (new RegExp(`^ {${at}}- `).test(l)) items.push([...pending.splice(0), l]);
    else if (isComment(l) && indent >= at) pending.push(l);
    else if ((indent < 0 || indent > at) && items.length) items[items.length - 1].push(l);
    else [inList] = [false, rest.push(...pending.splice(0), l)];
  }
  return { rest: [...rest, ...pending], items };
}
const sha = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 12);
const print = (ls: string[]) => sha(meaning({ key: "", lines: ls }));
const label = (item: string[]) => {
  const text = item.filter((l) => !isComment(l)).join("\n");
  return (/\bname:\s*(.+)/.exec(text) ?? /\buses:\s*(.+)/.exec(text) ?? /^\s*-\s*(?:run:\s*)?(.+)/.exec(text))?.[1].trim();
};

/** The steps `b` adds to a shipped version of its kit job (or to the template's `current`), or the steps that cannot be established. */
function kitSteps(forge: Forge, shipped: string[], b: Block, current?: Block): { extra: string[][] | null; unsure: string[] } {
  const { rest, items } = itemsOf(forge, b);
  const versions = shipped.map((e) => e.split(" ")).filter(([k]) => k === b.key);
  if (current) versions.push([b.key, print(itemsOf(forge, current).rest), ...itemsOf(forge, current).items.map(print)]);
  // The version that explains the most steps: an older one, with fewer steps, would take the newer kit steps for the project's.
  let best: string[][] | null = null;
  for (const [, own, ...steps] of versions) {
    let i = 0;
    const extra = items.filter((it) => (steps[i] === print(it) ? !++i : true));
    if (own === print(rest) && i === steps.length && extra.length < (best?.length ?? Number.POSITIVE_INFINITY)) best = extra;
  }
  if (best) return { extra: best, unsure: [] };
  const known = new Set(versions.flat());
  return { extra: null, unsure: items.filter((it) => !known.has(print(it))).map((it) => `${label(it)}`) };
}

/** Prints (`key own step step…`: 12 hex digits of SHA-256 over the meaningful lines) of every key of a shipped CI file. */
export const shippedPrints = (forge: Forge, text: string): string[] =>
  [...unitsOf(forge, lines(text)).movable, ...unitsOf(forge, lines(text)).fixed].flatMap((b) =>
    b.key === "stages"
      ? stagesOf(b).map((s) => `stage ${s}`)
      : [b.key, print(itemsOf(forge, b).rest), ...itemsOf(forge, b).items.map(print)].join(" "),
  );

export interface Placed {
  /** The template, its zones filled with the project's; null when a conflict leaves the file as it is. */
  content: string | null;
  moved: string[];
  conflicts: string[];
}

/** What `init` writes over an existing CI file: the kit's part from the template, the project's in its zones; `shipped`: prints of the kit's old files. */
export function placeProject(forge: Forge, template: string, existing: string, shipped: string[] = []): Placed {
  const zones = zonesOf(existing);
  const kit = unitsOf(forge, outsideOf(template));
  const mine = unitsOf(forge, outsideOf(existing));
  const kitBlock = (key: string) => [...kit.movable, ...kit.fixed].find((b) => b.key === key);
  const conflicts = new Set<string>();
  const moved: Block[] = [];
  const stages: string[] = [];
  const steps: string[][] = [];
  // Unmarked, a key of the template that differs from it is the kit's when a shipped version of it matches, the steps
  // the project added to `checks` aside; anything else stays the project's, named (D-f).
  const judge = (b: Block) => {
    if (zones || meaning(kitBlock(b.key)) === meaning(b)) return;
    const { extra, unsure } = kitSteps(forge, shipped, b, kitBlock(b.key));
    if (!extra || (extra.length && b.key !== "checks")) conflicts.add(unsure.length ? `${b.key} (${unsure.join(", ")})` : b.key);
    else steps.push(...extra);
  };
  // In the zone, a key the template has too would be defined twice.
  for (const b of zones ? blocksAt(zones.jobs, forge === "gitlab" ? 0 : 2) : []) if (kitBlock(b.key)) conflicts.add(b.key);
  // Outside a marked file, the template's keys are the kit's; in an unmarked one, they are the project's until proven equal.
  for (const b of mine.fixed) kitBlock(b.key) ? judge(b) : conflicts.add(b.key);
  for (const b of mine.movable) {
    if (forge === "gitlab" && b.key === "stages") {
      const old = shipped.filter((e) => e.startsWith("stage ")).map((e) => e.slice(6));
      const known = [...stagesOf(kitBlock("stages")), ...stagesOf({ key: "", lines: zones?.stages ?? [] }), ...old];
      stages.push(...stagesOf(b).filter((s, i, all) => !known.includes(s) && all.indexOf(s) === i));
    } else if (kitBlock(b.key)) judge(b);
    // A job a shipped version had and the template no longer has (renamed) is the kit's, dropped.
    else if (kitSteps(forge, shipped, b).extra?.length !== 0) moved.push(b);
  }
  const names = [...moved.map((b) => b.key), ...stages.map((s) => `stage ${s}`), ...steps.map((s) => `step ${label(s)}`)];
  if (conflicts.size) return { content: null, moved: [], conflicts: [...conflicts] };
  const tplZones = zonesOf(template) ?? {};
  const added: Record<string, string[]> = {
    jobs: moved.flatMap((b) => ["", ...trimBlank(b.lines)]),
    stages: stages.map((s) => `  - ${s}`),
    steps: steps.flatMap(trimBlank),
  };
  let result = lines(template);
  for (const zone of ZONES) {
    const from = result.findIndex((l) => marker("begin", zone).test(l));
    const to = result.findIndex((l) => marker("end", zone).test(l));
    if (from < 0 || to < from) continue;
    const content = [...(zones?.[zone] ?? tplZones[zone] ?? []), ...(added[zone] ?? [])];
    result = [...result.slice(0, from + 1), ...content, ...result.slice(to)];
  }
  return { content: result.join(/\r\n/.test(existing) ? "\r\n" : "\n"), moved: names, conflicts: [] };
}

// Historique d'un projet pour `drwil serve`. Journal d'événements : un fichier par projet, dans le cache de l'utilisateur
// (QUA-274). Consommation par chantier (`.drwil/usage.jsonl`) : les champs retenus sont une liste fermée, une colonne ajoutée
// au fichier n'atteint jamais l'API (QUA-271) ; sa répartition par outil ne sort que le nom de l'outil et ses totaux (QUA-304),
// sa répartition par activité que ses quatre parts nommées et leurs totaux (QUA-308).
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KEPT_EVENTS = 5000;
const LISTED_EVENTS = 1000;
export interface JournalEvent {
  at: string;
  kind: string;
  key: string;
  text: string;
  brief?: string | null;
  [field: string]: unknown;
}

function readLines(file: string): JournalEvent[] {
  try {
    return readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line) => {
        try {
          const e = JSON.parse(line) as JournalEvent;
          return e && typeof e.key === "string" ? [e] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

/**
 * Journal d'un projet. Tout ce qui s'y écrit est déjà masqué (`mask`) : le fichier non plus ne porte personne.
 * Une écriture impossible (cache en lecture seule) laisse le journal en mémoire, jamais une erreur de la vue.
 */
export function openJournal(dir: string, mask: (e: JournalEvent) => JournalEvent) {
  const file = join(dir, "events.jsonl");
  const snapshotFile = join(dir, "state-last.json");
  const write = (action: () => void) => {
    try {
      mkdirSync(dir, { recursive: true });
      action();
    } catch {
      // Voir ci-dessus : le journal reste en mémoire.
    }
  };
  const loaded = readLines(file);
  const events = loaded.slice(-KEPT_EVENTS);
  if (events.length < loaded.length) write(() => writeFileSync(file, `${events.map((e) => JSON.stringify(e)).join("\n")}\n`));
  const keys = new Set(events.map((e) => e.key));
  const empty = events.length === 0;

  function add(event: JournalEvent): void {
    if (keys.has(event.key)) return;
    // Git date en heure locale, la forge en UTC : une seule forme, sinon le tri par texte se trompe.
    const at = new Date(event.at);
    const e = mask({ ...event, at: Number.isNaN(at.getTime()) ? event.at : at.toISOString() });
    keys.add(event.key);
    events.push(e);
    write(() => appendFileSync(file, `${JSON.stringify(e)}\n`));
  }

  function snapshot<T>(): T | null {
    try {
      return JSON.parse(readFileSync(snapshotFile, "utf8")) as T;
    } catch {
      return null;
    }
  }

  return {
    empty,
    add,
    snapshot,
    saveSnapshot: (value: unknown) => write(() => writeFileSync(snapshotFile, JSON.stringify(value))),
    list: () => [...events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, LISTED_EVENTS),
  };
}

export type Journal = ReturnType<typeof openJournal>;

const TOTALS = ["tokens", "output", "cache_read", "requests", "duration_min"] as const;
type Totals = Record<(typeof TOTALS)[number] | "increments", number> & { workstream: string; date: string; model?: unknown };

function usageRows(usage: string): Totals[] {
  return usage
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const row = JSON.parse(line) as Totals;
        // Une ligne sans date reste comptée : seule sa version est inconnue.
        return typeof row.workstream === "string" ? [{ ...row, date: typeof row.date === "string" ? row.date : "" }] : [];
      } catch {
        return [];
      }
    });
}

const SOURCES: Record<string, string> = { "claude-code-logs": "claude-code", "copilot-cli-logs": "copilot-cli" };
// Un nom d'outil est un identifiant court : tout autre texte (un nom de personne écrit à la main) reste « inconnu ».
const TOOL_NAME = /^[a-z][a-z0-9-]{0,31}$/;
type Parts = [string, Record<string, unknown>][];
type Sums = Map<string, Record<string, number> & { tokens: number }>;

/** Parts d'une ligne par outil : `tools` s'il y est, sinon l'outil de sa `source`, sinon « unknown ». */
function toolParts(row: Totals & { tools?: unknown; source?: unknown }): Parts {
  const tools = row.tools && typeof row.tools === "object" && !Array.isArray(row.tools) ? Object.entries(row.tools) : [];
  const parts = tools.filter((p): p is [string, Record<string, unknown>] => !!p[1] && typeof p[1] === "object");
  if (parts.length) return parts.map(([name, p]) => [TOOL_NAME.test(name) ? name : "unknown", p]);
  return [[(typeof row.source === "string" && SOURCES[row.source]) || "unknown", row]];
}

const ACTIVITIES = ["production", "verification", "governance", "unattributed"];
/** Parts d'une ligne par activité (les quatre, chacune un objet) ; null : non répartie, comptée « non attribuée » (QUA-308). */
function activityParts(row: Totals & { activities?: unknown }): Parts | null {
  const a = (row.activities ?? {}) as Record<string, unknown>;
  return ACTIVITIES.every((k) => a[k] && typeof a[k] === "object") ? ACTIVITIES.map((k) => [k, a[k] as Record<string, unknown>]) : null;
}

/** Ajoute à `sums` (par nom de part) les champs `keys` de chaque part ; une valeur non numérique compte 0. */
function addParts(sums: Sums, parts: Parts, keys: string[]) {
  for (const [name, part] of parts) {
    const t = sums.get(name) ?? { tokens: 0, ...Object.fromEntries(keys.map((k) => [k, 0])) };
    for (const k of keys) t[k] += Number(part[k]) || 0;
    sums.set(name, t);
  }
}

/** Agrège par chantier ; un chantier compte pour la première version publiée à sa date ou après (`tagLines` : tag, date). */
export function summarizeUsage(usage: string, tagLines: string) {
  const byName = new Map<string, Totals & { models: Set<string>; tools: Sums; activities: Sums }>();
  for (const r of usageRows(usage)) {
    const w = byName.get(r.workstream) ?? {
      ...(Object.fromEntries(TOTALS.map((k) => [k, 0])) as Record<(typeof TOTALS)[number], number>),
      workstream: r.workstream,
      date: r.date,
      increments: 0,
      models: new Set<string>(),
      tools: new Map(),
      activities: new Map(),
    };
    for (const key of TOTALS) w[key] += Number(r[key]) || 0;
    addParts(w.tools, toolParts(r), ["tokens", "output", "cache_read", "requests"]);
    addParts(w.activities, activityParts(r) ?? [["unattributed", r]], ["tokens", "requests"]);
    if (typeof r.model === "string" && r.model) w.models.add(r.model);
    if (r.date > w.date) w.date = r.date;
    w.increments++;
    byName.set(r.workstream, w);
  }
  const tags = tagLines.split("\n").flatMap((l) => (l ? [{ tag: l.split("\x1f")[0], date: l.split("\x1f")[1] }] : []));
  // Un chantier est réparti si une de ses lignes l'est : seule une ligne répartie donne la part « production ».
  const workstreams = [...byName.values()].map((w) => ({
    ...w,
    activities: w.activities.has("production") ? Object.fromEntries(ACTIVITIES.map((k) => [k, w.activities.get(k)])) : null,
    models: [...w.models],
    tools: [...w.tools].map(([tool, t]) => ({ tool, ...t })).sort((a, b) => b.tokens - a.tokens || a.tool.localeCompare(b.tool)),
    version: w.date ? (tags.find((t) => t.date >= w.date)?.tag ?? null) : null,
  }));
  return { workstreams: workstreams.sort((a, b) => b.date.localeCompare(a.date)), tags };
}

// Seuils d'alerte de QUA-198 : un indicateur, jamais bloquant (réévalué au fil des relevés).
const THRESHOLDS = { ci: 235, cache: 212500 };
const TREND_WINDOW = 5;
const HISTORY_SHOWN = 30;
const CI_LINE = /^- \*\*Durée de CI \(job checks\)\*\*\s*:\s*(?:(\d+)\s*m\s*(\d+)|(\d+)\s*s)\b(.*)$/i;
type Reading = { label: string; value: number };

function ciReadings(journal: string): Reading[] {
  let date = "";
  const out: Reading[] = [];
  for (const line of journal.split(/\r?\n/)) {
    const day = /^## (\d{4}-\d{2}-\d{2})/.exec(line);
    const m = CI_LINE.exec(line);
    if (day) date = day[1];
    else if (m && /hooks inchangés|hooks unchanged/i.test(m[4]))
      out.push({ label: date, value: m[3] ? Number(m[3]) : Number(m[1]) * 60 + Number(m[2]) });
  }
  return out;
}

function trend(readings: Reading[], threshold: number) {
  const points = readings.slice(-TREND_WINDOW);
  if (!points.length) return null;
  const mean = Math.round(points.reduce((sum, p) => sum + p.value, 0) / points.length);
  return { points, mean, threshold, alert: mean > threshold, history: readings.slice(-HISTORY_SHOWN) };
}

/** Mesures de la CI et du contexte, avec la tendance et le seuil de chacune ; null : aucun relevé. */
export function measures(usage: string, journal: string) {
  const cache = usageRows(usage)
    .filter((r) => r.requests > 0 && r.cache_read > 0)
    .map((r) => ({ label: r.workstream, value: Math.round(r.cache_read / r.requests) }));
  return { ci: trend(ciReadings(journal), THRESHOLDS.ci), cache: trend(cache, THRESHOLDS.cache) };
}

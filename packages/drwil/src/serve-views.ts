// Vues documentaires de `drwil serve` : index, fiches, contrats, catalogue, audits, consommation et mesures.
// Lecture seule et tolérante : une source absente donne une vue vide qui le dit (QUA-275).
import { fill } from "./i18n.js";
import { measures } from "./serve-journal.js";
import type { Reader } from "./serve-read.js";
import type { ServeText } from "./serve-texts.js";

const ID = "(?:[a-z][\\w-]*:)?[A-Z]{2,6}-\\d{2,4}";
const HEADING = new RegExp(`^## (${ID})(?: — (.*))?$`);
const ROW_ID = new RegExp(`^${ID}$`);
const SEPARATOR = /^:?-+:?$/;
const FIRST_LINES = 15;
const STATUS = /^\*{0,2}(?:Statut|Status)\*{0,2}[^:]*:\s*(.*)$/i;
const CHECKBOX = /^\s*-\s*\[([ xX])\]\s*(.*)$/;
const MODEL_FILE = /^(?:modele|model)-/;
const MD_FILE = /^[\w.-]+\.md$/;
const AUDIT_ENTRY = /^([^:]{2,40}?)\s*:\s*(.*)$/;
const STALE_AFTER_DAYS = 30;
const DAY_MS = 86_400_000;
// Le texte libre d'une valeur échappe au filtre des réponses : la clé qui annonce une personne écarte la ligne (QUA-271).
const NOMINATIVE_ENTRY = /^(?:auteure?|author|auditeur|auditrice|auditor|responsable|owner|par|by)\b/i;
const AUDITS = [
  { fr: "docs/audit-risques.md", en: "docs/audit-risks.md" },
  { fr: "docs/decouverte-valeur.md", en: "docs/value-discovery.md" },
] as const;

export type Contract = { id: string; title: string; fields: Record<string, string>; raw: string };

function tableCells(line: string): string[] | null {
  const trimmed = line.trim();
  return /^\|.*\|$/.test(trimmed)
    ? trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim())
    : null;
}

const ruleOf = (c: Contract): string => c.fields.Règle ?? c.fields.Rule ?? c.title;

/** Les deux formes d'un registre que reconnaît le contrôle de la doc : titre `## ID — …` ou ligne de tableau. */
export function parseContracts(text: string): Contract[] {
  const out: Contract[] = [];
  let cur: Contract | null = null;
  let columns: string[] = [];
  for (const line of text.split("\n")) {
    const head = HEADING.exec(line);
    const row = cur ? null : tableCells(line);
    if (head) {
      cur = { id: head[1], title: head[2] ?? "", fields: {}, raw: "" };
      out.push(cur);
    } else if (row && ROW_ID.test(row[0])) {
      const fields = Object.fromEntries(row.slice(1).map((cell, i) => [columns[i + 1] ?? String(i + 1), cell]));
      out.push({ id: row[0], title: row[1] ?? "", fields, raw: line });
    } else if (row) {
      if (!row.every((c) => SEPARATOR.test(c))) columns = row;
    } else if (/^#{1,2} /.test(line)) cur = null;
    else if (cur) {
      cur.raw += `${line}\n`;
      const field = /^\*\*([^*]+)\*\*\s*:\s*(.*)$/.exec(line);
      if (field) cur.fields[field[1]] = field[2];
    }
  }
  for (const c of out) c.title ||= ruleOf(c);
  return out;
}

const statusOf = (body: string): string | null =>
  body
    .split(/\r?\n/)
    .slice(0, FIRST_LINES)
    .map((l) => STATUS.exec(l)?.[1]?.trim())
    .find((s) => s !== undefined) ?? null;

/** Les cases de l'index, telles qu'écrites ; une ligne en retrait continue la case précédente. */
function indexLines(text: string): { done: boolean; text: string }[] {
  const out: { done: boolean; text: string }[] = [];
  let open = false;
  for (const line of text.split(/\r?\n/)) {
    const box = CHECKBOX.exec(line);
    if (box) out.push({ done: box[1] !== " ", text: box[2] });
    else if (open && /^\s+\S/.test(line)) out[out.length - 1].text += ` ${line.trim()}`;
    open = box !== null || (open && /^\s+\S/.test(line));
  }
  return out;
}

/** Les fichiers du dossier des fiches qui ne sont pas des chantiers cadrés (journal, mécanique du kit…). */
function otherDocs(reader: Reader, scoped: Set<unknown>) {
  const { projects, index } = reader.dirs;
  return reader
    .list(projects)
    .filter((f) => MD_FILE.test(f) && !MODEL_FILE.test(f))
    .map((f) => `${projects}/${f}`)
    .filter((path) => path !== index && !scoped.has(path))
    .sort()
    .map((path) => {
      const body = reader.text(path);
      return { path, title: /^# (.*)$/m.exec(body)?.[1] ?? path, status: statusOf(body) };
    });
}

/** Le bloc de citation en tête d'un rapport d'audit (« > Clé : valeur »), et son âge s'il est périmé. */
export function parseAudit(body: string, now = Date.now()) {
  const lines = body.split(/\r?\n/);
  const title = (lines.find((l) => l.startsWith("# ")) ?? "").replace(/^#\s*/, "");
  const start = lines.findIndex((l) => l.startsWith(">"));
  const block: string[] = [];
  for (let i = start; start !== -1 && i < lines.length && lines[i].startsWith(">"); i++) block.push(lines[i].replace(/^>\s?/, ""));
  const entries: { key: string; value: string }[] = [];
  for (const line of block) {
    const m = AUDIT_ENTRY.exec(line);
    if (m) entries.push({ key: m[1].trim(), value: m[2].trim() });
    else if (entries.length) entries[entries.length - 1].value += ` ${line.trim()}`;
  }
  const date = entries.find((e) => /^(?:dernier scan|last scan)/i.test(e.key))?.value.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  const age = date ? Math.floor((now - new Date(date).getTime()) / DAY_MS) : NaN;
  return { title, entries: entries.filter((e) => !NOMINATIVE_ENTRY.test(e.key)), staleDays: age >= STALE_AFTER_DAYS ? age : null };
}

/** Les routes des vues documentaires ; toute réponse passe ensuite par le filtre du serveur (QUA-271). */
export function projectViews(reader: Reader, lang: "fr" | "en", T: ServeText): Record<string, () => unknown> {
  const { dirs } = reader;
  return {
    "/api/docs": async () => {
      const briefs: Record<string, unknown>[] = (await reader.briefs()).map((b) => ({
        ...b,
        status: statusOf(reader.text(String(b.path))),
      }));
      return {
        state: await reader.state(),
        briefs,
        others: otherDocs(reader, new Set(briefs.map((b) => b.path))),
        index: indexLines(reader.text(dirs.index)),
        intentions: reader.intentions(),
        notes: reader.notes(),
      };
    },
    "/api/contracts": async () => {
      const view = await reader.contracts();
      const head = (await reader.git("rev-parse", "--short=7", "HEAD")).trim();
      const catalog = parseContracts(reader.text(dirs.catalog)).map((c) => ({ id: c.id, rule: ruleOf(c) }));
      return { ...view, head, catalog, missing: view.verify ? null : T.noEvidence };
    },
    "/api/usage": async () => {
      const view = await reader.usage();
      return { ...view, missing: view.workstreams.length ? null : T.noUsage };
    },
    "/api/measures": () => {
      const view = measures(reader.text(".drwil/usage.jsonl"), reader.text(`${dirs.projects}/journal.md`));
      return { ...view, missing: view.ci || view.cache ? null : T.noMeasures };
    },
    "/api/audits": () => {
      const paths = AUDITS.map((a) => a[lang]);
      const present = paths.filter((path) => reader.text(path));
      const absent = paths.filter((path) => !present.includes(path));
      return {
        audits: present.map((path) => ({ path, ...parseAudit(reader.text(path)) })),
        missing: absent.length ? absent.map((path) => fill(T.noAudit, path)).join(" ") : null,
      };
    },
  };
}

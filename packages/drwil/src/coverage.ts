// Coverage of a contract (QUA-081): the files its `**Covers**` patterns match, each with a fingerprint of
// its content. An attestation (version 3) records them; when a file under a pattern is modified, added,
// removed or renamed, the attestation is stale and `drwil verify` names the file.
// Reads the files themselves, never git: the same fingerprint locally and in CI. The order of the
// paths and the line endings change nothing.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fill, type MessageLang } from "./i18n.js";

/** Path (always with `/`) → fingerprint of the file's content. */
export type Coverage = Record<string, string>;

export interface CoverageChange {
  kind: "modified" | "added" | "removed" | "renamed";
  path: string;
  /** Renamed: the former path. */
  from?: string;
}

const SKIPPED = new Set([".git", "node_modules"]);
const GLOB = /[*?]/;
// A contract that judges a conduct, not files, declares `aucun` (or `none`) with its reason: declared, so doctor does not flag it (QUA-185).
const NO_COVERAGE = /^(aucun|none)$/i;

// `*` and `?` stay in a folder, `**` crosses folders (followed by a slash it also matches no folder), a trailing slash is the whole folder.
function toRegExp(pattern: string): RegExp {
  const p = pattern.replace(/^\.\//, "");
  const src = (p.endsWith("/") ? `${p}**` : p)
    .split(/(\*\*\/|\*\*|\*|\?)/)
    .map((part) => {
      if (part === "**/") return "(?:.*/)?";
      if (part === "**") return ".*";
      if (part === "*") return "[^/]*";
      if (part === "?") return "[^/]";
      return part.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${src}$`);
}

/** Files under `dir` (relative to `root`), `.git` and `node_modules` excluded. */
function walk(root: string, dir: string): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [dir];
  return readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    if (SKIPPED.has(e.name)) return [];
    const rel = dir ? `${dir}/${e.name}` : e.name;
    return e.isDirectory() ? walk(root, rel) : [rel];
  });
}

const contentHash = (file: string) => createHash("sha256").update(readFileSync(file, "utf8").replace(/\r\n/g, "\n")).digest("hex");

/** Files matched by the patterns and the fingerprint of each one, in path order. */
export function coverageOf(root: string, patterns: string[] | null | undefined): Coverage {
  const matched = new Set<string>();
  for (const pattern of patterns ?? []) {
    if (NO_COVERAGE.test(pattern)) continue;
    const clean = pattern.replace(/^\.\//, "");
    const literal = clean
      .split("/")
      .filter(Boolean)
      .filter((_, i, all) => !all.slice(0, i + 1).some((s) => GLOB.test(s)));
    const re = toRegExp(clean);
    // A literal folder (no glob, no trailing slash) is the whole folder.
    const folder = !GLOB.test(clean) && existsSync(join(root, clean)) && statSync(join(root, clean)).isDirectory();
    const asFolder = folder ? toRegExp(`${clean}/`) : null;
    for (const f of walk(root, literal.join("/"))) if (re.test(f) || asFolder?.test(f)) matched.add(f);
  }
  return Object.fromEntries([...matched].sort().map((f) => [f, contentHash(join(root, f))]));
}

/** What changed between the coverage an attestation recorded and the current one. */
export function coverageChanges(before: Coverage, now: Coverage): CoverageChange[] {
  const changes: CoverageChange[] = [];
  const removed = Object.keys(before).filter((p) => !(p in now));
  const added = Object.keys(now).filter((p) => !(p in before));
  for (const p of Object.keys(before)) if (p in now && before[p] !== now[p]) changes.push({ kind: "modified", path: p });
  for (const from of removed) {
    const to = added.find((p) => now[p] === before[from] && !changes.some((c) => c.path === p));
    if (to) changes.push({ kind: "renamed", path: to, from });
    else changes.push({ kind: "removed", path: from });
  }
  for (const p of added) if (!changes.some((c) => c.path === p)) changes.push({ kind: "added", path: p });
  return changes;
}

const TEXTS = {
  fr: {
    modified: "fichier couvert modifié : {0}",
    added: "fichier couvert ajouté : {0}",
    removed: "fichier couvert supprimé : {0}",
    renamed: "fichier couvert renommé : {0} → {1}",
    noCovers:
      "aucune couverture déclarée (champ Couvre) : son attestation ne tombera pas si le code jugé change — déclarer les chemins qu'elle juge",
  },
  en: {
    modified: "covered file modified: {0}",
    added: "covered file added: {0}",
    removed: "covered file removed: {0}",
    renamed: "covered file renamed: {0} → {1}",
    noCovers:
      "no coverage declared (Covers field): its attestation will not fall if the code it judged changes — declare the paths it judges",
  },
};

export function describeChange(c: CoverageChange, lang: MessageLang): string {
  const T = TEXTS[lang];
  return c.kind === "renamed" ? fill(T.renamed, c.from, c.path) : fill(T[c.kind], c.path);
}

export const noCoversMessage = (lang: MessageLang) => TEXTS[lang].noCovers;

/** One line per file that changed since `before` was recorded. */
export const changeLines = (before: Coverage | undefined, now: Coverage, lang: MessageLang) =>
  coverageChanges(before ?? {}, now).map((c) => describeChange(c, lang));

/** A contract with a human part and no `**Covers**`: its attestation keeps its validity, but nothing makes it fall (QUA-082). */
export const lacksCoverage = (k: { form?: string; covers?: string[] | null; manual?: string | null; checks?: string[] | null }) =>
  k.form === "section" && !k.covers && Boolean(k.manual || k.checks === null);

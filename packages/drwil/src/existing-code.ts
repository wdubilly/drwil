import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, posix } from "node:path";
import { pathToFileURL } from "node:url";
import { fill, type MessageLang } from "./i18n.js";
import { TEXTS } from "./existing-code-texts.js";
import { readManifest, sha256, writeManifest } from "./manifest.js";

/** Name of the reference brief `init` writes for the code indexed before the kit (QUA-110). */
export const EXISTING_CODE_BRIEF = "existing-code.md";

/** What `init` attaches: the indexed code files outside any brief and outside the kit, and their folders. */
export interface ExistingCode {
  /** Scope entries, one per file (a blank in a path becomes `?`, the grammar allowing none). */
  entries: string[];
  /** Folders the map must cite, as the map check computes them (two levels). */
  folders: string[];
  /** Files no scope entry can name without a too broad pattern. */
  unlisted: string[];
}

/** The keys of `.drwil/ia-first.json` read here; the rest goes untouched to the scope grammar. */
export type ProjectConfig = {
  dirs?: { projects?: string };
  architectureMap?: { file?: string };
  docLang?: unknown;
  [key: string]: unknown;
};

type Scope = {
  isCode: (p: string, cfg: object) => boolean;
  tooBroad: (p: string) => boolean;
  patternsByBrief: (texts: [string, string][], cfg: object) => Map<string, string[]>;
  briefsCovering: (p: string, byBrief: Map<string, string[]>) => string[];
};

function indexed(root: string): string[] {
  try {
    return execFileSync("git", ["ls-files", "-z"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .split("\0")
      .filter(Boolean);
  } catch {
    return []; // no repository, or git missing: nothing indexed.
  }
}

function briefTexts(root: string, projects: string): [string, string][] {
  const dir = join(root, projects);
  if (!existsSync(dir)) return [];
  return (readdirSync(dir, { recursive: true }) as string[])
    .map((f) => String(f).replace(/\\/g, "/"))
    .filter((f) => f.endsWith(".md") && !/^(modele|model)-/.test(basename(f)))
    .map((f) => [posix.join(projects, f), readFileSync(join(dir, f), "utf8")]);
}

/**
 * Judged by the scope grammar installed in the project (never the package's copy), with the setting
 * `init` just wrote: the brief covers exactly what the commit check requires (QUA-110).
 */
export async function findExistingCode(root: string, cfg: ProjectConfig): Promise<ExistingCode> {
  const none: ExistingCode = { entries: [], folders: [], unlisted: [] };
  const grammar = join(root, ".githooks", "scope.mjs");
  if (!existsSync(grammar)) return none;
  const scope: Scope = await import(pathToFileURL(grammar).href);
  const byBrief = scope.patternsByBrief(briefTexts(root, cfg.dirs?.projects ?? "docs/projects"), cfg);
  const kit = readManifest(root);
  const files = indexed(root).filter((f) => scope.isCode(f, cfg) && !(f in kit) && !scope.briefsCovering(f, byBrief).length);
  const result: ExistingCode = { entries: [], folders: [], unlisted: [] };
  const folders = new Set<string>();
  for (const f of files.sort()) {
    const entry = f.replace(/\s/g, "?");
    if (scope.tooBroad(entry)) result.unlisted.push(f);
    else result.entries.push(entry);
    const dir = posix.dirname(f).split("/").slice(0, 2).join("/");
    if (dir !== ".") folders.add(`${dir}/`);
  }
  result.folders = [...folders].sort();
  return result;
}

export function briefContent(entries: string[], lang: MessageLang, date: string): string {
  const T = TEXTS[lang];
  const scope = ["<!-- scope", "files:", ...entries.map((e) => `  - ${e}`), "-->"];
  return [T.title, "", fill(T.status, date), "", ...scope, "", ...T.need, "", ...T.out, "", ...T.handOff, ""].join("\n");
}

export function mapSection(folders: string[], lang: MessageLang, date: string): string {
  const T = TEXTS[lang];
  return ["", T.mapTitle, "", fill(T.mapIntro, date), "", ...folders.map((d) => `- \`${d}\` — ${T.role}`), ""].join("\n");
}

/** Folders the map does not cite yet (with or without their slash, as the map check reads them). */
function uncited(map: string, folders: string[]): string[] {
  return folders.filter((d) => !map.includes(d) && !map.includes(`\`${d.slice(0, -1)}\``));
}

export interface AttachOptions {
  /** The map existed before this `init`: a project file, never rewritten. */
  hadMap: boolean;
  lang: MessageLang;
  log?: (line: string) => void;
}

/**
 * First install of a project that already has indexed code: writes the reference brief « existing
 * code » and cites its folders in the map `init` just wrote (QUA-110). Never on a new project,
 * never over an existing brief or map; the caller never calls it on an update.
 */
export async function attachExistingCode(root: string, cfg: ProjectConfig, opts: AttachOptions): Promise<ExistingCode> {
  const log = opts.log ?? console.log;
  const T = TEXTS[opts.lang];
  const found = await findExistingCode(root, cfg);
  if (!found.entries.length && !found.unlisted.length) return found;
  const date = new Date().toISOString().slice(0, 10);
  const projects = cfg.dirs?.projects ?? "docs/projects";
  const brief = posix.join(projects, EXISTING_CODE_BRIEF);
  if (existsSync(join(root, brief))) log(fill(T.briefKept, brief));
  else if (found.entries.length) {
    await mkdir(dirname(join(root, brief)), { recursive: true });
    await writeFile(join(root, brief), briefContent(found.entries, opts.lang, date));
  }
  const map: string = cfg.architectureMap?.file ?? "docs/architecture.md";
  const mapPath = join(root, map);
  const docLang: MessageLang = cfg.docLang === "fr" || cfg.docLang === "en" ? cfg.docLang : opts.lang;
  const missing = existsSync(mapPath) ? uncited(readFileSync(mapPath, "utf8"), found.folders) : found.folders;
  if (opts.hadMap) {
    if (missing.length) {
      log(fill(T.mapKept, map));
      for (const d of missing) log(`  - ${d}`);
    }
  } else if (missing.length && existsSync(mapPath)) {
    await appendFile(mapPath, mapSection(missing, docLang, date));
    // Written by the kit at this install: its fingerprint follows, so `uninstall` treats it as before.
    if (map in readManifest(root)) await writeManifest(root, { [map]: sha256(readFileSync(mapPath, "utf8")) });
  }
  if (found.entries.length) log(fill(T.attached, found.entries.length, brief, found.folders.length, map));
  if (found.unlisted.length) {
    log(T.unlisted);
    for (const f of found.unlisted) log(`  - ${f}`);
  }
  return found;
}

// Point `upgrade` of `drwil doctor` (QUA-287): what an upgrade removed or left behind, read after the fact.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fill, type MessageLang } from "./i18n.js";
import { TEXTS } from "./doctor-texts.js";
import { readManifest } from "./manifest.js";

const MAX_NAMED = 5;
const named = (files: string[]) => files.slice(0, MAX_NAMED).join(", ") + (files.length > MAX_NAMED ? ", …" : "");

/** The alerts of an equipped project, empty when nothing shows an upgrade lost or left anything. */
export function upgradeTraces(root: string, cfg: Record<string, unknown>, lang: MessageLang): string[] {
  const T = TEXTS[lang];
  const manifest = Object.keys(readManifest(root));
  const traces: string[] = [];
  const missing = manifest.filter((f) => !existsSync(join(root, f)));
  if (missing.length) traces.push(fill(T.upgradeMissing, missing.length, named(missing)));
  const bak = manifest.filter((f) => existsSync(join(root, `${f}.bak`))).map((f) => `${f}.bak`);
  if (bak.length) traces.push(fill(T.upgradeBak, named(bak)));
  if (Array.isArray(cfg.stack) && !cfg.stack.length && Array.isArray(cfg.layers) && cfg.layers.length) traces.push(T.upgradeStack);
  const ciFiles: string[] = Array.isArray(cfg.ciFiles) ? cfg.ciFiles : [];
  for (const f of ciFiles) {
    if (existsSync(join(root, f)) && !readFileSync(join(root, f), "utf8").includes("drwil-project-begin"))
      traces.push(fill(T.upgradeCi, f));
  }
  return traces;
}

// biome-ignore-all lint/suspicious/noExplicitAny: moteur et lecteur de contrats .mjs chargés dynamiquement depuis le projet (comme verify.ts, voir biome.jsonc)
// Loads the engine and the contract reader installed in the project, split from verify.ts (QUA-001).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { TEXTS } from "./verify-texts.js";
import type { Verdict } from "./verify-types.js";

export function globalError(message: string, lang: MessageLang): Verdict {
  return { lang, status: "ERROR", code: 2, contracts: [], errors: [message], unattached: [] };
}

export interface Project {
  lang: MessageLang;
  cfg: Record<string, any>;
  registry: string;
  engine: any;
  contracts: any;
}

/**
 * Loads the engine and the contract reader installed in the project (never the package's ones):
 * verify, doctor and contracts judge what the project's hooks actually run.
 * Returns an error message if the project cannot be used.
 */
export async function loadProject(root: string): Promise<Project | string> {
  const lang = projectLang(root);
  const T = TEXTS[lang];
  const enginePath = join(root, ".githooks", "engine.mjs");
  const contractsPath = join(root, ".githooks", "contracts.mjs");
  if (!existsSync(enginePath) || !existsSync(contractsPath)) return T.noEngine;
  let cfg: Record<string, any>;
  try {
    cfg = JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return T.noConfig;
  }
  const registry: string = cfg.dirs?.contracts ?? "docs/contracts.md";
  if (!existsSync(join(root, registry))) return fill(T.noRegistry, registry);
  const engine = await import(pathToFileURL(enginePath).href);
  const contracts = await import(pathToFileURL(contractsPath).href);
  return { lang, cfg, registry, engine, contracts };
}

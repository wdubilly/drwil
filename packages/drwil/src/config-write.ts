// Writes `.drwil/ia-first.json`, split from config.ts (QUA-001).
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CI_FILES, ciFromConfig, projectName, readConfig, type Resolved, splitCsv } from "./config.js";
import { TEXT } from "./config-text.js";

const KIT_SIZE_CHECK = {
  id: "taille-kit",
  name: "taille des fichiers du kit : un dépassement avertit, il ne bloque pas",
  run: "node .githooks/check-kit-size.mjs",
};

/** The project's checks, plus the kit-size one when the project does not declare it yet (by its id). */
function withKitSize(previous: unknown): unknown[] {
  const checks = Array.isArray(previous) ? previous : [];
  return checks.some((c) => c?.id === KIT_SIZE_CHECK.id) ? checks : [...checks, KIT_SIZE_CHECK];
}

export async function writeConfig(r: Resolved): Promise<void> {
  const previous = readConfig(r.opts.targetDir);
  // Settings entered by the project: kept as they are; those derived from an option (CI files) are
  // only recomputed if the option changed.
  const keep = (key: string, fallback: string[]) => (Array.isArray(previous?.[key]) ? (previous[key] as string[]) : fallback);
  const config = {
    // Project-specific keys, unknown to the kit: never lost.
    ...previous,
    projectName: projectName(r),
    projectShort: r.opts.short ?? projectName(r),
    lang: r.lang,
    layers: r.layers,
    contractPrefixes: splitCsv(r.opts.contractPrefixes ?? "SEC,QUA"),
    tools: r.tools,
    ci: r.ci,
    // An installed project's folders do not move with its language: its briefs live there.
    dirs: previous?.dirs ?? TEXT.dirs,
    stack: r.stack,
    // The project's checks are entered by the user or the AI: a reinstall must not erase them; the kit's
    // own size check is declared once, without any gesture, and a project that removes its id gets it back.
    checks: withKitSize(previous?.checks),
    // Severity of the scope reminder (QUA-016 only): "blocking" | "warning" | "off". Default
    // "blocking"; a value already chosen by the project is never overwritten by a reinstall.
    scopeReminder: typeof previous?.scopeReminder === "string" ? previous.scopeReminder : "blocking",
    // Transitions of the governance state (.githooks/state.mjs): "human" (opening and starting
    // require an interactive terminal) | "agent". Never overwritten.
    transitions: typeof previous?.transitions === "string" ? previous.transitions : "human",
    // Scope gate of the active brief (.githooks/scope-gate.mjs): "off" | "warning" | "blocking".
    // "blocking" for a fresh install; an already installed project keeps its setting, "warning" when
    // it has none: an update never blocks a commit that used to pass. `drwil doctor` shows how to harden.
    scopeGate: typeof previous?.scopeGate === "string" ? previous.scopeGate : previous ? "warning" : "blocking",
    // Requirements added by a kit version later than the install (today: a cited path that only
    // exists as a file ignored by Git): "blocking" for a fresh install, "warning" for an already
    // equipped project that does not have this setting yet — an update never breaks a commit
    // that used to pass. Never overwritten afterwards.
    newRequirements: typeof previous?.newRequirements === "string" ? previous.newRequirements : previous ? "warning" : "blocking",
    layerPrefixes: keep("layerPrefixes", ["app", "tests", "src", "scripts"]),
    codePrefixes: keep("codePrefixes", ["scripts", ".githooks", "e2e"]),
    extraCodeFiles: keep("extraCodeFiles", []),
    extraCodeGlobs: keep("extraCodeGlobs", ["docker-compose*.yml"]),
    ciFiles: previous && ciFromConfig(previous) === r.ci ? keep("ciFiles", CI_FILES[r.ci]) : CI_FILES[r.ci],
    mode: r.mode,
  };
  await mkdir(join(r.opts.targetDir, ".drwil"), { recursive: true });
  await writeFile(join(r.opts.targetDir, ".drwil", "ia-first.json"), JSON.stringify(config, null, 2) + "\n");
}

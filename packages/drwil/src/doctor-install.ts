// Points of `drwil doctor` (DRWIL-010) on the installation itself: configuration, manifest, version, AGENTS.md
// and the entry file of each AI tool declared.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fill, type MessageLang } from "./i18n.js";
import { TEXTS } from "./doctor-texts.js";
import { compareVersions, engineVersion, readInstall } from "./manifest.js";
import type { DiagnosisPoint, PointState } from "./doctor.js";

// Entry file of each AI tool (AGENTS.md is for all of them).
const TOOL_FILES: Record<string, string> = {
  claude: "CLAUDE.md",
  codex: "AGENTS.md",
  cursor: ".cursor/rules/ia-first.mdc",
  gemini: "GEMINI.md",
  copilot: ".github/copilot-instructions.md",
};

/** Points `installation`, `manifest`, `version`, `agents` and `integrations`, in that order. */
export function installPoints(root: string, cfg: Record<string, unknown>, lang: MessageLang): DiagnosisPoint[] {
  const T = TEXTS[lang];
  const points: DiagnosisPoint[] = [];
  const point = (id: string, label: string, state: PointState, detail: string) => points.push({ id, label, state, detail });

  point("installation", T.installation, "ok", ".drwil/ia-first.json");
  const manifest = existsSync(join(root, ".drwil", "installed-files.json"));
  point("manifest", T.manifest, manifest ? "ok" : "warning", manifest ? ".drwil/installed-files.json" : T.noManifest);
  const install = readInstall(root);
  const cli = engineVersion();
  const gap = install ? compareVersions(install.version, cli) : null;
  point(
    "version",
    T.version,
    gap === 0 ? "ok" : "warning",
    !install
      ? T.noInstall
      : gap === 0
        ? install.firstVersion === null
          ? fill(T.unknownOrigin, install.version)
          : fill(T.sameVersion, install.version, install.firstVersion)
        : fill((gap ?? 0) < 0 ? T.olderInstall : T.newerInstall, install.version, cli),
  );
  const agents = existsSync(join(root, "AGENTS.md"));
  point("agents", "AGENTS.md", agents ? "ok" : "problem", agents ? T.present : T.noAgents);

  const tools: string[] = Array.isArray(cfg.tools) ? cfg.tools : [];
  const missing = tools.filter((t) => TOOL_FILES[t] && !existsSync(join(root, TOOL_FILES[t])));
  point(
    "integrations",
    T.integrations,
    missing.length ? "problem" : "ok",
    `${tools.length - missing.length}/${tools.length}${missing.length ? fill(T.missing, missing.map((t) => TOOL_FILES[t]).join(", ")) : ""}`,
  );
  return points;
}

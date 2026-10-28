// Niveau de protection d'un projet : lu par `drwil doctor` et par `drwil verify`, un seul calcul.
// Chaque niveau est prouvé par une vérification, jamais par une déclaration ; un niveau qu'on n'a pas
// pu vérifier est « non vérifié », jamais atteint (QUA-013).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fill, type MessageLang } from "./i18n.js";
import { inspectForge } from "./guarantees-forge.js";
import type { Exec, GuaranteeConfig } from "./guarantees-table.js";

export type LevelState = "reached" | "missing" | "unverified";

export interface ProtectionLevel {
  level: 1 | 2 | 3 | 4;
  state: LevelState;
  detail: string;
}

export interface Protection {
  lang: MessageLang;
  /** Plus haut niveau atteint sans trou : un niveau manquant ou non vérifié arrête la montée. */
  level: 1 | 2 | 3 | 4;
  levels: ProtectionLevel[];
  /** Commande qui mène au niveau suivant ; null au niveau 4. */
  next: string | null;
}

const HARDEN =
  `node -e "const f='.drwil/ia-first.json',fs=require('fs'),c=JSON.parse(fs.readFileSync(f));` +
  `c.scopeGate='blocking';fs.writeFileSync(f,JSON.stringify(c,null,2)+'\\n')"`;

const TEXTS = {
  fr: {
    title: "Niveau de protection : {0}/4",
    next: "Niveau suivant : {0}",
    names: ["Diagnostic seul", "Gouvernance locale active", "Contrôles CI actifs", "Protection de forge vérifiée"],
    marks: { reached: "atteint", missing: "non atteint", unverified: "non vérifié" },
    diagnostic: "règles écrites, aucune garantie tenue par ce niveau",
    hooksOff: "hooks git non branchés",
    gateNotBlocking: "barrière de périmètre (scopeGate) en « {0} », non bloquante",
    gateOk: "hooks branchés, barrière de périmètre bloquante",
    noCi: "aucune CI déclarée",
    ciMissing: "fichier de CI absent : {0}",
    noReplay: "la CI ne rejoue pas les contrôles du hook (`node .githooks/run-checks.mjs`) : {0}",
    ciOk: "la CI rejoue les contrôles du hook ({0})",
    forgeOk: "branche `{0}` protégée, contrôles requis, aucun contournement administrateur",
    nextHooks: "git config core.hooksPath .githooks",
    nextCi: "npx drwil init --ci github (ou --ci gitlab)",
    nextForge: "npx drwil guarantees --protect (avec l'accord de l'humain)",
    nextVerify: "se connecter à la forge (gh auth login, ou glab auth login), puis relancer npx drwil doctor",
    gateFailure: "garantie de barrière non tenue : `scopeGate` est en « {0} » alors que les garanties sont obligatoires — la durcir : {1}",
  },
  en: {
    title: "Protection level: {0}/4",
    next: "Next level: {0}",
    names: ["Diagnosis only", "Local governance active", "CI checks active", "Forge protection verified"],
    marks: { reached: "reached", missing: "not reached", unverified: "not verified" },
    diagnostic: "rules written, no guarantee held at this level",
    hooksOff: "git hooks not wired",
    gateNotBlocking: 'scope gate (scopeGate) is "{0}", not blocking',
    gateOk: "hooks wired, scope gate blocking",
    noCi: "no CI declared",
    ciMissing: "CI file missing: {0}",
    noReplay: "the CI does not replay the hook's checks (`node .githooks/run-checks.mjs`): {0}",
    ciOk: "the CI replays the hook's checks ({0})",
    forgeOk: "branch `{0}` protected, checks required, no administrator bypass",
    nextHooks: "git config core.hooksPath .githooks",
    nextCi: "npx drwil init --ci github (or --ci gitlab)",
    nextForge: "npx drwil guarantees --protect (with the human's agreement)",
    nextVerify: "log in to the forge (gh auth login, or glab auth login), then run npx drwil doctor again",
    gateFailure: 'scope gate guarantee not held: `scopeGate` is "{0}" while the guarantees are mandatory — harden it: {1}',
  },
};

const gateOf = (cfg: GuaranteeConfig) => (typeof cfg.scopeGate === "string" ? cfg.scopeGate : "warning");

/** Sous garanties obligatoires, une barrière de périmètre non bloquante échoue `drwil verify` (message, ou null). */
export function scopeGateFailure(cfg: GuaranteeConfig, lang: MessageLang): string | null {
  if (cfg.guarantees?.enforced !== true || gateOf(cfg) === "blocking") return null;
  return fill(TEXTS[lang].gateFailure, gateOf(cfg), HARDEN);
}

/** Niveau 3 : chaque fichier de CI déclaré existe et rejoue les contrôles du hook. */
function ciLevel(root: string, cfg: GuaranteeConfig, T: (typeof TEXTS)["fr"]): ProtectionLevel & { fix: string } {
  const files: string[] = Array.isArray(cfg.ciFiles) ? cfg.ciFiles.filter((f): f is string => typeof f === "string") : [];
  const base = { level: 3 as const, fix: T.nextCi };
  if (!files.length) return { ...base, state: "missing", detail: T.noCi };
  const absent = files.filter((f) => !existsSync(join(root, f)));
  if (absent.length) return { ...base, state: "missing", detail: fill(T.ciMissing, absent.join(", ")) };
  const silent = files.filter((f) => !readFileSync(join(root, f), "utf8").includes("run-checks.mjs"));
  if (silent.length) return { ...base, state: "missing", detail: fill(T.noReplay, silent.join(", ")) };
  return { ...base, state: "reached", detail: fill(T.ciOk, files.join(", ")) };
}

/**
 * `hooksOk` : le point « hooks » du diagnostic (branchés directement ou appelés par le gestionnaire du
 * projet). Le niveau 4 réutilise la lecture de forge des garanties (QUA-094, QUA-095), sans la refaire.
 */
export function computeProtection(root: string, cfg: GuaranteeConfig, exec: Exec, lang: MessageLang, hooksOk: boolean): Protection {
  const T = TEXTS[lang];
  const gate = gateOf(cfg);
  const gateOk = gate === "blocking";
  const l2: ProtectionLevel & { fix: string } = {
    level: 2,
    fix: hooksOk ? HARDEN : T.nextHooks,
    state: hooksOk && gateOk ? "reached" : "missing",
    detail: !hooksOk ? T.hooksOff : gateOk ? T.gateOk : fill(T.gateNotBlocking, gate),
  };
  const l3 = ciLevel(root, cfg, T);
  const forge = inspectForge(root, cfg, exec, lang);
  const unread = forge.notRun ?? forge.unverified;
  const l4: ProtectionLevel & { fix: string } = {
    level: 4,
    fix: unread ? T.nextVerify : T.nextForge,
    state: unread ? "unverified" : forge.protected ? "reached" : "missing",
    detail: unread ?? (forge.protected ? fill(T.forgeOk, forge.branch) : forge.missing.join(" ; ")),
  };
  const all = [{ level: 1 as const, state: "reached" as const, detail: T.diagnostic, fix: "" }, l2, l3, l4];
  const stop = all.find((l) => l.state !== "reached");
  const levels = all.map(({ fix: _fix, ...l }) => l);
  return { lang, level: (stop ? stop.level - 1 : 4) as Protection["level"], levels, next: stop ? stop.fix : null };
}

export function formatProtection(p: Protection): string[] {
  const T = TEXTS[p.lang];
  const symbol = { reached: "✓", missing: "✗", unverified: "?" };
  const lines = [fill(T.title, p.level)];
  for (const l of p.levels) lines.push(`  ${symbol[l.state]} ${l.level} ${T.names[l.level - 1]} — ${T.marks[l.state]} : ${l.detail}`);
  if (p.next) lines.push(fill(T.next, p.next));
  return lines;
}

/** `protection` of `drwil doctor --json` (format 1): the state of each level and the command to the next one. */
export function protectionJson(p: Protection) {
  return { level: p.level, levels: p.levels, next: p.next };
}

// Risk levels of a workstream brief: ceremony follows risk, traceability
// (QUA-016) does not change.
// - LOW: attached to docs/projects/routine-maintenance.md, no dedicated brief;
// - MEDIUM: brief with a scope block;
// - HIGH: brief, Decisions section, related contracts cited, evidence.
// The level is explicit (`**Risk**: HIGH`) and can only be raised: a scope
// that touches the governance mechanics imposes HIGH at least.
import { fnmatch, readBlock } from "./scope.mjs";

export const LEVELS = ["LOW", "MEDIUM", "HIGH"];

/** Paths whose change imposes HIGH (configurable: .drwil/ia-first.json → risk.sensitivePaths). */
export const SENSITIVE_PATHS = [".githooks/*", ".github/workflows/*", ".gitlab-ci.yml", ".drwil/*"];

/** Minimum level imposed by a brief's scope: HIGH if a pattern touches a sensitive path. */
export function minimumLevel(patterns, sensitive = SENSITIVE_PATHS) {
  const touches = patterns.some((p) => sensitive.some((s) => fnmatch(p, s) || fnmatch(s, p) || p.startsWith(s.replace(/\*$/, ""))));
  return touches ? "HIGH" : "LOW";
}

const TEXTS = {
  fr: {
    unknown: (v) => `niveau de risque « ${v} » inconnu (LOW, MEDIUM ou HIGH)`,
    tooLow: (v, min) =>
      `risque ${v} déclaré, mais le cadrage touche la mécanique de gouvernance : ${min} au minimum (forçable vers le haut seulement)`,
    missing: (min) => `pas de champ « Risque » alors que le cadrage impose ${min} (DRWIL-012)`,
    decisions: () => `risque HIGH sans section « Décisions »`,
    contracts: () => `risque HIGH sans contrat concerné cité (ID du registre)`,
  },
  en: {
    unknown: (v) => `unknown risk level "${v}" (LOW, MEDIUM or HIGH)`,
    tooLow: (v, min) => `risk ${v} declared, but the scope touches governance mechanics: ${min} at least (can only be raised)`,
    missing: (min) => `no "Risk" field although the scope requires ${min} (DRWIL-012)`,
    decisions: () => `HIGH risk without a "Decisions" section`,
    contracts: () => `HIGH risk without any related contract cited (registry ID)`,
  },
};

/**
 * Checks a brief's risk level. Returns { errors, warnings } (messages without prefix).
 * Without a Risk field: never an error (compatibility), a warning if HIGH is imposed.
 */
export function checkRisk(text, { sensitive = SENSITIVE_PATHS, idPattern = "(?:SEC|QUA)-\\d{3}", lang = "fr" } = {}) {
  const T = TEXTS[lang === "en" ? "en" : "fr"];
  const errors = [];
  const warnings = [];
  const min = minimumLevel(readBlock(text).patterns, sensitive);
  const m = /^\*\*(?:Risque|Risk)\*\*\s*:\s*`?([^\s`]+)`?/m.exec(text);
  if (!m) {
    if (min === "HIGH") warnings.push(T.missing(min));
    return { errors, warnings };
  }
  const level = m[1].toUpperCase();
  if (!LEVELS.includes(level)) return { errors: [T.unknown(m[1])], warnings };
  if (LEVELS.indexOf(level) < LEVELS.indexOf(min)) errors.push(T.tooLow(level, min));
  if (level === "HIGH") {
    if (!/^##\s*(\d+\.\s*)?(Décisions|Decisions)\b/m.test(text)) errors.push(T.decisions());
    if (!new RegExp(idPattern).test(text)) errors.push(T.contracts());
  }
  return { errors, warnings };
}

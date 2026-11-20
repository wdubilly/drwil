// Points of `drwil doctor` on the declared checks (QUA-318): read from the configuration only, nothing written.
import { fill, type MessageLang } from "./i18n.js";
import type { DiagnosisPoint } from "./doctor.js";

const TEXTS = {
  fr: {
    ungrouped: "Contrôles de contrats non groupés",
    ungroupedDetail:
      '`{0}` relance le lanceur de tests pour son seul contrat : poser `"run": "{1}"` (un lancement par passe pour tous les contrats)',
    unfingerprinted: "Contrôles confiés à la CI sans paths",
    unfingerprintedDetail:
      '`{0}` (`runAt: ["ci"]`) n\'a pas d\'empreinte propre : la CI le rejoue sur un commit qu\'il vient de passer ; poser `"paths": ["**"]` (ou ses seuls chemins : sources, tests, configuration, manifeste et verrou du paquet)',
  },
  en: {
    ungrouped: "Ungrouped contract checks",
    ungroupedDetail:
      '`{0}` relaunches the test runner for its single contract: set `"run": "{1}"` (one launch per pass for every contract)',
    unfingerprinted: "Checks left to CI without paths",
    unfingerprintedDetail:
      '`{0}` (`runAt: ["ci"]`) has no fingerprint of its own: the CI replays it on a commit it just passed; set `"paths": ["**"]` (or its own paths only: sources, tests, configuration, package manifest and lock)',
  },
};

type Check = { id?: unknown; run?: unknown; runAt?: unknown; paths?: unknown };

// The ID after `-t` or `--testNamePattern`, quoted or not; the runner named in the command, if any.
const FILTER = /(?:^|\s)(?:-t|--testNamePattern)(?:\s+|=)["']?([A-Z][A-Z0-9]*-\d+)\b/;
const RUNNER = /\b(vitest|jest)\b/;
const NPM_TEST = /\bnpm\s+(?:run\s+)?test\b/;
const TEST_FILE = /(?:^|\s)["']?([^\s"']+\.(?:test|spec)\.[cm]?[jt]sx?)\b/g;

/** The grouped form of an ungrouped contract check (`vitest|jest|npm test … -t "<ID>"`), `null` otherwise. */
export function groupedForm(run: string): string | null {
  const id = FILTER.exec(run)?.[1];
  const runner = RUNNER.exec(run)?.[1];
  if (!id || (!runner && !NPM_TEST.test(run))) return null;
  const files = [...run.matchAll(TEST_FILE)].map((m) => m[1]);
  return ["node .githooks/contract-tests.mjs", ...(runner ? [`--runner ${runner}`] : []), id, ...files].join(" ");
}

const named = (c: Check) => (typeof c.id === "string" ? c.id : String(c.run));

/**
 * Points `contract-checks` and `ci-paths`, each a warning only when it finds something; none otherwise. Only a check left to
 * the CI alone (`runAt: ["ci"]`) is named for its missing `paths`: the CI replay of the main branch's hooks plays it again.
 */
export function checksPoints(checks: unknown, lang: MessageLang): DiagnosisPoint[] {
  const T = TEXTS[lang];
  const list: Check[] = Array.isArray(checks) ? checks.filter((c) => c && typeof c === "object") : [];
  const ungrouped = list.flatMap((c) => {
    const form = typeof c.run === "string" ? groupedForm(c.run) : null;
    return form ? [fill(T.ungroupedDetail, named(c), form)] : [];
  });
  const blind = list
    .filter((c) => Array.isArray(c.runAt) && c.runAt.join() === "ci" && !(Array.isArray(c.paths) && c.paths.length))
    .map((c) => fill(T.unfingerprintedDetail, named(c)));
  return [
    ...(ungrouped.length ? [{ id: "contract-checks", label: T.ungrouped, state: "warning" as const, detail: ungrouped.join(" ; ") }] : []),
    ...(blind.length ? [{ id: "ci-paths", label: T.unfingerprinted, state: "warning" as const, detail: blind.join(" ; ") }] : []),
  ];
}

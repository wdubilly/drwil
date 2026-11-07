// Réglage `runAt` d'un contrôle du projet : où il tourne (commit, push, verify, ci), lu par le moteur (engine.mjs).
// Un contrôle réservé est « non exécuté » là où il ne tourne pas, jamais « passé » (QUA-013).
// Sans le réglage, le contrôle tourne partout, comme avant.
// QUA-208 : `["ci"]` seul confie le contrôle à la CI de la PR ou MR ; il exige une CI déclarée sur GitHub ou GitLab, les seules
// forges dont la CI est suivie. QUA-261 : l'option `--with-ci-checks` (verify, run-checks) le joue aussi en local.

export const RUN_AT = ["commit", "push", "verify", "ci"];
export const WITH_CI_CHECKS = "--with-ci-checks";

const FORGE_CI = [/^\.github\/workflows\//, /(^|\/)\.gitlab-ci\.yml$/];

const TEXTS = {
  fr: {
    invalid: (n, why) => `${n} : réglage runAt refusé (${why})`,
    notList: `une liste non vide est attendue, parmi ${RUN_AT.join(", ")}`,
    unknown: (v) => `valeur inconnue ${JSON.stringify(v)}, attendu : ${RUN_AT.join(", ")}`,
    missing:
      "verify et ci y figurent toujours, ou ci seul (confié à la CI) : un contrôle réservé est joué par `drwil verify` et la CI, jamais seulement au commit",
    noCi: 'runAt ["ci"] sans CI déclarée (ciFiles vide) : le contrôle ne serait joué nulle part',
    otherForge: 'runAt ["ci"] sans CI GitHub (.github/workflows/) ni GitLab (.gitlab-ci.yml) dans ciFiles : sa CI ne serait pas suivie',
    commit: "réservé par runAt (verify, ci) : pas joué au commit, rejoué par verify et en CI",
    push: "réservé par runAt : pas joué au push, rejoué par verify et en CI",
    ci: `confié à la CI (runAt ["ci"]) : pas joué ici, jamais compté passé ; joué par la CI de la PR ou MR, en local par ${WITH_CI_CHECKS}`,
    pending: (names) => `confié à la CI, non exécuté ici : ${names.join(", ")}`,
    option: (names) =>
      `option ${WITH_CI_CHECKS} active : ${names.length ? `contrôles confiés à la CI joués en local (${names.join(", ")})` : "aucun contrôle confié à la CI"}`,
  },
  en: {
    invalid: (n, why) => `${n}: runAt setting refused (${why})`,
    notList: `a non-empty list is expected, among ${RUN_AT.join(", ")}`,
    unknown: (v) => `unknown value ${JSON.stringify(v)}, expected: ${RUN_AT.join(", ")}`,
    missing:
      "verify and ci must always be in it, or ci alone (left to CI): a reserved check is played by `drwil verify` and CI, never at commit only",
    noCi: 'runAt ["ci"] without a declared CI (empty ciFiles): the check would run nowhere',
    otherForge: 'runAt ["ci"] without a GitHub (.github/workflows/) or GitLab (.gitlab-ci.yml) CI in ciFiles: its CI would not be followed',
    commit: "reserved by runAt (verify, ci): not played at commit, replayed by verify and in CI",
    push: "reserved by runAt: not played at push, replayed by verify and in CI",
    ci: `left to CI (runAt ["ci"]): not played here, never counted as passed; played by the PR or MR CI, locally with ${WITH_CI_CHECKS}`,
    pending: (names) => `left to CI, not run here: ${names.join(", ")}`,
    option: (names) =>
      `option ${WITH_CI_CHECKS} active: ${names.length ? `checks left to CI played locally (${names.join(", ")})` : "no check left to CI"}`,
  },
};

/** Textes des sorties (run-checks) sur les contrôles confiés à la CI. */
export const ciTexts = (lang) => TEXTS[lang === "en" ? "en" : "fr"];

/**
 * Où l'on joue les contrôles : "commit" (index donné), "ci" (variable CI, même avec des références de push), "push" (références
 * poussées données par le pre-push), sinon "verify".
 */
export function runContext(staged, env) {
  if (staged) return "commit";
  if (env.CI) return "ci";
  const pushed = ["DRWIL_PUSH_REFS", "DRWIL_PUSH_TAGS_ONLY", "DRWIL_PUSH_NO_BRANCH"].some((k) => env[k]);
  return pushed ? "push" : "verify";
}

/** Le contrôle déclare `runAt: ["ci"]` (confié à la CI), quelle que soit sa validité. */
export const ciOnly = (c) => Array.isArray(c.runAt) && c.runAt.length > 0 && c.runAt.every((v) => v === "ci");

/**
 * Verdict à rendre sans lancer le contrôle `c` (sa déclaration, nommée `name`) dans ce contexte, ou null s'il se joue :
 * un `runAt` mal formé est un échec (le réglage n'est jamais ignoré), un contrôle réservé est « non exécuté ».
 * `verify` et `ci` ensemble, ou `ci` seul : sans eux le contrôle ne serait plus jamais jugé à la clôture ni à la fusion.
 * `withCi` (option locale) joue aussi un contrôle confié à la CI.
 */
export function runAtVerdict(c, name, context, { lang, ciFiles, withCi = false } = {}) {
  if (!("runAt" in c)) return null;
  const T = ciTexts(lang);
  const list = c.runAt;
  const refuse = (why) => ({ status: "fail", message: T.invalid(name, why) });
  if (!Array.isArray(list) || !list.length) return refuse(T.notList);
  const unknown = list.find((v) => !RUN_AT.includes(v));
  if (unknown !== undefined) return refuse(T.unknown(unknown));
  const onlyCi = ciOnly(c);
  if (!onlyCi && (!list.includes("verify") || !list.includes("ci"))) return refuse(T.missing);
  if (onlyCi) {
    const files = Array.isArray(ciFiles) ? ciFiles : [];
    if (!files.length) return refuse(T.noCi);
    if (!files.some((f) => FORGE_CI.some((p) => p.test(f)))) return refuse(T.otherForge);
  }
  if (list.includes(context) || (withCi && onlyCi)) return null;
  if (onlyCi) return { status: "not-run", detail: T.ci, configured: true, ciPending: true };
  return { status: "not-run", detail: T[context], configured: true };
}

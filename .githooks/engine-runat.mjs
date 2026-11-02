// Réglage `runAt` d'un contrôle du projet : où il tourne (commit, push, verify, ci), lu par le moteur (engine.mjs).
// Un contrôle réservé (sans `commit`, ni `push`) est « non exécuté » là où il ne tourne pas, jamais « passé » (QUA-013).
// Sans le réglage, le contrôle tourne partout, comme avant.

export const RUN_AT = ["commit", "push", "verify", "ci"];

const TEXTS = {
  fr: {
    invalid: (n, why) => `${n} : réglage runAt refusé (${why})`,
    notList: `une liste non vide est attendue, parmi ${RUN_AT.join(", ")}`,
    unknown: (v) => `valeur inconnue ${JSON.stringify(v)}, attendu : ${RUN_AT.join(", ")}`,
    missing: "verify et ci y figurent toujours : un contrôle réservé est joué par `drwil verify` et la CI, jamais seulement au commit",
    commit: "réservé par runAt (verify, ci) : pas joué au commit, rejoué par verify et en CI",
    push: "réservé par runAt : pas joué au push, rejoué par verify et en CI",
  },
  en: {
    invalid: (n, why) => `${n}: runAt setting refused (${why})`,
    notList: `a non-empty list is expected, among ${RUN_AT.join(", ")}`,
    unknown: (v) => `unknown value ${JSON.stringify(v)}, expected: ${RUN_AT.join(", ")}`,
    missing: "verify and ci must always be in it: a reserved check is played by `drwil verify` and CI, never at commit only",
    commit: "reserved by runAt (verify, ci): not played at commit, replayed by verify and in CI",
    push: "reserved by runAt: not played at push, replayed by verify and in CI",
  },
};

/** Où l'on joue les contrôles : "commit" (index donné), "push" (références poussées données par le pre-push), sinon "verify" (ou "ci"). */
export function runContext(staged, env) {
  if (staged) return "commit";
  const pushed = ["DRWIL_PUSH_REFS", "DRWIL_PUSH_TAGS_ONLY", "DRWIL_PUSH_NO_BRANCH"].some((k) => env[k]);
  return pushed && !env.CI ? "push" : "verify";
}

/**
 * Verdict à rendre sans lancer le contrôle `c` (sa déclaration, nommée `name`) dans ce contexte, ou null s'il se joue :
 * un `runAt` mal formé est un échec (le réglage n'est jamais ignoré), un contrôle réservé est « non exécuté ».
 * Les valeurs `verify` et `ci` sont obligatoires : sans elles le contrôle ne serait plus jamais jugé à la clôture ni à la fusion.
 */
export function runAtVerdict(c, name, context, lang) {
  if (!("runAt" in c)) return null;
  const T = TEXTS[lang === "en" ? "en" : "fr"];
  const list = c.runAt;
  const refuse = (why) => ({ status: "fail", message: T.invalid(name, why) });
  if (!Array.isArray(list) || !list.length) return refuse(T.notList);
  const unknown = list.find((v) => !RUN_AT.includes(v));
  if (unknown !== undefined) return refuse(T.unknown(unknown));
  if (!list.includes("verify") || !list.includes("ci")) return refuse(T.missing);
  if (context === "verify" || list.includes(context)) return null;
  return { status: "not-run", detail: T[context], configured: true };
}

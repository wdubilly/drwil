// Validation of the registry and of the catalog (split from contracts.mjs, which re-exports it).

const TEXTS = {
  fr: {
    duplicate: (id) => `contrat ${id} défini plusieurs fois`,
    unknown: (id, c, known) => `${id} : contrôle inconnu « ${c} » (connus : ${known})`,
    noProof: (id) => `${id} : aucune preuve déclarée (champ Contrôle ou Manuel)`,
    noRule: (id) => `${id} : exigence absente (champ Règle)`,
    severity: (id, v) => `${id} : sévérité « ${v} » inconnue (bloquant, avertissement ou indicatif)`,
    emptyCheck: (id) => `${id} : champ Contrôle vide`,
    catalogDuplicate: (id) => `ID ${id} défini plusieurs fois dans le catalogue`,
    both: (id, registry) =>
      `ID ${id} défini à la fois dans le catalogue et dans ${registry} : un contrat adopté quitte le catalogue ; sinon, renuméroter la ligne du catalogue`,
  },
  en: {
    duplicate: (id) => `contract ${id} defined more than once`,
    unknown: (id, c, known) => `${id}: unknown check "${c}" (known: ${known})`,
    noProof: (id) => `${id}: no declared proof (Check or Manual field)`,
    noRule: (id) => `${id}: missing requirement (Rule field)`,
    severity: (id, v) => `${id}: unknown severity "${v}" (blocking, warning or advisory)`,
    emptyCheck: (id) => `${id}: empty Check field`,
    catalogDuplicate: (id) => `ID ${id} defined more than once in the catalog`,
    both: (id, registry) =>
      `ID ${id} defined both in the catalog and in ${registry}: an adopted contract leaves the catalog; otherwise, renumber the catalog line`,
  },
};

/**
 * Configuration errors of the registry, each `{ id, line, type, message }`
 * (type: duplicate | empty-check | unknown | no-rule | no-proof | severity):
 * duplicate, unknown check, section contract without a requirement (Rule) or without
 * any declared proof: an unverifiable obligation is never accepted silently.
 * A table contract without Check nor Manual is not an error: it is a legacy
 * contract, treated as MANUAL.
 */
export function validateContracts(contracts, knownIds, lang = "fr") {
  const T = TEXTS[lang === "en" ? "en" : "fr"];
  const known = new Set(knownIds);
  const seen = new Set();
  const errors = [];
  const error = (k, type, message) => errors.push({ id: k.id, line: k.line, type, message });
  for (const k of contracts) {
    if (seen.has(k.id)) error(k, "duplicate", T.duplicate(k.id));
    seen.add(k.id);
    if (k.checks && !k.checks.length) error(k, "empty-check", T.emptyCheck(k.id));
    for (const c of k.checks ?? []) if (!known.has(c)) error(k, "unknown", T.unknown(k.id, c, [...known].join(", ")));
    if (k.severity === null) error(k, "severity", T.severity(k.id, k.rawSeverity));
    if (k.form === "section" && !k.rule) error(k, "no-rule", T.noRule(k.id));
    if (k.form === "section" && k.checks === null && k.manual === null) error(k, "no-proof", T.noProof(k.id));
  }
  return errors;
}

/** IDs a registry defines (heading `## ID` or first cell `| ID |`) matching `idPattern`, and those defined more than once. */
export function definedIds(text, idPattern) {
  const counts = new Map();
  for (const m of text.matchAll(new RegExp(`^(?:##\\s+|\\|\\s*)(${idPattern})`, "gm"))) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  return { defined: new Set(counts.keys()), duplicates: [...counts].filter(([, n]) => n > 1).map(([id]) => id) };
}

/**
 * ID conflicts between the registry and the catalog: an ID defined twice in the catalog, or both in
 * the catalog and in the registry (a contract adopted from the catalog keeps its ID and leaves it).
 * Catalog IDs are the first cell of a table row, `catalogue:ID` (French) or `catalog:ID`.
 */
export function idConflicts(catalogText, registryIds, registry, lang = "fr") {
  const T = TEXTS[lang === "en" ? "en" : "fr"];
  const ids = [...catalogText.matchAll(/^\|\s*catal(?:ogue|og):([A-Z][A-Z0-9]*-\d+)\b/gm)].map((m) => m[1]);
  const seen = new Set();
  const problems = [];
  for (const id of ids) {
    if (seen.has(id)) problems.push(T.catalogDuplicate(id));
    seen.add(id);
  }
  for (const id of seen) if (registryIds.has(id)) problems.push(T.both(id, registry));
  return problems;
}

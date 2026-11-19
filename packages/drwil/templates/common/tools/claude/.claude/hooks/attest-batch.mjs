// QUA-235 : attestation par lot, lue dans le seul retour du sondage à choix multiple. Chaque contrat coché
// s'atteste à part, avec sa propre empreinte ; un contrat non coché ne l'est pas ; une preuve changée pendant la
// question ne refuse que son contrat.

const TEXTS = {
  fr: {
    rien: "aucun contrat coché",
    nonCoche: "{id} non coché : non attesté",
    redo: 'relancer `drwil attest-poll {id} --tried "<essai>"`',
  },
  en: {
    rien: "no contract ticked",
    nonCoche: "{id} not ticked: not attested",
    redo: 'run `drwil attest-poll {id} --tried "<trial>"` again',
  },
};

/** Claude Code rend un choix multiple en libellés séparés par des virgules, dans l'ordre des clics. */
export function ticked(answer, labels) {
  if (typeof answer !== "string") return { unknown: String(answer) };
  const chosen = answer
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = chosen.find((c) => !labels.includes(c));
  return unknown === undefined ? { chosen } : { unknown };
}

/** Le moteur relance les contrôles ; seule l'empreinte vue à la préparation confirme. */
export async function attestSnapshot(id, snapshot, attestOne) {
  const seen = [];
  const result = await attestOne(id, async (_, s) => seen.push(s) > 0 && s === snapshot);
  const line = `${result.code === 0 ? "✓" : "✗"} ${result.message}${result.file ? ` : ${result.file}` : ""}`;
  return { changed: seen.length > 0 && seen[0] !== snapshot, line };
}

/**
 * `attestOne(id, confirm)` relance le moteur pour un contrat ; `refuse` dit un refus du sondage entier.
 * Le message de chaque contrat suit l'ordre du sondage, pas celui des clics.
 */
export async function attestBatch({ answer, ids: labels, pending, attestOne, refuse, tell, en, preuve }) {
  const T = en ? TEXTS.en : TEXTS.fr;
  const read = ticked(answer, labels);
  if (read.unknown !== undefined) return refuse({ cause: "illisible", detail: `« ${read.unknown} » ∉ options` });
  if (!read.chosen.length) return refuse({ cause: "humain", detail: T.rien });
  const lines = [];
  for (const id of labels) {
    if (!read.chosen.includes(id)) {
      lines.push(`– ${T.nonCoche.replace("{id}", id)}`);
      continue;
    }
    const done = await attestSnapshot(id, pending.snapshots?.[id], attestOne);
    lines.push(done.changed ? `✗ ${id} : ${preuve} ; ${T.redo.replace("{id}", id)}.` : done.line);
  }
  tell(lines.join("\n"));
  return 0;
}

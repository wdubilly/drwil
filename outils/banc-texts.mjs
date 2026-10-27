// Rapport de campagne du mini-banc (QUA-102 à QUA-107) : date du protocole réduit et synthèse par tâche et
// condition. Séparé de outils/banc-juge.mjs (QUA-001, fichier de code plafonné), qui le réexporte.
// Propre à ce dépôt (QUA-018).

export const CONDITIONS = ["avec", "sans"];

/** Date du protocole réduit, fixée avant la mesure : « **Protocole réduit** : fixé le AAAA-MM-JJ ». */
export const dateProtocole = (texte) => /\*\*Protocole réduit\*\*\s*:\s*fixé le (\d{4}-\d{2}-\d{2})/.exec(texte)?.[1] ?? null;

const etendue = (valeurs) => {
  const v = valeurs.filter((x) => typeof x === "number");
  return v.length
    ? `${Math.min(...v)} – ${Math.max(...v)} (moy. ${Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 100) / 100})`
    : "—";
};

/**
 * Rapport de campagne : tous les passages, mesurés ou non, puis par tâche et condition le min et le max (et la
 * moyenne) de chaque mesure. Refusé si le protocole n'est pas daté ou s'il a été fixé après un passage mesuré.
 */
export function rapport(resultats, { protocole }) {
  const date = dateProtocole(protocole);
  if (!date) throw new Error("protocole non daté : écrire « **Protocole réduit** : fixé le AAAA-MM-JJ » avant toute mesure");
  const campagne = resultats
    .filter((r) => !r.essai)
    .sort((a, b) => `${a.tache}${a.condition}${a.repetition}`.localeCompare(`${b.tache}${b.condition}${b.repetition}`));
  const premier = campagne.map((r) => r.date.slice(0, 10)).sort()[0];
  if (premier && premier < date)
    throw new Error(`protocole fixé le ${date}, après un passage du ${premier} : nouvelle version datée, mesures conservées`);
  const lignes = [`# Mini-banc : rapport de campagne`, "", `Protocole réduit fixé le ${date} (docs/benchmark-protocole.md).`, ""];
  lignes.push(
    `## Tous les passages (${campagne.length})`,
    "",
    "| Tâche | Condition | Rép. | Statut | Verdict | Tokens | Coût estimé ($) | Tours | Contournements | Hors tâche | Blocages (faux) |",
  );
  lignes.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of campagne) {
    const j = r.juge;
    const g = r.gouvernance;
    lignes.push(
      `| ${r.tache} | ${r.condition} | ${r.repetition} | ${r.statut}${r.raison ? ` (${r.raison})` : ""} | ${r.verdict ?? "—"} | ${r.tokens?.total ?? "—"} | ${r.coutUsdEstime ?? "—"} | ${r.tours ?? "—"} | ${j ? j.contournements.length : "—"} | ${j ? j.horsTache.length : "—"} | ${g ? `${g.blocages} (${g.fauxBlocages})` : "—"} |`,
    );
  }
  lignes.push("", "## Par tâche et condition (min – max, passages mesurés)", "");
  lignes.push(
    "| Tâche | Condition | Mesurés / prévus | Réussis | Tokens | Coût estimé ($) | Tours | Temps des contrôles (ms) | Faux blocages |",
    "|---|---|---|---|---|---|---|---|---|",
  );
  for (const tache of [...new Set(campagne.map((r) => r.tache))]) {
    for (const condition of CONDITIONS) {
      const tous = campagne.filter((r) => r.tache === tache && r.condition === condition);
      const m = tous.filter((r) => r.statut === "mesuré");
      const col = (f) => etendue(m.map(f));
      lignes.push(
        `| ${tache} | ${condition} | ${m.length} / ${tous.length} | ${m.filter((r) => r.verdict === "réussi").length} | ${col((r) => r.tokens.total)} | ${col((r) => r.coutUsdEstime)} | ${col((r) => r.tours)} | ${col((r) => r.gouvernance.tempsControlesMs)} | ${col((r) => r.gouvernance.fauxBlocages)} |`,
      );
    }
  }
  const essais = resultats.filter((r) => r.essai);
  if (essais.length) lignes.push("", `Passages d'essai hors mesure, non comptés : ${essais.length}.`);
  return lignes.join("\n") + "\n";
}

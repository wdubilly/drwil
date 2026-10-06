// Niveaux de risque d'une fiche de chantier (DRWIL-012, ADR-004 de
// docs/projets/drwil-v0-2-gouvernance-executable.md) : la cérémonie suit le risque,
// la traçabilité (QUA-016) ne change pas.
// - LOW : rattaché à docs/projets/entretien-courant.md, pas de fiche dédiée ;
// - MEDIUM : fiche avec cadrage ;
// - HIGH : fiche, section Décisions, contrats concernés cités, preuves.
// Le niveau est explicite (`**Risque** : HIGH`) et forçable vers le haut seulement : un
// cadrage qui touche la mécanique de gouvernance impose HIGH au minimum.
import { fnmatch, lireBloc } from "./cadrage.mjs";

export const NIVEAUX = ["LOW", "MEDIUM", "HIGH"];

/** Chemins dont la modification impose HIGH (réglable : .drwil/ia-first.json → risque.cheminsSensibles). */
export const CHEMINS_SENSIBLES = [".githooks/*", ".github/workflows/*", ".gitlab-ci.yml", ".drwil/*"];

/** Niveau minimum imposé par le cadrage d'une fiche : HIGH si un motif touche un chemin sensible. */
export function niveauMinimum(motifs, sensibles = CHEMINS_SENSIBLES) {
  const touche = motifs.some((m) => sensibles.some((s) => fnmatch(m, s) || fnmatch(s, m) || m.startsWith(s.replace(/\*$/, ""))));
  return touche ? "HIGH" : "LOW";
}

/**
 * Vérifie le niveau de risque d'une fiche. Rend { erreurs, avertissements } (messages sans préfixe).
 * Sans champ Risque : jamais d'erreur (compatibilité), un avertissement si HIGH est imposé.
 */
export function verifierRisque(texte, { sensibles = CHEMINS_SENSIBLES, idMotif = "(?:SEC|QUA)-\\d{3}", lang = "fr" } = {}) {
  const T = {
    fr: {
      invalide: (v) => `niveau de risque « ${v} » inconnu (LOW, MEDIUM ou HIGH)`,
      tropBas: (v, min) => `risque ${v} déclaré, mais le cadrage touche la mécanique de gouvernance : ${min} au minimum (forçable vers le haut seulement)`,
      absent: (min) => `pas de champ « Risque » alors que le cadrage impose ${min} (DRWIL-012)`,
      decisions: () => `risque HIGH sans section « Décisions »`,
      contrats: () => `risque HIGH sans contrat concerné cité (ID du registre)`,
    },
    en: {
      invalide: (v) => `unknown risk level "${v}" (LOW, MEDIUM or HIGH)`,
      tropBas: (v, min) => `risk ${v} declared, but the scope touches governance mechanics: ${min} at least (can only be raised)`,
      absent: (min) => `no "Risk" field although the scope requires ${min} (DRWIL-012)`,
      decisions: () => `HIGH risk without a "Decisions" section`,
      contrats: () => `HIGH risk without any related contract cited (registry ID)`,
    },
  }[lang === "en" ? "en" : "fr"];
  const erreurs = [];
  const avertissements = [];
  const min = niveauMinimum(lireBloc(texte).motifs, sensibles);
  const m = /^\*\*(?:Risque|Risk)\*\*\s*:\s*`?([^\s`]+)`?/m.exec(texte);
  if (!m) {
    if (min === "HIGH") avertissements.push(T.absent(min));
    return { erreurs, avertissements };
  }
  const niveau = m[1].toUpperCase();
  if (!NIVEAUX.includes(niveau)) return { erreurs: [T.invalide(m[1])], avertissements };
  if (NIVEAUX.indexOf(niveau) < NIVEAUX.indexOf(min)) erreurs.push(T.tropBas(niveau, min));
  if (niveau === "HIGH") {
    if (!/^##\s*(\d+\.\s*)?(Décisions|Decisions)\b/m.test(texte)) erreurs.push(T.decisions());
    if (!new RegExp(idMotif).test(texte)) erreurs.push(T.contrats());
  }
  return { erreurs, avertissements };
}

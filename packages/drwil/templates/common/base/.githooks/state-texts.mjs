// Textes de l'état de gouvernance et leur mise en forme pour l'agent (découpé de state.mjs, qui les
// réexporte) : contexte complet et rappel court, construits depuis l'état déjà lu et le disque.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lireBloc } from "./scope.mjs";
import { config } from "./briefs.mjs";

const TEXTES = {
  fr: {
    entete: "[drwil] État de gouvernance, lu sur disque (.drwil/state.json) — ne pas le déduire de la conversation.",
    absent: "(.drwil/state.json absent : état neutre)",
    desactivee:
      "[drwil] Gouvernance désactivée (réglage « scopeGate » : off dans .drwil/ia-first.json) : aucune activité ni périmètre à suivre.",
    invalide: "⚠ État invalide, traité comme SCOPING neutre :",
    activity: (a) => `Activité : ${a}`,
    attente: (a) => `Attente active : ${a ?? "aucune attente active"}`,
    demande: (d) => `Demande active : ${d ?? "aucune"}`,
    fusion:
      "Fusion automatique autorisée au lancement : en CLOSING, après verify PASS et le push de la clôture, dans cet ordre : attendre que GitHub ait calculé la PR (`gh pr view --json mergeStateStatus`) et, si elle est en retard sur la branche principale (BEHIND), la mettre à jour ; programmer `gh pr merge --auto --merge` ; vérifier que la fusion est bien programmée (`gh pr view --json autoMergeRequest`) ; seulement ensuite revenir en SCOPING, qui efface l'autorisation. En cas d'échec : rester en CLOSING et le signaler.",
    perimetre: "Périmètre autorisé (bloc cadrage de la fiche) :",
    sansPerimetre: "  (aucun bloc cadrage : aucun fichier de code autorisé)",
    ficheSupprimee: "fiche supprimée (clôture)",
    regle: (r) => `Règle : ${r}`,
    rappel: (a, f, n) =>
      `[drwil] Rappel : ${a}${f ? ` · ${f}` : " · aucune attente active"}${n === null ? "" : ` · périmètre : ${n} fichier(s) ou motif(s)`} (relire avec \`node .githooks/state.mjs\`).`,
    rappelInvalide: "[drwil] Rappel : état invalide, traité comme SCOPING neutre (détail : `node .githooks/state.mjs`).",
    pied: "Ne jamais écrire .drwil/state.json à la main. Lancer un chantier : `/drwil-lancer` (sondage) ou `node .githooks/state.mjs start` dans un terminal — décision humaine, sauf réglage « transitions » : agent. Changer d'activité : `node .githooks/state.mjs move <ACTIVITE>` ; clore est libre sur évidence de verify valide.",
    regles: {
      SCOPING: "lire, analyser, cadrer ; ne modifier aucun fichier de code.",
      EXPECTATION: "formaliser l'attente dans sa fiche ; ne modifier aucun fichier de code.",
      REQUEST: "expliciter la demande de réalisation ; ne modifier encore aucun fichier de code.",
      BUILD: "réaliser l'attente, en ne modifiant que les fichiers du périmètre (bloc cadrage de la fiche active).",
      EVIDENCE: "produire les preuves et lancer les contrôles ; un correctif demande de revenir en BUILD.",
      VERIFY:
        "lancer `npx drwil verify --evidence` ; seul son verdict compte, pas l'affirmation de l'agent. PASS ou ATTESTED : clore ; FAIL ou ERROR : revenir en BUILD ; MANUAL : attestation humaine (`npx drwil attest`), puis relancer.",
      CLOSING:
        "fiche entièrement terminée : la condenser dans le journal puis la supprimer ; sinon mettre à jour statut et reprise ; puis revenir en SCOPING.",
    },
  },
  en: {
    entete: "[drwil] Governance state, read from disk (.drwil/state.json) — do not infer it from the conversation.",
    absent: "(.drwil/state.json missing: neutral state)",
    desactivee: '[drwil] Governance disabled ("scopeGate" setting: off in .drwil/ia-first.json): no activity or scope to follow.',
    invalide: "⚠ Invalid state, treated as neutral SCOPING:",
    activity: (a) => `Activity: ${a}`,
    attente: (a) => `Active expectation: ${a ?? "none"}`,
    demande: (d) => `Active request: ${d ?? "none"}`,
    fusion:
      "Automatic merge authorised at start: in CLOSING, after verify PASS and pushing the closing commit, in this order: wait until GitHub has computed the PR (`gh pr view --json mergeStateStatus`) and, if it is behind the main branch (BEHIND), update it; schedule `gh pr merge --auto --merge`; check that the merge is actually scheduled (`gh pr view --json autoMergeRequest`); only then go back to SCOPING, which clears the authorisation. On failure: stay in CLOSING and report it.",
    perimetre: "Allowed scope (scope block of the brief):",
    sansPerimetre: "  (no scope block: no code file allowed)",
    ficheSupprimee: "fiche deleted (closing)",
    regle: (r) => `Rule: ${r}`,
    rappel: (a, f, n) =>
      `[drwil] Reminder: ${a}${f ? ` · ${f}` : " · no active expectation"}${n === null ? "" : ` · scope: ${n} file(s) or pattern(s)`} (read again with \`node .githooks/state.mjs\`).`,
    rappelInvalide: "[drwil] Reminder: invalid state, treated as neutral SCOPING (details: `node .githooks/state.mjs`).",
    pied: 'Never write .drwil/state.json by hand. Start a chantier: `/drwil-lancer` (poll) or `node .githooks/state.mjs start` in a terminal — a human decision, unless the "transitions" setting is agent. Change activity: `node .githooks/state.mjs move <ACTIVITE>`; closing is free on valid verify evidence.',
    regles: {
      SCOPING: "read, analyse, frame; do not modify any code file.",
      EXPECTATION: "write down the expectation in its fiche; do not modify any code file.",
      REQUEST: "make the implementation request explicit; do not modify any code file yet.",
      BUILD: "implement the expectation, modifying only the files in the scope (scope block of the active brief).",
      EVIDENCE: "produce evidence and run the checks; a fix means going back to BUILD.",
      VERIFY:
        "run `npx drwil verify --evidence`; only its verdict counts, not the agent's claim. PASS or ATTESTED: close; FAIL or ERROR: go back to BUILD; MANUAL: human attestation (`npx drwil attest`), then run it again.",
      CLOSING:
        "fiche fully finished: condense it into the journal, then delete it; otherwise update status and hand-off; then go back to SCOPING.",
    },
  },
};

const langue = (racine) => (config(racine).lang === "en" ? "en" : "fr");

/** `scopeGate: off` coupe toute la gouvernance (barrière, trailer, contexte) : retrait sans rien supprimer. */
export const gouvernanceDesactivee = (racine) => config(racine).scopeGate === "off";

/** Contexte lisible à réinjecter à l'agent, construit uniquement depuis le disque. */
export function contexte(lu, racine) {
  const T = TEXTES[langue(racine)];
  if (gouvernanceDesactivee(racine)) return T.desactivee;
  const { etat, source, problemes } = lu;
  const lignes = [T.entete];
  if (source === "absent") lignes.push(T.absent);
  if (problemes.length) lignes.push(T.invalide, ...problemes.map((p) => `  - ${p}`));
  lignes.push(T.activity(etat.activity));
  let attente = etat.active_brief;
  let motifs = null;
  if (attente && !existsSync(join(racine, attente))) {
    attente = `${attente} — ${T.ficheSupprimee}`;
  } else if (attente) {
    try {
      const texte = readFileSync(join(racine, attente), "utf8");
      const titre = /^#\s+(.+)$/m.exec(texte)?.[1]?.trim();
      if (titre) attente = `${attente} — ${titre}`;
      motifs = lireBloc(texte).motifs;
    } catch {
      motifs = [];
    }
  }
  lignes.push(T.attente(attente), T.demande(etat.active_request));
  if (etat.auto_merge === true) lignes.push(T.fusion);
  if (motifs) lignes.push(T.perimetre, ...(motifs.length ? motifs.map((m) => `  - ${m}`) : [T.sansPerimetre]));
  lignes.push(T.regle(T.regles[etat.activity]), T.pied);
  return lignes.join("\n");
}

/** Rappel court (deux lignes) de l'état, pour l'injecter à chaque message ; null si la gouvernance est désactivée. */
export function rappelCourt(lu, racine) {
  const T = TEXTES[langue(racine)];
  if (gouvernanceDesactivee(racine)) return null;
  const { etat, problemes } = lu;
  const tete = problemes.length
    ? T.rappelInvalide
    : (() => {
        let n = null;
        if (etat.active_brief && !existsSync(join(racine, etat.active_brief))) {
          return T.rappel(etat.activity, `${etat.active_brief} (${T.ficheSupprimee})`, null);
        }
        if (etat.active_brief) {
          try {
            n = lireBloc(readFileSync(join(racine, etat.active_brief), "utf8")).motifs.length;
          } catch {
            n = 0;
          }
        }
        return T.rappel(etat.activity, etat.active_brief, n);
      })();
  return `${tete}\n${T.regle(T.regles[etat.activity])}`;
}

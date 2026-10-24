# Intention : corriger un défaut révélé après la clôture

**Statut** : proposée le 2026-10-21 — défaut de gouvernance vécu à la clôture
du chantier « des critères et des preuves qui survivent à la clôture » ;
première et troisième questions tranchées et livrées le 2026-10-24
(`node .githooks/state.mjs reopen`, QUA-116 à QUA-118 ; journal du
2026-10-24, « Rouvrir un chantier dont la PR révèle un défaut après la
clôture ») ; reste ici la deuxième (attendre CodeQL avant la clôture).

## Besoin

Un défaut peut n'apparaître qu'après la clôture : l'analyse de code de la forge
(CodeQL) a signalé une expression régulière polynomiale dans
`packages/drwil/src/closure.ts` une fois la PR ouverte, et son fil de revue non
résolu a bloqué la fusion. À ce moment, l'agent n'a plus aucune voie pour
corriger une ligne de code : l'activité est CLOSING, la barrière de périmètre
n'accepte le code qu'en BUILD, et aucun chemin ne ramène en BUILD. Résultat
attendu : un défaut révélé après la clôture se corrige sans attendre un geste
humain de relance, ou l'outillage dit clairement pourquoi il l'exige.

## Existant (relevé le 2026-10-21)

- `.githooks/scope-gate.mjs` refuse tout fichier de code dès que l'activité
  n'est pas BUILD, quelle que soit la fiche qui le couvre.
- `.githooks/state.mjs` : depuis CLOSING, la seule transition est SCOPING ;
  `start` depuis CLOSING exige que la PR du chantier soit **déjà fusionnée**
  (`closingMerged`), ce qui est précisément ce que le défaut empêche, et le
  réglage `transitions: "human"` réserve le lancement à l'humain.
- `.githooks/detour.mjs` ouvre un détour depuis BUILD seulement, et part de la
  branche principale : un défaut qui porte sur du code pas encore fusionné n'y
  est pas visible.
- Contournement employé : inscrire le correctif à l'entretien courant
  (`docs/projects/routine-maintenance.md`), puis demander à l'humain
  `move SCOPING` et `start` — deux commandes pour une ligne de code.

## Questions à trancher

- Un détour depuis CLOSING, resté sur la branche du chantier, est-il la bonne
  réponse, ou faut-il une activité FIX dédiée ?
- La clôture doit-elle attendre le verdict de l'analyse de la forge (CodeQL)
  avant d'écrire la preuve, pour que ces défauts tombent encore en BUILD ?
- Un retour en BUILD après clôture oblige-t-il à réécrire la preuve du chantier
  (le commit vérifié change) ?

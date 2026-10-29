# Intention : un test unitaire du texte de fusion automatique qui attend la fusion

**Statut** : réalisée le 2026-10-29 (chantier test-unitaire-fusion-automatique, journal `docs/projects/journal.md`) ; cadrée le 2026-10-25 — limite constatée à la clôture du chantier
« un hook modifié se déclare avant la clôture, et le retour en SCOPING attend
la CI » (journal du 2026-10-25).

## Besoin

QUA-138 (avec la fusion automatique, le retour en SCOPING attend la fusion de
la PR) n'est prouvé que par le test du cycle dans un projet installé
(`packages/drwil/test/cycle.test.mjs`). Le test unitaire du texte, dans
`.githooks/state.test.mjs`, vérifie encore l'ancien ordre (programmer,
vérifier, puis SCOPING) sans le suivi par `node .githooks/pr-watch.mjs`, la
réouverture sur CI rouge ni le délai dépassé. Le chantier ne l'a pas modifié :
`.githooks/state.test.mjs` suit la déclaration de `.githooks/state.mjs`, non
déclaré, et le modifier sans le déclarer aurait fait échouer le rejeu par la
branche principale (QUA-113) et refuser la clôture (QUA-137).

## Existant (relevé le 2026-10-25)

- `.githooks/state.test.mjs` : test « fusion autorisée : seulement par un
  lancement humain… », qui vérifie l'ordre `mergeStateStatus`, `BEHIND`,
  `gh pr merge --auto --merge`, `autoMergeRequest`, puis SCOPING ; le nouveau
  texte de `.githooks/state-texts.mjs` le satisfait toujours.
- `packages/drwil/test/cycle.test.mjs` : test QUA-138, procédure complète en
  français et en anglais, et skill installé.

## Réalisé (2026-10-29)

- `.githooks/state.test.mjs` : test « QUA-138 : … » qui vérifie, en français
  et en anglais, chaque étape après la précédente (programmation,
  vérification, suivi par `node .githooks/pr-watch.mjs`, relance, 30 minutes,
  retour en SCOPING seulement la PR fusionnée, CI rouge : `reopen`, délai
  dépassé : CLOSING signalé) et l'absence de SCOPING avant le suivi ; une
  régression locale non commitée (SCOPING dès la programmation) le fait
  échouer dans les deux langues.
- Le contrôle `tests-qua-138` exécute ce test et celui du cycle installé.

## Questions à trancher

Le demandeur a choisi le 2026-10-25 d'ajouter le test unitaire et de
déclarer le fichier de test concerné. Critères et déclaration :
l'entrée du journal du chantier (`docs/projects/journal.md`).
Aucun point restant à trancher pour ce chantier.

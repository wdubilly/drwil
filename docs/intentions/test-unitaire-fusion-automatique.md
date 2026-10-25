# Intention : un test unitaire du texte de fusion automatique qui attend la fusion

**Statut** : proposée le 2026-10-25 — limite constatée à la clôture du chantier
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

## Questions à trancher

- [décision] Ajouter ce test unitaire en déclarant `.githooks/state.mjs` (ou
  `.githooks/state.test.mjs`) dans « Contrats modifiés » de sa fiche — une
  déclaration de hook, sur le oui du demandeur — ou s'en tenir au test du
  cycle ?

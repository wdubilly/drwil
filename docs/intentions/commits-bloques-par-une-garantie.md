# Intention : bloquer les commits de code d'une couche dont la garantie n'est pas tenue

**Statut** : proposée le 2026-10-22 — limite du chantier « garanties
obligatoires à l'adoption ».

## Besoin

Le cadrage du chantier prévoyait, recommandation validée par le demandeur le
2026-10-22, le blocage du verdict **et** des commits de code de la couche
concernée tant que sa fiche de garantie existe (les commits de documents et de
la fiche restant libres). Seul le blocage du verdict (`drwil verify` en FAIL)
et de l'ordre des fiches (`/drwil-start` ne propose que la fiche bloquante) a
été livré : un commit de code de la couche passe.

## Existant (relevé le 2026-10-22)

- `packages/drwil/src/guarantees.ts` (`judgeGuarantees`) : la garantie non
  tenue fait échouer `verify`.
- `.githooks/briefs.mjs` : une fiche `[P0]` de garantie est la seule proposée
  au lancement.
- Le hook de pré-commit (`.githooks/pre-commit`, barrière de périmètre) ne lit
  pas les fiches de garantie.

## Questions à trancher

- [décision] Le blocage au commit est-il toujours voulu, sachant que la CI
  (qui rejoue `verify`) refuse déjà la fusion ?
- [décision] Comment rattacher un fichier à sa couche (réglage `layers` de
  `.drwil/ia-first.json`) sans ralentir chaque commit ?

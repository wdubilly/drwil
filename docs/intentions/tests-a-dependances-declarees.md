# Intention : tests à dépendances déclarées

**Statut** : proposée le 2026-11-23 — limite laissée par le chantier « acceleration-des-controles » (lot 13), réponse « Noter en intention » du demandeur.

## Besoin

Qu'un fichier touché invalide moins de contrôles de tests. L'outil `outils/resserrer-paths.mjs` (QUA-338) ne resserre que 6 contrôles de tests sur 264 : les autres copient tout `.githooks` ou importent `dist`, donc tout `packages/drwil/src`, et gardent un motif large. Gagner davantage demande de couper la dépendance elle-même, pas de mieux lire les imports.

## Existant (relevé le 2026-11-23)

- Fichier touché, contrôles invalidés avant → après le lot 13 : `.githooks/state.mjs` 194 → 188 ; `.githooks/engine.mjs` 194 → 188 ; `.githooks/contract-tests.mjs` 295 → 295 ; `packages/drwil/src/evidence.ts` 191 → 191.
- Le cadrage d'un chantier refuse les motifs larges (`.githooks/*.test.mjs`) : le travail se cadre avec la liste exacte des tests à réécrire.

## Questions à trancher

- [IA] Quels tests copient ou importent plus que ce qu'ils lisent, et lesquels le font par nécessité (ils prouvent le kit entier) ?
- [IA] Pour ceux qui le peuvent : déclarer leurs seules dépendances sans affaiblir ce qu'ils prouvent (QUA-019), puis mesurer avant et après.

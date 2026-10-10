# Intention : capitaliser sur les preuves pour une non-régression continue

**Statut** (2026-10-10) : à cadrer — intention posée par le demandeur,
recentrée sur ce qui manque réellement ; questions à trancher en fin de
fiche.

**Projet** : DRWIL — **Niveau de risque** : HIGH (touche `verify`, les
contrats et les contrôles).

## Besoin

Les preuves produites pendant un chantier (un défaut corrigé, un
comportement validé, un contrat vérifié) sont une connaissance du
comportement attendu. Intention : qu'elles alimentent un patrimoine de
tests de non-régression, rattaché aux contrats, rejoué à chaque évolution,
qui empêche une preuve passée de masquer une régression actuelle.

Principes retenus :

- **Le contrat reste la référence** : un test n'est pas la conformité
  parce qu'il existe ou qu'il passe ; il est rattaché à un contrat.
- **Une preuve passée n'est pas une preuve actuelle.**
- **Capitaliser seulement ce qui est reproductible** : une preuve non
  reproductible reste un élément d'audit, jamais un faux test.
- **L'IA propose, la gouvernance décide** : l'agent écrit et analyse les
  tests ; la conformité se juge sur les contrats, les contrôles et les
  validations humaines habilitées.

Critère de réussite : un défaut corrigé donne un test traçable,
reproductible, rattaché à un contrat, rejoué automatiquement ; si une
évolution réintroduit le défaut, l'échec est détecté, rattaché à
l'obligation, et aucun résultat historique ne le masque. La réussite se
mesure à la capacité du patrimoine à **détecter** les régressions, pas au
nombre de preuves stockées.

## Existant (vérifié le 2026-10-10)

- **Le patrimoine, ce sont les tests dans Git** : `.githooks/*.test.mjs`
  et `packages/drwil/test/kit.test.mjs`, rejoués en entier à chaque commit
  (pre-commit) et en CI. Le 2026-10-10, chaque défaut corrigé a donné un
  test de non-régression vu échouer avant la correction (variables `GIT_*`
  du hook, fiche absente en CLOTURE) — par discipline, sans règle.
- **Preuve passée ≠ preuve actuelle, déjà codé** : l'évidence de `verify`
  ne vaut que sur le commit `HEAD` et un arbre propre (`preuveVerify` dans
  `.githooks/etat.mjs`) ; une attestation devient obsolète si son contrat
  ou sa preuve change.
- **Contrôle non exécuté ≠ passé** : QUA-013.
- **Lien test ↔ contrat à l'état d'ébauche** : des noms de tests portent
  l'ID du contrat (« QUA-016 : … », « DRWIL-012 : … ») ; convention non
  exploitée.

## Ce qui manque

1. **Une règle** : toute fiche qui corrige un défaut livre un test de
   non-régression, vu échouer avant la correction, rattaché à un contrat
   (recette, puis contrôle).
2. **Une traçabilité exploitée** : `verify` dit, contrat par contrat,
   quels tests le couvrent et s'ils ont tourné sur `HEAD` ; un contrat sans
   test qui le couvre se voit.
3. **Distinguer les échecs** : régression introduite par le changement,
   échec déjà présent sur la branche principale, contrôle non exécuté
   (déjà couvert par QUA-013).

## Réserves (à trancher, pas à présumer)

- **Pas de stockage parallèle des preuves** (scénarios, préconditions,
  assertions à côté des tests) : une information aurait deux sources, qui
  divergeraient. Un test exécutable est la forme la plus fiable d'une
  preuve reproductible.
- **Pas de sélection des tests à rejouer pour l'instant** : la suite
  complète tourne en ~100 s ; sélectionner ajoute le risque d'oublier un
  test pertinent pour un gain nul à cette taille.

## Liens

- `docs/intentions/fabrique-autonome.md`, brique 2 : le **mutation
  testing** mesure directement le critère de réussite (on injecte des
  défauts, on compte ceux que les tests attrapent). Les deux intentions se
  renforcent.
- `docs/intentions/bench-avec-sans-drwil.md` : mesure de l'apport global.

## Questions à trancher

1. **Rattachement test ↔ contrat** : convention de nommage (ID du contrat
   en tête du nom du test), champ dans le contrat (`docs/contrats.md`)
   listant les tests, ou les deux ?
2. **Règle « défaut corrigé → test »** : recette seule d'abord, ou contrôle
   bloquant d'emblée (comment le vérifier mécaniquement) ?
3. **Échec préexistant** : comparer à la dernière CI verte de la branche
   principale, ou rejouer les tests sur la base de la PR ?
4. **Stockage parallèle et sélection** : confirmer qu'on s'en passe tant
   que la suite reste rapide ?
5. **Livrable** : capacité du gabarit (QUA-018) ou d'abord pratique de ce
   dépôt ?

# Projet : la couverture de `closedBriefPatterns` ne dépend plus de l'historique de la branche (QUA-173)

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .githooks/scope.test.mjs
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le correctif de QUA-173 (chantier fusionné par la PR #409) a ajouté `closedBriefPatterns` à `.githooks/scope.mjs`.
Le test de `.githooks/scope.test.mjs` (`depotCloture()`) copie `.githooks/scope.mjs` dans un dépôt temporaire et importe la
copie : le contrôle de couverture (c8) n'instrumente pas ce chemin. Les lignes 178 à 180 n'étaient couvertes que
par l'historique réel de la branche de #409, qui supprimait une fiche. Toute PR dont la branche ne supprime aucune
fiche échoue donc au contrôle « hooks de gouvernance : tests + couverture » (QUA-004), à 99,97 %, y compris les
PR de cadrage (observé sur #410, deux passes). Cause racine, pas un contrôle mal calibré : on ne l'assouplit pas
(QUA-019).

## Critères d'acceptation

- `closedBriefPatterns` est couverte par le test lui-même, sans dépendre de l'historique de la branche : les
  tests de `.githooks/scope.test.mjs` l'appellent dans le module réel (importé de `.githooks/scope.mjs`) avec la racine du
  dépôt temporaire — `QUA-173`
- Le contrôle de couverture passe sur une branche qui ne supprime aucune fiche (la PR de cadrage #410 puis la
  suivante) — `QUA-004`
- Les cas déjà testés tiennent : fichier neuf listé par la fiche supprimée couvert, fichier jamais listé refusé
  (QUA-016), historique illisible = rien de couvert (QUA-013) — `QUA-173`

## Contrats modifiés

- `.githooks/scope.test.mjs` — gardé à sa version de la branche (QUA-113) : le rejeu avec les hooks de main ne peut pas juger sa propre correction (validé le 2026-11-12)

## 2. Hors périmètre

- Le seuil et le mécanisme du contrôle de couverture.
- `.githooks/scope.mjs` : le code ne change pas (il prend déjà la racine en paramètre).

## 3. Contraintes

- Le test de `.githooks/scope.test.mjs` n'a pas de copie dans le gabarit `packages/drwil/templates/` : seul le dépôt
  est modifié.
- Le détour de la clôture de #409 (`detour.mjs allow`) est un geste humain ; ici le fichier modifié est un test, la
  déclaration « Contrats modifiés » ci-dessus suffit si le rejeu l'exige.

## 4. Décisions

- 2026-11-12 : fiche urgente ajoutée à la PR de cadrage #410, fusionnée à la main par le demandeur (CI rouge connue
  de ce défaut), puis chantier lancé.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — test sur le module réel** [IA] : dans `.githooks/scope.test.mjs`, les tests de `closedBriefPatterns`
  appellent la fonction importée de `.githooks/scope.mjs` avec la racine temporaire (`depotCloture()` ne copie plus
  `.githooks/scope.mjs` si plus aucun test n'en a besoin). Critère de sortie : couverture de `.githooks/scope.mjs` à 100 %
  sur une branche sans fiche supprimée, `node .githooks/run-checks.mjs` sans échec.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] fusionner #410, puis `/drwil-start`.

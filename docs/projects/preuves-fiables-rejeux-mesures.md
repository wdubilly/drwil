# Projet : les rejeux d'une clôture sont mesurés et le pre-push juge le commit réellement poussé

**Statut** : cadré le 2026-11-11 ; décisions D1 à D3 tranchées le 2026-11-11 (0.11.2, chantier 6 sur 8).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/pre-push-commit-pousse.md` et `docs/intentions/notes.md` (note du 2026-11-06 « Réutilisation fiable des preuves »)

<!-- scope
files:
  - .githooks/pre-push
  - .githooks/run-checks-verdicts.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/templates/common/base/.githooks/pre-push
  - packages/drwil/templates/common/base/.githooks/run-checks-verdicts.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
-->

(Le bloc `scope` couvre le hook, le module de reprise des verdicts, son test, le gabarit qui les livre et le registre.
Le lot 1 est une mesure : il ne change aucun fichier de code. Si la mesure montre qu'un autre fichier doit changer,
l'élargissement sera un commit séparé.)

## 1. Besoin

La note du 2026-11-06 constate qu'une clôture rejoue le même arbre 4 à 6 fois (`run-checks`, `verify --evidence`, hooks
des commits de journal et de clôture, pre-push, CI). Relu le 2026-11-11 : `verify --evidence` reprend déjà un verdict sur un
arbre identique (QUA-140) ; il rejoue tout dès que l'arbre change, par exemple avec l'entrée du journal. Le chiffre de la
note n'a pas été remesuré depuis les reprises par contrôle (QUA-141, QUA-152).

Deuxième point : `.githooks/pre-push` lit `<réf locale> <sha local> <réf distante> <sha distant>` mais ne transmet que la
référence distante. Le pre-push ne peut donc pas savoir que le commit poussé est `HEAD` : il exige un arbre propre et une
seule référence égale à la branche courante, et rejoue tout sinon (`pushedTreeIsWorkTree`).

Le projet : savoir combien de rejeux reste par clôture, et faire connaître au pre-push le commit poussé.

## Critères d'acceptation

- Le nombre de rejeux d'un même arbre par clôture et leur durée sont mesurés sur une clôture réelle et consignés au
  journal, par contrôle et par étape (hook, `verify`, pre-push, CI) — [humain] `QUA-013`
- `.githooks/pre-push` transmet le sha local de chaque référence poussée, et `run-checks` ne reprend un verdict que si ce
  sha est `HEAD` et l'arbre propre ; `git push origin autre:courante` depuis une branche propre rejoue tout — contrat à créer
- Une référence poussée dont le sha local n'est pas `HEAD`, deux références, une suppression ou un sha illisible
  rejouent tout et le disent : jamais un « ok » repris à tort — `QUA-152`

## Contrats modifiés

- `QUA-152` : la condition « référence poussée égale à la branche courante » devient « sha local poussé égal à `HEAD` »
  (à valider par le demandeur, consigné le 2026-11-11).
- `QUA-141` : **inchangé** (D2). Déclarer le hook `pre-push` plus riche change les règles du jeu : oui du demandeur du 2026-11-11 (D3).

## 2. Hors périmètre

- Reprendre par contrôle pour la preuve de clôture : écarté (D2), la preuve garde l'empreinte de l'arbre entier (QUA-140, QUA-141).
- Le cache de verdicts en CI et la durée de la CI : chantier 2 et chantier « 2b » (`docs/intentions/suivi-ci-et-contexte.md`).
- Le traçage des lectures de chaque contrôle : écarté au chantier 1 (D4).
- Réduire les rejeux restants : décidé après la mesure du lot 1, sur une fiche à part.

## 3. Contraintes

- QUA-018 (dépôt ou livrable) : le hook et le module sont livrés ; on édite le gabarit (`packages/drwil/templates/`), puis
  `npm run installer-depot` rafraîchit la copie, dans le même commit.
- QUA-013 : un verdict n'est repris que sur les mêmes fichiers ; au moindre doute (sha absent ou illisible), tout est rejoué.
- QUA-017 : la lecture des références poussées par le hook reste celle qui laisse passer les pushes de tags seuls et les suppressions.
- QUA-019 : aucun contrôle n'est désactivé ni sauté pour gagner du temps.
- Un fichier de code à 180 lignes ou plus est découpé (plafond 200) : `.githooks/run-checks.mjs` fait 200 lignes et ne peut
  rien recevoir ; la logique va dans `.githooks/run-checks-verdicts.mjs` (154 lignes).

## 4. Décisions

Tranchées par le demandeur le 2026-11-11 (l'agent n'en a tranché aucune) :

- **D1 — Mesure** : mesurer d'abord (lot 1), puis décider du reste. *Alternative écartée* : traiter directement toutes les pistes.
- **D2 — Preuve de clôture** : garder l'arbre entier, aucun changement de QUA-141. *Alternatives écartées* : reprendre par
  contrôle pour la preuve de clôture ; le faire seulement pour les commits de journal et de documentation.
- **D3 — Pre-push** : oui, le hook transmet le sha local et `run-checks` le compare à `HEAD`, dans ce chantier.
  *Alternative écartée* : laisser l'intention pour la 0.12.0.

## 5. Points à trancher

- [IA] Le nom de la variable transmise (par exemple `DRWIL_PUSH_SHAS`) et son format, une valeur par référence dans l'ordre de `DRWIL_PUSH_REFS`.
- [humain] Après la mesure du lot 1 : faut-il un chantier de plus pour les rejeux restants (nouvelle fiche, décision du demandeur) ?

## 6. Increments

- **Lot 1** : mesurer sur une clôture réelle les rejeux du même arbre et leur durée ; consigner le relevé au journal. Aucun code.
- **Lot 2** : tests d'abord, rouges : sha local différent de `HEAD`, deux références, suppression, sha illisible, `autre:courante`.
- **Lot 3** : `.githooks/pre-push` transmet les shas, `pushedTreeIsWorkTree` les compare à `HEAD`, le gabarit et la copie installée sont alignés.
- **Lot 4** : `QUA-152` mis à jour, carte d'architecture, ligne du `CHANGELOG`.

## 7. Reprise

Prêt à démarrer par le lot 1 ; rien de commencé.

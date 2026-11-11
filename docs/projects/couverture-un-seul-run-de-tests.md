# Projet : un seul run de tests pour le seuil de couverture et la couverture du diff

**Statut** : cadré le 2026-11-11 ; décisions D1 à D5 tranchées le 2026-11-11 (0.11.2, chantier 3 sur 8) ; relu le 2026-11-11 avec le chantier 4.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/couverture-un-seul-run.md`

<!-- scope
files:
  - packages/drwil/src/guarantees-tools.ts
  - packages/drwil/src/guarantees-table.ts
  - packages/drwil/src/guarantees-layers.ts
  - packages/drwil/src/guarantees-verify.ts
  - packages/drwil/src/guarantees-merge.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/doctor-coverage.ts
  - packages/drwil/src/doctor-texts.ts
  - packages/drwil/src/guarantees-texts.ts
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/test/coverage-merge.test.mjs
  - docs/contracts.md
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
  - .drwil/ia-first.json
-->

(Le bloc `scope` couvre la table des outils de couverture, la logique des couches, la vérification des garanties,
l'avertissement de `drwil doctor`, leurs textes (français et anglais), leurs tests, le registre, la carte
d'architecture et `.drwil/ia-first.json` où chaque contrat créé déclare son contrôle. `packages/drwil/src/doctor.ts`
(200 lignes) et `packages/drwil/src/guarantees.ts` (183 lignes) sont au plafond ou proches : la fusion vit dans un
nouveau module guarantees-merge et l'avertissement de `doctor` dans un nouveau module doctor-coverage, sans rien ajouter
aux fichiers existants au-delà du branchement. Deux modules de plus : la carte d'architecture les cite. Si
l'implémentation montre qu'un autre fichier doit changer, l'élargissement sera un commit séparé.)

## 1. Besoin

Sur une pile Node, `coverage-<couche>` (seuil) et `coverage-diff-<couche>` (100 % sur le diff) rejouent chacun `npm test`
en entier sous c8 (`packages/drwil/src/guarantees-tools.ts`). Chez l'adoptant drwil_walk (c8 sur Vitest), cela fait deux
runs de tests pour une seule mesure : ~48 s par vérification complète. Un seul run produisant le rapport cobertura peut
juger le seuil et alimenter `diff-cover`.

Le projet : que `drwil guarantees` câble, pour une couche en dette, **un seul contrôle** qui joue les tests une fois,
juge le seuil et la couverture du diff ; et que les projets déjà adoptés soient migrés sans écraser ce que le
demandeur a réglé à la main.

## Critères d'acceptation

- Pour une couche Node en dette, `drwil guarantees` déclare un seul contrôle `coverage-diff-<couche>` qui joue `npm test`
  une seule fois sous c8, juge le seuil mesuré (cliquet) et passe le rapport cobertura à `diff-cover` ; le rapport est
  effacé avant le run, jamais un rapport périmé — contrat à créer
- Quand `coverage-<couche>` et `coverage-diff-<couche>` existent et sont exactement ceux que le kit génère,
  `drwil guarantees` les remplace par le contrôle unique ; un contrôle modifié à la main (par exemple
  `--compare-branch`) n'est jamais réécrit — contrat à créer
- `drwil doctor` signale, sans rien écrire, un projet qui joue encore les deux contrôles (de série ou modifiés à la
  main) et donne la commande unique à poser en conservant les options du demandeur ; un projet déjà fusionné n'est pas signalé — contrat à créer
- Le seuil, le cliquet jamais abaissé et les 100 % sur le diff restent jugés comme avant : un seuil non tenu, un
  diff non couvert ou un rapport absent font échouer le contrôle unique — `QUA-093`
- Un projet en dette Python (coverage.py) et un projet à 100 % (un seul `coverage-<couche>`) sont inchangés — `QUA-087`
- Une vérification complète de drwil_walk ne joue plus qu'un run de tests pour la couverture : gain d'au moins 30 s,
  mesuré avant et après dans `run-checks.log` (si présent), relevé à la main au journal de clôture — [humain] `QUA-013`

## Contrats modifiés

- `QUA-093` — ancien critère : « en dessous, il est câblé au niveau mesuré (cliquet, jamais abaissé par la commande), un
  contrôle `coverage-diff-<couche>` exige 100 % sur le code nouveau ou modifié (`diff-cover`) » — raison : pour une
  couche Node, le cliquet et le diff sont jugés par le même contrôle `coverage-diff-<couche>` (un seul run de tests),
  et `coverage-<couche>` n'est plus déclaré pour une couche « existing » (validé le 2026-11-11, D1 et D2).

## 2. Hors périmètre

- Les piles autres que Node : Python lit déjà le rapport du run précédent (`coverage xml`), Go et JVM n'ont pas de diff.
- La couverture native de Vitest (`vitest --coverage`) : le kit câble c8.
- Le contrôle de couverture d'un projet à 100 % : inchangé.
- Les contrôles longs repris (chantier 1) et le cache de CI (chantier 2).

## 3. Contraintes

- QUA-018 (dépôt ou livrable) : livrable. Tout vit dans le paquet (`packages/drwil/`), jamais dans une copie installée.
- QUA-013 : un contrôle non exécuté n'est pas passé ; le rapport est effacé avant le run, un rapport absent est un échec, jamais un rapport périmé lu.
- QUA-019 : aucune garantie n'est abaissée ni contournée ; une commande modifiée à la main n'est jamais réécrite.
- Un fichier de code à 180 lignes ou plus est découpé (plafond 200) : `packages/drwil/src/doctor.ts` et `packages/drwil/src/guarantees.ts`.
- Textes en français et en anglais, comme les autres textes de `guarantees` et de `doctor`.
- Fichiers partagés avec le chantier « tranches dès le départ » (`docs/projects/controles-lents-decoupes-des-le-depart.md`) : `packages/drwil/src/guarantees-layers.ts`, `packages/drwil/src/doctor.ts` (200 lignes, aucune place pour un import et un appel), `packages/drwil/test/guarantees.test.mjs`, `docs/contracts.md`, `.drwil/ia-first.json`. Les deux chantiers se jouent l'un après l'autre ; le lot 0 libère d'abord de la place dans `packages/drwil/src/doctor.ts` (modèle : `packages/drwil/src/doctor-upgrade.ts`), sauf s'il est déjà fait.

## 4. Décisions

Tranchées par le demandeur le 2026-11-11 (l'agent n'en a tranché aucune) :

- **D1 — partage** : un seul contrôle qui enchaîne le seuil puis `diff-cover` (un run, un rapport). *Alternative écartée* : deux contrôles, le second relit le rapport du premier.
- **D2 — ID du contrôle unique** : `coverage-diff-<couche>` (il fait seuil et diff). Pour une couche « existing »,
  `coverage-<couche>` n'est plus déclaré ; `guarantees-verify` n'exige plus que `coverage-diff-<couche>` dans ce cas.
  *Alternative écartée* : garder l'ID `coverage-<couche>` et retirer le diff.
- **D3 — fraîcheur** : le rapport est produit dans le même contrôle et effacé avant le run.
- **D4 — parallélisme** : sans objet avec un seul contrôle.
- **D5 — migration des projets existants** (remplace « régénération par `guarantees` » du 2026-11-11, qui ne suffisait
  pas : `guarantees` conserve tout contrôle déjà déclaré) : `guarantees` fusionne les deux contrôles existants quand ils
  sont exactement ceux que le kit génère ; un contrôle personnalisé n'est jamais réécrit, `drwil doctor` le signale et
  donne la commande unique à poser à la main. *Alternatives écartées* : `doctor` seul, sans réécriture ; `guarantees` réécrit toujours.
- **Critère de réussite** : un seul passage des tests ; gain d'au moins 30 s chez drwil_walk, relevé à la main (non automatisable).

## 5. Points à trancher

(aucun : D1 à D5 sont tranchées. La reconnaissance d'un contrôle « exactement généré par le kit » se fait par égalité
de la commande avec celle que la table produit pour le même seuil et les mêmes exclusions ; toute différence compte comme
personnalisé, par prudence.)

## 6. Increments

- **Lot 0 — de la place dans `packages/drwil/src/doctor.ts`** [IA] : extraire un bloc de points existant vers un module voisin, sans changer
  le comportement (tests de `doctor` inchangés et verts avant et après) ; sauté si le chantier « tranches dès le
  départ » l'a déjà fait. Critère de sortie : `packages/drwil/src/doctor.ts` sous 190 lignes.

- **Lot 1 — la commande unique** [IA] : la table des outils (c8) produit la commande unique (rapport effacé, seuil,
  cobertura, `diff-cover`) ; `coverage-layers` la déclare à la place des deux contrôles ; `guarantees-verify` n'exige
  plus que `coverage-diff-<couche>` pour une couche « existing ». Critère de sortie : tests de
  `packages/drwil/test/guarantees.test.mjs` verts, contrat créé.
- **Lot 2 — la fusion des projets existants** [IA] : le module guarantees-merge reconnaît les deux contrôles de série,
  les remplace, laisse intact tout contrôle personnalisé ; cas Python et projet à 100 % inchangés. Critère de sortie :
  test coverage-merge vert (série, personnalisé, déjà fusionné, Python), contrat créé.
- **Lot 3 — l'avertissement de `doctor`** [IA] : le module doctor-coverage, un point « Couverture jouée en double » qui lit
  la configuration sans rien écrire et donne la commande unique conservant les options du demandeur. Critère de sortie : test vert.
- **Lot 4 — documentation et mesure** [IA] : CHANGELOG « Unreleased » (anglais), `docs/architecture.md`, `QUA-093`
  modifié, contrats et contrôles de `.drwil/ia-first.json` ; la mesure chez drwil_walk est relevée après la publication, au journal.

## 7. Reprise

- **Dernier état** (2026-11-11) : fiche cadrée, D1 à D5 tranchées, prête ; rien d'implémenté.
- **Travail non commité** : cette fiche et sa ligne d'index.
- **Prochaine étape** : [IA] lot 1, au lancement de la fiche par le demandeur.

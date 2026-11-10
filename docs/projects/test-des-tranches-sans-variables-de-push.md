# Projet : le test des tranches ne dépend plus des variables du push, barrière de la publication 0.11.1

**Statut** : cadré le 2026-11-10.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .githooks/run-checks-shards.test.mjs
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

La création de la release 0.11.1 (`node .githooks/create-release.mjs`) pousse le tag `v0.11.1`. Le hook
`.githooks/pre-push` rejoue alors les contrôles, et `tests des contrôles eux-mêmes` échoue : 7 tests de
`.githooks/run-checks-shards.test.mjs` (QUA-288, QUA-290, QUA-291) ne trouvent pas
le fichier de verdicts des passes. Le push du tag est refusé : aucune release ne peut être publiée tant que le test
n'est pas corrigé. Constaté deux fois, le 2026-11-10, sur le commit `2d63cfb`.

Cause, reproduite en local : au push d'un tag seul, `pre-push` exporte `DRWIL_PUSH_TAGS_ONLY` (et
`DRWIL_PUSH_NO_BRANCH`), que `.githooks/run-checks.mjs` lit pour se croire « hooké » (`hooked`, sans empreinte, donc sans
fichier de verdicts). Le test neutralise `DRWIL_HOOK` et `DRWIL_PUSH_REFS` (lignes 51 et 214) mais pas ces deux
variables, et les sous-processus la reçoivent. Le fichier passe seul (18 verts) et échoue avec
`DRWIL_PUSH_TAGS_ONLY=1 node --test .githooks/run-checks-shards.test.mjs` (11 verts, 7 en échec).

## Critères d'acceptation

- Le fichier `.githooks/run-checks-shards.test.mjs` passe en entier même quand `DRWIL_PUSH_TAGS_ONLY`,
  `DRWIL_PUSH_NO_BRANCH` ou `DRWIL_PUSH_REFS` sont définies dans l'environnement du pré-push — contrat `QUA-290`
- Le test est vu échouer avec `DRWIL_PUSH_TAGS_ONLY=1` avant la correction, et passer après

## 2. Hors périmètre

- `.githooks/run-checks.mjs` et `.githooks/pre-push` : leur comportement est voulu (un passage de hook ne réutilise aucun verdict).
- Les autres fichiers de tests : seul celui-ci est constaté en échec ; ne pas deviner.
- La publication de la 0.11.1 : un geste distinct (`.githooks/create-release.mjs`), après la fusion.

## 3. Contraintes

- Aucun test sauté ni affaibli (QUA-019) : le test garde ses assertions, seule son environnement est isolé.
- Corriger au plus près de la cause : retirer toutes les variables `DRWIL_PUSH_*` de l'environnement du fichier,
  au même endroit que les `GIT_*` et `DRWIL_PR_*` (début du fichier), plutôt que d'allonger chaque
  environnement construit.
- Lancer : `node --test .githooks/run-checks-shards.test.mjs`, avec et sans `DRWIL_PUSH_TAGS_ONLY=1`.

## 4. Décisions

Tranchées par le demandeur le 2026-11-10 : cadrer ce défaut en chantier, avant de relancer la release.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — le test isolé** [IA] : le test écrit et vu échouer, la correction, le fichier vert avec et sans la
  variable, `GOVERNANCE: PASS`. Critère de sortie : PR fusionnée, CI verte.
- **Lot 2 — publication** [humain] : `node .githooks/create-release.mjs --dry-run` puis la création de la
  release 0.11.1 (le push du tag doit passer le pré-push).

## 7. Reprise

- **Dernier état** (2026-11-10) : cadré, rien de réalisé. La CI trois systèmes est verte sur `2d63cfb` ; le
  `--dry-run` de la 0.11.1 est vert ; aucun tag ni release publiés (le tag local raté a été supprimé).
- **Prochaine étape** : [IA] lot 1, dans une nouvelle session (`/drwil-start`) ; l'arbre de travail doit être propre.

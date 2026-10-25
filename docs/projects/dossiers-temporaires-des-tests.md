# Projet : les contrôles ne laissent plus de dossiers temporaires derrière eux

**Statut** : cadré le 2026-10-24.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/tests-dossiers-temporaires-non-supprimes.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/test/kit.test.mjs
  - outils/banc-agents.mjs
  - outils/banc-agents.test.mjs
  - docs/intentions/notes.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/tests-dossiers-temporaires-non-supprimes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Les tests créent des dossiers `drwil-*` dans le dossier temporaire du système
et beaucoup ne les suppriment pas. C'est la troisième fois que leur
accumulation épuise les inodes du `/tmp` en mémoire (WSL) : 7 919 restes
(journal « Garder le commit rapide sans perdre de contrôle »), 40 061 le
2026-10-09, 13 500 le 2026-10-24, où `drwil verify` est tombé en 33 FAIL
`ENOSPC` sans aucun défaut du code vérifié. Les deux premières corrections
étaient faites fichier par fichier, sans garde-fou : les tests écrits depuis
fuient de nouveau (92 dossiers par passe de `verify --evidence`, environ 26
par commit).

Il faut que l'accumulation devienne impossible, quel que soit le test qui
fuit, et que chaque fuite soit nommée pour être corrigée à la source.

Même famille, à la racine du dépôt cette fois : 896 dossiers vides
`drwil-banc-*` relevés le 2026-10-24 (note du 2026-10-22). Le test de
QUA-060 (un outil n'est tenu que prouvé par le banc) appelle `preparer`
d'`outils/banc-agents.mjs` avec le dépôt pour base : le dossier est créé
avant le refus et jamais supprimé, un de plus à chaque passe. La racine
temporaire par passe ne le couvre pas (le dossier est créé dans le dépôt,
pas dans le dossier temporaire).

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- Chaque passe du moteur de contrôles (hooks, `run-checks`, `drwil verify`,
  CI) donne à chaque contrôle qu'elle lance un dossier temporaire propre à
  la passe (variables `TMPDIR`, `TMP` et `TEMP`), supprimé à la fin de la
  passe : après une passe réussie, le dossier temporaire du système ne
  contient pas plus de dossiers `drwil-*` qu'avant — `QUA-133`
- Une passe en échec garde le dossier temporaire de ses contrôles en échec
  pour le diagnostic, au même chemin d'une passe à l'autre (remplacé, jamais
  accumulé), et le résumé de `run-checks` dit ce chemin — `QUA-133`
- Un contrôle qui laisse des fichiers dans son dossier temporaire est
  nommé dans le rapport, avec le nombre d'éléments laissés, et compté comme
  avertissement dans le résumé (QUA-127, le résumé compte chaque
  avertissement) ; il ne fait pas échouer la passe — `QUA-134`
- Le banc refuse une base située dans le dépôt sans y créer de dossier :
  après le test du refus, la racine du dépôt ne contient aucun nouveau
  `drwil-banc-*` — preuve ajoutée à QUA-060 (un outil n'est tenu que prouvé
  par le banc) — `QUA-060`

## Contrats modifiés

(une puce par fichier de `.githooks/` modifié, nom entre backticks en tête
de puce, pour que la CI rejoue les contrôles avec la version de la branche —
QUA-113, la CI rejoue les contrôles avec les hooks de la branche principale.)

- `.githooks/engine.mjs` — racine temporaire par passe, comptage des fuites
- `.githooks/engine.test.mjs` — test de la racine par passe
- `.githooks/run-checks.mjs` — avertissement de fuite, chemin gardé au résumé
- `.githooks/run-checks.test.mjs` — test de l'avertissement de fuite

## 2. Hors périmètre

- Corriger un à un les tests qui fuient aujourd'hui : l'avertissement les
  nomme, ils se corrigent ensuite, à la source, par l'entretien courant.
- Un utilitaire unique de dossier temporaire et une règle refusant
  `mkdtempSync` direct dans un test (piste 2 de l'intention, écartée au
  cadrage : une quarantaine de fichiers à migrer, alors que la racine par
  passe suffit à rendre l'accumulation impossible).
- `npm test` lancé à la main dans `packages/drwil`, hors du moteur : non
  couvert ; la CI le lance sur des machines jetables.
- Faire échouer la passe sur une fuite : écarté, tant que les fuites
  actuelles ne sont pas corrigées (tous les commits seraient bloqués).

## 3. Contraintes

- Un seul point d'entrée : la préparation de l'environnement des contrôles
  dans `.githooks/engine.mjs` (`prepare`), qui retire déjà
  `NODE_TEST_CONTEXT` et les `GIT_*` ; rien à toucher dans les fichiers de
  test.
- Le dossier racine de la passe est créé dans le dossier temporaire du
  système d'origine (jamais dans le dépôt), sous un nom reconnaissable
  `drwil-checks-*` ; celui gardé après un échec, sous un nom fixe.
- Les contrôles lancés en parallèle (`parallel`) ont chacun leur sous-dossier :
  une fuite reste attribuée au bon contrôle.
- Windows : `TMP` et `TEMP` en plus de `TMPDIR` ; suppression tolérante à un
  fichier encore ouvert (réessai, puis avertissement, jamais un échec de la
  passe).
- Textes en français et en anglais (réglage `lang`).
- Livré à tout projet (gabarit d'abord, puis copie du dépôt, QUA-018).
- QUA-033 (un contrôle par règle) impose de déclarer les contrôles
  `tests-qua-<id>` dans `.drwil/ia-first.json`, que couvre l'attestation de
  QUA-122 (le job `checks` nettement plus court) : elle sera périmée et à
  refaire par l'humain, dans un terminal, sur la branche du chantier.

## 4. Décisions

- 2026-10-24 — Racine temporaire par passe, supprimée à la fin, plus un
  comptage par contrôle qui nomme les fuites (demandeur, au cadrage ;
  pistes « comptage seul » et « utilitaire + règle » écartées).
- 2026-10-24 — Une fuite est un avertissement compté, pas un échec : la
  racine par passe empêche déjà l'accumulation.
- 2026-10-24 — Les dossiers vides du banc entrent dans ce chantier
  (demandeur, au cadrage), avec le nettoyage des restes existants.

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — racine par passe** [IA] : `.githooks/engine.mjs` (création, variables,
  suppression, dossier gardé en cas d'échec), tests du moteur avec un
  contrôle simulé qui fuit, réussit puis échoue ; mesure avant / après sur
  ce dépôt (`ls -d /tmp/drwil-* | wc -l` autour d'une passe de
  `run-checks`), consignée au journal.
- **Lot 2 — fuites nommées** [IA] : comptage par contrôle, avertissement
  dans le rapport et le résumé de `run-checks` ; tests ; contrats au
  registre et contrôles `tests-qua-<id>` déclarés ; ligne « Unreleased » du
  changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK,
  `drwil verify --agent` PASS (après la nouvelle attestation de QUA-122).
- **Lot 3 — dossiers vides du banc** [IA] : `preparer` vérifie la base
  avant de créer le dossier (ou le supprime avant de refuser) ; le test de
  QUA-060 compte les `drwil-banc-*` de la racine avant / après ; preuve de
  QUA-060 complétée au registre ; restes existants supprimés (dossiers
  vides seulement, `rmdir`, jamais un dossier non vide) ; note du
  2026-10-22 retirée de `docs/intentions/notes.md`.

## 7. Reprise

- **Dernier état** (2026-10-24) : cadré.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

# Projet : l'avertissement de lancement nomme le hook réellement cité par le bloc scope

**Statut** : cadré le 2026-11-15.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (note du 2026-11-15, chantier cout-par-activite)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state-hooks.mjs
  - .githooks/state-hooks.mjs
  - .githooks/state.test.mjs
  - docs/contracts.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Au lancement de cout-par-activite (2026-11-15), l'avertissement « le cadrage cite `.githooks/state.mjs`,
`.githooks/dashboard.mjs` sans puce dans « Contrats modifiés » : sans elle, la clôture sera refusée (QUA-137) » a été
lu comme portant sur de simples mentions (une contrainte, une ligne « Hors périmètre ») ; deux puces ont été écrites
pour des fichiers non modifiés (« non modifié, cité par la contrainte », « non modifié, cité au hors périmètre »).

Cause, lue dans le code le 2026-11-15 — la lecture « simples mentions » n'est pas la bonne :

- **Le texte de la fiche n'est pas lu** : `undeclaredCited` ne parcourt que les motifs du bloc `scope`
  (`readBlock(text).patterns`, `.githooks/state-hooks.mjs:21` ; `.githooks/scope.mjs:72`). Une mention dans une
  contrainte ou un hors périmètre ne déclenche rien.
- **Le bloc scope citait les fichiers de test**, `.githooks/state.test.mjs` et `.githooks/dashboard.test.mjs`, et
  l'avertissement les **renomme en leur module** (`file.replace(/\.test\.mjs$/, ".mjs")`,
  `.githooks/state-hooks.mjs:25`) : il dit « cite `.githooks/state.mjs` » alors que le cadrage cite son test, et
  propose une puce pour un module que le chantier ne touche pas. Le test actuel fixe ce comportement
  (`.githooks/state.test.mjs:2377-2378`).
- **La puce était bien due, pour le test** : la branche a modifié ces deux fichiers de test, et la clôture exige une
  puce pour tout fichier existant de `.githooks/` modifié, un test pouvant être déclaré par son nom ou par celui de son
  module (`hookDeclared`, `.githooks/base-checks.mjs:77` et `:124`, QUA-137 ; rejeu QUA-113). Une puce au nom du test
  suffisait ; l'avertissement ne le disait pas.

## Critères d'acceptation

- L'avertissement du lancement nomme chaque fichier de `.githooks/` tel que le bloc `scope` le cite : un fichier de
  test est nommé comme test (« `.githooks/state.test.mjs` »), jamais renommé en son module — `QUA-137`
- La puce proposée pour un fichier de test le nomme lui-même ; le message dit qu'un test modifié se déclare par son
  nom ou par celui de son module, et qu'aucune puce n'est due pour un fichier seulement mentionné dans le texte de
  la fiche — `QUA-137`
- Un fichier de `.githooks/` cité seulement dans le texte de la fiche (contrainte, hors périmètre, besoin), hors du
  bloc `scope`, ne déclenche aucun avertissement — `QUA-137`
- Le message dit « le bloc scope cite » au lieu de « le cadrage cite » — `QUA-137`
- Tests : test cité seul nommé comme test, en échec contre le code actuel ; puce au nom du test acceptée au
  lancement et à la clôture ; hook mentionné hors du bloc sans avertissement ; anglais — `QUA-137`

## Contrats modifiés

- `QUA-137` — ancien critère : « le message nomme chaque fichier existant de `.githooks/` cité par le bloc `scope` de la fiche (chemin du gabarit compris ; un fichier de test comme son module) » — raison : un fichier de test est nommé tel quel, avec sa puce à son nom ; une mention hors du bloc `scope` n'exige rien, et le message le dit (validé par le demandeur le 2026-11-15)
- `.githooks/state-hooks.mjs` — test nommé tel quel, message « le bloc scope cite » (validé par le demandeur le 2026-11-15)
- `.githooks/state.test.mjs` — le test du lancement attend le nom du fichier de test au lieu de son module (validé par le demandeur le 2026-11-15)

## 2. Hors périmètre

- La règle de clôture (`undeclaredHooks`, `.githooks/base-checks.mjs`) et le rejeu (QUA-113) : inchangés ; un test
  de `.githooks/` modifié exige toujours sa puce. L'en dispenser changerait QUA-137 et QUA-113 : à noter en intention
  si le demandeur le veut.
- Les puces déjà écrites dans les fiches closes : le journal les garde telles quelles.

## 3. Contraintes

- Reproduire d'abord : le test d'un fichier de test cité seul échoue contre le code actuel (il attend aujourd'hui le
  nom du module, `.githooks/state.test.mjs:2378`).
- Un signalement, jamais un refus de lancement (QUA-137 inchangé sur ce point).
- On édite le gabarit puis `npm run installer-depot` (QUA-018) ; couverture à 100 % des hooks (QUA-004).

## 4. Décisions

- 2026-11-15 (choix de cadrage, le plus sûr, validé par le demandeur) : corriger le message, garder la règle de
  clôture.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — avertissement juste** [IA] : tests en échec d'abord ; nom du fichier cité gardé, message et puce
  proposée ; QUA-137 réécrit ; `npm run installer-depot` ; ligne « Unreleased » du CHANGELOG ; note d'origine
  retirée de `docs/intentions/notes.md`. Critère de sortie : `node .githooks/run-checks.mjs` sans échec,
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-15) : cadrage terminé, contenu validé par le demandeur le 2026-11-15.
- **Prochaine étape** : [humain] `/drwil-start`.

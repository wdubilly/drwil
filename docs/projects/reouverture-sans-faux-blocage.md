# Projet : la réouverture ne bloque plus à tort (intention retirée, test seul vu comme règle)

**Statut** : cadré le 2026-11-06.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : notes du 2026-11-05 (réouverture refusée, intention retirée) et du 2026-11-06 (faux
positif de la barrière) de `docs/intentions/notes.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state-reopen.mjs
  - packages/drwil/templates/common/base/.githooks/detour-rules.mjs
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/docs/recipes/corriger-un-defaut.md
  - .githooks/state-reopen.mjs
  - .githooks/detour-rules.mjs
  - .githooks/detour.mjs
  - .githooks/scope-gate.mjs
  - .githooks/state-messages-fr.mjs
  - .githooks/state-messages-en.mjs
  - docs/ia-first/8-conduct-rules.md
  - docs/recipes/corriger-un-defaut.md
  - .githooks/state.test.mjs
  - .githooks/detour.test.mjs
  - .githooks/scope-gate.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Deux défauts de la réouverture (QUA-116), vus sur de vrais chantiers :

- **Intention retirée** (PR #360, 2026-11-05) : `node .githooks/state.mjs reopen` restaure la fiche
  supprimée par la clôture (`.githooks/state-reopen.mjs:45-63`), mais pas l'intention d'origine que la
  clôture a aussi retirée. La fiche restaurée la cite, le contrôle des chemins cités refuse le commit, et
  la réouverture échoue. Il a fallu restaurer l'intention à la main.
- **Test seul vu comme règle** (PR #366, 2026-11-06) : `RULES` de `.githooks/detour-rules.mjs:5` contient
  `.githooks/*`, qui couvre aussi `.githooks/*.test.mjs`. Un correctif qui ne touche qu'un test attend le
  oui de l'humain (QUA-117), comme un hook. Le même `rulesFiles` sert au détour (QUA-050).

## Critères d'acceptation

- La réouverture restaure, dans le même commit que la fiche, chaque fichier que la fiche cite et que la
  branche a supprimé (l'intention d'origine en tête), et le dit ; un fichier cité supprimé ailleurs que
  sur la branche n'est pas restauré — `QUA-116`
- Un fichier de test (`*.test.mjs`) ajouté ou modifié n'est plus un changement de règle, sauf s'il retire
  un `test(` dont le nom porte l'ID d'un contrat, ou s'il diminue le nombre d'appels `assert` d'un tel
  test : là, le oui de l'humain reste exigé, au détour comme à la réouverture, et le refus nomme le test —
  `QUA-117`

## Contrats modifiés

- `QUA-116` — ancien critère : la réouverture restaure la fiche — raison : elle restaure aussi, dans le
  même commit, les fichiers cités par la fiche que la branche a supprimés (validé par le demandeur le
  2026-11-06)
- `QUA-117` — ancien critère : un hook change les règles du jeu, tests compris (`.githooks/*`) — raison :
  un test ajouté ou corrigé passe ; seul un test de contrat retiré ou affaibli (moins d'`assert`) attend
  le oui (validé par le demandeur le 2026-11-06)
- `QUA-050` — même changement pour le détour, qui partage `rulesFiles` (validé par le demandeur le
  2026-11-06)
- `.githooks/detour-rules.mjs`, `.githooks/detour.mjs`, `.githooks/scope-gate.mjs` — la liste des règles
  exclut les tests, sauf affaiblissement d'un test de contrat ; aucun autre fichier ne sort de la liste
  (validé par le demandeur le 2026-11-06)
- `.githooks/state-reopen.mjs` — restaure aussi les fichiers cités supprimés par la branche ; aucun refus
  existant ne change (validé par le demandeur le 2026-11-06)

## 2. Hors périmètre

- Les tests d'autres langages ou suffixes (`*.test.ts`, `*.spec.*`) : seuls les tests des hooks
  (`.githooks/*.test.mjs`) sont dans `RULES` aujourd'hui.
- Le contrôle des chemins cités lui-même : il garde son refus.

## 3. Contraintes

- Un test affaibli ne doit jamais passer sans le oui : le décompte des `assert` se fait sur le test
  nommé par l'ID, dans le diff du commit en préparation.
- La restauration ne remet que des fichiers supprimés par la branche (`main..HEAD`), jamais un fichier
  absent de la branche principale.

## 4. Décisions

- 2026-11-06 : test ajouté ou corrigé libre, sauf retrait ou affaiblissement d'un test de contrat.
- 2026-11-06 : réouverture qui restaure les fichiers cités supprimés (proposé par l'agent, cause établie
  au cadrage : la fiche restaurée cite une intention que la clôture a retirée).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — restauration des fichiers cités** [IA] : `.githooks/state-reopen.mjs`, messages, tests, QUA-116.
  Critère de sortie : tests de QUA-116 verts.
- **Lot 2 — un test n'est plus une règle** [IA] : `.githooks/detour-rules.mjs`, `.githooks/detour.mjs`, `.githooks/scope-gate.mjs`,
  tests, QUA-117 et QUA-050, règles de conduite et recette. Critère de sortie : tests de QUA-117 et
  QUA-050 verts, `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-06) : cadré, rien de réalisé.
- **Prochaine étape** : [IA] lot 1.

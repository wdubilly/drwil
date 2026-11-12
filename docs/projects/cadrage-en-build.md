# Projet : cadrer de la documentation depuis le dossier d'un chantier en BUILD

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cadrer-pendant-un-chantier.md`

<!-- scope
files:
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate-kit.mjs
  - .githooks/scope-gate-texts.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-kit.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-texts.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/scope-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/docs/ia-first/7-starting-and-closing.md
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le demandeur veut cadrer pendant qu'un agent est en BUILD sur le même poste. Décidé le 2026-11-12 : le cadrage de
documentation est autorisé **dans le dossier du chantier**, sans worktree dédié. Les fiches et intentions créées
ou modifiées voyagent sur la branche du chantier et fusionnent avec sa PR.

## Critères d'acceptation

- En BUILD, la création ou la modification d'une fiche (`docs/projects/`) ou d'une intention
  (`docs/intentions/`) se commite sans être refusée par la barrière de périmètre, et sans changer l'état ni la
  fiche active — `QUA-016`
- Le cadrage commité en BUILD ne couvre ni ne modifie le périmètre du chantier en cours : un fichier de code
  hors de la fiche active reste refusé — `QUA-016`
- Les contrats ne se créent toujours qu'en SCOPING ou par le chantier lui-même (le registre reste refusé en BUILD
  hors périmètre) — `QUA-016`

## 2. Hors périmètre

- Un worktree dédié au cadrage (écarté le 2026-11-12).
- L'index par fiche : `docs/projects/index-par-fiche.md`.
- Le sondage de fin de cadrage et la PR de cadrage séparée : le cadrage rode sur la PR du chantier.

## 3. Contraintes

- Cause avant correctif : lister d'abord ce qui refuse ou gêne aujourd'hui un cadrage en BUILD (barrière de
  périmètre, skill `scope-a-workstream` qui exige SCOPING, rappel de cadrage de `check-docs`), puis ne lever que ce
  qui est nécessaire. La barrière commite déjà les fiches (`.githooks/scope-gate.mjs`) : l'écart est à mesurer.
- Un conflit probable : `docs/projects/pending.md` modifié par le chantier et par le cadrage ; traité par
  `docs/projects/index-par-fiche.md`.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-12 : forme tranchée (cadrage de documentation dans le dossier du chantier), P0 (0.11.2).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — relever et corriger** [IA] : test qui reproduit un cadrage en BUILD refusé, puis correctif de la
  barrière et du skill. Critère de sortie : test rouge avant, vert après ; `node .githooks/run-checks.mjs` sans échec.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] `/drwil-start`.

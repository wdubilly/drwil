# Projet : un chantier se mène dans la session principale, sans sous-agent

**Statut** : cadré le 2026-11-12.
**Risque** : MEDIUM
**Maturité** : prêt
**Intention** : `docs/intentions/retours-du-demandeur-0-11-2.md` (point 7b)

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/docs/ia-first/7-starting-and-closing.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/AGENTS.md
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le skill `start-a-workstream` fait mener chaque chantier, et chaque lot, par un sous-agent neuf. Le demandeur
constate que cela consomme finalement davantage et veut y renoncer : le chantier se mène dans la session
principale. Les lots s'enchaînent toujours par `node .githooks/state.mjs lot next`, la passation passant par les
commits et la section « Reprise » de la fiche.

## Critères d'acceptation

- Le skill de lancement ne demande plus de sous-agent pour mener un chantier ni un lot ; le chantier est mené dans la
  session principale — `QUA-171`
- Les lots d'une fiche s'enchaînent toujours dans l'ordre (`lot next`), un lot [humain] est toujours sauté et rappelé
  à la clôture — `QUA-167`
- Les consignes (`AGENTS.md`, sections 7 et 8 de la doc) ne parlent plus de « un chantier, un sous-agent » — `QUA-171`

## Contrats modifiés

- `QUA-171` — ancien critère : « Le mode d'emploi du lancement dit qu'un sous-agent neuf traite chaque lot, la passation se faisant par les commits et la section « Reprise » » — raison : plus de sous-agent de chantier, le coût mesuré par le demandeur le contredit (validé le 2026-11-12)

## 2. Hors périmètre

- Le sous-agent des contrôles longs (`drwil-checks`, QUA-129, QUA-130, QUA-221) : il garde le contexte de la session propre, hors de cette décision.
- La file parallèle en worktrees (QUA-147, QUA-148), qui demande un sous-agent par worktree : à reprendre à part si le demandeur veut la retirer.
- La mesure de consommation (`docs/projects/consommation-copilot-cli.md`).

## 3. Contraintes

- Décidé le 2026-11-12 : supprimer les sous-agents du skill maintenant, sans mesure préalable.
- Une session par chantier reste de règle (`AGENTS.md`) : une clôture faite, le suivant se lance dans une nouvelle session.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-12 : sous-agents de chantier supprimés ; modification de QUA-171 validée par le demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — skill, consignes, contrat** [IA] : retrait du sous-agent dans le skill, `AGENTS.md` et les sections 7 et 8 ; QUA-171 réécrit ; `npm run installer-depot`. Critère de sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] `/drwil-start`.

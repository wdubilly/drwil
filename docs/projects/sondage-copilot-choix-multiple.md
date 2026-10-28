# Projet : le sondage `/drwil-start` de Copilot CLI propose et lit un choix multiple (file de chantiers)

**Statut** : fait le 2026-10-28.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/sondage-worktree-copilot-cli.md` (partie « sondage parallèle dans Copilot CLI »)

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/test/kit.test.mjs
  - .claude/hooks/start-poll.mjs
  - .claude/hooks/prompt-hook.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Sous Copilot CLI, le sondage de lancement ne propose jamais une file de chantiers
ni le lancement en parallèle, alors que le hook sait les lancer (QUA-037, QUA-147) :

- la consigne du skill `start-a-workstream` ne décrit pour Copilot CLI qu'un champ
  `fiche` à choix unique (`enum`) : l'agent ne pose donc que celui-là ;
- `packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs` repère le champ des fiches par `Array.isArray(p.enum)` : un champ
  à choix multiple de `ask_user` est de type `array` avec ses valeurs dans
  `items.enum`, il ne serait pas reconnu, et le sondage serait refusé ou lu à vide ;
- la forme de la réponse Copilot à un choix multiple n'est pas relevée (valeurs
  séparées par des virgules, ou autre).

Constaté le 2026-10-28 : le demandeur n'a jamais vu la file proposée.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- `packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs` reconnaît, pour Copilot CLI, un champ des fiches à choix multiple
  (type `array`, valeurs dans `items.enum`) comme il reconnaît le champ à choix unique,
  et en tire la liste des options — `QUA-165`
- La réponse Copilot à un choix multiple (forme relevée par un essai réel, consignée
  dans l'intention) est lue comme une file, dans l'ordre des options du sondage
  (`inPollOrder`), les champs `drwil-merge`, `drwil-worktree` et `drwil-parallel`
  restant lus comme avant — `QUA-165`
- Le choix unique d'une fiche continue de fonctionner à l'identique — `QUA-165`
- Le skill dit à l'agent Copilot de poser un champ `fiche` à choix multiple, toujours
  accompagné des champs `drwil-merge`, `drwil-worktree` et (avec au moins deux fiches
  prêtes) `drwil-parallel` — `QUA-165`

## 2. Hors périmètre

- Le sondage de Claude Code : inchangé.
- Le lancement de la file et des worktrees parallèles : déjà fournis par le hook.
- Les autres outils (Gemini CLI…).

## 3. Contraintes

- On n'édite que le gabarit ; la copie du dépôt est régénérée (`npm run installer-depot`).
- Le hook ne remplit jamais de réponse à la place de l'humain (pas de `default`).
- Un essai réel dans Copilot CLI est nécessaire pour la forme de la réponse :
  [humain] à faire avant de figer le contrat de lecture.

## 4. Décisions

(proposées par l'agent, à valider par le demandeur au lancement)

1. Le champ des fiches devient à choix multiple par défaut ; une seule fiche cochée
   reste un lancement simple.

## 5. Points à trancher

- Aucun, hors la forme de la réponse, relevée à l'essai réel.

## 6. Increments

- **Lot 1 — lecture du choix multiple** [IA] : `packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs` et `packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs` (gabarit et copie), tests de `packages/drwil/test/kit.test.mjs` (champ `array`, ordre, champs optionnels, choix unique inchangé) ; contrats et contrôles `tests-qua-<id>` ; ligne « Unreleased » du changelog.
- **Lot 2 — consigne du skill** [IA] : `packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md` du gabarit.
- **Lot 3 — essai réel dans Copilot CLI** [humain] : relever la forme de la réponse et la consigner dans l'intention.

Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-28) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

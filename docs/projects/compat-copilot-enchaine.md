# Projet : 0.6.8, Copilot CLI enchaîne les chantiers sans interruption

**Statut** : cadré le 2026-10-19 (décisions prises par le demandeur).
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .claude/hooks/prompt-hook.mjs
  - .claude/skills/start-a-workstream/SKILL.md
  - .githooks/state.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.test.mjs
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/ia-first.md
  - docs/contracts.md
-->

(cadrage : le sondage et son hook, le skill de lancement, l'état et la
clôture, leurs gabarits livrés, les tests, la doc et les contrats ; la
mesure de consommation de Copilot CLI reste dans son intention.)

## 1. Besoin

Demandé le 2026-10-19 : sous Copilot CLI, enchaîner plusieurs chantiers sans
interruption, comme avec Claude Code. Trois écarts à régler ensemble :

1. Pas de décision de fusion au sondage : la fusion reste manuelle, et un
   agent a déjà programmé `gh pr merge --auto` sans décision du demandeur
   (`docs/intentions/fusion-sans-sondage-copilot.md`).
2. Pas de retour automatique en SCOPING après la fusion : l'état reste en
   CLOSING et il faut `state.mjs move SCOPING` à la main
   (`docs/intentions/etat-revient-en-scoping-apres-fusion.md`).
3. Pas de sous-agent par chantier : le contexte grossit à chaque chantier
   d'une file (`docs/intentions/sous-agent-des-le-premier-chantier.md`).

## Critères d'acceptation

- Le sondage de lancement sous Copilot CLI pose la décision de fusion
  (automatique ou manuelle) et le hook la lit, comme `drwil-merge` sous
  Claude Code ; l'agent ne programme jamais la fusion sans ce choix
  humain — `QUA-037`
- Une fois la PR du chantier fusionnée, l'état revient en SCOPING sans
  geste du demandeur, quel que soit l'outil — `QUA-037`
- Un chantier est mené dans un sous-agent à contexte neuf : la session
  principale ne garde que le compte rendu et les décisions humaines — `QUA-037`
- Un essai sous Copilot CLI réel enchaîne deux fiches prêtes d'un seul
  sondage et s'arrête au premier blocage humain — [humain] `QUA-037`

## 2. Hors périmètre

- La mesure de consommation de Copilot CLI
  (`docs/intentions/consommation-autres-outils.md`).
- Codex, Cursor, Gemini CLI (sondage et sous-agents : voir
  `docs/intentions/file-sous-agents-autres-outils.md`).
- La cohérence de la documentation à la clôture.

## 3. Contraintes

- La décision de fusion reste humaine, lue par le hook, jamais posée par
  l'agent, même en mode agent.
- Le sondage ne contient ni réponse ni valeur par défaut (le hook le refuse).
- On n'édite que le gabarit livré et son miroir déclaré (`miroirs-gabarit`).
- Ne jamais écrire `.drwil/state.json` (si présent) à la main ; les transitions
  restent voisines (QUA-019 : aucun contrôle contourné).

## 4. Décisions

- 2026-10-19 (demandeur) : la fusion se décide au sondage de lancement, par
  un champ de plus dans le formulaire `ask_user`, comme `drwil-merge` sous
  Claude Code.
- 2026-10-19 (demandeur) : le retour en SCOPING se fait au prochain `start`,
  seul, quand la PR du chantier est fusionnée (vérifié par `gh`), sans
  demander.
- 2026-10-19 (demandeur) : le sous-agent est utilisé toujours, même pour un
  chantier d'une ligne.
- 2026-10-19 (demandeur) : quand le sous-agent a besoin de l'humain, il
  s'arrête avec un compte rendu ; la session principale interroge l'humain
  puis reprend le chantier.
- À vérifier par un essai au lot 3, avant de s'y fier : les sous-agents de
  Copilot CLI portent-ils les hooks et l'état ? Sinon, le lot s'arrête et
  la limite devient une intention.

## 5. Lots

- **Lot 1 — décision de fusion** : formulaire, lecture par le hook, état
  (`auto_merge`), consigne du skill, tests.
- **Lot 2 — retour en SCOPING** : transition après fusion, tests.
- **Lot 3 — sous-agent dès le premier chantier** : skill et consigne,
  essai réel sous Copilot CLI, doc.

## 6. Reprise

- **Dernier état** (2026-10-19) : cadré, décisions prises ; rien de commencé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

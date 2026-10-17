# Projet : le sondage de lancement marche dans tous les cas — un seul brief, et jamais muet

**Statut** : cadré le 2026-10-17.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - .claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/CHANGELOG.md
-->

(cadrage : le hook du sondage et la skill `/drwil-start`, gabarit et
copies du dépôt, le test du paquet, le changelog.)

## 1. Besoin

Constaté le 2026-10-17 sur `drwil_com` (projet du pilote, installé en
0.6.1), en lançant le premier chantier par `/drwil-start` :

1. **Un seul brief cadré : le sondage ne s'ouvre pas.** La skill
   (étape 3) propose une option par brief ; avec un seul brief, la
   première question n'en a qu'une. `AskUserQuestion` exige au moins deux
   options : l'appel entier est rejeté (« InputValidationError … fewer
   than 2 options »), l'humain ne voit rien. C'est le cas de tout projet
   neuf à son premier chantier.
2. **Le hook ne dit rien quand il n'agit pas.** Au premier essai, le
   sondage a été répondu (fiche + « Automatic merge ») et l'état est
   resté en SCOPING sans aucun message : `.claude/hooks/prompt-hook.mjs` sort en
   silence quand il ne lit pas de réponse ou qu'une erreur survient
   (`return 0`, `catch` muet). L'agent ne peut que supposer la cause.

Le seul repli restant est `node .githooks/state.mjs start` dans un
terminal interactif.

## Critères d'acceptation

- Avec un seul brief cadré, la skill ouvre quand même le sondage : la
  première question ajoute l'option « Pas maintenant » / « Not now » (un
  vrai choix : ne rien lancer) ; le hook la comprend, ne change pas l'état
  et le dit ; prouvé par le test du sondage — `QUA-037`
- Le hook de sondage n'est jamais muet sur un sondage `drwil-start` : sans
  réponse lue, ou sur une erreur (état inchangé, outil jamais bloqué), il
  rend à l'agent un message `[drwil]` qui dit ce qui s'est passé et le
  repli (`node .githooks/state.mjs start` dans un terminal) ; prouvé par
  le test — `QUA-037`
- Le changelog (« Unreleased ») dit les deux changements — `QUA-040`

## Contrats modifiés

Aucun : QUA-037 (une file de chantiers décidée d'un geste) garde sa règle
(sondage lu par le hook, jamais par l'agent) ; ses tests couvrent les deux
nouveaux cas.

## 2. Hors périmètre

- Les hooks qui ne se chargent pas dans une session ouverte avant `init`
  (Claude Code lit les hooks au démarrage) : hypothèse non prouvée sur
  `drwil_com`, à vérifier en relançant la session ; si elle se confirme,
  une phrase dans la doc d'installation, en fiche à part.
- La racine du projet lue par les hooks
  (`docs/intentions/hooks-racine-du-projet.md`).
- Copilot CLI : son `ask_user` accepte un seul choix ; rien ne change.
- La version : la release qui embarquera ce chantier se décide à part
  (recette `docs/recipes/create-a-release.md`).

## 3. Contraintes

- « Pas maintenant » n'est jamais recommandé ni présélectionné : la
  recommandation reste le premier brief prêt.
- Un message d'erreur ne bloque jamais l'outil (code de sortie 0) et ne
  change jamais l'état ; la barrière Git reste.

## 4. Décisions

- 2026-10-17 (demandeur) : une fiche pour les deux défauts du sondage.
- Proposé par l'agent : « Pas maintenant » seulement quand un seul brief
  est cadré, pour garder quatre briefs au plus sinon.

## 5. Lots

- **Lot 1** : hook (option « Pas maintenant », messages sans réponse et
  sur erreur), skill (cas d'un seul brief), tests, changelog ; PR.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.

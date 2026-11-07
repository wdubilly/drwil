# Projet : une attestation humaine se propose d'abord par le sondage dans le chat, le terminal en repli

**Statut** : cadré le 2026-11-06.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : notes du 2026-11-05 et du 2026-11-06 de `docs/intentions/notes.md` (sondage refusé en réel,
commande de terminal relayée seule, aucune recette du sondage)

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/attest-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/agents/drwil-checks.md
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/recipes/attest-a-contract.md
  - packages/drwil/templates/common/base/docs/ia-first/5-proving-the-work.md
  - packages/drwil/templates/common/base/docs/ia-first/7-governance-state.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/src/agent.ts
  - packages/drwil/src/verdict-texts.ts
  - .claude/hooks/attest-poll.mjs
  - .claude/skills/drwil/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - .claude/agents/drwil-checks.md
  - AGENTS.md
  - docs/recipes/attest-a-contract.md
  - docs/ia-first/5-proving-the-work.md
  - docs/ia-first/7-governance-state.md
  - docs/ia-first/8-conduct-rules.md
  - .githooks/state-messages-fr.mjs
  - .githooks/state-messages-en.mjs
  - .githooks/state-context-texts.mjs
  - docs/projects/kit-mechanics.md
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/attest-guidance.test.mjs
  - .githooks/state.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/features.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le kit sait faire attester un contrat `MANUAL` par un sondage dans le chat (`drwil attest-poll`, hook
`.claude/hooks/attest-poll.mjs`, QUA-235 et QUA-236). Mais :

- **le sondage est refusé en réel** : le 2026-11-05, sur QUA-067, la préparation passe en `PreToolUse`,
  puis la confirmation en `PostToolUse` refuse malgré « Attester ». Cause probable, non prouvée : Claude
  Code ajoute la réponse dans `tool_input` après l'affichage, alors que le hook exige un `tool_input`
  identique à la préparation (une seule clé, sérialisation égale). Les tests rejouent un `tool_input`
  inchangé et ne le voient pas ;
- **rien ne propose le sondage** : `drwil verify --agent`, les messages d'état, le skill `drwil`, la règle
  « Human gestures » et la consigne du sous-agent `drwil-checks` ne donnent que `drwil attest <ID>` au
  terminal. Le 2026-11-06, six attestations ont été faites au terminal ;
- **aucune recette** ne décrit comment préparer et poser le sondage.

Le demandeur veut que ce soit une règle du kit, pas une mémoire de l'agent : le sondage d'abord, le
terminal en repli.

## Critères d'acceptation

- Le sondage `drwil-attest` répondu « Attester » dans Claude Code enregistre l'attestation, avec la
  forme réelle du retour de l'outil (réponse ajoutée à `tool_input` comprise), et refuse toujours une
  réponse préremplie, un défaut, une recommandation ou un sondage modifié — `QUA-235`
- Quand une attestation humaine est attendue, `drwil verify --agent`, les messages de l'état, le skill
  `drwil`, les règles de conduite et la consigne de `drwil-checks` proposent d'abord le sondage dans le
  chat (préparation `drwil attest-poll <ID> --tried …`, recette `attest-a-contract`), puis le terminal
  `drwil attest <ID>` en repli ; aucun de ces textes ne donne le terminal comme seule voie — `QUA-267`
- La recette `attest-a-contract` dit, pour chaque outil qui a un sondage, comment le préparer et le
  poser, sans réponse préremplie ni recommandation ; `AGENTS.md` et le skill de lancement y renvoient —
  `QUA-267`

## Contrats modifiés

- `QUA-235` — seulement si la cause établie au lot 1 l'exige : la confirmation compare la question
  préparée, pas un `tool_input` que l'outil complète après l'affichage ; la règle « seul
  `tool_response.answers` confirme » est inchangée (à faire valider par le demandeur avant toute
  modification du texte du contrat)
- `.githooks/state-messages-fr.mjs` — le message du verdict `MANUAL` propose le sondage, puis
  `npx drwil attest <ID>` en repli ; aucun autre message modifié (validé par le demandeur le 2026-11-06)
- `.githooks/state-messages-en.mjs` — même changement, en anglais (validé par le demandeur le 2026-11-06)
- `.githooks/state-context-texts.mjs` — le rappel de VERIFY dit « sondage d'attestation dans le chat,
  sinon `npx drwil attest` » ; aucun autre rappel modifié (validé par le demandeur le 2026-11-06)

## 2. Hors périmètre

- Les essais réels de Copilot CLI, Gemini CLI, Codex et Cursor : intention
  `docs/intentions/attestation-chat-essais-reels.md`. La recette décrit leur sondage tel que QUA-235 le
  définit, sans prétendre à un essai réel.
- Détecter l'outil qui a lancé `verify` : la sortie donne les deux voies dans tous les cas (décision du
  2026-11-06).
- Le verdict de recette d'une release (`.githooks/release-verdict.mjs`) : il reste un geste au terminal.
- Toute écriture d'attestation par l'agent : la frontière humain/agent de QUA-235 est inchangée.

## 3. Contraintes

- Cause avant correctif : le lot 1 commence par reproduire le refus en réel dans Claude Code (un
  contrat `MANUAL` fictif sur un projet jetable) et par capturer le `tool_input` et le `tool_response`
  réels du `PostToolUse` ; le test rejoue cette forme capturée, sans aucune donnée nominative.
- Le hook ne doit rien perdre en sûreté : toute clé ajoutée par l'agent avant l'affichage reste refusée en
  `PreToolUse` ; seule la clé ajoutée par l'outil après réponse est tolérée en `PostToolUse`, et jamais
  lue comme une réponse.
- `AGENTS.md` du gabarit tient en 100 lignes (QUA-153) : une ligne de table pour la recette, au plus.
- Ce qu'un humain lit d'abord reste en anglais ; recette, skill et règles du gabarit sont en anglais
  comme leurs voisins.

## 4. Décisions

Tranchées par le demandeur le 2026-11-06 :

- **Défaut du hook** : inclus dans ce chantier, en lot 1, avant de proposer le sondage.
- **Sortie de `verify --agent`** : dans tous les cas, d'abord le sondage dans le chat (préparation et
  renvoi à la recette), puis le terminal en repli ; pas de détection de l'outil.
- **Preuve** : un contrat avec un test en dur sur les textes et la sortie, pas une attestation de
  lisibilité.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — le sondage confirme en réel** [IA] : reproduire, établir la cause, corriger
  `.claude/hooks/attest-poll.mjs` et son gabarit, test sur la forme réelle du retour. Critère de sortie :
  tests de QUA-235 verts, une attestation fictive enregistrée par le sondage dans une vraie session.
- **Lot 2 — le sondage d'abord, partout** [IA] : `verify --agent`, messages et rappels d'état, skills,
  règles, consigne de `drwil-checks`, recette `attest-a-contract`, contrat et son test. Critère de sortie :
  tests du nouveau contrat verts, `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-07) : lot 1 codé. Cause établie sur les trois refus réels (QUA-067 le
  2026-11-05, QUA-013 et QUA-048 le 2026-11-07, transcriptions locales) : réponse « Attester » présente
  et bien indexée, questions retournées identiques, refus sans erreur de lecture de la préparation ; le
  schéma de `AskUserQuestion` (Claude Code 2.1.319) déclare `answers` (« collected by the permission
  component ») et `annotations`, ajoutés à `tool_input` après l'affichage. Le hook exigeait
  `Object.keys(tool_input).length === 1` et un `tool_input` égal à la préparation. Correctif : ces deux
  clés tolérées en `PostToolUse` seulement, jamais lues ; seule `questions` est comparée ; toute autre
  clé refusée. Test rejouant la forme réelle, tests de QUA-235 verts. Texte de QUA-235 inchangé (la cause
  ne l'exige pas).
- **Lot 1 fait** : attestation réelle de QUA-236 enregistrée par le sondage (origine `claude-poll`).
- **Lot 2 codé** (2026-11-07) : contrat QUA-267 et son test en dur
  (`packages/drwil/test/attest-guidance.test.mjs`, contrôle `tests-qua-267`) ; `verify --agent`
  (`ATTEST_STEPS`), sortie humaine de `verify`, message `MANUAL` et rappel de VERIFY de l'état, skills
  `drwil` et `start-a-workstream`, règle « Human gestures », consigne de `drwil-checks`, `AGENTS.md`,
  documents de preuve et d'état, nouvelle recette `docs/recipes/attest-a-contract.md`.
- **Prochaine étape** : [IA] vérifier (`run-checks`, `verify --agent`) puis clore.

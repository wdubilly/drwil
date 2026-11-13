# Projet : le refus du sondage d'attestation dit sa cause et se rejoue

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/audit-risques.md` (RSK-2, RSK-8, RSK-9) et `docs/decouverte-valeur.md` (OPT-3), scans du
2026-11-12 ; `docs/intentions/essais-reels-en-attente.md` (partie « ex-attestation-chat-essais-reels »)

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/attest-poll.mjs
  - .claude/hooks/attest-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .claude/settings.json
  - packages/drwil/test/claude-hooks.test.mjs
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

L'attestation depuis le chat (QUA-267) retombe au terminal sans explication : le 2026-11-12, deux sondages
préparés (QUA-067, QUA-092) ont été refusés « sans raison lisible », puis attestés au terminal. Vérifié dans
`.claude/hooks/attest-poll.mjs` le 2026-11-13 :

- **Un seul message pour toutes les causes (RSK-2)** : champ ajouté, plusieurs questions, recommandation, résumé
  différent de la préparation, préparation absente ou expirée, réponse illisible et refus volontaire de l'humain
  rendent le même texte `refused` ; aucune charge utile n'est gardée pour comprendre.
- **Filtre de recommandation trop large (RSK-9)** : « (recommandé) » est cherché dans tout le sondage, résumé du
  contrat et essai de l'agent compris ; un contrat qui cite le mot fait refuser son propre sondage.
- **Contrôles relancés sans délai déclaré (RSK-8)** : le hook relance `verify` sur le contrat en PreToolUse et
  PostToolUse, sans `timeout` sur ses entrées de `.claude/settings.json`.

## Critères d'acceptation

- Chaque refus nomme sa cause parmi : champ inattendu (avec ses clés), plusieurs questions, recommandation (avec
  l'option fautive), résumé différent de la préparation (avec la première ligne qui diffère), préparation absente,
  préparation expirée, réponse illisible, refus choisi par l'humain, preuve ou couverture changée ; et ce qu'il faut
  refaire — `QUA-235`
- Le refus choisi par l'humain se dit comme tel, distinct d'un refus de forme — `QUA-235`
- La dernière charge utile refusée est écrite sous `.drwil/evidence/` (sans secret ni donnée nominative), assez pour
  la rejouer dans un test — `QUA-235`, `SEC-007`
- La recommandation n'est cherchée que dans les libellés et descriptions des options — `QUA-235`
- Les entrées `AskUserQuestion` du hook dans `.claude/settings.json` (gabarit et dépôt) déclarent un `timeout`
  suffisant pour la relance de `verify` — `QUA-235`
- Tests : un par cause de refus ; un sondage dont le résumé contient « (recommandé) » est accepté ; une charge
  utile au format réel de Claude Code (PostToolUse `AskUserQuestion`) est rejouée — `QUA-235`

## Contrats modifiés

- `QUA-235` — ancien critère : « Le hook ou client dédié refuse avant affichage tout champ ajouté, réponse remplie, défaut, recommandation, choix multiple ou résumé différent du moteur » — raison : chaque refus nomme sa cause et la dernière charge refusée est gardée pour la rejouer ; la recommandation n'est cherchée que dans les options ; le hook Claude Code déclare un délai (validé le 2026-11-13)

## 2. Hors périmètre

- Les adaptateurs de Copilot CLI, Gemini CLI, Codex et le client ACP de Cursor (`.claude/hooks/portable-attest.mjs`,
  `.claude/hooks/attest-adapters.mjs`, `packages/drwil/src/cursor-acp.ts`) : à aligner à part si le défaut s'y retrouve.
- Le moteur d'attestation (`packages/drwil/src/attest.ts`) et le format de l'attestation version 4.
- Un essai interactif réel (`docs/intentions/essais-reels-en-attente.md` (partie « ex-attestation-chat-essais-reels »)).

## 3. Contraintes

- Reproduire d'abord : un test par cause, en échec contre le code actuel (le message générique ne nomme rien).
- La frontière humain/agent reste entière : seul `tool_response.answers` confirme (QUA-235) ; un message plus
  précis ne donne jamais à l'agent de quoi confirmer à la place de l'humain.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-13 : RSK-2, RSK-8 et RSK-9 de l'audit et OPT-3 du scan de valeur réunis dans cette fiche, placée dans la
  file du jour.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — causes de refus et charge rejouable** [IA] : tests en échec d'abord ; messages par cause, charge gardée,
  filtre restreint aux options, `timeout` des entrées ; QUA-235 réécrit ; `npm run installer-depot` ; ligne
  « Unreleased » du CHANGELOG. Critère de sortie : `node .githooks/run-checks.mjs` sans échec,
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`.

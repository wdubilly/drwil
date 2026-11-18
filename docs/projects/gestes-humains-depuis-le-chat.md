# Projet : tout geste humain se fait aussi depuis le chat, et l'attestation se fait par lot

**Statut** : cadré le 2026-11-18.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (note du 2026-11-07, « Gestes humains depuis le chat », rangée en 0.13.0,
avancée en 0.11.2 P0 par le demandeur le 2026-11-18) ; `docs/intentions/sondage-worktree-copilot-cli.md` (partie
« ex-sondages-lus-sous-copilot-cli »)

<!-- scope
files:
  - packages/drwil/src/cli-attest.ts
  - packages/drwil/templates/common/tools/claude/.claude/hooks/attest-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/attest-adapters.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/portable-attest.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/portable-polls.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/create-a-release/SKILL.md
  - packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json
  - packages/drwil/templates/common/base/.githooks/state-acceptance.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-transitions.mjs
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - packages/drwil/templates/common/base/.githooks/detour-texts.mjs
  - packages/drwil/templates/common/optional/create-release/release-verdict.mjs
  - packages/drwil/templates/common/base/docs/recipes/attest-a-contract.md
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md
  - .claude/hooks/attest-poll.mjs
  - .claude/hooks/attest-adapters.mjs
  - .claude/hooks/portable-attest.mjs
  - .claude/hooks/portable-polls.mjs
  - .claude/hooks/prompt-hook.mjs
  - .claude/settings.json
  - .claude/skills/drwil/SKILL.md
  - .claude/skills/create-a-release/SKILL.md
  - .github/hooks/drwil.json
  - .githooks/state-acceptance.mjs
  - .githooks/state-cli.mjs
  - .githooks/state-transitions.mjs
  - .githooks/detour.mjs
  - .githooks/detour-texts.mjs
  - .githooks/release-verdict.mjs
  - .githooks/detour.test.mjs
  - .githooks/release-verdict.test.mjs
  - .githooks/state-cli-process.test.mjs
  - .githooks/state.test.mjs
  - docs/recipes/attest-a-contract.md
  - docs/recipes/create-a-release.md
  - docs/ia-first/6-limits-and-tool-compatibility.md
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/test/kit-attestation.test.mjs
  - packages/drwil/test/portable-attest.test.mjs
  - packages/drwil/test/portable-polls.test.mjs
  - docs/contracts.md
  - docs/intentions/notes.md
  - docs/intentions/sondage-worktree-copilot-cli.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Aujourd'hui, une partie des gestes humains se fait déjà dans le chat sous Claude Code, par un sondage que seul le
hook lit (QUA-235) : l'attestation (`drwil-attest`), le lancement et la file (`/drwil-start`), la réponse à une
limite (`drwil-limite`). Les autres exigent encore un terminal interactif à part (relevé le 2026-11-18) :

- **l'acceptation des critères** : `node .githooks/state.mjs accept`, refusée hors terminal
  (`.githooks/state-acceptance.mjs:121`) ;
- **le verdict de recette** d'une candidate : `node .githooks/release-verdict.mjs`, refusé hors terminal
  (`.githooks/release-verdict.mjs:113`) ;
- **les transitions réservées à l'humain** (`SCOPING>EXPECTATION`, `REQUEST>BUILD`,
  `.githooks/state-evidence.mjs:12`), hors réglage « transitions : agent » : refusées hors terminal
  (`.githooks/state-transitions.mjs:168`) ;
- **le oui de l'humain** à un détour ou à un correctif de réouverture qui change les règles :
  `node .githooks/detour.mjs allow`, refusé hors terminal (`.githooks/detour.mjs:87`).

Le demandeur doit donc quitter le chat pour un terminal à chacun de ces gestes. Par ailleurs, `drwil attest` et
`drwil attest-poll` ne prennent qu'un seul ID (`packages/drwil/src/cli-attest.ts:12`, `:36`) et le sondage n'en
porte qu'une question : attester plusieurs contrats demande autant de sondages.

Sous Copilot CLI, la réponse à un sondage posé par `ask_user` n'est pas toujours lue par le hook (intention
`docs/intentions/sondage-worktree-copilot-cli.md`, cause non trouvée) : ces gestes doivent y marcher aussi.

## Critères d'acceptation

- `drwil attest-poll ID1 ID2 …` prépare un seul sondage à choix multiple : une option par ID, avec ce qu'il désigne
  et l'essai déclaré ; chaque ID coché par l'humain est attesté séparément, avec sa propre empreinte de preuve ; un ID
  non coché n'est pas attesté ; un ID dont la preuve change pendant la question est refusé seul, cause dite —
  `QUA-235`
- `drwil attest ID1 ID2 …` au terminal pose la même question ID par ID, en un passage ; un ID refusé n'empêche pas
  les autres — `QUA-235`
- L'acceptation des critères se fait par un sondage `drwil-accept` préparé par l'outil et lu par le hook : seule la
  réponse de l'humain dans le retour de l'outil l'écrit ; l'agent n'a aucun chemin pour l'écrire lui-même (réponse en
  argument, stdin redirigé, fichier) — `QUA-175`
- Le verdict de recette d'une candidate se donne par un sondage `drwil-verdict` lu par le hook, enregistré sur la
  candidate comme au terminal — `QUA-053`
- Une transition réservée à l'humain et le oui au détour ou au correctif de réouverture se donnent par un sondage
  (`drwil-move`, `drwil-detour`) lu par le hook, sans terminal — `QUA-117`
- Chaque sondage préparé refuse, cause dite, ce que refuse déjà celui de l'attestation : préparation absente ou
  expirée, option recommandée, champ inattendu, résumé modifié, réponse illisible ; le terminal reste possible pour
  chaque geste — `QUA-235`
- Sous Copilot CLI, ces sondages et celui de l'attestation sont lus par le hook ; la cause de la lecture manquée est
  trouvée et corrigée, ou dite si elle tient à l'outil ; la matrice de compatibilité le dit avec sa date d'essai —
  `QUA-063`
- Tests : un test par sondage (réponse humaine acceptée, chaque refus), attestation par lot (tout coché, rien coché,
  coché en partie, preuve changée pour un seul ID), forme de réponse Copilot CLI ; en échec contre le code actuel —
  `QUA-235`

## Contrats modifiés

- `QUA-235` — ancien critère : un sondage préparé pour un seul ID, attestation seule — raison : le même mécanisme
  porte l'attestation par lot et les autres gestes humains (validé par le demandeur le 2026-11-18)
- `QUA-175` — ancien critère : acceptation des critères au seul terminal interactif — raison : aussi par le sondage du
  chat, lu par le hook, toujours sans chemin pour l'agent (validé par le demandeur le 2026-11-18)
- `QUA-053` — ancien critère : verdict de recette au terminal — raison : aussi par le sondage du chat (validé par le
  demandeur le 2026-11-18)
- `QUA-117` — ancien critère : le oui de l'humain au terminal — raison : aussi par le sondage du chat (validé par le
  demandeur le 2026-11-18)
- `QUA-063` — ancien critère : sondages de Copilot CLI marqués selon l'essai du 2026-10-26 — raison : la matrice dit
  l'essai réel de ces sondages sous Copilot CLI (validé par le demandeur le 2026-11-18)
- `.githooks/state-acceptance.mjs` — l'acceptation des critères lit aussi la réponse au sondage du chat (lot 2, QUA-175)
  (validé par le demandeur le 2026-11-18)
- `.githooks/state-cli.mjs` — la préparation des sondages des gestes humains faits depuis le chat (lots 2 et 4)
  (validé par le demandeur le 2026-11-18)
- `.githooks/state-transitions.mjs` — les transitions humaines faites depuis le sondage du chat (lot 4) (validé par le
  demandeur le 2026-11-18)
- `.githooks/detour.mjs` — le oui de l'humain au détour depuis le chat (lot 4, QUA-117) (validé par le demandeur le
  2026-11-18)
- `.githooks/detour-texts.mjs` — les textes du oui au détour depuis le chat (lot 4, QUA-117) (validé par le demandeur
  le 2026-11-18)
- `.githooks/release-verdict.mjs` — le verdict de recette depuis le chat (lot 3, QUA-053) (validé par le demandeur le
  2026-11-18)
- `.githooks/detour.test.mjs` — couvre le oui au détour depuis le chat (validé par le demandeur le 2026-11-18)
- `.githooks/release-verdict.test.mjs` — couvre le verdict de recette depuis le chat (validé par le demandeur le
  2026-11-18)
- `.githooks/state-cli-process.test.mjs` — couvre les sondages préparés par l'interface de l'état (validé par le
  demandeur le 2026-11-18)
- `.githooks/state.test.mjs` — couvre l'acceptation et les transitions depuis le chat (validé par le demandeur le
  2026-11-18)

## 2. Hors périmètre

- Les choix posés à l'installation (`drwil install` : outils, CI, écarts) : ils ont lieu avant que l'agent et ses
  hooks soient en place.
- Gemini CLI, Codex et Cursor : ils suivent `docs/intentions/essais-reels-en-attente.md` ; le traducteur
  `.claude/hooks/portable-polls.mjs` peut recevoir les nouvelles marques sans essai réel, la matrice les dit alors « not tested ».
- Le sondage parallèle (plusieurs worktrees) sous Copilot CLI : décision 0.13.0, inchangée.

## 3. Contraintes

- Garde-fou : l'agent ne peut jamais répondre lui-même au sondage ni écrire le geste par un autre chemin (QUA-175,
  QUA-235) ; chaque nouveau sondage reprend la préparation et les refus de `.claude/hooks/attest-poll.mjs`, sans les recopier
  (module partagé).
- Le terminal reste possible pour chaque geste ; son comportement ne change pas.
- Plafond de 200 lignes par fichier (QUA-001) : `.githooks/release-verdict.mjs` est à 188 lignes, `.githooks/state-acceptance.mjs` à 155 ;
  la lecture des sondages va dans un module ajouté si besoin (à ajouter au bloc `scope`).
- On édite le gabarit puis `npm run installer-depot` (QUA-018) ; couverture à 100 % des hooks (QUA-004).

## 4. Décisions

- 2026-11-18 (demandeur) : P0, premier chantier de la 0.11.2 ; tous les gestes encore au terminal, sauf
  l'installation ; Claude Code et Copilot CLI ; attestation par lot en un sondage à choix multiple.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — attestation par lot** [IA] : `attest` et `attest-poll` à plusieurs ID, sondage à choix multiple, une
  attestation par ID coché ; QUA-235 réécrit ; recette `docs/recipes/attest-a-contract.md`.
- **Lot 2 — acceptation des critères dans le chat** [IA] : sondage `drwil-accept`, module de sondage partagé ;
  QUA-175 réécrit.
- **Lot 3 — verdict de recette dans le chat** [IA] : sondage `drwil-verdict` ; QUA-053 réécrit ; recette
  `docs/recipes/create-a-release.md`.
- **Lot 4 — transitions humaines et oui au détour dans le chat** [IA] : sondages `drwil-move`, `drwil-detour` ;
  QUA-117 réécrit.
- **Lot 5 — Copilot CLI** [IA] puis [humain] : reproduire la lecture manquée (forme de la réponse `ask_user`, hooks
  actifs), corriger ; essai réel [humain] de chaque sondage sous Copilot CLI ; QUA-063 et la matrice.
- Chaque lot : `npm run installer-depot` ; ligne « Unreleased » du CHANGELOG ; critère de sortie
  `node .githooks/run-checks.mjs` sans échec et `drwil verify --agent` en `GOVERNANCE: PASS`. À la fin : note du
  2026-11-07 retirée de `docs/intentions/notes.md`, partie Copilot de l'intention mise à jour.

## 7. Reprise

- **Dernier état** (2026-11-18) : cadrage terminé, contenu validé par le demandeur le 2026-11-18.
- **Prochaine étape** : [humain] `/drwil-start`.

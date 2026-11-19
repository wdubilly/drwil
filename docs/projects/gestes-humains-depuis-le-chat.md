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
  - packages/drwil/src/attest.ts
  - packages/drwil/src/attest-texts.ts
  - packages/drwil/templates/common/tools/claude/.claude/hooks/attest-batch.mjs
  - .claude/hooks/attest-batch.mjs
  - docs/architecture.md
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prepared-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/accept-poll.mjs
  - packages/drwil/templates/common/base/.githooks/state-polls.mjs
  - .claude/hooks/prepared-poll.mjs
  - .claude/hooks/accept-poll.mjs
  - .githooks/state-polls.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
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
  - packages/drwil/templates/common/optional/create-release/release-verdict-poll.mjs
  - packages/drwil/templates/common/optional/create-release/README.md
  - packages/drwil/templates/common/tools/claude/.claude/hooks/verdict-poll.mjs
  - .githooks/release-verdict-poll.mjs
  - .claude/hooks/verdict-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/move-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/detour-poll.mjs
  - .claude/hooks/move-poll.mjs
  - .claude/hooks/detour-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/copilot-polls.mjs
  - .claude/hooks/copilot-polls.mjs
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

- **Dernier état** (2026-11-19) : lots 1 (attestation par lot), 2 (acceptation des critères dans le chat), 3
  (verdict de recette dans le chat) et 4 (transitions humaines et oui au détour dans le chat) faits.
  - Lot 1 : `drwil attest-poll ID1 ID2 …` (Claude Code, 4 ID au plus) prépare un sondage `drwil-attest` à choix
    multiple, une option par ID ; le hook atteste chaque ID coché à part (`.claude/hooks/attest-batch.mjs`) ;
    `drwil attest ID1 ID2 …` au terminal (`attestEach`, `packages/drwil/src/cli-attest.ts`). QUA-235 réécrit.
  - Lot 2 : socle partagé `.claude/hooks/prepared-poll.mjs` (`pollDifference`, `readPoll`, `yesOrRefusal`, trace
    refusée, `preparedPollHook` : préparation refaite en PreToolUse et liée à session + appel sous
    `.drwil/evidence/<nom>s/`, consommée une fois, une heure au plus, réponse lue dans `tool_response.answers`
    seulement, chaque refus nommé ; un sondage = un `spec` { header, pattern, name, texts, load, prepare, confirm }).
    `.claude/hooks/attest-poll.mjs` n'est plus que le `spec` de l'attestation (≈ 70 lignes). Acceptation :
    `node .githooks/state.mjs poll accept` (`.githooks/state-polls.mjs`, table `POLLS`, n'écrit rien) imprime le
    sondage `drwil-accept` préparé par `acceptancePoll` (`.githooks/state-acceptance.mjs`, 198 lignes) ;
    `.claude/hooks/accept-poll.mjs` le lit et seul appelle `acceptFromPoll` (fiche active et empreinte des critères
    inchangées, sinon refus « critères ou chantier actif changés »). `accept` sans terminal renvoie au sondage.
    Réglages : `Bash(node .githooks/state.mjs poll:*)` autorisé. QUA-175 réécrit (champ « Modifié »), QUA-235 cite
    `.claude/hooks/prepared-poll.mjs` en source. Tests : `.githooks/state.test.mjs` (préparation, `acceptFromPoll`, recensement
    étendu : `acceptFromPoll` appelé par le seul hook) ; `packages/drwil/test/claude-hooks.test.mjs`, deux tests
    « QUA-235 : sondage drwil-accept (QUA-175) … » (nommés QUA-235 : le contrôle `tests-qua-175` ne lit que
    `.githooks/state.test.mjs`).
  - Lot 3 : verdict de recette dans le chat. `node .githooks/release-verdict-poll.mjs <vX.Y.Z-rc.N> <options du
    terminal>` (module optionnel de release, n'écrit rien) imprime le sondage `drwil-verdict` : première ligne
    `drwil-verdict <tag> <JSON des arguments, ordre canonique>` (le hook refait la préparation depuis elle), verdict,
    points cités et leur libellé, note. `.claude/hooks/verdict-poll.mjs` (un `spec` du socle, branché dans
    `.claude/hooks/prompt-hook.mjs`) seul appelle `verdictFromPoll` : mêmes contrôles qu'au terminal, fiche de la candidate
    inchangée (empreinte sha256), puis la même écriture (`check` / `write` sortis de `record` dans
    `.githooks/release-verdict.mjs`, 197 lignes). `ctx.run` (gh simulé) n'est passé que par les tests. Réglages :
    `Bash(node .githooks/release-verdict-poll.mjs:*)` autorisé. QUA-053 réécrit (champ « Modifié »). Recette
    `docs/recipes/create-a-release.md` (gabarit et dépôt), README du module, skill `create-a-release`, carte. Tests :
    `.githooks/release-verdict.test.mjs` (3 tests QUA-053) ; `packages/drwil/test/claude-hooks.test.mjs`, deux tests
    « QUA-235 : sondage drwil-verdict (QUA-053) … ».
  - Lot 4 : transitions humaines et oui au détour dans le chat (QUA-117 réécrit, champ « Modifié »).
    `node .githooks/state.mjs poll move <ACTIVITE> [--brief …] [--request …]` imprime le sondage `drwil-move`
    (`movePoll`, `.githooks/state-polls.mjs` ; première ligne `drwil-move <ACTIVITE> <JSON {brief, request}>`, refaite
    par le hook ; refusé, cause dite, pour une transition interdite ou que l'agent fait seul) ; le hook
    `.claude/hooks/move-poll.mjs` seul appelle `moveFromPoll` (état — activité, `since`, fiche — inchangé, sinon refus
    « état de gouvernance changé »), qui passe `{ human: true }` à `move` (`.githooks/state-transitions.mjs`, 199
    lignes) ; le refus hors terminal ajoute le sondage (`moveHint`, import dynamique). `node .githooks/state.mjs poll
    detour` imprime le sondage `drwil-detour` (`detourPoll`, `.githooks/detour.mjs`, textes dans
    `.githooks/detour-texts.mjs`) ; le hook `.claude/hooks/detour-poll.mjs` seul appelle `allowFromPoll` (le même détour
    ou la même réouverture l'attend encore). `allow` et `allowFromPoll` partagent `awaited` / `grant`. Tests :
    `.githooks/state.test.mjs` (préparation, `moveFromPoll`, recensement des appelants), `.githooks/detour.test.mjs`
    (détour, réouverture, anglais), `packages/drwil/test/claude-hooks.test.mjs` (quatre tests « QUA-235 : sondage
    drwil-move|drwil-detour (QUA-117) … », avec `projetSondage` et `refusDuSocle`, réutilisables).
- **Ce que le lot 5 doit savoir** : les cinq sondages préparés (`drwil-attest`, `drwil-accept`, `drwil-verdict`,
  `drwil-move`, `drwil-detour`) passent par le socle `.claude/hooks/prepared-poll.mjs`, propre à Claude Code
  (`AskUserQuestion`, `tool_response.answers`) ; sous Copilot CLI, seul `drwil-attest` a un adaptateur portable
  (`.claude/hooks/portable-attest.mjs`, `.claude/hooks/attest-adapters.mjs`) : les quatre autres sont à brancher sur la forme `ask_user` (une
  question, une réponse) après avoir trouvé la cause de la lecture manquée. L'en-tête `drwil-detour` a 12 caractères,
  `drwil-verdict` 13 (essai réel en VERIFY). Le contrôle `tests-qua-117` ne lit que `.githooks/scope-gate.test.mjs` :
  les nouveaux tests QUA-117 de `.githooks/state.test.mjs` et `.githooks/detour.test.mjs` passent par les tests des
  hooks, pas par lui (le changer touche `.drwil/ia-first.json`, hors scope). Hors scope, disent encore le geste au terminal
  seul (limites signalées) : QUA-050 (« `detour.mjs allow`, terminal interactif seulement »), recettes
  `docs/recipes/corriger-un-defaut.md` et `docs/recipes/working-with-branches.md` (oui au détour au terminal),
  message `humanDecision` de `.githooks/state-messages-fr.mjs` / `-en.mjs` (« terminal interactif requis », complété
  par le sondage), et celles laissées par le lot 3 (`docs/ia-first/8-conduct-rules.md`, `AGENTS.md`,
  `.githooks/closure-proof.mjs`). QUA-236 (lisibilité du sondage) : réattestation humaine à proposer en VERIFY. Ligne
  « Unreleased » du CHANGELOG au dernier lot : attestation par lot, acceptation, verdict de recette, transitions
  humaines et oui au détour depuis le chat.
- **Prochaine étape** : lot 5 — Copilot CLI.

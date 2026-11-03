# Projet : attester une preuve humaine depuis la conversation

**Statut** : en cours le 2026-11-03 ; périmètre corrigé à tous les outils, réalisation partielle.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/installation-fluide.md`

<!-- scope
files:
  - packages/drwil/src/attest.ts
  - packages/drwil/src/cli-attest.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/evidence.ts
  - README.md
  - packages/drwil/README.md
  - .claude/hooks/prompt-hook.mjs
  - .claude/hooks/start-poll.mjs
  - .claude/hooks/attest-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/attest-poll.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
  - docs/ia-first/6-limits-and-tool-compatibility.md
  - packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md
  - outils/parite-des-outils.test.mjs
  - outils/banc-agents.test.mjs
  - packages/drwil/src/attest-portable.ts
  - packages/drwil/templates/common/tools/claude/.claude/hooks/portable-attest.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/attest-adapters.mjs
  - .claude/hooks/portable-attest.mjs
  - .claude/hooks/attest-adapters.mjs
  - packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json
  - .github/hooks/drwil.json
  - packages/drwil/templates/common/tools/gemini/.gemini/settings.json
  - .gemini/settings.json
  - packages/drwil/test/portable-attest.test.mjs
  - package.json
  - docs/architecture.md
  - packages/drwil/src/render.ts
  - packages/drwil/src/config.ts
  - packages/drwil/templates/common/tools/codex/.codex/hooks.json
  - packages/drwil/templates/common/tools/cursor/.cursor/hooks.json
  - .codex/hooks.json
  - .cursor/hooks.json
  - packages/drwil/test/kit.test.mjs
-->

## 1. Besoin

Attester une preuve humaine par `npx drwil attest` dans un terminal est pénible : le demandeur veut pouvoir le
faire directement dans la conversation avec l'agent (demande du 2026-10-27). L'attestation reste un geste
humain : un agent n'exécute jamais `drwil attest` et n'écrit jamais d'attestation. Décision du 2026-10-30 : un
sondage dont la réponse est lue par un hook, sur le modèle du lancement d'un chantier.

Correction explicite du demandeur le 2026-11-03 : « mais ca doit etre pour tout les agent ».
La cible est le **livrable et ses miroirs dépôt**, pour les cinq outils configurables par `TOOLS` dans
`packages/drwil/src/config.ts` : Claude Code, Copilot CLI, Gemini CLI, Codex et Cursor. Un fichier
d'instructions installé ne prouve pas qu'un canal d'attestation fonctionne. Le repli terminal reste
disponible, mais ne satisfait pas cette demande de parité du chat.

## Critères d'acceptation

- L'agent peut ouvrir un sondage d'attestation pour un contrat manuel ; la réponse de l'humain, lue par un
  hook, enregistre l'attestation sous chacun des cinq outils : Claude Code, Copilot CLI, Gemini CLI,
  Codex et Cursor — contrat à créer
- Le sondage affiche le critère du contrat, ce que l'agent a essayé et les fichiers couverts dont la
  modification ferait tomber l'attestation — `QUA-032`
- Une réponse écrite par l'agent, un sondage sans réponse ou refusé n'enregistre jamais d'attestation —
  `QUA-235`
- L'attestation faite dans le chat est liée au texte et à la preuve du contrat comme celle du terminal,
  compatible avec la couverture et `--renew` — `QUA-081`
- Le sondage est lisible et ne demande que le jugement utile — [humain] — `QUA-236`
- La matrice distingue, pour chacun des cinq outils, adaptateur livré, événements fictifs testés et essai
  interactif réel daté ; un canal absent ou non vérifié bloque la parité, sans être présenté comme tenu —
  [humain] — `QUA-063`

## 2. Hors périmètre

- La commande `drwil attest` du terminal : inchangée, elle reste la voie de repli.
- Une identité forte de l'attestation (commits signés, revue authentifiée) : intention à part,
  `docs/intentions/e2e-et-attestation-precises.md`.
- Un nouveau protocole de confiance fondé sur une phrase interprétée par le modèle, ou une confirmation
  exécutée par l'agent : interdit, et non une solution de repli.

## 3. Contraintes

- Le gabarit est la seule source ; la copie du dépôt suit (`scopeMirrors`).
- QUA-019 (pas de contournement) : aucun réglage ne permet à l'agent de remplir la réponse ; le hook refuse un
  sondage portant une réponse remplie, une valeur par défaut ou une recommandation, comme celui du lancement.
- L'attestation ne coûte que le jugement demandé (QUA-032) ; elle tombe quand un fichier couvert change
  (QUA-081).
- Chevauche le sondage de lancement (`.claude/hooks/start-poll.mjs`) : à lancer après
  `docs/projects/journal.md`.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 :

- Un sondage lu par un hook (plutôt que `! npx drwil attest` dans la session).
- Le sondage affiche le critère, l'essai et les fichiers couverts (plutôt que le critère seul).

Décision humaine concrète de reprise du 2026-11-03 : **« Adapter le protocole avec les mêmes
garanties »**. Une corrélation différente de l'identifiant d'appel natif est autorisée : usage unique,
session et contenu exact du sondage liés, refus des réponses agent, du rejeu et d'une preuve modifiée.
Cette décision autorise l'adaptation de QUA-235 (frontière du sondage préparé), pas une réduction de
l'exigence finale des cinq outils, ni une attestation de compatibilité réelle.

## 5. Points à trancher

- [IA, réalisation initiale du 2026-11-03, insuffisante pour le périmètre corrigé] Le hook n'accepte que `AskUserQuestion` de Claude Code :
  préparation avant affichage, réponse exclusivement dans `tool_response.answers`, corrélation par
  `session_id` et `tool_use_id`, préparation consommée une seule fois. La date, la session et l'appel
  sont conservés dans la provenance ; cette traçabilité n'est pas une identité forte. Le résumé et les
  empreintes sont revérifiés après la réponse : une preuve changée exige un nouveau sondage.
- [humain, essai réel restant] Réunir une paire d'événements natifs avant/après un sondage fictif
  répondu dans chaque outil, sans données personnelles ; vérifier la session, la corrélation
  native ou portable et le champ qui contient exclusivement la réponse humaine. La décision
  ci-dessus autorise le protocole à nonce pour Copilot CLI et Gemini CLI, sans ID d'appel inventé ;
  elle lève le préalable de conception, pas l'exigence d'essai réel ni la parité des cinq outils.
- [humain] Après révision des critères, leur empreinte doit être acceptée à nouveau dans un terminal
  interactif par `node .githooks/state.mjs accept`. Aucun agent ne l'exécute.

## 6. Increments

- **Lot 1 — attestation lue par un hook** [IA], réalisation initiale partielle : préparation commune,
  hook Claude Code et tests fictifs ; conservée,
  mais ne suffit pas à clore le chantier.
- Suite dans le même chantier, sans état de lot artificiel : établir les événements fiables outil par
  outil ; livrer les adaptateurs seulement sur un format établi, avec tests fictifs de confirmation,
  refus, absence, réponse agent, corrélation, rejeu, expiration et preuve changée ; mettre à jour la
  recette et la matrice ; essais interactifs humains. Si un canal manque, arrêter et nommer le
  préalable réel, jamais remplacer l'exigence par « terminal disponible ».

## 7. Reprise

### Reprise ciblée — Codex et Cursor

- **2026-11-03, cadrage seul avant code** : BUILD relu, branche
  `workstream/attester-depuis-le-chat`, arbre initial propre. La demande porte sur les deux
  adaptateurs restants ; le protocole portable autorisé est conservé, Claude inchangé.
- **Scope ajouté** : `packages/drwil/src/render.ts` installera les hooks partagés seuls
  pour Codex/Cursor, sans installer les réglages ni les agents Claude ; `packages/drwil/src/config.ts` permettra
  le suivi du réglage natif Codex déjà installé. Les réglages natifs
  `packages/drwil/templates/common/tools/codex/.codex/hooks.json` et
  packages/drwil/templates/common/tools/cursor/.cursor/hooks.json (à créer) brancheront les événements
  établis ; .codex/hooks.json et .cursor/hooks.json sont réservés aux miroirs seulement si
  leur unité est installée dans ce dépôt. `packages/drwil/test/kit.test.mjs` fera évoluer
  l'attente d'installation Codex : hooks partagés requis, toujours sans agents/réglages Claude.
  Les sources, tests du protocole, contrats, recette et matrice sont déjà au scope.
- **Sources avant réalisation** : documentation officielle Codex des hooks et source taguée
  `rust-v0.166.0` : `request_user_input` est un outil local passant par le registre commun ;
  son résultat est une chaîne JSON `answers[id].answers`. Les hooks exigent revue/confiance
  dans `/hooks`, et la fonctionnalité `hooks` ne doit pas être désactivée. Cursor documente
  ses hooks génériques et `cursor/ask_question` dans ACP ; le passage exact de la question
  native dans les hooks et son encodage sont en cours d'inspection statique de la distribution
  officielle, sans installation ni lancement d'agent. Aucun payload ne sera inventé.
- Aucun `attest`, `state accept` ou sondage réel ; jugements humains et acceptation des
  critères restent requis. La note distincte sur QUA-222 (parité générale) reste intacte.
- **Réalisation bornée et arrêt factuel** : Codex est implémenté et testé fictivement,
  Cursor ne l'est pas. Le mode `--tool codex` prépare le format natif, les hooks
  `PreToolUse` / `PostToolUse` suivent le protocole portable existant et lient aussi
  `tool_use_id` et `agent_id` fourni. Le résultat accepté est uniquement la chaîne JSON
  native contenant une seule réponse au seul identifiant `drwil_attest`. Aucun ID natif
  n'est fabriqué. L'appel direct de l'entrée par Bash est refusé ; les autres commandes
  Bash restent inchangées. Les hooks requièrent un projet de confiance et la revue `/hooks`.
- **Installation** : le gabarit Codex branche les événements ; `packages/drwil/src/render.ts` installe les
  seuls scripts partagés dans `.claude/hooks/` pour Codex seul, sans réglages, skills ni
  agents Claude. Le réglage Codex suit désormais le mécanisme de rafraîchissement du kit.
  `npm run installer-depot --silent` : code 0, cinq miroirs écrits (trois hooks partagés,
  recette et matrice). Les unités Codex/Cursor ne sont pas installées ici : aucun de leurs
  miroirs réservés n'a été créé à la main. Aucun réglage Cursor inventé ou fichier vide.
- **Schémas Codex établis** : tag officiel `rust-v0.166.0`, schéma de
  `request_user_input`, protocole `RequestUserInputResponse`, registre commun des outils
  et conversion du résultat texte vers `tool_response` relus. Mode Plan disponible dans
  cette source ; mode Default conditionné par la fonctionnalité
  `default_mode_request_user_input` (en développement, désactivée par défaut).
  Cette version est une référence de schéma, pas un minimum prétendu ni un binaire
  essayé. Sources précises dans la matrice, section « Human attestation parity ».
- **Cursor, tentative concrète avant arrêt** : documentation officielle des hooks relue :
  `conversation_id`, `tool_use_id`, `tool_input` et `tool_output` chaîne JSON.
  La documentation ACP donne bien `cursor/ask_question`, ses questions structurées et
  `outcome.answered.answers[].selectedOptionIds`. L'archive officielle
  `2026.10.22-27dcf5f`, identifiée par le script officiel d'installation, a été inspectée
  statiquement en mémoire puis dans des fichiers de recherche locaux supprimés ;
  rien n'a été installé ou exécuté. Son module 7000.index.js route
  `askQuestionInteractionQuery` par l'écouteur d'interactions ; 4097.index.js décrit
  les wrappers d'exécution/hook, sans wrapper de cette question ; index.js contient
  plusieurs types protobuf de question/résultat et le décodeur d'enveloppe des hooks.
  Aucun de ces éléments n'établit le nom exact ni le couple arguments/résultat de
  cette question dans les hooks génériques. Copier la forme ACP ou protobuf dans
  `tool_output` serait une hypothèse non autorisée, pas un adaptateur.
- **Équivalents examinés** : un pont ACP dédié pourrait lire directement le canal
  client humain documenté et réutiliser les réservations ; il changerait le lancement
  et l'intégration client, au lieu de déclarer un hook natif. Aucun pont ni nouvelle
  intégration n'a été introduit silencieusement. Prochain préalable : paire native
  avant/après d'une question fictive Cursor, ou décision humaine explicite de livrer
  ce transport ACP dédié. Ce n'est pas une nouvelle demande d'autorisation du nonce,
  déjà accordée, ni une preuve d'impossibilité de Cursor. Le repli terminal ne remplit
  toujours pas la parité demandée. BUILD et PR brouillon conservés, arrêt sans clôture.
- **Matrice de remise** : Claude Code, Copilot CLI, Gemini CLI et Codex : adaptateur
  livré, événements fictifs testés, **aucun essai réel du sondage**. Cursor :
  adaptateur non livré, aucune fixture d'attestation prétendue, aucun essai réel.
  Restent humains : essai réel daté des cinq outils, QUA-063 (matrice datée),
  QUA-064 (installation/lancement Copilot), QUA-066 (installation/confiance Gemini),
  QUA-150 (tests de timing), QUA-236 (lisibilité utile), et acceptation des critères
  révisés avant clôture. Aucune attestation renouvelée par l'agent.
- **Contrôles de cette reprise** :
  - Baseline avant extension,
    `node --test --test-name-pattern="QUA-235" packages/drwil/test/portable-attest.test.mjs packages/drwil/test/claude-hooks.test.mjs packages/drwil/test/cycle.test.mjs` :
    20 tests passés, 0 échec.
  - `npm run build --silent` : code 0.
  - `node --test --test-name-pattern="QUA-235|QUA-032|QUA-081|QUA-083|QUA-205|QUA-215|QUA-216|init en anglais, Codex|lot 6 : le skill|commande /drwil : pas livrée" packages/drwil/test/portable-attest.test.mjs packages/drwil/test/claude-hooks.test.mjs packages/drwil/test/cycle.test.mjs packages/drwil/test/kit.test.mjs` :
    40 tests passés, 0 échec. Concurrence Codex entre deux processus incluse ;
    la commande shell installée est exercée hors Windows, l'entrée et ses arguments
    sous Windows ; aucune simulation annoncée comme un essai du shell natif Windows.
  - `npm run test:claude:coverage` : code 0 ; 42 tests passés, 0 échec ;
    98,02 % lignes/instructions, 90,70 % branches, 95,09 % fonctions, sans seuil baissé.
  - `node --test --test-name-pattern="QUA-063|QUA-222|QUA-223" outils/banc-agents.test.mjs outils/parite-des-outils.test.mjs` :
    3 tests passés, 0 échec. Les marqueurs reflètent quatre adaptateurs, sans réaliser
    l'intention distincte de renforcement général.
  - `node outils/verifier-miroirs.mjs` : 187 fichiers comparés, 17 écarts déclarés,
    0 problème.
  - `node .githooks/check-docs.mjs` : 212 fichiers scannés, 0 erreur après correction
    d'une citation de miroir Codex absent ; les chemins futurs de cadrage étaient
    également cités à tort comme existants au premier essai de commit, refusé.
  - `node .githooks/check-kit-size.mjs` : code 0, aucun plafond relevé.
  - `node .githooks/check-architecture.mjs` : 170 éléments attendus, 0 absent.
  - `npx --no-install biome check packages/drwil/src/attest-portable.ts packages/drwil/src/cli-attest.ts packages/drwil/src/config.ts packages/drwil/src/render.ts packages/drwil/test/portable-attest.test.mjs packages/drwil/test/kit.test.mjs outils/parite-des-outils.test.mjs` :
    code 0, sept fichiers contrôlés ; `git --no-pager diff --check` : code 0.
  - `node .githooks/run-checks.mjs` : code 0,
    « contrôles exécutés : OK (52 avertissement(s), non exécutés compris) »,
    4 contrôles repris, 228 rejoués. Sa suite du paquet `npm run test:coverage` :
    316 tests passés, 0 échec ; 98,36 % lignes/instructions, 91,12 % branches,
    98,72 % fonctions. Sa suite des hooks de gouvernance : 552 tests passés,
    0 échec, couverture 100 %. Les avertissements, dont les résidus de dossiers
    des bancs existants et commit-msg non exécutable, ne sont pas un contrôle ignoré.
  - Le verdict global précédent reste **`Verdict: GOVERNANCE: FAIL (exit 1)`** :
    absence de parité et cinq jugements MANUAL. Pas de relance répétée de
    `verify --agent` vouée à cet échec, ni de déclaration « vérifié ».
- **Remise persistante** : cadrage seul `b776926`, réalisation `b3bc4cd`, poussés sur
  la PR #352 laissée brouillon et sans fusion programmée. Le push a exécuté
  `run-checks` avec code 0 : 7 avertissements, 215 contrôles repris, 17 rejoués.
  Suivi `node .githooks/pr-watch.mjs 352 --timeout 20` lancé après le push ;
  seule la contre-vérification des checks portant le SHA poussé vaut preuve CI,
  pas une sortie verte portant encore sur le précédent. Le compte rendu de PR
  garde cette preuve courante. Une ancienne puce du changelog annonçait encore
  Codex non livré : formulation rendue cohérente avec l'ajout, sans changement de code.
  La note `e7936a8` est identique octet pour octet ; aucun geste humain ni état
  de gouvernance modifié pour obtenir un verdict.

### Reprise ciblée — protocole portable autorisé

- **Reprise ciblée, protocole portable (2026-11-03)** : décision ci-dessus reçue ; état BUILD, arbre
  propre, PR #352 brouillon. Cette étape livre du code pour Copilot CLI et Gemini CLI seulement ;
  Claude Code est préservé. Codex/Cursor et les jugements humains restent à traiter ensuite.
- **Conception autorisée** : un nonce aléatoire du moteur est inclus dans la question visible.
  Le hook avant l'outil réserve atomiquement au plus une demande par session native, lie outil,
  session, contexte de sous-agent s'il existe, contenu exact, snapshot et date ; le nonce ne peut
  jamais être réarmé dans ce projet. Le hook après réclame atomiquement cette préparation avant
  toute attente asynchrone, ne lit que le résultat natif du canal humain et relance les contrôles
  existants avec comparaison du snapshot exact. Expiration : une heure. Une collision, un autre
  sondage/appel, un retour hors session/outil ou une préparation modifiée ne confirme rien. Le
  nonce est une corrélation locale, pas un identifiant natif inventé ni une identité forte ; les
  fichiers du hook et son runtime sont dans la même frontière de confiance que l'adaptateur Claude.
- **Formats établis avant code** : Copilot documente `preToolUse` / `postToolUse` avec `sessionId`,
  `toolName`, `toolArgs` et `toolResult.textResultForLlm` (succès). Son SDK officiel décrit
  `ask_user` avec `question` et `choices`, et son afficheur distribué en 1.0.105 traite le préfixe
  `User responded:` ; aucune inférence à partir d'une phrase libre dans le chat. Gemini documente
  `BeforeTool` / `AfterTool`, `session_id`, `ask_user`, `questions` et la chaîne JSON
  `tool_response.llmContent` contenant `answers["0"]`. Ces schémas seront simulés dans des projets
  fictifs, jamais présentés comme une capture réelle.
- **Scope ajouté avant code, commit de cadrage séparé** :
  packages/drwil/src/attest-portable.ts (à créer) prépare les formes natives sans grossir le moteur existant ;
  portable-attest.mjs et attest-adapters.mjs (à créer) dans le gabarit Claude partagé, et leurs deux miroirs
  `.claude/hooks/`, portent la corrélation et les décodeurs, installés par l'infrastructure existante
  `usesClaudeTree` (pas une nouvelle couche d'installation).
  Les deux réglages natifs Copilot/Gemini du gabarit et leurs miroirs branchent ces événements ;
  packages/drwil/test/portable-attest.test.mjs (à créer) éprouve ces canaux sur données fictives ;
  `package.json` inclut ces tests dans la couverture des hooks livrés, sans abaisser les seuils.
  Les sources, contrats, recette, matrice et contrôles déjà cadrés seront mis à jour avec le code.
- **Réalisation** : `attest-poll --tool copilot` produit `question` et `choices`, et
  `--tool gemini` produit une question `choice` native. Le nonce visible ne remplace jamais la session
  native : absence de `sessionId` (Copilot) ou `session_id` (Gemini) → refus. Les décodeurs ne lisent
  aucune réponse du chat ou de l'entrée du modèle. La réservation du nonce est exclusive dans le
  projet, celle de la demande exclusive par session ; une empreinte persistée lie préparation et
  snapshot, la consommation atomique précède la relance des contrôles. Le refus humain et l'erreur
  native consomment aussi la demande. Les tests exercent deux processus distincts en concurrence.
- **Entrée existante conservée** : les déclarations natives invoquent `.claude/hooks/prompt-hook.mjs`, qui
  route explicitement les modes Copilot/Gemini vers le module portable. Le chemin Claude sans mode,
  ses identifiants natifs et son décodeur restent inchangés. Aucun nouvel exécutable de confirmation
  n'est ajouté ; le refus existant de l'appel direct à `.claude/hooks/prompt-hook.mjs` par le shell de l'agent
  est conservé. Comme auparavant, ce protocole fait confiance au runtime, aux hooks et aux fichiers
  locaux ; ce n'est pas une défense contre un acteur qui les réécrit tous.
- **Contrats adaptés sur décision explicite** : QUA-235 (frontière du sondage préparé) décrit
  les trois adaptateurs et leurs preuves fictives sans promettre cinq outils. QUA-236 (jugement de
  lisibilité utile) couvre aussi la présentation portable, sans attestation ajoutée.
  QUA-216 (codes des hooks sans Node) conserve tous les codes de repli ; son ancienne expression
  « Copilot ne bloque jamais » est précisée : ses rappels restent non bloquants, le sondage invalide
  reçoit le refus natif `permissionDecision: "deny"` avec le code 0. Aucun contrôle n'est retiré.
- **Miroirs et poste réel** : l'unité Copilot n'est pas installée dans ce dépôt (unités outils
  présentes : Claude et Gemini). L'installateur officiel ne crée donc pas le miroir Copilot réservé
  au scope ; le réglage est livré par son gabarit et son installation est exercée sur un projet
  fictif `init --tools copilot`. Les miroirs Claude/Gemini et les documents suivent l'installateur.
  La version Copilot relue reste 1.0.105 ; aucune question ni aucun hook de confirmation réel lancé.
- **Limites opérationnelles** : conserver les tombstones locaux des nonces. Un processus tué peut
  laisser une session occupée ; une session native neuve permet de refaire une demande, jamais de
  forger un résultat. Le nonce n'est ni un secret ni une identité authentifiée. Les formats natifs
  documentés et l'afficheur distribué Copilot ont été inspectés statiquement ; leurs événements de
  test sont fictifs, les essais interactifs restent « not tested » dans la matrice.
- **Prochaine étape, hors de cette reprise** : établir les canaux effectifs Codex/Cursor et brancher
  leurs décodeurs sur la même corrélation. Conserver BUILD et la PR brouillon ; pas de clôture,
  d'état suivant, de ready ni de fusion programmée. Restent la parité cinq outils, l'acceptation
  humaine des critères et les jugements de QUA-063 (matrice datée), QUA-064 (installation et
  lancement interactif Copilot), QUA-066 (installation et dossier de confiance Gemini),
  QUA-150 (tests de timing) et QUA-236 (lisibilité utile). La note distincte ajoutée par la principale dans les intentions
  sur le renforcement futur de QUA-222 (parité entre outils) est préservée, sans la réaliser.
- **Complément de scope avant sa modification** : `docs/architecture.md` doit citer le rôle du
  nouveau module source, conformément à QUA-040 (carte, README et changelog à jour). Le premier
  contrôle complet a reproduit son absence de la carte et le test QUA-066 (installation Gemini)
  qui attend le garde d'écriture en première position : le nouveau matcher de question l'avait
  déplacé. Trois contrôles en échec : carte, test QUA-066 et suite du paquet contenant ce même
  test ; aucun seuil de couverture baissé. Le garde d'écriture restera en première position,
  le matcher d'attestation sera ajouté après, sans modifier ce test ni sa garantie.
- **Portabilité du banc fictif** : les nouveaux tests ne doivent pas soumettre une commande Bash
  à cmd.exe. Sous Windows, ils exécutent donc avec Node l'entrée et les arguments extraits du
  réglage installé ; ailleurs, ils exécutent aussi sa commande shell. Aucun test de comportement
  n'est sauté. Cela ne vaut pas essai interactif du shell natif, qui reste à effectuer.
- **Preuves finales de cette étape** :
  - `npm run installer-depot --silent` : code 0 ; dernière passe, un miroir Gemini écrit.
    Les deux nouveaux modules partagés et les miroirs documentaires ont été installés par les
    passes précédentes, jamais édités dans leur copie.
  - `node --test --test-name-pattern="QUA-235|QUA-032|QUA-081|QUA-083|QUA-205|QUA-215|QUA-216" packages/drwil/test/portable-attest.test.mjs packages/drwil/test/claude-hooks.test.mjs packages/drwil/test/cycle.test.mjs` :
    28 tests passés, 0 échec. La suite complète finale rejoue aussi ces tests après l'ajustement
    de l'ordre des matchers et la précision de la liste des hooks Copilot attendus.
  - `node --test --test-name-pattern="QUA-066" packages/drwil/test/kit.test.mjs` :
    1 test passé, 0 échec après remise du garde d'écriture en première position.
  - `npm run test:claude:coverage` : code 0, 34 tests passés, 0 échec ;
    98,16 % lignes/instructions, 90,62 % branches, 95,09 % fonctions. Les deux nouveaux modules
    de hooks ont 100 % des lignes et fonctions mesurées, sans exclusion nouvelle.
  - `node --test --test-name-pattern="QUA-063|QUA-222|QUA-223" outils/banc-agents.test.mjs outils/parite-des-outils.test.mjs` :
    3 tests passés, 0 échec ; aucun essai réel ajouté à la matrice.
  - `node outils/verifier-miroirs.mjs` : 187 fichiers comparés, 17 écarts déclarés, 0 problème.
  - `node .githooks/check-docs.mjs` : 212 fichiers scannés, 0 erreur.
  - `node .githooks/check-kit-size.mjs` : code 0 ; nouveaux modules sous le plafond, aucun seuil relevé.
  - `node .githooks/check-architecture.mjs` : 170 éléments attendus, 0 absent.
  - `node .githooks/run-checks.mjs` : code 0, « contrôles exécutés : OK
    (43 avertissement(s), non exécutés compris) », 79 contrôles repris, 153 rejoués.
    Dans cette passe, la suite du paquet `npm run test:coverage` passe ses 308 tests :
    98,36 % lignes, 91,10 % branches, 98,72 % fonctions ; nouveau module TypeScript à 100 %.
  - `node packages/drwil/bin/drwil.js verify --agent` : code 1,
    **`Verdict: GOVERNANCE: FAIL (exit 1)`** ; 206 PASS, 17 ATTESTED, 0 FAIL, 0 ERROR,
    5 MANUAL. Le premier critère cinq outils reste sans preuve. En plus des trois jugements déjà
    attendus, la modification des réglages natifs invalide les anciennes attestations de
    QUA-064 (installation/lancement Copilot) et QUA-066 (installation/confiance Gemini) ;
    aucune n'a été renouvelée par l'agent. Ce verdict n'est pas une validation du chantier.
  - `git --no-pager diff --check` et
    `npx --no-install biome check packages/drwil/test/claude-hooks.test.mjs packages/drwil/test/portable-attest.test.mjs` :
    code 0, sans installation de dépendance.
- **Remise persistante** : cadrages seuls `fd6ffe4` et `9eb7647`, puis réalisation avec cette
  documentation. La note distincte de la principale est conservée à l'identique ; elle n'autorise
  aucune réalisation du renforcement général de parité. Aucun `attest`, `state accept`, sondage
  humain réel ou verdict humain exécuté par l'agent ; pas de clôture ni de chantier suivant.

### Reprise précédente — inventaire sans nouvel adaptateur

- **Reprise après correction humaine du périmètre (2026-11-03)** : état initial VERIFY, arbre git propre,
  branche `workstream/attester-depuis-le-chat`, PR #352 brouillon. Transition officielle
  `node .githooks/state.mjs move BUILD` effectuée (code 0), sans toucher directement à l'état.
  La restriction Claude Code n'est plus une décision du demandeur. Les critères modifiés requièrent
  une nouvelle acceptation humaine avant la clôture ; aucun `state accept` ni attestation exécuté.
- **Cause établie** : `prepareAttestationPoll` produit uniquement `questions` pour Claude ;
  `attestationPoll` exige `AskUserQuestion`, `session_id`, `tool_use_id` et
  `tool_response.answers`. Les scripts partagés installés chez Copilot/Gemini ne changent pas ces
  conditions. Codex ne reçoit que les hooks de rappel ; Cursor seulement une règle. La configuration
  officielle reconnaît pourtant bien les cinq outils. Les tests précédents n'établissent aucune
  compatibilité de leur sondage d'attestation.
- **Extension de scope, correction du cadrage** : la matrice
  `packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md` et son miroir
  `docs/ia-first/6-limits-and-tool-compatibility.md` décrivent le canal d'attestation de chaque outil,
  les préalables manquants et le protocole d'essai réel. `outils/parite-des-outils.test.mjs` inscrit
  l'attestation parmi les mécanismes suivis et vérifie l'écart déclaré pour les cinq outils configurables,
  sans confondre présence de texte et preuve de fonctionnement. `outils/banc-agents.test.mjs` doit
  isoler le tableau de cycle : son découpage prenait tout le reste du document pour ce tableau, donc le
  nouveau tableau d'attestation produisait deux lignes par outil. Échec reproduit de QUA-063 (matrice
  de compatibilité datée) : « tableau de parité : une ligne pour Claude Code », `2 !== 1`.
  Le contrôle des lignes uniques et l'interdiction de dater un essai non fait restent inchangés.
  Aucun nouvel adaptateur n'est autorisé sur
  un format deviné ; ses chemins précis devront entrer dans un cadrage commité avant son code.
- **Arrêt requis si le canal manque** : garder BUILD et la PR brouillon, aucune clôture ni fusion ;
  rapporter les événements manquants et le geste humain attendu. QUA-236 (jugement de lisibilité du
  sondage) n'a toujours reçu aucune attestation. Les résultats ci-dessous restent l'historique de
  l'implémentation initiale, pas une preuve de parité ni du cadrage révisé.
- **Constat de cette reprise** : aucun nouvel adaptateur livré. Les cinq lignes et leurs sources
  officielles figurent dans la section « Human attestation parity » de la matrice. Claude Code seul a
  des événements fictifs d'attestation testés ; aucun des cinq n'a fait l'objet d'un essai réel du
  sondage. Copilot CLI et Gemini CLI n'exposent pas l'identifiant d'appel dans le schéma documenté ;
  Codex documente cet identifiant, mais le passage effectif de `request_user_input` et son résultat
  restent à établir ; sous Cursor, le format exact de la question humaine et son passage dans les
  hooks restent également à établir. Ce sont des préalables manquants, pas une preuve d'impossibilité.
- **Poste disponible** : `claude --version` : 2.1.317 ; `copilot --version` : 1.0.105. Les commandes
  `gemini`, `codex` et `cursor` sont absentes du PATH. Aucun agent réel lancé pour répondre à une
  question humaine ; aucune donnée de conversation réelle capturée.
- **Geste humain préalable** : fournir une paire avant/après d'événements natifs d'un sondage
  fictif réellement répondu, sous chacun des outils, en particulier Codex et Cursor sur un poste
  équipé. Pour Copilot/Gemini, si aucun identifiant natif ne relie les appels, décider explicitement
  d'un protocole alternatif de corrélation à usage unique, à cadrer et tester avant livraison ;
  ni un identifiant inventé ni la suppression du contrôle ne sont admissibles.
- **Acceptation relue sans écriture** : `acceptanceCheck` retourne `kind: changed`, empreinte
  acceptée `sha256:e392a794efa36c65`, empreinte courante `sha256:8919976e47b57920`. L'agent ne renouvelle
  pas l'acceptation ; le geste interactif humain reste requis avant clôture, pas une attestation du code.
- **Preuve de parité non livrée** : le premier critère porte « contrat à créer » tant que le contrat
  QUA-235 (frontière du sondage préparé), actuellement limité à Claude Code, n'est pas étendu avec des
  preuves adéquates. Son test existant ne doit pas faire passer un critère qui promet cinq outils.
  La clôture reste donc refusée même si les seuls jugements humains existants étaient attestés.
- **Contrôles de cette reprise** :
  - `npm run installer-depot --silent` : code 0, un seul miroir écrit (la matrice).
  - `node --test --test-name-pattern="QUA-235|QUA-032|QUA-081|QUA-083|QUA-205" packages/drwil/test/cycle.test.mjs packages/drwil/test/claude-hooks.test.mjs` :
    9 tests passés, 0 échec ; aucun de ces tests ne prouve les autres outils.
  - `node --test --test-name-pattern='QUA-063|QUA-222|QUA-223' outils/banc-agents.test.mjs outils/parite-des-outils.test.mjs` :
    3 tests passés, 0 échec après isolation du tableau de cycle.
  - `node outils/verifier-miroirs.mjs` : 185 fichiers comparés, 17 écarts déclarés, 0 problème.
  - `node .githooks/check-docs.mjs` : 212 fichiers scannés, 0 erreur.
  - Premier contrôle complet par `drwil-checks` : `run-checks` code 1, 2 contrôles en échec
    (QUA-063 et le contrôle de miroirs qui lance le même test), 41 avertissements ; `verify --agent` :
    `Verdict: GOVERNANCE: FAIL (exit 1)`. Cause reproduite puis corrigée dans le découpage du test,
    sans modifier une règle ni désactiver de contrôle.
  - Passe complète après correctif, `node .githooks/run-checks.mjs` : code 0,
    « contrôles exécutés : OK (10 avertissement(s), non exécutés compris) », 197 contrôles repris
    sur fichiers inchangés, 35 rejoués.
  - Puis `node packages/drwil/bin/drwil.js verify --agent` : code 1,
    `Verdict: GOVERNANCE: FAIL (exit 1)` ; 206 PASS, 19 ATTESTED, 0 FAIL, 0 ERROR,
    3 MANUAL. Cause du verdict global : premier critère cinq outils sans preuve ; jugements
    humains restants : QUA-063 (matrice de compatibilité datée), QUA-150 (recensement des tests
    de timing) et QUA-236 (lisibilité du sondage). La modification documentaire de
    `outils/banc-agents.test.mjs`, couvert en entier, invalide l'ancienne attestation de QUA-150,
    sans aucun changement d'un test de durée. Aucune attestation renouvelée par l'agent.
  - L'avertissement préexistant du hook `.githooks/commit-msg` non exécutable a été laissé inchangé :
    aucun contrôle désactivé ni réglage modifié.
- **État de remise** : BUILD, chantier partiel, pas de preuve de parité et pas de validation globale.
  La PR reste brouillon, fusion non programmée. Aucune clôture ni lancement de la file suivante.

### Historique avant la correction du périmètre

- **Dernier état** (2026-11-03) : lot unique réalisé sur la branche
  `workstream/attester-depuis-le-chat`, arrêté avant clôture sur le jugement humain de QUA-236
  (le sondage d'attestation ne demande que le jugement utile). Aucune attestation réelle créée par
  l'agent, aucun sondage réel soumis, aucun `state accept` ni lancement du chantier suivant.
- **Travail non commité** : aucun après le commit de réalisation.
- **Contrôles** :
  - `npm run build --silent` : code 0.
  - `node --test --test-name-pattern="QUA-235|QUA-032|QUA-081|QUA-083|QUA-205" packages/drwil/test/cycle.test.mjs packages/drwil/test/claude-hooks.test.mjs` :
    9 tests passés, 0 échec ; réponse humaine fictive, réponse agent refusée, défaut, recommandation,
    refus humain, absence de réponse, rejeu, corrélation, expiration, preuve changée, contrôle devenu
    rouge, renouvellement et terminal inchangé.
  - `npm run test:claude:coverage` : code 0, lignes 97,91 %, branches 89,75 %.
  - `npm run installer-depot --silent` : code 0, copies installées depuis le gabarit.
  - Contrôle des plafonds à 200 lignes sur les sources et les hooks : code 0 après module dédié.
  - Sous-agent `drwil-checks`, `node .githooks/run-checks.mjs` : code 0, 52 avertissements,
    229 contrôles rejoués, 3 repris.
  - Sous-agent `drwil-checks`, `node packages/drwil/bin/drwil.js verify --agent` : code 1,
    `Verdict: GOVERNANCE: MANUAL REVIEW REQUIRED (exit 1)` ; 206 PASS, 21 ATTESTED,
    0 FAIL, 0 ERROR, 1 MANUAL : QUA-236 uniquement. Ce verdict n'est pas une validation.
- **Protocole attendu de la principale** : présenter à l'humain le sondage fictif du test QUA-235
  dans `packages/drwil/test/claude-hooks.test.mjs` (APP-009, règle fictive, lisibilité fictive,
  essai fictif, fichier src/objet.js, choix Attester/Refuser) et
  `docs/recipes/adopt-the-kit.md`, section « Human attestation in the conversation ».
  L'humain juge la lisibilité et l'absence de choix suggéré ; s'il confirme, lui seul exécute
  `node packages/drwil/bin/drwil.js attest QUA-236` dans son terminal interactif, ou répond
  au sondage Claude Code ouvert par la principale suivant la recette. Aucun agent n'exécute cette
  commande ni ne répond au sondage. Ensuite seulement, contrôles complets avec évidence sur HEAD,
  journal et clôture, push/PR, fusion automatique autorisée. Une divergence d'acceptation éventuelle
  doit aussi être traitée par l'humain, jamais acceptée par l'agent.
- **Extension de périmètre** : `packages/drwil/src/index.ts` exporte la préparation en lecture seule
  utilisée par la CLI et le hook ; `packages/drwil/src/evidence.ts` décrit la provenance optionnelle sans
  changer le jugement des attestations existantes ; `README.md` et `packages/drwil/README.md` corrigent
  l'affirmation « terminal uniquement » et documentent la nouvelle commande publique.
- **Extension de périmètre, taille** : le contrôle de taille refuse l'ajout du sondage dans les deux hooks
  existants (266 et 202 lignes, plafond 200). Le nouveau module
  packages/drwil/templates/common/tools/claude/.claude/hooks/attest-poll.mjs et sa copie
  .claude/hooks/attest-poll.mjs (tous deux à créer) regroupent uniquement la nouvelle logique ; aucun parcours existant n'est
  restructuré. Les tests de régression et du nouveau sondage passent avant ce déplacement (9/9).
- **Limites** : identité toujours déclarative (intention existante
  `docs/intentions/e2e-et-attestation-precises.md`), autres assistants non testés pour ce sondage ;
  hook nécessitant le paquet drwil local, repli terminal documenté. L'intention
  `docs/intentions/installation-fluide.md` reste à actualiser à la clôture.
- **Documentation rencontrée** : quatre références ambiguës dans `packages/drwil/README.md`,
  signalées par `close.mjs --check`, ont été précisées : chemin du contrôle et noms de fichiers
  d'exemples non présentés comme des références du dépôt. Le contrôle ne les signale plus.

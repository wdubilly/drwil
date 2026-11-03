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
  Codex et Cursor — `QUA-235`
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

## 5. Points à trancher

- [IA, réalisation initiale du 2026-11-03, insuffisante pour le périmètre corrigé] Le hook n'accepte que `AskUserQuestion` de Claude Code :
  préparation avant affichage, réponse exclusivement dans `tool_response.answers`, corrélation par
  `session_id` et `tool_use_id`, préparation consommée une seule fois. La date, la session et l'appel
  sont conservés dans la provenance ; cette traçabilité n'est pas une identité forte. Le résumé et les
  empreintes sont revérifiés après la réponse : une preuve changée exige un nouveau sondage.
- [humain, préalable de reprise] Réunir une paire d'événements natifs avant/après un sondage fictif
  répondu dans chaque outil, sans données personnelles ; vérifier la session, l'identifiant d'appel et
  le champ qui contient exclusivement la réponse humaine. Copilot CLI et Gemini CLI ne documentent pas
  d'identifiant d'appel dans ces événements : ne jamais en inventer un ni retirer ce contrôle.
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
    sans modifier une règle ni désactiver de contrôle. Passe complète à relancer après le correctif.

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

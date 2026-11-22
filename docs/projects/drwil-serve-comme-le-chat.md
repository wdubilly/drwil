# Projet : tout faire depuis `drwil serve`, comme dans le chat

**Statut** : cadré le 2026-11-22 — points à trancher.
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/drwil-serve-comme-le-chat.md`

<!-- scope
files:
  - packages/drwil/src/serve.ts
  - packages/drwil/src/serve-auth.ts
  - packages/drwil/src/serve-texts.ts
  - packages/drwil/src/serve-journal.ts
  - packages/drwil/src/cli-serve.ts
  - packages/drwil/src/serve-write.ts
  - packages/drwil/src/serve-agent.ts
  - packages/drwil/src/serve-polls.ts
  - packages/drwil/src/cursor-acp.ts
  - packages/drwil/src/cursor-acp-session.ts
  - packages/drwil/src/cli-cursor.ts
  - packages/drwil/serve/page.html
  - packages/drwil/test/serve.test.mjs
  - packages/drwil/test/serve-write.test.mjs
  - packages/drwil/test/serve-agent.test.mjs
  - packages/drwil/test/cursor-acp.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prepared-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/copilot-polls.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil-serve/SKILL.md
  - .claude/hooks/prepared-poll.mjs
  - .claude/hooks/copilot-polls.mjs
  - .claude/skills/drwil-serve/SKILL.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
-->

(Scope provisoire, pour le lot 1 surtout : `packages/drwil/src/serve-write.ts` (à créer), `packages/drwil/src/serve-agent.ts` (à créer) et `packages/drwil/src/serve-polls.ts` (à créer) sont des noms
proposés ; `packages/drwil/src/serve.ts` (182 lignes) et `packages/drwil/src/cli-serve.ts` (200, au plafond QUA-001) ne peuvent pas grossir : toute route
ou option nouvelle va dans un module ajouté. Le scope sera repris par lot, ou par fiche si P1 retient plusieurs
fiches.)

## 1. Besoin

Demande du 2026-11-22 : « l'idéal serait que je puisse tout faire avec [drwil serve] », « je veux tout comme dans le
chat ». Depuis la vue, au navigateur et au téléphone (Tailscale) : converser avec l'agent, cadrer intentions et
fiches, lancer des chantiers, répondre aux sondages (acceptation des critères, attestations, limites, détours),
suivre l'avancement et les PR. L'agent : « celui qui a lancé le serveur ». Parité : « avec Copilot j'ai pas ça » ;
Remote Control n'existe que dans Claude Code ; la solution marche de la même façon pour Claude Code et Copilot CLI
(puis les autres), sans fonction propre à un outil : c'est `drwil serve` qui porte le chat. Livrable d'abord
(QUA-018) : pour tout adoptant.

Relevé dans le code le 2026-11-22 :

- **Lecture seule par contrat.** QUA-280 : `GET` seul (`packages/drwil/src/serve.ts`, 405 `read-only` sinon), aucune écriture dans le
  projet, seules commandes de lecture, `commander` seule dépendance d'exécution. Ce chantier le modifie
  forcément.
- **Accès** (QUA-281) : jeton exigé hors de `127.0.0.1`, cookie `HttpOnly` `SameSite=Strict` portant son empreinte ;
  publication par `tailscale serve` (QUA-277, QUA-278) ; sur `127.0.0.1` sans jeton, seul l'en-tête `Host` local ou
  publié est admis (QUA-280). Toute réponse masquée (QUA-271). Page unique `packages/drwil/serve/page.html` (680
  lignes, 360 px : QUA-276).
- **Sondages lus par des hooks** : socle `.claude/hooks/prepared-poll.mjs` (QUA-235) — une préparation, puis seule la réponse de
  l'humain dans le retour de l'outil de question (`tool_response.answers`) confirme ; corrélation par session et
  appel. Formes des autres outils traduites (`.claude/hooks/copilot-polls.mjs` pour `ask_user` de Copilot CLI, `.claude/hooks/portable-polls.mjs`,
  QUA-266). Aucun hook ne lit une réponse venue d'ailleurs que du retour de l'outil de l'agent.
- **Un client ACP existe déjà** : `drwil cursor` (`packages/drwil/src/cli-cursor.ts`, `packages/drwil/src/cursor-acp.ts`, `packages/drwil/src/cursor-acp-session.ts`) lance
  `agent acp`, ouvre une session (`session/new`, `session/prompt`), affiche les `session/update`, répond aux
  `cursor/ask_question` et `session/request_permission` par une interface humaine (`InterfaceCursor` : `choisir`,
  `afficher`) et appelle les hooks avant et après (QUA-235 : seule l'interface humaine fournit les choix). C'est la
  forme la plus proche d'« un serveur qui porte le chat ».
- **Agents non interactifs** : le banc lance `claude -p`, `copilot -p`, `gemini -p` (`outils/banc-agents-cli.mjs`),
  sans reprise de session ni question à l'humain (`--no-ask-user` pour Copilot).
- **Lien de la vue** : sous Claude Code, `.claude/hooks/serve-welcome.mjs` (QUA-277) ; Copilot CLI n'a pas ce canal.

## Critères d'acceptation

(Provisoires, à reprendre une fois P1 à P13 tranchés ; un contrat par critère métier, créé par le chantier.)

- Lot 1 — Depuis la vue, avec un jeton valide, l'humain crée une intention (titre, besoin) : le fichier
  `docs/intentions/<nom>.md` au format QUA-015 est écrit sur une branche de cadrage, jamais sur la branche d'un
  chantier ; sans jeton valide ou sans confirmation, refus et rien d'écrit ; aucune donnée nominative ni secret dans
  la réponse — `QUA-nouveau-1`
- Lot 2 — Un sondage préparé (acceptation des critères, attestation, limites, détour) s'affiche dans la vue ; la
  réponse de l'humain y est lue par le même socle que dans le chat (`.claude/hooks/prepared-poll.mjs`), avec les mêmes refus et la
  même corrélation ; une réponse fabriquée par l'agent reste refusée (QUA-235) — `QUA-nouveau-2`
- Lot 3 — Le lancement d'un chantier se fait depuis la vue par le même sondage que `/drwil-start` (QUA-142,
  QUA-160), lu par le même hook — `QUA-nouveau-3`
- Lot 4 — La vue porte une conversation avec l'agent (envoi, réponses en flux, questions de l'agent), de la même
  façon sous Claude Code et Copilot CLI, par un canal qui ne dépend d'aucune fonction propre à un outil ; prouvé par
  des tests en dur sur un faux agent du protocole retenu — `QUA-nouveau-4`
- Essai réel sur téléphone par Tailscale, Claude Code et Copilot CLI [humain] — contrat `Manuel` à créer

## Contrats modifiés

(À valider par le demandeur ; aucun n'est modifié sans son oui.)

- `QUA-280` — ancien critère : « n'accepte que `GET` et n'écrit rien dans le projet ; il ne lance que des commandes
  de lecture » — raison proposée : la vue écrit (intentions, réponses aux sondages, lancement, messages à l'agent),
  par des routes nommées, sous jeton et confirmation (selon P4) ; la lecture seule reste la règle de toute autre route.
- `QUA-281` — ancien critère : jeton exigé hors de `127.0.0.1` seulement — raison proposée : toute route qui écrit
  exige une preuve d'origine même en local (selon P4 : jeton, en-tête anti-CSRF, confirmation).
- `QUA-235` — ancien critère : seule la réponse dans le retour de l'outil de question de l'agent confirme — raison
  proposée : la réponse donnée dans la vue est la même réponse humaine, portée par le canal du serveur (selon P3).

## 2. Hors périmètre

- Le verdict de recette d'une candidate (`.githooks/release-verdict.mjs`) : reste un geste au terminal, sauf décision contraire
  (P3).
- Un fournisseur d'identité embarqué ; une couche OIDC éventuelle reste optionnelle (P4).
- Remote Control de Claude Code ou toute fonction propre à un outil.
- Une application mobile : la page web seule, à 360 px (QUA-276).

## 3. Contraintes

- **Principes directeurs** (demandeur, 2026-11-22, en ses mots) : « sécure, optimisé et performance, rapidité, tester
  et prouver, évolutivité et fiabilité ». Six axes : sécurité, performance, rapidité, preuve, évolutivité,
  fiabilité. Chaque lot dit l'axe qu'il sert et ce qui pourrait en dégrader un autre (section 6). La rapidité ne
  s'achète jamais par un contrôle sauté ou désactivé (QUA-019) : « vite, mais prouvé ».
- QUA-018 : livrable d'abord (CLI du paquet, gabarit), puis `npm run installer-depot` pour le dépôt.
- `commander` reste la seule dépendance d'exécution (QUA-280), sauf décision contraire (P2 : SDK d'un outil).
- `packages/drwil/src/cli-serve.ts` au plafond de 200 lignes, `packages/drwil/src/serve.ts` à 182 (QUA-001) : modules ajoutés.
- Toute réponse masquée (QUA-271) ; le jeton jamais dans une sortie (QUA-281).
- Les gestes humains restent des gestes humains : un agent ne répond jamais à un sondage à la place de l'humain,
  ni par la vue (QUA-235).
- La vue est ouverte sur le réseau privé (Tailscale) et au téléphone.

## 4. Décisions

Aucune encore (cadrage du 2026-11-22, rien de tranché).

## 5. Points à trancher

- [décision] **P1 — Découpage.** Alternatives : (a) une fiche, quatre lots (1. intentions depuis la vue, 2. sondages,
  3. lancement, 4. conversation complète) ; (b) quatre fiches, une par étape, chacune lancée après la fusion de la
  précédente ; (c) deux fiches : la vue qui écrit (1 à 3) et la conversation (4). Recommandation : (b) ou (c) — chaque
  étape modifie des contrats différents et la 4 dépend de P2, encore très ouvert ; une fiche à quatre lots resterait
  longtemps « à affiner ».
- [décision] **P2 — Canal serveur ↔ agent.** Alternatives : (a) mode non interactif (`claude -p`, `copilot -p`) relancé
  à chaque message avec reprise de session (`--resume`/`--continue` ou équivalent) : simple, mais pas de question en
  cours de tour ; (b) protocole ACP (Agent Client Protocol), dont drwil a déjà un client pour Cursor : questions et
  permissions en cours de tour, une seule implémentation pour les agents qui le parlent (à vérifier par outil :
  Copilot CLI, Gemini CLI, Claude Code par adaptateur) ; (c) SDK propre à chaque outil (SDK Claude Agent, SDK
  Copilot) : riche, mais un adaptateur et une dépendance par outil. Recommandation : (b), en généralisant le client
  de `drwil cursor`, (a) en repli pour un outil sans ACP ; relevé par outil avant de trancher.
- [décision] **P3 — Preuve des gestes humains depuis la vue.** Alternatives : (a) la vue répond à la question de
  l'agent par le canal (P2), l'outil renvoie la réponse dans son retour et le hook existant la lit telle quelle
  (aucun changement de QUA-235) ; (b) le serveur écrit la réponse dans un fichier que le hook lit, nouveau chemin de
  preuve ; (c) mixte. Recommandation : (a), un seul chemin de preuve ; (b) ouvre un second chemin moins sûr. Et :
  l'attestation et le verdict de recette passent-ils par la vue (la note du 2026-11-13 les gardait au terminal) ?
- [décision] **P4 — Authentification dès que la vue écrit.** Alternatives : (a) jeton actuel (QUA-281) exigé aussi
  en local pour toute écriture, plus un en-tête anti-CSRF ; (b) (a) plus une confirmation par geste (code à usage
  unique affiché au terminal de l'agent) ; (c) couche OIDC optionnelle. Recommandation : (a) pour les lots 1 à 3,
  (b) pour l'attestation si P3 l'admet ; (c) plus tard. Et : un journal des actions faites depuis la vue (QUA-274
  étendu) ?
- [décision] **P5 — Quel agent derrière la vue.** Alternatives : (a) la session qui a lancé le serveur (« celui qui a
  lancé le serveur ») : exige que cette session écoute le serveur, ce que ni Claude Code ni Copilot CLI n'offrent
  sans fonction propre ; (b) une session lancée par le serveur, dans le même dossier, reprise à chaque ouverture de
  la vue ; (c) (b) en reprenant la dernière session de l'outil (`--resume`). Recommandation : (b) ou (c), seuls
  possibles sans fonction propre à un outil ; à confronter à la demande (a).
- [décision] **P6 — Durée de vie.** Le serveur survit à la session qui l'a lancé (QUA-272, `--detach`). Question :
  l'agent porté par le serveur vit-il avec le serveur, s'arrête-t-il après une inactivité, et que voit la vue quand
  il n'y en a pas ? Recommandation : agent lancé à la demande, arrêté après inactivité, état dit dans la vue.
- [décision] **P7 — Où s'écrit le cadrage fait depuis la vue.** Alternatives : (a) dans le dossier servi (risque de
  toucher le chantier en cours) ; (b) dans un worktree de cadrage depuis la branche principale (lien avec
  `docs/projects/cadrer-en-parallele-du-chantier.md`), PR de cadrage en fusion automatique. Recommandation : (b),
  après ce chantier-là.
- [décision] **P8 — Périmètre (QUA-018).** Alternatives : (a) dans le paquet pour tout adoptant dès le lot 1 ; (b)
  d'abord dans ce dépôt, puis livré. Recommandation : (a), `drwil serve` est déjà dans le paquet.
- [décision] **P9 — Outils couverts au premier essai.** Claude Code et Copilot CLI demandés ; Gemini CLI, Codex,
  Cursor ensuite ? Recommandation : les deux demandés, les autres au relevé de P2.
- [décision] **P11 — Aperçu en direct de l'application de l'adoptant dans la vue**, rechargé à chaque lot.
  Alternatives : (a) dans le périmètre, nouveau lot (la vue lance la commande « run-locally » déclarée et en montre
  l'adresse) ; (b) plus tard, fiche à part ; (c) écarté. Recommandation : (b) ; sert la rapidité, peut dégrader la
  sécurité (application exposée sur le réseau privé) et la performance (serveur de l'adoptant tenu en vie).
- [décision] **P12 — Déploiement en un geste depuis la vue**, lié à `docs/recipes/deploy-to-production.md`, jamais sans
  demande explicite. Alternatives : (a) dans le périmètre, geste humain par sondage lu par le hook ; (b) plus tard,
  fiche à part ; (c) écarté. Recommandation : (b), après les sondages depuis la vue ; sert la rapidité, risque fort
  sur la sécurité et la fiabilité (production).
- [décision] **P13 — Où en est l'application de l'adoptant** (précision du demandeur, 2026-11-22). En plus de l'état de
  gouvernance, la vue montre où en est le produit de l'adoptant sur ses dimensions (UX, applicatif et métier,
  données, sécurité, performance…) ; l'aperçu en direct (P11) sert la dimension UX. Alternatives : (a) dans le
  périmètre, une vue par dimension lue des contrats par thème (préfixes `APP-`, `SEC-` du catalogue, `UI-`, `DAT-`,
  `SRC-` vus chez un projet adoptant) et de leur verdict ; (b) plus tard, après le priorisateur
  (`docs/projects/priorisateur-urgence-et-valeur.md`, P12), qui tranche comment les dimensions se déclarent ;
  (c) écarté. Recommandation : (b), une seule déclaration des dimensions pour les deux fiches.
- [décision] **P10 — Priorité et version cible** (intention proposée en P1 ; rien de fixé par la demande).

## 6. Increments

(Si P1 retient une seule fiche ; sinon chaque lot devient une fiche.)

- **Lot 1 — intentions depuis la vue** [IA] : routes d'écriture nommées, jeton et anti-CSRF (P4), écriture sur une
  branche de cadrage (P7), QUA-280 et QUA-281 réécrits. Critère de sortie : `node .githooks/run-checks.mjs` sans
  échec, `drwil verify --agent` en `GOVERNANCE: PASS`.
- **Lot 2 — sondages depuis la vue** [IA] : selon P2 et P3. Critère de sortie : idem, tests du socle des sondages
  rejoués sous la forme de la vue.
- **Lot 3 — lancement depuis la vue** [IA] : sondage de lancement porté par la vue. Critère de sortie : idem.
- **Lot 4 — conversation complète** [IA] : canal retenu en P2, agent selon P5 et P6, flux dans la page.
  Critère de sortie : idem.
- **Lot 5 — essai réel** [humain] : téléphone par Tailscale, Claude Code et Copilot CLI ; attestation du contrat
  `Manuel`.

Grille des six axes par lot (à confirmer avec P1) :

- **Lot 1** sert la sécurité et la preuve (écriture sous jeton, testée en dur) ; peut dégrader la sécurité si une
  route d'écriture échappe au jeton ou à l'anti-CSRF, et la fiabilité si elle écrit sur la branche d'un chantier.
- **Lot 2** sert la preuve (même socle de sondages que le chat) ; peut dégrader la sécurité si un second chemin de
  preuve s'ouvre (P3 b), et la rapidité si chaque réponse attend un aller-retour lent avec l'agent.
- **Lot 3** sert la rapidité (lancer du téléphone) ; peut dégrader la fiabilité si le lancement contourne le sondage
  de lancement (QUA-142, QUA-160).
- **Lot 4** sert la rapidité et l'évolutivité (un canal pour tous les outils) ; peut dégrader la performance (un agent
  qui tourne avec le serveur, P6), la sécurité (l'agent piloté depuis le réseau) et la fiabilité (reprise de
  session).
- **Lot 5** sert la preuve (essai réel) ; aucun axe dégradé.

## 7. Reprise

- **Dernier état** (2026-11-22) : cadrage écrit, points P1 à P13 ouverts.
- **Prochaine étape** : [décision] trancher P1 à P13 avec le demandeur ; relevé ACP par outil pour P2.

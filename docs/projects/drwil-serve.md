# Projet : `drwil serve`, une vue du projet en direct, pour tout adoptant

**Statut** : cadré le 2026-11-08.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/drwil-serve.md`

<!-- scope
files:
  - packages/drwil/bin/drwil.js
  - packages/drwil/package.json
  - packages/drwil/CHANGELOG.md
  - packages/drwil/serve/page.html
  - packages/drwil/src/cli-serve.ts
  - packages/drwil/src/serve.ts
  - packages/drwil/src/serve-auth.ts
  - packages/drwil/src/serve-forge.ts
  - packages/drwil/src/serve-journal.ts
  - packages/drwil/src/serve-read.ts
  - packages/drwil/src/serve-texts.ts
  - packages/drwil/src/serve-github.ts
  - packages/drwil/src/serve-gitlab.ts
  - packages/drwil/src/serve-board.ts
  - packages/drwil/src/serve-releases.ts
  - packages/drwil/src/serve-details.ts
  - packages/drwil/src/serve-watch.ts
  - packages/drwil/src/cli-install.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/config.ts
  - packages/drwil/src/config-text.ts
  - packages/drwil/src/config-write.ts
  - packages/drwil/src/install.ts
  - packages/drwil/src/migration-table.ts
  - packages/drwil/test/serve.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/test/migration.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/recipes/audit-risks-and-debt.md
  - packages/drwil/templates/common/base/docs/recipes/track-consumption-per-increment.md
  - packages/drwil/templates/common/base/docs/recipes/view-progress.md
  - packages/drwil/templates/common/optional/dashboard/README.md
  - packages/drwil/templates/common/optional/dashboard/dashboard-read.mjs
  - packages/drwil/templates/common/optional/dashboard/dashboard-texts.mjs
  - packages/drwil/templates/common/optional/dashboard/dashboard.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/serve-welcome.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - packages/drwil/templates/common/tools/claude/.claude/skills/README.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil-serve/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/view-progress/SKILL.md
  - packages/drwil/templates/common/tools/codex/.codex/hooks.json
  - packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json
  - packages/drwil/templates/common/tools/gemini/.gemini/settings.json
  - .claude/hooks/serve-welcome.mjs
  - .claude/settings.json
  - .claude/skills/README.md
  - .claude/skills/drwil/SKILL.md
  - .claude/skills/drwil-serve/SKILL.md
  - .claude/skills/view-progress/SKILL.md
  - .codex/hooks.json
  - .github/hooks/drwil.json
  - .gemini/settings.json
  - .githooks/dashboard-read.mjs
  - .githooks/dashboard-texts.mjs
  - .githooks/dashboard.mjs
  - .githooks/dashboard.test.mjs
  - .gitignore
  - AGENTS.md
  - README.md
  - docs/architecture.md
  - docs/features.md
  - docs/contracts.md
  - docs/decouverte-valeur.md
  - docs/mesures-ci-reference.md
  - docs/recipes/audit-risks-and-debt.md
  - docs/recipes/track-consumption-per-increment.md
  - docs/recipes/view-progress.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
  - docs/intentions/drwil-serve.md
  - docs/projects/drwil-serve.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le demandeur suit ses chantiers avec un prototype personnel, `drwil-vue` (`~/outils/drwil-vue`), et veut l'offrir à
tout adoptant : le lancer depuis le chat, recevoir le lien à l'ouverture d'une session, et le consulter d'abord sur
téléphone. Le tableau de bord statique (`drwil-progress`) est remplacé.

Écarts relevés le 2026-11-08 entre le prototype et un usage générique :

- Dépôt par défaut et chemins de documentation en dur, là où `.githooks/dashboard-read.mjs` lit `cfg.dirs` ; repli sur
  `origin/master`.
- `events.jsonl` rangé à côté de l'outil : dans un paquet, un journal partagé entre projets.
- `gh` seul, alors que le kit livre aussi GitLab.
- Regex sur la sortie française de `.githooks/state.mjs` (`Activité :`) ; interface et dates en français seul.
- Noms d'auteurs et logins affichés (`details.mjs:44,64`).
- Écoute sur `0.0.0.0` sans jeton (`serve.mjs:181`).
- Page sans balise `viewport`, une seule règle `@media` : rien de mobile.
- Aucun test.

## Critères d'acceptation

- `drwil serve` sert le dépôt courant en lecture seule, sur `127.0.0.1` par défaut, sans écrire aucun fichier suivi et
  sans dépendance d'exécution nouvelle — contrat à créer `QUA-269`
- Hors de `127.0.0.1` (`--host`), le serveur refuse de démarrer sans jeton et refuse toute requête sans jeton valide ;
  le jeton n'apparaît jamais dans une sortie lue par le modèle — contrat à créer `QUA-270`
- Aucune donnée nominative (auteur, login, courriel) ni secret dans une réponse de l'API — contrat à créer `QUA-271`
- `drwil serve --detach` est idempotent : serveur déjà démarré pour ce projet, il redonne son adresse sans en lancer
  un second ; deux projets ou worktrees ouverts ensemble ont chacun leur serveur — contrat à créer `QUA-272`
- Un projet sans `.drwil/usage.jsonl`, sans preuves ou sans forge joignable affiche ses vues vides, sans erreur, et
  dit ce qui manque — contrat `QUA-275`
- Les vues CI, PR et MR fonctionnent à parité sur GitHub (`gh`) et GitLab (`glab`), la forge étant détectée — contrat
  `QUA-273`
- Le journal d'événements est propre à chaque projet et vit hors du dépôt — contrat `QUA-274`
- La page s'utilise sur un écran de 360 px de large, sans défilement horizontal, en français et en anglais selon `lang`
  — contrat `QUA-276`
- À l'ouverture d'une session, un projet qui a choisi le démarrage automatique voit le serveur démarré s'il ne tournait
  pas, et l'humain reçoit le lien sans qu'aucun octet n'entre dans le contexte du modèle ; un outil qui ne sait pas
  montrer ce message donne le lien par le skill — contrat à créer
- Sans Tailscale, le serveur et le message d'accueil fonctionnent en local, sans erreur, et le message dit comment ouvrir
  l'accès au téléphone ; avec Tailscale, le lien donné est celui du réseau privé — contrat à créer
- Le démarrage automatique est proposé à l'installation et n'est jamais activé sans réponse de l'humain ; il n'écoute
  que sur `127.0.0.1` — contrat à créer
- `drwil-progress` et le module `optional/dashboard` sont retirés ; `drwil serve` montre tout ce qu'ils montraient,
  tendances de QUA-198 comprises ; un projet déjà équipé est migré par la mise à jour, sans fichier orphelin — contrat
  à créer, QUA-198 modifié

## Contrats modifiés

- QUA-198 (« Le tableau de bord montre la tendance de la durée de la CI et du cache lu par requête ») : la règle, le
  périmètre, la source de vérité et la preuve passent de `.githooks/dashboard*.mjs` et `optional/dashboard` à
  `drwil serve` ; les seuils et l'alerte non bloquante ne changent pas. Validé par le demandeur le 2026-11-08.
- `.githooks/dashboard.mjs` — retiré au lot 5, remplacé par `drwil serve` (validé par le demandeur le 2026-11-08)
- `.githooks/dashboard-read.mjs` — retiré au lot 5, ses lectures portées dans `packages/drwil/src/serve-read.ts` (validé par le demandeur le 2026-11-08)
- `.githooks/dashboard-texts.mjs` — retiré au lot 5, ses textes portés dans `packages/drwil/src/serve-texts.ts` (validé par le demandeur le 2026-11-08)

## 2. Hors périmètre

- Sondages cliquables derrière un jeton, journal des actions, couche OIDC (`--oidc-issuer`) : après la première version.
- Tout geste humain depuis la page : lancer un chantier, attester, verdict de recette.
- Chat web intégré : intention distincte.
- Ouverture automatique du navigateur sur l'ordinateur.
- Le reste de l'accueil de session (`docs/intentions/accueil-drwil-a-l-ouverture.md`) : ce chantier n'y prend que la
  ligne du lien.
- Vue de relecture d'une PR (`docs/intentions/vue-de-relecture.md`) : intention à part, qui pourra s'y greffer.

## 3. Contraintes

- QUA-018 (dépôt ou livrable) : livrable. Le serveur vit dans la CLI du paquet ; le skill et le hook d'accueil vivent
  dans le gabarit (`packages/drwil/templates/`), copiés au dépôt par `npm run installer-depot`.
- Aucun fichier de plus chez l'adoptant pour le serveur lui-même ; le journal d'événements va dans le cache utilisateur.
- Node 22 sans dépendance d'exécution nouvelle (`commander` reste la seule).
- Le hook de début de session ne bloque jamais l'ouverture et ne fait pas échouer la session si le serveur ne démarre
  pas ; il n'interroge pas la forge.
- Le serveur n'écrit jamais dans le dépôt et ne lance que des commandes de lecture (`git`, `gh`, `glab`,
  `.githooks/state.mjs`), sans shell ; les paramètres d'URL sont validés avant d'atteindre une commande.
- Le lien portant un jeton n'est donné à l'humain que par un canal qui n'entre pas dans le contexte du modèle.
- Un critère mécanique se prouve par un test ; seule la lisibilité sur un vrai téléphone relève de l'attestation.

## 4. Décisions

Toutes du demandeur, le 2026-11-08 :

- Générique pour tout adoptant : commande du paquet plus skill et hook du gabarit.
- Interface mobile first.
- GitLab dès la première version, à parité avec GitHub.
- Accès depuis le téléphone : `127.0.0.1` par défaut ; `tailscale serve` si Tailscale est présent, qui publie le port
  sur le réseau privé en HTTPS sans écouter sur `0.0.0.0` ; sinon `--host` avec jeton obligatoire. Tailscale n'est jamais
  requis ni installé par le kit : sans lui, tout fonctionne sur l'ordinateur et le message d'accueil dit comment ouvrir
  l'accès au téléphone.
- Essai réel de la parité GitLab sur gitlab.com, avec un projet d'essai.
- Au démarrage d'une session : démarrer le serveur s'il ne tourne pas et donner le lien dans le chat, sans ouvrir de
  navigateur.
- Démarrage automatique proposé à l'installation, jamais activé par défaut.
- `drwil-progress` est retiré, une fois `drwil serve` à parité.
- Sondages cliquables hors de la première version : lecture seule.
- Liens vers les PR et MR de la page : par une redirection côté serveur ; aucune réponse de l'API ne contient d'adresse de
  forge (QUA-271).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — commande et sécurité** [IA] : `drwil serve [--host] [--port] [--detach]`, lectures génériques portées du
  prototype, `127.0.0.1` par défaut, jeton hors local, API sans donnée nominative, un serveur par projet. Critère de
  sortie : tests verts sur un projet d'essai installé depuis le paquet.
- **Lot 2 — forges et journal** [IA] : couche forge GitHub et GitLab, vues masquées si la forge est injoignable, journal
  par projet dans le cache utilisateur. Critère de sortie : tests des deux adapteurs verts, essai réel sur chaque forge.
- **Lot 3 — interface mobile et bilingue** [IA] : page refondue mobile first, FR/EN selon `lang`, toutes les vues du
  prototype, vues des intentions et des mesures de CI, tendances de QUA-198. Critère de sortie : 360 px sans défilement
  horizontal, lisibilité attestée sur un vrai téléphone.
- **Lot 4 — chat et accueil** [IA] : skill `/drwil-serve`, hook d'accueil par `systemMessage`, question à l'installation,
  publication par `tailscale serve`, parité des outils. Critère de sortie : aucun octet injecté au modèle prouvé par
  test, comportement de chaque outil relevé.
- **Lot 5 — retrait de `drwil-progress`** [IA] : module, skill, recette et références retirés, migration d'un projet
  équipé, QUA-198 déplacé. Critère de sortie : `GOVERNANCE: PASS`, projet équipé migré sans orphelin.

## 7. Reprise

- **Dernier état** (2026-11-08) : lots 1 et 2 faits, essais réels compris. Lot 1 : `drwil serve [--host] [--port] [--detach]` existe (`packages/drwil/src/cli-serve.ts`, `packages/drwil/src/serve.ts`,
  `packages/drwil/src/serve-auth.ts`, `packages/drwil/src/serve-read.ts`, `packages/drwil/src/serve-texts.ts`, `packages/drwil/src/serve-journal.ts`), contrats QUA-269 à QUA-272, tests `packages/drwil/test/serve.test.mjs`.
- **Choix du lot 1, à garder** :
  - Le jeton vient de la seule variable `DRWIL_SERVE_TOKEN` (32 caractères au moins), jamais d'une option. L'entrée par
    `/?token=` pose un cookie d'empreinte et redirige.
  - `packages/drwil/src/serve-auth.ts` : `maskPersonal` est le filtre unique des réponses, appelé par `send` ; toute route nouvelle y passe.
  - Enregistrement server.json dans `projectCacheDir(racine)` (cache de l'utilisateur, un dossier par chemin réel) ; le
    journal d'événements du lot 2 ira dans ce même dossier.
- **Lot 2 fait côté code** (2026-11-08) : couche forge `packages/drwil/src/serve-forge.ts` et ses adapteurs `packages/drwil/src/serve-github.ts`, `packages/drwil/src/serve-gitlab.ts`, tableau `packages/drwil/src/serve-board.ts`, releases `packages/drwil/src/serve-releases.ts`, détails `packages/drwil/src/serve-details.ts`, journal `packages/drwil/src/serve-journal.ts` alimenté par `packages/drwil/src/serve-watch.ts`, contrats QUA-273 à QUA-275. Routes : `/api/ci`, `/api/board`, `/api/releases`, `/api/events`, `/api/detail?key=`, `/api/workstream?name=`. Essai réel sur GitHub fait sur ce dépôt.
- **Essai réel sur gitlab.com fait** (2026-11-08), sur un projet d'essai privé du demandeur, avec une MR ouverte, un pipeline en cours et un pipeline terminé, depuis un clone local initialisé : forge détectée `gitlab` ; `/api/ci`, `/api/board`, `/api/releases`, `/api/events`, `/api/usage`, `/api/contracts`, `/api/docs` et `/api/detail` (MR, pipeline, commit) répondent 200 avec les bonnes données, sans login, courriel, jeton ni adresse de forge. Non essayés sur GitLab : une MR fusionnée, une release publiée, `/api/workstream`.
- **Choix du lot 2, à garder** :
  - Aucune adresse de forge dans une réponse : le namespace d'une adresse est souvent un login (QUA-271). Une PR se désigne par son numéro, `url` n'existe plus.
  - Les textes du journal et de `missing` viennent de `packages/drwil/src/serve-texts.ts`, dans la langue du projet ; le tableau rend des codes (`stage`, `ready`), à traduire par la page.
  - Une clé d'événement de commit porte 12 caractères de SHA : un SHA entier serait masqué comme secret.
  - `glab api` (REST stable) plutôt que `glab mr list` ; les étapes d'un job n'existent que sur GitHub.
- **Lot 3 fait** (2026-11-08) : `packages/drwil/serve/page.html` refondue, mobile first, FR/EN selon `lang` (dix onglets : CI, tableau, fil, releases, contrats, consommation, mesures, fiches, intentions, notes). Liens PR et MR par `GET /forge/pr/<n>` (302, corps vide, QUA-269, QUA-271, QUA-273). `/api/measures` : tendances de QUA-198 (tendance de la durée de CI et du cache lu) lues dans `.drwil/usage.jsonl` et le journal, sur le code du tableau de bord. `/api/contracts` donne `head`. Contrat QUA-276 (page à 360 px, FR/EN) : tests en dur, part humaine `**Manuel**`.
- **Choix du lot 3, à garder** :
  - Chaque onglet ne lit que ses routes, et rien quand l'onglet du navigateur est masqué : un téléphone n'interroge pas la forge pour rien.
  - Les libellés sont dans un bloc JSON de la page (`#i18n`), lu par les tests de QUA-276 (parité FR/EN, codes) ; les textes `missing` et le journal restent dans `packages/drwil/src/serve-texts.ts`, dans la langue du projet.
  - Mesure réelle du 2026-11-08 dans Chromium, 360 px, tous onglets dépliés, sur ce dépôt (français) et sur un projet d'essai anglais à données longues : `scrollWidth` égal à la largeur, aucune erreur de script. La CI n'a pas de navigateur : la preuve durable est structurelle, la lisibilité sur téléphone reste à attester (QUA-276, attestation humaine attendue en VERIFY).
- **Course corrigée au lot 3** : `findRunning` effaçait server.json même sans l'avoir lu, donc parfois la réservation d'un concurrent : deux serveurs, dont un orphelin (QUA-272). Reproduit 1 fois sur 25 sous charge ; 0 sur 25 avec le correctif, ce qui à cette fréquence ne prouve pas seul : la preuve est la lecture du code. Reste une fenêtre plus étroite, sur un enregistrement périmé relu par deux démarrages simultanés.
- **Pour les lots suivants** :
  - Lot 4 : avec `tailscale serve`, l'en-tête `Host` reçu en `127.0.0.1` sera sans doute le nom du réseau privé, refusé
    aujourd'hui par `localHostHeader` (QUA-269, défense contre le DNS rebinding) : à autoriser explicitement, sans
    ouvrir le contrôle aux autres noms.
  - `packages/drwil/src/serve-read.ts` et `packages/drwil/src/cli-serve.ts` approchent le plafond de 200 lignes (QUA-001, fichier de code plafonné) ;
    ce qui s'y ajoute peut demander un
    nouveau fichier, à déclarer au bloc `scope`.

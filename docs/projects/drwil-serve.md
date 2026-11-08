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
  - packages/drwil/src/serve-publish.ts
  - packages/drwil/src/serve-views.ts
  - packages/drwil/src/cli-install.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/config.ts
  - packages/drwil/src/config-text.ts
  - packages/drwil/src/config-write.ts
  - packages/drwil/src/install.ts
  - packages/drwil/test/serve.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/.githooks/check-kit-size.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/serve-welcome.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - packages/drwil/templates/common/tools/claude/.claude/skills/README.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil-serve/SKILL.md
  - packages/drwil/templates/common/tools/codex/.codex/hooks.json
  - packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json
  - packages/drwil/templates/common/tools/gemini/.gemini/settings.json
  - .claude/hooks/serve-welcome.mjs
  - .claude/settings.json
  - .claude/skills/README.md
  - .claude/skills/drwil/SKILL.md
  - .claude/skills/drwil-serve/SKILL.md
  - .codex/hooks.json
  - .github/hooks/drwil.json
  - .gemini/settings.json
  - .githooks/check-kit-size.mjs
  - .githooks/check-kit-size.test.mjs
  - .gitignore
  - AGENTS.md
  - README.md
  - docs/architecture.md
  - docs/features.md
  - docs/contracts.md
  - docs/decouverte-valeur.md
  - docs/mesures-ci-reference.md
  - .drwil/ia-first.json
  - docs/intentions/drwil-serve.md
  - docs/intentions/retrait-de-drwil-progress.md
  - docs/projects/drwil-serve.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le demandeur suit ses chantiers avec un prototype personnel, `drwil-vue` (`~/outils/drwil-vue`), et veut l'offrir à
tout adoptant : le lancer depuis le chat, recevoir le lien à l'ouverture d'une session, et le consulter d'abord sur
téléphone. Le retrait du tableau de bord statique (`drwil-progress`) est reporté (`docs/intentions/retrait-de-drwil-progress.md`).

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
  montrer ce message donne le lien par le skill — contrat `QUA-277`
- Sans Tailscale, le serveur et le message d'accueil fonctionnent en local, sans erreur, et le message dit comment ouvrir
  l'accès au téléphone ; avec Tailscale, le lien donné est celui du réseau privé — contrat `QUA-278`
- Le démarrage automatique est proposé à l'installation et n'est jamais activé sans réponse de l'humain ; il n'écoute
  que sur `127.0.0.1` — contrat `QUA-279`
- `drwil serve` montre tout ce que montraient `drwil-progress` et le module `optional/dashboard`, tendances de QUA-198
  comprises — QUA-276 ; leur retrait est reporté à `docs/intentions/retrait-de-drwil-progress.md`.

## Contrats modifiés

- `.githooks/check-kit-size.mjs` — nouvelle sorte « réglages », plafond 250 lignes, pour les seuls fichiers de réglages des outils (`.claude/settings.json`, `.gemini/settings.json`) ; les autres plafonds ne changent pas (validé par le demandeur le 2026-11-08)
- QUA-157 (« La taille de chaque fichier que le kit installe est surveillée ») : les fichiers de réglages des outils (`.claude/settings.json`, `.gemini/settings.json`) ont leur propre plafond, 250 lignes, au lieu des 200 du code et des hooks ; les autres plafonds ne changent pas. Validé par le demandeur le 2026-11-08.

## 2. Hors périmètre

- Sondages cliquables derrière un jeton, journal des actions, couche OIDC (`--oidc-issuer`) : après la première version.
- Tout geste humain depuis la page : lancer un chantier, attester, verdict de recette.
- Chat web intégré : intention distincte.
- Ouverture automatique du navigateur sur l'ordinateur.
- Le retrait de `drwil-progress`, sa migration et le passage de QUA-198 sur `drwil serve` : `docs/intentions/retrait-de-drwil-progress.md`.
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
- `drwil-progress` est retiré, une fois `drwil serve` à parité : reporté à un chantier à part, sur décision du demandeur
  le 2026-11-08 (PR plus petite). Seule la parité reste dans ce chantier.
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
- **Lot 5 — parité avec le tableau de bord** [IA] : audits, index, catalogue, statut des fiches et modèles dans la page.
  Critère de sortie : `GOVERNANCE: PASS`, tout ce que montrait le tableau de bord est visible.

## 7. Reprise

- **Dernier état** (2026-11-08) : lots 1 à 5 faits (le lot 5 porte la parité, le retrait est reporté) ; reste à vérifier et clore. Lot 1 : `drwil serve [--host] [--port] [--detach]` existe (`packages/drwil/src/cli-serve.ts`, `packages/drwil/src/serve.ts`,
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
- **Lot 4 fait** (2026-11-08) : skill `/drwil-serve` et `drwil serve --welcome` (`packages/drwil/src/serve-publish.ts`), hook d'accueil `.claude/hooks/serve-welcome.mjs` (`SessionStart` de Claude Code, Gemini CLI, Codex ; `sessionStart` de Copilot CLI, muet), question à l'installation (`chooseServeAutostart`, clé `serveAutostart`, options `--serve-autostart` et `--no-serve-autostart`), publication par `tailscale serve`. Contrats QUA-277 (accueil de session sans octet au modèle), QUA-278 (Tailscale jamais requis, lien du réseau privé), QUA-279 (démarrage automatique sur réponse de l'humain, `127.0.0.1` seul) ; règle de `Host` de QUA-269 (lecture seule) étendue au nom publié.
- **Choix du lot 4, à garder** :
  - `--welcome` écoute toujours sur `127.0.0.1` sans jeton : sa ligne ne porte aucun secret, elle peut donc passer par le chat d'un outil sans canal vers l'humain.
  - Le nom Tailscale admis vient d'un fichier d'enregistrement, published.json, écrit dans le cache du projet par la commande avant la publication et effacé sans publication : le serveur ne lance pas `tailscale` (QUA-269).
  - Port HTTPS du réseau privé égal au port local du projet : plusieurs projets coexistent, le lien reste stable.
- **Plafond des réglages, décision du demandeur du 2026-11-08** : l'entrée `SessionStart` du hook d'accueil faisait passer `packages/drwil/templates/common/tools/claude/.claude/settings.json` de 199 à 209 lignes, au-delà des 200 du code et des hooks (QUA-157, taille des fichiers du kit). Sur son choix, par sondage, `.claude/settings.json` et `.gemini/settings.json` ont leur propre plafond de 250 lignes ; les autres plafonds n'ont pas changé.
- **Comportement de chaque outil relevé** (2026-11-08) :
  - Claude Code 2.1.319, essai réel avec un hook `SessionStart` portant une valeur témoin dans chaque champ : le modèle voit `additionalContext`, jamais `systemMessage`.
  - Gemini CLI 0.61.0 : documentation seule (`systemMessage` « Displayed immediately to the user ») ; l'essai réel n'a pas abouti (délai dépassé).
  - Codex (non installé sur le poste) : documentation seule (`systemMessage` « Surfaced as a warning in the UI or event stream », texte brut sur stdout ajouté au contexte, d'où le JSON seul).
  - Copilot CLI 1.0.107 : documentation seule (« Only `additionalContext` is consumed for `sessionStart` ») : aucun canal vers l'humain, le lien passe par `/drwil-serve`. Essai réel non fait : le lancement de cet agent a été refusé à l'agent de ce lot.
  - Cursor : documentation seule (`sessionStart` ne connaît que `additional_context`, lu par le modèle, `user_message` n'est pas affiché) : aucun canal, aucun hook livré, `AGENTS.md` donne la commande.
- **Reste à essayer par un humain** : `tailscale serve` réel. Le poste de développement n'a pas HTTPS activé sur son réseau (`CertDomains` vide) : le chemin publié n'est prouvé que par un binaire factice, dont l'hypothèse que Tailscale transmet l'en-tête `Host` d'origine (les deux formes, avec et sans port, sont admises).
- **Port corrigé au lot 4** : un projet dont l'empreinte tombait sur 5060 ou 5061 recevait un lien que les navigateurs refusent (« bad port »), ce qui a fait échouer une fois un test de QUA-277 (accueil de session sans octet au modèle). La plage du port propre au projet est réduite à 4317–5016, essais compris sous 5060. Le port d'un projet change donc d'une version à l'autre, sans conséquence avant la première sortie.
- **Lot 5, parité faite** (2026-11-08) : `packages/drwil/src/serve-views.ts` porte les routes documentaires (`/api/docs`, `/api/contracts`, `/api/usage`, `/api/measures`, `/api/audits`) et `parseContracts` (titres `## ID` et lignes de tableau). Ajouts : onglet Audits (QUA-275 si absent, avertissement au-delà de 30 jours, ligne nominative écartée, QUA-271), cases de l'index, statut des fiches, autres fichiers du dossier des fiches, catalogue, modèles par chantier ; une ligne de consommation sans date reste comptée. Comparaison réelle sur ce dépôt, tableau de bord contre API : 84 cases, 11 fiches (8 + 3), 280 contrats et catalogue sans écart, 76 chantiers. Mesure dans Chromium à 360 px, les onze onglets, tout déplié : `scrollWidth` 360, aucune erreur de script.
- **Retrait reporté** (2026-11-08, décision du demandeur) : le constat et les décisions déjà prises sont dans `docs/intentions/retrait-de-drwil-progress.md`.
- **Pour les lots suivants** :
  - `packages/drwil/src/cli-serve.ts` est à 200 lignes, `packages/drwil/src/serve.ts` à 199 (QUA-001, fichier de code plafonné) : tout ajout y demande un nouveau fichier, à déclarer au bloc `scope`.

# Journal des chantiers clôturés

Résumé condensé de chaque fiche `docs/projects/` une fois son Statut passé
à « fait » (toute la fiche, pas un simple point parmi d'autres d'une fiche
qui reste ouverte par ailleurs). La fiche détaillée est alors supprimée :
plus d'historique complet en clair dans le dépôt, mais rien n'est perdu —
`git log --follow -- docs/projects/<fiche>.md` (ou le commit/la PR de
clôture cités ci-dessous) retrouve le texte intégral à tout moment.

Objectif : garder `docs/projects/` léger (fiches actives seulement) sans
sacrifier la traçabilité, qui reste de toute façon dans git. Voir la
recette `docs/recipes/working-with-branches.md`, section « Clôturer ».

Une entrée par chantier clôturé, la plus récente en dernier.

Les numéros de PR cités avant le 2026-10-09 renvoient au dépôt privé
archivé `wdubilly/drwil-archive` : le dépôt public, ouvert ce jour-là après
réécriture de l'adresse e-mail des commits, recommence à la PR #1.

## 2026-10-04 — Vérifier la cohérence entre case de l'index et statut de la fiche

- **Décisions clés** : avertissement non bloquant (QUA-015) quand une
  case de `docs/projects/pending.md` est cochée/ouverte alors que le
  Statut de la fiche citée dit le contraire.
- **Clôturé par** : commit `b2751b4`.

## 2026-10-04 — Rappeler quand un audit (opportunité, risques) est périmé

- **Décisions clés** : rappel non bloquant (> 30 jours depuis le dernier
  scan) dans le tableau de bord et dans `.githooks/run-checks.mjs`.
- **Clôturé par** : commit `6661e37`.

## 2026-10-04 — Informer de ce que drwil peut faire au-delà de la gouvernance

- **Décisions clés** : indexer dans `AGENTS.md`/`README.md` les recettes
  déjà livrées (audit, tableau de bord, suivi de coût, découverte de
  valeur) pour qu'un humain les découvre sans lire toute la prose.
- **Clôturé par** : commit `a3d25f1`.

## 2026-10-04 — Une commande `/drwil` pour découvrir les capacités du kit

- **Décisions clés** : alias `/drwil-xxx` sur les skills pilotage (champ
  `name:` du frontmatter, cohabite avec l'invocation par nom de dossier)
  + skill générique `/drwil` (menu sans argument, renvoi direct avec
  argument). Claude Code seul, les commandes personnalisées ayant
  fusionné avec les skills dans cet outil.
- **Clôturé par** : commits `cbe8a87`/`b123ef6` (PR #3, `d91f16a`).

## 2026-10-05 — Travailler avec des branches et des merge/pull requests

- **Décisions clés** : contrat QUA-017 (pas de travail direct sur la
  branche principale après le premier commit, jamais vérifié en CI),
  recette dédiée FR/EN, gabarits de PR/MR (GitHub, GitLab).
- **Clôturé par** : commits `525c662`/`3e36400` (PR #1, `77a23f9`),
  `34b021a` (PR #2, `f90bd12`).

## 2026-10-05 — Réparer la CI (merges avec job rouge, actions Node 20 dépréciées)

- **Décisions clés** : isoler l'environnement `CI` des commits simulés
  dans les tests (ne pas hériter du `CI=true` du job parent) ; monter
  `actions/checkout`/`actions/setup-node` en v7, Node 20 → 24 (GitHub et
  GitLab, dogfood + templates).
- **Clôturé par** : commit `e5cb4c5` (PR #4, `ee34bc9`).

## 2026-10-05 — Manifeste des fichiers installés + désinstallation propre

- **Décisions clés** : manifeste .drwil/installed-files.json (chemin
  + sha256) écrit/fusionné par `init()`/`apply()`, réutilisé par deux
  mécanismes : la commande `drwil uninstall` (dry-run par défaut, `--yes`
  pour confirmer, fichier modifié depuis l'installation jamais supprimé
  automatiquement) et le nettoyage automatique des fichiers obsolètes de
  `.githooks/` d'une ancienne version du kit (point 3 de
  `suites-kit-portable.md`, traité avec ce chantier). `docs/projects/`,
  `docs/intentions/`, `docs/recipes/` (et équivalents anglais) jamais
  touchés dans les deux cas.
- **Clôturé par** : PR #6.

## 2026-10-05 — Alerter (et permettre de corriger) une CI cassée sur la branche principale

- **Décisions clés** : la protection de branche GitHub (status checks
  obligatoires avant merge) est indisponible sur ce dépôt (privé, plan
  gratuit) — seule une alerte après coup est possible. Job CI dédié
  `alerter-si-ci-cassee` (GitHub et GitLab, exporté dans le gabarit du
  kit) : ouvre une issue avec un lien vers le run, seulement sur push vers
  la branche par défaut, seulement si un contrôle a échoué, sans
  recréer de doublon. N'empêche pas la fusion, ne corrige pas — alerte
  seulement. Recette docs/recipes/working-with-branches.md mise à jour : vérifier
  les status checks avant de fusionner reste une étape manuelle.
- **Clôturé par** : PR #7.

## 2026-10-05 — Créer une release (tag + note GitHub), tarball npm attaché

- **Décisions clés** : module optionnel (jamais installé par défaut),
  activé en dogfood ; version calculée best-effort (Conventional
  Commits) ; aucun fichier suivi modifié (compatible QUA-017) ; pas de
  déclenchement automatique en CI — activation manuelle sur demande
  explicite, comme un commit/push (revirement du 2026-10-06 initial) ;
  tarball npm (`npm pack`) de chaque paquet publiable attaché comme
  asset téléchargeable à la release (demande ultérieure).
- **Clôturé par** : PR #8 (script + recette), #14 (tarball attaché).

## 2026-10-05 — Skills Copilot CLI (parité fonctionnelle, pas mécanique)

- **Décisions clés** : Copilot CLI déclenche un fichier par motif de
  chemin (`applyTo`), pas par description sémantique comme Claude Code.
  Sur les 13 recettes du kit, seules 2 s'y prêtent nativement (ciblent un
  dossier précis) : route API (`applyTo: "backend/**"`) et écran front
  (`applyTo: "frontend/**"`). Les 11 autres restent couvertes par
  `AGENTS.md`, déjà lu nativement — pas de fichier dédié pour elles.
  Livré via le mécanisme générique de copie `templates/<lang>/tools/<outil>`
  déjà existant, aucun code de générateur ajouté.
- **Clôturé par** : PR #17.

## 2026-10-05 — Extraire l'architecture IA-first complète de run-box-v2 dans le kit

- **Décisions clés** : extraction complète et rendue générique (pas de
  report spécifique à run-box-v2), en 8 lots (tableau de correspondance
  G/P/M/S, AGENTS.md, contrats, recettes, modèles de fiche, cadrage
  réglable par projet, module tableau de bord). Lot 8 : preuve « rien
  perdu » vérifiée sur une copie jetable de run-box-v2 (`apply()` réel,
  aucun écart nécessitant un correctif). Relecture humaine finale
  confirmée le 2026-10-05.
- **Clôturé par** : commit de clôture de ce journal (historique complet
  dans `git log --follow -- docs/projects/extraction-ia-first-run-box.md`).

## 2026-10-05 — `apply()` rafraîchit la mécanique du kit et signale la dérive de prose

- **Décisions clés** : `apply()` réécrit désormais `.githooks/` sans
  condition (toujours mécanique, jamais de prose humaine dedans), signale
  (sans jamais réécrire automatiquement) toute dérive détectée sur les
  fichiers de prose partagée (`AGENTS.md`, `docs/ia-first.md`,
  `docs/contracts.md`...). Lot 2 : nouvelle commande
  `drwil resoudre-derive` qui affiche un diff unifié (LCS, sans dépendance
  externe) fichier par fichier mécanique en dérive, demande confirmation
  interactive (o/N), crée une copie `.bak` avant écrasement, ne crée
  jamais un fichier absent ; `--forcer` court-circuite la confirmation.
- **Clôturé par** : PR #21.

## 2026-10-05 — `init()` crée toujours une branche avant le premier commit (jamais `master`)

- **Décisions clés** : que se passe-t-il si une CI/branch protection
  externe empêche tout push direct sur `master`, y compris pour le tout
  premier commit d'un dépôt fraîchement initialisé ? Réponse tranchée
  « simple » par le demandeur : `init()` crée et bascule systématiquement
  sur une branche de travail (`chantier/installation-kit`) juste après
  `git init`, avant tout commit — personne n'a donc plus jamais besoin de
  pousser sur `master`. QUA-017 simplifié en conséquence : détection de
  branche via `git symbolic-ref --short HEAD` (fonctionne avant le tout
  premier commit), plus d'exception de bootstrap.
- **Clôturé par** : PR #22.

## 2026-10-05 — Garder le commit rapide sans perdre de contrôle

- **Décisions clés** : au pre-commit seulement, un contrôle du projet qui
  déclare `chemins` est reporté si aucun fichier indexé n'y correspond
  (affiché « non exécuté », QUA-013) ; pre-push et CI lancent toujours tout
  (QUA-019). Motifs partagés dans `.githooks/glob.mjs`. Dépôt : doublon
  `npm test` supprimé, `chemins` élargis aux fichiers racine dont dépend le
  contrôle. Tests du kit : dossiers temporaires supprimés après chaque test
  (7919 restes avaient épuisé les inodes de `/tmp`), gardés si le test
  échoue. Commit de doc seule : 0,7 s au lieu d'environ 37 s. Dépôt et
  gabarit (QUA-018).
- **Écarté** : limiter le déclenchement CI à `pull_request` (PR #32, fermée
  sans fusion) — `push` teste la tête de branche, `pull_request` le résultat
  de la fusion : ce ne sont pas des doublons, en supprimer un crée un trou.
  La qualité prime sur la vitesse. [décision utilisateur]
- **Reste** : note de version (ligne ouverte dans l'index).
- **Clôturé par** : PR #31, commit `2b60585`.

## 2026-10-06 — Un seul numéro de version (paquet, tag, `--version`)

- **Décisions clés** : `package.json` est la source unique de la version ;
  le tag en découle (et non l'inverse, qui obligerait le script de release
  à commiter, contraire à QUA-017). `.githooks/create-release.mjs` (dépôt et
  gabarit) pose `v` + la version des paquets npm publiables et refuse, code
  1 même en `--dry-run`, un tag existant, une version qui n'augmente pas ou
  des paquets en désaccord ; sans paquet npm, calcul d'après les commits
  inchangé. `drwil --version` lit `package.json`. [décision utilisateur]
- **Écarté** : remplacer l'asset de la release `v0.2.1` par un paquet
  construit après coup — il aurait attaché un code plus récent à un tag
  plus ancien ; `v0.2.1` garde son asset, avec une note sur son `0.0.1`.
- **Résultat** : `v0.3.0`, première release posée par le script avec tag,
  tarball (`drwil-0.3.0.tgz`) et `--version` identiques.
- **Clôturé par** : PR #45 (`1191946`) et #47 (`347a75e`), release `v0.3.0`.

## 2026-10-09 — Gouvernance : machine d'état et double barrière

- **Décisions clés** : état de gouvernance local, ignoré par Git,
  `.drwil/state.json` (si présent), ne contenant que des références (activité,
  fiche active, demande) ; l'attente active est une fiche existante, son
  périmètre est son bloc `cadrage`. Transitions linéaires avec retours
  (`node .githooks/state.mjs move …`) ; ouvrir une attente, lancer la
  réalisation et clore sont humains par défaut (terminal interactif ;
  réglage `transitions`). Barrière au commit : hors fiches et attestations,
  un commit n'est accepté qu'en `REALISATION` et dans le cadrage lu dans
  `HEAD` (élargir = commit séparé) ; trailer `Drwil-Attente` rejoué au
  push, en CI et par `drwil verify`. Clôture sur l'évidence de `drwil
  verify --evidence` (PASS ou ATTESTED, sur `HEAD`, arbre propre).
  Sévérité `barriere` : `bloquant` ici, `avertissement` à l'installation,
  `off` coupe toute la gouvernance ; `drwil uninstall` liste l'état local
  et ne le supprime qu'avec `--yes`. [décisions utilisateur]
- **Garantie visée** : triche détectable et refusée hors du poste, pas
  impossible (un agent qui a le shell peut toujours réécrire l'état local).
- **Limites** : la CI ne rejoue que le périmètre (l'activité est locale) ;
  le préfixe `!` de Claude Code ne fournit pas de terminal interactif.
- **Suites en attente** : citations de fichiers ignorés par Git, voie
  légère pour les petites corrections sous barrière bloquante, vue de
  relecture.
- **Clôturé par** : PR #1 (`9ea50f5`) et la PR de clôture qui retire cette
  fiche.

## 2026-10-09 — Les tests des hooks nettoient leurs dossiers temporaires

- **Décisions clés** : `afterEach` dans `.githooks/state.test.mjs` et
  `.githooks/scope-gate.test.mjs`, sur le modèle des tests du kit (dossiers
  supprimés après un test réussi, gardés et affichés en cas d'échec) ;
  nettoyage au démarrage des tests écarté (risque avec les fichiers de
  test lancés en parallèle, perte du diagnostic). [décisions utilisateur]
- **Résultat** : un passage complet des contrôles laisse 0 dossier dans
  `/tmp` (environ 2 100 avant ; 40 061 accumulés, inodes épuisés le
  2026-10-09).
- **Clôturé par** : PR #3 (`dce7464`).

## 2026-10-10 — Rappel court de l'état de gouvernance, seulement quand il change

- **Décisions clés** : levier 7 de l'intention fluidité. `node
  .githooks/state.mjs reminder` produit un rappel de deux lignes (activité,
  fiche active, périmètre, règle), injecté par le hook de saisie de Claude
  Code (`UserPromptSubmit`) seulement si son empreinte diffère de la
  dernière, gardée dans `.drwil/reminder.json` (si présent ; ignoré par Git, absent ou
  illisible, le rappel est injecté). Les autres outils suivent la consigne
  d'`AGENTS.md` (relancer l'état avant toute modification). Après un résumé
  automatique du contexte, `SessionStart` le couvre déjà. Dépôt et gabarit,
  doc fr/en, 4 tests. [décisions utilisateur]
- **Garantie visée** : barrière comportementale seulement ; la garantie
  reste dans Git (barrière au commit, CI).
- **Suite ouverte** : [décision] Copilot CLI a-t-il un hook de saisie ? À
  vérifier par un test témoin ; sinon, consigne seule.
- **Clôturé par** : PR #9 (`c46452a`) et la PR de clôture qui retire cette
  fiche.

## 2026-10-10 — Tests des contrôles isolés des variables GIT_* du hook

- **Constat** : un hook lancé par `git commit -a` (`GIT_INDEX_FILE`) ou
  depuis un worktree (`GIT_DIR`) faisait agir les dépôts de test, et le
  code testé, sur le dépôt lanceur : échecs à tort avec `-a` ; depuis un
  worktree, commits parasites, `user.name=Test` et `core.bare=true` écrits
  dans le vrai dépôt (réparé à la main, rien de poussé).
- **Décisions clés** : corriger l'environnement des tests, pas les hooks
  (hériter de ces variables y est voulu) ; retirer **toutes** les `GIT_*`
  de `process.env` en tête de chaque fichier de test, car le code testé
  lance aussi `git`. [décisions utilisateur]
- **Résultat** : test de non-régression (relance des tests avec `GIT_DIR`
  et `GIT_INDEX_FILE` vers un dépôt « victime », laissé intact), sauté
  dans les projets générés par les tests du kit (+56 s sinon) ; le commit
  du lot passe avec `git commit -a`. Piège noté : `NODE_TEST_CONTEXT`,
  hérité de `node --test`, empêche un `node --test` enfant de lancer quoi
  que ce soit.
- **Clôturé par** : PR #16 (`f293222`).

## 2026-10-10 — En CLOTURE, une fiche déjà supprimée ne rend pas l'état invalide

- **Constat** : la recette « Clôturer » supprime la fiche ; l'état la
  jugeait ensuite introuvable (état invalide) et refusait le retour en
  CADRAGE.
- **Décisions clés** : tolérer l'absence de la fiche en CLOTURE seulement,
  plutôt que changer l'ordre de la recette ; chemin, extension et modèle
  toujours vérifiés ; contexte et rappel affichent « fiche supprimée
  (clôture) » ; recette à jour (dépôt et gabarit, fr et en).
  [décisions utilisateur]
- **Point tranché ensuite** (2026-10-10) : une fiche terminée ne doit pas
  rester dans `docs/projects/` ; empêcher la récidive est un chantier à
  cadrer (refus au retour en CADRAGE, contrôle bloquant).
- **Clôturé par** : PR #17 (`3c5e31a`).

## 2026-10-10 — Fiches terminées restées en place, condensées a posteriori

Cinq chantiers finis dont la fiche n'avait jamais été condensée ; ils
restaient proposés au lancement. Condensés ce jour-là (dates de fin
d'origine entre parenthèses).

- **Signaler les couches par défaut non détectées** (2026-10-04) : sur un
  `init` sans stack détectée, le kit annonce les couches écrites par défaut
  (backend, frontend) et rappelle `--layers`. 2 tests. Commit `52bb22b`.
- **Le kit devient le paquet `drwil`** (2026-10-04) : drwil *est* le kit ;
  dossier `packages/drwil/`, paquet et bin `drwil`, citations mises à jour.
  La publication npm reste une décision ouverte, portée par
  `docs/intentions/packager-kit-ia-first.md`.
- **Faux positif QUA-017 sur un push de tag** (2026-10-05) : le pre-push
  ne bloque plus un push qui ne contient que des tags (il regarde les
  références réellement poussées) ; releases débloquées (`v0.2.0`,
  `v0.2.1`, `v0.3.0`).
- **Journaliser la clôture des chantiers** (2026-10-05) : une fiche
  entièrement terminée est condensée dans ce journal puis supprimée, sa
  ligne retirée de l'index — recette `docs/recipes/working-with-branches.md`,
  section « Clôturer ».
- **Fluidité, levier 1 : lancer depuis le chat** (2026-10-10) : `/drwil-lancer`
  ouvre un sondage des fiches cadrées, la réponse humaine (lue par un hook)
  passe en REALISATION ; un sondage pré-rempli est refusé ; repli au
  terminal `node .githooks/state.mjs start` ; clôture sans geste humain
  sur évidence de verify. L'élargissement du cadrage reste un commit
  séparé, à montrer par la vue de relecture
  (`docs/intentions/vue-de-relecture.md`). [décisions utilisateur] PR #10.

## 2026-10-10 — Intégration agent de `drwil verify`, sans franchir la frontière d'attestation

- **Décisions clés** : `drwil verify` est la primitive qu'un agent utilise
  pour savoir si son travail est gouverné, sans rendre drwil dépendant d'un
  agent ; l'agent produit des preuves, drwil les vérifie, l'humain seul
  atteste. [décisions utilisateur]
- **Résultat** : `drwil verify --agent` (verdict présenté à l'agent,
  `packages/drwil/src/agent.ts`) ; argument `verify` du skill `/drwil`
  (fr, en), sans argument `attest`, consigne dans `AGENTS.md` ; tests de la
  frontière d'attestation (`--yes`, stdin redirigé, script, leurres) ; doc
  « Workflow agent / humain ». Essai réel : attestations humaines du
  2026-10-09 sur ce dépôt. Lots 1 à 5 faits le 2026-10-06 et le
  2026-10-09 ; fiche condensée le 2026-10-10 (elle passait pour terminée à
  cause d'un « essai réel fait » dans son statut).

## 2026-10-10 — Une fiche terminée ne reste pas dans docs/projects/

- **Constat** : cinq fiches terminées étaient restées en place, proposées
  au lancement ; la détection de « terminée » cherchait « fait » n'importe
  où dans le statut (faux positifs et faux négatifs).
- **Décisions clés** : seul `**Statut** : terminé le AAAA-MM-JJ` vaut
  terminée (`statutFiche`, définition unique d'`.githooks/state.mjs`,
  importée par check-docs) ; `référence — …` pour une fiche qui n'est pas
  un chantier (`docs/projects/kit-mechanics.md`), jamais proposée au lancement ;
  retour `CLOTURE → CADRAGE` refusé et erreur check-docs tant qu'une fiche
  terminée est encore là ; la fiche « intégration agent de verify »
  condensée. [décisions utilisateur]
- **Résultat** : à la clôture de ce chantier, la fiche marquée terminée a
  bien été refusée (retour en CADRAGE et check-docs) jusqu'à sa
  condensation.
- **Suite** : un sondage `/drwil-lancer` ordonné (priorité de l'index,
  fiches non prêtes signalées, ordre des intentions), à cadrer.
- **Clôturé par** : PR #20 (`bfe4011`).

## 2026-10-10 — /drwil-lancer propose les fiches dans le bon ordre

- **Constat** : le sondage listait les fiches sans ordre ni état de
  préparation ; la recommandation tenait à la mémoire de l'agent.
- **Décisions clés** : fiches prêtes (aucune `[décision]` ouverte) d'abord,
  puis par priorité de l'index (`P2` sans tag) ; les non prêtes en fin,
  avec ce qu'il reste à trancher ; l'ordre proposé des intentions départage
  par la consigne du skill (pas de calcul) ; les intentions P1 non cadrées
  sont citées « à cadrer » dans le message du sondage. [décisions
  utilisateur]
- **Résultat** : `node .githooks/state.mjs briefs --json` donne `priorite`,
  `decisions`, `prete` et trie ; skill de lancement et doc à jour (dépôt,
  gabarit fr et en).
- **Clôturé par** : PR #22 (`5957f51`).

## 2026-10-10 — Fusion autorisée au lancement : un seul geste humain par chantier

- **Constat** : l'agent fusionnait déjà avec le jeton du mainteneur ; le
  geste humain de fusion se réduisait à un « oui », alors que la doctrine
  en fait la décision d'acceptation.
- **Décisions clés** : déplacer la décision au lancement (voie
  intermédiaire avant la fabrique autonome) ; seconde question du sondage
  (`drwil-fusion`), lue par le hook ; `fusion_autorisee` dans l'état local,
  posé seulement par un lancement humain, gardé jusqu'à CLOTURE ; condition
  verify PASS, tous niveaux de risque ; en CLOTURE, `gh pr merge --auto
  --merge` ; réglages « Allow auto-merge » et suppression automatique des
  branches activés. [décisions utilisateur]
- **Résultat** : lot 1 par la PR #24 ; essai réel (lot 2) : ce chantier,
  lancé avec « Fusion automatique », a sa PR #25 programmée en fusion
  automatique dès la clôture.
- **Limite** : tant que l'agent partage l'identité du mainteneur, la
  garantie reste comportementale (voir `docs/intentions/fabrique-autonome.md`).
- **Clôturé par** : PR #24 (lot 1) et PR #25 (essai, fusion automatique).

## 2026-10-10 — Un chemin cité ignoré par Git ne vaut pas preuve

- **Constat** : check-docs acceptait en local un chemin cité qui n'existait
  que comme fichier ignoré par Git (état local, évidences) ; la CI, sans ce
  fichier, échouait (2026-10-09, puis PR #11 et #13 le 2026-10-10). La
  mention « (si présent) » n'était reconnue que sur la même ligne.
- **Décisions clés** : erreur en local, comme en CI (un seul appel à
  `git check-ignore`, qui ne signale pas un fichier suivi) ; « (si
  présent) » reconnu aussi sur la ligne suivante. [décisions utilisateur]
- **Résultat** : test du kit reproduisant le cas du 2026-10-09 ; dépôt et
  gabarit identiques. Lancé avec « Fusion automatique ».
- **Rouvert le même jour** : la CI Windows refusait le test (chemins envoyés
  à `git check-ignore` avec des barres obliques inversées, non reconnus
  comme ignorés) ; le ruleset a bloqué la fusion automatique, désarmée
  avant le correctif ; chemins au format « / », CI Windows verte avant la
  nouvelle clôture.
- **Clôturé par** : PR #26 (`7dde03e`, correctif Windows `172b9f8`).

## 2026-10-10 — QUA-017 ne bloque plus la suppression d'une branche distante

- **Constat** : depuis `master`, `git push origin --delete <branche>` était
  refusé par le pre-push (« travail direct sur la branche principale ») ;
  faux positif cousin de celui du push de tag, contourné deux fois ce
  jour-là par l'API GitHub.
- **Décisions clés** : le pre-push reconnaît une suppression (SHA local
  fait de zéros) ; un push de tags et/ou de suppressions seulement ne
  déclenche pas QUA-017, avec un message dédié du moteur ; la suppression
  de la branche principale est laissée au ruleset de l'hébergeur ; un push
  mixte reste contrôlé. [décisions utilisateur]
- **Résultat** : test du kit (cas du 2026-10-09) ; dépôt et gabarit ; CI
  verte sur les trois OS **avant** la clôture. Lancé avec « Fusion
  automatique ».
- **Clôturé par** : PR #27 (`e3e87f4`).

## 2026-10-10 — Des garde-fous qui tiennent sans compter sur la mémoire de l'agent

- **Constat** (2026-10-06) : un changement de mécanique proposé sans fiche
  n'avait été arrêté par rien ; QUA-016 était en « avertissement » avec du
  code orphelin, « Tout vérifier » pointait un ancien lanceur qui avalait
  les échecs, et les hooks Claude Code du dépôt n'étaient pas branchés.
- **Décisions clés** : QUA-016 bloquant (dépôt et défaut du gabarit, sans
  écraser le réglage des projets existants) ; restes obsolètes supprimés ;
  hooks branchés, refus avant écriture d'un fichier de code hors fiche.
  Le 2026-10-10, lot 3 (« un changement de code a sa fiche ») jugé couvert
  par QUA-016 et la barrière de périmètre rejouée en CI : pas de contrôle
  supplémentaire. Trou connu : une fiche de référence (mécanique du kit)
  couvre tout `.githooks/`. [décisions utilisateur]
- **Clôturé par** : lots 1 et 2 par la PR #46 de l'ancien dépôt
  (2026-10-06) ; clôture par la PR de ce chantier.

## 2026-10-11 — Un livrable qui ne ralentit ni ne casse l'utilisateur

- **Principe** (demandeur, 2026-10-10) : distinguer ce qu'on livre et ce
  dépôt, qui éprouve la solution ; ne ralentir ni casser l'utilisateur.
- **Décisions clés** : les tests des hooks (`.githooks/*.test.mjs`) ne sont
  plus livrés — ils restent ici, et une mise à jour les supprime chez un
  projet s'ils sont intacts ; le contrôle répond « non applicable » sans
  rien afficher. Réglage unique `nouvellesExigences` : `bloquant` pour une
  installation neuve, `avertissement` pour un projet existant (posé par
  `apply` s'il manque, jamais durci) — appliqué aux citations de fichiers
  ignorés par Git ; ce dépôt à `bloquant`. Budget de temps au commit d'un
  projet équipé mesuré puis fixé à 1 500 ms (mesures : 107 à 369 ms selon
  l'OS). [décisions utilisateur]
- **Relance** : un commentaire du moteur citait la fiche (dans le gabarit,
  une fiche du dépôt absente des projets) ; corrigé avant la clôture.
- **Clôturé par** : PR #31 (`8b23067`).

## 2026-10-11 — Couverture des hooks de gouvernance mesurée et garantie

- **Besoin** (demandeur, 2026-10-10, priorité 0) : les hooks
  (`.githooks/*.mjs`), qui gouvernent, n'étaient pas mesurés (37 % des
  lignes au lancement).
- **Décisions clés** : cible 100 % d'emblée, seuil bloquant une fois
  atteint ; QUA-004 étendu (un seuil par périmètre : `packages/drwil` et
  hooks) ; mesure propre à ce dépôt, non livrée. Au lieu d'exclusions
  `c8 ignore`, code inatteignable retiré et code intestable rendu
  testable, gabarit compris : `.githooks/run-checks.mjs` prend sa racine
  du dépôt git du dossier courant (plus de l'emplacement du script),
  logique de `.githooks/check-code-rules.mjs` et
  `.githooks/check-file-size.mjs` exposée,
  replis silencieux après git retirés de `.githooks/scope-gate.mjs` (un échec casse
  le contrôle au lieu de le faire passer à vide). [décisions utilisateur]
- **Résultat** : 100 % lignes, branches, fonctions et instructions sur
  les 14 hooks (contrôle `couverture-hooks`, `npm run test:hooks:coverage`) ;
  une fonction non testée ajoutée à un hook fait échouer le contrôle.
  Relevé en route : la référence `origin/HEAD` d'un clone n'était jamais
  éprouvée par la barrière de périmètre.
- **Clôturé par** : la PR de ce chantier (branche `chantier/couverture-hooks`).

## 2026-10-11 — Dépôt et gabarit identiques, frontière du livrable vérifiée

- **Besoin** (demandeur, 2026-10-10, priorité 0) : garder identiques les
  copies du gabarit utilisées par ce dépôt reposait sur un `cp` à la main.
- **Décisions clés** : miroirs dérivés des règles d'installation, écarts
  voulus déclarés avec leur raison dans `outils/miroirs.json` ; le dépôt
  utilise les réglages Claude qu'il livre ; le contrôle `miroirs-gabarit`
  devient la preuve automatique (partielle) de QUA-018. À la question
  « est-ce bien vrai ? », pas d'attestation sur une preuve surestimée :
  fichiers d'un seul côté et jobs de CI vérifiés (une fuite de job du dépôt
  vers le gabarit est refusée) ; puis frontière du contenu livré : aucune
  référence à l'historique interne de drwil dans `packages/drwil/templates/`
  (PR, décisions datées, ADR, lots, projet d'origine, fiches du dépôt),
  occurrences nettoyées sans changement de comportement. QUA-018 écrit ce
  que le contrôle prouve et ce qu'il ne voit pas ; ré-attesté par le
  demandeur pour cette seule portée. [décisions utilisateur]
- **Relevé en route** : la recette livrée de travail en branche omettait le
  job `alerter-si-ci-cassee` (corrigé FR et EN) ; deux recettes du dépôt
  étaient des ébauches appauvries ; `docs/architecture.md` du dépôt n'a
  jamais été personnalisé.
- **Suites à décider** : `DRWIL-012` encore affiché par deux messages
  livrés ; supprimer la duplication elle-même (le dépôt s'installe
  lui-même, ou hooks générés au build) ; le contrôle juge l'arbre de
  travail, pas seulement l'index ; outiller SEC-006 (`npm audit`, fait le
  même jour, voir plus bas).
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/depot-gabarit-identiques`).

## 2026-10-11 — Refus de l'option globale -c de git recalibré (réglages Claude livrés)

- **Besoin** : le motif de refus large des réglages Claude livrés bloquait
  aussi la création de branche, la réutilisation d'un message de commit et
  tout texte cité contenant ces mots (trois faux positifs le même jour,
  chacun contourné par une exception accordée par le demandeur).
- **Décision clé** : refuser l'option seulement quand elle suit directement
  git ; placée après une autre option globale, elle ne correspond à aucune
  autorisation (toutes des préfixes de sous-commande) et Claude Code
  demande l'accord. Faits vérifiés dans la documentation des permissions
  de Claude Code. [décision utilisateur]
- **Preuves** : test du paquet (règle en tête présente, motif large absent,
  autorisations git restées des préfixes ; il échoue si l'ancien motif
  revient) ; dans une session réelle, une branche se crée sans exception
  et `git -c core.pager=cat status` reste refusé.
- **Clôturé par** : la PR de ce chantier (branche `chantier/regle-git-c`),
  fusion manuelle choisie au lancement.

## 2026-10-11 — SEC-006 prouvé par un audit des dépendances

- **Besoin** : SEC-006 (pas de dépendance vulnérable connue) ne reposait
  que sur une attestation humaine du 2026-10-09, sans note ni outil.
- **Décisions clés** : une faille high ou critical bloque, moderate et low
  sont affichées ; toutes les dépendances (production et développement) ;
  registre injoignable = échec explicite « audit non exécuté », jamais
  vert ; ce dépôt seulement (le gabarit invite déjà chaque projet à
  déclarer son audit). [décisions utilisateur]
- **Résultat** : `outils/audit-dependances.mjs` lit la sortie JSON de
  `npm audit` (même code de sortie pour une faille et un registre
  injoignable : seule la sortie les distingue) ; contrôle
  `audit-dependances` au commit (si le manifeste, le verrou ou l'outil
  changent), au push et en CI. SEC-006 passe en PASS sans attestation :
  `drwil verify` rend 6 PASS, 5 ATTESTED. Sur ce dépôt : aucune faille.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/outiller-sec-006`).

## 2026-10-11 — Rangement : quatre intentions réalisées retirées de docs/intentions/

Intentions déjà réalisées, restées dans `docs/intentions/` et absentes de
l'index ; texte intégral dans l'historique git
(`git log --follow -- docs/intentions/<nom>.md`).

- **Audit de risques et dette technique** (fait le 2026-10-04) : recette et
  skill livrés (FR et EN), testés sur drwil (`docs/audit-risques.md`).
- **Découverte de valeur produit** (réalisée, statut resté « cadré — prêt
  à implémenter ») : recette `docs/recipes/discover-product-value.md`,
  skill et version livrée existent.
- **Suivi de la consommation de tokens par lot** (fait le 2026-10-04) :
  recette `docs/recipes/track-consumption-per-increment.md`, skill, tableau de
  bord.
- **Travail en branches et merge/pull requests** (tranché et clôturé le
  2026-10-05) : recette `docs/recipes/working-with-branches.md`.

## 2026-10-11 — docs/architecture.md : carte actuelle du dépôt

- **Besoin** : la carte du dépôt était restée au modèle d'installation
  (« à décrire »).
- **Décision clé** : une carte courte de l'existant maintenant, plutôt que
  d'attendre la fin des restructurations ; elle évolue avec le code
  qu'elle décrit. [décision utilisateur]
- **Résultat** : ce qu'est drwil et pour qui, ses deux casquettes
  (QUA-018), la CLI et le gabarit du paquet, les hooks, les outils propres
  au dépôt, la forge et les documents de gouvernance ; chaque chemin cité
  existe ; écart déclaré dans `outils/miroirs.json`.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/architecture-depot`).

## 2026-10-11 — Consigne de fusion automatique : ordre sûr avant le retour en CADRAGE

- **Besoin** : sur la PR #29, la fusion automatique, programmée avant que
  GitHub ait calculé la PR, a été refusée ; l'agent est revenu en CADRAGE
  quand même et l'autorisation a été perdue. Sur la PR #38, une PR en
  retard sur la branche principale n'était pas fusionnable.
- **Décision clé** : inscrire l'ordre sûr dans la consigne, là où l'agent
  la relit (contexte de gouvernance et skill de lancement). [décision
  utilisateur]
- **Résultat** : attendre la PR calculée et la mettre à jour si elle est en
  retard, programmer la fusion, vérifier qu'elle est programmée, et
  seulement ensuite revenir en CADRAGE ; en cas d'échec, rester en CLOTURE.
  FR et EN, dépôt et gabarit ; test du contexte. Appliqué dès la clôture
  de ce chantier.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/consigne-fusion-auto`).

## 2026-10-11 — Lint, formatage et versions de Node (fin de la vague 1)

- **Besoin** : aucun lint ni formateur ; aucun champ `engines`, et un
  README qui promettait « Node.js 20+ » sans test.
- **Décisions clés** : Biome, outil du dépôt jamais livré ; Node 22 et 24
  déclarés et testés ; tout le code formaté une fois, en un commit isolé.
  [décisions utilisateur]
- **Résultat** :
  - `engines` >= 22 ; Node 22 testé dans le job `checks`, déjà exigé par la
    forge (une ligne de matrice aurait renommé les checks exigés) — vérifié
    en CI sous Node 22.23.3 ;
  - `biome.jsonc` : chaque règle désactivée avec sa raison (gabarits de
    chaînes, `any` des données sans type de `packages/drwil/src/verify.ts` et
    `packages/drwil/src/doctor.ts`, tri
    des imports qui changerait l'ordre d'exécution des modules) ; écarts de
    lint corrigés sans changement de comportement ;
  - formatage en commit isolé (56 fichiers, dépôt et gabarit identiques) ;
    contrôle `lint` (`biome ci`, avertissements bloquants) au commit, au
    push et en CI ; un fichier mal formaté le fait échouer (vérifié).
- **Relevé en route** : une première mesure du formatage était fausse (une
  largeur de ligne hors limites rendait la configuration invalide, rien ne
  s'exécutait) ; corrigée avant toute décision.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/lint-formateur-engines`).

## 2026-10-11 — Non-régression continue : tests rattachés aux contrats

- **Besoin** : un défaut corrigé gardé par un test seulement par
  discipline ; 18 tests sur 254 portaient l'ID d'un contrat, lien exploité
  nulle part (v1:TST-004).
- **Décisions clés** : rattachement par le nom du test (ID en tête) et par
  le champ « Tests » du contrat (des fichiers), cohérence contrôlée ; la
  règle « défaut corrigé → test vu échouer » est une recette, pas un
  contrôle ; rejeu sur la base seulement en cas d'échec en CI ; ce dépôt
  d'abord, livraison aux projets équipés dans un chantier à part.
  [décisions utilisateur]
- **Résultat** :
  - recette `docs/recipes/corriger-un-defaut.md`, citée dans `AGENTS.md`,
    propre au dépôt ;
  - `outils/verifier-tests-contrats.mjs` (contrôle `tests-contrats`) :
    cohérence dans les deux sens, seuls les préfixes de contrat comptent
    (les tests `DRWIL-…` citent des exigences de fiche) ; QUA-013, QUA-015,
    QUA-016, QUA-017 listent leurs tests (10 rattachés) ; un rattachement
    retiré fait échouer le contrôle (vérifié) ;
  - en CI, un échec des contrôles est rejoué sur la base de la PR :
    annotation « introduit par cette PR » ou « déjà présent », verdict
    inchangé ; éprouvé sur la PR d'essai #48, fermée sans fusion.
- **Relevé en route** : le hook de commit a trouvé un défaut du contrôle
  (exemples de tests écrits dans des chaînes comptés comme tests), corrigé
  en suivant la recette, test vu échouer d'abord. QUA-013 et QUA-015
  ré-attestés par l'humain (empreinte changée par le champ « Tests »).
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/non-regression-continue`).

## 2026-10-11 — Tester la CLI installée depuis le tarball, comme un utilisateur

- **Besoin** : les tests exerçaient le code depuis le dépôt ; rien ne
  vérifiait ce que reçoit un utilisateur (v1:PKG-004, v1:PKG-005).
- **Résultat** : contrôle `tarball` (`outils/tester-tarball.mjs`, propre
  au dépôt) : `npm pack`, contenu comparé à la liste attendue, installation
  dans un projet vierge, puis `drwil --version`, `drwil init --ci github`
  et `drwil verify` (verdict sans FAIL ni ERROR). Registre injoignable :
  non exécuté, jamais vert (QUA-013). Vérifié en réel : un fichier glissé
  dans le paquet et un `bin` cassé le font échouer.
- **Relevé en route** : avec `init` par défaut (`ci: none`), `verify` rend
  ERROR (QUA-013, pas de filet CI) sur un projet neuf ; comportement voulu,
  le projet d'essai déclare donc une CI GitHub.
- **Clôturé par** : la PR de ce chantier (branche `chantier/tester-tarball`).

## 2026-10-11 — Gitleaks en CI : secrets prouvés, contrôle tarball vert

- **Besoin** : relevé sur la PR #50 : sans gitleaks dans le job `checks`,
  SEC-007 (pas de secret dans le dépôt) n'y était jamais prouvé (« non
  exécuté »), et `verify` rendait ERROR dans le projet d'essai du contrôle
  `tarball`, rouge en CI seulement.
- **Décisions clés** : installer gitleaks en CI plutôt que tolérer un
  « non exécuté » dans le contrôle `tarball`. [décision utilisateur]
- **Résultat** : job `checks` : gitleaks 8.21.2 épinglé, archive vérifiée
  par sa somme publiée, installé dans `~/.local/bin` ; en CI, historique
  complet scanné (aucune fuite), `tarball` vert, 0 non exécuté.
- **Clôturé par** : commit `064532e` (fusionné avec la PR #50) et la PR
  de clôture (branche `chantier/cloture-gitleaks-en-ci`).

## 2026-10-11 — Mesurer la consommation de tokens par chantier, sans saisie

- **Besoin** : objectif d'une fabrique sobre en tokens sans aucune mesure ;
  `.drwil/usage.jsonl` rempli à la main (3 lignes).
- **Décisions clés** : rapport à la demande d'abord, ligne automatique à la
  clôture une fois les chiffres jugés fiables (lot 2, rangé dans l'index) ;
  quatre catégories (entrée, sortie, cache lu, cache écrit) plus un total
  pondéré indicatif ; temps actif, pauses de plus de 15 minutes retirées.
  [décisions utilisateur]
- **Résultat** : `outils/consommation.mjs` (propre au dépôt) lit les
  journaux de session de Claude Code du projet et attribue chaque réponse
  à son chantier par la branche git (`chantier/<fiche>`) ; requête comptée
  une fois ; jamais un contenu de conversation affiché (test dédié) ; sans
  journal : « non mesuré » (QUA-013). Cohérent avec le relevé fait à la
  main.
- **Premier constat** (2026-10-11) : le cache lu (contexte relu à chaque
  échange) fait l'essentiel du total pondéré, devant la sortie ; les
  cadrages menés sur la branche principale, en longue session, sont le
  premier poste de la journée.
- **Limites** : Claude Code seulement ; le travail fait hors d'une branche
  de chantier est compté à part, jamais réparti.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/mesurer-consommation`).

## 2026-10-12 — Le dépôt s'installe depuis son gabarit

- **Besoin** : chaque changement d'un fichier livré se faisait deux fois
  (gabarit et copie du dépôt) ; `miroirs-gabarit` ne faisait que vérifier
  l'égalité des deux.
- **Décisions clés** : le dépôt s'installe lui-même avec la CLI, plutôt que
  des hooks générés au build ; copies versionnées, rafraîchies par une
  commande, plutôt que générées à `npm install` ; premier chantier de la
  vague 4. [décisions utilisateur]
- **Inventaire** (lot 1) : une installation forcée sur une copie du dépôt
  ne diffère que par les 17 écarts déclarés et `.drwil/ia-first.json`.
  `apply --dry-run` n'en voit que 13 (dérive grossière : lignes et
  sections). Défaut corrigé : cinq couches sans dossier dans `layers`.
- **Résultat** : `npm run installer-depot` (`outils/installer-depot.mjs`,
  `--dry-run` pour lister) lance la vraie CLI (`init --force`) dans une
  copie temporaire des fichiers suivis, puis ne recopie que les fichiers
  du gabarit des unités installées, hors écarts déclarés et hors
  `.drwil/` ; modules optionnels recopiés depuis le gabarit. 8 tests, dont
  un avec la vraie CLI. `miroirs-gabarit` indique la commande quand une
  copie dérive ; `AGENTS.md`, la carte et la recette de travail en branche
  disent qu'on n'édite que le gabarit.
- **Éprouvé** : un hook modifié dans le gabarit seul, une commande, et
  `miroirs-gabarit` repasse à 0 problème, `couverture-hooks` à 100 % ; une
  copie modifiée directement est refusée, avec la commande dans le message.
- **Limites** : un fichier retiré du gabarit reste dans le dépôt
  (`miroirs-gabarit` le signale, la commande ne le supprime pas). Défaut du
  livrable signalé, hors de ce chantier : `drwil init`, même sans
  `--force`, réécrit `.drwil/ia-first.json` et remet `layerPrefixes`,
  `codePrefixes`, `extraCodeFiles`, `extraCodeGlobs` et `ciFiles` à leurs
  défauts.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/depot-installe-par-gabarit`).

## 2026-10-12 — init et apply gardent les réglages d'un projet déjà installé

- **Besoin** : relancer `drwil init`, geste de mise à jour du kit, effaçait
  en silence les réglages du projet : préfixes de code (fichiers sortis du
  rappel de cadrage, QUA-016), langue (documents français installés à côté
  des anglais), outils (cinq réactivés), couches (`backend/`, `frontend/`
  créés), CI, mode, nom. `apply` partait des mêmes défauts. Repéré par
  l'inventaire du chantier précédent.
- **Cause** : `writeConfig` écrivait ces réglages en dur, et la CLI donnait
  un défaut à ses options : une option absente ne se distinguait pas d'un
  choix explicite, la config existante n'était jamais relue.
- **Décisions clés** : corriger avant le refactor de `packages/drwil/src/index.ts` ; une règle
  pour `init` et `apply` (option absente = valeur installée, option passée
  = elle l'emporte) ; `--force` garde la config ; la fusion `init`/`apply`
  en une commande ira avec le passage à l'anglais. [décisions utilisateur]
- **Résultat** : `resolve()` lit la config existante (CI déduite de
  `ciFiles` pour une config sans clé `ci`) ; `writeConfig` reprend les
  réglages saisis et toute clé inconnue du kit ; dossiers et fichiers de
  CI recalculés seulement si la langue ou la CI changent ; options de la
  CLI sans défaut propre, aide et README à jour. 4 tests (init, `--force`,
  apply, CLI, option explicite) vus échouer avant la correction.
- **Limites** : une config antérieure à la clé `tools` garde l'ancien
  défaut (tous les outils) faute de choix enregistré.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/init-preserve-config`).

## 2026-10-12 — Découper index.ts, etat.mjs et verify.ts, plafond de 400 lignes

- **Besoin** : trois fichiers trop gros, mêlant plusieurs sujets, avant le
  passage à l'anglais qui les touchera tous ; une variable globale reliait
  l'aperçu d'`apply` à l'écriture des fichiers ; le garde-fou de taille
  livré n'était pas adopté par le dépôt.
- **Décisions clés** : plafond de 400 lignes, le défaut du kit (d'où
  verify.ts découpé aussi, aucun plafond hérité) ; etat.mjs découpé en
  fichiers livrés, avec réexports ; un lot par fichier, une PR.
  [décisions utilisateur]
- **Résultat** : 4 tests de caractérisation d'abord (couverture
  d'index.ts 96,2 → 98,4 % des lignes). index.ts 838 → 136 lignes, en
  config.ts, rendu.ts, manifeste.ts, derive.ts, apercu.ts ;
  `simulation` passée en paramètre. etat.mjs 607 → 393, en fiches.mjs
  et etat-textes.mjs (gabarit, installés par `npm run installer-depot`).
  verify.ts 450 → 343, présentation dans verdict.ts. Déplacements par
  tranches de lignes vérifiées, sans recopie à la main. Contrôle
  `taille-fichiers` (QUA-001) au commit, au push et en CI ; un fichier de
  401 lignes refusé. Aucun changement de comportement : 102 tests du
  paquet, 143 des hooks (100 %).
- **Trouvé en route** : les nouveaux hooks devaient rejoindre le bloc
  cadrage des fiches de référence du gabarit (mecanique-ia-first.md,
  kit-mechanics.md), sinon un projet équipé les refusait (QUA-016) — vu
  par la suite du paquet. Tout fichier ajouté à `.githooks/` du gabarit
  doit y être listé. Cadrage élargi deux fois, chaque fois dans un commit
  séparé.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/refactor-index-etat`).

## 2026-10-12 — Un seul gabarit, en anglais (chantier B du livrable en anglais)

- **Besoin** : le gabarit existait en double (`fr/` et `en/`, 58 fichiers
  chacun), chaque changement s'y faisait deux fois, et l'anglais employait
  encore des termes français.
- **Décisions clés** : le français quitte le livrable ; glossaire de
  l'intention (fiche → brief, chantier → workstream, lot → increment,
  cadrage → scoping dans la prose) ; B avant A ; `lang` devient la langue
  du projet, anglais par défaut ; ce dépôt s'installe en anglais et renomme
  ses dossiers de projet (`docs/projects/`, `docs/contracts.md`,
  `docs/contracts-catalog.md`, `docs/projects/pending.md`), leur contenu
  restant en français. [décisions utilisateur]
- **Résultat** : six squelettes anglais complétés depuis le français ;
  prose alignée sur le glossaire ; `templates/fr/` supprimé, l'anglais
  versé dans `templates/common/`, la CLI ne choisit plus de gabarit par
  langue ; le `AGENTS.md` livré demande à l'agent de répondre et d'écrire
  dans la langue du projet. Recettes, skills et `docs/ia-first.md` du
  dépôt installés en anglais ; les commandes des skills prennent leur nom
  anglais (`/drwil-adopt`, `/drwil-value`, `/drwil-progress`,
  `/drwil-usage`), `/drwil-lancer` inchangé (chantier C).
- **Trouvé en route** : le tableau de bord choisissait le catalogue par
  langue (corrigé : le fichier présent) ; l'installeur créait les fichiers
  déclarés propres au gabarit (corrigé, avec test) ; le modèle de fiche
  anglais intitulait sa passation « Resuming work », que QUA-015 (fiches
  et passation) refuse : tout le gabarit dit « Hand-off ».
- **Laissé au chantier A** : bloc `cadrage`, activités, trailer, clés de
  config et champs de `.drwil/usage.jsonl` ; section « Lots » des fiches ;
  commentaires français du code commun (hooks, CI, `gitignore`…) ; contrôle
  des intentions à accepter dans les deux langues ; liste des noms de
  l'ancien gabarit français tolérés par le contrôle des miroirs.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/gabarit-unique-anglais`).

## 2026-10-12 — Le cœur en anglais (chantier A du livrable en anglais)

- **Besoin** : le gabarit était en anglais, mais tout ce que lisent les
  hooks restait en français (activités, état, config, bloc `cadrage`,
  trailer, noms des hooks, sous-commandes) ; le code commun aussi.
- **Décisions clés** : migration en une fois, sans alias, par `init` /
  `apply` ; valeurs de config en anglais ; tests et `outils/` du dépôt ne
  suivent que les renommages ; une seule PR, lot 3 compris ; bascule en
  deux commits (bloc `scope` ajouté à côté de l'ancien, puis bascule) pour
  passer la barrière sans contournement ; statuts du moteur, identifiants
  de contrôles et sévérités gardés pour C, car visibles hors des hooks.
  [décisions utilisateur]
- **Résultat** : version 0.4.0 (`packages/drwil/CHANGELOG.md`). Module de
  migration (`packages/drwil/src/migration-table.ts`, seule source des
  anciens noms) branché sur `init`, `apply` et `apply --dry-run`,
  idempotent, jamais appliqué à un projet sans signe de l'ancien format ;
  hooks, hooks Claude Code, modules, activités (`SCOPING`…`CLOSING`), état,
  config, bloc `scope`, trailer `Drwil-Brief` et sous-commandes `move` /
  `start` / `briefs` / `reminder` en anglais ; code commun en anglais,
  messages en dictionnaire fr/en ; la CLI garde son modèle derrière un
  pont dans `packages/drwil/src/verify.ts` ; préfixe de branche `workstream/` ; intitulés
  d'intention acceptés dans les deux langues. Ce dépôt migré par
  `npm run installer-depot`, qui migre avant d'installer.
- **Trouvé en route** : la migration réécrivait un binaire sous
  `.githooks/` (cache Python) et, faute de détection de l'ancien format,
  les anciens noms cités dans la prose à chaque `init` / `apply` ; des
  commentaires de hooks citant d'anciens chemins la relançaient sur un
  projet neuf — tout corrigé, avec tests. Une règle de refus des réglages
  Claude Code (`Bash(*saisie-drwil*)`) empêchait l'agent de supprimer
  l'ancien hook : suppression faite par le demandeur.
- **Laissé au chantier C** : identifiants de contrôles (`perimetre-attente`…),
  statuts du moteur (`echec`, `non-execute`) et sévérités (`bloquant`…)
  visibles par `drwil verify` ; modèle interne et messages de la CLI
  (`drwil etat`…) ; options `--fiche` / `--demande`, mots tapés `LANCER` /
  `FUSION`, skill `/drwil-lancer`. Hors chantier : tolérances de noms
  français des modèles (modele-*, entretien-courant.md) dans les hooks,
  directive `contraste-fond:` du module front-quality.
- **Clôturé par** : la PR de ce chantier (branche
  `chantier/coeur-en-anglais`).

## 2026-10-12 — La CLI en anglais (chantier C du livrable en anglais)

- **Décisions clés** : code et messages de la CLI en anglais (dictionnaire
  fr/en selon `lang` du projet, anglais hors projet) ; commande unique
  `drwil init` (installe, met à jour et signale la dérive ; `apply`
  retiré sans alias) ; `etat` → `state`, `resoudre-derive` →
  `resolve-drift` (`--force`) ; valeurs laissées par A toutes en anglais
  (identifiants de contrôles, statuts du moteur, sévérités, options
  `--brief` / `--request`, mots tapés `START` / `MERGE`, skill
  `/drwil-start`), registres de contrats migrés ; `DRWIL-012` retiré des
  messages livrés ; version 0.5.0 et note de version. Une PR, quatre lots.
- **Trouvé en route** : `doctor` cherchait le manifeste sous son ancien
  nom (corrigé) ; l'ancien `init` écrasait la mécanique modifiée à la main
  (désormais signalée comme dérive).
- **Clôturé par** : la PR de ce chantier (branche
  `workstream/cli-en-anglais`) ; QUA-013 (contrôle non exécuté jamais
  vert) ré-attesté par l'humain.

## 2026-10-12 — README à jour (racine et paquet)

- **Décisions clés** : les deux README visent l'outil, pas seulement le
  cycle : accroche, public visé (et pour qui ce n'est pas fait),
  démonstration d'une sortie `drwil verify`, installation, puis le gain
  (tableau « vous obtenez / parce que / à vérifier vous-même »), le cycle
  d'un chantier (SCOPING → BUILD → EVIDENCE → VERIFY → CLOSING) et les
  commandes `state`, `contracts`, `resolve-drift`, `uninstall`. Aucun chiffre
  de productivité tant que le mini-banc n'en a pas produit. Acronyme
  développé : Deterministic Rules for Workflows, Intent & Lineage
  (décision du demandeur). Le report « après la vague 7 » du 2026-10-11 est
  levé.
- **Trouvé en route** : `docs/ia-first.md` (gabarit et copie) citait encore
  `lancer`, `fiches --json` et `<ACTIVITE>` ; README racine : contrats en
  français et version figée `v0.2.0` dans la commande d'installation —
  corrigés. Note « Unreleased » dans `packages/drwil/CHANGELOG.md`, à
  rattacher à la prochaine release.
- **Clôturé par** : la PR de ce chantier (branche
  `workstream/readme-a-jour`).

## 2026-10-13 — `init` sur un projet existant, release 0.5.1

- **Décisions clés** : un fichier que le projet possède déjà n'est jamais
  écrasé, mais `init` y ajoute ce dont drwil a besoin et le dit
  (`--dry-run` le montre d'abord) : bloc délimité `>>> drwil` / `<<< drwil`
  (`.gitignore`, `CLAUDE.md`, `GEMINI.md`, instructions Copilot et Cursor),
  fusion JSON (`.claude/settings.json`) et TOML (`.gitleaks.toml`),
  consignes drwil d'`AGENTS.md` dans `.drwil/AGENTS.md` (si présent). La CI déjà en
  place est détectée et non réécrite ; un `core.hooksPath` existant
  (husky, lefthook) est conservé, `init` dit comment appeler les hooks.
  `doctor` vérifie ces ajouts, `uninstall` les retire. Version 0.5.1
  décidée par le demandeur ; le report « Unreleased » du CHANGELOG (README)
  y est rattaché.
- **Limites connues** : un tableau `paths` d'une ligne de `.gitleaks.toml`
  revient sur deux lignes après `uninstall` ; les permissions fusionnées
  dans `.claude/settings.json` restent après `uninstall`.
- **Clôturé par** : la PR de ce chantier (branche
  `workstream/release-0-5-1`) ; tag `v0.5.1` et release après fusion.

## 2026-10-13 — Protéger master : checks obligatoires, CODEOWNERS, identité de l'agent

- **Décisions clés** : ruleset « master protégé » sans contournement,
  versionné dans `.github/ruleset-master.json` et vérifié en CI ;
  CODEOWNERS sur les zones de gouvernance. L'agent a son propre compte
  (`wilydub`, écriture sans admin, jeton classique car un jeton fin ne
  couvre pas un dépôt d'un autre propriétaire). Décidé le 2026-10-13 par le
  demandeur : 0 approbation globale mais revue des code owners exigée, donc
  l'humain n'approuve que les modifications de la gouvernance, pour ne pas
  freiner la fabrique.
- **Limites connues** : le jeton de l'agent est classique (portée `repo`) ;
  à renouveler tous les 90 jours.
- **Clôturé par** : PR #78 (lot 3), après les PR #11 à #29 (lots 1, 2 et 4).

## 2026-10-14 — Sécuriser le moteur (désinstallation, contrôles non exécutés, barrière de périmètre)

- **Décisions clés** : un chemin dangereux dans le manifeste (absolu, `..`,
  lien symbolique sortant) arrête `init` et `uninstall` avant toute écriture,
  et `removeObsolete` l'ignore ; hors commit, un contrôle qui devait tourner
  et n'a pas pu fait échouer `run-checks` (QUA-013) ; les états non
  configurés (pas de CI, aucun contrôle déclaré, pas de dépôt git, pas de
  branche de référence) restent un avertissement visible hors CI et
  échouent en CI. Décidé le 2026-10-14 par le demandeur.
- **Livré** : CI GitHub et GitLab du gabarit avec gitleaks 8.21.2 épinglé
  (empreinte vérifiée) ; tableau des modes `off`, `warning`, `blocking` du
  scope-gate dans `docs/ia-first.md` ; tests négatifs (manifeste malveillant,
  `--yes`, liens symboliques) et tests du scope-gate.
- **Limites connues** : pas d'installation automatique de gitleaks sur le
  poste local (seulement en CI) ; le comportement du gabarit livré change
  (à signaler dans la note de la prochaine release, avec la validation des
  chemins) ; aucun contrat ne porte encore sur la portée des suppressions.
- **Clôturé par** : commits `1333704` (lots 1 et 2) et `1b8d6f2` (lots 3 et 4).

## 2026-10-14 — Gitleaks dans les tests du kit en CI

- **Décisions clés** : installer gitleaks 8.21.2 (archive vérifiée par
  sha256) dans le job `kit-tests` sur Linux, macOS et Windows, plutôt que
  simuler l'outil ; nom du job fixé à `kit-tests (<os>)` car le ruleset de
  master l'exige par son nom (l'ajout de variables de matrice le changeait).
- **Limites connues** : aucune.
- **Clôturé par** : PR 79, commit « CI : gitleaks épinglé et vérifié dans kit-tests ».

## 2026-10-14 — Analyse statique du code en CI (CodeQL)

- **Décisions clés** : CodeQL (JavaScript et TypeScript) sur chaque PR, sur
  master et chaque semaine, dépôt public donc gratuit. Décidé le 2026-10-14
  par le demandeur : le contrôle à chaque push suffit, il ne bloque pas la
  fusion (pas d'ajout au ruleset de master) et ne crée pas de contrat de
  registre.
- **Limites connues** : une alerte est visible (PR, onglet Security) mais
  n'empêche pas la fusion ; l'analyse ne couvre pas les gabarits Markdown.
  Premier passage : 0 alerte ouverte.
- **Clôturé par** : PR 80.

## 2026-10-15 — Preuves de bout en bout

- **Décisions clés** : prouver par des tests, dans des dépôts temporaires,
  ce qui n'était vérifié que pièce par pièce. Livré : cycle complet (init,
  modification, verify, mise à jour, désinstallation) dans
  `packages/drwil/test/cycle.test.mjs` ; matrice 7×7 des transitions et
  parcours réel des sept activités dans `.githooks/state.test.mjs` ;
  contournements (`--no-verify`, hooks désactivés, état local falsifié)
  repris par `run-checks` et par le rejeu du cadrage de la branche. Verdicts
  PASS, FAIL, MANUAL, ERROR et attestations obsolètes : déjà couverts par
  `packages/drwil/test/kit.test.mjs`, rien dupliqué.
- **Limites connues** : un `.drwil/state.json` (si présent) réécrit à la main n'est pas
  détecté en lui-même (fichier ignoré par Git) ; seuls le refus de l'outil
  et le rejeu du cadrage en CI le bornent. Aucun code livrable modifié :
  seuls des tests ont été ajoutés.
- **Clôturé par** : PR à venir.

## 2026-10-15 — Critères d'acceptation prouvés avant la clôture

- **Décisions clés** : chaque fiche liste ses critères d'acceptation (section
  dédiée, un lien vers un contrat ou `[humain]`). `drwil verify` les évalue
  (pass, no-proof, unknown-proof, not-durable, not-pass), les inscrit dans
  l'évidence et dans un tableau `criteria-*.md` pour la relecture ; la
  clôture est refusée tant qu'un critère n'est pas `pass`. Un critère lié à
  un contrat à contrôle rejouable devient un test de non-régression métier.
  Deux filets distincts : ceux de l'utilisateur et ceux de drwil.
- **Limites connues** : aucune règle « avertir puis bloquer » pour une
  fiche sans critères ; la CLI n'affiche pas le chemin du tableau et la PR
  ne le reçoit pas automatiquement.
- **Clôturé par** : PR à venir.

## 2026-10-15 — Maturité des fiches (prêt / à affiner)

- **Décisions clés** : champ explicite `**Maturité**` (`à affiner | prêt | en
  cours`, `to refine | ready | in progress` en anglais) sous le statut,
  lu par `briefMaturity` ; une fiche sans le champ est « non renseignée » et
  n'est jamais bloquée. `check-docs` refuse une fiche déclarée « prête »
  qui garde un point `[décision]` ouvert ou n'a aucun lot. Le sondage de
  lancement et la liste du terminal classent par maturité (prêtes d'abord,
  « à affiner » en dernier) et signalent les fiches à affiner sans les
  masquer ; le tableau de bord les trie de même et affiche le champ tel
  qu'écrit.
- **Limites connues** : le tableau de bord recopie la règle de classement
  de `scopedBriefs` (module optionnel autonome, sans import) ; les fiches
  existantes n'ont pas encore le champ.
- **Clôturé par** : PR à venir.

## 2026-10-15 — Échapper l'antislash dans le tableau des critères

- **Décisions clés** : alerte CodeQL (échappement incomplet, sévérité haute)
  sur la PR #82. `cell` échappe désormais `\` avant `|` et s'applique à
  toutes les colonnes : critère, lien et nature de la preuve. Un test
  couvre `\` et `|` dans le critère et dans la preuve.
- **Limites connues** : aucune.
- **Clôturé par** : PR à venir.

## 2026-10-15 — Capitaliser les tests de non-régression à chaque chantier

- **Décisions clés** : `check-docs` refuse une fiche « prête » sans
  critère d'acceptation ; une fiche sans critères qui n'est pas « prête »
  se clôt avec un avertissement (QUA-021). `verify` classe chaque contrat
  lié par un critère contre la base de la branche : créé, réutilisé tel
  quel (accepté) ou modifié (QUA-022). Un contrat modifié sans déclaration
  dans la section « Contrats modifiés » de la fiche active est une
  régression : `verify` le liste et la clôture est refusée ; un contrat en
  échec qui porte `**Origine**` affiche le critère qu'il protège
  (QUA-023). Le registre du gabarit livre `APP-001`, contrat métier
  d'exemple à compléter, et le guide d'adoption explique comment écrire le
  premier (QUA-024). Les quatre contrats sont ceux du registre de ce dépôt
  (ID à partir de QUA-021, `catalogue:QUA-020` étant pris), et les
  critères du chantier ont été évalués prouvés par `drwil verify`.
- **Correctif en passant** : `acceptanceCriteria` ne lisait que la
  première ligne d'une puce et prenait le premier identifiant entre
  accents graves : un critère passé à la ligne perdait sa preuve. La puce
  est lue entière, la preuve est le dernier identifiant.
- **Limites connues** : le cadrage initial ne listait pas les copies du
  dépôt des fichiers du gabarit (cinq élargissements en cours de route) ;
  un élargissement pendant un lot oblige à mettre le lot de côté, le hook
  de commit testant l'arbre entier ; `npm run installer-depot` réécrit la
  date d'état de `docs/ia-first.md` ; un critère lié directement à un
  contrôle (sans contrat) reste accepté ; le catalogue et ce dépôt
  définissent chacun un QUA-019 différent.
- **Clôturé par** : PR à venir.

## 2026-10-15 — Fiabiliser le package npm (version d'installation, mises à jour)

- **Décisions clés** : `init` enregistre la version du moteur dans
  `.drwil/install.json` (si présent) — `format`, `version`, `firstVersion` conservée
  aux mises à jour, sans horodatage pour ne changer qu'avec la version —
  sans toucher au manifeste ; `uninstall` le retire (QUA-025). `doctor`
  gagne un point « version » comparé à la CLI, en avertissement seulement
  (QUA-026). Une mise à jour depuis une version antérieure, simulée hors
  réseau, préserve le travail du client, rafraîchit la mécanique
  inchangée, retire les obsolètes jamais modifiés et suit la version
  (QUA-027). La CLI n'a pas de commande `apply` : `init` installe et met à
  jour. Minification écartée (2026-10-14).
- **Limites connues** : sur ce dépôt, installé par `installer-depot` et non
  par `init`, `doctor` avertit d'un manifeste et d'une version absents, avec
  un conseil qui ne s'y applique pas —
  `docs/intentions/doctor-sur-le-depot-drwil.md`. Le cadrage oubliait
  `docs/contracts.md` (un élargissement), déjà couvert par
  l'intention « cadrage complet » (réalisée : « Un cadrage complet du premier coup », QUA-035).
- **Clôturé par** : PR à venir.

## 2026-10-15 — Cohérence des ID de contrat entre registre et catalogue

- **Décisions clés** : `check-docs` signale un ID défini à la fois dans le
  registre et dans le catalogue (un contrat adopté du catalogue garde son
  ID et le quitte), ou deux fois dans le catalogue ; il lit les deux
  formes `catalogue:` et `catalog:` ; bloquant si `newRequirements` l'impose,
  avertissement sinon (QUA-028). Le doublon SEC-001 de ce dépôt (deux
  règles différentes) est levé en renumérotant la ligne du catalogue en
  `catalogue:SEC-013` ; le registre ne change pas. Lecture et comparaison
  dans `.githooks/contracts.mjs`, `check-docs` étant au plafond de QUA-001.
- **Limites connues** : aucune nouvelle ; la double forme du préfixe reste
  en question dans `docs/intentions/prefixe-catalogue.md`.
- **Clôturé par** : PR à venir.

## 2026-10-16 — Lien contrat ↔ test, échec attribué à la bonne règle

- **Décisions clés** : le contrôle `contract-tests` du moteur, livré dans
  le gabarit, vérifie que chaque fichier cité par le champ Tests d'un
  contrat existe et contient son ID. Il ne dépend pas de la pile, et il
  est bloquant si `newRequirements` l'impose, avertissement sinon
  (QUA-029). `drwil verify` signale un contrôle en échec partagé par
  plusieurs contrats comme non attribuable (QUA-030). APP-001 et la
  recette d'adoption enseignent un contrôle par règle métier, filtré par
  l'ID. Dans ce dépôt, QUA-013, QUA-015, QUA-016, QUA-017 et QUA-028
  citent enfin le contrôle qui rejoue leurs tests (contrats modifiés
  déclarés ; QUA-013 et QUA-015 réattestés). Lecture des sorties des
  lanceurs de tests écartée (2026-10-16).
- **Limites connues** : dans ce dépôt, `couverture-tests` est cité par
  13 contrats, donc un test cassé les fait tous échouer avec le message de
  contrôle partagé. C'est honnête mais bruyant : appliquer ici « un
  contrôle par règle » a été fait ensuite (chantier « Un contrôle par
  règle dans le dépôt drwil », QUA-033). Ajouter un
  contrôle à un contrat impose de le réattester, même quand la preuve est
  renforcée, et `drwil attest` relance les contrôles cités sans rien
  afficher, parfois pendant plusieurs minutes (réglé ensuite par le
  chantier « Attestation sans friction inutile », QUA-032). La vue des règles
  métier a été réalisée ensuite (« Vue des règles métier dans drwil
  verify »).
- **Clôturé par** : PR #91.

## 2026-10-16 — Vue des règles métier dans drwil verify

- **Décisions clés** : `drwil verify` se termine, en sortie humaine et en
  sortie agent, par un bilan d'une ligne des règles métier : prouvées par
  un test, prouvées sans test cité, à compléter, cassées (avec leur
  chantier d'origine). Le détail règle par règle est dans le JSON
  (`businessRules`) et dans l'évidence (QUA-031). Une règle métier est un
  contrat au préfixe `APP` (réglable : `businessPrefixes`) ou un contrat
  qui porte un champ Origine. Le calcul vit dans
  `packages/drwil/src/rules.ts`, `packages/drwil/src/verify.ts` étant au plafond de QUA-001
  (399 lignes). Le tableau complet et l'option `--rules` ont été écartés
  (2026-10-16).
- **Limites connues** : `packages/drwil/src/verify.ts` n'a plus de marge (399 lignes sur
  400) : la prochaine évolution devra d'abord en extraire une partie. Le
  cadrage oubliait la copie du dépôt de `docs/ia-first.md` (un
  élargissement), un cas déjà couvert par
  l'intention « cadrage complet » (réalisée : « Un cadrage complet du premier coup », QUA-035). La vue
  d'avancement HTML et la recette « demander une bonne pratique » ont été
  écartées ensuite (voir l'entrée suivante).
- **Clôturé par** : PR #94.

## 2026-10-16 — Intention close : la non-régression métier, alimentée chantier après chantier

- **Vision** (demandeur, 2026-10-16) : deux circuits de contrats. Les
  bonnes pratiques, écrites d'avance, vivent dans le catalogue et entrent
  au registre quand l'utilisateur les adopte. Les règles métier sont
  découvertes chantier après chantier : un critère d'acceptation devient
  un contrat du registre, prouvé par un test, et ce contrat protège les
  chantiers suivants.
- **Réalisé** : le lien contrat ↔ test est contrôlé chez l'utilisateur et
  l'échec est attribué à la bonne règle (QUA-029, QUA-030 : chantier
  « Lien contrat ↔ test », PR #91) ; la vue des règles métier est dans
  `drwil verify` (QUA-031 : PR #94).
- **Écarté** (demandeur, 2026-10-16, « trop statique ») : la vue des règles
  métier dans la vue d'avancement HTML, et une recette « demander une
  bonne pratique hors adoption ».
- **Suites** : les intentions « un contrôle par règle dans le dépôt » et
  « attestation sans friction », nées de ces chantiers, toutes deux
  réalisées ensuite (chantiers du même nom, QUA-033 et QUA-032).
- **Texte intégral** : `git log --follow -- docs/intentions/non-regression-metier.md`.

## 2026-10-16 — Intentions closes : livrable en anglais, non-régression continue

- **Livrable en anglais** (intention `livrable-full-english`,
  cadrée le 2026-10-12) : entièrement réalisée par ses trois chantiers, un
  seul gabarit en anglais (B), le cœur (A), la CLI (C), clos le
  2026-10-12 (entrées ci-dessus).
- **Non-régression continue** (intention `non-regression-continue`,
  questions tranchées le 2026-10-11) : réalisée par le chantier
  « Capitaliser les tests de non-régression » (QUA-021 à QUA-024,
  2026-10-15), puis par le lien contrat ↔ test, l'échec attribué à la
  bonne règle et la vue des règles métier (QUA-029 à QUA-031, 2026-10-16).
- **Pourquoi closes si tard** : rien ne reliait ces chantiers à leur
  intention à la clôture ; relevé le 2026-10-16 par le demandeur, la
  mécanique est cadrée dans le chantier « La clôture boucle les intentions ».
- **Texte intégral** : `git log --follow -- docs/intentions/<intention>.md`.

## 2026-10-16 — Attestation sans friction inutile

- **Décisions clés** : une attestation version 2 couvre la part humaine
  du contrat (règle, champ Manuel, sévérité ; toute la section pour un
  contrat historique en tableau) et, séparément, la définition de chaque
  contrôle attesté. Un contrôle ajouté ne la rend plus obsolète (il doit
  passer) ; un changement de la part humaine ou un contrôle attesté
  retiré ou redéfini, si. Les attestations version 1 restent jugées par
  leur ancienne empreinte : les cinq du dépôt restent valables.
  `drwil attest` annonce chaque contrôle qu'il relance et son résultat
  avant la question (option `onCheck` de verify) (QUA-032). L'évidence
  sort de `packages/drwil/src/verify.ts` (399 lignes, désormais 366) vers
  `packages/drwil/src/evidence.ts`.
- **Intention d'origine** (« attestation sans friction », 2026-10-16) :
  entièrement couverte, résumée ici et retirée de `docs/intentions/`.
- **Limites connues** : un contrôle retiré invalide toujours
  l'attestation : le chantier « Un contrôle par règle dans le dépôt
  drwil » a demandé de réattester QUA-013 et QUA-015 (fait). Le test de l'annonce
  d'`attest` ne couvre que le français ; les textes anglais sont écrits
  mais pas éprouvés.
- **Clôturé par** : PR #98.

## 2026-10-16 — Un contrôle par règle dans le dépôt drwil

- **Décisions clés** : chaque contrat du registre qui cite des tests cite
  son propre contrôle, `tests-<id>`, qui ne rejoue que les fichiers de son
  champ Tests filtrés par son ID (17 contrôles, générés depuis le registre,
  environ 34 s au total). La couverture n'est plus citée que par QUA-004.
  `tests-contrats` (`outils/verifier-tests-contrats.mjs`) refuse un
  contrat à tests qui ne cite pas son propre contrôle (QUA-033). QUA-032,
  créé après le cadrage, a été ajouté aux contrats modifiés par le
  demandeur. QUA-013 et QUA-015 réattestés (contrôle retiré), au format
  version 2. Éprouvé dans une copie jetable : un test cassé de QUA-016 fait
  échouer QUA-016 seul parmi les contrats à tests, sans message de
  contrôle partagé.
- **Intention d'origine** (« un contrôle par règle dans le dépôt »,
  2026-10-16) : entièrement couverte, résumée ici et retirée de
  `docs/intentions/`.
- **Limites connues** : QUA-004 (seuil de couverture) échoue aussi sur
  tout test cassé, sa couverture rejouant toute la suite : c'est sa règle,
  pas un contrôle partagé. Les tests passent deux fois au push et en CI
  (contrôle par contrat et couverture). Un nouveau contrat à tests doit
  déclarer son contrôle à la main dans `.drwil/ia-first.json` ;
  `tests-contrats` le rappelle en refusant le commit.
- **Clôturé par** : PR #100.

## 2026-10-16 — Critères d'acceptation obligatoires, capitalisés en contrats

- **Décisions clés** (demandeur, 2026-10-16) : toute fiche de chantier a
  des critères d'acceptation, quelle que soit sa maturité ; sans eux,
  `state.mjs start` et la clôture sont refusés si `newRequirements` vaut
  `blocking`, avertis sinon ; l'entretien courant en est exempt (QUA-021).
  Un critère est toujours prouvé par un contrat : lié à un contrôle seul,
  il n'est plus prouvé (`no-contract`) — le code tient enfin la règle déjà
  écrite de QUA-022 ; un contrat créé par le chantier sans champ Origine
  n'est pas une preuve durable (`no-origin`). Un critère de jugement
  humain reste permis, par un contrat Manuel attesté. Modèle de fiche et
  doc livrée mis à jour.
- **Intention d'origine** (« preuve des critères visible ») : question 2
  réalisée ; la question 1 (un critère non prouvé change-t-il le verdict
  de verify ?) l'a été ensuite (« Un critère non prouvé fait tomber le
  verdict de verify »).
- **Limites connues** : huit fiches ouvertes n'ont aucun critère (dont
  `mini-banc`, `ci-matrice-sur-pr`, `drwil-v0-2-gouvernance-executable`,
  `entretien-sous-barriere-bloquante`, `adopter-seuil-couverture`) : leur
  lancement est désormais refusé dans ce dépôt, à compléter avant chacune.
  Le lecteur des critères prend un marqueur humain cité dans la phrase d'un
  critère pour un vrai marqueur (vu sur la fiche de ce chantier,
  reformulée). Le motif du champ Origine est écrit deux fois
  (`packages/drwil/src/criteria.ts`, `originOf`, et
  `packages/drwil/src/rules.ts`, hors cadrage de ce chantier).
- **Clôturé par** : PR #102.

## 2026-10-16 — Fiche close sans critères : entretien sous barrière

Relevé en écrivant les critères d'acceptation des fiches ouvertes
(QUA-021, critères obligatoires) : la fiche était dépassée.

- **Petite correction sous barrière bloquante** (2026-10-09) : trois
  transitions humaines pour une correction mineure. Réglé par le
  lancement en un geste et la clôture sur évidence de verify (« Fluidité,
  levier 1 », 2026-10-10) : le 2026-10-16, le correctif ReDoS du caviardage
  a été lancé en un seul sondage sur l'entretien courant.
- **Aussi dépassée, close ensuite** (« Fiche close : drwil V0.2 ») : la
  fiche V0.2, dont les restes
  sont portés par `docs/projects/mini-banc.md` et
  `docs/intentions/packager-kit-ia-first.md` ; le registre la cite, et sa
  clôture touche donc `docs/contracts.md`, ce qu'un commit de cadrage ne
  peut pas faire (barrière de périmètre).
- **Texte intégral** : `git log --follow -- docs/projects/<fiche>.md`.

## 2026-10-16 — Un critère non prouvé fait tomber le verdict de verify

- **Décisions clés** (demandeur, 2026-10-16) : avec une fiche active,
  `drwil verify` combine le jugement de ses critères d'acceptation au
  verdict des contrats : un critère non prouvé donne `FAIL`, ou `MANUAL`
  si le seul manque est un critère humain à attester ; les critères non
  prouvés sont listés dans les sorties humaine, agent et JSON (`criteria`).
  Sans fiche active (CI, `drwil attest`), rien ne change (QUA-034, avec
  son contrôle propre `tests-qua-034`).
- **Intention d'origine** (« preuve des critères visible », 2026-10-15) :
  ses deux questions sont réalisées (critère toujours prouvé par un
  contrat, puis verdict), elle est résumée ici et retirée de
  `docs/intentions/`.
- **Limites connues** : la clôture, sur une évidence `FAIL`, refuse sans
  nommer le critère fautif (c'est verify qui le nomme, en amont). Le
  cadrage oubliait `.drwil/ia-first.json`, nécessaire au contrôle propre
  du contrat créé (QUA-033) : un élargissement, cas couvert par
  l'intention « cadrage complet » (réalisée : « Un cadrage complet du premier coup », QUA-035).
- **Clôturé par** : PR #104.

## 2026-10-16 — Un cadrage complet du premier coup, un élargissement sans friction

- **Décisions clés** (demandeur, 2026-10-16) : un fichier cité dans le
  bloc scope couvre aussi sa copie déclarée par le réglage `scopeMirrors`
  (paires de préfixes source → copie), pour la barrière de périmètre,
  check-docs et le hook Claude ; ce dépôt y déclare son gabarit.
  check-docs avertit un cadrage de code sans aucun test, ou un critère qui
  crée un contrat sans `.drwil/ia-first.json`. Un commit de documentation
  seule (`docs/`, Markdown) ne rejoue plus les tests sur l'arbre de
  travail : signalés non exécutés, rejoués au push et en CI (QUA-035).
- **Intention d'origine** (« cadrage complet », 2026-10-15) : entièrement
  couverte, résumée ici et retirée de `docs/intentions/`.
- **Limites connues** : à la mise au point, le commit documentaire
  s'appuyait sur `isCode`, qui n'appelle code que ce que le projet déclare
  (préfixes) : sans réglage, tout commit serait passé pour documentaire et
  n'aurait plus rejoué aucun test. Définition stricte retenue (`docs/` ou
  Markdown). Le contrôle signale déjà quatre fiches ouvertes à compléter
  (le chantier « La clôture boucle les intentions »,
  `docs/projects/mini-banc.md`, `docs/projects/ci-matrice-sur-pr.md` :
  `.drwil/ia-first.json` ; `docs/projects/adopter-seuil-couverture.md`,
  `docs/projects/ci-matrice-sur-pr.md` : aucun test). Le cadrage a encore
  dû être élargi une fois (le hook Claude) : le rappel de cadrage côté
  agent n'était pas nommé dans le cadrage initial.
- **Clôturé par** : PR #106.

## 2026-10-16 — Fiche close : drwil V0.2 — gouvernance exécutable

- **Cadrée le 2026-10-05**, elle a livré tous ses lots [IA] (DRWIL-001 à
  005, 010 à 013, 020, 021, 031 ; PR #34 du dépôt archivé), dont la forme
  sections du registre (ADR-001 : `docs/contracts.md` est la source
  canonique des contrats) et `drwil verify` comme primitive de validation.
- **Ses deux restes sont portés ailleurs** : le benchmark (DRWIL-022) par
  `docs/projects/mini-banc.md` ; la publication npm (DRWIL-030) par
  `docs/intentions/packager-kit-ia-first.md`, vague 7.
- **Close dans le chantier « la clôture boucle les intentions »**, son
  retrait touchant le registre, qui la citait (ce qu'un commit de cadrage
  ne peut pas faire).
- **Texte intégral** : `git log --follow -- docs/projects/drwil-v0-2-gouvernance-executable.md`.

## 2026-10-16 — La clôture boucle les intentions

- **Décisions clés** (demandeur, 2026-10-15 et 2026-10-16) : à la clôture
  d'un chantier, chaque limite non traitée devient une fiche d'intention
  (l'agent peut l'écrire seul, jamais une fiche de chantier), listée dans
  l'index en `[décision]` et citée par le journal ; l'intention d'origine,
  nommée par le champ `**Intention**` de la fiche, est mise à jour, ou
  résumée au journal et retirée si elle est entièrement couverte. Règle
  d'`AGENTS.md`, étape de la recette de clôture, rappel de l'activité
  CLOSING. Au commit, une fiche supprimée sans que son intention soit
  touchée est signalée ; une intention sans revue datée depuis 30 jours
  aussi (ligne « Revu le »), jamais bloquant (QUA-036). La fiche V0.2,
  dépassée, est close (« Fiche close : drwil V0.2 »).
- **Appliqué à sa propre clôture** : pas d'intention d'origine (demande
  directe) ; la seule limite relevée, des fiches ouvertes sans champ
  Intention, est traitée dans le commit de clôture (`mini-banc` déclare
  `docs/intentions/bench-avec-sans-drwil.md`, les autres ne viennent
  d'aucune intention) : aucune intention à consigner.
- **Clôturé par** : PR #107.

## 2026-10-16 — Une file de chantiers décidée d'un geste

- **Décisions clés** (demandeur, 2026-10-16) : un sondage `/drwil-start` à
  choix multiple, lu par le hook, enregistre une file de fiches prêtes
  (maturité « prêt », aucune décision ouverte, critères) et la fusion
  automatique ; la file reste après une clôture, l'agent lance seul sa
  tête (`node .githooks/state.mjs next`) et jamais une fiche hors file ;
  tout autre retour en SCOPING ou `queue stop` l'abandonne (QUA-037).
  Extraction préalable : `main()` passe de `.githooks/state.mjs` (386
  lignes) à `.githooks/state-cli.mjs`, sans changement de comportement.
- **Intention d'origine** (`docs/intentions/fabrique-autonome.md`) :
  premier pas réalisé, mise à jour (ligne « Revu le »), gardée ouverte.
- **Limites connues** : la file ne se décide qu'avec Claude Code
  (`docs/intentions/file-pour-copilot.md`) ; l'arrêt au premier blocage et
  les comptes rendus sont des consignes à l'agent, pas une mécanique
  vérifiée (`docs/intentions/arret-de-file-verifie.md`). En route, un
  `git checkout` réflexe sur `docs/ia-first.md` a annulé une copie
  régénérée (rattrapée avant le commit) : ce réflexe n'a plus lieu d'être.
- **Clôturé par** : PR #109.

## 2026-10-16 — Un projet neuf commence par son cadrage global, sans couche inventée

- **Décisions clés** (demandeur, 2026-10-16) : sans pile détectée, `drwil
  init` n'écrit plus `backend/` ni `frontend/` et dit quoi faire (cadrer le
  projet, ou `--layers`) ; `drwil init --layers <couches>`, relancé une fois
  la pile choisie, crée pour chaque couche `AGENTS.md`, `CLAUDE.md` et
  `GEMINI.md` et l'enregistre. La recette et la skill `/drwil-adopt`
  commencent un projet neuf par son cadrage global (étape 0 : besoin,
  première version, pile et couches, premières règles métier, risque ;
  `AGENTS.md`, carte, premier README) (QUA-038). Premier chantier de la
  première file réelle (avec « glossaire des identifiants » et
  `docs/projects/doc-a-jour.md`).
- **Intention d'origine** : aucune (demande directe) ; aucune limite non
  traitée à consigner.
- **Clôturé par** : PR #110.

## 2026-10-16 — Un identifiant cité à l'humain vient avec ce qu'il désigne

- **Décisions clés** (demandeur, 2026-10-16) : trois couches multi-agent.
  Une seule source, `.githooks/glossary.mjs`, lit les libellés (contrats du
  registre, lignes du catalogue, lots et points numérotés de la fiche
  active) et les donne à tout agent (`node .githooks/glossary.mjs
  "<texte>"`). À la source : `drwil verify` (humain et agent),
  `run-checks` et `check-contract-tests` annotent la première mention d'un
  identifiant, jamais deux fois (un tiret s'il est déjà entre
  parenthèses). `AGENTS.md` (règle ajoutée au gabarit, qui ne l'avait
  pas), Copilot et Cursor en font la règle. Avec Claude Code, un hook
  injecte les libellés après les outils qui font entrer du texte
  (QUA-039).
- **Écart** : le hook devait suivre « tout outil » ; après une édition, il
  renvoyait à l'agent les libellés de ce qu'il venait d'écrire. Il suit
  donc le shell, les lectures et les recherches. QUA-034 éprouvé en route :
  verify a refusé `PASS` tant qu'un critère de la fiche restait non lié.
- **Intention d'origine** : aucune (demande directe).
- **Limites connues** : l'injection automatique n'existe que pour Claude
  Code (`docs/intentions/glossaire-autres-agents.md`) ; les messages de
  `check-docs` (plafond de QUA-001) ne sont pas annotés.
- **Clôturé par** : PR #111.

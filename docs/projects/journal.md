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
  l'intention « suites-kit-portable » (abandonnée le 2026-10-25), traité avec ce chantier). `docs/projects/`,
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
- **Résultat** : l’outil `consommation` (propre au dépôt, livré depuis le 2026-10-16 en `.githooks/consumption.mjs`) lit les
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
  `docs/intentions/petits-defauts.md` (ex-« doctor-sur-le-depot-drwil », regroupée le 2026-10-25). Le cadrage oubliait
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
  en question dans `docs/intentions/petits-defauts.md` (ex-« prefixe-catalogue », regroupée le 2026-10-25).
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
  sont portés par `docs/projects/journal.md` et
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
  `docs/projects/journal.md`, `ci-matrice-sur-pr` (close le 2026-10-18) :
  `.drwil/ia-first.json` ; `docs/projects/adopter-seuil-couverture.md`,
  `ci-matrice-sur-pr` : aucun test). Le cadrage a encore
  dû être élargi une fois (le hook Claude) : le rappel de cadrage côté
  agent n'était pas nommé dans le cadrage initial.
- **Clôturé par** : PR #106.

## 2026-10-16 — Fiche close : drwil V0.2 — gouvernance exécutable

- **Cadrée le 2026-10-05**, elle a livré tous ses lots [IA] (DRWIL-001 à
  005, 010 à 013, 020, 021, 031 ; PR #34 du dépôt archivé), dont la forme
  sections du registre (ADR-001 : `docs/contracts.md` est la source
  canonique des contrats) et `drwil verify` comme primitive de validation.
- **Ses deux restes sont portés ailleurs** : le benchmark (DRWIL-022) par
  `docs/projects/journal.md` ; la publication npm (DRWIL-030) par
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
  (l'intention « file-pour-copilot » (couverte, retirée le 2026-10-25)) ; l'arrêt au premier blocage et
  les comptes rendus sont des consignes à l'agent, pas une mécanique
  vérifiée (`docs/intentions/cloture-et-attestations.md` (ex-« arret-de-file-verifie », regroupée le 2026-10-25)). En route, un
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
  « documentation à jour »).
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
  Code (`docs/intentions/compatibilite-des-outils.md` (ex-« glossaire-autres-agents », regroupée le 2026-10-25)) ; les messages de
  `check-docs` (plafond de QUA-001) ne sont pas annotés.
- **Clôturé par** : PR #111.

## 2026-10-16 — Une documentation à jour pour la 0.6.0, et qui le reste

- **Décisions clés** (demandeur, 2026-10-16) : drwil entretient la carte
  du client, pas seulement celle de ce dépôt. Livré à tout projet : le
  contrôle `architecture-map` signale un dossier de code absent de
  `docs/architecture.md`, avec la ligne à compléter (réglage
  `architectureMap.files` pour exiger les fichiers ; ce dépôt l'exige pour
  `packages/drwil/src/`, `.githooks/` et `outils/`) ; la clôture tient
  README, ligne « Unreleased » du changelog et carte (recette et rappel
  CLOSING) ; la release renomme « Unreleased » ; `/drwil-adopt` construit
  la carte depuis le code (QUA-040). Rattrapage de la doc pour la 0.6.0 :
  changelog depuis la 0.5.1, README du dépôt et du paquet, INSTALL, chaîne
  réelle des contrôles dans `docs/ia-first.md`, carte (17 fichiers
  absents) ; attesté par le demandeur (QUA-041).
- **Écart** : en cours de chantier, le demandeur a voulu en anglais ce que
  lit un prospect (README, INSTALL, carte, README et changelog du
  paquet) ; exception inscrite dans `AGENTS.md`. La table des contrats
  livrés du README du paquet était fausse (SEC-001 et QUA-004 n'en font
  pas partie).
- **Intention d'origine** : aucune (demande directe).
- **Limites connues** : carte et README d'un client dans sa langue, et
  justesse des rôles de la carte non contrôlée
  (intention « carte dans la langue du projet », close le même jour) ; la section
  française du README du paquet est gardée, à trancher.
- **Clôturé par** : PR à venir.

## 2026-10-16 — Carte, README et changelog d'un projet dans la langue choisie

- **Décisions clés** (demandeur, 2026-10-16, sur l'intention « carte dans
  la langue du projet ») : réglage `docLang` dans `.drwil/ia-first.json`,
  absent par défaut (la langue du projet) ; la carte, le README et le
  changelog s'écrivent dans cette langue, donnée à l'agent par l'`AGENTS.md`
  livré, le rappel CLOSING, les recettes d'adoption et de clôture et
  `docs/ia-first.md`. La justesse du rôle écrit pour chaque dossier reste
  une part humaine, assumée dans le contrat (pas de contrôle de carte
  « figée »). QUA-040 évolue en conséquence, déclaré dans la fiche. Ce
  dépôt règle `docLang` à `"en"`. README du paquet : section française
  retirée (demande du 2026-10-16).
- **Intention d'origine** : entièrement couverte, résumée ici et retirée.
- **Limites connues** : aucune nouvelle ; aucun contrôle ne vérifie la
  langue des documents (hors périmètre).
- **Clôturé par** : PR à venir.

## 2026-10-16 — La consommation de tokens par chantier, mesurée chez tout projet

- **Décisions clés** (demandeur, 2026-10-16, pour le pilote de la 0.6.0) :
  la mesure propre au dépôt devient `.githooks/consumption.mjs`, livré par
  le gabarit : par chantier (branches `workstream/<fiche>` et
  `cadrage/<fiche>` regroupées), tokens en quatre catégories, total
  pondéré indicatif, temps actif et modèles, lus dans les journaux de
  session de Claude Code — seuls les champs de consommation, jamais un
  contenu de message. `--record <fiche>` ajoute la ligne de clôture à
  `.drwil/usage.jsonl` (versionné), jamais deux fois ; le rappel CLOSING,
  la recette de clôture et la skill le demandent. Jamais bloquant : sans
  journal lisible, il le dit et sort en succès. Nouveau contrat QUA-042.
  Tranche le point 11 de l'ordre des chantiers (consommation écrite à la
  clôture), avancé pour le pilote.
- **Écart** : l'outil du dépôt et son test sont retirés au profit de la
  copie installée et de `.githooks/consumption.test.mjs` ; la recette
  livrée disait la mesure impossible, c'était faux pour Claude Code. À
  la clôture, la barrière de périmètre refusait `.drwil/usage.jsonl` en
  CLOSING : le fichier passe désormais comme les fiches et les
  attestations (cadrage élargi, chantier relancé par le demandeur).
- **Intention d'origine** : aucune (demande directe).
- **Limites connues** : les autres outils IA (Copilot CLI, Cursor, Codex,
  Gemini) restent à l'estimation à la main (intention « consommation
  mesurée aussi pour les autres outils IA ») ; pas de coût en euros (hors
  périmètre : les tarifs changent).
- **Clôturé par** : PR #116.

## 2026-10-17 — Release 0.6.0

- **Décisions clés** (demandeur, 2026-10-17) : une fiche dédiée plutôt
  que l'entretien courant, pour le pilote sur 2 ou 3 projets. Version
  0.6.0 partout (paquet, racine, verrou) ; section « Unreleased » du
  changelog renommée « 0.6.0 (2026-10-17) », une « Unreleased » vide
  au-dessus ; README : la 0.6.0 est la dernière release (QUA-040).
  Essai réel en plus du test de QUA-027 : projet temporaire équipé avec le
  tarball 0.5.1 de la release GitHub, mis à jour avec le tarball 0.6.0 —
  aucun fichier du projet perdu, recette modifiée préservée, hooks en
  0.6.0 ; `verify` en échec seulement pour le montage de l'essai (master,
  sans CI, code hors fiche).
- **Écart** : l'essai a montré que la prose installée (skills, recettes,
  `AGENTS.md`) n'est jamais rafraîchie, même non modifiée ; les projets du
  pilote étant neufs, le demandeur a décidé de publier quand même, la
  limite signalée dans le changelog (« Upgrading from 0.5.1 »).
- **Intention d'origine** : aucune (demande directe).
- **Limites connues** : prose non rafraîchie à la mise à jour et
  « première installation » faussée dans `doctor` (intention « une mise à
  jour rafraîchit aussi la prose que le projet n'a pas touchée »).
- **Publication** (lot 2, 2026-10-17) : tag `v0.6.0` poussé, release
  GitHub publiée avec le tarball `drwil-0.6.0.tgz` attaché, devenue la
  dernière (téléchargée sans tag, installée sur un projet neuf : version
  0.6.0, skill `/drwil-start` avec la file, `.githooks/consumption.mjs` présent).
  Note complétée : `paths` décide aussi de ce qui tourne au commit, et la
  limite de mise à jour depuis la 0.5.1.
- **Clôturé par** : PR #124 ; release
  https://github.com/wdubilly/drwil/releases/tag/v0.6.0.

## 2026-10-17 — Un projet neuf installé selon le README reste un projet neuf (0.6.1)

- **Décisions clés** (demandeur, 2026-10-17, « corrige en 0.6.1 ») :
  constaté en installant la 0.6.0 dans `drwil_com` en suivant le README :
  l'étape `npm install -D ./drwil-*.tgz` crée un `package.json` qui ne
  déclare que drwil, et `init` y détectait une pile Node.js — le dossier
  vide était traité en projet existant (pas de `git init` ni de branche,
  pas d'invitation à cadrer, carte « Node.js, detected » au lieu de « Not
  decided »). Corrigé dans la détection (`detectDir`), pas dans l'ordre
  des étapes du README : un `package.json` sans autre dépendance que
  drwil et sans script n'est plus une pile ; un vrai projet Node reste
  détecté. QUA-038 évolue (déclaré dans la fiche). Version 0.6.1 :
  paquets, verrou, changelog, README.
- **Intention d'origine** : aucune (défaut constaté sur un projet du
  pilote).
- **Limites connues** : un dossier passé par `npm init -y` (script `test`
  par défaut) reste pris pour un projet existant (intention « un dossier
  passé par `npm init -y` reste un projet neuf »).
- **Publication** : release 0.6.1 après la fusion de cette PR, sur feu
  vert du demandeur.
- **Clôturé par** : PR à venir.

## 2026-10-17 — Un premier essai propre : installation par l'URL de la release, premier `verify` sans CI expliqué (0.6.2)

- **Décisions clés** (demandeur, 2026-10-17) : constaté en installant la
  0.6.1 dans `drwil_com` vidé, en suivant le README à la lettre. Le
  tarball téléchargé restait à la racine, exigé par `package.json`
  (`file:`) et non ignoré par git ; les deux README installent désormais
  par l'URL de l'asset de la release (rien de déposé, plus besoin de
  `gh`), avec la variante `npx --package <URL>` et la mise à jour par la
  nouvelle URL. Le premier `verify` sans CI finit en `VERIFY ERROR`
  (voulu) : `verify` et `doctor` nomment désormais `npx drwil init --ci
  github` (ou `--ci gitlab`), et le README l'explique à côté du premier
  `verify` ; le verdict ne change pas. Choix du demandeur : README **et**
  messages, plutôt que le README seul. Version 0.6.2 : paquets, verrou,
  changelog, README.
- **En cours de chantier** (décision du demandeur) : le critère du
  message était rattaché à QUA-013 (contrôle non exécuté n'est pas
  passé), contrat attesté (champ `Manuel`) : `verify` l'a refusé
  (« preuve non durable »). Nouveau contrat automatisé QUA-043 (un projet
  sans CI sait comment en déclarer une), contrôle `tests-qua-043` ;
  cadrage élargi au registre et à `.drwil/ia-first.json`, en deux commits
  (la fiche ne peut citer un contrat absent du registre).
- **Intention d'origine** : aucune (défauts constatés sur le pilote).
- **Limites connues** : l'URL du README porte la version, à changer à
  chaque release sans contrôle (intention « ce que lit un visiteur reste
  juste sans dépendre de la mémoire de l'agent », question de la version
  annoncée) ; la création d'un contrat en cours de chantier exige deux
  commits, et un contrat mixte (`Contrôle` + `Manuel`) ne peut porter un
  critère automatisé (ajouté à l'intention « un cycle de vie des fiches
  sans contournement »).
- **Publication** : release 0.6.2 après la fusion de la fiche suivante de
  la file (sondage de lancement), qui part dans la même version.
- **Clôturé par** : la PR de la branche `workstream/premier-essai-propre`.

## 2026-10-17 — Le sondage de lancement marche dans tous les cas : un seul brief, et jamais muet (0.6.2)

- **Décisions clés** (demandeur, 2026-10-17) : constaté sur `drwil_com`.
  Avec un seul brief cadré, la question du sondage n'avait qu'une option
  et `AskUserQuestion` rejetait tout l'appel ; la skill ajoute alors
  l'option « Not now », jamais recommandée, que le hook lit comme « ne
  rien lancer » et le dit (il accepte aussi « Pas maintenant »). Le hook
  n'est plus jamais muet sur un sondage `drwil-start` : sans réponse lue
  ou sur erreur, il dit à l'agent ce qui s'est passé et le repli
  (`node .githooks/state.mjs start` dans un terminal), sans bloquer ni
  toucher à l'état ; la skill dit qu'aucun message `[drwil]` signifie des
  hooks inactifs (session ouverte avant `init`, cause confirmée par le
  demandeur). Tests sous QUA-037 (une file de chantiers décidée d'un
  geste), contrat inchangé.
- **Écart au cadrage** : le critère du changelog citait « Unreleased » ;
  l'entrée est dans la section 0.6.2, la roadmap mettant ce chantier dans
  la même release que le précédent.
- **Intention d'origine** : aucune (défaut constaté sur le pilote).
- **Limites connues** : un projet déjà installé reçoit le hook par
  `npx drwil init`, pas la skill (prose non rafraîchie : intention « une
  mise à jour rafraîchit aussi la prose que le projet n'a pas touchée »,
  en tête de la 0.6.3).
- **Publication** : release 0.6.2 après la fusion de cette PR, sur feu
  vert du demandeur ; fin de la file.
- **Clôturé par** : la PR de la branche `workstream/sondage-lancement-tous-les-cas`.

## 2026-10-17 — Les hooks trouvent la racine du projet par l'emplacement de leur fichier (0.6.3)

- **Décisions clés** (demandeur, 2026-10-17) : racine prise à
  l'emplacement du fichier du hook, comme le moteur des contrôles
  (`projectRoot`), plutôt que la variable de l'outil puis git — choix
  revu après coup sur proposition de l'agent, parce qu'il ne dépend
  d'aucun outil ; même règle pour tous les hooks livrés. Sondage, garde
  de cadrage et glossaire prennent le dossier qui contient leur
  `.claude/` ; le moteur d'état, le parent de son `.githooks/`
  (`stateRoot`, `DRWIL_ROOT` en test, sans importer le moteur des
  contrôles pour éviter un cycle avec `.githooks/scope-gate.mjs`) ; la commande du
  glossaire, le `.githooks/` par lequel elle est appelée (un lien
  symbolique garde le dossier courant). Trouvé au chantier : depuis un
  sous-dossier, la garde de cadrage ne refusait plus rien. Nouveau contrat
  QUA-044 (les hooks lisent la racine du projet, pas le dossier courant),
  contrôle `tests-qua-044` ; le test « node state.mjs lit l'état du
  dossier courant » devient son contraire.
- **CI rouge, chantier rouvert** (décision du demandeur) : la CI macOS a
  révélé un défaut plus ancien — chaque point d'entrée comparait le
  chemin appelé à son chemin réel ; par un lien symbolique (`/var` →
  `/private/var` sur macOS), le hook ne faisait rien, en silence. Clôture
  annulée sur la branche, fiche relancée par sondage, chemins réels
  comparés partout (sondage, garde de cadrage, glossaire, moteur d'état),
  reproduit sous Linux par un test avec un lien vers le projet ; QUA-044
  le dit. Les jobs Windows n'avaient pas échoué : annulés par l'échec
  macOS dans la même matrice.
- **Intention d'origine** : « les hooks de l'outil IA lisent la racine du
  projet, pas le dossier courant », entièrement couverte (ses deux
  questions tranchées) : résumée ici et retirée.
- **Limites connues** : Copilot CLI et `${CLAUDE_PROJECT_DIR}` dans les
  commandes des hooks, non vérifié (intention « Copilot CLI lance bien
  les hooks déclarés avec `${CLAUDE_PROJECT_DIR}` ») ; le hook de fin de
  réponse, pas encore écrit, suivra la même règle (contrainte de sa
  fiche).
- **Clôturé par** : la PR de la branche `workstream/hooks-racine-du-projet`.

## 2026-10-17 — Une mise à jour rafraîchit la prose du kit que le projet n'a pas touchée (0.6.3)

- **Décisions clés** (demandeur, sondage du 2026-10-17) : `npx drwil init`
  rafraîchit aussi la prose et les réglages du kit — skills, recettes,
  `docs/ia-first.md`, `AGENTS.md`, instructions Cursor et Copilot,
  catalogue, `.claude/settings.json` (liste `KIT_PROSE`,
  `packages/drwil/src/config.ts`) — installés par le kit et inchangés
  (empreinte du manifeste) ; jamais les documents de départ du projet,
  même inchangés. La prose modifiée est signalée et `resolve-drift` en
  propose le diff (`.bak`). `doctor` dit « version d'origine inconnue,
  antérieure à 0.6.0 » pour un projet installé avant l'enregistrement de
  version. QUA-025, QUA-026 et QUA-027 évoluent (déclarés dans la fiche).
- **Choix de l'agent en cours de route** :
  - une prose **hors manifeste** n'est jamais rafraîchie (la règle de la
    mécanique, « jamais enregistrée = rafraîchie », aurait écrasé un
    `AGENTS.md` écrit par le projet avant le kit) ; `resolve-drift` ne
    propose que la prose installée par le kit ;
  - `CLAUDE.md` et `GEMINI.md` retirés de la liste, contre le texte du
    critère : un renvoi fixe `@AGENTS.md` que `init` complète quand le
    projet a son propre `AGENTS.md` ; le rafraîchir défaisait puis
    refaisait ce bloc à chaque `init` (test « un second init ne change
    rien » rouge) ;
  - prose obsolète inchangée retirée, jamais les recettes (protégées) ;
  - l'aperçu `init --dry-run` dit « mécanique et prose du kit
    rafraîchies » ; le rendu, le point d'entrée et l'aperçu
    (`packages/drwil/src/render.ts`, `packages/drwil/src/index.ts`,
    `packages/drwil/src/preview.ts`) ajoutés au
    cadrage en cours de chantier (deux élargissements).
- **Intention d'origine** : « une mise à jour rafraîchit aussi la prose
  que le projet n'a pas touchée », entièrement couverte (ses trois
  questions tranchées) : résumée ici et retirée.
- **Limites connues** : un projet passé en 0.6.0 garde une première
  version enregistrée à tort (indiscernable après coup, hors périmètre).
- **Clôturé par** : la PR de la branche `workstream/maj-prose-du-kit`.

## 2026-10-17 — Un identifiant cité sans libellé est complété sous la réponse de l'agent (0.6.3)

- **Décisions clés** (demandeur, sondage du 2026-10-17) : un hook de fin
  de réponse (`.claude/hooks/reply-glossary.mjs`, `Stop`) affiche à
  l'humain, sous la réponse, « ID — libellé » pour chaque identifiant dont
  la première mention n'a pas de glose (parenthèse, tiret, deux-points,
  cellule de tableau) — note par `systemMessage`, pas de correction par
  l'agent, rien d'injecté au modèle, jamais bloquant. Glossaire élargi aux
  `OPT-N` de la découverte de valeur et aux repères déclarés dans une
  section « Repères » (« Markers »). Rappel après chaque outil : une fois
  par identifiant et par session (`.drwil/glossary.json` (si présent), ajouté au bloc
  drwil du `.gitignore` livré, que `init` complète). QUA-039 évolue
  (déclaré dans la fiche). Racine prise par l'emplacement du hook
  (QUA-044) ; un projet installé reçoit le hook par `init` si son
  `.claude/settings.json` est inchangé.
- **Écart de forme** : le titre de l'intention disait « rattrapé avant
  d'arriver à l'humain » ; la documentation des hooks montre que la
  réponse est déjà affichée quand le hook tourne : la note la complète.
- **Intention d'origine** : réalisée, sauf la vérification de l'affichage
  réel (décision du demandeur : après la fusion, dans une nouvelle
  session) ; l'intention est réduite à ce point, en `[humain]` dans
  l'index.
- **Limites connues** : affichage de la note dans le terminal, le web et
  le desktop, et absence de coût en tokens : non vérifiés (intention « la
  note de fin de réponse s'affiche bien, sans coût pour le modèle »).
- **Clôturé par** : la PR de la branche `workstream/identifiant-libelle-en-fin-de-reponse`.

## 2026-10-17 — Les documents produits en cadrage passent la barrière en SCOPING (0.6.3)

- **Décisions clés** (demandeur, sondage du 2026-10-17) : liste fixe,
  même règle dans le gabarit et ce dépôt : `docs/value-discovery.md`,
  `docs/decouverte-valeur.md`, `docs/audit-risks.md` (si présent) et
  `docs/audit-risques.md` (si présent) rejoignent `OUT_OF_SCOPE`
  (`.githooks/scope-gate.mjs`) ; aucun motif large sur `docs/`. QUA-035
  évolue (déclaré dans la fiche). La doc du kit (`docs/ia-first.md`), qui
  énumère la liste, ajoutée au cadrage en cours de chantier.
- **Découverte de valeur du 2026-10-17** : récupérée du stash et
  commitée, ses renvois aux fiches et intentions réalisées depuis
  remplacés par le journal. Le `stash pop` a aussi rejoué l'état indexé
  d'autres fichiers au moment du stash : conflits résolus en gardant la
  version de la branche, seule la découverte de valeur retenue.
- **Intention d'origine** : « les documents produits en cadrage passent
  la barrière en SCOPING », entièrement couverte : résumée ici et retirée.
- **Limites connues** : le budget de temps des contrôles au commit (1500
  ms) dépassé par une machine Windows de la CI sans changement de code,
  relevé au chantier précédent (intention « un budget de temps des
  contrôles calibré pour les machines Windows de la CI »).
- **Clôturé par** : la PR de la branche `workstream/barriere-documents-de-cadrage`.

## 2026-10-17 — Un guide de démarrage : prérequis, recommandations, options (0.6.3)

- **Décisions clés** (demandeur, sondage du 2026-10-17) : section
  « Before you start » dans l'Installation du `README.md` (source unique) :
  **prérequis** (Node.js 22+, git) ; **recommandations** — redémarrer la
  session de l'agent après `init` (Claude Code charge ses hooks au
  démarrage ; constaté et confirmé sur `drwil_com`), avec le contrôle
  « `[drwil] Governance state…` » et sa limite (dépend de l'outil),
  protéger la branche principale en exigeant les contrôles de CI (exemple
  GitHub, droits d'administration, pas encore vérifiée par le kit) ;
  **option** — l'auto-merge, à autoriser dans les réglages du dépôt
  GitHub. La skill de lancement dit « auto-merge not allowed by the
  repository » quand `gh pr merge --auto` échoue pour cette raison, reste
  en CLOSING et ne dit jamais la fusion programmée (les quatre états
  distingués). README du paquet : un renvoi. Tests sous QUA-037 (une file
  de chantiers décidée d'un geste) ; contrats inchangés.
- **Intention d'origine** : « un guide de démarrage — prérequis,
  recommandations, options », en partie couverte : mise à jour ; reste le
  dépôt git existant avant `init`.
- **Limites connues** : le dépôt git existant avant `init` (intention
  d'origine, mise à jour) ; la vérification de la protection de branche
  reste en 0.7.0 (intention « la protection de la forge dans le
  livrable »).
- **Clôturé par** : la PR de la branche `workstream/guide-de-demarrage`.

## 2026-10-17 — Un dossier passé par `npm init -y` reste un projet neuf (0.6.3)

- **Décisions clés** (demandeur, sondage du 2026-10-17) : le script
  `test` par défaut de `npm init` (`echo "Error: no test specified" &&
  exit 1`, texte exact) ne compte pas comme un script : un `package.json`
  qui n'installe que drwil et n'a que ce script reste un projet neuf
  (dépôt git et branche, invitation à cadrer, pile « Not decided »). Un
  autre script, ou un `test` réel, garde une pile Node.js détectée.
  `pnpm init` écrit le même script (vérifié, pnpm 11.28.6) : couvert.
  QUA-038 (un projet neuf commence par son cadrage global) évolue, rien
  n'est retiré ; test sous QUA-038 ; changelog « Unreleased ».
- **Intention d'origine** : « un dossier passé par `npm init -y` reste un
  projet neuf », entièrement couverte : résumée ici et retirée.
- **Limites connues** : `yarn init` non essayé (intention « un dossier
  passé par `yarn init` reste un projet neuf ») ; juger sur la présence
  de code reste écarté.
- **Clôturé par** : la PR de la branche `workstream/projet-neuf-apres-npm-init`.

## 2026-10-17 — Release 0.6.3

- **Décisions clés** (demandeur, 2026-10-17) : une fiche dédiée, comme la
  0.6.0. Version 0.6.3 partout (paquet, racine, verrou) ; section
  « Unreleased » du changelog renommée « 0.6.3 (2026-10-17) », une
  « Unreleased » vide au-dessus ; les deux README installent depuis la
  release 0.6.3 (QUA-040, drwil entretient la carte, le README et le
  changelog). Avant la release, la note de fin de réponse des
  identifiants sans libellé a été vérifiée par le demandeur dans une
  nouvelle session (terminal).
- **Essai réel** en plus du test de QUA-027 (mise à jour sûre d'une
  version à la suivante) : projet temporaire passé par `npm init -y`,
  équipé avec le tarball 0.6.2 de la release GitHub, puis mis à jour avec
  le tarball 0.6.3 — recette modifiée à la main préservée et signalée,
  fichier du projet intact, hooks rafraîchis, version enregistrée 0.6.3.
  L'installation 0.6.2 a reproduit le défaut corrigé par la 0.6.3 (pile
  Node.js détectée, pas de dépôt git) ; `verify` en ERROR seulement pour
  ce montage (SEC-007, pas de secret dans le dépôt : non exécuté sans
  dépôt git ; le message d'`init` dit quoi faire).
- **Publication** : tag `v0.6.3`, note GitHub et tarball, après la fusion
  et sur feu vert du demandeur (`node .githooks/create-release.mjs`).
- **Intention d'origine** : aucune (demande directe).
- **Limites connues** : aucune nouvelle ; le web et le desktop restent à
  vérifier pour la note de fin de réponse (intention « un identifiant
  sans libellé est rattrapé avant l'humain »).
- **Clôturé par** : la PR de la branche `workstream/release-0-6-3`.

## 2026-10-18 — Windows et macOS testés seulement quand une PR touche du code (0.6.4)

- **Décisions clés** (demandeur, sondage du 2026-10-18) : un job
  `matrice-os` (`.github/scripts/ci-multi-os.mjs`) calcule les OS de
  `kit-tests` : Ubuntu seul sur un push de branche ; Ubuntu, Windows et
  macOS sur une PR et sur un push sur master. Une PR qui ne touche que
  `docs/**` et `.drwil/usage.jsonl` lance Windows et macOS sans étapes
  (vert, saut annoncé) : un job de matrice sauté par son `if` ne serait
  pas rapporté sous le nom exigé par le ruleset. Cache npm sur les jobs.
  Contrat QUA-045 (Windows et macOS testés avant la fusion de tout code)
  créé, prouvé par `.github/scripts/ci-multi-os.test.mjs` ; ruleset et
  workflow du gabarit inchangés (QUA-018, dépôt ou livrable).
- **Vérifié sur la CI** : PR #147 (du code) : trois OS, une fois chacun ;
  son push de branche : Ubuntu seul ; PR d'essai #148 (`docs/` seul,
  fermée sans fusion) : Windows et macOS verts en quelques secondes,
  étapes sautées, Ubuntu testé.
- **Incident** : le premier push avait un workflow au YAML invalide
  (« : » dans un `run:` non cité), rejeté en entier par GitHub alors que
  les contrôles locaux étaient verts ; corrigé dans un commit séparé.
- **Intention d'origine** : aucune (fiche ouverte le 2026-10-10).
- **Limites connues** : le critère [humain] « chaque contrôle garde une
  couverture CI prouvée » (QUA-013, contrôle non exécuté n'est pas passé)
  repose sur l'attestation du 2026-10-16, antérieure au chantier : le
  demandeur, à distance, n'a pas pu attester de nouveau et a choisi de
  clore sur `verify` PASS ; à réattester depuis un terminal
  (`npx drwil attest QUA-013`). Le test du workflow ne parse pas le YAML
  (intention « un workflow CI au YAML invalide est refusé avant le
  push »).
- **Clôturé par** : la PR de la branche `workstream/ci-matrice-sur-pr`.

## 2026-10-18 — Une file de chantiers menée par sous-agents, un contexte neuf par chantier (0.6.4)

- **Décisions clés** (demandeur, conversation et sondages du 2026-10-17) :
  avec Claude Code, la skill de lancement et le rappel d'état mènent
  chaque chantier d'une file dans un sous-agent (contexte neuf), un à la
  fois, dans le dossier du dépôt (jamais un worktree : l'état ignoré par
  Git n'y est pas), dont la consigne commence par lire l'état ; la session
  principale ne garde que les comptes rendus, suit la PR par `gh` jusqu'à
  la fusion, 30 minutes au plus, et ne lance jamais de suivante sur une
  fusion non faite. Une file reprise dans une nouvelle session (SCOPING
  avec une file) demande « la file reprend avec <fiche> : je lance ? » et
  n'appelle `next` que sur un oui explicite. Hors file, le rappel de
  clôture propose `/clear`. `.githooks/consumption.mjs` affiche le cache lu moyen
  par requête (relevé et `--record`), sans l'enregistrer. QUA-037 (file
  de chantiers) et QUA-042 (consommation par chantier) évoluent, rien
  n'est retiré ; `AGENTS.md` (gabarit et dépôt) ; changelog « Unreleased ».
- **Intention d'origine** : « une reprise automatique à la clôture »
  (2026-10-17 : plus de 90 % du coût d'une file en une session est du
  cache relu, de 259 000 à 595 000 tokens par requête du premier au
  cinquième chantier), couverte pour Claude Code : résumée ici et
  retirée ; le reste devient deux intentions (ci-dessous).
- **Limites connues** : pilotage jamais essayé sur une vraie file (cette
  file de la 0.6.4 a été menée en une seule session ; intention « une
  première file menée par sous-agents, observée et mesurée ») ; autres
  agents non vérifiés (intention « une file menée par sous-agents avec les
  autres agents »). Pendant le chantier, `.claude/settings.json` a été
  réécrit hors de l'agent (`git pull` retiré des permissions) et a bloqué
  le push au contrôle des miroirs : restauré sur décision du demandeur.
- **Clôturé par** : la PR de la branche `workstream/reprise-par-sous-agent`.

## 2026-10-18 — Un workflow CI au YAML invalide est refusé avant le push (0.6.4)

- **Décisions clés** (demandeur, cadrage du 2026-10-18) : un test propre
  au dépôt, `.github/scripts/workflows-yaml.test.mjs`, parse avec la
  dépendance de dev `yaml` 2.9.1 (sans dépendance transitive, version
  exacte) les workflows du dépôt (`.github/workflows/*.yml`) et les
  fichiers de CI du gabarit (`packages/drwil/templates/common/ci/`, lus
  par motif) et échoue en nommant fichier et ligne ; un cas négatif rejoue
  le `run:` non cité de l'incident (corrigé par `9b742a3`). Contrat
  QUA-046 (fichiers de CI en YAML valide avant le push), contrôle
  `tests-qua-046` au commit sur `.github/**`, les fichiers de CI du
  gabarit, `package.json` et son verrou, et dans le job `checks` ; test
  déclaré propre au dépôt (`outils/miroirs.json`) : rien ne change pour
  un projet. Vérifié : le workflow d'avant `9b742a3` est refusé à la
  ligne 86.
- **Intention d'origine** : « un workflow CI au YAML invalide est refusé
  avant le push » (limite du chantier du 2026-10-18 sur la matrice
  multi-OS), entièrement couverte : résumée ici et retirée.
- **Limites connues** : la syntaxe seule est vérifiée, pas la sémantique
  GitHub Actions (expressions, clés inconnues) : actionlint écarté par le
  demandeur, à reprendre en intention si une erreur de ce genre passe.
- **Clôturé par** : la PR de la branche `workstream/workflow-ci-yaml-valide`.

## 2026-10-18 — Release 0.6.4

- **Décisions clés** (demandeur, 2026-10-18) : une fiche dédiée, comme la
  0.6.3 ; critères prouvés par des contrats existants, aucun contrat
  créé. Version 0.6.4 partout (paquet, racine, verrou) ; section
  « Unreleased » du changelog renommée « 0.6.4 (2026-10-18) », une
  « Unreleased » vide au-dessus ; les deux README installent depuis la
  release 0.6.4 (QUA-040, drwil entretient la carte, le README et le
  changelog). Le chantier du YAML de la CI est passé avant (journal du
  même jour) ; il ne change rien pour l'utilisateur, donc aucune ligne
  de changelog.
- **Essai réel** en plus du test de QUA-027 (mise à jour sûre d'une
  version à la suivante) : projet temporaire (`git init`, `npm init -y`,
  branche d'essai) équipé avec le tarball 0.6.3 de la release GitHub,
  puis mis à jour avec le tarball 0.6.4 construit localement — fichier
  du projet intact, skill modifiée à la main préservée et signalée en
  dérive, mécanique non modifiée rafraîchie
  (`.githooks/consumption.mjs`, `.githooks/state-texts.mjs`,
  `AGENTS.md`), version enregistrée 0.6.4 (première version 0.6.3). Aucun fichier retiré du gabarit entre les deux
  versions : le retrait de l'obsolète reste prouvé par le seul test de
  QUA-027. `verify` en VERIFY ERROR sans CI (QUA-013, un contrôle non
  exécuté n'est pas passé : attendu et annoncé par le README), puis
  MANUAL REVIEW REQUIRED après `init --ci github` (contrats à attester
  par un humain seulement) ; `doctor` sain.
- **Publication** : tag `v0.6.4`, note GitHub et tarball, après la fusion
  et sur feu vert du demandeur (`node .githooks/create-release.mjs` ; le
  `--dry-run` annonce v0.6.4).
- **Intention d'origine** : aucune (demande directe).
- **Limites connues** : aucune nouvelle.
- **Clôturé par** : la PR de la branche `workstream/release-0-6-4`.

## 2026-10-18 — Date gardée et feu vert de publication (0.6.5, 1 sur 4)

- **Décisions clés** (demandeur, 2026-10-18) : la date d'origine d'un
  document installé est gardée, réécrite seulement si le reste du
  document change, jamais retirée ; une PR par fiche de la 0.6.5.
- **La date** : contrat créé QUA-047 (une date seule ne réécrit pas un
  document installé), contrôle `tests-qua-047`. Le rendu
  (`packages/drwil/src/render.ts`, `keepDate`) laisse `{{date}}` en attente
  jusqu'à l'écriture : un fichier déjà présent qui ne diffère que par ses
  dates est gardé tel quel, manifeste compris. Vaut pour `drwil init`
  (mise à jour, `--force`) et pour `npm run installer-depot` : reproduit
  avant correctif (`docs/ia-first.md` seul fichier à écrire), plus rien à
  écrire après. Vérifié en BUILD : une mise à jour d'un projet
  réécrivait aussi `docs/ia-first.md` (prose du kit rafraîchie) ;
  `packages/drwil/src/migration.ts` et `packages/drwil/src/manifest.ts` n'avaient rien à changer.
- **Le feu vert de publication** : recette et skill de release (gabarit et
  copies du dépôt ; la recette du dépôt, écart déclaré, modifiée à la
  main) — la création de la release reste un geste après accord, ou se
  fait avec le feu vert donné au lancement en nommant la version
  (QUA-040, drwil entretient la carte, le README et le changelog : carte et
  changelog mis à jour).
- **Intention d'origine** : « l'installation du dépôt ne réécrit plus la
  date de ia-first.md » (retour d'expérience du 2026-10-15), entièrement
  couverte : résumée ici et retirée.
- **Limites connues** : le feu vert de publication n'est qu'une phrase de
  la demande, ni gardé ni effacé par l'outil —
  `docs/intentions/cloture-et-attestations.md` (ex-« feu-vert-publication-enregistre », regroupée le 2026-10-25).
- **Clôturé par** : la PR #157 (branche `chantier/date-gardee-feu-vert`).

## 2026-10-18 — Lever l'alerte CodeQL de la PR 157 (correction intercalée)

- **Décisions clés** (demandeur, 2026-10-18) : correction sur la branche
  de la PR 157 elle-même, sa fusion automatique désactivée le temps de la
  correction puis reprogrammée.
- **Correction** : le test QUA-047 (une date seule ne réécrit pas un
  document installé) de `packages/drwil/test/kit.test.mjs` insère sa ligne
  par découpage en lignes puis assemblage, au lieu d'un `replace` sur la
  seule première occurrence que CodeQL signalait (`js/incomplete-sanitization`,
  échappement incomplet). Comportement identique ; alerte levée, pas
  ignorée (QUA-019, pas de contournement).
- **Intention d'origine** : aucune (CI rouge de la PR 157).
- **Limites connues** : aucune nouvelle ; le dépassement du budget de
  temps sous Windows ne s'est pas reproduit (CI verte au premier passage).
- **Consommation** : non mesurée à part — `.githooks/consumption.mjs` (mesure des
  tokens) groupe par branche, et la correction a été menée sur celle du
  chantier « date gardée et feu vert de publication » : ses réponses y
  sont comptées.
- **Clôturé par** : la PR #157 (branche `chantier/date-gardee-feu-vert`).

## 2026-10-18 — Une clôture allégée, sans encombrants (0.6.5, 3 sur 4)

- **Décisions clés** (demandeur, 2026-10-18) : une PR par fiche de la
  0.6.5 ; la fiche active reste commitable avec le code (le gain vient du
  signal, pas d'un changement de la barrière) ; le code cite le contrat,
  pas la fiche ; livré à tout projet (QUA-018, dépôt ou livrable : gabarit
  puis `npm run installer-depot`).
- **La commande de clôture** : contrat créé QUA-048 (une clôture en un
  geste, ses pièges signalés avant le commit), contrôle `tests-qua-048`.
  `.githooks/close.mjs`, en CLOSING, supprime la fiche, retire sa ligne
  d'index et consigne la consommation ; il signale avant le commit un
  critère encore « contrat à créer » (avec l'ID créé sur la branche à
  écrire), les références qui deviendraient mortes, les noms de fichiers
  sans chemin. `--check` donne le signal seul ; le passage de BUILD à
  EVIDENCE aussi (essayé sur ce chantier : il a listé les cinq
  références des fiches voisines et de l'index, corrigées ici). Rien
  n'est commité, poussé ni fusionné ; l'état n'est pas écrit. Cette
  clôture a été faite avec elle.
- **Les branches fusionnées** : supprimées au lancement du chantier
  suivant (`start`, `.githooks/state.mjs`), par `git branch -d` —
  jamais la courante, la principale, une branche encore au sommet de la
  principale ni une branche non fusionnée.
- **Le code cite le contrat** : contrat créé QUA-049 (le code cite le
  contrat qu'il sert, jamais une fiche de chantier), contrôle
  `tests-qua-049`. Règle intégrée à `.githooks/check-code-rules.mjs`,
  lancée par check-docs : bloquante dans un fichier modifié quand
  `newRequirements` l'impose, un avertissement résumé pour le code
  inchangé. Les commentaires des deux tests de CI et de
  `packages/drwil/test/kit.test.mjs` citent désormais le contrat ou le
  journal. La fiche de mécanique livrée cadre la nouvelle commande
  (élargissement du cadrage, commit séparé).
- **Doc** : recette des branches (clôture), `AGENTS.md` du gabarit et du
  dépôt, rappel CLOSING, carte, changelog (QUA-040, drwil entretient la
  carte, le README et le changelog).
- **Intention d'origine** : aucune (relevés de la session de la 0.6.4).
- **Limites connues** : branches fusionnées par squash non supprimées —
  intention couverte et retirée (journal du 2026-10-19) ; neuf citations de
  fiche restées dans du code non modifié, hors cadrage —
  `docs/intentions/petits-defauts.md` (ex-« citations-de-fiche-heritees », regroupée le 2026-10-25) ; commentaires reconnus
  par une heuristique de ligne —
  l'intention « commentaires-reconnus-par-heuristique » (abandonnée le 2026-10-25) ; le gain
  reste à mesurer après le détour —
  l'intention « mesurer-gain-cloture-allegee » (abandonnée le 2026-10-25).
- **Clôturé par** : la PR #158 (branche `chantier/cloture-allegee`).

## 2026-10-18 — La file suit l'ordre du sondage (0.6.5, 2 sur 4)

- **Cause** : Claude Code rend un choix multiple dans l'ordre des clics
  (libellés joints par des virgules) ; le hook de sondage
  (`.claude/hooks/prompt-hook.mjs`) le découpait tel quel, et la file
  suivait les clics, pas l'ordre des options que range la skill de
  lancement (constaté dans la session de la 0.6.4 : file arrêtée et
  sondage relancé).
- **Correctif** : le hook range les choix dans l'ordre des options du
  sondage (`inPollOrder`) ; une fiche saisie sous « Autre » vient après,
  dans l'ordre saisi. Test du paquet qui coche dans le désordre (échouait
  avant le correctif) — QUA-037 (une file de chantiers décidée d'un
  geste), dont la règle (« file ordonnée ») est rétablie sans être
  modifiée : une modification aurait demandé une déclaration validée au
  cadrage (QUA-023, régression ou évolution d'un contrat). Skill de
  lancement et changelog à jour ; livré à tout projet (QUA-018, dépôt ou
  livrable : gabarit puis `npm run installer-depot`).
- **Intention d'origine** : aucune (point 6 de la clôture allégée).
- **Limites connues** : aucune non traitée ; le format de réponse de
  Claude Code est simulé par le test, l'essai réel viendra au prochain
  sondage à choix multiple.
- **Clôturé par** : la PR #159 (branche `chantier/ordre-de-la-file`).

## 2026-10-18 — Un détour pour une correction intercalée (0.6.5, 4 sur 4)

- **Besoin** : point 8 de la clôture allégée — un défaut préalable hors du
  cadrage obligeait l'agent à élargir un cadrage sans rapport ou à
  s'arrêter, et à improviser stash et allers-retours de branche.
- **Le détour** : contrat créé QUA-050 (un détour pour une correction
  intercalée, sans élargir le chantier), contrôle `tests-qua-050`.
  `.githooks/detour.mjs open <nom> --title <défaut>` met le travail en
  cours de côté (stash nommé, enregistré dans l'état), crée la branche
  `detour/<nom>` depuis la branche principale (distante si elle existe)
  et sa fiche courte, et pointe l'état sur elle ; `resume`, PR fusionnée,
  revient sur la branche du chantier, la rebase sur la branche principale
  corrigée, restaure le travail et remet l'état en BUILD sur la fiche
  d'origine. Toute étape qui échoue est refusée sans rien perdre.
- **La barrière** : elle accepte la correction sous la fiche du détour et
  refuse, jusqu'au oui de l'humain (`detour.mjs allow`, terminal
  interactif), un fichier qui change les règles du jeu (registre, hooks,
  seuils, CI). Défaut corrigé au passage : un rebase réécrivait le
  trailer `Drwil-Brief` des commits rejoués ; il est gardé.
- **Doc** : recette « corriger un défaut » livrée, `AGENTS.md` (gabarit et
  dépôt), rappel de BUILD, carte, registre, miroirs, fiches de mécanique,
  changelog (QUA-040, drwil entretient la carte, le README et le
  changelog). Livré à tout projet (QUA-018, dépôt ou livrable).
- **Incident de CI** : trois tests du détour rouges en CI, faute
  d'identité git globale (la commande lance elle-même `git rebase` et
  `git stash`) ; cause reproduite en local avec un `HOME` vide, corrigée
  par une identité locale au dépôt temporaire des tests. Le chantier,
  passé en CLOSING avant la CI, a dû être relancé par l'humain : la
  clôture attend désormais la CI verte.
- **Intention d'origine** : aucune (point 8 de la clôture allégée).
- **Limites connues** : `resume` ne reconnaît pas une PR fusionnée par
  squash — intention complétée, puis couverte et retirée (journal du
  2026-10-19) ; tout changement du registre des contrats, même un ajout,
  demande le oui de l'humain — intention couverte et retirée (journal du
  2026-10-19, « un contrat ajouté pendant un détour ») ; `package.json` n'est pas
  compté parmi les seuils — `docs/intentions/petits-defauts.md` (ex-« seuils-dans-package-json », regroupée le 2026-10-25) ;
  gain de la clôture allégée non mesurable par chantier entier
  (comparaison faite, sans conclusion) —
  l'intention « mesurer-gain-cloture-allegee » (abandonnée le 2026-10-25) (mise à jour).
- **Consommation** : 4,31 M tokens pondérés, 178 requêtes, 55 minutes
  (`.drwil/usage.jsonl`).
- **Clôturé par** : la PR #160 (branche `chantier/detour`).

## 2026-10-19 — Une recette par version, pour une équipe hors dépôt (0.6.5)

- **Besoin** : une équipe de recette, qui ne lit pas le dépôt, valide
  chaque version avant sa publication ; elle doit savoir en quelques
  minutes quoi valider et ce que la non-régression a déjà prouvé.
- **La candidate et sa fiche** : contrats créés QUA-051 (une version
  candidate en pré-release, avec sa fiche de recette générée) et QUA-052
  (la fiche dit quoi valider, puis ce que la non-régression a prouvé).
  `create-release.mjs --candidate` publie `vX.Y.Z-rc.N` avec tarball et
  fiche, générée par `.githooks/acceptance-sheet.mjs` depuis le dernier tag
  définitif : points à valider (critères humains des fiches retrouvées dans
  git, essais en réel, limites connues du journal, attestations à refaire),
  chacun avec un identifiant `vX.Y.Z-P<n>` et la PR de son chantier par le
  trailer `Drwil-Brief` ; puis verdict de verify, contrats prouvés par un
  test, OS de la CI, empreinte sha256. `--dry-run` montre la fiche.
- **Le verdict et la promotion** : QUA-053 (le verdict de recette est un
  geste humain, enregistré sur la candidate) — terminal interactif et
  candidate retapée, une issue par réserve ou refus ; QUA-054 (seule une
  candidate approuvée est promue, avec le même tarball) — empreinte
  vérifiée, réserves dans la note ; tri des issues dans la recette
  « corriger un défaut ». QUA-055 (les README pointent vers la dernière
  version validée) : `releases/latest`, plus aucun numéro de version.
- **Doc** : recettes de release et « corriger un défaut », skill,
  `AGENTS.md` (gabarit et dépôt), README du module, carte, changelog
  (QUA-040, drwil entretient la carte, le README et le changelog). Livré à
  tout projet avec le module de release (QUA-018, dépôt ou livrable).
- **Cadrage élargi** (commit séparé) : les fiches de mécanique du kit,
  sans quoi un projet qui active le module ne pouvait pas commiter ses
  nouveaux scripts.
- **Intention d'origine** : couverte, résumée ici et retirée ; la version
  HTML, hors périmètre, devient l'intention « fiche-de-recette-html » (abandonnée le 2026-10-25).
- **Limites connues** : rien publié en réel (candidate, verdict, promotion
  éprouvés contre un gh simulé) — intention éprouvée le 2026-10-19 sur la
  0.6.5, résumée au journal (« une fiche de recette juste ») et retirée ;
  essais en réel reconnus par une liste de mots —
  l'intention « essai-reel-reconnu-par-mots » (abandonnée le 2026-10-25).
- **Consommation** : 3,93 M tokens pondérés, 131 requêtes, 59 minutes
  (`.drwil/usage.jsonl`).
- **Clôturé par** : la PR #162 (branche `chantier/fiche-de-recette`).

## 2026-10-19 — Release 0.6.5 : version posée, recette réelle ensuite

- **Besoin** : publier la 0.6.5 (date gardée et feu vert, clôture
  allégée, ordre de la file, détour, recette par version) par le parcours
  de recette qu'elle livre, premier essai réel.
- **Résultat** : version 0.6.5 partout (paquets, verrou), changelog daté
  (QUA-040, drwil entretient la carte, le README et le changelog) ; README
  inchangés, ils pointent vers `releases/latest` (QUA-055).
  `create-release.mjs --candidate --dry-run` annonce `v0.6.5-rc.1` et sa
  fiche de recette (QUA-051).
- **Essai réel de mise à jour 0.6.4 → 0.6.5** (QUA-027, mise à jour sûre) :
  projet temporaire équipé avec le tarball 0.6.4 de la release GitHub,
  mis à jour avec le tarball 0.6.5 : fichiers du projet préservés,
  mécanique modifiée signalée sans réécriture, nouveaux fichiers
  (`.githooks/close.mjs`, `.githooks/detour.mjs`, recette « corriger un défaut ») ajoutés,
  version enregistrée, `doctor` sain ; `verify` identique à un projet neuf
  (ERROR : aucune CI déclarée, attendu).
- **Cadrage corrigé** (commit séparé, fiche seule) : le critère « candidate,
  verdict, promotion » ne pouvait être prouvé avant la fusion, le tag
  venant de la version fusionnée ; il est devenu le `--dry-run` de la
  candidate, la publication restant les lots 2 et 3, après la fusion.
- **Limites connues** : candidate, verdict et promotion restent à mener
  après la fusion ; l'intention d'origine (la recette par version
  éprouvée en réel) est mise à jour, pas retirée (retirée depuis, journal
  « une fiche de recette juste »).
- **Consommation** : 0,70 M tokens pondérés (`.drwil/usage.jsonl`).
- **Clôturé par** : la PR #164 (branche `chantier/release-0-6-5`).

## 2026-10-19 — Release 0.6.5 publiée par la recette ; cadrage 0.6.6 et 0.6.7

- **Release** : candidate `v0.6.5-rc.1` (pré-release, tarball et fiche de
  recette), verdict « approuvée » donné par le demandeur, promue en
  `v0.6.5` avec le même tarball (sha256 vérifié après téléchargement).
  Premier essai réel du parcours (QUA-051 à QUA-054) : il tient de bout en
  bout ; trois défauts de la fiche générée sont cadrés en 0.6.6
  (corrigés, journal « une fiche de recette juste »).
- **Première file menée par sous-agents** (0.6.5, 2026-10-18 et 19) : cinq
  chantiers et une correction intercalée, chacun dans un sous-agent ; cache
  lu moyen par requête de 86 k à 183 k selon les chantiers, contre 309 k
  pour la release menée ensuite dans la session principale. Trois arrêts,
  tous débloqués (CI rouge, clôture avant la fin de la CI, limite de
  session) ; leçon : CI verte avant toute clôture, ajoutée aux consignes
  des sous-agents. L'intention « une première file menée par sous-agents,
  observée et mesurée » est couverte, résumée ici et retirée.
- **Décisions du demandeur** : deux versions, la stabilisation 0.6.6
  d'abord (worktree, squash, registre, fiche de recette), puis la
  compatibilité des agents renumérotée en 0.6.7, avec la file pour Copilot,
  le glossaire et la consommation des autres outils rattachés ; budget de
  temps sous Windows inchangé. L'intention « `${CLAUDE_PROJECT_DIR}` sous
  Copilot » est fondue dans le lot 1 du chantier Copilot CLI tenu
  (journal du 2026-10-19 ; essais du 2026-10-18 : Copilot lance la commande, qui dépasse son délai)
  et retirée.

## 2026-10-19 — Un push depuis un worktree ne touche jamais le vrai dépôt (0.6.6, 1 sur 4)

- **Besoin** : le 2026-10-18, un `git push` depuis un worktree secondaire
  a fait agir la suite des contrôles sur le vrai dépôt (`core.bare=true`
  dans la configuration commune, index sali) ; régression du correctif du
  2026-10-10 (« Tests des contrôles isolés des variables GIT_* du hook »).
- **Cause** (rejouée dans des dépôts jetables, fichier de test par
  fichier) : le pre-push lancé depuis un worktree reçoit `GIT_DIR` (le
  dossier du worktree sous `.git/worktrees/`) ; le moteur des contrôles le
  transmettait à tout ce qu'il lance. Trois fichiers de test ajoutés sans
  retrait des `GIT_*` (`.githooks/check-architecture.test.mjs`,
  `outils/verifier-miroirs.test.mjs`,
  `outils/verifier-tests-contrats.test.mjs`) font un `git init` ailleurs,
  qui réinitialisait ce dossier et écrivait `core.bare=true` dans la
  configuration commune. Les échecs en masse du pre-push pendant
  l'incident en découlent : sans arbre de travail, les contrôles ne
  lisaient plus le worktree.
- **Résultat** : le lanceur du moteur (`.githooks/engine.mjs`, gabarit puis
  copie) retire les `GIT_*` de l'environnement de chaque contrôle lancé ;
  gitleaks seul les garde, pour lire l'index du commit en cours
  (`git commit -a`) ; les hooks gardent les leurs (décision du
  2026-10-10). Deux contrats créés, leurs tests vus en échec avant le
  correctif : QUA-056 (un push depuis un worktree ne touche jamais le
  dépôt principal : push réel depuis un worktree jetable, contrôle
  hostile, dépôt principal photographié avant et après) et QUA-057 (le
  lanceur des contrôles retire les GIT_* de leur environnement). Ligne
  « Unreleased » du changelog ajoutée.
- **Intention d'origine** « un push depuis un worktree ne touche jamais le
  vrai dépôt » : entièrement couverte (les deux garde-fous décidés le
  2026-10-19), résumée ici et retirée.
- **Limites connues** : aucune ; les fichiers de test qui retirent encore
  eux-mêmes les `GIT_*` le font désormais en double, sans dommage.
- **Consommation** : 0,80 M tokens pondérés, 71 requêtes, 22 minutes
  (`.drwil/usage.jsonl`).
- **Clôturé par** : la PR de la branche `chantier/stab-worktree`.

## 2026-10-19 — Les branches fusionnées par squash reconnues (0.6.6, 2 sur 4)

- **Besoin** : le ménage des branches au lancement et la reprise d'un
  détour (`node .githooks/detour.mjs resume`) ne reconnaissaient que la
  fusion classique ; pour une équipe qui fusionne par squash, la branche
  n'était jamais supprimée et un détour ne pouvait pas reprendre (point de
  recette v0.6.5-P8).
- **Cause** (rejouée par un test d'un détour fusionné par squash, refusé
  « pas encore fusionnée ») : les deux usages ne demandaient qu'à git
  (`git branch --merged`, `git merge-base --is-ancestor`) ; un squash crée
  un commit neuf sans lien de parenté avec la branche, que git ne voit
  donc jamais fusionnée.
- **Résultat** : une seule fonction « branche fusionnée ? »
  (`branchMerged`, `.githooks/close.mjs`, gabarit puis copie), partagée par
  le ménage et la reprise : fusion classique vue par git, ou PR fusionnée
  de la branche, lue par `gh pr list --state merged`, qui porte son dernier
  commit (une branche allée plus loin que sa PR n'est pas fusionnée) ;
  suppression par `git branch -D` sur la seule preuve de `gh`. Une seule
  question à `gh` pour toutes les branches, posée seulement si git ne
  suffit pas. Sans `gh` joignable, repli sur git, dit au lancement (branches
  gardées nommées) et dans le refus de reprise. Deux contrats créés, leurs
  tests vus en échec avant le correctif : QUA-058 (une branche dont la PR
  est fusionnée sur GitHub est reconnue fusionnée, squash compris) et
  QUA-059 (sans gh joignable, seule la fusion classique est reconnue, et
  c'est dit). Recette des branches, carte et ligne « Unreleased » du
  changelog à jour.
- **Décision** : QUA-048 (une clôture en un geste) laissé inchangé : le
  modifier demandait sa déclaration validée par le demandeur (QUA-023,
  régression ou évolution d'un contrat).
- **Intention d'origine** « supprimer aussi les branches fusionnées par
  squash » : entièrement couverte (ménage et reprise, décision du
  2026-10-19 « la PR fusionnée via gh fait foi »), résumée ici et retirée.
- **Limites connues** : le texte de QUA-048 cite encore `git branch -d` —
  `docs/intentions/petits-defauts.md` (ex-« qua-048-aligne-sur-squash », regroupée le 2026-10-25) ; hors de GitHub, et
  au-delà des 200 PR fusionnées les plus récentes, une branche fusionnée
  par squash est gardée — l'intention « squash-hors-github » (abandonnée le 2026-10-25).
  Écart relevé : `close.mjs --check` ne signale pas les citations de
  l'intention d'origine retirée —
  `docs/intentions/petits-defauts.md` (ex-« cloture-signale-intention-retiree », regroupée le 2026-10-25).
- **Consommation** : 0,59 M tokens pondérés, 52 requêtes, 21 minutes
  (`.drwil/usage.jsonl`).
- **Clôturé par** : la PR de la branche `chantier/stab-squash`.

## 2026-10-19 — Un contrat ajouté pendant un détour, sans arrêter la file (0.6.6, 3 sur 4)

- **Besoin** : pendant un détour, tout changement du registre des
  contrats, même un simple ajout, attendait le oui de l'humain (QUA-050,
  un détour pour une correction intercalée) ; en file, le sous-agent
  s'arrêtait dès qu'un détour créait un contrat.
- **Cause** (rejouée par un test : un commit qui n'ajoute qu'un contrat,
  refusé) : la barrière de périmètre jugeait le registre sur son seul nom
  (`rulesFiles`), sans lire la nature du changement.
- **Résultat** : la barrière lit le registre indexé contre celui de HEAD
  (`contractsAddedOnly`, `.githooks/detour.mjs`, gabarit puis copie) : un
  ajout pur (chaque bloc existant, préambule compris, gardé mot pour mot ;
  chaque bloc nouveau un contrat d'ID jamais défini) passe sans le oui ;
  un contrat modifié, retitré ou retiré, et tout doute (registre créé ou
  retiré, titre répété, section qui n'est pas un contrat, registre en
  tableau), le demandent toujours. Texte de QUA-050 modifié comme la fiche
  le déclarait (décision du demandeur du 2026-10-19) ; `AGENTS.md`
  (gabarit et dépôt), recette de correction d'un défaut (cadrage élargi
  dans un commit séparé), carte et ligne « Unreleased » du changelog à
  jour.
- **Intention d'origine** « un ajout au registre des contrats sans le oui
  de l'humain » : entièrement couverte (décision du 2026-10-19 « ajout
  libre, modification soumise au oui »), résumée ici et retirée.
- **Limites connues** : à l'ouverture d'un détour, l'annonce « le oui
  sera demandé » cite encore le registre sans nuance —
  `docs/intentions/petits-defauts.md` (ex-« annonce-oui-registre-detour », regroupée le 2026-10-25) ; un test ajouté à un
  contrat existant (ligne « Tests ») reste une modification soumise au
  oui (décision : seul un contrat nouveau est un ajout).
- **Consommation** : 0,55 M tokens pondérés, 37 requêtes, 25 minutes
  (`.drwil/usage.jsonl`).
- **Clôturé par** : la PR de la branche `chantier/stab-registre`.

## 2026-10-19 — Une fiche de recette juste, leçons de la 0.6.5 (0.6.6, 4 sur 4)

- **Besoin** : la fiche de recette de `v0.6.5-rc.1`, premier essai réel du
  parcours, était fausse ou bruyante sur trois points (QUA-052, la fiche
  dit quoi valider, puis ce que la non-régression a prouvé).
- **Causes** (chacune rejouée par un test vu en échec, sur le modèle de la
  fiche réelle) : verify recopié brut, donc FAIL pour QUA-017 (pas de
  travail direct sur la branche principale) seul, alors qu'une release se
  crée toujours sur la branche principale ; fiche lue au dernier commit
  qui la touche, la fusion de la PR, dont le premier parent garde la
  version du cadrage ; liste de mots « essai réel » appliquée à tout le
  texte de la fiche et du journal (besoin, décisions, critères).
- **Résultat** (`.githooks/acceptance-sheet.mjs`, gabarit puis copie) :
  `releaseVerdict` ne compte pas un contrat qui n'échoue que par son
  contrôle `main-branch` et la fiche le nomme (tout autre échec, une
  erreur ou un critère ouvert gardent le verdict de verify) ; chaque fiche
  est lue au commit de la candidate, sinon juste avant le commit (hors
  fusion) qui l'a supprimée ; seule une limite connue qui parle d'essai
  réel devient un point « pas encore essayé en réel ». Rejoué sur
  `v0.6.4..v0.6.5-rc.1` : 15 points au lieu de 26, verify PASS hors
  QUA-017. Texte de QUA-052 modifié comme la fiche le déclarait ; README
  du module, recette de release (gabarit et dépôt) et ligne « Unreleased »
  du changelog à jour.
- **Intention d'origine** « la recette par version éprouvée en réel » :
  entièrement couverte, résumée ici et retirée. Candidate `v0.6.5-rc.1`
  publiée avec tarball et fiche, verdict « approuvée » donné par le
  demandeur, promotion en `v0.6.5` avec le même tarball : le parcours
  tient de bout en bout ; ses trois défauts de fiche sont corrigés ici.
- **Limites connues** : une fiche fusionnée par squash est encore lue
  dans sa version du cadrage —
  `docs/intentions/cloture-et-attestations.md` (ex-« fiche-recette-apres-squash », regroupée le 2026-10-25) ; une limite qui cite
  « en réel » sans parler d'un essai à faire devient un point « pas encore
  essayé en réel » — l'intention « essai-reel-reconnu-par-mots » (abandonnée le 2026-10-25)
  (mise à jour).
- **Consommation** : 0,47 M tokens pondérés, 38 requêtes, 17 minutes
  (`.drwil/usage.jsonl`).
- **Clôturé par** : la PR de la branche `chantier/stab-recette`.

## 2026-10-19 — Release 0.6.6 : version posée, recette ensuite

- **Besoin** : publier la 0.6.6, la stabilisation (push depuis un
  worktree, branches fusionnées par squash, contrat ajouté pendant un
  détour, fiche de recette juste ; PR #166 à #169), par le parcours de
  recette, comme la 0.6.5.
- **Résultat** : version 0.6.6 partout (paquets, verrou), changelog daté
  (QUA-040, drwil entretient la carte, le README et le changelog) ; README
  inchangés, ils pointent vers `releases/latest` (QUA-055, les README
  pointent vers la dernière version validée).
  `create-release.mjs --candidate --dry-run` annonce `v0.6.6-rc.1` et sa
  fiche de recette (QUA-051, une version candidate en pré-release).
- **Essai réel de mise à jour 0.6.5 → 0.6.6** (QUA-027, mise à jour
  sûre) : projet temporaire équipé avec le tarball 0.6.5 de la release
  GitHub, `AGENTS.md` et registre modifiés localement, puis mis à jour
  avec le tarball 0.6.6 : modifications locales préservées et signalées
  sans réécriture, seules la mécanique (`close`, `detour`, `engine`,
  `scope-gate`) et les recettes du kit mises à jour, aucun fichier
  supprimé, version 0.6.6 enregistrée (première : 0.6.5), `doctor` sain ;
  `verify` identique à un projet neuf de la 0.6.5 comme de la 0.6.6 (FAIL
  de QUA-017 sur `main` et ERROR de QUA-013 sans CI, attendus).
- **Limites connues** : candidate, verdict et promotion restent à mener
  après la fusion (lots 2 et 3 de la fiche), sur feu vert du demandeur.
- **Consommation** : 0,47 M tokens pondérés (`.drwil/usage.jsonl`).
- **Clôturé par** : la PR de la branche `chantier/release-0-6-6`.

## 2026-10-19 — Compatibilité des agents, le socle commun (0.6.7, 1 sur 5)

- **Décisions clés** : un banc local scripté (`outils/banc-agents.mjs`)
  installe drwil en SCOPING dans un dossier temporaire et lance chaque
  outil en mode non interactif ; un outil absent ou à lancement non
  défini est « non testé », jamais « conforme » (QUA-060, un outil n'est
  tenu que prouvé par le banc). `AGENTS.md` distingue une intention d'une
  demande de réalisation (QUA-061). Les en-têtes de skills se lisent en
  YAML strict, refusés au commit par un module à part (QUA-062) ; la
  description de `start-a-workstream`, invalide, est corrigée. La matrice
  de compatibilité de `docs/ia-first.md` dit, outil par outil, ce qui est
  tenu et sa date d'essai (QUA-063).
- **Résultat** (essai du 2026-10-19) : Claude Code conforme ; Copilot CLI
  1.0.98 et Gemini CLI 0.61.0 ne lancent aucun hook dans le banc ; Codex
  et Cursor non testés. Le nom du skill est `drwil-start`, son dossier
  `start-a-workstream`.
- **Limites connues** : le banc en CI attend les comptes du demandeur
  (décision du 2026-10-18) ; les hooks de Copilot, Gemini, Codex et
  Cursor relèvent des quatre fiches suivantes.
- **Consommation** : non mesurée — le chantier a été mené sous Copilot CLI,
  et `.githooks/consumption.mjs` ne lit que les journaux de Claude Code.
- **Clôturé par** : la branche `workstream/compat-socle`.

## 2026-10-19 — Compatibilité des agents, Copilot CLI tenu (0.6.7, 2 sur 5)

- **Causes** (reproduites hors Copilot ou en réel) : en mode non
  interactif, Copilot ne charge les hooks d'un dépôt que dans un dossier de
  confiance (le banc ne lançait donc aucun hook) ; le hook d'écriture lisait
  `file_path` alors que Copilot envoie `path` (rien n'était refusé) ;
  `.githooks/state.mjs` imprimait du texte brut que Copilot ne lit pas (rappel jamais
  reçu) ; un hook qui attend la fin de son entrée est bloqué si elle ne se
  ferme pas, et un délai dépassé laisse passer l'appel.
- **Décisions clés** : choisir `copilot` installe aussi l'arbre `.claude/`
  (Copilot le lit : hooks, réglages, skills, donc les mêmes commandes
  `/drwil-*`) et `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json` (QUA-064, Copilot reçoit l'arbre
  `.claude` et ses hooks natifs). `.githooks/state.mjs copilot-start` et
  `copilot-message` rendent le JSON que Copilot lit, sans jamais bloquer :
  l'entrée est lue dès que son JSON est complet (QUA-065, les hooks de
  Copilot parlent son format). Le banc crée un `COPILOT_HOME` temporaire où
  seul le projet d'essai est de confiance, la configuration du poste
  intacte (QUA-060).
- **Résultat** (essai du 2026-10-19, Copilot CLI 1.0.98) : hooks lancés,
  écriture refusée par le hook, rappel d'état reçu ; matrice de
  compatibilité mise à jour. `keepDate` et la comparaison des miroirs ne
  construisent plus une expression régulière aussi longue qu'un document
  (elle débordait avec la matrice).
- **Limites connues** : le dépassement de 30 s en session interactive n'est
  pas reproduit, sa cause n'est pas établie
  (l'intention « depassement-delai-copilot-interactif » (abandonnée le 2026-10-25)) ; après la
  fusion, l'état reste en CLOSING
  (le journal du 2026-10-20 (0.6.8)).
- **Consommation** : non mesurée — le chantier a été mené sous Copilot CLI,
  et `.githooks/consumption.mjs` ne lit que les journaux de Claude Code.
- **Clôturé par** : la branche `workstream/compat-copilot`.

## 2026-10-19 — Compatibilité des agents, Gemini CLI tenu (0.6.7, 3 sur 5)

- **Causes** (sonde réelle, Gemini CLI 0.61.0) : Gemini ne charge les hooks
  d'un dépôt que dans un dossier de confiance (`--skip-trust` seul ne suffit
  pas : la variable `GEMINI_CLI_TRUST_WORKSPACE` ou l'approbation
  interactive) — c'est pourquoi la sonde du 2026-10-18 restait muette ;
  il définit `GEMINI_PROJECT_DIR` (et l'alias `CLAUDE_PROJECT_DIR`) ;
  `.githooks/state.mjs` imprimait du texte brut et `scope-reminder` rendait le format
  de Claude Code, tous deux ignorés par Gemini ; les skills se lisent sous
  `.gemini/skills/` ou `.agents/skills/`, pas sous `.claude/skills/`.
- **Décisions clés** : choisir `gemini` installe aussi les scripts partagés de
  `.claude/hooks` (un seul jeu pour tous les outils) et
  `packages/drwil/templates/common/tools/gemini/.gemini/settings.json`
  (QUA-066, Gemini reçoit ses hooks natifs). `scope-reminder` répond
  `{"decision":"deny"}` sur `BeforeTool` pour `write_file` et `replace` ;
  `state.mjs gemini-start` et `gemini-message` rendent le JSON de Gemini
  (QUA-067, les hooks de Gemini parlent son format). Le lancement d'un chantier
  se fait par `node .githooks/state.mjs start` dans un terminal, dit dans la
  matrice (QUA-068). Le banc pose la variable de confiance pour son seul essai
  (QUA-060) et sa consigne suspend explicitement « ne pas coder », qu'un
  modèle obéissant prenait pour un ordre de ne pas essayer d'écrire.
- **Résultat** (essai du 2026-10-19, Gemini CLI 0.61.0) : hooks lancés,
  écriture refusée par le hook et rappel d'état reçu, observés en essais
  réels séparés (le quota gratuit du modèle fait échouer des passages entiers
  du banc : 429, 503) ; attestation humaine en attente.
- **Limites connues** : pas de commandes `/drwil-*` ni de sondage sous Gemini
  (`docs/intentions/compatibilite-des-outils.md` (ex-« skills-et-sondage-sous-gemini », regroupée le 2026-10-25)) ; un passage complet
  du banc reste à obtenir de façon stable
  (`docs/intentions/compatibilite-des-outils.md` (ex-« banc-gemini-quota », regroupée le 2026-10-25)).
- **Consommation** : non mesurée — le chantier a été mené sous Copilot CLI.
- **Clôturé par** : la branche `chantier/compat-gemini`.

## 2026-10-19 — Détour de la release 0.6.7 : la mise à jour complète la fiche des mécaniques

- **Défaut** : après une mise à jour du kit, un projet déjà équipé échouait à
  « Docs jamais fausses » (QUA-011, et QUA-015, QUA-016 par le contrôle partagé) : la
  0.6.7 livre un nouveau fichier de mécanique (`.githooks/skill-headers.mjs`)
  qu'aucune fiche ne couvrait. Trouvé par l'essai réel de mise à jour 0.6.6 → 0.6.7.
- **Cause** : `docs/projects/kit-mechanics.md` est générée une seule fois à
  l'installation et n'est ni de la prose ni de la mécanique du kit : `init` ne la
  réécrit ni ne la complète jamais.
- **Correction** : `complete()` ajoute au bloc de cadrage de cette fiche les fichiers
  de mécanique du kit qui y manquent (rien retiré, lignes du projet gardées,
  idempotent). Test de non-régression (QUA-027, mise à jour sûre), vu échouer avant la correction.
- **CI** : CodeQL a signalé `js/bad-tag-filter` sur une regex de fin de commentaire HTML ;
  remplacée par une recherche de ligne, sans regex.
- **Clôturé par** : la branche `detour/maj-fiche-mecaniques`.

## 2026-10-20 — Release 0.6.7, la compatibilité des agents (socle, Copilot CLI, Gemini CLI)

- **Décisions clés** : périmètre ramené à trois outils sur cinq, Codex et
  Cursor repassés en intentions (`docs/intentions/compat-codex.md`,
  `docs/intentions/compat-cursor.md`). Lot 1 : version 0.6.7 partout (paquet,
  racine, verrou), changelog daté, PR #183 fusionnée. Un détour (PR #182) a
  corrigé une mise à jour du kit qui laissait la fiche des mécaniques
  incomplète, trouvée par l'essai réel 0.6.6 → 0.6.7.
- **Candidate et promotion** : candidate `v0.6.7-rc.1` posée sur le commit
  `d74b5f1` (QUA-051, version candidate et fiche de recette) ; verdict
  « approuvée » donné par l'humain le 2026-10-20 (QUA-053, verdict humain) ;
  promotion en `v0.6.7` avec le même tarball, sha256
  `b7e0bad74c3b637b3492e058824dbfe759e7ac15984b526e99a5b6c63d195e07`
  (QUA-054, seule une candidate approuvée est promue), retéléchargé et
  vérifié identique.
- **Limites connues** : celles de la fiche de recette, déjà portées par leurs
  intentions (`docs/intentions/compatibilite-des-outils.md` (ex-« skills-et-sondage-sous-gemini », regroupée le 2026-10-25),
  `docs/intentions/compatibilite-des-outils.md` (ex-« banc-gemini-quota », regroupée le 2026-10-25),
  l'intention « depassement-delai-copilot-interactif » (abandonnée le 2026-10-25),
  le journal du 2026-10-20 (0.6.8)). Observé : après
  une candidate, `package.json` et les liens du projet équipé pointent vers la
  dernière release définitive (v0.6.6) alors que le fichier d'installation note le
  moteur 0.6.7 ; ils s'alignent au `init` suivant la promotion.
- **Consommation** : non mesurée — chantier mené sous Copilot CLI.
- **Clôturé par** : la branche `cloture-release-0-6-7`.

## 2026-10-20 — 0.6.8, Copilot CLI enchaîne les chantiers

- **Décisions clés** : le sondage Copilot porte deux champs (la fiche et
  `drwil-merge`) lus par le hook ; `state.mjs start` et `next` partent de
  CLOSING une fois la PR de clôture fusionnée (git, puis `gh` pour un
  squash), ce qui ramène en SCOPING sans geste à la main (QUA-037, QUA-058) ;
  chaque chantier d'une file tourne dans un sous-agent dès le premier, sous
  Claude Code (Agent) comme sous Copilot CLI (`task`).
- **Preuve** : tests ajoutés (`.githooks/state.test.mjs`,
  `.githooks/close.test.mjs`, `packages/drwil/test/kit.test.mjs`) ; essai
  réel sous Copilot CLI attesté par l'humain (QUA-069).
- **Limites connues** : la file menée par sous-agents avec les autres outils
  reste portée par `docs/intentions/compatibilite-des-outils.md` (ex-« file-sous-agents-autres-outils », regroupée le 2026-10-25) ;
  la fusion `gh` n'a pas été vue sur une PR squash réelle.
- **Consommation** : non mesurée — chantier mené sous Copilot CLI.
- **Clôturé par** : la branche `compat-copilot-enchaine`.

## 2026-10-20 — Release 0.6.8, Copilot CLI enchaîne les chantiers

- **Décisions clés** : version 0.6.8 partout (paquet, racine, verrou),
  changelog daté, PR #187 fusionnée. Candidate `v0.6.8-rc.1` posée sur le
  commit `88ae1a3` (QUA-051, version candidate et fiche de recette) ; verdict
  « approuvée » donné par l'humain (QUA-053, verdict humain) ; promotion en
  `v0.6.8` avec le même tarball, sha256
  `f0acc19d75c18c958eb2e018387fa15c2abadd624158b8dd314fc866a978c0ed`
  (QUA-054, seule une candidate approuvée est promue), retéléchargé et
  vérifié identique.
- **Essai réel** : projet temporaire équipé avec le tarball 0.6.7 de la
  release GitHub, puis mis à jour avec le tarball 0.6.8 : 8 fichiers de
  mécanique mis à jour, le fichier d'installation en 0.6.8, rien de perdu (QUA-027).
- **Incident** : à la promotion, le tag a été poussé mais la création de la
  release GitHub a échoué (HTTP 500) ; la commande suggérée par le script,
  relancée à la main, a réussi au second essai.
- **Intention retirée** : `fusion-sans-sondage-copilot` est couverte par la
  0.6.8 (sondage à deux champs, interdiction de programmer la fusion sans
  réponse « Automatic merge »).
- **Limites connues** : la détection de la PR de clôture fusionnée n'a pas
  encore servi sur une vraie PR ; la file pour les autres outils reste
  portée par `docs/intentions/compatibilite-des-outils.md` (ex-« file-sous-agents-autres-outils », regroupée le 2026-10-25).
- **Consommation** : non mesurée — chantier mené sous Copilot CLI.
- **Clôturé par** : la branche `cloture-release-0-6-8`.

## 2026-10-21 — 0.6.9, la fluidité de la clôture

- **Décisions clés** : la clôture depuis une activité autre que CLOSING
  nomme le chemin restant et la commande qui renouvelle l'évidence périmée,
  sans avancer l'état (QUA-073) ; l'avertissement d'intention compare toute la
  branche (QUA-073) ; `verify` dit s'il faut ajouter ou retirer le marqueur
  `[humain]` d'un critère, contrat nommé (QUA-070) ; la commande de terminal de note
  note une idée en une ligne datée, sans changer d'activité, depuis tout outil
  (QUA-071, QUA-061) ; les hooks et skills de Claude Code sont inchangés,
  prouvés par des entrées simulées (QUA-072).
- **Preuve** : tests des hooks et du paquet ; essai réel d'une clôture
  depuis BUILD sous Copilot CLI, en suivant seulement les messages, attesté par
  l'humain (QUA-048).
- **Limites connues** : l'essai sous Claude Code est reporté faute de crédit ;
  les commandes `/drwil-*` sous Gemini CLI restent portées par
  `docs/intentions/compatibilite-des-outils.md` (ex-« skills-et-sondage-sous-gemini », regroupée le 2026-10-25). Les intentions
  `cloture-chemin-guide`, `critere-humain-message-clair` et `note-a-tout-moment`,
  entièrement couvertes, sont retirées.
- **Consommation** : non mesurée — chantier mené sous Copilot CLI.
- **Clôturé par** : la branche `workstream/fluidite-cloture-0-6-9`.

## 2026-10-21 — Release 0.6.9, la fluidité de la clôture

- **Décisions clés** : version 0.6.9 partout (paquet, racine, verrou),
  changelog daté, PR #192 fusionnée. Candidate `v0.6.9-rc.1` posée sur le
  commit `7605c3a` (QUA-051, version candidate et fiche de recette) ; verdict
  « approuvée » donné par l'humain (QUA-053, verdict humain) ; promotion en
  `v0.6.9` avec le même tarball, sha256
  `c3122188f9fdc499a0dcbd6a93e4ce81e6afef6d14d73f66d33640d508804ee5`
  (QUA-054, seule une candidate approuvée est promue), retéléchargé et
  vérifié identique. Les README ne figent aucun numéro de version
  (QUA-055), ils n'ont pas changé.
- **Essai réel** : projet temporaire équipé avec le tarball 0.6.8 de la
  release GitHub, puis mis à jour avec le tarball 0.6.9 : fichiers de
  mécanique mis à jour, `.githooks/note.mjs` ajouté, le fichier d'installation en
  0.6.9, rien de perdu, `doctor` « Healthy » (QUA-027).
- **Limites connues** : l'essai de clôture sous Claude Code reste reporté
  faute de crédit ; les limites P3 à P5 de la fiche de recette sont celles de
  la 0.6.8 et de la 0.6.9, déjà portées par leurs intentions.
- **Consommation** : non mesurée — chantier mené sous Copilot CLI.
- **Clôturé par** : la branche `cloture-release-0-6-9`.

## 2026-10-21 — La clôture vérifie la cohérence de la documentation, de façon bloquante

- **Décisions clés** : la clôture (`.githooks/close.mjs`, `--check`) refuse en
  un seul message, sur tout l'index, une case contredisant le statut de la
  fiche (QUA-015), une citation de fiche de chantier dans du code, modifié ou
  non (QUA-049), et une fiche supprimée dont l'intention n'est pas touchée
  (QUA-036) ; au commit, ces écarts restent des avertissements (QUA-074).
  Les règles vivent une fois dans `.githooks/doc-coherence.mjs`, lu par
  `check-docs` et par la clôture (QUA-075). Chaque correction sans jugement
  est proposée en diff et n'est écrite qu'avec `--fix` : case alignée sur le
  statut, référence morte réorientée vers le journal (fiche qui se clôt) ou
  supprimée (QUA-076). Une intention nouvelle citant un chemin déjà cité par
  une autre est signalée en avertissement (QUA-077). Les cinq cases de
  `suites-kit-portable` et neuf citations de fiche dans des commentaires de
  code ont été corrigées avant de devenir bloquantes. QUA-015, QUA-036 et
  QUA-049 sont modifiés (déclarés dans la fiche) ; QUA-015 a été réattesté
  par l'humain.
- **Limites connues** : un intitulé d'index devenu faux et un paragraphe de
  version qui ne suit plus ses cases ne sont pas détectés (non détectables de
  façon sûre) : intention `docs/intentions/petits-defauts.md` (ex-« intitule-d-index-devenu-faux », regroupée le 2026-10-25).
  Une ligne d'index commune à la fiche et à son intention ne se retire pas
  automatiquement : à retirer à la main.
- **Consommation** : non mesurée — chantier mené sous Copilot CLI.
- **Clôturé par** : la branche `workstream/cloture-coherence-doc`.

## 2026-10-21 — Une note de recette conservée dans le dépôt, à chaque version

- **Décisions clés** : à chaque version, une note `docs/recettes/<version>.md`
  (fiche de recette, verdict, réserves, auteur et date, sha256 de chaque
  tarball) arrive par une PR dédiée, jamais sur la branche principale
  (QUA-078). Le commit de la note est construit en plomberie git (index
  privé), poussé sur `recette/<version>` sans toucher l'arbre, l'index ni la
  branche courante, et ne remplace jamais une branche distante existante.
  Une version publiée sans candidate reçoit la même note, « sans verdict »,
  avec un bloc à compléter par l'humain (QUA-079). Le tag et la release sont
  publiés avant la note et n'en dépendent jamais : un échec de la PR est dit
  avec la commande de rattrapage, la note est gardée dans un fichier
  (QUA-080). `--dry-run` montre la note sans rien écrire, pour la promotion
  comme pour la release directe. QUA-054 est modifié (la promotion ouvre en
  plus la PR de la note, déclaré dans la fiche) ; il reste prouvé par son test.
  Recettes et skills de release (dépôt et gabarit) mis à jour.
- **Limites connues** : `.githooks/recette-note.mjs` n'est cité ni par la fiche des
  mécaniques livrée au kit ni par le README du module, hors du cadrage (la
  fiche des mécaniques du dépôt le cite, ajouté à la clôture) : le test du
  kit contourne le manque dans son projet de test
  (intention `docs/intentions/petits-defauts.md` (ex-« recette-note-dans-la-fiche-des-mecaniques », regroupée le 2026-10-25)).
  Les notes des versions déjà publiées ne sont pas rétro-écrites (hors
  périmètre). Aucune release réelle n'a été jouée : tests sur dépôts
  temporaires, origine nu local et `gh` simulé.
- **Consommation** : non mesurée — chantier mené sous Copilot CLI.
- **Clôturé par** : la branche `workstream/note-de-recette-par-version`.

## 2026-10-21 — Une attestation tombe quand ce qu'elle couvre change

- **Décisions clés** : la règle de validité est écrite avant le mécanisme
  (`docs/ia-first.md`, dépôt et gabarit) : une attestation n'est valide que
  tant que l'objet attesté reste celui jugé. Un contrat déclare cet objet par
  le champ `**Couvre**` / `**Covers**` (motifs de chemins, lus par
  `.githooks/contracts.mjs`). L'attestation version 3 enregistre l'empreinte
  du contenu des fichiers couverts, lue sur les fichiers (indépendante de
  git, ordre des chemins et fins de ligne sans effet) ; un fichier modifié,
  ajouté, supprimé ou renommé la fait tomber et `verify` le nomme, un fichier
  hors couverture non (QUA-081, Une attestation tombe quand un fichier
  qu'elle couvre change). Un contrat attestable sans couverture est signalé
  par `verify` et `doctor` sans perdre son attestation ; les versions 1 et 2
  restent valables, la première réattestation passe en version 3 (QUA-082).
  `drwil attest <ID> --renew` renouvelle une attestation encore valide, même
  terminal interactif, même identifiant retapé, jamais de `--yes` (QUA-083).
  QUA-032 est modifié (déclaré dans la fiche) : une attestation couvre aussi
  l'empreinte des fichiers couverts ; il reste prouvé par son test. La logique
  est dans un nouveau module (`packages/drwil/src/coverage.ts`) pour tenir
  `packages/drwil/src/verify.ts` à 400 lignes. Le cadrage a été élargi en cours de route
  (nouveau module, option de la CLI) par un commit qui ne touche que la fiche.
- **Limites connues** : aucun contrat attesté du dépôt ne déclare `**Couvre**`
  (hors périmètre : cela exige des réattestations humaines) — intention
  `docs/intentions/cloture-et-attestations.md` (ex-« couverture-des-contrats-attestes », regroupée le 2026-10-25). Un changement de
  forme pur fait tomber l'attestation (aucun moyen sûr de le distinguer).
  Le test rouge du scénario S6 n'a pas été commité seul (les hooks rejouent
  les tests à chaque commit de code) : il est commité vert avec le mécanisme.
- **Consommation** : non mesurée — chantier mené sous Copilot CLI.
- **Clôturé par** : la branche `cadrage-attestation-liee`.

## 2026-10-21 — Des critères et des preuves qui survivent à la clôture

- **Décisions clés** : la clôture n'est plus une perte de mémoire. Elle écrit
  un document versionné par chantier, `docs/preuves/criteres-et-preuves-durables.md`
  pour celui-ci : chaque critère y porte son contrat, ses contrôles, le commit
  vérifié et l'empreinte des fichiers couverts, recopiés de l'évidence du
  verdict (aucun jugement rejoué à la clôture, la couverture reste calculée par
  `packages/drwil/src/coverage.ts`). La clôture est refusée si ce fichier ne
  peut pas être écrit, si l'évidence ne date pas de HEAD ou si son verdict
  n'est pas PASS, et `close.mjs --check` signale l'entrée de journal qui ne
  cite pas la preuve (QUA-084, Une clôture laisse une preuve versionnée de ses
  critères). Après la clôture, `drwil verify` rejoue les critères du fichier de
  preuve et échoue franchement, même code en local et en CI, en nommant le
  critère dont la preuve a disparu — contrôle retiré, test supprimé, contrat
  abandonné (QUA-085, Un critère dont la preuve a disparu fait échouer la
  vérification). La fiche jugée est trouvée sans état local, par le trailer
  `Drwil-Brief` des commits de la branche quand `.drwil/state.json` (si présent)
  est absent, le cas de la CI (QUA-086, La fiche jugée est trouvée sans état
  local).
  QUA-013 (Contrôle non exécuté n'est pas passé) et QUA-034 (Critères
  d'acceptation vérifiables) sont étendus, l'attestation de QUA-013 renouvelée
  par l'humain. La logique du rejeu est dans un nouveau module
  (`packages/drwil/src/closure.ts`), et l'écriture de la preuve dans
  `.githooks/closure-proof.mjs`, pour tenir `packages/drwil/src/verify.ts` à
  400 lignes et `.githooks/close.mjs` sous le plafond (QUA-001). Le cadrage a
  été élargi deux fois en cours de route (dossier de preuves du gabarit, module
  d'écriture de la preuve) par des commits qui ne touchent que la fiche.
  Enseignement de la clôture elle-même : la première preuve écrite s'est heurtée
  à la barrière de périmètre, qui refuse en CLOSING tout fichier hors fiches —
  la clôture écrivait donc un document que le commit refusait. La preuve de
  clôture échappe désormais au périmètre jugé, comme les attestations et le
  journal de consommation, tous écrits en CLOSING pour le commit de clôture.
- **Limites connues** : le dossier des preuves garde son nom français dans un
  gabarit anglais, seul le réglage `dirs.proofs` le change —
  `docs/intentions/petits-defauts.md` (ex-« nom-du-dossier-des-preuves », regroupée le 2026-10-25). Les chantiers clos avant
  cette règle n'ont pas de preuve, et aucune n'est écrite après coup (hors
  périmètre) — l'intention « preuve-des-chantiers-deja-clos » (abandonnée le 2026-10-25). Les trois
  contrats créés ne déclarent pas de `**Couvre**`, comme les autres contrats du
  dépôt : la colonne d'empreinte de cette première preuve affiche « — », le
  mécanisme l'écrit dès qu'un contrat déclare sa couverture —
  `docs/intentions/cloture-et-attestations.md` (ex-« couverture-des-contrats-attestes », regroupée le 2026-10-25).
- **Consommation** : non mesurée — chantier mené sous Copilot CLI.
- **Clôturé par** : la branche `cadrage-criteres-durables`.

## 2026-10-22 — Garanties obligatoires à l'adoption : couverture, e2e, versionnement et présentation

- **Décisions clés** : le contrat est universel, seule la preuve change selon
  la techno. `drwil guarantees`, lancé par `/drwil-adopt` une fois la pile
  connue, câble dans `.drwil/ia-first.json` le contrôle de couverture à 100 %
  de chaque couche dont la pile est dans la table des outils
  (Node/TypeScript, Python, Go, JVM ; une ligne par pile, l'outil qui ne
  mesure qu'une partie des métriques le dit) (QUA-087, couverture câblée à
  100 % par couche). Une pile hors table ou un outil absent écrit une fiche
  bloquante `[P0]`, seule proposée au lancement, et `verify` est en FAIL tant
  que la garantie n'est pas tenue (QUA-088, fiche bloquante quand l'outil
  manque) ; l'e2e des chemins critiques est exigé de la même manière (QUA-089,
  e2e obligatoire). Aucune dérogation, seules des exclusions déclarées et
  justifiées (QUA-090) ; un outil non lançable ne donne jamais « passé »
  (QUA-091). Projet existant en dette : cliquet au niveau mesuré, 100 % sur le
  code nouveau ou modifié, fiche de montée `[P1]` non bloquante (QUA-093).
  Versionnement : Git, forge GitHub ou GitLab, CI qui rejoue les contrôles du
  hook, branche principale protégée sans contournement administrateur, posée
  par `gh`/`glab` avec l'accord de l'humain seulement (`--protect`), sinon
  fiche bloquante, sur projet neuf comme existant (QUA-094, QUA-095).
  Présentation : le README livré présente le produit de l'utilisateur
  (QUA-096) ; un README, une ligne « 5 lignes » d'`AGENTS.md` ou un
  `docs/features.md` resté en squelette écrit une fiche bloquante (QUA-097) ;
  la release refuse le tag tant que README, fonctionnalités et carte ne sont
  pas examinés (`.githooks/release-review.mjs`, QUA-098). Une PR de documentation seule
  part en fusion automatique sans question (QUA-099) ; `.githooks/pr-watch.mjs` suit la
  CI d'une PR et dit verte, fusionnée ou rouge (QUA-100), lu par
  `gh pr view` (`statusCheckRollup`). La recette d'adoption et le catalogue
  ne se contredisent plus (QUA-011) ; `catalog:QUA-004` et `catalog:QUA-020`
  du gabarit modifiés comme déclaré dans la fiche. Le code est découpé en
  modules `guarantees-*.ts` pour tenir le plafond de 400 lignes (QUA-001).
  L'essai réel sur un dossier vide (QUA-092) est attesté par l'humain.
  Cadrage élargi deux fois au lancement par des commits qui ne touchent que la
  fiche. Ces garanties sont hors de l'adaptation au risque : reporté dans
  `docs/intentions/catalogue-cycle-de-vie.md` (fiche 2, profils).
  Preuve de clôture : `docs/preuves/garanties-obligatoires-adoption.md`.
- **Limites connues** : `init` n'impose pas les garanties, il renvoie vers
  `drwil guarantees` — `docs/intentions/garanties-la-suite.md` (ex-« init-impose-les-garanties », regroupée le 2026-10-25). Les
  commits de code d'une couche ne sont pas bloqués tant que sa fiche de
  garantie existe — `docs/intentions/garanties-la-suite.md` (ex-« commits-bloques-par-une-garantie », regroupée le 2026-10-25).
  `--no-verify` n'est pas détecté par `verify`, seule la CI le rattrape —
  `docs/intentions/garanties-la-suite.md` (ex-« no-verify-detecte-par-verify », regroupée le 2026-10-25). `verify` échoue tant que
  la garantie n'est pas tenue, pas du seul fait que la fiche existe :
  interprétation validée par le demandeur le 2026-10-22 (sinon la fiche ne
  pourrait jamais se clore, la clôture exigeant un verify PASS). JVM : ni
  mesure de la couverture actuelle ni cliquet remonté automatiquement —
  l'intention « couverture-jvm-mesuree » (abandonnée le 2026-10-25). Le dépôt drwil n'est pas
  soumis aux garanties et son `docs/features.md` est encore le squelette, ce
  qui fera refuser la prochaine release (QUA-098) —
  `docs/intentions/garanties-la-suite.md` (ex-« garanties-sur-le-depot-drwil », regroupée le 2026-10-25). La sortie `--agent`
  range les garanties non tenues sous « Registry errors » —
  `docs/intentions/garanties-la-suite.md` (ex-« garanties-dans-la-sortie-agent », regroupée le 2026-10-25).
- **Consommation** : 4,25 M tokens pondérés (`.drwil/usage.jsonl`).
- **Clôturé par** : la branche `workstream/garanties-obligatoires-adoption`
  (PR #203).

## 2026-10-22 — La note de recette échappe à la barrière de périmètre

- **Décisions clés** : la note de recette d'une version
  (`docs/recettes/<version>.md`), écrite et commitée par plomberie par
  `.githooks/recette-note.mjs`, sans trailer `Drwil-Brief` ni fiche active,
  était refusée en CI par la barrière de périmètre (PR #199, note de la
  v0.6.10). `docs/recettes/*` rejoint `OUT_OF_SCOPE`
  (`.githooks/scope-gate.mjs`, gabarit et copie), comme les attestations et
  la preuve de clôture ; aucun motif large sur `docs/`, un fichier voisin
  reste soumis au périmètre (test QUA-035). Pas de trailer ajouté au commit
  de la note : aucune fiche n'est active à la publication. Règle de QUA-035
  (le cadrage complet du premier coup) complétée, modification déclarée et
  validée par le demandeur ; d'abord rattaché à l'entretien courant, le
  correctif a reçu une fiche dédiée pour que cette déclaration disparaisse
  avec elle. Doc `docs/ia-first.md` et `CHANGELOG` complétés.
  Preuve de clôture : `docs/preuves/note-recette-hors-perimetre.md`.
- **Limites connues** : aucune ; les autres écarts relevés le même jour
  (CODEOWNERS, contournements) sont traités à part.
- **Clôturé par** : la branche `entretien-note-recette-hors-perimetre`.

## 2026-10-23 — Mini-banc : même consigne, avec et sans drwil (lot 1, banc rejouable)

- **Décisions clés** : un banc rejouable d'une commande
  (`outils/banc.mjs`, juge à part dans `outils/banc-juge.mjs`) lance un
  agent sur une copie jetable du projet de référence `bench/reference/`
  (panier avec le bug des quantités), avec et sans drwil, sur deux tâches
  (`bench/taches/` : un bug, un piège), et écrit un résultat JSON par
  passage : tokens, coût estimé, tours, verdict du juge. Le juge est
  indépendant de drwil : tests cachés copiés après le passage,
  contournements détectés sur le diff, fichiers hors tâche comptés ; un
  passage qui n'a pas tourné est « non mesuré » ; le coût de la
  gouvernance (faux blocages, temps passé à satisfaire les contrôles) est
  mesuré à part. Le workflow `.github/workflows/banc.yml` ne tourne qu'à
  la demande, sur l'abonnement Claude du demandeur (secret
  `CLAUDE_CODE_OAUTH_TOKEN`, enregistré le 2026-10-23), deux passages à la
  fois. Contrats QUA-101 à QUA-106, protocole réduit daté dans
  `docs/benchmark-protocole.md`. Recadré à la clôture : GitHub ne déclenche
  à la main qu'un workflow présent sur la branche principale, donc l'essai
  réel et la campagne ne peuvent venir qu'après la fusion ; la ligne
  Manuel de QUA-106 (rapport du mini-banc) est retirée jusqu'à la campagne,
  décision du demandeur. Preuve de clôture : `docs/preuves/mini-banc.md`.
- **Limites connues** : aucun passage réel n'a tourné, le workflow n'est
  éprouvé qu'avec un agent simulé ; essai réel, budget, campagne de 12
  passages, rapport et retour de la ligne Manuel de QUA-106 :
  `docs/intentions/campagne-mini-banc.md`. Le test QUA-060 laisse des
  dossiers vides `drwil-banc-*` à la racine (même intention, détour à
  ouvrir).
- **Clôturé par** : la branche `workstream/mini-banc` (PR #208).

## 2026-10-23 — Mini-banc : déroulé conservé et copie réaliste

- **Décisions clés** : chaque passage qui a lancé l'agent, mesuré ou non,
  écrit à côté de son résultat le déroulé de la session (flux
  `stream-json` de `claude -p`, même nom en `.jsonl`), jetons masqués avant
  l'écriture ; le résultat dit fichier, lignes et masques, et `deroule:
  null` quand l'agent n'a pas été lancé ; le rapport ne lit que les
  résultats (QUA-107). La copie « avec drwil » est installée comme chez un
  utilisateur : tarball du paquet construit dans le dépôt (`npm pack`), en
  dépendance de développement, puis `npx drwil init` ; `npx drwil` s'y
  résout sur place, hors réseau ; dans les deux conditions, un dépôt
  distant local qui a déjà la branche principale (QUA-108). Prouvé sur une
  vraie copie : `npx drwil verify` hors réseau, aucune fiche bloquante, une
  branche poussée hooks actifs. `.github/workflows/banc.yml` inchangé ;
  protocole réduit complété et re-daté au 2026-10-23, avant toute mesure.
  Preuve de clôture : `docs/preuves/deroule-banc.md`.
- **Limites connues** : le job de passage de `.github/workflows/banc.yml` n'installe pas
  gitleaks, donc l'agent « avec » peut commiter mais pas pousser — traité
  par « Mini-banc prêt pour l'essai réel », entrée suivante ; dans une copie fraîchement
  adoptée, les contrôles refusent tout commit tant que le code n'est pas
  couvert par une fiche et la carte (comportement réel de drwil, mesuré
  par le banc, pas corrigé) ; l'essai réel et la campagne restent à lancer
  — `docs/intentions/campagne-mini-banc.md`.
- **Clôturé par** : la branche `workstream/deroule-banc` (PR #210).

## 2026-10-23 — Mini-banc prêt pour l'essai réel

- **Décisions clés** : le test de QUA-108 (copie préparée comme chez un
  utilisateur réel) lance git avec l'environnement de l'agent du banc
  (`envAgent`, sans `CI`) et non celui du runner : avec `CI=true`, les
  hooks de la copie se croyaient en CI et refusaient le push (cause de la
  CI rouge de la PR #210) ; les tests du banc passent désormais avec et
  sans `CI=true`. Le job `passage` de `.github/workflows/banc.yml` installe
  gitleaks 8.21.2 avec la même étape que la CI principale (archive vérifiée
  par sa somme, `~/.local/bin`) : nouveau contrat QUA-109 (le job de
  passage installe gitleaks comme la CI principale), prouvé par un test qui
  lit les deux workflows, contrôle `tests-qua-109`. Protocole réduit :
  limite « gitleaks absent » retirée, outils de la machine décrits, toujours
  daté du 2026-10-23 avant toute mesure. Carte : banc cité de QUA-101 à
  QUA-109. Intention `gitleaks-au-banc` entièrement couverte, retirée :
  sans gitleaks dans le job de passage, le contrôle des secrets de la copie
  « avec » était « non exécuté » et le push refusé (QUA-013), ce qui aurait
  pesé contre drwil pour une installation incomplète du banc ; décision du
  2026-10-23 : l'installer comme la CI principale. Preuve de clôture :
  `docs/preuves/banc-pret-essai.md`.
- **Limites connues** : l'essai réel n'a toujours pas tourné (geste humain,
  après la fusion de la PR #210), ni la campagne —
  `docs/intentions/campagne-mini-banc.md` ; gitleaks reste absent des
  prérequis du README de drwil (décision produit à part, hors de ce
  chantier) ; dossiers vides `drwil-banc-*` du test QUA-060 : même
  intention, détour à ouvrir.
- **Clôturé par** : la branche `workstream/deroule-banc` (PR #210).

## 2026-10-23 — `init` rattache le code existant, le premier commit passe

- **Décisions clés** : à la première installation d'un projet qui a déjà
  du code indexé par git, `init` écrit la fiche de référence « code
  existant » (statut « référence — … », bloc `scope` fichier par fichier,
  jugé par la grammaire installée `.githooks/scope.mjs` avec le réglage
  qu'`init` vient d'écrire, hors fichiers du kit et fichiers déjà couverts)
  et ajoute à la carte qu'il vient d'écrire une section « Code existant »
  qui cite chacun de leurs dossiers, rôle « à décrire à l'adoption ».
  Nouveau module `packages/drwil/src/existing-code.ts`, appelé par `init`
  seulement sans réglage ni manifeste antérieurs. Un projet neuf, du code
  non indexé et une mise à jour ne changent pas ; une fiche ou une carte
  préexistante n'est jamais réécrite (les dossiers à citer sont dits) ;
  `uninstall` laisse la fiche (dossier des fiches protégé). Nouveau contrat
  QUA-110 (`init` rattache le code indexé avant le kit : le premier commit
  d'une fiche passe), contrôle `tests-qua-110`, prouvé sur un vrai projet
  installé, hooks actifs et réglages bloquants, où le commit d'installation
  puis celui d'une fiche seule passent. Recette d'adoption (étape 1) : ce
  que devient la fiche (QUA-041, la documentation lue par un nouvel
  utilisateur dit vrai, critère marqué `[humain]`). Changelog et carte du
  dépôt. Intention d'origine entièrement couverte, retirée : juste après
  `init` sur un projet existant, le commit d'une fiche seule échouait sur
  la dette antérieure (QUA-016 rappel de cadrage, QUA-040 carte entretenue),
  constaté par le mini-banc (run 39966784905) ; décisions du 2026-10-23 :
  `init` rattache le code, seulement le code indexé. Preuve de clôture :
  `docs/preuves/premier-commit-avant-adoption.md`.
- **Limites connues** : l'aperçu `init --dry-run` n'annonce pas le
  rattachement — `docs/intentions/petits-defauts.md` (ex-« apercu-init-code-existant », regroupée le 2026-10-25) ; une carte
  préexistante et un chemin qu'un bloc `scope` ne peut pas nommer restent à
  traiter à la main — `docs/intentions/petits-defauts.md` (ex-« code-existant-non-rattache », regroupée le 2026-10-25) ;
  « pas encore de code » affiché à un projet sans pile détectée qui en a —
  `docs/intentions/petits-defauts.md` (ex-« message-sans-couche-code-existant », regroupée le 2026-10-25) ; une seconde
  installation signale la carte comme dérivée du gabarit, comme toute carte
  complétée ; la justesse de la recette reste un jugement humain (QUA-041).
- **Clôturé par** : la branche `workstream/premier-commit-avant-adoption`.

## 2026-10-23 — Mini-banc : copie « avec » adoptée, juge et raison d'erreur corrigés

- **Décisions clés** : la copie « avec » part d'un projet adopté, comme un
  utilisateur réel avant sa première tâche (décision du 2026-10-23). Le code
  de la copie étant commité avant `init`, `init` y écrit déjà la fiche
  « code existant » et la section de carte qui cite le dossier des sources (QUA-110, `init`
  rattache le code indexé avant le kit) : l'ordre de `preparer` n'a pas
  changé. L'adoption fixe (`adopter`, `outils/banc.mjs`, étapes 1 à 3 de la
  recette d'adoption) n'ajoute que ce qui manquait : CI déclarée
  (`init --ci github`, sans quoi `verify` signalait QUA-013 — contrôle non
  exécuté n'est pas passé — en ERROR avant l'agent ; le workflow ne tourne
  jamais dans le bac à sable), rôles réels dans la carte, contrôle de la pile
  `npm test` ; ni contrat métier ni garanties obligatoires ; commitée avant
  l'activation des hooks. Le juge ne compte plus que l'écriture, la
  suppression ou la surcharge du réglage des hooks (`ecritHooks`,
  `outils/banc-juge.mjs`), jamais sa lecture (faux positif de l'essai réel).
  Une erreur de l'agent dit son message réel (`messageErreur` : texte du
  résultat, puis ses erreurs, le `subtype` seulement à défaut). Contrats
  modifiés : QUA-108 (copie préparée comme chez un utilisateur réel, état
  adopté), QUA-102 (juge indépendant, lecture non comptée), QUA-103 (non
  mesuré, raison réelle). Prouvé sur une vraie copie adoptée : commit d'une
  fiche seule accepté hooks actifs, `verify` sans FAIL ni ERROR ; tests du
  banc verts avec et sans `CI=true` (l'attendu de verdict du test QUA-108
  admet « MANUAL REVIEW REQUIRED », seul verdict sur la branche principale
  en CI). Protocole réduit complété et re-daté du 2026-10-23, toujours avant
  toute mesure. Preuve de clôture : `docs/preuves/banc-copie-adoptee.md`.
- **Limites connues** : `verify` ne donne jamais PASS dans la copie
  (contrats à attester, humain absent) —
  `docs/intentions/banc-verify-jamais-pass.md` ; le juge lit le texte des
  commandes, pas leur effet — `docs/intentions/banc-juge-motif-textuel.md` ;
  le champ `result` d'un résultat en erreur n'est vérifié qu'en simulation, et
  le nouvel essai réel reste à lancer [humain] —
  `docs/intentions/campagne-mini-banc.md`.
- **Clôturé par** : la branche `workstream/banc-copie-adoptee`.

## 2026-10-23 — La barrière de périmètre juge un commit de fusion sur sa seule résolution

- **Décisions clés** : au commit (pre-commit), pendant une fusion
  (`MERGE_HEAD` présent), la barrière de périmètre ne juge plus que la
  résolution : un fichier indexé identique, mode et contenu, à sa version
  dans `HEAD` ou dans `MERGE_HEAD` (supprimé et absent d'un parent compris)
  est apporté tel quel et passe, quels que soient l'activité et le cadrage ;
  un conflit résolu reste jugé comme tout fichier indexé ; un appel git qui
  échoue juge le fichier (QUA-013, contrôle non exécuté n'est pas passé).
  Nouveau contrat QUA-111 (la barrière juge un commit de fusion sur sa seule
  résolution), ajout pur au registre, sans élargir QUA-035 (cadrage
  complet, élargissement sans friction) ; contrôle `tests-qua-111` ; livré
  dans le gabarit (`resolution`, `.githooks/scope-gate.mjs`) ; ligne
  « Fixed » du changelog. Le push et la CI ignoraient déjà les fusions
  (`checkBranch`) : inchangés. Une fusion sans conflit ne passe pas par le
  pre-commit ; une fusion « octopus » refuse tout conflit : seul le cas
  vécu (conflit résolu puis `git commit`) était touché. Intention d'origine
  couverte : la note du 2026-10-23 sur la barrière et les commits de fusion
  (cas de la PR #213) est retirée de `docs/intentions/notes.md`. Preuve de
  clôture : `docs/preuves/barriere-commit-de-fusion.md`.
- **Limites connues** : aucune.
- **Clôturé par** : la branche `workstream/barriere-commit-de-fusion`.

## 2026-10-24 — CODEOWNERS protège le registre sous son nom actuel

- **Décisions clés** : la ligne de `.github/CODEOWNERS` qui citait l'ancien
  nom du registre (docs/contrats.md) cite `/docs/contracts.md` : une
  modification des contrats exige de nouveau la revue du propriétaire.
  Nouveau contrôle propre au dépôt, jamais livré (QUA-018, dépôt drwil ou
  livrable gabarit) : `outils/verifier-codeowners.mjs` refuse, au commit et
  en CI, toute ligne dont le motif ne correspond à aucun fichier ni dossier
  suivi par Git (syntaxe GitHub : `/` ancre, `/` final vise un dossier,
  `*` et `**`) ; un motif à syntaxe non prise en charge (`?`, `[`, `\`,
  `!`), un CODEOWNERS absent ou un `git ls-files` en échec est une erreur
  (QUA-013, contrôle non exécuté n'est pas passé). Nouveau contrat QUA-112
  (chaque ligne de CODEOWNERS cite un chemin suivi par Git), contrôles
  `codeowners` (chemins `**` : un renommage n'importe où peut vider une
  ligne) et `tests-qua-112` ; carte d'architecture complétée (cadrage
  élargi à `docs/architecture.md` dans un commit de fiche seul). Intention
  d'origine couverte, résumée ici et retirée
  (docs/intentions/codeowners-registre.md). Preuve de clôture :
  `docs/preuves/codeowners-registre.md`.
- **Limites connues** : le contrôle ne juge que les chemins, pas les
  propriétaires ni les erreurs que GitHub relève —
  `docs/intentions/contournements-restants.md` (ex-« codeowners-erreurs-github », regroupée le 2026-10-25).
- **Clôturé par** : la branche `workstream/codeowners-registre`.

## 2026-10-24 — Les contournements restants fermés ou assumés

- **Décisions clés** : trois trous de l'inventaire du 2026-10-22 traités.
  Sur une PR, la CI rejoue aussi les contrôles avec les hooks de la branche
  principale (`.githooks/base-checks.mjs`, nouveau, livré dans le gabarit
  avec les deux CI GitHub et GitLab et la CI du dépôt) : ses hooks sont lus
  par `git show <base>:.githooks/…` dans un dossier temporaire, la liste de
  contrôles reste celle de la PR, un contrôle retiré de
  `.drwil/ia-first.json` échoue sauf s'il est cité dans « Contrats
  modifiés » de la fiche, base introuvable « non exécuté » (QUA-013,
  contrôle non exécuté n'est pas passé) ; scénario de contournement dans
  `packages/drwil/test/cycle.test.mjs` — QUA-113 (la CI rejoue les
  contrôles avec les hooks de la branche principale). La garde shell de
  Claude Code refuse, sans demander, le saut des hooks et toute écriture,
  suppression ou surcharge de `core.hooksPath` (`--no-verify`, `commit -n`,
  `-c`, `git config`, `--unset`, `GIT_CONFIG_*`), y compris dans une
  commande composée ou un `sh -c` ; une lecture du réglage passe — QUA-114
  (la garde shell refuse le saut des hooks). `bypass_actors` reste non
  comparé en CI (pas de jeton administrateur, décision du demandeur) :
  `drwil guarantees` et `doctor` le vérifient avec le jeton de l'humain
  quand il est administrateur, « non vérifié » sinon — QUA-115
  (`bypass_actors` vérifié avec le jeton de l'humain). Contrats ajoutés au
  registre, contrôles `tests-qua-113` à `tests-qua-115`, ligne
  « Unreleased » du changelog. Attestation de QUA-092 (garantie de
  couverture prouvée sur un dossier vide) renouvelée par l'humain, son champ
  **Couvre** citant les fichiers des garanties touchés. Intention d'origine
  mise à jour (`docs/intentions/contournements-a-completer.md`) : y restent
  le clone superficiel et l'agent qui élargit son cadrage. Preuve de
  clôture : `docs/preuves/contournements-completes.md`.
- **Limites connues** : une PR peut encore retirer l'étape de rejeu du
  workflow lui-même — `docs/intentions/contournements-restants.md` (ex-« rejeu-retirable-du-workflow », regroupée le 2026-10-25) ;
  un contrôle redéfini sous le même identifiant n'est pas comparé —
  `docs/intentions/contournements-restants.md` (ex-« controle-redefini-meme-nom », regroupée le 2026-10-25) ; la garde shell juge
  le texte, trompée par des variables et trop stricte sur un texte cité
  (heredoc refusé) — `docs/intentions/contournements-restants.md` (ex-« garde-shell-par-le-texte », regroupée le 2026-10-25) ; le
  rejeu double environ la durée du job `checks` (~3 min de plus) —
  l'intention sur la durée du rejeu (traitée et retirée le 2026-10-24) ; les tests de la garde shell
  sont dans `packages/drwil/test/kit.test.mjs` —
  `docs/intentions/contournements-restants.md` (ex-« tests-garde-shell-a-leur-place », regroupée le 2026-10-25).
- **Clôturé par** : la branche `workstream/contournements-completes`
  (PR #219).

## 2026-10-24 — Rouvrir un chantier dont la PR révèle un défaut après la clôture

- **Décisions clés** : en CLOSING, quand la PR du chantier, ouverte et non
  fusionnée, révèle un défaut (CI rouge, analyse de la forge), l'agent
  rouvre seul le chantier par `node .githooks/state.mjs reopen` : fusion
  automatique annulée d'abord (relue, sinon refus), fiche restaurée telle
  qu'au parent du commit qui l'a supprimée, dans un commit qui ne touche
  qu'elle, BUILD sur la même branche avec la marque `reopened`,
  autorisation de fusion et file gardées, sans réécrire l'historique ;
  refus sans rien changer hors CLOSING, sur un arbre modifié, hors branche
  de chantier, sur une PR fusionnée, fermée ou inconnue — QUA-116 (un
  chantier clos dont la PR révèle un défaut se rouvre sur sa branche). Un
  correctif de réouverture qui change les règles du jeu attend le oui de
  l'humain par l'exception du détour (`detour.mjs allow`) — QUA-117. La
  nouvelle clôture réécrit la preuve, remplace la ligne de consommation par
  le nouveau total et refuse une seconde entrée de journal citant la même
  preuve — QUA-118. `writeState` devient le seul écrivain de l'état ; le
  rappel et la réouverture vivent dans `.githooks/state-cli.mjs` (QUA-001,
  fichiers sous 400 lignes). Cycle complet prouvé dans un projet installé,
  hooks réels et `gh` simulé dans le PATH. Contrats ajoutés au registre,
  contrôles `tests-qua-116` à `tests-qua-118`, ligne « Unreleased » du
  changelog. Chantier rouvert une fois sur sa propre PR (#220) : le rejeu
  par la branche principale (QUA-113) échouait faute de déclaration des
  hooks modifiés ; la fiche les déclare maintenant dans « Contrats
  modifiés ». Intention d'origine mise à jour
  (`docs/intentions/cloture-et-attestations.md` (ex-« defaut-revele-apres-la-cloture », regroupée le 2026-10-25)) : y reste l'attente
  de CodeQL avant la clôture. Preuve de clôture :
  `docs/preuves/reouvrir-apres-cloture.md`.
- **Limites connues** : une réouverture refusée après l'annulation de la
  fusion automatique la laisse annulée —
  `docs/intentions/cloture-et-attestations.md` (ex-« reouverture-fusion-annulee-apres-echec », regroupée le 2026-10-25) ; pas encore
  essayée sur une vraie PR, cycle complet sauté sous Windows —
  `docs/intentions/cloture-et-attestations.md` (ex-« reouverture-eprouvee-en-reel », regroupée le 2026-10-25).
- **Clôturé par** : la branche `workstream/reouvrir-apres-cloture`
  (PR #220).

## 2026-10-24 — Accélérer la CI sans perte de qualité

- **Décisions clés** : mesure d'abord (série 203 s sur 8 cœurs, 250 s sur
  2 cœurs : le coût est le CPU des contrôles lourds, pas `tsc`). Une
  compilation par passage (réglages `build` / `needsBuild`) et contrôles en
  parallèle, au plus la moitié des cœurs, verdict lu dans l'ordre de la liste
  (QUA-119 contrôles plus rapides, QUA-120 compilation unique). Push d'une
  branche à PR ouverte sauté sans changer les noms de checks exigés (QUA-121).
  Cadrage élargi le 2026-10-24 par le demandeur : chaque contrôle joué une seule
  fois par PR (QUA-123) : rejeu QUA-113 sauté, et dit, quand `.githooks/` et
  `.drwil/ia-first.json` sont identiques à la base (QUA-113 modifié, validé par le
  demandeur) ; suite jouée une fois sur Node 22 dans `checks`. Critère de durée
  reformulé (QUA-122) : hooks modifiés ≤ 3m55 (30 % sous ≈5m35) ; hooks
  inchangés relevé après fusion. Intention d'origine (« Accélérer la CI »)
  réduite à ce qui reste (suite unique avec reporter, jobs découpés, cache) ;
  l'intention sur la durée du rejeu est couverte et retirée.
- **Relevés réels (job `checks`, PR #221)** : référence PR #220 ≈ 5m35 ;
  5m33 avant l'élargissement ; hooks modifiés (rejeu complet) : 3m02, 3m45,
  4m37 sur trois passages (deux sur trois sous 3m55). Hooks inchangés : pas
  encore relevé (le saut n'agit qu'après fusion).
- **Limites connues** : tests de `.githooks/` plus joués sur Node 24 —
  `docs/intentions/suivi-ci-et-contexte.md` (ex-« tests-des-hooks-sur-node-24 », regroupée le 2026-10-25) ; `checks-self-test` et
  `couverture-hooks` non départagés —
  `docs/intentions/suivi-ci-et-contexte.md` (ex-« checks-self-test-contre-couverture-hooks », regroupée le 2026-10-25) ; gain pour les
  projets adoptés — `docs/intentions/suivi-ci-et-contexte.md` (ex-« ci-livree-aux-projets-non-mis-a-jour », regroupée le 2026-10-25) ;
  échec non expliqué de QUA-004 —
  `docs/intentions/suivi-ci-et-contexte.md` (ex-« alea-couverture-qua-004-au-pre-push », regroupée le 2026-10-25) ; relevé hooks
  inchangés — `docs/intentions/suivi-ci-et-contexte.md` (ex-« releve-duree-checks-hooks-inchanges », regroupée le 2026-10-25) ; les
  objectifs de durée de CI en indicateur suivi plutôt qu'en contrat attesté —
  `docs/intentions/suivi-ci-et-contexte.md` (ex-« objectifs-de-duree-ci-en-indicateur », regroupée le 2026-10-25) ; une attestation
  tombe quand un contrôle change de forme sans changer d'effet (six
  attestations périmées par les champs `build` / `needsBuild`) —
  `docs/intentions/cloture-et-attestations.md` (ex-« attestation-sur-l-effet-du-controle », regroupée le 2026-10-25).
- **Preuve de clôture** : `docs/preuves/acceleration-ci.md`.
- **Clôturé par** : la branche `workstream/acceleration-ci` (PR #221).

## 2026-10-24 — Réduire le contexte relu par chantier

- **Décisions clés** : cible dépôt et livrable (demandeur). Quatre leviers,
  sans contrôle retiré ni règle moins visible : lecture ciblée — un contrat
  par son ID, la liste courte de tous les contrats, une entrée de journal
  par chantier (`node .githooks/glossary.mjs --contract`, `--contracts`,
  `--journal` ; QUA-124 lecture seule d'un contrat ou d'une entrée, QUA-125
  liste courte des contrats) ; sorties courtes — `run-checks` n'affiche que
  ses échecs et un résumé qui compte les avertissements, détail dans
  `.drwil/evidence/run-checks.log` (si présent) (QUA-126, QUA-127), doublons d'intention
  regroupés par chemin dans `close.mjs --check` (QUA-128) ; sous-agent
  `drwil-checks` pour Claude Code, qui recopie le verdict mot pour mot sans
  attester ni écrire (QUA-129, QUA-130) ; une nouvelle session après chaque
  clôture (QUA-131). Lot 4 ajouté par le demandeur : avec Claude Code, le
  registre et le journal ne se lisent jamais en entier (hook read-guard et
  `bash-guard`, QUA-132). L'indicateur (cache lu moyen par requête) sorti
  des critères par le demandeur, faute de preuve possible avant deux
  chantiers comparables (QUA-034, un critère non prouvé fait tomber le
  verdict) : il devient une intention de relevé. QUA-122 (job `checks`
  nettement plus court) réattesté par l'humain, son attestation couvrant
  `.drwil/ia-first.json` modifié ici. Intention d'origine (note du
  2026-10-24) couverte et retirée, sauf le rappel d'état raccourci (non
  retenu par le demandeur) et la mesure (reprise par l'intention de relevé).
- **Relevé de référence** : ≈ 170 k de cache lu par requête
  (« rouvrir après clôture », 24,9 M pour 147 requêtes). Ce chantier, qui
  construit les leviers au fil de ses lots : 40,0 M pour 307 requêtes
  (≈ 130 k), 6,68 M tokens pondérés, 150 min — pas encore une mesure de
  l'effet (intention de relevé ci-dessous).
- **Constaté à la clôture** : une première tentative est tombée sur 33 FAIL
  `ENOSPC` — 13 500 dossiers `/tmp/drwil-*` laissés par les tests avaient
  épuisé les inodes du tmpfs `/tmp` ; une passe de `verify --evidence` en
  laisse 92 de plus. La garde shell de QUA-132 refuse aussi un ajout en fin
  de journal par `cat >> … <<EOF` (écriture jugée comme une lecture) : le
  journal s'édite par l'outil d'édition.
- **Réouverture (PR #223, CI rouge ; QUA-116 réouverture après clôture,
  oui de l'humain selon QUA-117)** : macOS — le garde shell comparait
  `import.meta.url` à une URL de `process.argv[1]` et ne se lançait pas par
  `/var` → `/private/var` ; la correction de 2026-10-17 (QUA-044, les hooks
  lisent la racine du projet) n'avait pas été appliquée partout. Tous les
  points d'entrée livrés de `.githooks/` et `.claude/hooks/` comparent
  désormais les chemins réels des deux côtés, et un test de QUA-044
  parcourt le gabarit pour refuser la récidive ; QUA-044 étendu en
  conséquence. Windows — l'hypothèse du nom court 8.3 écartée par le log
  (les lectures Read par chemin absolu passaient) : le garde shell lisait
  `\` comme échappement et effaçait les séparateurs de `C:\Users\…` ; les
  mots sont relus sans échappement. Rejeu par les hooks de la branche
  principale (QUA-113) : « Contrats modifiés » cite désormais un hook par
  puce.
- **Limites connues** : relevé de l'indicateur —
  `docs/intentions/suivi-ci-et-contexte.md` (ex-« releve-cache-lu-par-requete », regroupée le 2026-10-25) ; recettes et skills qui
  renvoient encore au registre entier —
  `docs/intentions/petits-defauts.md` (ex-« recettes-qui-lisent-le-registre-entier », regroupée le 2026-10-25) ; lecture
  forcée pour Gemini CLI, Copilot CLI, Codex et Cursor —
  `docs/intentions/compatibilite-des-outils.md` (ex-« lecture-ciblee-forcee-autres-outils », regroupée le 2026-10-25) ; découpage du
  registre et du journal — `docs/intentions/suivi-ci-et-contexte.md` (ex-« decoupage-registre-et-journal », regroupée le 2026-10-25) ;
  dossiers temporaires des tests jamais supprimés, troisième occurrence,
  besoin d'un anti-récidive —
 ; points
  d'entrée des scripts propres au dépôt (`outils/`, `.github/scripts/`)
  hors du test de QUA-044 — note du 2026-10-24 de
  `docs/intentions/notes.md` ; gardes de
  lecture et sous-agent non éprouvés dans une vraie session Claude Code,
  et garde shell qui prend `cat >>` pour une lecture —
  `docs/intentions/suivi-ci-et-contexte.md` (ex-« gardes-de-lecture-en-session-reelle », regroupée le 2026-10-25).
- **Preuve de clôture** : `docs/preuves/reduction-contexte.md`.
- **Clôturé par** : la branche `workstream/reduction-contexte`.

## 2026-10-25 — Le pre-push juge la branche poussée, la note de recette arrive enfin

- **Cause** : le contrôle `main-branch` de QUA-017 (pas de travail direct
  sur la branche principale) lisait `git symbolic-ref HEAD`, même au push ;
  depuis `master`, le push de `recette/vX.Y.Z` par `.githooks/recette-note.mjs` était
  refusé (v0.7.0 le 2026-10-22, v0.8.0 le 2026-10-25), et inversement
  `travail:master` poussé depuis une autre branche passait. Reproduit par un
  test sur un vrai dépôt git avant correction.
- **Décisions clés** : le `pre-push` passe au moteur les branches distantes
  poussées (`DRWIL_PUSH_REFS`, lues sur son entrée standard, hors tags et
  suppressions) ; `main-branch` refuse si l'une est `master`/`main`,
  accepte sinon, d'où qu'on pousse. Sans entrée standard (lancement à la
  main), la branche courante reste jugée ; le `pre-commit` aussi. QUA-017
  précisé en ce sens (contrat modifié, validé au cadrage).
  `.githooks/recette-note.mjs` montre la sortie de git (« sortie de git : », raison du
  refus) avec la commande de rattrapage quand la branche de la note n'est
  pas créée ou pas poussée (QUA-080, le tag et la release ne dépendent
  jamais de la PR de la note). Note du 2026-10-22 de
  `docs/intentions/notes.md` entièrement couverte, retirée.
- **Lot 3 (note de la v0.8.0)** : selon la décision du demandeur (corriger
  le hook avant de rattraper, jamais depuis une autre branche), le
  rattrapage `node .githooks/recette-note.mjs v0.8.0 <note>` se lance
  depuis `master` après la fusion de ce chantier ; la note arrive par sa PR
  dédiée `recette/v0.8.0` (QUA-079, une version publiée sans candidate
  reçoit quand même sa note).
- **Réouverture (PR #227, CI rouge ; QUA-116 réouverture après clôture)** :
  le rejeu des contrôles par les hooks de `master` (QUA-113) refusait
  `.githooks/pre-push`, `.githooks/engine.mjs` et
  `.githooks/recette-note.mjs`, non déclarés dans « Contrats modifiés » ;
  ils y sont cités, un par puce, dans un commit qui ne touche que la fiche
  (correctif ordinaire : aucun fichier de règles modifié par la
  réouverture).
- **Limites connues** : la note de la v0.7.0 reste absente, son fichier
  temporaire perdu — l'intention « note-recette-v0-7-0 » (abandonnée le 2026-10-25).
- **Preuve de clôture** : `docs/preuves/pre-push-reference-poussee.md`.
- **Clôturé par** : la branche `workstream/pre-push-reference-poussee`.

## 2026-10-25 — Les contrôles ne laissent plus de dossiers temporaires derrière eux

- **Besoin** : troisième épuisement des inodes de `/tmp` par des dossiers
  `drwil-*` de tests jamais supprimés (7 919, 40 061, 13 500 ; `drwil verify` en
  33 FAIL `ENOSPC` le 2026-10-24), et 958 dossiers vides `drwil-banc-*` à la
  racine du dépôt. Les corrections fichier par fichier n'avaient pas empêché les
  tests suivants de fuir.
- **Décisions clés** : QUA-133 (racine temporaire par passe, supprimée à la
  fin) : le moteur (`.githooks/engine.mjs`, livré dans le gabarit) crée un
  dossier `drwil-checks-*` par passe et un sous-dossier par contrôle
  (`TMPDIR`, `TMP`, `TEMP`), le supprime à la fin de la passe ou à la sortie du
  processus ; les sous-dossiers des contrôles en échec sont déplacés sous un
  chemin fixe par projet (`drwil-checks-failed-<empreinte>`), remplacé à chaque
  échec, et le résumé de `run-checks` dit ce chemin. QUA-134 (une fuite est
  nommée et comptée) : un contrôle qui laisse des fichiers est nommé avec leur
  nombre et compté comme avertissement, sans faire échouer la passe ; une
  racine non supprimable est aussi un avertissement. QUA-135 (le banc refuse une
  base du dépôt sans y créer de dossier, complète QUA-060) : `preparer` juge la
  base avant de créer le dossier ; la racine du dépôt ne reçoit plus de
  `drwil-banc-*`.
  Les tests qui lancent des hooks (moteur, `run-checks`, kit) ont leur racine
  temporaire propre, supprimée à la fin, pour que les dossiers gardés après un
  échec simulé ne s'accumulent pas.
- **Mesure** : `ls -d /tmp/drwil-* | wc -l` autour d'une passe de
  `node .githooks/run-checks.mjs` : 4 887 avant, 4 887 après (environ 26 de plus
  par commit auparavant) ; 958 dossiers vides `drwil-banc-*` supprimés (`rmdir`),
  0 après une passe du test du banc. Les 4 887 dossiers restants sont des
  restes antérieurs, non vidés ici.
- **Limites connues** : 31 contrôles nomment des fuites (intention
  `docs/intentions/tests-qui-laissent-des-fichiers-temporaires.md`), le résumé
  passe de 1 à 31 avertissements ; `drwil verify` appelle le moteur sans
  `finish` (`packages/drwil/src/verify.ts`, hors cadrage) : sa racine est
  supprimée à la sortie du processus, mais il ne nomme pas les fuites ;
  `npm test` lancé à la main hors du moteur n'est pas couvert. L'intention
  d'origine, entièrement couverte, est retirée ; la note du 2026-10-22 de
  `docs/intentions/notes.md` aussi.
- **Preuve de clôture** : `docs/preuves/dossiers-temporaires-des-tests.md`.
- **Clôturé par** : la branche `workstream/dossiers-temporaires-des-tests`.

## 2026-10-25 — Chaque contrôle dit combien de temps il a pris

- **Besoin** : un `verify --evidence` a pris environ 4 min 30 et six passes
  25 à 30 min d'un chantier de 45 min, sans qu'on sache lesquels des 121
  contrôles coûtent le plus ; la mesure précède le choix de ce qu'il faut
  accélérer (premier des quatre chantiers sur la durée des contrôles).
- **Décisions clés** : QUA-136 (durée par contrôle, nouveau contrat) : le
  moteur (`.githooks/engine.mjs`, livré dans le gabarit) renvoie `durationMs`
  en millisecondes entières pour chaque contrôle exécuté, en synchrone
  (`run`) comme en parallèle (`runAsync`) ; un contrôle non exécuté ou non
  applicable n'a pas de durée, jamais 0. `run-checks` l'écrit au détail
  (`.drwil/evidence/run-checks.log` (si présent)) après chaque contrôle, puis liste les
  contrôles du plus lent au plus rapide en fin de fichier en disant que, sur
  une passe parallèle, la durée est celle du contrôle et non sa part de la
  passe ; `drwil verify --evidence` l'écrit par contrôle dans `verify-*.json`.
  QUA-126 (sortie courte de `run-checks`) précisé : la ligne de résumé nomme
  aussi les trois contrôles les plus lents avec leur durée.
- **Mesure** : première passe de `node .githooks/run-checks.mjs` avec le
  résumé : les plus lents sont `drwil: build + tests + seuil de couverture
  (QUA-004)` (≈ 120 s), `hooks de gouvernance : tests + couverture (QUA-004)`
  (≈ 38 s) et `tests des contrôles eux-mêmes` (≈ 34 s), mesurés sur une passe
  parallèle, donc en partie recouverts.
- **Limites connues** : `.githooks/engine.mjs` est à 400 lignes, le plafond
  de QUA-001 : un prochain ajout au moteur demandera de le découper ; la
  lecture de ces durées par le tableau « Durée de la CI drwil » reste à faire
  (intention `docs/intentions/suivi-ci-et-contexte.md`, mise à jour).
- **Preuve de clôture** : `docs/preuves/duree-par-controle.md` (si présent).
- **Clôturé par** : la branche `chantier/duree-par-controle`.

## 2026-10-25 — Un hook modifié se déclare avant la clôture, et le retour en SCOPING attend la CI

- **Besoin** : deux trous rencontrés ensemble sur la PR #232 (troisième
  occurrence après la PR #220). Un fichier de `.githooks/` modifié sans être
  déclaré dans « Contrats modifiés » n'était vu qu'en CI, par le rejeu
  QUA-113 (la CI rejoue les contrôles avec les hooks de la branche
  principale) ; et la fusion automatique faisait revenir en SCOPING dès la
  fusion programmée, avant la fin de la CI, d'où `reopen` (QUA-116,
  réouverture d'un chantier clos, permise en CLOSING seul) ne pouvait plus
  partir. L'intention d'origine (`hooks-declares-et-scoping-apres-ci`),
  entièrement couverte, est résumée ici et retirée : signal à la clôture
  plutôt qu'au pre-push, retour en SCOPING après la fusion plutôt que
  `reopen` depuis SCOPING, rappel du oui du demandeur dans le signal.
- **Décisions clés** : QUA-137 (nouveau contrat) : `undeclaredHooks`
  (`.githooks/base-checks.mjs`, même règle que le rejeu : test qui suit son
  module, fiche supprimée lue avant suppression, fiche active lue telle
  qu'elle est) est appelé par `.githooks/close.mjs` — signal à `--check` et
  au passage de BUILD à EVIDENCE, clôture refusée avant toute écriture ;
  sans branche principale lisible, « non exécuté », jamais un succès.
  QUA-138 (nouveau contrat) : la procédure de fusion automatique
  (`.githooks/state-texts.mjs`, skill de lancement) suit la PR par
  `node .githooks/pr-watch.mjs` jusqu'à « fusionnée » (30 minutes au plus)
  avant SCOPING ; CI rouge : `reopen` en CLOSING ; délai dépassé : rester en
  CLOSING. Le rejeu local avec les hooks de `master` est vert, les cinq
  hooks du chantier déclarés. L'ajout de deux contrôles à
  `.drwil/ia-first.json` a fait tomber l'attestation de QUA-122, réattestée
  par l'humain.
- **Limites connues** : l'attestation de QUA-122 tombe à chaque contrôle
  ajouté (intention « couverture-de-qua-122 », réglée le 2026-10-25) ; `.githooks/close.mjs`
  est au plafond de 400 lignes de QUA-001 (`docs/intentions/decouper-close.md`) ;
  le test unitaire du nouveau texte reste à écrire dans
  `.githooks/state.test.mjs`, en déclarant le hook
  (`docs/intentions/test-unitaire-fusion-automatique.md`) ; le test de durée
  de QUA-136 a échoué une fois au pre-commit puis passé (fragilité déjà
  suivie par `docs/intentions/suivi-ci-et-contexte.md`).
- **Preuve de clôture** : `docs/preuves/hooks-declares-et-scoping-apres-ci.md` (si présent).
- **Clôturé par** : la branche `chantier/hooks-declares-et-scoping-apres-ci`.

## 2026-10-25 — `drwil verify` joue ses contrôles en parallèle

- **Besoin** : `drwil verify` jouait les contrôles cités par le registre l'un
  après l'autre, alors que `run-checks` les lance déjà en parallèle (QUA-119) ;
  sa passe durait la somme de tous ses contrôles.
- **Décisions clés** : QUA-139 (nouveau contrat) : `verify`
  (`packages/drwil/src/verify.ts`) suit le réglage `parallel` du projet ; il
  lance par `startParallel` du moteur installé les contrôles de commande cités
  (même limite que `run-checks`, un contrôle partagé joué une fois) et lit leurs
  résultats dans l'ordre du registre : mêmes statuts, raisons et ordre qu'en
  série. Sans le réglage, ou avec un moteur sans `startParallel`, la passe reste
  en série. Aucun changement du moteur ni du gabarit. Mesure sur ce dépôt
  (8 cœurs, `drwil verify --agent`) : 3 min 26 en série (`parallel` coupé),
  2 min 06 en parallèle, soit environ 39 % de moins.
- **Limites connues** : `verify` rejoue encore tout après un FAIL
  (`docs/projects/verify-rejoue-les-echecs.md`) et ne reprend pas les verdicts
  de `run-checks` (`docs/projects/journal.md`) ; `parallel`
  reste un réglage, non activé par défaut chez les projets.
- **Preuve de clôture** : `docs/preuves/verify-en-parallele.md` (si présent).
- **Clôturé par** : la branche `chantier/verify-en-parallele`.

## 2026-10-25 — `drwil verify` reprend les verdicts de `run-checks`

- **Besoin** : `drwil verify` rejouait tous les contrôles cités par le registre,
  alors que `run-checks` venait de les jouer sur le même code.
- **Décisions clés** : QUA-140 (nouveau contrat) : le moteur calcule une empreinte
  de l'arbre (commit, branche, modifications suivies, fichiers non suivis non
  ignorés) et de `.drwil/ia-first.json` ; une passe de `run-checks` hors hook
  consigne le verdict ok ou fail de chaque contrôle dans
  `.drwil/evidence/run-checks-verdicts.json` (si présent) si l'arbre n'a pas changé pendant la
  passe ; `verify` reprend le verdict d'un contrôle à l'empreinte identique, le dit
  contrat par contrat (preuve, `--evidence`, `--agent`) et rejoue tout autre
  contrôle (empreinte différente, verdict absent ou non exécuté, `reuse: false`,
  `secrets` hors CI). `reuse: false` est posé sur `audit-dependances` et
  `tarball` ; l'option `--no-reuse` rejoue tout. QUA-013 est précisé : un verdict
  repris sur un arbre identique est une exécution du contrôle, tout autre verdict
  repris reste un échec. Le cadrage a été élargi à `packages/drwil/bin/drwil.js`
  pour l'option (décision du demandeur du 2026-10-25). Mesure sur ce dépôt
  (`drwil verify --agent`, arbre inchangé après `run-checks`) : 2,0 s avec la
  reprise (137 contrôles repris, 2 rejoués) contre 1 min 57 avec `--no-reuse`
  (139 rejoués).
- **Limites connues** : `verify` rejoue encore tout après un FAIL
  (`docs/projects/verify-rejoue-les-echecs.md`) ; la moindre modification de
  l'arbre (une note, la fiche) invalide la reprise.
- **Preuve de clôture** : `docs/preuves/verify-reprend-run-checks.md` (si présent).
- **Clôturé par** : la branche `workstream/verify-reprend-run-checks`.

## 2026-10-25 — `run-checks` et `drwil verify` reprennent un verdict contrôle par contrôle

- **Besoin** : depuis QUA-140 (reprise sur un arbre identique), un octet changé
  n'importe où invalidait tous les verdicts : pendant les itérations, le gain
  était nul et `run-checks` rejouait toujours tout.
- **Décisions clés** : QUA-141 (nouveau contrat, voisin de QUA-140 qu'il laisse
  intact) : un contrôle qui déclare `paths` a une empreinte propre (sa
  déclaration, le moteur et le contenu des fichiers que ses `paths`
  désignent) ; hors hook, hors CI et sans `--tout-rejouer`, `run-checks` ne
  rejoue pas un contrôle « ok » à l'empreinte identique et `drwil verify` le
  reprend de même ; sans `paths`, en échec, `reuse: false` ou `reuse: "tree"`,
  le contrôle est rejoué. `verify --evidence` et `--no-reuse` gardent
  l'empreinte de tout l'arbre (la preuve de clôture n'est jamais reprise par
  contrôle) ; un verdict repris par contrôle n'entre jamais dans l'empreinte de
  l'arbre (`played`). Le PASS reste PASS, avec « ne vaut pas preuve de
  clôture » dans la raison de chaque contrôle repris et sur la ligne de
  `--agent`. QUA-013 précisé. Audit des `paths` de ce dépôt par traçage des
  lectures de chaque contrôle : `paths` complétés, et `reuse: "tree"` sur
  `tests-qua-047`, `tests-qua-112`, `miroirs-gabarit`, `tests-contrats` et
  `codeowners` (ils lisent presque tout) ; un test garde que chaque fichier de
  test lancé par un contrôle est sous ses `paths`. Le cadrage a été élargi à
  `packages/drwil/bin/drwil.js` (option de `verify`), puis à
  `.githooks/fingerprints.mjs` (l'`.githooks/engine.mjs` était au plafond de 400 lignes)
  et aux deux fiches `kit-mechanics.md` qui doivent le citer ; les trois
  élargissements ratifiés par le demandeur. Mesure sur ce dépôt : une passe
  de `run-checks` complète 2 min 46 s ; après une modification de
  `docs/projects/pending.md`, 1 min 23 s (121 contrôles repris, 17 rejoués).
- **Limites connues** : l'audit des `paths` est ponctuel (par traçage), rien ne
  surveille qu'un contrôle ne lit pas un fichier hors de ses `paths`
  (`docs/intentions/reprise-par-controle-limites.md`) ; le pre-push rejoue
  encore tout (`docs/projects/pre-push-reprend-les-verdicts.md`) ; le verdict
  humain de `verify` ne porte pas lui-même la mention « ne vaut pas preuve de
  clôture » (`packages/drwil/src/verdict.ts` hors cadrage) ; le test
  QUA-136 (classement des durées) est sensible à la charge de la machine
  quand toute la suite tourne en parallèle.
- **Preuve de clôture** : `docs/preuves/verify-reprise-par-controle.md` (si présent).
- **Clôturé par** : la branche `cadrage/verify-reprise-par-controle`.

## 2026-10-25 — La durée du job `checks` devient un indicateur, pas une attestation à renouveler

- **Décisions clés** : QUA-122 (durée du job `checks`) conserve son identifiant
  et devient une preuve historique bornée aux mesures du chantier
  d'accélération de la CI du 2026-10-24 (3m02, 3m45, 4m37 sur trois passages à
  hooks modifiés, référence ≈ 5m35, hooks inchangés non relevé), conservées
  avec leurs limites dans `docs/mesures-ci-reference.md`, seul fichier de son
  champ « Couvre » : ajouter un contrôle à `.drwil/ia-first.json` ou modifier
  le workflow n'invalide plus son attestation. QUA-023 (évolution déclarée
  d'un contrat) respecté, histoire conservée ; aucune ancienne preuve
  réécrite. Dépôt drwil uniquement, pas le livrable. Décision humaine en
  cours de chantier : `docs/mesures-ci-reference.md` n'est pas livré dans le
  gabarit ; le cadrage est élargi à `outils/miroirs.json`, qui le déclare
  propre au dépôt (`propresAuDepot`).
- **Relevé de la durée de CI (procédure, pour chaque chantier)** : une ligne
  `- **Durée de CI (job checks)** : <durée> — <référence du passage de CI> —
  hooks modifiés | hooks inchangés` dans l'entrée du journal ; « non mesurée »
  si le relevé manque ou est inexploitable. Sans seuil, il ne bloque ni
  `verify` ni la clôture (détail : `docs/mesures-ci-reference.md`).
- **Durée de CI (job checks)** : non mesurée — la CI de la PR n'a pas encore
  passé à l'écriture de cette entrée.
- **Limites connues** : tendance au tableau de bord et seuil d'alerte non
  bloquant restent à décider (`docs/intentions/suivi-ci-et-contexte.md`) ;
  relevé hooks inchangés toujours attendu (même intention) ; l'attestation
  historique de QUA-122 est un geste humain, non fait par l'agent. L'intention
  « couverture-de-qua-122 », entièrement couverte, est retirée.
- **Preuve de clôture** : `docs/preuves/duree-ci-en-indicateur.md` (si présent).
- **Clôturé par** : la branche `workstream/duree-ci-en-indicateur`.

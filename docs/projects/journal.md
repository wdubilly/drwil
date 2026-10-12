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

- **Décisions clés** : manifeste .drwil/fichiers-installes.json (chemin
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
  à commiter, contraire à QUA-017). `.githooks/creer-release.mjs` (dépôt et
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
  (`node .githooks/etat.mjs passer …`) ; ouvrir une attente, lancer la
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

- **Décisions clés** : `afterEach` dans `.githooks/etat.test.mjs` et
  `.githooks/perimetre.test.mjs`, sur le modèle des tests du kit (dossiers
  supprimés après un test réussi, gardés et affichés en cas d'échec) ;
  nettoyage au démarrage des tests écarté (risque avec les fichiers de
  test lancés en parallèle, perte du diagnostic). [décisions utilisateur]
- **Résultat** : un passage complet des contrôles laisse 0 dossier dans
  `/tmp` (environ 2 100 avant ; 40 061 accumulés, inodes épuisés le
  2026-10-09).
- **Clôturé par** : PR #3 (`dce7464`).

## 2026-10-10 — Rappel court de l'état de gouvernance, seulement quand il change

- **Décisions clés** : levier 7 de l'intention fluidité. `node
  .githooks/etat.mjs rappel` produit un rappel de deux lignes (activité,
  fiche active, périmètre, règle), injecté par le hook de saisie de Claude
  Code (`UserPromptSubmit`) seulement si son empreinte diffère de la
  dernière, gardée dans `.drwil/rappel.json` (si présent ; ignoré par Git, absent ou
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
  terminal `node .githooks/etat.mjs lancer` ; clôture sans geste humain
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
  terminée (`statutFiche`, définition unique d'`.githooks/etat.mjs`,
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
- **Résultat** : `node .githooks/etat.mjs fiches --json` donne `priorite`,
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
  replis silencieux après git retirés de `.githooks/perimetre.mjs` (un échec casse
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

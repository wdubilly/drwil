# Journal des chantiers clôturés

Résumé condensé de chaque fiche `docs/projets/` une fois son Statut passé
à « fait » (toute la fiche, pas un simple point parmi d'autres d'une fiche
qui reste ouverte par ailleurs). La fiche détaillée est alors supprimée :
plus d'historique complet en clair dans le dépôt, mais rien n'est perdu —
`git log --follow -- docs/projets/<fiche>.md` (ou le commit/la PR de
clôture cités ci-dessous) retrouve le texte intégral à tout moment.

Objectif : garder `docs/projets/` léger (fiches actives seulement) sans
sacrifier la traçabilité, qui reste de toute façon dans git. Voir la
recette `docs/recettes/travailler-en-branche.md`, section « Clôturer ».

Une entrée par chantier clôturé, la plus récente en dernier.

Les numéros de PR cités avant le 2026-10-09 renvoient au dépôt privé
archivé `wdubilly/drwil-archive` : le dépôt public, ouvert ce jour-là après
réécriture de l'adresse e-mail des commits, recommence à la PR #1.

## 2026-10-04 — Vérifier la cohérence entre case de l'index et statut de la fiche

- **Décisions clés** : avertissement non bloquant (QUA-015) quand une
  case de `docs/projets/en-attente.md` est cochée/ouverte alors que le
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
  `suites-kit-portable.md`, traité avec ce chantier). `docs/projets/`,
  `docs/intentions/`, `docs/recettes/` (et équivalents anglais) jamais
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
  seulement. Recette docs/recettes/travailler-en-branche.md mise à jour : vérifier
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
  dans `git log --follow -- docs/projets/extraction-ia-first-run-box.md`).

## 2026-10-05 — `apply()` rafraîchit la mécanique du kit et signale la dérive de prose

- **Décisions clés** : `apply()` réécrit désormais `.githooks/` sans
  condition (toujours mécanique, jamais de prose humaine dedans), signale
  (sans jamais réécrire automatiquement) toute dérive détectée sur les
  fichiers de prose partagée (`AGENTS.md`, `docs/ia-first.md`,
  `docs/contrats.md`...). Lot 2 : nouvelle commande
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
- **Reste ouvert** : avertir si la fiche existe encore au retour en
  CADRAGE (proposition : non, une fiche peut garder des lots ouverts).
- **Clôturé par** : PR #17 (`3c5e31a`).

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

## 2026-10-04 — Vérifier la cohérence entre case de l'index et statut de la fiche

- **Décisions clés** : avertissement non bloquant (QUA-015) quand une
  case de `docs/projets/en-attente.md` est cochée/ouverte alors que le
  Statut de la fiche citée dit le contraire.
- **Clôturé par** : commit `a6becb6`.

## 2026-10-04 — Rappeler quand un audit (opportunité, risques) est périmé

- **Décisions clés** : rappel non bloquant (> 30 jours depuis le dernier
  scan) dans le tableau de bord et dans `.githooks/run-checks.mjs`.
- **Clôturé par** : commit `b572f47`.

## 2026-10-04 — Informer de ce que drwil peut faire au-delà de la gouvernance

- **Décisions clés** : indexer dans `AGENTS.md`/`README.md` les recettes
  déjà livrées (audit, tableau de bord, suivi de coût, découverte de
  valeur) pour qu'un humain les découvre sans lire toute la prose.
- **Clôturé par** : commit `aff8879`.

## 2026-10-04 — Une commande `/drwil` pour découvrir les capacités du kit

- **Décisions clés** : alias `/drwil-xxx` sur les skills pilotage (champ
  `name:` du frontmatter, cohabite avec l'invocation par nom de dossier)
  + skill générique `/drwil` (menu sans argument, renvoi direct avec
  argument). Claude Code seul, les commandes personnalisées ayant
  fusionné avec les skills dans cet outil.
- **Clôturé par** : commits `f52904f`/`fe4ce9e` (PR #3, `5d6ac23`).

## 2026-10-05 — Travailler avec des branches et des merge/pull requests

- **Décisions clés** : contrat QUA-017 (pas de travail direct sur la
  branche principale après le premier commit, jamais vérifié en CI),
  recette dédiée FR/EN, gabarits de PR/MR (GitHub, GitLab).
- **Clôturé par** : commits `6b35c7b`/`6124eed` (PR #1, `855f865`),
  `efa120e` (PR #2, `b399782`).

## 2026-10-05 — Réparer la CI (merges avec job rouge, actions Node 20 dépréciées)

- **Décisions clés** : isoler l'environnement `CI` des commits simulés
  dans les tests (ne pas hériter du `CI=true` du job parent) ; monter
  `actions/checkout`/`actions/setup-node` en v7, Node 20 → 24 (GitHub et
  GitLab, dogfood + templates).
- **Clôturé par** : commit `92e2eec` (PR #4, `24e953b`).

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
- **Clôturé par** : PR #31, commit `1df2b6b`.

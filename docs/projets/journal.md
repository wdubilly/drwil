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


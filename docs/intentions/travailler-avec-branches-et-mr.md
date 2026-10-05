# Intention : Travailler avec des branches et des merge/pull requests

**Statut** (2026-10-05) : tranché — questions résolues (voir « Décisions
prises »), implémenté et clôturé (voir `docs/projets/journal.md`).

## Besoin
Documenter et, si nécessaire, adapter le kit pour un usage courant avec des
branches de fonctionnalité et des merge/pull requests (plutôt que des
commits directs sur la branche principale), sans rien casser pour qui
continue à committer directement dessus.

## Existant
- La CI (`.github/workflows/`) se déclenche déjà sur `push` et
  `pull_request` : aucun changement requis côté exécution des contrôles.
- Aucun hook (`.githooks/`, `.claude/hooks/`) ne suppose un nom de branche
  particulier (`master`/`main`) : les contrôles locaux (pre-commit,
  pre-push, commit-msg) sont déjà agnostiques à la branche.
- Aucune recette de `docs/recettes/` ne couvre le geste « ouvrir une
  branche, cadrer, clôturer via une MR » — les 13 recettes existantes
  couvrent des gestes techniques (route API, écran, refactor…) mais pas le
  flux git lui-même.
- QUA-015 (cohérence case cochée de `docs/projets/en-attente.md` / Statut
  "fait" d'une fiche) compare l'état déclaré d'une fiche à l'index, sans
  notion de branche ni de fusion : une fiche peut se dire "fait" sur une
  branche non encore mergée, l'index serait alors incohérent avec l'état
  réel de `master` tant que la MR n'est pas fusionnée.

## Questions à trancher
(résolu — voir « Décisions prises » ci-dessous)

## Décisions prises (2026-10-05)
1. **Statut d'une fiche sur une branche non mergée** : une fiche reste
   "en cours" tant que sa branche n'est pas mergée, même si le travail y
   est terminé — le Statut ne se dit "fait" qu'après la fusion réelle
   (cohérent avec l'avertissement non bloquant déjà toléré par QUA-015).
2. **Convention de nommage des branches** : imposée et documentée —
   `chantier/<slug-de-la-fiche>` (ex. `chantier/travailler-avec-branches-et-mr`),
   pas de contrôle automatique (juste une convention dans la recette).
3. **Recette dédiée** : oui, une recette « travailler en branche » (FR) + équivalent EN,
   et dans les deux jeux de templates (dossier docs/recettes FR et
   docs/recipes EN de chaque template).
4. **Gabarit de pull/merge request** : fourni pour les deux outils —
   un gabarit de description pour GitHub et un pour GitLab, dans
   les dossiers CI existants des templates (livrés selon le `ci` choisi à
   l'init, comme les workflows existants).
5. **Impact sur le bloc cadrage** : aucun changement — le bloc cadrage
   fonctionne déjà pareil quelle que soit la branche (pas de dépendance
   à un nom de branche dans `.githooks/cadrage.mjs`).

## Périmètre
- Recette « travailler en branche » (FR + EN) : ouvrir une branche `chantier/<slug>` à partir d'une fiche
  `docs/projets/`, garder le Statut "en cours" jusqu'à la fusion, mettre à
  jour la fiche sur la branche, clôturer (merge, squash, suppression de
  la branche) et ne passer la fiche "fait" qu'après fusion.
- Gabarit de pull request GitHub et de merge request GitLab, livrés par
  `init`/`apply` selon le `ci` choisi (github/gitlab), avec une section
  qui pointe vers la fiche `docs/projets/` concernée et une checklist des
  contrôles (`.githooks/run-checks.sh` vert, fiche à jour).
- Indexer la nouvelle recette dans `AGENTS.md`/`README.md` comme les
  recettes précédentes (chantier clôturé, voir `docs/projets/journal.md`).

## Hors périmètre
- Tout contrôle automatique (hook) qui vérifierait le **nom** de branche
  ou imposerait la présence d'une pull/merge request avant de committer
  sur une branche non principale : reste une convention documentée, pas
  un contrôle bloquant.
- Intégration avec l'API GitHub/GitLab (ouverture automatique de MR par
  script) : hors périmètre, le kit reste un ensemble de conventions et de
  gabarits statiques, pas un outil d'automatisation git.
- Changement du comportement de QUA-015 : l'avertissement non bloquant
  existant reste suffisant, pas de nouvelle règle de cohérence liée aux
  branches.

## Révision (2026-10-05) : décision 6 — contrat QUA-017

La décision initiale ci-dessus (« tout contrôle automatique... resterait
une convention documentée, pas un contrôle bloquant ») est partiellement
révisée à la demande explicite de l'utilisateur : commiter ou pousser
**directement sur la branche principale** (`master`/`main`) devient un
contrat bloquant (QUA-017, voir `docs/contrats.md`), pas seulement une
convention. Ce qui reste hors périmètre (inchangé) : le contrôle du
**nom** de branche et l'exigence d'une pull/merge request existante.

Arbitrages tranchés via `ask_user` :
- Bloquant (pas un avertissement).
- Portée : commit **et** push (les deux hooks appellent déjà
  `.githooks/run-checks.mjs`, donc un seul contrôle couvre les deux).
- Appliqué immédiatement sur drwil lui-même (dogfooding).
- Pas de porte de sortie configurable dans `.drwil/ia-first.json`
  (contrairement à QUA-016/cadrage).
- Exceptions techniques, pas des choix arbitraires : le tout premier
  commit d'un dépôt fraîchement initialisé reste toléré (sinon
  `drwil init` ne pourrait jamais committer) ; le contrôle ne tourne
  jamais en CI (sinon un merge légitime sur la branche principale
  casserait la CI rétroactivement).

## Critères de sortie
- Recette livrée en FR et EN, dans le dépôt drwil et dans les deux jeux
  de templates, testée par au moins un test du kit (présence du fichier
  à l'`init`).
- Gabarits de pull/merge request livrés dans `templates/common/ci/`,
  installés selon le `ci` choisi, testés par le kit.
- `AGENTS.md`/`README.md` mentionnent la nouvelle recette.
- Tests du kit et `check-docs`/`run-checks` verts.
- Contrat QUA-017 documenté dans `docs/contrats.md`, implémenté dans
  `.githooks/run-checks.mjs` (+ template synchronisé), testé par le kit,
  appliqué sur drwil lui-même.

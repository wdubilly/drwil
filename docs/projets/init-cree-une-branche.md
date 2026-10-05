# Projet : `init()` crée toujours une branche avant le premier commit (jamais `master`)

**Statut** (2026-10-05) : lot 1 fait — chantier terminé.

<!-- cadrage
fichiers:
  - packages/drwil/src/index.ts
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
-->

## 1. Besoin

Question posée le 2026-10-05 : que se passe-t-il si la CI/les règles d'un
utilisateur empêchent tout push direct sur `master` (branch protection
côté remote), y compris pour le tout premier commit d'un dépôt tout juste
initialisé ? Aujourd'hui, `init()` (`setupGit()` dans
`packages/drwil/src/index.ts`) se contente de `git init` + configuration de
`core.hooksPath` — rien n'empêche techniquement l'utilisateur de faire ce
premier commit sur `master`, et QUA-017 (`.githooks/run-checks.mjs`) tolère
explicitement ce premier commit (bootstrap), avant de bloquer tout commit
suivant sur `master`/`main`. Un remote qui refuserait même ce tout premier
push casserait donc le geste recommandé par le kit lui-même.

Décidé le 2026-10-05 (demandeur, voir section 4) : la réponse doit être
**simple** — pas de détection de la configuration du remote, pas de
branche de repli conditionnelle. `init()` crée systématiquement une
branche de travail avant tout commit, dès `git init` ; personne n'a plus
jamais besoin de pousser sur `master`, même pour le premier commit. Ça
supprime le problème à la racine (aucun cas où le kit recommande de
pousser sur `master`) et permet de simplifier QUA-017 en retirant son
exception de bootstrap, devenue inutile dans le flux normal.

## 2. Hors périmètre

- Détecter la configuration de branch protection du remote (GitHub/GitLab
  API) : hors de portée, le kit n'a pas de jeton d'API dédié et la demande
  explicite est de rester simple.
- Changer le comportement d'`apply()` sur un dépôt git déjà existant
  (`.git` déjà présent) : seul le cas d'un `git init` fait par le kit
  lui-même est concerné ; un dépôt préexistant garde sa branche courante
  (son historique ne nous appartient pas).
- Renommer la branche par défaut du dépôt (`init.defaultBranch` / `master`
  vs `main`) : aucun changement, seule une branche de travail
  supplémentaire est créée par-dessus.

## 3. Contraintes

- Ne rien casser pour un utilisateur qui lance `init` sans `git` autorisé
  (`--no-git` ou git absent) : comportement inchangé (aucune branche
  créée, puisqu'aucun dépôt n'est créé).
- Ne rien casser pour `apply()` sur un dépôt existant (`.git` déjà là) :
  la logique de création de branche ne s'applique qu'à un `git init` fait
  par le kit lui-même (dépôt fraîchement créé).
- Garder `docs/projets/journal.md`, `docs/recettes/travailler-en-branche.md`
  et le contrat QUA-017 cohérents avec le nouveau comportement (une seule
  source de vérité par information, convention du dépôt).

## 4. Décisions

- (2026-10-05) `setupGit()` crée et bascule sur une branche de travail
  (`git checkout -b <branche>`) juste après `git init`, avant la
  configuration des hooks — uniquement quand c'est le kit qui vient de
  faire ce `git init` (jamais sur un dépôt déjà existant).
- (2026-10-05) Nom de la branche : `chantier/installation-kit` (validé par
  le demandeur, cohérent avec la convention `chantier/<slug>` de
  `docs/recettes/travailler-en-branche.md`).
- (2026-10-05) QUA-017 simplifié : plus d'exception de bootstrap. Le
  contrôle détecte le nom de branche avec `git symbolic-ref --short HEAD`
  (fonctionne même avant le tout premier commit, contrairement à
  `git rev-parse --abbrev-ref HEAD` utilisé jusqu'ici) et bloque tout
  commit sur `master`/`main`, y compris le tout premier — puisque le flux
  normal n'y mène plus jamais.

## 5. Points à trancher

(aucun restant — le principe et le nom de branche sont tranchés par le
demandeur, voir section 4)

## 6. Lots

- **Lot 1 — `init()` crée la branche, QUA-017 simplifié** [IA] : modifier
  `setupGit()` pour basculer sur `chantier/installation-kit` juste après
  un `git init` fait par le kit ; modifier la détection de branche de
  QUA-017 (`packages/drwil/templates/common/base/.githooks/run-checks.mjs`,
  répercuté sur `.githooks/run-checks.mjs` à la racine) pour utiliser
  `git symbolic-ref --short HEAD` et retirer l'exception de bootstrap ;
  mettre à jour le contrat QUA-017 (`docs/contrats.md` et son équivalent
  dans les templates FR/EN) et `docs/recettes/travailler-en-branche.md`
  (+ équivalent EN) pour refléter le nouveau comportement. Critère de
  sortie : tests mis à jour/ajoutés (branche créée par défaut après
  `init()`, jamais `master` ; un commit forcé sur `master`/`main` est
  toujours refusé, y compris en situation de premier commit simulée),
  `node .githooks/run-checks.mjs` vert.

## 7. Reprise

- **Dernier état** (2026-10-05) : lot 1 fait — `setupGit()` crée et bascule
  sur `chantier/installation-kit` après `git init` ; QUA-017 simplifié
  (`git symbolic-ref --short HEAD`, plus d'exception de bootstrap) dans le
  template et sa copie dogfood ; contrat QUA-017 et recette
  `docs/recettes/travailler-en-branche.md` (FR/EN) mis à jour ; test QUA-017 adapté +
  vérification que `init()` laisse bien l'utilisateur sur
  `chantier/installation-kit` ; `node .githooks/run-checks.mjs` vert
  (52/52 tests).
- **Travail non commité** : aucun après ce commit.
- **Prochaine étape** : ouvrir la pull/merge request (gabarit du dépôt),
  vérifier la CI, puis clôturer la fiche au moment du merge (convention
  `docs/recettes/travailler-en-branche.md`).

# Projet : les tests des contrôles n'héritent pas des variables GIT_* du hook

**Statut** : cadré le 2026-10-10 — lot 1 à lancer (priorité : un test peut corrompre le dépôt).
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .githooks/etat.test.mjs
  - .githooks/perimetre.test.mjs
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - packages/drwil/templates/common/base/.githooks/perimetre.test.mjs
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : les tests qui créent leurs propres dépôts Git, côté dépôt et
côté gabarit — QUA-018 (périmètre explicite : dépôt drwil vs livrable
gabarit) : le défaut touche les deux.)

## 1. Besoin

Constaté le 2026-10-10 en corrigeant la CI de la PR #11 : `git commit -am`
a été refusé par le pre-commit, contrôle « tests des contrôles eux-mêmes »
en échec, alors que les mêmes tests passent lancés à la main.

Cause établie : avec `-a` (ou `-o`, `--include`), Git fait tourner le hook
avec un index temporaire et lui passe `GIT_INDEX_FILE`. Les tests de
`.githooks/*.test.mjs` créent des dépôts temporaires et y lancent `git`
sans nettoyer l'environnement : ils lisent et écrivent l'index temporaire
du vrai dépôt au lieu du leur. Reproduit :

- `GIT_INDEX_FILE=<chemin> node --test .githooks/*.test.mjs` : 6 échecs
  (clôture ×3, pre-commit lu dans HEAD, trailer, branche rejouée) ;
- même commande sans la variable : 0 échec.

**Plus grave, constaté le même jour depuis un worktree** (`git worktree
add`) : Git passe alors `GIT_DIR` au hook, et les tests ont lancé leurs
commandes `git` sur le **vrai** dépôt. Effets relevés puis réparés à la
main : leur commit « base » a conclu une fusion en cours avec leur arbre de
test, 13 commits « init » / « base » ajoutés sur la branche
`chantier/cloture-fiche-absente`, index du worktree remplacé,
`user.name=Test` et `user.email=test@example.invalid` écrits dans la config
locale, `core.bare=true` (le dépôt principal ne répondait plus : « this
operation must be run in a work tree »). Rien n'a été poussé (le commit
avait échoué, le push n'a pas suivi).

Contournement du jour : commiter depuis le dépôt principal, sans `-a` et
sans worktree (les contrôles tournent normalement). Les projets qui adoptent drwil reçoivent
les mêmes tests par le gabarit : un `git commit -a` y échoue de la même
façon.

Intention : les tests lancent `git` dans un environnement débarrassé des
variables `GIT_*` qui désignent un dépôt (`GIT_DIR`, `GIT_INDEX_FILE`,
`GIT_WORK_TREE`, `GIT_OBJECT_DIRECTORY`…), pour qu'un test ne voie que son
dépôt temporaire, quel que soit le contexte de lancement (hook, `-a`,
worktree, rebase). Un test ne doit jamais pouvoir écrire dans le dépôt qui
le lance.

## 2. Hors périmètre

- Le code des contrôles lui-même (`.githooks/etat.mjs`,
  `.githooks/perimetre.mjs`) : dans un vrai hook, hériter de
  `GIT_INDEX_FILE` est le comportement voulu (il contrôle ce qui va être
  commité).
- Tout changement de la façon dont `.githooks/run-checks.mjs` lance les
  tests.

## 3. Contraintes

- Un seul assistant d'environnement par fichier de test (pas de copie dans
  chaque appel) ; dépôt et gabarit identiques.
- `packages/drwil/test/kit.test.mjs` passe déjà un `envTest` : y retirer
  aussi les `GIT_*`, sans changer le reste.
- Rien n'est désactivé ni sauté pour faire passer les tests — QUA-019 (pas
  de contournement d'un contrôle).

## 4. Décisions

- **2026-10-10 — Corriger les tests, pas le code** : le demandeur a validé
  la rédaction de cette fiche sur ce constat ; la correction vise
  l'environnement des tests, le comportement des hooks reste inchangé.
  [décision utilisateur]

## Contrats concernés

- **QUA-013** — Couverture CI de chaque contrôle : un contrôle dont les
  tests échouent selon la façon de commiter n'est pas un filet fiable.
- **QUA-019** — Pas de contournement : le défaut pousse à contourner le
  hook (commit sans `-a`, voire saut des hooks) ; le corriger retire la
  tentation.

## 5. Points à trancher

- [décision] Variables à retirer : liste fermée (`GIT_DIR`,
  `GIT_INDEX_FILE`, `GIT_WORK_TREE`, `GIT_OBJECT_DIRECTORY`,
  `GIT_ALTERNATE_OBJECT_DIRECTORIES`, `GIT_COMMON_DIR`, `GIT_PREFIX`) ou
  toutes les variables `GIT_*` ? Proposition : toutes, plus simple et plus
  sûr.

## 6. Lots

- **Lot 1 — environnement Git propre dans les tests** [IA] : assistant
  d'environnement dans les tests listés au cadrage ; un test de
  non-régression qui lance les tests avec `GIT_INDEX_FILE` puis `GIT_DIR`
  définis. Critère de sortie : `GIT_INDEX_FILE=<chemin> node --test
  .githooks/*.test.mjs` passe, le dépôt lanceur intact ; un `git commit -a`
  et un commit depuis un worktree passent le pre-commit ;
  `node .githooks/run-checks.mjs` et CI verts.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : la fiche elle-même et sa ligne d'index.
- **Prochaine étape** : [IA] commit de cadrage ; [humain] `/drwil-lancer`.

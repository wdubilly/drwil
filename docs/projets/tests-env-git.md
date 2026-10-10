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
- **2026-10-10 — Toutes les variables `GIT_*`** (point 5 tranché) : retirées
  de `process.env` en tête de chaque fichier de test, plutôt qu'une liste
  fermée qu'une variable oubliée ou nouvelle traverserait. Le retrait se
  fait dans `process.env` et non dans les seuls appels `git` des tests :
  le code testé (`.githooks/etat.mjs`, `.githooks/perimetre.mjs`) lance
  aussi `git` avec l'environnement hérité. [décision utilisateur]

## Contrats concernés

- **QUA-013** — Couverture CI de chaque contrôle : un contrôle dont les
  tests échouent selon la façon de commiter n'est pas un filet fiable.
- **QUA-019** — Pas de contournement : le défaut pousse à contourner le
  hook (commit sans `-a`, voire saut des hooks) ; le corriger retire la
  tentation.

## 5. Points à trancher

- ~~Variables à retirer~~ — tranché le 2026-10-10 (voir « Décisions »).

## 6. Lots

- **Lot 1 — environnement Git propre dans les tests** [IA] : assistant
  d'environnement dans les tests listés au cadrage ; un test de
  non-régression qui lance les tests avec `GIT_INDEX_FILE` puis `GIT_DIR`
  définis. Critère de sortie : `GIT_INDEX_FILE=<chemin> node --test
  .githooks/*.test.mjs` passe, le dépôt lanceur intact ; un `git commit -a`
  et un commit depuis un worktree passent le pre-commit ;
  `node .githooks/run-checks.mjs` et CI verts.

## 7. Reprise

- **Dernier état** (2026-10-10) : Lot 1 réalisé, non commité. Retrait des
  `GIT_*` de `process.env` en tête de `.githooks/etat.test.mjs`,
  `.githooks/perimetre.test.mjs` (copies du gabarit identiques) et
  `packages/drwil/test/kit.test.mjs`. Test de non-régression dans
  `.githooks/etat.test.mjs` : relance les deux fichiers dans un enfant avec `GIT_DIR`
  et `GIT_INDEX_FILE` pointant vers un dépôt « victime », puis vérifie
  qu'il n'a ni commit ni config modifiée ; vu échouer avant la correction
  (9 échecs dans l'enfant). Deux pièges : `NODE_TEST_CONTEXT`, hérité de
  `node --test`, empêchait l'enfant de lancer quoi que ce soit (retiré) ;
  le test coûtait +56 s à la suite du kit (lancé dans chaque projet
  généré) : sauté là par `DRWIL_TESTS_ENFANT`, il tourne sur les mêmes
  fichiers dans le dépôt.
- **Preuves** : `node .githooks/run-checks.mjs` vert (62 + 90 tests, suite
  du kit 97 s) ; dans un clone jetable, un vrai `git commit -a` puis un
  commit depuis un worktree : « tests des contrôles eux-mêmes » 62/62,
  clone intact (aucun commit parasite, config inchangée).
- **Travail non commité** : les cinq fichiers du cadrage et cette fiche.
- **Prochaine étape** : [IA] commit, `PREUVES → VERIFY`, clôture ;
  [humain] PR.

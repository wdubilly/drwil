# Projet : réparer la CI (merges avec job rouge, actions Node 20 dépréciées)

**Statut** (2026-10-05) : fait.

<!-- cadrage
fichiers:
  - .github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/test/kit.test.mjs
-->

## 1. Besoin

Les 3 dernières PR (#1, #2, #3) ont été fusionnées alors que le job CI
`ia-first` était rouge sur master, sans que ça ait été remarqué pendant le
chantier. Deux causes distinctes repérées le 2026-10-05 :

1. **Bug réel, pas un flaky** : le test
   « QUA-017 : pas de travail direct sur la branche principale après le
   premier commit » échoue systématiquement en CI (GitHub Actions), mais
   passe toujours en local. Cause : `.githooks/run-checks.mjs` désactive
   volontairement le blocage QUA-017 quand `process.env.CI` est positionné
   (pour ne pas bloquer rétroactivement un merge légitime sur master). Mais
   GitHub Actions positionne `CI=true` pour **tout** le job, y compris les
   appels `git commit` que le test lance via `spawnSync` pour *simuler* un
   commit développeur local sur master. Le test hérite donc de `CI=true` du
   job qui l'exécute et désactive, par ricochet, le contrôle qu'il est censé
   vérifier — faux négatif local, vrai échec en CI.
2. **Dépréciation d'infra** : `actions/checkout@v4` et `actions/setup-node@v4`
   ciblent un runtime Node 20 que GitHub force maintenant sur Node 24
   (avertissement `Node.js 20 is deprecated` dans chaque run), et
   `node-version: 20` (GitHub) / `image: node:20` (GitLab) installent un
   Node 20 pour exécuter nos propres scripts alors que l'infra tourne déjà
   en Node 24.

## 2. Hors périmètre

- Revoir la logique QUA-017 elle-même (le contrat reste correct : bloquer en
  local, jamais en CI) — seul le test doit isoler son environnement.
- Mettre à jour d'autres dépendances npm sans rapport avec ce rouge.

## 3. Contraintes

- Garder le principe « jamais de blocage QUA-017 en vraie CI » (sinon un
  merge légitime casserait rétroactivement le pipeline sur master).
- Les fichiers CI touchés existent en 3 exemplaires (dogfood + template
  GitHub + template GitLab) : les trois doivent rester synchronisés.

## 4. Décisions

- Isoler l'environnement des commits simulés dans les tests (`git()` du
  fichier de test ne doit plus hériter de `CI` du processus parent).
- Monter `actions/checkout`/`actions/setup-node` en v7 et fixer Node 24
  (GitHub Actions et image GitLab), dans le dépôt et les deux templates CI.

## 5. Points à trancher

(aucun)

## 6. Lots

- **Lot 1 — isoler les tests du CI du parent** [IA] : le helper `git()` de
  `packages/drwil/test/kit.test.mjs` retire explicitement `CI` de son
  environnement avant d'invoquer `git commit`. Critère de sortie : le test
  QUA-017 reproduit l'échec avec `CI=true` positionné localement, puis
  passe une fois corrigé.
- **Lot 2 — Node 24 partout** [IA] : `actions/checkout@v4` → `@v7`,
  `actions/setup-node@v4` → `@v7`, `node-version: 20` → `24` (dogfood +
  template GitHub), `image: node:20` → `node:24` (template GitLab). Critère
  de sortie : run CI vert sans avertissement de dépréciation.

## 7. Reprise

- **Dernier état** (2026-10-05) : les deux lots livrés, testés localement
  avec `CI=true node --test` pour reproduire puis vérifier le correctif ;
  run CI relancé sur master pour confirmer le vert.
- **Travail non commité** : aucun au moment de la clôture.
- **Prochaine étape** : surveiller le prochain run CI (push direct sur
  master, hors flux branche/MR car correctif infra).

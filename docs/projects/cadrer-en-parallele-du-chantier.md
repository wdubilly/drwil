# Projet : cadrer en parallèle du chantier, dans un worktree, avec sa propre PR

**Statut** : cadré le 2026-11-22, réduit le 2026-11-22 (P1 à P8 tranchés).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cadrer-en-parallele-du-chantier.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scoping-worktree.mjs
  - packages/drwil/templates/common/base/.githooks/scoping-worktree-texts.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-kit.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/engine-selftest.mjs
  - packages/drwil/templates/common/base/.githooks/engine-texts.mjs
  - .githooks/scoping-worktree.mjs
  - .githooks/scoping-worktree-texts.mjs
  - .githooks/run-checks-kit.mjs
  - .githooks/engine.mjs
  - .githooks/engine-selftest.mjs
  - .githooks/engine-texts.mjs
  - .githooks/scoping-worktree.test.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/engine.test.mjs
  - docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Pendant un chantier, cadrer une intention ou une fiche **à côté**, dans un worktree créé depuis la branche
principale à jour, avec sa propre petite PR, sans toucher au chantier. La pratique a servi trois fois le
2026-11-22 ; l'agent a deux fois dit à tort que c'était impossible. Livrable d'abord (QUA-018), puis ce dépôt.

Tout existe déjà, sauf la commande qui l'assemble :

- cadrer en BUILD sur la branche du chantier (chantier `cadrage-en-build`, QUA-016) : inchangé ;
- créer un worktree depuis la branche principale récupérée (`.githooks/worktree.mjs`, QUA-142, QUA-144) : réutilisé ;
- regrouper un cadrage sur une branche et une PR, programmer sa fusion (compétence `/drwil-scope`,
  `.githooks/merge-auto.mjs`, QUA-187) : réutilisé, jamais recopié.

Relevé dans le code le 2026-11-22 (pourquoi un worktree sans dépendances ne peut pas pousser aujourd'hui) :

- `.githooks/pre-push` lance `.githooks/run-checks.mjs` ; seul le pre-commit diffère un contrôle hors de ses `paths`
  (`.githooks/engine.mjs`, QUA-035 : « le push comme la CI les rejouent toujours »). Au push, tout est joué, sauf un
  verdict repris (QUA-152, impossible dans un worktree neuf) ou un push du kit (QUA-325).
- Ce qui exige `npm ci` au push dans ce dépôt : le build `npx tsc --build packages/drwil` (178 contrôles
  `tests-qua-*` en `needsBuild`), `lint` (`npm run lint`, biome) et `checks-self-test` (tests des hooks :
  `.githooks/skill-headers.test.mjs` importe `yaml`). Les contrôles de couverture et `tarball` sont réservés à la CI.
- Pour une branche qui ne touche que `docs/projects/` ou `docs/intentions/`, les contrôles dont les `paths`
  la concernent sont `miroirs-gabarit` et `codeowners` (plus `tests-contrats` si `docs/contracts.md` change),
  avec les contrôles de base du moteur sans `paths` (`secrets`, `docs-references`, `contract-tests`,
  `architecture-map`, `scope-gate`, `main-branch`, `ci-coverage`). Aucun n'importe de dépendance : `node` et
  `gitleaks` suffisent. `checks-self-test` ne couvre ni `docs/projects/` ni `docs/intentions/`.

## Critères d'acceptation

(Chaque contrat est créé par le chantier, numéro attribué au lancement ; tous prouvés par tests sur dépôts jetables.)

- Au pre-push, hors CI, quand chaque fichier de chaque commit poussé est sous `docs/` (commits lus comme
  QUA-325, depuis `DRWIL_PUSH_COMMITS`), un contrôle déclarant `paths` dont aucun motif ne couvre un fichier
  poussé (y compris `checks-self-test`) est « non exécuté », nommé avec la raison (« documentation seule hors
  de ses chemins : rejoué en CI »), jamais compté passé (QUA-013) ; un contrôle concerné, avec ou sans besoin de
  dépendances, est joué et bloque s'il échoue ; un contrôle sans `paths` est joué. Un seul fichier hors
  `docs/`, des commits illisibles ou la CI : tout est joué comme avant — `QUA-nouveau-1`
- `node .githooks/scoping-worktree.mjs <nom>` (à créer) récupère la branche principale (`git fetch`), crée le worktree
  frère `../<dépôt>-cadrage-<nom>` sur la branche `cadrage/<nom>` (comme `launchInWorktree`, `--no-track`,
  QUA-056), n'y lance aucune installation, n'y écrit aucun état (SCOPING neutre) et ne touche ni le dossier,
  ni l'état, ni la branche d'où il est lancé ; un nom, un dossier ou une branche déjà pris est refusé, rien
  n'est créé ; la sortie donne le chemin du worktree — `QUA-nouveau-2`
- `node .githooks/scoping-worktree.mjs publish "<message>"`, lancé dans ce worktree, commite (hooks joués,
  jamais `--no-verify`), pousse, ouvre la PR par l'adaptateur de forge (`.githooks/merge-auto-forge.mjs`) puis
  lance `node .githooks/merge-auto.mjs <numéro>` et donne la commande `pr-watch` ; hors d'une branche
  `cadrage/`, sans modification, ou avec un fichier hors `docs/`, il refuse sans rien commiter ; une étape en
  échec arrête la suite et dit laquelle, rien n'est défait — `QUA-nouveau-2`
- Le worktree de cadrage est listé par le rappel d'état comme un worktree du même dépôt (QUA-143 reste vrai) ;
  `node .githooks/note.mjs` reste inchangé (QUA-071 reste vrai) — `QUA-143`, `QUA-071`

## Contrats modifiés

- `QUA-035` (un cadrage complet du premier coup, un élargissement sans friction) — ancien critère : « le push
  comme la CI les rejouent toujours (QUA-013) » — nouveau : la CI les rejoue toujours ; le push les rejoue,
  sauf un contrôle à `paths` hors des fichiers d'un push de documentation seule (`QUA-nouveau-1`) — raison :
  cadrer dans un worktree sans dépendances (P2). Validé par le demandeur le 2026-11-22.

## 2. Hors périmètre

- Le rappel d'état (P1) : aucun texte ajouté.
- Le retrait du worktree après fusion (P5) : `docs/intentions/nettoyage-des-worktrees.md`.
- Le chevauchement avec le scope du chantier en cours (P4) : rien n'est vérifié.
- Une compétence ou un prompt par outil (P7) : plus tard, après un relevé.
- Les conflits sur `docs/projects/pending.md` : `docs/projects/index-par-fiche.md`.

## 3. Contraintes

- **Principes directeurs** (demandeur, 2026-11-22, en ses mots) : « sécure, optimisé et performance, rapidité, tester
  et prouver, évolutivité et fiabilité ». Six axes : sécurité, performance, rapidité, preuve, évolutivité,
  fiabilité. Chaque lot dit l'axe qu'il sert et ce qui pourrait en dégrader un autre (section 6). La rapidité ne
  s'achète jamais par un contrôle sauté ou désactivé (QUA-019) : « vite, mais prouvé ».
- QUA-018 : on édite le gabarit puis `npm run installer-depot` ; copies du dépôt dans le même commit.
- `.githooks/worktree.mjs` (200 lignes) et `.githooks/run-checks.mjs` (197) sont au plafond de QUA-001 : la
  commande est un module à part qui importe `.githooks/worktree.mjs` ; le report de documentation va dans
  `.githooks/run-checks-kit.mjs` et le moteur, sans ligne de plus dans `.githooks/run-checks.mjs`.
- Couverture à 100 % des hooks (QUA-004) ; aucun code propre à un outil : un script Node, comme `.githooks/note.mjs`.
- Jamais `gh` ni `glab` appelés hors de l'adaptateur de forge ; jamais d'écriture de `.drwil/state.json` (si présent).

## 4. Décisions

Toutes du demandeur, le 2026-11-22 ; « réduis si nécessaire, ça doit être fluide ».

- **P1 — Outil seul**, le rappel d'état n'est pas modifié. Écartés : rappel seul, les deux.
- **P2 — Aucune installation de dépendances** dans le worktree de cadrage ; le pre-push d'une branche qui ne
  touche que `docs/` ne joue que les contrôles dont les `paths` la concernent, sans jamais désactiver ni sauter
  un contrôle (QUA-019) : un contrôle concerné qui a besoin des dépendances reste exigé (QUA-013), un contrôle
  non concerné est « non exécuté » et rejoué en CI. Ce n'est pas le comportement actuel (section 1) : le lot 1
  le livre. Écartés : `npm ci` complet, lien symbolique vers le `node_modules` du dossier principal.
- **P3 — `.githooks/note.mjs` garde l'idée d'une ligne** ; le worktree sert à une intention ou une fiche (QUA-071 étendu
  par l'usage, sa règle inchangée).
- **P4 — Rien** en cas de chevauchement avec le chantier en cours.
- **P5 — Retrait du worktree laissé au nettoyage des worktrees** existant.
- **P6 — L'outil fait tout d'un coup** : le worktree, puis après le cadrage commit, push, PR et fusion
  programmée en appelant `.githooks/merge-auto.mjs`. Écarté : worktree seul.
- **P7 — Commande commune** (script Node) pour tous les outils d'abord ; relevé par outil plus tard.
- **P8 — Dans l'index, avant `priorisateur-urgence-et-valeur`** (ordre : `acceleration-des-controles`,
  `cadrer-en-parallele-du-chantier`, `priorisateur-urgence-et-valeur`).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — un push de documentation sans dépendances** [IA] : tests en échec d'abord (dépôts jetables : push
  `docs/` seul, contrôle hors `paths` différé, contrôle concerné joué, fichier hors `docs/` tout joué) ;
  `.githooks/run-checks-kit.mjs`, moteur et `.githooks/engine-selftest.mjs` ; `QUA-nouveau-1`, QUA-035 réécrit ;
  `npm run installer-depot`.
- **Lot 2 — l'outil** [IA] : `.githooks/scoping-worktree.mjs` (à créer) et ses textes (créer, `publish`), tests sur
  dépôts jetables avec une forge simulée ; `QUA-nouveau-2` ; recette `docs/recipes/working-with-branches.md`, carte
  `docs/architecture.md`, scope de `docs/projects/kit-mechanics.md`, ligne « Unreleased » du CHANGELOG.

Critère de sortie de chaque lot : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en
`GOVERNANCE: PASS`.

Grille des six axes :

- **Lot 1** sert la rapidité et la performance (un push de cadrage sans `npm ci` ni build) ; risque pour la
  preuve et la sécurité : un contrôle différé à tort. Garde : seuls les contrôles à `paths` non concernés sont
  différés, les contrôles de base (dont `secrets`) jouent, la CI rejoue tout avant la fusion (QUA-013).
- **Lot 2** sert la rapidité et la fiabilité (un geste testé, l'agent ne dit plus que c'est impossible) ;
  risque pour la fiabilité : une PR ouverte à moitié. Garde : arrêt à la première étape en échec, rien de défait,
  l'étape nommée.

## 7. Reprise

- **Dernier état** (2026-11-22) : réduit à l'assemblage de l'existant, P1 à P8 tranchés, prêt.
- **Prochaine étape** : lancement par le demandeur (`/drwil-start`), après `acceleration-des-controles`.

# Projet : un contrôle lent se joue une seule fois, en CI

**Statut** : cadré le 2026-11-07.
**Risque** : HIGH (change ce que veut dire « vérifié » en local et ce que promet `GOVERNANCE: PASS`)
**Maturité** : prêt
**Portée** : le dépôt et le livrable (gabarit), GitHub et GitLab (QUA-018)

<!-- scope
files:
  - .githooks/engine.mjs
  - .githooks/engine-runat.mjs
  - .githooks/engine.test.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/pr-watch.mjs
  - .githooks/pr-watch.test.mjs
  - .githooks/close-checks.mjs
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/engine-runat.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/pr-watch.mjs
  - packages/drwil/templates/common/base/.githooks/close-checks.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/src/cli-verify.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/verdict.ts
  - packages/drwil/src/agent.ts
  - packages/drwil/src/verify-checks.ts
  - packages/drwil/src/verify-texts.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - .github/workflows/ia-first.yml
  - docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/adopt-the-kit/SKILL.md
  - .claude/skills/adopt-the-kit/SKILL.md
  - docs/ia-first/4-checks-in-git.md
  - packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Un contrôle lent (e2e, suites avec couverture, construction et test du tarball) est rejoué au commit,
au push, par `verify`, puis en CI, parfois deux fois. L'humain et l'agent attendent pour rien : le
contrôle n'apporte rien en local quand la CI le rejoue de toute façon. Il doit tourner une seule fois,
en CI, sur la PR (GitHub) ou la MR (GitLab), sans jamais être compté « passé » là où il n'a pas tourné.

Deux constats fixent la portée :

- `runAt` existe déjà (QUA-208), mais exige que `verify` rejoue le contrôle en local : un contrôle
  lent tourne au moins deux fois. Ce dépôt ne l'utilise sur aucun contrôle.
- La CI du gabarit tourne deux fois par push quand une PR est ouverte (événements `push` et
  `pull_request`). Le dépôt évite déjà ce doublon ; le gabarit non.

## Critères d'acceptation

- `runAt: ["ci"]` est accepté (aujourd'hui `verify` et `ci` sont exigés ensemble). Une configuration
  sans CI déclarée (`ciFiles` vide) qui l'utilise est refusée, avec la raison — contrat QUA-208
  modifié. — `QUA-208`
- Un contrôle `["ci"]` ne tourne ni au commit, ni au push, ni dans `verify`. Chaque sortie
  (`run-checks`, pre-commit, pre-push, `verify`) l'annonce « confié à la CI », jamais « passé »
  (QUA-013, un contrôle non exécuté n'est pas passé) — contrat QUA-208 modifié. — `QUA-208`
- Avec au moins un contrôle confié à la CI et tout le reste vert, `verify` rend
  `GOVERNANCE: PASS (CI pending)` et nomme les contrôles en attente ; ce n'est jamais un `PASS` sans
  réserve — `QUA-253`
- La clôture d'un chantier n'est acquise qu'une fois la CI de la PR (GitHub) ou de la MR (GitLab)
  verte sur ces contrôles : `pr-watch` la suit sur les deux forges ; rouge ou absente, le chantier
  reste en CLOSING et le dit — contrat à créer. — `QUA-255`
- Une option de `verify` et de `run-checks` (nom à fixer au lot 1, par exemple
  `--with-ci-checks`) joue aussi en local les contrôles confiés à la CI, pour reproduire un échec ;
  la sortie dit que l'option est active — `QUA-254`
- Livrable : les CI du gabarit, GitHub et GitLab, ne jouent plus deux fois les contrôles sur le push
  d'une branche qui a une PR ou une MR ouverte, et jouent bien les contrôles `["ci"]` — contrat à
  créer. — `QUA-256`
- Livrable : la recette et la compétence d'adoption proposent `["ci"]` pour le contrôle e2e de
  l'adoptant, en renvoyant à la définition de l'e2e du catalogue sans la recopier (QUA-196).
- Dépôt : les contrôles `couverture-tests`, `couverture-hooks`, `couverture-claude`, `tarball` et
  tout contrôle e2e passent à `["ci"]` dans `.drwil/ia-first.json` ; les tests rapides des contrats
  restent en local. Temps de commit et de push mesurés avant et après, consignés au journal.
- Le passage de la CI sur la branche principale après fusion reste inchangé : il rejoue tout, et la
  preuve d'une CI verte sur la dernière fusion (QUA-251) reste exigée avant le chantier suivant.
- Chaque critère est prouvé par un test qui porte l'ID de son contrat (le critère sur la configuration du dépôt, par la
  configuration validée et la mesure au journal).

## Contrats modifiés

- `QUA-208` (un contrôle réservé par `runAt` n'est pas joué au commit ni au push, et le dit) — ancien
  critère : « `verify` et `ci` y figurent toujours » ; nouveau : `["ci"]` seul est permis, le
  contrôle est alors annoncé « confié à la CI » par chaque sortie, et refusé sans CI déclarée.
  Validé par le demandeur le 2026-11-07, en conversation.
- `QUA-209` (`drwil verify` et la CI jouent un contrôle réservé, son échec bloque ; un `runAt` mal
  formé est refusé) — ancien critère : « `runAt` contient `verify` et `ci` » ; nouveau : ou `ci`
  seul (contrôle confié à la CI, QUA-208). Conséquence directe de QUA-208 modifié, ajoutée au lot 1
  pour que le registre ne se contredise pas. Validé par le demandeur le 2026-11-07, en conversation.
- `.githooks/engine.mjs` — accepte `runAt: ["ci"]`, ne joue pas un tel contrôle au commit, au push
  ni dans `verify` et l'annonce « confié à la CI » ; l'option locale les rejoue (validé par le
  demandeur le 2026-11-07)
- `.githooks/engine-runat.mjs` — `["ci"]` seul permis, refusé avec la raison sans CI déclarée
  (`ciFiles` vide) ni forge GitHub ou GitLab (validé par le demandeur le 2026-11-07)
- `.githooks/run-checks.mjs` — sortie « confié à la CI » pour les contrôles `["ci"]`, et option
  locale qui les joue en le disant (validé par le demandeur le 2026-11-07)
- `.githooks/pr-watch.mjs` — suit la CI de la PR (GitHub) et de la MR (GitLab) sur les contrôles
  confiés à la CI (validé par le demandeur le 2026-11-07)
- `.githooks/close-checks.mjs` — la clôture n'est acquise qu'une fois la CI de la PR ou MR verte sur
  ces contrôles ; rouge ou absente, le chantier reste en CLOSING et le dit (validé par le demandeur
  le 2026-11-07)
- `.githooks/close.mjs` — relaie l'attente de la CI de la PR ou MR rendue par
  `.githooks/close-checks.mjs` et la dit dans sa sortie (validé par le demandeur le 2026-11-07)

## 2. Hors périmètre

- Lancer un contrôle seulement quand un chemin critique est touché : intention
  `docs/intentions/controle-lent-chemin-critique.md`, qui reste séparée.
- La CI multi-OS (macOS, Windows) et les files d'attente de machines GitHub.
- La reprise des verdicts en CI (QUA-250, la CI d'une PR reprend le verdict de la branche principale
  pour un contrôle inchangé), qui reste telle quelle.
- Les autres forges que GitHub et GitLab : `["ci"]` y est refusé tant que `pr-watch` ne sait pas y
  lire la CI.

## 3. Contraintes

- Jamais de contournement (QUA-019) : `["ci"]` est un réglage déclaré, visible dans la configuration
  et dans chaque sortie, pas un saut silencieux.
- `wait-command` et `pr-watch` restent la seule façon d'attendre la CI.
- GitLab : `pr-watch` lit la pipeline de la MR (par `glab` ou l'API) ; la manière se fixe au lot 2,
  éprouvée par un test sans réseau (réponses de forge simulées).

## 4. Décisions

- 2026-11-07 : `verify` rend `GOVERNANCE: PASS (CI pending)` quand des contrôles sont confiés à la
  CI ; seule la CI verte de la PR ou MR fait foi pour la clôture.
- 2026-11-07 : le passage de la CI sur la branche principale après fusion est gardé (QUA-251
  inchangé).
- 2026-11-07 : dans le dépôt, couverture, tarball et e2e passent en CI seule ; les tests rapides des
  contrats restent en local.
- 2026-11-07 : une option joue en local les contrôles confiés à la CI, pour reproduire un échec.
- 2026-11-07 : l'e2e passe en CI seule, dans le dépôt comme chez l'adoptant ; GitHub et GitLab sont
  couverts tous les deux.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — moteur** [IA] : `runAt: ["ci"]` et son refus sans CI, sorties « confié à la CI »,
  `verify` `PASS (CI pending)`, option locale, QUA-208 modifié et contrats créés. Critère de sortie :
  tests de `["ci"]`, des sorties « confié à la CI », de `PASS (CI pending)` et de l'option locale verts ; `verify` sans contrat en FAIL, seuls les critères des lots suivants restant
  sans preuve (QUA-034).
- **Lot 2 — clôture et forges** [IA] : `pr-watch` et la clôture attendent la CI de la PR (GitHub)
  et de la MR (GitLab) ; CI du gabarit sans doublon sur les deux forges. Critère de sortie : tests
  des critères 4 et 6 verts ; `verify` sans contrat en FAIL, seuls les critères du lot 3 restant sans
  preuve (QUA-034).
- **Lot 3 — adoption et dépôt** [IA] : recette et compétence d'adoption (e2e en `["ci"]`), contrôles
  longs et e2e du dépôt passés à `["ci"]`, mesure avant et après au journal. Critère de sortie :
  critères 7 à 10 tenus, `GOVERNANCE: PASS (CI pending)` en local et CI verte sur la PR.

## 7. Reprise

- **Dernier état** (2026-11-07) : lots 1 — moteur et 2 — clôture et forges réalisés. Lot 1 : `runAt: ["ci"]`
  accepté (refusé sans CI GitHub ou GitLab dans `ciFiles`), annoncé « confié à la CI » par chaque sortie,
  option `--with-ci-checks` ; QUA-208 modifié, QUA-209 aligné, QUA-253 et QUA-254 créés. Lot 2 : le verdict
  lui-même porte `PASS (CI pending)` (`packages/drwil/src/verdict.ts` : `ciPending`, `verdictLabel` ; `label`
  et `ciPending` en `--json` et dans la preuve `--evidence`, dont `status` reste `pass` pour les transitions ;
  `--agent` ne dit plus « Work is verified » sous la réserve) — QUA-253 mis à jour en conséquence.
  `.githooks/pr-watch.mjs` suit aussi la MR GitLab par `glab` (`glab mr view --output json`, jobs de la
  pipeline par `glab api projects/:id/pipelines/<id>/jobs`), forge reconnue par `origin` ou un
  fichier .gitlab-ci.yml (`changeForge`), et dit les contrôles confiés à la CI prouvés (CI verte) ou non (le
  chantier reste en CLOSING) ; `.githooks/close.mjs` (clôture et `--check`) dit, par `closingCi` de
  `.githooks/close-checks.mjs`, si la CI de la PR ou MR est verte sur HEAD (clôture acquise) ou non —
  QUA-255 créé. CI du gabarit : GitHub, étape `pr` du job `checks` qui saute les étapes du push d'une
  branche à PR ouverte (pas de `if` de job) ; GitLab, `workflow: rules` sans pipeline de MR — QUA-256 créé.
  Critères 4 et 6 liés. Choix GitLab : `glab` plutôt que l'API brute (authentification et projet déduits
  du clone, comme `gh`), éprouvé par des réponses simulées.
- **Décisions du 2026-11-07, après le lot 1** : périmètre élargi à `packages/drwil/src/verify.ts`,
  `packages/drwil/src/verdict.ts` et `packages/drwil/src/agent.ts`, pour que le verdict lui-même
  (preuve `--evidence`, `--json`, sortie `--agent`) porte `PASS (CI pending)` ; la phrase « Work is
  verified » n'est plus dite sous un `PASS (CI pending)`. Critères de sortie des lots 1 et 2 corrigés :
  `GOVERNANCE: PASS` n'est atteignable qu'au dernier lot (QUA-034).
- **Limites connues** : la barrière de clôture est un signal (sortie de `.githooks/close.mjs` et de `.githooks/pr-watch.mjs`,
  champ `ciAcquired`), pas un refus de transition : le retour en SCOPING reste réglé par `.githooks/state-transitions.mjs`
  (hors périmètre), qui exige déjà la PR fusionnée. Le placeholder `:id` de `glab api` et le champ
  `head_pipeline` de `glab mr view --output json` ne sont éprouvés que par simulation. Attestations
  humaines tombées, à renouveler (`drwil attest`, geste humain) : QUA-013 (contrôle non exécuté n'est pas
  passé, `packages/drwil/src/verdict.ts` modifié) et QUA-048 (clôture en un geste, `.githooks/close.mjs`
  modifié) au lot 2 ; QUA-150 et QUA-151 (tests de durée, push sous charge) depuis le lot 1.
- **Prochaine étape** : [IA] lot 3 — adoption et dépôt : recette et compétence d'adoption (e2e en
  `["ci"]`), contrôles longs et e2e du dépôt passés à `["ci"]` dans `.drwil/ia-first.json`, mesure du temps
  de commit et de push avant et après au journal ; `GOVERNANCE: PASS (CI pending)` en local et CI verte sur
  la PR.
